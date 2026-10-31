// pb1 (Dave, 31 Oct 2026; Crockpot / Grok Bot): the quest track as a printed cardboard GAME BOARD. The act's ten quests are spaces on a
// winding road; the hero (or the party) stands on the current space as small minis on bases, and slides to the next space after a win.
// Completed spaces are stamped with a check; the Elite space is a red-banner stronghold and the Boss space a castle. Portrait phones only
// show this board (css/gameboard.css); landscape keeps the old trail. Pure layout maths (spacePos, roadPath) are exported for tests.
import { h } from '../dom.js';
import { ico } from './icons.js';

// Where each space sits, in a 100 x 50 board: two rows that wind left to right, then back, the road bending between them.
export function spacePos(n, N = 10) {
  const per = Math.ceil(N / 2); const i = n - 1; const row = i < per ? 0 : 1; const k = row ? i - per : i;
  const t = per > 1 ? k / (per - 1) : 0.5; const x0 = 11, x1 = 89;
  const x = row ? x1 - t * (x1 - x0) : x0 + t * (x1 - x0);
  const wave = Math.sin((t + row * 0.5) * Math.PI * 2) * 2.6; // a gentle up-and-down, like a road over hills
  return { x: +x.toFixed(2), y: +((row ? 37 : 14) + wave).toFixed(2), row };
}
// A smooth road through all the spaces (Catmull-Rom as cubic Béziers), with a wide bend from the end of row one down to row two.
export function roadPath(N = 10) {
  const p = Array.from({ length: N }, (_, i) => spacePos(i + 1, N)); const per = Math.ceil(N / 2);
  const pts = [...p.slice(0, per), { x: 97, y: (p[per - 1].y + p[per].y) / 2 }, ...p.slice(per)];
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i - 1] || pts[i], b = pts[i], c = pts[i + 1], e = pts[i + 2] || c;
    d += ` C${(b.x + (c.x - a.x) / 6).toFixed(2)} ${(b.y + (c.y - a.y) / 6).toFixed(2)} ${(c.x - (e.x - b.x) / 6).toFixed(2)} ${(c.y - (e.y - b.y) / 6).toFixed(2)} ${c.x} ${c.y}`;
  }
  return d;
}
// The last space each hero was drawn on, so the pieces can slide from it (once) after a win.
const KEY = (heroes, act) => `qd.gb.${heroes.map((x) => x.name).join('+')}.${act}`;
export function lastSpace(heroes, act, store = globalThis.localStorage) { try { return +(store?.getItem(KEY(heroes, act)) || 0); } catch { return 0; } }
export function keepSpace(heroes, act, step, store = globalThis.localStorage) { try { store?.setItem(KEY(heroes, act), String(step)); } catch { /* private mode */ } }

const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (cls, vb, inner) => { const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', vb); s.setAttribute('class', cls); s.setAttribute('aria-hidden', 'true'); s.setAttribute('preserveAspectRatio', 'none'); s.innerHTML = inner; return s; };
// little printed scenery between the rows: pines, hills, a river, a compass
const SCENERY = `
  <g class="gb-hills"><path d="M2 27 Q8 21 14 27 Q19 22 25 27Z"/><path d="M70 27 Q76 20.5 83 27 Q88 22.5 93 27Z"/></g>
  <path class="gb-river" d="M30 50 C34 42 28 34 36 29 S48 24 52 25"/>
  <g class="gb-pines">${[[40, 26], [43.5, 27.5], [57, 26.5], [60.5, 28], [64, 26]].map(([x, y]) => `<path d="M${x} ${y} l1.6 -4.2 l1.6 4.2z"/>`).join('')}</g>
  <g class="gb-pines">${[[3, 47], [6, 48.5], [94, 6], [97, 7.5]].map(([x, y]) => `<path d="M${x} ${y} l1.4 -3.6 l1.4 3.6z"/>`).join('')}</g>`;

// opts: { step, act, kindOf(n), heroes: [{ name, img }], canPick(n), pick(n), boardName }
export function gameBoard({ step, act, N = 10, kindOf, heroes, canPick = () => false, pick = () => {}, label = '' }) {
  const road = svgEl('gb-road', '0 0 100 50', `${SCENERY}<path class="gb-road-edge" d="${roadPath(N)}"/><path class="gb-road-bed" d="${roadPath(N)}"/><path class="gb-road-dash" d="${roadPath(N)}"/>`);
  const spaces = Array.from({ length: N }, (_, i) => {
    const n = i + 1; const p = spacePos(n, N); const kind = kindOf(n); const done = n < step; const now = n === step; const reach = !done && !now && canPick(n);
    const face = done ? h('span', { class: 'gb-check' }, ico('check')) : kind === 'boss' ? ico('crown') : kind === 'elite' ? ico('skull') : h('b', {}, String(n));
    return h('li', { class: `gb-space k-${kind} ${done ? 'done' : ''} ${now ? 'now' : ''} ${reach ? 'reach' : ''}`, style: { left: `${p.x}%`, top: `${p.y * 2}%` },
      'aria-current': now ? 'step' : null, 'aria-label': `Quest ${n}${kind !== 'battle' ? `, ${kind}` : ''}${now ? ', you are here' : done ? ', done' : ''}`,
      ...(reach || (done && canPick(n)) ? { role: 'button', tabindex: '0', onclick: () => pick(n) } : {}) },
      h('span', { class: 'gb-tile' }, face), kind === 'boss' || kind === 'elite' ? h('small', { class: 'gb-flag' }, kind === 'boss' ? 'Boss' : 'Elite') : null);
  });
  const from = Math.min(step, Math.max(1, lastSpace(heroes, act) || step)); const slide = from < step;
  const at = (n) => { const p = spacePos(n, N); return { left: `${p.x}%`, top: `${p.y * 2}%` }; };
  const pieces = h('div', { class: `gb-pieces n${heroes.length}`, style: at(from) }, heroes.slice(0, 4).map((x, i) =>
    h('span', { class: 'gb-piece', style: { '--i': i, '--n': Math.min(4, heroes.length) }, title: x.name }, h('i', { class: 'gb-base' }), h('img', { src: x.img, alt: x.name, draggable: 'false', decoding: 'async' }))));
  const el = h('div', { class: 'gb-board', role: 'group', 'aria-label': label || `Quest ${step} of ${N}` },
    h('div', { class: 'gb-print' }, road, h('ol', { class: 'gb-spaces' }, spaces), pieces));
  keepSpace(heroes, act, step);
  if (slide) { // after a win: the pieces hop along the road to the new space
    const go = () => { pieces.classList.add('moving'); Object.assign(pieces.style, at(step)); setTimeout(() => pieces.classList.remove('moving'), 1100); };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(go, 350))); else go();
  }
  return el;
}
