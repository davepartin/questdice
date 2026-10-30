// Talent chit tray v1 (Crockpot / Grok Bot, 26 Oct 2026). MOCKUP ONLY; live game unchanged.
// The Talent card (bodycard/talent3.js, ?state=tray: SW d8 with face 8 open, SE d6 with face 6 open) sits on the table; below it a
// punch-out cardboard sheet holds the chits you own. One (Heal) is punched out and lifted toward the open face-8 slot.
// Chit art = talent3.js chit(), which paints the game's own icons (js/gfx/dice/faces.js drawSym) in the game's symbol colours.
// Which chits a player owns is a PROPOSED idea (today the game sells a symbol straight onto a face; there is no chit inventory).
import { chit } from './bodycard/talent3.js';
import { TALENT_SYMS, talentFaceCost } from '../../../../js/data.js';
const OWN = [['heal', 2], ['block', 1], ['atk', 2], ['magic', 1], ['gold', 1]]; // PROPOSED demo inventory
const OUT = 'heal'; // the one punched out
const tray = document.getElementById('tray');
const cells = [];
for (const [k, n] of OWN) for (let i = 0; i < n; i++) cells.push({ k, out: k === OUT && i === 0 });
tray.innerHTML = `<h2>TALENT CHITS</h2><p class="sub">Punch a chit out, drop it in an open face. The face pays its number.</p>
<div class="sheet">${cells.map((c) => `<div class="tc"><div class="hole ${c.out ? 'out' : ''}">${c.out ? '' : `<img src="${chit(c.k, 200)}" alt="${TALENT_SYMS[c.k].name} chit">`}</div><b>${TALENT_SYMS[c.k].name}</b></div>`).join('')}</div>`;
const wait = () => new Promise((r) => { const t = setInterval(() => { if (document.body.dataset.ready) { clearInterval(t); r(); } }, 50); });
await wait(); await new Promise((r) => setTimeout(r, 150));
const main = document.querySelector('main'); const M = main.getBoundingClientRect();
const slot = document.querySelector('.ts.open[data-slot="SW"][data-v="8"]'); const S = slot.getBoundingClientRect();
const hole = tray.querySelector('.hole.out'); const Hr = hole.getBoundingClientRect();
const lift = document.createElement('img'); lift.className = 'lifted'; lift.src = chit(OUT, 200); lift.alt = 'Heal chit, punched out';
// the lifted chit hovers half-way between the sheet and the slot
const C = document.querySelector(".wrap").getBoundingClientRect(); const lx = Hr.left - M.left + 40, ly = (C.bottom + Hr.top) / 2 - M.top - 50; lift.style.left = lx + 'px'; lift.style.top = ly + 'px'; main.append(lift);
const sx = S.left + S.width / 2 - M.left, sy = S.top + S.height / 2 - M.top, hx = Hr.left + Hr.width / 2 - M.left, hy = Hr.top + Hr.height / 2 - M.top;
document.getElementById('pp').setAttribute('d', `M${lx + 36} ${ly + 10} Q${lx + 50} ${(ly + sy) / 2} ${sx} ${sy + 22}`);
const tip = document.createElement('div'); tip.className = 'tip'; tip.innerHTML = `Face 8 · Heal · ${talentFaceCost(8)} gold`;
tip.style.left = (lx + 86) + 'px'; tip.style.top = (ly + 24) + 'px'; main.append(tip);
document.body.dataset.done = '1';
