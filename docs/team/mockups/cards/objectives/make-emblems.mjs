// node make-emblems.mjs -> emb-<symbol>.svg : premium versions of the game's own symbols (SYM in js/g3/cards.js; dice from js/g3/icons.js)
import { writeFileSync } from 'node:fs';
const SYM = { magic:['#b46cff','M12 2.4 L22.2 20.6 H1.8 Z'], gold:['#ffc21a','M12 2.4 A9.6 9.6 0 1 0 12.01 2.4 Z'],
  atk:['#ff4b4b','M12 1 L14.4 6.3 L19.8 4.2 L17.7 9.6 L23 12 L17.7 14.4 L19.8 19.8 L14.4 17.7 L12 23 L9.6 17.7 L4.2 19.8 L6.3 14.4 L1 12 L6.3 9.6 L4.2 4.2 L9.6 6.3 Z'],
  block:['#3aa4ff','M12 2.4 L20 5.4 V12 C20 17 16.6 20.4 12 22 C7.4 20.4 4 17 4 12 V5.4 Z'],
  heal:['#38e87a','M9.4 3 H14.6 V9.4 H21 V14.6 H14.6 V21 H9.4 V14.6 H3 V9.4 H9.4 Z'],
  // rev 4: more of the game's own icons. hudkit.js (24 box): crown = VICTORY banner, slam = ENRAGE banner, windup, team; star = STRAIGHT banner.
  crown:['#ffd86a','M3 18.6 L2.4 7.2 L8 12 L12 4.6 L16 12 L21.6 7.2 L21 18.6 Z'],
  straight:['#ffe08a','M12 2 L20 12 L12 22 L4 12 Z'],
  slam:['#ff7a3a','M12 1.6 L14.6 7.6 L21 6.4 L17 11.6 L22 15 L15.4 15.6 L12 21.6 L8.6 15.6 L2 15 L7 11.6 L3 6.4 L9.4 7.6 Z'],
  windup:['#ffd23d','M13.8 1.8 L4.8 13.6 H11 L9.6 22.2 L19.4 9.8 H12.8 Z'],
  team:['#9fd0ff','M4.8 8.2 A3.2 3.2 0 1 0 11.2 8.2 A3.2 3.2 0 1 0 4.8 8.2 Z M13.9 9.2 A2.7 2.7 0 1 0 19.3 9.2 A2.7 2.7 0 1 0 13.9 9.2 Z M2 20.5 C2 16.4 4.7 14 8 14 C11.3 14 14 16.4 14 20.5 Z M13.4 20.5 C13.6 17.6 14.8 15.3 16.6 15.3 C19.6 15.3 22 17.4 22 20.5 Z'],
  // gfx/dice/faces.js (100 box, scaled): the dice-tray slot icons + heart, skull, talent
  heart:['#ff4f7a','M50 94 C8 62 0 36 18 18 C32 4 48 12 50 28 C52 12 68 4 82 18 C100 36 92 62 50 94 Z',100],
  skull:['#d9d2c4','M50 4 C24 4 12 22 12 42 C12 54 18 60 24 64 V82 H38 V74 H44 V82 H56 V74 H62 V82 H76 V64 C82 60 88 54 88 42 C88 22 76 4 50 4 Z',100],
  helmet:['#d6a456','M 44.8 10.6 C 29.2 13 16.4 32 16.4 56 V 74 L 45.68 96 L 40.56 51.4 H 30.32 V 46 H 44.8 Z M 55.2 10.6 C 70.8 13 83.6 32 83.6 56 V 74 L 54.32 96 L 59.44 51.4 H 69.68 V 46 H 55.2 Z M 46.4 6 Q 46.4 4 48 4 H 52 Q 53.6 4 53.6 6 V 65 L 50 73 L 46.4 65 Z M 50 8.4 A 1.3 1.3 0 1 0 50.08 8.4 Z M 50 17.7 A 1.3 1.3 0 1 0 50.08 17.7 Z M 50 26.9 A 1.3 1.3 0 1 0 50.08 26.9 Z M 50 36.1 A 1.3 1.3 0 1 0 50.08 36.1 Z',100,1],
  gauntlet:['#d6a456','M22 74 H76 L82 97 H16 Z M25 70 V36 C25 29 35 29 35 36 V22 C35 14 46 14 46 22 V17 C46 9 57 9 57 17 V22 C57 15 68 15 68 23 V44 L74 37 C79 31 89 37 84 45 L71 64 C69 68 66 70 62 70 Z M34.6 38 H36.4 V56 H34.6 Z M45.6 26 H47.4 V56 H45.6 Z M56.6 26 H58.4 V56 H56.6 Z',100,1],
  boots:['#d6a456','BOOTS',100],
  talent:['#f2b84a','TALENT',100,1],
  dice:['#f2ead8','M7.5 3.5 H16.5 A4 4 0 0 1 20.5 7.5 V16.5 A4 4 0 0 1 16.5 20.5 H7.5 A4 4 0 0 1 3.5 16.5 V7.5 A4 4 0 0 1 7.5 3.5 Z'] };
import { readFileSync } from 'node:fs';
const F=readFileSync(new URL('../../../../../js/gfx/dice/faces.js',import.meta.url),'utf8');for(const [k,n] of [['boots','boots'],['talent','talent']]) SYM[k][1]=F.match(new RegExp('^  '+n+": '([^']+)'",'m'))[1];
const mix=(h,t,a)=>{const p=(s)=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const A=p(h),B=p(t);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*a).toString(16).padStart(2,'0')).join('');};
const inner={ gold:'<circle cx="12" cy="12" r="6.6" fill="none" stroke="url(#rim)" stroke-width=".45" opacity=".9"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="#7a4a00" stroke-width=".25" stroke-dasharray=".5 .5" opacity=".5"/>',
  dice:[[8.5,8.5],[15.5,8.5],[12,12],[8.5,15.5],[15.5,15.5]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.35" fill="#2a1a10"/><circle cx="${x-.3}" cy="${y-.35}" r=".45" fill="#fff" opacity=".35"/>`).join(''),
  skull:'<circle cx="8.6" cy="10.2" r="2.1" fill="#2a1a10"/><circle cx="15.4" cy="10.2" r="2.1" fill="#2a1a10"/>',
  magic:'<path d="M12 8.2 L13 11 L15.8 12 L13 13 L12 15.8 L11 13 L8.2 12 L11 11 Z" fill="#fff" opacity=".85" transform="translate(0 2.6)"/>' };
for (const [k,[c,d0,box=24,eo]] of Object.entries(SYM)) {
  const T=box===24?'':' transform="translate(1.6 1.6) scale(.208)"', u=box===24?1:1/.208, fr=eo?' fill-rule="evenodd"':'';
  const P=(a,dx=0,dy=0)=>`<path d="${d0}"${fr} ${a.replace(/stroke-width="([\d.]+)"/,(m,w)=>`stroke-width="${(w*u).toFixed(2)}"`)}${dx||dy?` transform="translate(${dx*u} ${dy*u})"`:''}/>`, W=(x)=>T?`<g${T}>${x}</g>`:x;
  const hi=mix(c,'#ffffff',.55), lo=mix(c,'#000000',.55), deep=mix(c,'#000000',.78);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 36 36"><defs>
<radialGradient id="halo"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".55" stop-color="${c}" stop-opacity=".18"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
<linearGradient id="face" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
<linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4cf"/><stop offset=".35" stop-color="#d9a84a"/><stop offset=".7" stop-color="#7a5418"/><stop offset="1" stop-color="#f0d08a"/></linearGradient>
<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="cp"><path d="${d0}"${fr}${T} clip-rule="${eo?'evenodd':'nonzero'}"/></clipPath>
<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy=".6" stdDeviation=".6" flood-color="${deep}" flood-opacity=".8"/></filter></defs>
<circle cx="12" cy="12" r="17.5" fill="url(#halo)"/>
${[0,45,90,135].map(a=>`<path d="M12 -3.5 L12.35 12 L12 27.5 L11.65 12 Z" fill="${hi}" opacity=".22" transform="rotate(${a} 12 12)"/>`).join('')}
<g filter="url(#sh)">${W(P(`fill="${deep}" stroke="url(#rim)" stroke-width="1.5" stroke-linejoin="round"`)+P(`fill="url(#face)"`))}
<g clip-path="url(#cp)">${W(P(`fill="none" stroke="${lo}" stroke-width="1.4" opacity=".7"`,.35,.5)+P(`fill="none" stroke="${hi}" stroke-width="1" opacity=".8"`,-.25,-.35))}
${inner[k]||''}<rect x="-2" y="-2" width="28" height="12.5" fill="url(#gloss)" transform="rotate(-8 12 12)"/></g>
${W(P(`fill="none" stroke="#fff8e0" stroke-width=".3" stroke-linejoin="round" opacity=".7"`))}</g></svg>`;
  writeFileSync(`emb-${k}.svg`, svg);
}
