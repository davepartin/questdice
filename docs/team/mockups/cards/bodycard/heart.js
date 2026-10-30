// Heart upgrade card rev 3 (Crockpot / Grok Bot, 25 Oct 2026, MOCKUP ONLY; live game unchanged). Opens when the player taps the centre Heart die.
// Numbers from docs/team/tasks/T23-heart-upgrades.md: d6 stays; Level 1 +2 / +4, Level 2 (150 gold, Act 2) +3 / +6, Level 3 (300 more, Act 3) +4 / +8.
// Rev 3 (Dave): the face key is two rows of Heart faces, each beside a mini dice-grid map (layout from js/data.js SLOTS/ROLE:
// NW/NE weapons, N head, W/E hands, C heart, S feet, SW/SE talents). Three EQUAL level slots; a bought cover flips on its hinge onto the
// level above ("UPGRADED TO LEVEL n") and reveals its own level. ?state=fresh | act2 | maxed ; ?t=0.3 freezes the flip (frames).
import { frameArt } from './frame2.js';
import { setDiceStyle } from '../../../../../js/gfx/dice/faces.js';
import { dieSpecs, faceImage } from '../../../../../js/gfx/dice/dice.js';
import { applyRelease } from '../../../../../js/release.js';
import * as E from '../../../../../js/engine.js';
applyRelease(); setDiceStyle('clean');
const Q = new URLSearchParams(location.search); const STATE = Q.get('state') || 'fresh'; const T = Q.get('t');
const S = { fresh: { act: 1, lvl: 1, gold: 60 }, act2: { act: 2, lvl: 1, gold: 180 }, maxed: { act: 3, lvl: 3, gold: 95 } }[STATE];
const LV = { 1: { s: 2, w: 4 }, 2: { s: 3, w: 6, cost: 150, act: 2 }, 3: { s: 4, w: 8, cost: 300, act: 3 } }; // T23
// mini dice-grid map: 3 x 3, NW N NE / W C E / SW S SE; lit cells carry a colour, the rest are dim
function miniGrid(lit) {
  const c = document.createElement('canvas'); c.width = c.height = 120; const g = c.getContext('2d');
  g.fillStyle = '#3a2410'; g.beginPath(); g.roundRect(2, 2, 116, 116, 14); g.fill();
  ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'].forEach((s, i) => { const x = 10 + (i % 3) * 35, y = 10 + ((i / 3) | 0) * 35;
    g.beginPath(); g.roundRect(x, y, 30, 30, 6); g.fillStyle = lit[s] || (s === 'C' ? '#7a3040' : '#6a5038'); g.fill();
    if (lit[s]) { g.lineWidth = 2.5; g.strokeStyle = '#1a0e06'; g.stroke(); } });
  return c.toDataURL();
}
const IVORY = '#f6efe0';
const GRID_STR = miniGrid({ N: IVORY, W: IVORY, E: IVORY, S: IVORY });
const GRID_WPN = miniGrid({ NW: '#e8343c', NE: '#2f8ef0' });
const plate = (n) => `<div class="lv"><span class="lt">LEVEL ${n}</span><p><span>STRENGTH dice <b>+${LV[n].s}</b></span><span>WEAPON dice <b>+${LV[n].w}</b></span></p>${n === 3 && S.lvl === 3 ? '<span class="max">MAX</span>' : ''}</div>`;
const back = (n) => `<div class="cv-back"><span>UPGRADED TO</span><b>LEVEL ${n}</b></div>`;
function cover(n) {
  const sealed = S.act < LV[n].act; const ready = !sealed && n === S.lvl + 1 && S.gold >= LV[n].cost;
  return `<div class="flip${ready ? ' ready' : ''}" data-to="${n}" role="button" aria-label="Upgrade to Level ${n}, ${LV[n].cost} gold${sealed ? `, needs Act ${LV[n].act}` : ''}">
    <div class="cv-front"><span class="cp"><i class="coin"></i><b>${LV[n].cost}</b></span><small>LEVEL ${n}</small>${sealed ? `<span class="seal" aria-hidden="true"><i>ACT</i><b>${LV[n].act}</b></span>` : ''}</div>${back(n)}</div>`;
}
// slot n holds its level plate; a cover that has flipped lies on slot n-1 (shown here as a 'done' cover in slot n-1)
const slot = (n) => `<div class="slot" data-n="${n}">${plate(n)}${n > 1 && n > S.lvl ? cover(n) : ''}${n < S.lvl ? `<div class="flip done">${back(n + 1)}</div>` : ''}</div>`;
async function build() {
  await document.fonts.load('900 40px "Archivo Black"').catch(() => {});
  const hero = E.newHero({ name: 'Dav', cls: 'knight', seed: 1 }); const spec = dieSpecs(hero).C; const fi = (i) => `<img class="fi" src="${faceImage(spec, i, 120)}" alt="Heart face ${i}">`;
  const card = document.createElement('article'); card.className = 'bc r2 titled hcard3';
  card.innerHTML = `<img class="fr" alt=""><div class="panel">
    <div class="key"><div class="fs">${[1, 2, 3, 4].map(fi).join('')}</div><div class="map"><img src="${GRID_STR}" alt="dice grid: head, hands and feet"><span>Upgrades<br>STRENGTH dice</span></div></div>
    <div class="key"><div class="fs">${[5, 6].map(fi).join('')}</div><div class="map"><img src="${GRID_WPN}" alt="dice grid: the two weapon dice, top corners"><span>Upgrades<br>WEAPON dice</span></div></div>
    <div class="lvls">${[1, 2, 3].map(slot).join('')}</div>
    <div class="purse"><span>Act ${S.act}</span><span><i class="coin"></i>${S.gold}</span></div></div>`;
  const u = await frameArt({ title: 'HEART', emblem: true }); card.querySelector('.fr').src = u.card; card.insertAdjacentHTML('beforeend', `<img class="fr cn" src="${u.corners}" alt="">`);
  card.addEventListener('click', (e) => { const f = e.target.closest('.flip.ready'); if (!f) return; f.classList.remove('ready'); f.classList.add('go');
    f.addEventListener('animationend', () => { const n = +f.dataset.to; S.gold -= LV[n].cost; S.lvl = n; card.querySelector('.purse span:last-child').innerHTML = `<i class="coin"></i>${S.gold}`; }, { once: true }); });
  document.getElementById('wrap').append(card);
  if (T != null) { const f = card.querySelector('.flip.ready'); f.classList.add('go'); f.style.animationDelay = `-${T}s`; f.style.animationPlayState = 'paused'; }
  document.body.dataset.ready = '1';
}
build();
