// T17 weapon card, rev 2 (mockup, docs only). Rulings: docs/team/tasks/T17.md (Astra's ruling, Director mockup review 24 Oct).
// The approved ornate frame (weapons/art/front-frame.webp) re-cut taller for a half-card dice tray (frame-t17.webp, same art, the
// parchment band lengthened). Art on top, title in the frame's name bar, the nested faces as physical dice, one row per SIZE.
import { weaponData } from '../t13.js';
import { renderCard } from '../card-template.js';
import { badge } from '../pro.js';
import * as E from '../../../../../js/engine.js';
import { dieImage } from './dice3d.js';
export const STEP_PRICE = { 6: 40, 8: 80, 10: 140 }; // provisional test prices (ruling 3)
const SIZES = [4, 6, 8, 10];
// nested faces as measured by Claude's tools/t17-faces.mjs (a proposal, not a rule): the real d4 faces, then for each bigger size the
// highest-hit faces of today's spread at that size; the row for a size shows the faces that purchase adds (same as that script's ladder table)
const hit = (f) => f.v + (f.plus || 0); const nb = (f) => (f.plus ? 1 : 0) + Object.keys(f.fx || {}).length;
const inst = (id, r, s) => E.makeWeapon(id, r, () => 0.5, s);
export function nested(id, r, s) { const base = E.weaponFaces(inst(id, r, 4)); if (s === 4) return base;
  return [...base, ...[...E.weaponFaces(inst(id, r, s))].sort((a, b) => hit(b) - hit(a) || nb(b) - nb(a)).slice(0, s - 4)]; }
export function ladder(id, r) { let prev = []; const rows = {}; for (const s of SIZES) { const n = nested(id, r, s); rows[s] = n.slice(prev.length); prev = n; } return rows; }
const FXK = { loot: 'gold' };
export const iconsOf = (f) => [...Array(f.plus || 0).fill(f.c === 'b' ? 'block' : 'atk'), ...Object.entries(f.fx || {}).flatMap(([k, n]) => Array(Math.min(3, n | 0)).fill(FXK[k] || k))];
const ORDER = ['atk', 'block', 'gold', 'heal', 'pierce', 'magic'];
export const bonusKinds = (faces) => { const h = new Set(faces.flatMap(iconsOf)); return ORDER.filter((k) => h.has(k)).slice(0, 4); };
const NAME = { atk: 'attack', block: 'block', gold: 'gold', heal: 'health', pierce: 'pierce', magic: 'magic' };
// sockets of the re-cut frame (% of width / height)
const SOCK = [[8.75, 5.8], [90.97, 5.8], [8.47, 93.3], [91.39, 93.35]];
const GRID = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'];
const SLOTWORD = { NW: 'Left weapon', NE: 'Right weapon' }; // the tray's two weapon sockets (js/data.js ROLE)
const face = (f) => ({ v: f.v, c: f.c === 'b' ? 'b' : 'r', icons: iconsOf(f) });
export function card17(id, metal, size, slot, { stone = false } = {}) {
  const rows = ladder(id, metal); const all = SIZES.flatMap((s) => rows[s]); const open = all.slice(0, size);
  const d = weaponData(id, metal, size); d.sell = weaponData(id, metal, 4).sell; // ruling 5: a size purchase never raises sell value (stand-in: the d4 sell price)
  const kinds = bonusKinds(open);
  const win = renderCard('weapon', d).querySelector('.win');
  const px = { 4: 44, 6: 45, 8: 50, 10: 52 };
  const next = SIZES[SIZES.indexOf(size) + 1];
  const avgOf = (s) => { const n = nested(id, metal, s); return (n.reduce((a, f) => a + hit(f), 0) / n.length).toFixed(2); };
  const body = SIZES.map((s, r) => { const from = r ? SIZES[r - 1] : 0; const dieFaces = all.slice(0, s).map(face);
    const dice = rows[s].map((f, i) => { const label = from + i + 1; const ff = face(f);
      return `<figure class="d17" style="--px:${px[s]}"><img src="${dieImage(s, dieFaces, label, { px: px[s] * 5, stone })}" alt="face ${label}: ${ff.c === 'b' ? 'block' : 'attack'} +${f.v}${ff.icons.length ? ', ' + ff.icons.map((k) => NAME[k]).join(' ') : ''}"><figcaption>${label}<i>${ff.c === 'b' ? 'BLK' : 'ATK'}</i></figcaption></figure>`; }).join('');
    const locked = s > size; const avail = s === next;
    const cover = !locked ? '' : avail
      ? `<div class="cov tok"><i class="tab t1"></i><i class="tab t2"></i><span class="ct"><b>SIZE d${s}</b><small>Uncover d${from} → d${s}</small></span><span class="cp"><i class="coin"></i><b>${STEP_PRICE[s]}</b><small>gold</small></span><span class="cn">+${rows[s].length} faces · no refund · sell stays ${d.sell}</span></div>`
      : `<div class="cov tok off"><i class="tab t1"></i><i class="tab t2"></i><span class="ct"><b>SIZE d${s}</b><small>Locked · buy d${from} first</small></span><span class="cp"><i class="lock"></i><b>${STEP_PRICE[s]}</b><small>gold</small></span><span class="cn">Unavailable until d${from} is uncovered</span></div>`;
    const info = `<span class="ri"><b>${s === 4 ? '4 base faces' : `+${rows[s].length} faces`}</b><small>${s === 4 ? 'always yours' : `bought · ${STEP_PRICE[s]} gold`}</small><small>avg hit ${avgOf(s)}</small></span>`;
    return `<div class="row s${s}${locked ? ' locked' : ''}${s === size ? ' cur' : ''}"><span class="sz"><small>SIZE</small>d${s}</span><div class="dz">${dice}</div>${info}${cover}</div>`; }).join('');
  const el = document.createElement('article'); el.className = `qc17 metal-${d.metal.toLowerCase()}`;
  const gi = GRID.indexOf(slot); const shown = open[size - 1];
  const sq = slot ? `<div class="eq on"><div class="well"><img class="cur" src="${dieImage(size, open.map(face), size, { px: 360, view: 'slot', stone })}" alt="d${size} die resting in its socket"></div>
      <span class="loc">${GRID.map((g, i) => `<i class="${i === gi ? 'me' : ''}"></i>`).join('')}</span><span class="cap">${SLOTWORD[slot] || slot}</span><span class="pv">d${size} · preview face</span></div>`
    : `<div class="eq off"><div class="well"><span>EMPTY</span></div><span class="cap">Not equipped</span><span class="pv">in pack</span></div>`;
  el.innerHTML = `<div class="art17">${win.outerHTML}${sq}<button type="button" class="sell" aria-haspopup="dialog" title="Sell this weapon (asks to confirm)"><small>Sell</small><i class="coin"></i><b>${d.sell}</b></button></div>
<img class="fr17" src="frame-t17.webp" alt="">
<div class="title17"><span>${d.metal} ${d.name}</span></div>
<div class="dice17">${body}</div>
${kinds.map((k, i) => `<span class="pb17" style="left:${SOCK[i][0]}%;top:${SOCK[i][1]}%" title="${NAME[k]} (legend: a bonus type on the unlocked faces)">${badge(k, d.metal)}</span>`).join('')}`;
  // rev 5 demo (mockup only, no gold spent): click the available token, or the demo button, to see the unlock: the token slides off,
  // the row's dice settle in, and the next size's token wakes from locked to available
  el.unlock = () => { const t = el.querySelector('.cov.tok:not(.off):not(.gone)'); if (!t) return false; const row = t.closest('.row');
    t.classList.add('gone'); row.classList.add('reveal');
    const nx = row.nextElementSibling?.querySelector('.cov.tok.off');
    t.addEventListener('animationend', () => { t.remove(); row.classList.remove('locked');
      if (nx) { const s = +nx.closest('.row').className.match(/s(\d+)/)[1]; const f = SIZES[SIZES.indexOf(s) - 1]; nx.classList.remove('off');
        nx.querySelector('.ct small').textContent = `Uncover d${f} → d${s}`; nx.querySelector('.cn').textContent = `+${rows[s].length} faces · no refund · sell stays ${d.sell}`;
        nx.querySelector('.cp').innerHTML = `<i class="coin"></i><b>${STEP_PRICE[s]}</b><small>gold</small>`; } }, { once: true });
    return true; };
  el.addEventListener('click', (e) => { if (e.target.closest('.cov.tok:not(.off)')) el.unlock(); });
  // rev 8 (Dave): the Sell pill is a button and never sells on one tap: it opens a confirm step, Cancel is the default and primary
  const nm = `${d.metal} ${d.name}`;
  const ask = () => { if (el.querySelector('.sellq')) return; const q = document.createElement('div'); q.className = 'sellq'; q.setAttribute('role', 'alertdialog'); q.setAttribute('aria-modal', 'true');
    q.innerHTML = `<div class="box"><b>Sell ${nm} for <i class="coin"></i>${d.sell} gold?</b><small>This can't be undone.${size > 4 ? ` Its d${size} upgrade is lost.` : ''}</small>
      <div class="bt"><button type="button" class="no">Cancel</button><button type="button" class="yes">Sell</button></div></div>`;
    el.append(q); const close = () => q.remove(); q.querySelector('.no').onclick = close; q.onclick = (e) => { if (e.target === q) close(); };
    q.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    q.querySelector('.yes').onclick = () => { q.querySelector('.box').innerHTML = `<b>Sold (mockup: nothing happens)</b>`; setTimeout(close, 900); };
    q.querySelector('.no').focus(); };
  el.querySelector('.sell').addEventListener('click', ask); el.ask = ask;
  el.dataset.kinds = kinds.join(',') || 'none'; el.dataset.shown = JSON.stringify(shown);
  return el;
}
