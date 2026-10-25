// Pack mockup (Crockpot / Grok Bot, 25 Oct 2026). Real current game data: faces from engine weaponFaces, sell from sellValue (via cards.js weaponData).
// No wear shown (Dave, 25 Oct: weapons no longer wear). Card look = T17 rev 14 frame, title and 3D dice (dice3d.js), one row = the weapon's current die.
import * as E from '../../../../../js/engine.js';
import { weaponData } from '../../../../../js/g3/cards.js';
import { dieImage } from '../t17/dice3d.js';
import { sellProposal, SELL_PCT } from '../t17/card17.js'; // rev 15 PROPOSAL: sell = SELL_PCT of metal price + covers bought
const ART = '../../../../../assets/cards/weapons/';
const FXK = { loot: 'gold' };
const icons = (f, def) => [...Array(f.plus || 0).fill(f.c === 'b' ? 'block' : 'atk'), ...Object.entries(f.fx || {}).flatMap(([k, n]) => Array(Math.min(4, n | 0)).fill(FXK[k] || k))];
const PACK = [['sword', 1, 6], ['spear', 2, 8], ['dagger', 0, 4], null]; // Silver Sword d6, Gold Spear d8 (the game has no plain axe id), Bronze Dagger d4, empty
function cardEl(inst) {
  const d = weaponData(inst); const m = d.metal.toLowerCase();
  const faces = d.faces.map((f) => ({ v: f.v, c: f.c === 'b' ? 'b' : 'r', icons: icons(f) }));
  const px = { 4: 18, 6: 15, 8: 14, 10: 13 }[d.size];
  const dice = faces.map((f, i) => `<img style="--d:${px}cqi" src="${dieImage(d.size, faces, i + 1, { px: 200 })}" alt="face ${i + 1}: ${f.c === 'b' ? 'block' : 'attack'} +${f.v}${f.icons.length ? ', ' + f.icons.join(' ') : ''}">`).join('');
  const el = document.createElement('div'); el.className = `pc metal-${m}`;
  el.innerHTML = `<div class="art"><img src="${ART}${d.id}-${m}-512.webp" alt=""></div><img class="fr" src="../t17/frame-t17.webp" alt=""><div class="ttl"><span>${d.metal} ${d.name}</span></div><div class="dice"><span class="sz">d${d.size}</span><div class="dz">${dice}</div></div>`;
  d.sell = sellProposal(inst.id, inst.rarity | 0, d.size); el.d = d; return el;
}
const grid = document.getElementById('grid'); const veil = document.getElementById('veil'); const acts = document.getElementById('acts');
document.getElementById('cnt').textContent = `${PACK.filter(Boolean).length} OF 4`;
for (const p of PACK) {
  const cell = document.createElement('div'); cell.className = 'cell';
  if (!p) { cell.innerHTML = '<div class="slot empty">EMPTY<br>SLOT</div>'; grid.append(cell); continue; }
  const inst = E.makeWeapon(p[0], p[1], Math.random, p[2]); const b = document.createElement('button'); b.className = 'slot'; b.append(cardEl(inst));
  b.setAttribute('aria-label', `${b.firstChild.d.metal} ${b.firstChild.d.name}, d${b.firstChild.d.size}. Tap to look closer`); b.onclick = () => lift(b); cell.append(b); grid.append(cell);
}
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; const DUR = reduce ? 1 : 380; const EASE = 'cubic-bezier(.2,.8,.2,1)';
let open = null;
function target() { const W = innerWidth, H = innerHeight; const w = Math.min(380, W - 28, (H - 28 - 108) * 720 / 1052); const h = w * 1052 / 720; return { left: (W - w) / 2, top: Math.max(14, (H - 108 - h) / 2), width: w, height: h }; }
function lift(slot) {
  if (open) return; const r = slot.getBoundingClientRect(); const t = target();
  const big = document.createElement('div'); big.className = 'big'; Object.assign(big.style, { left: t.left + 'px', top: t.top + 'px', width: t.width + 'px' });
  const card = slot.firstChild.cloneNode(true); card.d = slot.firstChild.d; big.append(card); document.body.append(big); slot.classList.add('lifted');
  const s = r.width / t.width; const from = `translate(${r.left - t.left}px,${r.top - t.top}px) scale(${s})`;
  big.animate([{ transform: from }, { transform: 'none' }], { duration: DUR, easing: EASE });
  veil.classList.add('on'); const d = card.d;
  acts.innerHTML = `<button class="eq" data-a="L">Equip Left</button><button class="eq" data-a="R">Equip Right</button><button class="sell">Sell for <b>${d.sell}</b> gold <small style="opacity:.7;letter-spacing:.04em;text-transform:none">(proposal, ${Math.round(SELL_PCT * 100)}%)</small></button>`;
  acts.classList.add('on'); open = { slot, big, from };
  big.onclick = drop; veil.onclick = drop; acts.querySelector('.sell').onclick = () => ask(d); acts.querySelectorAll('.eq').forEach((x) => (x.onclick = drop));
}
function drop() {
  if (!open) return; const { slot, big, from } = open; open = null; acts.classList.remove('on'); veil.classList.remove('on');
  big.animate([{ transform: 'none' }, { transform: from }], { duration: DUR, easing: EASE }).onfinish = () => { big.remove(); slot.classList.remove('lifted'); };
}
function ask(d) { // the approved sell confirmation: Cancel is default and primary, Sell is red, nothing sells on one tap
  const q = document.createElement('div'); q.className = 'ask'; q.setAttribute('role', 'alertdialog');
  q.innerHTML = `<div class="box"><b>Sell ${d.metal} ${d.name} for ${d.sell} gold?</b><small>This can't be undone.</small><div class="bt"><button class="no">Cancel</button><button class="yes">Sell</button></div></div>`;
  document.body.append(q); const close = () => q.remove(); q.querySelector('.no').onclick = close; q.querySelector('.yes').onclick = close; q.onclick = (e) => { if (e.target === q) close(); }; q.querySelector('.no').focus();
}
window.lift = lift; window.drop = drop; window.ask = ask;
await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); document.body.dataset.ready = 1;
