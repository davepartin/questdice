// Camp > Dice as the dice board (Crockpot / Grok Bot, 25 Oct 2026, MOCKUP for Dave). Tap a die: its physical card lifts up from the die.
// Weapons: the approved T17 rev 15 card (d4-d10 rows, dice covers, sell chip at the highest revealed row; PROPOSAL faces and sell values).
// Head, hands, feet, talent, heart: the same card with the game's carved board icon as art, ivory dice with the game's face symbols
// (data.js FACE_PAY) and covers priced from the game's CURRENT steps (MIND_STEPS, STRENGTH_STEPS, SPEED_STEPS, SPECIAL_STEPS). No wear anywhere.
import { card17, nested } from '../t17/card17.js';
import { dieImage } from '../t17/dice3d.js';
import { PICK } from '../helmet/heads.js'; // Dave's head icon pick (25 Oct); live faces.js still has the old helmet until Claude swaps it
// v2 tilt (Dave Oct 25): lower camera on each die + whole tray leaned toward the seated player. ?tilt=0 shows the old flat board.
const TILT = new URLSearchParams(location.search).get('tilt') === '0' ? { el: 0.72 } : { el: 0.42 };
if (TILT.el !== 0.72) document.documentElement.classList.add('tilted');
import { drawIcon } from '../../../../../js/gfx/dice/faces.js';
import { FACE_PAY, MIND_STEPS, STRENGTH_STEPS, SPEED_STEPS, SPECIAL_STEPS, UNLOCK_COST } from '../../../../../js/data.js';
const WART = '../../../../../assets/cards/weapons/';
const KIND = { heal: 'heal', pierce: 'pierce', magic: 'magic', gold: 'gold' };
const gearFace = (v) => ({ v, c: 'w', icons: Object.entries(FACE_PAY[v] || {}).flatMap(([k, n]) => Array(n).fill(KIND[k])) });
const HEART = ['heal', 'pierce', 'magic', 'gold', 'block', 'atk'].map((k, i) => ({ v: i + 1, c: 'k', icons: [k] })); // js/gfx/dice/dice.js:45 heart faces
const SIZES = [4, 6, 8, 10];
// v3 (Director 25 Oct: current hero data, real Talent die): the board is built from a real new hero of the released rules
// (js/release.js applyRelease + engine newHero), ?cls=knight|ranger|wizard|dwarf|bard (default ranger). Sizes, active dice, weapons,
// the class Talent face and the locked SE price all come from the engine; nothing is hard-coded except the slot positions.
import { applyRelease } from '../../../../../js/release.js';
import * as E from '../../../../../js/engine.js';
applyRelease();
const CLS = new URLSearchParams(location.search).get('cls') || 'ranger';
const HERO = E.newHero({ name: 'Dav', cls: CLS, seed: 1 });
const CNAME = { knight: 'Knight', ranger: 'Ranger', wizard: 'Wizard', dwarf: 'Dwarf', bard: 'Bard' }[CLS];
document.querySelector('.hd span') && (document.querySelector('.hd span').textContent = `Dav · ${CNAME}`);
const WNAME = { quiver: 'Arrows', bow: 'Bow', sword: 'Sword', shield: 'Round Shield', dagger: 'Dagger', axe: 'Axe', tower: 'Tower Shield', spear: 'Spear' };
// the real Talent die (js/gfx/dice/dice.js dieSpecs 'special' + engine specialFace): amethyst; 1 and 3 blank, 2 = X2 surge, 4+ = number, with the bought symbol
const talentFaces = (slot, z) => Array.from({ length: z }, (_, i) => { const v = i + 1; const sym = v <= HERO.special[slot] ? E.specialFace(HERO, slot, v) : null;
  return sym === 'X2' ? { v: 0, txt: 'X2', c: 'p', icons: [] } : Array.isArray(sym) ? { v, c: 'p', icons: sym } : v >= 4 ? { v, c: 'p', icons: [] } : { v: 0, c: 'p', icons: [] }; });
const wslot = (k, x, y) => { const inst = HERO.loadout[k]; const id = inst.id === 'quiver' ? 'quiver:normal' : inst.id; return { k, x, y, w: [id, inst.rarity || 0, E.sidesOf(HERO, k)], name: WNAME[inst.id] || inst.id, inst }; };
const gslot = (k, x, y, g) => (E.isActive(HERO, k) ? { k, x, y, g: { ...g, size: E.sidesOf(HERO, k) } } : { k, x, y, locked: UNLOCK_COST[k] });
const SLOTS = [
  wslot('NW', 29.5, 21.4),
  gslot('N', 50, 21.4, { title: 'Head', icon: 'helmet', steps: MIND_STEPS, max: 10 }),
  wslot('NE', 70.6, 21.4),
  gslot('W', 28, 43, { title: 'Left Hand', icon: 'gauntlet', steps: STRENGTH_STEPS, max: 10 }),
  { k: 'C', x: 50, y: 43, g: { title: 'Heart', icon: 'heart', size: 6, heart: true } },
  gslot('E', 72, 43, { title: 'Right Hand', icon: 'gauntlet', steps: STRENGTH_STEPS, max: 10, flip: true }),
  gslot('SW', 27.2, 65.6, { title: 'Talent One', icon: 'talent', steps: SPECIAL_STEPS, max: 10, talent: 'SW' }),
  gslot('S', 50, 65.6, { title: 'Feet', icon: 'boots', steps: SPEED_STEPS, max: 8 }),
  gslot('SE', 72.8, 65.6, { title: 'Talent Two', icon: 'talent', steps: SPECIAL_STEPS, max: 10, talent: 'SE' }),
];
const iconArt = (name, flip) => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 40, 0, 470); gr.addColorStop(0, '#ffe2b0'); gr.addColorStop(.5, '#d39a52'); gr.addColorStop(1, '#7a4a1e'); g.fillStyle = gr;
  g.shadowColor = '#000a'; g.shadowBlur = 18; g.shadowOffsetY = 10;
  if (name === 'helmet') { g.translate(46, 46); g.scale(4.2, 4.2); g.fill(new Path2D(PICK), 'evenodd'); } else drawIcon(g, name, 256, 256, 420, { flip }); return c.toDataURL(); };
function gearCard(s) {
  const g = s.g; let cur = g.size; const sizes = g.heart ? [6] : SIZES.filter((z) => z <= g.max);
  const facesOf = (z) => g.heart ? HEART : g.talent ? talentFaces(g.talent, z) : Array.from({ length: z }, (_, i) => gearFace(i + 1));
  const px = g.heart ? { 6: 34 } : { 4: 44, 6: 45, 8: 50, 10: 52 };
  const rows = sizes.map((z, r) => { const from = r ? sizes[r - 1] : 0; const all = facesOf(z); const add = g.heart ? all : all.slice(from);
    const dice = add.map((f, i) => `<figure class="d17" style="--px:${px[z]}"><img src="${dieImage(z, all, (g.heart ? 0 : from) + i + 1, { px: px[z] * 5 })}" alt="face ${f.v}: ${f.icons.join(' ')}"></figure>`).join('');
    const cost = g.steps?.[from]?.[0]; const locked = z > cur;
    const cover = !locked ? '' : `<div class="cov tok" role="button" tabindex="0" data-step="${z}"><span class="ct"><b>UPGRADE</b><small>d${from} → d${z} · +${z - from} faces</small></span><span class="cp"><i class="coin"></i><b>${cost}</b><small>gold</small></span></div>`;
    return `<div class="row s${z}${locked ? ' locked' : ''}"><span class="sz"><small>SIZE</small>d${z}</span><div class="dz">${dice}</div>${cover}</div>`; }).join('');
  const el = document.createElement('article'); el.className = 'qc17 gear';
  el.innerHTML = `<div class="art17"><img class="gi" src="${iconArt(g.icon, g.flip)}" alt=""></div><img class="fr17" src="../t17/frame-t17.webp" alt=""><div class="title17"><span>${g.title}</span></div><div class="dice17">${rows}</div>${g.heart ? '<div class="gnote">The Heart die does not change size</div>' : g.note ? `<div class="gnote">${g.note}</div>` : ''}`;
  const next = () => el.querySelector('.cov.tok:not(.gone)');
  el.addEventListener('click', (e) => { const t = e.target.closest('.cov.tok:not(.gone)'); if (!t) return; e.stopPropagation();
    if (t !== next()) { t.classList.remove('nope'); void t.offsetWidth; t.classList.add('nope'); const m = document.createElement('div'); m.className = 'toast17'; m.textContent = `Upgrade to d${next().dataset.step} first`; t.closest('.row').append(m); setTimeout(() => m.remove(), 1500); return; }
    const row = t.closest('.row'); t.classList.add('gone'); row.classList.add('reveal'); t.addEventListener('animationend', () => { t.remove(); row.classList.remove('locked'); }, { once: true }); cur = +t.dataset.step; });
  return el;
}
function weaponCard(s) {
  const [id, metal, size] = s.w; const el = card17(id, metal, size, s.k, {}); const m = ['bronze', 'silver', 'gold', 'diamond'][metal];
  el.querySelector('.fr17').src = '../t17/frame-t17.webp'; const base = id.split(':')[0]; const a = el.querySelector('.art9'); if (a && base !== 'dagger') { a.src = `${WART}${base}-${m}-512.webp`; a.style.objectFit = 'contain'; a.style.transform = 'rotate(-35deg) scale(1.35)'; }
  return el;
}
const fitTitle = (c) => { const t = c.querySelector('.title17 span'), box = c.querySelector('.title17'); let f = 7; t.style.fontSize = f + 'cqi'; while (t.scrollWidth > box.clientWidth && f > 4) { f -= 0.2; t.style.fontSize = f + 'cqi'; } };
const board = document.getElementById('board'); const big = document.getElementById('big'); const veil = document.getElementById('veil'); const acts = document.getElementById('acts');
{ // cover the old carved helmet baked into board-icons.webp with Dave's pick (mockup overlay)
  const c = document.createElement('canvas'); c.width = c.height = 240; const g = c.getContext('2d'); const st = g.createRadialGradient(120, 100, 8, 120, 120, 118);
  st.addColorStop(0, '#4a423b'); st.addColorStop(1, '#2c2622'); g.fillStyle = st; g.beginPath(); g.arc(120, 120, 118, 0, 7); g.fill();
  g.translate(64, 62); g.scale(1.12, 1.12); g.save(); g.translate(0, 2.5); g.fillStyle = '#120c08cc'; g.fill(new Path2D(PICK), 'evenodd'); g.restore();
  const gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, '#d9a874'); gr.addColorStop(1, '#a8703f'); g.fillStyle = gr; g.fill(new Path2D(PICK), 'evenodd');
  c.className = 'slotfix'; Object.assign(c.style, { position: 'absolute', left: '50%', top: '21%', width: '15%', transform: 'translate(-50%,-50%)', borderRadius: '50%' }); document.getElementById('board').append(c); }
for (const s of SLOTS) {
  if (s.locked) { const l = document.createElement('div'); l.className = 'lockd'; Object.assign(l.style, { left: s.x + '%', top: s.y + '%' }); l.innerHTML = `LOCKED<br><small>unlock · ${s.locked} gold</small>`; board.append(l); continue; }
  let faces, sides, top;
  if (s.w) { sides = s.w[2]; faces = E.weaponFaces(s.inst, sides).slice(0, sides).map((f) => ({ v: f.v || 0, c: f.c === 'b' ? 'b' : 'r', icons: f.arrow ? ['pierce'] : [] })); top = sides; } // the die on the board = today's live faces (engine)
  else if (s.g.heart) { sides = 6; faces = HEART; top = 6; } else if (s.g.talent) { sides = s.g.size; faces = talentFaces(s.g.talent, sides); top = 4; } else { sides = s.g.size; faces = Array.from({ length: sides }, (_, i) => gearFace(i + 1)); top = sides; }
  const b = document.createElement('button'); b.className = 'die'; Object.assign(b.style, { left: s.x + '%', top: s.y + '%' });
  b.innerHTML = `<img src="${dieImage(sides, faces, top, { px: 220, view: 'slot', el: TILT.el })}" alt="">`; b.setAttribute('aria-label', `${s.name || s.g.title}, d${sides}. Tap for its card`);
  const nm = document.createElement('div'); nm.className = 'nm'; Object.assign(nm.style, { left: s.x + '%', top: `calc(${s.y}% + 7cqi)` }); nm.innerHTML = `${s.name || s.g.title}<small>d${sides}</small>`;
  board.append(b, nm); s.btn = b; s.card = s.w ? weaponCard(s) : gearCard(s); b.onclick = () => lift(s);
}
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; const DUR = reduce ? 1 : 400; const EASE = 'cubic-bezier(.2,.8,.2,1)';
let open = null;
function lift(s) {
  if (open) return; const W = innerWidth, H = innerHeight; const w = Math.min(380, W - 24, (H - 24 - 62) * 720 / 1052); const h = w * 1052 / 720;
  const t = { left: (W - w) / 2, top: Math.max(10, (H - 62 - h) / 2) }; Object.assign(big.style, { left: t.left + 'px', top: t.top + 'px', width: w + 'px' });
  big.replaceChildren(s.card); big.classList.add('on'); fitTitle(s.card); const r = s.btn.getBoundingClientRect();
  const from = `translate(${r.left - t.left}px,${r.top - t.top}px) scale(${r.width / w})`; big.animate([{ transform: from, opacity: .4 }, { transform: 'none', opacity: 1 }], { duration: DUR, easing: EASE });
  s.btn.classList.add('lifted'); veil.classList.add('on');
  acts.innerHTML = s.w ? '<button data-a="swap">Swap from pack</button><button class="ghost">Close</button>' : '<button class="ghost one">Close</button>';
  acts.classList.add('on'); open = { s, from }; acts.querySelectorAll('button').forEach((x) => (x.onclick = drop)); veil.onclick = drop;
  big.onclick = (e) => { if (!e.target.closest('.cov,.sl17,.sellq,button')) drop(); };
}
function drop() {
  if (!open) return; const { s, from } = open; open = null; acts.classList.remove('on'); veil.classList.remove('on');
  big.animate([{ transform: 'none', opacity: 1 }, { transform: from, opacity: .4 }], { duration: DUR, easing: EASE }).onfinish = () => { big.classList.remove('on'); s.btn.classList.remove('lifted'); };
}
window.lift = (i) => lift(SLOTS.filter((s) => s.btn)[i]); window.drop = drop; window.SL = SLOTS;
await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); document.body.dataset.ready = 1;
