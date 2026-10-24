// T16b: Dave's progression. Faces 1-4 are d4 triangles, 5-6 d6 squares, 7-8 d8 diamonds, 9-10 d10 kites, so one card shows
// how its die grew. Drawn as inline SVG (crisp at any size). Colours are the game's weapon-face palette (js/gfx/dice/faces.js:388):
// attack core #8c1a22 / mid #72121a / edge #3a070c, block core #1d4c94 / mid #163c78 / edge #0a1d40, gold trim #ffe9a8 #d9a83e #6e4a14.
// Shapes are sized by area, not box (triangle 3353, diamond 3072, kite 3440 units; the square gets 3844 because its bevel makes it read smaller); content sits on the shape's centroid.
import { SYM } from './card-template.js';
import { ico } from './t13.js';
const AM = { normal: '#e8e2d4', pierce: '#ff8a1a', fire: '#ff5a2a', frost: '#7fe3ff' };
export const SHAPE = {
  tri: { W: 100, pts: '50,12 94,88.2 6,88.2', cy: 62.8, w: (y) => 88 * (y - 12) / 76.2, num: 36 },
  sq: { W: 76, pts: '19,19 81,19 81,81 19,81', cy: 50, w: () => 58, num: 38 },
  dia: { W: 76, pts: '50,2 82,50 50,98 18,50', cy: 50, w: (y) => 64 * (1 - Math.abs(y - 50) / 48), num: 36 },
  kite: { W: 92, pts: '50,8 90,32 50,94 10,32', cy: 44.7, w: (y) => (y < 32 ? 80 * (y - 8) / 24 : 80 * (94 - y) / 62), num: 36 },
};
export const shapeOf = (i) => (i < 4 ? 'tri' : i < 6 ? 'sq' : i < 8 ? 'dia' : 'kite'); // i = face index from 0
export const GROUPS = [['d4', 0, 4], ['d6', 4, 6], ['d8', 6, 8], ['d10', 8, 10]];
export const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<radialGradient id="qfR" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#c4323c"/><stop offset=".35" stop-color="#8c1a22"/><stop offset=".75" stop-color="#72121a"/><stop offset="1" stop-color="#3a070c"/></radialGradient>
<radialGradient id="qfB" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#3f78c8"/><stop offset=".35" stop-color="#1d4c94"/><stop offset=".75" stop-color="#163c78"/><stop offset="1" stop-color="#0a1d40"/></radialGradient>
<linearGradient id="qfTrim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6d0"/><stop offset=".3" stop-color="#ffe9a8"/><stop offset=".62" stop-color="#d9a83e"/><stop offset="1" stop-color="#6e4a14"/></linearGradient>
<linearGradient id="qfHi" x1="0" y1="0" x2=".8" y2=".9"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="qfNumR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8dc"/><stop offset=".5" stop-color="#ffd96a"/><stop offset="1" stop-color="#e0962a"/></linearGradient>
<linearGradient id="qfNumB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#d4e8ff"/><stop offset="1" stop-color="#8ab4e0"/></linearGradient>
<linearGradient id="qfEdge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="#fff" stop-opacity=".1"/><stop offset=".7" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient>
<filter id="qfGrain" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".055" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 .9  0 0 0 0 .85  0 0 0 .55 -.18"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="qfDrop" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="1" dy="2.2" stdDeviation="1.6" flood-color="#000" flood-opacity=".75"/></filter>
</defs></svg>`;
export function injectDefs() { if (!document.getElementById('qfR')) document.body.insertAdjacentHTML('afterbegin', DEFS); }
const place = (svg, x, y, s) => svg.replace('<svg ', `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" `);
// one face: f from weaponFaces(); i its index (decides the shape)
export function faceSVG(f, i, cls = '') {
  const sh = SHAPE[shapeOf(i)]; const b = f.c === 'b'; const z = f.v === 0 && !f.arrow;
  const kind = f.arrow ? 'arrow' : b ? 'block' : 'atk';
  const icons = [...Array(f.plus || 0).fill(b ? 'block' : 'atk'), ...Object.entries(f.fx || {}).flatMap(([k, n]) => Array(Math.min(3, n | 0)).fill(k === 'loot' ? 'gold' : k))].filter((k) => SYM[k]);
  const ny = sh.cy - 4; const iy = sh.cy + 9; const row = [kind, ...icons];
  const s = Math.min(19, (sh.w(iy + 10) - 4) / row.length); let x = 50 - (s * row.length) / 2;
  const marks = row.map((k, j) => { let g = ico(k); if (k === 'arrow' && f.arrow) g = g.replace(/style="color:[^"]*"/, `style="color:${AM[f.arrow] || AM.normal}"`); const o = place(g, x, iy, s); x += s; return o; }).join('');
  const pill = `<rect x="${(50 - (s * row.length) / 2 - 2.5).toFixed(1)}" y="${(iy - 1.5).toFixed(1)}" width="${(s * row.length + 5).toFixed(1)}" height="${(s + 3).toFixed(1)}" rx="${((s + 3) / 2).toFixed(1)}" fill="#0c0606" fill-opacity=".55"/>`;
  const label = f.arrow && !f.v ? '' : `+${f.v}`;
  return `<svg class="qf ${b ? 'b' : 'r'}${z ? ' z' : ''} ${cls}" viewBox="${50 - sh.W / 2} -4 ${sh.W} 108" style="width:calc(var(--u) * ${sh.W});height:calc(var(--u) * 108)" role="img" aria-label="${kind === 'block' ? 'block' : 'attack'} +${f.v}${icons.length ? ' with ' + icons.join(', ') : ''}">
<g filter="url(#qfDrop)"><polygon points="${sh.pts}" fill="url(#${b ? 'qfB' : 'qfR'})" stroke="url(#qfTrim)" stroke-width="6.5" stroke-linejoin="round"/></g>
<polygon points="${sh.pts}" fill="#fff" filter="url(#qfGrain)" opacity=".5"/>
<polygon points="${sh.pts}" fill="url(#qfHi)" opacity=".22"/>
<polygon points="${sh.pts}" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="1.2" stroke-linejoin="round" transform="translate(50 ${sh.cy}) scale(.9) translate(-50 ${-sh.cy})"/>
<polygon points="${sh.pts}" fill="none" stroke="url(#qfEdge)" stroke-width="2.2" stroke-linejoin="round"/>
<polygon points="${sh.pts}" fill="none" stroke="url(#qfHi)" stroke-width="1.4" stroke-linejoin="round" transform="translate(50 ${sh.cy}) scale(.86) translate(-50 ${-sh.cy})" opacity=".9"/>
${label ? `<text x="50" y="${ny}" text-anchor="middle" dominant-baseline="central" font-family="Oxanium" font-weight="800" font-size="${sh.num}" fill="url(#${b ? 'qfNumB' : 'qfNumR'})" stroke="${b ? '#06122a' : '#24060a'}" stroke-width="4" paint-order="stroke" letter-spacing="-1">${label}</text>` : ''}
${pill}${marks}</svg>`;
}
// the whole set, grouped by die size with a fine gold rule between groups
export function facesHTML(faces, extra = () => '', { cls = '', one = false } = {}) {
  const g = ([n, a, e]) => `<div class="qg" data-d="${n}">${faces.slice(a, e).map((f, j) => `<div class="qcl${extra(a + j)}">${faceSVG(f, a + j)}</div>`).join('')}</div>`;
  const G = GROUPS.filter(([, a]) => a < faces.length);
  if (one) return `<div class="qfs n${faces.length} ${cls}"><div class="qr">${G.map(g).join('')}</div></div>`;
  return `<div class="qfs n${faces.length} ${cls}"><div class="qr">${G.slice(0, 2).map(g).join('')}</div>${G.length > 2 ? `<div class="qr">${G.slice(2).map(g).join('')}</div>` : ''}</div>`;
}
