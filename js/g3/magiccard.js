// mr1 (Dave t434/t435, 29 Oct 2026; Crockpot / Grok Bot): the Ranger's magic as playing cards, live. All new numbers PROPOSED.
// The Magic sheet shows a 2x3 grid (the three powers on top; Potion, Heal, Heart change below) with health and magic above it.
// Tapping a power opens its card (docs/team/mockups/magiccards): painted art, purple corner emblems, a BUILD / DICE / ONE-SHOT tag,
// level rows with cardboard covers, and its buttons above the card. The buttons call the same ctx.step / ctx.use the old rows did,
// so the engine (E.castPower) does the work and battle3d's doCard plays the game's power-dice reveal inside the card's stage.
import { h } from '../dom.js';
import * as HK from './hudkit.js';
import * as D from '../data.js';
import * as E from '../engine.js';
let drawSym = null; const symReady = typeof document === 'undefined' ? Promise.resolve() : import('../gfx/dice/faces.js').then((m) => { drawSym = m.drawSym; }).catch(() => {}); // lazy: faces.js needs three (not in node tests)
export const CARD_CLASSES = new Set(['ranger', 'knight', 'wizard', 'dwarf', 'bard']); // mb1: the Bard; mk1: the Knight too; mw1: the Wizard; md1: the Dwarf
const SVG = 'http://www.w3.org/2000/svg';
const COL = { pierce: ['#ff8a1a', '#8a3c00', '#fff'], atk: ['#ff3b3b', '#7a1010', '#fff'], block: ['#3aa4ff', '#0c4a80', '#fff'], heal: ['#38e87a', '#106a34', '#06240f'], gold: ['#e8b400', '#7a5a00', '#2a1e00'], magic: ['#a64dff', '#4a1c80', '#fff'] };
const PIPS = { 1: [[12, 12]], 2: [[7.3, 6.8], [16.7, 17.2]], 3: [[7.3, 6.8], [12, 12], [16.7, 17.2]], 4: [[7.3, 6.8], [16.7, 6.8], [7.3, 17.2], [16.7, 17.2]], 5: [[7.3, 6.8], [16.7, 6.8], [12, 12], [7.3, 17.2], [16.7, 17.2]], 6: [7.3, 16.7].flatMap((x) => [6.8, 12, 17.2].map((y) => [x, y])) };
const SHAPE = { 4: 'M12 2 L22.5 21 L1.5 21 Z', 6: 'M6.5 2 H17.5 A4.5 4.5 0 0 1 22 6.5 V17.5 A4.5 4.5 0 0 1 17.5 22 H6.5 A4.5 4.5 0 0 1 2 17.5 V6.5 A4.5 4.5 0 0 1 6.5 2 Z', 8: 'M12 1.5 L22.5 12 L12 22.5 L1.5 12 Z', 10: 'M12 1.5 L22.5 14.5 L12 22.5 L1.5 14.5 Z' };
const svg = (cls, inner) => { const el = document.createElementNS(SVG, 'svg'); el.setAttribute('viewBox', '0 0 24 24'); el.setAttribute('class', cls); el.innerHTML = inner; return el; };
// a die the colour of what it adds; bright green and gold get near-black pips, the rest white
export const die = (fx, s = 6, v = 6) => { const [f, e, p] = COL[fx] || COL.magic; return svg(`mc-die d${s}`, s === 6 ? `<path d="${SHAPE[6]}" fill="${f}" stroke="${e}" stroke-width="1.6"/><g fill="${p}">${PIPS[v].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9"/>`).join('')}</g>`
  : `<path d="${SHAPE[s] || SHAPE[8]}" fill="${f}" stroke="${e}" stroke-width="1.6" stroke-linejoin="round"/><text x="12" y="16.2" text-anchor="middle" font-weight="900" font-size="10" fill="${p}">${v}</text>`); };
const space = (s = 6) => svg(`mc-space d${s}`, `<path d="${SHAPE[s] || SHAPE[6]}" fill="#00000010" stroke="#a9864a" stroke-width="1.4" stroke-dasharray="2.4 1.8" stroke-linejoin="round"/>`);
const TYPE = (k) => (k.kind === 'scale' || k.kind === 'dice' ? 'DICE' : k.kind === 'charge' || k.kind === 'round' ? 'BUILD' : 'ONE-SHOT');
const FX = (k) => k.dice?.to || (k.grudge ? 'atk' : null) || Object.keys(typeof k.per === 'object' ? k.per : k.fx || { magic: 1 })[0];
const WORD = { pierce: 'pierce', atk: 'attack', block: 'block', heal: 'heal', gold: 'gold', magic: 'magic' };
const mg = (n) => h('span', { class: 'mc-mg' }, HK.icon('magic'), h('b', {}, String(n)));
const fxv = (f, n, extra = '') => h('span', { class: `mc-fv fx-${f}` }, HK.icon(f === 'atk' ? 'atk' : f), h('b', {}, `+${n}`), extra ? h('small', {}, extra) : null);
const LV = ['I', 'II', 'III'];
// the camp cardboard emblem (cardboard.js emblems), the magic triangle, purple tint, in the four corner sockets of frame-t17
function corners() {
  const W = 720, H = 1052, c = document.createElement('canvas'); c.width = W; c.height = H; c.className = 'mc-stamps'; const g = c.getContext('2d');
  if (!g) return c; if (!drawSym) { symReady.then(() => { if (drawSym) paint(); }); return c; } paint(); return c;
  function paint() {
  const INSETS = [[63, 60], [655.5, 60], [61.5, 981], [657, 981]]; const size = 34, n = 68;
  INSETS.forEach(([x, y]) => { const q = document.createElement('canvas'); q.width = q.height = n; const qg = q.getContext('2d'); if (!qg) return;
    const m = qg.createLinearGradient(n / 2 - 17, n / 2 - 17, n / 2 + 17, n / 2 + 17); m.addColorStop(0, '#b4ae9c'); m.addColorStop(0.5, '#7c776a'); m.addColorStop(1, '#4c483f');
    g.fillStyle = '#000000b0'; drawSym(g, 'magic', x + 1.2, y + 1.6, size + 9, 0, true); g.fillStyle = '#ffffff'; drawSym(g, 'magic', x, y, size + 8, 0, true); /* mc2 (Dave): a crisp white outline */ g.fillStyle = '#000000b0'; drawSym(g, 'magic', x + 1.2, y + 1.2, size, 0, true); g.fillStyle = '#e8e2d0a0'; drawSym(g, 'magic', x - 1.2, y - 1.2, size, 0, true);
    qg.fillStyle = m; drawSym(qg, 'magic', n / 2, n / 2, size, 0, true); qg.globalCompositeOperation = 'source-atop'; qg.globalAlpha = 0.32; qg.fillStyle = '#a64dff'; qg.fillRect(0, 0, n, n);
    g.drawImage(q, x - n / 2, y - n / 2); }); }
}
// what a level row shows. l: the row's level; cur: the hero's level for it; p: the power's sheet state
function rowBody(k, l, p, cur) {
  const f = FX(k); const now = l === cur;
  if (k.kind === 'scale') { const top = E.powerDice(k, E.scaleMax(k, l), l); const s = k.dice.s;
    if (!now) return [h('span', { class: 'mc-ln' }, mg(E.scaleStep(k)), h('i', { class: 'mc-eq' }, '='), die(f, s)), h('span', { class: 'mc-mx' }, `UP TO ${top}×`, die(f, s))];
    const n = E.powerDice(k, p.x ?? k.cost, l);
    return [h('span', { class: 'mc-slots', 'aria-label': `${n} of ${top} dice` }, Array.from({ length: top }, (_, i) => (i < n ? die(f, s) : space(s)))),
      h('span', { class: 'mc-spent' }, mg(p.x ?? k.cost), h('span', { class: `fx-${f}` }, ` · ${n} of ${top} dice · ${n}d${s} ${WORD[f]}`)), k.party ? h('span', { class: 'mc-mx' }, 'HEALS EVERY HERO IN THE PARTY') : null, k.goldOn ? h('span', { class: 'mc-mx' }, `EVERY ${k.goldOn.face} ALSO GIVES `, fxv('gold', k.goldOn.gold)) : null, k.splash === 'half' ? h('span', { class: 'mc-mx' }, k.id === 'arcbolt' ? '½ ARCS TO EVERY OTHER MONSTER' : '½ SPLASHES ON EVERY OTHER MONSTER') : null]; }
  if (k.kind === 'charge') { const have = now ? p.stored || 0 : 0; const fs = Object.keys(typeof k.per === 'object' ? k.per : { atk: 1 });
    return [...fs.map((x) => h('span', { class: `mc-dots fx-${x}` }, HK.icon(x), Array.from({ length: k.max }, (_, i) => h('span', { class: `mc-dot ${now && i >= have ? 'g' : ''} ${now && i === have - 1 ? 'now' : ''}` }, String(E.chargeGain(k, i + 1, l)[x]))))),
      h('span', { class: 'mc-mx' }, now ? `${have} STORED · ${fs.map((x) => WORD[x]).join(' + ')}` : `at 1 · 2 · 3 · 4 stored`)]; }
  if (k.fx?.frog) { const fp = k.frogPierce?.[l] || 0; const c = k.costLv?.[l] ?? k.cost; return [h('span', { class: 'mc-ln' }, h('b', { class: 'mc-frog' }, 'FROG!'), fp ? fxv('pierce', fp) : null, c !== k.cost ? h('span', { class: 'mc-mx' }, 'COSTS ', mg(c)) : null), h('span', { class: 'mc-mx' }, "YOUR TARGET CAN'T ATTACK THIS ROUND")]; }
  if (k.grudge) { const g = k.grudge[l] || 0; return [h('span', { class: 'mc-ln' }, h('b', { class: 'mc-grudge' }, 'HURT'), h('i', { class: 'mc-eq' }, '='), now ? fxv('atk', (p.hurt ?? 0) + g) : [fxv('atk', '?'), g ? fxv('atk', g, 'more') : null]), h('span', { class: 'mc-mx' }, now && p.hurt != null ? `${p.hurt} GOT PAST YOUR BLOCK LAST ROUND` : 'DAMAGE PAST YOUR BLOCK LAST ROUND HITS BACK')]; }
  if (k.kind === 'luck') { const m = 1 + l, a = E.scaleNum(E.LUCK.mid, l), t = E.scaleNum(E.LUCK.top, l);
    return [h('span', { class: 'mc-ln mc-luck' }, die('magic', 6, 2), fxv('magic', m), die('atk', 6, 4), fxv('atk', a), die('atk', 6, 6), fxv('atk', t), fxv('magic', 1)), h('span', { class: 'mc-mx' }, 'ROLL A D6 · 1–2 · 3–4 · 5–6')]; }
  if (k.riposte) return [h('span', { class: 'mc-ln' }, fxv('block', E.scaleNum(k.fx.block, l))), h('span', { class: 'mc-mx' }, 'LEFTOVER BLOCK HITS BACK AS ATTACK')];
  if (k.markGold) return [h('span', { class: 'mc-ln' }, fxv('pierce', E.scaleNum(k.fx.pierce, l)), fxv('gold', E.scaleNum(k.markGold, l))), h('span', { class: 'mc-mx' }, 'PIERCE NOW · GOLD IF IT FALLS THIS ROUND')];
  if (k.kind === 'flat') return [h('span', { class: 'mc-ln' }, Object.entries(k.fx).map(([x, v]) => fxv(x === 'free' ? 'magic' : x, x === 'free' ? v + l : E.scaleNum(v, l))))];
  return [h('span', { class: 'mc-mx' }, k.text)];
}
const coverHint = (k, l) => (k.kind === 'scale' ? [mg(k.cost), '=', `${E.powerDice(k, k.cost, l)}×`, die(FX(k), k.dice.s)] : k.kind === 'charge' ? Object.entries(E.chargeGain(k, k.max, l)).map(([x, v]) => fxv(x, v)) : k.kind === 'luck' ? [fxv('atk', E.scaleNum(E.LUCK.top, l))] : k.grudge ? [fxv('atk', k.grudge[l] || 0, 'more')] : k.riposte ? [fxv('block', E.scaleNum(k.fx.block, l))] : k.fx?.frog ? [k.frogPierce?.[l] ? fxv('pierce', k.frogPierce[l]) : null, (k.costLv?.[l] ?? k.cost) !== k.cost ? ['COSTS ', mg(k.costLv[l])] : null].flat().filter(Boolean) : k.markGold ? [fxv('pierce', E.scaleNum(k.fx.pierce, l)), fxv('gold', E.scaleNum(k.markGold, l))] : []);
function card(k, p) {
  const cur = p.level || 0;
  const kick = k.kind === 'scale' ? `${E.scaleStep(k)} magic per die · every round` : k.kind === 'charge' ? 'store · release · once per round' : `${p.x ?? k.cost} magic · once per round`;
  const lv = (l) => h('div', { class: `mc-lv ${l === cur ? 'act' : ''}` }, h('span', { class: 'mc-rn' }, LV[l]), h('span', { class: 'mc-sy' }, l === cur ? rowBody(k, l, p, cur) : l < cur ? h('span', { class: 'mc-ln mc-had' }, h('b', {}, `Level ${LV[l]} ✓`), h('span', { class: 'mc-cd' }, coverHint(k, l))) : null), // mc1: only the hero's level gets room; the others are one slim line
    l > cur ? h('div', { class: 'mc-cov' }, h('span', { class: 'mc-lvw' }, `Level ${LV[l]}`, h('span', { class: 'mc-cd' }, coverHint(k, l))), h('span', { class: 'mc-cp' }, h('i', { class: 'mc-coin' }), h('b', {}, String(D.POWER_UPGRADE[l - 1])))) : null);
  return h('div', { class: 'mc-card', 'data-card': k.id }, h('i', { class: 'mc-under' }), h('div', { class: 'mc-paint' }, h('img', { src: `assets/cards/magic/${k.art || `${p.cls || 'ranger'}-${k.id}`}.webp`, alt: '' })),
    h('img', { class: 'mc-fr', src: 'assets/cards/frame-t17.webp', alt: '' }), corners(),
    h('div', { class: `mc-ptag pt-${TYPE(k).toLowerCase()}` }, TYPE(k)), h('div', { class: 'mc-plaque' }, k.name), h('div', { class: 'mc-kick' }, kick),
    h('div', { class: 'mc-levels' }, [0, 1, 2].map(lv)));
}
// the buttons above the card: −/+ (with the magic each die costs) and Roll; Cast; + store and Release N. Colours follow the power.
function buttons(ctx, p) {
  const { b, reset } = ctx; const { k, st, stored } = p; const x = p.x ?? k.cost; const f = FX(k); const level = p.level || 0;
  const why = reset ? 'Roll your dice first' : st.spent ? 'Used this round' : st.early ? `Round ${k.minRound}+` : '';
  const btn = (cls, label, on, dis, aria) => h('button', { type: 'button', class: `mc-use ${cls}`, disabled: !!dis, 'aria-label': aria || null, onclick: on }, ...label);
  if (k.kind === 'scale') { const step = E.scaleStep(k); const cap = Math.min(E.scaleMax(k, level), Math.max(k.cost, b.magic));
    return [btn('sub', ['−', HK.icon('magic'), String(step)], () => ctx.step(k.id, x - step), !!why || x <= k.cost, `One die fewer, ${step} magic back`),
      btn('add', ['+', HK.icon('magic'), String(step)], () => ctx.step(k.id, x + step), !!why || x + step > cap, `One more die for ${step} magic`),
      btn(`go pc-${f}`, ['Roll', HK.icon('magic'), String(x)], () => ctx.use(k.id), why || b.magic < x, `Roll ${E.powerDice(k, x, level)} dice for ${x} magic`)]; }
  if (k.kind === 'charge') { const relUsed = !!(b.usedRound && (b.usedRound[`${k.id}:release`] || b.usedRound[k.id]));
    return [btn('add', ['+', HK.icon('magic'), String(k.cost)], () => ctx.use(k.id), why || b.magic < k.cost || stored >= k.max, `Store 1 magic (${stored || 0} of ${k.max})`),
      btn(`go pc-${f}`, [`Release ${stored || 0}`], () => ctx.use(k.id, { release: true }), reset || !stored || relUsed, `Release ${stored || 0} for ${stored ? E.chargeGain(k, stored, level)[f] : 0} ${WORD[f]}`)]; }
  return [btn(`go pc-${f}`, ['Cast', HK.icon('magic'), String(x)], () => ctx.use(k.id), why || b.magic < x)];
}
function tile(ctx, id, name, ico, cost, on, extra = null) {
  return h('button', { type: 'button', class: `mc-tile ${on ? 'on' : ''}`, 'data-power': id, 'aria-pressed': String(on), onclick: () => ctx.select(id) }, ico, h('span', {}, name),
    cost ? h('span', { class: 'mc-cost' }, HK.icon('magic'), String(cost)) : h('span', { class: 'mc-cost free' }, 'FREE'), extra);
}
// the whole sheet for a card class. glyph and detailPanel come from powers.js (the helpers keep their current panel).
export function sheet(ctx, { glyph, detailPanel, tally }) {
  const order = ['A', 'B', 'C']; const ps = order.map((s) => ctx.powers.find((p) => p.k.slot === s)).filter(Boolean);
  const sel = ctx.selected; const p = ps.find((q) => q.k.id === sel); const u = ctx.utils.find((q) => q.id === sel);
  const utils = ['u:bigheal', 'u:heal', 'u:heart'].map((id) => ctx.utils.find((q) => q.id === id)).filter(Boolean);
  const grid = h('div', { class: 'mc-grid', 'aria-label': 'Your magic' },
    ps.map((q) => tile(ctx, q.k.id, q.k.name, glyph(q.k, 'pw-g'), q.x ?? q.k.cost, q.k.id === sel)),
    utils.map((q) => tile(ctx, q.id, q.name, glyph(q, 'pw-g'), q.cost, q.id === sel)));
  const body = p ? [h('div', { class: 'mc-ctl' }, buttons(ctx, p)), h('div', { class: 'pw-detail mc-stage' }, card(p.k, { ...p, cls: ctx.hero?.cls || ctx.b.hero?.cls, hurt: ctx.b.lastHurt ?? null }))]
    : u ? [detailPanel(ctx, sel)] : [h('div', { class: 'pw-detail pw-pick mc-pick' }, h('b', {}, 'Tap a power'), h('p', {}, ctx.reset ? 'Roll first, then use magic while you shape your dice.' : `Tap ${ps.map((q) => q.k.name).join(', ').replace(/, ([^,]*)$/, ' or $1')} to see its card.`))];
  return h('div', { class: 'pw-sigil mc-sheet' }, tally, grid, ...body);
}
