// Magic cards mockup (Crockpot / Grok Bot, 29 Oct 2026). MOCKUP ONLY. Every number comes from the live js/data.js + js/engine.js at each level.
// URL: magic.html?h=knight|ranger|wizard|dwarf|bard &p=<power id or u:bigheal|u:heal|u:heart> &v=float|margin &c=<stored charges shown>
import { h } from '../../../../js/dom.js';
import * as HK from '../../../../js/g3/hudkit.js';
import * as E from '../../../../js/engine.js';
import * as D from '../../../../js/data.js';
import { glyph } from '../../../../js/g3/powers.js';
import { drawSym } from '../../../../js/gfx/dice/faces.js';
const q = new URLSearchParams(location.search); const cls = q.get('h') || 'ranger'; const C = D.CLASSES[cls];
// t412 PROPOSED Ranger unlockables (mockup only, not in js/data.js)
const PROP = cls === 'ranger' ? [
  { id: 'mark', slot: 'A', name: "Hunter's Mark", kind: 'flat', cost: 1, fx: { pierce: 2, gold: 3 }, note: 'PIERCE NOW · GOLD IF IT FALLS THIS ROUND', prop: true },
  { id: 'herbs', slot: 'B', name: 'Forager', kind: 'dice', cost: 2, dice: { n: 2, s: 6, to: 'heal' }, prop: true },
  D.CLASSES.ranger.cards.find((k) => k.id === 'rain'),
] : cls === 'knight' ? [
  // t414 PROPOSED Knight unlocks (mockup only)
  D.CLASSES.knight.cards.find((k) => k.id === 'judgment'),
  { id: 'riposte', slot: 'B', name: 'Riposte', kind: 'flat', cost: 1, fx: { block: 4 }, note: 'BLOCK LEFT OVER HITS BACK AS ATTACK', prop: true },
  { id: 'spoils', slot: 'C', name: 'Spoils of War', kind: 'charge', atwill: true, cost: 1, max: 4, per: { atk: 3, gold: 2 }, prop: true },
] : [];
if (PROP.length) C.cards = [...C.cards, ...PROP.filter((k) => k.prop)];
// t413 PROPOSED Aimed Shot path: I = up to 4d6, II = dice become d8 (up to 4d8), III = up to 6d8. 1 magic per die throughout.
const AIM = [{ s: 6, m: 4 }, { s: 8, m: 4 }, { s: 8, m: 6 }]; const CLV = [{ n: 2, s: 6 }, { n: 3, s: 6 }, { n: 3, s: 8 }]; const clvP = (k) => cls === 'knight' && k?.id === 'cleave'; // t414 PROPOSED Cleave path: 2d6 / 3d6 / 3d8
const aimP = (k) => cls === 'ranger' && k?.id === 'aimed';
const isProp = PROP.some((k) => k.id === q.get('p'));
const mine = isProp ? PROP : (C.cards || []).filter((k) => k.start).sort((a, b) => a.slot.localeCompare(b.slot));
const sel = q.get('p') || mine[0].id; const selKind = (C.cards || []).find((c) => c.id === (q.get('p') || mine[0].id))?.kind; const variant = q.get('v') || (['charge', 'scale'].includes(selKind) || cls === 'ranger' || cls === 'knight' ? 'margin' : 'float'); const charges = +(q.get('c') || 2);
const card = (id) => (C.cards || []).find((c) => c.id === id);
const hero = { name: 'Dave', cls, level: 1 };
const SVG = 'http://www.w3.org/2000/svg';
// Dice colour code (Dave, 29 Oct): orange = pierce, purple = magic, green = health, yellow = gold, red = attack, blue = block. d6 = six pips, d8 = numbered.
const DIE_COL = { pierce: ['#ff8a1a', '#8a3c00', '#2a1200'], magic: ['#a64dff', '#4a1c80', '#fff'], heal: ['#38e87a', '#106a34', '#06240f'], gold: ['#e8b400', '#7a5a00', '#2a1e00'], atk: ['#ff3b3b', '#7a1010', '#fff'], block: ['#3aa4ff', '#0c4a80', '#fff'] };
const PIPS = { 1: [[12, 12]], 2: [[7.3, 6.8], [16.7, 17.2]], 3: [[7.3, 6.8], [12, 12], [16.7, 17.2]], 4: [[7.3, 6.8], [16.7, 6.8], [7.3, 17.2], [16.7, 17.2]], 5: [[7.3, 6.8], [16.7, 6.8], [12, 12], [7.3, 17.2], [16.7, 17.2]], 6: [7.3, 16.7].flatMap((x) => [6.8, 12, 17.2].map((y) => [x, y])) };
const die = (fx = 'pierce', s = 6, v = 0, tpl = false) => { let [f, e, p] = DIE_COL[fx]; if (tpl) p = '#fff'; /* t413: die = colour of what it adds, white pips/numbers */ const el = document.createElementNS(SVG, 'svg'); el.setAttribute('viewBox', '0 0 24 24'); el.setAttribute('class', `d6 d-${fx}`); el.setAttribute('aria-label', `d${s} for ${fx}`);
  el.innerHTML = s !== 6 ? `<path d="M12 1.5 L22.5 12 L12 22.5 L1.5 12 Z" fill="${f}" stroke="${e}" stroke-width="1.6" stroke-linejoin="round"/><text x="12" y="16.2" text-anchor="middle" font-family="Inter,sans-serif" font-weight="900" font-size="11" fill="${p}">${v || s}</text>`
    : `<rect x="2" y="2" width="20" height="20" rx="4.5" fill="${f}" stroke="${e}" stroke-width="1.6"/><g fill="${p}">${PIPS[v || 6].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9"/>`).join('')}</g>`; return el; };
// t411: seeded mock roll for the cast frame
const CAST = q.has('cast'); const roll = (n, s) => { let r = 7; return Array.from({ length: n }, () => { r = (r * 9301 + 49297) % 233280; return 1 + Math.floor((r / 233280) * s); }); };
const dice = (n, fx, s) => Array.from({ length: n }, () => die(fx, s, 0, true)); // t412: every die on the template (orange, white pips/numbers)
const mg = (n) => h('span', { class: 'pc' }, HK.icon('magic'), String(n));
const eq = () => h('span', { class: 'to' }, '=');
const ICON = { atk: 'atk', block: 'block', pierce: 'pierce', heal: 'heal', magic: 'magic', gold: 'gold', free: 'reroll' };
const fxv = (fx, n) => h('span', { class: `fv fx-${fx}` }, HK.icon(ICON[fx] || 'magic'), h('b', {}, fx === 'free' ? `${n}` : `+${n}`));
const ln = (...k) => h('span', { class: 'ln' }, ...k); const mx = (...k) => h('span', { class: 'mx' }, ...k);
const WORD = { pierce: 'pierce attack', atk: 'attack', heal: 'heal', gold: 'gold', block: 'block', magic: 'magic' };
// t409: dice bought with magic — the dice added so far (empty slots up to the max) and magic spent vs the bank, driven by ?d=
const BANK = 6;
const MAXD = 6; // t410 PROPOSED max dice for every buy-dice power (mockup only)
const scaleState = (k, l = 0) => { const lo = E.powerDice(k, k.cost, l), hi = aimP(k) ? AIM[l].m : l === 0 ? MAXD : E.powerDice(k, E.scaleMax(k, l), l), st = E.scaleStep(k);
  const n = Math.max(0, Math.min(hi, q.has('d') ? +q.get('d') : lo)); const x = n ? k.cost + Math.max(0, n - lo) * st : 0; const aff = Math.min(hi, lo + Math.floor((BANK - k.cost) / st)); return { lo, hi, st, n, x, aff }; };
// Printed rows per kind, at engine level l (card Level I/II/III = engine 0/1/2)
function rows(k, l) {
  const f = k.dice?.to;
  if (k.kind === 'scale' && l === 0) { const S = scaleState(k, l); const f = k.dice?.to; const R = roll(S.n, k.dice.s); const tot = R.reduce((a, b) => a + b, 0);
    return [h('span', { class: 'slots' }, Array.from({ length: S.hi }, (_, i) => (i < S.n ? (() => { const d = die(f, k.dice.s, CAST ? R[i] : 0, true); if (!CAST && i === S.n - 1) d.classList.add('drop'); return d; })() : h('i', { class: `slot0 ${k.dice.s === 8 ? 'd8' : ''} ${i >= S.aff ? 'lock' : ''}`, title: i >= S.aff ? 'not enough magic' : '' })))),
      h('span', { class: 'spent' }, HK.icon('magic'), h('b', {}, `${S.x}`), ` of ${BANK}`, h('span', { class: `wd fx-${f}` }, ` · ${S.n}d${k.dice.s} ${WORD[f]}`)), (CAST && S.n ? h('span', { class: `total fx-${f}` }, `= ${tot} ${WORD[f]}`) : ''), h('span', { class: 'prop' }, aimP(k) ? 'PROPOSED path: II d8 · III 6 dice' : `PROPOSED max ${MAXD} dice` + (S.aff < MAXD ? ` · 🔒 = needs more magic` : ''))]; }
  if (aimP(k)) return [ln(mg(1), eq(), ...dice(1, f, AIM[l].s)), mx(`UP TO ${AIM[l].m}×`, die(f, AIM[l].s, 0, true))];
  if (k.kind === 'super') return [ln(mg(k.cost), eq(), fxv(Object.keys(k.fx)[0], E.scaleNum(Object.values(k.fx)[0], l))), mx(`+${E.scaleNum(k.aoe, l)} TO EVERY MONSTER · ROUND ${k.minRound}+`)];
  if (k.kind === 'scale') { const lo = E.powerDice(k, k.cost, l), hi = E.powerDice(k, E.scaleMax(k, l), l);
    return [ln(mg(k.cost), eq(), ...dice(lo, f, k.dice.s)), mx('UP TO', ...dice(Math.min(hi, 6), f, k.dice.s))]; }
  if (k.kind === 'dice') { const P = clvP(k) ? CLV[l] : { n: k.dice.n + l, s: k.dice.s }; const n = P.n;
    if (l === 0 && CAST) { const R = roll(n, P.s); const t = R.reduce((a, b) => a + b, 0); return [ln(...R.map((v) => die(f, P.s, v, true))), h('span', { class: `total fx-${f}` }, `= ${t} ${WORD[f]}`), k.splash === 'half' ? h('span', { class: 'prop' }, `+ ${Math.floor(t / 2)} splash on every other monster`) : '']; }
    return [ln(mg(k.cost), eq(), ...dice(n, f, P.s)), k.splash === 'half' ? mx('ATTACK + ½ SPLASH') : mx(WORD[f].toUpperCase())]; }
  if (k.kind === 'flat') return [ln(...Object.entries(k.fx).map(([x, v]) => fxv(x, x === 'free' ? v + l : E.scaleNum(v, l)))), mx(k.note ? k.note : k.fx.free ? 'FREE REROLLS' : Object.keys(k.fx).map((x) => WORD[x]).join(' + ').toUpperCase())];
  if (k.kind === 'charge') { const per = typeof k.per === 'number' ? { atk: k.per } : k.per; const fs = Object.keys(per);
    return [ln(...fs.map((x) => h('span', { class: `dots fx-${x}` }, HK.icon(ICON[x]), [1, 2, 3, 4].map((n) => h('span', { class: `dot ${l === 0 && n > charges ? 'g' : ''}` }, String(E.chargeGain(k, n, l)[x])))))), mx(`${charges} STORED · `, h('span', { class: 'wd' }, fs.map((x) => WORD[x]).join(' + ')), k.splash === 'half' ? ' · ½ SPLASH' : '')]; }
  if (k.kind === 'round') return [ln(h('span', { class: 'dots fx-atk' }, HK.icon('atk'), [1, 2, 3, 4].map((r) => h('span', { class: 'dot' }, String(E.roundGain(k, r, l)))))), mx('ROUND 1 · 2 · 3 · 4 …')];
  if (k.kind === 'luck') return [ln(h('span', { class: 'lk' }, h('i', {}, '1-2'), fxv('magic', 1 + l)), h('span', { class: 'lk' }, h('i', {}, '3-4'), fxv('atk', E.scaleNum(E.LUCK.mid, l))), h('span', { class: 'lk' }, h('i', {}, '5-6'), fxv('atk', E.scaleNum(E.LUCK.top, l)), fxv('magic', 1))), mx('ROLL', die('magic'), 'EVERY ROUND')];
  return [mx('?')];
}
const UTIL = {
  'u:bigheal': { name: 'Potion', cost: 0, kick: 'free · any time', row: () => [ln(fxv('heal', E.potionHpOf(hero))), mx(`${E.potionsLeft?.(hero) ?? 2} ON YOUR BELT`)], covers: [['Belt of 3', D.POTION_BELT?.[2]?.[0]], null], use: 'Drink' },
  'u:heal': { name: 'Heal', cost: D.HEAL_COST, kick: 'any time', row: () => [ln(mg(D.HEAL_COST), eq(), fxv('heal', E.healAmountOf(hero))), mx('ANY TIME')], covers: [null, null] },
  'u:heart': { name: 'Heart Change', cost: D.NUDGE_COST, kick: 'once a round', row: () => [ln(mg(D.NUDGE_COST), eq(), h('b', { class: 'hc' }, '−1'), h('span', { class: 'or' }, 'or'), h('b', { class: 'hc' }, '+1')), mx('TURN YOUR HEART DIE · 1 TO 6')], covers: [null, null] },
};
const KICK = { scale: (k) => (E.scaleStep(k) > 1 ? `${E.scaleStep(k)} magic per die` : '1 magic per die'), dice: (k) => `${k.cost} magic · once a battle`, flat: (k) => `${k.cost} magic · every round`, charge: () => 'store · release', round: () => 'grows each round', luck: () => 'every round · roll', super: (k) => `${k.cost} magic · once · round ${k.minRound}+` };
// Corner stamps: the same embossed metal symbol as the camp cardboard cards (js/g3/cardboard.js emblems(): INSETS, size 34, dark + light offsets,
// steel gradient, a tint over it), here the magic triangle in all four sockets with a purple tint (cardboard.js uses 0.14; 0.32 so it reads purple).
function corners() {
  const W = 720, H = 1052, c = document.createElement('canvas'); c.width = W; c.height = H; c.className = 'stamps'; const g = c.getContext('2d', { willReadFrequently: true });
  const INSETS = [[63, 60], [655.5, 60], [61.5, 981], [657, 981]]; const size = 34, n = 68, kind = 'magic', tint = '#a64dff';
  INSETS.forEach(([x, y]) => { const q = document.createElement('canvas'); q.width = q.height = n; const qg = q.getContext('2d', { willReadFrequently: true });
    qg.fillStyle = '#000'; drawSym(qg, kind, n / 2, n / 2, size, 0, true); const d = qg.getImageData(0, 0, n, n).data;
    let x0 = n, x1 = -1, y0 = n, y1 = -1; for (let j = 0; j < n * n; j++) if (d[j * 4 + 3] > 0) { const px = j % n, py = (j / n) | 0; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
    const ox = x - (x0 + x1 + 1) / 2 + n / 2, oy = y - (y0 + y1 + 1) / 2 + n / 2;
    const ink = (fill, dx, dy) => { g.fillStyle = fill; drawSym(g, kind, ox + dx, oy + dy, size, 0, true); };
    g.save(); ink('#000000b0', 1.2, 1.2); ink('#e8e2d0a0', -1.2, -1.2);
    qg.clearRect(0, 0, n, n); const m = qg.createLinearGradient(n / 2 - 17, n / 2 - 17, n / 2 + 17, n / 2 + 17); m.addColorStop(0, '#b4ae9c'); m.addColorStop(0.5, '#7c776a'); m.addColorStop(1, '#4c483f');
    qg.fillStyle = m; drawSym(qg, kind, n / 2, n / 2, size, 0, true); qg.globalCompositeOperation = 'source-atop'; qg.globalAlpha = 0.32; qg.fillStyle = tint; qg.fillRect(0, 0, n, n);
    g.drawImage(q, ox - n / 2, oy - n / 2); g.restore(); });
  return c;
}

const LV = ['I', 'II', 'III'];
function powerCard() {
  const u = UTIL[sel]; const k = card(sel); const art = sel.startsWith('u:') ? sel.slice(2) : sel;
  const lv = (l) => { const cov = u ? u.covers[l - 1] : true; const body = l === 0 ? (u ? u.row() : rows(k, l)) : (u ? [] : rows(k, l));
    return h('div', { class: `lv ${l === 0 ? 'act' : ''} ${u && l ? 'none' : ''}` }, h('span', { class: 'rn' }, LV[l]), h('span', { class: 'sy' }, body),
      l && (u ? cov : true) ? h('div', { class: 'cov' }, h('span', { class: 'lvw' }, u ? cov[0] : `Level ${LV[l]}`, !u ? h('span', { class: 'cdice' }, coverHint(k, l)) : null), h('span', { class: 'cp' }, h('i', { class: 'coin' }), h('b', {}, String(u ? cov[1] : D.POWER_UPGRADE[l - 1])))) : null,
      l && u && !cov ? h('span', { class: 'nolv' }, 'no upgrades') : null); };
  return h('div', { class: 'card purple' }, h('i', { class: 'under' }), corners(), h('img', { class: 'fr', src: '../../../../assets/cards/frame-t17.webp', alt: '' }),
    h('div', { class: 'field' }, h('div', { class: 'plaque' }, u ? u.name : k.name), k?.prop ? h('div', { class: 'propband' }, 'PROPOSED') : null, h('div', { class: 'paint' }, h('img', { src: `art/${art}.webp`, alt: '' })),
      h('div', { class: 'art small' }, glyph(k || { id: sel })), h('div', { class: 'kick' }, u ? u.kick : KICK[k.kind](k)), h('div', { class: 'levels' }, [0, 1, 2].map(lv))));
}
// what the cover hints at: the headline number of that level
function coverHint(k, l) {
  const f = k.dice?.to;
  if (aimP(k)) return [h('span', { class: 'eq' }, `UP TO ${AIM[l].m}×`), die(f, AIM[l].s, 0, true)];
  if (k.kind === 'super') return [fxv(Object.keys(k.fx)[0], E.scaleNum(Object.values(k.fx)[0], l)), h('span', { class: 'eq' }, `+${E.scaleNum(k.aoe, l)} ALL`)];
  if (k.kind === 'scale') return [mg(k.cost), h('span', { class: 'eq' }, '='), ...dice(E.powerDice(k, k.cost, l), f, k.dice.s)];
  if (k.kind === 'dice') return clvP(k) ? dice(CLV[l].n, f, CLV[l].s) : dice(k.dice.n + l, f, k.dice.s);
  if (k.kind === 'flat') return Object.entries(k.fx).map(([x, v]) => fxv(x, x === 'free' ? v + l : E.scaleNum(v, l)));
  if (k.kind === 'charge') { const per = typeof k.per === 'number' ? { atk: k.per } : k.per; return Object.keys(per).map((x) => fxv(x, E.chargeGain(k, 4, l)[x])); }
  if (k.kind === 'round') return [fxv('atk', E.roundGain(k, 4, l)), h('span', { class: 'eq' }, 'ROUND 4')];
  if (k.kind === 'luck') return [fxv('atk', E.scaleNum(E.LUCK.top, l))];
  return [];
}
const go = (d) => { const u = new URL(location.href); u.searchParams.set('d', d); location.href = u; };
const useBtns = () => { const u = UTIL[sel]; const k = card(sel);
  if (k?.kind === 'scale') { const S = scaleState(k); const can = S.n < S.aff && S.x + (S.n ? S.st : k.cost) <= BANK;
    const sub = h('button', { class: 'use sm sub', 'aria-label': 'remove die', disabled: !S.n || CAST, onclick: () => go(S.n - 1) }, '−'), add = h('button', { class: 'use sm add', 'aria-label': 'add die', disabled: !can || CAST, onclick: () => go(S.n + 1) }, '+');
    return [h('div', { class: 'pmrow' }, sub, add), h('button', { class: 'use cast', disabled: !S.n }, CAST ? 'Rolled' : 'Cast', CAST ? '' : HK.icon('magic'), CAST ? '' : String(S.x))]; }
  if (k?.kind === 'charge') return [h('div', { class: 'pmrow' }, h('button', { class: 'use sm add', 'aria-label': 'add magic' }, '+')), h('button', { class: 'use cast' }, `Release ${charges}`)];
  if (u && !u.cost) return [h('button', { class: 'use heal' }, u.use || 'Use')];
  return [h('button', { class: 'use cast' }, k?.kind === 'flat' ? 'Use' : 'Cast', HK.icon('magic'), String(u ? u.cost : k.cost))]; };
const slots = [...mine.map((k) => [k.id, k.name, k.cost]), ['u:bigheal', 'Potion', 0], ['u:heal', 'Heal', D.HEAL_COST], ['u:heart', 'Heart change', D.NUDGE_COST]];
const app = document.getElementById('app'); app.classList.add(`v-${variant}`);
const stage = h('div', { class: 'stage' }, powerCard());
app.append(
  h('div', { class: 'top' }, h('h1', {}, `${hero.name} · ${C.name}`), h('button', { class: 'close' }, 'Close')),
  h('div', { class: 'bank' }, h('div', { class: 'h' }, HK.icon('heal'), h('b', {}, '52'), h('small', {}, '/ 60 HEALTH')), h('div', { class: 'm' }, HK.icon('magic'), h('b', {}, '6'), h('small', {}, '/ 16 MAGIC'))),
  h('div', { class: 'grid' }, slots.map(([id, n, c]) => h('div', { class: `slot ${id === sel ? 'on' : ''}` }, glyph(card(id) || { id }), n, c ? h('span', { class: 'cost' }, HK.icon('magic'), String(c)) : h('span', { class: 'cost', style: 'color:#7cf0a6' }, 'FREE')))),
  stage, h('div', { class: 'tag' }, 'MOCKUP'));
requestAnimationFrame(() => requestAnimationFrame(() => {
  const c = stage.querySelector('.card'); const act = c.querySelector('.lv.act'); const cr = c.getBoundingClientRect(); const ar = act.getBoundingClientRect();
  if (variant === 'float') c.append(h('div', { class: 'float', style: `top:${ar.top - cr.top + ar.height / 2}px;display:flex;flex-direction:column;gap:6px` }, useBtns()));
  else { const rail = h('div', { class: 'rail' }); stage.append(rail); const btns = useBtns(); const H = 40, gap = 6; const mid = ar.top - cr.top + ar.height / 2; const tot = btns.length * H + (btns.length - 1) * gap;
    btns.forEach((b, i) => { b.style.top = `${mid - tot / 2 + i * (H + gap)}px`; rail.append(b); }); }
  document.body.dataset.ready = '1';
}));
