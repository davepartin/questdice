// pb1/pb2 (Dave, 31 Oct 2026; Crockpot / Grok Bot): the quest track as a GAME BOARD - a painted aerial landscape with clean hexes. The act's ten quests are spaces on a
// snake of hexes; the hero (or the party) stands on the current space as small minis on bases, and slides to the next space after a win.
// Completed hexes get a small check; Elite and Boss only a subtle tint and a tiny skull / crown. Portrait phones only
// show this board (css/gameboard.css); landscape keeps the old trail. Pure layout maths (spacePos, roadPath) are exported for tests.
import { h } from '../dom.js';
import { ico } from './icons.js';

// Where each space sits, in a 100 x 50 board: a honeycomb snake of touching pointy-top hexes, 1-5 left to right, then 6-10 back
// right to left on the row below, shifted half a hex so 5 and 6 touch.
export function spacePos(n, N = 10) {
  const per = Math.ceil(N / 2); const i = n - 1; const row = i < per ? 0 : 1; const k = row ? i - per : i;
  const step = 15; const x0 = 50 - step * (per - 1) / 2 - step / 4;
  const x = row ? x0 + step / 2 + (per - 1 - k) * step : x0 + k * step;
  return { x: +x.toFixed(2), y: row ? 31.5 : 18.5, row };
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
const HEX = '50,1.5 98.5,29.4 98.5,86.1 50,114 1.5,86.1 1.5,29.4';
const hexSvg = () => { const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', '0 0 100 115.47'); s.setAttribute('class', 'gb-hex'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = `<polygon points="${HEX}"/>`; return s; };
const ART = { 1: 'assets/board/act1.webp' };

// opts: { step, act, kindOf(n), heroes: [{ name, img }], canPick(n), pick(n), boardName }
export function gameBoard({ step, act, N = 10, kindOf, heroes, canPick = () => false, pick = () => {}, label = '' }) {
  const spaces = Array.from({ length: N }, (_, i) => {
    const n = i + 1; const p = spacePos(n, N); const kind = kindOf(n); const done = n < step; const now = n === step; const reach = !done && !now && canPick(n);
    const face = done ? ico('check') : kind === 'boss' ? ico('crown') : kind === 'elite' ? ico('skull') : h('b', {}, String(n));
    return h('li', { class: `gb-space k-${kind} ${done ? 'done' : ''} ${now ? 'now' : ''} ${reach ? 'reach' : ''}`, style: { left: `${p.x}%`, top: `${p.y * 2}%` },
      'aria-current': now ? 'step' : null, 'aria-label': `Quest ${n}${kind !== 'battle' ? `, ${kind}` : ''}${now ? ', you are here' : done ? ', done' : ''}`,
      ...(reach || (done && canPick(n)) ? { role: 'button', tabindex: '0', onclick: () => pick(n) } : {}) },
      hexSvg(), h('span', { class: 'gb-mark' }, face));
  });
  const from = Math.min(step, Math.max(1, lastSpace(heroes, act) || step)); const slide = from < step;
  const at = (n) => { const p = spacePos(n, N); return { left: `${p.x}%`, top: `${p.y * 2}%` }; };
  const pieces = h('div', { class: `gb-pieces n${heroes.length}`, style: at(from) }, heroes.slice(0, 4).map((x, i) =>
    h('span', { class: 'gb-piece', style: { '--i': i, '--n': Math.min(4, heroes.length) }, title: x.name }, h('i', { class: 'gb-base' }), h('img', { src: x.img, alt: x.name, draggable: 'false', decoding: 'async' }))));
  const el = h('div', { class: 'gb-board', role: 'group', 'aria-label': label || `Quest ${step} of ${N}` },
    h('div', { class: 'gb-print', style: { backgroundImage: `url(${ART[act] || ART[1]})` } }, h('ol', { class: 'gb-spaces' }, spaces), pieces));
  keepSpace(heroes, act, step);
  if (slide) { // after a win: the pieces hop along the road to the new space
    const go = () => { pieces.classList.add('moving'); Object.assign(pieces.style, at(step)); setTimeout(() => pieces.classList.remove('moving'), 1100); };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(go, 350))); else go();
  }
  return el;
}
