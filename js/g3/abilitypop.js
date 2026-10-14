// Enemy ability pop-ups for new players (Dave, Oct 2026): when a monster's special move
// actually fires in the battle replay, a short gold-framed card names it and says what it did.
// Driven from the engine round report and intent verbs, so a new monster with an existing verb
// gets a pop-up with no extra wiring. Hero abilities never appear here. Nothing here changes a rule.
import { h, reduced } from '../dom.js';
import * as HK from './hudkit.js';


// Verbs that are just a hit: no pop-up unless the blow is a Slam / Pounce (flagged slam).
const HIT_VERBS = new Set(['strike', 'pierce']);
// These fire when the hero's blow lands, not when the monster's turn comes around.
const STRIKE_VERBS = new Set(['guard', 'ward', 'phase']);

const VERB_ICON = {
  guard: 'block', ward: 'ward', phase: 'phase', armor: 'block',
  breath: 'breath', summon: 'summon', rage: 'slam', flee: 'flee',
  drain: 'drain', pilfer: 'pilfer', bind: 'bind', hush: 'note', chain: 'bind',
  howl: 'howl', charge: 'windup', stalk: 'stalk', mend: 'heal', slam: 'slam',
};

// Per-ability name overrides (icon). Unknown names fall back to the verb.
const NAME_ICON = {
  'Gold Shield': 'gold', Hoard: 'gold', Snatch: 'pilfer', Pilfer: 'pilfer',
  'Chain Ward': 'bind', 'Fire Breath': 'breath', Inferno: 'breath', Puff: 'breath',
  'Frost Puff': 'phase', 'Wing Buffet': 'howl', Hush: 'note', Dirge: 'note',
  Fade: 'phase', Phase: 'phase', Pounce: 'slam', Slam: 'slam', 'Breath Slam': 'breath',
  'Rally!': 'summon', 'Raise Dead': 'summon', Inhale: 'windup', 'Wind-Up': 'windup',
  'Fire Ward': 'ward',
};

// The short words and the colour a move wears on the board (Dave): red = attack, blue = defence, purple = magic, green = healing,
// gold = anything sneaky. No numbers: the round recap has those.
const TAG = {
  guard: 'blocks your attack', armor: 'armoured', ward: 'burns whoever hits', phase: 'slips out of reach', breath: 'fire on everyone',
  summon: 'calls for help', rage: 'enraged', flee: 'flies away', drain: 'steals magic', pilfer: 'steals gold', bind: 'locks your dice',
  hush: 'hushes your heart', chain: 'chains your dice', howl: 'pack hits harder', charge: 'winding up', stalk: 'on the hunt',
  mend: 'heals itself', slam: 'a big blow', hit: 'hits you', blocked: 'blocked',
};
const TONE = {
  hit: 'atk', slam: 'atk', breath: 'atk', rage: 'atk', charge: 'atk', stalk: 'atk',
  guard: 'def', armor: 'def', ward: 'def', phase: 'def', blocked: 'def',
  bind: 'mag', chain: 'mag', hush: 'mag', drain: 'mag', howl: 'mag',
  mend: 'heal', pilfer: 'sly', summon: 'sly', flee: 'sly',
};
const n = (v) => Math.max(0, Math.round(Number(v) || 0));
const diceWord = (k) => (k === 1 ? 'die' : 'dice');

const VERB_LINE = {
  guard: (c) => `blocked ${n(c.n)} of your attack`,
  ward: (c) => (c.burned ? 'burns whoever hits it' : (c.n ? `blocked ${n(c.n)} of your attack` : 'burns whoever hits it')),
  phase: () => 'only pierce gets through',
  armor: (c) => `blocked ${n(c.n)} of your attack`,
  breath: (c) => (c.party ? 'splashes every hero' : 'splashes you with fire'),
  summon: () => 'called for help',
  rage: () => 'hits harder now',
  flee: () => 'Flew away! It will be back',
  drain: (c) => (c.n ? `stole ${n(c.n)} magic` : 'stole your magic'),
  pilfer: (c) => (c.n ? `stole ${n(c.n)} gold` : 'stole your gold'),
  bind: (c) => `locked ${n(c.n) || 1} of your ${diceWord(n(c.n) || 1)}`,
  hush: () => 'hushes your heart next round',
  chain: (c) => `chains ${n(c.n) || 1} of your ${diceWord(n(c.n) || 1)}`,
  howl: () => 'the pack hits harder next round',
  charge: () => 'a slam is coming',
  stalk: () => 'hit it or it pounces',
  mend: (c) => `healed ${n(c.n)}`,
  slam: () => 'a charged blow',
};

const NAME_LINE = {
  'Fire Ward': (c) => VERB_LINE.ward(c),
  'Chain Ward': (c) => VERB_LINE.ward(c),
  'Fire Breath': () => 'splashes every hero',
  Inferno: (c) => (c.party ? 'splashes every hero' : 'a wave of fire'),
  Puff: (c) => (c.party ? 'splashes every hero' : 'a puff of fire'),
  'Frost Puff': (c) => (c.party ? 'splashes every hero' : 'a puff of frost'),
  'Breath Slam': (c) => (c.party ? 'splashes every hero' : 'a slamming breath'),
  Fade: () => 'only pierce gets through',
  Phase: () => 'only pierce gets through',
  Pounce: () => 'a leaping strike',
  Slam: () => 'a charged blow',
};

function iconOf(name, v) { return NAME_ICON[name] || VERB_ICON[v] || 'star'; }
function lineOf(name, v, c) {
  const named = NAME_LINE[name];
  if (named) return named(c);
  if (VERB_LINE[v]) return VERB_LINE[v](c);
  return `used ${name}`;
}

function cue(uid, v, name, extra = {}) {
  const title = name || v;
  const line = extra.line || lineOf(title, v, extra);
  if (!line) return null;
  return { uid, v, name: title, icon: extra.icon || iconOf(title, v), line, lines: extra.lines || null, party: !!extra.party, tag: TAG[v] || '', tone: TONE[v] || 'sly' };
}

export function ctxFromRep(rep = {}) {
  return {
    party: !!rep.party,
    bound: rep.bound || 0,
    chained: rep.chained || 0,
    hushed: !!rep.hushed,
    magicStolen: rep.magicStolen || 0,
    goldStolen: rep.goldStolen || 0,
  };
}

// When the hero's blow lands: guard / ward / phase / always-on armor, if they actually did something.
export function cuesFromStrike(s, act, ctx = {}) {
  if (!s?.targetUid) return [];
  const uid = s.targetUid;
  const name = act?.name || '';
  const v = act?.v;
  const party = !!ctx.party;
  if (s.phased) return [cue(uid, 'phase', name || 'Phase', { party })].filter(Boolean);
  if (v === 'ward') {
    const burned = s.burned > 0;
    const blocked = s.guarded > 0;
    if (!burned && !blocked) return [];
    return [cue(uid, 'ward', name || 'Ward', { party, burned, n: s.guarded })].filter(Boolean);
  }
  if (v === 'guard' && s.guarded > 0) return [cue(uid, 'guard', name || 'Guard', { party, n: s.guarded })].filter(Boolean);
  if (s.guarded > 0) return [cue(uid, 'armor', 'Armor', { party, n: s.guarded })].filter(Boolean);
  return [];
}

// When the monster's own turn fires a special verb. Guard / ward / phase wait for the strike.
export function cueFromAct(act, ctx = {}) {
  if (!act) return null;
  const v = act.v;
  if (STRIKE_VERBS.has(v)) return null;
  if (HIT_VERBS.has(v) && !act.slam) return null;
  const party = !!ctx.party;
  const name = act.name || v;
  if (act.slam && v === 'breath') return cue(act.uid, 'breath', name, { party });
  if (act.slam) return cue(act.uid, 'slam', name, { party });
  if (v === 'charge' && act.cancelled) return null;
  if (v === 'pilfer' && !(ctx.goldStolen > 0 || act.net > 0)) return null;
  const extra = { party };
  if (v === 'drain') extra.n = act.drain || act.k || ctx.magicStolen;
  else if (v === 'pilfer') extra.n = ctx.goldStolen || 0;
  else if (v === 'bind') extra.n = ctx.bound || act.k;
  else if (v === 'chain') extra.n = ctx.chained || act.k;
  else if (v === 'mend') extra.n = act.healed ?? act.mag;
  else if (v === 'howl') extra.n = act.k;
  return cue(act.uid, v, name, extra);
}

// A monster's plain blow on one or more heroes: what it hit for, and what the hero's block took off it.
// hits: [{ name, part, net }] (part = its share of the blow, net = what got through).
export function cueFromHit(act, hits = []) {
  if (!act || !hits.length) return null;
  const lines = hits.map(({ name, part, net }) => {
    const ab = Math.max(0, n(part) - n(net));
    if (n(net) > 0) return ab > 0 ? `Hit ${name} for ${n(net)}. Block stopped ${ab}.` : `Hit ${name} for ${n(net)}.`;
    return ab > 0 ? `${name} blocked all ${n(part)}.` : `${name} was not hurt.`;
  });
  const any = hits.some((x) => n(x.net) > 0);
  const title = act.name || (act.v === 'pierce' ? 'Pierce' : 'Strike');
  const v = any ? 'hit' : 'blocked';
  return { uid: act.uid, v, name: title, icon: act.v === 'pierce' ? 'pierce' : any ? 'atk' : 'block', line: lines[0], lines, party: hits.length > 1, tag: TAG[v], tone: TONE[v] };
}

export function cueFromRage(uid, b) {
  const e = b?.enemies?.find((x) => x.uid === uid);
  return cue(uid, 'rage', e?.rageName || 'Enraged');
}

export function cueFromFlee(uid) {
  return cue(uid, 'flee', 'Fled', { line: 'Flew away! It will be back' });
}

// Every enemy special that actually fired this round (for tests, and as a backstop).
export function cuesFromReport(rep, b) {
  const ctx = ctxFromRep(rep);
  const out = [];
  const actOf = (uid) => (rep.acts || []).find((a) => a.uid === uid);
  if (rep.party) {
    for (const s of rep.strikes || []) out.push(...cuesFromStrike(s, actOf(s.targetUid), ctx));
  } else if (rep.targetUid) {
    out.push(...cuesFromStrike({
      targetUid: rep.targetUid, guarded: rep.guarded, phased: rep.phased, burned: rep.burned, dealt: rep.dealt,
    }, actOf(rep.targetUid), ctx));
  }
  for (const a of rep.acts || []) {
    const c = cueFromAct(a, ctx);
    if (c) out.push(c);
  }
  for (const uid of rep.raged || []) { const c = cueFromRage(uid, b); if (c) out.push(c); }
  for (const uid of rep.fled || []) { const c = cueFromFlee(uid); if (c) out.push(c); }
  return out;
}

// What each monster did this turn, as a few words across the top of the board, above its miniature (Dave): the move's name, coloured
// by what kind of move it is (red attack, blue defence, purple magic, green healing, gold sneaky), and two or three words about it.
// No icons and no numbers. They sit in front of the heading and stay while the round recap is open; closing the recap clears them
// (battle3d's hideCard calls `clear`), so the little hits and tumbles on the board play out clean.
function hostOf(fb) {
  const root = fb?.el?.closest('.b3'); if (!root) return null;
  let layer = root.querySelector(':scope > .fb-pops');
  if (!layer) { layer = h('div', { class: 'fb-pops', 'aria-live': 'polite' }); root.append(layer); }
  return layer;
}

function layout(fb) {
  const layer = hostOf(fb); if (!layer) return;
  const rootEl = layer.parentElement; const root = rootEl.getBoundingClientRect(); const board = fb.el.getBoundingClientRect();
  const W = root.width; const gap = 4;
  const foes = fb.el.querySelectorAll('.fb-slot.foe').length || 1;
  const side = fb.el.querySelector('.fb-side.foes');
  // in front of the heading, across the top, above the monsters (never over the heroes' side)
  const left = Math.max(3, (side ? side.getBoundingClientRect().left : board.left) - root.left); const right = W - 3;
  const maxW = Math.min(170, Math.max(70, (right - left) / foes - gap));
  const top = Math.max(0, board.top - root.top) + 8;
  const items = [...layer.children].filter((e) => e._piece?.rect).map((box) => {
    box.style.maxWidth = `${Math.round(maxW)}px`;
    const r = box._piece.rect();
    return { box, w: box.offsetWidth || 90, cx: board.left - root.left + r.cx };
  }).sort((p, q) => p.cx - q.cx);
  let x0 = left;
  for (const it of items) { it.x = Math.max(it.cx, x0 + it.w / 2); x0 = it.x + it.w / 2 + gap; }
  let limit = right;
  for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; it.x = Math.min(it.x, limit - it.w / 2); limit = it.x - it.w / 2 - gap; }
  for (const it of items) { it.box.style.left = `${Math.max(left + it.w / 2, it.x).toFixed(1)}px`; it.box.style.top = `${top.toFixed(1)}px`; }
}

export function show(fb, cue, { piece = null } = {}) {
  const layer = fb?.el && hostOf(fb); if (!layer || !cue) return null;
  const uid = String(cue.uid || '_');
  let box = [...layer.children].find((e) => e.dataset.uid === uid);
  if (!box) { box = h('div', { class: 'fb-mbox', role: 'status', 'data-uid': uid }); layer.append(box); }
  if (piece) box._piece = piece;
  // the same move told twice (a Pounce, then what the Pounce hit for) is one row
  if ([...box.children].some((r) => r.dataset.name === cue.name)) { layout(fb); return null; }
  const row = h('div', { class: `mrow tone-${cue.tone || 'sly'}`, 'data-name': cue.name }, h('b', {}, cue.name), cue.tag ? h('small', {}, cue.tag) : null);
  box.append(row);
  layout(fb);
  return row;
}

export function clear(fb) { fb?.el?.closest('.b3')?.querySelector(':scope > .fb-pops')?.remove(); }

export function showForStrike(fb, s, act, ctx, piece) {
  for (const c of cuesFromStrike(s, act, ctx)) show(fb, c, { piece });
}

export function showForAct(fb, act, ctx, piece) {
  const c = cueFromAct(act, ctx);
  if (c) show(fb, c, { piece });
}
