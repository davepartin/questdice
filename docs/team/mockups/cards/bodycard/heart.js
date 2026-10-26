// Heart upgrade card rev 2 (Crockpot / Grok Bot, 25 Oct 2026, MOCKUP ONLY; live game unchanged). Opens when the player taps the centre Heart die.
// Numbers from docs/team/tasks/T23-heart-upgrades.md: d6 stays; Level 1 +2 / +4, Level 2 (150 gold, Act 2) +3 / +6, Level 3 (300 more, Act 3) +4 / +8.
// Rev 2 (Dave): ONE current level. The next level waits under a cardboard cover; buying FLIPS the cover up on its hinge (CSS 3D, 0.6 s) so it
// lies on top of the old level ("UPGRADED TO LEVEL n" on its back) and the new level is revealed. The six Heart faces explain what each boosts.
// Face mapping checked against js/engine.js evaluate(): 1 heal, 2 pierce, 3 magic, 4 gold on head/hands/feet; 5 +block on blue lanes; 6 +attack on red.
// ?state=fresh (Act 1) | act2 (Act 2, 180 gold, Level 2 ready: tap the cover) | maxed (Act 3, Level 3). ?t=0.2 freezes the flip at t seconds (frames).
import { frameArt } from './frame2.js';
import { drawSym, setDiceStyle } from '../../../../../js/gfx/dice/faces.js';
import { dieSpecs, faceImage } from '../../../../../js/gfx/dice/dice.js';
import { applyRelease } from '../../../../../js/release.js';
import * as E from '../../../../../js/engine.js';
applyRelease(); setDiceStyle('clean');
const Q = new URLSearchParams(location.search); const STATE = Q.get('state') || 'fresh'; const T = Q.get('t');
const S = { fresh: { act: 1, lvl: 1, gold: 60 }, act2: { act: 2, lvl: 1, gold: 180 }, maxed: { act: 3, lvl: 3, gold: 95 } }[STATE];
const LV = { 1: { text: 'STRENGTH dice <b>+2</b>, WEAPON dice <b>+4</b>' }, 2: { text: 'Boosts STRENGTH <b>+3</b>, WEAPONS <b>+6</b>', cost: 150, act: 2 }, 3: { text: 'STRENGTH <b>+4</b>, WEAPONS <b>+8</b>', cost: 300, act: 3 } }; // T23
const COL = { heal: '#38e87a', pierce: '#ff8a1a', magic: '#a64dff', gold: '#ffd21a', def: '#3aa4ff', atk: '#ff3b3b' };
const sym = (k) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = COL[k]; g.strokeStyle = '#16131b'; drawSym(g, k, 32, 32, 50, 3, true); return c.toDataURL(); };
const FACES = [['heal', 'HEALTH faces', 'of the Strength dice'], ['pierce', 'PIERCE faces', 'of the Strength dice'], ['magic', 'MAGIC faces', 'of the Strength dice'],
  ['gold', 'GOLD faces', 'of the Strength dice'], ['def', 'BLUE (block) side', 'of the Weapon dice'], ['atk', 'RED (attack) side', 'of the Weapon dice']];
const plate = (n) => `<div class="lv"><span class="lt">LEVEL ${n}</span><p>${LV[n].text}</p>${n === 3 ? '<span class="max">MAX</span>' : ''}</div>`;
const back = (n) => `<div class="cv-back"><span>UPGRADED TO</span><b>LEVEL ${n}</b></div>`;
function cover(n) {
  const sealed = S.act < LV[n].act; const ready = !sealed && S.gold >= LV[n].cost;
  return `<div class="flip${ready ? ' ready' : ''}" data-to="${n}" role="button" aria-label="Upgrade to Level ${n}, ${LV[n].cost} gold${sealed ? `, needs Act ${LV[n].act}` : ''}">
    <div class="cv-front"><span class="cp"><i class="coin"></i><b>${LV[n].cost}</b></span><small>to LEVEL ${n}</small>${sealed ? `<span class="seal" aria-hidden="true"><i>ACT</i><b>${LV[n].act}</b></span>` : ''}</div>${back(n)}</div>`;
}
// two slots: TOP = the level you had (or the flipped cover lying on it), BOTTOM = the next level under its cover
const slots = (lvl, flipped) => `<div class="slot top">${flipped ? `${plate(lvl - 1)}<div class="flip done">${back(lvl)}</div>` : plate(lvl)}</div>
  <div class="slot bot">${flipped ? plate(lvl) : lvl < 3 ? `${plate(lvl + 1)}${cover(lvl + 1)}` : ''}</div>`;
async function build() {
  await document.fonts.load('900 40px "Archivo Black"').catch(() => {});
  const hero = E.newHero({ name: 'Dav', cls: 'knight', seed: 1 }); const spec = dieSpecs(hero).C;
  const faces = FACES.map(([k, a, b], i) => `<div class="hf"><img class="fi" src="${faceImage(spec, i + 1, 120)}" alt="Heart face ${i + 1}"><p><span>Boosts the</span><em><img src="${sym(k)}" alt="">${a}</em><span>${b}</span></p></div>`).join('');
  const card = document.createElement('article'); card.className = 'bc r2 titled hcard2';
  card.innerHTML = `<img class="fr" alt=""><div class="panel"><div class="faces">${faces}</div><div class="lvls">${STATE === 'maxed' ? slots(3, true) : slots(S.lvl, false)}</div>
    <div class="purse"><span>Act ${S.act}</span><span><i class="coin"></i>${S.gold}</span></div></div>`;
  const u = await frameArt({ title: 'HEART', emblem: true }); card.querySelector('.fr').src = u.card; card.insertAdjacentHTML('beforeend', `<img class="fr cn" src="${u.corners}" alt="">`);
  card.addEventListener('click', (e) => { const f = e.target.closest('.flip.ready'); if (!f) return; f.classList.remove('ready'); f.classList.add('go');
    f.addEventListener('animationend', () => { const n = +f.dataset.to; S.gold -= LV[n].cost; S.lvl = n; card.querySelector('.purse span:last-child').innerHTML = `<i class="coin"></i>${S.gold}`; }, { once: true }); });
  document.getElementById('wrap').append(card);
  if (T != null) { const f = card.querySelector('.flip.ready') || card.querySelector('.flip:not(.done)'); f.classList.add('go'); f.style.animationDelay = `-${T}s`; f.style.animationPlayState = 'paused'; }
  document.body.dataset.ready = '1';
}
build();
