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
export const die = (fx, s = 6, v = s) => { const [f, e, p] = COL[fx] || COL.magic; return svg(`mc-die d${s}`, s === 6 ? `<path d="${SHAPE[6]}" fill="${f}" stroke="${e}" stroke-width="1.6"/><g fill="${p}">${PIPS[v].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9"/>`).join('')}</g>`
  : `<path d="${SHAPE[s] || SHAPE[8]}" fill="${f}" stroke="${e}" stroke-width="1.6" stroke-linejoin="round"/><text x="12" y="16.2" text-anchor="middle" font-weight="900" font-size="10" fill="${p}">${v}</text>`); };
// an empty die space: a carved socket in the card (T28, Dave 4 Nov 2026: the dice spaces should look good), not a dashed box
const space = (s = 6) => svg(`mc-space d${s}`, `<path d="${SHAPE[s] || SHAPE[6]}" fill="#6b4a1f26" stroke="#7a5a2c" stroke-width="1.3" stroke-linejoin="round"/><path d="${SHAPE[s] || SHAPE[6]}" fill="none" stroke="#fff8e6" stroke-opacity=".55" stroke-width=".7" transform="translate(.5 .7)" stroke-linejoin="round"/>`);
const TYPE = (k) => (k.kind === 'scale' || k.kind === 'dice' ? 'DICE' : k.kind === 'charge' || k.kind === 'round' ? 'BUILD' : 'ONE-SHOT');
// Home-grid tile colours by role (Dave, 2 Nov 2026): attack/pierce = atk, block, heal, gold (incl. Hunter's Mark gold), anything else util.
// Up to two roles; a two-role tile is split on the diagonal (css/magiccard.css, ptc1).
const ROLE_OF = { atk: 'atk', pierce: 'atk', block: 'block', heal: 'heal', gold: 'gold' };
const UTIL_ROLES = { 'u:bigheal': ['heal'], 'u:heal': ['heal'], 'u:heart': ['util'] };
export const tileRoles = (id) => { if (UTIL_ROLES[id]) return UTIL_ROLES[id]; const k = Object.values(D.CLASSES).flatMap((c) => c.cards || []).find((c) => c.id === id); if (!k) return ['util'];
  const keys = [k.dice?.to, k.grudge ? 'atk' : null, ...Object.keys(typeof k.per === 'object' ? k.per : {}), ...Object.keys(k.fx || {}), k.markGold ? 'gold' : null];
  const r = [...new Set(keys.map((x) => ROLE_OF[x]).filter(Boolean))]; return r.length ? r.slice(0, 2) : ['util']; };
const FX = (k) => k.dice?.to || (k.grudge ? 'atk' : null) || Object.keys(typeof k.per === 'object' ? k.per : k.fx || { magic: 1 })[0];
const WORD = { pierce: 'pierce', atk: 'attack', block: 'block', heal: 'heal', gold: 'gold', magic: 'magic' };
const mg = (n) => h('span', { class: 'mc-mg' }, HK.icon('magic'), h('b', {}, String(n)));
const fxv = (f, n, extra = '') => h('span', { class: `mc-fv fx-${f}` }, HK.icon(f === 'atk' ? 'atk' : f), h('b', {}, `+${n}`), extra ? h('small', {}, extra) : null);
const LV = ['I', 'II', 'III', 'IV'];
// First approved template. Roll out to other cards only after their review.
const usesCardTemplate = (k) => ['knight', 'wizard', 'ranger', 'dwarf', 'bard'].some(cls => D.CLASSES[cls].cards.some(c => c.id === k.id));
const usesBuildTemplate = (k) => usesCardTemplate(k) && k.kind === 'charge';
const BARD_ART = { finale: 'bard-finale', discord: 'bard-discord', goldhymn: 'bard-goldhymn' };
const isBardCard = (k) => D.CLASSES.bard.cards.some(c => c.id === k.id);
const DWARF_ART = { avalanche: 'dwarf-avalanche', bulwark: 'dwarf-shieldbash', brace: 'dwarf-brace', forgefury: 'dwarf-forgefury' };
const isDwarfCard = (k) => D.CLASSES.dwarf.cards.some(c => c.id === k.id);
const RANGER_ART = { rain: 'ranger-rain', quickdraw: 'ranger-quickdraw', snare: 'ranger-snare', vanish: 'ranger-vanish' };
const isRangerCard = (k) => D.CLASSES.ranger.cards.some(c => c.id === k.id);
const WIZARD_ART = { meteor: 'wizard-meteor', bolt: 'wizard-missile', barrier: 'wizard-barrier', light: 'wizard-light' };
const isWizardCard = (k) => D.CLASSES.wizard.cards.some(c => c.id === k.id);
// The painted picture for any power (T28: the Camp Store's Learn-magic shelf shows it too).
export const powerArt = (k, cls) => `assets/cards/magic/${k.art || KNIGHT_ART[k.id] || WIZARD_ART[k.id] || RANGER_ART[k.id] || DWARF_ART[k.id] || BARD_ART[k.id] || `${cls || 'ranger'}-${k.id}`}.webp`;
const KNIGHT_ART = { judgment: 'knight-cleave', shieldwall: 'knight-riposte', press: 'knight-cleave', secondwind: 'knight-rally' };
// the camp cardboard emblem (cardboard.js emblems), the magic triangle, purple tint, in the four corner sockets of frame-t17
function corners() {
  const W = 720, H = 1052, c = document.createElement('canvas'); c.width = W; c.height = H; c.className = 'mc-stamps'; const g = c.getContext('2d');
  if (!g) return c; if (!drawSym) { symReady.then(() => { if (drawSym) paint(); }); return c; } paint(); return c;
  function paint() {
  const INSETS = [[63, 60], [655.5, 60], [61.5, 981], [657, 981]]; const size = 34, n = 68;
  INSETS.forEach(([x, y]) => { const q = document.createElement('canvas'); q.width = q.height = n; const qg = q.getContext('2d'); if (!qg) return;
    const m = qg.createLinearGradient(n / 2 - 17, n / 2 - 17, n / 2 + 17, n / 2 + 17); m.addColorStop(0, '#b4ae9c'); m.addColorStop(0.5, '#7c776a'); m.addColorStop(1, '#4c483f');
    g.fillStyle = '#000000b0'; drawSym(g, 'magic', x + 1.2, y + 1.2, size, 0, true); g.fillStyle = '#e8e2d0a0'; drawSym(g, 'magic', x - 1.2, y - 1.2, size, 0, true);
    qg.fillStyle = m; drawSym(qg, 'magic', n / 2, n / 2, size, 0, true); qg.globalCompositeOperation = 'source-atop'; qg.globalAlpha = 0.32; qg.fillStyle = '#a64dff'; qg.fillRect(0, 0, n, n);
    g.drawImage(q, x - n / 2, y - n / 2); }); }
}
// Specialized effects share the shell but retain the engine's upgrade rules and conditions.
function templateEffects(k, l, compact = false) {
  return [...Object.entries(k.fx).map(([f,v]) => f === 'free'
    ? h('span', { class: 'mc-fv fx-free' }, HK.icon('reroll'), h('b', {}, `×${v + l}`), compact ? null : h('small', {}, 'reroll dice'))
    : f === 'weaken' ? h('span', { class: 'mc-fv fx-weaken' }, HK.icon('weaken'), h('b', {}, `−${E.scaleNum(v,l)}`), compact ? null : h('small', {}, 'enemy attack')) : fxv(f, E.scaleNum(v,l))),
    ...(k.markGold ? [fxv('gold', E.scaleNum(k.markGold,l), compact ? '' : 'if target falls')] : [])];
}
// Each luck range keeps its own payout, including magic on the highest roll.
function luckTable(l, compact = false) {
  const rows = [['1–2', 2, [fxv('magic', 1 + l)]], ['3–4', 4, [fxv('atk', E.scaleNum(E.LUCK.mid,l))]], ['5–6', 6, [fxv('atk', E.scaleNum(E.LUCK.top,l)), fxv('magic',1)]]];
  return h('div', { class: compact ? 'mc-luck-cover' : 'mc-luck-table' }, rows.map(([range,face,effects]) => h('div', { class: 'mc-luck-row', 'data-range': range }, compact ? null : die('magic',6,face), h('small', {}, range), h('span', { class: 'mc-luck-payout' }, effects))));
}
// Finale and Avalanche separate their bonuses from the damage dealt to every enemy.
function areaEffects(k, l, compact = false) {
  return h('span', { class: compact ? 'mc-finale-cover' : 'mc-finale-effect' },
    h('span', { class: 'mc-finale-self' }, Object.entries(k.fx).map(([f,v]) => fxv(f, E.scaleNum(v,l)))),
    h('span', { class: 'mc-finale-all' }, fxv('atk', E.scaleNum(k.aoe,l)), h('small', {}, compact ? 'all' : 'Every enemy')));
}
// The Ranger keeps a target reward separate from effects that apply to every enemy.
function rangerEffects(k, l, compact = false) {
  const rain = k.id === 'rain';
  return h('span', { class: `${rain ? 'mc-rain' : 'mc-mark'}-${compact ? 'cover' : 'effect'}` },
    h('span', { class: 'mc-ranger-target' }, fxv('pierce', E.scaleNum(k.fx.pierce,l)), rain ? h('small', {}, 'Target') : null),
    h('span', { class: 'mc-ranger-secondary' }, fxv(rain ? 'atk' : 'gold', E.scaleNum(rain ? k.aoe : k.markGold,l)), h('small', {}, rain ? (compact ? 'all' : 'Every enemy') : (compact ? 'on defeat' : 'If target falls this round'))));
}
// Grudge upgrades add to damage that actually got past block; they are not flat attack.
function grudgeEffects(k, l, p = {}, compact = false) {
  const bonus = k.grudge[Math.min(l, k.grudge.length - 1)] || 0, hurt = p.hurt ?? 0;
  if (compact) return h('span', { class: 'mc-grudge-cover', 'aria-label': `Attack from last round's damage past block${bonus ? ` plus ${bonus}` : ''}` }, HK.icon('atk'), h('span', {}, 'Hurt'), bonus ? h('b', {}, `+${bonus}`) : null);
  return h('span', { class: 'mc-grudge-effect' }, fxv('atk', hurt + bonus),
    h('span', { class: 'mc-grudge-source' }, h('b', {}, String(hurt)), h('small', {}, 'damage past block last round')),
    bonus ? h('small', { class: 'mc-grudge-rank' }, `+${bonus} rank bonus`) : null);
}
// ---- T28 (Dave, 4 Nov 2026): the 15 starting powers share one simple panel. The symbol is the space: a red starburst for attack,
// a blue shield for block, green for heal, orange for pierce, gold, purple magic; it fills with its colour when you have it, with
// the number inside. Dice powers show carved die sockets that fill as you add magic, plus a few plain words. Numbers all come
// from the engine. The rank sits in a small pill, never over the picture.
const SYM_Y = { atk: 15.3, block: 15.4, heal: 15.2, pierce: 10.6, gold: 15.6, magic: 18.2 };
const SYM_FS = { pierce: 0.68, magic: 0.8, heal: 0.9 }; // the arrow's head and the triangle hold smaller numbers
function t28Sym(fx, { on = true, now = false, val = null, big = false } = {}) {
  const s = HK.icon(fx, `t28-sym fx-${fx}${on ? ' on' : ' off'}${now ? ' now' : ''}${big ? ' big' : ''}`);
  if (fx === 'heal') s.innerHTML = '<path class="f" d="M8 2.2 H16 V8 H21.8 V16 H16 V21.8 H8 V16 H2.2 V8 H8 Z"/>'; // a fat plus, so a number fits inside
  if (val != null && val !== '') { const t = document.createElementNS(SVG, 'text'); const txt = String(val); t.setAttribute('x', '12'); t.setAttribute('y', String(SYM_Y[fx] || 15.6));
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', String((txt.length >= 3 ? 7 : txt.length === 2 ? 8.6 : 10) * (SYM_FS[fx] || 1))); t.setAttribute('class', 't28-num'); t.textContent = txt; s.append(t); }
  return s;
}
const T28_WORD = { atk: 'Attack', block: 'Block', heal: 'Heal', pierce: 'Pierce', gold: 'Gold', magic: 'Magic' };
const say = (...bits) => h('div', { class: 't28-say' }, ...bits);
const plain = (text) => (text ? h('div', { class: 't28-plain' }, text) : null); // the few plain words, on their own line
const fine = (...bits) => h('div', { class: 't28-fine' }, ...bits);
const word = (fx) => h('b', { class: `t28-w fx-${fx}` }, HK.icon(fx), T28_WORD[fx]);
function t28Body(k, l, p) {
  const camp = !!p.camp; const f = FX(k); const out = [];
  if (k.kind === 'scale') {
    const s = k.dice.s; const top = E.powerDice(k, E.scaleMax(k, l), l); const pay = camp ? E.powerCost(k, k.cost, l) : (p.x ?? k.cost); const n = E.powerDice(k, pay, l);
    out.push(h('div', { class: `t28-dice n${top}`, role: 'img', 'aria-label': `${n} of ${top} ${WORD[f]} dice` }, Array.from({ length: top }, (_, i) => (i < n ? die(f, s) : space(s)))));
    out.push(say(word(f), k.goldOn ? h('span', { class: 't28-gold' }, 'each', die(f, s, k.goldOn.face), '=', t28Sym('gold', { val: `+${k.goldOn.gold}` })) : null));
    out.push(plain(k.splash === 'half' ? (k.id === 'arcbolt' ? '½ arcs to every other monster' : '½ splashes on every other monster') : k.party ? 'Heals every hero' : null));
    out.push(fine(camp ? `${E.scaleStep(k)} magic a die · up to ${top} dice` : `${n} of ${top} dice · ${pay} magic`));
  } else if (k.kind === 'charge') {
    const have = camp ? 0 : (p.stored || 0); const fs = Object.keys(typeof k.per === 'object' ? k.per : { atk: 1 });
    out.push(h('div', { class: `t28-charge rows${fs.length}` }, fs.map((x) => h('div', { class: 't28-row', role: 'img', 'aria-label': `${WORD[x]} at 1 to ${k.max} charges` },
      Array.from({ length: k.max }, (_, i) => t28Sym(x, { on: i < have, now: i === have - 1, val: E.chargeGain(k, i + 1, l)[x] }))))));
    const g = have ? E.chargeGain(k, have, l) : null;
    out.push(have ? say(h('span', {}, 'Use now:'), ...fs.map((x) => h('b', { class: `t28-w fx-${x}` }, HK.icon(x), `+${g[x]}`)), k.splash === 'half' ? h('span', {}, '· ½ splashes') : null)
      : say(h('span', {}, 'Charge 1 magic a round')));
    if (k.splash === 'half') out.push(plain('½ splashes on every other monster'));
    out.push(fine(camp ? `Up to ${k.max} charges · use when you like` : `${have} of ${k.max} charged`));
  } else if (k.grudge) {
    const bonus = k.grudge[Math.min(l, k.grudge.length - 1)] || 0; const hurt = camp ? null : (p.hurt ?? 0);
    out.push(h('div', { class: 't28-one' }, t28Sym('atk', { val: hurt == null ? '?' : hurt + bonus, big: true })));
    out.push(say(word('atk')), plain('Equal to the damage past your block last round'));
    out.push(fine(hurt == null ? (bonus ? `+${bonus} more at this rank` : 'Take a hit, hit back') : `${hurt} got past your block${bonus ? ` · +${bonus}` : ''}`));
  } else if (k.riposte) {
    out.push(h('div', { class: 't28-one' }, t28Sym('block', { val: `+${E.scaleNum(k.fx.block, l)}`, big: true })));
    out.push(say(word('block')), plain('Unused block hits back as attack'));
  } else if (k.markGold) {
    out.push(h('div', { class: 't28-one two' }, t28Sym('pierce', { val: `+${E.scaleNum(k.fx.pierce, l)}`, big: true }), t28Sym('gold', { val: `+${E.scaleNum(k.markGold, l)}`, big: true })));
    out.push(say(word('pierce'), word('gold')), plain('The gold comes if your target falls'));
  } else if (k.kind === 'luck') {
    const rows = [['1–2', 2, [['magic', `+${1 + l}`]]], ['3–4', 4, [['atk', `+${E.scaleNum(E.LUCK.mid, l)}`]]], ['5–6', 6, [['atk', `+${E.scaleNum(E.LUCK.top, l)}`], ['magic', '+1']]]];
    out.push(h('div', { class: 't28-luck' }, rows.map(([range, face, pays]) => h('div', { class: 't28-luck-row' }, die('magic', 6, face), h('b', {}, range), h('span', { class: 't28-pays' }, pays.map(([x, v]) => t28Sym(x, { val: v })))))));
    out.push(say(h('span', {}, 'Roll a purple d6')));
  } else return null;
  return h('div', { class: `t28 t28-${k.kind}` }, h('span', { class: 't28-rank' }, `Rank ${LV[l]}`), ...out);
}
// a rank cover on the 15 starting cards: one short line in the same symbols as the panel
function t28Cover(k, l) {
  const m = (fx, v) => h('span', { class: `t28-cv fx-${fx}` }, HK.icon(fx), h('b', {}, v));
  if (k.kind === 'scale') { const c = E.powerCost(k, k.cost, l), n = E.powerDice(k, c, l), top = E.powerDice(k, E.scaleMax(k, l), l);
    return [h('span', { class: 't28-cvdice' }, h('b', {}, `${n}`), die(FX(k), k.dice.s), h('small', {}, 'for'), mg(c), h('small', {}, `· up to ${top}`))]; }
  if (k.kind === 'luck') return [m('magic', `+${1 + l}`), m('atk', `+${E.scaleNum(E.LUCK.mid, l)}`), m('atk', `+${E.scaleNum(E.LUCK.top, l)}`)];
  if (k.markGold) return [m('pierce', `+${E.scaleNum(k.fx.pierce, l)}`), m('gold', `+${E.scaleNum(k.markGold, l)}`)];
  if (k.riposte) return [m('block', `+${E.scaleNum(k.fx.block, l)}`)];
  if (k.grudge) { const b = k.grudge[Math.min(l, k.grudge.length - 1)] || 0; return [m('atk', b ? `hurt +${b}` : 'hurt')]; }
  if (k.kind === 'charge' && !k.frogLoad) return Object.entries(E.chargeGain(k, k.max, l)).map(([x, v]) => m(x, `+${v}`));
  return null;
}
// what a level row shows. l: the row's level; cur: the hero's level for it; p: the power's sheet state
function rowBody(k, l, p, cur) {
  if (k.start && l === cur && !k.frogLoad) { const t = t28Body(k, l, p); if (t) return [t]; }
  if (p.camp) return campRowBody(k, l, p);
  const f = FX(k); const now = l === cur;
  if (k.kind === 'scale') { const top = E.powerDice(k, E.scaleMax(k, l), l); const s = k.dice.s;
    if (!now) return [h('span', { class: 'mc-ln' }, mg(E.scaleStep(k)), h('i', { class: 'mc-eq' }, '='), die(f, s)), h('span', { class: 'mc-mx' }, `UP TO ${top}×`, die(f, s))];
    const n = E.powerDice(k, p.x ?? k.cost, l);
    if (usesCardTemplate(k)) return [h('span', { class: `mc-attack-track fx-${f}` }, HK.icon(f), h('span', { class: 'mc-slots', 'aria-label': `${n} of ${top} ${WORD[f]} dice` }, Array.from({ length: top }, (_, i) => i < n ? die(f, s) : space(s)))), k.goldOn ? h('span', { class: 'mc-bonus', 'aria-label': `Each ${k.goldOn.face} rolled gives ${k.goldOn.gold} gold` }, die(f,s,k.goldOn.face), h('span', {}, '='), fxv('gold', k.goldOn.gold)) : null];
    return [h('span', { class: 'mc-slots', 'aria-label': `${n} of ${top} dice` }, Array.from({ length: top }, (_, i) => (i < n ? die(f, s) : space(s)))),
      h('span', { class: 'mc-spent' }, mg(p.x ?? k.cost), h('span', { class: `fx-${f}` }, ` · ${n} of ${top} dice`), h('i', { class: 'mc-br' }), h('span', { class: `fx-${f}` }, ` · ${n}d${s} ${WORD[f]}`)), k.party ? h('span', { class: 'mc-mx' }, 'HEALS EVERY HERO IN THE PARTY') : null, k.goldOn ? h('span', { class: 'mc-mx' }, `EVERY ${k.goldOn.face} ALSO GIVES `, fxv('gold', k.goldOn.gold)) : null, k.splash === 'half' ? h('span', { class: 'mc-mx' }, k.id === 'arcbolt' ? '½ ARCS TO EVERY OTHER MONSTER' : '½ SPLASHES ON EVERY OTHER MONSTER') : null]; }
  if (k.frogNeed) { const have = now ? p.stored || 0 : 0; const rs = [1, 2, 3].slice(0, k.max).map((n) => E.frogRange(E.frogNeed(k, n, l))); const fp = k.frogPierce?.[Math.min(l, k.frogPierce.length - 1)] || 0; // Polymorph: each dot is the d6 range a Use needs at that many charges
    return [h('span', { class: 'mc-dots fx-weaken' }, h('b', { class: 'mc-frog' }, 'Frog'), Array.from({ length: k.max }, (_, i) => h('span', { class: `mc-dot ${now && i >= have ? 'g' : ''} ${now && i === have - 1 ? 'now' : ''}` }, rs[i] === 'sure' ? '✓' : rs[i]))),
      fp ? h('span', { class: 'mc-ln' }, fxv('pierce', fp)) : null,
      h('span', { class: 'mc-mx' }, now && have ? `${have} CHARGED · ${rs[have - 1] === 'sure' ? 'SURE FROG' : `FROG ON ${rs[have - 1]}`}` : 'TARGET SKIPS ITS ATTACK · D6 AT 1 · 2 · 3 CHARGED')]; }
  if (k.kind === 'charge') { const have = now ? p.stored || 0 : 0; const fs = Object.keys(typeof k.per === 'object' ? k.per : { atk: 1 });
    return [...fs.map((x) => h('span', { class: `mc-dots fx-${x}` }, HK.icon(x), Array.from({ length: k.max }, (_, i) => h('span', { class: `mc-dot ${now && i >= have ? 'g' : ''} ${now && i === have - 1 ? 'now' : ''}` }, String(E.chargeGain(k, i + 1, l)[x]))))),
      usesBuildTemplate(k) ? null : h('span', { class: 'mc-mx' }, now ? `${have} CHARGED · ${fs.map((x) => WORD[x]).join(' + ')}` : `at 1 · 2 · 3 · 4 charged`)]; }
  if (k.id === 'rain') return [rangerEffects(k,l), h('span', { class: 'mc-mx' }, `Round ${k.minRound}+ · once per battle`)];
  if (k.id === 'mark') return [rangerEffects(k,l)];
  if (k.id === 'grudge') return [grudgeEffects(k,l,p)];
  if (k.id === 'avalanche') return [areaEffects(k,l), h('span', { class: 'mc-mx' }, `Round ${k.minRound}+ · once per battle`)];
  if (k.id === 'finale') return [areaEffects(k,l), h('span', { class: 'mc-mx' }, `Round ${k.minRound}+ · once per battle`)];
  if (usesCardTemplate(k) && k.kind === 'super') return [h('span', { class: 'mc-ln' }, Object.entries(k.fx).map(([f,v]) => fxv(f, E.scaleNum(v,l)))), h('span', { class: 'mc-ln' }, fxv('atk', E.scaleNum(k.aoe, l), 'to every enemy')), h('span', { class: 'mc-mx' }, `Round ${k.minRound}+ · once per battle`)];
  if (k.id === 'meteor') return [h('span', { class: 'mc-meteor-effect' }, fxv('atk', E.roundGain(k, p.round || 1, l)), h('small', {}, `Round ${p.round || 1}`)), h('span', { class: 'mc-mx' }, `Round ${k.minRound}+ · grows each round`)];
  if (usesCardTemplate(k) && k.kind === 'round') return [h('span', { class: 'mc-ln' }, fxv('atk', E.roundGain(k, p.round || 1, l))), h('span', { class: 'mc-mx' }, `Round ${p.round || 1} · available round ${k.minRound}+`), h('span', { class: 'mc-mx' }, 'Grows with each round')];
  if (usesCardTemplate(k) && k.kind === 'flat' && !k.fx?.frog && !k.grudge) return [h('span', { class: 'mc-ln' }, templateEffects(k, l)), k.riposte ? h('span', { class: 'mc-mx' }, 'Unused block hits back') : null];
  if (k.fx?.frog) { const fp = k.frogPierce?.[Math.min(l, k.frogPierce.length - 1)] || 0; const c = E.powerCost(k, k.cost, l); return [h('span', { class: 'mc-ln' }, h('b', { class: 'mc-frog' }, k.id === 'polymorph' ? 'Frog' : 'FROG!'), fp ? fxv('pierce', fp) : null, c !== k.cost && !usesCardTemplate(k) ? h('span', { class: 'mc-mx' }, 'COSTS ', mg(c)) : null), h('span', { class: 'mc-mx' }, usesCardTemplate(k) ? "Target skips its attack" : "YOUR TARGET CAN'T ATTACK THIS ROUND")]; }
  if (usesCardTemplate(k) && k.grudge) return [h('span', { class: 'mc-ln' }, fxv('atk', (p.hurt ?? 0) + (k.grudge[l] || 0))), h('span', { class: 'mc-mx' }, `${p.hurt ?? 0} damage past block last round`, k.grudge[l] ? ` · +${k.grudge[l]}` : '')];
  if (k.grudge) { const g = k.grudge[l] || 0; return [h('span', { class: 'mc-ln' }, h('b', { class: 'mc-grudge' }, 'HURT'), h('i', { class: 'mc-eq' }, '='), now ? fxv('atk', (p.hurt ?? 0) + g) : [fxv('atk', '?'), g ? fxv('atk', g, 'more') : null]), h('span', { class: 'mc-mx' }, now && p.hurt != null ? `${p.hurt} GOT PAST YOUR BLOCK LAST ROUND` : 'DAMAGE PAST YOUR BLOCK LAST ROUND HITS BACK')]; }
  if (usesCardTemplate(k) && k.kind === 'luck') return [luckTable(l)];
  if (k.kind === 'luck') { const m = 1 + l, a = E.scaleNum(E.LUCK.mid, l), t = E.scaleNum(E.LUCK.top, l);
    return [h('span', { class: 'mc-ln mc-luck' }, die('magic', 6, 2), fxv('magic', m), die('atk', 6, 4), fxv('atk', a), die('atk', 6, 6), fxv('atk', t), fxv('magic', 1)), h('span', { class: 'mc-mx' }, 'ROLL A D6 · 1–2 · 3–4 · 5–6')]; }
  if (k.riposte) return [h('span', { class: 'mc-ln' }, fxv('block', E.scaleNum(k.fx.block, l))), h('span', { class: 'mc-mx' }, 'LEFTOVER BLOCK HITS BACK AS ATTACK')];
  if (k.markGold) return [h('span', { class: 'mc-ln' }, fxv('pierce', E.scaleNum(k.fx.pierce, l)), fxv('gold', E.scaleNum(k.markGold, l))), h('span', { class: 'mc-mx' }, 'PIERCE NOW · GOLD IF IT FALLS THIS ROUND')];
  if (k.kind === 'flat') return [h('span', { class: 'mc-ln' }, Object.entries(k.fx).map(([x, v]) => fxv(x === 'free' ? 'magic' : x, x === 'free' ? v + l : E.scaleNum(v, l))))];
  return [h('span', { class: 'mc-mx' }, k.text)];
}
const coverHint = (k, l) => (k.start && t28Cover(k, l)) || (k.id === 'grudge' ? [grudgeEffects(k,l,{},true)] : k.id === 'avalanche' ? [areaEffects(k,l,true)] : ['rain','mark'].includes(k.id) ? [rangerEffects(k,l,true)] : k.id === 'meteor' ? [h('span', { class: 'mc-round-formula' }, HK.icon('atk'), h('b', {}, `${E.roundGain(k,1,l)} ×`), h('small', {}, 'round'))] : k.id === 'finale' ? [areaEffects(k,l,true)] : usesCardTemplate(k) && ['flat','super'].includes(k.kind) && !k.fx?.frog && !k.grudge ? [...templateEffects(k,l,true), ...(k.aoe ? [fxv('atk',E.scaleNum(k.aoe,l),'all')] : [])] : (k.kind === 'scale' ? [mg(k.cost), '=', `${E.powerDice(k, k.cost, l)}×`, die(FX(k), k.dice.s)] : k.kind === 'round' ? [fxv('atk', E.roundGain(k, k.minRound, l), `round ${k.minRound}`)] : k.frogNeed ? (() => { const rs = [1, 2, 3].slice(0, k.max).map((n) => E.frogNeed(k, n, l)); const base = [1, 2, 3].slice(0, k.max).map((n) => E.frogNeed(k, n, 0)); const sure = rs.indexOf(1) + 1; const better = rs.some((v, i) => v !== base[i]); // a level row says only what that level adds
    return [k.frogPierce?.[l] ? fxv('pierce', k.frogPierce[l]) : null, h('span', { class: 'mc-mx' }, better ? `${E.frogRange(rs[0])} · SURE AT ${sure}` : k.frogPierce?.[l] ? 'ON THE FROG' : `FROG ${rs.map(E.frogRange).join(' · ').toUpperCase()}`)].filter(Boolean); })() : k.kind === 'charge' ? Object.entries(E.chargeGain(k, k.max, l)).map(([x, v]) => fxv(x, v)) : k.kind === 'luck' ? [usesCardTemplate(k) ? luckTable(l,true) : fxv('atk', E.scaleNum(E.LUCK.top, l))] : k.grudge ? [fxv('atk', k.grudge[l] || 0, 'more')] : k.riposte ? [fxv('block', E.scaleNum(k.fx.block, l))] : k.fx?.frog ? [k.frogPierce?.[l] ? fxv('pierce', k.frogPierce[l]) : null, (k.costLv?.[l] ?? k.cost) !== k.cost ? h('span', { class: 'mc-cover-cost' }, h('small', {}, 'cost'), mg(k.costLv[l])) : null].flat().filter(Boolean) : k.markGold ? [fxv('pierce', E.scaleNum(k.fx.pierce, l)), fxv('gold', E.scaleNum(k.markGold, l))] : []));
function cardTraits(k) {
  const effects = k.kind === 'charge' ? k.per || {} : k.grudge ? { atk: 1 } : k.kind === 'luck' ? { atk: 1, magic: 1 } : k.fx;
  const labels = [['atk','Attack'],['block','Block'],['heal','Heal'],['pierce','Pierce'],['free','Reroll'],['weaken','Weaken'],['magic','Magic'],['gold','Gold']].filter(([key]) => effects?.[key]);
  return h('div', { class: 'mc-traits' }, labels.map(([key,label]) => h('span', { class: `mc-trait ${key}` }, HK.icon(key === 'free' ? 'reroll' : key), label)),
    k.party ? h('span', { class: 'mc-trait splash' }, k.id === 'mending' ? 'All heroes' : 'Party') : null,
    k.goldOn ? h('span', { class: 'mc-trait gold' }, HK.icon('gold'), `On ${k.goldOn.face}s`) : null,
    k.markGold ? h('span', { class: 'mc-trait gold' }, HK.icon('gold'), 'On defeat') : null,
    k.fx?.frog ? h('span', { class: 'mc-trait transform' }, 'Transform') : null,
    k.splash ? h('span', { class: 'mc-trait splash' }, '½ Splash') : null,
    k.aoe ? h('span', { class: 'mc-trait splash' }, 'All enemies') : null,
    k.riposte ? h('span', { class: 'mc-trait counter' }, 'Counter') : null);
}
// Camp shares the reviewed card shell, but has no battle round, damage or stored charges.
function campRowBody(k, level, p) {
  if (k.grudge) {
    const bonus = k.grudge[Math.min(level, k.grudge.length - 1)] || 0;
    return [h('span', { class: 'mc-camp-formula mc-grudge-rule' }, HK.icon('atk'), h('b', {}, 'Hurt'), bonus ? h('b', {}, `+${bonus}`) : null),
      h('span', { class: 'mc-mx' }, 'Damage past block last round')];
  }
  if (k.kind === 'round') return [h('span', { class: 'mc-camp-formula mc-round-rule' }, HK.icon('atk'), h('b', {}, `${E.roundGain(k, 1, level)} ×`), h('span', {}, 'Round')),
    h('span', { class: 'mc-mx' }, `Round ${k.minRound}+${k.splash === 'half' ? ' · ½ splash' : ''}`)];
  if (k.kind === 'scale') {
    const cost = E.powerCost(k, k.cost, level), n = E.powerDice(k, cost, level), max = E.powerDice(k, E.scaleMax(k, level), level);
    return [h('span', { class: 'mc-camp-exchange' }, mg(cost), h('span', {}, '→'), h('b', {}, `${n}×`), die(FX(k), k.dice.s)),
      h('span', { class: 'mc-mx' }, `+1 die per ${E.scaleStep(k)} extra magic · up to ${max}`),
      k.goldOn ? h('span', { class: 'mc-bonus' }, die(FX(k), k.dice.s, k.goldOn.face), '=', fxv('gold', k.goldOn.gold)) : null];
  }
  if (k.frogNeed) {
    const pierce = k.frogPierce?.[Math.min(level, k.frogPierce.length - 1)] || 0;
    return [h('span', { class: 'mc-dots fx-weaken', 'aria-label': 'D6 success ranges by charge count' }, h('b', { class: 'mc-frog' }, 'Frog'),
      Array.from({ length: k.max }, (_, i) => { const range = E.frogRange(E.frogNeed(k, i + 1, level)); return h('span', { class: 'mc-dot' }, range === 'sure' ? '✓' : range); })),
      pierce ? h('span', { class: 'mc-ln' }, fxv('pierce', pierce)) : null,
      h('span', { class: 'mc-mx' }, 'D6 · at 1 · 2 · 3 charges'), h('span', { class: 'mc-mx' }, 'A frog skips its attack')];
  }
  if (k.kind === 'charge') return [
    ...rowBody(k, level, { ...p, camp: false, stored: k.max }, level),
    h('span', { class: 'mc-mx mc-charge-rule' }, `At ${Array.from({ length: k.max }, (_, i) => i + 1).join(' · ')} charges`),
  ];
  return rowBody(k, level, { ...p, camp: false }, level);
}
function campCover(k, level) {
  const extend = xs => Array.from({ length: level + 1 }, (_, i) => xs[Math.min(i, xs.length - 1)]);
  return coverHint({ ...k, ...(k.grudge ? { grudge: extend(k.grudge) } : {}), ...(k.costLv ? { costLv: extend(k.costLv) } : {}), ...(k.frogPierce ? { frogPierce: extend(k.frogPierce) } : {}) }, level);
}
// Presentation only: class library lookup and derived rank/cost; no battle context or purchase callbacks.
export function campCard(hero, id, { glyph, onUpgrade = null }) {
  const k = D.CLASSES[hero.cls]?.cards.find(k => k.id === id);
  if (!k) return null;
  const level = E.powerLevel(hero, id);
  return card(k, { cls: hero.cls, owner: hero.name, level, x: E.powerCost(k, k.cost, level), camp: true, rankCount: E.powerLevelsOf(hero) + 1, onRank: onUpgrade, gold: hero.gold }, glyph);
}
export function campChoice(hero, row, { glyph, selected, status, onSelect }) {
  const k = row.card;
  const el = tile({ select: onSelect }, k.id, k.name, glyph(k, 'pw-g'), E.powerCost(k, k.cost, E.powerLevel(hero, k.id)), selected,
    row.equipped ? h('span', { class: 'mc-choice-badge on', 'aria-hidden': 'true' }, '✓') : row.gate ? h('span', { class: 'mc-choice-badge lock', 'aria-hidden': 'true' }, `Lv ${row.gate}`) : null);
  el.classList.add('mc-camp-choice'); if (row.equipped) el.classList.add('equipped'); if (row.gate) el.classList.add('locked');
  el.setAttribute('aria-label', `${k.name}: ${status}. Inspect power.`);
  return el;
}
const frogTrayCounts = new Map();
function frogTray(k, p) {
  const loaded = p.camp ? 0 : E.frogLoaded(k, p.stored || 0), key = `${p.owner || p.cls}:${k.id}`;
  const previous = p.camp ? loaded : (frogTrayCounts.get(key) ?? loaded);
  if (!p.camp) frogTrayCounts.set(key, loaded);
  return h('div', { class: 'fm-tray', 'data-loaded': loaded, 'aria-label': p.camp ? 'Six numbered dice slots' : `${loaded} numbered dice loaded` },
    h('div', { class: 'fm-pairs' }, [0, 2, 4].map(first => h('div', { class: 'fm-pair' }, [first, first + 1].map(i =>
      h('div', { class: `fm-socket ${i < loaded ? 'filled' : ''}`, 'data-face': i + 1, 'aria-label': `${i + 1}${i < loaded ? ', loaded' : ', empty'}` },
        h('span', { class: 'fm-slot-number', 'aria-hidden': 'true' }, String(i + 1)),
        i < loaded ? h('span', { class: `fm-chit ${i >= previous ? 'arriving' : ''}` }, die('magic', 6, i + 1)) : space(6)))))),
    h('div', { class: 'fm-rule' }, p.camp ? [mg(k.cost), h('span', {}, '→'), h('b', {}, '2 dice')] : h('b', {}, loaded ? `Match ${E.frogMatchRange(k, p.stored)}` : 'Load a pair'),
      h('small', {}, 'No attack · can defend')),
    k.frogPierce?.[Math.min(p.level || 0, k.frogPierce.length - 1)] ? h('div', { class: 'fm-rank-bonus' }, fxv('pierce', k.frogPierce[Math.min(p.level || 0, k.frogPierce.length - 1)], 'on the frog')) : null);
}
function card(k, p, glyph) {
  const cur = p.level || 0;
  // camp (Dave, 3 Nov 2026: "use the card dice covers on the card as the upgrade… make that clear"): the next rank's cover is a gold buy button
  const cov = (l, ...kids) => { const price = D.POWER_UPGRADE[l - 1]; const buy = typeof p.onRank === 'function' && l === cur + 1;
    return buy ? h('button', { type: 'button', class: `mc-cov mc-cov-buy${(p.gold ?? 0) < price ? ' poor' : ''}`, 'aria-label': `Upgrade ${k.name} to rank ${LV[l]} for ${price} gold`, onclick: (e) => { e.stopPropagation(); p.onRank(l); } }, ...kids)
      : h('div', { class: 'mc-cov' }, ...kids); };
  const kick = k.kind === 'scale' ? `${E.scaleStep(k)} magic / die · every round` : k.kind === 'charge' ? 'charge · use · once per round' : `${p.x ?? k.cost} magic · once per round`;
  const lv = (l) => h('div', { class: `mc-lv ${l === cur ? 'act' : ''}` }, h('span', { class: 'mc-rn' }, LV[l]), h('span', { class: 'mc-sy' }, l === cur ? rowBody(k, l, p, cur) : l < cur ? h('span', { class: 'mc-ln mc-had' }, h('b', {}, `${usesCardTemplate(k) ? '' : 'Level '}${LV[l]} ✓`), h('span', { class: 'mc-cd' }, (p.camp ? campCover(k, l) : coverHint(k, l)))) : null), // mc1: only the hero's level gets room; the others are one slim line
    l > cur ? cov(l, h('span', { class: 'mc-lvw' }, `${usesCardTemplate(k) ? '' : 'Level '}${LV[l]}`, h('span', { class: 'mc-cd' }, (p.camp ? campCover(k, l) : coverHint(k, l)))), h('span', { class: 'mc-cp' }, h('i', { class: 'mc-coin' }), h('b', {}, String(D.POWER_UPGRADE[l - 1])))) : null);
  return h('div', { class: `mc-card${k.start ? ' mc-t28' : ''}${k.frogLoad ? ' mc-frog-morph' : ''}${p.camp ? ' mc-camp-card' : ''}${cur >= 3 ? ' mc-four-ranks' : ''}${usesCardTemplate(k) ? ' mc-reviewed-template' : ''}${isBardCard(k) ? ' mc-bard' : ''}${isWizardCard(k) ? ' mc-wizard' : ''}${isRangerCard(k) ? ' mc-ranger' : ''}${isDwarfCard(k) ? ' mc-dwarf' : ''}`, 'data-card': k.id, 'data-rank': cur + 1 }, h('i', { class: 'mc-under' }), h('div', { class: 'mc-paint' }, h('img', { src: `assets/cards/magic/${k.art || KNIGHT_ART[k.id] || WIZARD_ART[k.id] || RANGER_ART[k.id] || DWARF_ART[k.id] || BARD_ART[k.id] || `${p.cls || 'ranger'}-${k.id}`}.webp`, alt: '' })),
    h('img', { class: 'mc-fr', src: 'assets/cards/frame-t17.webp', alt: '' }), corners(),
    usesCardTemplate(k) ? h('span', { class: 'mc-art-icon', 'aria-hidden': 'true' }, glyph(k, 'mc-flag')) : h('div', { class: `mc-ptag pt-${TYPE(k).toLowerCase()}` }, TYPE(k)), h('div', { class: 'mc-plaque' }, k.name), usesCardTemplate(k) ? null : h('div', { class: 'mc-kick' }, kick),
    usesCardTemplate(k) ? h('div', { class: 'mc-cast-cost', 'aria-label': `${p.camp ? (k.kind === 'scale' ? 'Starting cost' : 'Magic cost') : 'Selected cost'}: ${p.x ?? k.cost} magic` }, mg(p.x ?? k.cost)) : null, usesCardTemplate(k) ? cardTraits(k) : null, k.frogLoad ? frogTray(k, p) : h('div', { class: 'mc-levels' }, Array.from({ length: p.rankCount ?? Math.max(3, cur + 1) }, (_, l) => lv(l))));
}
// the buttons above the card: −/+ (with the magic each die costs) and Roll; Cast; CHARGE and USE N (Dave, mc6). Colours follow the power.
function buttons(ctx, p) {
  const { b, reset } = ctx; const { k, st, stored } = p; const x = p.x ?? k.cost; const f = FX(k); const level = p.level || 0;
  const why = st.spent ? 'Used this round' : st.early ? `Round ${k.minRound}+` : reset && E.needsDice(k) ? 'Roll your dice first' : ''; // before the roll everything but a free reroll can be used
  const btn = (cls, label, on, dis, aria) => h('button', { type: 'button', class: `mc-use ${cls}`, disabled: !!dis, 'aria-label': aria || null, onclick: on }, ...label);
  if (k.frogLoad) {
    const used = !!b.usedRound?.[`${k.id}:release`], full = stored >= k.max;
    return [btn('add mc-frog-load', [full ? 'Full' : st.spent ? 'Loaded' : 'Load 2', HK.icon('magic'), String(k.cost)], () => ctx.use(k.id), st.spent || st.early || b.magic < k.cost || full, `Load the next two numbered dice for ${k.cost} magic`),
      h('span', { class: 'mc-or fm-then', 'aria-hidden': 'true' }, '→'),
      btn('go pc-magic', [used ? 'Used' : 'Use', die('magic', 6, 6)], () => ctx.use(k.id, { release: true }), !stored || used, `Roll one purple d6; match ${E.frogMatchRange(k, stored)}. Loaded dice are spent.`)];
  }
  if (k.kind === 'scale') { const step = E.scaleStep(k); const cap = Math.min(E.scaleMax(k, level), Math.max(k.cost, b.magic));
    return [btn('sub', ['−', HK.icon('magic'), String(step)], () => ctx.step(k.id, x - step), !!why || x <= k.cost, `One die fewer, ${step} magic back`),
      btn('add', ['+', HK.icon('magic'), String(step)], () => ctx.step(k.id, x + step), !!why || x + step > cap, `One more die for ${step} magic`),
      btn(`go pc-${f}`, ['Roll', HK.icon('magic'), String(x)], () => ctx.use(k.id), why || b.magic < x, `Roll ${E.powerDice(k, x, level)} dice for ${x} magic`)]; }
  if (k.kind === 'charge') { const relUsed = !!(b.usedRound && (b.usedRound[`${k.id}:release`] || (!k.frogLoad && b.usedRound[k.id])));
    return [btn('add mc-charge', ['Charge', HK.icon('magic'), String(k.cost)], () => ctx.use(k.id), why || b.magic < k.cost || stored >= k.max, `Charge: 1 magic (${stored || 0} of ${k.max} charged)`),
      usesBuildTemplate(k) ? h('span', { class: 'mc-or' }, 'OR') : null,
      btn(`go pc-${f}`, [`Use ${stored || 0}`], () => ctx.use(k.id, { release: true }), !stored || relUsed, k.frogNeed ? `Use ${stored || 0} charge${stored === 1 ? '' : 's'} on your target: ${!stored ? 'none stored' : E.frogNeed(k, stored, level) <= 1 ? 'a sure frog' : `a frog on ${E.frogRange(E.frogNeed(k, stored, level))}`}` : `Use ${stored || 0} charge${stored === 1 ? '' : 's'} for ${stored ? E.chargeGain(k, stored, level)[f] : 0} ${WORD[f]}`)]; }
  return [btn(`go pc-${f}`, ['Cast', HK.icon('magic'), String(x)], () => ctx.use(k.id), why || b.magic < x)];
}
function tile(ctx, id, name, ico, cost, on, extra = null, spent = '') {
  const rl = tileRoles(id);
  return h('button', { type: 'button', class: `mc-tile ${on ? 'on' : ''} ${spent ? 'spent' : ''} r-${rl[0]}${rl[1] ? ` r2-${rl[1]} split` : ''}`, 'data-power': id, 'data-r1': rl[0], 'data-r2': rl[1] || rl[0], 'data-state': spent ? 'spent' : 'ready', 'aria-label': spent ? `${name}, ${spent}. Tap to inspect.` : null, title: spent ? `${name}: ${spent}` : null, 'aria-pressed': String(on), onclick: () => ctx.select(id) }, ico, h('span', { class: 'mc-tile-name' }, name),
    cost ? h('span', { class: 'mc-cost' }, HK.icon('magic'), String(cost)) : h('span', { class: 'mc-cost free' }, 'FREE'), extra, spent ? h('span', { class: 'mc-spent-tag', 'aria-hidden': 'true' }, 'USED') : null);
}
const potionTrayCounts = new Map();
function potionTray(ctx, n) {
  const count = E.potionsLeft(ctx.b), hero = ctx.hero || ctx.b.hero, key = hero?.name || '';
  const previous = potionTrayCounts.get(key); potionTrayCounts.set(key,count);
  return h('div', { class: 'mc-potion-tray', 'data-count': count, 'aria-label': `${count} potions carried, ${E.potionMaxOf(hero)} unlocked spaces` }, Array.from({length:5}, (_,i) => h('div', { class: `mc-potion-slot ${i >= E.potionMaxOf(hero) ? 'future' : ''}`, 'aria-label': i < count ? `Potion ${i+1}: restores ${n} health` : i >= E.potionMaxOf(hero) ? 'Future potion space' : 'Empty potion space' }, i < count ? h('div', { class: `mc-potion-chit ${previous != null && i >= previous ? 'arriving' : ''}` }, h('img', {src:'assets/cards/utilities/potion-printed.webp',alt:''}), h('b',{},`+${n}`)) : null)));
}
async function drinkChit(action) {
  const tray = document.querySelector('.mc-potion-tray'), count = Number(tray?.dataset.count);
  const chit = tray?.querySelector('.mc-potion-slot:nth-child('+count+') .mc-potion-chit');
  const rect = chit?.getBoundingClientRect(), ghost = chit?.cloneNode(true);
  if (ghost) ghost.querySelector('b').style.fontSize = getComputedStyle(chit.querySelector('b')).fontSize;
  await action();
  if (!ghost || Number(document.querySelector('.mc-potion-tray')?.dataset.count) >= count) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  ghost.classList.add('mc-potion-depart'); ghost.setAttribute('aria-hidden','true');
  Object.assign(ghost.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});document.body.append(ghost);
  const anim=ghost.animate([{transform:'translateX(0) rotate(0)',opacity:1},{transform:'translateX(130px) translateY(35px) rotate(24deg)',opacity:0}],{duration:450,easing:'ease-in',fill:'forwards'});
  anim.finished.finally(()=>ghost.remove());
}
function lifeCorners() {return h('div',{class:'mc-life-corners','aria-hidden':'true'},[0,1,2,3].map(()=>HK.icon('heal')));}
// Emphasize the actual center Heart die from the same board illustration.
function heartArtwork() {
  return h('div', { class: 'mc-heart-art', role: 'img', 'aria-label': 'Golden three-dimensional heart die raised above the dice grid' },
    h('img', { class: 'mc-heart-map', src: 'assets/tutorial/board-start.webp', alt: '' }),
    h('img', { class: 'mc-heart-die', src: 'assets/tutorial/board-start.webp', alt: '' }));
}
// Arrow presses only preview a destination. The separate Use action confirms one turn.
function heartPresentation(ctx, u) {
  const row = u.panel?.querySelector('.hc-row');
  const source = row ? [...row.querySelectorAll('.hc-btn')] : [];
  const from = Number(ctx.b.board?.C?.v || 0), round = ctx.b.round, hero = (ctx.hero || ctx.b.hero)?.name;
  let pending = 0, committing = false;
  const current = row?.querySelector('.hc-cur .hc-face')?.cloneNode(true) || h('b', {}, String(from || '—'));
  const outcome = (dir) => {
    const original = source.find(button => button.classList.contains(dir < 0 ? 'hc-down' : 'hc-up'));
    const face = original?.querySelector('.hc-face')?.cloneNode(true);
    return h('div', { class: `mc-heart-outcome ${face ? '' : 'unavailable'}`, 'data-direction': dir, 'aria-label': face ? `${dir < 0 ? 'Lower' : 'Higher'} heart face ${from + dir}` : 'No further heart face' }, face || h('span', { class: 'mc-heart-empty', 'aria-hidden': 'true' }, '—'));
  };
  const rings = h('div', { class: 'mc-heart-rings', 'aria-hidden': 'true' });
  const faces = h('div', { class: 'mc-heart-faces mc-heart-vertical', role: 'group', 'aria-label': `Heart die now ${from || 'not rolled'}`, 'aria-live': 'polite', 'data-selection': '0' }, rings, outcome(1), h('div', { class: 'mc-heart-current' }, current), outcome(-1));
  const choose = (dir) => {
    if (committing || !from || from + dir < 1 || from + dir > 6) return;
    pending = dir;
    faces.style.setProperty('--heart-ring-row', dir > 0 ? '0' : '2');
    faces.dataset.selection = String(dir);
    faces.setAttribute('aria-label', `Heart die now ${from}; selected ${from + dir}`);
    update();
  };
  const down = h('button', { type: 'button', class: 'mc-use mc-heart-nudge hc-down', 'aria-label': from > 1 ? `Preview heart ${from - 1}` : 'No lower heart face', onclick: () => choose(-1) }, h('span', { 'aria-hidden': 'true' }, '▼'));
  const up = h('button', { type: 'button', class: 'mc-use mc-heart-nudge hc-up', 'aria-label': from && from < 6 ? `Preview heart ${from + 1}` : 'No higher heart face', onclick: () => choose(1) }, h('span', { 'aria-hidden': 'true' }, '▲'));
  const use = h('button', { type: 'button', class: 'mc-use go mc-heart-use', disabled: true, 'aria-label': 'Select a heart face before using magic', onclick: async () => {
    if (use.disabled || committing) return;
    committing = true; update();
    try { await u.confirm?.(pending, { from, round, hero }); }
    finally { committing = false; if (use.isConnected) update(); }
  } }, 'Use');
  function update() {
    down.disabled = committing || !from || from <= 1;
    up.disabled = committing || !from || from >= 6;
    down.setAttribute('aria-pressed', String(pending === -1));
    up.setAttribute('aria-pressed', String(pending === 1));
    use.disabled = committing || !pending || !!u.why || !u.confirm || ctx.b.round !== round || ctx.b.board?.C?.v !== from || E.nudgedThisRound(ctx.b);
    use.setAttribute('aria-label', pending ? `Use ${u.cost} magic to turn the heart from ${from} to ${from + pending}` : 'Select a heart face before using magic');
  }
  update();
  return { actions: h('div', { class: 'mc-ctl mc-heart-ctl mc-heart-confirm' }, down, h('span', { class: 'mc-or' }, 'OR'), up, use), faces };
}
// An exchange diagram shows the exact controller cost and engine healing amount.
function healExchange(cost, health) {
  const symbols = (name, count, cls) => h('span', { class: cls, 'aria-hidden': 'true' }, Array.from({ length: count }, () => HK.icon(name)));
  return h('div', { class: 'mc-heal-exchange', role: 'img', 'aria-label': `Spend ${cost} magic to restore ${health} health` },
    symbols('magic', cost, 'mc-exchange-input'),
    h('span', { class: 'mc-exchange-arrow', 'aria-hidden': 'true' }, '→'),
    symbols('heal', health, 'mc-exchange-output'));
}
// Utility cards share the frame while retaining the controller's actions and disabled rules.
function utilityCard(ctx, u, glyph) {
  const hero = ctx.hero || ctx.b.hero, heart = u.id === 'u:heart', potion = u.id === 'u:bigheal';
  const n = potion ? E.potionHpOf(hero) : E.healAmountOf(hero);
  const heartView = heart ? heartPresentation(ctx, u) : null;
  const actions = heart ? heartView.actions : h('div', { class: 'mc-ctl' }, u.actions.map(a => h('button', { type: 'button', class: 'mc-use go pc-heal', disabled: !!u.why || a.disabled, 'aria-label': a.aria || a.label, onclick: potion ? () => drinkChit(a.fn) : a.fn }, potion ? 'Drink' : 'Heal', potion ? null : mg(u.cost))));
  // the result line always takes its room (hidden until the first drink), so the bottles never move when one is drunk (Dave, 2 Nov)
  const note = potion ? (u.note ? h('div', { class: 'mc-util-result', role: 'status' }, HK.icon(u.note.icon || 'heal'), h('b', {}, u.note.big), h('small', {}, u.note.text))
    : h('div', { class: 'mc-util-result is-empty', 'aria-hidden': 'true' }, HK.icon('heal'), h('b', {}, `+${n}`), h('small', {}, 'health'))) : null;
  const effect = heart ? h('div', { class: 'mc-heart-effect' }, heartView.faces)
    : potion ? potionTray(ctx,n) : healExchange(u.cost, n);
  return [actions, h('div', { class: 'pw-detail mc-stage' }, h('div', { class: `mc-card mc-reviewed-template mc-utility ${heart ? 'heart' : potion ? 'potion' : 'healing'}`, 'data-card': u.id }, h('i', { class: 'mc-under' }), h('div', { class: 'mc-paint mc-util-art' }, heart ? heartArtwork() : h('img', { class: 'mc-utility-scene', src: `assets/cards/utilities/${potion ? 'potion-belt' : 'heal'}.webp`, alt: potion ? 'Green healing potions carried on an adventurer’s leather belt' : 'Purple healing magic swirling around an adventurer’s breastplate' })), h('img', { class: 'mc-fr', src: 'assets/cards/frame-t17.webp', alt: '' }), potion ? lifeCorners() : corners(), h('span', { class: 'mc-art-icon', 'aria-hidden': 'true' }, glyph(u,'mc-flag')), h('div', { class: 'mc-cast-cost', 'aria-label': u.cost ? `${u.cost} magic` : 'No magic cost' }, u.cost ? mg(u.cost) : h('b', {}, 'FREE')), heart ? h('div', { class: 'mc-traits' }, h('span', { class: 'mc-trait counter' }, 'Heart')) : null, h('div', { class: 'mc-plaque' }, heart ? 'Heart Change' : potion ? 'Health Potion' : u.name), h('div', { class: 'mc-util-panel' }, effect, note)))];
}
// the whole sheet for a card class. glyph and detailPanel come from powers.js (the helpers keep their current panel).
export function sheet(ctx, { glyph, detailPanel, tally }) {
  const order = ['A', 'B', 'C']; const ps = order.map((s) => ctx.powers.find((p) => p.k.slot === s)).filter(Boolean);
  const sel = ctx.selected; const p = ps.find((q) => q.k.id === sel); const u = ctx.utils.find((q) => q.id === sel);
  if (p && usesCardTemplate(p.k) && p.k.kind === 'scale' && !p.st.spent) { const remaining = Math.max(0, ctx.b.magic - (p.x ?? p.k.cost)); const meter = tally?.querySelector('.pw-center'); if (meter) { meter.querySelector('b').textContent = String(remaining); meter.setAttribute('aria-label', `${remaining} magic available after reserving ${p.x ?? p.k.cost} for ${p.k.name}`); meter.title = 'Magic remaining after the selected cost; paid on Roll'; } }
  const utils = ['u:bigheal', 'u:heal', 'u:heart'].map((id) => ctx.utils.find((q) => q.id === id)).filter(Boolean);
  const spentTile = q => q.k.frogLoad ? !!(ctx.b.usedRound?.[q.k.id] && ctx.b.usedRound?.[`${q.k.id}:release`]) : q.st.spent;
  const grid = h('div', { class: 'mc-grid', 'aria-label': 'Your magic' },
    ps.map((q) => tile(ctx, q.k.id, q.k.name, glyph(q.k, 'pw-g'), q.x ?? q.k.cost, q.k.id === sel, null, spentTile(q) ? (q.k.atwill ? 'used this round' : 'used this battle') : '')),
    utils.map((q) => tile(ctx, q.id, q.id === 'u:heart' ? 'Heart Change' : q.name, glyph(q, 'pw-g'), q.cost, q.id === sel, null, q.id === 'u:heart' && E.nudgedThisRound(ctx.b) ? 'used this round' : '')));
  const body = p ? [h('div', { class: 'mc-ctl' }, buttons(ctx, p)), usesBuildTemplate(p.k) && ctx.reset && E.needsDice(p.k) ? h('div', { class: 'mc-guidance', role: 'status' }, ['Roll your dice first.', h('button', { type: 'button', class: 'mc-back', onclick: () => ctx.backToDice?.() }, 'Back to dice')]) : null, h('div', { class: 'pw-detail mc-stage' }, card(p.k, { ...p, cls: ctx.hero?.cls || ctx.b.hero?.cls, owner: ctx.hero?.name || ctx.b.hero?.name, round: ctx.b.round, hurt: ctx.b.lastHurt ?? null }, glyph))]
    : u ? utilityCard(ctx, u, glyph) : [h('div', { class: 'pw-detail pw-pick mc-pick' }, h('b', {}, 'Tap a power'), h('p', {}, ctx.reset ? `Use magic now, then roll. Tap ${ps.map((q) => q.k.name).join(', ').replace(/, ([^,]*)$/, ' or $1')} to see its card.` : `Tap ${ps.map((q) => q.k.name).join(', ').replace(/, ([^,]*)$/, ' or $1')} to see its card.`))];
  return h('div', { class: 'pw-sigil mc-sheet' }, tally, grid, ...body);
}
