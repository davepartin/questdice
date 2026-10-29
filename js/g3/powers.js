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
  burst: '<path class="f" d="M12 1 L14.4 8 L21.8 6.6 L16.6 12 L21.8 17.4 L14.4 16 L12 23 L9.6 16 L2.2 17.4 L7.4 12 L2.2 6.6 L9.6 8 Z"/><circle class="p" cx="12" cy="12" r="3" style="fill:#fff"/>',
};
// Which picture each power wears (the rest fall back to the icon of what they give).
const POWER_GLYPH = {
  cleave: 'cleave', judgment: 'burst', shieldwall: 'hexshield', press: 'cleave', rally: 'flag', secondwind: 'wind',
  aimed: 'crosshair', rain: 'rain', quickdraw: 'hk:reroll', snare: 'net', volley: 'volley', vanish: 'cloak',
  arcbolt: 'bolt', meteor: 'comet', bolt: 'missile', barrier: 'hexshield', coil: 'spiral', light: 'sun',
  grudge: 'fist', avalanche: 'mountain', bulwark: 'hk:block', brace: 'hexshield', stonehide: 'mountain', forgefury: 'anvil',
  mending: 'musicheal', finale: 'burst', luckyverse: 'clover', discord: 'discord', ballad: 'rising', goldhymn: 'goldnote',
  'u:bigheal': 'potion', 'u:heal': 'healheart', 'u:heart': 'heartturn', // the helpers under the triangle
};
const FX_ICON = { atk: 'atk', block: 'block', pierce: 'pierce', heal: 'heal', magic: 'magic', gold: 'gold', weaken: 'weaken', free: 'reroll', splash: 'atk', aoe: 'atk' };
const SVGNS = 'http://www.w3.org/2000/svg';
export function glyph(k, cls = '') {
  const name = POWER_GLYPH[k.id] || `hk:${FX_ICON[mainFx(k)] || 'magic'}`;
  if (name.startsWith('hk:')) return HK.icon(name.slice(3), cls);
  const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', `ic pw-glyph ${cls}`.trim()); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = G[name]; return s;
}
// the effect a power is mostly about (its colour)
export function mainFx(k) {
  if (k.dice) return k.dice.to;
  const per = k.kind === 'charge' ? (typeof k.per === 'number' ? { atk: k.per } : k.per) : k.fx;
  return Object.keys(per || {})[0] || 'magic';
}
const TONE = { atk: 'atk', pierce: 'pierce', block: 'block', heal: 'heal', magic: 'magic', gold: 'gold', weaken: 'weaken', free: 'gold', splash: 'atk', aoe: 'atk' };
export const toneOf = (k) => TONE[mainFx(k)] || 'magic';
const NAME = { atk: 'attack', pierce: 'pierce', block: 'block', heal: 'heal', magic: 'magic', gold: 'gold', weaken: 'softer hits', free: 'free reroll dice', splash: 'to the other monsters', aoe: 'to every monster' };
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
export function effectLine(k, { x, round, level = 0, stored = null } = {}) {
  if (k.kind === 'dice') return `Roll ${k.dice.n + level}d${k.dice.s} ${NAME[k.dice.to]}.${splashWord(k)}`;
  if (k.kind === 'scale') { const st = E.scaleStep(k); return `${x ?? k.cost} magic: ${E.powerDice(k, x, level)}d${k.dice.s} ${NAME[k.dice.to]}. +1 die per ${st > 1 ? `${st} more magic` : 'extra magic'}, max ${scaleTop(k, level)}d${k.dice.s}.`; }
  if (k.kind === 'round') { const r = round || Math.max(4, k.minRound || 0); return `Attack grows each round. Round ${r}: +${E.roundGain(k, r, level)}.${splashWord(k)}`; }
  if (k.kind === 'charge') { const v = Object.entries(E.chargeValues(k, k.max, level)); return `${stored == null ? '' : `${stored} of ${k.max} stored. `}Store 1 a round, or release all: ${v.map(([f, xs]) => `${xs.join(', ')} ${f === 'heal' ? 'heal' : NAME[f] || f}`).join(' and ')}. Total ${v.length > 1 ? totWords(k, level) : Object.values(E.chargeGain(k, k.max, level))[0]}.${splashWord(k)}`; }
  if (k.kind === 'super') return `${fxWords(lvlFx(k.fx, level))}, and ${E.scaleNum(k.aoe, level)} to every monster.`;
  if (k.kind === 'luck') return `Roll a d6. 1–2: +${1 + level} magic. 3–4: +${E.scaleNum(E.LUCK.mid, level)} attack. 5–6: +${E.scaleNum(E.LUCK.top, level)} attack, +1 magic.`;
  const t = fxWords(lvlFx(k.fx, level)); return `${t[0].toUpperCase()}${t.slice(1)}.`;
}
// Just the result at a level, for the compare box and the level list: "Total 28 attack", "3d6 attack", "+5 block".
// What a cast leaves you with, beside the Cast button: "Rolls 2d6 · 2 magic left" (the dice only for a power that rolls dice).
export function castPreview(k, { x, level = 0, magic = 0 } = {}) {
  const cost = x ?? k.cost; const left = `${Math.max(0, magic - cost)} magic left`;
  const rolls = k.kind === 'scale' ? `Rolls ${E.powerDice(k, cost, level)}d${k.dice.s}` : k.kind === 'dice' ? `Rolls ${k.dice.n + level}d${k.dice.s}` : k.kind === 'charge' ? 'Stores 1 charge' : '';
  return rolls ? `${rolls} · ${left}` : left;
}
export function shortLine(k, level = 0) {
  if (k.kind === 'dice') return `${k.dice.n + level}d${k.dice.s} ${NAME[k.dice.to]}`;
  if (k.kind === 'scale') return `${E.powerDice(k, k.cost, level)}d${k.dice.s}, max ${scaleTop(k, level)}d${k.dice.s}`;
  if (k.kind === 'round') { const r = Math.max(4, k.minRound || 0); return `Round ${r}: +${E.roundGain(k, r, level)} attack`; }
  if (k.kind === 'charge') return `Total ${totWords(k, level)}`;
  if (k.kind === 'super') return `${fxWords(lvlFx(k.fx, level))}, ${E.scaleNum(k.aoe, level)} to all`;
  if (k.kind === 'luck') return `+${1 + level} magic / +${E.scaleNum(E.LUCK.mid, level)} / +${E.scaleNum(E.LUCK.top, level)} attack`;
  return fxWords(lvlFx(k.fx, level));
}
// What one upgrade adds, in a few words: "+1 each charge (+4 total)", "+1 die", "+1 block".
export function upgradeLine(k, level = 0) {
  const nx = level + 1;
  if (k.kind === 'charge') {
    const a = E.chargeValues(k, k.max, level); const b2 = E.chargeValues(k, k.max, nx); const t0 = E.chargeGain(k, k.max, level); const t1 = E.chargeGain(k, k.max, nx);
    const fs = Object.keys(a); const words = fs.map((f) => (f === 'heal' ? 'heal' : NAME[f] || f)); const ds = fs.map((f) => b2[f].map((x, i) => x - a[f][i]));
    if (ds.every((d) => d.every((x) => x === ds[0][0]))) return `+${ds[0][0]} ${words.join(' and ')} each charge (+${t1[fs[0]] - t0[fs[0]]} ${fs.length > 1 ? 'each' : 'total'})`;
    return fs.map((f, i) => `+${t1[f] - t0[f]} ${words[i]} total`).join(', ');
  }
  if (k.kind === 'dice') return `+1 die (${k.dice.n + nx}d${k.dice.s})`;
  if (k.kind === 'scale') return `+1 die for the same magic`;
  if (k.kind === 'round') { const r = Math.max(4, k.minRound || 0); return `+${E.roundGain(k, r, nx) - E.roundGain(k, r, level)} attack in round ${r}, more later`; }
  if (k.kind === 'luck') return `+1 magic, +${E.scaleNum(E.LUCK.mid, nx) - E.scaleNum(E.LUCK.mid, level)} / +${E.scaleNum(E.LUCK.top, nx) - E.scaleNum(E.LUCK.top, level)} attack`;
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
    const need = !reset && !st.early && !st.spent && (p.x ?? k.cost) > b.magic ? (p.x ?? k.cost) - b.magic : 0; // cannot pay yet: greyed, and how much short
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
  const needOf = (u) => (!reset && u.cost && u.cost > b.magic ? u.cost - b.magic : 0);
  const utilTiles = utils.map((u, i) => h('button', { type: 'button',
    class: `pw-medal pw-umedal at-U${i} t-${u.tone} st-${(u.why && !soft(u)) || needOf(u) ? 'low' : 'ready'} ${sel === u.id ? 'on' : ''}`, 'data-power': u.id, 'aria-pressed': String(sel === u.id), 'aria-label': `${u.name}. ${u.text}${needOf(u) ? ` Need ${needOf(u)} more magic.` : ''}`,
    onclick: () => { if (soft(u)) sfx.error?.(); ctx.select(u.id); } }, // a helper that cannot help now still opens its panel, which says why in words and rests its button
    h('span', { class: 'pw-ring' }, h('span', { class: 'pw-core' }, glyph(u, 'pw-g'))), costBadge(u),
    h('span', { class: 'pw-name' }, u.name), needOf(u) ? h('span', { class: 'pw-tag low' }, `NEED ${needOf(u)}`) : null));
  const detail = null;
  return h('div', { class: `pw-sigil sel-${selSlot} ${reset ? 'is-reset' : ''}` },
    tally, powerRows(ctx, sel)); // mp8: no tabs, the six rows (detail/medal/utilRow kept for reference, unused)
  void detail; void utilTiles; void medal; void tri;
}
const canRecharge = (k) => !k.atwill && k.kind !== 'super';
function isReady(p, reset) { const { k, st } = p; return reset ? false : !st.spent && !st.early && p.afford; }
// mp7 (Dave picked mockup A: "3 rows is perfect"): A, B and C at once, one row each: name + small tag, ▲cost (with −/+ for a scale power),
// what you get in icons, and the row's own Cast button. The same ctx.use / ctx.step / ctx.recharge the old detail used; no rule changes.
function powerRow(ctx, p, sel) {
  const { b, reset } = ctx; const { k, st, stored } = p; const x = p.x ?? k.cost; const level = p.level || 0;
  const when = k.atwill ? 'Every round' : k.kind === 'super' ? 'Super' : 'Once a battle';
  const why = reset ? (st.spent && canRecharge(k) ? (b.magic < ctx.rechargeCost ? `Need ${ctx.rechargeCost}` : '') : 'Roll first')
    : st.spent ? (k.atwill ? 'Used' : 'Spent') : st.early ? `Round ${k.minRound}+` : b.magic < x ? `Need ${x - b.magic}` : '';
  const tag = why && why !== 'Roll first' ? why : k.kind === 'charge' && stored != null ? `${when} · ${stored}/${k.max}` : when;
  const icons = (() => {
    if (k.kind === 'dice' || k.kind === 'scale') { const n = k.kind === 'dice' ? k.dice.n + level : E.powerDice(k, x, level); const f = k.dice.to;
      return n <= 4 ? Array.from({ length: n }, () => HK.icon(FX_ICON[f] || 'magic')) : [HK.icon(FX_ICON[f] || 'magic'), h('b', {}, `×${n}`)]; }
    return buyItems(k, { x, round: b.round, level, stored }).map((it) => [...it.childNodes].slice(0, 2)).flat();
  })();
  const scale = k.kind === 'scale' && !st.spent && !reset;
  const pay = h('span', { class: 'pr-pay' },
    scale ? h('button', { type: 'button', class: 'pr-step', 'aria-label': 'Less magic, one die fewer', disabled: x <= k.cost, onclick: () => ctx.step(k.id, x - E.scaleStep(k)) }, '−') : null,
    h('span', { class: 'pr-cost' }, HK.icon('magic'), h('b', {}, String(x))),
    scale ? h('button', { type: 'button', class: 'pr-step', 'aria-label': 'More magic, one more die', disabled: x + E.scaleStep(k) > Math.min(E.scaleMax(k, level), Math.max(k.cost, b.magic)), onclick: () => ctx.step(k.id, x + E.scaleStep(k)) }, '+') : null);
  const relOk = k.kind === 'charge' && stored > 0 && !reset && !(b.usedRound && (b.usedRound[`${k.id}:release`] || b.usedRound[k.id]));
  const castable = reset ? st.spent && canRecharge(k) : true;
  const go = reset ? (castable ? h('button', { type: 'button', class: 'pw-btn go pr-go', disabled: !!why, onclick: () => ctx.recharge(k.id) }, `Recharge · ${ctx.rechargeCost}`) : h('button', { type: 'button', class: 'pw-btn go pr-go', disabled: true }, `Cast · ${x}`))
    : h('button', { type: 'button', class: 'pw-btn go pr-go', disabled: !!why, 'aria-label': `${k.kind === 'charge' ? 'Store a charge of' : 'Cast'} ${k.name} for ${x} magic`, onclick: () => ctx.use(k.id) }, k.kind === 'charge' ? `Store · ${x}` : `Cast · ${x}`);
  const friends = k.kind === 'luck' && !reset && D.CLASS2.on && D.CLASS2.verse && Array.isArray(b.fighters) ? b.fighters.map((f, j) => ({ f, j })).filter(({ f, j }) => j !== b.active && f.hp > 0) : [];
  if (friends.length) { // mp8: Lucky Verse at a table asks who it is for, right in its row: Me (attack) or a friend (the same number as healing)
    const fb = [h('button', { type: 'button', class: 'pw-btn go pr-go pr-for', disabled: !!why, 'aria-label': `Cast ${k.name} for me, ${x} magic`, onclick: () => ctx.use(k.id) }, `Me · ${x}`),
      ...friends.map(({ f, j }) => h('button', { type: 'button', class: 'pw-btn go pr-go pr-for friend', disabled: !!why, 'aria-label': `Cast ${k.name} for ${f.hero.name} (heals), ${x} magic`, onclick: () => ctx.use(k.id, { to: j }) }, HK.icon('heal'), f.hero.name.split(' ')[0]))];
    return h('div', { class: `pr-row t-${toneOf(k)} ${why && why !== 'Roll first' ? 'off' : ''}`, 'data-row': k.id },
      h('span', { class: 'pr-id' }, h('b', { class: 'pr-name' }, k.name), h('small', { class: `pr-tag ${why && why !== 'Roll first' ? 'low' : ''}` }, tag)),
      pay, h('span', { class: `pr-get t-${toneOf(k)}` }, icons), h('span', { class: 'pr-acts pr-fors' }, fb));
  }
  const rel = relOk ? h('button', { type: 'button', class: 'pw-btn alt pr-rel', 'aria-label': `Release ${stored} charge${stored > 1 ? 's' : ''}`, onclick: () => ctx.use(k.id, { release: true }) }, `Release ${stored}`) : null;
  return h('div', { class: `pr-row t-${toneOf(k)} ${sel === k.id ? 'on' : ''} ${why && why !== 'Roll first' ? 'off' : ''}`, 'data-row': k.id },
    h('span', { class: 'pr-id' }, h('b', { class: 'pr-name' }, k.name), h('small', { class: `pr-tag ${why && why !== 'Roll first' ? 'low' : ''}` }, tag)),
    pay, h('span', { class: `pr-get t-${toneOf(k)}` }, icons), h('span', { class: 'pr-acts' }, rel, go));
}
// mp8 (Dave: "We don't need the tabs. What if there are 6 rows!"): Potion, Heal and Heart change as rows too. Their buttons run battle3d.js's own
// actions (u.actions: doBigHeal, doHeal, doNudge); the row is selected first so its result note (B.pwNote) shows in the row.
function utilRow(ctx, u) {
  const { b, reset } = ctx; const need = !reset && u.cost && u.cost > b.magic ? u.cost - b.magic : 0;
  const why = u.why || (need ? `Need ${need}` : '');
  const soft = /full health|no potions/i.test(u.why || '');
  const tagTxt = u.tag || (need ? `Need ${need}` : u.id === 'u:bigheal' ? `${E.potionsLeft(b)} left` : u.id === 'u:heal' ? 'Any time' : 'Once a round');
  const run = (a) => () => { ctx.select(u.id); a.fn(); };
  const pay = h('span', { class: 'pr-pay' }, u.cost ? h('span', { class: 'pr-cost' }, HK.icon('magic'), h('b', {}, String(u.cost))) : h('span', { class: 'pr-cost free' }, h('b', {}, 'FREE')));
  let get; let acts;
  if (u.id === 'u:heart') {
    get = h('span', { class: 'pr-get t-gold pr-heart' }, HK.icon('heart'));
    acts = u.actions.map((a, i) => { const img = (a.content || []).find((n) => n && n.tagName === 'IMG');
      return h('button', { type: 'button', class: `pw-btn go pr-go pr-hc ${i ? 'up' : 'down'}`, disabled: !!u.why || a.disabled, 'aria-label': a.aria, onclick: run(a) }, h('span', { class: 'hc-arrow' }, i ? '▲' : '▼'), img ? img.cloneNode(true) : null); });
  } else {
    const n = u.id === 'u:bigheal' ? E.potionHpOf(b.hero) : E.healAmountOf(b.hero);
    get = h('span', { class: 'pr-get t-heal' }, HK.icon('heal'), h('b', {}, `+${n}`));
    acts = u.actions.map((a) => h('button', { type: 'button', class: `pw-btn go pr-go`, disabled: !!u.why || a.disabled, 'aria-label': a.aria || a.label, onclick: run(a) }, u.id === 'u:bigheal' ? 'Drink' : `Cast · ${u.cost}`));
  }
  const note = u.note ? h('div', { class: `pd-result pr-note t-${u.tone}`, role: 'status' }, HK.icon(u.note.icon || 'heal'), h('b', {}, u.note.big), h('span', {}, u.note.text)) : null;
  return h('div', { class: `pr-row pr-util t-${u.tone} ${why && !soft ? 'off' : ''}`, 'data-row': u.id },
    h('span', { class: 'pr-id' }, h('b', { class: 'pr-name' }, u.name), h('small', { class: `pr-tag ${why ? 'low' : ''}` }, why && soft ? (u.tag || why) : tagTxt)),
    pay, get, h('span', { class: 'pr-acts' }, acts), note);
}
function powerRows(ctx, sel) {
  const order = ['A', 'B', 'C']; const ps = order.map((s) => ctx.powers.find((p) => p.k.slot === s)).filter(Boolean);
  return h('div', { class: 'pw-detail pw-rows', 'aria-label': 'Your powers' }, ps.map((p) => powerRow(ctx, p, sel)), h('i', { class: 'pr-split', 'aria-hidden': 'true' }), ctx.utils.map((u) => utilRow(ctx, u)));
}
function detailPanel(ctx, sel) {
  const { b, reset } = ctx;
  const p = ctx.powers.find((x) => x.k.id === sel);
  if (p) {
    const { k, st, stored } = p; const x = p.x ?? k.cost;
    const when = k.atwill ? 'Every round' : k.kind === 'super' ? `Super · once a battle${k.minRound ? ` · round ${k.minRound}+` : ''}` : 'Once a battle';
    const why = reset ? (st.spent && canRecharge(k) ? (b.magic < ctx.rechargeCost ? `Needs ${ctx.rechargeCost} magic to recharge.` : '') : 'Roll your dice first. Powers are used while you shape your roll.')
      : st.spent ? (k.atwill ? 'Already used this round.' : 'Already used this battle.') : st.early ? `Unlocks in round ${k.minRound}.` : b.magic < x ? `Need ${x - b.magic} more magic (it costs ${x}, you have ${b.magic}).` : '';
    const step = k.kind === 'scale' && !st.spent && !reset ? h('div', { class: 'pw-step', role: 'group', 'aria-label': 'Magic to pour in' },
      h('button', { type: 'button', 'aria-label': 'Less magic, one die fewer', disabled: x <= k.cost, onclick: () => ctx.step(k.id, x - E.scaleStep(k)) }, '–'), h('b', {}, String(x)),
      h('button', { type: 'button', 'aria-label': 'More magic, one more die', disabled: x + E.scaleStep(k) > Math.min(E.scaleMax(k, p.level || 0), Math.max(k.cost, b.magic)), onclick: () => ctx.step(k.id, x + E.scaleStep(k)) }, '+')) : null;
    const relOk = k.kind === 'charge' && stored > 0 && !reset && !(b.usedRound && (b.usedRound[`${k.id}:release`] || b.usedRound[k.id])); // store or release, one a round
    const release = relOk ? h('button', { type: 'button', class: 'pw-btn alt', onclick: () => ctx.use(k.id, { release: true }) }, HK.icon('windup'), `Release ${stored} charge${stored > 1 ? 's' : ''}`) : null;
    const main = reset ? (st.spent && canRecharge(k) ? h('button', { type: 'button', class: 'pw-btn go', disabled: !!why, onclick: () => ctx.recharge(k.id) }, HK.icon('reroll'), `Recharge · ${ctx.rechargeCost}`) : null)
      : h('button', { type: 'button', class: 'pw-btn go has-after', disabled: !!why, onclick: () => ctx.use(k.id) }, HK.icon('magic'), h('span', { class: 'pb-lines' }, h('b', {}, k.kind === 'charge' ? `Store a charge · ${x}` : `Cast · ${x} magic`)));
    // Verse for a friend (CLASS2.verse, the lab): at a table Lucky Verse asks who it is for. You: attack, as now. A friend: the same number as healing.
    const friends = k.kind === 'luck' && !reset && D.CLASS2.on && D.CLASS2.verse && Array.isArray(b.fighters) ? b.fighters.map((f, j) => ({ f, j })).filter(({ f, j }) => j !== b.active && f.hp > 0) : [];
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
      h('p', {}, reset ? 'Roll first, then cast while you shape your dice. Tap one to read it.' : 'Choose A, B or C to inspect a power. Use the helper row for potions, healing and heart changes.'));
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
export function castReveal(host, { k, r, gains, round = 1, level = 0, inline = null }) {
  return new Promise((resolve) => {
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const tone = r.released ? TONE[Object.keys(r.per || perOf(k))[0]] || toneOf(k) : toneOf(k);
    const timers = []; const later = (ms, fn) => timers.push(setTimeout(fn, reduced ? 0 : ms));
    let shut = false; let done = false;
    const total = Object.values(gains).reduce((a, v) => a + v, 0);
    const close = () => { if (shut) return; shut = true; timers.forEach(clearTimeout); (inline ? card : layer).classList.add('out'); sfx.uiClose?.(); setTimeout(() => { if (inline) { card.remove(); inline.classList.remove('pw-casting'); } else layer.remove(); resolve(); }, 220); };
    const adds = Object.keys(gains).some((f) => !['free', 'weaken'].includes(f)); // a free reroll or softer hits do not add to a counter
    const ok = h('button', { type: 'button', class: 'dr-ok', disabled: true, onclick: close }, adds && !r.charged ? (r.rolls?.length && !(k.kind === 'luck') ? `Add ${r.total} to my roll` : 'Add it to my roll') : 'Got it');
    const shown = new Set(); // what the art already shows in full (its chips are not repeated under it)
    const chips = h('div', { class: 'dr-gains' });
    const finish = (delay = 380) => later(delay, () => { if (done) return; done = true; chips.replaceChildren(...Object.entries(gains).filter(([f]) => !shown.has(f)).map(([f, v]) => chip(f, v))); card.classList.add('done'); ok.disabled = false; ok.focus?.(); sfx.coin?.(); });
    const art = h('div', { class: 'cr-art' });
    const kicker = r.released ? 'Release' : r.charged ? 'Charge stored' : k.kind === 'super' ? 'Super power' : k.atwill ? 'Every-round power' : 'Big move';
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
      const faces = r.rolls.map((v, i) => { const n = h('b', {}, String(1 + Math.floor(Math.random() * sides))); return { v, n, el: h('div', { class: `dr-die d${sides} t-${luck ? 'gold' : to} rolling`, style: { '--i': i } }, h('span', { class: 'dr-shape' }), n) }; });
      const tot = h('b', { class: 'dr-total' }, '0');
      art.append(h('p', { class: 'dr-what' }, luck ? 'Roll a d6 for luck.' : `Rolling ${faces.length}d${sides} for ${NAME[to]}.`), h('div', { class: `dr-dice n${Math.min(faces.length, 6)}` }, faces.map((f) => f.el)));
      const table = luck ? h('div', { class: 'cr-luck' }, [[[1, 2], 'magic', `+${1 + level} magic`], [[3, 4], 'atk', `+${E.scaleNum(E.LUCK.mid, level)} attack`], [[5, 6], 'atk', `+${E.scaleNum(E.LUCK.top, level)} attack, +1 magic`]].map(([[a, b2], t, txt]) => h('div', { class: `cl-row t-${t}`, 'data-a': a, 'data-b': b2 }, h('b', {}, `${a}–${b2}`), h('span', {}, txt)))) : h('div', { class: 'dr-sum' }, h('span', { class: 'dr-eq' }, '='), tot, h('span', { class: `dr-kind t-${to}` }, HK.icon(FX_ICON[to] || 'atk'), NAME[to]));
      art.append(table); if (!luck) shown.add(to);
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
        h('div', { class: 'cr-note' }, h('small', {}, 'Release them now for'), h('div', { class: 'cr-now' }, now)));
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
      const word = f === 'weaken' ? `Monsters hit ${v} softer this round` : f === 'free' ? `A free reroll of ${v} dice, ready to use` : `${NAME[f] || f} this round`;
      const big = h('div', { class: `cr-stamp t-${TONE[f] || 'magic'}` }, h('span', { class: 'cs-ring' }, HK.icon(FX_ICON[f] || 'magic')), h('b', {}, f === 'free' ? `${v}` : f === 'weaken' ? `−${v}` : `+${v}`));
      art.append(big, h('p', { class: 'dr-what' }, word)); shown.add(f);
      later(120, () => { big.classList.add('in'); sfx.magic?.(); });
      finish(800); skip = () => { big.classList.add('in'); finish(0); };
    }
    void total; void level;
    timers.push(setTimeout(() => { if (!shut && done) close(); }, 30000)); // a real 30 s even with reduced motion (it used to close at once)
  });
}
