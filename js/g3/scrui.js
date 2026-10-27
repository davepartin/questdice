// DOM for the non-battle screens when the 3D world is available: title, hero creation, quest board,
// road events, victory / defeat and camp. Glassy panels over the live scene from screens.js.
// Every game behaviour (saves, passwords, perks, shop, equip, upgrades) is delegated back to ui.js through
// the context handed to bind(); this file only decides what things look like.
import { shortLine, effectLine, upgradeLine, glyph as powerGlyph, toneOf } from './powers.js';
import { ammoLine } from '../ammotext.js';
import { h, $, $$, modal, closeModal, toast } from '../dom.js';
import * as E from '../engine.js';
import * as D from '../data.js';
import * as SV from '../save.js';
import * as R from '../roads.js';
import * as Net from '../net.js';
import * as Coach from '../coach.js';
import { sfx } from '../audio.js';
import { strengthCard, talentsCard, heartCard, weaponCard as cbWeaponCard } from './cardboard.js';
import { world } from './world.js';
import * as SCR from './screens.js';
import { ico, CLASS_ICON } from './icons.js';
import { petImg } from './pets.js';
import { showTrial, statBadge } from './trialui.js';
import * as DAY from '../daily.js';
import { reportRow } from './reportui.js';
import { packList, packOf, packIdOf, monsterOf, partySize, forcedLine, coverClasses, DEFAULT_PACK } from '../campaigns.js';
import { GRID, slotPrice, slotCanBuy } from '../campbuy.js';
import { campDie, campFaceList } from './campart.js';
import * as CW from './cards.js';
import * as CB from './cardboard.js';
import { priceChip } from './price.js'; // the one shared price chip (Dave 26 Oct 2026)

let X = null;
export const bind = (ctx) => { X = ctx; };
export const on = () => !!(world.available && X);
const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const RAR = ['bronze', 'silver', 'gold', 'diamond'];
const CLS_HUE = { knight: '#ff6a4a', ranger: '#7aff9a', wizard: '#6ab8ff', dwarf: '#ffa040', bard: '#4ae8d8' };

// ------------------------------------------------------------------------------------------------ small parts
const tap = (fn) => (e) => { sfx.click(); fn(e); };
function btn(label, onclick, { kind = 'primary', icon, disabled = false, cls = '', aria, big = false, iconAfter = false } = {}) {
  return h('button', { class: `sx-btn sx-${kind} ${big ? 'sx-big' : ''} ${cls}`, type: 'button', disabled, 'aria-label': aria, onclick: disabled ? null : tap(onclick) },
    icon && !iconAfter ? ico(icon) : null, h('span', { class: 'lbl' }, label), icon && iconAfter ? ico(icon) : null);
}
// a button whose gold figure is the shared price chip: label on the left, chip on the right (poor: red chip)
function chipBtn(label, price, onclick, { poor = false, aria, ...o } = {}) {
  const b = btn(label, onclick, { ...o, aria: aria || `${label ? `${label} for ` : ''}${price} gold` }); b.append(priceChip(price, { poor })); return b;
}
function panel(cls, ...kids) {
  return h('section', { class: `sx-panel ${cls || ''}` }, h('i', { class: 'co tl' }), h('i', { class: 'co tr' }), h('i', { class: 'co bl' }), h('i', { class: 'co br' }), ...kids);
}
function eyebrow(text, cls = '') { return h('div', { class: `sx-eye ${cls}` }, text); }
function flourish() { return h('div', { class: 'sx-flourish', 'aria-hidden': 'true' }, h('i'), h('b'), h('i')); }
function plaque({ eyebrow: eb, title, sub, icon, onclick, tone = '', primary = false, disabled = false, iconEl }) {
  return h('button', { class: `sx-plaque ${tone} ${primary ? 'is-primary' : ''}`, type: 'button', disabled, onclick: disabled ? null : tap(onclick) },
    h('span', { class: 'pl-ico' }, iconEl || ico(icon || 'dice')),
    h('span', { class: 'pl-copy' }, eb ? h('small', {}, eb) : null, h('b', {}, title), sub ? h('em', {}, sub) : null),
    h('span', { class: 'pl-go' }, ico('chevron')));
}
const coin = (n, cls = '') => h('span', { class: `sx-coin ${cls}` }, ico('coin'), h('b', {}, String(n)));
function pips(n, max, cls = '') { return h('span', { class: `sx-pips ${cls}`, 'aria-label': `${n} of ${max}` }, Array.from({ length: max }, (_, i) => h('i', { class: i < n ? 'on' : '' }))); }
function fxItems(fx) {
  const map = { atk: ['burst', 'c-atk'], pierce: ['pierce', 'c-pierce'], block: ['shield', 'c-block'], heal: ['plus', 'c-heal'], magic: ['spark', 'c-magic'], stagger: ['stagger', 'c-gold'], splash: ['stagger', 'c-atk'], loot: ['coin', 'c-gold'], gold: ['coin', 'c-gold'], weaken: ['skull', 'c-dim'], free: ['reroll', 'c-block'] };
  return Object.entries(fx).map(([k, v]) => { const [ic, c] = map[k] || ['spark', '']; return h('span', { class: `fx ${c}` }, ico(ic), String(v)); });
}
// An image that shimmers until a (queued) portrait arrives.
function art(promiseFn, cls = '', alt = '') {
  const img = h('img', { alt, draggable: 'false', decoding: 'async' });
  const box = h('div', { class: `sx-art shimmer ${cls}` }, img);
  Promise.resolve(promiseFn()).then((url) => { if (!url) { box.classList.remove('shimmer'); box.classList.add('missing'); return; } img.onload = () => { box.classList.remove('shimmer'); box.classList.add('ready'); }; img.src = url; }).catch(() => box.classList.add('missing'));
  return box;
}
function countUp(el, from, to, ms = 900, fmt = (v) => String(v), delay = 0) {
  if (reduced() || from === to) { el.textContent = fmt(to); return; }
  el.textContent = fmt(from);
  const t0 = performance.now() + delay;
  const step = (now) => { const k = Math.min(1, Math.max(0, (now - t0) / ms)); const e = 1 - (1 - k) ** 3; el.textContent = fmt(Math.round(from + (to - from) * e)); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const clsName = (c) => D.CLASSES[c].name;
function emblem(cls, size = '', hue) { return h('span', { class: `sx-emblem ${size}`, style: { '--hue': hue || CLS_HUE[cls] || '#ffd23d' } }, ico(CLASS_ICON[cls] || 'sword')); }
function classPic(cls, size = '', look) {
  const k = look || D.CLASSES[cls];
  if (!k?.img) return emblem(cls, size, look?.hue);
  const flip = D.needsFlip(k, 'right');
  return h('span', { class: `sx-emblem ${size}${flip ? ' flip' : ''}`, style: { '--hue': look?.hue || CLS_HUE[cls] || '#ffd23d' } },
    h('img', { src: k.img, alt: k.name || look?.name, draggable: 'false', decoding: 'async' }));
}
function classPreview(cls, color) {
  const look = D.lookById(cls, color) || D.CLASSES[cls];
  if (!look?.img) return null;
  return h('img', { src: look.img, alt: look.name, draggable: 'false', decoding: 'async' });
}
function nextOf(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function difficultyPicker(selected, onPick, { locked = false, compact = false } = {}) {
  const id = D.normalizeDifficulty(selected);
  if (compact) { // camp: the four names in a row, and what the chosen one means underneath
    return h('div', { class: 'sx-diff compact' },
      h('div', { class: 'dfc-row', role: 'radiogroup', 'aria-label': 'Difficulty' }, Object.entries(D.DIFFICULTY).map(([k, d]) => h('button', { type: 'button', class: `df-opt ${k === id ? 'on' : ''}`, role: 'radio', 'aria-checked': String(k === id), disabled: locked, onclick: locked ? null : () => onPick(k) }, d.name))),
      h('small', { class: 'dfc-text' }, D.DIFFICULTY[id].text));
  }
  return h('div', { class: 'sx-diff four', role: 'radiogroup', 'aria-label': 'Difficulty' },
    Object.entries(D.DIFFICULTY).map(([k, d]) => h('button', {
      type: 'button', class: `df-opt ${k === id ? 'on' : ''}`, role: 'radio', 'aria-checked': String(k === id),
      disabled: locked, onclick: locked ? null : () => onPick(k),
    }, h('b', {}, d.name), h('small', {}, d.text))));
}

// the layout contract between panels and the camera (fractions of the viewport covered by DOM)
const LAYOUT = {
  title: { land: { right: 0.36 }, port: { bottom: 0.46, top: 0.04 } },
  create: { land: { right: 0.4 }, port: { bottom: 0.56 } },
  board: { land: { right: 0.62 }, port: { bottom: 0.6 } },
  road: { land: { right: 0.46 }, port: { bottom: 0.56 } },
  envelope: { land: { right: 0.5 }, port: { bottom: 0.8 } }, // the objective card is a whole card: give it the screen
  camp: { land: { right: 0.42 }, port: { bottom: 0.74 } },
  victory: { land: { right: 0.44 }, port: { bottom: 0.58 } },
  defeat: { land: { right: 0.42 }, port: { bottom: 0.5 } },
};
const lay = (k) => SCR.layout(LAYOUT[k]);
const topBar = (...kids) => h('header', { class: 'sx-top' }, ...kids);

function heroChip(hero = X.S.hero, { xp = true } = {}) {
  const S = X.S;
  if (S.company?.kind === 'company') {
    const n = S.company.members.length;
    return h('div', { class: 'sx-chip' }, h('span', { class: 'sx-emblem' }, ico('people')), h('div', { class: 'ch-copy' }, h('b', {}, S.company.name), h('small', {}, `${n} ${n === 1 ? 'hero' : 'heroes'}`)), coin(E.companyGold(S.company.members)));
  }
  const need = D.xpToNext(hero.level); const maxed = hero.level >= D.MAX_LEVEL;
  return h('div', { class: 'sx-chip' }, emblem(hero.cls, '', D.lookDef(hero)?.hue),
    h('div', { class: 'ch-copy' }, h('b', {}, hero.name), h('small', {}, `Level ${hero.level} ${clsName(hero.cls)}`),
      xp ? h('span', { class: 'ch-xp', title: maxed ? 'Max level' : `${hero.xp}/${need} XP` }, h('i', { style: { width: `${maxed ? 100 : Math.min(100, (hero.xp / need) * 100)}%` } })) : null),
    coin(hero.gold));
}

// Camp changes to my own hero. Solo: straight to the rules. At a shared table (g3/online.js): done here at once so the screen
// answers, and sent to the table, which keeps the real copy.
const HERO_OPS = ['takeCharm', 'dropCharm', 'buyCharm', 'sellDiamond', 'upgradeHeart', 'upgradeDie', 'upgradePower', 'upgradePotions', 'unlockDie', 'trainWeapon', 'forgeWeapon', 'sellItem', 'removeTalent', 'addTalent', 'downgradeDie', 'removePetSymbol', 'addPetSymbol', 'growPet', 'buyPet', 'buyPotion', 'buyRerollDie', 'buyItem', 'buyTonic', 'buyBundle', 'equip', 'equipPower', 'learnPower', 'armDiamond'];
const HE = Object.fromEntries(HERO_OPS.map((name) => [name, (hero, ...args) => (X.netOp ? X.netOp(name, args, () => E[name](hero, ...args)) : E[name](hero, ...args))]));

// First-run coach tip, remembered in the save like the classic one.
function tipBox(key, text) {
  const hero = X.S.hero; if (!hero || !Coach.wantHint(hero, key)) return null;
  return h('div', { class: 'sx-tip' }, ico('shine'), h('p', {}, text), h('button', { class: 'sx-btn sx-link', type: 'button', onclick: (e) => { Coach.seeHint(hero, key); X.persist(); e.currentTarget.closest('.sx-tip').remove(); } }, 'Got it'),
    h('button', { class: 'sx-btn sx-link', type: 'button', onclick: (e) => { Coach.setHints(false); e.currentTarget.closest('.sx-tip').remove(); } }, 'Hints off'));
}
// A named hint from coach.js (title + text).
function coachBox(key) { const H = Coach.HINTS[key]; if (!H) return null; return tipBox(key, `${H.title}. ${H.text}`); }

// ------------------------------------------------------------------------------------------------ logo
// The home screen brand (Dave, Oct 2026): the Quest Dice knight with sword and shield, smaller and alive (he breathes, his
// heart beats, his dice symbols glow in turn, light sweeps his armour, his sword tip twinkles), with the game's own dice
// floating and spinning around him (Fleet Dice style), and QUEST / DICE beside him. Art in assets/brand.
// Where things sit on the knight picture, in % of its width and height:
const KNIGHT_SPOTS = [
  ['heart', 57.1, 45.8, 'gold'], ['crossA', 47.4, 62.9, 'green'], ['crossB', 35.8, 83, 'green'], ['tri', 73.7, 65.8, 'purple'],
  ['ring', 82.2, 80.6, 'gold'], ['gem', 27.8, 41.6, 'blue'], ['starL', 45.2, 30.7, 'red'], ['starR', 83, 35.1, 'red'],
  ['shieldL', 40.1, 72.9, 'blue'], ['shieldS', 76.4, 35.3, 'blue'],
];
// One floating die: the game's real 3D die, filmed tumbling through a full turn (dev/dicefilm.mjs -> assets/brand/die-*.webp,
// a strip of 32 frames) and played back as a sprite while it bobs and drifts.
function floatDie(kind, { x, y, size, t = 2.4, bob = 4.5, delay = 0, tilt = 0 }) {
  return h('div', { class: `fd fd-${kind}`, style: { left: `${x}%`, top: `${y}%`, '--s': `${size}rem`, '--t': `${t}s`, '--b': `${bob}s`, '--d': `${delay}s`, '--tilt': `${tilt}deg` }, 'aria-hidden': 'true' },
    h('div', { class: 'fd-box' }, h('img', { class: 'fd-strip', src: `assets/brand/die-${kind}.webp`, alt: '', draggable: 'false', decoding: 'async' })), h('i', { class: 'fd-shadow' }));
}
function logo() {
  const spots = KNIGHT_SPOTS.map(([k, x, y, c], i) => h('i', { class: `br-spot sp-${c} ${k === 'heart' ? 'is-heart' : ''}`, style: { left: `${x}%`, top: `${y}%`, '--i': i } }));
  const hero = h('div', { class: 'br-hero' },
    h('img', { class: 'br-knight', src: 'assets/brand/knight-sword.webp', alt: 'The Quest Dice knight, made of dice, with sword and shield', draggable: 'false', decoding: 'async' }),
    h('i', { class: 'br-shine', 'aria-hidden': 'true' }), ...spots, h('i', { class: 'br-twinkle', 'aria-hidden': 'true' }));
  // the game's own dice around him: both weapon d4s, a d6 strength die, a d4 talent die and the gold heart die
  const stage = h('div', { class: 'br-stage' },
    // all behind him and smaller, peeking out around his shoulders, sword and legs, like dice tumbling in the distance
    h('div', { class: 'br-float back' },
      floatDie('strength', { x: 64, y: -2, size: 2.2, t: 3.4, bob: 5, tilt: -8 }), floatDie('talent', { x: 22, y: 8, size: 1.9, t: 2.4, bob: 4, delay: -1.5, tilt: 4 }),
      floatDie('heart', { x: 2, y: 64, size: 2.1, t: 4, bob: 6, delay: -2, tilt: 10 }), floatDie('red', { x: 44, y: 72, size: 1.9, t: 2.6, bob: 4.4, delay: -1, tilt: 6 }),
      floatDie('blue', { x: 92, y: 20, size: 2, t: 3, bob: 4.8, delay: -3, tilt: -10 })),
    hero);
  return h('div', { class: 'sx-brand' }, stage,
    h('div', { class: 'br-words' },
      h('h1', { class: 'br-title' }, h('img', { class: 'br-quest', src: 'assets/brand/quest.webp', alt: 'Quest', draggable: 'false' }), h('img', { class: 'br-dice', src: 'assets/brand/dice.webp', alt: 'Dice', draggable: 'false' })),
      h('p', { class: 'br-tag' }, h('span', {}, 'Roll against'), h('span', {}, 'the dark.'))));
}

// "Play together" opens in place: share one phone, or each on your own.
// "Saved games" opens in place: every hero and company on this phone, newest first, then Soul Code import.
function savedChoice(menu, saves, saveSub, where) {
  menu.replaceChildren(
    h('div', { class: 'sx-eye menu-label' }, `Saved games · ${saves.length}`),
    ...saves.map((x) => plaque({ eyebrow: where(x), title: x.name, sub: saveSub(x), iconEl: x.kind === 'company' ? ico('people') : emblem(x.cls), onclick: () => X.unlock(x) })),
    plaque({ eyebrow: 'Soul Code', title: 'Bring a hero here', sub: 'Paste a code from another device.', icon: 'key', onclick: X.showImport }),
    plaque({ eyebrow: '', title: 'Back', icon: 'chevron', onclick: () => X.showTitle() }));
  menu.closest('.sx-title-menu')?.scrollTo?.({ top: 0 });
}
// ------------------------------------------------------------------------------------------------ title
export function title() {
  const S = X.S; const saves = SV.listSaves(); const seat = Net.savedSeat();
  const lead = saves.find((s) => s.kind === 'hero') || saves[0];
  const cls = lead?.cls || nextOf(Object.keys(D.CLASSES));
  S.cleanups = S.cleanups || [];
  const menu = h('nav', { class: 'sx-menu', 'aria-label': 'Main menu' });
  if (seat) { const L = Net.seatLabel(seat); menu.append(plaque({ eyebrow: 'Your table', title: L.title, sub: L.sub, icon: 'people', tone: 'is-together', onclick: () => X.resume() })); }
  // One "Continue" for the most recent game, and one "Saved games" door to all of them, so the home screen
  // never hides buttons below the fold.
  const saveSub = (x) => {
    const story = packOf(x.pack);
    const tale = story.id !== DEFAULT_PACK ? ` · ${story.title}` : '';
    return x.kind === 'company' ? `${x.size} heroes · ${x.classes.map((id) => D.CLASSES[id].name).join(' + ')}${tale}` : `Level ${x.level} ${D.CLASSES[x.cls].name}${tale}`;
  };
  const where = (x) => `Act ${romans[x.act - 1] || x.act}, Quest ${x.step}`;
  const group = (label) => h('div', { class: 'sx-eye menu-label' }, label);
  if (saves.length) {
    const x = saves[0];
    menu.append(plaque({ eyebrow: 'Continue', title: x.name, sub: `${saveSub(x)} · ${where(x)}`, iconEl: x.kind === 'company' ? ico('people') : emblem(x.cls), primary: true, onclick: () => X.unlock(x) }));
    menu.append(plaque({ eyebrow: 'Saved games', title: saves.length > 1 ? `All saved games (${saves.length})` : 'Saved games', sub: 'Every hero and tale saved on this phone.', icon: 'book', onclick: () => savedChoice(menu, saves, saveSub, where) }));
    menu.append(group('Begin anew'));
  }
  // Learn to play sits first until there is a saved hero, then it moves under the menu.
  if (!saves.length) menu.append(plaque({ eyebrow: 'Start here', title: 'Learn to play', sub: 'Two minutes, then a practice battle.', icon: 'book', primary: true, onclick: X.showLessons }));
  { const run = DAY.dailyRun(); const rec = DAY.dayRecord(run.key); const st = DAY.streak(run.key);
    menu.append(plaque({ eyebrow: `Daily challenge${st > 1 ? ` · ${st} days in a row` : ''}`, title: E.charmsResting() ? D.CLASSES[run.cls].name : `${D.CLASSES[run.cls].name} · ${D.CHARMS[run.charm].name}`,
      sub: rec.tries ? `Your best today: ${rec.best.toLocaleString()} points · ${rec.fights} of ${DAY.FIGHTS} fights` : `Five fights, the same for everyone. One score.`, icon: 'crown', tone: 'is-daily', onclick: X.showDaily })); }
  menu.append(
    plaque({ eyebrow: 'New game', title: 'Choose your story', sub: 'The Dawn Lantern, The Clover Heist, or a tale for two.', icon: 'book', primary: false, onclick: X.showStories }),
    plaque({ eyebrow: 'Together', title: 'Play together', sub: 'Up to six friends, each on their own phone.', icon: 'people', tone: 'is-together', onclick: X.showTogether }),
    plaque({ eyebrow: 'Cloud', title: 'Open a cloud save', sub: 'Name and password, on any device.', icon: 'lock', onclick: X.showCloudLoad }));
  if (!saves.length) menu.append(plaque({ eyebrow: 'Soul Code', title: 'Bring a hero here', sub: 'Paste a code from another device.', icon: 'key', onclick: X.showImport }));
  mountAs('title',
    h('div', { class: 'sx-title-shell' },
      h('div', { class: 'sx-title-brand' }, logo()),
      h('div', { class: 'sx-title-menu' }, menu, h('div', { class: 'sx-links' }, saves.length ? btn('Learn to play', X.showLessons, { kind: 'ghost', icon: 'shine', cls: 'sx-learn' }) : null, btn('Rules', X.showHowTo, { kind: 'link', icon: 'scroll' })), h('div', { class: 'sx-more', 'aria-hidden': 'true' }, '▾ More below'))));
  lay('title');
  const box = menu.parentElement;
  const check = () => box.classList.toggle('more', box.scrollTop + box.clientHeight < box.scrollHeight - 12);
  box.addEventListener('scroll', check, { passive: true });
  const mo = new MutationObserver(() => requestAnimationFrame(check)); mo.observe(menu, { childList: true });
  addEventListener('resize', check); S.cleanups.push(() => { mo.disconnect(); removeEventListener('resize', check); });
  requestAnimationFrame(check); setTimeout(check, 400); SCR.enter('title', { cls }, `title:${cls}`);
}

// ------------------------------------------------------------------------------------------------ create
function meter(label, value, max, icon, cls, note = '', shown = null, on = null) {
  return h('div', { class: `sx-meter ${cls}` }, h('div', { class: 'mt-head' }, ico(icon), h('span', {}, label), h('b', {}, String(shown ?? value))),
    h('div', { class: 'mt-cells', 'aria-hidden': 'true' }, Array.from({ length: max }, (_, i) => h('i', { class: i < (on ?? value) ? 'on' : '' }))),
    note ? h('small', { class: 'mt-note' }, note) : null);
}
// The four numbers that describe a hero, each with a plain-words caption (size ladder for initiative: d4 d6 d8 d10).
function heroStats(hp, feet, c = {}) {
  const rung = [4, 6, 8, 10].indexOf(feet) + 1; const hands = c.hands || 4; const magic = c.startMagic ?? D.START_MAGIC;
  return h('div', { class: 'ci-meters' },
    meter('Health', hp, 40, 'heart', 'm-hp', 'How much damage you can take.'),
    meter('Speed', feet, 4, 'boot', 'm-init', 'Your feet die. A bigger die strikes before the monsters more often, and the slowest hero draws the attacks in a team game.', `d${feet}`, rung),
    meter('Strength', hands, 4, 'hammer', 'm-str', 'Your strongest hand die. It powers the weapon above it.', `d${hands}`, [4, 6, 8, 10].indexOf(hands) + 1),
    meter('Magic', magic, 6, 'spark', 'm-mag', `Magic at the start of every fight${c.magicCap ? `; holds up to ${c.magicCap}` : ''}.`, String(magic)));
}
// The lab's Arrows (js/lab.js): each arrowhead face shows its ammunition's mark, and the weapon page picks the ammunition.
const ARROW_MARK = { pierce: '➶', fire: '🔥', frost: '❄' };
function ammoPick(hero, inst) {
  const now = D.WEAPONS2.ammo[inst.ammo] ? inst.ammo : 'normal';
  return h('div', { class: 'ww-ammo', role: 'group', 'aria-label': 'Ammunition' }, h('small', {}, 'AMMUNITION · free to change at camp'),
    Object.entries(D.WEAPONS2.ammo).map(([k, name]) => h('button', { type: 'button', class: k === now ? 'on' : '', 'aria-pressed': String(k === now), 'data-ammo': k,
      onclick: tap(() => { if (k !== now && E.setAmmo(hero, inst.uid, k)) { sfx.select(); X.persist(); X.renderCamp(SHEET.fromBoard); } }) },
    h('b', {}, k === 'normal' ? 'Normal' : `${ARROW_MARK[k]} ${name.split(' ')[0]}`), h('span', {}, ammoLine(k, D.WEAPONS2.arrowRules)))));
}
function faceChips(inst) {
  return h('div', { class: 'wc-faces' }, E.weaponFaces(inst).map((f) => h('span', { class: `wf ${f.c === 'r' ? 'red' : 'blue'} ${f.arrow ? `arrow a-${f.arrow}` : f.v === 0 ? 'zero' : ''}` }, h('b', {}, f.arrow ? `${ARROW_MARK[f.arrow]}${f.v || ''}` : String(f.v)), f.fx || f.plus ? h('span', { class: 'wf-fx' }, fxItems({ ...(f.plus ? { [f.c === 'b' ? 'block' : 'atk']: f.plus } : {}), ...(f.fx || {}) })) : null))); // a +1 icon shows like the others
}
// Drop a charm: asks twice (a second tap within four seconds), since it is gone for good.
function dropBtn(hero, id) {
  let armed = false; let timer = null;
  const b = h('button', { type: 'button', class: 'sx-shrink', 'aria-label': `Drop the ${D.CHARMS[id].name}`, onclick: () => {
    if (!armed) { armed = true; b.classList.add('armed'); b.textContent = 'Tap again to drop it'; timer = setTimeout(() => { armed = false; b.classList.remove('armed'); b.textContent = 'Drop'; }, 4000); return; }
    clearTimeout(timer); if (HE.dropCharm(hero, id)) { sfx.card(); X.persist(); X.renderCamp(); }
  } }, 'Drop');
  return b;
}
// A charm (Dave, Oct 2026): a small trinket that bends one rule. Icon, name, what it does, optional actions.
function charmCard(id, { actions = [], cls = '', badge = '' } = {}) {
  const c = D.CHARMS[id]; if (!c) return null;
  return h('article', { class: `sx-charm ${cls}` }, h('span', { class: 'ch-ico', 'aria-hidden': 'true' }, ico(c.icon)),
    h('div', { class: 'ch-copy' }, h('b', {}, c.name, badge ? h('em', { class: 'ch-badge' }, badge) : null), h('small', {}, c.text)),
    actions.length ? h('div', { class: 'ch-acts' }, actions) : null);
}
// Every charm in the game, in one popup (Dave, Oct 2026: "a glossary of charms so you can get an idea of what to look for")
function charmGuide() {
  const hero = X.S.hero; sfx.card?.();
  const ids = Object.keys(D.CHARMS);
  modal(h('div', { class: 'form slot-sheet ch-guide' },
    h('header', { class: 'sh-head' }, h('div', { class: 'sh-title' }, h('small', {}, `${ids.length} in all · carry ${D.CHARM_MAX}`), h('b', {}, 'Charms')),
      h('button', { class: 'sh-x', type: 'button', onclick: () => closeModal() }, 'Done')),
    h('p', { class: 'sh-role' }, 'A charm changes one rule for you, in every fight. Bosses and big fights drop them. The Camp Store sometimes sells one.'),
    h('div', { class: 'ch-list' }, ids.map((id) => charmCard(id, { cls: hasCharmHere(hero, id) ? 'mine' : '', badge: hasCharmHere(hero, id) ? 'You have it' : '' })))));
}
const hasCharmHere = (hero, id) => !!hero && E.charmsOf(hero).includes(id);
function charmGuideBtn() {
  return h('button', { class: 'ch-guide-btn', type: 'button', onclick: tap(charmGuide) }, ico('book'), `All ${Object.keys(D.CHARMS).length} charms`);
}
// A weapon as a card (the approved card family, js/g3/cards.js, drawn from the weapon's own data). Three views of the same weapon:
// compact = the row used in the pack and on the shelf; cls 'pick' = the spoils view (the card beside the decision); compact:false = the big card.
// money labels the gold figure: Sell (the default, what the pack pays) or Store (what the shelf charges). Drawing a card only reads.
function weaponCard(inst, { actions = [], note = '', compact = true, badge = '', cls = '', money = null } = {}) {
  void note;
  const acts = actions.length ? h('div', { class: 'sh-acts' }, actions) : null;
  if (!compact) return h('article', { class: `cw-big ${cls}` }, CW.weaponCardOf(inst, money), acts);
  if (/\bpick\b/.test(cls)) return spoilsView(inst, acts, cls, badge, money);
  return shWeapon(inst, acts, `pk ${cls}`, badge, money);
}
// the full card, large, from any row or thumbnail
function showWeaponCard(inst, money, { real = false } = {}) { // real: the camp T17 card (the spoils' picture, large)
  const close = modal(h('div', { class: 'form cw-modal' }, h('div', { class: 'cw-big' }, real ? CB.weaponCard(X.S.hero, null, inst, { say: (t) => toast(t) }) : CW.weaponCardOf(inst, money)),
    h('div', { class: 'row end' }, btn('Close', () => close(), { kind: 'ghost' }))));
}
// spoils: the card itself (tap for the large one), then what the weapon is and the buttons below it
function spoilsView(inst, acts, cls, badge, money) {
  // Dave, 26 Oct 2026: the spoils show the REAL weapon card, the camp T17 card with its per-size rows (cardboard.js weaponCard), drawn at full size
  // and scaled down as one picture (so it is crisp and laid out exactly like the big card), not the old mini card with its stray size label.
  const d = CW.weaponData(inst, money); const real = CB.weaponCard(X.S.hero, null, inst); real.setAttribute('aria-hidden', 'true'); real.inert = true;
  const thumb = h('div', { class: 'cw-spoilcard', role: 'button', tabindex: '0', 'aria-label': `${d.metal} ${d.name} card. Tap to see it large` }, h('div', { class: 'cw-spoilscale' }, real));
  if (typeof ResizeObserver === 'function') new ResizeObserver(([e]) => { if (e.contentRect.width) thumb.style.setProperty('--k', String(e.contentRect.width / 340)); }).observe(thumb);
  thumb.addEventListener('click', () => { sfx.click(); showWeaponCard(inst, money, { real: true }); });
  thumb.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sfx.click(); showWeaponCard(inst, money, { real: true }); } });
  const info = h('div', { class: 'cw-info' }, h('b', { class: 'nm' }, `${d.metal} ${d.name}`), badge ? h('small', { class: 'cw-tag' }, badge) : null,
    h('p', {}, `A d${d.size} weapon${d.hands === 2 ? ', both hands' : ''}${d.wear ? `, ${d.wear}` : ''}.`), h('small', { class: 'cw-hint' }, 'Tap the card to see it large.'));
  const rest = h('div', { class: 'cw-rest' }); rest.innerHTML = CW.strip(d); if (acts) rest.append(acts);
  return h('div', { class: `cw-spoil ${cls}` }, thumb, info, rest);
}
// ---- the daily challenge's page: the briefing (intro), a breath between fights (between), and the score (result).
export function daily(v) {
  const { run } = v; const hero = DAY.dailyHero(run); const S = X.S;
  const fightRow = (q, i) => { const f = v.fights?.[i]; const now = v.mode === 'between' && i === v.fights.length;
    return h('li', { class: `dl-fight ${f ? (f.won ? 'won' : 'lost') : ''} ${now ? 'now' : ''} ${q.kind}` }, h('span', { class: 'dl-n' }, f ? ico(f.won ? 'check' : 'skull') : q.kind === 'boss' ? ico('crown') : q.kind === 'elite' ? ico('skull') : String(i + 1)),
      h('span', { class: 'dl-name' }, h('b', {}, q.kind === 'boss' ? q.name : q.place || q.name), h('small', {}, groupNames(q.enemies))), f ? h('em', { class: 'dl-pts' }, `+${f.score}`) : null); };
  const boardEl = h('div', { class: 'dl-board' }, h('p', { class: 'fine' }, 'Loading today’s leaderboard…'));
  v.board?.then((r) => { if (!r?.ok) { boardEl.replaceChildren(h('p', { class: 'fine' }, 'The leaderboard is not open yet. Your score is kept on this phone.')); return; }
    if (!r.rows.length) { boardEl.replaceChildren(h('p', { class: 'fine' }, 'Nobody has a score today yet. Be the first.')); return; }
    boardEl.replaceChildren(h('ol', { class: 'dl-top' }, r.rows.map((x, i) => h('li', { class: x.uid === r.me ? 'me' : '' }, h('span', { class: 'dl-rank' }, String(i + 1)), emblem(x.cls), h('b', {}, x.name), h('small', {}, `${x.fights}/${DAY.FIGHTS}`), h('em', {}, x.score.toLocaleString()))))); }).catch(() => {});
  const head = v.mode === 'result'
    ? [eyebrow(DAY.dayLabel(run.key)), h('h1', { class: 'sx-act' }, `${v.score.toLocaleString()} points`), h('p', { class: 'dl-sub' }, `${v.fights.filter((f) => f.won).length} of ${DAY.FIGHTS} fights won${v.rec?.isBest ? ' · a new best today!' : ` · your best today: ${v.rec.best.toLocaleString()}`}${v.streak > 1 ? ` · ${v.streak} days in a row` : ''}`)]
    : v.mode === 'between'
      ? [eyebrow(`Fight ${v.fights.length} of ${DAY.FIGHTS} won`), h('h1', { class: 'sx-act' }, `${v.score.toLocaleString()} points`), h('p', { class: 'dl-sub' }, 'Catch your breath. Your health is full again for the next fight; the potions you drank stay drunk.')]
      : [eyebrow(`Daily challenge · ${DAY.dayLabel(run.key)}`), h('h1', { class: 'sx-act' }, `${D.CLASSES[run.cls].name}, Act ${romans[run.act - 1]}`), h('p', { class: 'dl-sub' }, `The same five fights for everyone today. Battle points, 1 for every gold coin, +${DAY.WIN_BONUS} for every win, +${DAY.CLEAR_BONUS} for clearing all five. Play as often as you like; your best counts.${v.rec?.tries ? ` Your best today: ${v.rec.best.toLocaleString()}.` : ''}${v.streak > 1 ? ` ${v.streak} days in a row.` : ''}`)];
  const kit = h('section', { class: 'dl-kit' }, h('div', { class: 'dl-hero' }, emblem(run.cls, 'lg'), h('div', {}, h('b', {}, hero.name), h('small', {}, `Level ${hero.level} · hands d${hero.strength.W} · ${D.tierName(hero.loadout.NW)} d${E.weaponSize(hero.loadout.NW)} ${D.WEAPONS[hero.loadout.NW.id].name}`))), E.charmsResting() ? null : charmCard(run.charm, { badge: 'Today' }));
  const cta = v.mode === 'between' ? btn(`Fight ${v.fights.length + 1}: ${run.quests[v.fights.length].kind === 'boss' ? run.quests[v.fights.length].name : 'onward'}`, v.onNext, { big: true, icon: 'sword', cls: 'wide' })
    : v.mode === 'result' ? h('div', { class: 'dl-acts' }, btn('Share', v.onShare, { kind: 'ghost', icon: 'people' }), btn('Try again', v.onStart, { big: true, icon: 'reroll' }))
      : btn('Begin', v.onStart, { big: true, icon: 'sword', cls: 'wide' });
  mountAs('board daily', h('div', { class: 'sx-board' },
    topBar(h('div', { class: 'sx-chip dl-chip' }, ico('crown'), h('b', {}, 'Daily')), h('div', { class: 'sx-top-actions' }, btn(v.mode === 'between' ? 'Give up' : 'Home', v.onHome, { kind: 'ghost', icon: 'home' }))),
    h('div', { class: 'sx-board-main' },
      h('div', { class: 'sx-board-head' }, ...head),
      v.mode === 'intro' ? kit : null,
      h('ol', { class: 'dl-fights' }, run.quests.map(fightRow)),
      h('div', { class: 'sx-cta' }, cta),
      v.mode === 'between' ? null : [eyebrow('Today’s best', 'center'), boardEl])));
  lay('board'); SCR.enter('road', { hero, heroes: [hero], place: run.quests[Math.min(run.quests.length - 1, v.fights?.length || 0)].place, seed: run.seed }, `daily:${run.key}:${v.mode}:${v.fights?.length || 0}`);
  S.daily = v.mode === 'intro' ? null : S.daily;
}
function coverMinis(pack) {
  if (pack?.cover?.img) {
    return h('span', { class: 'sc-minis' }, h('span', { class: 'sx-emblem sm' },
      h('img', { src: pack.cover.img, alt: pack.title, draggable: 'false', decoding: 'async' })));
  }
  return h('span', { class: 'sc-minis' }, ...coverClasses(pack).map((id) => classPic(id, 'sm')));
}
function storyCardBtn(p, onclick) {
  const line = [partySize(p), forcedLine(p)].filter(Boolean).join(' · ');
  const kind = (p.requiredHeroes || 1) > 1 ? 'is-duo' : 'is-dawn';
  return h('button', { class: `sx-storycard ${kind}`, type: 'button', onclick: tap(() => onclick(p)) },
    h('span', { class: 'sc-art' }, coverMinis(p)),
    h('span', { class: 'sc-copy' }, h('small', {}, line), h('b', {}, p.title), h('em', {}, p.pitch)),
    h('span', { class: 'pl-go' }, ico('chevron')));
}
export function stories(opts = {}) {
  const S = X.S;
  const back = opts.together ? X.showTogether : X.showTitle;
  const pick = (p) => {
    if (opts.together) return X.hostPack ? X.hostPack(p.id) : X.showTogether();
    X.showCreate(p.id);
  };
  const menu = h('nav', { class: 'sx-menu sx-stories', 'aria-label': 'Choose your story' },
    h('div', { class: 'sx-eye menu-label' }, opts.together ? 'Host a table · pick the tale' : 'Choose your story'),
    ...packList().map((p) => storyCardBtn(p, pick)),
    plaque({ eyebrow: '', title: 'Back', icon: 'chevron', onclick: back }));
  const box = h('div', { class: 'sx-title-menu' }, menu);
  mountAs('title', h('div', { class: 'sx-title-shell is-stories' }, h('div', { class: 'sx-title-brand' }, logo()), box));
  lay('title'); SCR.enter('title', { cls: 'knight' }, 'title:stories');
  void S;
}

// opts.table = { mode: 'host' | 'join', code, onDone(name, cls, extra) }: the same hero choice, for sitting down at a table.
export function create(opts = {}) {
  const S = X.S; let color = 'default'; let H = null; let busy = false;
  const T = opts.table || null;
  const pack = packOf(opts.pack || T?.pack || opts.mate?.campaign?.pack);
  const mate = opts.mate || null;
  const allowed = (pack.forcedClasses || Object.keys(D.CLASSES)).filter((id) => !mate || id !== mate.cls);
  let cls = allowed.includes(Object.keys(D.CLASSES)[Math.floor(Math.random() * 5)]) ? Object.keys(D.CLASSES)[Math.floor(Math.random() * 5)] : (allowed[0] || 'knight');
  if (!allowed.includes(cls)) cls = allowed[0] || 'knight';
  const name = h('input', { class: 'sx-input', id: 'hero-name', maxlength: 16, placeholder: 'Thessaly Vane', autocomplete: 'off', 'aria-label': 'Hero name' });
  const pw = h('input', { class: 'sx-input', id: 'hero-pw', type: 'password', placeholder: '3 or more characters', autocomplete: 'new-password', 'aria-label': 'Password' });
  const tname = T?.mode === 'host' ? h('input', { class: 'sx-input', id: 'table-name', maxlength: 24, placeholder: 'The Ember Company', autocomplete: 'off', 'aria-label': 'Table name' }) : null;
  const tcode = T?.mode === 'join' ? h('input', { class: 'sx-input room-code-input', id: 'table-code', maxlength: 4, value: T.code || '', placeholder: 'ABCD', autocomplete: 'off', autocapitalize: 'characters', 'aria-label': 'Table code', oninput: (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); } }) : null;
  const msg = h('p', { class: 'form-msg', role: 'alert' });
  let diff = D.normalizeDifficulty(T?.difficulty || T?.hero?.difficulty || 'normal'); let skipHints = !Coach.hintsOn();
  const diffRow = h('div');
  const paintDiff = () => diffRow.replaceChildren(difficultyPicker(diff, (id) => { diff = id; sfx.select(); paintDiff(); }));
  paintDiff();
  const hintsBox = h('label', { class: 'sx-check' }, h('input', { type: 'checkbox', checked: skipHints, onchange: (e) => { skipHints = e.target.checked; } }), h('span', {}, 'Turn the hints off'));
  const rail = h('div', { class: 'sx-rail', role: 'radiogroup', 'aria-label': 'Class' });
  const colors = h('div', { class: 'sx-colors', role: 'radiogroup', 'aria-label': 'Colour' });
  const info = h('div', { class: 'sx-classinfo' });
  const preview = h('div', { class: 'sx-hero-art' });
  const paint = () => {
    const c = D.CLASSES[cls];
    const look = D.lookById(cls, color);
    color = look?.id || 'default';
    const pic = classPreview(cls, color);
    preview.dataset.cls = cls; preview.dataset.color = color;
    preview.classList.toggle('flip', D.needsFlip(look, 'right'));
    preview.classList.add('is-seated');
    preview.replaceChildren(...(pic ? [pic] : [])); preview.hidden = !pic; preview.style.setProperty('--hue', look?.hue || CLS_HUE[cls] || '#ffd23d');
    rail.replaceChildren(...allowed.map((id) => {
      const k = D.CLASSES[id];
      return h('button', {
        type: 'button', class: `rail-btn ${id === cls ? 'on' : ''}`, role: 'radio', 'aria-checked': String(id === cls), style: { '--hue': CLS_HUE[id] }, 'aria-label': k.name,
        onclick: () => { if (id === cls) return; cls = id; if (!D.lookById(cls, color) || !D.colorsOf(cls).some((l) => l.id === color)) color = 'default'; sfx.select(); paint(); H?.pick(cls).then(() => { H?.push(true); }); },
      }, classPic(id), h('span', {}, k.name.split(' ')[0]));
    }));
    colors.replaceChildren(...D.colorsOf(cls).map((l) => h('button', {
      type: 'button', class: `color-btn ${l.id === color ? 'on' : ''}${D.needsFlip(l, 'right') ? ' flip' : ''}`, role: 'radio', 'aria-checked': String(l.id === color),
      style: { '--hue': l.hue }, 'aria-label': l.name,
      onclick: () => { if (l.id === color) return; color = l.id; sfx.select(); paint(); },
    }, h('img', { src: l.img, alt: '', draggable: 'false', decoding: 'async' }), h('span', {}, l.name))));
    const wset = [...new Set(c.weapons)];
    info.replaceChildren(
      h('div', { class: 'ci-head' }, h('h2', {}, c.name), h('p', {}, c.blurb)),
      c.trait ? h('p', { class: 'ci-trait' }, ico('shine'), c.trait) : null,
      heroStats(c.hp, c.feet || 4, c),
      h('p', { class: 'ci-rule' }, `Every hero has the same nine dice and may reroll ${D.REROLL_DICE} at a time. Classes differ in where they start.`),
      eyebrow('Wields'),
      h('div', { class: `ci-weapons n${wset.length}` }, wset.map((id) => weaponCard({ uid: `c-${id}`, id, rarity: 0 }, { compact: true, money: { label: '', value: 0 } }))),
      eyebrow('Magical powers'),
      h('div', { class: 'ci-cards' }, c.cards.filter((k) => k.start).map((k) => h('div', { class: 'ci-card' }, h('span', { class: 'cc-cost' }, String(k.cost), ico('spark')), h('b', {}, h('i', { class: `ci-slot s-${k.slot}` }, k.slot), ` ${k.name}`), h('small', {}, k.text)))),
      h('p', { class: 'fine' }, `Three more powers to learn at camp, one for each slot, including a super at level 5.`));
  };
  const loaded = T?.hero || null;
  const bring = T?.bring === 'cloud';
  if (loaded) { cls = loaded.cls; color = D.colorIdOf(loaded); name.value = loaded.name; }
  if (bring) { pw.placeholder = 'Password'; pw.setAttribute('autocomplete', 'current-password'); }
  const browse = bring && !loaded ? h('div', { class: 'cloud-browse' }) : null;
  paint();
  // Sit at the table with a hero this form already has in hand. go() may have set `busy` on its way here (creating or opening
  // the hero), so this must not bail on it (that was the "nothing happens" on Open the table). It says what it is doing,
  // and gives up after 20 seconds with a message rather than hanging.
  let made = null; let madeProven = false; // a hero this form already has: a second tap reuses it instead of failing "already exists on this device" (and keeps knowing it was opened with its password)
  const pending = (text) => { msg.textContent = text; msg.classList.toggle('pending', !!text); };
  const seat = async (hero, extra = {}) => {
    busy = true; pending(T.mode === 'host' ? 'Opening the table…' : 'Finding your seat…');
    try {
      await Promise.race([T.onDone(hero.name, hero.cls, { table: tname?.value.trim(), code: tcode?.value, hero, difficulty: diff, ...extra }),
        new Promise((_, no) => setTimeout(() => no(new Error('The table did not answer. Check your connection and try again.')), 20000))]);
    } catch (e) { pending(''); msg.textContent = e.message || 'The table did not answer.'; sfx.error(); busy = false; }
  };
  const go = async () => {
    if (busy) return;
    pending(''); msg.textContent = '';
    if (tcode && tcode.value.length !== 4) { msg.textContent = 'A table code is four letters.'; sfx.error(); tcode.focus(); return; }
    if (T && loaded) { loaded.difficulty = diff; return seat(loaded, { pack: pack.id }); }
    // A refused seat ("This story needs the Wizard and Dwarf Warden") leaves the hero this form forged. If the player then changes the class, colour or name, the
    // next tap must forge THAT hero, not reuse the old one (trip playtest, 26 Oct 2026: a friend who picked the wrong class could never get a seat).
    if (T && made && !madeProven) {
      const nm = name.value.trim().replace(/\s+/g, ' ');
      if (nm && nm !== made.name) { SV.deleteHero(made.name, pack.id); made = null; }
      else if (made.cls !== cls || (made.color ?? color) !== color) {
        const redo = E.newHero({ name: made.name, cls, color, seed: made.campaign?.seed, pack: pack.id }); redo.difficulty = made.difficulty;
        SV.saveHero(redo); // the local save keeps its password; only the hero in it changes
        try { await (await import('../cloud.js')).putHero(redo, pw.value); } catch { /* saved on this device; the cloud copy follows when it can */ }
        made = redo; X.adopt(redo);
      }
    }
    if (T && made) { made.difficulty = diff; return seat(made, { pack: pack.id, proven: madeProven }); }
    const n = name.value.trim().replace(/\s+/g, ' ');
    if (n.length < 2) { msg.textContent = 'Give your hero a name (2–16 characters).'; sfx.error(); name.focus(); return; }
    if (T && bring) {
      if (!pw.value) { msg.textContent = 'Enter your password.'; sfx.error(); pw.focus(); return; }
      busy = true; pending('Opening your save…');
      try {
        const hero = await X.openNamedHero(n, pw.value, pack.id);
        if (T?.mode === 'host') hero.difficulty = diff;
        X.adopt(hero); sfx.coin(); made = hero; madeProven = true;
        await seat(hero, { pack: pack.id, proven: true }); // opened with its password: it may take back its own seat at a table
      } catch (e) { pending(''); msg.textContent = e.message; sfx.error(); busy = false; }
      return;
    }
    if (pw.value.length < 3) { msg.textContent = 'Choose a password of at least 3 characters.'; sfx.error(); pw.focus(); return; }
    if (!SV.canSave()) { msg.textContent = 'Saving is blocked in this browser, so a hero could not be kept.'; sfx.error(); return; }
    busy = true; if (T) pending('Saving your hero…');
    try {
      const seed = mate?.campaign?.seed;
      const hero = E.newHero({ name: n, cls, color, seed, pack: pack.id });
      hero.difficulty = mate ? D.normalizeDifficulty(mate.difficulty) : diff;
      if (mate) hero.campaign = mate.campaign;
      SV.markReached(hero); Coach.setHints(!skipHints);
      await X.stashNewHero(hero, pw.value);
      if (T) { made = hero; X.adopt(hero); sfx.level(); await seat(hero, { pack: pack.id }); return; }
      const duo = (pack.requiredHeroes || 1) > 1;
      if (duo && !mate) { sfx.level(); create({ pack: pack.id, mate: hero }); return; }
      if (mate) {
        mate.campaign = hero.campaign;
        SV.saveHero(mate);
        X.adopt({ kind: 'company', name: `${mate.name} & ${hero.name}`, members: [mate, hero], campaign: hero.campaign });
        sfx.level(); X.showRoadOrBoard(); return;
      }
      X.adopt(hero, 'hero'); sfx.level();
      if (pack.id === DEFAULT_PACK) X.showHeroHub();
      else X.showRoadOrBoard();
    } catch (e) { pending(''); msg.textContent = e.message; sfx.error(); busy = false; }
  };
  [name, pw, tname, tcode].filter(Boolean).forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }));
  const source = T && !loaded ? h('div', { class: 'sx-diff', role: 'tablist', 'aria-label': 'How you sit' },
    h('button', { type: 'button', class: `df-opt ${!bring ? 'on' : ''}`, onclick: () => { if (!bring) return; sfx.select(); create({ table: { ...T, bring: 'new', difficulty: diff } }); } }, h('b', {}, 'New hero'), h('small', {}, 'Forge one for this table.')),
    h('button', { type: 'button', class: `df-opt ${bring ? 'on' : ''}`, onclick: () => { if (bring) return; sfx.select(); create({ table: { ...T, bring: 'cloud', difficulty: diff } }); } }, h('b', {}, 'Cloud save'), h('small', {}, 'Name and password.'))) : null;
  const hideClass = !!(loaded || (T && bring));
  const showDiff = (!T || T.mode === 'host') && !mate;
  const duo = (pack.requiredHeroes || 1) > 1;
  const heading = loaded ? `Bring ${loaded.name}` : bring ? 'Open a saved hero' : (duo ? (mate ? `${pack.title} · second hero` : `${pack.title} · first hero`) : 'Choose your hero');
  const cta = T ? (T.mode === 'host' ? 'Open the table' : 'Take a seat') : (duo && !mate ? 'Forge the first hero' : 'Begin the campaign');
  const backFn = T?.back || (mate ? () => create({ pack: pack.id }) : () => X.showStories(T ? { together: true } : {}));
  const stepEye = T ? (T.mode === 'host' ? 'Open a table' : 'Join a table') : (duo ? (mate ? `${pack.title} · Hero 2 of 2` : `${pack.title} · Hero 1 of 2`) : pack.title);
  mountAs('create',
    h('div', { class: 'sx-split' },
      h('div', { class: 'sx-viewport' }, btn('Back', backFn, { kind: 'ghost', icon: 'back', cls: 'sx-back' }), preview),
      h('div', { class: 'sx-side' },
        h('div', { class: 'sx-sidehead' }, btn('Back', backFn, { kind: 'ghost', icon: 'back', cls: 'sx-back-in' }), eyebrow(stepEye), h('h1', { class: 'sx-h1' }, heading)),
        pack.id !== DEFAULT_PACK && !T ? h('p', { class: 'muted sc-pitch' }, pack.pitch) : null,
        duo && !T && !mate ? h('p', { class: 'fine' }, 'Forge both heroes on this phone, or tap Play together from home to sit on two phones.') : null,
        source, hideClass ? null : rail, hideClass ? null : eyebrow('Colour'), hideClass ? null : colors, hideClass ? null : info, flourish(),
        showDiff ? eyebrow('Difficulty') : null, showDiff ? diffRow : null, T || mate ? null : hintsBox,
        loaded ? h('p', { class: 'fine' }, `${loaded.name} · Level ${loaded.level} ${D.CLASSES[loaded.cls].name}. Friends join with their own hero.`) : null,
        h('div', { class: 'sx-form' }, tcode ? h('label', { for: 'table-code' }, 'Table code', tcode) : null, tname ? h('label', { for: 'table-name' }, 'Table name', tname) : null,
          browse,
          loaded ? null : h('label', { for: 'hero-name' }, 'Name', name), loaded ? null : h('label', { for: 'hero-pw' }, 'Password', pw),
          loaded ? null : h('p', { class: 'fine' }, bring ? 'Pick a listed hero or type a name. The password opens that save; the list never shows it.' : (T ? 'Your friends see this name. The password keeps this hero in the cloud, so you keep what you earn at the table.' : 'The password guards this hero on this device and in the cloud.')), msg),
        h('div', { class: 'sx-cta' }, btn(cta, go, { big: true, icon: 'chevron', iconAfter: true, cls: 'wide' })))));
  lay('create');
  if (browse) X.cloudBrowse?.(name, pw, browse);
  SCR.enter('create', { cls }, 'create').then((hd) => {
    H = hd; if (!hd) return;
    H.pick(cls, { quiet: true }).then(() => { H.push(true); });
  });
}

export function cloudLoad() {
  const name = h('input', { class: 'sx-input', id: 'cloud-name', maxlength: 16, placeholder: 'Thessaly Vane', autocomplete: 'username', 'aria-label': 'Hero name' });
  const pw = h('input', { class: 'sx-input', id: 'cloud-pw', type: 'password', placeholder: 'Password', autocomplete: 'current-password', 'aria-label': 'Password' });
  const msg = h('p', { class: 'form-msg', role: 'alert' });
  const browse = h('div', { class: 'cloud-browse' });
  let busy = false;
  const go = async () => {
    if (busy) return; busy = true; msg.textContent = '';
    try {
      const hero = await X.openNamedHero(name.value, pw.value);
      X.adopt(hero); sfx.coin(); X.showHeroHub();
    } catch (e) { msg.textContent = e.message; sfx.error(); busy = false; }
  };
  [name, pw].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }));
  mountAs('create', h('div', { class: 'sx-split' },
    h('div', { class: 'sx-viewport' }, btn('Back', X.showTitle, { kind: 'ghost', icon: 'back', cls: 'sx-back' })),
    h('div', { class: 'sx-side' },
      h('div', { class: 'sx-sidehead' }, btn('Back', X.showTitle, { kind: 'ghost', icon: 'back', cls: 'sx-back-in' }), eyebrow('Cloud'), h('h1', { class: 'sx-h1' }, 'Open a cloud save')),
      h('p', { class: 'muted' }, 'Pick a listed hero or type a name. The password opens that save. The list shows only name, class, level and where they stand — never the password or the hero itself.'),
      h('div', { class: 'sx-form' }, browse, h('label', { for: 'cloud-name' }, 'Name', name), h('label', { for: 'cloud-pw' }, 'Password', pw), msg),
      h('div', { class: 'sx-cta' }, btn('Open', go, { big: true, icon: 'key', cls: 'wide' })))));
  lay('create'); SCR.enter('title', { cls: 'knight' }, 'title:cloud');
  X.cloudBrowse?.(name, pw, browse);
  setTimeout(() => name.focus(), 50);
}

export function heroHub() {
  const hero = X.S.hero; if (!hero) return X.showTitle();
  const c = hero.campaign;
  const choices = SV.startChoices(hero);
  const cls = D.CLASSES[hero.cls];
  const menu = h('nav', { class: 'sx-menu', 'aria-label': 'This hero' },
    h('div', { class: 'sx-eye menu-label' }, `${hero.name} · Level ${hero.level} ${cls.name}`),
    plaque({ eyebrow: 'Continue', title: 'Take the road', sub: `Act ${romans[c.act - 1] || c.act}, Quest ${c.step}`, icon: 'map', primary: true, onclick: () => X.showRoadOrBoard() }),
    choices.length > 1 ? plaque({ eyebrow: 'Replay', title: 'Begin at a step', sub: 'Any quest you have already reached. You cannot skip ahead.', icon: 'road', onclick: () => X.showStepPick() }) : null,
    plaque({ eyebrow: 'Together', title: 'Open a table', sub: 'Invite friends. They bring their own heroes.', icon: 'people', tone: 'is-together', onclick: () => X.showHostLoaded() }));
  mountAs('title', h('div', { class: 'sx-title-shell' }, h('div', { class: 'sx-title-brand' }, logo()), h('div', { class: 'sx-title-menu' }, menu, h('div', { class: 'sx-links' }, btn('Home', X.showTitle, { kind: 'link', icon: 'home' })))));
  lay('title'); SCR.enter('title', { cls: hero.cls }, `title:${hero.cls}`);
}

export function stepPick() {
  const hero = X.S.hero; if (!hero) return X.showTitle();
  const r = SV.reachedOf(hero);
  const pick = (act, step) => {
    if (!SV.beginAt(hero, act, step)) {
      sfx.error();
      toast('That step is still ahead of you.');
      return;
    }
    X.persist(); sfx.select(); X.showRoadOrBoard();
  };
  const acts = [];
  for (let act = 1; act <= r.act; act++) {
    acts.push({ act, last: act < r.act ? D.QUESTS_PER_ACT : r.step });
  }
  const rows = acts.map(({ act, last }) => {
    const a = X.actOf({ campaign: { pack: hero.campaign?.pack, act } });
    const cyc = Math.floor((act - 1) / D.ACTS.length);
    return h('div', { class: 'sx-stepact' },
      eyebrow(`Act ${romans[act - 1] || act}`), h('p', { class: 'sx-acttag' }, a.name + (cyc ? ` · Ascent ${cyc + 1}` : '')),
      h('ol', { class: 'sx-trail sx-steprow', 'aria-label': `Act ${act} quests` }, Array.from({ length: D.QUESTS_PER_ACT }, (_, i) => {
        const n = i + 1; const ok = n <= last; const now = act === hero.campaign.act && n === hero.campaign.step;
        const kind = D.stepKind(a, n);
        return h('li', { class: `tr-node ${ok ? 'done' : 'locked'} ${now ? 'now' : ''} ${kind === 'boss' ? 'boss' : kind === 'elite' ? 'elite' : ''}` }, h('button', {
          type: 'button', class: 'tr-pick', disabled: !ok, 'aria-label': ok ? `Act ${act}, quest ${n}` : `Quest ${n} is still ahead`,
          onclick: ok ? () => pick(act, n) : null,
        }, h('span', { class: 'tr-gem' }, h('b', {}, String(n)))));
      })));
  });
  mountAs('board', h('div', { class: 'sx-board' },
    topBar(heroChip(hero), h('div', { class: 'sx-top-actions' }, btn('Back', X.showHeroHub, { kind: 'ghost', icon: 'back' }))),
    h('div', { class: 'sx-board-main' },
      h('div', { class: 'sx-board-head' }, eyebrow('The road you have walked'), h('h1', { class: 'sx-act' }, 'Begin at a step'),
        h('p', { class: 'sx-acttag' }, 'Tap any quest you have already reached. Gold, gear and levels stay. You cannot skip past your progress.')),
      ...rows)));
  lay('board'); SCR.enter('road', { hero, heroes: X.members() }, `step:${hero.name}`);
}

// ------------------------------------------------------------------------------------------------ board
const campOf = () => X.S.hero?.campaign || X.members()?.[0]?.campaign;
const foeOf = (id, camp = campOf()) => monsterOf(id, camp) || D.MONSTERS[id];
const groupNames = (qOrIds) => {
  // a wanderer (an extra monster from elsewhere in the bestiary) is named after the story's own foes
  if (qOrIds?.foeNames?.length) return [...qOrIds.foeNames, ...(qOrIds.wanderer ? [`a wandering ${foeOf(qOrIds.wanderer, campOf()).name}`] : [])].join(' + ');
  const ids = qOrIds?.enemies || qOrIds || [];
  const n = {}; ids.forEach((id) => { n[id] = (n[id] || 0) + 1; });
  const camp = campOf();
  return Object.entries(n).map(([id, c]) => `${foeOf(id, camp).name}${c > 1 ? ` ×${c}` : ''}`).join(' + ');
};
// The difficulty the computer plays at (Easy / Normal / Hard / Legendary), shown on the quest board so it is never a mystery why fights feel the way they do. It is about the monsters, not the player.
function diffChip(hero) {
  const id = D.normalizeDifficulty(hero.difficulty); const d = D.DIFFICULTY[id];
  return h('span', { class: `sx-diffchip dc-${id}`, title: d.text, 'aria-label': `Difficulty: ${d.name}. ${d.text}` }, ico('skull'), d.name);
}
// Tap a step on the act trail (Dave, Oct 2026): go back and play a quest you have won again, or return to the furthest one you reached.
// You can never go past where you have been. A repeat win pays less gold and no XP or spoils (save.js repeatShare).
function stepAsk(hero, act, step, after) {
  const c = hero.campaign; if (c.act === act && c.step === step) { toast(`You are here: quest ${step}.`); return; }
  const ok = SV.canStartAt(hero, act, step); const far = SV.reachedOf(hero);
  if (!ok) { sfx.error?.(); toast(`Quest ${step} is still ahead. Win quest ${far.act === act ? far.step : 1} first.`); return; }
  const kind = D.stepKind(X.actOf({ campaign: { pack: hero.campaign?.pack, act } }), step); const what = kind === 'boss' ? 'the boss fight' : kind === 'elite' ? 'the elite fight' : 'that fight';
  const won = SV.hasCleared(hero, act, step); const back = act < c.act || (act === c.act && step < c.step);
  const close = modal(h('div', { class: 'form confirm-home step-ask' }, h('h2', {}, `${back ? 'Go back to' : 'Return to'} quest ${step}?`),
    h('p', { class: 'muted' }, won ? `You will play ${what} again. ${SV.repeatNote(SV.repeatShare(hero, act, step))}` : `Your furthest quest. Win it for the full reward.`),
    h('p', { class: 'muted' }, `You keep everything you have. Quest ${far.step}${far.act !== act ? ` of Act ${romans[far.act - 1] || far.act}` : ''} stays open: tap it on the trail to come back.`),
    h('div', { class: 'row end' }, btn('Stay here', () => close(), { kind: 'ghost' }), btn(`Go to quest ${step}`, () => { close(); if (SV.beginAt(hero, act, step)) { X.persist(); sfx.select(); after(); } else sfx.error?.(); }))));
}
function trail(c, hero = null, after = null) {
  const N = D.QUESTS_PER_ACT;
  return h('ol', { class: `sx-trail ${hero ? 'pickable' : ''}`, 'aria-label': `Quest ${c.step} of ${N}` }, Array.from({ length: N }, (_, i) => {
    const n = i + 1; const done = n < c.step; const now = n === c.step;
    const kind = D.stepKind(X.actOf({ campaign: { pack: c.pack, act: c.act } }), n);
    const boss = kind === 'boss'; const elite = kind === 'elite'; const reach = hero && !done && !now && SV.canStartAt(hero, c.act, n);
    return h('li', { class: `tr-node ${done ? 'done' : ''} ${now ? 'now' : ''} ${reach ? 'reach' : ''} ${boss ? 'boss' : elite ? 'elite' : ''}`, 'aria-current': now ? 'step' : null,
      ...(hero ? { role: 'button', tabindex: '0', 'aria-label': `Quest ${n}${now ? ', you are here' : done || reach ? '' : ', still ahead'}`, onclick: tap(() => stepAsk(hero, c.act, n, after)) } : {}) },
      h('span', { class: 'tr-gem' }, done ? ico('check') : boss ? ico('crown') : elite ? ico('skull') : h('b', {}, String(n))),
      boss || elite ? h('small', {}, boss ? 'Boss' : 'Elite') : null);
  }));
}
function questArt(q) {
  const wrap = h('div', { class: `qa n${q.enemies.length} ${q.kind}` });
  const camp = campOf();
  q.enemies.forEach((id, i) => {
    const m = foeOf(id, camp);
    wrap.append(h('div', { class: `qa-m tier-${m.tier}${D.needsFlip(m, 'left') ? ' flip' : ''}`, style: { '--i': i } }, h('img', { class: 'qa-pc', src: m.img, alt: q.foeNames?.[i] || m.name, draggable: 'false', decoding: 'async' }))); // as on the table: looking left, toward the heroes
  });
  return wrap;
}
// The boss button names who you face: 'the Goblin King', 'the Hollow Lich', 'the Ember Queen' (the part after a comma).
const bossCall = (q) => { const n = q.foeNames?.[0] || foeOf(q.enemies?.[0])?.name || 'the boss'; const call = n.split(', ').pop().replace(/^The /, 'the '); return call.length > 16 ? `the ${call.split(' ').pop()}` : call; };
// What the scouts say about a fight (the lab, js/lab.js; ChatGPT and Dave, 22 Oct 2026: a simple preview at camp so the ammunition is a
// real choice). A few plain words from the monsters' own moves, at most three: enough to plan by, never the whole story.
function scoutWords(q) {
  const camp = campOf(); const ms = q.enemies.map((id) => foeOf(id, camp)).filter(Boolean); const moves = ms.flatMap((m) => m.faces || []); const has = (v) => moves.some((f) => f.v === v);
  return [ms.some((m) => m.armor) && 'armoured', (q.enemies.length >= 3 || has('summon')) && 'a pack', (has('mend') || has('drain')) && 'heals',
    (ms.some((m) => m.slam) || has('charge') || has('breath')) && 'hits hard', has('pierce') && 'cuts through block'].filter(Boolean).slice(0, 3);
}
function questCard(q, idx) {
  const camp = campOf();
  const xp = q.enemies.reduce((a, id) => a + Math.round(foeOf(id, camp).xp * q.rewardMult), 0);
  const gold = q.enemies.reduce((a, id) => a + Math.round(foeOf(id, camp).gold * q.rewardMult), 0);
  // danger is read from YOUR dice against these monsters: how much of your health the fight should cost
  const dz = E.questDanger(X.S.hero || X.members()[0], q); const danger = { Easy: dz.score < 0.18 ? 1 : 2, Fair: 3, Hard: 4, Deadly: 5 }[dz.label];
  const reward = Math.min(5, Math.max(1, Math.round((xp + gold) / 16)));
  const tag = q.kind === 'boss' ? 'Boss' : q.kind === 'elite' ? 'Elite' : 'Battle';
  const place = q.place || q.name;
  return h('button', { class: `sx-qcard ${q.kind} ${q.perilous ? 'perilous' : ''}`, type: 'button', style: { '--i': idx }, 'aria-label': `${tag}: ${q.name}. ${groupNames(q)}`, onclick: tap(() => X.startQuest(q)) },
    h('span', { class: 'qc-tag' }, q.perilous ? ico('flame') : q.kind === 'boss' ? ico('crown') : q.kind === 'elite' ? ico('skull') : ico('shield'), tag, q.perilous ? h('em', {}, `×${D.PERIL.reward} rewards`) : null),
    questArt(q),
    h('div', { class: 'qc-body' },
      h('b', { class: 'qc-name' }, q.kind === 'boss' ? q.name : (q.name.replace(place, '').replace(/\s+(on|at|near|in|of|by)\s*$/i, '').trim() || q.name)), h('small', { class: 'qc-place' }, ico('pin'), place),
      h('small', { class: 'qc-foes' }, groupNames(q)),
      D.EXPERIMENT.weapons2 && scoutWords(q).length ? h('small', { class: 'qc-scout' }, ico('map'), `Scouts say: ${scoutWords(q).join(' · ')}`) : null,
      h('div', { class: 'qc-read' },
        h('div', { class: `qr danger dz-${dz.label.toLowerCase()}` }, h('span', {}, 'Danger'), pips(danger, 5, 'p-danger'), h('small', {}, `${dz.label} for you · ~${dz.rounds} round${dz.rounds > 1 ? 's' : ''}`)),
        h('div', { class: 'qr reward' }, h('span', {}, 'Reward'), pips(reward, 5, 'p-reward'), h('small', {}, `${xp} XP · ${gold}g+`)))),
    h('span', { class: 'qc-go' }, h('span', {}, q.kind === 'boss' ? `Face ${bossCall(q)}` : 'Fight'), ico('chevron')));
}
// Bring a Diamond (Dave, Oct 2026): on the camp's Dice page, under your dice (it used to sit under the quest card; Dave: "it should be very
// clearly an option at camp"). Each Diamond in your case has a Left and a Right button: tap a hand to bring it into the next fight in that
// hand (tap again to keep it in its case). Two can go, one in each hand. It shatters when that fight ends.
function diamondBring(hero) {
  if (!E.diamondsOf(hero).length) return null;
  const box = h('section', { class: 'sx-dbring' });
  const paint = () => {
    const ds = E.diamondsOf(hero); const hands = E.diamondHands(hero); const armed = ds.filter((d) => E.armedSlot(hero, d.uid));
    const two = E.isTwoHanded(hero) ? D.WEAPONS[hero.loadout.NW.id].name : null;
    box.replaceChildren(...[
      h('p', { class: 'db-head' }, ico('gem'), h('b', {}, armed.length ? `Bringing ${armed.length === 2 ? 'two Diamonds' : 'a Diamond'} next fight` : 'Bring a Diamond next fight?'), h('small', {}, 'One fight, then it shatters. Win or lose.')),
      h('div', { class: 'db-list' }, ds.map((d) => { const at = E.armedSlot(hero, d.uid); const w = D.WEAPONS[d.id];
        return h('div', { class: `db-item ${at ? 'on' : ''}` },
          h('div', { class: 'db-top' }, h('b', { class: 'db-name' }, `Diamond ${w.name}`), h('small', {}, `d${d.size}`),
            h('span', { class: 'db-hands' }, hands.map((s) => btn(s === 'NW' ? 'Left' : 'Right', () => { HE.armDiamond(hero, d.uid, at === s ? null : s); sfx.select?.(); X.persist(); paint(); },
              { kind: at === s ? 'primary' : 'ghost', cls: 'db-hand', aria: `${at === s ? 'Keep' : 'Bring'} the Diamond ${w.name}${at === s ? ' in its case' : ` in your ${s === 'NW' ? 'left' : 'right'} hand`}` })))),
          faceChips(d), two ? null : h('small', { class: 'db-swap' }, hands.map((s) => `${s === 'NW' ? 'Left' : 'Right'} sets aside your ${D.WEAPONS[hero.loadout[s]?.id]?.name || 'fists'}`).join(' · '))); })),
      two && armed.length ? h('small', { class: 'db-note' }, `Your ${two} is two-handed: it sits this fight out, and one Diamond fills both hands. Two Diamonds take a hand each.`) : null].filter(Boolean));
  };
  paint(); return box;
}
// What the road (or the store) left you for the next fight: the good in gold, the bad in red, each with whose it is.
function boonNotes(list) {
  const say = (b) => `${b.who ? `${b.who}: ` : ''}${b.name ? `${b.name}, ` : ''}${b.text.charAt(0).toLowerCase()}${b.text.slice(1)}`;
  const good = list.filter((b) => !b.bane); const bad = list.filter((b) => b.bane);
  return [good.length ? h('p', { class: 'note boon' }, ico('shine'), h('span', {}, h('b', {}, 'Next fight: '), good.map(say).join(' · '))) : null,
    bad.length ? h('p', { class: 'note warn' }, ico('skull'), h('span', {}, h('b', {}, 'Next fight: '), bad.map(say).join(' · '))) : null];
}
export function board() {
  const S = X.S; const hero = S.hero || X.members()[0]; S.hero = hero; const c = hero.campaign; const quests = E.questsFor(hero); X.persist();
  const blessings = (c.blessings || []).filter((b) => (b.fights ?? 1) > 0); const ambush = c.ambush?.length;
  const tipEl = tipBox('board', 'One fight waits on this stretch of road. Win it to walk on. The boss is at the end of the act, wearing a hat, probably.');
  const place = quests[0].place;
  mountAs('board', h('div', { class: 'sx-board' },
    topBar(heroChip(hero), h('div', { class: 'sx-top-actions' }, btn('Camp', () => X.showCamp({ fromBoard: true }), { kind: 'ghost', icon: 'tent' }), btn('Menu', X.menu, { kind: 'ghost', icon: 'menu', cls: 'sx-menubtn' }))),
    h('div', { class: 'sx-board-main' },
      h('div', { class: 'sx-board-head' },
        h('div', { class: 'sx-eyerow' }, eyebrow(`Act ${romans[c.act - 1] || c.act} · Quest ${c.step} of ${D.QUESTS_PER_ACT}`), diffChip(hero)),
        h('h1', { class: 'sx-act' }, X.actName(hero)), h('p', { class: 'sx-acttag' }, X.actOf(hero).tag),
        trail(c, X.net ? null : hero, () => X.showBoard())),
      X.partyBar?.(),
      h('div', { class: 'sx-notes' },
        ...boonNotes(blessings),
        ambush ? h('p', { class: 'note warn' }, ico('skull'), 'An ambush waits on whichever road you take.') : null, tipEl),
      eyebrow(quests[0]?.kind === 'boss' && quests[0]?.step >= D.QUESTS_PER_ACT ? 'The road ends here' : 'The road ahead', 'center'),
      h('div', { class: `sx-quests n${quests.length}` }, quests.map(questCard)))));
  lay('board'); SCR.enter('road', { hero, heroes: X.members(), place, seed: c.seed }, `road:${place}:${hero.name}:${hero.cls}`);
  fitBoard(); requestAnimationFrame(fitBoard); setTimeout(fitBoard, 400); // again once the fonts and the card art have settled
}
// Phones: the whole quest card fits without a pull (Dave). When the sheet runs past the bottom, the hero picture above it gives up
// exactly that much room (never below about a quarter of the screen). Safari's toolbar changes the height, so it re-fits on resize.
function fitBoard() {
  const app = $('#app'); const s = app?.querySelector('.sx-board-main'); if (!s || !app.classList.contains('board')) return;
  app.style.removeProperty('--sheet');
  if (!matchMedia('(max-aspect-ratio: 1085/1000)').matches) return; // landscape keeps its side panel
  const over = s.scrollHeight - s.clientHeight; if (over <= 0) return;
  const base = parseFloat(getComputedStyle(app).getPropertyValue('--sheet')) || 0.6;
  app.style.setProperty('--sheet', String(Math.min(0.76, base + (over + 8) / window.innerHeight)));
}
if (typeof window !== 'undefined') window.addEventListener('resize', () => fitBoard());

// ------------------------------------------------------------------------------------------------ road events and story
// A story card (Dave did not love the old parchment scroll): a dark, gold-framed page in the game's own colours, a crest
// with an icon on its top edge, the kicker and title, a gold rule, then the tale. Used for road events and story beats.
function storyCard(kicker, titleText, body, { icon = 'road' } = {}, ...rest) {
  const paras = (Array.isArray(body) ? body : [body]).map((t) => String(t).trim()).filter(Boolean);
  return h('article', { class: 'sx-tale' }, h('span', { class: 'tl-crest', 'aria-hidden': 'true' }, ico(icon)),
    h('div', { class: 'tl-kicker' }, kicker), h('h1', { class: 'tl-title' }, titleText), h('div', { class: 'tl-rule', 'aria-hidden': 'true' }, h('i'), h('b'), h('i')),
    ...paras.map((t, i) => h('p', { class: 'tl-tell' }, i === 0 ? [h('span', { class: 'tl-cap' }, t.charAt(0)), t.slice(1)] : t)), ...rest);
}
// A story beat (js/story.js): the card over the road scene, and one button on.
export function story(b, onDone) {
  const hero = X.S.hero || X.members()[0]; let done = false;
  mountAs('road', h('div', { class: 'sx-split sx-road sx-storybeat' }, h('div', { class: 'sx-viewport' }, topBar(heroChip(hero))),
    h('div', { class: 'sx-side' }, h('div', { class: 'sx-sidetop' }, btn('Menu', X.menu, { kind: 'ghost', icon: 'menu', cls: 'sx-menubtn' })),
      storyCard(b.kicker, b.title, b.text, { icon: b.icon },
        b.facts?.length ? h('ul', { class: 'tl-facts' }, b.facts.map((f) => h('li', {}, f))) : null, // the act's Legend: highlights and titles
        b.teaser ? h('p', { class: 'tl-teaser' }, b.teaser) : null),
      h('div', { class: 'sx-cta' }, btn('Continue', () => { if (done) return; done = true; sfx.card(); onDone(); }, { big: true, icon: 'chevron', iconAfter: true, cls: 'wide' })))));
  const place = E.questsFor(hero)[0].place;
  lay('road'); SCR.enter('road', { hero, heroes: X.members(), place, seed: hero.campaign.seed }, `road:${place}:${hero.name}:${hero.cls}`);
}
export function road() {
  const members = X.members(); const hero = X.S.hero || members[0]; const ev = R.ensureRoad(hero, members); X.persist();
  const choices = h('div', { class: 'sx-choices' }, ev.choices.map((ch, i) => h('button', {
    class: `sx-choice ${ch.ok ? '' : 'off'}`, type: 'button', disabled: !ch.ok, style: { '--i': i }, 'aria-label': `${ch.label}. ${ch.hint}`,
    onclick: () => { if (X.chooseRoad) { sfx.card(); X.chooseRoad(ch.id); return; } const res = R.chooseRoad(hero, members, ch.id); if (!res) { sfx.error(); toast(ch.ok ? 'The road will not take that.' : 'You cannot afford that.'); return; } sfx.card(); X.persist(); trialThen(res); },
  }, h('span', { class: 'cx-seal' }, h('b', {}, String.fromCharCode(65 + i))), h('span', { class: 'cx-copy' }, ch.test ? statBadge(ev.stat) : null, h('b', {}, ch.label), h('small', {}, ch.hint)), ico('chevron'))));
  mountAs('road', h('div', { class: 'sx-split sx-road' }, h('div', { class: 'sx-viewport' }, topBar(heroChip(hero))),
    h('div', { class: 'sx-side' }, h('div', { class: 'sx-sidetop' }, btn('Menu', X.menu, { kind: 'ghost', icon: 'menu', cls: 'sx-menubtn' })),
      X.partyBar?.(), storyCard(ev.kicker, ev.title, ev.tell), eyebrow(X.partyBar ? 'What does the company do?' : 'What do you do?'), choices, coachBox(ev.stat ? 'r_trial' : 'r_road'))));
  const place = E.questsFor(hero)[0].place;
  lay('road'); SCR.enter('road', { hero, heroes: X.members(), place, seed: hero.campaign.seed }, `road:${place}:${hero.name}:${hero.cls}`);
}
// A test on the road: the dice roll first (trialui.js), then the result card, with a rematch offer after a loss (solo; a table does it in online.js).
export async function trialThen(res) {
  if (res.trial) await showTrial(res.trial, { title: res.title, members: X.members() });
  const hero = X.S.hero || X.members()[0]; const re = res.trial ? R.rematchInfo(hero, X.members()) : null;
  roadResult(res, re ? { extra: btn(`Ask for a rematch · ${re.cost} gold`, () => { const r2 = R.rematchTrial(hero, X.members()); if (!r2) { sfx.error(); toast('Not enough gold for a rematch.'); return; } sfx.card(); X.persist(); trialThen(r2); }, { kind: 'ghost', icon: 'reroll', cls: 'wide', disabled: !re.ok }) } : {});
}
export function roadResult(res, o = {}) {
  const hero = X.S.hero || X.members()[0];
  mountAs('road', h('div', { class: 'sx-split sx-road' }, h('div', { class: 'sx-viewport' }, topBar(heroChip(hero))),
    h('div', { class: 'sx-side' }, h('div', { class: 'sx-sidetop' }, btn('Menu', X.menu, { kind: 'ghost', icon: 'menu', cls: 'sx-menubtn' })),
      X.partyBar?.(), storyCard(o.kicker || (res.trial ? `${res.trial.win ? 'Won' : 'Lost'} · ${res.trial.heroTotal} to ${res.trial.oppTotal}` : 'The road answers'), res.title, res.text), /* a test shows its roll once, up top (T09) */ o.note ? h('p', { class: 'fine center' }, o.note) : null, o.extra || null, h('div', { class: 'sx-cta' }, btn(o.label || 'Onward', o.onward || X.showBoard, { big: true, icon: 'chevron', iconAfter: true, cls: 'wide', disabled: !!o.disabled })))));
  lay('road');
}

// ------------------------------------------------------------------------------------------------ secret objectives (secrets.js)
// The Envelope: the voice's scene (the same on every phone), your own card, the cover line to say out loud, and two buttons in the
// one Continue (Dave, Oct 2026: as long as there is a button), or Accept / Decline for an offered bribe.
// card: secrets.cardView(); o: { onAnswer(accept), waiting: [names], extra: node (the host's push), questName, solo (no cover line) }.
export function envelope(card, o = {}) {
  const hero = X.S.hero || X.members()[0]; let sent = card.answered;
  const offer = card.mode === 'offer';
  const answer = (accept) => { if (sent) return; sent = true; sfx.card(); o.onAnswer?.(accept); };
  const bonus = !!(o.bonus || card.kind === 'bonus'); const paid = bonus && card.stake > 0;
  const choice = card.answered
    ? h('p', { class: 'env-sealed' }, ico('check'), offer ? (card.accepted ? (bonus ? 'Objective accepted.' : 'You took the bribe.') : 'You said no.') : 'Sealed.')
    : h('div', { class: 'env-btns' },
      ...(offer ? [btn(paid ? `Bet ${card.stake} Gold` : 'Accept', () => answer(true), { big: true, cls: 'wide' }), btn('Decline', () => answer(false), { big: true, kind: 'ghost', cls: 'wide' })]
        : [btn('Continue', () => answer(true), { big: true, icon: 'chevron', iconAfter: true, cls: 'wide env-one' })]));
  const waiting = card.answered && o.waiting?.length ? h('p', { class: 'fine center' }, `Waiting for ${o.waiting.join(', ')} to read their envelope.`) : null;
  // A card you draw (Dave, Oct 2026: "less text, very clear, almost like a little card you would draw in a board game"): what kind of
  // card, the objective, its one rule, the stakes in a chip or two; "More" holds the story, the full terms and the cover line.
  const voice = String(card.voice || 'the voice').replace(/^./, (ch) => ch.toUpperCase());
  const more = [
    bonus ? `${voice} has a hard extra job for you this fight${paid ? ', and will take a wager on it' : ''}.` : card.scene,
    !bonus && card.flavor ? `“${card.flavor}”` : null,
    bonus ? (paid ? `Put down ${card.stake} gold. Pull it off and win the battle, and you get ${card.gold} back: ${card.gold - card.stake} more than you started with. Miss it, or lose the fight, and the ${card.stake} is gone. Declining costs nothing.` : `You are short of gold, so this one is free. Pull it off and win, and you get ${card.gold} gold.`) : card.reward,
    !bonus && !o.solo && card.cover ? `Keep it secret. If anyone asks, say: “${card.cover}”` : null,
  ].filter(Boolean);
  const details = h('div', { class: 'obj-more', hidden: true }, more.map((t) => h('p', {}, t)));
  const moreBtn = h('button', { type: 'button', class: 'obj-morebtn', 'aria-expanded': 'false', onclick: () => { const open = details.hidden; details.hidden = !open; moreBtn.setAttribute('aria-expanded', String(open)); moreBtn.textContent = open ? 'Less' : 'More'; sfx.click?.(); } }, 'More');
  mountAs('road offer', h('div', { class: 'sx-split sx-road sx-envelope' }, h('div', { class: 'sx-viewport' }, topBar(heroChip(hero))),
    h('div', { class: 'sx-side' },
      X.partyBar?.(),
      h('div', { class: 'obj-stage' },
        h('div', { class: `cw-obj${bonus ? ' bonus' : ''}` }, CW.envelopeCardEl(card, bonus)),
        h('div', { class: 'cw-more' }, moreBtn, details)),
      h('div', { class: 'sx-cta env-cta' }, choice, waiting, card.answered ? o.extra || null : null))));
  const place = E.questsFor(hero)[0]?.place;
  lay('envelope'); $('#app')?.style.setProperty('--sheet', window.innerHeight < 600 ? '0.9' : '0.86'); /* a whole card: the picture above gives up most of its room */ if (place) SCR.enter('road', { hero, heroes: X.members(), place, seed: hero.campaign.seed }, `road:${place}:${hero.name}:${hero.cls}`);
}
// The Reveal gets its own beat (the bots' playtest, Oct 2026): straight after the fight, before the brag board, the spoils and the
// perks, one screen with every card turned over, and a Continue. o: { hero, place, won, onDone }.
export function reveal(rv, o = {}) {
  const hero = o.hero || X.S.hero; let done = false;
  const bonus = !!(o.bonus || rv?.bonus || rv?.lines?.some((l) => l.kind === 'bonus'));
  const title = bonus
    ? (o.won === false ? 'The fight is lost, but the Objective still counts' : 'Objective')
    : (o.won === false ? 'The battle is lost, but the envelopes still open' : 'Every envelope, opened');
  const line = bonus
    ? `${rv.voice || 'The gold-giver'} checks the Objective.`
    : `${title}. ${rv.voice || 'The voice'} reads every card aloud.`;
  mountAs('victory', h('div', { class: 'sx-split sx-victory sx-revealbeat' }, h('div', { class: 'sx-viewport' }),
    h('div', { class: 'sx-side' }, h('div', { class: 'sx-sidetop' }, btn('Menu', X.menu, { kind: 'ghost', icon: 'menu', cls: 'sx-menubtn' })),
      h('header', { class: 'vc-head rv-head' }, eyebrow(bonus ? 'Objective' : 'The Reveal', 'gold'), h('p', {}, line), flourish()),
      revealPanel(rv, hero?.name, { bare: true }),
      h('div', { class: 'sx-cta' }, btn('Continue', () => { if (done) return; done = true; sfx.card(); o.onDone?.(); }, { big: true, icon: 'chevron', iconAfter: true, cls: 'wide' })))));
  lay('victory'); if (hero) SCR[o.won === false ? 'defeat' : 'victory'](hero, o.place);
}
// The Reveal (every card, and what each hero did with it). reveal: { voice, crooks, lines: [{ name, gold, line }] }.
export function revealPanel(reveal, youName, { bare = false } = {}) {
  if (!reveal?.lines?.length) return null;
  return panel('sx-reveal', bare ? null : eyebrow('The Reveal', 'gold'),
    bare ? null : h('p', { class: 'fine' }, reveal.lines.length > 1 ? `${reveal.voice} opens every envelope.` : `${reveal.voice} opens your envelope.`),
    h('ul', { class: 'rv-list' }, reveal.lines.map((l) => h('li', { class: `rv-row ${l.name === youName ? 'you' : ''} ${l.gold > 0 ? 'up' : l.gold < 0 ? 'down' : ''}` },
      h('p', {}, l.line), l.gold ? h('span', { class: 'rv-gold' }, ico('coin'), `${l.gold > 0 ? '+' : ''}${l.gold}`) : null))));
}

// ------------------------------------------------------------------------------------------------ victory / defeat
const PERK_ICON = { diamond: 'gem', vitality: 'heart', reserve: 'spark', quick: 'reroll', keen: 'sword', ward: 'shield', piercer: 'pierce', greed: 'coin', grit: 'skull', linebreaker: 'dice' };
function perkCard(id, hero, onpick, i) {
  const p = D.PERKS[id]; const have = hero.perks.filter((x) => x === id).length;
  const pv = D.TEAMWORK.perkPreview && E.perkPreview(hero, id);
  if (pv) { // the teamwork pass: the exact effect, and this hero's number before and after (from the same rules the game uses)
    return h('button', { class: `sx-perk perk-${id} pv`, type: 'button', style: { '--i': i }, onclick: tap(onpick), 'aria-label': `${p.name}. ${pv.text} ${pv.what}: ${pv.before} to ${pv.after}.` },
      h('span', { class: 'pk-ico' }, ico(PERK_ICON[id] || 'star', '', 34)), h('b', {}, p.name), h('small', {}, pv.text),
      h('span', { class: `pk-change ${pv.same ? 'same' : ''}` }, h('i', {}, pv.what), h('b', {}, String(pv.before)), ico('chevron'), h('b', { class: 'to' }, String(pv.after))),
      pv.note ? h('small', { class: 'pk-note' }, pv.note) : null,
      h('span', { class: 'pk-rank' }, pips(have, p.max), h('em', {}, `Rank ${have + 1} of ${p.max}`)));
  }
  return h('button', { class: `sx-perk perk-${id}`, type: 'button', style: { '--i': i }, onclick: tap(onpick), 'aria-label': `${p.name}. ${p.text}` },
    h('span', { class: 'pk-ico' }, ico(PERK_ICON[id] || 'star', '', 34)), h('b', {}, p.name), h('small', {}, p.text), p.diamond ? h('span', { class: 'pk-rank' }, h('em', {}, `Case ${E.diamondsOf(hero).length + 1} of ${D.DIAMOND.max}`)) : h('span', { class: 'pk-rank' }, pips(have, p.max), h('em', {}, have + 1 > p.max ? 'Max' : `Rank ${have + 1}`)));
}
export function victory(first) {
  const S = X.S; const Rw = S.rewards; const hero = S.hero;
  X.nextPerkOffer();
  const animate = !Rw.shown && !reduced(); Rw.shown = true;
  const lvBefore = Rw.lvBefore; const lvNow = hero.level; const maxed = hero.level >= D.MAX_LEVEL;
  let xpBefore = hero.xp - Rw.xp; for (let l = lvBefore; l < lvNow; l++) xpBefore += D.xpToNext(l);
  const need = D.xpToNext(hero.level);
  const xpFill = h('i', { style: { width: '0%' } }); const xpNum = h('b', {}, '0'); const goldNum = h('b', {}, '0');
  const bar = h('div', { class: 'vc-bar', role: 'img', 'aria-label': `${hero.xp} of ${need} XP` }, xpFill, h('span', { class: 'vc-ticks' }));
  const lvl = lvNow > lvBefore ? h('div', { class: 'vc-lvl' }, h('span', { class: 'rays' }), h('small', {}, 'Level up'), h('b', {}, String(lvNow))) : null;
  const rewards = panel('sx-rewards', h('div', { class: 'vc-row' },
    h('div', { class: 'vc-stat xp' }, h('small', {}, 'Experience'), h('div', {}, '+', xpNum)),
    h('div', { class: 'vc-stat gold' }, h('small', {}, Rw.gold >= 0 ? 'Gold' : 'Gold lost'), h('div', {}, ico('coin'), Rw.gold >= 0 ? '+' : '', goldNum)),
    h('div', { class: 'vc-stat pts' }, h('small', {}, 'Battle points'), h('div', {}, String(Rw.points ?? 0)), hero.record?.best === Rw.points && hero.record?.battles > 1 ? h('em', { class: 'vc-best' }, 'New best!') : null),
    lvl),
  h('div', { class: 'vc-xp' }, bar, h('small', {}, maxed ? 'Max level' : `${hero.xp} / ${need} XP to level ${lvNow + 1}`)));
  const perks = Rw.offer ? panel('sx-perks glow', eyebrow(`Level up. Choose a perk${hero.pendingPerks > 1 ? ` (${hero.pendingPerks} to pick)` : ''}`, 'gold'),
    h('div', { class: 'perk-row' }, Rw.offer.map((id, i) => perkCard(id, hero, () => { E.takePerk(hero, id); Rw.offer = null; sfx.level(); X.persist(); X.renderVictory(); }, i)))) : null;
  // Spoils: take one into your pack, or sell it on the spot for half its worth. A full pack must make room first.
  const full = E.bagFull(hero); const done = () => { sfx.coin(); X.persist(); X.renderVictory(); };
  const packStrip = full && Rw.picked == null ? h('div', { class: 'sx-pack' },
    h('p', { class: 'pk-head' }, ico('bag'), h('b', {}, `Your pack is full (${hero.bag.length}/${D.BAG_MAX})`), h('small', {}, 'Sell one to make room, or sell the spoils.')),
    h('div', { class: 'pk-list' }, hero.bag.map((it) => h('div', { class: 'pk-item' }, h('span', {}, `${D.tierName(it)} ${D.WEAPONS[it.id].name} · d${E.weaponSize(it)}`),
      chipBtn('Sell', E.sellValue(it), () => { HE.sellItem(hero, it.uid); done(); }, { kind: 'ghost', aria: `Sell ${D.WEAPONS[it.id].name} for ${E.sellValue(it)} gold` }))))) : null;
  const loot = Rw.repeat || Rw.picked === 'none' ? null
    : Rw.picked == null
    ? panel('sx-loot', eyebrow(`Choose your spoils · pack ${hero.bag.length}/${D.BAG_MAX}`, 'gold'), packStrip, h('div', { class: 'loot-row' }, Rw.drops.map((inst, i) => weaponCard(inst, { cls: 'pick', actions: [
      btn(full ? 'Pack full' : 'Take', () => { if (!E.takeDrop(hero, inst)) return; Rw.picked = i; Rw.sold = false; done(); }, { kind: 'primary', icon: 'bag', disabled: full }),
      chipBtn('Sell', E.sellValue(inst), () => { E.sellDrop(hero, inst); Rw.picked = i; Rw.sold = true; done(); }, { kind: 'ghost', cls: 'sell', aria: `Sell it now for ${E.sellValue(inst)} gold` }),
    ] }))))
    : panel('sx-loot done', h('p', { class: 'muted' }, Rw.sold ? `You sold the ${D.tierName(Rw.drops[Rw.picked])} ${D.WEAPONS[Rw.drops[Rw.picked].id].name} for ${E.sellValue(Rw.drops[Rw.picked])} gold. Coins, at least, never argue.` : `You took the ${D.tierName(Rw.drops[Rw.picked])} ${D.WEAPONS[Rw.drops[Rw.picked].id].name}. It waits in your pack, humming a little.`));
  const lootHint = Rw.repeat || Rw.picked != null ? null : (Rw.drops.some((d) => D.WEAPONS[d.id].hands === 2) && Coach.wantHint(hero, 'v_twohand') ? coachBox('v_twohand') : coachBox('v_loot'));
  const gemLine = (txt) => h('p', { class: 'dm-line' }, ico('gem'), txt);
  const diamondPanel = Rw.diamond ? panel('sx-diamond', eyebrow('A Diamond weapon', 'gold'), h('div', { class: 'loot-row one' }, weaponCard(Rw.diamond, { cls: 'pick' })),
    Rw.diamondTaken ? gemLine(`It is in your Diamond case (${E.diamondsOf(hero).length} of ${D.DIAMOND.max}). Bring it from camp, under your dice, when a fight matters.`)
      : Rw.diamondSold ? gemLine(`Sold for ${E.diamondSellValue(Rw.diamond)} gold. A sensible choice. The Diamond disagrees, quietly.`)
        : [gemLine(`Your Diamond case is full (${D.DIAMOND.max} of ${D.DIAMOND.max}). Sell this one, or leave it behind and use a Diamond in a fight to make room.`),
          h('div', { class: 'row end' }, chipBtn('Sell it', E.diamondSellValue(Rw.diamond), () => { hero.gold += E.diamondSellValue(Rw.diamond); Rw.diamondSold = true; sfx.coin(); X.persist(); X.renderVictory(); }, { kind: 'ghost' }))]) : null;
  // charms in the spoils: take one (a boss offers two to choose from); with three already, swap one out
  const charmPanel = Rw.charms?.length && !Rw.repeat ? panel('sx-charms-loot', eyebrow(Rw.charms.length > 1 ? 'Choose a charm' : 'A charm', 'gold'), charmGuideBtn(),
    Rw.charmTaken ? h('p', { class: 'muted' }, `You took the ${D.CHARMS[Rw.charmTaken].name}. It works from your next fight.`)
      : h('div', { class: 'ch-list' }, Rw.charms.map((id) => charmCard(id, { actions: E.charmFull(hero)
        ? E.charmsOf(hero).map((old) => btn(`Swap for ${D.CHARMS[old].name}`, () => { HE.dropCharm(hero, old); if (HE.takeCharm(hero, id)) { Rw.charmTaken = id; sfx.level(); X.persist(); X.renderVictory(); } }, { kind: 'ghost', cls: 'ch-swap' }))
        : [btn('Take', () => { if (HE.takeCharm(hero, id)) { Rw.charmTaken = id; sfx.level(); X.persist(); X.renderVictory(); } }, { icon: 'star' })] }))),
    !Rw.charmTaken && E.charmFull(hero) ? h('p', { class: 'fine' }, `You carry ${D.CHARM_MAX} charms, the most there is. Swap one out, or leave this behind.`) : null) : null;
  const shattered = Rw.shattered?.length ? h('p', { class: 'dm-line shattered' }, ico('gem'), `${Rw.shattered.map((d) => `Your Diamond ${D.WEAPONS[d.id].name}`).join(' and ')} shattered into light.`) : null;
  const worn = (Rw.broken || []).map((l) => h('p', { class: 'dm-line worn' }, ico('sword'), l)); // weapons that wore out (Oct 2026)
  const ready = !Rw.offer && hero.pendingPerks === 0 && Rw.picked != null;
  const note = Rw.repeat ? h('p', { class: 'sx-repeat' }, SV.repeatNote(Rw.share)) : null;
  mountAs(`victory ${animate ? 'anim' : ''}`, h('div', { class: 'sx-split sx-victory' }, h('div', { class: 'sx-viewport' }),
    h('div', { class: 'sx-side' },
      h('header', { class: 'vc-head' }, eyebrow(Rw.quest.name), h('h1', { class: 'vc-title' }, 'Victory'), h('p', {}, Rw.repeat ? SV.repeatNote(Rw.share) : 'The way is open. Go on, then.'), flourish()),
      note, shattered, ...worn, rewards, charmPanel, diamondPanel, perks, lootHint, Rw.repeat ? null : loot, reportRow(),
      h('div', { class: 'sx-cta' }, btn(ready ? 'To camp' : 'Choose a perk and spoils to continue', () => X.showCamp({ fromBoard: false }), { big: true, icon: ready ? 'tent' : null, disabled: !ready, cls: 'wide' })))));
  lay('victory'); SCR.victory(hero, Rw.quest?.place || S.quest?.place);
  // fill / count animations
  const fillTo = (pct, ms) => { xpFill.style.transition = reduced() ? 'none' : `width ${ms}ms cubic-bezier(.2,.8,.2,1)`; xpFill.style.width = `${pct}%`; };
  const endPct = maxed ? 100 : Math.min(100, (hero.xp / need) * 100);
  if (!animate) { xpNum.textContent = String(Rw.xp); goldNum.textContent = String(Math.abs(Rw.gold)); xpFill.style.width = `${endPct}%`; return; }
  const startNeed = D.xpToNext(lvBefore); xpFill.style.width = `${Math.min(100, (xpBefore / startNeed) * 100)}%`;
  countUp(xpNum, 0, Rw.xp, 1100, undefined, 500); countUp(goldNum, 0, Math.abs(Rw.gold), 1100, undefined, 650);
  if (lvNow > lvBefore) {
    setTimeout(() => fillTo(100, 700), 600);
    setTimeout(() => { xpFill.style.transition = 'none'; xpFill.style.width = '0%'; void xpFill.offsetWidth; lvl.classList.add('pop'); bar.classList.add('flash'); sfx.level?.(); fillTo(endPct, 800); }, 1400);
  } else setTimeout(() => fillTo(endPct, 1000), 600);
}
export function defeat(retreat, loss) {
  const S = X.S; const hero = S.hero;
  const lines = [['Level', `${hero.level}`, 'hero'], ['Gear', `${Object.values(hero.loadout).filter((w, i, a) => !w.twin && a.findIndex((x) => x.uid === w.uid) === i).length + hero.bag.length} weapons`, 'bag'], ['Perks', `${hero.perks.length}`, 'star']];
  mountAs('defeat', h('div', { class: 'sx-split sx-defeat' }, h('div', { class: 'sx-viewport' }),
    h('div', { class: 'sx-side' },
      h('header', { class: 'df-head' }, eyebrow(S.quest?.name || ''), h('h1', { class: 'df-title' }, retreat ? 'You withdraw' : 'You have fallen'), h('p', {}, retreat ? 'A wise person lives to fight tomorrow. Tomorrow is still yours.' : 'The dark wins this round. It does not get to keep you. Up you get.'), flourish()),
      panel('sx-grace', h('p', { class: 'df-loss' }, loss ? h('span', {}, `You dropped `, coin(loss, 'inline'), ' in the dust. Coins can be found again.') : 'You lost nothing but pride, and pride grows back.'),
        S.shattered?.length ? h('p', { class: 'dm-line shattered' }, ico('gem'), `${S.shattered.map((d) => `Your Diamond ${D.WEAPONS[d.id].name}`).join(' and ')} shattered into light. Diamonds are for one fight, whatever its ending.`) : null,
        ...(S.broken || []).map((l) => h('p', { class: 'dm-line worn' }, ico('sword'), l)),
        h('p', { class: 'muted' }, 'Everything that makes you stronger is still yours.'),
        h('ul', { class: 'df-keep' }, lines.map(([k, v, ic]) => h('li', {}, ico(ic), h('span', {}, k), h('b', {}, v), ico('check', 'ok'))))),
      h('p', { class: 'df-tip' }, 'Rest at camp, spend your gold on a bigger die, then walk the road again. The hill will wait. Hills always do.'), reportRow(),
      h('div', { class: 'sx-cta' }, btn('Return to camp', () => X.showCamp({ fromBoard: false }), { big: true, icon: 'tent', cls: 'wide' })))));
  lay('defeat'); SCR.defeat(hero, S.quest?.place);
}

// ------------------------------------------------------------------------------------------------ camp
function dieBadge(size, cls = '') { return h('span', { class: `sx-die d${size} ${cls}` }, ico(`d${size}`, '', 44), h('b', {}, String(size))); }
// ---- the Forge as a shop (Dave, Oct 2026: "you don't even realize how many things you can upgrade"). One compact row per upgrade: an
// icon or die, a name with what it becomes, one short line, and the price: bright when you can afford it, dim with what you still need
// when you cannot, a check when it is maxed. FORGE.tally counts what your gold can buy in each section, for the jump strip and the badge.
const FORGE = { tally: null, sec: null, info: new Set() };
const tallyUp = (n = 1) => { if (FORGE.tally && FORGE.sec) FORGE.tally[FORGE.sec] = (FORGE.tally[FORGE.sec] || 0) + n; };
function priceBtn(label, price, ok, buy, aria) {
  const hero = X.S.hero; if (ok) tallyUp();
  const b = btn(label || '', buy, { disabled: !ok, cls: `ur-buy ${!ok ? 'poor' : ''}`, aria: aria || `${label ? `${label} for ` : ''}${price} gold` }); b.append(priceChip(price, { poor: !!hero && hero.gold < price }));
  if (!ok && hero && hero.gold < price) b.append(h('span', { class: 'need-row' }, h('small', { class: 'need' }, `need ${price - hero.gold}`))); // (your gold is in the header; Dave: the button must not squash the text)
  return b;
}
const maxTag = (text = 'Max') => h('span', { class: 'ur-max' }, ico('check'), text);
const gateTag = (text) => h('span', { class: 'ur-max gate' }, ico('lock'), text);
const rowIco = (name) => h('span', { class: 'ur-ico', 'aria-hidden': 'true' }, ico(name));
const bought = () => { sfx.level(); X.persist(); X.renderCamp(); };
function upgradeRow(kind, slot, label, line) {
  const hero = X.S.hero; if (kind === 'speed') E.feetSize(hero); if (kind === 'mind') E.mindSize(hero); const size = hero[kind][slot];
  const u = kind === 'strength' ? E.strengthUpgrade(hero, slot) : kind === 'speed' ? E.speedUpgrade(hero) : kind === 'mind' ? E.mindUpgrade(hero) : E.specialUpgrade(hero, slot);
  return h('div', { class: `sx-urow cmp ${u.ok ? 'can' : ''} ${!u.next ? 'maxed' : ''}` }, dieBadge(size, 'ur-die'),
    h('div', { class: 'ur-copy' }, h('b', {}, label, u.next ? h('em', { class: 'ur-to' }, ` d${size} → d${u.next}`) : h('em', { class: 'ur-to' }, ` d${size}`)), h('small', {}, line)),
    !u.next ? maxTag() : u.act && !u.ok ? gateTag(`Act ${D.ROMAN[u.act]}`)
      : priceBtn('', u.cost, u.ok, () => { if (HE.upgradeDie(hero, kind, slot)) bought(); }, `Upgrade ${label} to d${u.next} for ${u.cost} gold`));
}
// Shrink a die for gold (Dave): a small ghost button under the upgrade. It asks twice, because a talent die or the pet's die loses the symbols on the faces that go.
function shrinkBtn(kind, slot, label) {
  const hero = X.S.hero; const d = E.downgradeInfo(hero, kind, slot); if (!d.next) return null;
  let armed = false; let timer = null;
  const text = (on) => (on ? `Tap again${d.lose ? `: lose ${d.lose} symbol${d.lose > 1 ? 's' : ''}` : ''} · ${d.cost}` : `Shrink to d${d.next} · ${d.cost}`);
  const b = h('button', { type: 'button', class: 'sx-shrink', disabled: !d.ok, 'aria-label': `Shrink ${label} to d${d.next} for ${d.cost} gold${d.lose ? `, losing ${d.lose} symbols` : ''}`,
    onclick: () => {
      if (!armed) { armed = true; b.classList.add('armed'); b.textContent = text(true); timer = setTimeout(() => { armed = false; b.classList.remove('armed'); b.textContent = text(false); }, 4000); return; }
      clearTimeout(timer);
      if (HE.downgradeDie(hero, kind, slot)) { sfx.card(); X.persist(); X.renderCamp(); } else sfx.error();
    } }, text(false));
  return b;
}
// A carried weapon: forge its metal (more icons, a bigger crit) and train its size (bigger numbers; needs a big enough hand).
function weaponRow(inst, label = '') {
  const hero = X.S.hero; const w = D.WEAPONS[inst.id]; const size = E.weaponSize(inst);
  const f = E.forgeInfo(hero, inst.uid); const t = E.trainInfo(hero, inst.uid);
  const forge = f.next ? priceBtn(`Forge ${D.RARITY[f.next]}`, f.cost, f.ok, () => { if (HE.forgeWeapon(hero, inst.uid)) bought(); }, `Forge ${w.name} to ${D.RARITY[f.next]} for ${f.cost} gold`) : maxTag(f.why === 'legendary' ? 'Legendary' : D.tierName(inst));
  const train = !t.next ? maxTag(`d${size}`) : t.why === 'hands' ? gateTag(`d${t.next} hand first`)
    : t.cost ? priceBtn(`Train d${t.next}`, t.cost, t.ok, () => { if (HE.trainWeapon(hero, inst.uid)) bought(); }, `Train ${w.name} to d${t.next} for ${t.cost} gold`)
      : btn(`Train d${t.next}`, () => { if (HE.trainWeapon(hero, inst.uid)) bought(); }, { cls: 'ur-buy', disabled: !t.ok, aria: `Train ${w.name} to d${t.next}` });
  return h('div', { class: 'sx-urow cmp wrow2' }, rowIco(w.lean === 'def' ? 'shield' : 'sword'),
    h('div', { class: 'ur-copy' }, h('b', {}, label || w.name, h('em', { class: 'ur-to' }, ` ${D.tierName(inst)} · d${size}`)),
      h('small', {}, D.EXPERIMENT.weaponSize ? 'Never wears out. Size is bought at camp.' : E.noWear() ? 'Never wears out. Weapons are found or bought, not forged.' : `${E.wearLabel(inst)}. Weapons are found or bought now, not forged.`)),
    h('div', { class: 'ur-btns' }, forge, train));
}
// Camp's status bar (Oct 2026): where you are on the road and your potions, in one slim strip above the tabs.
function campStatus(hero) {
  const c = hero.campaign; const act = X.actOf(hero);
  const r = E.potionBuyInfo(hero);
  const pips = h('span', { class: 'cs-steps', role: X.net ? null : 'group', 'aria-label': 'Quests of this act: tap one you have reached to play it' }, Array.from({ length: D.QUESTS_PER_ACT }, (_, i) => {
    const n = i + 1; const kind = D.stepKind(act, n); const done = n < c.step; const now = n === c.step; const reach = !done && !now && SV.canStartAt(hero, c.act, n);
    return h('button', { type: 'button', class: `cs-step ${done ? 'done' : ''} ${now ? 'now' : ''} ${reach ? 'reach' : ''} ${kind === 'battle' ? '' : kind}`, disabled: !!X.net, 'aria-label': `Quest ${n}${now ? ', you are here' : ''}`,
      onclick: X.net ? null : tap(() => stepAsk(hero, c.act, n, () => X.renderCamp())) }, kind === 'boss' ? ico('crown') : kind === 'elite' ? ico('skull') : String(n));
  }));
  const vials = h('span', { class: 'sp-vials', 'aria-label': `${r.have} of ${r.max} potions` }, Array.from({ length: r.max }, (_, i) => h('i', { class: i < r.have ? 'full' : '' }, ico('plus'))));
  const buy = r.have >= r.max ? h('span', { class: 'sp-full' }, 'Full')
    : chipBtn('', r.price, () => { if (HE.buyPotion(hero)) { sfx.coin(); X.persist(); X.renderCamp(); } else { sfx.error(); toast('Not enough gold.'); } }, { poor: !r.ok, disabled: !r.ok, cls: `sp-buy ${!r.ok ? 'poor' : ''}`, aria: `Buy a healing potion (heals ${E.potionHpOf(hero)}) for ${r.price} gold` });
  return h('section', { class: `sx-cstat slim ${r.have === 0 ? 'empty' : ''}`, 'aria-label': 'Where you are, and your potions' },
    h('div', { class: 'cs-where' }, h('b', {}, `Act ${romans[c.act - 1] || c.act}`), pips),
    h('div', { class: 'cs-pots' }, h('b', { class: 'cs-potlabel' }, 'Potions'), vials, buy)); // named, like the act beside it (Dave: "needs to say potion somewhere")
}
// (Potion belt and the 4th reroll die are sold in the cardboard Camp Store: storeTab.)
// ---- dice you do not have yet, and the talent dice (bottom corners): grow them and choose which symbols sit on which faces
const SYM_ICO = { atk: ['burst', 'c-atk'], block: ['shield', 'c-block'], pierce: ['pierce', 'c-pierce'], magic: ['spark', 'c-magic'], heal: ['plus', 'c-heal'], gold: ['coin', 'c-gold'] };
const symChip = (k, cls = '') => h('span', { class: `fx ${SYM_ICO[k][1]} ${cls}` }, ico(SYM_ICO[k][0]));
const DIE_NAME = { SW: 'Left talent die', SE: 'Right talent die', NE: 'Right weapon die' };
const TAL = { slot: null, face: null, sym: null };
// Dice you do not have yet: a row each, to add them to the board.
function unlockRows(hero, slots) {
  return D.UNLOCK_ORDER.filter((s) => slots.includes(s) && !E.isActive(hero, s)).map((slot) => {
    const u = E.unlockInfo(hero, slot); const talent = slot !== 'NE';
    return h('div', { class: 'sx-urow cmp new-die' }, rowIco('dice'),
      h('div', { class: 'ur-copy' }, h('b', {}, `Add the ${DIE_NAME[slot].toLowerCase()}`), h('small', {}, talent ? 'A new die on your board; you choose a symbol for each of its faces.' : 'Your second weapon die: hold a weapon in each hand.')),
      priceBtn('Add', u.cost, u.ok, () => { if (HE.unlockDie(hero, slot)) bought(); }, `Add the ${DIE_NAME[slot]} for ${u.cost} gold`));
  });
}
function talentCard(hero, slot) {
  const size = hero.special[slot]; const info = E.talentInfo(hero, slot); const faces = hero.talent?.[slot] || [];
  const up = E.specialUpgrade(hero, slot);
  // Each number face (4 up to the die's size) pays its number in the symbol you buy for it; pay once, more for a bigger number.
  let canPick = false;
  const symFaces = Array.from({ length: info.faces }, (_, f) => {
    const num = info.nums[f]; const cost = info.costs[f]; const entry = faces[f]; const k = Array.isArray(entry) ? entry[0] : entry; const open = TAL.slot === slot && TAL.face === f;
    if (k) return h('button', { class: `tal-face num bought ${SYM_ICO[k][1]}`, type: 'button', 'aria-label': `Face ${num}: ${num} ${D.TALENT_SYMS[k].name}. Tap to clear it.`, onclick: tap(() => { HE.removeTalent(hero, slot, f, 0); sfx.card(); X.persist(); X.renderCamp(); }) },
      h('b', { class: 'tn' }, String(num)), h('span', { class: 'ts' }, ico(SYM_ICO[k][0])));
    if (hero.gold >= cost) canPick = true;
    return h('button', { class: `tal-face num empty ${open ? 'open' : ''}`, type: 'button', 'aria-label': `Face ${num}: empty, does nothing. Pick a symbol for ${cost} gold.`, onclick: tap(() => { TAL.slot = slot; TAL.face = open ? null : f; X.renderCamp(); }) },
      h('b', { class: 'tn' }, String(num)), h('span', { class: 'ts plus' }, '+'), h('small', { class: `tp ${hero.gold >= cost ? '' : 'poor'}` }, String(cost)));
  });
  if (canPick) tallyUp();
  const picking = TAL.slot === slot && TAL.face != null && TAL.face < info.faces && !(faces[TAL.face] || []).length;
  const picker = picking ? h('div', { class: 'tal-pick' }, h('small', { class: 'tal-cost' }, `Face ${info.nums[TAL.face]} will pay ${info.nums[TAL.face]} of whatever you choose. ${info.costs[TAL.face]} gold, once.`),
    ...Object.keys(D.TALENT_SYMS).map((k) => {
      const left = info.same - E.talentCount(hero, slot, k); const can = left > 0 && hero.gold >= info.costs[TAL.face]; const num = info.nums[TAL.face];
      return h('button', { class: `tal-opt ${SYM_ICO[k][1]}`, type: 'button', disabled: !can, 'aria-label': `${num} ${D.TALENT_SYMS[k].name}. ${left} left on this die.`, onclick: tap(() => { if (HE.addTalent(hero, slot, TAL.face, k)) { TAL.face = null; sfx.coin(); X.persist(); X.renderCamp(); } else sfx.error(); }) }, ico(SYM_ICO[k][0]), h('b', {}, D.TALENT_SYMS[k].name), h('small', {}, left > 0 ? `${num} · ${left} left` : 'used twice'));
    })) : null;
  return h('div', { class: 'sx-urow tal-die cmp' },
    h('div', { class: 'tal-top' }, dieBadge(size, 'ur-die'),
      h('div', { class: 'ur-copy' }, h('b', {}, DIE_NAME[slot], h('em', { class: 'ur-to' }, up.next ? ` d${size} → d${up.next}` : ` d${size}`)), h('small', {}, `${info.used} of ${info.faces} faces set. Tap a + face to give it a symbol.`)),
      !up.next ? maxTag('Full') : up.act && !up.ok ? gateTag(`Act ${D.ROMAN[up.act]}`)
        : priceBtn('', up.cost, up.ok, () => { if (HE.upgradeDie(hero, 'special', slot)) bought(); }, `Grow the ${DIE_NAME[slot]} to d${up.next} for ${up.cost} gold`)),
    h('div', { class: 'tal-strip mini' },
      h('div', { class: 'tal-face blank', title: 'Face 1: blank' }, h('b', {}, '·')), h('div', { class: 'tal-face x2', title: `Face 2: doubles your ${slot === 'SW' ? 'left' : 'right'} hand` }, h('b', {}, '2×')),
      h('div', { class: 'tal-face blank', title: 'Face 3: blank' }, h('b', {}, '·')), symFaces),
    picker);
}
// ---- pets (Dave, Oct 2026): the Camp Store sells one a camp. Train it like a talent die and grow it d4 -> d6 -> d8.
const PET = { face: null };
const petPic = (type, size = 84) => h('span', { class: 'pet-pic', 'aria-hidden': 'true', style: { '--pc': D.PETS[type]?.color } }, h('img', { src: petImg(type), alt: '', style: { height: `${size}px` } }));
const petSyms = (hero) => [...new Set([...Object.keys(D.TALENT_SYMS), D.PETS[hero.pet.type].kind])]; // the pet's own symbol may be one talents lack (Bristle's pierce)
const petLeft = (hero, k) => (k === D.PETS[hero.pet.type].kind ? D.petKindMax(hero.pet.size) : D.TALENT_MAX_SAME) - hero.pet.faces.flat().filter((x) => x === k).length;
// adopting (or trading for) the store's pet: the same flow the old offer row ran, shared by the cardboard store card
function petAsk(hero, o) {
  const p = D.PETS[o.type]; const swap = hero.pet && !o.owned;
  const adopt = () => { if (HE.buyPet(hero)) { PET.face = null; sfx.level(); X.persist(); X.renderCamp(); toast(`${p.name} joins you! Train it under Upgrades.`); } else { sfx.error(); toast('Not enough gold.'); } };
  if (!swap) return adopt();
  const old = D.PETS[hero.pet.type].name;
  const close = modal(h('div', { class: 'form confirm-home' }, h('h2', {}, `Trade ${old} for ${p.name}?`),
    h('p', { class: 'muted' }, `${old} goes home to a warm hearth, and its training goes too. ${p.name} starts fresh as a d4. No hard feelings. Many feelings, none of them hard.`),
    h('div', { class: 'row end' }, btn(`Keep ${old}`, () => close(), { kind: 'ghost' }), btn(`Adopt ${p.name}`, () => { close(); adopt(); }))));
}
function petOfferCard(hero) {
  const o = E.petOffer(hero); if (!o) return null; const p = D.PETS[o.type];
  const swap = hero.pet && !o.owned;
  const ask = () => petAsk(hero, o);
  const chip = (k) => (k ? symChip(k) : h('span', { class: 'fx blank' }, '·'));
  return h('div', { class: 'pet-offer', style: { '--pc': p.color } }, petPic(o.type, 96),
    h('div', { class: 'po-copy' }, h('small', { class: 'po-kicker' }, 'A pet for the road.'), h('b', {}, p.name), h('small', {}, p.text),
      h('div', { class: 'po-faces', 'aria-label': 'Its d4: one blank face, two symbols, one face to train' }, chip(null), chip(p.kind), chip(p.kind), h('span', { class: 'fx open' }, '+'))),
    o.owned ? h('span', { class: 'sold-tag' }, 'With you')
      : chipBtn(swap ? 'Trade' : 'Adopt', o.price, ask, { disabled: hero.gold < o.price, poor: hero.gold < o.price, cls: 'buy', aria: `Adopt ${p.name} for ${o.price} gold` }));
}
function petCard(hero) {
  const pet = hero.pet; const p = D.PETS[pet.type]; const t = E.petTrainInfo(hero); const pw = E.petPowerOf(hero); const g = E.petGrowInfo(hero);
  const refresh = () => { sfx.card(); X.persist(); X.renderCamp(); };
  if (t.used < t.slots && hero.gold >= t.cost) tallyUp(); // a symbol you could train now
  const faces = Array.from({ length: t.faces }, (_, f) => {
    const cur = pet.faces[f] || [];
    const slotsEl = Array.from({ length: D.TALENT_PER_FACE }, (_, i) => {
      const k = cur[i]; const open = PET.face === f && i === cur.length;
      if (k) return h('button', { class: `tal-slot full ${SYM_ICO[k][1]}`, type: 'button', 'aria-label': `${D.SYM_NAMES[k]}. Tap to remove.`, onclick: tap(() => { HE.removePetSymbol(hero, f, i); refresh(); }) }, ico(SYM_ICO[k][0]));
      return h('button', { class: `tal-slot ${open ? 'open' : ''}`, type: 'button', disabled: i > cur.length, 'aria-label': 'Add a symbol', onclick: tap(() => { PET.face = f; X.renderCamp(); }) }, '+');
    });
    return h('div', { class: 'tal-face' }, h('small', {}, `Face ${f + 2}`), h('div', { class: 'tal-slots' }, slotsEl));
  });
  const picker = PET.face != null && PET.face < t.faces ? h('div', { class: 'tal-pick' }, petSyms(hero).map((k) => {
    const left = petLeft(hero, k); const full = (pet.faces[PET.face] || []).length >= D.TALENT_PER_FACE;
    const can = left > 0 && !full && hero.gold >= t.cost;
    return h('button', { class: `tal-opt ${SYM_ICO[k][1]}`, type: 'button', disabled: !can, 'aria-label': `${D.SYM_NAMES[k]}: pays ${pw}. ${left} left on this die.`, onclick: tap(() => { if (HE.addPetSymbol(hero, PET.face, k)) { PET.face = (pet.faces[PET.face] || []).length >= D.TALENT_PER_FACE ? null : PET.face; sfx.coin(); X.persist(); X.renderCamp(); } else sfx.error(); }) }, ico(SYM_ICO[k][0]), h('b', {}, D.SYM_NAMES[k]), h('small', {}, `+${pw} · ${left} left`));
  }), h('small', { class: 'tal-cost' }, `Each symbol costs ${t.cost} gold. ${D.SYM_NAMES[p.kind]} can go on up to ${D.petKindMax(pet.size)} times; any other symbol twice. Tap a placed symbol to take it off.`)) : null;
  return h('div', { class: 'sx-urow tal-die pet-die', style: { '--pc': p.color } },
    h('div', { class: 'pet-head' }, petPic(pet.type, 72), h('div', { class: 'tal-head' }, h('b', {}, `${p.name} · d${pet.size}`), h('small', {}, `${t.used} of ${t.slots} symbol slots`), h('small', { class: 'tal-hand' }, `Each symbol pays ${pw}${g.next ? ` (${D.PET_POWER[g.next]} once it grows to a d${g.next})` : ''}. Rolls beside your board, and you can reroll it like any die.`))),
    h('div', { class: 'tal-strip syms pet-strip' }, h('div', { class: 'tal-face blank' }, h('small', {}, 'Face 1'), h('b', {}, 'blank')), faces),
    picker,
    g.next ? h('small', { class: 'ur-next' }, `Grow from d${pet.size} to d${g.next}: every symbol pays ${D.PET_POWER[g.next]} instead of ${pw}, and the die gets another slot.`) : null,
    g.next ? priceBtn(`Grow to d${g.next}`, g.cost, g.ok, () => { if (HE.growPet(hero)) bought(); }, `Grow ${p.name} to a d${g.next} for ${g.cost} gold`) : maxTag('Full grown'));
}
function petSection(hero) {
  if (hero.pet) return [petCard(hero)];
  const o = E.petOffer(hero); if (!o) return [];
  if (hero.gold >= o.price) tallyUp();
  return [h('div', { class: 'sx-urow cmp pet-hint', style: { '--pc': D.PETS[o.type].color } }, petPic(o.type, 44),
    h('div', { class: 'ur-copy' }, h('b', {}, `${D.PETS[o.type].name}, a pet`, h('em', { class: 'ur-to' }, ` ${o.price} gold`)), h('small', {}, 'The Camp Store has one today. A pet rolls one more die beside your board.')),
    btn('See it', () => { X.S.tab = 'store'; X.renderCamp(); }, { kind: 'ghost', cls: 'ur-buy' }))];
}
// A focused class library for camp. Browsing never changes the equipped powers.
const CP = { hero: null, slot: 'A', id: null };
function campPowers(hero) {
  const lib = E.powerLibrary(hero), identity = `${hero.name}:${hero.cls}`;
  if (CP.hero !== identity) { CP.hero = identity; CP.slot = 'A'; CP.id = null; }
  const rows = lib.filter((r) => r.card.slot === CP.slot);
  const row = rows.find((r) => r.card.id === CP.id) || rows.find((r) => r.equipped) || rows[0];
  if (!row) return h('p', {}, 'No powers in this slot.');
  CP.id = row.card.id;
  const k = row.card, level = E.powerLevel(hero, k.id), up = E.powerUpgradeInfo(hero, k.id);
  const equipped = rows.find((r) => r.equipped)?.card;
  const refresh = (selector = '.cp-detail') => { X.renderCamp(SHEET.fromBoard); $(selector)?.focus({ preventScroll: true }); };
  const done = () => { sfx.level(); X.persist(); refresh(); };
  const status = (r) => r.equipped ? 'Equipped' : r.gate ? `Level ${r.gate} required` : r.learned ? 'Learned' : `Learn · ${E.learnInfo(hero, r.card.id).cost} gold`;
  const magic = (c) => `${c.cost}${c.kind === 'scale' ? `–${E.scaleMax(c, E.powerLevel(hero, c.id))}` : ''} magic${c.kind === 'charge' ? ' / charge' : ''}`;
  const tabs = h('div', { class: 'cp-slots', role: 'group', 'aria-label': 'Power slots' }, D.POWER_SLOTS.map((slot) => {
    const eq = lib.find((r) => r.card.slot === slot && r.equipped)?.card;
    return h('button', { type: 'button', class: CP.slot === slot ? 'selected' : '', 'data-slot': slot, 'aria-pressed': String(CP.slot === slot), 'aria-label': `Slot ${slot}: ${D.SLOT_NAME[slot]}, ${eq?.name || 'empty'}`,
      onclick: tap(() => { CP.slot = slot; CP.id = null; refresh(`.cp-slots [data-slot="${slot}"]`); }) }, h('b', {}, slot), h('span', {}, D.SLOT_NAME[slot]), h('small', {}, eq?.name || 'Empty'));
  }));
  const cards = h('div', { class: 'cp-library' }, rows.map((r) => h('button', { type: 'button', class: `cp-card tone-${toneOf(r.card)} ${r.card.id === k.id ? 'selected' : ''}`, 'data-power': r.card.id,
    'aria-pressed': String(r.card.id === k.id), 'aria-label': `${r.card.name}: ${status(r)}. Inspect power.`, onclick: tap(() => { CP.id = r.card.id; refresh(`.cp-card[data-power="${r.card.id}"]`); }) },
    h('span', { class: 'cp-card-icon' }, powerGlyph(r.card)), h('span', { class: 'cp-card-copy' }, h('small', {}, status(r)), h('b', {}, r.card.name), h('span', {}, shortLine(r.card, E.powerLevel(hero, r.card.id)))), h('span', { class: 'cp-card-cost' }, ico('spark'), magic(r.card)))));
  let action, cost = null;
  if (row.gate) action = shLock(`Opens at hero level ${row.gate}`);
  else if (row.equipped) {
    if (up.next) { cost = up.cost; action = shBuy(hero, { label: `Upgrade to level ${up.next}`, cost, ok: up.ok, onBuy: () => { if (HE.upgradePower(hero, k.id)) done(); } }); }
    else action = shDone('Highest power level');
  } else if (row.learned) action = h('button', { class: 'sh-buy', type: 'button', 'aria-label': `Equip ${k.name} in slot ${k.slot} for free`, onclick: tap(() => { if (HE.equipPower(hero, k.id)) done(); }) },
    h('span', { class: 'sh-buy-l' }, `Equip in slot ${k.slot}`), h('span', { class: 'sh-buy-p' }, 'Free'));
  else { const learn = E.learnInfo(hero, k.id); cost = learn.cost; action = shBuy(hero, { label: 'Learn & equip', cost, ok: learn.ok, onBuy: () => { if (HE.learnPower(hero, k.id)) done(); } }); }
  const when = k.kind === 'charge' ? '' : `${k.atwill ? 'Once each round' : 'Once per battle'}${k.minRound ? ` · round ${k.minRound}+` : ''}${!k.atwill && k.kind !== 'super' ? ` · recharge for ${D.RECHARGE_COST} magic` : ''}.`;
  const levels = h('details', { class: 'cp-levels ww-pack' }, h('summary', {}, ico('spark'), 'All power levels'),
    h('div', { class: 'cp-level-list' }, Array.from({ length: E.powerLevelsOf(hero) + 1 }, (_, lv) => h('div', { class: lv === level ? 'current' : '' }, h('b', {}, `Level ${lv}${lv === level ? ' · current' : ''}`), h('span', {}, shortLine(k, lv))))));
  return h('div', { class: 'cp-workshop' }, tabs, h('p', { class: 'cp-instruction' }, 'Choose a slot, then inspect a power. One equipped power per slot.'), cards,
    h('section', { class: `cp-detail tone-${toneOf(k)}`, tabindex: '-1', 'aria-labelledby': 'cp-title' },
      h('div', { class: 'cp-title-row' }, h('span', { class: 'cp-medal' }, powerGlyph(k)), h('div', {}, h('small', {}, `${k.slot} · ${D.SLOT_NAME[k.slot]} · ${status(row)}`), h('h3', { id: 'cp-title' }, k.name))),
      h('div', { class: 'cp-meta' }, h('span', {}, ico('spark'), magic(k)), h('span', {}, `Level ${level}`)),
      h('p', { class: 'cp-effect' }, effectLine(k, { level })), when ? h('p', { class: 'cp-when' }, when) : null,
      row.equipped && up.next ? h('div', { class: 'cp-compare' }, h('div', {}, h('small', {}, `CURRENT · LEVEL ${level}`), h('b', {}, shortLine(k, level))), ico('chevron'), h('div', {}, h('small', {}, `UPGRADE · LEVEL ${up.next}`), h('b', {}, shortLine(k, up.next)))) : null,
      row.equipped && up.next ? h('p', { class: 'cp-change' }, h('small', {}, 'UPGRADE ADDS'), h('span', {}, upgradeLine(k, level))) : null,
      !row.equipped && !row.gate ? h('p', { class: 'cp-swap-note' }, `${row.learned ? 'Equip' : 'Learning equips'} ${k.name} in slot ${k.slot}${equipped ? `, replacing ${equipped.name}` : ''}. ${row.learned ? 'Equip it to upgrade it.' : 'You can swap learned powers freely at camp.'}`) : null,
      action, cost != null && hero.gold >= cost ? h('p', { class: 'cw-balance' }, `${hero.gold} gold`, ico('chevron'), `${hero.gold - cost} after purchase`) : null,
      levels));
}
// Leaving camp with room on the potion belt and gold to fill it asks once (Dave, Oct 2026: "I died at the very end. I forgot to charge my
// potions"). Refill buys what the gold allows; Go anyway leaves, and the camp does not ask again this visit.
const POT_ASKED = { key: null };
function toRoad(hero) {
  const r = E.potionBuyInfo(hero); const key = `${hero.name}:${hero.campaign?.act}.${hero.campaign?.step}`;
  const n = Math.min(r.max - r.have, Math.floor(hero.gold / r.price));
  if (n < 1 || POT_ASKED.key === key) { X.showRoadOrBoard(); return; }
  POT_ASKED.key = key; sfx.select?.();
  const cta = $('.sx-cta'); if (!cta) { X.showRoadOrBoard(); return; }
  const refill = () => { for (let i = 0; i < n; i++) E.buyPotion(hero); sfx.coin?.(); X.persist(); X.showRoadOrBoard(); };
  cta.replaceChildren(h('div', { class: 'sx-potask', role: 'alertdialog', 'aria-label': 'Potion belt not full' },
    h('p', {}, ico('plus'), h('span', {}, `Potion belt: ${r.have} of ${r.max}. Refill${n < r.max - r.have ? ` ${n}` : ''} for ${n * r.price} gold?`)),
    h('div', { class: 'sx-potask-btns' }, chipBtn('Refill', n * r.price, refill, { cls: 'wide potask-yes', poor: hero.gold < n * r.price }), btn('Go anyway', () => X.showRoadOrBoard(), { kind: 'ghost', cls: 'wide potask-no' }))));
}
const weaponRowFor = (inst, label) => weaponRow(inst, label);
// The Forge: a strip at the top says how many things your gold can buy in each section and jumps there; then the sections, most-used
// first. Each section's longer explanation sits behind a small "?".
const FORGE_INTRO = {
  supplies: 'More dice for each reroll, and more potions on your belt.',
  body: 'Your hands are strength, your head is wisdom, your feet are speed: the road tests all three. Bigger hand dice also hit harder. Any die can grow up to a d10 when you can pay. Patience, then punch.',
  weapons: 'A weapon never wears out. Silver and Gold put more icons on its faces and a crit of two, then three, on its top number. A small burst (or shield) on a face is +1 attack (or block): a 3 with one hits for 4 but still counts as a 3 for triples and straights. Battles mostly leave Bronze; the Camp Store sells Silver and Gold, and what you sell comes back as gold. A weapon die never rolls bigger than the hand that holds it, so grow your hands to wield the bigger ones.',
  powers: 'Three slots: A is your big move, B works every round, C stores a charge each round to let go when you choose. Learn another power for a slot and swap it in. Upgrades add dice and numbers. Pack the one you will actually use.',
  talents: 'Each number face pays its own number in the symbol you buy for it: a 6 with magic is 6 magic. Pay once per face (a bigger number costs more), no pierce, and no more than two of one symbol on a die. Face 2 doubles your hand. A bigger die brings new empty faces. Homework, with sparkles.',
  pet: 'Your pet rolls its own die beside the board. One face is always blank; put symbols on the rest. Grow the die and every symbol pays more. They will pretend they earned it.',
};
const FORGE_NAME = { dice: 'Your dice', supplies: 'Rerolls & potions', body: 'Body dice', weapons: 'Weapons', powers: 'Powers', talents: 'Talent dice', pet: 'Pet' };
const FORGE_ICON = { dice: 'dice', supplies: 'plus', body: 'dice', weapons: 'sword', powers: 'spark', talents: 'star', pet: 'heart' };
function forgeSection(id, build) {
  FORGE.sec = id; const rows = build().filter(Boolean); if (!rows.length) return null;
  const open = FORGE.info.has(id); const n = FORGE.tally[id] || 0;
  return h('section', { class: 'fx-sec', id: `fs-${id}` },
    h('header', { class: 'fs-head' }, ico(FORGE_ICON[id]), h('b', {}, FORGE_NAME[id]), n ? h('span', { class: 'fs-count' }, `${n} you can buy`) : null,
      h('button', { class: `fs-q ${open ? 'on' : ''}`, type: 'button', 'aria-expanded': String(open), 'aria-label': `About ${FORGE_NAME[id]}`, onclick: tap(() => { if (open) FORGE.info.delete(id); else FORGE.info.add(id); X.renderCamp(); }) }, '?')),
    open ? h('p', { class: 'tab-intro' }, FORGE_INTRO[id]) : null, ...rows);
}
// scroll the camp sheet so a section sits just under the pinned hero chip and tabs
function jumpTo(id) {
  const el = document.getElementById(`fs-${id}`); const side = el?.closest('.sx-side'); if (!side || !el) return; // the sheet that holds it (a leaving screen may linger)
  const pinned = (side.querySelector('.sx-sidetop')?.offsetHeight || 0) + (side.querySelector('.sx-tabs')?.offsetHeight || 0) + 10;
  side.scrollTo({ top: side.scrollTop + el.getBoundingClientRect().top - side.getBoundingClientRect().top - pinned, behavior: reduced() ? 'auto' : 'smooth' });
}
// A row of chips at the top of a camp tab that jump to its sections (Dave: "at the top of each screen have a way to jump to that section").
function jumpChips(items, head = null) {
  return h('nav', { class: 'fx-nav', 'aria-label': 'Jump to' }, head,
    h('div', { class: 'fn-chips' }, items.filter(Boolean).map(({ id, label, icon, n, note }) => h('button', { class: `fn-chip ${n ? 'can' : ''}`, type: 'button', onclick: tap(() => jumpTo(id)), 'aria-label': `${label}${n ? `: ${n}${note ? ` ${note}` : ''}` : ''}` }, ico(icon), h('span', {}, label), n ? h('b', {}, String(n)) : null))));
}
function forgeNav(hero, ids) {
  const total = ids.reduce((a, id) => a + (FORGE.tally[id] || 0), 0);
  return h('nav', { class: 'fx-nav', 'aria-label': 'Jump to' },
    h('p', { class: 'fn-head' }, coin(hero.gold, 'inline'), h('span', {}, total ? ` · ${total} thing${total > 1 ? 's' : ''} you can buy now` : ' · save up: nothing fits your purse yet')),
    h('div', { class: 'fn-chips' }, ids.map((id) => { const n = FORGE.tally[id] || 0;
      return h('button', { class: `fn-chip ${n ? 'can' : ''}`, type: 'button', onclick: tap(() => jumpTo(id)), 'aria-label': `${FORGE_NAME[id]}: ${n} you can buy` }, ico(FORGE_ICON[id]), h('span', {}, FORGE_NAME[id]), n ? h('b', {}, String(n)) : null); })));
}
// ---- your dice, as on the battle board: tap a die for what can go there or grow there. The popup refreshes after every purchase.
const SHEET = { slot: null, el: null, inline: false, hero: null, fromBoard: false, scroll: 0, weaponMode: 'forge' };
function diceGrid(hero) {
  E.ensureTwin?.(hero);
  const cells = GRID.map(([slot, label]) => {
    const active = E.isActive(hero, slot), can = slotCanBuy(hero, slot), price = slotPrice(hero, slot);
    const size = E.sidesOf(hero, slot), weapon = slot === 'NW' || slot === 'NE', inst = hero.loadout[slot];
    const selected = SHEET.inline && SHEET.slot === slot;
    const pic = !active ? h('span', { class: 'cw-locked' }, ico('lock'))
      : campDie(hero, slot, size);
    return h('button', { class: `cw-cell s-${slot} ${active ? '' : 'off'} ${can ? 'can' : ''} ${selected ? 'selected' : ''}`, type: 'button',
      'aria-expanded': String(selected), 'aria-controls': 'camp-inspector',
      'aria-label': `${label}, ${active ? `d${size}` : 'locked'}${price != null ? `, options from ${price} gold` : ''}`,
      onclick: tap(() => openSlot(slot)) },
      h('small', { class: 'cw-label' }, label), pic,
      h('span', { class: 'cw-cell-foot' }, h('b', {}, !active ? 'Unlock' : `d${size}`),
        price != null ? priceChip(price, { poor: hero.gold < price, cls: 'cw-price' }) : null),
      can ? h('span', { class: 'cw-plus', 'aria-hidden': 'true' }, '+') : null);
  });
  return h('section', { class: 'cw-dicegrid', id: 'fs-dice', 'aria-label': 'Your character dice' },
    h('div', { class: 'cw-board' }, cells),
    h('p', { class: 'cw-hint' }, SHEET.inline ? 'Tap another die to inspect it.' : 'Example faces · tap a die to inspect. + means upgrade.'));
}
// The popup for one spot on the board (Dave, Oct 2026: "make it look AAA"): the die or weapon as it is now, big, then one clear
// button per thing you can buy (it says what you get and what it costs, or why not yet), then what else could go there.
const SH_KIND = { W: 'strength', E: 'strength', N: 'mind', S: 'speed' };
const SH_ROLE = { W: 'Adds to your left weapon.', E: 'Adds to your right weapon.', N: 'Wisdom on the road.', S: 'Speed. The fastest acts first.', C: 'Lifts the dice that match it. Always a d6.' };
// a buy button: what you get on the left, the price on the right; short of gold it says how much more
function shBuy(hero, { label, cost, ok, onBuy }) {
  return h('button', { class: `sh-buy ${ok ? '' : 'poor'}`, type: 'button', disabled: !ok, 'aria-label': `${label} for ${cost} gold`, onclick: ok ? tap(onBuy) : null },
    h('span', { class: 'sh-buy-l' }, label, !ok && hero.gold < cost ? h('small', {}, `Need ${cost - hero.gold} more`) : null),
    h('span', { class: 'sh-buy-p' }, priceChip(cost, { poor: !ok && hero.gold < cost })));
}
const shDone = (text) => h('p', { class: 'sh-done' }, ico('check'), text);
const shLock = (text) => h('p', { class: 'sh-lockline' }, ico('lock'), text);
const shBought = () => { sfx.level(); X.persist(); X.renderCamp(SHEET.fromBoard); if (SHEET.inline) { SHEET.el?.focus({ preventScroll: true }); if (!X.net) toast('Upgrade complete.'); } };
const shStage = (...kids) => h('div', { class: 'sh-stage' }, ...kids);
const shDie = (n, cls = '') => h('span', { class: `sh-dbox ${cls}` }, SHEET.inline ? campDie(X.S.hero, SHEET.slot, n) : ico(`d${Math.min(10, n)}`, '', 60), SHEET.inline ? null : h('b', {}, `d${n}`));
const shGrow = (a, b) => [shDie(a), b ? h('span', { class: 'sh-arrow', 'aria-hidden': 'true' }, ico('chevron')) : null, b ? shDie(b, 'next') : null];
// a weapon as a row (pack, shelf, hands): the painted icon, name, metal, die and wear, the faces as a strip, the gold figure on the right
// with its label; tap the row for the full card. The action buttons sit below the row, never inside it.
function shWeapon(inst, action, cls = '', badge = '', money = null) {
  const d = CW.weaponData(inst, money);
  const row = h('button', { class: 'cw-row', type: 'button', 'aria-label': `${d.metal} ${d.name}, d${d.size}. Show the full card`, onclick: tap(() => showWeaponCard(inst, money)) });
  row.innerHTML = `${CW.icon(d, 128)}<div><div class="nm"><span></span>${badge ? '<span class="where"></span>' : ''}</div><div class="ch">${CW.chips(d)}</div>${CW.strip(d)}</div><div class="act">${d.money ? `<small>${d.moneyLabel}</small>${d.money}` : ''}<em class="more">Full card ›</em></div>`; // the row is the way in to the full card: say so
  row.querySelector('.nm span').textContent = d.name; if (badge) row.querySelector('.where').textContent = badge;
  return h('div', { class: `cw-wrap ${cls}` }, row, action);
}
// One equipped weapon, with a preview from the same face rules used in battle.
function weaponWorkshop(hero, slot, inst) {
  const w = D.WEAPONS[inst.id], size = E.weaponSize(inst), rolling = E.sidesOf(hero, slot);
  const forge = E.forgeInfo(hero, inst.uid), train = E.trainInfo(hero, inst.uid);
  const SZ = D.EXPERIMENT.weaponSize; // T17 (preview only): size is bought here, one step at a time; weapons never wear out; metal is not forged
  const mode = SZ || SHEET.weaponMode === 'train' ? 'train' : 'forge', info = mode === 'forge' ? forge : train;
  const target = info.next ? { ...inst, ...(mode === 'forge' ? { rarity: info.next } : { size: info.next }) } : null;
  const targetRoll = target ? E.sidesOf({ ...hero, loadout: { ...hero.loadout, [slot]: target } }, slot) : null;
  const frame = h('div', { class: `ww-hero rar-${w.legendary ? 'legend' : inst.diamond ? 'diamond' : RAR[inst.rarity | 0]}` },
    h('div', { class: 'ww-display' }, campDie(hero, slot, rolling)),
    h('div', { class: 'ww-identity' }, h('small', {}, `${D.tierName(inst)} · d${size}${w.hands === 2 ? ` · ${slot === 'NE' ? 'right' : 'left'} die` : ''}`), h('h3', {}, w.name)));
  const modes = h('div', { class: 'ww-modes', role: 'group', 'aria-label': 'Weapon upgrade type' },
    [['forge', 'Forge', 'Improve metal', 'anvil'], ['train', 'Train', 'Increase die size', 'dice']].map(([id, label, sub, icon]) => h('button', {
      type: 'button', class: mode === id ? 'on' : '', 'data-mode': id, 'aria-label': `${label} weapon`, 'aria-pressed': String(mode === id),
      onclick: tap(() => { SHEET.weaponMode = id; X.renderCamp(SHEET.fromBoard); $(`.ww-modes [data-mode="${id}"]`)?.focus({ preventScroll: true }); }),
    }, ico(icon), h('span', {}, h('b', {}, label), h('small', {}, sub)))));
  const faces = (it, rollSize, label) => {
    const values = E.weaponFaces(it, rollSize);
    return h('div', { class: 'ww-face-group', 'data-preview': label.toLowerCase() }, h('div', { class: 'ww-face-label' }, h('b', {}, label), h('span', {}, `${D.tierName(it)} · d${rollSize}`)),
      h('div', { class: 'wc-faces', style: { '--face-cols': String(values.length <= 6 ? values.length : Math.ceil(values.length / 2)) }, 'aria-label': `${label} weapon faces` }, values.map((f) =>
        h('span', { class: `wf ${f.c === 'r' ? 'red' : 'blue'} ${f.arrow ? `arrow a-${f.arrow}` : f.v === 0 ? 'zero' : ''}`, 'data-value': String(f.v) }, h('b', {}, f.arrow ? `${ARROW_MARK[f.arrow]}${f.v || ''}` : String(f.v)),
          f.fx || f.plus ? h('span', { class: 'wf-fx' }, fxItems({ ...(f.plus ? { [f.c === 'b' ? 'block' : 'atk']: f.plus } : {}), ...(f.fx || {}) })) : null))));
  };
  const ammo = inst.id === 'quiver' && D.EXPERIMENT.weapons2 ? ammoPick(hero, inst) : null;
  if (SZ) { // the card as designed: a row for every size, a dice cover over each one not yet bought; tapping the next cover buys it
    const d0 = CW.weaponData(inst);
    if (d0.rows) {
      const card = CW.weaponCardEl(d0, { onBuy: () => { const t = E.trainInfo(hero, inst.uid); if (!t.ok) return t.why === 'gold' ? `Need ${t.cost - hero.gold} more gold` : 'Not available'; if (!HE.trainWeapon(hero, inst.uid)) return 'Not available'; sfx.level(); X.persist(); const p = $('.sh-purse b'); if (p) p.textContent = String(hero.gold); return true; } });
      return h('div', { class: 'ww-workshop sized' }, h('div', { class: 'cw-big' }, card), ammo, h('p', { class: 'cw-balance' }, 'Tap the next dice cover to buy that size. Size is not refunded.'));
    }
  }
  if (forge.why === 'wear' && train.why === 'wear') {
    return h('div', { class: 'ww-workshop' }, frame, ammo,
      h('p', { class: 'ww-note' }, ico('sword'), E.noWear() ? 'Never wears out.' : E.wearLabel(inst)),
      faces(inst, rolling, 'Current'),
      h('p', { class: 'ww-explain' }, 'Find or buy a replacement, or swap from your pack below.'));
  }
  const preview = h('div', { class: 'ww-preview' },
    h('div', { class: 'ww-change' }, h('span', {}, mode === 'forge' ? D.tierName(inst) : `d${size}`), target ? ico('chevron') : null,
      target ? h('b', {}, mode === 'forge' ? D.tierName(target) : `d${E.weaponSize(target)}`) : h('b', {}, mode === 'forge' ? 'Finished metal' : 'Maximum size')),
    h('p', { class: 'ww-explain' }, mode === 'forge' ? 'Same die size. Preview the new metal’s faces.' : SZ ? 'A bigger die. Preview the faces at the next size.' : 'More sides. Preview the faces in this hand.'),
    faces(inst, rolling, 'Current'), target ? faces(target, targetRoll, 'After upgrade') : null);
  const capped = target && targetRoll < E.weaponSize(target);
  const warning = inst.diamond ? h('p', { class: 'ww-note' }, ico('gem'), 'Diamond: one battle, then it shatters.')
    : capped ? h('p', { class: 'ww-note' }, ico('lock'), `This hand would still roll d${targetRoll}. A d${E.weaponSize(target)} hand uses the full weapon.`)
    : rolling < size ? h('p', { class: 'ww-note' }, ico('lock'), `This hand rolls d${rolling}. The weapon is d${size}.`) : null;
  const action = !info.next ? shDone(mode === 'forge' ? (forge.why === 'legendary' ? 'Legendary metal is fixed' : 'Best metal') : 'Biggest die')
    : mode === 'train' && info.why === 'hands' ? shLock(`Needs a d${info.next} hand`)
    : shBuy(hero, { label: mode === 'forge' ? `Forge to ${D.RARITY[info.next]}` : SZ ? `Buy size d${info.next}` : `Train to d${info.next}`, cost: info.cost, ok: info.ok,
      onBuy: () => { if ((mode === 'forge' ? HE.forgeWeapon(hero, inst.uid) : HE.trainWeapon(hero, inst.uid))) shBought(); } });
  const noRefund = SZ && info.next ? h('p', { class: 'ww-note ww-norefund' }, ico('coin'), `Size is not refunded. Selling pays half of what this weapon was worth when found: ${E.sellValue(inst)} gold, whatever size you buy.`) : SZ ? h('p', { class: 'ww-note ww-norefund' }, ico('coin'), `Selling pays half of what this weapon was worth when found: ${E.sellValue(inst)} gold.`) : null;
  return h('div', { class: 'ww-workshop' }, frame, ammo, SZ ? null : modes, preview, warning, noRefund, action,
    info.ok && info.cost ? h('p', { class: 'cw-balance' }, `${hero.gold} gold`, ico('chevron'), `${hero.gold - info.cost} after upgrade`) : null);
}
function slotSheet(slot) {
  if (String(slot).startsWith('power:')) return powerSheet(slot.slice(6));
  const hero = X.S.hero; const label = GRID.find(([s]) => s === slot)[1];
  const head = h('header', { class: 'sh-head' }, h('div', { class: 'sh-title' }, h('small', {}, E.isActive(hero, slot) ? `d${E.sidesOf(hero, slot)}` : 'Locked'), h('b', { id: 'camp-inspector-title' }, label)),
    h('span', { class: 'sh-purse' }, ico('coin'), h('b', {}, String(hero.gold))), h('button', { class: 'sh-x', type: 'button', onclick: closeSlot }, 'Done'));
  if (!E.isActive(hero, slot)) {
    const u = E.unlockInfo(hero, slot);
    return [head, shStage(h('span', { class: 'sh-locked' }, ico('lock'))), h('p', { class: 'sh-role' }, slot === 'NE' ? 'A second weapon die. Hold a weapon in each hand.' : 'A new die. You pick a symbol for each face.'),
      shBuy(hero, { label: 'Add this die', cost: u.cost, ok: u.ok, onBuy: () => { if (HE.unlockDie(hero, slot)) shBought(); } })];
  }
  if (slot === 'C') return SHEET.inline ? [head, heartCard(hero, { say: (t) => toast(t), onGrow: (rank) => { if (HE.upgradeHeart(hero, rank)) shBought(); } }), h('p', { class: 'sh-role' }, SH_ROLE.C)]
    : [head, shStage(...shGrow(6)), h('p', { class: 'sh-role' }, SH_ROLE.C)];
  if (SH_KIND[slot]) {
    const kind = SH_KIND[slot]; const size = kind === 'speed' ? E.feetSize(hero) : kind === 'mind' ? E.mindSize(hero) : hero.strength[slot];
    const u = kind === 'strength' ? E.strengthUpgrade(hero, slot) : kind === 'mind' ? E.mindUpgrade(hero) : E.speedUpgrade(hero);
    const buy = !u.next && !u.act ? shDone('Biggest size') : u.act && String(u.why).startsWith('Act') ? shLock(`Grows again in ${u.why}`)
      : shBuy(hero, { label: `Grow to d${u.next}`, cost: u.cost, ok: u.ok, onBuy: () => { if (HE.upgradeDie(hero, kind, slot)) shBought(); } });
    const next = u.next && !u.act ? u.next : null;
    const card = SHEET.inline ? strengthCard(hero, slot, { say: (t) => toast(t), onGrow: (s2) => { if (HE.upgradeDie(hero, SH_KIND[s2], s2)) shBought(); } }) : null; // Crockpot: the cardboard STRENGTH card; every cover buys through HE.upgradeDie // Crockpot: the card for Head, Feet and each Hand (each hand upgrades on its own)
    const stage = card || (SHEET.inline ? h('div', { class: 'cw-compare' },
      h('div', { class: 'cw-now' }, h('small', {}, 'CURRENT'), campDie(hero, slot, size)),
      next ? ico('chevron') : null,
      next ? h('div', { class: 'cw-next' }, h('small', {}, 'UPGRADE'), campDie(hero, slot, next)) : null) : shStage(...shGrow(size, next)));
    const allFaces = SHEET.inline ? h('details', { class: 'cw-all-faces' }, h('summary', {}, next ? 'All faces · current and upgrade' : 'All faces'), campFaceList(hero, slot, size, 'Current'), next ? campFaceList(hero, slot, next, 'After upgrade') : null) : null;
    return [head, h('p', { class: 'sh-role' }, SH_ROLE[slot]), stage, card ? null : h('p', { class: 'cw-example' }, 'Example faces shown. Die size is labeled below.'), buy,
      u.ok && u.cost ? h('p', { class: 'cw-balance' }, `${hero.gold} gold`, ico('chevron'), `${hero.gold - u.cost} after upgrade`) : null, allFaces];
  }
  if (slot === 'SW' || slot === 'SE') return [head, ...talentSheet(hero, slot)];
  // a weapon hand: the weapon there, Forge and Train, then what else could go there
  const real = hero.loadout[slot];
  const out = [head];
  if ((SHEET.inline || E.weaponTrainingOn()) && real && real.id !== 'fists') {
    const card = D.EXPERIMENT.weaponSize ? weaponWorkshop(hero, slot, real) : h('div', { class: 'ww-workshop cb-ww' }, cbWeaponCard(hero, slot, real, {
      say: (t) => toast(t), onBuy: (step) => HE.trainWeapon(hero, real.uid, step), onBought: () => shBought(),
    }));
    out.push(card);
    if (E.weaponTrainingOn()) {
      const t = E.trainInfo(hero, real.uid);
      if (t.next) {
        const next = { ...real, size: t.next };
        const preview = h('details', { class: 'cw-all-faces ww-upgrade-preview' }, h('summary', {}, `Preview d${t.next} faces`));
        const strip = h('div', { 'aria-label': `All faces after upgrading to d${t.next}` }); strip.innerHTML = CW.strip(CW.weaponData(next)); preview.append(strip);
        out.push(h('p', { class: 'ww-note' }, `Rolls d${t.next} after purchase. Sell value: ${t.sellBefore} → ${t.sellAfter} gold.`),
          h('p', { class: 'cw-balance' }, E.servedByLadder(real) ? 'Every face you have stays. The new size adds two.' : 'Face numbers and symbols can change at each size.'), preview);
      }
      if (real.id === 'quiver' && D.EXPERIMENT.weapons2) out.push(ammoPick(hero, real));
    }
  } else if (real && real.id !== 'fists') {
    const rolls = E.sidesOf(hero, slot); const size = E.weaponSize(real);
    out.push(shWeapon(real, null, 'now'));
    if (rolls < size && !real.diamond) out.push(h('p', { class: 'sh-warn' }, `Rolls as a d${rolls} until your hand is a d${size}.`));
    const f = E.forgeInfo(hero, real.uid); const t = E.trainInfo(hero, real.uid);
    void f; void t; // forging and training retired with wear (Oct 2026): say how long the weapon has left instead
    out.push(h('p', { class: `sh-role sh-wearline ${!E.noWear() && E.battlesLeft(real) <= 1 ? 'last' : ''}` }, real.diamond ? 'A Diamond lasts one fight.' : E.noWear() ? 'Never wears out.' : `${E.wearLabel(real)}. After its last battle it is gone.`));
  } else out.push(shStage(h('span', { class: 'sh-locked' }, ico('hero'))), h('p', { class: 'sh-role' }, 'Empty hand.'));
  const wear = (it) => { HE.equip(hero, it.uid, slot); sfx.card(); X.persist(); X.renderCamp(); };
  const pack = hero.bag.map((it) => { const c = E.canEquip(hero, it.uid, slot);
    return shWeapon(it, h('button', { class: 'sh-equip', type: 'button', disabled: !c.ok, onclick: c.ok ? tap(() => wear(it)) : null, 'aria-label': `Equip ${D.WEAPONS[it.id].name}` }, 'Equip')); });
  if (pack.length) {
    if (SHEET.inline) out.push(h('details', { class: 'ww-pack' }, h('summary', {}, ico('bag'), `Swap from pack · ${pack.length}`), h('div', { class: 'sh-list' }, ...pack)));
    else out.push(h('p', { class: 'sh-sec' }, 'Swap in from your pack'), ...pack);
  }
  const gems = E.diamondsOf(hero).filter(() => E.diamondHands(hero).includes(slot)).map((d) => { const at = E.armedSlot(hero, d.uid) === slot;
    return shWeapon(d, h('button', { class: `sh-equip ${at ? 'on' : ''}`, type: 'button', onclick: tap(() => { HE.armDiamond(hero, d.uid, at ? null : slot); sfx.select?.(); X.persist(); X.renderCamp(); }) }, at ? 'Next fight ✓' : 'Bring')); });
  if (gems.length) {
    if (SHEET.inline) out.push(h('details', { class: 'ww-pack' }, h('summary', {}, ico('gem'), `Diamonds · ${gems.length} in case`), h('div', { class: 'sh-list' }, ...gems)));
    else out.push(h('p', { class: 'sh-sec' }, 'Diamonds · one fight'), ...gems);
  }
  return out;
}
// a power: everything it does, what it costs to use, what each level adds, and the one thing you can do with it now
function powerSheet(id) {
  const hero = X.S.hero; const row = E.powerLibrary(hero).find((x) => x.card.id === id); if (!row) return [h('p', {}, 'Not found.')];
  const k = row.card; const lvl = E.powerLevel(hero, id); const top = E.powerLevelsOf(hero);
  const head = h('header', { class: 'sh-head' }, h('div', { class: 'sh-title' }, h('small', {}, `${k.slot} · ${D.SLOT_NAME[k.slot]}`), h('b', {}, k.name)),
    h('span', { class: 'sh-purse' }, ico('coin'), h('b', {}, String(hero.gold))), h('button', { class: 'sh-x', type: 'button', onclick: closeSlot }, 'Done'));
  const levels = h('div', { class: 'sh-levels' }, Array.from({ length: top + 1 }, (_, lv) => h('div', { class: `sh-lv ${row.equipped || row.learned ? (lv < lvl ? 'past' : lv === lvl ? 'now' : 'later') : lv === 0 ? 'now' : 'later'}` },
    h('b', {}, lv === 0 ? 'Base' : `Level ${lv}`), h('span', {}, shortLine(k, lv)))));
  let act;
  if (row.equipped) { const u = E.powerUpgradeInfo(hero, id); act = u.next ? shBuy(hero, { label: `Upgrade to level ${u.next}`, cost: u.cost, ok: u.ok, onBuy: () => { if (HE.upgradePower(hero, id)) shBought(); } }) : shDone('Top level'); }
  else if (row.learned) act = h('button', { class: 'sh-buy', type: 'button', onclick: tap(() => { if (HE.equipPower(hero, id)) { sfx.select(); X.persist(); X.renderCamp(); } }) }, h('span', { class: 'sh-buy-l' }, `Use in slot ${k.slot}`), h('span', { class: 'sh-buy-p' }, h('b', {}, 'Free')));
  else if (row.gate) act = shLock(`Opens at level ${row.gate}`);
  else { const li = E.learnInfo(hero, id); act = shBuy(hero, { label: 'Learn it', cost: li.cost, ok: li.ok, onBuy: () => { if (HE.learnPower(hero, id)) shBought(); } }); }
  return [head, h('p', { class: 'sh-text' }, k.text), h('p', { class: 'sh-cost' }, ico('spark'), `Uses ${k.cost}${k.kind === 'scale' ? `–${k.max}` : ''} magic`, row.equipped ? h('em', {}, 'In use') : null),
    h('p', { class: 'sh-sec' }, 'Levels'), levels, act];
}
// Camp talent workbench: inspect first, preview a symbol, then use the existing purchase command.
// After a talent die is unlocked or grown, glide down to the symbol choosing area (the numbered faces, then the symbols under them) so the next step is on screen.
function toTalentSymbols() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const side = $('.sx-camp .sx-side'), el = $('.tw-face-heading'); if (!side || !el) return;
    const stick = parseFloat(side.style.getPropertyValue('--stick')) || 0;
    const top = side.scrollTop + el.getBoundingClientRect().top - side.getBoundingClientRect().top - stick - 8;
    const calm = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    side.scrollTo({ top: Math.max(0, top), behavior: calm ? 'auto' : 'smooth' });
  }));
}
function talentWorkshop(hero, slot) {
  const size = hero.special[slot], info = E.talentInfo(hero, slot), up = E.specialUpgrade(hero, slot);
  const stored = hero.talent?.[slot] || [];
  const symbol = (f) => Array.isArray(stored[f]) ? stored[f][0] : stored[f];
  const face = TAL.slot === slot && TAL.face != null && TAL.face >= 0 && TAL.face < info.faces ? TAL.face : null;
  const current = face != null ? symbol(face) : null, chosen = current || TAL.sym;
  const refresh = (selector) => { X.renderCamp(SHEET.fromBoard); $(selector)?.focus({ preventScroll: true }); };
  const fixed = [1, 2, 3].map((n) => h('div', { class: `tw-face fixed ${n === 2 ? 'double' : ''}`, 'aria-label': `Face ${n}: ${n === 2 ? 'doubles this hand' : 'blank'}. Fixed.` },
    h('b', {}, String(n)), h('span', {}, n === 2 ? '×2' : '·'), h('small', {}, n === 2 ? 'Hand' : 'Blank')));
  const editable = info.nums.map((n, f) => {
    const k = symbol(f), active = face === f;
    return h('button', { type: 'button', class: `tw-face ${k ? SYM_ICO[k][1] : 'tw-unset'} ${active ? 'selected' : ''}`, 'data-face': String(f), 'aria-pressed': String(active),
      'aria-label': `Face ${n}: ${k ? `${n} ${D.TALENT_SYMS[k].name}` : `empty, ${info.costs[f]} gold to set`}. Inspect face.`,
      onclick: tap(() => { TAL.slot = slot; TAL.face = f; TAL.sym = null; refresh(`.tw-face[data-face="${f}"]`); }) },
    h('b', {}, String(n)), k ? ico(SYM_ICO[k][0]) : h('span', { class: 'tw-add' }, '+'), k ? h('small', { class: 'tw-gives' }, `Gives +${n}`) : priceChip(info.costs[f], { poor: hero.gold < info.costs[f] }));
  });
  let detail;
  if (face == null) detail = h('div', { class: 'tw-empty' }, ico('dice'), h('b', {}, 'Choose a numbered face'), h('p', {}, 'Inspect its symbol or choose what an empty face will give you.'));
  else {
    const n = info.nums[face], cost = info.costs[face];
    const left = chosen ? info.same - E.talentCount(hero, slot, chosen) : 0;
    const can = !!chosen && left > 0 && hero.gold >= cost;
    const preview = h('div', { class: `tw-result ${chosen ? SYM_ICO[chosen][1] : ''}`, 'aria-live': 'polite' },
      h('span', { class: 'tw-result-icon' }, chosen ? ico(SYM_ICO[chosen][0]) : ico('dice')),
      h('div', {}, h('small', {}, `FACE ${n}${current ? ' · CURRENT' : ' · PREVIEW'}`), h('b', {}, chosen ? `Gives +${n} ${D.TALENT_SYMS[chosen].name}` : 'Choose a symbol'),
        h('p', {}, chosen ? `When you roll ${n}, gain ${n} ${D.TALENT_SYMS[chosen].name.toLowerCase()}.` : 'Preview a symbol below. Gold is spent only when you buy.')));
    const options = !current ? h('div', { class: 'tw-symbols', role: 'group', 'aria-label': 'Choose a talent symbol' }, Object.entries(D.TALENT_SYMS).map(([k, def]) => {
      const count = E.talentCount(hero, slot, k), full = count >= info.same;
      return h('button', { type: 'button', class: `tw-symbol ${SYM_ICO[k][1]} ${TAL.sym === k ? 'selected' : ''}`, disabled: full, 'data-symbol': k, 'aria-pressed': String(TAL.sym === k),
        'aria-label': `${def.name}, ${count} of ${info.same} used${full ? ', limit reached' : ''}`,
        onclick: full ? null : tap(() => { TAL.sym = k; refresh(`.tw-symbol[data-symbol="${k}"]`); }) }, ico(SYM_ICO[k][0]), h('b', {}, def.name), h('small', {}, full ? 'Limit reached' : `${count} / ${info.same} used`));
    })) : null;
    const action = current ? h('div', { class: 'tw-clear' }, h('p', {}, `Clearing gives no refund. A new symbol on face ${n} will cost ${cost} gold.`),
      h('button', { type: 'button', class: 'tw-clear-btn', 'aria-label': `Clear face ${n} without refund`, onclick: tap(() => {
        if (HE.removeTalent(hero, slot, face, 0)) { TAL.sym = null; sfx.card(); X.persist(); refresh(`.tw-face[data-face="${face}"]`); }
      }) }, 'Clear this face'))
      : h('div', { class: 'tw-purchase' }, shBuy(hero, { label: chosen ? `Set ${n} ${D.TALENT_SYMS[chosen].name}` : 'Choose a symbol first', cost, ok: can,
        onBuy: () => { if (chosen && HE.addTalent(hero, slot, face, chosen)) { TAL.sym = null; shBought(); } } }),
        can ? h('p', { class: 'cw-balance' }, `${hero.gold} gold`, ico('chevron'), `${hero.gold - cost} after purchase`) : null);
    detail = h('section', { class: 'tw-detail', 'aria-label': `Face ${n} editor` }, preview, options, action);
  }
  const grow = !up.next && !up.act ? shDone('Biggest size') : up.act && String(up.why).startsWith('Act') ? shLock(`Grows again in ${up.why}`)
    : shBuy(hero, { label: `Grow to d${up.next}`, cost: up.cost, ok: up.ok, onBuy: () => { if (HE.upgradeDie(hero, 'special', slot)) { shBought(); toTalentSymbols(); } } });
  return h('div', { class: 'tw-workshop' },
    talentsCard(hero, slot, { selected: face != null ? [slot, face] : null, say: (t) => toast(t), // Crockpot: the cardboard TALENTS card; taps go to the existing editor / purchases
      onFace: (s2, f) => { if (s2 !== slot) { openSlot(s2); } TAL.slot = s2; TAL.face = f; TAL.sym = null; refresh(`.tw-face[data-face="${f}"]`); },
      onGrow: (s2) => { if (HE.upgradeDie(hero, 'special', s2)) { shBought(); toTalentSymbols(); } }, onUnlock: (s2) => { if (HE.unlockDie(hero, s2)) { shBought(); toTalentSymbols(); } } }),
    h('div', { class: 'tw-face-heading' }, h('b', {}, 'Choose a face'), h('span', {}, `d${size} · ${size} faces`)),
    h('div', { class: 'sh-faces tw-faces', style: { '--cols': String(size <= 6 ? (size === 4 ? 4 : 3) : size / 2) } }, ...fixed, ...editable),
    h('p', { class: 'tw-rule' }, `Faces 1 and 3 stay blank. Face 2 doubles your ${slot === 'SW' ? 'left' : 'right'} hand. Each numbered face gives you that many of its symbol: "Gives +6" means 6.`),
    h('p', { class: 'tw-max' }, `Max ${info.same} of the same power symbol per die. Choose wisely.`), detail,
    h('details', { class: 'tw-grow ww-pack' }, h('summary', {}, ico('dice'), up.next ? `Grow this die · d${size} → d${up.next}` : 'Die growth'),
      h('div', { class: 'tw-grow-body' }, h('p', {}, 'A bigger die adds empty faces. Your existing symbols stay.'),
        up.next ? h('div', { class: 'cw-compare' }, campDie(hero, slot, size), ico('chevron'), campDie(hero, slot, up.next)) : null, grow)));
}
// a talent die: grow it, then tap an empty number face to pick its symbol
function talentSheet(hero, slot) {
  if (SHEET.inline) return [talentWorkshop(hero, slot)];
  const size = hero.special[slot]; const up = E.specialUpgrade(hero, slot); const info = E.talentInfo(hero, slot); const faces = hero.talent?.[slot] || [];
  const sym = (f) => { const e = faces[f]; return Array.isArray(e) ? e[0] : e; };
  const pickFace = TAL.slot === slot && TAL.face != null && TAL.face < info.faces && !sym(TAL.face) ? TAL.face : null;
  const fixed = [h('div', { class: 'sh-face fixed' }, h('b', {}, '1'), h('small', {}, 'blank')), h('div', { class: 'sh-face fixed x2' }, h('b', {}, '2'), h('small', {}, '×2 hand')), h('div', { class: 'sh-face fixed' }, h('b', {}, '3'), h('small', {}, 'blank'))];
  const nums = info.nums.map((n, f) => { const k = sym(f); const cost = info.costs[f];
    if (k) return h('button', { class: `sh-face set ${SYM_ICO[k][1]}`, type: 'button', 'aria-label': `Face ${n}: ${n} ${D.TALENT_SYMS[k].name}. Tap to clear.`, onclick: tap(() => { HE.removeTalent(hero, slot, f, 0); sfx.card(); X.persist(); X.renderCamp(); }) }, h('b', {}, String(n)), ico(SYM_ICO[k][0]));
    return h('button', { class: `sh-face open ${pickFace === f ? 'picking' : ''} ${hero.gold >= cost ? '' : 'poor'}`, type: 'button', 'aria-label': `Face ${n}: empty. ${cost} gold.`, onclick: tap(() => { TAL.slot = slot; TAL.face = pickFace === f ? null : f; X.renderCamp(); }) }, h('b', {}, String(n)), priceChip(cost, { poor: hero.gold < cost })); });
  const picker = pickFace != null ? h('div', { class: 'sh-picker' }, h('p', { class: 'sh-sec' }, `Face ${info.nums[pickFace]} pays ${info.nums[pickFace]} of…`),
    h('div', { class: 'sh-syms' }, Object.keys(D.TALENT_SYMS).map((k) => { const left = info.same - E.talentCount(hero, slot, k); const can = left > 0 && hero.gold >= info.costs[pickFace];
      return h('button', { class: `sh-sym ${SYM_ICO[k][1]}`, type: 'button', disabled: !can, onclick: can ? tap(() => { if (HE.addTalent(hero, slot, pickFace, k)) { TAL.face = null; sfx.coin(); X.persist(); X.renderCamp(); } else sfx.error(); }) : null }, ico(SYM_ICO[k][0]), h('b', {}, D.TALENT_SYMS[k].name), left > 0 ? null : h('small', {}, 'used twice')); })),
    h('p', { class: 'sh-role' }, `${info.costs[pickFace]} gold, once. Tap a symbol to buy it.`)) : null;
  const grow = !up.next && !up.act ? shDone('Biggest size') : up.act && String(up.why).startsWith('Act') ? shLock(`Grows again in ${up.why}`)
    : shBuy(hero, { label: `Grow to d${up.next}`, cost: up.cost, ok: up.ok, onBuy: () => { if (HE.upgradeDie(hero, 'special', slot)) shBought(); } });
  return [shStage(...shGrow(size, up.next && !up.act ? up.next : null)), h('p', { class: 'sh-sec' }, 'Faces · tap a number to give it a symbol'), h('div', { class: 'sh-faces', style: { '--cols': String((3 + nums.length) <= 6 ? 3 + nums.length : Math.ceil((3 + nums.length) / 2)) } }, ...fixed, ...nums), picker, grow];
}
function closeSlot() {
  const slot = SHEET.slot, inline = SHEET.inline;
  SHEET.slot = null; SHEET.inline = false; SHEET.el = null;
  if (inline) {
    X.renderCamp(SHEET.fromBoard);
    const side = $('.sx-camp .sx-side'); if (side) side.scrollTop = SHEET.scroll;
    $(`.cw-cell.s-${slot}`)?.focus({ preventScroll: true });
  } else closeModal();
}
function campInspector() {
  if (!SHEET.inline || !SHEET.slot) return null;
  SHEET.el = h('section', { class: 'cw-inspector', id: 'camp-inspector', tabindex: '-1', 'aria-labelledby': 'camp-inspector-title',
    onkeydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); closeSlot(); } } }, ...slotSheet(SHEET.slot).filter(Boolean));
  return SHEET.el;
}
// cp3 (Dave, 27 Oct: "when I click the dice to upgrade, I want the screen to scroll down and show the card"): after a die is tapped, glide the
// camp sheet so the inspection/upgrade card starts just under everything pinned at the top of the screen (the wood Camp header band, the Camp
// title and the name/coins chip). Instant under reduced motion. The pinned height is measured, not guessed, so it follows any phone and notch.
function campPinnedBottom(side) {
  const sr = side.getBoundingClientRect(); let bottom = sr.top;
  const top = side.querySelector('.sx-sidetop'); const title = document.querySelector('.cw-camp .sx-viewport .sx-top');
  for (const el of [top, title]) { if (el) bottom = Math.max(bottom, el.getBoundingClientRect().bottom); }
  if (top) { const band = parseFloat(getComputedStyle(top, '::before').height); if (band > 0) bottom = Math.max(bottom, band); } // the fixed wood band is 62px + the notch, from the top of the screen
  return bottom;
}
function toCampCard() {
  const run = () => {
    const side = $('.sx-camp .sx-side'), el = SHEET.el || $('#camp-inspector'); if (!side || !el || !el.isConnected) return;
    const aim = () => Math.max(0, side.scrollTop + el.getBoundingClientRect().top - campPinnedBottom(side) - 10);
    const calm = reduced();
    side.scrollTo({ top: aim(), behavior: calm ? 'auto' : 'smooth' });
    if (!calm) setTimeout(() => { if (el.isConnected && Math.abs(side.scrollTop - aim()) > 6) side.scrollTo({ top: aim(), behavior: 'smooth' }); }, 700); // late layout (art, fonts) moved the card: aim again
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
}
function openSlot(slot) {
  sfx.card();
  const inline = !!$('.cw-camp') && !String(slot).startsWith('power:');
  if (inline && !SHEET.inline) SHEET.scroll = $('.sx-side')?.scrollTop || 0;
  if (SHEET.slot !== slot) { SHEET.weaponMode = 'forge'; TAL.face = null; TAL.sym = null; }
  SHEET.slot = slot; SHEET.inline = inline;
  if (inline) {
    X.S.campPage = 'dice'; X.S.tab = 'forge'; X.renderCamp(SHEET.fromBoard);
    SHEET.el?.focus({ preventScroll: true });
    toCampCard();
  } else {
    SHEET.el = h('div', { class: 'form slot-sheet' }, ...slotSheet(slot).filter(Boolean)); modal(SHEET.el);
  }
}
function refreshSheet() {
  if (SHEET.inline) return;
  if (!SHEET.slot || !SHEET.el?.isConnected) { SHEET.slot = null; return; }
  SHEET.el.replaceChildren(...slotSheet(SHEET.slot).filter(Boolean));
}
function forgeTab() {
  return h('div', { class: 'sx-tab forge' }, diceGrid(X.S.hero));
}
const zone = (cls, icon, title, sub, ...kids) => h('section', { class: `sx-zone ${cls}`, id: `fs-${cls}` },
  h('header', { class: 'zn-head' }, h('span', { class: 'zn-tag' }, ico(icon), h('b', {}, title))), sub ? h('p', { class: 'zn-sub' }, sub) : null, ...kids);
// ---- the Camp Store (Dave, Oct 2026): always at camp, never on the road. Today's specials (one fight's help, for you), a mystery
// bundle, the weapons on the shelf (new every camp), supplies, a pet and now and then a charm, and the dearest thing on the shelf
// up top with how close your purse is, so there is something to save up for.
const TONIC_ICO = { pierce: 'pierce', boot: 'boot', block: 'shield', atk: 'burst', magic: 'spark', heal: 'heart' };
function storeCanBuy(hero) {
  const stock = E.shopStock(hero); const pot = E.potionBuyInfo(hero);
  return stock.filter((it) => !it.sold && hero.gold >= it.price && (it.inst.diamond ? !E.diamondCaseFull(hero) : !E.bagFull(hero))).length
    + E.storeTonics(hero).filter((t) => !t.bought && hero.gold >= t.price).length + (pot.ok ? 1 : 0) + (E.potionUpgrade(hero).ok ? 1 : 0) + (E.rerollDieInfo(hero).ok ? 1 : 0);
}
// The cardboard Camp Store (Dave approved 26 Oct 2026, mockup docs/team/mockups/cards/shop.html v2): a wood sign, cardboard cards on the table,
// paper price tags with pencil coins (red when you are short). Sections: specials counter, the weapon shelf, the Diamond case (the T17 card with
// an ice-blue sheen), odds and ends (the pet), supplies (potions, the belt's third slot, the 4th reroll die).
// Every tag runs the same HE.* purchase the old rows did; every price and gate is read from engine.js.
const METAL_INK = ['#c98a4a', '#d8e2ea', '#ffd24a', '#ffd24a'];
function storeTab() {
  const hero = X.S.hero; const stock = E.shopStock(hero); const ok = () => { sfx.coin(); X.persist(); X.renderCamp(); };
  const no = (why) => { sfx.error(); toast(why); };
  const best = stock.map((it, i) => ({ it, i })).filter(({ it }) => !it.sold).sort((a, b) => b.it.price - a.it.price)[0];
  const buyWeapon = (it, i) => { const full = it.inst.diamond ? E.diamondCaseFull(hero) : E.bagFull(hero);
    if (it.sold) return null;
    if (full) return h('span', { class: 'cst-sticker' }, it.inst.diamond ? 'Case full' : 'Pack full');
    return CB.priceTag(it.price, { poor: hero.gold < it.price, aria: `Buy ${D.WEAPONS[it.inst.id].name} for ${it.price} gold`, onBuy: tap(() => { if (HE.buyItem(hero, i)) ok(); else no('Not enough gold.'); }) }); };
  const saveNote = (it) => hero.gold >= it.price ? 'You can afford it now.' : `${hero.gold} of ${it.price} gold.`;
  const bar = (it) => h('span', { class: 'cst-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(it.price), 'aria-valuenow': String(Math.min(hero.gold, it.price)) }, h('i', { style: { width: `${Math.min(100, (hero.gold / it.price) * 100)}%` } }));
  // the counter: today's specials and the mystery bundle
  const specials = E.storeTonics(hero).map((t) => CB.storeCard({ cls: t.bought ? 'have' : '', art: t.icon === 'boot' ? CB.storeIcon('boots', '#c98a4a') : CB.storeSym(t.icon === 'block' ? 'block' : t.icon), title: t.name, lines: [t.text],
    stamp: t.bought ? 'Yours' : '', tag: t.bought ? null : CB.priceTag(t.price, { poor: hero.gold < t.price, aria: `Buy ${t.name} for ${t.price} gold`,
      onBuy: tap(() => { if (HE.buyTonic(hero, t.id)) { sfx.level(); X.persist(); X.renderCamp(); toast(`${t.name}: ready for your next fight.`); } else no('Not enough gold.'); }) }) }));
  const bo = E.bundleOffer(hero);
  if (bo) specials.push(CB.storeCard({ cls: `parcel ${bo.bought ? 'have' : ''}`, art: CB.storeText('?', '#c84a3a', 84), title: 'Mystery bundle', lines: ['A weapon wrapped in a tablecloth.',
    h('span', { class: 'cst-odds' }, bo.odds.map((o, i) => h('span', { class: `m${i}` }, `${Math.round(o * 100)}% ${D.RARITY[i]}`)))],
    stamp: bo.bought ? 'Opened' : '', sticker: !bo.bought && E.bagFull(hero) ? 'Pack full' : '',
    tag: bo.bought || E.bagFull(hero) ? null : CB.priceTag(bo.price, { poor: hero.gold < bo.price, aria: `Buy the mystery bundle for ${bo.price} gold`,
      onBuy: tap(() => { const inst = HE.buyBundle(hero); if (inst) { sfx.level(); X.persist(); X.renderCamp(); toast(`Inside: a ${D.RARITY[inst.rarity | 0]} ${D.WEAPONS[inst.id].name}. It is in your pack.`); } else no('Not enough gold.'); }) }) }));
  // the shelf: plain weapons as cardboard cards (tap the card for the full weapon card)
  const shelf = stock.map((it, i) => ({ it, i })).filter(({ it }) => !it.inst.diamond).map(({ it, i }) => { const w = D.WEAPONS[it.inst.id]; const r = it.inst.rarity | 0; const top = best && best.i === i;
    return CB.storeCard({ cls: `wpn r${Math.min(r, 3)} ${it.sold ? 'sold' : ''} ${top ? 'save' : ''}`, art: CB.storeIcon(it.inst.id, METAL_INK[r] || '#d8e2ea'), title: w.name, ribbon: top ? 'Worth saving for' : '',
      lines: [h('span', { class: 'cst-metal' }, D.tierName ? D.tierName(it.inst) : D.RARITY[r]), `d${E.weaponSize ? E.weaponSize(it.inst) : ''} · ${w.hands === 2 ? 'Two hands' : 'One hand'}`, top && !it.sold ? bar(it) : null, top && !it.sold ? saveNote(it) : null],
      stamp: it.sold ? 'Sold' : '', tag: buyWeapon(it, i), onOpen: tap(() => showWeaponCard(it.inst, { label: 'Store', value: it.price })), aria: `See the ${w.name} card` }); });
  // the Diamond case: the T17 weapon card with the ice-blue sheen, a paper tag under it
  const diamonds = stock.map((it, i) => ({ it, i })).filter(({ it }) => it.inst.diamond).map(({ it, i }) => {
    const c = CW.weaponCardOf(it.inst, { label: 'Store', value: it.price }); c.classList.add('cst-dia'); c.setAttribute('role', 'button'); c.tabIndex = 0;
    c.addEventListener('click', () => { sfx.click(); showWeaponCard(it.inst, { label: 'Store', value: it.price }); });
    return h('div', { class: `cst-diawrap ${it.sold ? 'sold' : ''}` }, c, h('span', { class: 'cst-diatag' }, best && best.i === i && !it.sold ? 'Diamond · worth saving for' : 'Diamond'),
      it.sold ? h('span', { class: 'cst-stamp' }, 'Sold') : buyWeapon(it, i)); });
  // odds and ends: the pet
  const po = E.petOffer(hero);
  const pet = po ? CB.storeCard({ cls: 'pet', art: h('img', { src: petImg(po.type), alt: '' }), title: `${D.PETS[po.type].name}, a pet`, lines: [D.PETS[po.type].text, 'A pet rolls one more die beside your board.'],
    stamp: po.owned ? 'With you' : '', tag: po.owned ? null : CB.priceTag(po.price, { poor: hero.gold < po.price, label: hero.pet ? 'Trade' : '', aria: `${hero.pet ? 'Trade for' : 'Adopt'} ${D.PETS[po.type].name} for ${po.price} gold`, onBuy: tap(() => petAsk(hero, po)) }) }) : null;
  // supplies: the same rows' logic as before, as cards
  const pot = E.potionBuyInfo(hero); const belt = E.potionUpgrade(hero); const rr = E.rerollDieInfo(hero); const bought = () => { sfx.level(); X.persist(); X.renderCamp(); };
  const supplies = [CB.storeCard({ cls: 'potion', art: CB.storeSym('heal'), title: 'Healing potion', lines: [`Heals ${E.potionHpOf(hero)}.`, `Belt: ${pot.have} of ${pot.max}.`],
      sticker: pot.why === 'Belt full' ? 'Belt full' : '', tag: pot.why === 'Belt full' ? null : CB.priceTag(pot.price, { poor: !pot.ok, aria: `Buy a healing potion (heals ${E.potionHpOf(hero)}) for ${pot.price} gold`,
        onBuy: tap(() => { if (HE.buyPotion(hero)) ok(); else no('Not enough gold.'); }) }) }),
    belt.next ? CB.storeCard({ cls: 'belt', art: CB.storeIcon('bracer', '#c98a4a'), title: 'Potion belt', lines: [`${belt.cur} → ${belt.next} potions`, `Carry one more (each heals ${E.potionHpOf(hero)}).`],
      sticker: belt.why?.startsWith('Level') ? `Needs ${belt.why}` : '', tag: CB.priceTag(belt.cost, { poor: !belt.ok, aria: `Carry ${belt.next} potions for ${belt.cost} gold${belt.why?.startsWith('Level') ? ` (needs ${belt.why})` : ''}`,
        onBuy: tap(() => { if (HE.upgradePotions(hero)) bought(); else no(belt.why?.startsWith('Level') ? `The belt needs ${belt.why}.` : 'Not enough gold.'); }) }) })
      : CB.storeCard({ cls: 'belt have', art: CB.storeIcon('bracer', '#c98a4a'), title: 'Potion belt', lines: [`${belt.cur} potions`], stamp: 'Max' }),
    rr.next ? CB.storeCard({ cls: 'reroll', art: CB.storeText('+1'), title: 'Rerolls', lines: [`${rr.cur} → ${rr.next} dice`, 'Each reroll in battle can take one more die.'],
      tag: CB.priceTag(rr.cost, { poor: !rr.ok, aria: `Reroll ${rr.next} dice for ${rr.cost} gold`, onBuy: tap(() => { if (HE.buyRerollDie(hero)) bought(); else no('Not enough gold.'); }) }) })
      : CB.storeCard({ cls: 'reroll have', art: CB.storeText('+1'), title: 'Rerolls', lines: [`${rr.cur} dice`], stamp: 'Max' })];
  const sect = (cls, title, sub, ...kids) => h('section', { class: `cst-zone ${cls}` }, h('h2', {}, title), sub ? h('p', { class: 'cst-sub' }, sub) : null, ...kids);
  return h('div', { class: 'cst-store' },
    h('header', { class: 'cst-sign' }, h('h2', {}, 'Camp Store'), h('p', {}, 'New stock every camp'), h('span', { class: 'cst-purse', 'aria-label': `${hero.gold} gold in your purse` }, h('i', { class: 'cst-coin', 'aria-hidden': 'true' }), h('b', {}, String(hero.gold)))),
    sect('zn-specials', 'Today’s specials', 'One fight of help. Bought today, used in your next fight, gone after.', h('div', { class: 'cst-counter' }, h('div', { class: 'cst-grid three' }, specials))),
    sect('zn-shelf', 'On the shelf', 'Weapons. What you buy goes in your pack. Tap a card to see it.', h('div', { class: 'cst-grid two' }, shelf)),
    diamonds.length ? sect('zn-diamond', 'Diamond case', `A Diamond is used up in one fight. You carry at most ${D.DIAMOND.max}.`, h('div', { class: 'cst-diacase' }, diamonds)) : null,
    pet ? sect('zn-odd', 'Odds and ends', '', h('div', { class: 'cst-grid one' }, pet)) : null,
    sect('zn-supplies', 'Supplies', 'Potions, a bigger belt, and more dice for each reroll.', h('div', { class: 'cst-grid three' }, supplies)));
}
function gearTab({ grid = false, chips = false } = {}) {
  const hero = X.S.hero; const two = E.isTwoHanded(hero);
  const sync = () => { sfx.card(); X.persist(); X.renderCamp(); };
  const wear = (inst, side) => { const c = E.canEquip(hero, inst.uid, side); if (!c.ok) { sfx.error(); toast(c.why); return; } HE.equip(hero, inst.uid, side); sync(); };
  const worn = two ? [weaponCard(hero.loadout.NW, { note: 'Both hands', cls: 'worn', badge: 'Equipped' })] : [weaponCard(hero.loadout.NW, { note: 'Left hand', cls: 'worn', badge: 'Left' }), weaponCard(hero.loadout.NE, { note: 'Right hand', cls: 'worn', badge: 'Right' })];
  // the pack and the Diamond case as the popup's rows (Dave, Oct 2026: "look at your pack"): picture, name, faces, buttons below
  const sell = (n, onSell, aria) => h('button', { class: 'sh-mini sell', type: 'button', 'aria-label': aria, onclick: tap(onSell) }, h('span', {}, 'Sell'), priceChip(n));
  const bag = hero.bag.map((inst) => {
    const w = D.WEAPONS[inst.id];
    const hand = (side, label) => h('button', { class: 'sh-mini', type: 'button', 'aria-label': `Equip ${w.name}${w.hands === 2 ? '' : ` in ${side === 'NW' ? 'left' : 'right'} hand`}`, onclick: tap(() => wear(inst, side)) }, label);
    return shWeapon(inst, h('div', { class: 'sh-acts' }, w.hands === 2 ? hand('NW', 'Equip') : [hand('NW', 'Left'), hand('NE', 'Right')],
      sell(E.sellValue(inst), () => { HE.sellItem(hero, inst.uid); sfx.coin(); X.persist(); X.renderCamp(); }, `Sell ${w.name} for ${E.sellValue(inst)} gold`)), 'pk');
  });
  // the places a weapon can be, each its own panel with its heading centered on the top edge
  void worn;
  const jump = chips ? jumpChips([{ id: 'dice', label: 'Your dice', icon: 'dice' }, { id: 'zn-pack', label: `Pack ${bag.length}/${D.BAG_MAX}`, icon: 'bag' },
    E.charmsOf(hero).length ? { id: 'zn-charms', label: 'Charms', icon: 'star', n: E.charmsOf(hero).length } : null,
    E.diamondsOf(hero).length ? { id: 'zn-diamonds', label: 'Diamonds', icon: 'gem', n: E.diamondsOf(hero).length } : null]) : null;
  return h('div', { class: 'sx-tab gear' },
    jump, coachBox('g_gear'),
    grid ? diceGrid(hero) : null,
    zone('zn-pack', 'bag', `Your pack · ${bag.length} of ${D.BAG_MAX}`, '', bag.length ? h('div', { class: 'sh-list' }, bag) : h('p', { class: 'muted empty' }, 'Nothing yet. Monsters drop weapons, eventually, if you ask firmly.')),
    E.charmsResting() // charms are suspended (teamwork pass): an old hero's charms are listed as kept, with no buttons; a new hero sees nothing
      ? (E.charmsOf(hero).length ? zone('zn-charms', 'star', 'Charms · resting', 'Charms are switched off for now. Yours are kept safe in your save and do nothing until they come back.',
        h('div', { class: 'ch-list resting' }, E.charmsOf(hero).map((id) => charmCard(id, { cls: 'resting', badge: 'Resting' })))) : null)
      : zone('zn-charms', 'star', `Charms · ${E.charmsOf(hero).length} of ${D.CHARM_MAX}`, 'Each one changes a rule for you, in every fight.',
        E.charmsOf(hero).length ? h('div', { class: 'ch-list' }, E.charmsOf(hero).map((id) => charmCard(id, { actions: [dropBtn(hero, id)] }))) : h('p', { class: 'muted empty' }, 'None yet. Bosses and big fights drop them.'),
        charmGuideBtn()),
    E.diamondsOf(hero).length ? zone('zn-diamonds', 'gem', `Diamond case · ${E.diamondsOf(hero).length} of ${D.DIAMOND.max}`, 'One fight each, then it shatters. Left or Right: the hand it goes in next fight.',
      h('div', { class: 'sh-list' }, E.diamondsOf(hero).map((d) => { const at = E.armedSlot(hero, d.uid); const w = D.WEAPONS[d.id];
        // Left / Right here at camp works at a table too (Dave, Oct 2026: the quest board's Bring strip is solo only)
        const hand = (s) => h('button', { class: `sh-mini db-hand ${at === s ? 'on' : ''}`, type: 'button', onclick: tap(() => { HE.armDiamond(hero, d.uid, at === s ? null : s); sfx.select?.(); X.persist(); X.renderCamp(); }),
          'aria-label': `${at === s ? 'Keep' : 'Bring'} the Diamond ${w.name}${at === s ? ' in its case' : ` in your ${s === 'NW' ? 'left' : 'right'} hand next fight`}` }, at === s ? ico('check') : null, s === 'NW' ? 'Left' : 'Right');
        return shWeapon(d, h('div', { class: 'sh-acts' }, E.diamondHands(hero).map(hand),
          sell(E.diamondSellValue(d), () => { if (HE.sellDiamond(hero, d.uid)) { sfx.coin(); X.persist(); X.renderCamp(); } }, `Sell the Diamond ${w.name} for ${E.diamondSellValue(d)} gold`)), 'pk'); }))) : null);
}
// The hero's lifetime score: every battle's points add up here, with party trophies.
function hallOfFame(hero) {
  const r = hero.record || { battles: 0, points: 0, best: 0, firsts: 0, seconds: 0 };
  const cell = (label, v, cls = '') => h('div', { class: `hf-cell ${cls}` }, h('b', {}, String(v)), h('small', {}, label));
  return h('section', { class: 'sx-hof' }, eyebrow('Hall of fame', 'gold'),
    h('div', { class: 'hf-row' }, cell('Total points', r.points.toLocaleString(), 'big'), cell('Battles', r.battles), cell('Best battle', r.best)),
    r.firsts || r.seconds ? h('div', { class: 'hf-row two' }, cell('1st place', r.firsts, 'gold'), cell('2nd place', r.seconds, 'silver')) : h('p', { class: 'fine' }, 'Trophies for 1st and 2nd place are won in party games.'));
}
function heroTab({ chips = false } = {}) {
  const hero = X.S.hero; const c = D.CLASSES[hero.cls]; const pc = {}; hero.perks.forEach((p) => { pc[p] = (pc[p] || 0) + 1; });
  const log = (X.S.company?.campaign || hero.campaign)?.chronicle || [];
  const need = D.xpToNext(hero.level);
  const anchor = (id) => h('span', { class: 'fx-anchor', id: `fs-${id}` });
  return h('div', { class: 'sx-tab herotab' },
    chips ? jumpChips([{ id: 'h-stats', label: 'Stats', icon: 'hero' }, { id: 'h-diff', label: 'Difficulty', icon: 'skull' }, { id: 'h-perks', label: 'Perks', icon: 'star', n: hero.pendingPerks || 0, note: 'to choose' }, { id: 'h-powers', label: 'Powers', icon: 'spark' }]) : null,
    anchor('h-stats'),
    h('div', { class: 'ht-id' }, emblem(hero.cls, 'lg'), h('div', {}, h('h2', {}, hero.name), h('small', {}, `Level ${hero.level} ${c.name}`))),
    h('div', { class: 'vc-xp' }, h('div', { class: 'vc-bar' }, h('i', { style: { width: `${hero.level >= D.MAX_LEVEL ? 100 : (hero.xp / need) * 100}%` } })), h('small', {}, hero.level >= D.MAX_LEVEL ? 'Max level' : `${hero.xp} / ${need} XP`)),
    heroStats(E.maxHpOf(hero), E.feetSize(hero), { hands: Math.max(hero.strength.W || 4, hero.strength.E || 4), startMagic: E.startMagicOf(hero), magicCap: E.magicCapOf(hero) }),
    hallOfFame(hero),
    anchor('h-diff'), eyebrow('Difficulty'),
    difficultyPicker(hero.difficulty, (id) => { hero.difficulty = id; sfx.select(); X.persist(); X.renderCamp(); }, { locked: !!X.net, compact: true }),
    X.net ? h('p', { class: 'fine' }, 'The host set this for the table.') : null,
    h('div', { class: 'sx-check' }, h('span', {}, `Hints: ${Coach.hintsOn() ? 'on' : 'off'}`), btn(Coach.hintsOn() ? 'Turn off' : 'Turn on', () => { Coach.setHints(!Coach.hintsOn()); X.renderCamp(); }, { kind: 'ghost' })),
    h('p', { class: 'fine' }, `${hero.stats.battles} victories · ${hero.stats.defeats} defeats · ${hero.stats.triples} triples · ${hero.stats.straights} straights`),
    anchor('h-perks'), eyebrow('Perks'), Object.keys(pc).length ? h('div', { class: 'ht-perks' }, Object.entries(pc).map(([id, n]) => h('div', { class: 'ht-perk' }, ico(PERK_ICON[id] || 'star'), h('div', {}, h('b', {}, `${D.PERKS[id].name}${n > 1 ? ` ×${n}` : ''}`), h('small', {}, D.PERKS[id].text))))) : h('p', { class: 'muted empty' }, 'You earn a perk every level. Growing up, with extra steps.'),
    anchor('h-powers'), eyebrow('Magical powers'), h('div', { class: 'ci-cards' }, E.cardsOf(hero).map((k) => h('div', { class: 'ci-card' }, h('span', { class: 'cc-cost' }, String(k.cost), ico('spark')), h('b', {}, h('i', { class: `ci-slot s-${k.slot}` }, k.slot), ` ${k.name}`), h('small', {}, k.text)))),
    eyebrow('Healing'), h('div', { class: 'ci-cards' }, h('div', { class: 'ci-card' }, h('span', { class: 'cc-cost' }, String(E.healCostOf(hero)), ico('spark')), h('b', {}, 'Heal with magic'), h('small', {}, `Restore ${E.healAmountOf(hero)} health`)), h('div', { class: 'ci-card' }, h('span', { class: 'cc-cost' }, '0', ico('spark')), h('b', {}, 'Healing potion'), h('small', {}, `${E.potionStock(hero)} on your belt, ${E.potionHpOf(hero)} health each`)), h('div', { class: 'ci-card' }, h('span', { class: 'cc-cost' }, String(D.NUDGE_COST), ico('spark')), h('b', {}, 'Heart change'), h('small', {}, 'Turn your heart die by 1'))),
    log.length ? [eyebrow('The road remembers'), h('div', { class: 'ht-log' }, log.slice(0, 8).map((e) => h('div', {}, h('b', {}, e.title), h('small', {}, e.text))))] : null);
}
function shrinkSection(hero) {
  E.ensureTwin(hero);
  const rows = [];
  const add = (kind, slot, label, icon = 'dice') => {
    const b = shrinkBtn(kind, slot, label); if (!b) return;
    rows.push(h('div', { class: 'sx-urow cmp shrink-row' }, rowIco(icon), h('div', { class: 'ur-copy' }, h('b', {}, label)), b));
  };
  add('strength', 'W', 'Left hand'); add('strength', 'E', 'Right hand'); add('mind', 'N', 'Head'); add('speed', 'S', 'Feet');
  if (E.isActive(hero, 'SW')) add('special', 'SW', DIE_NAME.SW);
  if (E.isActive(hero, 'SE')) add('special', 'SE', DIE_NAME.SE);
  for (const slot of ['NW', 'NE']) {
    const inst = hero.loadout[slot]; if (!inst || inst.twin || inst.id === 'fists') continue;
    add('weapon', inst.uid, D.WEAPONS[inst.id].name, 'sword');
  }
  if (hero.pet) add('pet', null, D.PETS[hero.pet.type].name, 'heart');
  return rows.length ? zone('zn-shrink', 'dice', 'Shrink', 'Pay gold to make a die smaller.', ...rows) : null;
}
function campNavigation(fromBoard) {
  return h('nav', { class: 'cw-nav', 'aria-label': 'Camp sections' }, [['dice', 'Dice'], ['powers', 'Powers'], ['gear', 'Gear'], ['store', 'Store'], ['hero', 'Hero']].map(([id, label]) =>
    h('button', { type: 'button', class: X.S.campPage === id ? 'on' : '', 'aria-current': X.S.campPage === id ? 'page' : null, 'data-camp-page': id,
      onclick: tap(() => { SHEET.inline = false; SHEET.slot = null; if (id === 'store') X.S.tab = 'store'; else X.S.campPage = id; X.renderCamp(fromBoard); }) }, label)));
}
function campContent(hero) {
  switch (X.S.campPage) {
    case 'gear': return gearTab({ grid: false, chips: false });
    case 'powers': return zone('zn-powers', 'spark', 'Your powers', `${D.CLASSES[hero.cls].name} power library`, campPowers(hero));
    case 'hero': return h('div', { class: 'cw-supplies' }, heroTab({ chips: false }), hero.pet ? petCard(hero) : null,
      h('details', { class: 'cw-shrink' }, h('summary', {}, 'Make a die smaller'), shrinkSection(hero)),
      X.net ? null : btn('Soul Code', () => { const c = X.currentCode(); if (c) X.copyCode(c); }, { kind: 'ghost', icon: 'key' }));
    default: return h('div', { class: `cw-workshop ${SHEET.inline ? 'inspecting' : ''}` }, diceGrid(hero), campInspector(), SHEET.inline ? null : diamondBring(hero));
  }
}
export function camp(fromBoard) {
  const S = X.S; const hero = S.hero;
  const identity = `${hero.name}:${hero.cls}`;
  if (SHEET.hero !== identity) { SHEET.slot = null; SHEET.inline = false; SHEET.el = null; SHEET.hero = identity; }
  SHEET.fromBoard = fromBoard;
  if (S.tab === 'hero' || S.tab === 'gear') { S.campPage = S.tab; S.tab = 'forge'; }
  S.campPage ||= 'dice';
  const store = S.tab === 'store';
  const perkHero = X.net ? (hero.pendingPerks > 0 ? hero : null) : (S.company?.members || [hero]).find((m) => m.pendingPerks > 0);
  if (X.net) { S.perkOffer = perkHero ? X.netPerkOffer() : null; }
  else { if (perkHero && (!S.perkOffer || S.perkFor !== perkHero.name)) { S.perkOffer = E.offerPerks(perkHero, X.fresh()); S.perkFor = perkHero.name; } if (!perkHero) { S.perkOffer = null; S.perkFor = null; } }
  const perkPanel = perkHero && S.perkOffer ? panel('sx-perks glow', eyebrow(`${perkHero.name} still owes a perk`, 'gold'), h('div', { class: 'perk-row' }, S.perkOffer.map((id, i) => perkCard(id, perkHero, () => { if (X.net) { sfx.level(); X.netPerk(id); return; } E.takePerk(perkHero, id); S.perkOffer = null; sfx.level(); X.persist(); X.renderCamp(fromBoard); }, i)))) : null;
  const seats = !X.net && (S.company?.members.length || 0) > 1 ? h('div', { class: 'sx-seats' }, S.company.members.map((m, i) => h('button', { type: 'button', class: S.seat === i ? 'on' : '', onclick: tap(() => { S.seat = i; S.hero = m; sfx.select(); X.renderCamp(fromBoard); }) }, emblem(m.cls), h('span', {}, h('b', {}, m.name), h('small', {}, `Lv ${m.level} · ${m.gold}g`))))) : null;
  const keep = $('.sx-camp-scroll'); const y = keep && S.holdScroll !== false ? keep.scrollTop : 0;
  const canBuyDie = GRID.some(([slot]) => slotCanBuy(hero, slot));
  let tip = null;
  if (!hero.tips?.c_first && Coach.hintsOn()) { if (hero.gold > 0 && canBuyDie) tip = coachBox('c_first'); }
  else tip = coachBox('c_hands');
  const body = store
    ? h('div', { class: 'sx-tab store' }, btn('Back to camp', () => { S.tab = 'forge'; X.renderCamp(fromBoard); }, { kind: 'ghost', icon: 'back' }), storeTab())
    : h('div', { class: 'sx-tab forge' }, campNavigation(fromBoard), campContent(hero), !SHEET.inline && S.campPage === 'dice' ? tip : null);
  mountAs('camp', h('div', { class: `sx-split sx-camp cw-camp ${SHEET.inline ? 'cw-inspecting' : ''}` }, h('div', { class: 'sx-viewport' }, topBar(h('div', { class: 'sx-camp-title' }, h('h1', {}, 'Camp')))),
    h('div', { class: 'sx-side' },
      h('div', { class: 'sx-sidetop' }, heroChip(hero)),
      X.partyBar?.(), seats, perkPanel, store ? null : campStatus(hero),
      h('div', { class: 'sx-camp-scroll' }, body),
      h('div', { class: 'sx-cta' }, X.net ? X.campCta(btn) : btn('To the road', () => toRoad(hero), { big: true, icon: 'map', cls: 'wide' })))));
  const sc = $('.sx-camp-scroll'); if (sc && y) sc.scrollTop = y;
  { const side = $('.sx-side'); const st = side?.querySelector('.sx-sidetop'); if (side && st) side.style.setProperty('--stick', `${st.offsetHeight}px`); }
  lay('camp');
  SCR.enter('camp', { hero, heroes: X.members() }, `camp:${hero.name}`).then((hd) => { if (hd) { hd.sync?.(hero); } });
  SCR.current()?.sync?.(hero);
  refreshSheet();
}

// ------------------------------------------------------------------------------------------------ plumbing
// Phones: the page is one tall scroll (the 3D picture is the first screenful and scrolls away with everything else).
function mountAs(cls, ...nodes) {
  if (cls.trim().split(/\s+/)[0] !== 'camp' && SHEET.inline) { SHEET.slot = null; SHEET.inline = false; SHEET.el = null; }
  const app = $('#app'); const prev = $('.sx-side, .sx-board-main'); const kind = cls.trim().split(/\s+/)[0];
  const same = prev && app?.classList.contains('sx-screen') && app.classList.contains(kind); const y = same ? prev.scrollTop : 0;
  X.mountAs(`sx-screen ${cls}`, ...nodes);
  const side = $('.sx-side, .sx-board-main'); if (!side) return;
  side.addEventListener('scroll', () => SCR.scrolled?.(side.scrollTop), { passive: true });
  side.scrollTop = y; SCR.scrolled?.(y);
}
export function chrome(mute) { const m = $('#mute'); if (m) m.replaceChildren(ico(mute ? 'mute' : 'sound', '', 18)); const hlp = $('#help'); if (hlp && !hlp.querySelector('svg')) hlp.replaceChildren(ico('help', '', 20)); const hm = $('#home'); if (hm && !hm.querySelector('svg')) hm.replaceChildren(ico('home', '', 20)); const gm = $('#gmenu'); if (gm && !gm.querySelector('svg')) gm.replaceChildren(ico('menu', '', 20)); }

// The building blocks, for the screens of the shared table (g3/online.js).
export const kit = { coin, btn, panel, eyebrow, flourish, plaque, ico, emblem, heroChip, topBar, mountAs, lay, tap, coachBox, tipBox, storyCard, perkCard, weaponCard, charmCard, charmGuideBtn, questCard, trail, CLS_HUE, romans, clsName };
