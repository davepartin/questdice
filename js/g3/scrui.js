// DOM for the non-battle screens when the 3D world is available: title, hero creation, quest board,
// road events, victory / defeat and camp. Glassy panels over the live scene from screens.js.
// Every game behaviour (saves, passwords, perks, shop, equip, upgrades) is delegated back to ui.js through
// the context handed to bind(); this file only decides what things look like.
import { shortLine } from './powers.js';
import { h, $, $$, modal, toast } from '../dom.js';
import * as E from '../engine.js';
import * as D from '../data.js';
import * as SV from '../save.js';
import * as R from '../roads.js';
import * as Net from '../net.js';
import * as Coach from '../coach.js';
import { sfx } from '../audio.js';
import { world } from './world.js';
import * as SCR from './screens.js';
import { ico, CLASS_ICON } from './icons.js';
import { petImg } from './pets.js';
import { showTrial, statBadge } from './trialui.js';
import * as DAY from '../daily.js';
import { packList, packOf, packIdOf, monsterOf, partySize, forcedLine, coverClasses, DEFAULT_PACK } from '../campaigns.js';

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
  camp: { land: { right: 0.42 }, port: { bottom: 0.58 } },
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
const HERO_OPS = ['takeCharm', 'dropCharm', 'buyCharm', 'sellDiamond', 'upgradeDie', 'upgradePower', 'upgradePotions', 'unlockDie', 'trainWeapon', 'forgeWeapon', 'sellItem', 'removeTalent', 'addTalent', 'downgradeDie', 'removePetSymbol', 'addPetSymbol', 'growPet', 'buyPet', 'buyPotion', 'buyRerollDie', 'buyItem', 'buyTonic', 'buyBundle', 'equip', 'equipPower', 'learnPower', 'armDiamond'];
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
    menu.append(plaque({ eyebrow: `Daily challenge${st > 1 ? ` · ${st} days in a row` : ''}`, title: `${D.CLASSES[run.cls].name} · ${D.CHARMS[run.charm].name}`,
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
function faceChips(inst) {
  return h('div', { class: 'wc-faces' }, E.weaponFaces(inst).map((f) => h('span', { class: `wf ${f.c === 'r' ? 'red' : 'blue'} ${f.v === 0 ? 'zero' : ''}` }, h('b', {}, String(f.v)), f.fx || f.plus ? h('span', { class: 'wf-fx' }, fxItems({ ...(f.plus ? { [f.c === 'b' ? 'block' : 'atk']: f.plus } : {}), ...(f.fx || {}) })) : null))); // a +1 icon shows like the others
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
// A weapon as a collectible: 3D portrait, rarity banner and glow, face chips, optional actions.
function weaponCard(inst, { actions = [], note = '', compact = false, badge = '', cls = '' } = {}) {
  const w = D.WEAPONS[inst.id]; const r = w.legendary ? 'legend' : RAR[inst.rarity | 0]; const tier = D.tierName(inst);
  // Strength is the limit: a weapon die never rolls bigger than the hand that holds it
  const size = E.weaponSize(inst); const hero = X.S?.hero; const wi = hero && inst.id !== 'fists' && !inst.diamond && !String(inst.uid).startsWith('c-') ? E.wieldInfo(hero, inst) : null;
  const need = inst.diamond ? h('p', { class: 'wc-need diamond' }, ico('gem'), 'Any hand · one fight, then it shatters') : size > 4 ? h('p', { class: `wc-need ${wi && !wi.ok ? 'short' : 'ok'}` }, ico(wi && !wi.ok ? 'lock' : 'check'),
    wi && !wi.ok ? `Needs d${size} Strength${wi.two ? ' in both hands' : ''}. Rolls as a d${wi.rollsAs} until you train it.` : `Needs d${size} Strength${wi?.two ? ' in both hands' : ''}`) : null;
  return h('article', { class: `sx-wc rar-${r} ${compact ? 'compact' : ''} ${cls}` },
    h('div', { class: 'wc-stage' }, art(() => SCR.portraitQ.weapon(inst.id, inst.rarity | 0), 'wc-art', `${tier} ${w.name}`), h('span', { class: 'wc-banner' }, tier), badge ? h('span', { class: 'wc-badge' }, badge) : null),
    h('div', { class: 'wc-body' }, h('b', { class: 'wc-name' }, w.name), h('small', { class: 'wc-sub' }, `${w.legendary ? 'Legendary · ' : ''}${w.hands === 2 ? 'Two-handed' : 'One-handed'} · d${size}`), faceChips(inst), need, compact && !w.legendary ? null : h('p', { class: `wc-tag ${w.legendary ? 'legend' : ''}` }, inst.diamond ? 'Diamond: no blanks, an icon on every face, and its top number a crit with three. Made for the one fight that matters.' : w.tag), note ? h('p', { class: 'wc-note' }, note) : null),
    actions.length ? h('div', { class: 'wc-actions' }, actions) : null);
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
  const kit = h('section', { class: 'dl-kit' }, h('div', { class: 'dl-hero' }, emblem(run.cls, 'lg'), h('div', {}, h('b', {}, hero.name), h('small', {}, `Level ${hero.level} · hands d${hero.strength.W} · ${D.tierName(hero.loadout.NW)} d${E.weaponSize(hero.loadout.NW)} ${D.WEAPONS[hero.loadout.NW.id].name}`))), charmCard(run.charm, { badge: 'Today' }));
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
      h('div', { class: `ci-weapons n${wset.length}` }, wset.map((id) => weaponCard({ uid: `c-${id}`, id, rarity: 0 }, { compact: true }))),
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
      h('div', { class: 'qc-read' },
        h('div', { class: `qr danger dz-${dz.label.toLowerCase()}` }, h('span', {}, 'Danger'), pips(danger, 5, 'p-danger'), h('small', {}, `${dz.label} for you · ~${dz.rounds} round${dz.rounds > 1 ? 's' : ''}`)),
        h('div', { class: 'qr reward' }, h('span', {}, 'Reward'), pips(reward, 5, 'p-reward'), h('small', {}, `${xp} XP · ${gold}g+`)))),
    h('span', { class: 'qc-go' }, h('span', {}, q.kind === 'boss' ? `Face ${bossCall(q)}` : 'Fight'), ico('chevron')));
}
// Bring a Diamond (Dave, Oct 2026): under the quest card, each Diamond in your case with a Left and a Right button. Tap a hand to bring
// it into this fight in that hand (tap again to keep it in its case). Two can go, one in each hand. It shatters when the fight ends.
function diamondBring(hero) {
  if (!E.diamondsOf(hero).length) return null;
  const box = h('section', { class: 'sx-dbring' });
  const paint = () => {
    const ds = E.diamondsOf(hero); const hands = E.diamondHands(hero); const armed = ds.filter((d) => E.armedSlot(hero, d.uid));
    const two = E.isTwoHanded(hero) ? D.WEAPONS[hero.loadout.NW.id].name : null;
    box.replaceChildren(...[
      h('p', { class: 'db-head' }, ico('gem'), h('b', {}, armed.length ? `Bringing ${armed.length === 2 ? 'two Diamonds' : 'a Diamond'}` : 'Bring a Diamond?'), h('small', {}, 'One fight, then it shatters. Win or lose.')),
      h('div', { class: 'db-list' }, ds.map((d) => { const at = E.armedSlot(hero, d.uid); const w = D.WEAPONS[d.id];
        return h('div', { class: `db-item ${at ? 'on' : ''}` },
          h('div', { class: 'db-top' }, h('b', { class: 'db-name' }, `Diamond ${w.name}`), h('small', {}, `d${d.size}`),
            h('span', { class: 'db-hands' }, hands.map((s) => btn(s === 'NW' ? 'Left' : 'Right', () => { E.armDiamond(hero, d.uid, at === s ? null : s); sfx.select?.(); X.persist(); paint(); },
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
      h('div', { class: `sx-quests n${quests.length}` }, quests.map(questCard)), X.net ? null : diamondBring(hero))));
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
      X.partyBar?.(), storyCard(o.kicker || 'The road answers', res.title, res.text), o.note ? h('p', { class: 'fine center' }, o.note) : null, o.extra || null, h('div', { class: 'sx-cta' }, btn(o.label || 'Onward', o.onward || X.showBoard, { big: true, icon: 'chevron', iconAfter: true, cls: 'wide', disabled: !!o.disabled })))));
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
  const choice = card.answered
    ? h('p', { class: 'env-sealed' }, ico('check'), offer ? (card.accepted ? 'You took the bribe. Keep a straight face.' : 'You said no. Honor, quietly.') : 'Sealed. Keep it to yourself.')
    : h('div', { class: 'env-btns' },
      ...(offer ? [btn('Accept', () => answer(true), { big: true, cls: 'wide' }), btn('Decline', () => answer(false), { big: true, kind: 'ghost', cls: 'wide' })]
        : [btn('Continue', () => answer(true), { big: true, icon: 'chevron', iconAfter: true, cls: 'wide env-one' })]));
  const waiting = card.answered && o.waiting?.length ? h('p', { class: 'fine center' }, `Waiting for ${o.waiting.join(', ')} to read their envelope.`) : null;
  mountAs('road', h('div', { class: 'sx-split sx-road sx-envelope' }, h('div', { class: 'sx-viewport' }, topBar(heroChip(hero))),
    h('div', { class: 'sx-side' }, h('div', { class: 'sx-sidetop' }, btn('Menu', X.menu, { kind: 'ghost', icon: 'menu', cls: 'sx-menubtn' })),
      X.partyBar?.(),
      storyCard(o.questName ? `Before ${o.questName}` : 'Before the battle', String(card.voice || '').replace(/^./, (ch) => ch.toUpperCase()), card.scene, { icon: 'scroll' }),
      h('article', { class: 'env-card' }, h('span', { class: 'env-seal', 'aria-hidden': 'true' }, ico('key')),
        h('div', { class: 'env-eye' }, 'Your secret objective'), h('h2', { class: 'env-name' }, card.name),
        h('p', { class: 'env-flavor' }, card.flavor),
        h('p', { class: 'env-rule' }, card.rule), h('p', { class: 'env-pay' }, ico('coin'), h('span', {}, card.reward))),
      o.solo ? null : h('div', { class: 'env-cover' }, h('small', {}, 'Keep it secret. If anyone asks, say:'), h('b', {}, `“${card.cover}”`)),
      choice, waiting, card.answered ? o.extra || null : null)));
  const place = E.questsFor(hero)[0]?.place;
  lay('road'); if (place) SCR.enter('road', { hero, heroes: X.members(), place, seed: hero.campaign.seed }, `road:${place}:${hero.name}:${hero.cls}`);
}
// The Reveal gets its own beat (the bots' playtest, Oct 2026): straight after the fight, before the brag board, the spoils and the
// perks, one screen with every card turned over, and a Continue. o: { hero, place, won, onDone }.
export function reveal(rv, o = {}) {
  const hero = o.hero || X.S.hero; let done = false;
  const title = o.won === false ? 'The battle is lost, but the envelopes still open' : 'Every envelope, opened';
  mountAs('victory', h('div', { class: 'sx-split sx-victory sx-revealbeat' }, h('div', { class: 'sx-viewport' }),
    h('div', { class: 'sx-side' }, h('div', { class: 'sx-sidetop' }, btn('Menu', X.menu, { kind: 'ghost', icon: 'menu', cls: 'sx-menubtn' })),
      h('header', { class: 'vc-head rv-head' }, eyebrow('The Reveal', 'gold'), h('p', {}, `${title}. ${rv.voice || 'The voice'} reads every card aloud.`), flourish()),
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
      btn(`Sell ${E.sellValue(it)}`, () => { HE.sellItem(hero, it.uid); done(); }, { kind: 'ghost', icon: 'coin', aria: `Sell ${D.WEAPONS[it.id].name} for ${E.sellValue(it)} gold` }))))) : null;
  const loot = Rw.repeat || Rw.picked === 'none' ? null
    : Rw.picked == null
    ? panel('sx-loot', eyebrow(`Choose your spoils · pack ${hero.bag.length}/${D.BAG_MAX}`, 'gold'), packStrip, h('div', { class: 'loot-row' }, Rw.drops.map((inst, i) => weaponCard(inst, { cls: 'pick', actions: [
      btn(full ? 'Pack full' : 'Take', () => { if (!E.takeDrop(hero, inst)) return; Rw.picked = i; Rw.sold = false; done(); }, { kind: 'primary', icon: 'bag', disabled: full }),
      btn(`Sell ${E.sellValue(inst)}`, () => { E.sellDrop(hero, inst); Rw.picked = i; Rw.sold = true; done(); }, { kind: 'ghost', icon: 'coin', cls: 'sell', aria: `Sell it now for ${E.sellValue(inst)} gold` }),
    ] }))))
    : panel('sx-loot done', h('p', { class: 'muted' }, Rw.sold ? `You sold the ${D.tierName(Rw.drops[Rw.picked])} ${D.WEAPONS[Rw.drops[Rw.picked].id].name} for ${E.sellValue(Rw.drops[Rw.picked])} gold. Coins, at least, never argue.` : `You took the ${D.tierName(Rw.drops[Rw.picked])} ${D.WEAPONS[Rw.drops[Rw.picked].id].name}. It waits in your pack, humming a little.`));
  const lootHint = Rw.repeat || Rw.picked != null ? null : (Rw.drops.some((d) => D.WEAPONS[d.id].hands === 2) && Coach.wantHint(hero, 'v_twohand') ? coachBox('v_twohand') : coachBox('v_loot'));
  const gemLine = (txt) => h('p', { class: 'dm-line' }, ico('gem'), txt);
  const diamondPanel = Rw.diamond ? panel('sx-diamond', eyebrow('A Diamond weapon', 'gold'), h('div', { class: 'loot-row one' }, weaponCard(Rw.diamond, { cls: 'pick' })),
    Rw.diamondTaken ? gemLine(`It is in your Diamond case (${E.diamondsOf(hero).length} of ${D.DIAMOND.max}). Bring it from the quest card when a fight matters.`)
      : Rw.diamondSold ? gemLine(`Sold for ${E.diamondSellValue(Rw.diamond)} gold. A sensible choice. The Diamond disagrees, quietly.`)
        : [gemLine(`Your Diamond case is full (${D.DIAMOND.max} of ${D.DIAMOND.max}). Sell this one, or leave it behind and use a Diamond in a fight to make room.`),
          h('div', { class: 'row end' }, btn(`Sell it ${E.diamondSellValue(Rw.diamond)}`, () => { hero.gold += E.diamondSellValue(Rw.diamond); Rw.diamondSold = true; sfx.coin(); X.persist(); X.renderVictory(); }, { kind: 'ghost', icon: 'coin', iconAfter: true }))]) : null;
  // charms in the spoils: take one (a boss offers two to choose from); with three already, swap one out
  const charmPanel = Rw.charms?.length && !Rw.repeat ? panel('sx-charms-loot', eyebrow(Rw.charms.length > 1 ? 'Choose a charm' : 'A charm', 'gold'),
    Rw.charmTaken ? h('p', { class: 'muted' }, `You took the ${D.CHARMS[Rw.charmTaken].name}. It works from your next fight.`)
      : h('div', { class: 'ch-list' }, Rw.charms.map((id) => charmCard(id, { actions: E.charmFull(hero)
        ? E.charmsOf(hero).map((old) => btn(`Swap for ${D.CHARMS[old].name}`, () => { HE.dropCharm(hero, old); if (HE.takeCharm(hero, id)) { Rw.charmTaken = id; sfx.level(); X.persist(); X.renderVictory(); } }, { kind: 'ghost', cls: 'ch-swap' }))
        : [btn('Take', () => { if (HE.takeCharm(hero, id)) { Rw.charmTaken = id; sfx.level(); X.persist(); X.renderVictory(); } }, { icon: 'star' })] }))),
    !Rw.charmTaken && E.charmFull(hero) ? h('p', { class: 'fine' }, `You carry ${D.CHARM_MAX} charms, the most there is. Swap one out, or leave this behind.`) : null) : null;
  const shattered = Rw.shattered?.length ? h('p', { class: 'dm-line shattered' }, ico('gem'), `${Rw.shattered.map((d) => `Your Diamond ${D.WEAPONS[d.id].name}`).join(' and ')} shattered into light.`) : null;
  const ready = !Rw.offer && hero.pendingPerks === 0 && Rw.picked != null;
  const note = Rw.repeat ? h('p', { class: 'sx-repeat' }, SV.repeatNote(Rw.share)) : null;
  mountAs(`victory ${animate ? 'anim' : ''}`, h('div', { class: 'sx-split sx-victory' }, h('div', { class: 'sx-viewport' }),
    h('div', { class: 'sx-side' },
      h('header', { class: 'vc-head' }, eyebrow(Rw.quest.name), h('h1', { class: 'vc-title' }, 'Victory'), h('p', {}, Rw.repeat ? SV.repeatNote(Rw.share) : 'The way is open. Go on, then.'), flourish()),
      note, shattered, rewards, charmPanel, diamondPanel, perks, lootHint, Rw.repeat ? null : loot,
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
        h('p', { class: 'muted' }, 'Everything that makes you stronger is still yours.'),
        h('ul', { class: 'df-keep' }, lines.map(([k, v, ic]) => h('li', {}, ico(ic), h('span', {}, k), h('b', {}, v), ico('check', 'ok'))))),
      h('p', { class: 'df-tip' }, 'Rest at camp, spend your gold on a bigger die, then walk the road again. The hill will wait. Hills always do.'),
      h('div', { class: 'sx-cta' }, btn('Return to camp', () => X.showCamp({ fromBoard: false }), { big: true, icon: 'tent', cls: 'wide' })))));
  lay('defeat'); SCR.defeat(hero, S.quest?.place);
}

// ------------------------------------------------------------------------------------------------ camp
const TABS = [['store', 'Store', 'coin'], ['forge', 'Forge', 'anvil'], ['gear', 'Gear', 'bag'], ['hero', 'Hero', 'hero']];
function dieBadge(size, cls = '') { return h('span', { class: `sx-die d${size} ${cls}` }, ico(`d${size}`, '', 44), h('b', {}, String(size))); }
// ---- the Forge as a shop (Dave, Oct 2026: "you don't even realize how many things you can upgrade"). One compact row per upgrade: an
// icon or die, a name with what it becomes, one short line, and the price: bright when you can afford it, dim with what you still need
// when you cannot, a check when it is maxed. FORGE.tally counts what your gold can buy in each section, for the jump strip and the badge.
const FORGE = { tally: null, sec: null, info: new Set() };
const tallyUp = (n = 1) => { if (FORGE.tally && FORGE.sec) FORGE.tally[FORGE.sec] = (FORGE.tally[FORGE.sec] || 0) + n; };
function priceBtn(label, price, ok, buy, aria) {
  const hero = X.S.hero; if (ok) tallyUp();
  const b = btn(label ? `${label} · ${price}` : String(price), buy, { icon: 'coin', iconAfter: !!label, disabled: !ok, cls: `ur-buy ${!ok ? 'poor' : ''}`, aria });
  if (!ok && hero && hero.gold < price) b.append(h('small', { class: 'need' }, `need ${price - hero.gold}`));
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
    h('div', { class: 'ur-copy' }, h('b', {}, label, u.next ? h('em', { class: 'ur-to' }, ` d${size} → d${u.next}`) : h('em', { class: 'ur-to' }, ` d${size}`)), h('small', {}, line), shrinkBtn(kind, slot, label)),
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
      h('small', {}, `Forge for more icons and a bigger crit; train for bigger numbers${t.why === 'hands' ? ` (needs a d${t.next} hand)` : ''}.`), shrinkBtn('weapon', inst.uid, w.name)),
    h('div', { class: 'ur-btns' }, forge, train));
}
// Camp's status bar (Oct 2026): where you are on the road and your potions, in one slim strip above the tabs.
function campStatus(hero) {
  const c = hero.campaign; const act = X.actOf(hero); const next = E.questsFor(hero)[0];
  const r = E.potionBuyInfo(hero);
  const pips = h('span', { class: 'cs-steps', role: X.net ? null : 'group', 'aria-label': 'Quests of this act: tap one you have reached to play it' }, Array.from({ length: D.QUESTS_PER_ACT }, (_, i) => {
    const n = i + 1; const kind = D.stepKind(act, n); const done = n < c.step; const now = n === c.step; const reach = !done && !now && SV.canStartAt(hero, c.act, n);
    return h('button', { type: 'button', class: `cs-step ${done ? 'done' : ''} ${now ? 'now' : ''} ${reach ? 'reach' : ''} ${kind === 'battle' ? '' : kind}`, disabled: !!X.net, 'aria-label': `Quest ${n}${now ? ', you are here' : ''}`,
      onclick: X.net ? null : tap(() => stepAsk(hero, c.act, n, () => X.renderCamp())) }, kind === 'boss' ? ico('crown') : kind === 'elite' ? ico('skull') : String(n));
  }));
  const vials = h('span', { class: 'sp-vials', 'aria-label': `${r.have} of ${r.max} potions` }, Array.from({ length: r.max }, (_, i) => h('i', { class: i < r.have ? 'full' : '' }, ico('plus'))));
  const buy = r.have >= r.max ? h('span', { class: 'sp-full' }, 'Full')
    : btn(`${r.price}`, () => { if (HE.buyPotion(hero)) { sfx.coin(); X.persist(); X.renderCamp(); } else { sfx.error(); toast('Not enough gold.'); } }, { icon: 'coin', disabled: !r.ok, cls: `sp-buy ${!r.ok ? 'poor' : ''}`, aria: `Buy a healing potion (heals ${E.potionHpOf(hero)}) for ${r.price} gold` });
  return h('section', { class: `sx-cstat ${r.have === 0 ? 'empty' : ''}`, 'aria-label': 'Where you are, and your potions' },
    h('div', { class: 'cs-where' }, h('b', {}, `Act ${romans[c.act - 1] || c.act} · ${act.name}`), h('small', {}, `Quest ${c.step} of ${D.QUESTS_PER_ACT}${next?.place ? ` · next: ${next.kind === 'boss' ? next.name : next.place}` : ''}`), pips),
    h('div', { class: 'cs-pots' }, h('small', {}, 'Potions'), vials, buy));
}
// Potion belt: carry a third healing potion.
function potionRow(hero) {
  const u = E.potionUpgrade(hero); const cur = E.potionMaxOf(hero); const locked = u.why?.startsWith('Level');
  return h('div', { class: 'sx-urow cmp' }, rowIco('plus'),
    h('div', { class: 'ur-copy' }, h('b', {}, 'Potion belt', h('em', { class: 'ur-to' }, u.next ? ` ${cur} → ${u.next}` : ` ${cur}`)), h('small', {}, `Carry one more healing potion (each heals ${E.potionHpOf(hero)}).`)),
    !u.next ? maxTag() : locked ? gateTag(u.why) : priceBtn('', u.cost, u.ok, () => { if (HE.upgradePotions(hero)) bought(); }, `Carry ${u.next} potions for ${u.cost} gold`));
}
// The 4th reroll die: every reroll may take one more die, for good.
function rerollDieRow(hero) {
  const u = E.rerollDieInfo(hero);
  return h('div', { class: 'sx-urow cmp' }, rowIco('reroll'),
    h('div', { class: 'ur-copy' }, h('b', {}, 'Rerolls', h('em', { class: 'ur-to' }, u.next ? ` ${u.cur} → ${u.next} dice` : ` ${u.cur} dice`)), h('small', {}, 'Each reroll in battle can take one more die.')),
    u.next ? priceBtn('', u.cost, u.ok, () => { if (HE.buyRerollDie(hero)) bought(); }, `Reroll ${u.next} dice for ${u.cost} gold`) : maxTag());
}
// ---- dice you do not have yet, and the talent dice (bottom corners): grow them and choose which symbols sit on which faces
const SYM_ICO = { atk: ['burst', 'c-atk'], block: ['shield', 'c-block'], pierce: ['pierce', 'c-pierce'], magic: ['spark', 'c-magic'], heal: ['plus', 'c-heal'], gold: ['coin', 'c-gold'] };
const symChip = (k, cls = '') => h('span', { class: `fx ${SYM_ICO[k][1]} ${cls}` }, ico(SYM_ICO[k][0]));
const DIE_NAME = { SW: 'Left talent die', SE: 'Right talent die', NE: 'Right weapon die' };
const TAL = { slot: null, face: null };
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
    picker, shrinkBtn('special', slot, `the ${DIE_NAME[slot]}`));
}
// ---- pets (Dave, Oct 2026): the Camp Store sells one a camp. Train it like a talent die and grow it d4 -> d6 -> d8.
const PET = { face: null };
const petPic = (type, size = 84) => h('span', { class: 'pet-pic', 'aria-hidden': 'true', style: { '--pc': D.PETS[type]?.color } }, h('img', { src: petImg(type), alt: '', style: { height: `${size}px` } }));
const petSyms = (hero) => [...new Set([...Object.keys(D.TALENT_SYMS), D.PETS[hero.pet.type].kind])]; // the pet's own symbol may be one talents lack (Bristle's pierce)
const petLeft = (hero, k) => (k === D.PETS[hero.pet.type].kind ? D.petKindMax(hero.pet.size) : D.TALENT_MAX_SAME) - hero.pet.faces.flat().filter((x) => x === k).length;
function petOfferCard(hero) {
  const o = E.petOffer(hero); if (!o) return null; const p = D.PETS[o.type];
  const swap = hero.pet && !o.owned;
  const adopt = () => { if (HE.buyPet(hero)) { PET.face = null; sfx.level(); X.persist(); X.renderCamp(); toast(`${p.name} joins you! Train your pet in the Forge tab. Try not to get too attached. You will.`); } else { sfx.error(); toast('Not enough gold.'); } };
  const ask = () => {
    if (!swap) return adopt();
    const old = D.PETS[hero.pet.type].name;
    const close = modal(h('div', { class: 'form confirm-home' }, h('h2', {}, `Trade ${old} for ${p.name}?`),
      h('p', { class: 'muted' }, `${old} goes home to a warm hearth, and its training goes too. ${p.name} starts fresh as a d4. No hard feelings. Many feelings, none of them hard.`),
      h('div', { class: 'row end' }, btn(`Keep ${old}`, () => close(), { kind: 'ghost' }), btn(`Adopt ${p.name}`, () => { close(); adopt(); }))));
  };
  const chip = (k) => (k ? symChip(k) : h('span', { class: 'fx blank' }, '·'));
  return h('div', { class: 'pet-offer', style: { '--pc': p.color } }, petPic(o.type, 96),
    h('div', { class: 'po-copy' }, h('small', { class: 'po-kicker' }, 'A pet for the road. It will judge you kindly.'), h('b', {}, p.name), h('small', {}, p.text),
      h('div', { class: 'po-faces', 'aria-label': 'Its d4: one blank face, two symbols, one face to train' }, chip(null), chip(p.kind), chip(p.kind), h('span', { class: 'fx open' }, '+'))),
    o.owned ? h('span', { class: 'sold-tag' }, 'With you')
      : btn(`${swap ? 'Trade' : 'Adopt'} · ${o.price}`, ask, { icon: 'coin', iconAfter: true, disabled: hero.gold < o.price, cls: 'buy', aria: `Adopt ${p.name} for ${o.price} gold` }));
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
    shrinkBtn('pet', null, p.name),
    g.next ? priceBtn(`Grow to d${g.next}`, g.cost, g.ok, () => { if (HE.growPet(hero)) bought(); }, `Grow ${p.name} to a d${g.next} for ${g.cost} gold`) : maxTag('Full grown'));
}
function petSection(hero) {
  if (hero.pet) return [petCard(hero)];
  const o = E.petOffer(hero); if (!o) return [];
  if (hero.gold >= o.price) tallyUp();
  return [h('div', { class: 'sx-urow cmp pet-hint', style: { '--pc': D.PETS[o.type].color } }, petPic(o.type, 44),
    h('div', { class: 'ur-copy' }, h('b', {}, `${D.PETS[o.type].name}, a pet`, h('em', { class: 'ur-to' }, ` ${o.price} gold`)), h('small', {}, 'The Camp Store has one today. A pet rolls one more die beside your board.')),
    btn('See it', () => { X.S.tab = 'gear'; X.renderCamp(); }, { kind: 'ghost', cls: 'ur-buy' }))];
}
// Powers: what each does, how it is used, and a gold upgrade (more dice and bigger numbers).
// Magical powers at camp: three slots (A big move, B every round, C charge). The equipped power can be upgraded; the other
// powers of the class library are learned here for gold, then swapped into their slot like a weapon into a hand.
function powersSection(hero) {
  const lib = E.powerLibrary(hero);
  return D.POWER_SLOTS.map((slot) => {
    const rows = lib.filter((x) => x.card.slot === slot);
    const eq = rows.find((x) => x.equipped); const others = rows.filter((x) => !x.equipped);
    return h('section', { class: `sx-pslot cmp s-${slot}` },
      h('header', { class: 'ps-head' }, h('b', { class: 'ps-letter' }, slot), h('span', {}, D.SLOT_NAME[slot]), h('small', {}, slot === 'A' ? 'strong, once a battle' : slot === 'B' ? 'small, every round' : 'store a charge each round')),
      eq ? powerRow(hero, eq.card) : null,
      ...others.map(({ card: k, learned, gate }) => {
        const li = E.learnInfo(hero, k.id);
        const action = learned ? btn('Swap in', () => { if (HE.equipPower(hero, k.id)) { sfx.select(); X.persist(); X.renderCamp(); } }, { kind: 'ghost', cls: 'ur-buy', aria: `Put ${k.name} in slot ${slot}` })
          : gate ? gateTag(`Level ${gate}`)
            : priceBtn('Learn', li.cost, li.ok, () => { if (HE.learnPower(hero, k.id)) bought(); }, `Learn ${k.name} for ${li.cost} gold`);
        return h('div', { class: 'sx-urow cmp ps-alt' }, h('div', { class: 'ur-copy' }, h('b', {}, k.name, learned ? h('em', { class: 'ps-tag' }, 'Learned') : null), h('small', { class: 'clamp' }, k.text)), action);
      }));
  });
}
function powerRow(hero, k) {
  const u = E.powerUpgradeInfo(hero, k.id); const lvl = E.powerLevel(hero, k.id);
  return h('div', { class: 'sx-urow cmp ps-eq' },
    h('div', { class: 'ur-copy' }, h('b', {}, k.name, lvl ? h('em', { class: 'ur-to' }, ` ${'★'.repeat(lvl)}`) : null), h('small', {}, `Now: ${shortLine(k, lvl)} · ${k.cost}${k.kind === 'scale' ? '–' + k.max : ''} magic`),
      u.next ? h('small', { class: 'ur-next' }, `Level ${u.next}: ${shortLine(k, u.next)}`) : null),
    u.next ? priceBtn(`Level ${u.next}`, u.cost, u.ok, () => { if (HE.upgradePower(hero, k.id)) bought(); }, `Upgrade ${k.name} for ${u.cost} gold`) : maxTag());
}
const weaponRowFor = (inst, label) => weaponRow(inst, label);
// The Forge: a strip at the top says how many things your gold can buy in each section and jumps there; then the sections, most-used
// first. Each section's longer explanation sits behind a small "?".
const FORGE_INTRO = {
  body: 'Your hands are strength, your head is wisdom, your feet are speed: the road tests all three. Bigger hand dice also hit harder. A die can only grow as far as the act allows. Patience, then punch.',
  weapons: 'Forging raises a weapon’s metal: Silver and Gold put more icons on its faces and a crit of two, then three, on its top number. A small burst (or shield) on a face is +1 attack (or block): a 3 with one hits for 4 but still counts as a 3 for triples and straights. Training grows its die to bigger numbers, but never past the hand that holds it. Hands first. Then the steel.',
  powers: 'Three slots: A is your big move, B works every round, C stores a charge each round to let go when you choose. Learn another power for a slot and swap it in. Upgrades add dice and numbers. Pack the one you will actually use.',
  talents: 'Each number face pays its own number in the symbol you buy for it: a 6 with magic is 6 magic. Pay once per face (a bigger number costs more), no pierce, and no more than two of one symbol on a die. Face 2 doubles your hand. A bigger die brings new empty faces. Homework, with sparkles.',
  pet: 'Your pet rolls its own die beside the board. One face is always blank; put symbols on the rest. Grow the die and every symbol pays more. They will pretend they earned it.',
};
const FORGE_NAME = { body: 'Body dice', weapons: 'Weapons', powers: 'Powers', talents: 'Talent dice', pet: 'Pet' };
const FORGE_ICON = { body: 'dice', weapons: 'sword', powers: 'spark', talents: 'star', pet: 'heart' };
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
function forgeTab() {
  const hero = X.S.hero; FORGE.tally = {};
  E.ensureTwin(hero);
  const wdef = D.WEAPONS[hero.loadout.NW.id];
  // a two-hander lists each hand on its own (the bow, then its arrows) so either die can be forged or trained
  const weaponRows = () => (E.isTwoHanded(hero)
    ? [weaponRowFor(hero.loadout.NW, wdef.twinName ? wdef.name : `${wdef.name} · left`), weaponRowFor(hero.loadout.NE, wdef.twinName || `${wdef.name} · right`)]
    : [...new Map(['NW', 'NE'].map((k) => hero.loadout[k]).filter((i) => i && i.id !== 'fists').map((i) => [i.uid, i])).values()].map((i) => weaponRowFor(i, '')));
  const secs = [
    forgeSection('body', () => [...unlockRows(hero, ['NE']),
      upgradeRow('strength', 'W', 'Left hand', 'Its numbers add to your left weapon.'), upgradeRow('strength', 'E', 'Right hand', 'Its numbers add to your right weapon.'),
      upgradeRow('mind', 'N', 'Head', 'Wiser on the road’s tests, bigger numbers in battle.'), upgradeRow('speed', 'S', 'Feet', 'Strike before the monsters more often.'),
      rerollDieRow(hero), potionRow(hero)]),
    forgeSection('weapons', weaponRows),
    forgeSection('powers', () => powersSection(hero)),
    forgeSection('talents', () => [...['SW', 'SE'].filter((k) => E.isActive(hero, k)).map((k) => talentCard(hero, k)), ...unlockRows(hero, ['SW', 'SE'])]),
    forgeSection('pet', () => petSection(hero)),
  ];
  FORGE.sec = null;
  const ids = ['body', 'weapons', 'powers', 'talents', 'pet'].filter((id) => secs.some((x) => x?.id === `fs-${id}`));
  const hasTalent = ['SW', 'SE'].some((k) => E.isActive(hero, k));
  return h('div', { class: 'sx-tab forge' }, forgeNav(hero, ids), hasTalent ? coachBox('c_talent') : null, ...secs);
}
const zone = (cls, icon, title, sub, ...kids) => h('section', { class: `sx-zone ${cls}`, id: `fs-${cls}` },
  h('header', { class: 'zn-head' }, h('span', { class: 'zn-tag' }, ico(icon), h('b', {}, title))), sub ? h('p', { class: 'zn-sub' }, sub) : null, ...kids);
// ---- the Camp Store (Dave, Oct 2026): always at camp, never on the road. Today's specials (one fight's help, for you), a mystery
// bundle, the weapons on the shelf (new every camp), supplies, a pet and now and then a charm, and the dearest thing on the shelf
// up top with how close your purse is, so there is something to save up for.
const TONIC_ICO = { pierce: 'pierce', boot: 'boot', block: 'shield', atk: 'burst', magic: 'spark', heal: 'heart' };
function storeCanBuy(hero) {
  const stock = E.shopStock(hero);
  return stock.filter((it) => !it.sold && hero.gold >= it.price && (it.inst.diamond ? !E.diamondCaseFull(hero) : !E.bagFull(hero))).length
    + E.storeTonics(hero).filter((t) => !t.bought && hero.gold >= t.price).length;
}
function storeTab() {
  const hero = X.S.hero; const stock = E.shopStock(hero); const ok = () => { sfx.coin(); X.persist(); X.renderCamp(); };
  const buyWeapon = (it, i) => { const full = it.inst.diamond ? E.diamondCaseFull(hero) : E.bagFull(hero);
    return it.sold ? h('span', { class: 'sold-tag' }, 'Sold') : btn(full ? (it.inst.diamond ? 'Case full' : 'Pack full') : String(it.price), () => { if (HE.buyItem(hero, i)) ok(); else { sfx.error(); toast(full ? (it.inst.diamond ? 'Your Diamond case is full. Use one in a fight first.' : 'Your pack is full. Sell something first.') : 'Not enough gold.'); } }, { icon: 'coin', disabled: hero.gold < it.price || full, cls: 'buy', aria: `Buy for ${it.price} gold` }); };
  // worth saving for: the dearest thing still on the shelf
  const best = stock.map((it, i) => ({ it, i })).filter(({ it }) => !it.sold).sort((a, b) => b.it.price - a.it.price)[0];
  const save = best ? zone('zn-save', 'crown', 'Worth saving for', best.it.price > hero.gold ? `You have ${hero.gold} of ${best.it.price} gold. Win a few fights and it could be yours, if nobody else buys it first.` : 'You can afford it right now.',
    h('div', { class: 'st-save' }, weaponCard(best.it.inst, { compact: true, badge: best.it.inst.diamond ? 'Diamond' : 'Special', actions: [buyWeapon(best.it, best.i)] }),
      h('div', { class: 'st-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(best.it.price), 'aria-valuenow': String(Math.min(hero.gold, best.it.price)) }, h('i', { style: { width: `${Math.min(100, (hero.gold / best.it.price) * 100)}%` } })))) : null;
  const tonics = E.storeTonics(hero).map((t) => h('div', { class: `sx-urow cmp st-tonic ${t.bought ? 'have' : ''}` }, rowIco(TONIC_ICO[t.icon] || 'star'),
    h('div', { class: 'ur-copy' }, h('b', {}, t.name), h('small', {}, t.text)),
    t.bought ? maxTag('Yours') : priceBtn('', t.price, hero.gold >= t.price, () => { if (HE.buyTonic(hero, t.id)) { sfx.level(); X.persist(); X.renderCamp(); toast(`${t.name}: ready for your next fight.`); } }, `Buy ${t.name} for ${t.price} gold`)));
  const bo = E.bundleOffer(hero);
  const bundle = bo ? h('div', { class: `sx-urow cmp st-bundle ${bo.bought ? 'have' : ''}` }, rowIco('bag'),
    h('div', { class: 'ur-copy' }, h('b', {}, 'Mystery bundle'), h('small', {}, `A weapon wrapped in a tablecloth. ${Math.round(bo.odds[0] * 100)}% Bronze, ${Math.round(bo.odds[1] * 100)}% Silver, ${Math.round(bo.odds[2] * 100)}% Gold. The shopkeeper does not know either.`)),
    bo.bought ? maxTag('Opened') : E.bagFull(hero) ? gateTag('Pack full') : priceBtn('', bo.price, hero.gold >= bo.price, () => { const inst = HE.buyBundle(hero); if (inst) { sfx.level(); X.persist(); X.renderCamp(); toast(`Inside: a ${D.RARITY[inst.rarity | 0]} ${D.WEAPONS[inst.id].name}. It is in your pack.`); } }, `Buy the mystery bundle for ${bo.price} gold`)) : null;
  const sc = X.net ? null : E.shopCharm(hero);
  const charmOffer = sc ? charmCard(sc.id, { cls: sc.sold ? 'sold' : '', badge: 'Charm', actions: [sc.sold ? h('span', { class: 'sold-tag' }, 'Sold') : btn(E.charmFull(hero) ? 'Charms full' : String(sc.price), () => { if (HE.buyCharm(hero)) { sfx.level(); X.persist(); X.renderCamp(); } else { sfx.error(); toast(E.charmFull(hero) ? `You carry ${D.CHARM_MAX} charms. Drop one first.` : 'Not enough gold.'); } }, { icon: 'coin', disabled: hero.gold < sc.price || E.charmFull(hero), cls: 'buy', aria: `Buy the ${D.CHARMS[sc.id].name} for ${sc.price} gold` })] }) : null;
  const shelf = stock.map((it, i) => ({ it, i })).filter(({ i }) => i !== best?.i);
  return h('div', { class: 'sx-tab store' },
    h('p', { class: 'st-hello' }, coin(hero.gold, 'inline'), h('span', {}, 'in your purse. New stock every camp; today’s specials last one fight and are yours alone.')),
    save,
    zone('zn-specials', 'star', 'Today’s specials', 'One fight of help. Bought today, used in your next fight, gone after.', h('div', { class: 'st-rows' }, tonics, bundle)),
    zone('zn-shelf', 'sword', 'On the shelf', 'Weapons. What you buy goes in your pack.', h('div', { class: 'wc-grid' }, shelf.map(({ it, i }) => weaponCard(it.inst, { compact: true, cls: it.sold ? 'sold' : '', actions: [buyWeapon(it, i)] })))),
    charmOffer || E.petOffer(hero) ? zone('zn-odd', 'gem', 'Odds and ends', '', charmOffer, petOfferCard(hero)) : null);
}
function gearTab() {
  const hero = X.S.hero; const two = E.isTwoHanded(hero);
  const sync = () => { sfx.card(); X.persist(); X.renderCamp(); };
  const wear = (inst, side) => { const c = E.canEquip(hero, inst.uid, side); if (!c.ok) { sfx.error(); toast(c.why); return; } HE.equip(hero, inst.uid, side); sync(); };
  const worn = two ? [weaponCard(hero.loadout.NW, { note: 'Both hands', cls: 'worn', badge: 'Equipped' })] : [weaponCard(hero.loadout.NW, { note: 'Left hand', cls: 'worn', badge: 'Left' }), weaponCard(hero.loadout.NE, { note: 'Right hand', cls: 'worn', badge: 'Right' })];
  const bag = hero.bag.map((inst) => {
    const w = D.WEAPONS[inst.id];
    const acts = w.hands === 2 ? [btn('Equip', () => wear(inst, 'NW'), { kind: 'ghost' })]
      : [btn('Left', () => wear(inst, 'NW'), { kind: 'ghost', aria: `Equip ${w.name} in left hand` }), btn('Right', () => wear(inst, 'NE'), { kind: 'ghost', aria: `Equip ${w.name} in right hand` })];
    acts.push(btn(`Sell ${E.sellValue(inst)}`, () => { HE.sellItem(hero, inst.uid); sfx.coin(); X.persist(); X.renderCamp(); }, { kind: 'ghost', icon: 'coin', iconAfter: true, cls: 'sell', aria: `Sell ${w.name} for ${E.sellValue(inst)} gold` }));
    return weaponCard(inst, { actions: acts, compact: true });
  });
  // the places a weapon can be, each its own panel with its heading centered on the top edge
  const chips = jumpChips([{ id: 'zn-body', label: 'On your body', icon: 'hero' }, { id: 'zn-pack', label: `Pack ${bag.length}/${D.BAG_MAX}`, icon: 'bag' },
    E.charmsOf(hero).length ? { id: 'zn-charms', label: 'Charms', icon: 'star', n: E.charmsOf(hero).length } : null,
    E.diamondsOf(hero).length ? { id: 'zn-diamonds', label: 'Diamonds', icon: 'gem', n: E.diamondsOf(hero).length } : null]);
  return h('div', { class: 'sx-tab gear' },
    chips, coachBox('g_gear'),
    zone('zn-body', 'hero', 'On your body', 'Equipped. These are the weapon dice you roll. They go where you go.', h('div', { class: `wc-grid worn n${worn.length}` }, worn),
      h('p', { class: 'fine' }, 'Red faces attack, blue faces defend. Three alike across a row (Weapons, Strength, Talent Triple): +10 attack. Three alike down a column (Head to Toe, Left or Right Guard Triple): +10 block. Triples pay 15 in Act II and 20 in Act III.')),
    zone('zn-pack', 'bag', `Your pack · ${bag.length} of ${D.BAG_MAX}`, 'Spares you carry. Put one in a hand, or sell it.', bag.length ? h('div', { class: 'wc-grid' }, bag) : h('p', { class: 'muted empty' }, 'Nothing yet. Monsters drop weapons, eventually, if you ask firmly.')),
    E.charmsOf(hero).length ? zone('zn-charms', 'star', `Charms · ${E.charmsOf(hero).length} of ${D.CHARM_MAX}`, 'Each bends one rule of the dice, in every fight. Found in the spoils of big fights, and now and then in the Camp Store.',
      h('div', { class: 'ch-list' }, E.charmsOf(hero).map((id) => charmCard(id, { actions: [dropBtn(hero, id)] })))) : null,
    E.diamondsOf(hero).length ? zone('zn-diamonds', 'gem', `Diamond case · ${E.diamondsOf(hero).length} of ${D.DIAMOND.max}`, 'Rare weapons for one fight each. Tap Left or Right to carry one into your next fight in that hand (two can go, one in each hand); tap it again to keep it in the case. When that fight ends, it shatters.',
      h('div', { class: 'wc-grid' }, E.diamondsOf(hero).map((d) => { const at = E.armedSlot(hero, d.uid); const w = D.WEAPONS[d.id];
        // Left / Right here at camp works at a table too (Dave, Oct 2026: the quest board's Bring strip is solo only)
        const hand = (s) => btn(s === 'NW' ? 'Left' : 'Right', () => { HE.armDiamond(hero, d.uid, at === s ? null : s); sfx.select?.(); X.persist(); X.renderCamp(); },
          { kind: at === s ? 'primary' : 'ghost', cls: 'db-hand', aria: `${at === s ? 'Keep' : 'Bring'} the Diamond ${w.name}${at === s ? ' in its case' : ` in your ${s === 'NW' ? 'left' : 'right'} hand next fight`}` });
        return weaponCard(d, { compact: true, badge: at ? `${at === 'NW' ? 'Left' : 'Right'} hand` : '',
          actions: [h('span', { class: 'db-hands' }, E.diamondHands(hero).map(hand)),
            btn(`Sell ${E.diamondSellValue(d)}`, () => { if (HE.sellDiamond(hero, d.uid)) { sfx.coin(); X.persist(); X.renderCamp(); } }, { kind: 'ghost', icon: 'coin', iconAfter: true, cls: 'sell', aria: `Sell the Diamond ${w.name} for ${E.diamondSellValue(d)} gold` })] }); }))) : null);
}
// The hero's lifetime score: every battle's points add up here, with party trophies.
function hallOfFame(hero) {
  const r = hero.record || { battles: 0, points: 0, best: 0, firsts: 0, seconds: 0 };
  const cell = (label, v, cls = '') => h('div', { class: `hf-cell ${cls}` }, h('b', {}, String(v)), h('small', {}, label));
  return h('section', { class: 'sx-hof' }, eyebrow('Hall of fame', 'gold'),
    h('div', { class: 'hf-row' }, cell('Total points', r.points.toLocaleString(), 'big'), cell('Battles', r.battles), cell('Best battle', r.best)),
    r.firsts || r.seconds ? h('div', { class: 'hf-row two' }, cell('1st place', r.firsts, 'gold'), cell('2nd place', r.seconds, 'silver')) : h('p', { class: 'fine' }, 'Trophies for 1st and 2nd place are won in party games.'));
}
function heroTab() {
  const hero = X.S.hero; const c = D.CLASSES[hero.cls]; const pc = {}; hero.perks.forEach((p) => { pc[p] = (pc[p] || 0) + 1; });
  const log = (X.S.company?.campaign || hero.campaign)?.chronicle || [];
  const need = D.xpToNext(hero.level);
  const anchor = (id) => h('span', { class: 'fx-anchor', id: `fs-${id}` });
  return h('div', { class: 'sx-tab herotab' },
    jumpChips([{ id: 'h-stats', label: 'Stats', icon: 'hero' }, { id: 'h-diff', label: 'Difficulty', icon: 'skull' }, { id: 'h-perks', label: 'Perks', icon: 'star', n: hero.pendingPerks || 0, note: 'to choose' }, { id: 'h-powers', label: 'Powers', icon: 'spark' }]),
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
export function camp(fromBoard) {
  const S = X.S; const hero = S.hero;
  const body = S.tab === 'gear' ? gearTab() : S.tab === 'hero' ? heroTab() : S.tab === 'store' ? storeTab() : forgeTab();
  const perkHero = X.net ? (hero.pendingPerks > 0 ? hero : null) : (S.company?.members || [hero]).find((m) => m.pendingPerks > 0);
  if (X.net) { S.perkOffer = perkHero ? X.netPerkOffer() : null; }
  else { if (perkHero && (!S.perkOffer || S.perkFor !== perkHero.name)) { S.perkOffer = E.offerPerks(perkHero, X.fresh()); S.perkFor = perkHero.name; } if (!perkHero) { S.perkOffer = null; S.perkFor = null; } }
  const perkPanel = perkHero && S.perkOffer ? panel('sx-perks glow', eyebrow(`${perkHero.name} still owes a perk`, 'gold'), h('div', { class: 'perk-row' }, S.perkOffer.map((id, i) => perkCard(id, perkHero, () => { if (X.net) { sfx.level(); X.netPerk(id); return; } E.takePerk(perkHero, id); S.perkOffer = null; sfx.level(); X.persist(); X.renderCamp(fromBoard); }, i)))) : null;
  const seats = !X.net && (S.company?.members.length || 0) > 1 ? h('div', { class: 'sx-seats' }, S.company.members.map((m, i) => h('button', { type: 'button', class: S.seat === i ? 'on' : '', onclick: tap(() => { S.seat = i; S.hero = m; sfx.select(); X.renderCamp(fromBoard); }) }, emblem(m.cls), h('span', {}, h('b', {}, m.name), h('small', {}, `Lv ${m.level} · ${m.gold}g`))))) : null;
  // badges: Store and Forge count what your gold can buy, Hero a perk you still owe
  if (S.tab !== 'forge') { const keepSec = FORGE.sec; forgeTab(); FORGE.sec = keepSec; }
  const forgeN = Object.values(FORGE.tally || {}).reduce((a, n) => a + n, 0);
  const storeN = storeCanBuy(hero);
  const badge = { store: storeN ? String(storeN) : '', forge: forgeN ? String(forgeN) : '', gear: '', hero: hero.pendingPerks > 0 ? '!' : '' };
  const tabs = h('div', { class: 'sx-tabs', role: 'tablist' }, TABS.map(([id, label, ic]) => h('button', { class: S.tab === id ? 'on' : '', type: 'button', role: 'tab', 'aria-selected': String(S.tab === id), 'aria-label': `${label}${badge[id] ? ` (${badge[id] === '!' ? 'a perk to choose' : `${badge[id]} to buy`})` : ''}`,
    onclick: tap((e) => { if (S.tab === id) { const side = e.currentTarget.closest('.sx-side'); const t = side?.querySelector('.sx-camp-scroll'); if (side && t) side.scrollTo({ top: side.scrollTop + t.getBoundingClientRect().top - side.getBoundingClientRect().top - ((side.querySelector('.sx-sidetop')?.offsetHeight || 0) + (side.querySelector('.sx-tabs')?.offsetHeight || 0) + 10), behavior: reduced() ? 'auto' : 'smooth' }); return; } S.tab = id; X.renderCamp(fromBoard); }) },
    ico(ic), h('span', {}, label), badge[id] ? h('b', { class: `tab-badge ${badge[id] === '!' ? 'alert' : ''}` }, badge[id]) : null)));
  const keep = $('.sx-camp-scroll'); const y = keep && S.holdScroll !== false ? keep.scrollTop : 0;
  // the Camp Store button sits beside your purse (Dave: not over the fire): one tap opens its tab, with a count of what you can afford
  const storeBtn = h('button', { type: 'button', class: 'sx-storebtn', 'aria-label': `Camp Store${storeN ? `: ${storeN} you can afford` : ''}`, onclick: tap(() => { S.tab = 'store'; X.renderCamp(fromBoard); const side = $('.sx-side'); const t = side?.querySelector('.sx-tabs'); if (side && t) side.scrollTo({ top: Math.max(0, t.offsetTop - 8), behavior: reduced() ? 'auto' : 'smooth' }); }) },
    ico('coin'), h('span', {}, 'Camp Store'), storeN ? h('b', {}, `${storeN} to buy`) : null, ico('chevron'));
  mountAs('camp', h('div', { class: 'sx-split sx-camp' }, h('div', { class: 'sx-viewport' }, topBar(h('div', { class: 'sx-camp-title' }, eyebrow('The fire is warm, and so is the stew, mostly'), h('h1', {}, 'Camp')))),
    h('div', { class: 'sx-side' },
      h('div', { class: 'sx-sidetop' }, heroChip(hero), X.net ? null : btn('Soul Code', () => { const c = X.currentCode(); if (c) X.copyCode(c); }, { kind: 'ghost', icon: 'key', cls: 'compact' })),
      S.tab === 'store' ? null : storeBtn, tabs, X.partyBar?.(), seats, perkPanel, campStatus(hero), (hero.tips?.c_first || !Coach.hintsOn() ? coachBox('c_hands') : coachBox('c_first')),
      h('div', { class: 'sx-camp-scroll' }, body),
      h('div', { class: 'sx-cta' }, X.net ? X.campCta(btn) : btn('To the road', X.showRoadOrBoard, { big: true, icon: 'map', cls: 'wide' })))));
  const sc = $('.sx-camp-scroll'); if (sc && y) sc.scrollTop = y;
  { const side = $('.sx-side'); const st = side?.querySelector('.sx-sidetop'); if (side && st) side.style.setProperty('--stick', `${st.offsetHeight}px`); } // the tabs pin just under the hero chip
  lay('camp');
  SCR.enter('camp', { hero, heroes: X.members() }, `camp:${hero.name}`).then((hd) => { if (hd) { hd.sync?.(hero); } });
  SCR.current()?.sync?.(hero);
}

// ------------------------------------------------------------------------------------------------ plumbing
// Phones: the page is one tall scroll (the 3D picture is the first screenful and scrolls away with everything else).
function mountAs(cls, ...nodes) {
  const app = $('#app'); const prev = $('.sx-side, .sx-board-main'); const kind = cls.trim().split(/\s+/)[0];
  const same = prev && app?.classList.contains('sx-screen') && app.classList.contains(kind); const y = same ? prev.scrollTop : 0;
  X.mountAs(`sx-screen ${cls}`, ...nodes);
  const side = $('.sx-side, .sx-board-main'); if (!side) return;
  side.addEventListener('scroll', () => SCR.scrolled?.(side.scrollTop), { passive: true });
  side.scrollTop = y; SCR.scrolled?.(y);
}
export function chrome(mute) { const m = $('#mute'); if (m) m.replaceChildren(ico(mute ? 'mute' : 'sound', '', 18)); const hlp = $('#help'); if (hlp && !hlp.querySelector('svg')) hlp.replaceChildren(ico('help', '', 20)); const hm = $('#home'); if (hm && !hm.querySelector('svg')) hm.replaceChildren(ico('home', '', 20)); const gm = $('#gmenu'); if (gm && !gm.querySelector('svg')) gm.replaceChildren(ico('menu', '', 20)); }

// The building blocks, for the screens of the shared table (g3/online.js).
export const kit = { coin, btn, panel, eyebrow, flourish, plaque, ico, emblem, heroChip, topBar, mountAs, lay, tap, coachBox, tipBox, storyCard, perkCard, weaponCard, charmCard, questCard, trail, CLS_HUE, romans, clsName };
