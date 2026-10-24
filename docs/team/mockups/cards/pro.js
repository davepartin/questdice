// T16c: one card, laid out on a measured grid of the approved frame (front-frame.webp, 720x960):
// art window x14.0-85.8% y10.5-53.75%, name bar y55.6-60.6%, parchment x14.2-86.1% y62.5-90.4%,
// corner sockets (ring fit) TL 8.75/6.35, TR 90.97/6.35, BL 8.47/92.6, BR 91.39/92.71 (% of width / height), inner diameter 6.9% W.
import { renderCard, SYM } from './card-template.js';
import { facesHTML, injectDefs } from './shapes.js';
const SOCK = [[8.75, 6.35], [90.97, 6.35], [8.47, 92.6], [91.39, 92.71]];
const METAL = { // the badge's metal follows the tier
  Bronze: ['#ffe2c0', '#c98a52', '#7a4a22', '#3a2010'], Silver: ['#ffffff', '#c9d1dd', '#7d8796', '#2c323c'], Gold: ['#fff4c8', '#f0c45a', '#a8761c', '#4a3006'],
};
const ENAMEL = { pierce: ['#ffb45a', '#e86a0a'], heal: ['#7af0a8', '#14a850'], magic: ['#d4a4ff', '#8a3ee8'], gold: ['#ffe27a', '#d8960a'], atk: ['#ff7a7a', '#c81e28'], block: ['#7ac4ff', '#1a6ad8'], star: ['#ffeaa8', '#c8a040'] };
let uid = 0;
export function badge(kind, metal) {
  const [m0, m1, m2, m3] = METAL[metal] || METAL.Silver; const [e0, e1] = ENAMEL[kind] || ENAMEL.star; const p = kind ? (SYM[kind] || SYM.star).d : null; const i = ++uid;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs>
<linearGradient id="bR${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m0}"/><stop offset=".35" stop-color="${m1}"/><stop offset=".7" stop-color="${m2}"/><stop offset="1" stop-color="${m3}"/></linearGradient>
<linearGradient id="bF${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m2}"/><stop offset=".55" stop-color="${m1}"/><stop offset="1" stop-color="${m0}"/></linearGradient>
<radialGradient id="bD${i}" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#3c3732"/><stop offset=".6" stop-color="#16130f"/><stop offset="1" stop-color="#050404"/></radialGradient>
<linearGradient id="bE${i}" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${e0}"/><stop offset="1" stop-color="${e1}"/></linearGradient>
<clipPath id="bC${i}"><rect x="0" y="0" width="24" height="10.5"/></clipPath><filter id="bS${i}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4"/></filter></defs>
<circle cx="50" cy="50" r="49" fill="url(#bR${i})"/>
<circle cx="50" cy="50" r="42.5" fill="url(#bF${i})"/>
<circle cx="50" cy="50" r="38" fill="url(#bD${i})"/>
<circle cx="50" cy="50" r="38" fill="none" stroke="#000" stroke-opacity=".7" stroke-width="3" transform="translate(1 1.2)" filter="url(#bS${i})"/>
${p ? `<g transform="translate(50 50) scale(2.4) translate(-12 -12)">
 <path d="${p}" fill="#000" opacity=".75" transform="translate(.55 .7)" filter="url(#bS${i})"/>
 <path d="${p}" fill="url(#bR${i})" stroke="url(#bR${i})" stroke-width="1.1" stroke-linejoin="round"/>
 <path d="${p}" fill="none" stroke="#000" stroke-opacity=".45" stroke-width=".4" stroke-linejoin="round" transform="translate(12 12) scale(.9) translate(-12 -12)"/>
 <path d="${p}" fill="url(#bE${i})" transform="translate(12 12) scale(.86) translate(-12 -12)"/>
 <path d="${p}" fill="#fff" opacity=".38" clip-path="url(#bC${i})" transform="translate(12 12) scale(.86) translate(-12 -12)"/>
 <path d="${p}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".35" transform="translate(12 12) scale(.86) translate(-12 -12) translate(-.25 -.25)" stroke-dasharray="0"/>
</g>` : `<circle cx="50" cy="50" r="9" fill="url(#bR${i})" opacity=".55"/>`}
<ellipse cx="40" cy="30" rx="22" ry="11" fill="#fff" opacity=".07" transform="rotate(-30 40 30)"/>
<circle cx="50" cy="50" r="45.6" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="1"/>
</svg>`;
}
// The bonus types a weapon's faces add, in the game's order (attack, gold, health, pierce, magic). Mirrors js/gfx/dice/dice.js:34-38:
// a red face's "plus" draws extra attack icons; fx.loot is gold, fx.heal health. Block bonuses are not one of the five, so they are left out.
export const BONUS_ORDER = ['atk', 'gold', 'heal', 'pierce', 'magic'];
export function bonusKinds(faces) {
  const has = new Set();
  for (const f of faces || []) {
    if ((f.plus | 0) > 0 && f.c !== 'b') has.add('atk');
    for (const [k, n] of Object.entries(f.fx || {})) if ((n | 0) > 0) has.add(k === 'loot' ? 'gold' : k);
  }
  return BONUS_ORDER.filter((k) => has.has(k)).slice(0, 4); // sockets TL, TR, BL, BR; a socket with no type stays an empty ornament
}
export function proCard(d) {
  injectDefs();
  const base = renderCard('weapon', d); const win = base.querySelector('.win').outerHTML; const fr = base.querySelector('.fr').outerHTML;
  const kinds = bonusKinds(d.faces); // T16d: corners are data-driven, one per bonus type the faces really add
  const el = document.createElement('article'); el.className = `qc pro metal-${d.metal.toLowerCase()}`;
  el.innerHTML = `${win}${fr}
${SOCK.map(([x, y], k) => `<span class="pb" style="left:${x}%;top:${y}%">${kinds[k] ? badge(kinds[k], d.metal) : badge(null, d.metal)}</span>`).join('')}
<div class="pa-l"><span class="tier">${d.metal}</span><span class="die">d${d.size}</span></div>
<div class="pa-r"><small>Sell</small><i class="coin"></i><b>${d.sell}</b></div>
<div class="pn">${d.name}</div>
<div class="pw"><span>${d.wear}</span></div>
<div class="pt">${facesHTML(d.faces, () => '', { cls: 'pro' })}</div>`;
  return el;
}
