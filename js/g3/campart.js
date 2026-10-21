// Static camp previews use battle face definitions and glyphs. Samples are not rolled results.
// Reuses the game's body illustrations; no renderer, animation loop, or new images.
import { h } from '../dom.js';
import { dieSpecs } from '../gfx/dice/dice.js';
import { drawSym, drawNumeral, diceStyle } from '../gfx/dice/faces.js';
import { bodyWatermarkSrc } from '../gfx/dice/bodywm.js';

let serial = 0;
const SHAPES = {
  4: { face: '60,10 107,98 13,98', sides: ['60,10 119,82 107,98', '13,98 107,98 99,109 22,109'], lines: 'M60 10L60 98M13 98L72 82L107 98', mark: [35,42,48,42], text: [60,81] },
  6: { face: '18,19 96,10 103,91 27,103', sides: ['96,10 109,3 116,77 103,91', '18,19 33,9 109,3 96,10'], lines: 'M22 23L92 15L98 87L31 97Z', mark: [30,27,60,59], text: [62,73] },
  8: { face: '58,9 105,51 63,108 12,62', sides: ['58,9 82,4 117,46 105,51', '105,51 117,46 96,90 63,108'], lines: 'M58 9L35 65L63 108M35 65L105 51', mark: [37,37,48,45], text: [64,69] },
  10: { face: '58,9 105,42 86,98 46,110 12,64', sides: ['58,9 80,3 118,36 105,42', '105,42 118,36 105,86 86,98'], lines: 'M58 9L55 65L46 110M12 64L55 65L105 42', mark: [31,33,54,55], text: [58,73] },
};
const PALETTES = {
  bone: ['#ffffff', '#f6f1e6', '#d8ceb4', '#7c7054', '#161616'],
  heart: ['#333740', '#15171f', '#05060a', '#b18b42', '#ffffff'],
  talent: ['#8cddd3', '#247f85', '#15474f', '#0d303b', '#effff8'],
};

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

export function campDie(hero, slot, size, { plain = false } = {}) {
  const spec = campSpec(hero, slot, size);
  const sample = size;
  const inkSrc = faceInk(spec, sample);
  const shape = SHAPES[size] || SHAPES[6];
  const tone = slot === 'C' ? 'heart' : slot === 'SW' || slot === 'SE' ? 'talent' : 'bone';
  const [hi, mid, lo, edge] = PALETTES[tone];
  const id = `cd${++serial}`;
  const mark = plain ? null : bodyWatermarkSrc(hero.cls, slot);
  const [x, y, w, hh] = shape.mark;
  // All markup inputs are constants, numeric sizes, or paths from the game's asset map.
  return h('span', { class: `cw-die ${tone}`, 'aria-hidden': 'true', html: `<svg viewBox="0 0 128 124" focusable="false" aria-hidden="true">
    <defs>
      <linearGradient id="${id}f" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="${hi}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
      <linearGradient id="${id}s"><stop stop-color="${lo}"/><stop offset="1" stop-color="${edge}"/></linearGradient>
      <clipPath id="${id}c"><polygon points="${shape.face}"/></clipPath>
    </defs>
    <ellipse cx="66" cy="111" rx="46" ry="8" fill="#000" opacity=".45"/>
    ${shape.sides.map(p => `<polygon points="${p}" fill="url(#${id}s)" stroke="${edge}" stroke-width="1.6"/>`).join('')}
    <polygon points="${shape.face}" fill="url(#${id}f)" stroke="${edge}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="${shape.lines}" fill="none" stroke="${hi}" stroke-width="1.2" opacity=".45"/>
    ${mark ? `<image href="${mark}" x="${x}" y="${y}" width="${w}" height="${hh}" opacity=".3" clip-path="url(#${id}c)"/>` : ''}
    <image href="${inkSrc}" width="128" height="124" clip-path="url(#${id}c)"/>
    <path d="${size === 6 ? "M24 24L40 20" : size === 4 ? "M58 16L20 94" : "M57 15L20 59"}" stroke="#fff" stroke-width="1.3" opacity=".35" stroke-linecap="round"/>
  </svg><b class="cw-size">d${size}</b>` });
}

// Reuse the existing class illustration behind each recessed board slot.
export function campSlotMark(hero, slot) {
  const src = bodyWatermarkSrc(hero.cls, slot);
  return src ? h('img', { class: 'cw-slot-mark', src, alt: '', 'aria-hidden': 'true', decoding: 'async' }) : null;
}
