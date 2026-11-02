// T24 Monster Specials screens (Crockpot / Grok Bot, 2 Nov 2026; Dave approved the screens Nov 2, 9:28 AM CT).
// Three pieces, and they read ONLY Claude's data contract (docs/team/tasks/T24-monster-specials.md, "BUILD STARTED"):
//   label under each monster   <- E.specialView(b, e)  { id, name, top, bottom, tone, icon, always, isNew, progress:{have,need,estimate}|null }
//   round-start plan board     <- E.specialPlan(b)     [{ uid, name, top, bottom, line, isNew, tone }]
//   after-round outcome lines  <- b.report.specials    [{ uid, name, id, ok, line, have, need }]
// With D.SPECIALS.on off (the live default) every getter returns nothing and no screen changes. `?t24demo` feeds placeholder
// data in the same shape so the screens can be seen before the engine lands; nothing here changes a rule.
import { h } from '../dom.js';
import * as E from '../engine.js';
import * as D from '../data.js';
import * as HK from './hudkit.js';
import * as MC from './minicard.js';

const demo = () => typeof location !== 'undefined' && /[?&]t24demo\b/.test(location.search);
let cur = null; // the battle the label reads (flat.js paints a monster without its battle; battle3d hands it over here)
export const setBattle = (b) => { cur = b || null; };
export const live = () => !!(D.SPECIALS?.on && typeof E.specialView === 'function');

// ---- placeholders, the contract's shape exactly
const DEMO = [
  { id: 'slam', name: 'Slam', top: 'Damage 20', bottom: 'or Slam 2x', tone: 'damage', icon: 'slam', always: false, isNew: true, progress: { have: 14, need: 20, estimate: true }, line: 'Damage 20, or it Slams for double.' },
  { id: 'spawn', name: 'Spawn', top: 'Damage 1', bottom: 'or Spawn 1', tone: 'summon', icon: 'atk', always: false, isNew: false, progress: { have: 3, need: 1, estimate: false }, line: 'Any damage, or it calls a friend.' },
  { id: 'regrow', name: 'Regrow', top: 'Damage 8', bottom: 'or Heals 8', tone: 'heal', icon: 'heal', always: true, isNew: false, progress: { have: 5, need: 8, estimate: true }, line: 'Damage 8 every round, or it heals 8.' },
];
const order = new Map(); const seen = (uid) => { if (!order.has(uid)) order.set(uid, order.size); return order.get(uid); };
const demoFor = (e, i) => (e?.tier === 'boss' ? DEMO[2] : DEMO[i % 2]);
const foesOf = (b) => (b?.enemies || []).filter((e) => e.hp > 0);
export const demoPlan = (enemies) => enemies.map((e, i) => { const s = demoFor(e, i); return { uid: e.uid, name: e.name, top: s.top, bottom: s.bottom, line: s.line, isNew: s.isNew, tone: s.tone }; });
export const demoReport = (enemies) => enemies.map((e, i) => { const s = demoFor(e, i); const ok = i % 2 === 0;
  return { uid: e.uid, name: e.name, id: s.id, ok, have: ok ? 23 : 0, need: s.progress.need, line: ok ? `${s.name} broken, 23 of ${s.progress.need}` : s.id === 'spawn' ? 'Spawned a friend' : 'Healed 8' }; });

// ---- getters (null / [] when there is nothing to show)
export function viewOf(e, b = cur) {
  if (demo()) { const list = b?.enemies; const i = list ? Math.max(0, list.findIndex((x) => x.uid === e.uid)) : seen(e.uid); const s = demoFor(e, i); const { line, ...v } = s; return v; }
  if (!live() || !b) return null;
  try { return E.specialView(b, e) || null; } catch { return null; }
}
export function planOf(b = cur) {
  if (demo()) return demoPlan(foesOf(b)).slice(0, Math.max(1, foesOf(b).length - 1)); // leave one plain monster so "No Special" shows
  if (!live() || !b || typeof E.specialPlan !== 'function') return [];
  try { return E.specialPlan(b) || []; } catch { return []; }
}
export function reportOf(rep, b = cur) {
  if (Array.isArray(rep?.specials) && rep.specials.length) return rep.specials;
  if (demo()) return demoReport(b?.enemies || []);
  return [];
}

// ---- 1. the label: goal on top (with its progress bar), "or else" below; met = gold bar, struck "or else", Broken stamp
export function labelEl(v) {
  if (!v) return null;
  const p = v.progress; const met = !!(p && p.have >= p.need);
  const k = p ? Math.max(0, Math.min(1, p.have / Math.max(1, p.need))) : 0;
  return h('div', { class: `sp-label tone-${v.tone}${met ? ' met' : ''}${v.always ? ' always' : ''}`, 'data-special': v.id, title: `${v.name}: ${v.top}, ${v.bottom}` },
    h('div', { class: 'sp-top', style: `--k:${k}` }, h('i', { class: 'sp-bar', 'aria-hidden': 'true' }), v.icon ? h('span', { class: 'sp-ic' }, HK.icon(v.icon)) : null, h('b', {}, v.top),
      p ? h('small', { class: `sp-n${p.estimate ? ' est' : ''}` }, `${Math.min(p.have, 999)}/${p.need}`) : null),
    h('div', { class: 'sp-bot' }, h('span', {}, v.bottom), met ? h('em', { class: 'sp-broken' }, 'Broken') : null));
}
export const labelSig = (v) => (v ? [v.id, v.top, v.bottom, v.tone, v.always, v.progress?.have, v.progress?.need, v.progress?.estimate].join('|') : '');

// ---- 2. the round-start plan board: one row per Special (max 3), plain monsters grouped, one Fight button
const thumb = (img) => h('span', { class: 'sp-thumb' }, img ? h('img', { src: img, alt: '' }) : null);
export function planBoardEl(rows, { plain = [], round = 1, imgOf = () => '', onFight } = {}) {
  const shown = rows.slice(0, 3); const more = rows.slice(3);
  const el = h('section', { class: 'sp-plan', role: 'dialog', 'aria-label': `Round ${round}: the monsters' plan` },
    h('header', { class: 'sp-plan-head' }, h('b', {}, `Round ${round}`), h('span', {}, 'The monsters’ plan')),
    h('div', { class: 'sp-plan-rows' }, ...shown.map((r) => h('div', { class: `sp-row tone-${r.tone}${r.isNew ? ' new' : ''}`, 'data-uid': r.uid },
      thumb(imgOf(r.uid)),
      h('div', { class: 'sp-row-txt' }, h('b', {}, r.name), h('span', { class: 'sp-row-goal' }, h('strong', {}, r.top), ' · ', h('i', {}, r.bottom)),
        r.isNew ? h('small', { class: 'sp-row-line' }, r.line) : null),
      r.isNew ? h('em', { class: 'sp-ribbon' }, 'New Special') : null)),
      more.length || plain.length ? h('div', { class: 'sp-plain' }, h('b', {}, more.length ? 'Also' : 'No Special'), h('span', {}, [...more.map((r) => `${r.name}: ${r.top}`), ...plain].join(' · '))) : null),
    h('button', { type: 'button', class: 'btn sp-fight', onclick: (e) => { e.stopPropagation(); el.remove(); onFight?.(); } }, 'Fight'));
  return el;
}
// Convenience for the round-start seam: build from a battle (null when no monster has a Special this round).
const mcSeen = new WeakSet();
export function planFor(b = cur, opts = {}) {
  if (b && MC.on() && !mcSeen.has(b)) { mcSeen.add(b); const v = pickerFor(b, opts); if (v) return v; } // mini card picker first (flag only), then this board
  return boardFor(b, opts);
}
function boardFor(b, opts) {
  const rows = planOf(b); if (!rows.length) return null;
  const has = new Set(rows.map((r) => r.uid));
  return planBoardEl(rows, { round: b?.round || 1, plain: foesOf(b).filter((e) => !has.has(e.uid)).map((e) => e.name), ...opts });
}

// The monster mini card target picker (js/g3/minicard.js), at fight start under ?minicards / ?minicarddemo. Until battle3d calls
// MC.open itself (hook requested on the BOARD), the pick goes through the monster's own plaque tap, so the game's gold target ring
// and every targeting rule stay battle3d's; the plan board follows.
function pickerFor(b, opts) {
  const foes = foesOf(b); if (foes.length < 2) return null;
  let plans = {}; let owns = {};
  if (MC.demo()) ({ plans, owns } = MC.demoData(foes));
  else for (const e of foes) { const v = viewOf(e, b); if (v) { plans[e.uid] = v; owns[e.uid] = [v.id]; } } // real: this round's Special; full lists await Claude
  return MC.open({ enemies: foes, plans, owns, mode: b.fighters ? 'party' : 'solo', imgOf: (e) => opts.imgOf?.(e.uid) || D.MONSTERS[e.id]?.img || '', initOf: (e) => D.MONSTERS[e.id]?.init ?? null, sure: !MC.demo() || foes.length > 2 },
    (uid, par) => { const slot = document.querySelector(`.fb-slot.foe[data-uid="${uid}"]`); (slot?.querySelector('.fb-card') || slot?.firstElementChild)?.click();
      const board = boardFor(b, opts); if (board && par) par.append(board); });
}

// ---- 3. the after-round answer: one line per monster, ✓/✗ chip, misses first (Recap keeps the dice detail)
export function outcomeEl(rows) {
  if (!rows?.length) return null;
  const sorted = [...rows].sort((a, b) => Number(a.ok) - Number(b.ok));
  return h('div', { class: 'rc-sec sp-out' }, h('div', { class: 'rc-bar' }, HK.icon('star'), 'Specials'),
    h('div', { class: 'sp-out-rows' }, ...sorted.map((r) => h('div', { class: `sp-out-row ${r.ok ? 'ok' : 'miss'}`, 'data-uid': r.uid },
      h('span', { class: 'sp-chip', 'aria-label': r.ok ? 'met' : 'missed' }, r.ok ? '✓' : '✗'), h('b', {}, r.name), h('span', {}, r.line)))));
}
