// T17 weapon card (mockup, docs only): one card per weapon + metal, SIZE uncovered step by step (Astra's ruling, docs/team/tasks/T17.md).
// Top: smaller art with the equipment-slot square (top right). Middle: the title. Bottom half: the nested faces as physical dice,
// one row per SIZE (d4 faces 1-4, d6 adds 5-6, d8 adds 7-8, d10 adds 9-10). Sizes not yet bought sit under a leather cover with the price.
import { weaponData } from '../t13.js';
import { renderCard } from '../card-template.js';
import { badge } from '../pro.js';
import { dieImage } from './dice3d.js';
export const STEP_PRICE = { 6: 40, 8: 80, 10: 140 }; // provisional test prices (T17 ruling 3): d4->d6, d6->d8, d8->d10
const SIZES = [4, 6, 8, 10];
const FXK = { loot: 'gold' };
// bonus icons per face, as the die prints them (js/gfx/dice/dice.js:34-38): extra attack/block marks first, then fx
const iconsOf = (f) => [...Array(f.plus || 0).fill(f.c === 'b' ? 'block' : 'atk'), ...Object.entries(f.fx || {}).flatMap(([k, n]) => Array(Math.min(3, n | 0)).fill(FXK[k] || k))];
// legend for the corners: bonus types present on UNLOCKED faces only (ruling 9), block included when a face adds it
const ORDER = ['atk', 'block', 'gold', 'heal', 'pierce', 'magic'];
export const bonusKinds = (faces) => { const h = new Set(faces.flatMap(iconsOf)); return ORDER.filter((k) => h.has(k)).slice(0, 4); };
const NAME = { atk: 'attack', block: 'block', gold: 'gold', heal: 'health', pierce: 'pierce', magic: 'magic' };
const SOCK = [[6.2, 4.4], [93.8, 4.4], [6.2, 95.6], [93.8, 95.6]];
const GRID = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'];
export function card17(id, metal, size, slot) {
  const full = weaponData(id, metal, 10); const d = weaponData(id, metal, size);
  d.sell = weaponData(id, metal, 4).sell; // ruling 5: buying sizes must not raise sell value (mockup shows the d4 card's sell price at every size)
  const nestedOK = d.faces.every((f, i) => JSON.stringify(f) === JSON.stringify(full.faces[i])); // nested faces: a smaller die is the d10's first N faces
  const open = full.faces.slice(0, size); const kinds = bonusKinds(open);
  const base = renderCard('weapon', d); const win = base.querySelector('.win');
  const px = { 4: 50, 6: 52, 8: 54, 10: 56 }; // bigger sizes read a little larger (not true scale)
  const rows = SIZES.map((s, r) => { const from = r ? SIZES[r - 1] : 0; const fs = full.faces.slice(from, s);
    const dice = fs.map((f, i) => { const label = s === 4 ? i + 1 : from + i + 1;
      return `<figure class="d17" style="--px:${px[s]}"><img src="${dieImage(s, { label, v: f.v, c: f.c, icons: iconsOf(f) }, px[s] * 4)}" alt="face ${from + i + 1}: ${f.c === 'b' ? 'block' : 'attack'} +${f.v}${iconsOf(f).length ? ', ' + iconsOf(f).map((k) => NAME[k]).join(' ') : ''}"><figcaption>${from + i + 1}</figcaption></figure>`; }).join('');
    const locked = s > size; const step = SIZES[r - 1];
    const cover = locked ? `<div class="cov"><span class="ct"><b>SIZE d${s}</b><small>${s === SIZES[SIZES.indexOf(size) + 1] ? `Uncover d${step} → d${s}` : `After d${step}`}</small></span>
      <span class="cp"><i class="coin"></i><b>${STEP_PRICE[s]}</b><small>gold</small></span><span class="cn">No refund · sell value stays ${d.sell} gold</span></div>` : '';
    return `<div class="row s${s}${locked ? ' locked' : ''}${s === size ? ' cur' : ''}"><span class="sz"><small>SIZE</small>d${s}</span><div class="dz">${dice}</div>${cover}</div>`; }).join('');
  const el = document.createElement('article'); el.className = `qc17 metal-${d.metal.toLowerCase()}`; el.dataset.nested = nestedOK;
  const gi = GRID.indexOf(slot);
  const sq = slot ? `<div class="eq on" title="Equipped: weapon socket ${slot}"><div class="well"><img class="cur" src="${dieImage(size, { label: size, v: full.faces[size - 1].v, c: full.faces[size - 1].c, icons: iconsOf(full.faces[size - 1]) }, 320)}" alt="d${size} die"></div>
      <span class="loc">${GRID.map((g, i) => `<i class="${i === gi ? 'me' : ''}"></i>`).join('')}</span><span class="cap">d${size} · ${slot}</span></div>`
    : `<div class="eq off" title="Not equipped"><div class="well"><span>EMPTY</span></div><span class="cap">In pack</span></div>`;
  el.innerHTML = `<div class="art17">${win.outerHTML}${sq}<div class="chip"><span class="tier">${d.metal}</span><span>SIZE d${size}</span></div><div class="sell"><small>Sell</small><i class="coin"></i><b>${d.sell}</b></div></div>
<div class="title17"><span>${d.metal} ${d.name}</span></div>
<div class="dice17">${rows}</div>
${SOCK.map(([x, y], k) => `<span class="pb17" style="left:${x}%;top:${y}%" title="${kinds[k] ? NAME[kinds[k]] : 'ornament'}">${badge(kinds[k] || null, d.metal)}</span>`).join('')}`;
  el.dataset.kinds = kinds.join(',') || 'none';
  return el;
}
