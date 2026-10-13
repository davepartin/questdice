// Enemy ability pop-ups for new players (Dave, Oct 2026): when a monster's special move
// actually fires in the battle replay, a short gold-framed card names it and says what it did.
// Driven from the engine round report and intent verbs, so a new monster with an existing verb
// gets a pop-up with no extra wiring. Hero abilities never appear here. Nothing here changes a rule.
import { h, reduced } from '../dom.js';
import * as HK from './hudkit.js';

export const LIFE = 2.5; // seconds, including fade in and out

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
  return { uid, v, name: title, icon: extra.icon || iconOf(title, v), line, party: !!extra.party };
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

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function hostOf(fb) {
  if (!fb?.el) return null;
  let layer = fb.el.querySelector('.fb-pops');
  if (!layer) {
    layer = h('div', { class: 'fb-pops', 'aria-live': 'polite' });
    fb.el.append(layer);
  }
  return layer;
}

function stacks(fb) {
  if (!fb._popStacks) fb._popStacks = new Map();
  return fb._popStacks;
}

function place(el, fb, piece, uid) {
  const W = fb.el.clientWidth || 360;
  const H = fb.el.clientHeight || 240;
  const st = stacks(fb);
  const i = st.get(uid) || 0;
  st.set(uid, i + 1);
  el._popUid = uid;
  const hw = Math.min((el.offsetWidth || 168) / 2 + 6, W / 2 - 8);
  let x = W / 2;
  let y = 14 + i * 52;
  if (piece?.rect) {
    const r = piece.rect();
    // Open sky toward the middle of the table, above the mini — not on the damage numbers.
    const towardCenter = r.cx > W * 0.5 ? -1 : 1;
    x = r.cx + towardCenter * 88;
    y = Math.max(16, r.top - 12 - i * 48);
    if (y < 10) y = Math.min(H - 58, Math.max(10, r.top + 22 + i * 8));
  }
  x = clamp(x, hw + 8, W - hw - 8);
  y = clamp(y, 8, Math.max(8, H - 52));
  el.style.left = `${x.toFixed(1)}px`;
  el.style.top = `${y.toFixed(1)}px`;
}

function paint(el, k) {
  const fadeIn = 0.1;
  const fadeOut = 0.18;
  let o = 1;
  let y = 0;
  if (k < fadeIn) { o = k / fadeIn; y = 8 * (1 - k / fadeIn); }
  else if (k > 1 - fadeOut) { o = (1 - k) / fadeOut; y = -6 * ((k - (1 - fadeOut)) / fadeOut); }
  el.style.opacity = String(o);
  el.style.transform = `translate(-50%, calc(-100% + ${y.toFixed(1)}px))`;
}

// Non-blocking: do not await this from the replay. Lifetime follows the stage clock so screenshots can step it.
export function show(fb, cue, { piece = null } = {}) {
  if (!fb?.el || !cue) return null;
  const layer = hostOf(fb);
  const el = h('div', {
    class: `fb-pop v-${cue.v}`,
    role: 'status',
    'data-uid': cue.uid || '',
    'data-v': cue.v,
  },
  h('span', { class: 'ap-ico', 'aria-hidden': 'true' }, HK.icon(cue.icon)),
  h('span', { class: 'ap-tx' }, h('b', {}, cue.name), h('small', {}, cue.line)));
  el.style.opacity = '0';
  layer.append(el);
  place(el, fb, piece, cue.uid || '_');
  const quiet = reduced();
  if (quiet) { el.classList.add('still'); el.style.opacity = '1'; el.style.transform = 'translate(-50%, -100%)'; }
  const done = () => {
    el.remove();
    const st = stacks(fb);
    const uid = el._popUid;
    const left = Math.max(0, (st.get(uid) || 1) - 1);
    if (left) st.set(uid, left); else st.delete(uid);
  };
  const tw = fb.tween?.(LIFE, (k) => { if (!quiet) paint(el, k); else if (k >= 0.92) el.style.opacity = '0'; });
  if (tw?.then) tw.then(done); else setTimeout(done, LIFE * 1000);
  return el;
}

export function showForStrike(fb, s, act, ctx, piece) {
  for (const c of cuesFromStrike(s, act, ctx)) show(fb, c, { piece });
}

export function showForAct(fb, act, ctx, piece) {
  const c = cueFromAct(act, ctx);
  if (c) show(fb, c, { piece });
}
