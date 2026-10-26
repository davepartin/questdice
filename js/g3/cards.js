// The approved card presentation (T11 to T14; art by the art director). A card is drawn from the game's own data, so every word,
// number and die face is live text and a change to a price, a wear rule or a face shows up here by itself. The images are only
// text-free layers (frame, scene, painted weapon). Everything in this module only READS: it never calls a wear, sell, buy or save
// function, so drawing a card cannot change a weapon or a hero (test/cards.test.mjs checks that).
import { WEAPONS, RARITY, WEAPONS2, EXPERIMENT, WEAPON_SIZE, tierName, isLegendary } from '../data.js';
import { priceChipHtml } from './price.js'; // the one shared price chip
import { weaponFaces, weaponSize, battlesLeft, wearLabel, sellValue, diamondSellValue } from '../engine.js';
import { BONUS_GOALS, CARDS, bonusStake, bonusG, rewardChips, rewardTerms, gOf } from '../secrets.js';

const ART = new URL('../../assets/cards/', import.meta.url).href;
const WART = `${ART}weapons/`;
// One painted master per weapon TYPE. A type missing here gets the labelled silhouette; a legendary uses its model's art.
export const WEAPON_ART = { dagger: 'dagger', sword: 'sword', mace: 'mace', axe: 'axe', spear: 'spear', shield: 'shield', tower: 'tower', bow: 'bow', quiver: 'quiver' };
// baked steel-only tints (wood and leather keep their colour); the mace has only the neutral file
const BAKED = new Set(['dagger', 'sword', 'axe', 'spear', 'shield', 'tower', 'bow', 'quiver']);

// Symbol colours from css/powers.css
export const SYM = {
  pierce: { c: '#ff8a1a', d: 'M12 2 L21 11.2 H15.2 V22 H8.8 V11.2 H3 Z' },
  magic: { c: '#b46cff', d: 'M12 2.4 L22.2 20.6 H1.8 Z' },
  heal: { c: '#38e87a', d: 'M9.4 3 H14.6 V9.4 H21 V14.6 H14.6 V21 H9.4 V14.6 H3 V9.4 H9.4 Z' },
  gold: { c: '#ffc21a', d: 'M12 2.4 A9.6 9.6 0 1 0 12.01 2.4 Z' },
  atk: { c: '#ff4b4b', d: 'M12 1 L14.4 6.3 L19.8 4.2 L17.7 9.6 L23 12 L17.7 14.4 L19.8 19.8 L14.4 17.7 L12 23 L9.6 17.7 L4.2 19.8 L6.3 14.4 L1 12 L6.3 9.6 L4.2 4.2 L9.6 6.3 Z' },
  block: { c: '#3aa4ff', d: 'M12 2.4 L20 5.4 V12 C20 17 16.6 20.4 12 22 C7.4 20.4 4 17 4 12 V5.4 Z' },
  arrow: { c: '#e8e2d4', d: 'M12 1.5 L19 12 L14.6 10.4 V22.5 H9.4 V10.4 L5 12 Z' },
  star: { c: '#ffe08a', d: 'M12 2 L20 12 L12 22 L4 12 Z' },
};
export const ico = (k, cls = '') => { const s = SYM[k] || SYM.star; return `<svg class="${cls}" viewBox="0 0 24 24" style="color:${s.c}" aria-hidden="true"><path fill="currentColor" d="${s.d}"/></svg>`; };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

// ---- weapon data, read from a real instance (nothing typed by hand)
// Arrows: the badge follows inst.ammo, with the same default weaponFaces uses (engine.js): defaultAmmo, else normal.
export const ammoOf = (inst) => (inst.id !== 'quiver' ? null : WEAPONS2.ammo[inst.ammo] ? inst.ammo : WEAPONS2.ammo[WEAPONS2.defaultAmmo] ? WEAPONS2.defaultAmmo : 'normal');
// T17 (EXPERIMENT.weaponSize, preview only): the card as Dave's mockup shows it: one row per size, the faces each size adds, and a cardboard dice cover
// over every size not yet bought. Needs the cumulative face table; without it (or for a Diamond, a legendary, Fists) the plain tray is shown.
const SIZES17 = [4, 6, 8, 10];
export function sizeRows(inst) {
  if (!EXPERIMENT.weaponSize || !WEAPON_SIZE.ladder || inst.diamond || inst.id === 'fists' || WEAPONS[inst.id]?.legendary) return null;
  const size = weaponSize(inst); let prev = 0; const rows = [];
  for (const s of SIZES17) { const faces = weaponFaces({ ...inst, size: s }); if (faces.length !== s) return null; rows.push({ size: s, from: prev, faces, owned: s <= size, price: prev ? WEAPON_SIZE.prices[prev] : 0 }); prev = s; }
  return rows;
}
export function weaponData(inst, money) {
  const def = WEAPONS[inst.id]; const faces = weaponFaces(inst); const ammo = ammoOf(inst);
  const kinds = [...new Set(faces.flatMap((f) => [...Object.keys(f.fx || {}), ...(f.plus ? [def.lean === 'def' ? 'block' : 'atk'] : [])]))];
  const sell = inst.id === 'fists' ? 0 : inst.diamond ? diamondSellValue(inst) : sellValue(inst);
  return {
    rows: sizeRows(inst), id: inst.id, name: def.name, metal: tierName(inst), hands: def.hands, size: weaponSize(inst),
    ammo, ammoName: ammo ? WEAPONS2.ammo[ammo] : null,
    left: battlesLeft(inst), wear: inst.id === 'fists' ? '' : wearLabel(inst), sell, faces,
    // what the gold figure is called: Sell (what the pack pays) or Store (what the shelf charges); the caller says which
    moneyLabel: money?.label || 'Sell', money: money?.value ?? sell,
    accents: kinds.length ? kinds : [def.lean === 'def' ? 'block' : 'atk'],
  };
}
const artKey = (d) => WEAPON_ART[d.id] || WEAPON_ART[WEAPONS[d.id]?.model];
const bakedMetal = (d, key) => (BAKED.has(key) && !isLegendaryId(d.id) && RARITY.includes(d.metal) ? d.metal.toLowerCase() : '');
const isLegendaryId = (id) => isLegendary({ id });
function weaponArt(d) {
  const key = artKey(d);
  if (!key) return `<div class="ph"><svg viewBox="0 0 64 64"><path d="M50 6 L58 14 L26 46 L20 40 Z M18 38 L26 46 L22 50 L14 42 Z M14 44 L20 50 L10 60 L4 54 Z" fill="currentColor"/></svg><span>${esc(d.name)}<br><small>art to come</small></span></div>`;
  const m = bakedMetal(d, key);
  return `<img class="art${m ? '' : ' tint-' + d.metal.toLowerCase()}" src="${WART}${key}-${m ? m + '-' : ''}512.webp" alt="${esc(d.name)}">`;
}
// ---- the face tile: "+N" as the die prints it, an attack starburst or block shield with its word, the bonus icons as on the die
const KIND = { r: { k: 'atk', w: 'ATK', long: 'attack' }, b: { k: 'block', w: 'BLK', long: 'block' } };
export function face(f) {
  const K = KIND[f.c === 'b' ? 'b' : 'r'];
  const icons = [...Array(f.plus || 0).fill(K.k), ...Object.entries(f.fx || {}).flatMap(([k, n]) => Array(Math.min(3, n | 0)).fill(k === 'loot' ? 'gold' : k))];
  const head = f.arrow ? `<i class="ah am-${f.arrow}">${ico('arrow')}</i>` : ''; // an arrowhead face: the selected ammunition pays
  return `<div class="f13 ${f.c === 'b' ? 'b' : 'r'}${f.v === 0 ? ' z' : ''}" aria-label="${f.arrow ? f.arrow + ' arrowhead, ' : ''}${K.long} +${f.v}${icons.length ? ', ' + icons.join(' ') : ''}">
    <span class="k">${ico(K.k)}<em>${K.w}</em></span><b>${head}+${f.v}</b><span class="fx">${icons.map((k) => ico(k)).join('')}</span></div>`;
}
const corners = (ks) => [0, 1, 2, 3].map((i) => `<span class="cn c${i + 1}">${ico(ks[i % ks.length])}</span>`).join('');
const metalClass = (d) => `metal-${d.metal.toLowerCase()}`;

// ---- the cards
const LABEL = { weapon: 'Weapon', objective: 'Objective', 'secret-objective': 'Secret Objective', wager: 'Secret Objective, offered bribe' };
// The weapon card (T05, Grok's T17 rev 14 look in current-rule mode): painted art on top, the title, one tray holding every face of the weapon's REAL die
// as a photographed die, corner badges for the bonus types it carries. Words and numbers are the game's own data, so a price, a face or a wear rule that
// changes shows up here by itself. No upgrade covers and no size rows: size purchase is not a released rule. The gold figure is a label, not a button
// (selling and equipping stay on the screens that own them). The dice are drawn by js/g3/dice3d.js (WebGL), on demand, cached by the faces that make them.
const SOCK = [[8.75, 5.8], [90.97, 5.8], [8.47, 93.3], [91.39, 93.35]]; // the badge sockets of frame-t17.webp, % of width / height
const BADGE_METAL = { Bronze: ['#ffe2c0', '#c98a52', '#7a4a22', '#3a2010'], Silver: ['#ffffff', '#c9d1dd', '#7d8796', '#2c323c'], Gold: ['#fff4c8', '#f0c45a', '#a8761c', '#4a3006'], Diamond: ['#ffffff', '#cfeaff', '#8fb6d8', '#2a3a4c'] };
const ENAMEL = { pierce: ['#ffb45a', '#e86a0a'], heal: ['#7af0a8', '#14a850'], magic: ['#d4a4ff', '#8a3ee8'], gold: ['#ffe27a', '#d8960a'], atk: ['#ff7a7a', '#c81e28'], block: ['#7ac4ff', '#1a6ad8'], star: ['#ffeaa8', '#c8a040'] };
let badgeUid = 0;
export function badge(kind, metal) {
  const [m0, m1, m2, m3] = BADGE_METAL[metal] || BADGE_METAL.Silver; const [e0, e1] = ENAMEL[kind] || ENAMEL.star; const p = (SYM[kind] || SYM.star).d; const i = ++badgeUid;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs>
<linearGradient id="bR${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m0}"/><stop offset=".35" stop-color="${m1}"/><stop offset=".7" stop-color="${m2}"/><stop offset="1" stop-color="${m3}"/></linearGradient>
<linearGradient id="bF${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m2}"/><stop offset=".55" stop-color="${m1}"/><stop offset="1" stop-color="${m0}"/></linearGradient>
<radialGradient id="bD${i}" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#3c3732"/><stop offset=".6" stop-color="#16130f"/><stop offset="1" stop-color="#050404"/></radialGradient>
<linearGradient id="bE${i}" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${e0}"/><stop offset="1" stop-color="${e1}"/></linearGradient></defs>
<circle cx="50" cy="50" r="49" fill="url(#bR${i})"/><circle cx="50" cy="50" r="42.5" fill="url(#bF${i})"/><circle cx="50" cy="50" r="38" fill="url(#bD${i})"/>
<g transform="translate(50 50) scale(2.4) translate(-12 -12)"><path d="${p}" fill="url(#bR${i})" stroke="url(#bR${i})" stroke-width="1.1" stroke-linejoin="round"/>
<path d="${p}" fill="url(#bE${i})" transform="translate(12 12) scale(.86) translate(-12 -12)"/></g><circle cx="50" cy="50" r="45.6" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="1"/></svg>`;
}
const BADGE_ORDER = ['atk', 'block', 'gold', 'heal', 'pierce', 'magic'];
const badgeKinds = (faces) => { const has = new Set(faces.flatMap((f) => [...(f.plus ? [f.c === 'b' ? 'block' : 'atk'] : []), ...Object.entries(f.fx || {}).filter(([, n]) => n > 0).map(([k]) => (k === 'loot' ? 'gold' : k))])); return BADGE_ORDER.filter((k) => has.has(k)).slice(0, 4); };
const dieIcons = (f) => [...Array(f.plus || 0).fill(f.c === 'b' ? 'block' : 'atk'), ...Object.entries(f.fx || {}).flatMap(([k, n]) => Array(Math.min(4, n | 0)).fill(k === 'loot' ? 'gold' : k)), ...(f.arrow ? [`arrow_${f.arrow}`] : [])];
export const dieFaces = (faces) => faces.map((f) => ({ v: f.v, c: f.c === 'b' ? 'b' : 'r', icons: dieIcons(f) }));
const DIE_SIDES = new Set([4, 6, 8, 10]);
const TRAY = { 4: { cols: 4, w: 16 }, 6: { cols: 3, w: 18 }, 8: { cols: 4, w: 15.6 }, 10: { cols: 4, w: 15.6 } }; // dice per row and each die's width (cqi)
const faceWords = (f) => `${f.arrow ? `${f.arrow} arrowhead, ` : ''}${f.c === 'b' ? 'block' : 'attack'} +${f.v}${(f.plus || Object.keys(f.fx || {}).length) ? ', with bonus symbols' : ''}`;
function weaponArt17(d) {
  const key = artKey(d); const m = key ? bakedMetal(d, key) : '';
  if (key === 'dagger' && ['bronze', 'silver', 'gold'].includes(m)) return `<img class="art9" src="${WART}dagger-${m}-wide.webp" alt="${esc(d.name)}">`;
  if (!key) return `<div class="ph17">${esc(d.name)}<small>art to come</small></div>`;
  return `<div class="win scene-forge"><img class="art${m ? '' : ' tint-' + d.metal.toLowerCase()}" src="${WART}${key}-${m ? m + '-' : ''}512.webp" alt="${esc(d.name)}"></div>`;
}
const figureOf = (f, i) => `<figure class="d17 ${f.c === 'b' ? 'b' : 'r'}${f.v === 0 ? ' z' : ''}" role="img" aria-label="face ${i + 1}: ${faceWords(f)}"><span class="ph17t">+${f.v}</span></figure>`;
const coverHtml = (r) => `<div class="cov tok" role="button" tabindex="0" data-step="${r.size}" aria-label="Dice cover: upgrade d${r.from} to d${r.size} for ${r.price} gold"><span class="ct"><b>UPGRADE</b><small>d${r.from} → d${r.size} · +${r.size - r.from} faces</small></span><span class="cp">${priceChipHtml(r.price)}</span></div>`;
const rowHtml = (r) => `<div class="row s${r.size}${r.owned ? '' : ' locked'}" data-size="${r.size}"><span class="sz"><small>Size</small>d${r.size}</span><div class="dz" data-sides="${r.size}" data-from="${r.from}" data-faces="${esc(JSON.stringify(dieFaces(r.faces)))}" style="--dw:${{ 4: 13.4, 6: 14.2, 8: 14.8, 10: 15 }[r.size]}cqi">${r.owned ? r.faces.slice(r.from).map((f, i) => figureOf(f, r.from + i)).join('') : ''}</div>${r.owned ? '' : coverHtml(r)}</div>`;
export function weaponCardHtml(d) {
  if (d.rows) return weaponCardSized(d);
  const n = d.faces.length; const tray = TRAY[n] || TRAY[4]; const name = `${d.metal} ${d.name}`; const kinds = badgeKinds(d.faces); const df = JSON.stringify(dieFaces(d.faces));
  const tf = name.length > 26 ? 4.2 : name.length > 20 ? 5.2 : 6.4;
  return (`<article class="qc17 qc-weapon metal-${d.metal.toLowerCase()}" data-kind="weapon" aria-label="${esc(`${name}, d${d.size}${d.wear ? ', ' + d.wear : ''}`)}">
    <div class="art17">${weaponArt17(d)}${d.ammoName ? `<div class="ammo am-${d.ammo}">${ico('arrow')}${esc(d.ammoName)}</div>` : ''}${d.money ? `<div class="sell"><small>${esc(d.moneyLabel)}</small>${priceChipHtml(d.money)}</div>` : ''}</div>
    <img class="fr17" src="${ART}frame-t17.webp" alt="">
    <div class="title17"><span style="font-size:${tf}cqi">${esc(name)}</span></div>
    <div class="dice17"><div class="szl"><small>Die</small>d${d.size}${d.wear ? `<em>${esc(d.wear)}</em>` : ''}</div>
      <div class="dz" data-sides="${DIE_SIDES.has(n) ? n : 0}" data-faces="${esc(df)}" style="--cols:${tray.cols};--dw:${tray.w}cqi">${d.faces.map((f, i) => `<figure class="d17 ${f.c === 'b' ? 'b' : 'r'}${f.v === 0 ? ' z' : ''}" role="img" aria-label="face ${i + 1}: ${faceWords(f)}"><span class="ph17t">+${f.v}</span></figure>`).join('')}</div></div>
    ${kinds.map((k, i) => `<span class="pb17" style="left:${SOCK[i][0]}%;top:${SOCK[i][1]}%">${badge(k, d.metal)}</span>`).join('')}</article>`);
}
function weaponCardSized(d) {
  const name = `${d.metal} ${d.name}`; const kinds = badgeKinds(d.rows.filter((r) => r.owned).flatMap((r) => r.faces)); const tf = name.length > 26 ? 4.2 : name.length > 20 ? 5.2 : 6.4;
  return (`<article class="qc17 qc-weapon sized metal-${d.metal.toLowerCase()}" data-kind="weapon" data-size="${d.size}" aria-label="${esc(`${name}, d${d.size}`)}">
    <div class="art17">${weaponArt17(d)}${d.ammoName ? `<div class="ammo am-${d.ammo}">${ico('arrow')}${esc(d.ammoName)}</div>` : ''}${d.money ? `<div class="sell est" title="Provisional: the sale value under Dave's upgrade rule is not final"><small>${esc(d.moneyLabel)} · est.</small>${priceChipHtml(d.money)}</div>` : ''}</div>
    <img class="fr17" src="${ART}frame-t17.webp" alt="">
    <div class="title17"><span style="font-size:${tf}cqi">${esc(name)}</span></div>
    <div class="dice17 rows">${d.rows.map(rowHtml).join('')}</div>
    ${kinds.map((k, i) => `<span class="pb17" style="left:${SOCK[i][0]}%;top:${SOCK[i][1]}%">${badge(k, d.metal)}</span>`).join('')}</article>`);
}
// Photographed dice: built on demand (WebGL, three.js) and cached by the faces; a card shows plain number tiles until its dice are ready, and keeps them if
// graphics are unavailable. One job at a time, a breath between jobs, so a screen with several cards stays responsive.
const DIE_CACHE = new Map(); let dieQueue = Promise.resolve(); let dieMod = null;
const SYM_ALL = { ...SYM };
const placeDice = (dz, urls, from = 0) => { [...dz.querySelectorAll('figure')].forEach((fg, i) => { if (!urls[from + i]) return; const img = new Image(); img.alt = ''; img.decoding = 'async'; img.src = urls[from + i]; fg.replaceChildren(img); fg.classList.add('got'); }); };
export function hydrateDice(root) {
  for (const dz of root.querySelectorAll('.dz[data-faces]:not([data-done])')) {
    const sides = +dz.dataset.sides; const from = +dz.dataset.from || 0; if (!sides || !dz.querySelector('figure')) continue; // a covered row draws nothing until it is bought
    dz.dataset.done = '1'; const key = `${dz.dataset.faces}|${from}`;
    if (DIE_CACHE.has(key)) { placeDice(dz, DIE_CACHE.get(key), from); continue; }
    dieQueue = dieQueue.then(async () => {
      try {
        if (!DIE_CACHE.has(key)) {
          dieMod ||= await import('./dice3d.js'); dieMod.setSymbols(SYM_ALL);
          await new Promise((r) => setTimeout(r, 24)); DIE_CACHE.set(key, dieMod.dieSet(sides, JSON.parse(dz.dataset.faces), { from }));
          if (DIE_CACHE.size > 80) DIE_CACHE.delete(DIE_CACHE.keys().next().value);
        }
        placeDice(dz, DIE_CACHE.get(key), from);
      } catch { /* no WebGL here: the number tiles stay */ }
    });
  }
}
// opts.onBuy(step) -> true when the size was bought, or a short reason (a size card only; without it the covers are for show).
export const weaponCardEl = (d, opts = {}) => { const e = el(weaponCardHtml(d)); hydrateDice(e); if (d.rows) wireSizes(e, d, opts); return e; };
function wireSizes(card, d, { onBuy } = {}) {
  const nextCover = () => card.querySelector('.cov.tok:not(.gone)'); let toastT;
  const say = (t, text) => { card.querySelector('.toast17')?.remove(); const m = document.createElement('div'); m.className = 'toast17'; m.setAttribute('role', 'status'); m.textContent = text; t.closest('.row').append(m); clearTimeout(toastT); toastT = setTimeout(() => m.remove(), 1500); };
  const wiggle = (t) => { t.classList.remove('nope'); void t.offsetWidth; t.classList.add('nope'); };
  const unlock = (t) => { // the cover slides away, then the row's new dice settle in
    card.querySelector('.toast17')?.remove(); clearTimeout(toastT); // a refusal from an earlier tap must not outlive a successful buy
    const row = t.closest('.row'); const size = +row.dataset.size; const r = d.rows.find((x) => x.size === size);
    row.querySelector('.dz').replaceChildren(...[...r.faces.slice(r.from).map((f, i) => { const tpl = document.createElement('template'); tpl.innerHTML = figureOf(f, r.from + i); return tpl.content.firstElementChild; })]);
    t.classList.add('gone'); row.classList.add('reveal'); hydrateDice(row); card.dataset.size = String(size);
    t.addEventListener('animationend', () => { t.remove(); row.classList.remove('locked'); }, { once: true }); setTimeout(() => { if (t.isConnected) { t.remove(); row.classList.remove('locked'); } }, 900);
  };
  const tap = (t) => {
    if (t !== nextCover()) { wiggle(t); say(t, `Upgrade to d${nextCover().dataset.step} first`); return; }
    if (!onBuy) return; const got = onBuy(+t.dataset.step);
    if (got === true) unlock(t); else { wiggle(t); say(t, typeof got === 'string' ? got : 'Not available'); }
  };
  card.addEventListener('click', (e) => { const t = e.target.closest('.cov.tok:not(.gone)'); if (t) { e.stopPropagation(); tap(t); } });
  card.addEventListener('keydown', (e) => { const t = e.target.closest?.('.cov.tok'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tap(t); } });
}
// Objective data from what the game already holds. A Bonus Goal view (secrets.js bonusView) has stake and gold; a secret card's view
// (cardView) has its chips and, for an offer, structured terms. Condition, Stake and Reward are always separate, labelled blocks.
export function objectiveFromView(v) {
  const stake = v.stake || 0; return { id: v.id, name: v.name, rule: v.rule, stake, back: v.gold, net: v.gold - stake, free: !!v.free };
}
export function objectiveData(id, act = 2) { // a Bonus Goal straight from the game's table (the gallery and the tests)
  const g = BONUS_GOALS[id]; return { id, name: g.name, rule: g.rule, stake: bonusStake(act), back: bonusG(act), net: bonusG(act) - bonusStake(act), free: false };
}
export function secretData(id, act = 2) { // an envelope card from CARDS; the same chips and terms the game's own view carries
  const d = CARDS[id]; const env = { act }; const mine = { id, mode: d.kind === 'bribe' && d.mode === 'offer' ? 'offer' : null };
  return { id, name: d.name, kind: d.kind, mode: mine.mode, rule: d.rule.replace('{spare}', 'that monster'), stakes: rewardChips(env, mine), terms: rewardTerms(env, mine), G: gOf(act) };
}
// The Objective and Secret Objective fronts (T05, Grok rev 4): two painted, text-free frames (parchment and brass for the public Objective, dark leather
// and crimson for the Secret Objective), a centre emblem that is the game's own symbol for what the goal is about, and live text for everything else.
// Two decks only: a solo Bonus Goal is an Objective; a secret card and a private offered bribe are Secret Objectives. The words are the game's
// current wording (rewardChips / rewardTerms); nothing here decides what a card pays.
const OBJ_ART = `${ART}objectives/`;
export const OBJ_FOCUS = { nopotion: 'heal', block40: 'block', magic40: 'magic', noreroll: 'magic', deal50: 'atk',
  lead: 'crown', shield: 'block', medic: 'heal', together: 'team', quick: 'windup', spark: 'magic',
  goldrush: 'gold', arcane: 'magic', finisher: 'skull', wall: 'block', bigswing: 'atk', lucky: 'dice', straights: 'straight', fleet: 'boots', strongarm: 'gauntlet', bright: 'helmet', crowd: 'crown',
  thrice: 'dice', mittens: 'gauntlet', thinker: 'helmet', neverlast: 'boots', teetotal: 'heal', biggame: 'skull', thrifty: 'magic', heartmatch: 'heart', cliffhanger: 'heart', saver: 'magic', talentshow: 'talent',
  slacker: 'atk', glass: 'block', cold: 'team', longfight: 'slam', pact: 'heart', fall: 'team', laststand: 'heart',
  goldfumble: 'gold', spare: 'skull', hoarder: 'magic', lonewolf: 'team' };
export const OBJ_TINT = { magic: '#b46cff', gold: '#ffc21a', atk: '#ff4b4b', block: '#3aa4ff', heal: '#38e87a', dice: '#c8b89a', crown: '#ffd86a', straight: '#ffe08a', slam: '#ff7a3a', windup: '#ffd23d', team: '#9fd0ff', heart: '#ff4f7a', skull: '#b8b0a2', helmet: '#d6a456', gauntlet: '#d6a456', boots: '#d6a456', talent: '#f2b84a' };
export const objectiveFocus = (id) => (OBJ_FOCUS[id] && OBJ_TINT[OBJ_FOCUS[id]] ? OBJ_FOCUS[id] : 'gold');
const term = (k, v, cls = '') => `<div class="t ${cls}"><small>${k}</small><span>${v}</span></div>`;
export function objectiveCardHtml(kind, d) {
  const isObj = kind === 'objective'; let terms;
  if (isObj) terms = term('Stake', d.stake ? `<b>${d.stake}</b> gold, paid when you accept` : 'none, a free try') + term('Reward', `<b>${d.back}</b>${d.stake ? ' back' : ' gold'} if done and won${d.stake ? ` · net <b>+${d.net}</b>` : ''}`, 'good') + term('If not', d.stake ? 'the stake is lost, whether it was missed or the fight was lost' : 'nothing is lost', 'bad');
  else if (kind === 'wager') { const t = d.terms; terms = term('Reward', `<b>+${t.win}</b> if done and the team wins`, 'good') + term('Won, not done', '<b>0</b>, nothing lost') + term('Team defeated', `pay <b>${t.fail}</b>, done or not; <b>${t.crooks}</b> more if every bribe was taken`, 'bad') + term('Decline', `Honor <b>+${t.honor[0]}</b>, or <b>+${t.honor[1]}</b> if the team is defeated`); }
  else terms = term('Stake', 'none') + (d.stakes || []).map((c) => term('Reward', esc(c), 'good')).join('');
  const f = objectiveFocus(d.id); const deck = isObj ? 'objective' : 'secret-objective';
  return (`<article class="qo qo-${kind} ${isObj ? 'obj' : 'sec'}${kind === 'wager' ? ' tight' : ''}" data-kind="${kind}" data-focus="${f}" style="--tc:${OBJ_TINT[f]}" aria-label="${esc(`${LABEL[kind]}: ${d.name}`)}">
    <img class="fr" src="${OBJ_ART}front-${deck}-frame.webp" alt=""><i class="tint"></i>
    <div class="in"><div class="chip">${isObj ? 'Objective' : 'Secret Objective'}</div><h2 class="ttl">${esc(d.name)}</h2><div class="emb"><img src="${OBJ_ART}emb-${f}.svg" alt=""></div><p class="goal">${esc(d.rule)}</p><div class="terms">${terms}</div></div></article>`);
}
export const objectiveCardEl = (kind, d) => el(objectiveCardHtml(kind, d));
// The card for an envelope or Bonus Goal screen: bonus (solo) -> objective; an accepted-able offer -> wager; anything else -> secret objective.
export function envelopeCardParts(card, bonus) {
  if (bonus) return ['objective', objectiveFromView(card)];
  if (card.mode === 'offer' && card.terms) return ['wager', card];
  return ['secret-objective', { id: card.id, name: card.name, rule: card.rule, stakes: card.stakes }];
}
export const envelopeCardEl = (card, bonus) => objectiveCardEl(...envelopeCardParts(card, bonus));
export const weaponCardOf = (inst, money, opts) => weaponCardEl(weaponData(inst, money), opts);

// ---- compact views: the 128 px icon of the same painted master, the face strip, the chips
export function icon(d, px = 128) {
  const key = artKey(d);
  if (!key) return `<span class="ic13 ph13" title="art to come">${esc(d.name.slice(0, 1))}</span>`;
  const m = bakedMetal(d, key) && key !== 'mace' ? bakedMetal(d, key) : '';
  return `<img class="ic13" src="${WART}${key}-${m ? m + '-' : ''}${px}.webp" alt="">`;
}
export const strip = (d) => `<div class="strip13">${d.faces.map((f) => `<i class="${f.c === 'b' ? 'b' : 'r'}${f.v === 0 ? ' z' : ''}${f.arrow ? ' ar am-' + f.arrow : ''}">${ico(f.arrow ? 'arrow' : f.c === 'b' ? 'block' : 'atk')}${f.v}${(f.plus || Object.keys(f.fx || {}).length) ? '<u></u>' : ''}</i>`).join('')}</div>`;
export const chips = (d) => `<span class="ch13 m-${d.metal.toLowerCase()}">${esc(d.metal)}</span><span class="ch13">d${d.size}</span>${d.wear ? `<span class="ch13">${esc(d.wear)}</span>` : ''}${d.ammoName ? `<span class="ch13 am-${d.ammo}">${esc(d.ammoName)}</span>` : ''}`;
