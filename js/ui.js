// Screens and input. Rules live in engine.js, drawing helpers in view.js.
import { h, $, $$, sleep, toast, floater, buzz, modal, closeModal } from './dom.js';
import { burstAt, shake } from './fx.js';
import { sfx, isMuted, setMuted } from './audio.js';
import * as E from './engine.js';
import * as D from './data.js';
import * as SV from './save.js';
import * as V from './view.js';
import * as R from './roads.js';
import * as ST from './story.js';
import { hintsOn, setHints } from './coach.js';
import * as Net from './net.js';
import * as Online from './g3/online.js';
import * as Sess from './session.js';
import * as B3 from './g3/battle3d.js';
import { world } from './g3/world.js';
import * as SCR from './g3/screens.js';
import * as SCRUI from './g3/scrui.js';
import * as TUT from './g3/tutorial.js';
import * as RO from './readout.js';

const S = {
  hero: null, company: null, seat: 0, battle: null, quest: null, sel: new Set(), straight: 'atk', target: 0, busy: false,
  tab: 'forge', lastReport: null, focus: null, rewards: null, timers: [],
};
const fresh = () => E.makeRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
// cls = '' draws the classic web-form look; a class name hands #app to the 3D-scene screens (g3/scrui.js).
function mountAs(cls, ...nodes) {
  S.timers.forEach(clearInterval); S.timers = [];
  (S.cleanups || []).splice(0).forEach((f) => { try { f(); } catch { /* ignore */ } });
  const r = $('#app');
  const y = S.holdScroll ? r.scrollTop : 0;
  r.replaceChildren(...nodes.filter(Boolean));
  r.className = cls ? `hud scr ${cls}` : 'hud';
  r.scrollTop = y;
  if (!cls && !S.holdScroll) { r.classList.remove('rise'); void r.offsetWidth; r.classList.add('rise'); }
}
const mount = (...nodes) => mountAs('', ...nodes);
const membersOf = () => S.company?.members || (S.hero ? [S.hero] : []);
function persist() {
  if (S.net) return Online.persistLocal(); // (the table keeps the hero; this phone only remembers which hints it has shown)
  if (S.practice) return; // the practice battle is never saved
  const hero = S.company?.members?.[0] || S.hero;
  if (!hero) return;
  if (!SV.saveHero(hero)) toast('Could not save. Is browser storage blocked?', 'bad');
}
function concludeRoadEffects() {
  const c = S.company?.campaign || S.hero?.campaign;
  if (!c) return;
  E.spendBlessings(c);
  E.clearAmbush(c);
}
const actOf = (hero) => D.ACTS[(hero.campaign.act - 1) % D.ACTS.length];
const actName = (hero) => { const c = hero.campaign; const cyc = Math.floor((c.act - 1) / D.ACTS.length); return actOf(hero).name + (cyc ? ` · Ascent ${cyc + 1}` : ''); };
const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// ------------------------------------------------------------------ shared pieces
function cmd(kicker, title, sub, onclick, { tone = '', disabled = false, glyph = '' } = {}) {
  return h('button', { class: `cmd ${tone}`, type: 'button', onclick: disabled ? null : () => { sfx.click(); onclick(); }, disabled },
    h('span', { class: 'cmd-rail' }),
    h('span', { class: 'cmd-icon' }, glyph),
    h('span', { class: 'cmd-copy' }, h('span', { class: 't-eyebrow' }, kicker), h('span', { class: 'cmd-title' }, title), h('span', { class: 'cmd-sub' }, sub)),
    h('span', { class: 'cmd-go' }, '›'));
}
function heroChip() {
  const hero = S.hero; const c = D.CLASSES[hero.cls];
  return h('div', { class: 'herochip' }, h('span', { class: 'hc-glyph' }, c.glyph),
    h('div', {}, h('b', {}, hero.name), h('small', {}, `Lv ${hero.level} ${c.name}`)),
    h('div', { class: 'hc-res' }, h('span', { class: 'c-gold' }, `🪙 ${hero.gold}`)));
}
function bodyWrap(board, hero) {
  const c = D.CLASSES[hero.cls];
  return h('div', { class: 'body' },
    h('div', { class: 'body-caption' }, h('span', {}, c.glyph), h('b', {}, hero.name), h('small', {}, 'head · hands · heart · feet')),
    h('div', { class: 'body-stage' },
      V.characterMat(hero),
      board));
}
function xpBar(hero) {
  const need = D.xpToNext(hero.level);
  return h('div', { class: 'xp' }, V.hpBar(hero.level >= D.MAX_LEVEL ? 1 : hero.xp, hero.level >= D.MAX_LEVEL ? 1 : need, { cls: 'xp-bar', label: false }),
    h('small', {}, hero.level >= D.MAX_LEVEL ? 'Max level' : `${hero.xp}/${need} XP`));
}
function banner(text, kind = '') {
  const b = h('div', { class: `banner ${kind}` }, text); document.body.append(b); setTimeout(() => b.remove(), 1500);
}
// First-run coach tips: shown once per hero, remembered in the save.
function tip(key, text) {
  const hero = S.hero; if (!hero) return null;
  hero.tips = hero.tips || {};
  if (hero.tips[key]) return null;
  return h('div', { class: 'tip' }, h('span', { class: 'tip-i' }, '💡'), h('p', {}, text),
    h('button', { class: 'btn btn-ghost small', type: 'button', onclick: (e) => { hero.tips[key] = 1; persist(); e.currentTarget.closest('.tip').remove(); } }, 'Got it'));
}
function section(title, ...kids) { return h('section', { class: 'panel' }, title ? h('div', { class: 't-eyebrow mb' }, title) : null, ...kids); }
function primary(label, onclick, { disabled = false, cls = '' } = {}) {
  return h('button', { class: `btn btn-primary ${cls}`, type: 'button', disabled, onclick: () => { sfx.click(); onclick(); } }, label);
}
function ghost(label, onclick, { disabled = false, cls = '' } = {}) {
  return h('button', { class: `btn btn-ghost ${cls}`, type: 'button', disabled, onclick: () => { sfx.click(); onclick(); } }, label);
}
export function showHowTo() { modal(h('div', {}, V.howToPlay(), h('div', { class: 'row end' }, primary('Got it', () => closeModal())))); }
export function bindChrome() {
  const mute = $('#mute'); const sync = () => { if (world.available || SCRUI.on()) SCRUI.chrome(isMuted()); else mute.textContent = isMuted() ? '🔇' : '🔊'; mute.setAttribute('aria-pressed', String(isMuted())); };
  sync(); mute.onclick = () => { setMuted(!isMuted()); sync(); sfx.click(); };
  $('#help').onclick = () => showHowTo();
  $('#home').onclick = () => { sfx.click(); askHome(); };
  $('#gmenu').onclick = () => { sfx.click(); globalMenu(); };
  setInterval(syncHome, 400); syncHome();
}
// One button on screen (Dave): Home, Rules and Sound live in the menus. Screens with their own Menu (battle, quest board,
// road) add them there; everywhere else a single menu button sits in the top-left corner.
const soundItem = (close) => ghost(`Sound: ${isMuted() ? 'Off' : 'On'}`, () => { setMuted(!isMuted()); SCRUI.chrome?.(isMuted()); close(); toast(isMuted() ? 'Sound off.' : 'Sound on.'); });
function globalMenu() {
  const open = (S.hero || S.company || S.practice) && !S.net;
  const close = modal(h('div', { class: 'form' }, h('h2', {}, 'Menu'),
    h('div', { class: 'col' },
      ghost('Rules', () => { close(); showHowTo(); }),
      ghost(`Hints: ${hintsOn() ? 'On' : 'Off'}`, () => { setHints(!hintsOn()); close(); toast(hintsOn() ? 'Hints on.' : 'Hints off.'); }),
      soundItem(() => close()),
      open ? ghost('Save & go home', () => { close(); askHome(); }) : null,
      S.net ? ghost('Step away (keep my seat)', () => { close(); Online.stepAway(); }) : null,
      S.net ? ghost('Leave this table for good', () => { close(); Online.menu(); }) : null,
      ghost('Close', () => close()))));
}
// The Home button (top corner, beside help and sound): shown whenever a game is open on this phone. Online tables keep
// their own "Leave this phone" (it hands the seat back), so it stays hidden there.
function syncHome() {
  const own = [...document.querySelectorAll('.b3-menu, .sx-menubtn, .screen-menu')].some((el) => el.offsetParent); // this screen has its own Menu
  const g = $('#gmenu'); if (g) g.hidden = own;
}
// "Are you sure?" before going home. The hero is saved; a fight left halfway starts over from the quest board next time.
function askHome() {
  if (!(S.hero || S.company || S.practice) || S.net) return;
  const midFight = !S.practice && S.battle && !S.battle.outcome && S.battle.phase !== 'done' && document.body.classList.contains('in-battle');
  const who = 'Your hero is';
  const [title, text] = S.practice ? ['Leave practice?', 'You can come back to Learn to play any time.']
    : midFight ? ['Leave this fight?', `${who} saved. This fight will not count: when you come back, it starts over from the quest board. Potions you drank stay used.`]
      : ['Go home?', `${who} saved. Tap Continue on the home screen to pick up right where you left off.`];
  const close = modal(h('div', { class: 'form confirm-home' }, h('h2', {}, title), h('p', { class: 'muted' }, text),
    h('div', { class: 'row end' }, ghost('Keep playing', () => close()), primary('Go home', () => { close(); if (document.body.classList.contains('in-battle')) B3.stop(); persist(); showTitle(); }))));
}

// ------------------------------------------------------------------ title
export function showTitle() {
  Net.disconnect();
  S.net = null; S.holdScroll = false; S.practice = null; TUT.closeLessons();
  S.hero = null; S.company = null; S.battle = null; S.busy = false;
  if (SCRUI.on()) return SCRUI.title();
  const saves = SV.listSaves().filter((x) => x.kind !== 'company'); // one-phone companies are gone
  const grid = h('div', { class: 'title-grid', 'aria-hidden': 'true' }, D.SLOTS.map((s) => h('div', { class: `td td-${s} ${['N', 'W', 'E', 'S', 'C'].includes(s) ? 'limb' : ''}` }, h('span', {}, String(1 + Math.floor(Math.random() * 4))))));
  const tick = () => { $$('.td span', grid).forEach((n, i) => { if (Math.random() < 0.35) { n.textContent = String(1 + Math.floor(Math.random() * (i === 4 ? 6 : 4))); n.parentElement.classList.remove('pop'); void n.parentElement.offsetWidth; n.parentElement.classList.add('pop'); } }); };
  const items = [
    h('header', { class: 'title-art' }, grid, h('h1', { class: 'logo' }, 'QUEST', h('span', {}, 'DICE')), h('p', { class: 'tagline' }, 'Roll against the dark.')),
  ];
  const seat = Net.savedSeat();
  if (seat) items.push(cmd('Table', `Rejoin ${seat.code}`, 'This phone still has a seat.', () => Online.resume(), { glyph: '⚔', tone: 'versus' }));
  if (saves.length) {
    items.push(h('div', { class: 't-eyebrow mb' }, 'On this device'));
    items.push(h('nav', { class: 'dock' }, saves.map((x) => {
      const sub = `Level ${x.level} ${D.CLASSES[x.cls].name}`;
      return cmd(`Act ${romans[x.act - 1] || x.act} · Quest ${x.step}`, x.name, sub, () => unlock(x.name, x.kind), { glyph: D.CLASSES[x.cls].glyph, tone: 'solo' });
    })));
  }
  items.push(h('div', { class: 't-eyebrow mb' }, saves.length ? 'More' : 'Begin'));
  items.push(h('nav', { class: 'dock' },
    cmd('01 · Hero', 'Forge a new hero', 'One body of dice. A whole road.', showCreate, { glyph: '🎲', tone: 'tutorial' }),
    cmd('02 · Together', 'Play together', 'Up to six friends, each on their own phone. Each decides at the same time, and the fight runs when every choice is in.', Online.together, { glyph: '⚔', tone: 'versus' }),
    cmd('03 · Soul Code', 'Bring a hero here', 'Paste a code from another device.', showImport, { glyph: '🔑' })));
  items.push(h('div', { class: 'row center' }, ghost('Rules', showHowTo)));
  mount(...items);
  S.timers.push(setInterval(tick, 1400));
}
function adopt(saved) {
  saved.campaign = saved.campaign || {};
  saved.campaign.nemeses = saved.campaign.nemeses || [];
  saved.campaign.blessings = saved.campaign.blessings || [];
  saved.campaign.chronicle = saved.campaign.chronicle || [];
  S.company = { kind: 'solo', name: saved.name, campaign: saved.campaign, members: [saved] };
  S.hero = saved;
  S.seat = 0;
}
function unlock(name, kind = 'hero') {
  const pw = h('input', { type: 'password', class: 'input', placeholder: 'Password', autocomplete: 'current-password', 'aria-label': 'Password' });
  const msg = h('p', { class: 'form-msg' });
  const go = async () => {
    try {
      const saved = await SV.openHero(name, pw.value);
      adopt(saved);
      closeModal(); sfx.coin(); showRoadOrBoard();
    } catch (e) { msg.textContent = e.message; sfx.error(); }
  };
  pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  const close = modal(h('div', { class: 'form' }, h('h2', {}, `Welcome back, ${name}`), h('p', { class: 'muted' }, 'Enter your password to open this hero.'), pw, msg,
    h('div', { class: 'row end' }, ghost('Soul Code', () => { const c = SV.exportCode(name); if (c) copyCode(c); }), ghost('Cancel', () => close()), primary('Open', go)),
    h('p', { class: 'fine' }, h('a', { href: '#', onclick: (e) => { e.preventDefault(); if (confirm(`Delete ${name} forever from this device?`)) { SV.deleteHero(name); close(); showTitle(); } } }, 'Delete this hero'))));
  setTimeout(() => pw.focus(), 50);
}
function currentCode() {
  if (S.hero) return SV.exportCode(S.hero.name);
  return null;
}
function copyCode(code) {
  const done = () => toast('Soul Code copied. Keep it safe.', 'good');
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done, () => showCode(code)); else showCode(code);
}
function showCode(code) {
  const ta = h('textarea', { class: 'input code', readonly: true, rows: 6 }, code);
  const close = modal(h('div', { class: 'form' }, h('h2', {}, 'Your Soul Code'), h('p', { class: 'muted' }, 'Copy this and paste it on another device. It carries this save and its password.'), ta, h('div', { class: 'row end' }, primary('Done', () => close()))));
  setTimeout(() => ta.select(), 50);
}
function showImport() {
  const ta = h('textarea', { class: 'input code', rows: 5, placeholder: 'QD1.… or QD2.…' });
  const msg = h('p', { class: 'form-msg' });
  const go = (overwrite = false) => {
    try { const name = SV.importCode(ta.value, { overwrite }); closeModal(); toast(`${name} has arrived.`, 'good'); sfx.coin(); showTitle(); }
    catch (e) {
      if (e.code === 'EXISTS') { msg.textContent = `${e.name} already lives on this device.`; msg.append(' ', h('a', { href: '#', onclick: (ev) => { ev.preventDefault(); go(true); } }, 'Replace them')); } else { msg.textContent = e.message; sfx.error(); }
    }
  };
  modal(h('div', { class: 'form' }, h('h2', {}, 'Bring a hero here'), h('p', { class: 'muted' }, 'Paste a Soul Code exported from another device.'), ta, msg, h('div', { class: 'row end' }, ghost('Cancel', () => closeModal()), primary('Import', () => go(false)))));
}

// ------------------------------------------------------------------ create
function showCreate() {
  if (SCRUI.on()) return SCRUI.create();
  let cls = 'knight';
  const name = h('input', { class: 'input', maxlength: 16, placeholder: 'Hero name', 'aria-label': 'Hero name', autocomplete: 'off' });
  const pw = h('input', { class: 'input', type: 'password', placeholder: 'Password (3+ characters)', 'aria-label': 'Password', autocomplete: 'new-password' });
  const msg = h('p', { class: 'form-msg' });
  const detail = h('div', { class: 'panel class-detail' });
  const grid = h('div', { class: 'class-grid' });
  const paint = () => {
    grid.replaceChildren(...Object.entries(D.CLASSES).map(([id, c]) => h('button', { type: 'button', class: `class-pick ${id === cls ? 'on' : ''}`, onclick: () => { cls = id; sfx.select(); paint(); } },
      c.img ? h('img', { src: c.img, alt: c.name, draggable: 'false', decoding: 'async' }) : h('span', {}, c.glyph), h('b', {}, c.name))));
    const c = D.CLASSES[cls];
    detail.replaceChildren(h('p', {}, c.blurb),
      h('div', { class: 'stats' }, h('span', {}, `❤ ${c.hp} HP`), h('span', {}, `⚡ d${c.feet || 4} initiative`)),
      h('p', { class: 'fine' }, 'Wields: ', c.weapons.map((w) => D.WEAPONS[w].name).join(' + ')),
      h('div', { class: 'cardlist' }, c.cards.filter((k) => (k.unlock ?? 1) <= 1).map((k) => h('div', { class: 'mini-card' }, h('b', {}, k.name), h('small', {}, `${k.cost}✦ · ${k.text}`)))));
  };
  paint();
  const go = async () => {
    const n = name.value.trim().replace(/\s+/g, ' ');
    if (n.length < 2) { msg.textContent = 'Give your hero a name (2–16 characters).'; sfx.error(); return; }
    if (pw.value.length < 3) { msg.textContent = 'Choose a password of at least 3 characters.'; sfx.error(); return; }
    if (!SV.canSave()) { msg.textContent = 'Saving is blocked in this browser, so a hero could not be kept.'; sfx.error(); return; }
    try {
      const hero = E.newHero({ name: n, cls });
      await SV.createSave(hero, pw.value);
      adopt(hero, 'hero'); sfx.level(); showRoadOrBoard();
    } catch (e) { msg.textContent = e.message; sfx.error(); }
  };
  mount(h('div', { class: 'topline' }, ghost('‹ Back', showTitle, { cls: 'small' }), h('h2', {}, 'Forge a hero')),
    section('Name & password', name, pw, h('p', { class: 'fine' }, 'The password only guards this hero on this device. Choose something you will remember.')),
    section('Class', grid, detail), msg, primary('Begin the campaign', go, { cls: 'wide' }));
}

// ------------------------------------------------------------------ quest board
function showBoard() {
  if (SCRUI.on()) return SCRUI.board();
  const hero = membersOf()[0]; S.hero = hero; const c = hero.campaign; const quests = E.questsFor(hero); persist();
  const blessings = (c.blessings || []).filter((b) => (b.fights ?? 1) > 0);
  const ambush = c.ambush?.length;
  const path = h('div', { class: 'path' }, Array.from({ length: D.QUESTS_PER_ACT }, (_, i) => {
    const n = i + 1; const st = n < c.step ? 'done' : n === c.step ? 'now' : '';
    const kind = D.stepKind(actOf(hero), n);
    return h('div', { class: `node ${st} ${kind === 'boss' ? 'boss' : kind === 'elite' ? 'elite' : ''}` }, kind === 'boss' ? '👑' : kind === 'elite' ? '☠' : n < c.step ? '✓' : String(n));
  }));
  mount(
    h('div', { class: 'topline' }, heroChip(), ghost('Menu', menu, { cls: 'small screen-menu' })),
    xpBar(hero),
    h('header', { class: 'act' }, h('div', { class: 't-eyebrow' }, `Act ${romans[c.act - 1] || c.act} · Quest ${c.step} of ${D.QUESTS_PER_ACT}`), h('h2', {}, actName(hero)), h('p', { class: 'muted' }, actOf(hero).tag)),
    path,
    blessings.length ? h('p', { class: 'boon' }, blessings.map((b) => b.text).join(' · ')) : null,
    ambush ? h('p', { class: 'warn' }, 'An ambush is waiting on whichever road you take.') : null,
    tip('board', 'One fight waits on this stretch of road. Win it to walk on; the boss is at the end of the act.'),
    h('div', { class: 't-eyebrow mb' }, quests[0]?.kind === 'boss' ? 'The road ends here' : 'The road ahead'),
    h('div', { class: 'quests' }, quests.map(questCard)),
    h('div', { class: 'row' }, ghost('⛺ Visit camp', () => showCamp({ fromBoard: true })), ghost('My hero', () => { S.tab = 'hero'; showCamp({ fromBoard: true }); })));
}
function groupNames(ids) {
  const n = {}; ids.forEach((id) => { n[id] = (n[id] || 0) + 1; });
  return Object.entries(n).map(([id, c]) => `${D.MONSTERS[id].name}${c > 1 ? ` ×${c}` : ''}`).join(' + ');
}
function questCard(q) {
  const total = q.enemies.reduce((a, id) => a + Math.round(D.MONSTERS[id].hp * q.hpMult), 0);
  const tag = q.kind === 'boss' ? 'BOSS' : q.kind === 'elite' ? 'ELITE' : 'BATTLE';
  return h('button', { class: `qcard ${q.kind} ${q.perilous ? 'perilous' : ''}`, type: 'button', onclick: () => { sfx.click(); startQuest(q); } },
    h('div', { class: 'qglyphs' }, q.enemies.map((id) => h('span', {}, D.MONSTERS[id].glyph))),
    h('div', { class: 'qbody' }, h('span', { class: 't-eyebrow' }, tag), h('b', {}, q.name), h('small', {}, groupNames(q.enemies)), h('small', { class: 'muted' }, `~${total} total HP · ${q.enemies.reduce((a, id) => a + Math.round(D.MONSTERS[id].xp * q.rewardMult), 0)} XP`)),
    h('span', { class: 'cmd-go' }, '›'));
}
function menu() {
  if (S.net) return Online.menu();
  const close = modal(h('div', { class: 'form' }, h('h2', {}, S.company?.name || S.hero?.name || 'Menu'),
    h('div', { class: 'col' },
      ghost('The story so far', () => { close(); showStorySoFar(); }),
      ghost('Rules', () => { close(); showHowTo(); }),
      ghost(`Hints: ${hintsOn() ? 'On' : 'Off'}`, () => { setHints(!hintsOn()); close(); toast(hintsOn() ? 'Hints on.' : 'Hints off.'); }),
      soundItem(() => close()),
      ghost('Copy Soul Code', () => { const c = currentCode(); if (c) copyCode(c); }),
      ghost('Save & go home', () => { close(); askHome(); }),
      ghost('Close', () => close()))));
}

function showRoadOrBoard() {
  const hero = membersOf()[0];
  const beat = hero && !S.net && !S.practice ? ST.pending(hero.campaign)[0] : null; // a story beat comes first
  if (beat) return showStory(beat);
  if (hero && R.roadIsOpen(hero)) showRoad();
  else {
    const place = hero && !S.net && !S.practice ? E.questsFor(hero)[0]?.place : null;
    const arrive = place ? ST.pending(hero.campaign, place)[0] : null;
    if (arrive) return showStory(arrive);
    showBoard();
  }
}
function showStory({ id, act }, next = showRoadOrBoard) {
  const hero = membersOf()[0]; const b = ST.beat(id, act);
  const done = () => { ST.markSeen(hero.campaign, id, act); persist(); next(); };
  if (SCRUI.on()) return SCRUI.story(b, done);
  const close = modal(h('div', { class: 'form' }, h('small', { class: 't-eyebrow' }, b.kicker), h('h2', {}, b.title), ...b.text.map((t) => h('p', {}, t)),
    h('div', { class: 'row end' }, primary('Continue', () => { close(); done(); }))), { dismiss: false });
}
// The story so far (board menu): every beat up to where the campaign stands.
function showStorySoFar() {
  const hero = membersOf()[0]; const list = ST.storySoFar(hero?.campaign);
  modal(h('div', { class: 'form story-so-far' }, h('h2', {}, 'The story so far'),
    ...list.map((b) => h('section', { class: 'ssf-beat' }, h('small', {}, b.kicker), h('h3', {}, b.title), ...b.text.map((t) => h('p', {}, t)))),
    h('div', { class: 'row end' }, primary('Close', () => closeModal()))));
}
function showRoad() {
  if (SCRUI.on()) return SCRUI.road();
  const members = membersOf();
  const hero = members[0];
  const ev = R.ensureRoad(hero, members);
  persist();
  mount(
    h('div', { class: 'topline' }, heroChip(), ghost('Menu', menu, { cls: 'small screen-menu' })),
    h('article', { class: 'road' },
      h('div', { class: 'road-kicker' }, ev.kicker),
      h('h2', {}, ev.title),
      h('p', { class: 'road-tell' }, ev.tell)),
    h('div', { class: 't-eyebrow mb' }, 'What do you do?'),
    h('div', { class: 'quests' }, ev.choices.map((ch) => h('button', {
      class: 'qcard road-choice', type: 'button', disabled: !ch.ok,
      onclick: () => {
        const res = R.chooseRoad(hero, members, ch.id);
        if (!res) { sfx.error(); toast(ch.ok ? 'The road will not take that.' : 'You cannot afford that.'); return; }
        sfx.card(); persist(); showRoadResult(res);
      },
    }, h('div', { class: 'qbody' }, h('b', {}, ch.label), h('small', {}, ch.hint)), h('span', { class: 'cmd-go' }, '›')))),
    tip('road', 'The computer runs the road the way it runs the monsters. It knows your names. A choice can pay you, wound you, or change the next fight. Reloading before you choose shows the same scene.'));
}
function showRoadResult(res) {
  if (SCRUI.on()) return SCRUI.roadResult(res);
  mount(
    h('div', { class: 'topline' }, heroChip(), ghost('Menu', menu, { cls: 'small screen-menu' })),
    h('article', { class: 'road' },
      h('div', { class: 'road-kicker' }, 'The road answers'),
      h('h2', {}, res.title),
      h('p', { class: 'road-tell' }, res.text)),
    primary('Onward', showBoard, { cls: 'wide big' }));
}

// ------------------------------------------------------------------ battle: reset
function startQuest(q) {
  if (S.net) return Online.startQuest(q);
  const members = membersOf();
  const quest = E.withAmbush(q, members[0].campaign);
  S.quest = quest;
  S.battle = members.length > 1 ? E.newPartyBattle(members, quest, fresh()) : E.newBattle(members[0], quest, fresh(), 1);
  S.hero = members[0];
  S.lastReport = null; S.sel.clear(); S.target = 0; S.focus = null; S.straight = 'atk';
  RO.reset();
  if (world.available && !S.net) { SCR.release(); quest.seed = E.hashSeed(members[0].campaign.seed, quest.id); B3.start(battleCtx()); return; }
  renderReset();
}
// What the 3D battle needs from this module.
// battleCtx().portrait: the monster sheet's picture, from the front; four-legged monsters turned a little so the face and body both show
function battleCtx() {
  if (S.net) return { S, net: true, menu: Online.menu, persist() {}, banner, showVictory: () => { B3.stop(); Online.afterBattle(); }, defeat: () => { B3.stop(); Online.afterBattle(); } };
  if (S.practice) return { S, menu: battleMenu, persist, banner, tut: S.practice.guide, showVictory: () => { B3.stop(); TUT.showDone(true); }, defeat: () => { B3.stop(); TUT.showDone(false); } };
  return { S, menu: battleMenu, persist, banner, showVictory: () => { B3.stop(); showVictory(); }, defeat: (r) => { B3.stop(); defeat(r); } };
}
// Learn to play: the practice battle. One goblin, the first roll and reroll set by the guide (see g3/tutorial.js).
function practice({ hero, quest, guide }) {
  S.practice = { guide }; S.company = null; S.hero = hero; S.net = null;
  S.quest = quest;
  S.battle = E.newBattle(hero, quest, fresh(), 1);
  S.battle.script = { rolls: [{ NW: 3, N: 2, W: 4, C: 4, E: 1, SW: 3, S: 3 }], rerolls: [{ E: 4 }] };
  S.battle.enemies[0].intent = { n: 'Slash', v: 'strike', f: 2, m: 1 }; // a plain hit to read in round 1
  S.lastReport = null; S.sel.clear(); S.target = 0; S.focus = null; S.straight = 'atk';
  RO.reset();
  if (world.available) { SCR.release(); B3.start(battleCtx()); return; }
  S.practice.guide = null; renderReset(); // no 3D: the plain board, without the spotlight guide
}
function refresh() { if (S.battle.phase === 'shape') renderBattle(); else renderReset(); }
function spendHeal() {
  const b = S.battle; const hp = b.hp;
  const ok = E.healSpend(b);
  if (!ok) { sfx.error(); toast(b.hp >= b.maxHp ? 'You are at full health.' : 'Not enough ✦ Magic.'); return; }
  sfx.heal(); refresh(); floater($('.hero-hp'), `+${b.hp - hp}`, 'heal');
}
function enemyTelegraph(e) {
  const info = V.intentInfo(e);
  return h('div', { class: `tele ${info.tone}` },
    h('div', { class: 'tele-portrait' }, e.glyph),
    h('div', { class: 'tele-copy' }, h('b', {}, e.name), h('small', { class: 'muted' }, `${Math.ceil(e.hp)}/${e.maxHp} HP`),
      h('div', { class: `intent big ${info.tone}` }, h('span', { class: 'iicon' }, info.icon), h('div', { class: 'itext' }, h('b', {}, info.title), h('small', {}, info.text)))));
}
function renderReset() {
  if (S.net) return; // (the shared table has its own screens: g3/online.js)
  const b = S.battle; const hero = S.hero; const alive = b.enemies.filter((e) => e.hp > 0);
  const rep = S.lastReport;
  const lines = rep ? V.reportLines(rep, b) : [{ kind: 'meh', text: `${S.quest.name}. ${alive.map((e) => e.name).join(' and ')} ${alive.length > 1 ? 'block' : 'blocks'} the way.` }];
  const wind = alive.filter((e) => e.intent.slam);
  const cards = E.cardsOf(hero);
  const readout = RO.view();
  mount(
    h('div', { class: 'topline' }, h('div', {}, h('div', { class: 't-eyebrow' }, 'Reset'), h('h2', {}, `Round ${b.round}`)), ghost('Menu', battleMenu, { cls: 'small' })),
    readout || section(rep ? `Round ${rep.round} result` : 'The fight begins', h('ul', { class: 'log' }, lines.map((l) => h('li', { class: l.kind }, l.text)))),
    tip('reset', 'This is the Reset screen. Monsters roll first and show you what they will do this round, so you can plan. Spend Magic (✦) here to heal or recharge cards, then roll your dice.'),
    h('div', { class: 't-eyebrow mb' }, 'The monsters have shown their hand'),
    h('div', { class: 'teles' }, alive.map(enemyTelegraph)),
    wind.length ? h('p', { class: 'warn' }, `⚠ A Slam is coming: ${wind.map((e) => e.name).join(', ')}. Brace with block, or burst it down.`) : null,
    section('You',
      h('div', { class: 'hero-hp-row' }, h('span', { class: 'c-heal' }, '❤'), h('div', { class: 'hero-hp' }, V.hpBar(b.hp, b.maxHp, { cls: 'hero-bar' })), h('span', { class: 'magic-badge' }, `✦ ${b.magic}`)),
      h('div', { class: 'row' },
        ghost(`✚ Heal +${E.healAmountOf(hero)} HP · ${E.healCostOf(hero)}✦`, spendHeal, { disabled: b.magic < E.healCostOf(hero) || b.hp >= b.maxHp })),
      cards.length ? h('div', { class: 'cardlist' }, cards.map((k) => h('div', { class: `mini-card ${b.used[k.id] ? 'spent' : ''}` },
        h('b', {}, k.name), h('small', {}, `${k.cost}✦ · ${k.text}`),
        b.used[k.id] ? ghost(`Recharge · ${D.RECHARGE_COST}✦`, () => { if (E.recharge(b, k.id)) { sfx.magic(); renderReset(); } else { sfx.error(); toast('Not enough ✦ Magic.'); } }, { disabled: b.magic < D.RECHARGE_COST, cls: 'small' }) : h('em', {}, 'Ready')))) : null),
    bodyWrap(h('div', { class: 'board board-empty', 'aria-hidden': 'true' }), hero),
    primary('🎲 Roll the dice', rollDice, { cls: 'wide big' }));
}
async function rollDice() {
  if (S.busy) return; const b = S.battle;
  E.startRoll(b); S.sel.clear(); S.focus = null; S.straight = 'atk';
  RO.noteBounds(b.board);
  sfx.roll(); renderBattle(); await flicker(D.SLOTS);
  if (b.boundNow) { toast(`${b.boundNow} ${b.boundNow > 1 ? 'dice' : 'die'} held in a tangle.`, 'bad'); sfx.hurt(); }
}
// Dice tumble: flicker random faces, then settle on the truth.
async function flicker(slots) {
  S.busy = true; const b = S.battle; const hero = S.hero;
  const els = slots.map((s) => $(`.die[data-slot="${s}"]`));
  els.forEach((el) => el?.classList.add('rolling'));
  const ticks = 9;
  for (let t = 0; t < ticks; t++) {
    slots.forEach((s, i) => { const el = els[i]; if (!el || t < i % 3) return; V.paintDie(el, hero, s, 1 + Math.floor(Math.random() * (s === 'C' ? 6 : (D.ROLE[s] === 'weapon' ? 4 : E.sidesOf(hero, s))))); });
    await sleep(55 + t * 6);
  }
  slots.forEach((s, i) => { const el = els[i]; if (!el) return; V.paintDie(el, hero, s, b.board[s].v); el.classList.remove('rolling'); el.classList.add('landed'); setTimeout(() => el.classList.remove('landed'), 400); });
  sfx.settle(2); S.busy = false; updateLive();
}

// ------------------------------------------------------------------ battle: shape & lock
function battleMenu() {
  if (S.net) return Online.menu();
  const close = modal(h('div', { class: 'form' }, h('h2', {}, 'Battle menu'),
    h('div', { class: 'col' }, ghost('Rules', () => { close(); showHowTo(); }),
      ghost(`Hints: ${hintsOn() ? 'On' : 'Off'}`, () => { setHints(!hintsOn()); close(); toast(hintsOn() ? 'Hints on.' : 'Hints off.'); }),
      soundItem(() => close()),
      S.practice ? ghost('Leave practice', () => { close(); askHome(); }) : ghost('Retreat (lose 15% gold)', () => { close(); B3.stop(); defeat(true); }),
      S.practice ? null : ghost('Go home', () => { close(); askHome(); }), ghost('Back to the fight', () => close()))));
}
function toggle(slot) {
  if (S.busy) return; const b = S.battle; const info = E.rerollInfo(b);
  S.focus = slot;
  if (b.board[slot].bound) { sfx.error(); toast('That die is tangled. It cannot be rerolled this round.', 'bad'); updateLive(); return; }
  if (S.sel.has(slot)) S.sel.delete(slot);
  else { if (info.kind === 'none') { sfx.error(); toast('No reroll actions left.'); } else if (S.sel.size >= info.dice) { sfx.error(); toast(`You can reroll up to ${info.dice} dice at a time.`); } else { S.sel.add(slot); sfx.select(); } }
  updateLive();
}
async function doReroll() {
  if (S.busy) return; const b = S.battle; const slots = [...S.sel];
  if (!E.canReroll(b, slots)) { sfx.error(); toast(slots.length ? 'Not enough ✦ Magic for that.' : 'Tap the dice you want to reroll.'); return; }
  E.reroll(b, slots); S.sel.clear(); sfx.roll(); renderBattle(); await flicker(slots);
}
function doNudge(dir) { const b = S.battle; if (S.busy) return; if (!E.nudge(b, dir)) { sfx.error(); toast(E.nudgedThisRound(b) ? 'You already turned the heart this round.' : b.magic < D.NUDGE_COST ? 'Not enough ✦ Magic.' : 'The heart cannot go that way.'); return; } if (isParty()) E.commitFighter(b); sfx.magic(); renderBattle(); }
function doCard(id) { const b = S.battle; if (S.busy) return; if (!E.playCard(b, id)) { sfx.error(); toast('Not enough ✦ Magic, or already spent.'); return; } sfx.card(); renderBattle(); buzz(20); }

// Re-render only the bits that depend on selection/forecast so dice do not rebuild mid-animation.
function updateLive() {
  if (S.battle?.phase !== 'shape') return;
  const live = $('#live'); if (!live) return;
  $$('.die').forEach((el) => { const s = el.dataset.slot; const on = S.sel.has(s); el.classList.toggle('sel', on); el.setAttribute('aria-pressed', String(on)); el.classList.toggle('focus', S.focus === s); });
  const b = S.battle; const info = E.rerollInfo(b);
  const btn = $('#reroll'); if (btn) { btn.textContent = rerollLabel(info); btn.disabled = S.busy || !E.canReroll(b, [...S.sel]); }
  const f = $('#focus'); if (f) f.textContent = S.focus ? V.describeDie(S.hero, S.focus, b.board[S.focus].v) : 'Tap dice to select them for a reroll. Tap a monster to choose your target.';
}
function rerollLabel(info) {
  if (info.kind === 'none') return 'No rerolls left';
  const n = S.sel.size; const cost = info.perDie * n;
  return n ? `Reroll ${n} ${n === 1 ? 'die' : 'dice'} · ${cost ? `${cost}✦` : 'free'}` : `Reroll up to ${info.dice} · ${info.perDie ? `${info.perDie}✦ each` : 'free'}`;
}
function renderBattle() {
  if (S.net) return; // (the shared table has its own screens: g3/online.js)
  const b = S.battle;
  if (b.phase !== 'shape') return renderReset();
  const hero = S.hero;
  if (!b.enemies[S.target] || b.enemies[S.target].hp <= 0) S.target = Math.max(0, b.enemies.findIndex((e) => e.hp > 0));
  const ev = E.evaluate(hero, b.board, { straight: S.straight });
  const info = E.rerollInfo(b); const two = E.isTwoHanded(hero);
  const board = h('div', { class: `board ${two ? 'is2h' : ''}` }, D.SLOTS.map((slot) => V.dieEl(hero, slot, b.board[slot], {
    selected: S.sel.has(slot), onclick: () => toggle(slot), twohand: two && D.ROLE[slot] === 'weapon',
  })));
  for (const t of ev.triples || []) t.slots.forEach((s) => $(`[data-slot="${s}"]`, board).classList.add('syn'));
  const notes = V.synergyNotes(ev, b.mods);
  const cards = E.cardsOf(hero);
  const pips = h('div', { class: 'pips', 'aria-label': 'Reroll actions left' }, Array.from({ length: D.REROLL_ACTIONS }, (_, i) => h('i', { class: i < b.actionsLeft ? 'on' : '' })), b.freeActions.length ? h('b', { class: 'free' }, `+${b.freeActions.length} free`) : null);
  const lockLabel = '🔒 Lock in';
  mount(
    h('div', { class: 'topline' }, h('div', {}, h('div', { class: 't-eyebrow' }, S.quest.name), h('h2', {}, `Round ${b.round}`)), ghost('Menu', battleMenu, { cls: 'small' })),
    h('div', { class: 'ecards', 'data-n': b.enemies.filter((e) => e.hp > 0).length }, b.enemies.map((e, i) => V.enemyCard(e, { targeted: i === S.target && e.hp > 0, onclick: () => { if (S.busy) return; S.target = i; if (isParty()) b.fighters[b.active].target = i; sfx.select(); renderBattle(); } }))),
    h('div', { class: 'hero-hp-row' }, h('span', { class: 'c-heal' }, '❤'), h('div', { class: 'hero-hp' }, V.hpBar(b.hp, b.maxHp, { cls: 'hero-bar' })), h('span', { class: 'magic-badge' }, `✦ ${b.magic}`)),
    b.boundNow || b.chainedNow ? h('p', { class: 'warn' }, b.chainedNow ? `⛓ ${b.chainedNow} ${b.chainedNow > 1 ? 'dice keep' : 'die keeps'} last round's face.` : `⛓ ${b.boundNow} of your dice ${b.boundNow > 1 ? 'are' : 'is'} tangled and cannot be rerolled.`) : null,
    b.hushedNow ? h('p', { class: 'warn' }, '♪ Your heart is hushed: no amp, no colour bonus, and it cannot finish a triple.') : null,
    h('div', { id: 'live' },
      bodyWrap(board, hero),
      RO.view(),
      V.forecastEl(ev, b.mods),
      h('div', { class: 'notes' }, notes.map((n) => h('span', { class: `note ${n.kind}` }, n.text))),
      h('p', { id: 'focus', class: 'focus' }, S.focus ? V.describeDie(hero, S.focus, b.board[S.focus].v) : 'Tap dice to select them for a reroll. Tap a monster to choose your target.')),
    h('div', { class: 'actions' },
      h('div', { class: 'row between' }, pips, h('div', { class: 'row tight' },
        ghost('♥ ▼', () => doNudge(-1), { cls: 'small', disabled: b.magic < D.NUDGE_COST || b.board.C.v <= 1 }), ghost('♥ ▲', () => doNudge(1), { cls: 'small', disabled: b.magic < D.NUDGE_COST || b.board.C.v >= 6 }),
        ghost(`✚ ${E.healCostOf(hero)}✦`, spendHeal, { cls: 'small', disabled: b.magic < E.healCostOf(hero) || b.hp >= b.maxHp }))),
      h('button', { id: 'reroll', class: 'btn btn-buy wide', type: 'button', onclick: doReroll, disabled: !E.canReroll(b, [...S.sel]) }, rerollLabel(info))),
    cards.length ? h('div', { class: 'cardbar' }, cards.map((k) => h('button', { class: `cardbtn ${b.used[k.id] ? 'spent' : ''}`, type: 'button', disabled: b.used[k.id] || b.magic < k.cost, onclick: () => doCard(k.id) }, h('b', {}, k.name), h('span', {}, `${k.cost}✦`), h('small', {}, b.used[k.id] ? 'spent' : k.text)))) : null,
    tip('shape', 'Tap up to 3 dice to reroll them. The first reroll is free; more cost ✦. The chips show exactly what you will get. Red weapon faces attack, blue ones block. Press the Lock-in button when you are happy.'),
    ev.straight ? h('div', { class: 'straight' }, h('span', {}, `★ ${ev.straight}-straight worth ${ev.straightBonus}`), h('div', { class: 'seg' },
      h('button', { type: 'button', class: S.straight === 'atk' ? 'on' : '', onclick: () => { S.straight = 'atk'; renderBattle(); } }, '⚔ Attack'),
      h('button', { type: 'button', class: S.straight === 'gold' ? 'on' : '', onclick: () => { S.straight = 'gold'; renderBattle(); } }, '🪙 Gold'))) : null,
    primary(lockLabel, lockIn, { cls: 'wide big lock' }));
  updateLive();
}

// ------------------------------------------------------------------ resolve
async function lockIn() {
  if (S.busy) return;
  const b = S.battle; S.busy = true; sfx.lock(); buzz(30);
  $('.board')?.classList.add('locked'); $$('.die').forEach((d) => d.classList.remove('sel'));
  const ev = E.evaluate(S.hero, b.board, { straight: S.straight });
  if (ev.offense3 || ev.defense3 || ev.straight) setTimeout(() => { sfx.synergy(); banner(ev.triples?.length ? `${ev.triples[0].name.toUpperCase()}!  +10` : `${ev.straight}-STRAIGHT!`, 'gold'); }, 120);
  const target = S.target; const rep = E.resolve(b, { target, straight: S.straight }); S.lastReport = rep;
  RO.record(rep, b);
  await sleep(450);
  const tEl = $(`.ecard[data-uid="${rep.targetUid}"]`);
  if (rep.dealt > 0) { sfx.hit(); floater(tEl, `−${rep.dealt}`, 'dmg'); burstAt(tEl, '#ff8a7a', 22); shake(0.6); tEl?.classList.add('hit'); }
  else { sfx.block(); floater(tEl, rep.guarded ? 'Guarded' : '0', 'meh'); }
  if (rep.T.pierce && rep.dealt > 0) floater(tEl, `◆ ${rep.T.pierce}`, 'pierce');
  for (const e of b.enemies) { const bar = $(`.ecard[data-uid="${e.uid}"] .bar-fill`); if (bar) bar.style.width = `${Math.max(0, (e.hp / e.maxHp) * 100)}%`; if (e.hp <= 0) $(`.ecard[data-uid="${e.uid}"]`)?.classList.add('dead'); }
  await sleep(650);
  const hpEl = $('.hero-hp');
  const bar = $('.hero-bar .bar-fill'); if (bar) bar.style.width = `${(b.hp / b.maxHp) * 100}%`;
  if (rep.taken > 0) { sfx.hurt(); floater(hpEl, `−${rep.taken}`, 'hurt'); burstAt(hpEl, '#ff7a1a', 16); shake(rep.taken >= 8 ? 1.3 : 0.8); buzz(60); }
  else if (rep.acts.some((a) => a.d > 0 || a.mag > 0)) { sfx.block(); floater(hpEl, 'Blocked!', 'block'); }
  if (rep.absorbed > 0 && rep.taken > 0) floater(hpEl, `🛡 ${rep.absorbed}`, 'block');
  if (rep.healed) { sfx.heal(); floater(hpEl, `+${rep.healed}`, 'heal'); }
  if (rep.raged.length) { banner('ENRAGED!', 'bad'); sfx.rage(); shake(1.6); }
  if (rep.acts.some((a) => a.v === 'charge' && !a.cancelled)) sfx.windup();
  await sleep(rep.raged.length ? 1100 : 800);
  S.busy = false; S.sel.clear(); S.focus = null;
  if (b.outcome === 'victory') showVictory(); else if (b.outcome === 'defeat') defeat(false); else renderReset();
}

// ------------------------------------------------------------------ victory / defeat
function showVictory() {
  const b = S.battle; const hero = S.hero; const r = E.battleRewards(b);
  const place = S.quest?.place;
  E.recordFled(hero.campaign, b);
  ST.applyPlaceVictory(hero.campaign, place);
  const winBeat = ST.pendingVictory(hero.campaign, place);
  const lvBefore = hero.level;
  hero.gold = Math.max(0, hero.gold + r.gold); hero.stats.goldEarned += Math.max(0, r.gold); hero.stats.battles++;
  E.gainXp(hero, r.xp);
  const points = E.pointsOf(b); E.recordBattle(hero, { points, heroes: 1, won: true });
  const quest = S.quest;
  concludeRoadEffects();
  E.advanceCampaign(hero); persist();
  S.rewards = { ...r, points, lvBefore, levels: hero.level - lvBefore, drops: r.drops, picked: null, quest, offer: null };
  sfx.win(); if (hero.level > lvBefore) setTimeout(sfx.level, 700);
  if (winBeat) return showStory({ id: winBeat.id, act: winBeat.act }, renderVictory);
  renderVictory();
}
function nextPerkOffer() { const hero = S.hero; if (hero.pendingPerks > 0 && !S.rewards.offer) S.rewards.offer = E.offerPerks(hero, fresh()); }
function renderVictory() {
  if (SCRUI.on() && world.battle) return SCRUI.victory();
  const R = S.rewards; const hero = S.hero; nextPerkOffer();
  const perks = R.offer ? h('section', { class: 'panel glow' }, h('div', { class: 't-eyebrow mb' }, `Level up! Choose a perk${hero.pendingPerks > 1 ? ` (${hero.pendingPerks} to pick)` : ''}`),
    h('div', { class: 'perks' }, R.offer.map((id) => h('button', { class: 'perk', type: 'button', onclick: () => { E.takePerk(hero, id); R.offer = null; sfx.level(); persist(); renderVictory(); } }, h('b', {}, D.PERKS[id].name), h('small', {}, D.PERKS[id].text), h('i', {}, `You have ${hero.perks.filter((p) => p === id).length}/${D.PERKS[id].max}`))))) : null;
  const full = E.bagFull(hero); const after = () => { sfx.coin(); persist(); renderVictory(); };
  const loot = R.picked == null ? h('section', { class: 'panel' }, h('div', { class: 't-eyebrow mb' }, `Choose your spoils · pack ${hero.bag.length}/${D.BAG_MAX}`),
    full ? h('div', { class: 'cardlist' }, hero.bag.map((it) => h('div', { class: 'mini-card' }, h('b', {}, `${D.tierName(it)} ${D.WEAPONS[it.id].name}`), primary(`Sell ${E.sellValue(it)}`, () => { E.sellItem(hero, it.uid); after(); }, { cls: 'small' })))) : null,
    h('div', { class: 'loot' }, R.drops.map((inst, i) => V.weaponCard(inst, { actions: [
      primary(full ? 'Pack full' : 'Take', () => { if (!E.takeDrop(hero, inst)) return; R.picked = i; R.sold = false; after(); }, { cls: 'small', disabled: full }),
      primary(`Sell ${E.sellValue(inst)}`, () => { E.sellDrop(hero, inst); R.picked = i; R.sold = true; after(); }, { cls: 'small' }),
    ] }))))
    : h('section', { class: 'panel' }, h('p', { class: 'muted' }, R.sold ? `You sold the ${D.tierName(R.drops[R.picked])} ${D.WEAPONS[R.drops[R.picked].id].name} for ${E.sellValue(R.drops[R.picked])} gold.` : `You took the ${D.tierName(R.drops[R.picked])} ${D.WEAPONS[R.drops[R.picked].id].name}. It waits in your pack.`));
  const ready = !R.offer && hero.pendingPerks === 0 && R.picked != null;
  mount(
    h('header', { class: 'victory' }, h('div', { class: 't-eyebrow' }, R.quest.name), h('h1', {}, 'Victory'), h('p', { class: 'muted' }, 'The way is open.')),
    h('section', { class: 'panel rewards' },
      h('div', { class: 'reward' }, h('b', {}, `+${R.xp}`), h('small', {}, 'XP')),
      h('div', { class: 'reward gold' }, h('b', {}, `${R.gold >= 0 ? '+' : ''}${R.gold}`), h('small', {}, 'Gold')),
      R.levels ? h('div', { class: 'reward lvl' }, h('b', {}, `Lv ${hero.level}`), h('small', {}, 'Level up!')) : null,
      xpBar(hero)),
    perks, loot,
    primary(ready ? '⛺ To camp' : 'Choose a perk and spoils to continue', () => showCamp({ fromBoard: false }), { disabled: !ready, cls: 'wide big' }));
}
function defeat(retreat) {
  concludeRoadEffects();
  const heroes = [S.hero];
  let loss = 0;
  for (const hero of heroes) { const cut = Math.floor(hero.gold * 0.15); hero.gold -= cut; hero.stats.defeats++; loss += cut; }
  if (S.battle) for (const hero of heroes) { const f = S.battle; E.recordBattle(hero, { points: E.pointsOf(f), heroes: heroes.length, won: false }); }
  persist();
  sfx.lose();
  if (SCRUI.on() && world.battle) return SCRUI.defeat(retreat, loss);
  mount(h('header', { class: 'victory defeat' }, h('div', { class: 't-eyebrow' }, S.quest?.name || ''), h('h1', {}, retreat ? 'You withdraw' : 'You have fallen'),
    h('p', { class: 'muted' }, retreat ? 'A wise person lives to fight tomorrow.' : 'The dark wins this round. It does not get to keep you.')),
  section('', h('p', {}, loss ? `You dropped ${loss} 🪙 in the dust.` : 'You lost nothing but pride.'), h('p', { class: 'muted' }, 'Your level, gear and perks are safe. Rest at camp, then try again.')),
  primary('⛺ Return to camp', () => showCamp({ fromBoard: false }), { cls: 'wide big' }));
}

// ------------------------------------------------------------------ camp
function showCamp({ fromBoard = false } = {}) {
  if (S.net) return Online.goCamp(fromBoard);
  S.battle = null;
  if (S.company?.members?.length) {
    if (!S.company.members[S.seat]) S.seat = 0;
    S.hero = S.company.members[S.seat];
  }
  persist(); renderCamp(fromBoard);
}
function renderCamp(fromBoard) {
  if (SCRUI.on()) return SCRUI.camp(fromBoard);
  const hero = S.hero; const tabs = [['forge', '🔨 Forge'], ['gear', '🎒 Gear'], ['hero', '📜 Hero']];
  const body = S.tab === 'gear' ? campGear() : S.tab === 'hero' ? campHero() : campForge();
  const perkHero = (S.company?.members || [hero]).find((m) => m.pendingPerks > 0);
  if (perkHero && (!S.perkOffer || S.perkFor !== perkHero.name)) { S.perkOffer = E.offerPerks(perkHero, fresh()); S.perkFor = perkHero.name; }
  if (!perkHero) { S.perkOffer = null; S.perkFor = null; }
  const perkPanel = perkHero && S.perkOffer ? h('section', { class: 'panel glow' }, h('div', { class: 't-eyebrow mb' }, `${perkHero.name} still owes a perk`),
    h('div', { class: 'perks' }, S.perkOffer.map((id) => h('button', { class: 'perk', type: 'button', onclick: () => { E.takePerk(perkHero, id); S.perkOffer = null; sfx.level(); persist(); renderCamp(fromBoard); } }, h('b', {}, D.PERKS[id].name), h('small', {}, D.PERKS[id].text))))) : null;
  mount(
    h('div', { class: 'topline' }, h('div', {}, h('div', { class: 't-eyebrow' }, 'The fire is warm'), h('h2', {}, 'Camp')), heroChip()),
    h('p', { class: 'muted' }, 'You are healed and your cards are ready. Gold is spent here; Magic only matters in a fight.'),
    perkPanel,
    tip('camp', 'Bigger hand dice are how a hero grows, and each size waits on a level. Weapons can be equipped or sold. The company saves on its own.'),
    h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, label]) => h('button', { class: S.tab === id ? 'on' : '', type: 'button', role: 'tab', onclick: () => { S.tab = id; sfx.select(); renderCamp(fromBoard); } }, label))),
    body,
    h('div', { class: 'row' }, ghost('Copy Soul Code', () => { const c = currentCode(); if (c) copyCode(c); }, { cls: 'small' })),
    primary('🗺 To the road', showRoadOrBoard, { cls: 'wide big' }));
}
function upgradeRow(kind, slot, label) {
  const hero = S.hero; const size = hero[kind][slot]; const steps = kind === 'strength' ? D.STRENGTH_STEPS : D.SPECIAL_STEPS;
  const u = kind === 'strength' ? E.strengthUpgrade(hero, slot) : E.specialUpgrade(hero, slot);
  const gate = steps[size]?.[1];
  const sub = u.next ? `→ d${u.next}${u.act ? ` · waits for Act ${D.ROMAN[u.act]}` : hero.level < gate ? ` · unlocks at level ${gate}` : ''}` : 'Fully grown';
  return h('div', { class: 'urow' }, h('div', { class: 'udie' }, `d${size}`), h('div', { class: 'ucopy' }, h('b', {}, label), h('small', { class: 'muted' }, sub)),
    u.next ? primary(`🪙 ${u.cost}`, () => { if (E.upgradeDie(hero, kind, slot)) { sfx.level(); persist(); renderCamp(); } }, { disabled: !u.ok, cls: 'small' }) : h('span', { class: 'maxed' }, 'MAX'));
}
function campForge() {
  const hero = S.hero;
  return h('div', { class: 'col' },
    section('Strength dice', h('p', { class: 'fine' }, 'Bigger hands hit harder and pay out more when they roll 1–4. Locked behind your level.'),
      upgradeRow('strength', 'W', 'Left hand'), upgradeRow('strength', 'E', 'Right hand')),
    section('Special dice', h('p', { class: 'fine' }, 'Always two blank faces, so a bigger die misses less often.'),
      upgradeRow('special', 'SW', 'Left special · ✚ Mend, ⚡ Surge'), upgradeRow('special', 'SE', 'Right special · ✦ Spark, ⚡ Surge')),
    h('p', { class: 'fine center' }, `You carry ${hero.gold} 🪙.`));
}
function campGear() {
  const hero = S.hero; const two = E.isTwoHanded(hero);
  const worn = two ? [V.weaponCard(hero.loadout.NW, { note: 'Both hands' })] : [V.weaponCard(hero.loadout.NW, { note: 'Left hand' }), V.weaponCard(hero.loadout.NE, { note: 'Right hand' })];
  const bag = hero.bag.map((inst) => {
    const w = D.WEAPONS[inst.id];
    const acts = w.hands === 2 ? [ghost('Equip', () => { E.equip(hero, inst.uid); sfx.card(); persist(); renderCamp(); }, { cls: 'small' })]
      : [ghost('Equip L', () => { E.equip(hero, inst.uid, 'NW'); sfx.card(); persist(); renderCamp(); }, { cls: 'small' }), ghost('Equip R', () => { E.equip(hero, inst.uid, 'NE'); sfx.card(); persist(); renderCamp(); }, { cls: 'small' })];
    acts.push(ghost(`Sell 🪙 ${E.sellValue(inst)}`, () => { E.sellItem(hero, inst.uid); sfx.coin(); persist(); renderCamp(); }, { cls: 'small' }));
    return V.weaponCard(inst, { actions: acts });
  });
  const stock = E.shopStock(hero);
  return h('div', { class: 'col' },
    section('Equipped', h('div', { class: 'loot' }, worn), h('p', { class: 'fine' }, 'Red faces attack, blue faces defend. Weapons Triple and Strength Triple: +10 attack. Head to Toe Triple: +10 block.')),
    section(`Pack (${bag.length})`, bag.length ? h('div', { class: 'loot' }, bag) : h('p', { class: 'muted' }, 'Nothing yet. Monsters drop weapons.')),
    section('The peddler', h('div', { class: 'loot' }, stock.map((it, i) => V.weaponCard(it.inst, { actions: [it.sold ? h('em', { class: 'muted' }, 'Sold') : primary(`Buy 🪙 ${it.price}`, () => { if (E.buyItem(hero, i)) { sfx.coin(); persist(); renderCamp(); } else { sfx.error(); toast('Not enough gold.'); } }, { disabled: hero.gold < it.price, cls: 'small' })] })))));
}
function campHero() {
  const hero = S.hero; const c = D.CLASSES[hero.cls];   const perkCount = {}; hero.perks.forEach((p) => { perkCount[p] = (perkCount[p] || 0) + 1; });
  return h('div', { class: 'col' },
    section(`${hero.name} · Level ${hero.level} ${c.name}`, xpBar(hero),
      h('div', { class: 'stats' }, h('span', {}, `❤ ${E.maxHpOf(hero)} HP`), h('span', {}, `⚡ d${E.feetSize(hero)} initiative`)),
      h('p', { class: 'fine' }, `${hero.stats.battles} victories · ${hero.stats.defeats} defeats · ${hero.stats.triples} triples · ${hero.stats.straights} straights`)),
    section('Perks', Object.keys(perkCount).length ? h('div', { class: 'cardlist' }, Object.entries(perkCount).map(([id, n]) => h('div', { class: 'mini-card' }, h('b', {}, `${D.PERKS[id].name}${n > 1 ? ` ×${n}` : ''}`), h('small', {}, D.PERKS[id].text)))) : h('p', { class: 'muted' }, 'You earn a perk every level.')),
    section('Class cards', h('div', { class: 'cardlist' }, c.cards.map((k) => h('div', { class: `mini-card ${(k.unlock ?? 1) > hero.level ? 'spent' : ''}` }, h('b', {}, k.name), h('small', {}, `${k.cost}✦ · ${k.text}`), (k.unlock ?? 1) > hero.level ? h('em', {}, `Unlocks at level ${k.unlock}`) : null)))),
    section('Always available', h('div', { class: 'cardlist' }, h('div', { class: 'mini-card' }, h('b', {}, 'Heal'), h('small', {}, `${E.healCostOf(hero)}✦ · restore ${D.HEAL_AMOUNT} HP`)), h('div', { class: 'mini-card' }, h('b', {}, 'Heart nudge'), h('small', {}, `${D.NUDGE_COST}✦ · once a round, move your heart die up or down by 1`)))),
    chronicleBlock());
}
function chronicleBlock() {
  const log = (S.company?.campaign || S.hero?.campaign)?.chronicle || [];
  if (!log.length) return null;
  return section('The road remembers', h('div', { class: 'cardlist' }, log.slice(0, 8).map((entry) => h('div', { class: 'mini-card' }, h('b', {}, entry.title), h('small', {}, entry.text)))));
}

TUT.bind({ showTitle, showCreate, practice });
SCRUI.bind({
  S, members: membersOf, persist, fresh, mountAs, adopt, unlock, tip, menu, startQuest, showCamp, showBoard, showCreate, showTogether: Online.together, showImport, showHowTo, resume: Online.resume,
  showRoadOrBoard, actName, actOf, nextPerkOffer, renderVictory, renderCamp, currentCode, copyCode, showTitle, showLessons: () => TUT.showLessons(),
  // at a shared table: who is there, and the road's choice goes to the table
  get partyBar() { return S.net ? Online.partyBar : null; }, get chooseRoad() { return S.net ? Online.chooseRoad : null; },
  get net() { return !!S.net; }, get netOp() { return S.net ? Online.netOp : null; }, netPerk: (id) => Online.netPerk(id), netPerkOffer: () => Online.netPerkOffer(), campCta: (btn) => Online.campCta(btn),
});
Online.bind({ S, ghost, primary, showTitle, showHowTo, battleCtx });
export async function boot() {
  const gl = await world.boot($('#gl'));
  if (gl) { $('.app-frame').classList.add('has-gl'); document.body.classList.add('sx'); SCRUI.chrome(isMuted()); }
  await Online.boot(showTitle);
}
export const debugApi = { S, E, D, TUT, session: Sess, online: Online, startQuest, showBoard, showCamp, renderBattle, renderReset, world, B3, scr: SCR, showTitle, showCreate, showRoad, showRoadResult, showVictory, defeat, adopt, showRoadOrBoard, renderVictory, showStory };
