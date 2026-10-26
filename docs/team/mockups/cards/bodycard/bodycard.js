// Body card MOCKUP (Crockpot / Grok Bot, 25 Oct 2026; Dave's idea, awaiting Dave + Astra). Head, Left Hand, Right Hand and Feet on ONE
// physical card: 4 columns, icon on top, a d4 each starts with, then d6/d8/d10 under cardboard covers showing only the cost.
// Covers come off smallest first ("Upgrade to dX first", same as the size card). Costs are the game's CURRENT steps (data.js
// MIND_STEPS 50/110/230, STRENGTH_STEPS 40/100/220, SPEED_STEPS 60/140; feet d8 Ranger only via CLASSES maxFeet). No wear.
// ?cls=knight|ranger|...  ?state=4,6,8,6 (Head,L,R,Feet sizes)
import { frameArt, FIELD } from './frame2.js';
import { dieImage } from '../t17/dice3d.js';
import { PICK } from '../helmet/heads.js';
import { drawIcon } from '../../../../../js/gfx/dice/faces.js';
import { FACE_PAY, MIND_STEPS, STRENGTH_STEPS, SPEED_STEPS } from '../../../../../js/data.js';
import { applyRelease } from '../../../../../js/release.js';
import * as E from '../../../../../js/engine.js';
applyRelease();
const Q = new URLSearchParams(location.search); const CLS = Q.get('cls') || 'knight';
const HERO = E.newHero({ name: 'Dav', cls: CLS, seed: 1 });
const SIZES = [4, 6, 8, 10];
const COLS = [
  { k: 'N', icon: 'helmet', steps: MIND_STEPS, max: 10 },
  { k: 'W', icon: 'gauntlet', steps: STRENGTH_STEPS, max: 10 },
  { k: 'E', icon: 'gauntlet', steps: STRENGTH_STEPS, max: 10, flip: true },
  { k: 'S', icon: 'boots', steps: SPEED_STEPS, max: E.maxFeetOf(HERO) },
];
// rev 2 (Dave 8:14 PM): ?rev=2 integrated frame + title (?title=GEAR|BODY|none); ?cost=equal uses the PROPOSED equal step cost.
const REV2 = Q.get('rev') === '2'; const TITLE = Q.get('title') === 'none' ? '' : (Q.get('title') || 'GEAR');
const EQUAL = { 4: [50], 6: [110], 8: [220] }; // PROPOSED, NOT FINAL: mean of the four columns' current step, rounded to 10
if (Q.get('cost') === 'equal') COLS.forEach((c) => { c.steps = EQUAL; });
const st = (Q.get('state') || '').split(',').map(Number);
COLS.forEach((c, i) => { c.cur = st[i] || E.sidesOf(HERO, c.k) || 4; });
const KIND = { heal: 'heal', pierce: 'pierce', magic: 'magic', gold: 'gold' };
const gearFace = (v) => ({ v, c: 'w', icons: Object.entries(FACE_PAY[v] || {}).flatMap(([k, n]) => Array(n).fill(KIND[k])) });
const dieOf = (z) => dieImage(z, Array.from({ length: z }, (_, i) => gearFace(i + 1)), z, { px: 200, view: 'slot', el: 0.42 });
const iconArt = (name, flip) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 20, 0, 236); gr.addColorStop(0, '#8a5a2a'); gr.addColorStop(1, '#4a2c12'); g.fillStyle = gr;
  g.shadowColor = '#fff6'; g.shadowOffsetY = 3;
  if (name === 'helmet') { g.translate(23, 23); g.scale(2.1, 2.1); g.fill(new Path2D(PICK), 'evenodd'); } else drawIcon(g, name, 128, 128, 210, { flip }); return c.toDataURL(); };
const DIE = {}; for (const z of SIZES) DIE[z] = dieOf(z);
const NAME = { N: 'Head', W: 'Left Hand', E: 'Right Hand', S: 'Feet' };
function build() {
  const card = document.createElement('article'); card.className = 'bc';
  card.setAttribute('aria-label', 'Body dice card: ' + COLS.map((c) => `${NAME[c.k]} d${c.cur}`).join(', '));
  const panel = document.createElement('div'); panel.className = 'panel';
  for (const c of COLS) panel.insertAdjacentHTML('beforeend', `<div class="ic"><img src="${iconArt(c.icon, c.flip)}" alt="${NAME[c.k]}"></div>`);
  for (const z of SIZES) for (const c of COLS) {
    const cell = document.createElement('div'); cell.className = 'cell'; cell.dataset.k = c.k; cell.dataset.size = z;
    if (z > c.max) { cell.classList.add('cap'); cell.innerHTML = '<i class="x"></i>'; cell.setAttribute('aria-label', `${NAME[c.k]} d${z}: not available`); }
    else { cell.innerHTML = `<img class="die" src="${DIE[z]}" alt="${NAME[c.k]} d${z}">`;
      if (z > c.cur) { const from = SIZES[SIZES.indexOf(z) - 1]; cell.insertAdjacentHTML('beforeend', `<div class="cov" role="button" tabindex="0" data-step="${z}" aria-label="Upgrade ${NAME[c.k]} to d${z}, ${c.steps[from][0]} gold"><span class="cp"><i class="coin"></i><b>${c.steps[from][0]}</b></span></div>`); } }
    panel.append(cell);
  }
  card.innerHTML = '<img class="fr" src="../../../../../assets/cards/frame-t17.webp" alt="">'; card.append(panel);
  if (REV2) { card.classList.add('r2'); if (TITLE) card.classList.add('titled'); frameArt({ title: TITLE }).then((u) => { card.querySelector('.fr').src = u.card; card.insertAdjacentHTML('beforeend', `<img class="fr cn" src="${u.corners}" alt="">`); document.body.dataset.ready = '1'; });
    if (Q.get('cost') === 'equal') card.insertAdjacentHTML('beforeend', '<div class="prop">PROPOSED · equal cost</div>'); }
  let toastT;
  const say = (cell, text) => { card.querySelector('.toast')?.remove(); const m = document.createElement('div'); m.className = 'toast'; m.setAttribute('role', 'status'); m.textContent = text;
    const r = cell.getBoundingClientRect(), b = card.getBoundingClientRect(); m.style.top = ((r.top + r.height / 2 - b.top) / b.height * 100) + '%'; card.append(m); clearTimeout(toastT); toastT = setTimeout(() => m.remove(), 1500); };
  const tap = (t) => { const cell = t.closest('.cell'); const col = COLS.find((c) => c.k === cell.dataset.k);
    const next = card.querySelector(`.cell[data-k="${col.k}"] .cov:not(.gone)`);
    if (t !== next) { t.classList.remove('nope'); void t.offsetWidth; t.classList.add('nope'); say(cell, `Upgrade to d${next.dataset.step} first`); return; }
    card.querySelector('.toast')?.remove(); t.classList.add('gone'); cell.classList.add('reveal'); col.cur = +t.dataset.step;
    t.addEventListener('animationend', () => t.remove(), { once: true }); };
  card.addEventListener('click', (e) => { const t = e.target.closest('.cov:not(.gone)'); if (t) tap(t); });
  card.addEventListener('keydown', (e) => { const t = e.target.closest?.('.cov'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tap(t); } });
  return card;
}
document.getElementById('wrap').append(build());
if (!REV2) document.body.dataset.ready = '1';
