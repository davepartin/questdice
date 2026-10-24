// Camp uses still portraits of the actual battle dice, highest numbered face up.
// No extra animation loop; the existing portrait queue shares the game renderer.
import { portraitQ } from './screens.js';
import { h } from '../dom.js';
import { dieSpecs } from '../gfx/dice/dice.js';
import { drawSym, drawNumeral, diceStyle } from '../gfx/dice/faces.js';

// Bounded tiny 2D snapshots: no WebGL contexts, atlases or animation loops.
const shots = new Map();
const COLORS = { heal: '#38e87a', pierce: '#ff8a1a', magic: '#a64dff', gold: '#ffd21a', def: '#3aa4ff', atk: '#ff3b3b' };
const HEART = ['heal', 'pierce', 'magic', 'gold', 'def', 'atk'];
export function campSpec(hero, slot, size) {
  // Engine lookups may initialize legacy fields; inspect a copy, never the saved hero.
  const copy = structuredClone(hero);
  copy.loadout.NE ||= { id: 'fists', rarity: 0 };
  if (slot === 'SW' || slot === 'SE') copy.special[slot] = size;
  return dieSpecs(copy, { [slot]: size })[slot];
}
function faceInk(spec, index, flat = false) {
  const face = spec.labels[index - 1];
  const key = JSON.stringify([diceStyle().name, spec.theme, spec.sides, face, flat]);
  if (shots.has(key)) return shots.get(key);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 248;
  const c = cv.getContext('2d'); c.scale(2, 2);
  const heart = spec.theme === 'heart'; const bone = spec.theme === 'bone';
  const y = flat ? 49 : spec.sides === 4 ? 62 : 48;
  if (heart) { c.fillStyle = COLORS[HEART[index - 1]]; drawSym(c, HEART[index - 1], 62, 58, 68, 0, true); }
  c.strokeStyle = bone ? '#141414' : '#fffaf0';
  if (face.sym === 'SURGE') { c.fillStyle = '#fffaf0'; c.font = 'bold 27px sans-serif'; c.textAlign = 'center'; c.fillText('×2', 62, y + 10); }
  else if (!face.blank) drawNumeral(c, face.text || '', 62, y, heart ? 31 : 27, { weight: 16, under: true });
  const symbols = face.corners || [];
  const row = flat ? 82 : spec.sides === 4 ? 87 : spec.sides === 8 ? 70 : 78;
  symbols.forEach((kind, i) => { c.fillStyle = COLORS[kind] || '#fff'; c.strokeStyle = '#16131b'; drawSym(c, kind, 62 + (i - (symbols.length - 1) / 2) * Math.min(18, 56 / symbols.length), row, Math.min(16, 52 / symbols.length), 1); });
  const src = cv.toDataURL('image/png');
  if (shots.size >= 96) shots.delete(shots.keys().next().value);
  shots.set(key, src); return src;
}
const faceDescription = (spec, index) => {
  const f = spec.labels[index - 1];
  if (f.blank) return 'Blank';
  if (f.sym === 'SURGE') return 'Double hand';
  if (spec.theme === 'heart') return `Boost ${HEART[index - 1] === 'def' ? 'block' : HEART[index - 1] === 'atk' ? 'attack' : HEART[index - 1]}`;
  const symbols = f.corners || [];
  const counts = Object.entries(symbols.reduce((a, k) => ({ ...a, [k]: (a[k] || 0) + 1 }), {}));
  return `${f.text}${counts.length ? ': ' + counts.map(([k, n]) => `${n} ${k === 'def' ? 'block' : k}`).join(', ') : ''}`;
};
export function campFaceList(hero, slot, size, title = 'All faces') {
  const spec = campSpec(hero, slot, size);
  return h('section', { class: 'cw-face-list', 'data-sides': String(size) },
    h('h4', {}, `${title} · d${size}`),
    h('div', { class: 'cw-face-grid' }, spec.labels.map((f, i) => h('figure', { 'data-face': String(i + 1) },
      h('span', { class: `cw-face-flat ${spec.theme}` }, h('img', { src: faceInk(spec, i + 1, true), alt: `Face ${i + 1}: ${faceDescription(spec, i + 1)}` })),
      h('figcaption', {}, faceDescription(spec, i + 1))))));
}

export function campDie(hero, slot, size) {
  const spec = campSpec(hero, slot, size);
  const score = face => Number.isFinite(parseFloat(face.text)) ? parseFloat(face.text) : -Infinity;
  const label = spec.labels.reduce((best, face, i) => score(face) >= score(spec.labels[best]) ? i : best, 0) + 1;
  const img = h('img', { class: 'cw-real-die', alt: '', decoding: 'async', draggable: 'false' });
  const loadingText = h('small', {}, 'Preparing die');
  const loading = h('span', { class: 'cw-die-loading' }, h('strong', {}, `d${size}`), loadingText);
  const box = h('span', { class: 'cw-die cw-rendered', 'aria-hidden': 'true', 'data-slot': slot, 'data-sides': String(size), 'data-face': String(label) },
    img, loading, h('b', { class: 'cw-size' }, `d${size}`));
  const unavailable = () => { box.classList.add('missing'); loadingText.textContent = 'Preview unavailable'; };
  img.onerror = unavailable;
  portraitQ.die(spec, label).then(src => {
    if (!src) { unavailable(); return; }
    img.onload = () => box.classList.add('ready');
    img.src = src;
  }).catch(unavailable);
  return box;
}
