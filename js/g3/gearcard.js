// Camp gear card (Crockpot / Grok Bot for Claude, 25 Oct 2026; Director coverage: Camp dice grid -> matching inspection card).
// The same physical card as a weapon (T17 frame), for the body dice: the slot's carved board icon as art, its name, the die's faces
// as it is now, and (when it can grow) the next size under a cover that names the step and price. It only READS the hero and the
// upgrade info it is handed: buying stays on the inspector's existing button (HE.upgradeDie), so costs, limits and saves are unchanged.
import { h } from '../dom.js';
import { drawIcon } from '../gfx/dice/faces.js';
import { campFaceImgs } from './campart.js';
const ART = new URL('../../assets/cards/', import.meta.url).href;
const ICON = { N: 'helmet', S: 'boots', C: 'heart', W: 'gauntlet', E: 'gauntlet', SW: 'talent', SE: 'talent' };
const arts = new Map();
function iconArt(name, flip = false) {
  const k = `${name}|${flip}`; if (arts.has(k)) return arts.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 20, 0, 236); gr.addColorStop(0, '#ffe2b0'); gr.addColorStop(0.5, '#d39a52'); gr.addColorStop(1, '#7a4a1e');
  g.fillStyle = gr; g.shadowColor = '#000a'; g.shadowBlur = 10; g.shadowOffsetY = 5; drawIcon(g, name, 128, 128, 200, { flip });
  const src = c.toDataURL('image/png'); arts.set(k, src); return src;
}
const faceRow = (hero, slot, size) => h('div', { class: `gc-faces n${size}` }, campFaceImgs(hero, slot, size).map((f) => h('img', { class: `gc-face ${f.theme}`, src: f.src, alt: f.alt })));
// up: the inspector's upgrade info ({ next, cost, ok, why, act }) or null for a die that never grows (the Heart)
export function gearCardEl(hero, slot, { title, size, up = null, note = '' } = {}) {
  const next = up?.next && !up.act ? up.next : null; const lock = up && !up.next && up.act ? String(up.why || '') : '';
  const cover = next ? h('div', { class: 'gc-cover', 'aria-hidden': 'true' }, h('span', { class: 'gc-ct' }, h('b', {}, 'UPGRADE'), h('small', {}, `d${size} → d${next}`)),
    h('span', { class: 'gc-cp' }, h('i', { class: 'coin' }), h('b', {}, String(up.cost)), h('small', {}, 'gold')))
    : lock ? h('div', { class: 'gc-cover lockd', 'aria-hidden': 'true' }, h('span', { class: 'gc-ct' }, h('b', {}, 'LOCKED'), h('small', {}, `Grows again in ${lock}`))) : null;
  return h('article', { class: 'qc17 qc-gear metal-bronze', 'data-slot': slot, 'aria-label': `${title} card, d${size}` },
    h('div', { class: 'art17 gc-art' }, h('img', { src: iconArt(ICON[slot], slot === 'E'), alt: '' })),
    h('img', { class: 'fr17', src: `${ART}frame-t17.webp`, alt: '' }),
    h('div', { class: 'title17' }, h('span', {}, title)),
    h('div', { class: 'dice17 gc-dice' },
      h('div', { class: 'gc-row' }, h('span', { class: 'sz17' }, h('small', {}, 'SIZE'), `d${size}`), faceRow(hero, slot, size)),
      cover ? h('div', { class: 'gc-row' }, cover) : null,
      note ? h('p', { class: 'gc-note' }, note) : null));
}
