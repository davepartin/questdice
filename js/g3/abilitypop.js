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
  return { uid, v, name: title, icon: extra.icon || iconOf(title, v), line, lines: extra.lines || null, party: !!extra.party };
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
  return { uid: act.uid, v: any ? 'hit' : 'blocked', name: title, icon: act.v === 'pierce' ? 'pierce' : any ? 'atk' : 'block', line: lines[0], lines, party: hits.length > 1 };
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

// What each monster did, summarised in one small box that sits over its own miniature (Dave). A monster that did several things
// (a guard when you hit it, then a blow of its own) gets rows in the same box. The boxes stay up while the round recap is open and
// are cleared when it is closed (battle3d's hideCard calls `clear`).
function hostOf(fb) {
  if (!fb?.el) return null;
  let layer = fb.el.querySelector(':scope > .fb-pops');
  if (!layer) { layer = h('div', { class: 'fb-pops', 'aria-live': 'polite' }); fb.el.append(layer); }
  return layer;
}

// Each box centres on its monster's miniature, a little way down from its head. Neighbouring boxes are nudged apart sideways (and
// kept on the board) so none sits on another.
function layout(fb) {
  const layer = fb.el.querySelector(':scope > .fb-pops'); if (!layer) return;
  const W = fb.el.clientWidth || 360; const H = fb.el.clientHeight || 240; const gap = 4;
  const foes = fb.el.querySelectorAll('.fb-slot.foe').length || 1;
  // stay on the monsters' side of the table: never over the heroes
  const side = fb.el.querySelector('.fb-side.foes'); const base = fb.el.getBoundingClientRect();
  const left = Math.max(3, side ? side.getBoundingClientRect().left - base.left : 3); const right = W - 3;
  layer.classList.toggle('tight', foes >= 3);
  const boxes = [...layer.children].filter((e) => e._piece?.rect);
  const maxW = Math.min(184, Math.max(88, (right - left) / foes - gap));
  const items = boxes.map((box) => {
    box.style.maxWidth = `${Math.round(maxW)}px`;
    const r = box._piece.rect(); const w = box.offsetWidth || 110; const bh = box.offsetHeight || 60;
    return { box, w, cx: r.cx, y: Math.max(3, Math.min(H - bh - 3, r.top + r.h * 0.2)), x: r.cx };
  }).sort((p, q) => p.cx - q.cx);
  let edge = left;
  for (const it of items) { it.x = Math.max(it.cx, edge + it.w / 2); edge = it.x + it.w / 2 + gap; }
  let limit = right;
  for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; it.x = Math.min(it.x, limit - it.w / 2); limit = it.x - it.w / 2 - gap; }
  for (const it of items) { it.box.style.left = `${Math.max(left + it.w / 2, it.x).toFixed(1)}px`; it.box.style.top = `${it.y.toFixed(1)}px`; }
}

export function show(fb, cue, { piece = null } = {}) {
  if (!fb?.el || !cue) return null;
  const layer = hostOf(fb); const uid = String(cue.uid || '_');
  let box = [...layer.children].find((e) => e.dataset.uid === uid);
  if (!box) { box = h('div', { class: 'fb-mbox', role: 'status', 'data-uid': uid }); layer.append(box); }
  if (piece) box._piece = piece;
  // the same move told twice (a Pounce, then what the Pounce hit for) is one row, with both lines
  const last = box.lastElementChild;
  if (last && last.dataset.name === cue.name) {
    const tx = last.querySelector('.ap-tx');
    for (const t of (cue.lines || [cue.line])) if (![...tx.querySelectorAll('small')].some((x) => x.textContent === t)) tx.append(h('small', {}, t));
    last.className = `mrow v-${cue.v}`;
    layout(fb);
    return last;
  }
  const row = h('div', { class: `mrow v-${cue.v}`, 'data-name': cue.name },
    h('span', { class: 'ap-ico', 'aria-hidden': 'true' }, HK.icon(cue.icon)),
    h('span', { class: 'ap-tx' }, h('b', {}, cue.name), ...(cue.lines || [cue.line]).map((t) => h('small', {}, t))));
  box.append(row);
  layout(fb);
  return row;
}

export function clear(fb) { fb?.el?.querySelector(':scope > .fb-pops')?.remove(); }

export function showForStrike(fb, s, act, ctx, piece) {
  for (const c of cuesFromStrike(s, act, ctx)) show(fb, c, { piece });
}

export function showForAct(fb, act, ctx, piece) {
  const c = cueFromAct(act, ctx);
  if (c) show(fb, c, { piece });
}
