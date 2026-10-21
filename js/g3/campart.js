// Static vector dice for camp. Shape and size identify equipment, never a battle roll.
// Reuses the game's body illustrations; no renderer, animation loop, or new images.
import { h } from '../dom.js';
import { bodyWatermarkSrc } from '../gfx/dice/bodywm.js';

let serial = 0;
const SHAPES = {
  4: { face: '60,10 107,98 13,98', sides: ['60,10 119,82 107,98', '13,98 107,98 99,109 22,109'], lines: 'M60 10L60 98M13 98L72 82L107 98', mark: [35,42,48,42], text: [60,81] },
  6: { face: '18,19 96,10 103,91 27,103', sides: ['96,10 109,3 116,77 103,91', '18,19 33,9 109,3 96,10'], lines: 'M22 23L92 15L98 87L31 97Z', mark: [30,27,60,59], text: [62,73] },
  8: { face: '58,9 105,51 63,108 12,62', sides: ['58,9 82,4 117,46 105,51', '105,51 117,46 96,90 63,108'], lines: 'M58 9L35 65L63 108M35 65L105 51', mark: [37,37,48,45], text: [64,69] },
  10: { face: '58,9 105,42 86,98 46,110 12,64', sides: ['58,9 80,3 118,36 105,42', '105,42 118,36 105,86 86,98'], lines: 'M58 9L55 65L46 110M12 64L55 65L105 42', mark: [31,33,54,55], text: [58,73] },
};
const PALETTES = {
  bone: ['#fff7e3', '#d7c3a0', '#8b7156', '#4a3628', '#33291f'],
  heart: ['#ffe7a0', '#d5a146', '#805021', '#573919', '#4b2a0d'],
  talent: ['#8cddd3', '#247f85', '#15474f', '#0d303b', '#effff8'],
};

export function campDie(hero, slot, size, { plain = false } = {}) {
  const shape = SHAPES[size] || SHAPES[6];
  const tone = slot === 'C' ? 'heart' : slot === 'SW' || slot === 'SE' ? 'talent' : 'bone';
  const [hi, mid, lo, edge, ink] = PALETTES[tone];
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
    <text x="${shape.text[0]}" y="${shape.text[1]}" text-anchor="middle" fill="${ink}" stroke="${hi}" stroke-opacity=".3" stroke-width=".5" paint-order="stroke" font-family="Georgia,serif" font-weight="bold" font-size="28">d${size}</text>
    <path d="${size === 6 ? "M24 24L40 20" : size === 4 ? "M58 16L20 94" : "M57 15L20 59"}" stroke="#fff" stroke-width="1.3" opacity=".35" stroke-linecap="round"/>
  </svg>` });
}

// Reuse the existing class illustration behind each recessed board slot.
export function campSlotMark(hero, slot) {
  const src = bodyWatermarkSrc(hero.cls, slot);
  return src ? h('img', { class: 'cw-slot-mark', src, alt: '', 'aria-hidden': 'true', decoding: 'async' }) : null;
}
