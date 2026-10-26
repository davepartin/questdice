// Heart upgrade card (Crockpot / Grok Bot, 25 Oct 2026, MOCKUP ONLY; live game unchanged). Opens when the player taps the centre Heart die.
// Numbers from docs/team/tasks/T23-heart-upgrades.md (Director): the die stays a d6; rank 1 free = +2 per matching white die / +4 per
// matching weapon lane; rank 2 = 150 gold -> +3 / +6; rank 3 = 300 more (450 total) -> +4 / +8. Act gates (Dave, 25 Oct 9:51 PM CT):
// rank 2 also needs Act 2, rank 3 needs Act 3. ?state=fresh (Act 1, 0 bought) | act2 (Act 2, 180 gold, rank 2 ready) | maxed (Act 3, rank 3).
import { frameArt } from './frame2.js';
import { drawSym, drawIcon, setDiceStyle } from '../../../../../js/gfx/dice/faces.js';
import { dieSpecs, faceImage } from '../../../../../js/gfx/dice/dice.js';
import { applyRelease } from '../../../../../js/release.js';
import * as E from '../../../../../js/engine.js';
applyRelease(); setDiceStyle('clean');
const Q = new URLSearchParams(location.search); const STATE = Q.get('state') || 'fresh';
const S = { fresh: { act: 1, rank: 1, gold: 60 }, act2: { act: 2, rank: 1, gold: 180 }, maxed: { act: 3, rank: 3, gold: 95 } }[STATE];
const RANKS = [{ r: 1, die: 2, lane: 4, cost: 0, act: 1 }, { r: 2, die: 3, lane: 6, cost: 150, act: 2 }, { r: 3, die: 4, lane: 8, cost: 300, act: 3 }]; // T23
const COL = { heal: '#38e87a', pierce: '#ff8a1a', magic: '#a64dff', gold: '#ffd21a', def: '#3aa4ff', atk: '#ff3b3b' };
const cv = (px, f) => { const c = document.createElement('canvas'); c.width = c.height = px; f(c.getContext('2d'), px); return c.toDataURL(); };
const sym = (k) => cv(64, (g) => { g.fillStyle = COL[k]; g.strokeStyle = '#16131b'; drawSym(g, k, 32, 32, 50, 3, true); });
const glyph = (name, fill) => cv(64, (g) => { g.fillStyle = fill; g.strokeStyle = '#2a1608'; drawIcon(g, name, 32, 32, 52, { stroke: 3 }); g.fillStyle = fill; drawIcon(g, name, 32, 32, 52); });
const whiteDie = cv(64, (g) => { g.fillStyle = '#2a1608'; g.beginPath(); g.roundRect(6, 6, 52, 52, 10); g.fill(); g.fillStyle = '#f6efe0'; g.beginPath(); g.roundRect(9, 9, 46, 46, 8); g.fill(); g.fillStyle = '#2a1608'; for (const [x, y] of [[21, 21], [43, 43], [32, 32]]) { g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); } });
function tier(t) {
  const open = t.r <= S.rank; const cur = t.r === S.rank; const sealed = t.act > S.act; const ready = !open && !sealed && t.r === S.rank + 1 && S.gold >= t.cost;
  const body = `<span class="rk"><img src="${glyph('heart', cur ? '#e8394f' : '#a0485a')}" alt=""><b>${['I', 'II', 'III'][t.r - 1]}</b></span>
    <div class="bo"><p><img class="wd" src="${whiteDie}" alt="white die"><span class="ics">${['heal', 'pierce', 'magic', 'gold'].map((k) => `<img src="${sym(k)}" alt="${k}">`).join('')}</span><b>+${t.die}</b><small>each match</small></p>
    <p><img class="wd" src="${glyph('sword', '#d8d2c4')}" alt="weapon lane"><span class="ics"><img src="${sym('atk')}" alt="attack"><img src="${sym('def')}" alt="block"></span><b>+${t.lane}</b><small>each lane</small></p></div>
    ${cur ? '<span class="now">NOW</span>' : ''}`;
  const cover = open ? '' : `<div class="cov hc${ready ? ' ready' : ''}" role="button" aria-label="Rank ${t.r}: ${t.cost} gold${sealed ? `, needs Act ${t.act}` : ''}"><span class="up">+${t.die} / +${t.lane}<small>RANK ${['I', 'II', 'III'][t.r - 1]}</small></span><span class="cp"><i class="coin"></i><b>${t.cost}</b></span>${sealed ? `<span class="seal" aria-hidden="true"><i>ACT</i><b>${t.act}</b></span>` : ''}</div>`;
  return `<div class="tier${cur ? ' cur' : ''}${open ? ' open' : ''}" data-rank="${t.r}">${body}${cover}</div>`;
}
async function build() {
  await document.fonts.load('900 40px "Archivo Black"').catch(() => {});
  const hero = E.newHero({ name: 'Dav', cls: 'knight', seed: 1 }); const spec = dieSpecs(hero).C;
  const faces = [1, 2, 3, 4, 5, 6].map((i) => `<img src="${faceImage(spec, i, 120)}" alt="Heart face ${i}">`).join('');
  const card = document.createElement('article'); card.className = 'bc r2 titled hcard';
  card.innerHTML = `<img class="fr" alt=""><div class="panel"><div class="strip">${faces}</div><p class="how">When the Heart matches a symbol, each matching die and lane gets more.</p>${RANKS.map(tier).join('')}
    <div class="purse"><span>Act ${S.act}</span><span><i class="coin"></i>${S.gold}</span></div></div>`;
  const u = await frameArt({ title: 'HEART', emblem: true }); card.querySelector('.fr').src = u.card; card.insertAdjacentHTML('beforeend', `<img class="fr cn" src="${u.corners}" alt="">`);
  document.getElementById('wrap').append(card); document.body.dataset.ready = '1';
}
build();
