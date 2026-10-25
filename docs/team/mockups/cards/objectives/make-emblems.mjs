// node make-emblems.mjs -> emb-<symbol>.svg : premium versions of the game's own symbols (SYM in js/g3/cards.js; dice from js/g3/icons.js)
import { writeFileSync } from 'node:fs';
const SYM = { magic:['#b46cff','M12 2.4 L22.2 20.6 H1.8 Z'], gold:['#ffc21a','M12 2.4 A9.6 9.6 0 1 0 12.01 2.4 Z'],
  atk:['#ff4b4b','M12 1 L14.4 6.3 L19.8 4.2 L17.7 9.6 L23 12 L17.7 14.4 L19.8 19.8 L14.4 17.7 L12 23 L9.6 17.7 L4.2 19.8 L6.3 14.4 L1 12 L6.3 9.6 L4.2 4.2 L9.6 6.3 Z'],
  block:['#3aa4ff','M12 2.4 L20 5.4 V12 C20 17 16.6 20.4 12 22 C7.4 20.4 4 17 4 12 V5.4 Z'],
  heal:['#38e87a','M9.4 3 H14.6 V9.4 H21 V14.6 H14.6 V21 H9.4 V14.6 H3 V9.4 H9.4 Z'],
  dice:['#f2ead8','M7.5 3.5 H16.5 A4 4 0 0 1 20.5 7.5 V16.5 A4 4 0 0 1 16.5 20.5 H7.5 A4 4 0 0 1 3.5 16.5 V7.5 A4 4 0 0 1 7.5 3.5 Z'] };
const mix=(h,t,a)=>{const p=(s)=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const A=p(h),B=p(t);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*a).toString(16).padStart(2,'0')).join('');};
const inner={ gold:'<circle cx="12" cy="12" r="6.6" fill="none" stroke="url(#rim)" stroke-width=".45" opacity=".9"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="#7a4a00" stroke-width=".25" stroke-dasharray=".5 .5" opacity=".5"/>',
  dice:[[8.5,8.5],[15.5,8.5],[12,12],[8.5,15.5],[15.5,15.5]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.35" fill="#2a1a10"/><circle cx="${x-.3}" cy="${y-.35}" r=".45" fill="#fff" opacity=".35"/>`).join(''),
  magic:'<path d="M12 8.2 L13 11 L15.8 12 L13 13 L12 15.8 L11 13 L8.2 12 L11 11 Z" fill="#fff" opacity=".85" transform="translate(0 2.6)"/>' };
for (const [k,[c,d]] of Object.entries(SYM)) {
  const hi=mix(c,'#ffffff',.55), lo=mix(c,'#000000',.55), deep=mix(c,'#000000',.78);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 36 36"><defs>
<radialGradient id="halo"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".55" stop-color="${c}" stop-opacity=".18"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
<linearGradient id="face" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
<linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4cf"/><stop offset=".35" stop-color="#d9a84a"/><stop offset=".7" stop-color="#7a5418"/><stop offset="1" stop-color="#f0d08a"/></linearGradient>
<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="cp"><path d="${d}"/></clipPath>
<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy=".6" stdDeviation=".6" flood-color="${deep}" flood-opacity=".8"/></filter></defs>
<circle cx="12" cy="12" r="17.5" fill="url(#halo)"/>
${[0,45,90,135].map(a=>`<path d="M12 -3.5 L12.35 12 L12 27.5 L11.65 12 Z" fill="${hi}" opacity=".22" transform="rotate(${a} 12 12)"/>`).join('')}
<g filter="url(#sh)"><path d="${d}" fill="${deep}" stroke="url(#rim)" stroke-width="1.5" stroke-linejoin="round"/>
<path d="${d}" fill="url(#face)"/>
<g clip-path="url(#cp)"><path d="${d}" fill="none" stroke="${lo}" stroke-width="1.4" opacity=".7" transform="translate(.35 .5)"/><path d="${d}" fill="none" stroke="${hi}" stroke-width="1" opacity=".8" transform="translate(-.25 -.35)"/>
${inner[k]||''}<rect x="-2" y="-2" width="28" height="12.5" fill="url(#gloss)" transform="rotate(-8 12 12)"/></g>
<path d="${d}" fill="none" stroke="#fff8e0" stroke-width=".3" stroke-linejoin="round" opacity=".7"/></g></svg>`;
  writeFileSync(`emb-${k}.svg`, svg);
}
