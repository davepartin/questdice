// CONCEPT card template (docs only). renderCard(kind, data) and renderBack(kind) return DOM nodes.
// Every word and number is live text from the game's own data; images are only text-free layers.
// Read-only imports from the game (never modified here):
import { WEAPONS, RARITY, isLegendary } from '../../../../js/data.js';
import { weaponFaces, makeWeapon, sellValue, battlesLeft, battlesFull, wearLabel, weaponSize } from '../../../../js/engine.js';
import { BONUS_GOALS, bonusStake, bonusG, CARDS, gOf } from '../../../../js/secrets.js';

const ART = new URL('../weapons/art/', import.meta.url).href;
const OLD = new URL('../art/', import.meta.url).href;
const BACKS = new URL('../backs/', import.meta.url).href;
// One painted master per weapon TYPE. A type that is missing here gets the labelled placeholder silhouette.
export const WEAPON_ART = { dagger: 'dagger', sword: 'sword', mace: 'mace', axe: 'axe', spear: 'spear', shield: 'shield', tower: 'tower', bow: 'bow', quiver: 'quiver' }; // T14: the six active types painted
const BAKED_TINT = Object.fromEntries(['dagger', 'axe', 'spear', 'shield', 'tower', 'bow', 'quiver'].map((k) => [k, ['bronze', 'silver', 'gold']])); // baked gradient-map tints (WEAPON_ART.md) // types with baked metal files; others use the CSS tint below

// Symbol colours from css/powers.css (.t-pierce #ff8a1a, .t-magic #b46cff, .t-heal #38e87a, .t-gold #ffc21a, .t-atk #ff4b4b, .t-block #3aa4ff).
export const SYM = {
  pierce: { c: '#ff8a1a', d: 'M12 2 L21 11.2 H15.2 V22 H8.8 V11.2 H3 Z' },
  magic: { c: '#b46cff', d: 'M12 2.4 L22.2 20.6 H1.8 Z' },
  heal: { c: '#38e87a', d: 'M9.4 3 H14.6 V9.4 H21 V14.6 H14.6 V21 H9.4 V14.6 H3 V9.4 H9.4 Z' },
  gold: { c: '#ffc21a', d: 'M12 2.4 A9.6 9.6 0 1 0 12.01 2.4 Z' },
  atk: { c: '#ff4b4b', d: 'M12 1 L14.4 6.3 L19.8 4.2 L17.7 9.6 L23 12 L17.7 14.4 L19.8 19.8 L14.4 17.7 L12 23 L9.6 17.7 L4.2 19.8 L6.3 14.4 L1 12 L6.3 9.6 L4.2 4.2 L9.6 6.3 Z' },
  block: { c: '#3aa4ff', d: 'M12 2.4 L20 5.4 V12 C20 17 16.6 20.4 12 22 C7.4 20.4 4 17 4 12 V5.4 Z' },
  star: { c: '#ffe08a', d: 'M12 2 L20 12 L12 22 L4 12 Z' }, // anything else (splash, loot ...)
};
const svg = (k, cls = '') => { const s = SYM[k] || SYM.star; return `<svg class="${cls}" viewBox="0 0 24 24" style="color:${s.c}"><path fill="currentColor" d="${s.d}"/></svg>`; };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

// ---- weapon data, derived (nothing typed by hand)
export function weaponData(id, rarity = 0, size = 4, left) {
  const def = WEAPONS[id]; const inst = makeWeapon(id, rarity, () => 0.5, size); if (left != null) inst.left = left;
  const faces = weaponFaces(inst);
  const kinds = [...new Set(faces.flatMap((f) => [...Object.keys(f.fx || {}), ...(f.plus ? [def.lean === 'def' ? 'block' : 'atk'] : [])]))];
  return {
    id, name: def.name, metal: isLegendary(inst) ? 'Legendary' : RARITY[rarity], hands: def.hands, size: weaponSize(inst),
    left: battlesLeft(inst), full: battlesFull(inst), wear: wearLabel(inst), sell: sellValue(inst), faces,
    accents: kinds.length ? kinds : [def.lean === 'def' ? 'block' : 'atk'],
  };
}
function weaponArt(d) {
  const key = WEAPON_ART[d.id] || WEAPON_ART[WEAPONS[d.id]?.model];
  if (!key) return `<div class="ph"><svg viewBox="0 0 64 64"><path d="M50 6 L58 14 L26 46 L20 40 Z M18 38 L26 46 L22 50 L14 42 Z M14 44 L20 50 L10 60 L4 54 Z" fill="currentColor"/></svg><span>${esc(d.name)}<br><small>art to come</small></span></div>`;
  const m = d.metal.toLowerCase(); const baked = BAKED_TINT[key]?.includes(m);
  return `<img class="art tint-${baked ? 'none' : m}" src="${ART}${key}-${baked ? m + '-' : ''}512.webp" alt="${esc(d.name)}">`;
}
const faceTile = (f) => `<div class="fc ${f.c}${f.v === 0 ? ' z' : ''}">${f.v}${Object.entries(f.fx || {}).map(([k, n]) => `<i>${svg(k)}${n}</i>`).join('')}${f.plus ? `<i>${svg('atk')}+${f.plus}</i>` : ''}</div>`;
const corners = (ks) => [0, 1, 2, 3].map((i) => `<span class="cn c${i + 1}">${svg(ks[i % ks.length])}</span>`).join('');

// ---- objective data (Bonus Goals: js/secrets.js:243-256; stake x BONUS_RETURN)
export function objectiveData(id, act = 2) {
  const g = BONUS_GOALS[id]; return { id, name: g.name, rule: g.rule, stake: bonusStake(act), back: bonusG(act), net: bonusG(act) - bonusStake(act) };
}
// ---- secret objective / wager data (envelope CARDS: js/secrets.js:34-90; sums mirror rewardChips, secrets.js:146-152)
const r5 = (n) => Math.max(5, Math.round(n / 5) * 5);
export function secretData(id, act = 2) {
  const d = CARDS[id]; const G = gOf(act);
  const chips = d.kind === 'rival' ? [d.doubles ? `Win: double gold (up to ${2 * G})` : `Win ${G} gold`]
    : d.kind === 'bribe' && d.mode === 'offer' ? [`Win ${2 * G} gold`, `Fail: pay ${Math.round(G / 2)}`]
      : d.kind === 'bribe' ? [`Win ${G} gold`] : [`Win ${r5((d.pay || 1) * G)} gold`];
  // T13 wager audit (WAGERS.md): an accepted offer pays 2G if it is done AND the team wins, 0 if the team wins without it, and costs
  // G/2 if the team loses, done or not (secrets.js:201). The old "Fail: pay G/2" chip was wrong for a win without the deed.
  return { id, name: d.name, kind: d.kind, mode: d.mode, flavor: d.flavor, rule: d.rule.replace('{spare}', 'that monster'), chips, win: 2 * G, fail: Math.round(G / 2), honor: [r5(G / 4), r5(G / 2)] };
}

const LABEL = { weapon: 'Weapon', objective: 'Bonus Challenge', 'secret-objective': 'Secret Objective', wager: 'Wager' };
export function renderCard(kind, d) {
  if (kind === 'weapon') return el(`<article class="qc qc-weapon" data-kind="weapon">
    <div class="win scene-forge">${weaponArt(d)}</div><img class="fr" src="${ART}front-frame.webp" alt="">${corners(d.accents)}
    <div class="name">${esc(d.name)}</div>
    <div class="meta"><span class="m-${d.metal.toLowerCase()}">${esc(d.metal)}</span><span>d${d.size}</span><span>${esc(d.wear)}</span></div>
    <div class="faces n${d.faces.length}">${d.faces.map(faceTile).join('')}</div>
    <div class="sell"><small>${esc(d.moneyLabel || 'Sell')}</small>${svg('gold')}${d.money ?? d.sell}</div></article>`);
  const isObj = kind === 'objective';
  const stakes = isObj ? `<div class="stk"><div><small>Stake</small><b>${d.stake}</b></div><div><small>Paid back</small><b>${d.back}</b></div><div class="net"><small>Win</small><b>+${d.net}</b></div></div>`
    : kind === 'wager' ? `<div class="stk"><div class="net"><small>Done, team wins</small><b>+${d.win}</b></div><div><small>Not done, team wins</small><b>0</b></div><div class="bad"><small>Team loses</small><b>−${d.fail}</b></div></div>`
      : `<div class="chips">${d.chips.map((c) => `<span>${esc(c)}</span>`).join('')}</div>`;
  const HEART = new URL('../../../../assets/tutorial/heart-6.png', import.meta.url).href;
  const art = kind === 'secret-objective' ? `<img class="art obj heart" src="${HEART}" alt="">` : d.id === 'nopotion' ? `<img class="art obj" src="${OLD}potion.webp" alt=""><i class="nogo"></i>` : `<div class="emb">${svg(isObj ? 'star' : 'gold')}</div>`;
  return el(`<article class="qc qc-${kind}" data-kind="${kind}">
    <div class="win scene-${kind}">${art}</div><img class="fr" src="${ART}front-frame.webp" alt="">${corners([kind === 'wager' ? 'gold' : 'star'])}
    <div class="name">${esc(d.name)}</div>
    <div class="obox"><div class="okind">${LABEL[kind]}</div><p class="orule">${esc(d.rule)}</p>${stakes}</div></article>`);
}
// Backs: the approved painted backs; the live plate covers the concept's painted word (final art will ship with a blank plate).
const BACK = { weapon: 'back-weapon', objective: 'back-objective', 'secret-objective': 'back-secret-objective', wager: 'back-wager' };
export const renderBack = (kind) => el(`<article class="qc qb qb-${kind}"><img class="fr" src="${BACKS}${BACK[kind]}.webp" alt=""><div class="plate">${LABEL[kind] === 'Bonus Challenge' ? 'Objective' : LABEL[kind]}</div></article>`);
export const ALL = { WEAPONS, BONUS_GOALS, CARDS, RARITY };
