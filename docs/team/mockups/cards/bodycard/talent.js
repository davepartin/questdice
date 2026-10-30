// Talent card CONCEPT (Crockpot / Grok Bot, 25 Oct 2026, MOCKUP for Dave + Astra). The Talent die is designed by the player, so the card
// shows every FACE as a slot. Real game rules (js/engine.js specialFace, js/data.js): faces 1 and 3 blank, face 2 = X2, faces 4..size are
// number faces that start empty; you pay once to print a symbol (TALENT_SYMS: attack, block, magic, heal, gold; never pierce) and it pays
// that face's number. Setting face k costs 10 x k (talentFaceCost), at most 2 of one symbol per die (TALENT_MAX_SAME). A new hero's face 4
// carries the class symbol (CLASS_TALENT). Growth: SPECIAL_STEPS 60 / 130 / 240 (d4->d6->d8->d10), each adding 2 faces under a cover.
// Talent Two unlocks for UNLOCK_COST.SE = 35. ?opt=A (both talents, two columns) | B (one card, ?slot=SW|SE); ?cls=; ?state=6,4 sizes; ?demo=1 adds a second set face.
import { frameArt } from './frame2.js';
import { drawSym, drawNumeral, drawIcon } from '../../../../../js/gfx/dice/faces.js';
import { SPECIAL_STEPS, TALENT_SYMS, TALENT_MAX_SAME, talentFaceCost, UNLOCK_COST, CLASS_TALENT } from '../../../../../js/data.js';
import { applyRelease } from '../../../../../js/release.js';
import * as E from '../../../../../js/engine.js';
applyRelease();
const Q = new URLSearchParams(location.search); const CLS = Q.get('cls') || 'knight'; const OPT = Q.get('opt') || 'A';
const HERO = E.newHero({ name: 'Dav', cls: CLS, seed: 1 });
const st = (Q.get('state') || '').split(',').map(Number); if (st[0]) HERO.special.SW = st[0]; if (st[1]) HERO.special.SE = st[1];
const SE_OPEN = Q.get('se') !== 'locked';
if (Q.get('demo')) { HERO.talent.SW[1] = ['block']; }
const COL = { atk: '#ff3b3b', block: '#3aa4ff', magic: '#a64dff', gold: '#ffd21a', heal: '#38e87a' };
const KIND = (s) => (s === 'block' ? 'def' : s);
const tiles = new Map();
function tile(kind, n = 0, sym = null) { // amethyst face: 'blank' | 'x2' | 'num' (sym set) | 'empty'
  const k = [kind, n, sym].join(); if (tiles.has(k)) return tiles.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d');
  g.beginPath(); g.roundRect(10, 10, 140, 140, 26);
  if (kind === 'empty') { g.fillStyle = '#5a3a1a22'; g.fill(); g.setLineDash([12, 9]); g.lineWidth = 5; g.strokeStyle = '#6a3fa0'; g.stroke(); g.fillStyle = '#6a3fa099'; g.font = '800 64px Oxanium'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 80, 74); }
  else { const gr = g.createLinearGradient(0, 10, 0, 150); gr.addColorStop(0, '#9a5ae0'); gr.addColorStop(1, '#4a1e86'); g.fillStyle = gr; g.fill(); g.lineWidth = 4; g.strokeStyle = '#d8b8ff88'; g.stroke();
    g.strokeStyle = '#fffaf0'; g.fillStyle = '#fffaf0';
    if (kind === 'x2') { g.font = '800 58px Oxanium'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('×2', 80, 82); }
    if (kind === 'num') { drawNumeral(g, String(n), 80, sym ? 62 : 80, 50, { weight: 16, under: true }); if (sym) { g.fillStyle = COL[sym]; g.strokeStyle = '#16131b'; drawSym(g, KIND(sym), 80, 118, 40, 3, true); } } }
  const u = c.toDataURL(); tiles.set(k, u); return u;
}
const symImg = (s, px = 96) => { const c = document.createElement('canvas'); c.width = c.height = px; const g = c.getContext('2d'); g.fillStyle = COL[s]; g.strokeStyle = '#16131b'; drawSym(g, KIND(s), px / 2, px / 2, px * 0.8, 3, true); return c.toDataURL(); };
const talentIcon = () => { const c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 10, 0, 190); gr.addColorStop(0, '#8a5a2a'); gr.addColorStop(1, '#4a2c12'); g.fillStyle = gr; drawIcon(g, 'talent', 100, 100, 170); return c.toDataURL(); };
const SIZES = [4, 6, 8, 10]; const ADDS = { 4: [1, 2, 3, 4], 6: [5, 6], 8: [7, 8], 10: [9, 10] };
const NAME = { SW: 'Talent One', SE: 'Talent Two' };
function faceSlot(slot, v) {
  const size = HERO.special[slot]; const sym = v <= size ? E.specialFace(HERO, slot, v) : null;
  if (v === 1 || v === 3) return `<span class="slot" aria-label="face ${v}: blank"><img src="${tile('blank')}" alt=""></span>`;
  if (v === 2) return `<span class="slot" aria-label="face 2: X2, doubles a hand"><img src="${tile('x2')}" alt=""></span>`;
  if (Array.isArray(sym)) return `<span class="slot" aria-label="face ${v}: ${TALENT_SYMS[sym[0]].name} ${v}"><img src="${tile('num', v, sym[0])}" alt=""></span>`;
  return `<button class="slot empty" data-slot="${slot}" data-v="${v}" aria-label="face ${v}: empty, set a symbol for ${talentFaceCost(v)} gold"><img src="${tile('empty', v)}" alt=""><span class="fee"><i class="coin"></i>${talentFaceCost(v)}</span></button>`;
}
function column(slot, one) {
  const size = HERO.special[slot]; const cls = CLASS_TALENT[CLS][slot];
  const rows = SIZES.map((z) => { const from = SIZES[SIZES.indexOf(z) - 1];
    const cover = z > size ? `<div class="cov" role="button" tabindex="0" data-step="${z}" aria-label="Grow ${NAME[slot]} to d${z}, ${SPECIAL_STEPS[from][0]} gold"><span class="cp"><i class="coin"></i><b>${SPECIAL_STEPS[from][0]}</b></span></div>` : '';
    return `<div class="trow d${z}" data-size="${z}"><span class="sz">d${z}</span><div class="slots">${ADDS[z].map((v) => faceSlot(slot, v)).join('')}</div>${cover}</div>`; }).join('');
  const lock = slot === 'SE' && !SE_OPEN ? `<div class="colock" role="button" aria-label="Unlock Talent Two, ${UNLOCK_COST.SE} gold"><img src="${talentIcon()}" alt="" style="width:12cqi;opacity:.6"><span class="cp"><i class="coin"></i><b>${UNLOCK_COST.SE}</b></span></div>` : '';
  return `<div class="tcol" data-slot="${slot}"><div class="thd">${one ? '' : `<img src="${talentIcon()}" alt="">`}<img class="cs" src="${symImg(cls)}" alt="class symbol ${TALENT_SYMS[cls].name}"></div>${rows}${lock}</div>`;
}
async function build() {
  const card = document.createElement('article'); card.className = `bc r2 titled tc ${OPT === 'B' ? 'one' : 'two'}`; const slot = Q.get('slot') || 'SW';
  const title = OPT === 'B' ? NAME[slot].toUpperCase() : 'TALENTS';
  card.innerHTML = `<img class="fr" alt=""><div class="panel">${OPT === 'B' ? column(slot, true) : column('SW') + column('SE')}</div>`;
  if (OPT === 'B') card.style.setProperty('--s', '13cqi'); else card.style.setProperty('--s', '11cqi');
  const u = await frameArt({ title }); card.querySelector('.fr').src = u.card; card.insertAdjacentHTML('beforeend', `<img class="fr cn" src="${u.corners}" alt="">`);
  let toastT; const say = (el, text) => { card.querySelector('.toast')?.remove(); const m = document.createElement('div'); m.className = 'toast'; m.textContent = text;
    const r = el.getBoundingClientRect(), b = card.getBoundingClientRect(); m.style.top = ((r.top + r.height / 2 - b.top) / b.height * 100) + '%'; card.append(m); clearTimeout(toastT); toastT = setTimeout(() => m.remove(), 1500); };
  card.addEventListener('click', (e) => {
    const t = e.target.closest('.cov:not(.gone)');
    if (t) { const col = t.closest('.tcol'); const next = col.querySelector('.cov:not(.gone)');
      if (t !== next) { t.classList.remove('nope'); void t.offsetWidth; t.classList.add('nope'); say(t, `Grow to d${next.dataset.step} first`); return; }
      t.classList.add('gone'); HERO.special[col.dataset.slot] = +t.dataset.step; t.addEventListener('animationend', () => t.remove(), { once: true }); return; }
    const pk = e.target.closest('.pick button'); if (pk) { const p = pk.closest('.pick'); const s = p.dataset.slot, v = +p.dataset.v;
      const arr = HERO.talent[s]; while (arr.length < v - 3) arr.push([]); arr[v - 4] = [pk.dataset.sym]; p.remove();
      const old = card.querySelector(`.slot.empty[data-slot="${s}"][data-v="${v}"]`); old.outerHTML = faceSlot(s, v); return; }
    const sl = e.target.closest('.slot.empty'); card.querySelector('.pick')?.remove(); if (!sl) return;
    if (+sl.dataset.v > HERO.special[sl.dataset.slot]) return;
    const used = (k) => HERO.talent[sl.dataset.slot].filter((f) => (Array.isArray(f) ? f[0] : f) === k).length;
    const p = document.createElement('div'); p.className = 'pick'; p.dataset.slot = sl.dataset.slot; p.dataset.v = sl.dataset.v;
    p.innerHTML = Object.keys(TALENT_SYMS).map((k) => `<button data-sym="${k}" ${used(k) >= TALENT_MAX_SAME ? 'disabled' : ''} aria-label="${TALENT_SYMS[k].name}"><img src="${symImg(k)}" alt=""><small>${TALENT_SYMS[k].name}</small></button>`).join('');
    const r = sl.getBoundingClientRect(), b = card.getBoundingClientRect(); p.style.top = ((r.top - b.top) / b.height * 100) + '%'; card.append(p);
  });
  document.getElementById('wrap').append(card); document.body.dataset.ready = '1';
}
build();
