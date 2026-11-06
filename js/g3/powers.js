// Magical powers, made special (Dave, Oct 2026): "the magical powers are half of the enjoyment of playing the game".
//   sigil(ctx)        the powers sheet: a glowing purple triangle (the game's symbol of magic) with the three power slots
//                     as medallions at its points (A at the top, B lower left, C lower right), the magic you hold in the
//                     middle, the always-there helpers (potion, heal, heart) beneath, and a detail panel for the one you pick.
//   castReveal(...)   what a power just did, shown in a small window: dice that tumble and land, a stamp of the bonus,
//                     round pips that add up, charges that fill or burst, a super that hits every monster. Then OK.
// Pure DOM; battle3d.js owns the rules calls and passes callbacks in.
import { h } from '../dom.js';
import * as HK from './hudkit.js';
import * as D from '../data.js';
import * as E from '../engine.js';
import { sfx } from '../audio.js';
import * as MC from './magiccard.js'; // mr1: the Ranger's magic as playing cards
// die art for the heart stepper: loaded lazily so node tests (no three.js) can still import this file; battle3d.js already has it loaded
let DICE = null; if (typeof window !== 'undefined') import('../gfx/dice/dice.js').then((m) => { DICE = m; }).catch(() => {});

// ------------------------------------------------------------------------------------------------ glyphs
// One picture per power (24x24, the HUD's duotone classes: f body, s stroke, h highlight, p solid).
const G = {
  cleave: '<path class="f" d="M2.6 17.6 C6.6 9.2 14.2 4.6 21.4 3.4 C16.8 7 11.2 12.4 8.2 20.6 Z"/><path class="h" d="M6 15.4 C9 10.6 13.4 7.4 17.6 5.8"/>',
  bolt: '<path class="f" d="M13.6 1.8 L4.6 13.6 H10.8 L9.4 22.2 L19.4 9.6 H13 Z"/><path class="h" d="M12.6 5.2 L8.4 11.2"/>',
  comet: '<circle class="f" cx="15.6" cy="15.6" r="5.6"/><path class="p" d="M2 2 L12 10.4 L10.4 12 Z M6.8 1.4 L13.4 8.6 L12.4 9.6 Z M1.4 6.8 L8.6 13.4 L9.6 12.4 Z"/><path class="h" d="M13 13.4 A3 3 0 0 1 15.6 12"/>',
  crosshair: '<circle class="s" cx="12" cy="12" r="8" style="stroke-width:2"/><circle class="s" cx="12" cy="12" r="4" style="stroke-width:1.6"/><path class="s" d="M12 1.6 V6.4 M12 17.6 V22.4 M1.6 12 H6.4 M17.6 12 H22.4" style="stroke-width:2"/><circle class="p" cx="12" cy="12" r="1.4"/>',
  rain: '<path class="p" d="M5 2 V14 H2.6 L6 19.6 L9.4 14 H7 V2 Z M11 4 V16 H8.6 L12 21.6 L15.4 16 H13 V4 Z M17 2 V14 H14.6 L18 19.6 L21.4 14 H19 V2 Z"/>',
  volley: '<g class="p"><path d="M3 19.6 L14.6 8 L13 6.4 L18.6 5.4 L17.6 11 L16 9.4 L4.4 21 Z"/><path d="M3 13 L10 6 L8.6 4.6 L13 4 L12.4 8.4 L11 7 L4 14 Z" opacity=".75"/><path d="M9.6 21.4 L16.6 14.4 L15.2 13 L19.6 12.4 L19 16.8 L17.6 15.4 L10.6 22.4 Z" opacity=".75"/></g>',
  cloak: '<path class="f" d="M12 2.4 C7.2 2.4 5 6.6 5 10.8 C5 15 3.6 18.6 2.6 21.6 H21.4 C20.4 18.6 19 15 19 10.8 C19 6.6 16.8 2.4 12 2.4 Z"/><path class="s" d="M8.4 12 C9.6 13.4 14.4 13.4 15.6 12" style="stroke-width:1.6"/><path class="h" d="M8 6.4 C9 4.8 10.4 4.2 12 4.2"/>',
  net: '<path class="s" d="M3 3 L21 21 M21 3 L3 21 M3 12 H21 M12 3 V21" style="stroke-width:1.5;opacity:.75"/><rect class="s" x="3" y="3" width="18" height="18" rx="3" style="stroke-width:2"/><circle class="p" cx="12" cy="12" r="2"/>',
  missile: '<path class="p" d="M16.4 2.6 L18 6 L21.7 6.5 L19 9.1 L19.7 12.8 L16.4 11 L13.1 12.8 L13.8 9.1 L11.1 6.5 L14.8 6 Z"/><path class="s" d="M11.4 12.6 L3 21 M13.6 14.6 L7.6 20.6 M9.4 10.4 L3.4 16.4" style="stroke-width:1.8;opacity:.8"/>',
  hexshield: '<path class="f" d="M12 2 L20.6 7 V17 L12 22 L3.4 17 V7 Z"/><path class="s" d="M12 6.4 L16.8 9.2 V14.8 L12 17.6 L7.2 14.8 V9.2 Z" style="stroke-width:1.5"/><path class="h" d="M6 8.4 L12 4.8"/>',
  spiral: '<path class="s" d="M12 12 m0 0 c1.2 0 1.8 1.4 .8 2.2 c-1.6 1.2 -3.8 -.2 -3.6 -2.2 c.2 -2.6 3.4 -3.8 5.6 -2.6 c3 1.6 2.8 6.2 -.2 7.6 c-3.6 1.8 -8 -.4 -8.4 -4.4 c-.4 -4.6 4 -8 8.4 -7.4 c5 .8 7.6 6 5.8 10.6" style="stroke-width:2.1"/>',
  sun: '<circle class="f" cx="12" cy="12" r="5"/><path class="s" d="M12 1.6 V4.6 M12 19.4 V22.4 M1.6 12 H4.6 M19.4 12 H22.4 M4.6 4.6 L6.8 6.8 M17.2 17.2 L19.4 19.4 M4.6 19.4 L6.8 17.2 M17.2 6.8 L19.4 4.6" style="stroke-width:2"/><path class="h" d="M9.6 10.4 A3 3 0 0 1 12 9"/>',
  mountain: '<path class="f" d="M1.6 20.6 L9 6.4 L13 13.4 L16.2 8.6 L22.4 20.6 Z"/><path class="p" d="M9 6.4 L11.2 10.6 L10 11.4 L9 10 L7.8 11.6 L6.9 10.4 Z" style="fill:#fff;opacity:.85"/>',
  anvil: '<path class="f" d="M2.6 6.4 H17.4 C17.4 9.4 19.4 10.6 21.4 10.6 V12.8 H15.4 L16.4 16.8 H18.6 V20 H5.4 V16.8 H7.6 L8.6 12.8 H6.8 C4.6 12.8 2.6 10 2.6 6.4 Z"/><path class="h" d="M4.6 8 H15"/>',
  fist: '<path class="f" d="M5.6 9.6 C5.6 7.8 7.8 7.4 8.6 8.6 C8.6 6.4 11.4 6 12 8 C12.4 6 15.4 6.2 15.4 8.4 C16.4 7.2 18.6 7.8 18.6 9.8 V14.6 C18.6 18.6 16 21.4 12.2 21.4 C8.4 21.4 5.6 18.8 5.6 15 Z"/><path class="s" d="M8.6 8.6 V12 M12 8 V12 M15.4 8.4 V12" style="stroke-width:1.3"/><path class="p" d="M10 2 L11 5 M14 2 L13 5 M6 3.4 L8 5.6 M18 3.4 L16 5.6" style="stroke:currentColor;stroke-width:1.6"/>',
  flag: '<path class="s" d="M5 2.4 V22" style="stroke-width:2.2"/><path class="f" d="M5.6 3.4 C9 1.6 12 5.6 15.4 4 C17 3.2 18.4 3 20 3.6 V13.2 C18.4 12.6 17 12.8 15.4 13.6 C12 15.2 9 11.2 5.6 13 Z"/><path class="h" d="M8 5.4 C10 5.2 11.6 7 13.6 6.8"/>',
  wind: '<path class="f" d="M12 21 C6 16.4 3.4 13.2 3.4 9.8 C3.4 7 5.6 5 8 5 C9.8 5 11.2 6 12 7.4 C12.8 6 14.2 5 16 5 C18.4 5 20.6 7 20.6 9.8 C20.6 13.2 18 16.4 12 21 Z"/><path class="s" d="M6.6 11 H12.6 C14.2 11 14.2 8.8 12.8 8.8 M8 14 H15 C16.8 14 16.8 16.4 15.2 16.4" style="stroke:#fff;stroke-width:1.5;opacity:.9"/>',
  musicheal: '<path class="s" d="M8 17.6 V5 L17.6 3 V15.6" style="stroke-width:2"/><circle class="f" cx="5.8" cy="17.6" r="2.6"/><circle class="f" cx="15.4" cy="15.6" r="2.6"/><path class="p" d="M18.4 17.4 H20 V19 H21.6 V20.6 H20 V22.2 H18.4 V20.6 H16.8 V19 H18.4 Z"/>',
  clover: '<circle class="f" cx="8.6" cy="8.6" r="3.8"/><circle class="f" cx="15.4" cy="8.6" r="3.8"/><circle class="f" cx="8.6" cy="15.4" r="3.8"/><circle class="f" cx="15.4" cy="15.4" r="3.8"/><path class="s" d="M12 12 C13.6 15.6 15.6 18.4 19 21" style="stroke-width:1.8"/>',
  discord: '<path class="s" d="M8 17.6 V5 L17.6 3 V15.6" style="stroke-width:2"/><circle class="f" cx="5.8" cy="17.6" r="2.6"/><circle class="f" cx="15.4" cy="15.6" r="2.6"/><path class="s" d="M3 3 L21 21" style="stroke-width:2.2"/>',
  rising: '<path class="s" d="M6 18 V7 L14 5.4 V15.4" style="stroke-width:2"/><circle class="f" cx="4" cy="18" r="2.2"/><circle class="f" cx="12" cy="15.4" r="2.2"/><path class="p" d="M18.6 2 L22.4 7.4 H20 V14 H17.2 V7.4 H14.8 Z"/>',
  goldnote: '<circle class="p" cx="15" cy="15" r="6.4"/><path class="h" d="M11.6 12.6 A4 4 0 0 1 14.6 10.6"/><path class="s" d="M5 15 V3.4 L11 2.4" style="stroke-width:2"/><circle class="f" cx="3.6" cy="15.4" r="2.2"/>',
  potion: '<path class="f" d="M9.4 2.6 H14.6 V4.4 H13.8 V8.6 C17.2 9.6 19.6 12.6 19.6 16 C19.6 19.6 16.2 22 12 22 C7.8 22 4.4 19.6 4.4 16 C4.4 12.6 6.8 9.6 10.2 8.6 V4.4 H9.4 Z"/><path class="p" d="M6.2 15.4 C8 14.4 10 16.4 12 15.4 C14 14.4 16 16.4 17.8 15.4 C17.8 18.6 15.4 20.4 12 20.4 C8.6 20.4 6.2 18.6 6.2 15.4 Z" opacity=".85"/><path class="h" d="M7.8 13 C8.4 11.8 9.4 11 10.6 10.6"/>',
  healheart: '<path class="f" d="M12 21.2 C5 15.6 2.4 12.2 2.4 8.6 C2.4 5.6 4.7 3.6 7.4 3.6 C9.4 3.6 11.2 4.7 12 6.3 C12.8 4.7 14.6 3.6 16.6 3.6 C19.3 3.6 21.6 5.6 21.6 8.6 C21.6 12.2 19 15.6 12 21.2 Z"/><path class="p" d="M10.7 7.6 H13.3 V10.4 H16.1 V13 H13.3 V15.8 H10.7 V13 H7.9 V10.4 H10.7 Z" style="fill:#fff"/>',
  heartturn: '<path class="f" d="M12 18.6 C7 14.8 5 12.4 5 9.8 C5 7.7 6.6 6.3 8.5 6.3 C10 6.3 11.3 7.1 12 8.3 C12.7 7.1 14 6.3 15.5 6.3 C17.4 6.3 19 7.7 19 9.8 C19 12.4 17 14.8 12 18.6 Z"/><path class="p" d="M12 .6 L15.4 4.4 H8.6 Z M12 23.4 L8.6 19.8 H15.4 Z"/><path class="h" d="M7.6 9.6 C7.6 8.7 8.2 8.1 9 8.1"/>',
  frog: '<path class="f" d="M4 9 C1 11 2 19 8 20 H16 C22 19 23 11 20 9 L17 6 H7 Z"/><circle class="f" cx="7" cy="6" r="4"/><circle class="f" cx="17" cy="6" r="4"/><circle cx="7" cy="6" r="1.5" fill="#241430"/><circle cx="17" cy="6" r="1.5" fill="#241430"/><path d="M6.5 13 Q12 18 17.5 13" fill="none" stroke="#241430" stroke-width="1.6" stroke-linecap="round"/>',
  burst: '<path class="f" d="M12 1 L14.4 8 L21.8 6.6 L16.6 12 L21.8 17.4 L14.4 16 L12 23 L9.6 16 L2.2 17.4 L7.4 12 L2.2 6.6 L9.6 8 Z"/><circle class="p" cx="12" cy="12" r="3" style="fill:#fff"/>',
};
// Which picture each power wears (the rest fall back to the icon of what they give).
const POWER_GLYPH = {
  cleave: 'cleave', judgment: 'burst', shieldwall: 'hexshield', press: 'cleave', rally: 'flag', secondwind: 'wind',
  aimed: 'crosshair', mark: 'hk:pierce', rain: 'rain', quickdraw: 'hk:reroll', snare: 'net', volley: 'volley', vanish: 'cloak',
  arcbolt: 'bolt', polymorph: 'frog', meteor: 'comet', bolt: 'missile', barrier: 'hexshield', coil: 'spiral', light: 'sun',
  anvil: 'anvil', grudge: 'fist', avalanche: 'mountain', bulwark: 'hk:block', brace: 'hexshield', stonehide: 'mountain', forgefury: 'anvil',
  mending: 'musicheal', finale: 'burst', luckyverse: 'clover', discord: 'discord', ballad: 'rising', goldhymn: 'goldnote',
  'u:bigheal': 'potion', 'u:heal': 'healheart', 'u:heart': 'heartturn', // the helpers under the triangle
};
const FX_ICON = { atk: 'atk', block: 'block', pierce: 'pierce', heal: 'heal', magic: 'magic', gold: 'gold', weaken: 'weaken', free: 'reroll', splash: 'splash', whirl: 'splash', aoe: 'atk', frog: 'weaken' };
const SVGNS = 'http://www.w3.org/2000/svg';
export function glyph(k, cls = '') {
  const name = POWER_GLYPH[k.id] || `hk:${FX_ICON[mainFx(k)] || 'magic'}`;
  if (name.startsWith('hk:')) return HK.icon(name.slice(3), cls);
  const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', `ic pw-glyph ${cls}`.trim()); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = G[name]; return s;
}
// the effect a power is mostly about (its colour)
// Polymorph (a Charge card, 2 Nov 2026): the d6 range for 1, 2, 3 charges at a level, e.g. "4–6, 2–6, sure"
export const frogRanges = (k, level = 0) => [1, 2, 3].slice(0, k.max).map((n) => k.frogLoad ? E.frogMatchRange(k, n) : E.frogRange(E.frogNeed(k, n, level)));
const frogWords = (k, level = 0) => `a frog on ${frogRanges(k, level).join(', ')} (1, 2, ${k.max} charges)`;
export function mainFx(k) {
  if (k.dice) return k.dice.to;
  if (k.roll) return k.roll[0].to; // a mixed card (T31): its first dice
  if (k.frogNeed) return 'frog';
  const per = k.kind === 'charge' ? (typeof k.per === 'number' ? { atk: k.per } : k.per) : k.fx;
  return Object.keys(per || {})[0] || 'magic';
}
const TONE = { frog: 'weaken', atk: 'atk', pierce: 'pierce', block: 'block', heal: 'heal', magic: 'magic', gold: 'gold', weaken: 'weaken', free: 'gold', splash: 'splash', whirl: 'splash', aoe: 'atk' };
export const toneOf = (k) => TONE[mainFx(k)] || 'magic';
const NAME = { atk: 'attack', pierce: 'pierce', block: 'block', heal: 'heal', magic: 'magic', gold: 'gold', weaken: 'softer hits', free: 'free reroll dice', splash: 'splash', whirl: 'to every monster', aoe: 'to every monster' };
const fxWords = (fx) => Object.entries(fx).map(([f, v]) => (f === 'heal' ? `heal ${v}` : f === 'weaken' ? `monsters hit ${v} softer` : f === 'free' ? `a free reroll of ${v} dice` : `+${v} ${NAME[f] || f}`)).join(', ');
const perOf = (k) => (typeof k.per === 'number' ? { atk: k.per } : k.per || {});
const chip = (f, v, extra = '') => h('span', { class: `pw-chip t-${TONE[f] || 'magic'} ${extra}` }, HK.icon(FX_ICON[f] || 'magic'), h('b', {}, f === 'free' ? `${v}` : `+${v}`), ' ', NAME[f] || f);

// the numbers of a power at a level: every number steps up by the same rule as the engine (scaleNum); a free reroll gains one die a level
const lvlFx = (fx, level) => Object.fromEntries(Object.entries(fx || {}).map(([f, v]) => [f, f === 'free' ? v + level : E.scaleNum(v, level)]));
const scaleTop = (k, level) => E.powerDice(k, E.scaleMax(k, level), level);

// Power words are kept short (Dave, Oct 2026: "this is way too many words... less words please"). The numbers come from the engine.
const totWords = (k, level) => Object.entries(E.chargeGain(k, k.max, level)).map(([f, v]) => (f === 'heal' ? `heal ${v}` : `${v} ${NAME[f] || f}`)).join(', ');
const splashWord = (k) => (k.splash === 'half' ? ' Half splashes.' : '');
// What this power does, at its level (the camp page and the battle sheet).
// mp4 (Dave: "AAA for the magic"): keywords in a description light up in their colour: dice (2d6), +N, N magic, pierce/attack/block/heal/gold.
const KW = /(\d+d\d+|[+\u2212-]?\d+\s+magic|\bmagic\b|[+]\d+|\bpierce\b|\battack\b|\bblock(?:ing)?\b|\bheal(?:th|s)?\b|\bgold\b|\bonce a (?:battle|round)\b)/gi;
const kwTone = (w) => (/d\d/.test(w) ? 'dice' : /magic/i.test(w) ? 'magic' : /pierce/i.test(w) ? 'pierce' : /attack/i.test(w) ? 'atk' : /block/i.test(w) ? 'block' : /heal/i.test(w) ? 'heal' : /gold/i.test(w) ? 'gold' : /once/i.test(w) ? 'once' : 'num');
export function marked(text) { if (typeof text !== 'string') return text; return text.split(KW).map((part, i) => (i % 2 ? h('b', { class: `kw kw-${kwTone(part)}` }, part) : part)).filter((x) => x !== ''); }
// a mixed card's dice in a few words (T31 side games): "1 red d6 attack + 1 gold d6 (5–6: +5 gold)"
const COLOUR_WORD = { atk: 'red', pierce: 'orange', splash: 'pink', whirl: 'pink', block: 'blue', heal: 'green', gold: 'gold', magic: 'purple' };
const tableWords = (g, level) => g.table.map(([top], i) => { const lo = i ? g.table[i - 1][0] + 1 : 1; const pay = E.mixPay(g, top, level); return `${lo === top ? lo : `${lo}–${top}`}: ${pay ? `+${pay} ${NAME[g.to] || g.to}` : 'nothing'}`; }).join(', ');
const mixWords = (k, level, short = false) => E.mixGroups(k, level).map((g) => (g.table ? (short ? `a ${COLOUR_WORD[g.to]} d${g.s}` : `a ${COLOUR_WORD[g.to]} d${g.s} (${tableWords(g, level)})`) : `${g.n} ${COLOUR_WORD[g.to]} d${g.s} ${g.to === 'heal' ? 'heal' : NAME[g.to] || g.to}`)).join(' + ');
export function effectLine(k, { x, round, level = 0, stored = null } = {}) {
  if (k.kind === 'mix') return `${k.cost} magic: ${mixWords(k, level)}.${k.party ? ' The healing reaches every hero.' : ''}`;
  if (k.kind === 'dice') return `Roll ${k.dice.n + level}d${k.dice.s} ${NAME[k.dice.to]}.${splashWord(k)}`;
  if (k.kind === 'scale') { const st = E.scaleStep(k); return `${x ?? k.cost} magic: ${E.powerDice(k, x, level)}d${k.dice.s} ${NAME[k.dice.to]}. +1 die per ${st > 1 ? `${st} more magic` : 'extra magic'}, max ${scaleTop(k, level)}d${k.dice.s}.`; }
  if (k.kind === 'round') { const r = round || Math.max(4, k.minRound || 0); return `Attack grows each round. Round ${r}: +${E.roundGain(k, r, level)}.${splashWord(k)}`; }
  if (k.frogLoad) { const bonus = k.frogPierce?.[Math.min(level, k.frogPierce.length - 1)] || 0; return `Load ${k.frogLoad} numbered dice for ${k.cost} magic, once a round. Use after loading or save them: roll a purple d6 and match a loaded number. ${stored == null ? '' : `${E.frogLoaded(k, stored)} loaded. `}A frog cannot attack this round, but can defend. Using empties the card.${bonus ? ` A match also gives +${bonus} pierce.` : ''}`; }
  if (k.frogNeed) { const fp = k.frogPierce?.[level] || 0; const nd = stored ? E.frogNeed(k, stored, level) : 7; const now = stored ? ` Use now: ${nd <= 1 ? 'a sure frog' : `a frog on ${E.frogRange(nd)}`}.` : ''; return `${stored == null ? '' : `${stored} of ${k.max} charged.${now} `}Charge 1 a round, or use them all on your target and roll a d6: ${frogWords(k, level)}. A frog cannot attack this round; a miss spends the charges.${fp ? ` The frog takes +${fp} pierce.` : ''}`; }
  if (k.kind === 'charge') { const v = Object.entries(E.chargeValues(k, k.max, level)); return `${stored == null ? '' : `${stored} of ${k.max} charged. `}Charge 1 a round, or use them all: ${v.map(([f, xs]) => `${xs.join(', ')} ${f === 'heal' ? 'heal' : NAME[f] || f}`).join(' and ')}. Total ${v.length > 1 ? totWords(k, level) : Object.values(E.chargeGain(k, k.max, level))[0]}.${splashWord(k)}`; }
  if (k.kind === 'super') return `${fxWords(lvlFx(k.fx, level))}, and ${E.scaleNum(k.aoe, level)} to every monster.`;
  if (k.kind === 'luck') return `Roll a d6. 1–2: +${1 + level} magic. 3–4: +${E.scaleNum(E.LUCK.mid, level)} attack. 5–6: +${E.scaleNum(E.LUCK.top, level)} attack, +1 magic.`;
  if (k.grudge) return `Attack equal to the damage that got past your block last round${k.grudge[level] ? `, +${k.grudge[level]}` : ''}.`;
  const t = fxWords(lvlFx(k.fx, level)); return `${t[0].toUpperCase()}${t.slice(1)}.`;
}
// Just the result at a level, for the compare box and the level list: "Total 28 attack", "3d6 attack", "+5 block".
// What a cast leaves you with, beside the Cast button: "Rolls 2d6 · 2 magic left" (the dice only for a power that rolls dice).
export function castPreview(k, { x, level = 0, magic = 0 } = {}) {
  const cost = x ?? k.cost; const left = `${Math.max(0, magic - cost)} magic left`;
  const rolls = k.kind === 'mix' ? (() => { const n = E.mixGroups(k, level).reduce((t, g) => t + g.n, 0); return `Rolls ${n} ${n === 1 ? 'die' : 'dice'}`; })() : k.kind === 'scale' ? `Rolls ${E.powerDice(k, cost, level)}d${k.dice.s}` : k.kind === 'dice' ? `Rolls ${k.dice.n + level}d${k.dice.s}` : k.frogLoad ? 'Loads 2 dice' : k.kind === 'charge' ? 'Charges 1' : '';
  return rolls ? `${rolls} · ${left}` : left;
}
export function shortLine(k, level = 0) {
  if (k.kind === 'mix') return mixWords(k, level, true);
  if (k.kind === 'dice') return `${k.dice.n + level}d${k.dice.s} ${NAME[k.dice.to]}`;
  if (k.kind === 'scale') return `${E.powerDice(k, k.cost, level)}d${k.dice.s}, max ${scaleTop(k, level)}d${k.dice.s}`;
  if (k.kind === 'round') { const r = Math.max(4, k.minRound || 0); return `Round ${r}: +${E.roundGain(k, r, level)} attack`; }
  if (k.frogNeed) return `Match ${frogRanges(k, level).join(' / ')}`;
  if (k.kind === 'charge') return `Total ${totWords(k, level)}`;
  if (k.kind === 'super') return `${fxWords(lvlFx(k.fx, level))}, ${E.scaleNum(k.aoe, level)} to all`;
  if (k.kind === 'luck') return `+${1 + level} magic / +${E.scaleNum(E.LUCK.mid, level)} / +${E.scaleNum(E.LUCK.top, level)} attack`;
  if (k.grudge) return `Attack = damage taken${k.grudge[level] ? ` +${k.grudge[level]}` : ''}`;
  return fxWords(lvlFx(k.fx, level));
}
// What one upgrade adds, in a few words: "+1 each charge (+4 total)", "+1 die", "+1 block".
export function upgradeLine(k, level = 0) {
  const nx = level + 1;
  if (k.frogNeed) { const fp = (k.frogPierce?.[Math.min(nx, k.frogPierce.length - 1)] || 0) - (k.frogPierce?.[Math.min(level, k.frogPierce.length - 1)] || 0); const a = frogRanges(k, level).join(', '); const b2 = frogRanges(k, nx).join(', ');
    return [fp ? `+${fp} pierce on the frog` : '', a !== b2 ? `frog on ${b2}` : ''].filter(Boolean).join(', ') || 'no change'; }
  if (k.kind === 'charge') {
    const a = E.chargeValues(k, k.max, level); const b2 = E.chargeValues(k, k.max, nx); const t0 = E.chargeGain(k, k.max, level); const t1 = E.chargeGain(k, k.max, nx);
    const fs = Object.keys(a); const words = fs.map((f) => (f === 'heal' ? 'heal' : NAME[f] || f)); const ds = fs.map((f) => b2[f].map((x, i) => x - a[f][i]));
    if (ds.every((d) => d.every((x) => x === ds[0][0]))) return `+${ds[0][0]} ${words.join(' and ')} each charge (+${t1[fs[0]] - t0[fs[0]]} ${fs.length > 1 ? 'each' : 'total'})`;
    return fs.map((f, i) => `+${t1[f] - t0[f]} ${words[i]} total`).join(', ');
  }
  if (k.kind === 'dice') return `+1 die (${k.dice.n + nx}d${k.dice.s})`;
  if (k.kind === 'scale') return `+1 die for the same magic`;
  if (k.kind === 'mix') { const g = k.roll[0]; if (g.table) { const pays = g.table.map(([top]) => E.mixPay(g, top, nx)).filter(Boolean); return `${pays.map((p) => `+${p}`).join(' / ')} ${NAME[g.to] || g.to} a win`; } return `+1 ${COLOUR_WORD[g.to]} d${g.s}`; }
  if (k.kind === 'round') { const r = Math.max(4, k.minRound || 0); return `+${E.roundGain(k, r, nx) - E.roundGain(k, r, level)} attack in round ${r}, more later`; }
  if (k.kind === 'luck') return `+1 magic, +${E.scaleNum(E.LUCK.mid, nx) - E.scaleNum(E.LUCK.mid, level)} / +${E.scaleNum(E.LUCK.top, nx) - E.scaleNum(E.LUCK.top, level)} attack`;
  if (k.grudge) return `+${(k.grudge[nx] ?? k.grudge.at(-1)) - (k.grudge[level] ?? k.grudge.at(-1))} attack on top`;
  const ch = Object.entries(k.fx).map(([f, v]) => { const o = f === 'free' ? v + level : E.scaleNum(v, level); const n = f === 'free' ? v + nx : E.scaleNum(v, nx);
    return f === 'free' ? `+${n - o} reroll die` : f === 'weaken' ? `hit ${n - o} softer` : `+${n - o} ${NAME[f] || f}`; });
  if (k.kind === 'super') ch.push(`+${E.scaleNum(k.aoe, nx) - E.scaleNum(k.aoe, level)} to all`);
  return ch.join(', ');
}

// mp6 (Dave: "Just say what you are buying. Use the arrow pierce symbols even."): the detail reads as a purchase, mostly icons:
// [magic N]  ->  [pierce icon x2 dice]. Numbers come from the engine, the same ones the rules use; only the words are gone.
const BUY_WORD = { atk: 'attack', pierce: 'pierce', block: 'block', heal: 'heal', magic: 'magic', gold: 'gold', weaken: 'softer hits', free: 'free rerolls', aoe: 'to all' };
const buyItem = (f, n, { dice = false, word = null } = {}) => h('span', { class: `pb-get t-${TONE[f] || 'magic'}` }, HK.icon(FX_ICON[f] || 'magic'),
  h('b', {}, dice ? `×${n}` : f === 'free' ? `×${n}` : `+${n}`), h('small', {}, word ?? (dice ? `${BUY_WORD[f] || f} ${n === 1 ? 'die' : 'dice'}` : BUY_WORD[f] || f)));
function buyRow(cost, items, extra = null) {
  return h('div', { class: 'pd-buy', 'aria-label': `${cost ? `${cost} magic` : 'Free'} buys ${items.map((i) => i.textContent).join(', ')}` },
    h('span', { class: `pb-pay ${cost ? '' : 'free'}` }, cost ? [HK.icon('magic'), h('b', {}, String(cost))] : h('b', {}, 'FREE')),
    h('span', { class: 'pb-arrow', 'aria-hidden': 'true' }, '→'), h('span', { class: 'pb-gets' }, items), extra);
}
export function buyItems(k, { x, round, level = 0, stored = null } = {}) {
  if (k.kind === 'dice') return [buyItem(k.dice.to, k.dice.n + level, { dice: true })];
  if (k.kind === 'scale') return [buyItem(k.dice.to, E.powerDice(k, x ?? k.cost, level), { dice: true })];
  if (k.kind === 'round') { const r = round || Math.max(4, k.minRound || 0); return [buyItem('atk', E.roundGain(k, r, level))]; }
  if (k.frogNeed) return [];
  if (k.kind === 'charge') return Object.entries(E.chargeGain(k, k.max, level)).map(([f, v]) => buyItem(f, v, { word: `${BUY_WORD[f] || f} at ${k.max}` }));
  if (k.kind === 'super') return [...Object.entries(lvlFx(k.fx, level)).map(([f, v]) => buyItem(f, v)), buyItem('aoe', E.scaleNum(k.aoe, level))];
  if (k.kind === 'luck') return [buyItem('magic', 1 + level, { word: '1–2' }), buyItem('atk', E.scaleNum(E.LUCK.mid, level), { word: '3–4' }), buyItem('atk', E.scaleNum(E.LUCK.top, level), { word: '5–6' })];
  return Object.entries(lvlFx(k.fx, level)).map(([f, v]) => buyItem(f, v));
}
// ------------------------------------------------------------------------------------------------ the sigil (powers sheet)
// ctx: { b, hero, reset, powers: [{ k, st, stored, x, level, afford }], utils: [{ id, name, icon, cost, why, flag, text, body, actions }],
//        selected, select(id), use(id, opts), recharge(id), step(id, x), rechargeCost, round }
export function sigil(ctx) {
  const { b, powers, utils, reset } = ctx;
  const bySlot = Object.fromEntries(powers.map((p) => [p.k.slot, p]));
  // nothing is chosen when the sheet opens (Dave): the panel under it asks you to tap one
  const sel = ctx.selected && (powers.find((p) => p.k.id === ctx.selected) || utils.find((u) => u.id === ctx.selected)) ? ctx.selected : null;
  const medal = (slot) => {
    const p = bySlot[slot]; if (!p) return h('div', { class: `pw-medal at-${slot} empty` });
    const { k, st, stored } = p; const on = sel === k.id; const ready = isReady(p, reset);
    const state = st.early ? 'locked' : st.spent ? (reset && canRecharge(k) ? 'recharge' : 'used') : ready ? 'ready' : 'low';
    const pips = k.kind === 'charge' ? h('span', { class: 'pw-pips', 'aria-hidden': 'true' }, Array.from({ length: k.max }, (_, i) => h('i', { class: i < stored ? 'on' : '' }))) : null;
    const need = !st.early && !st.spent && (p.x ?? k.cost) > b.magic ? (p.x ?? k.cost) - b.magic : 0; // cannot pay yet: greyed, and how much short
    const tag = st.early ? `ROUND ${k.minRound}+` : st.spent ? (reset && canRecharge(k) ? 'RECHARGE' : k.atwill ? 'USED' : 'SPENT') : need ? `NEED ${need}` : k.kind === 'super' ? 'SUPER' : null;
    return h('button', { type: 'button', class: `pw-medal at-${slot} t-${toneOf(k)} st-${state} ${on ? 'on' : ''}`, 'data-power': k.id, 'aria-pressed': String(on), 'aria-label': `${slot}: ${k.name}. ${k.text}${need ? ` Need ${need} more magic.` : ''}`, onclick: () => ctx.select(k.id) },
      h('span', { class: 'pw-ring' }, h('span', { class: 'pw-core' }, glyph(k, 'pw-g')), h('b', { class: 'pw-slot' }, slot),
        h('span', { class: 'pw-cost' }, HK.icon('magic'), h('b', {}, String(p.x ?? k.cost)))),
      h('span', { class: 'pw-name' }, k.name, pips), tag ? h('span', { class: `pw-tag ${need ? 'low' : state}` }, st.early ? HK.icon('lock') : null, tag) : null);
  };
  const tri = document.createElementNS(SVGNS, 'svg'); tri.setAttribute('viewBox', '0 0 360 280'); tri.setAttribute('class', 'pw-tri'); tri.setAttribute('aria-hidden', 'true');
  // Three class powers form the triangle; shared helpers occupy their own row below.
  tri.setAttribute('viewBox', '0 0 360 280');
  // Side length 208, altitude 104*sqrt(3): a true equilateral triangle.
  tri.innerHTML = `<defs>
    <linearGradient id="pwG" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#f1d4ff"/><stop offset=".4" stop-color="#b56bfa"/><stop offset="1" stop-color="#7440cf"/></linearGradient>
    <linearGradient id="pwGlass" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#bc85ff" stop-opacity=".22"/><stop offset=".6" stop-color="#7432b5" stop-opacity=".07"/><stop offset="1" stop-color="#b881f7" stop-opacity=".23"/></linearGradient>
  </defs>
    <path class="pw-aura" d="M180 39.867 L284 220 H76 Z"/>
    <path class="pw-metal" d="M180 39.867 L284 220 H76 Z"/>
    <path class="pw-fill" d="M180 39.867 L284 220 H76 Z" fill="url(#pwGlass)"/>
    <path class="pw-edge e-L" d="M180 39.867 L76 220"/><path class="pw-edge e-B" d="M76 220 H284"/><path class="pw-edge e-R" d="M284 220 L180 39.867"/>
    <path class="pw-glint" d="M180 52 L86 215 M91 224 H264"/>`;

  const selSlot = powers.find((p) => p.k.id === sel)?.k.slot || '';
  // Available magic and health remain readable above the choices.
  const tally = h('div', { class: 'pw-tally' },
    h('div', { class: 'pw-center', 'aria-label': `${b.magic} of ${E.magicCapOf(b.hero)} magic` }, HK.icon('magic'), h('b', {}, String(b.magic)), h('small', {}, `/ ${E.magicCapOf(b.hero)} magic`)),
    h('div', { class: 'pw-life', 'aria-label': `Health ${b.hp} of ${b.maxHp}` }, HK.icon('heal'), h('b', {}, String(b.hp)), h('small', {}, `/ ${b.maxHp}`)));
  // Helpers sit in a separate row under the class powers, each with its cost.
  // Tapping one when it cannot help (full health, no potions) says so in a short pop-up instead of opening its panel.
  const costBadge = (u) => (u.cost ? h('span', { class: 'pw-cost' }, HK.icon('magic'), h('b', {}, String(u.cost))) : h('span', { class: 'pw-cost free' }, h('b', {}, u.badge || 'FREE')));
  const soft = (u) => /full health|no potions/i.test(u.why || '');
  const pop = (text) => { const host = document.querySelector('.pw-sigil'); if (!host) return; host.querySelector('.pw-pop')?.remove(); const el = h('div', { class: 'pw-pop', role: 'status' }, text); host.append(el); setTimeout(() => el.remove(), 2100); };
  const needOf = (u) => (u.cost && u.cost > b.magic ? u.cost - b.magic : 0);
  const utilTiles = utils.map((u, i) => h('button', { type: 'button',
    class: `pw-medal pw-umedal at-U${i} t-${u.tone} st-${(u.why && !soft(u)) || needOf(u) ? 'low' : 'ready'} ${sel === u.id ? 'on' : ''}`, 'data-power': u.id, 'aria-pressed': String(sel === u.id), 'aria-label': `${u.name}. ${u.text}${needOf(u) ? ` Need ${needOf(u)} more magic.` : ''}`,
    onclick: () => { if (soft(u)) sfx.error?.(); ctx.select(u.id); } }, // a helper that cannot help now still opens its panel, which says why in words and rests its button
    h('span', { class: 'pw-ring' }, h('span', { class: 'pw-core' }, glyph(u, 'pw-g'))), costBadge(u),
    h('span', { class: 'pw-name' }, u.name), needOf(u) ? h('span', { class: 'pw-tag low' }, `NEED ${needOf(u)}`) : null));
  if (MC.CARD_CLASSES.has(ctx.hero?.cls || b.hero?.cls)) return MC.sheet(ctx, { glyph, detailPanel, tally }); // mr1 (Dave t435): Ranger cards; other heroes keep the rows
  const detail = null;
  return h('div', { class: `pw-sigil sel-${selSlot} ${reset ? 'is-reset' : ''}` },
    tally, powerRows(ctx, sel)); // mp8: no tabs, the six rows (detail/medal/utilRow kept for reference, unused)
  void detail; void utilTiles; void medal; void tri;
}
const canRecharge = (k) => !k.atwill && k.kind !== 'super';
function isReady(p, reset) { const { k, st } = p; return !st.spent && !st.early && p.afford && !(reset && E.needsDice(k)); } // before the roll every power may be used but a free reroll (no dice to act on yet)
// mp7 (Dave picked mockup A: "3 rows is perfect"): A, B and C at once, one row each: name + small tag, ▲cost (with −/+ for a scale power),
// what you get in icons, and the row's own Cast button. The same ctx.use / ctx.step / ctx.recharge the old detail used; no rule changes.
function powerRow(ctx, p, sel) {
  const { b, reset } = ctx; const { k, st, stored } = p; const x = p.x ?? k.cost; const level = p.level || 0;
  const when = k.atwill ? 'Every round' : k.kind === 'super' ? 'Super' : 'Once a battle';
  const rech = reset && st.spent && canRecharge(k); // between rounds a spent once-a-battle power can be recharged; everything else may be used now
  const why = rech ? (b.magic < ctx.rechargeCost ? `Need ${ctx.rechargeCost}` : '')
    : reset && E.needsDice(k) ? 'Roll first' : st.spent ? (k.atwill ? 'Used' : 'Spent') : st.early ? `Round ${k.minRound}+` : b.magic < x ? `Need ${x - b.magic}` : '';
  const tag = why && why !== 'Roll first' ? why : k.kind === 'charge' && stored != null ? `${when} · ${stored}/${k.max}` : when;
  const icons = (() => {
    if (k.kind === 'scale') { const n = E.powerDice(k, x, level); const f = k.dice.to; // mq6 (Dave): one small d6 per magic, then where the total goes
      return [h('span', { class: 'pr-dice', 'aria-label': `${n}d6` }, Array.from({ length: Math.min(n, 6) }, () => d6())), h('span', { class: 'pr-to', 'aria-hidden': 'true' }, '→'), HK.icon(FX_ICON[f] || 'magic')]; }
    if (k.kind === 'dice' || k.kind === 'scale') { const n = k.kind === 'dice' ? k.dice.n + level : E.powerDice(k, x, level); const f = k.dice.to;
      return n <= 4 ? Array.from({ length: n }, () => HK.icon(FX_ICON[f] || 'magic')) : [HK.icon(FX_ICON[f] || 'magic'), h('b', {}, `×${n}`)]; }
    if (k.frogNeed) { const have = stored || 0; const rs = frogRanges(k, level); // Polymorph: one dot per charge, each holding the d6 range a Use at that many charges needs
      return [h('span', { class: 'pr-dots t-weaken', 'aria-label': `${have} of ${k.max} charged, use now: frog ${have ? rs[have - 1] : 'not ready'}` },
        Array.from({ length: k.max }, (_, i) => h('span', { class: `pr-dot ${i < have ? 'on' : ''} ${i === have - 1 ? 'now' : ''}` }, rs[i] === 'sure' ? '✓' : rs[i]))), HK.icon('weaken')]; }
    if (k.kind === 'charge' && k.per) { // mq7 (Dave): one dot per charge, each holding what a release at that many charges gives (engine chargeGain); filled = stored
      const f = Object.keys(typeof k.per === 'number' ? { atk: 1 } : k.per)[0]; const have = stored || 0;
      return [h('span', { class: `pr-dots t-${f}`, 'aria-label': `${have} of ${k.max} charged, use now for ${have ? E.chargeGain(k, have, level)[f] : 0} ${NAME[f] || f}` },
        Array.from({ length: k.max }, (_, i) => h('span', { class: `pr-dot ${i < have ? 'on' : ''} ${i === have - 1 ? 'now' : ''}` }, String(E.chargeGain(k, i + 1, level)[f])))), HK.icon(FX_ICON[f] || 'magic')]; }
    if (k.kind === 'flat' && k.fx && k.fx.free) return [h('span', { class: 'pr-words' }, `${k.fx.free} Free Rerolls`)]; // mq7 (Dave): just say it
    return buyItems(k, { x, round: b.round, level, stored }).map((it) => [...it.childNodes].slice(0, 2)).flat();
  })();
  const scale = k.kind === 'scale' && !st.spent;
  const pay = h('span', { class: 'pr-pay' },
    scale ? h('button', { type: 'button', class: 'pr-step', 'aria-label': 'Less magic, one die fewer', disabled: x <= k.cost, onclick: () => ctx.step(k.id, x - E.scaleStep(k)) }, '−') : null,
    scale ? h('button', { type: 'button', class: 'pr-step', 'aria-label': 'More magic, one more die', disabled: x + E.scaleStep(k) > Math.min(E.scaleMax(k, level), Math.max(k.cost, b.magic)), onclick: () => ctx.step(k.id, x + E.scaleStep(k)) }, '+') : null);
  const relOk = k.kind === 'charge' && stored > 0 && !(b.usedRound && (b.usedRound[`${k.id}:release`] || (!k.frogLoad && b.usedRound[k.id])));
  const castable = rech;
  const go = rech ? (castable ? h('button', { type: 'button', class: 'pw-btn go pr-go', disabled: !!why, onclick: () => ctx.recharge(k.id) }, 'Recharge', mc(ctx.rechargeCost)) : h('button', { type: 'button', class: 'pw-btn go pr-go', disabled: true }, 'Cast', mc(x)))
    : h('button', { type: 'button', class: 'pw-btn go pr-go', disabled: !!why, 'aria-label': `${k.kind === 'charge' ? 'Charge' : 'Cast'} ${k.name} for ${x} magic`, onclick: () => ctx.use(k.id) }, k.kind === 'charge' ? ['Charge', mc(x)] : ['Cast', mc(x)]);
  const friends = k.kind === 'luck' && !rech && D.CLASS2.on && D.CLASS2.verse && Array.isArray(b.fighters) ? b.fighters.map((f, j) => ({ f, j })).filter(({ f, j }) => j !== b.active && f.hp > 0) : [];
  if (friends.length) { // mp8: Lucky Verse at a table asks who it is for, right in its row: Me (attack) or a friend (the same number as healing)
    const fb = [h('button', { type: 'button', class: 'pw-btn go pr-go pr-for', disabled: !!why, 'aria-label': `Cast ${k.name} for me, ${x} magic`, onclick: () => ctx.use(k.id) }, 'Me', mc(x)),
      ...friends.map(({ f, j }) => h('button', { type: 'button', class: 'pw-btn go pr-go pr-for friend', disabled: !!why, 'aria-label': `Cast ${k.name} for ${f.hero.name} (heals), ${x} magic`, onclick: () => ctx.use(k.id, { to: j }) }, HK.icon('heal'), f.hero.name.split(' ')[0], mc(x)))];
    return h('div', { class: `pr-row t-${toneOf(k)} ${why && why !== 'Roll first' ? 'off' : ''}`, 'data-row': k.id },
      h('span', { class: 'pr-id' }, h('b', { class: 'pr-name' }, k.name), h('small', { class: `pr-tag ${why && why !== 'Roll first' ? 'low' : ''}` }, tag)),
      pay, h('span', { class: `pr-get t-${toneOf(k)}` }, icons), h('span', { class: 'pr-acts pr-fors' }, fb));
  }
  const rel = relOk ? h('button', { type: 'button', class: 'pw-btn alt pr-rel', 'aria-label': `Use ${stored} charge${stored > 1 ? 's' : ''}`, onclick: () => ctx.use(k.id, { release: true }) }, `Use ${stored}`) : null;
  return h('div', { class: `pr-row pr-k-${k.kind} t-${toneOf(k)} ${sel === k.id ? 'on' : ''} ${why && why !== 'Roll first' ? 'off' : ''}`, 'data-row': k.id },
    h('span', { class: 'pr-id' }, h('b', { class: 'pr-name' }, k.name), h('small', { class: `pr-tag ${why && why !== 'Roll first' ? 'low' : ''}` }, tag)),
    pay, h('span', { class: `pr-get t-${toneOf(k)}` }, icons), h('span', { class: 'pr-acts' }, rel, go), (() => { const n = ROW_NOTE[k.id]; return n && n.round === b.round ? h('div', { class: `pd-result pr-note pr-cnote t-${n.f}`, role: 'status' }, HK.icon(FX_ICON[n.f] || 'magic'), h('span', {}, n.text)) : null; })());
}
// mp8 (Dave: "We don't need the tabs. What if there are 6 rows!"): Potion, Heal and Heart change as rows too. Their buttons run battle3d.js's own
// actions (u.actions: doBigHeal, doHeal, doNudge); the row is selected first so its result note (B.pwNote) shows in the row.
// small solid magic triangle + number, sized to the button text (Dave mp9)
// a small d6 face (five pips) in the game's parchment + ink style
const D6NS = 'http://www.w3.org/2000/svg';
const d6 = () => { const s = document.createElementNS(D6NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'pr-d6'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<rect x="2" y="2" width="20" height="20" rx="4.5" fill="#f3e3c0" stroke="#5a4320" stroke-width="1.5"/><g fill="#1a1208"><circle cx="7.5" cy="7.5" r="2"/><circle cx="16.5" cy="7.5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/></g>'; return s; };
const mc = (n) => h('span', { class: 'pr-mc', 'aria-hidden': 'true' }, HK.icon('magic'), h('b', {}, String(n)));
function utilRow(ctx, u) {
  const { b } = ctx; const need = u.cost && u.cost > b.magic ? u.cost - b.magic : 0;
  const why = u.why || (need ? `Need ${need}` : '');
  const soft = /full health|no potions/i.test(u.why || '');
  const tagTxt = u.tag || (need ? `Need ${need}` : u.id === 'u:bigheal' ? `${E.potionsLeft(b)} left` : u.id === 'u:heal' ? 'Any time' : 'Once a round');
  const run = (a) => () => { ctx.select(u.id); a.fn(); };
  const pay = null; // mp9: cost lives on the button only
  let get; let acts;
  if (u.id === 'u:heart') {
    get = h('span', { class: 'pr-get t-gold pr-heart' }, HK.icon('heart'));
    // mq2 (Dave): a stepper — the heart's current face big in the middle, ▼ left and ▲ right (battle3d.js heart actions, reused)
    const cur = b.board?.C?.v || 0; let src = null; try { const spec = DICE?.dieSpecs(ctx.hero || b.hero).C; src = spec && cur ? DICE.faceImage(spec, cur) : null; } catch { src = null; }
    const btn = (a, i) => h('button', { type: 'button', class: `pw-btn go pr-go pr-hc ${i ? 'up' : 'down'}`, disabled: !!u.why || a.disabled, 'aria-label': a.aria, onclick: run(a) }, (() => { const img = (a.content || []).find((n) => n && n.tagName === 'IMG'); return img ? img.cloneNode(true) : h('span', { class: 'hc-none' }, '–'); })(), u.cost ? mc(u.cost) : null); // mq4: the face it turns to, no arrows (Dave)
    const [dn, up] = u.actions;
    acts = h('span', { class: 'hc-step' }, dn ? btn(dn, 0) : null, h('span', { class: 'hc-mid', 'aria-label': `Heart now ${cur}` }, src ? h('img', { class: 'hc-face now', src, alt: `heart ${cur}` }) : h('b', {}, String(cur || '–'))), up ? btn(up, 1) : null);
  } else {
    const n = u.id === 'u:bigheal' ? E.potionHpOf(b.hero) : E.healAmountOf(b.hero);
    get = h('span', { class: 'pr-get t-heal' }, HK.icon('heal'), h('b', {}, `+${n}`));
    acts = u.actions.map((a) => h('button', { type: 'button', class: `pw-btn go pr-go`, disabled: !!u.why || a.disabled, 'aria-label': a.aria || a.label, onclick: run(a) }, ...(u.id === 'u:bigheal' || !u.cost ? ['Drink'] : ['Cast', mc(u.cost)])));
  }
  const note = u.note ? h('div', { class: `pd-result pr-note t-${u.tone}`, role: 'status' }, HK.icon(u.note.icon || 'heal'), h('b', {}, u.note.big), h('span', {}, u.note.text)) : null;
  return h('div', { class: `pr-row pr-util ${u.id === 'u:heart' ? 'pr-hrow' : 'pr-half'} t-${u.tone} ${why && !soft ? 'off' : ''}`, 'data-row': u.id },
    h('span', { class: 'pr-id' }, h('b', { class: 'pr-name' }, u.name), h('small', { class: `pr-tag ${why ? 'low' : ''}` }, why && soft ? (u.tag || why) : tagTxt)),
    pay, get, h('span', { class: 'pr-acts' }, acts), note);
}
function powerRows(ctx, sel) {
  const order = ['A', 'B', 'C']; const ps = order.map((s) => ctx.powers.find((p) => p.k.slot === s)).filter(Boolean);
  return h('div', { class: 'pw-detail pw-rows', 'aria-label': 'Your powers' }, ps.map((p) => powerRow(ctx, p, sel)), h('i', { class: 'pr-split', 'aria-hidden': 'true' }), ...(() => { // mq1 (Dave): Heart change gets its own row, then Potion + Heal side by side
    const hr = ctx.utils.filter((u) => u.id === 'u:heart'); const rest = ctx.utils.filter((u) => u.id !== 'u:heart');
    return [hr.map((u) => utilRow(ctx, u)), rest.length ? h('div', { class: 'pr-pair' }, rest.map((u) => utilRow(ctx, u))) : null]; })());
}
function detailPanel(ctx, sel) {
  const { b, reset } = ctx;
  const p = ctx.powers.find((x) => x.k.id === sel);
  if (p) {
    const { k, st, stored } = p; const x = p.x ?? k.cost;
    const when = k.atwill ? 'Every round' : k.kind === 'super' ? `Super · once a battle${k.minRound ? ` · round ${k.minRound}+` : ''}` : 'Once a battle';
    const rech = reset && st.spent && canRecharge(k);
    const why = rech ? (b.magic < ctx.rechargeCost ? `Needs ${ctx.rechargeCost} magic to recharge.` : '')
      : reset && E.needsDice(k) ? 'Roll your dice first. A free reroll needs dice to act on.'
      : st.spent ? (k.atwill ? 'Already used this round.' : 'Already used this battle.') : st.early ? `Unlocks in round ${k.minRound}.` : b.magic < x ? `Need ${x - b.magic} more magic (it costs ${x}, you have ${b.magic}).` : '';
    const step = k.kind === 'scale' && !st.spent ? h('div', { class: 'pw-step', role: 'group', 'aria-label': 'Magic to pour in' },
      h('button', { type: 'button', 'aria-label': 'Less magic, one die fewer', disabled: x <= k.cost, onclick: () => ctx.step(k.id, x - E.scaleStep(k)) }, '–'), h('b', {}, String(x)),
      h('button', { type: 'button', 'aria-label': 'More magic, one more die', disabled: x + E.scaleStep(k) > Math.min(E.scaleMax(k, p.level || 0), Math.max(k.cost, b.magic)), onclick: () => ctx.step(k.id, x + E.scaleStep(k)) }, '+')) : null;
    const relOk = k.kind === 'charge' && stored > 0 && !(b.usedRound && (b.usedRound[`${k.id}:release`] || (!k.frogLoad && b.usedRound[k.id]))); // store or release, one a round
    const release = relOk ? h('button', { type: 'button', class: 'pw-btn alt', onclick: () => ctx.use(k.id, { release: true }) }, HK.icon('windup'), `Use ${stored} charge${stored > 1 ? 's' : ''}`) : null;
    const main = rech ? (st.spent && canRecharge(k) ? h('button', { type: 'button', class: 'pw-btn go', disabled: !!why, onclick: () => ctx.recharge(k.id) }, HK.icon('reroll'), `Recharge · ${ctx.rechargeCost}`) : null)
      : h('button', { type: 'button', class: 'pw-btn go has-after', disabled: !!why, onclick: () => ctx.use(k.id) }, HK.icon('magic'), h('span', { class: 'pb-lines' }, h('b', {}, k.kind === 'charge' ? `Store a charge · ${x}` : `Cast · ${x} magic`)));
    // Verse for a friend (CLASS2.verse, the lab): at a table Lucky Verse asks who it is for. You: attack, as now. A friend: the same number as healing.
    const friends = k.kind === 'luck' && !rech && D.CLASS2.on && D.CLASS2.verse && Array.isArray(b.fighters) ? b.fighters.map((f, j) => ({ f, j })).filter(({ f, j }) => j !== b.active && f.hp > 0) : [];
    const forRow = friends.length ? h('div', { class: 'pd-for' }, h('small', {}, 'Who is it for? You: attack. A friend: the same number as healing.'),
      h('button', { type: 'button', class: 'pw-btn go', disabled: !!why, onclick: () => ctx.use(k.id) }, HK.icon('magic'), `For me · ${x} magic`),
      ...friends.map(({ f, j }) => h('button', { type: 'button', class: 'pw-btn go friend', disabled: !!why, onclick: () => ctx.use(k.id, { to: j }) }, HK.icon('heal'), `For ${f.hero.name} · ${Math.round((f.hp / f.maxHp) * 100)}% health`))) : null;
    return h('div', { class: `pw-detail t-${toneOf(k)}`, 'aria-label': `${k.name} details` },
      h('span', { class: 'pw-imprint', 'aria-hidden': 'true' }, glyph(k)),
      h('div', { class: 'pd-top' }, h('span', { class: 'pd-badge' }, glyph(k)), h('div', { class: 'pd-id' }, h('small', {}, `${k.slot}${p.level ? ` · ${'★'.repeat(p.level)}` : ''}`), h('b', {}, k.name), h('em', { class: 'pd-when' }, when))),
      buyRow(x, buyItems(k, { x, round: b.round, level: p.level || 0, stored }), k.kind === 'charge' && stored != null ? h('span', { class: 'pb-note' }, `${stored}/${k.max}`) : null),
      why ? h('p', { class: 'pd-why' }, why) : null, forRow || h('div', { class: 'pd-row' }, step, release, main));
  }
  const u = ctx.utils.find((x) => x.id === sel);
  if (!u) { // nothing chosen yet: say what to do
    return h('div', { class: 'pw-detail pw-pick' }, h('span', { class: 'pp-arrow', 'aria-hidden': 'true' }, '▲'),
      h('b', {}, 'Tap a power'),
      h('p', {}, reset ? 'Use magic now, then roll. Tap one to read it.' : 'Choose A, B or C to inspect a power. Use the helper row for potions, healing and heart changes.'));
  }
  const note = u.note ? h('div', { class: `pd-result t-${u.tone}`, role: 'status' }, HK.icon(u.note.icon || 'heal'), h('b', {}, u.note.big), h('span', {}, u.note.text)) : null; // what the last tap did, inside the tab
  if (u.panel) return h('div', { class: `pw-detail pw-custom t-${u.tone}` }, note, u.panel); // a helper that draws its own compact controls (the heart change)
  return h('div', { class: `pw-detail t-${u.tone}` },
    h('div', { class: 'pd-top' }, h('span', { class: 'pd-badge' }, glyph(u)), h('div', { class: 'pd-id' }, h('b', {}, u.name), u.id === 'u:bigheal' ? h('em', { class: 'pd-when' }, `${E.potionsLeft(b)} left`) : u.id === 'u:heal' ? h('em', { class: 'pd-when' }, 'Any time') : null)),
    u.id === 'u:bigheal' ? buyRow(0, [buyItem('heal', E.potionHpOf(b.hero))]) : u.id === 'u:heal' ? buyRow(u.cost, [buyItem('heal', E.healAmountOf(b.hero))]) : h('p', { class: 'pd-line' }, marked(u.body)), note, u.why ? h('p', { class: 'pd-why' }, u.why) : null, u.extra || null,
    h('div', { class: 'pd-row' }, u.actions.map((a) => h('button', { type: 'button', class: `pw-btn ${a.alt ? 'alt' : 'go'}${a.content ? ' hc-btn' : ''}`, disabled: !!u.why || a.disabled, 'aria-label': a.aria || null, onclick: a.fn }, ...(a.content || [a.label])))));
}

// ------------------------------------------------------------------------------------------------ the reveal
// Show what a power just did. k: the card; r: E.castPower's result; gains: what reached the counters { atk: 8, ... };
// round: the battle round. Resolves when the player taps OK (or taps the backdrop once it is done).
// inline: the open .pw-detail panel; when given, the result plays inside the selected tab (no second window; Dave, 26 Oct mp2).
// mq7 (Dave: "you won't need to open a new screen"): Volley (charge powers) store and release with no reveal card; the result shows in its own row this round
const ROW_NOTE = {};
export function frogReveal(host, k, r) {
  return new Promise(resolve => {
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const result = h('div', { class: 'fm-roll-result', role: 'status', 'aria-live': 'polite' });
    const cube = h('div', { class: 'fm-cube', 'aria-label': 'Rolling a purple six-sided die' }, [1, 2, 3, 4, 5, 6].map(n => { const dots=MC.die('magic',6,n);dots.querySelector('path')?.remove();return h('span', { class: `fm-cube-face face-${n}` }, dots); }));
    const done = h('button', { type: 'button', class: 'fm-roll-done', disabled: true }, 'Back to battle');
    const layer = h('div', { class: 'fm-roll-screen', role: 'dialog', 'aria-modal': 'true', 'aria-label': k.name },
      h('h2', {}, k.name), h('p', { class: 'fm-roll-match' }, `Match ${r.match || E.frogMatchRange(k, r.released)}`),
      h('div', { class: 'fm-cube-stage' }, cube), result, done);
    const prior = document.activeElement;
    done.onclick = () => { layer.remove(); prior?.focus?.({ preventScroll: true }); resolve(); };
    layer.addEventListener('keydown', e => { if (e.key === 'Escape' && !done.disabled) done.click(); if (e.key === 'Tab') { e.preventDefault(); if (!done.disabled) done.focus(); } });
    host.append(layer);
    const turns = {1:[0,0],2:[-90,0],3:[0,-90],4:[0,90],5:[90,0],6:[0,180]}[r.total];
    const finish = () => {
      cube.setAttribute('aria-label', `Purple d6 rolled ${r.total}`);layer.dataset.result = r.frog ? 'frog' : 'miss';
      result.replaceChildren(h('b', {}, r.frog ? '🐸 Frog!' : 'Miss'), h('span', {}, `Rolled ${r.total}`), h('p', {}, r.frog ? 'No attack this round. It can still defend.' : 'The enemy keeps its move.'), h('small', {}, `${r.loaded} loaded dice spent`));
      done.disabled = false;done.focus({ preventScroll: true });sfx.dieSettle?.();
    };
    const end = `rotateX(${708 + turns[0]}deg) rotateY(${702 + turns[1]}deg)`;
    if (reduced) { cube.style.transform=end;finish(); }
    else { sfx.diceRoll?.(4);cube.animate([{transform:'translateY(-60px) rotateX(30deg) rotateY(30deg)'},{transform:'translateY(12px) rotateX(540deg) rotateY(620deg)',offset:.7},{transform:end}],{duration:1150,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'}).finished.then(finish); }
  });
}
// The roll on the card (Dave, 6 Nov 2026: "the dice that are on the screen bounced up and began to roll on the card and landed … the numbers
// were the colors of whatever the dice are … a button that said continue … those numbers kind of angled towards the counters"). The light
// way: each die on the card hops and flicks through its own 3D faces (pictures, made once), lands on what it rolled; the totals show at the
// bottom of the card in their colours; Continue sends each number down into its counter (target(key) is that counter). Dice and Side-Game
// Cards only. Resolves when the numbers have gone.
export const warmCardDice = (k) => MC.warmFaces(k);
const COUNTERS = ['atk', 'pierce', 'splash', 'block', 'magic', 'heal', 'gold']; // the counter row, left to right (hudkit.js forecastStrip)
const ROLL_ORDER = ['atk', 'pierce', 'splash', 'block', 'heal', 'gold', 'magic'];
export function cardRoll(card, { k, r, gains, target = () => null }) {
  return new Promise((resolve) => {
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const row = card.querySelector('.t28-dice'); const slots = row ? [...row.querySelectorAll('.mc-die')] : [];
    const groups = r.groups || [{ to: k.dice?.to, s: k.dice?.s || r.die || 6, rolls: r.rolls }];
    const each = groups.flatMap((g) => g.rolls.map((v) => ({ fx: g.to, s: g.s, v })));
    const timers = []; const later = (ms, fn) => timers.push(setTimeout(fn, reduced ? 0 : ms));
    card.classList.add('mc-rolling-card');
    try { if (!reduced) sfx.diceRoll?.(Math.min(9, 3 + each.length * 2)); } catch { /* sound is optional */ }
    // each die tumbles its own way (Dave, 6 Nov 2026: "more random or shake a little bit to feel like a dice roll"): a rattle first, then a
    // random path and spin per die, faces flipping fast then slower as it settles, landing at its own moment with a little wobble
    const rnd = (a, b) => a + Math.random() * (b - a);
    const dice = each.map((d, i) => { const old = slots[i]; if (!old) return null; const el = MC.dieFace(d.fx, d.s, 1 + Math.floor(Math.random() * d.s)); el.classList.add('mc-rolling');
      const wrap = h('span', { class: 'mc-tumble' }, el); old.replaceWith(wrap); return { ...d, el, wrap, dur: rnd(1250, 1650) + i * rnd(80, 200), anims: [] }; }).filter(Boolean);
    const RATTLE = reduced ? 0 : 420; if (!reduced && row) { row.classList.add('mc-shake'); setTimeout(() => row.classList.remove('mc-shake'), RATTLE); }
    const swapFace = (d, v, cls) => { const next = MC.dieFace(d.fx, d.s, v, cls === 'mc-landed'); next.classList.add(cls); d.el.replaceWith(next); d.el = next; };
    const tumble = (d) => { if (reduced || !d.wrap.animate) return;
      const dir = Math.random() < 0.5 ? -1 : 1; const turns = dir * 360 * (Math.random() < 0.6 ? 1 : 2); const x = () => `${rnd(-26, 26).toFixed(0)}%`;
      // the die keeps moving until it lands: bounces that shrink, a spin that slows, small shakes between (Dave: "a little bit shakier"),
      // all on a near-even pace, so the last face flip and the end of the spin are the same moment
      const j = () => `${rnd(-7, 7).toFixed(0)}%`; const steps = [
        [0, 0, 0, 0, 1], [0.12, x(), rnd(-64, -46), 0.18, 1.1], [0.2, j(), rnd(-30, -18), 0.27, 1.06], [0.3, x(), rnd(-8, -2), 0.38, 0.95],
        [0.4, x(), rnd(-42, -28), 0.5, 1.07], [0.5, j(), rnd(-14, -6), 0.6, 1], [0.6, x(), rnd(-4, 0), 0.7, 0.96], [0.7, x(), rnd(-22, -12), 0.8, 1.04],
        [0.8, j(), rnd(-5, -1), 0.88, 1], [0.88, `${rnd(-10, 10).toFixed(0)}%`, rnd(-9, -3), 0.94, 1.02], [0.95, `${rnd(-4, 4).toFixed(0)}%`, rnd(-2, 0), 0.985, 1], [1, '0%', 0, 1, 1]];
      d.anims.push(d.wrap.animate(steps.map(([o, tx, ty, r, sc]) => ({ offset: o, transform: `translate(${typeof tx === 'number' ? `${tx}%` : tx},${Number(ty).toFixed(0)}%) rotate(${(turns * r + (o > 0 && o < 1 ? rnd(-12, 12) : 0)).toFixed(0)}deg) scale(${sc})` })),
        { duration: d.dur, easing: 'linear', fill: 'forwards' }));
      // the faces flip quickly, then slower and slower as the die runs out of energy
      let gap = rnd(42, 58); let at = 0;
      const flip = () => { if (!d.el.classList.contains('mc-rolling')) return; at += gap; if (at > d.dur - 40) return; swapFace(d, 1 + Math.floor(Math.random() * d.s), 'mc-rolling'); gap *= rnd(1.07, 1.13); d.flipT = setTimeout(flip, gap); };
      d.flipT = setTimeout(flip, gap); };
    const flick = null;
    const land = (d) => { if (d.el.classList.contains('mc-landed')) return; clearTimeout(d.flipT); for (const a of d.anims) { try { a.cancel(); } catch { /* gone */ } }
      swapFace(d, d.v, 'mc-landed');
      if (!reduced && d.wrap.animate) d.wrap.animate([{ transform: `rotate(${rnd(-9, 9).toFixed(1)}deg)` }, { transform: `rotate(${rnd(-3, 3).toFixed(1)}deg)`, offset: 0.55 }, { transform: 'rotate(0deg)' }], { duration: 300, easing: 'ease-out' });
      try { sfx.dieSettle?.(); } catch { /* optional */ } };
    // the answer: one number per counter it fills, in its colour, at the bottom of the card
    const shown = ROLL_ORDER.filter((f) => gains[f] > 0);
    const missed = groups.filter((g) => g.table && !g.total).map((g) => g.to); // a gold die that paid nothing still answers
    const nums = shown.map((f) => h('b', { class: `mc-res-n t-${TONE[f] || f}`, 'data-k': f }, HK.icon(FX_ICON[f] || f), `+${gains[f]}`));
    const go = h('button', { type: 'button', class: 'mc-res-go', disabled: true }, 'Continue');
    const res = h('div', { class: 'mc-result', role: 'status', 'aria-live': 'polite', 'aria-label': shown.map((f) => `${gains[f]} ${NAME[f] || f}`).join(', ') || 'Nothing this time' },
      h('div', { class: 'mc-res-row' }, ...nums, ...missed.filter((f) => !shown.includes(f)).map((f) => h('span', { class: `mc-res-miss t-${TONE[f] || f}` }, `No ${NAME[f] || f} this time`))), go);
    // a side game's table: the row the die landed in lights up, and the answer sits above the table, not over it
    const tableRows = [...card.querySelectorAll('.t28-goldtab .t28-luck-row, .t28-luck .t28-luck-row')];
    const tableDie = groups.find((g) => g.table)?.rolls?.[0] ?? (k.kind === 'luck' ? r.rolls?.[0] : null);
    if (tableRows.length) { // a slim strip just under the dice: the dice, the answer and the lit row all show at once
      res.classList.add('top'); }
    const finish = () => { if (res.isConnected) return; void flick; timers.forEach(clearTimeout); for (const d of dice) land(d);
      if (tableDie != null) { let lo = 1; for (const row of tableRows) { const m = row.textContent.match(/(\d+)(?:\s*[–-]\s*(\d+))?/); const a = m ? +m[1] : lo; const b2 = m?.[2] ? +m[2] : a; if (tableDie >= a && tableDie <= b2) row.classList.add('hit'); lo = b2 + 1; } }
      if (res.classList.contains('top') && row) { card.classList.add('mc-answering'); row.after(res); } else card.append(res); /* a table card: the answer takes the words' place under the dice */ requestAnimationFrame(() => res.classList.add('in')); later(250, () => { go.disabled = false; go.focus?.({ preventScroll: true }); }); };
    let left = dice.length;
    later(RATTLE, () => { for (const d of dice) { tumble(d); later(d.dur, () => { land(d); if (--left === 0) later(240, finish); }); } });
    if (!dice.length) later(300, finish);
    card.addEventListener('click', function hurry(e) { if (e.target === go || res.isConnected) return; card.removeEventListener('click', hurry); finish(); }); // a tap hurries it along
    go.addEventListener('click', (e) => {
      e.stopPropagation(); go.disabled = true;
      // each number drifts down into its counter (or down off the sheet, where the counters are), then the counters bump (the caller)
      for (const n of res.querySelectorAll('.mc-res-n')) {
        const from = n.getBoundingClientRect(); const to = target(n.dataset.k)?.getBoundingClientRect?.(); const ghost = n.cloneNode(true); ghost.classList.add('mc-res-fly');
        Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px` }); document.body.append(ghost);
        // toward its own counter (Dave: "based on which color they are … slowly float towards that part of the screen"): the counters sit in a
        // row across the bottom, Attack at the left to Gold at the right; when the sheet covers them, aim where they would be
        const seen = to && to.width > 4 && to.top > from.bottom && to.top < window.innerHeight;
        const slot = Math.max(0, COUNTERS.indexOf(n.dataset.k)); const W = window.innerWidth; const H = window.innerHeight;
        const tx = seen ? to.left + to.width / 2 : W * (slot + 0.5) / COUNTERS.length; const ty = seen ? to.top + to.height / 2 : H - Math.min(150, H * 0.17);
        const dx = tx - (from.left + from.width / 2); const dy = ty - (from.top + from.height / 2);
        requestAnimationFrame(() => { ghost.style.transform = `translate(${dx.toFixed(0)}px, ${dy.toFixed(0)}px) scale(.6)`; ghost.style.opacity = '0'; });
        setTimeout(() => ghost.remove(), reduced ? 0 : 1300);
      }
      res.classList.add('out'); card.classList.remove('mc-rolling-card'); setTimeout(() => card.classList.remove('mc-answering'), reduced ? 0 : 560);
      setTimeout(() => { res.remove(); resolve(); }, reduced ? 0 : 900);
    });
  });
}
export function castReveal(host, { k, r, gains, round = 1, level = 0, inline = null }) {
  if (k?.frogLoad && r.released) return frogReveal(host, k, r);
  if (k?.kind === 'charge') {
    const f = k.frogNeed ? 'weaken' : Object.keys(r.per || perOf(k))[0] || 'pierce'; const amt = gains[f] || r.total || 0;
    const used = k.frogNeed ? (r.frog ? `Frog! Rolled ${r.total}${r.need > 1 ? ` (${E.frogRange(r.need)})` : ''}` : `Missed: rolled ${r.total}, match ${r.match || E.frogRange(r.need)}`) : `Used ${r.released}: +${amt} ${NAME[f] || f}`;
    ROW_NOTE[k.id] = { round, f, text: r.released ? used : k.frogLoad ? `${E.frogLoaded(k, r.charged)} of 6 dice loaded` : `Charged: ${r.charged || 0} of ${k.max}` };
    try { sfx.magic?.(); } catch { /* sound is optional */ }
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const tone = r.released ? TONE[Object.keys(r.per || perOf(k))[0]] || toneOf(k) : toneOf(k);
    const timers = []; const later = (ms, fn) => timers.push(setTimeout(fn, reduced ? 0 : ms));
    let shut = false; let done = false;
    const total = Object.values(gains).reduce((a, v) => a + v, 0);
    const close = () => { if (shut) return; shut = true; timers.forEach(clearTimeout); (inline ? card : layer).classList.add('out'); sfx.uiClose?.(); setTimeout(() => { if (inline) { card.remove(); inline.classList.remove('pw-casting'); } else layer.remove(); resolve(); }, 220); };
    const adds = Object.keys(gains).some((f) => !['free', 'weaken'].includes(f)); // a free reroll or softer hits do not add to a counter
    const ok = h('button', { type: 'button', class: 'dr-ok', disabled: true, onclick: close }, adds && !r.charged ? (r.rolls?.length && k.kind !== 'luck' && !r.groups ? `Add ${r.total} to my roll` : 'Add it to my roll') : 'Got it');
    const shown = new Set(); // what the art already shows in full (its chips are not repeated under it)
    const chips = h('div', { class: 'dr-gains' });
    const missed = (r.groups || []).filter((g) => g.table && !g.total).map((g) => h('span', { class: `pw-chip t-${TONE[g.to] || 'gold'} miss` }, HK.icon(FX_ICON[g.to] || 'gold'), `no ${NAME[g.to] || g.to} this time`)); // a side game's gold die that missed still gets an answer
    const finish = (delay = 380) => later(delay, () => { if (done) return; done = true; chips.replaceChildren(...Object.entries(gains).filter(([f]) => !shown.has(f)).map(([f, v]) => chip(f, v)), ...missed); card.classList.add('done'); ok.disabled = false; ok.focus?.(); sfx.coin?.(); });
    const art = h('div', { class: 'cr-art' });
    const kicker = r.released ? 'Use' : r.charged ? 'Charged' : k.kind === 'super' ? 'Super power' : k.atwill ? 'Every-round power' : 'Big move';
    const head = h('div', { class: 'cr-head' }, h('span', { class: 'cr-sigil', 'aria-hidden': 'true' }, h('i', { class: 'cr-tri' }), h('span', { class: 'cr-medal' }, glyph(k))),
      h('small', { class: 'dr-kicker' }, `${k.slot ? `${k.slot} · ` : ''}${kicker}${r.cost ? ` · ${r.cost} magic` : ''}`), h('h3', {}, k.name));
    const card = h('div', { class: `dr-card cr-card t-${tone} kind-${r.released ? 'release' : r.charged ? 'charge' : k.kind}`, role: inline ? 'status' : 'dialog', 'aria-label': `${k.name}` }, head, art, chips, ok);
    if (inline) card.classList.add('dr-inline');
    const layer = h('div', { class: 'dr-layer', onclick: (e) => { if (e.target === layer && done) close(); } }, card);
    card.addEventListener('click', (e) => { if (!done && e.target !== ok) { timers.forEach(clearTimeout); timers.length = 0; skip?.(); } }); // tap to hurry it along
    let skip = null;
    if (inline) { inline.classList.add('pw-casting'); inline.replaceChildren(card); card.scrollIntoView?.({ block: 'nearest' }); const watch = setInterval(() => { if (shut) clearInterval(watch); else if (!card.isConnected) { clearInterval(watch); shut = true; timers.forEach(clearTimeout); resolve(); } }, 400); } // a re-render that drops the panel ends it
    else host.append(layer); sfx.uiOpen?.();
    const count = (el, to, ms = 600) => { if (reduced) { el.textContent = String(to); return; } const t0 = performance.now(); const from = Number(el.textContent) || 0; const tick = () => { const q = Math.min(1, (performance.now() - t0) / ms); el.textContent = String(Math.round(from + (to - from) * q)); if (q < 1 && !shut) requestAnimationFrame(tick); }; requestAnimationFrame(tick); };

    if (r.rolls?.length) { // ---- dice: tumble, land one by one, add up (Arc Bolt, Cleave, Aimed Shot, Mending Song, Lucky Verse)
      const sides = r.die || k.dice?.s || 6; const to = k.dice?.to || 'atk'; const luck = k.kind === 'luck';
      const each = r.groups ? r.groups.flatMap((g) => g.rolls.map(() => g)) : null; // a mixed card (T31): every die in its own colour and size
      const faces = r.rolls.map((v, i) => { const s2 = each?.[i]?.s || sides; const t2 = each?.[i]?.to || to; const n = h('b', {}, String(1 + Math.floor(Math.random() * s2))); return { v, n, el: h('div', { class: `dr-die d${s2} t-${luck ? 'gold' : t2} rolling`, style: { '--i': i } }, h('span', { class: 'dr-shape' }), n) }; });
      const tot = h('b', { class: 'dr-total' }, '0');
      const DIEWORD = { atk: 'red', pierce: 'orange', splash: 'pink', whirl: 'pink', block: 'blue', heal: 'green', gold: 'gold', magic: 'purple' };
      const what = luck ? 'Roll a d6 for luck.' : r.groups ? `Rolling ${r.groups.map((g) => `${g.rolls.length} ${DIEWORD[g.to] || g.to} d${g.s}`).join(' and ')}.` : `Rolling ${faces.length}d${sides} for ${NAME[to]}.`;
      art.append(h('p', { class: 'dr-what' }, what), h('div', { class: `dr-dice n${Math.min(faces.length, 6)}` }, faces.map((f) => f.el)));
      const table = luck ? h('div', { class: 'cr-luck' }, [[[1, 2], 'magic', `+${1 + level} magic`], [[3, 4], 'atk', `+${E.scaleNum(E.LUCK.mid, level)} attack`], [[5, 6], 'atk', `+${E.scaleNum(E.LUCK.top, level)} attack, +1 magic`]].map(([[a, b2], t, txt]) => h('div', { class: `cl-row t-${t}`, 'data-a': a, 'data-b': b2 }, h('b', {}, `${a}–${b2}`), h('span', {}, txt)))) : r.groups ? h('div', { class: 'dr-mixnote' }) : h('div', { class: 'dr-sum' }, h('span', { class: 'dr-eq' }, '='), tot, h('span', { class: `dr-kind t-${to}` }, HK.icon(FX_ICON[to] || 'atk'), NAME[to]));
      art.append(table); if (!luck && !r.groups) shown.add(to); // a mixed card's dice do not add up to one number: the chips show what each colour paid
      const flick = reduced ? null : setInterval(() => { for (const f of faces) if (f.el.classList.contains('rolling')) f.n.textContent = String(1 + Math.floor(Math.random() * sides)); }, 70);
      if (!reduced) sfx.diceRoll?.(Math.min(9, 3 + faces.length * 2));
      let sum = 0;
      const land = (f) => { if (!f.el.classList.contains('rolling')) return; f.el.classList.remove('rolling'); f.el.classList.add('landed'); f.n.textContent = String(f.v); sfx.dieSettle?.(); sum += f.v; tot.textContent = String(sum); tot.classList.remove('pop'); void tot.offsetWidth; tot.classList.add('pop'); };
      const after = () => { clearInterval(flick); if (luck) { const v = r.rolls[0]; for (const row of table.children) if (v >= +row.dataset.a && v <= +row.dataset.b) row.classList.add('hit'); } finish(); };
      faces.forEach((f, i) => later(650 + i * 380, () => { land(f); if (i === faces.length - 1) after(); }));
      skip = () => { faces.forEach(land); after(); };
    } else if (r.charged) { // ---- a charge stored: the ring fills one more pip
      const per = perOf(k); const n = r.charged;
      const pips = h('div', { class: 'cr-charges' }, Array.from({ length: k.max }, (_, i) => h('i', { class: `${i < n - 1 ? 'on' : ''} ${i === n - 1 ? 'new' : ''}` }, i === n - 1 ? HK.icon('windup') : null)));
      const now = Object.entries(E.chargeGain(k, n, level)).map(([f, v]) => chip(f, v)); void per;
      const next = n < k.max ? Object.entries(E.chargeGain(k, n + 1, level)).map(([f, v]) => `${v} ${NAME[f] || f}`).join(', ') : '';
      art.append(h('p', { class: 'dr-what' }, `Charge ${n} of ${k.max}.${next ? ` Next: ${next}.` : ''}`), pips,
        h('div', { class: 'cr-note' }, h('small', {}, 'Use them now for'), h('div', { class: 'cr-now' }, now)));
      later(450, () => { pips.querySelector('.new')?.classList.add('fill'); sfx.magic?.(); });
      finish(1050); skip = () => { pips.querySelector('.new')?.classList.add('fill'); finish(0); };
    } else if (r.released) { // ---- charges released: each pip bursts and adds its share
      const per = r.per || perOf(k); const n = r.released;
      const pips = h('div', { class: 'cr-charges burst' }, Array.from({ length: k.max }, (_, i) => h('i', { class: i < n ? 'on' : '' }, i < n ? HK.icon('windup') : null)));
      const nums = Object.fromEntries(Object.keys(gains).map((f) => [f, h('b', {}, '0')]));
      const rows = h('div', { class: 'cr-tally' }, Object.entries(nums).map(([f, el]) => h('span', { class: `pw-chip t-${TONE[f] || 'magic'}` }, HK.icon(FX_ICON[f] || 'magic'), el, ' ', NAME[f] || f)));
      const steps = Object.values(E.chargeValues(k, n, level))[0] || [1]; const sumTo = (i) => steps.slice(0, i + 1).reduce((a, v) => a + v, 0); // each pip adds a little more than the last
      art.append(h('p', { class: 'dr-what' }, `${steps.join(' + ')}`), pips, rows); Object.keys(gains).forEach((f) => shown.add(f));
      const step = (i) => { const pip = pips.children[i]; pip?.classList.add('pop'); sfx.dieSettle?.(); for (const [f, el] of Object.entries(nums)) count(el, Math.round((gains[f] * sumTo(i)) / sumTo(n - 1)), 260); };
      for (let i = 0; i < n; i++) later(500 + i * 330, () => { step(i); if (i === n - 1) finish(); });
      skip = () => { for (let i = 0; i < n; i++) pips.children[i]?.classList.add('pop'); for (const [f, el] of Object.entries(nums)) el.textContent = String(gains[f]); finish(0); };
    } else if (k.kind === 'round') { // ---- grows with the round: one pip per round lights up, the number climbs
      const R = Math.max(1, round); const nPips = Math.min(R, 10); const val = h('b', { class: 'dr-total' }, '0'); const amt = gains.atk ?? r.total;
      const boost = amt - k.per * R; // the power level's share
      art.append(h('p', { class: 'dr-what' }, `${k.per} attack for every round of the fight${boost > 0 ? `, plus ${boost} for level ${level}` : ''}. This is round ${R}.`),
        h('div', { class: 'cr-rounds' }, Array.from({ length: nPips }, (_, i) => h('i', { style: { '--i': i } }, String(i + 1)))),
        h('div', { class: 'dr-sum' }, h('span', { class: 'dr-eq' }, `${k.per} × ${R}${boost > 0 ? ` + ${boost}` : ''} =`), val, h('span', { class: 'dr-kind t-atk' }, HK.icon('atk'), 'attack'))); shown.add('atk');
      const lights = [...art.querySelectorAll('.cr-rounds i')];
      lights.forEach((el, i) => later(350 + i * 170, () => { el.classList.add('on'); sfx.settle?.(i); count(val, Math.round((amt * (i + 1)) / nPips), 160); if (i === lights.length - 1) finish(); }));
      skip = () => { lights.forEach((el) => el.classList.add('on')); val.textContent = String(amt); finish(0); };
    } else if (k.kind === 'super') { // ---- a super: the sky lights up and every monster is hit
      const aoe = gains.aoe || k.aoe; const foes = Math.max(1, r.foes || 3);
      art.append(h('div', { class: 'cr-flash' }), h('p', { class: 'dr-what' }, 'Your biggest power, once a battle.'),
        h('div', { class: 'cr-foes' }, Array.from({ length: foes }, (_, i) => h('span', { class: 'cf-foe', style: { '--i': i } }, HK.icon('slam'), h('b', {}, `−${aoe}`)))),
        h('small', { class: 'cr-sub' }, `${aoe} to every monster, before it can swing`)); shown.add('aoe');
      later(150, () => { card.classList.add('boom'); sfx.level?.(); });
      finish(1300); skip = () => { card.classList.add('boom'); finish(0); };
    } else { // ---- a flat power: its mark stamps down and the bonus rises out of it
      const [f, v] = Object.entries(gains)[0] || Object.entries(k.fx)[0] || ['magic', 0];
      const word = k.grudge ? `${r.grudge ?? v} damage got past your block. It comes back as attack.` : f === 'frog' ? 'Your target is a frog this round. It cannot attack.' : f === 'weaken' ? `Monsters hit ${v} softer this round` : f === 'free' ? `A free reroll of ${v} dice, ready to use` : `${NAME[f] || f} this round`;
      const big = h('div', { class: `cr-stamp t-${TONE[f] || 'magic'}` }, h('span', { class: 'cs-ring' }, HK.icon(FX_ICON[f] || 'magic')), h('b', {}, f === 'frog' ? 'FROG' : f === 'free' ? `${v}` : f === 'weaken' ? `−${v}` : `+${v}`));
      art.append(big, h('p', { class: 'dr-what' }, word)); shown.add(f);
      later(120, () => { big.classList.add('in'); sfx.magic?.(); });
      finish(800); skip = () => { big.classList.add('in'); finish(0); };
    }
    void total; void level;
    timers.push(setTimeout(() => { if (!shut && done) close(); }, 30000)); // a real 30 s even with reduced motion (it used to close at once)
  });
}
