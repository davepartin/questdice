// Monster mini card target picker (Crockpot / Grok Bot, 2 Nov 2026; Dave approved Nov 2, 1:54 PM CT, "Go. Do what is best").
// Board-game style mini cards, one per monster, stacked with a quarter overlap: tap a card to bring it to the front, Attack picks it.
// Each card: small picture, name bar, stats strip (HP / ARM / DIE / INIT), every power the monster owns (CAPS keyword, normal-case
// name) with only this round's power lit and its two lines (what you must do / what it will do), and a Solo / Party tag.
// OFF in the live game: opens only with ?minicards (real data) or ?minicarddemo (placeholder powers). Reads js/g3/specials.js shapes.
//   MC.open({ enemies, plans, owns, mode, imgOf, initOf }, onPick)  -> the veil element; onPick(uid, parent) after Attack, then the veil closes
//     enemies: live b.enemies; plans: { [uid]: specialView } (this round, may be empty); owns: { [uid]: [special ids] } (all powers)
import { h } from '../dom.js';

const q = () => (typeof location !== 'undefined' ? location.search : '');
export const demo = () => /[?&]minicarddemo\b/.test(q());
export const on = () => demo() || /[?&]minicards\b/.test(q());

// Per-mode numbers, editable here. hp / goal multiply what the engine gives (1 = show the real number). The party values are
// PLACEHOLDER until the team game is measured (Claude's engine already scales real party fights).
export const MODES = {
  solo: { tag: 'Solo', hp: 1, goal: 1 },
  party: { tag: 'Party', hp: 1, goal: 1 },
};

// The words. kw is the CAPS keyword (the enemy's action), name stays normal case; goal / does are the lit row's two lines.
const num = (s) => (String(s || '').match(/\d+/) || [])[0];
const scale = (s, k) => (k === 1 || !num(s) ? s : String(s).replace(/\d+/, String(Math.round(num(s) * k))));
export const POWERS = {
  slam: { kw: '2x ATTACK', name: 'Slam', c: '#e0483c', goal: (v) => v?.top || 'Deal 15 damage', does: () => 'or it does 2x ATTACK' },
  spawn: { kw: 'SPAWNS', name: 'Spawn', c: '#a06ae6', goal: () => 'Hit it once', does: (v, x) => `or it SPAWNS a ${x.kid || 'surprise'}` },
  regrow: { kw: 'HEALS', name: 'Regrow', c: '#3fae5a', goal: (v) => v?.top || 'Deal 8 damage', does: (v) => `or it HEALS ${num(v?.bottom) || num(v?.top) || 8}` },
  shield: { kw: 'SHIELD', name: 'Shield', c: '#3c8fe0', goal: (v) => v?.top || 'Attack 6', does: () => 'breaks its SHIELD for good' },
  bounty: { kw: 'BOUNTY', name: 'Bounty', c: '#e0b03c', goal: (v) => v?.top || 'Kill it in 2', does: () => 'and you win BOUNTY gold' },
  sleeping: { kw: 'SLEEPS', name: 'Sleeping', c: '#7a8aa6', goal: () => 'Kill it in one blow', does: () => 'or it WAKES and hits 2x' },
  fights: { kw: 'FIGHTS', name: 'Rolls its dice', c: '#8a7a62', goal: () => 'No special this round', does: () => 'it just attacks' },
};
// PLACEHOLDER power lists for ?minicarddemo only (which monster owns what is Claude's call; asked on the BOARD).
const DEMO_OWNS = { goblin: ['slam', 'spawn'], skeleton: ['shield', 'spawn'], wolf: ['slam', 'regrow'], cultist: ['regrow', 'spawn'] };
const DEMO_NOW = ['slam', 'spawn', 'fights'];
export function demoData(enemies) {
  const owns = {}; const plans = {};
  enemies.forEach((e, i) => { owns[e.uid] = DEMO_OWNS[e.id] || ['slam']; const id = DEMO_NOW[i % 3] === 'fights' && enemies.length < 3 ? 'spawn' : DEMO_NOW[i % 3];
    if (id !== 'fights') { if (!owns[e.uid].includes(id)) owns[e.uid] = [id, ...owns[e.uid]]; plans[e.uid] = { id, top: id === 'slam' ? 'Damage 20' : '', bottom: '' }; } });
  return { owns, plans };
}

export function open({ enemies = [], plans = {}, owns = {}, mode = 'solo', imgOf = () => '', initOf = () => null, sure = true } = {}, onPick) {
  const M = MODES[mode] || MODES.solo; const foes = enemies.filter((e) => e.hp > 0); const n = foes.length;
  if (!n) return null;
  const kid = sure ? foes.reduce((a, e) => (e.maxHp < a.maxHp ? e : a)).name : null; // the engine's rally: the smallest living monster calls a copy of itself
  const veil = h('div', { class: 'mnc-veil', role: 'dialog', 'aria-label': 'Choose your target' });
  const stack = h('div', { class: 'mnc-stack', style: `--n:${n}` });
  let sel = 0;
  const paint = () => [...stack.children].forEach((c, i) => { c.classList.toggle('top', i === sel); c.style.setProperty('--z', String(i === sel ? 9 : n - Math.abs(i - sel))); });
  foes.forEach((e, i) => {
    const plan = plans[e.uid]; const now = plan?.id && POWERS[plan.id] ? plan.id : 'fights';
    const list = [...new Set([...(owns[e.uid] || []), ...(now !== 'fights' ? [now] : [])])].filter((k) => POWERS[k] && k !== 'fights'); list.push('fights');
    const lit = POWERS[now];
    const stats = [['HP', Math.round(e.maxHp * M.hp)], ['ARM', e.armor || 0], ['DIE', String(e.powerDie || 'd8').replace(/^d/, 'd')], ['INIT', initOf(e) ?? '–']];
    const rows = list.map((k) => { const P = POWERS[k]; const isOn = k === now;
      return h('div', { class: `mnc-row${isOn ? ' on' : ''}`, style: `--rc:${P.c}`, 'data-power': k }, h('div', { class: 'mnc-kw' }, h('b', {}, P.kw), ` ${P.name}`),
        isOn ? h('div', { class: 'mnc-goal' }, scale(P.goal(plan), M.goal)) : null, isOn ? h('div', { class: 'mnc-does' }, P.does(plan, { kid })) : null); });
    const card = h('div', { class: 'mnc-card', style: `--c:${lit.c};--i:${i};--r:${(i - (n - 1) / 2) * 3}deg`, 'data-uid': e.uid, role: 'button', tabindex: '0', 'aria-label': e.name,
      onclick: () => { sel = i; paint(); } },
      h('div', { class: 'mnc-top' }, h('div', { class: 'mnc-pic' }, h('img', { src: imgOf(e) || '', alt: '' })), h('span', { class: 'mnc-tag' }, M.tag)),
      h('div', { class: 'mnc-title' }, e.name), h('div', { class: 'mnc-stats' }, ...stats.map(([k, v]) => h('span', {}, h('i', {}, k), String(v)))),
      h('div', { class: 'mnc-rows' }, ...rows));
    stack.append(card);
  });
  const go = h('button', { type: 'button', class: 'btn mnc-pick', onclick: (ev) => { ev.stopPropagation(); const uid = foes[sel].uid; const par = veil.parentNode; veil.remove(); onPick?.(uid, par); } }, 'Attack');
  veil.append(h('div', { class: 'mnc-head' }, 'Choose your target'), stack, go);
  paint();
  return veil;
}
