// DOM for the non-battle screens when the 3D world is available: title, hero creation, quest board,
// road events, victory / defeat and camp. Glassy panels over the live scene from screens.js.
// Every game behaviour (saves, passwords, perks, shop, equip, upgrades) is delegated back to ui.js through
// the context handed to bind(); this file only decides what things look like.
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
  const map = { atk: ['burst', 'c-atk'], pierce: ['pierce', 'c-pierce'], block: ['shield', 'c-block'], heal: ['plus', 'c-heal'], magic: ['spark', 'c-magic'], stagger: ['stagger', 'c-gold'], loot: ['coin', 'c-gold'], gold: ['coin', 'c-gold'], weaken: ['skull', 'c-dim'], free: ['reroll', 'c-block'] };
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
function emblem(cls, size = '') { return h('span', { class: `sx-emblem ${size}`, style: { '--hue': CLS_HUE[cls] || '#ffd23d' } }, ico(CLASS_ICON[cls] || 'sword')); }
function nextOf(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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
  return h('div', { class: 'sx-chip' }, emblem(hero.cls),
    h('div', { class: 'ch-copy' }, h('b', {}, hero.name), h('small', {}, `Level ${hero.level} ${clsName(hero.cls)}`),
      xp ? h('span', { class: 'ch-xp', title: maxed ? 'Max level' : `${hero.xp}/${need} XP` }, h('i', { style: { width: `${maxed ? 100 : Math.min(100, (hero.xp / need) * 100)}%` } })) : null),
    coin(hero.gold));
}

// First-run coach tip, remembered in the save like the classic one.
function tipBox(key, text) {
  const hero = X.S.hero; if (!hero || !Coach.wantHint(hero, key)) return null;
  return h('div', { class: 'sx-tip' }, ico('shine'), h('p', {}, text), h('button', { class: 'sx-btn sx-link', type: 'button', onclick: (e) => { Coach.seeHint(hero, key); X.persist(); e.currentTarget.closest('.sx-tip').remove(); } }, 'Got it'),
    h('button', { class: 'sx-btn sx-link', type: 'button', onclick: (e) => { Coach.setHints(false); e.currentTarget.closest('.sx-tip').remove(); } }, 'Hints off'));
}
// A named hint from coach.js (title + text).
function coachBox(key) { const H = Coach.HINTS[key]; if (!H) return null; return tipBox(key, `${H.title}. ${H.text}`); }

// ------------------------------------------------------------------------------------------------ logo
function dieFace(v, slot) {
  const spots = { 1: [[5, 5]], 2: [[3, 3], [7, 7]], 3: [[3, 3], [5, 5], [7, 7]], 4: [[3, 3], [7, 3], [3, 7], [7, 7]], 5: [[3, 3], [7, 3], [5, 5], [3, 7], [7, 7]], 6: [[3, 3], [7, 3], [3, 5], [7, 5], [3, 7], [7, 7]] }[v];
  const tone = { NW: '#ff6a5a', NE: '#ff6a5a', SW: '#c79bff', SE: '#c79bff', C: '#ffd23d' }[slot] || '#f2ead2';
  return `<svg viewBox="0 0 10 10" aria-hidden="true"><defs><linearGradient id="dg-${slot}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3350"/><stop offset="1" stop-color="#0e1222"/></linearGradient></defs><rect x=".6" y=".6" width="8.8" height="8.8" rx="2.1" fill="url(#dg-${slot})" stroke="${tone}" stroke-width=".55"/><rect x="1.2" y="1.2" width="7.6" height="3" rx="1.6" fill="#fff" opacity=".07"/>${spots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".78" fill="${tone}"/>`).join('')}</svg>`;
}
function logo({ animate = true } = {}) {
  const dice = h('div', { class: 'lg-dice', 'aria-hidden': 'true' }, D.SLOTS.map((s) => {
    const el = h('i', { class: `ld ld-${s}` }); const v = 1 + Math.floor(Math.random() * (s === 'C' ? 6 : 4)); el.dataset.v = v; el.innerHTML = dieFace(v, s); return el;
  }));
  if (animate && !reduced()) {
    X.S.timers.push(setInterval(() => {
      const els = $$('.ld', dice); const el = els[Math.floor(Math.random() * els.length)]; const s = D.SLOTS[els.indexOf(el)];
      el.classList.remove('tumble'); void el.offsetWidth; el.classList.add('tumble');
      setTimeout(() => { const v = 1 + Math.floor(Math.random() * (s === 'C' ? 6 : 4)); el.dataset.v = v; el.innerHTML = dieFace(v, s); }, 260);
    }, 1500));
  }
  return h('div', { class: 'sx-logo' }, dice,
    h('h1', { class: 'lg-word', 'aria-label': 'QuestDice' }, h('span', { class: 'lg-quest' }, 'QUEST'), h('span', { class: 'lg-dice-word' }, 'DICE')),
    h('p', { class: 'lg-tag' }, h('i'), h('span', {}, 'Roll your body. Break the dark.'), h('i')));
}

// ------------------------------------------------------------------------------------------------ title
export function title() {
  const S = X.S; const saves = SV.listSaves(); const seat = Net.savedSeat();
  const lead = saves.find((s) => s.kind === 'hero');
  const cls = lead?.cls || nextOf(Object.keys(D.CLASSES));
  S.cleanups = S.cleanups || [];
  const menu = h('nav', { class: 'sx-menu', 'aria-label': 'Main menu' });
  if (seat) menu.append(plaque({ eyebrow: 'Table', title: `Rejoin ${seat.code}`, sub: 'This phone still has a seat.', icon: 'people', tone: 'is-together', onclick: () => X.resume() }));
  saves.forEach((x, i) => {
    const company = x.kind === 'company';
    const sub = company ? `${x.size} heroes · ${x.classes.map((id) => D.CLASSES[id].name).join(', ')}` : `Level ${x.level} ${D.CLASSES[x.cls].name}`;
    menu.append(plaque({ eyebrow: i === 0 ? 'Continue' : `Act ${romans[x.act - 1] || x.act} · Quest ${x.step}`, title: x.name, sub: i === 0 ? `${sub} · Act ${romans[x.act - 1] || x.act}, Quest ${x.step}` : sub, iconEl: company ? ico('people') : emblem(x.cls), primary: i === 0, onclick: () => X.unlock(x.name, x.kind) }));
  });
  const group = (label) => h('div', { class: 'sx-eye menu-label' }, label);
  if (saves.length) menu.append(group('Begin anew'));
  menu.append(
    plaque({ eyebrow: 'New game', title: 'Forge a new hero', sub: 'One body of dice. A whole road.', icon: 'hammer', primary: !saves.length, onclick: X.showCreate }),
    plaque({ eyebrow: 'Together', title: 'Play on your own phone', sub: 'One to six heroes, one table.', icon: 'people', tone: 'is-together', onclick: X.showTogether }),
    plaque({ eyebrow: 'Soul Code', title: 'Bring a hero here', sub: 'Paste a code from another device.', icon: 'key', onclick: X.showImport }));
  mountAs('title',
    h('div', { class: 'sx-title-shell' },
      h('div', { class: 'sx-title-brand' }, logo()),
      h('div', { class: 'sx-title-menu' }, menu, h('div', { class: 'sx-links' }, btn('How to play', X.showHowTo, { kind: 'link', icon: 'book' })))));
  lay('title'); SCR.enter('title', { cls }, `title:${cls}`);
}

// ------------------------------------------------------------------------------------------------ create
function meter(label, value, max, icon, cls, note = '', shown = null, on = null) {
  return h('div', { class: `sx-meter ${cls}` }, h('div', { class: 'mt-head' }, ico(icon), h('span', {}, label), h('b', {}, String(shown ?? value))),
    h('div', { class: 'mt-cells', 'aria-hidden': 'true' }, Array.from({ length: max }, (_, i) => h('i', { class: i < (on ?? value) ? 'on' : '' }))),
    note ? h('small', { class: 'mt-note' }, note) : null);
}
// The four numbers that describe a hero, each with a plain-words caption (size ladder for initiative: d4 d6 d8 d10).
function heroStats(hp, feet) {
  const rung = [4, 6, 8, 10].indexOf(feet) + 1;
  return h('div', { class: 'ci-meters' },
    meter('Health', hp, 40, 'heart', 'm-hp', 'How much damage you can take.'),
    meter('Initiative', feet, 4, 'boot', 'm-init', 'Your feet die. A bigger die means you strike before the monsters more often.', `d${feet}`, rung));
}
function faceChips(inst) {
  return h('div', { class: 'wc-faces' }, E.weaponFaces(inst).map((f) => h('span', { class: `wf ${f.c === 'r' ? 'red' : 'blue'} ${f.v === 0 ? 'zero' : ''}` }, h('b', {}, String(f.v)), f.fx ? h('span', { class: 'wf-fx' }, fxItems(f.fx)) : null)));
}
// A weapon as a collectible: 3D portrait, rarity banner and glow, face chips, optional actions.
function weaponCard(inst, { actions = [], note = '', compact = false, badge = '', cls = '' } = {}) {
  const w = D.WEAPONS[inst.id]; const r = RAR[inst.rarity | 0];
  // Strength is the limit: a weapon die never rolls bigger than the hand that holds it
  const size = E.weaponSize(inst); const hero = X.S?.hero; const wi = hero && inst.id !== 'fists' && !String(inst.uid).startsWith('c-') ? E.wieldInfo(hero, inst) : null;
  const need = size > 4 ? h('p', { class: `wc-need ${wi && !wi.ok ? 'short' : 'ok'}` }, ico(wi && !wi.ok ? 'lock' : 'check'),
    wi && !wi.ok ? `Needs d${size} Strength${wi.two ? ' in both hands' : ''}. Rolls as a d${wi.rollsAs} until you train it.` : `Needs d${size} Strength${wi?.two ? ' in both hands' : ''}`) : null;
  return h('article', { class: `sx-wc rar-${r} ${compact ? 'compact' : ''} ${cls}` },
    h('div', { class: 'wc-stage' }, art(() => SCR.portraitQ.weapon(inst.id, inst.rarity | 0), 'wc-art', `${D.RARITY[inst.rarity | 0]} ${w.name}`), h('span', { class: 'wc-banner' }, D.RARITY[inst.rarity | 0]), badge ? h('span', { class: 'wc-badge' }, badge) : null),
    h('div', { class: 'wc-body' }, h('b', { class: 'wc-name' }, w.name), h('small', { class: 'wc-sub' }, `${w.hands === 2 ? 'Two-handed' : 'One-handed'} · d${size}`), faceChips(inst), need, compact ? null : h('p', { class: 'wc-tag' }, w.tag), note ? h('p', { class: 'wc-note' }, note) : null),
    actions.length ? h('div', { class: 'wc-actions' }, actions) : null);
}
export function create() {
  const S = X.S; let cls = Object.keys(D.CLASSES)[Math.floor(Math.random() * 5)]; let H = null; let busy = false;
  const name = h('input', { class: 'sx-input', id: 'hero-name', maxlength: 16, placeholder: 'Thessaly Vane', autocomplete: 'off', 'aria-label': 'Hero name' });
  const pw = h('input', { class: 'sx-input', id: 'hero-pw', type: 'password', placeholder: '3 or more characters', autocomplete: 'new-password', 'aria-label': 'Password' });
  const msg = h('p', { class: 'form-msg', role: 'alert' });
  let diff = 'normal'; let skipHints = !Coach.hintsOn();
  const diffRow = h('div', { class: 'sx-diff', role: 'radiogroup', 'aria-label': 'Difficulty' });
  const paintDiff = () => diffRow.replaceChildren(...Object.entries(D.DIFFICULTY).map(([id, d]) => h('button', { type: 'button', class: `df-opt ${id === diff ? 'on' : ''}`, role: 'radio', 'aria-checked': String(id === diff), onclick: () => { diff = id; sfx.select(); paintDiff(); } }, h('b', {}, d.name), h('small', {}, d.text))));
  paintDiff();
  const hintsBox = h('label', { class: 'sx-check' }, h('input', { type: 'checkbox', checked: skipHints, onchange: (e) => { skipHints = e.target.checked; } }), h('span', {}, 'I have played before: skip the beginner hints'));
  const rail = h('div', { class: 'sx-rail', role: 'radiogroup', 'aria-label': 'Class' });
  const info = h('div', { class: 'sx-classinfo' });
  const paint = () => {
    const c = D.CLASSES[cls];
    rail.replaceChildren(...Object.entries(D.CLASSES).map(([id, k]) => h('button', {
      type: 'button', class: `rail-btn ${id === cls ? 'on' : ''}`, role: 'radio', 'aria-checked': String(id === cls), style: { '--hue': CLS_HUE[id] }, 'aria-label': k.name,
      onclick: () => { if (id === cls) return; cls = id; sfx.select(); paint(); H?.pick(cls).then(() => H?.push(true)); },
    }, emblem(id), h('span', {}, k.name.split(' ')[0]))));
    const wset = [...new Set(c.weapons)];
    info.replaceChildren(
      h('div', { class: 'ci-head' }, h('h2', {}, c.name), h('p', {}, c.blurb)),
      heroStats(c.hp, c.feet || 4),
      h('p', { class: 'ci-rule' }, `Every hero starts each fight with ${D.START_MAGIC} magic and may reroll ${D.REROLL_DICE} dice at a time.`),
      eyebrow('Wields'),
      h('div', { class: `ci-weapons n${wset.length}` }, wset.map((id) => weaponCard({ uid: `c-${id}`, id, rarity: 0 }, { compact: true }))),
      eyebrow('Magical powers'),
      h('div', { class: 'ci-cards' }, c.cards.map((k) => h('div', { class: `ci-card ${(k.unlock ?? 1) > 1 ? 'locked' : ''}` }, h('span', { class: 'cc-cost' }, String(k.cost), ico('spark')), h('b', {}, k.name), h('small', {}, k.text), (k.unlock ?? 1) > 1 ? h('em', {}, `Level ${k.unlock}`) : null))));
  };
  paint();
  const go = async () => {
    const n = name.value.trim().replace(/\s+/g, ' ');
    if (n.length < 2) { msg.textContent = 'Give your hero a name (2–16 characters).'; sfx.error(); name.focus(); return; }
    if (pw.value.length < 3) { msg.textContent = 'Choose a password of at least 3 characters.'; sfx.error(); pw.focus(); return; }
    if (!SV.canSave()) { msg.textContent = 'Saving is blocked in this browser, so a hero could not be kept.'; sfx.error(); return; }
    if (busy) return; busy = true;
    try { const hero = E.newHero({ name: n, cls }); hero.difficulty = diff; Coach.setHints(!skipHints); await SV.createSave(hero, pw.value); X.adopt(hero, 'hero'); sfx.level(); X.showRoadOrBoard(); } catch (e) { msg.textContent = e.message; sfx.error(); busy = false; }
  };
  [name, pw].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }));
  mountAs('create',
    h('div', { class: 'sx-split' },
      h('div', { class: 'sx-viewport' }, btn('Back', X.showTitle, { kind: 'ghost', icon: 'back', cls: 'sx-back' }), h('p', { class: 'sx-hint' }, h('span', {}, 'Drag to turn'))),
      h('div', { class: 'sx-side' },
        h('div', { class: 'sx-sidehead' }, btn('Back', X.showTitle, { kind: 'ghost', icon: 'back', cls: 'sx-back-in' }), eyebrow('Step 1 of 1'), h('h1', { class: 'sx-h1' }, 'Choose your hero')),
        rail, info, flourish(),
        eyebrow('Difficulty'), diffRow, hintsBox,
        h('div', { class: 'sx-form' }, h('label', { for: 'hero-name' }, 'Name', name), h('label', { for: 'hero-pw' }, 'Password', pw), h('p', { class: 'fine' }, 'The password only guards this hero on this device.'), msg),
        h('div', { class: 'sx-cta' }, btn('Begin the campaign', go, { big: true, icon: 'chevron', iconAfter: true, cls: 'wide' })))));
  lay('create');
  SCR.enter('create', { cls }, 'create').then((hd) => {
    H = hd; if (!hd) return;
    const cv = $('#gl'); let down = null;
    const pd = (e) => { down = e.clientX; cv.setPointerCapture?.(e.pointerId); };
    const pm = (e) => { if (down == null) return; H.drag(e.clientX - down); down = e.clientX; };
    const pu = () => { if (down != null) { down = null; H.drag(0, true); } };
    cv.addEventListener('pointerdown', pd); cv.addEventListener('pointermove', pm); cv.addEventListener('pointerup', pu); cv.addEventListener('pointercancel', pu);
    cv.classList.add('grab');
    (S.cleanups ||= []).push(() => { cv.removeEventListener('pointerdown', pd); cv.removeEventListener('pointermove', pm); cv.removeEventListener('pointerup', pu); cv.removeEventListener('pointercancel', pu); cv.classList.remove('grab'); });
    H.pick(cls, { quiet: true }).then(() => H.push(true));
  });
}

// ------------------------------------------------------------------------------------------------ board
const groupNames = (ids) => { const n = {}; ids.forEach((id) => { n[id] = (n[id] || 0) + 1; }); return Object.entries(n).map(([id, c]) => `${D.MONSTERS[id].name}${c > 1 ? ` ×${c}` : ''}`).join(' + '); };
function trail(c) {
  const N = D.QUESTS_PER_ACT;
  return h('ol', { class: 'sx-trail', 'aria-label': `Quest ${c.step} of ${N}` }, Array.from({ length: N }, (_, i) => {
    const n = i + 1; const done = n < c.step; const now = n === c.step; const boss = n === N; const elite = D.ELITE_STEPS.includes(n);
    return h('li', { class: `tr-node ${done ? 'done' : ''} ${now ? 'now' : ''} ${boss ? 'boss' : elite ? 'elite' : ''}`, 'aria-current': now ? 'step' : null },
      h('span', { class: 'tr-gem' }, done ? ico('check') : boss ? ico('crown') : elite ? ico('skull') : h('b', {}, String(n))),
      boss || elite ? h('small', {}, boss ? 'Boss' : 'Elite') : null);
  }));
}
function questArt(q) {
  const wrap = h('div', { class: `qa n${q.enemies.length} ${q.kind}` });
  q.enemies.forEach((id, i) => {
    const m = D.MONSTERS[id];
    wrap.append(h('div', { class: `qa-m tier-${m.tier} ${i % 2 ? 'flip' : ''}`, style: { '--i': i } }, art(() => SCR.portraitQ.monster(id), 'qa-img', m.name)));
  });
  return wrap;
}
function questCard(q, idx) {
  const xp = q.enemies.reduce((a, id) => a + Math.round(D.MONSTERS[id].xp * q.rewardMult), 0);
  const gold = q.enemies.reduce((a, id) => a + Math.round(D.MONSTERS[id].gold * q.rewardMult), 0);
  // danger is read from YOUR dice against these monsters: how much of your health the fight should cost
  const dz = E.questDanger(X.members()[0], q); const danger = { Easy: 1, Fair: 2, Hard: dz.score < 0.32 ? 3 : 4, Deadly: 5 }[dz.label];
  const reward = Math.min(5, Math.max(1, Math.round((xp + gold) / 16)));
  const tag = q.kind === 'boss' ? 'Boss' : q.kind === 'elite' ? 'Elite' : q.perilous ? 'Perilous' : 'Steady';
  const place = q.place || q.name;
  return h('button', { class: `sx-qcard ${q.kind} ${q.perilous ? 'perilous' : ''}`, type: 'button', style: { '--i': idx }, 'aria-label': `${tag}: ${q.name}. ${groupNames(q.enemies)}`, onclick: tap(() => X.startQuest(q)) },
    h('span', { class: 'qc-tag' }, q.perilous ? ico('flame') : q.kind === 'boss' ? ico('crown') : q.kind === 'elite' ? ico('skull') : ico('shield'), tag, q.perilous ? h('em', {}, `×${D.PERIL.reward} rewards`) : null),
    questArt(q),
    h('div', { class: 'qc-body' },
      h('b', { class: 'qc-name' }, q.kind === 'boss' ? q.name : (q.name.replace(place, '').replace(/\s+(on|at|near|in|of|by)\s*$/i, '').trim() || q.name)), h('small', { class: 'qc-place' }, ico('pin'), place),
      h('small', { class: 'qc-foes' }, groupNames(q.enemies)),
      h('div', { class: 'qc-read' },
        h('div', { class: `qr danger dz-${dz.label.toLowerCase()}` }, h('span', {}, 'Danger'), pips(danger, 5, 'p-danger'), h('small', {}, `${dz.label} for you · ~${dz.rounds} round${dz.rounds > 1 ? 's' : ''}`)),
        h('div', { class: 'qr reward' }, h('span', {}, 'Reward'), pips(reward, 5, 'p-reward'), h('small', {}, `${xp} XP · ${gold}g+`)))),
    h('span', { class: 'qc-go' }, h('span', {}, q.kind === 'boss' ? 'Face the king' : 'Take this road'), ico('chevron')));
}
export function board() {
  const S = X.S; const hero = X.members()[0]; S.hero = hero; const c = hero.campaign; const quests = E.questsFor(hero); X.persist();
  const blessings = (c.blessings || []).filter((b) => (b.fights ?? 1) > 0); const ambush = c.ambush?.length;
  const tipEl = tipBox('board', 'Each quest offers two roads. Standard is lighter. Perilous hits harder but pays 1.5× gold and XP.');
  const place = quests[0].place;
  mountAs('board', h('div', { class: 'sx-board' },
    topBar(heroChip(hero), h('div', { class: 'sx-top-actions' }, btn('Camp', () => X.showCamp({ fromBoard: true }), { kind: 'ghost', icon: 'tent' }), btn('Menu', X.menu, { kind: 'ghost', icon: 'menu' }))),
    h('div', { class: 'sx-board-main' },
      h('div', { class: 'sx-board-head' },
        eyebrow(`Act ${romans[c.act - 1] || c.act} · Quest ${c.step} of ${D.QUESTS_PER_ACT}`),
        h('h1', { class: 'sx-act' }, X.actName(hero)), h('p', { class: 'sx-acttag' }, X.actOf(hero).tag),
        trail(c)),
      h('div', { class: 'sx-notes' },
        blessings.length ? h('p', { class: 'note boon' }, ico('shine'), blessings.map((b) => b.text).join(' · ')) : null,
        ambush ? h('p', { class: 'note warn' }, ico('skull'), 'An ambush waits on whichever road you take.') : null, tipEl),
      eyebrow(quests.length > 1 ? 'Choose your road' : 'The road ends here', 'center'),
      h('div', { class: `sx-quests n${quests.length}` }, quests.map(questCard)))));
  lay('board'); SCR.enter('road', { hero, place, seed: c.seed }, `road:${place}:${hero.name}:${hero.cls}`);
}

// ------------------------------------------------------------------------------------------------ road events
function scrollCard(kicker, titleText, body, ...rest) {
  const first = String(body).trim();
  return h('article', { class: 'sx-scroll' }, h('i', { class: 'sc-edge top' }), h('i', { class: 'sc-edge bot' }),
    h('div', { class: 'sc-kicker' }, h('span', {}, kicker)), h('h1', { class: 'sc-title' }, titleText), flourish(),
    h('p', { class: 'sc-tell' }, h('span', { class: 'dropcap' }, first.charAt(0)), first.slice(1)), ...rest);
}
export function road() {
  const members = X.members(); const hero = members[0]; const ev = R.ensureRoad(hero, members); X.persist();
  const choices = h('div', { class: 'sx-choices' }, ev.choices.map((ch, i) => h('button', {
    class: `sx-choice ${ch.ok ? '' : 'off'}`, type: 'button', disabled: !ch.ok, style: { '--i': i }, 'aria-label': `${ch.label}. ${ch.hint}`,
    onclick: () => { const res = R.chooseRoad(hero, members, ch.id); if (!res) { sfx.error(); toast(ch.ok ? 'The road will not take that.' : 'You cannot afford that.'); return; } sfx.card(); X.persist(); roadResult(res); },
  }, h('span', { class: 'cx-seal' }, h('b', {}, String.fromCharCode(65 + i))), h('span', { class: 'cx-copy' }, h('b', {}, ch.label), h('small', {}, ch.hint)), ico('chevron'))));
  mountAs('road', h('div', { class: 'sx-split sx-road' }, h('div', { class: 'sx-viewport' }, topBar(heroChip(hero))),
    h('div', { class: 'sx-side' }, h('div', { class: 'sx-sidetop' }, btn('Menu', X.menu, { kind: 'ghost', icon: 'menu' })),
      scrollCard(ev.kicker, ev.title, ev.tell), eyebrow('What do you do?'), choices, coachBox(ev.id === 'traveller' ? 'r_traveller' : 'r_road'))));
  const place = E.questsFor(hero)[0].place;
  lay('road'); SCR.enter('road', { hero, place, seed: hero.campaign.seed }, `road:${place}:${hero.name}:${hero.cls}`);
}
export function roadResult(res) {
  const hero = X.members()[0];
  mountAs('road', h('div', { class: 'sx-split sx-road' }, h('div', { class: 'sx-viewport' }, topBar(heroChip(hero))),
    h('div', { class: 'sx-side' }, h('div', { class: 'sx-sidetop' }, btn('Menu', X.menu, { kind: 'ghost', icon: 'menu' })),
      scrollCard('The road answers', res.title, res.text), h('div', { class: 'sx-cta' }, btn('Onward', X.showBoard, { big: true, icon: 'chevron', iconAfter: true, cls: 'wide' })))));
  lay('road');
}

// ------------------------------------------------------------------------------------------------ victory / defeat
const PERK_ICON = { vitality: 'heart', reserve: 'spark', quick: 'reroll', keen: 'sword', ward: 'shield', piercer: 'pierce', greed: 'coin', grit: 'skull' };
function perkCard(id, hero, onpick, i) {
  const p = D.PERKS[id]; const have = hero.perks.filter((x) => x === id).length;
  return h('button', { class: `sx-perk perk-${id}`, type: 'button', style: { '--i': i }, onclick: tap(onpick), 'aria-label': `${p.name}. ${p.text}` },
    h('span', { class: 'pk-ico' }, ico(PERK_ICON[id] || 'star', '', 34)), h('b', {}, p.name), h('small', {}, p.text), h('span', { class: 'pk-rank' }, pips(have, p.max), h('em', {}, have + 1 > p.max ? 'Max' : `Rank ${have + 1}`)));
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
    lvl),
  h('div', { class: 'vc-xp' }, bar, h('small', {}, maxed ? 'Max level' : `${hero.xp} / ${need} XP to level ${lvNow + 1}`)));
  const perks = Rw.offer ? panel('sx-perks glow', eyebrow(`Level up. Choose a perk${hero.pendingPerks > 1 ? ` (${hero.pendingPerks} to pick)` : ''}`, 'gold'),
    h('div', { class: 'perk-row' }, Rw.offer.map((id, i) => perkCard(id, hero, () => { E.takePerk(hero, id); Rw.offer = null; sfx.level(); X.persist(); X.renderVictory(); }, i)))) : null;
  // Spoils: take one into your pack, or sell it on the spot for half its worth. A full pack must make room first.
  const full = E.bagFull(hero); const done = () => { sfx.coin(); X.persist(); X.renderVictory(); };
  const packStrip = full && Rw.picked == null ? h('div', { class: 'sx-pack' },
    h('p', { class: 'pk-head' }, ico('bag'), h('b', {}, `Your pack is full (${hero.bag.length}/${D.BAG_MAX})`), h('small', {}, 'Sell one to make room, or sell the spoils.')),
    h('div', { class: 'pk-list' }, hero.bag.map((it) => h('div', { class: 'pk-item' }, h('span', {}, `${D.RARITY[it.rarity | 0]} ${D.WEAPONS[it.id].name} · d${E.weaponSize(it)}`),
      btn(`Sell ${E.sellValue(it)}`, () => { E.sellItem(hero, it.uid); done(); }, { kind: 'ghost', icon: 'coin', aria: `Sell ${D.WEAPONS[it.id].name} for ${E.sellValue(it)} gold` }))))) : null;
  const loot = Rw.picked == null
    ? panel('sx-loot', eyebrow(`Choose your spoils · pack ${hero.bag.length}/${D.BAG_MAX}`, 'gold'), packStrip, h('div', { class: 'loot-row' }, Rw.drops.map((inst, i) => weaponCard(inst, { cls: 'pick', actions: [
      btn(full ? 'Pack full' : 'Take', () => { if (!E.takeDrop(hero, inst)) return; Rw.picked = i; Rw.sold = false; done(); }, { kind: 'primary', icon: 'bag', disabled: full }),
      btn(`Sell ${E.sellValue(inst)}`, () => { E.sellDrop(hero, inst); Rw.picked = i; Rw.sold = true; done(); }, { kind: 'ghost', icon: 'coin', cls: 'sell', aria: `Sell it now for ${E.sellValue(inst)} gold` }),
    ] }))))
    : panel('sx-loot done', h('p', { class: 'muted' }, Rw.sold ? `You sold the ${D.RARITY[Rw.drops[Rw.picked].rarity]} ${D.WEAPONS[Rw.drops[Rw.picked].id].name} for ${E.sellValue(Rw.drops[Rw.picked])} gold.` : `You took the ${D.RARITY[Rw.drops[Rw.picked].rarity]} ${D.WEAPONS[Rw.drops[Rw.picked].id].name}. It waits in your pack.`));
  const lootHint = Rw.picked == null ? (Rw.drops.some((d) => D.WEAPONS[d.id].hands === 2) && Coach.wantHint(hero, 'v_twohand') ? coachBox('v_twohand') : coachBox('v_loot')) : null;
  const ready = !Rw.offer && hero.pendingPerks === 0 && Rw.picked != null;
  mountAs(`victory ${animate ? 'anim' : ''}`, h('div', { class: 'sx-split sx-victory' }, h('div', { class: 'sx-viewport' }),
    h('div', { class: 'sx-side' },
      h('header', { class: 'vc-head' }, eyebrow(Rw.quest.name), h('h1', { class: 'vc-title' }, 'Victory'), h('p', {}, 'The way is open.'), flourish()),
      rewards, perks, lootHint, loot,
      h('div', { class: 'sx-cta' }, btn(ready ? 'To camp' : 'Choose a perk and spoils to continue', () => X.showCamp({ fromBoard: false }), { big: true, icon: ready ? 'tent' : null, disabled: !ready, cls: 'wide' })))));
  lay('victory'); SCR.victory();
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
      h('header', { class: 'df-head' }, eyebrow(S.quest?.name || ''), h('h1', { class: 'df-title' }, retreat ? 'You withdraw' : 'You have fallen'), h('p', {}, retreat ? 'A wise person lives to fight tomorrow.' : 'The dark wins this round. It does not get to keep you.'), flourish()),
      panel('sx-grace', h('p', { class: 'df-loss' }, loss ? h('span', {}, `You dropped `, coin(loss, 'inline'), ' in the dust.') : 'You lost nothing but pride.'),
        h('p', { class: 'muted' }, 'Everything that makes you stronger is still yours.'),
        h('ul', { class: 'df-keep' }, lines.map(([k, v, ic]) => h('li', {}, ico(ic), h('span', {}, k), h('b', {}, v), ico('check', 'ok'))))),
      h('p', { class: 'df-tip' }, 'Rest at camp, spend your gold on a bigger die, then walk the road again. Standard roads are lighter than Perilous ones.'),
      h('div', { class: 'sx-cta' }, btn('Return to camp', () => X.showCamp({ fromBoard: false }), { big: true, icon: 'tent', cls: 'wide' })))));
  lay('defeat'); SCR.defeat();
}

// ------------------------------------------------------------------------------------------------ camp
const TABS = [['forge', 'Forge', 'anvil'], ['gear', 'Gear', 'bag'], ['hero', 'Hero', 'hero']];
function dieBadge(size, cls = '') { return h('span', { class: `sx-die d${size} ${cls}` }, ico(`d${size}`, '', 44), h('b', {}, String(size))); }
function upgradeRow(kind, slot, label, hint) {
  const hero = X.S.hero; if (kind === 'speed') E.feetSize(hero); const size = hero[kind][slot]; const steps = kind === 'strength' ? D.STRENGTH_STEPS : kind === 'speed' ? D.SPEED_STEPS : D.SPECIAL_STEPS;
  const u = kind === 'strength' ? E.strengthUpgrade(hero, slot) : kind === 'speed' ? E.speedUpgrade(hero) : E.specialUpgrade(hero, slot);
  const gate = steps[size]?.[1]; const locked = u.next && hero.level < gate;
  const ladder = [4, 6, 8, 10];
  return h('div', { class: `sx-urow ${u.ok ? 'can' : ''} ${!u.next ? 'maxed' : ''}` },
    h('div', { class: 'ur-ladder', 'aria-hidden': 'true' }, ladder.map((n, i) => h('span', { class: `step ${n < size ? 'past' : n === size ? 'now' : 'next'}` }, dieBadge(n), i < 3 ? h('i', { class: 'link' }) : null))),
    h('div', { class: 'ur-copy' }, h('b', {}, label), h('small', {}, hint),
      u.next ? h('small', { class: 'ur-next' }, `d${size} → d${u.next}`, locked ? h('em', { class: 'gate' }, ico('lock'), `Level ${gate}`) : null) : h('small', { class: 'ur-next' }, 'Fully grown')),
    u.next ? btn(String(u.cost), () => { if (E.upgradeDie(hero, kind, slot)) { sfx.level(); X.persist(); X.renderCamp(); } }, { icon: 'coin', disabled: !u.ok, cls: `ur-buy ${!locked && !u.ok ? 'poor' : ''}`, aria: `Upgrade ${label} to d${u.next} for ${u.cost} gold` }) : h('span', { class: 'ur-max' }, 'MAX'));
}
// A carried weapon: forge its Tier (more corner symbols, costs gold) and train its Size (bigger die, needs a big enough hand).
function weaponRow(inst, label = '') {
  const hero = X.S.hero; const w = D.WEAPONS[inst.id]; const size = E.weaponSize(inst);
  const f = E.forgeInfo(hero, inst.uid); const t = E.trainInfo(hero, inst.uid);
  const note = !t.next ? 'Biggest die' : t.why === 'hands' ? `d${t.next} needs a d${t.next} hand first` : `d${size} → d${t.next}`;
  return h('div', { class: 'sx-urow wrow' },
    h('div', { class: 'ur-copy' }, h('b', {}, label || w.name), h('small', {}, `${D.RARITY[inst.rarity | 0]} · d${size}`), h('small', { class: 'ur-next' }, note)),
    f.next ? btn(`Forge ${D.RARITY[f.next]} · ${f.cost}`, () => { if (E.forgeWeapon(hero, inst.uid)) { sfx.level(); X.persist(); X.renderCamp(); } }, { icon: 'coin', iconAfter: true, disabled: !f.ok, cls: `ur-buy ${!f.ok ? 'poor' : ''}`, aria: `Forge ${w.name} to ${D.RARITY[f.next]} for ${f.cost} gold` }) : h('span', { class: 'ur-max' }, 'BEST TIER'),
    t.next ? btn(`Train d${t.next}${t.cost ? ` · ${t.cost}` : ''}`, () => { if (E.trainWeapon(hero, inst.uid)) { sfx.level(); X.persist(); X.renderCamp(); } }, { icon: 'coin', iconAfter: true, disabled: !t.ok, cls: `ur-buy ${!t.ok ? 'poor' : ''}`, aria: `Train ${w.name} to d${t.next}` }) : h('span', { class: 'ur-max' }, 'MAX SIZE'));
}
// ---- dice you do not have yet, and the talent dice (bottom corners): grow them and choose which symbols sit on which faces
const SYM_ICO = { atk: ['burst', 'c-atk'], block: ['shield', 'c-block'], pierce: ['pierce', 'c-pierce'], magic: ['spark', 'c-magic'], heal: ['plus', 'c-heal'], gold: ['coin', 'c-gold'] };
const symChip = (k, cls = '') => h('span', { class: `fx ${SYM_ICO[k][1]} ${cls}` }, ico(SYM_ICO[k][0]));
const DIE_NAME = { SW: 'Left talent die', SE: 'Right talent die', NE: 'Right weapon die' };
const TAL = { slot: null, face: null };
function unlockSection(hero) {
  const rows = D.UNLOCK_ORDER.filter((s) => !E.isActive(hero, s));
  if (!rows.length) return null;
  return h('div', { class: 'tal-unlocks' }, eyebrow('New dice'),
    h('p', { class: 'tab-intro' }, 'Your board starts with six dice. Add the rest here, one at a time, as you grow.'),
    rows.map((slot) => { const u = E.unlockInfo(hero, slot); const talent = slot !== 'NE';
      return h('div', { class: 'sx-urow wrow' },
        h('div', { class: 'ur-copy' }, h('b', {}, DIE_NAME[slot]), h('small', {}, talent ? 'A bonus die: choose symbols for its faces.' : 'Your second weapon rolls here too.')),
        btn(`Add die · ${u.cost}`, () => { if (E.unlockDie(hero, slot)) { sfx.level(); X.persist(); X.renderCamp(); } }, { icon: 'coin', iconAfter: true, disabled: !u.ok, cls: `ur-buy ${!u.ok ? 'poor' : ''}`, aria: `Add the ${DIE_NAME[slot]} for ${u.cost} gold` })); }));
}
const SYM_MULT = { atk: 1, block: 1, magic: 1, heal: 2, gold: 0.5 };
const symAvg = (hero, slot, k) => { const hand = hero.strength[slot === 'SW' ? 'W' : 'E']; return ((hand + 1) / 2 * (SYM_MULT[k] || 1)).toFixed(1).replace('.0', ''); };
function talentCard(hero, slot) {
  const size = hero.special[slot]; const info = E.talentInfo(hero, slot); const faces = hero.talent?.[slot] || [];
  const up = E.specialUpgrade(hero, slot); const gate = D.SPECIAL_STEPS[size]?.[1];
  const refresh = () => { sfx.card(); X.persist(); X.renderCamp(); };
  const symFaces = Array.from({ length: info.faces }, (_, f) => {
    const cur = faces[f] || [];
    const slotsEl = Array.from({ length: D.TALENT_PER_FACE }, (_, i) => {
      const k = cur[i]; const open = TAL.slot === slot && TAL.face === f && i === cur.length;
      if (k) return h('button', { class: `tal-slot full ${SYM_ICO[k][1]}`, type: 'button', 'aria-label': `${D.TALENT_SYMS[k].name}. Tap to remove.`, onclick: tap(() => { E.removeTalent(hero, slot, f, i); refresh(); }) }, ico(SYM_ICO[k][0]));
      return h('button', { class: `tal-slot ${open ? 'open' : ''}`, type: 'button', disabled: i > cur.length, 'aria-label': 'Add a symbol', onclick: tap(() => { TAL.slot = slot; TAL.face = f; X.renderCamp(); }) }, '+');
    });
    return h('div', { class: 'tal-face' }, h('small', {}, `Face ${f + 4}`), h('div', { class: 'tal-slots' }, slotsEl));
  });
  const picking = TAL.slot === slot && TAL.face != null;
  const picker = picking ? h('div', { class: 'tal-pick' }, Object.keys(D.TALENT_SYMS).map((k) => {
    const left = D.TALENT_MAX_SAME - E.talentCount(hero, slot, k); const full = (faces[TAL.face] || []).length >= D.TALENT_PER_FACE;
    const can = left > 0 && !full && hero.gold >= info.cost;
    return h('button', { class: `tal-opt ${SYM_ICO[k][1]}`, type: 'button', disabled: !can, 'aria-label': `${D.TALENT_SYMS[k].name}: ${D.TALENT_SYMS[k].text} ${left} left on this die.`, onclick: tap(() => { if (E.addTalent(hero, slot, TAL.face, k)) { TAL.face = (faces[TAL.face] || []).length + 1 >= D.TALENT_PER_FACE ? null : TAL.face; sfx.coin(); X.persist(); X.renderCamp(); } else sfx.error(); }) }, ico(SYM_ICO[k][0]), h('b', {}, D.TALENT_SYMS[k].name), h('small', {}, `about +${symAvg(hero, slot, k)} · ${left} left`));
  }), h('small', { class: 'tal-cost' }, `Each symbol costs ${info.cost} gold. Tap a placed symbol to take it off.`)) : null;
  return h('div', { class: 'sx-urow tal-die' },
    h('div', { class: 'tal-head' }, h('b', {}, `${DIE_NAME[slot]} · d${size}`), h('small', {}, `${info.used} of ${info.slots} symbol slots`), h('small', { class: 'tal-hand' }, `Powered by your ${slot === 'SW' ? 'left' : 'right'} hand, a d${hero.strength[slot === 'SW' ? 'W' : 'E']} (about ${((hero.strength[slot === 'SW' ? 'W' : 'E'] + 1) / 2).toFixed(1)} a roll)`)),
    h('div', { class: 'tal-strip fixed' }, h('div', { class: 'tal-face blank' }, h('small', {}, 'Face 1'), h('b', {}, 'blank')), h('div', { class: 'tal-face blank' }, h('small', {}, 'Face 2'), h('b', {}, 'blank')),
      h('div', { class: 'tal-face x2' }, h('small', {}, 'Face 3'), h('b', {}, '2×'))),
    h('div', { class: 'tal-strip syms' }, symFaces),
    picker,
    up.next ? btn(`Grow to d${up.next} · ${up.cost}`, () => { if (E.upgradeDie(hero, 'special', slot)) { sfx.level(); X.persist(); X.renderCamp(); } }, { icon: 'coin', iconAfter: true, disabled: !up.ok, cls: `ur-buy ${!up.ok ? 'poor' : ''}`, aria: `Grow the talent die to d${up.next}` }) : h('span', { class: 'ur-max' }, 'FULL SIZE'),
    up.next && hero.level < gate ? h('small', { class: 'ur-next' }, ico('lock'), ` needs level ${gate}`) : null);
}
// Powers: what each does, how it is used, and a gold upgrade (more dice and bigger numbers).
const KIND_NAME = { flat: 'Fixed', dice: 'Rolls dice', scale: 'More magic, more dice', round: 'Grows each round', luck: 'Roll for luck', super: 'Super: once, round 3+' };
function powerRow(hero, k) {
  const u = E.powerUpgradeInfo(hero, k.id); const lvl = E.powerLevel(hero, k.id);
  return h('div', { class: 'sx-urow wrow' },
    h('div', { class: 'ur-copy' }, h('b', {}, `${k.name} ${'★'.repeat(lvl)}`), h('small', {}, k.text), h('small', { class: 'ur-next' }, `${KIND_NAME[k.kind] || ''} · ${k.atwill ? 'every round' : 'once a battle'} · costs ${k.cost}${k.kind === 'scale' ? '–' + k.max : ''} magic`)),
    u.next ? btn(`Level ${u.next} · ${u.cost}`, () => { if (E.upgradePower(hero, k.id)) { sfx.level(); X.persist(); X.renderCamp(); } }, { icon: 'coin', iconAfter: true, disabled: !u.ok, cls: `ur-buy ${!u.ok ? 'poor' : ''}`, aria: `Upgrade ${k.name} for ${u.cost} gold` }) : h('span', { class: 'ur-max' }, 'MAX'));
}
const weaponRowFor = (inst, label) => weaponRow(inst, label);
function forgeTab() {
  const hero = X.S.hero;
  const hasTalent = ['SW', 'SE'].some((k) => E.isActive(hero, k));
  E.ensureTwin(hero);
  const wdef = D.WEAPONS[hero.loadout.NW.id];
  // a two-hander lists each hand on its own (the bow, then its arrows) so either die can be forged or trained
  const weapons = E.isTwoHanded(hero)
    ? [weaponRowFor(hero.loadout.NW, wdef.twinName ? wdef.name : `${wdef.name} · left hand`), weaponRowFor(hero.loadout.NE, wdef.twinName || `${wdef.name} · right hand`)]
    : [...new Map(['NW', 'NE'].map((k) => hero.loadout[k]).filter((i) => i && i.id !== 'fists').map((i) => [i.uid, i])).values()].map((i) => weaponRowFor(i, ''));
  return h('div', { class: 'sx-tab forge' },
    h('p', { class: 'fine center gold-line' }, `You carry ${hero.gold} gold.`),
    unlockSection(hero),
    hasTalent ? coachBox('c_talent') : null,
    hasTalent ? eyebrow('Talent dice') : null,
    hasTalent ? h('p', { class: 'tab-intro' }, 'Each symbol is worth the strength of the hand above it. A face can hold two symbols, and no die can hold more than two of the same.') : null,
    ...['SW', 'SE'].filter((k) => E.isActive(hero, k)).map((k) => talentCard(hero, k)),
    eyebrow('Strength dice'),
    h('p', { class: 'tab-intro' }, 'Bigger hand dice hit harder and power your talent symbols. Each size waits on your level.'),
    upgradeRow('strength', 'W', 'Left hand', 'Pays out on 1–4. Locked behind level.'), upgradeRow('strength', 'E', 'Right hand', 'Pays out on 1–4. Locked behind level.'),
    upgradeRow('speed', 'S', 'Feet · speed', 'Your initiative die. A monster must roll higher than you to strike first.'),
    eyebrow('Magical powers'),
    h('p', { class: 'tab-intro' }, 'Spend magic in battle. Most work once a fight; the weaker ones come back every round. Upgrades add dice and numbers. A super unlocks at level 5.'),
    ...E.cardsOf(hero).map((k) => powerRow(hero, k)),
    eyebrow('Weapons'),
    h('p', { class: 'tab-intro' }, 'Forging raises a weapon’s tier and fills its corners with bonuses. Training grows its die, but never past the hand that holds it.'),
    ...weapons);
}
function gearTab() {
  const hero = X.S.hero; const two = E.isTwoHanded(hero);
  const sync = () => { sfx.card(); X.persist(); X.renderCamp(); };
  const worn = two ? [weaponCard(hero.loadout.NW, { note: 'Both hands', cls: 'worn', badge: 'Equipped' })] : [weaponCard(hero.loadout.NW, { note: 'Left hand', cls: 'worn', badge: 'Left' }), weaponCard(hero.loadout.NE, { note: 'Right hand', cls: 'worn', badge: 'Right' })];
  const bag = hero.bag.map((inst) => {
    const w = D.WEAPONS[inst.id];
    const acts = w.hands === 2 ? [btn('Equip', () => { E.equip(hero, inst.uid); sync(); }, { kind: 'ghost' })]
      : [btn('Left', () => { E.equip(hero, inst.uid, 'NW'); sync(); }, { kind: 'ghost', aria: `Equip ${w.name} in left hand` }), btn('Right', () => { E.equip(hero, inst.uid, 'NE'); sync(); }, { kind: 'ghost', aria: `Equip ${w.name} in right hand` })];
    acts.push(btn(String(E.sellValue(inst)), () => { E.sellItem(hero, inst.uid); sfx.coin(); X.persist(); X.renderCamp(); }, { kind: 'ghost', icon: 'coin', cls: 'sell', aria: `Sell ${w.name} for ${E.sellValue(inst)} gold` }));
    return weaponCard(inst, { actions: acts, compact: true });
  });
  const stock = E.shopStock(hero);
  return h('div', { class: 'sx-tab gear' },
    coachBox('g_gear'),
    eyebrow('On your body'), h('div', { class: `wc-grid worn n${worn.length}` }, worn),
    h('p', { class: 'fine' }, 'Red faces attack, blue faces defend. Three alike across the top or middle row: +10 attack. Down the middle: +10 block.'),
    eyebrow(`Pack · ${bag.length} of ${D.BAG_MAX}`), bag.length ? h('div', { class: 'wc-grid' }, bag) : h('p', { class: 'muted empty' }, 'Nothing yet. Monsters drop weapons.'),
    eyebrow('The peddler'), h('div', { class: 'wc-grid' }, stock.map((it, i) => weaponCard(it.inst, { compact: true, cls: it.sold ? 'sold' : '', actions: [it.sold ? h('span', { class: 'sold-tag' }, 'Sold') : btn(E.bagFull(hero) ? 'Pack full' : String(it.price), () => { if (E.buyItem(hero, i)) { sfx.coin(); X.persist(); X.renderCamp(); } else { sfx.error(); toast(E.bagFull(hero) ? 'Your pack is full. Sell something first.' : 'Not enough gold.'); } }, { icon: 'coin', disabled: hero.gold < it.price || E.bagFull(hero), cls: 'buy', aria: `Buy for ${it.price} gold` })] }))));
}
function heroTab() {
  const hero = X.S.hero; const c = D.CLASSES[hero.cls]; const pc = {}; hero.perks.forEach((p) => { pc[p] = (pc[p] || 0) + 1; });
  const log = (X.S.company?.campaign || hero.campaign)?.chronicle || [];
  const need = D.xpToNext(hero.level);
  return h('div', { class: 'sx-tab herotab' },
    h('div', { class: 'ht-id' }, emblem(hero.cls, 'lg'), h('div', {}, h('h2', {}, hero.name), h('small', {}, `Level ${hero.level} ${c.name}`))),
    h('div', { class: 'vc-xp' }, h('div', { class: 'vc-bar' }, h('i', { style: { width: `${hero.level >= D.MAX_LEVEL ? 100 : (hero.xp / need) * 100}%` } })), h('small', {}, hero.level >= D.MAX_LEVEL ? 'Max level' : `${hero.xp} / ${need} XP`)),
    heroStats(E.maxHpOf(hero), E.feetSize(hero)),
    eyebrow('Difficulty'), h('div', { class: 'sx-diff' }, Object.entries(D.DIFFICULTY).map(([id, d]) => h('button', { type: 'button', class: `df-opt ${(hero.difficulty || 'normal') === id ? 'on' : ''}`, onclick: tap(() => { hero.difficulty = id; sfx.select(); X.persist(); X.renderCamp(); }) }, h('b', {}, d.name), h('small', {}, d.text)))),
    h('div', { class: 'sx-check' }, h('span', {}, `Beginner hints: ${Coach.hintsOn() ? 'on' : 'off'}`), btn(Coach.hintsOn() ? 'Turn off' : 'Turn on', () => { Coach.setHints(!Coach.hintsOn()); X.renderCamp(); }, { kind: 'ghost' })),
    h('p', { class: 'fine' }, `${hero.stats.battles} victories · ${hero.stats.defeats} defeats · ${hero.stats.triples} triples · ${hero.stats.straights} straights`),
    eyebrow('Perks'), Object.keys(pc).length ? h('div', { class: 'ht-perks' }, Object.entries(pc).map(([id, n]) => h('div', { class: 'ht-perk' }, ico(PERK_ICON[id] || 'star'), h('div', {}, h('b', {}, `${D.PERKS[id].name}${n > 1 ? ` ×${n}` : ''}`), h('small', {}, D.PERKS[id].text))))) : h('p', { class: 'muted empty' }, 'You earn a perk every level.'),
    eyebrow('Magical powers'), h('div', { class: 'ci-cards' }, c.cards.map((k) => h('div', { class: `ci-card ${(k.unlock ?? 1) > hero.level ? 'locked' : ''}` }, h('span', { class: 'cc-cost' }, String(k.cost), ico('spark')), h('b', {}, k.name), h('small', {}, k.text), (k.unlock ?? 1) > hero.level ? h('em', {}, `Level ${k.unlock}`) : null))),
    eyebrow('Always available'), h('div', { class: 'ci-cards' }, h('div', { class: 'ci-card' }, h('span', { class: 'cc-cost' }, String(E.healCostOf(hero)), ico('spark')), h('b', {}, 'Heal'), h('small', {}, `Restore ${D.HEAL_AMOUNT} HP`)), h('div', { class: 'ci-card' }, h('span', { class: 'cc-cost' }, String(D.NUDGE_COST), ico('spark')), h('b', {}, 'Heart nudge'), h('small', {}, 'Move your heart die by 1'))),
    log.length ? [eyebrow('The road remembers'), h('div', { class: 'ht-log' }, log.slice(0, 8).map((e) => h('div', {}, h('b', {}, e.title), h('small', {}, e.text))))] : null);
}
export function camp(fromBoard) {
  const S = X.S; const hero = S.hero;
  const body = S.tab === 'gear' ? gearTab() : S.tab === 'hero' ? heroTab() : forgeTab();
  const perkHero = (S.company?.members || [hero]).find((m) => m.pendingPerks > 0);
  if (perkHero && (!S.perkOffer || S.perkFor !== perkHero.name)) { S.perkOffer = E.offerPerks(perkHero, X.fresh()); S.perkFor = perkHero.name; }
  if (!perkHero) { S.perkOffer = null; S.perkFor = null; }
  const perkPanel = perkHero && S.perkOffer ? panel('sx-perks glow', eyebrow(`${perkHero.name} still owes a perk`, 'gold'), h('div', { class: 'perk-row' }, S.perkOffer.map((id, i) => perkCard(id, perkHero, () => { E.takePerk(perkHero, id); S.perkOffer = null; sfx.level(); X.persist(); X.renderCamp(fromBoard); }, i)))) : null;
  const seats = (S.company?.members.length || 0) > 1 ? h('div', { class: 'sx-seats' }, S.company.members.map((m, i) => h('button', { type: 'button', class: S.seat === i ? 'on' : '', onclick: tap(() => { S.seat = i; S.hero = m; sfx.select(); X.renderCamp(fromBoard); }) }, emblem(m.cls), h('span', {}, h('b', {}, m.name), h('small', {}, `Lv ${m.level} · ${m.gold}g`))))) : null;
  const tabs = h('div', { class: 'sx-tabs', role: 'tablist' }, TABS.map(([id, label, ic]) => h('button', { class: S.tab === id ? 'on' : '', type: 'button', role: 'tab', 'aria-selected': String(S.tab === id), onclick: tap(() => { S.tab = id; X.renderCamp(fromBoard); }) }, ico(ic), h('span', {}, label))));
  const keep = $('.sx-camp-scroll'); const y = keep && S.holdScroll !== false ? keep.scrollTop : 0;
  mountAs('camp', h('div', { class: 'sx-split sx-camp' }, h('div', { class: 'sx-viewport' }, topBar(h('div', { class: 'sx-camp-title' }, eyebrow('The fire is warm'), h('h1', {}, 'Camp')))),
    h('div', { class: 'sx-side' },
      h('div', { class: 'sx-sidetop' }, heroChip(hero), btn('Soul Code', () => { const c = X.currentCode(); if (c) X.copyCode(c); }, { kind: 'ghost', icon: 'key', cls: 'compact' })),
      seats, perkPanel, (X.members()[0].tips?.c_first || !Coach.hintsOn() ? coachBox('c_hands') : coachBox('c_first')),
      tabs, h('div', { class: 'sx-camp-scroll' }, body),
      h('div', { class: 'sx-cta' }, btn('To the road', X.showRoadOrBoard, { big: true, icon: 'map', cls: 'wide' })))));
  const sc = $('.sx-camp-scroll'); if (sc && y) sc.scrollTop = y;
  lay('camp');
  SCR.enter('camp', { hero }, `camp:${hero.name}`).then((hd) => { if (hd) { hd.sync?.(hero); } });
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
export function chrome(mute) { const m = $('#mute'); if (m) m.replaceChildren(ico(mute ? 'mute' : 'sound', '', 18)); const hlp = $('#help'); if (hlp && !hlp.querySelector('svg')) hlp.replaceChildren(ico('help', '', 20)); }
