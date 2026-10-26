// Talent card rev 3 (Crockpot / Grok Bot, 25 Oct 2026, MOCKUP ONLY per Dave's decision; live game unchanged).
// ONE card, the game's emerald talent colour (faces.js clean style 'amethyst' = core #237f86 / mid #14565c / edge #082a30),
// two columns: TALENT ONE (left, SW) and TALENT TWO (right, SE). Faces 1-4 are printed emerald faces (1, 3 blank; 2 = X2;
// 4 = class symbol). As the die grows (SPECIAL_STEPS 60 / 130 / 240) the new faces' slots (5..10) open as empty recessed slots
// under the standard cardboard cover; the player drops a die-cut cardboard chit with a game icon into each slot (fee 10 x face).
// ?state=fresh | placed | choose ; ?cls=knight
import { frameArt } from './frame2.js';
import { drawSym, drawNumeral } from '../../../../../js/gfx/dice/faces.js';
import { SPECIAL_STEPS, TALENT_SYMS, TALENT_MAX_SAME, talentFaceCost, UNLOCK_COST, CLASS_TALENT } from '../../../../../js/data.js';
const Q = new URLSearchParams(location.search); const CLS = Q.get('cls') || 'knight'; const STATE = Q.get('state') || 'fresh';
const EM = { core: '#237f86', mid: '#14565c', edge: '#082a30', trim: '#cfeeee' };
const COL = { atk: '#ff3b3b', block: '#3aa4ff', magic: '#a64dff', gold: '#ffd21a', heal: '#38e87a', pierce: '#ff9a2a' };
const KIND = (s) => (s === 'block' ? 'def' : s);
// hero state for the three demo states (sizes + chits placed per slot, face -> symbol)
const H = { fresh: { size: { SW: 4, SE: 0 }, chit: { SW: {}, SE: {} } },
  placed: { size: { SW: 10, SE: 6 }, chit: { SW: { 5: 'block', 6: 'magic', 7: 'atk', 8: 'heal' }, SE: { 5: 'gold' } } },
  choose: { size: { SW: 8, SE: 6 }, chit: { SW: { 5: 'block', 6: 'magic', 7: 'atk' }, SE: { 5: 'gold' } }, pick: ['SW', 8] } }[STATE];
const memo = new Map(); const once = (k, f) => (memo.has(k) ? memo.get(k) : (memo.set(k, f()), memo.get(k)));
const cv = (px, draw) => { const c = document.createElement('canvas'); c.width = c.height = px; draw(c.getContext('2d'), px); return c.toDataURL(); };
// a printed emerald face (faces 1-4)
const face = (kind, sym) => once(`f${kind}${sym}`, () => cv(160, (g) => { // rev 4: a d4 face is a TRIANGLE (true d4 shape), not a square
  const tri = () => { g.beginPath(); const P = [[80, 10], [152, 140], [8, 140]]; for (let i = 0; i < 3; i++) { const a = P[i], b = P[(i + 1) % 3], c = P[(i + 2) % 3];
    const m1 = [a[0] + (b[0] - a[0]) * 0.1, a[1] + (b[1] - a[1]) * 0.1]; if (i === 0) g.moveTo(m1[0], m1[1]); g.arcTo(b[0], b[1], c[0], c[1], 14); } g.closePath(); };
  tri(); const gr = g.createRadialGradient(70, 80, 10, 80, 100, 110); gr.addColorStop(0, EM.core); gr.addColorStop(0.6, EM.mid); gr.addColorStop(1, EM.edge);
  g.save(); g.shadowColor = '#2a160677'; g.shadowBlur = 6; g.shadowOffsetY = 4; g.fillStyle = gr; g.fill(); g.restore(); g.lineWidth = 4; g.strokeStyle = EM.trim + '99'; g.stroke(); g.fillStyle = '#f4fbf8'; g.strokeStyle = '#f4fbf8';
  if (kind === 'x2') { g.font = '800 40px Oxanium'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('×2', 80, 104); }
  if (kind === 'sym') { drawNumeral(g, '4', 80, 82, 32, { weight: 14, under: true }); g.fillStyle = COL[sym]; g.strokeStyle = '#0b1a1a'; drawSym(g, KIND(sym), 80, 118, 26, 3, true); }
}));
// the die-cut cardboard chit: a kraft disc with a darker cut edge, the icon printed on it
const chit = (sym, px = 160) => once(`c${sym}${px}`, () => cv(px, (g, s) => { // rev 4: die-cut board edge + soft contact shadow, sits flush
  const r = s * 0.44, c = s / 2, t = s * 0.028; // t = board thickness
  g.save(); g.shadowColor = '#1e100666'; g.shadowBlur = s * 0.025; g.shadowOffsetY = s * 0.012; g.beginPath(); g.arc(c, c + t / 2, r, 0, 7); g.fillStyle = '#6e4c24'; g.fill(); g.restore(); // the cut edge, seen below the top
  const eg = g.createLinearGradient(0, c, 0, c + r + t); eg.addColorStop(0, '#9a7040'); eg.addColorStop(1, '#5a3c1a'); g.beginPath(); g.arc(c, c + t / 2, r, 0, 7); g.fillStyle = eg; g.fill();
  g.beginPath(); g.arc(c, c - t / 2, r, 0, 7); const gr = g.createRadialGradient(c * 0.8, c * 0.7, 2, c, c, r); gr.addColorStop(0, '#f1dcae'); gr.addColorStop(1, '#cfa96c'); g.fillStyle = gr; g.fill();
  g.lineWidth = s * 0.008; g.strokeStyle = '#fff4d855'; g.beginPath(); g.arc(c, c - t / 2, r - s * 0.006, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); // light catching the top cut
  g.lineWidth = s * 0.012; g.strokeStyle = '#6a4a2288'; g.beginPath(); g.arc(c, c - t / 2, r * 0.8, 0, 7); g.stroke();
  g.fillStyle = COL[sym]; g.strokeStyle = '#1a1208'; drawSym(g, KIND(sym), c, c - t / 2, s * 0.46, s * 0.025, true);
}));
const NAME = { SW: 'TALENT ONE', SE: 'TALENT TWO' }; const ADDS = { 6: [5, 6], 8: [7, 8], 10: [9, 10] }; const FROM = { 6: 4, 8: 6, 10: 8 };
// rev 5 (Dave): a faint outline behind each size label previews the die's shape at that size (d6 square, d8 diamond, d10 kite)
const SHAPE = { 6: '<svg viewBox="0 0 40 40"><rect x="5" y="5" width="30" height="30" rx="3"/></svg>', 8: '<svg viewBox="0 0 40 40"><path d="M20 1 L38 20 L20 39 L2 20 Z"/></svg>',
  10: '<svg viewBox="0 0 40 40"><path d="M20 1 L36 17 L20 39 L4 17 Z"/></svg>' };
function slotEl(slot, v) {
  const sym = H.chit[slot][v];
  if (sym) return `<span class="ts set" aria-label="face ${v}: ${TALENT_SYMS[sym]?.name || sym} chit, pays ${v}"><i class="n">${v}</i><img class="chit" src="${chit(sym)}" alt=""></span>`;
  return `<button class="ts open" data-slot="${slot}" data-v="${v}" aria-label="face ${v}: empty slot, place a chit for ${talentFaceCost(v)} gold"><i class="n">${v}</i><span class="fee"><i class="coin"></i>${talentFaceCost(v)}</span></button>`;
}
function column(slot) {
  const size = H.size[slot]; const cls = CLASS_TALENT[CLS][slot];
  const d4 = `<div class="tr d4"><span class="sz">d4</span><div class="pf"><img src="${face('blank')}" alt="face 1 blank"><img src="${face('x2')}" alt="face 2 X2"><img src="${face('blank')}" alt="face 3 blank"><img src="${face('sym', cls)}" alt="face 4 class symbol"></div></div>`;
  const rows = [6, 8, 10].map((z) => `<div class="tr" data-size="${z}"><span class="sz">${SHAPE[z]}<b>d${z}</b></span><div class="sl">${ADDS[z].map((v) => slotEl(slot, v)).join('')}</div>${z > size ? `<div class="cov" data-step="${z}" role="button" aria-label="Grow ${NAME[slot]} to d${z}, ${SPECIAL_STEPS[FROM[z]][0]} gold"><span class="cp"><i class="coin"></i><b>${SPECIAL_STEPS[FROM[z]][0]}</b></span></div>` : ''}</div>`).join('');
  const lock = size === 0 ? `<div class="colock" role="button" aria-label="Unlock ${NAME[slot]}, ${UNLOCK_COST[slot]} gold"><span class="cp"><i class="coin"></i><b>${UNLOCK_COST[slot]}</b></span></div>` : '';
  return `<div class="tcol" data-slot="${slot}"><div class="th">${NAME[slot]}</div>${d4}${rows}${lock}</div>`;
}
function picker(card, btn) {
  card.querySelector('.pick')?.remove(); card.querySelectorAll('.ts.sel').forEach((e) => e.classList.remove('sel'));
  const s = btn.dataset.slot, v = +btn.dataset.v; btn.classList.add('sel'); const used = (k) => Object.values(H.chit[s]).filter((x) => x === k).length;
  const p = document.createElement('div'); p.className = 'pick'; p.innerHTML = `<p>Face ${v} chit · <i class="coin"></i>${talentFaceCost(v)}</p><div>${Object.keys(TALENT_SYMS).map((k) => `<button data-sym="${k}" ${used(k) >= TALENT_MAX_SAME ? 'disabled' : ''}><img src="${chit(k, 120)}" alt=""><small>${TALENT_SYMS[k].name}</small></button>`).join('')}</div>`;
  const r = btn.getBoundingClientRect(), b = card.getBoundingClientRect(); p.style.top = ((r.bottom - b.top) / b.height * 100 + 1.5) + '%'; card.append(p); // opens BELOW the slot so the chits already placed stay visible
  p.addEventListener('click', (e) => { const k = e.target.closest('button')?.dataset.sym; if (!k) return; H.chit[s][v] = k; p.remove(); btn.outerHTML = slotEl(s, v); });
}
async function build() {
  const card = document.createElement('article'); card.className = 'bc r2 titled t3';
  card.innerHTML = `<img class="fr" alt=""><div class="panel">${column('SW')}${column('SE')}</div>`;
  const u = await frameArt({ title: 'TALENTS' }); card.querySelector('.fr').src = u.card; card.insertAdjacentHTML('beforeend', `<img class="fr cn" src="${u.corners}" alt="">`);
  card.addEventListener('click', (e) => { const b = e.target.closest('.ts.open'); if (b && !b.closest('.tr').querySelector('.cov')) picker(card, b); });
  document.getElementById('wrap').append(card);
  if (H.pick) picker(card, card.querySelector(`.ts.open[data-slot="${H.pick[0]}"][data-v="${H.pick[1]}"]`));
  document.body.dataset.ready = '1';
}
build();
