// The round card (Dave, Oct 2026): after every round, a plain pop-up that says what you did to the monster and what the
// monsters did to you, as arithmetic a new player can read at a glance:
//     YOU HIT  Goblin      ATTACK 10  −  GUARD 4  +  PIERCE 2  =  8 damage        Goblin 30 → 22
//     THEY HIT YOU  Goblin ATTACK 10  −  BLOCK 7              =  3 damage
//                   Wolf   ATTACK 8   −  BLOCK 0              =  8 damage        You 34 → 23
// Built from the engine's round report only (nothing here changes a rule).
import { h } from '../dom.js';
import * as HK from './hudkit.js';

const foe = (b, uid) => b?.enemies?.find((e) => e.uid === uid);
const fname = (b, uid) => foe(b, uid)?.name || 'Monster';

// one number in the sum: [icon] 10 LABEL
const tk = (kind, n, label, icon) => h('span', { class: `rc-tk ${kind}` }, icon ? HK.icon(icon) : null, h('b', {}, String(n)), label ? h('small', {}, label) : null);
const op = (s) => h('span', { class: 'rc-op', 'aria-hidden': 'true' }, s);
// the result of a blow: green DEALT for what you do to a monster, red YOU TAKE for what a monster does to you (so the two sides never look alike)
const out = (n, side = 'take') => h('span', { class: `rc-tk out ${side}${n > 0 ? '' : ' zero'}` }, h('b', {}, String(n)), h('small', {}, side === 'deal' ? (n > 0 ? 'dealt' : 'no damage') : (n > 0 ? 'you take' : 'blocked')));
// the die a monster rolled for its blow, red for an attack (blue for a guard), as a little die with the pips it landed on
const dieIcon = (size) => `d${[4, 6, 8, 10].includes(size) ? size : size > 10 ? 10 : 6}`;
// The die a monster rolled, and what that roll made: "d8 rolled 8:  1 move + 8 die + 3 fight bonus = 12 attack". A monster rolls one die a
// round (its power die); the move on its plate was picked earlier by a d6, and the die scales the move.
const rolled = (b, a) => {
  const e = foe(b, a.uid); const c = a.calc; const size = c?.size || e?.powerDie; if (!size || a.p == null) return null;
  const blue = a.v === 'guard' || a.v === 'ward';
  const dice = c?.dice?.length ? c.dice : [a.p];
  const chips = dice.map((v) => h('span', { class: `rc-roll ${blue ? 'blue' : 'red'}`, title: `It rolled a d${size}` }, HK.icon(dieIcon(size)), h('b', {}, String(v)), h('small', {}, `d${size}`)));
  return chips.length === 1 ? chips[0] : h('span', { class: 'rc-dice' }, ...chips.flatMap((x, i) => (i ? [h('i', { class: 'rc-plus' }, '+'), x] : [x])));
};
const calcLine = (b, a, word) => {
  const c = a.calc; const size = c?.size || foe(b, a.uid)?.powerDie; if (!c || !size || a.p == null || !(c.m || c.f)) return null;
  // "BASE 6  +  [d8: 5] + [d8: 3]": the number it always has, then each die it rolled (a x2 move rolls two), and any softening from your powers after.
  const base = c.f + c.flat + c.buff;
  const parts = [];
  if (base > 0) parts.push(h('span', { class: 'rc-b base' }, h('small', {}, 'base'), h('b', {}, String(base))), h('i', { class: 'rc-plus' }, '+'));
  parts.push(rolled(b, a));
  if (c.weaken) parts.push(h('i', { class: 'rc-plus' }, '−'), h('span', { class: 'rc-b soft' }, h('b', {}, String(c.weaken)), h('small', {}, 'softened')));
  // a guard has no 'you take' line after it, so say what it came to
  if (word === 'guard') parts.push(h('i', { class: 'rc-plus' }, '='), h('span', { class: 'rc-b total' }, h('b', {}, String(a.mag ?? 0)), h('small', {}, 'guard')));
  return h('div', { class: `rc-calc ${word === 'guard' ? 'blue' : 'red'}` }, ...parts);
};
// a blue shield with a line through it: this monster has no defence to roll
export const noDefence = (label = 'no defence') => h('span', { class: 'rc-nodef', title: 'This monster does not roll for defence' }, HK.icon('block'), h('small', {}, label));
// the guard your blow ran into: the die the monster rolled for it
const guardRoll = (t) => (t && t.p != null && t.powerDie ? h('span', { class: 'rc-roll blue', title: `Its guard came from a d${t.powerDie}` }, HK.icon(dieIcon(t.powerDie)), h('b', {}, String((t.pdice || [t.p]).slice(0, Math.max(1, t.intent?.m || 1)).reduce((x, v) => x + v, 0))), h('small', {}, `d${t.powerDie}`)) : null);
const note = (kind, text) => h('p', { class: `rc-note ${kind}` }, HK.rich(text));

// ---- what you did to the monster (one hero)
function strikeRow({ who, target, atk, pierce, guarded, dealt, phased, killed, hpFrom, hpTo, burned, you, guardOf, noGuard }) {
  const parts = [];
  if (atk > 0 || pierce === 0) parts.push(tk('atk', atk, 'attack', 'atk'));
  if (phased && atk > 0) parts.push(op('→'), h('span', { class: 'rc-tk guard' }, HK.icon('phase'), h('small', {}, 'passes through')));
  else if (guarded > 0) parts.push(op('−'), tk('guard', guarded, 'guard', 'block'), ...(guardOf ? [guardOf] : []));
  else if (noGuard) parts.push(op('−'), noDefence('no guard'));
  if (pierce > 0) parts.push(...(parts.length ? [op('+')] : []), tk('pierce', pierce, 'pierce', 'pierce'));
  parts.push(op('='), out(dealt, 'deal'));
  const hp = hpFrom != null ? h('em', { class: `rc-hp${killed ? ' dead' : ''}` }, killed ? 'falls! ' : '', h('b', {}, String(Math.max(0, Math.ceil(hpFrom)))), ' → ', h('b', {}, String(Math.max(0, Math.ceil(hpTo))))) : null;
  return h('div', { class: 'rc-line' },
    h('div', { class: 'rc-who' }, h('b', {}, who), h('span', {}, ` ${who === 'You' ? 'strike' : 'strikes'} ${target}`), hp),
    h('div', { class: 'rc-sum' }, parts),
    burned ? note('bad', `Fire Ward burned ${you || 'you'} for ${burned}.`) : null);
}

// ---- what one monster did
const SPECIAL = {
  guard: (a) => `raised a guard: your next attack loses ${a.mag}.`,
  mend: (a) => `healed itself ${a.healed ?? a.mag}.`,
  charge: (a) => (a.cancelled ? 'was hit and lost its wind-up.' : 'is winding up a big slam.'),
  howl: () => 'howled: every monster hits harder next round.',
  bind: (a, r) => `locked ${r.bound || 1} of your dice for next round.`,
  summon: () => 'called for help.',
  ward: () => 'is wreathed in fire: hit it and you burn.',
  stalk: () => 'is stalking you.',
  phase: () => 'is slipping out of reach: only pierce hurts it.',
  chain: (a, r) => `chains ${r.chained || a.k || 1} of your dice: they keep last round’s face.`,
  hush: () => 'hushes your heart next round: no amp, no colour bonus, no triple.',
  breath: null,
};
function foeRow(a, b, rep, blockTotal) {
  const name = fname(b, a.uid);
  const dmg = ['strike', 'pierce', 'drain', 'pilfer', 'breath'].includes(a.v);
  if (!dmg) { const f = SPECIAL[a.v]; return f ? h('div', { class: 'rc-line plain' }, h('div', { class: 'rc-who' }, h('b', {}, name), a.name ? h('em', { class: 'rc-move' }, a.name) : null, h('span', {}, ` ${f(a, rep)}`)), a.v === 'guard' || a.v === 'ward' ? calcLine(b, a, 'guard') : null) : null; }
  const parts = [];
  if (a.v === 'pierce') parts.push(tk('pierce', a.d, 'pierce', 'pierce'), h('span', { class: 'rc-tk guard' }, HK.icon('block'), h('small', {}, 'ignores block')));
  else parts.push(tk('atk', a.d, a.name || 'attack', 'atk'), op('−'), tk('block', a.ab || 0, 'block', 'block'));
  parts.push(op('='), out(a.net, 'take'));
  const extra = [];
  if (a.v === 'drain' && rep.magicStolen) extra.push(note('bad', `${name} stole ${rep.magicStolen} of your magic.`));
  if (a.v === 'pilfer' && rep.goldStolen) extra.push(note('bad', `${name} grabbed ${rep.goldStolen} gold. Kill it to take it back.`));
  void blockTotal;
  return h('div', { class: `rc-line${a.early ? ' early' : ''}` },
    h('div', { class: 'rc-who' }, h('b', {}, name), h('span', {}, a.early ? ' struck first' : ' hits you')), calcLine(b, a, a.v === 'pierce' ? 'pierce' : 'attack'), h('div', { class: 'rc-sum' }, parts), extra);
}

// ------------------------------------------------------------------------------------------ solo
function soloCard(rep, b) {
  const you = b?.hero?.name || 'You';
  const mine = [];
  if (rep.heroDown && !rep.targetUid) mine.push(note('bad', `${you} fell before striking.`));
  else if (rep.targetUid) {
    const t = foe(b, rep.targetUid);
    const dealtOnT = rep.dealt;
    mine.push(strikeRow({
      who: you, target: t?.name || 'Monster', atk: rep.T.atk, pierce: rep.T.pierce, guarded: rep.guarded, dealt: dealtOnT, phased: !!rep.phased, killed: (rep.killed || []).includes(rep.targetUid),
      hpFrom: t?.hp0 ?? (t ? t.hp + dealtOnT : null), hpTo: t?.hp ?? 0, burned: rep.burned, you: 'you', guardOf: guardRoll(t), noGuard: !!t && !rep.guarded && !rep.phased,
    }));
    for (const sp of rep.splashed || []) { if (sp.uid === rep.targetUid || !sp.dealt) continue; mine.push(note('you', `Splash: ${fname(b, sp.uid)} takes ${sp.dealt}${(rep.killed || []).includes(sp.uid) ? ' and falls' : ''}.`)); }
  }
  const theirs = (rep.acts || []).map((a) => foeRow(a, b, rep)).filter(Boolean);
  for (const u of rep.fled || []) theirs.push(note('meh', `${fname(b, u)} flees, wounded. It will be back.`));
  const tail = [];
  if (rep.T.block > 0) tail.push(h('span', { class: 'rc-chip block' }, HK.icon('block'), `Your block ${rep.T.block}`, h('small', {}, `soaked ${rep.absorbed || 0}`)));
  if (rep.healed) tail.push(h('span', { class: 'rc-chip heal' }, HK.icon('heal'), `Healed +${rep.healed}`));
  const burn = rep.burned || 0; const hit = Math.max(0, (rep.taken || 0) - burn);
  const youBox = h('div', { class: 'rc-you' },
    h('span', { class: 'rc-yl' }, `${you}`),
    h('span', { class: 'rc-hpbox' }, h('b', {}, String(Math.max(0, Math.ceil(rep.hpBefore))), ' → ', h('b', { class: rep.hpAfter < rep.hpBefore ? 'down' : rep.hpAfter > rep.hpBefore ? 'up' : '' }, String(Math.max(0, Math.ceil(rep.hpAfter)))))),
    h('span', { class: 'rc-took' }, `took ${hit + burn}`));
  return { mine, theirs, tail, youBox };
}

// ------------------------------------------------------------------------------------------ company
function partyCard(rep, b) {
  const mine = (rep.strikes || []).map((s) => {
    const t = foe(b, s.targetUid);
    return strikeRow({
      who: s.name, target: t?.name || 'Monster', atk: s.atk, pierce: s.pierce, guarded: s.guarded, dealt: s.dealt, phased: !!s.phased, killed: !!s.killed,
      hpFrom: t ? (t.hp0 ?? t.hp + s.dealt) : null, hpTo: t?.hp ?? 0, burned: s.burned, you: s.name, guardOf: guardRoll(t), noGuard: !!t && !s.guarded && !s.phased,
    });
  });
  for (const n of rep.fallen || []) mine.push(note('bad', `${n} fell before striking.`));
  const theirs = [];
  for (const a of rep.acts || []) {
    const name = fname(b, a.uid);
    const dmg = ['strike', 'pierce', 'drain', 'pilfer', 'breath'].includes(a.v);
    if (!dmg) { const f = SPECIAL[a.v]; if (f) theirs.push(h('div', { class: 'rc-line plain' }, h('div', { class: 'rc-who' }, h('b', {}, name), a.name ? h('em', { class: 'rc-move' }, a.name) : null, h('span', {}, ` ${f(a, rep)}`)), a.v === 'guard' || a.v === 'ward' ? calcLine(b, a, 'guard') : null)); continue; }
    const heads = (rep.fighters || []).filter((x) => !x.down);
    const parts = [];
    if (a.v === 'pierce') parts.push(tk('pierce', a.d, 'pierce', 'pierce'), h('span', { class: 'rc-tk guard' }, HK.icon('block'), h('small', {}, 'ignores block')));
    else parts.push(tk('atk', a.d, a.name || 'attack', 'atk'), op('−'), tk('block', a.ab || 0, 'block', 'block'));
    parts.push(op('='), out(a.net, 'take'));
    // each hero's share: their part, what their own block took, what got through
    const shares = Array.isArray(a.parts) ? a.parts.map((p, i) => ({ who: heads[i]?.name, p, net: a.nets?.[i] ?? p })).filter((s) => s.who && s.p > 0) : [];
    theirs.push(h('div', { class: 'rc-line' }, h('div', { class: 'rc-who' }, h('b', {}, name), h('span', {}, ' hits the company')), calcLine(b, a, a.v === 'pierce' ? 'pierce' : 'attack'), h('div', { class: 'rc-sum' }, parts),
      shares.length > 1 ? h('div', { class: 'rc-sub' }, shares.map((s) => h('span', { class: 'rc-share' }, h('b', {}, s.who), s.net <= 0 ? ` blocked all ${s.p}` : s.net === s.p ? ` took ${s.net}` : ` took ${s.net} (blocked ${s.p - s.net})`))) : null));
  }
  const tail = [];
  if (rep.leader && (rep.fighters || []).filter((x) => !x.down).length > 1) tail.push(h('span', { class: 'rc-chip lead' }, HK.icon('windup'), rep.leaderWhy === 'guard' ? `${rep.leader} stepped in front (Shield Up) and took the double share` : `${rep.leader} drew the monsters (slowest feet)`));
  const youBox = h('div', { class: 'rc-you party' }, (rep.fighters || []).map((f) => h('span', { class: `rc-pf${f.down ? ' out' : ''}` },
    h('b', {}, f.name), h('i', {}, f.down ? 'down' : `${f.taken ? `−${f.taken}` : '0'}${f.absorbed ? ` (${f.absorbed} blocked)` : ''}${f.healed ? ` +${f.healed}` : ''} → ${Math.max(0, Math.ceil(f.hpAfter))}`))));
  return { mine, theirs, tail, youBox };
}

// ------------------------------------------------------------------------------------------ the card
export function roundCard(rep, b, { onClose, closeLabel = '✕ Close', title = '' } = {}) {
  const c = rep.party ? partyCard(rep, b) : soloCard(rep, b);
  const near = (rep.acts || []).some((a) => a.early) && !rep.party;
  const el = h('section', { class: 'rc', role: 'dialog', 'aria-label': `Round ${rep.round} result`, onclick: (e) => { if (!e.target.closest('.rc-body a')) onClose?.(); } },
    h('header', { class: 'rc-head' }, h('b', {}, `Round ${rep.round}`), h('span', {}, title || (near ? 'a monster was quick' : '')), h('button', { type: 'button', class: `sh-x sh-cancel rc-close ${title ? 'rc-go' : ''}`, 'aria-label': title ? closeLabel : 'Close the round summary', onclick: (e) => { e.stopPropagation(); onClose?.(); } }, closeLabel)),
    h('div', { class: 'rc-body' },
      h('div', { class: 'rc-sec you' }, h('div', { class: 'rc-bar' }, HK.icon('atk'), rep.party ? 'Your company strikes' : 'Your strike'), h('div', { class: 'rc-rows' }, c.mine.length ? c.mine : [note('meh', 'No strike this round.')])),
      h('div', { class: 'rc-sec foes' }, h('div', { class: 'rc-bar' }, HK.icon('slam'), 'The monsters strike back'), h('div', { class: 'rc-rows' }, c.theirs.length ? c.theirs : [note('good', 'Nothing hit back.')], h('div', { class: 'rc-foot' }, c.tail, c.youBox)))),
  );
  return el;
}
