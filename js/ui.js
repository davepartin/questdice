// Screens and input. Rules live in engine.js, drawing helpers in view.js.
import { h, $, $$, sleep, toast, floater, buzz, modal } from './dom.js';
import { burstAt, shake } from './fx.js';
import { sfx, isMuted, setMuted } from './audio.js';
import * as E from './engine.js';
import * as D from './data.js';
import * as SV from './save.js';
import * as V from './view.js';
import * as R from './roads.js';
import { hintsOn, setHints } from './coach.js';
import * as Net from './net.js';
import { attachRoom, showTogether, renderNet, bootNet, resume } from './roomui.js';
import * as B3 from './g3/battle3d.js';
import { world } from './g3/world.js';
import * as SCR from './g3/screens.js';
import * as SCRUI from './g3/scrui.js';

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
const isParty = () => (S.battle?.fighters?.length || 0) > 1;
const membersOf = () => S.company?.members || (S.hero ? [S.hero] : []);
function persist() {
  if (S.net) return;
  if (S.company?.kind === 'company') {
    if (!SV.saveCompany(S.company)) toast('Could not save. Is browser storage blocked?', 'bad');
    return;
  }
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
  if (S.company?.kind === 'company') {
    const n = S.company.members.length;
    return h('div', { class: 'herochip' }, h('span', { class: 'hc-glyph' }, '⚔'),
      h('div', {}, h('b', {}, S.company.name), h('small', {}, `${n} ${n === 1 ? 'hero' : 'heroes'}`)),
      h('div', { class: 'hc-res' }, h('span', { class: 'c-gold' }, `🪙 ${E.companyGold(S.company.members)}`)));
  }
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
export function showHowTo() { modal(h('div', {}, V.howToPlay(), h('div', { class: 'row end' }, primary('Got it', () => $('#modal').replaceChildren())))); }
export function bindChrome() {
  const mute = $('#mute'); const sync = () => { if (world.available || SCRUI.on()) SCRUI.chrome(isMuted()); else mute.textContent = isMuted() ? '🔇' : '🔊'; mute.setAttribute('aria-pressed', String(isMuted())); };
  sync(); mute.onclick = () => { setMuted(!isMuted()); sync(); sfx.click(); };
  $('#help').onclick = () => showHowTo();
}

// ------------------------------------------------------------------ title
export function showTitle() {
  Net.disconnect();
  S.net = null; S.holdScroll = false;
  S.hero = null; S.company = null; S.battle = null; S.busy = false;
  if (SCRUI.on()) return SCRUI.title();
  const saves = SV.listSaves();
  const grid = h('div', { class: 'title-grid', 'aria-hidden': 'true' }, D.SLOTS.map((s) => h('div', { class: `td td-${s} ${['N', 'W', 'E', 'S', 'C'].includes(s) ? 'limb' : ''}` }, h('span', {}, String(1 + Math.floor(Math.random() * 4))))));
  const tick = () => { $$('.td span', grid).forEach((n, i) => { if (Math.random() < 0.35) { n.textContent = String(1 + Math.floor(Math.random() * (i === 4 ? 6 : 4))); n.parentElement.classList.remove('pop'); void n.parentElement.offsetWidth; n.parentElement.classList.add('pop'); } }); };
  const items = [
    h('header', { class: 'title-art' }, grid, h('h1', { class: 'logo' }, 'QUEST', h('span', {}, 'DICE')), h('p', { class: 'tagline' }, 'Roll your body. Break the dark.')),
  ];
  const seat = Net.savedSeat();
  if (seat) items.push(cmd('Table', `Rejoin ${seat.code}`, 'This phone still has a seat.', () => resume(), { glyph: '⚔', tone: 'versus' }));
  if (saves.length) {
    items.push(h('div', { class: 't-eyebrow mb' }, 'On this device'));
    items.push(h('nav', { class: 'dock' }, saves.map((x) => {
      const sub = x.kind === 'company'
        ? `${x.size} heroes · ${x.classes.map((id) => D.CLASSES[id].name).join(', ')}`
        : `Level ${x.level} ${D.CLASSES[x.cls].name}`;
      return cmd(`Act ${romans[x.act - 1] || x.act} · Quest ${x.step}`, x.name, sub, () => unlock(x.name, x.kind), { glyph: x.kind === 'company' ? '⚔' : D.CLASSES[x.cls].glyph, tone: x.kind === 'company' ? 'versus' : 'solo' });
    })));
  }
  items.push(h('div', { class: 't-eyebrow mb' }, saves.length ? 'More' : 'Begin'));
  items.push(h('nav', { class: 'dock' },
    cmd('01 · Hero', 'Forge a new hero', 'One body of dice. A whole road.', showCreate, { glyph: '🎲', tone: 'tutorial' }),
    cmd('02 · Together', 'Play on your own phone', 'One to six heroes. Each decides at the same time, and the fight runs when every choice is in.', showTogether, { glyph: '⚔', tone: 'versus' }),
    cmd('03 · Soul Code', 'Bring a hero here', 'Paste a code from another device.', showImport, { glyph: '🔑' })));
  items.push(h('div', { class: 'row center' }, ghost('How to play', showHowTo)));
  mount(...items);
  S.timers.push(setInterval(tick, 1400));
}
function adopt(saved, kind) {
  if (kind === 'company') {
    S.company = saved;
    S.hero = saved.members[0];
  } else {
    S.company = { kind: 'solo', name: saved.name, campaign: saved.campaign, members: [saved] };
    S.hero = saved;
  }
  S.seat = 0;
}
function unlock(name, kind = 'hero') {
  const pw = h('input', { type: 'password', class: 'input', placeholder: 'Password', autocomplete: 'current-password', 'aria-label': 'Password' });
  const msg = h('p', { class: 'form-msg' });
  const go = async () => {
    try {
      const saved = kind === 'company' ? await SV.openCompany(name, pw.value) : await SV.openHero(name, pw.value);
      adopt(saved, kind);
      $('#modal').replaceChildren(); sfx.coin(); showRoadOrBoard();
    } catch (e) { msg.textContent = e.message; sfx.error(); }
  };
  pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  const close = modal(h('div', { class: 'form' }, h('h2', {}, `Welcome back, ${name}`), h('p', { class: 'muted' }, kind === 'company' ? 'Enter the company password. This save still shares one device. A new table gives every hero their own phone.' : 'Enter your password to open this hero.'), pw, msg,
    h('div', { class: 'row end' }, ghost('Soul Code', () => { const c = kind === 'company' ? SV.exportCompanyCode(name) : SV.exportCode(name); if (c) copyCode(c); }), ghost('Cancel', () => close()), primary('Open', go)),
    h('p', { class: 'fine' }, h('a', { href: '#', onclick: (e) => { e.preventDefault(); if (confirm(`Delete ${name} forever from this device?`)) { if (kind === 'company') SV.deleteCompany(name); else SV.deleteHero(name); close(); showTitle(); } } }, kind === 'company' ? 'Delete this company' : 'Delete this hero'))));
  setTimeout(() => pw.focus(), 50);
}
function currentCode() {
  if (S.company?.kind === 'company') return SV.exportCompanyCode(S.company.name);
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
    try { const name = SV.importCode(ta.value, { overwrite }); $('#modal').replaceChildren(); toast(`${name} has arrived.`, 'good'); sfx.coin(); showTitle(); }
    catch (e) {
      if (e.code === 'EXISTS') { msg.textContent = `${e.name} already lives on this device.`; msg.append(' ', h('a', { href: '#', onclick: (ev) => { ev.preventDefault(); go(true); } }, 'Replace them')); } else { msg.textContent = e.message; sfx.error(); }
    }
  };
  modal(h('div', { class: 'form' }, h('h2', {}, 'Bring a hero here'), h('p', { class: 'muted' }, 'Paste a Soul Code exported from another device.'), ta, msg, h('div', { class: 'row end' }, ghost('Cancel', () => $('#modal').replaceChildren()), primary('Import', () => go(false)))));
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
    grid.replaceChildren(...Object.entries(D.CLASSES).map(([id, c]) => h('button', { type: 'button', class: `class-pick ${id === cls ? 'on' : ''}`, onclick: () => { cls = id; sfx.select(); paint(); } }, h('span', {}, c.glyph), h('b', {}, c.name))));
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

function showCreateCompany() {
  let seats = [{ name: '', cls: 'knight' }];
  const cname = h('input', { class: 'input', maxlength: 24, placeholder: 'Company name', 'aria-label': 'Company name', autocomplete: 'off' });
  const pw = h('input', { class: 'input', type: 'password', placeholder: 'Password (3+ characters)', 'aria-label': 'Password', autocomplete: 'new-password' });
  const msg = h('p', { class: 'form-msg' });
  const seatsEl = h('div', { class: 'col' });
  const paint = () => {
    seatsEl.replaceChildren(...seats.map((seat, i) => h('div', { class: 'panel seat' },
      h('div', { class: 'row between' }, h('b', {}, `Hero ${i + 1}`), seats.length > 1 ? ghost('Remove', () => { seats.splice(i, 1); sfx.select(); paint(); }, { cls: 'small' }) : null),
      h('input', { class: 'input', maxlength: 16, placeholder: 'Name', value: seat.name, 'aria-label': `Hero ${i + 1} name`, oninput: (e) => { seat.name = e.target.value; } }),
      h('div', { class: 'class-grid' }, Object.entries(D.CLASSES).map(([id, c]) => h('button', {
        type: 'button', class: `class-pick ${seat.cls === id ? 'on' : ''}`,
        onclick: () => { seat.cls = id; sfx.select(); paint(); },
      }, h('span', {}, c.glyph), h('b', {}, c.name.split(' ')[0])))))));
  };
  paint();
  const go = async () => {
    const companyName = cname.value.trim().replace(/\s+/g, ' ');
    if (companyName.length < 2) { msg.textContent = 'Name the company (2–24 characters).'; sfx.error(); return; }
    if (pw.value.length < 3) { msg.textContent = 'Choose a password of at least 3 characters.'; sfx.error(); return; }
    const roster = seats.map((s) => ({ name: s.name.trim().replace(/\s+/g, ' '), cls: s.cls }));
    if (roster.some((r) => r.name.length < 2)) { msg.textContent = 'Every hero needs a name.'; sfx.error(); return; }
    if (new Set(roster.map((r) => r.name.toLowerCase())).size !== roster.length) { msg.textContent = 'Each hero needs a different name.'; sfx.error(); return; }
    if (!SV.canSave()) { msg.textContent = 'Saving is blocked in this browser.'; sfx.error(); return; }
    try {
      const company = E.newCompany({ name: companyName, roster });
      await SV.createCompany(company, pw.value);
      adopt(company, 'company'); sfx.level(); showRoadOrBoard();
    } catch (e) { msg.textContent = e.message; sfx.error(); }
  };
  mount(
    h('div', { class: 'topline' }, ghost('‹ Back', showTitle, { cls: 'small' }), h('h2', {}, 'Forge a company')),
    section('The company', cname, pw, h('p', { class: 'fine' }, 'One password opens the whole company on this device. Each hero keeps their own gold, dice and level. The road is shared.')),
    section('The heroes', seatsEl, h('div', { class: 'row' }, seats.length < 6 ? ghost('Add a hero', () => { seats.push({ name: '', cls: 'wizard' }); sfx.select(); paint(); }, { cls: 'small' }) : h('span', { class: 'fine' }, 'Six is a full table.'))),
    msg, primary('Take the road', go, { cls: 'wide' }));
}

// ------------------------------------------------------------------ quest board
function showBoard() {
  if (SCRUI.on()) return SCRUI.board();
  const hero = membersOf()[0]; S.hero = hero; const c = hero.campaign; const quests = E.questsFor(hero); persist();
  const blessings = (c.blessings || []).filter((b) => (b.fights ?? 1) > 0);
  const ambush = c.ambush?.length;
  const path = h('div', { class: 'path' }, Array.from({ length: D.QUESTS_PER_ACT }, (_, i) => {
    const n = i + 1; const st = n < c.step ? 'done' : n === c.step ? 'now' : '';
    return h('div', { class: `node ${st} ${n === D.QUESTS_PER_ACT ? 'boss' : D.ELITE_STEPS.includes(n) ? 'elite' : ''}` }, n === D.QUESTS_PER_ACT ? '👑' : D.ELITE_STEPS.includes(n) ? '☠' : n < c.step ? '✓' : String(n));
  }));
  mount(
    h('div', { class: 'topline' }, heroChip(), ghost('Menu', menu, { cls: 'small' })),
    S.company?.kind === 'company'
      ? h('div', { class: 'levels' }, S.company.members.map((m) => h('span', {}, `${D.CLASSES[m.cls].glyph} ${m.name} · Lv ${m.level} · 🪙 ${m.gold}`)))
      : xpBar(hero),
    h('header', { class: 'act' }, h('div', { class: 't-eyebrow' }, `Act ${romans[c.act - 1] || c.act} · Quest ${c.step} of ${D.QUESTS_PER_ACT}`), h('h2', {}, actName(hero)), h('p', { class: 'muted' }, actOf(hero).tag)),
    path,
    blessings.length ? h('p', { class: 'boon' }, blessings.map((b) => b.text).join(' · ')) : null,
    ambush ? h('p', { class: 'warn' }, 'An ambush is waiting on whichever road you take.') : null,
    tip('board', 'Each quest offers two roads. Standard is lighter. Perilous hits harder but pays 1.5× gold and XP. The computer has already spoken for this stretch of road.'),
    h('div', { class: 't-eyebrow mb' }, quests.length > 1 ? 'Choose your road' : 'The road ends here'),
    h('div', { class: 'quests' }, quests.map(questCard)),
    h('div', { class: 'row' }, ghost('⛺ Visit camp', () => showCamp({ fromBoard: true })), ghost('My hero', () => { S.tab = 'hero'; showCamp({ fromBoard: true }); })));
}
function groupNames(ids) {
  const n = {}; ids.forEach((id) => { n[id] = (n[id] || 0) + 1; });
  return Object.entries(n).map(([id, c]) => `${D.MONSTERS[id].name}${c > 1 ? ` ×${c}` : ''}`).join(' + ');
}
function questCard(q) {
  const total = q.enemies.reduce((a, id) => a + Math.round(D.MONSTERS[id].hp * q.hpMult), 0);
  const tag = q.kind === 'boss' ? 'BOSS' : q.kind === 'elite' ? 'ELITE' : q.perilous ? 'PERILOUS · rewards ×1.5' : 'STANDARD';
  return h('button', { class: `qcard ${q.kind} ${q.perilous ? 'perilous' : ''}`, type: 'button', onclick: () => { sfx.click(); startQuest(q); } },
    h('div', { class: 'qglyphs' }, q.enemies.map((id) => h('span', {}, D.MONSTERS[id].glyph))),
    h('div', { class: 'qbody' }, h('span', { class: 't-eyebrow' }, tag), h('b', {}, q.name), h('small', {}, groupNames(q.enemies)), h('small', { class: 'muted' }, `~${total} total HP · ${q.enemies.reduce((a, id) => a + Math.round(D.MONSTERS[id].xp * q.rewardMult), 0)} XP`)),
    h('span', { class: 'cmd-go' }, '›'));
}
function menu() {
  const close = modal(h('div', { class: 'form' }, h('h2', {}, S.company?.name || S.hero?.name || 'Menu'),
    h('div', { class: 'col' },
      ghost('How to play', () => { close(); showHowTo(); }),
      ghost(`Hints: ${hintsOn() ? 'On' : 'Off'}`, () => { setHints(!hintsOn()); close(); toast(hintsOn() ? 'Hints on.' : 'Hints off.'); }),
      ghost('Copy Soul Code', () => { const c = currentCode(); if (c) copyCode(c); }),
      ghost('Save & return to title', () => { persist(); close(); showTitle(); }),
      ghost('Close', () => close()))));
}

function showRoadOrBoard() {
  const hero = membersOf()[0];
  if (hero && R.roadIsOpen(hero)) showRoad();
  else showBoard();
}
function showRoad() {
  if (SCRUI.on()) return SCRUI.road();
  const members = membersOf();
  const hero = members[0];
  const ev = R.ensureRoad(hero, members);
  persist();
  mount(
    h('div', { class: 'topline' }, heroChip(), ghost('Menu', menu, { cls: 'small' })),
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
    h('div', { class: 'topline' }, heroChip(), ghost('Menu', menu, { cls: 'small' })),
    h('article', { class: 'road' },
      h('div', { class: 'road-kicker' }, 'The road answers'),
      h('h2', {}, res.title),
      h('p', { class: 'road-tell' }, res.text)),
    primary('Onward', showBoard, { cls: 'wide big' }));
}

// ------------------------------------------------------------------ battle: reset
function startQuest(q) {
  const members = membersOf();
  const quest = E.withAmbush(q, members[0].campaign);
  S.quest = quest;
  S.battle = members.length > 1 ? E.newPartyBattle(members, quest, fresh()) : E.newBattle(members[0], quest, fresh(), 1);
  S.hero = members[0];
  S.lastReport = null; S.sel.clear(); S.target = 0; S.focus = null; S.straight = 'atk';
  if (world.available && !isParty() && !S.net) { SCR.release(); quest.seed = E.hashSeed(members[0].campaign.seed, quest.id); B3.start(battleCtx()); return; }
  renderReset();
}
// What the 3D battle needs from this module.
function battleCtx() {
  return { S, menu: battleMenu, persist, banner, showVictory: () => { B3.stop(); showVictory(); }, defeat: (r) => { B3.stop(); defeat(r); } };
}
function refresh() { if (S.battle.phase === 'shape') renderBattle(); else renderReset(); }
function spendHeal() {
  if (isParty()) E.focusFighter(S.battle, S.battle.active);
  const b = S.battle; const hp = b.hp;
  const ok = E.healSpend(b);
  if (isParty()) E.commitFighter(S.battle);
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
function touchFighter(i, fn) {
  E.focusFighter(S.battle, i);
  const ok = fn();
  E.commitFighter(S.battle);
  return ok;
}
function renderPartyReset() {
  const b = S.battle;
  const alive = b.enemies.filter((e) => e.hp > 0);
  const rep = S.lastReport;
  const lines = rep?.party
    ? V.partyReportLines(rep, b)
    : [{ kind: 'meh', text: `${S.quest.name}. ${alive.map((e) => e.name).join(' and ')} ${alive.length > 1 ? 'bar' : 'bars'} the way. Highest Feet draws the heat.` }];
  const wind = alive.filter((e) => e.intent?.slam);
  const first = b.fighters.find((f) => f.hp > 0);
  const blessings = (S.company?.campaign?.blessings || []).map((bl) => bl.text).filter(Boolean);
  mount(
    h('div', { class: 'topline' }, h('div', {}, h('div', { class: 't-eyebrow' }, 'Reset'), h('h2', {}, `Round ${b.round}`)), ghost('Menu', battleMenu, { cls: 'small' })),
    section(rep ? `Round ${rep.round}` : 'The fight begins', h('ul', { class: 'log' }, lines.map((l) => h('li', { class: l.kind }, l.text)))),
    blessings.length ? h('p', { class: 'boon' }, blessings.join(' · ')) : null,
    tip('party-reset', 'This saved company still shares one device. Whoever rolls the highest Feet takes the largest share of the retaliation. Each hero’s block only covers their own share.'),
    h('div', { class: 't-eyebrow mb' }, 'The monsters have shown their hand'),
    h('div', { class: 'teles' }, alive.map(enemyTelegraph)),
    wind.length ? h('p', { class: 'warn' }, `⚠ A Slam is coming: ${wind.map((e) => e.name).join(', ')}.`) : null,
    first ? bodyWrap(h('div', { class: 'board board-empty', 'aria-hidden': 'true' }), first.hero) : null,
    h('div', { class: 't-eyebrow mb' }, 'The company'),
    ...b.fighters.map((f, i) => {
      const hero = f.hero;
      const spent = E.cardsOf(hero).filter((k) => f.used[k.id]);
      return h('div', { class: 'panel mate-spend' },
        h('div', { class: 'row between' }, h('b', {}, `${D.CLASSES[hero.cls].glyph} ${hero.name}`), h('span', { class: 'magic-badge' }, `✦ ${f.magic}`)),
        V.hpBar(f.hp, f.maxHp, { cls: 'hero-bar' }),
        f.hp <= 0 ? h('p', { class: 'muted' }, 'Down for this fight.') : h('div', { class: 'row' },
          ghost(`✚ Heal +${D.HEAL_AMOUNT} · ${E.healCostOf(hero)}✦`, () => {
            if (!touchFighter(i, () => E.healSpend(S.battle))) { sfx.error(); toast('Not enough ✦ Magic, or already full.'); return; }
            sfx.heal(); renderPartyReset();
          }, { cls: 'small', disabled: f.magic < E.healCostOf(hero) || f.hp >= f.maxHp }),
          ...spent.map((k) => ghost(`Recharge ${k.name}`, () => {
            if (!touchFighter(i, () => E.recharge(S.battle, k.id))) { sfx.error(); toast('Not enough ✦ Magic.'); return; }
            sfx.magic(); renderPartyReset();
          }, { cls: 'small', disabled: f.magic < D.RECHARGE_COST }))));
    }),
    primary(first ? `🎲 Roll ${first.hero.name}` : 'The company has fallen', first ? rollDice : () => defeat(false), { cls: 'wide big' }));
}
function renderReset() {
  if (S.net) { renderNet(); return; }
  if (isParty()) return renderPartyReset();
  const b = S.battle; const hero = S.hero; const alive = b.enemies.filter((e) => e.hp > 0);
  const rep = S.lastReport;
  const lines = rep ? V.reportLines(rep, b) : [{ kind: 'meh', text: `${S.quest.name}. ${alive.map((e) => e.name).join(' and ')} ${alive.length > 1 ? 'block' : 'blocks'} the way.` }];
  const wind = alive.filter((e) => e.intent.slam);
  const cards = E.cardsOf(hero);
  mount(
    h('div', { class: 'topline' }, h('div', {}, h('div', { class: 't-eyebrow' }, 'Reset'), h('h2', {}, `Round ${b.round}`)), ghost('Menu', battleMenu, { cls: 'small' })),
    section(rep ? `Round ${rep.round} result` : 'The fight begins', h('ul', { class: 'log' }, lines.map((l) => h('li', { class: l.kind }, l.text)))),
    tip('reset', 'This is the Reset screen. Monsters roll first and show you what they will do this round, so you can plan. Spend Magic (✦) here to heal or recharge cards, then roll your dice.'),
    h('div', { class: 't-eyebrow mb' }, 'The monsters have shown their hand'),
    h('div', { class: 'teles' }, alive.map(enemyTelegraph)),
    wind.length ? h('p', { class: 'warn' }, `⚠ A Slam is coming: ${wind.map((e) => e.name).join(', ')}. Brace with block, or burst it down.`) : null,
    section('You',
      h('div', { class: 'hero-hp-row' }, h('span', { class: 'c-heal' }, '❤'), h('div', { class: 'hero-hp' }, V.hpBar(b.hp, b.maxHp, { cls: 'hero-bar' })), h('span', { class: 'magic-badge' }, `✦ ${b.magic}`)),
      h('div', { class: 'row' },
        ghost(`✚ Heal +${D.HEAL_AMOUNT} HP · ${E.healCostOf(hero)}✦`, spendHeal, { disabled: b.magic < E.healCostOf(hero) || b.hp >= b.maxHp })),
      cards.length ? h('div', { class: 'cardlist' }, cards.map((k) => h('div', { class: `mini-card ${b.used[k.id] ? 'spent' : ''}` },
        h('b', {}, k.name), h('small', {}, `${k.cost}✦ · ${k.text}`),
        b.used[k.id] ? ghost(`Recharge · ${D.RECHARGE_COST}✦`, () => { if (E.recharge(b, k.id)) { sfx.magic(); renderReset(); } else { sfx.error(); toast('Not enough ✦ Magic.'); } }, { disabled: b.magic < D.RECHARGE_COST, cls: 'small' }) : h('em', {}, 'Ready')))) : null),
    bodyWrap(h('div', { class: 'board board-empty', 'aria-hidden': 'true' }), hero),
    primary('🎲 Roll the dice', rollDice, { cls: 'wide big' }));
}
async function rollDice() {
  if (S.busy) return; const b = S.battle;
  if (isParty()) {
    const i = b.fighters.findIndex((f) => f.hp > 0);
    if (i < 0) return defeat(false);
    E.startFighter(b, i);
    S.hero = b.hero; S.sel.clear(); S.focus = null; S.straight = 'atk'; S.target = b.fighters[i].target || 0;
  } else E.startRoll(b);
  if (!isParty()) { S.sel.clear(); S.focus = null; S.straight = 'atk'; }
  sfx.roll(); renderBattle(); await flicker(D.SLOTS);
  if (b.boundNow) { toast(`${b.boundNow} ${b.boundNow > 1 ? 'dice' : 'die'} locked by a hex.`, 'bad'); sfx.hurt(); }
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
  const close = modal(h('div', { class: 'form' }, h('h2', {}, 'Battle menu'),
    h('div', { class: 'col' }, ghost('How to play', () => { close(); showHowTo(); }),
      ghost(`Hints: ${hintsOn() ? 'On' : 'Off'}`, () => { setHints(!hintsOn()); close(); toast(hintsOn() ? 'Hints on.' : 'Hints off.'); }),
      ghost('Retreat (lose 15% gold)', () => { close(); B3.stop(); defeat(true); }), ghost('Back to the fight', () => close()))));
}
function toggle(slot) {
  if (S.busy) return; const b = S.battle; const info = E.rerollInfo(b);
  S.focus = slot;
  if (b.board[slot].bound) { sfx.error(); toast('That die is hexed. It cannot be rerolled this round.', 'bad'); updateLive(); return; }
  if (S.sel.has(slot)) S.sel.delete(slot);
  else { if (info.kind === 'none') { sfx.error(); toast('No reroll actions left.'); } else if (S.sel.size >= info.dice) { sfx.error(); toast(`You can reroll up to ${info.dice} dice at a time.`); } else { S.sel.add(slot); sfx.select(); } }
  updateLive();
}
async function doReroll() {
  if (S.busy) return; const b = S.battle; const slots = [...S.sel];
  if (!E.canReroll(b, slots)) { sfx.error(); toast(slots.length ? 'Not enough ✦ Magic for that.' : 'Tap the dice you want to reroll.'); return; }
  E.reroll(b, slots); if (isParty()) E.commitFighter(b); S.sel.clear(); sfx.roll(); renderBattle(); await flicker(slots);
}
function doNudge(dir) { const b = S.battle; if (S.busy) return; if (!E.nudge(b, dir)) { sfx.error(); toast(b.magic < D.NUDGE_COST ? 'Not enough ✦ Magic.' : 'The heart cannot go that way.'); return; } if (isParty()) E.commitFighter(b); sfx.magic(); renderBattle(); }
function doCard(id) { const b = S.battle; if (S.busy) return; if (!E.playCard(b, id)) { sfx.error(); toast('Not enough ✦ Magic, or already spent.'); return; } if (isParty()) E.commitFighter(b); sfx.card(); renderBattle(); buzz(20); }

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
  if (S.net) { renderNet(); return; }
  const b = S.battle;
  if (b.phase !== 'shape') return renderReset();
  if (isParty()) { E.focusFighter(b, b.active); S.hero = b.hero; }
  const hero = S.hero;
  if (!b.enemies[S.target] || b.enemies[S.target].hp <= 0) S.target = Math.max(0, b.enemies.findIndex((e) => e.hp > 0));
  const ev = E.evaluate(hero, b.board, { straight: S.straight });
  const info = E.rerollInfo(b); const two = E.isTwoHanded(hero);
  const board = h('div', { class: `board ${two ? 'is2h' : ''}` }, D.SLOTS.map((slot) => V.dieEl(hero, slot, b.board[slot], {
    selected: S.sel.has(slot), onclick: () => toggle(slot), twohand: two && D.ROLE[slot] === 'weapon',
  })));
  if (ev.offense3) ['NW', 'N', 'NE'].forEach((s) => $(`[data-slot="${s}"]`, board).classList.add('syn'));
  if (ev.defense3) ['N', 'C', 'S'].forEach((s) => $(`[data-slot="${s}"]`, board).classList.add('syn'));
  const notes = V.synergyNotes(ev, b.mods);
  const cards = E.cardsOf(hero);
  const pips = h('div', { class: 'pips', 'aria-label': 'Reroll actions left' }, Array.from({ length: D.REROLL_ACTIONS }, (_, i) => h('i', { class: i < b.actionsLeft ? 'on' : '' })), b.freeActions.length ? h('b', { class: 'free' }, `+${b.freeActions.length} free`) : null);
  const nextMate = isParty() ? b.fighters.find((g, i) => i > b.active && g.hp > 0) : null;
  const lockLabel = !isParty() ? '🔒 Lock in' : nextMate ? `🔒 Lock in · then ${nextMate.hero.name}` : '🔒 Lock in · monsters answer';
  mount(
    h('div', { class: 'topline' }, h('div', {}, h('div', { class: 't-eyebrow' }, isParty() ? `${D.CLASSES[hero.cls].name} · round ${b.round}` : S.quest.name), h('h2', {}, isParty() ? hero.name : `Round ${b.round}`)), ghost('Menu', battleMenu, { cls: 'small' })),
    isParty() ? V.rosterEl(b.fighters, b.active) : null,
    h('div', { class: 'ecards', 'data-n': b.enemies.filter((e) => e.hp > 0).length }, b.enemies.map((e, i) => V.enemyCard(e, { targeted: i === S.target && e.hp > 0, onclick: () => { if (S.busy) return; S.target = i; if (isParty()) b.fighters[b.active].target = i; sfx.select(); renderBattle(); } }))),
    h('div', { class: 'hero-hp-row' }, h('span', { class: 'c-heal' }, '❤'), h('div', { class: 'hero-hp' }, V.hpBar(b.hp, b.maxHp, { cls: 'hero-bar' })), h('span', { class: 'magic-badge' }, `✦ ${b.magic}`)),
    b.boundNow ? h('p', { class: 'warn' }, `⛓ ${b.boundNow} of your dice ${b.boundNow > 1 ? 'are' : 'is'} hexed and cannot be rerolled.`) : null,
    h('div', { id: 'live' },
      bodyWrap(board, hero),
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
async function lockParty() {
  const b = S.battle;
  E.focusFighter(b, b.active);
  E.commitFighter(b);
  b.fighters[b.active].straight = S.straight;
  b.fighters[b.active].target = S.target;
  S.busy = true; sfx.lock(); buzz(20);
  const next = b.fighters.findIndex((g, i) => i > b.active && g.hp > 0);
  if (next >= 0) {
    banner(`Pass to ${b.fighters[next].hero.name}`, 'gold');
    E.startFighter(b, next);
    S.hero = b.hero; S.sel.clear(); S.focus = null; S.straight = 'atk'; S.target = b.fighters[next].target || 0;
    S.busy = false;
    renderBattle();
    await flicker(D.SLOTS);
    if (b.boundNow) { toast(`${b.boundNow} ${b.boundNow > 1 ? 'dice' : 'die'} locked by a hex.`, 'bad'); sfx.hurt(); }
    return;
  }
  const rep = E.resolveParty(b);
  S.lastReport = rep;
  await sleep(280);
  for (const s of rep.strikes) {
    const tEl = $(`.ecard[data-uid="${s.targetUid}"]`);
    if (s.dealt > 0) { floater(tEl, `−${s.dealt}`, 'dmg'); tEl?.classList.add('hit'); }
  }
  if (rep.strikes.some((s) => s.dealt > 0)) { sfx.hit(); burstAt($(`.ecard[data-uid="${rep.strikes[0].targetUid}"]`), '#ff8a7a', 18); shake(0.7); }
  for (const e of b.enemies) {
    const bar = $(`.ecard[data-uid="${e.uid}"] .bar-fill`);
    if (bar) bar.style.width = `${Math.max(0, (e.hp / e.maxHp) * 100)}%`;
    if (e.hp <= 0) $(`.ecard[data-uid="${e.uid}"]`)?.classList.add('dead');
  }
  await sleep(520);
  if (rep.fighters.some((f) => f.taken > 0)) { sfx.hurt(); shake(0.8); }
  if (rep.staggered.length) { banner('STAGGERED!', 'gold'); sfx.synergy(); }
  if (rep.raged.length) { banner('ENRAGED!', 'bad'); sfx.rage(); }
  await sleep(rep.raged.length || rep.staggered.length ? 900 : 640);
  S.busy = false; S.sel.clear(); S.focus = null;
  if (b.outcome === 'victory') showVictory();
  else if (b.outcome === 'defeat') defeat(false);
  else renderReset();
}
async function lockIn() {
  if (S.busy) return;
  if (isParty()) return lockParty();
  const b = S.battle; S.busy = true; sfx.lock(); buzz(30);
  $('.board')?.classList.add('locked'); $$('.die').forEach((d) => d.classList.remove('sel'));
  const ev = E.evaluate(S.hero, b.board, { straight: S.straight });
  if (ev.offense3 || ev.defense3 || ev.straight) setTimeout(() => { sfx.synergy(); banner(ev.offense3 || ev.defense3 ? 'TRIPLE!  +10' : `${ev.straight}-STRAIGHT!`, 'gold'); }, 120);
  const target = S.target; const rep = E.resolve(b, { target, straight: S.straight }); S.lastReport = rep;
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
  if (rep.staggered.length) { banner('STAGGERED!', 'gold'); sfx.synergy(); }
  if (rep.acts.some((a) => a.v === 'charge' && !a.cancelled)) sfx.windup();
  await sleep(rep.raged.length || rep.staggered.length ? 1100 : 800);
  S.busy = false; S.sel.clear(); S.focus = null;
  if (b.outcome === 'victory') showVictory(); else if (b.outcome === 'defeat') defeat(false); else renderReset();
}

// ------------------------------------------------------------------ victory / defeat
function showVictory() {
  if (isParty()) return showPartyVictory();
  const b = S.battle; const hero = S.hero; const r = E.battleRewards(b);
  const lvBefore = hero.level;
  hero.gold = Math.max(0, hero.gold + r.gold); hero.stats.goldEarned += Math.max(0, r.gold); hero.stats.battles++;
  E.gainXp(hero, r.xp);
  const quest = S.quest;
  concludeRoadEffects();
  E.advanceCampaign(hero); persist();
  S.rewards = { ...r, lvBefore, levels: hero.level - lvBefore, drops: r.drops, picked: null, quest, offer: null };
  sfx.win(); if (hero.level > lvBefore) setTimeout(sfx.level, 700);
  renderVictory();
}
function nextPerkOffer() { const hero = S.hero; if (hero.pendingPerks > 0 && !S.rewards.offer) S.rewards.offer = E.offerPerks(hero, fresh()); }
function renderVictory() {
  if (SCRUI.on() && !isParty() && world.battle) return SCRUI.victory();
  const R = S.rewards; const hero = S.hero; nextPerkOffer();
  const perks = R.offer ? h('section', { class: 'panel glow' }, h('div', { class: 't-eyebrow mb' }, `Level up! Choose a perk${hero.pendingPerks > 1 ? ` (${hero.pendingPerks} to pick)` : ''}`),
    h('div', { class: 'perks' }, R.offer.map((id) => h('button', { class: 'perk', type: 'button', onclick: () => { E.takePerk(hero, id); R.offer = null; sfx.level(); persist(); renderVictory(); } }, h('b', {}, D.PERKS[id].name), h('small', {}, D.PERKS[id].text), h('i', {}, `You have ${hero.perks.filter((p) => p === id).length}/${D.PERKS[id].max}`))))) : null;
  const loot = R.picked == null ? h('section', { class: 'panel' }, h('div', { class: 't-eyebrow mb' }, 'Choose your spoils'),
    h('div', { class: 'loot' }, R.drops.map((inst, i) => V.weaponCard(inst, { actions: [primary('Take', () => { hero.bag.push(inst); R.picked = i; sfx.coin(); persist(); renderVictory(); }, { cls: 'small' })] }))))
    : h('section', { class: 'panel' }, h('p', { class: 'muted' }, `You took the ${D.RARITY[R.drops[R.picked].rarity]} ${D.WEAPONS[R.drops[R.picked].id].name}. It waits in your pack.`));
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
function showPartyVictory() {
  const b = S.battle;
  const r = E.partyRewards(b);
  const levels = {};
  for (const f of b.fighters) {
    const g = r.gold[f.hero.name] || 0;
    levels[f.hero.name] = f.hero.level;
    f.hero.gold = Math.max(0, f.hero.gold + g);
    f.hero.stats.goldEarned += Math.max(0, g);
    f.hero.stats.battles++;
    E.gainXp(f.hero, r.xp);
  }
  concludeRoadEffects();
  E.advanceCampaign(b.fighters[0].hero);
  persist();
  S.rewards = { party: true, ...r, levels, pickedBy: {}, picker: 0, offer: null, offering: null, quest: S.quest };
  sfx.win();
  if (b.fighters.some((f) => f.hero.level > levels[f.hero.name])) setTimeout(sfx.level, 700);
  renderPartyVictory();
}
function renderPartyVictory() {
  const R = S.rewards;
  const pending = S.company.members.find((m) => m.pendingPerks > 0);
  if (pending && (!R.offer || R.offering !== pending.name)) { R.offering = pending.name; R.offer = E.offerPerks(pending, fresh()); }
  if (!pending) { R.offer = null; R.offering = null; }
  const perks = pending && R.offer ? h('section', { class: 'panel glow' }, h('div', { class: 't-eyebrow mb' }, `${pending.name} · choose a perk`),
    h('div', { class: 'perks' }, R.offer.map((id) => h('button', { class: 'perk', type: 'button', onclick: () => { E.takePerk(pending, id); R.offer = null; sfx.level(); persist(); renderPartyVictory(); } },
      h('b', {}, D.PERKS[id].name), h('small', {}, D.PERKS[id].text))))) : null;
  const picker = R.order[R.picker];
  const lootDone = R.picker >= R.order.length;
  const loot = !lootDone ? h('section', { class: 'panel' }, h('div', { class: 't-eyebrow mb' }, `${picker} chooses · contrib ${R.contrib[picker] || 0}`),
    h('div', { class: 'loot' }, R.drops.map((inst, i) => R.pickedBy[i] ? null : V.weaponCard(inst, { actions: [primary('Take', () => { const who = S.company.members.find((m) => m.name === picker); who.bag.push(inst); R.pickedBy[i] = picker; R.picker++; sfx.coin(); persist(); renderPartyVictory(); }, { cls: 'small' })] }))))
    : h('section', { class: 'panel' }, h('p', { class: 'muted' }, 'The packs are full. One weapon stays on the road.'),
      h('div', { class: 'cardlist' }, Object.entries(R.pickedBy).map(([i, name]) => h('div', { class: 'mini-card' }, h('b', {}, name), h('small', {}, `${D.RARITY[R.drops[i].rarity]} ${D.WEAPONS[R.drops[i].id].name}`)))));
  const ready = !pending && lootDone;
  mount(
    h('header', { class: 'victory' }, h('div', { class: 't-eyebrow' }, R.quest.name), h('h1', {}, 'Victory'), h('p', { class: 'muted' }, 'The company is still standing.')),
    h('section', { class: 'panel' }, h('div', { class: 't-eyebrow mb' }, `+${R.xp} XP each`),
      h('div', { class: 'cardlist' }, S.company.members.map((m) => h('div', { class: 'mini-card' }, h('b', {}, m.name), h('small', {}, `${R.gold[m.name] >= 0 ? '+' : ''}${R.gold[m.name]} 🪙 · contrib ${R.contrib[m.name] || 0}${m.level > R.levels[m.name] ? ` · level ${m.level}` : ''}`))))),
    perks, loot,
    primary(ready ? '⛺ To camp' : 'Perks and spoils first', () => showCamp({ fromBoard: false }), { disabled: !ready, cls: 'wide big' }));
}
function defeat(retreat) {
  concludeRoadEffects();
  const heroes = isParty() ? S.battle.fighters.map((f) => f.hero) : [S.hero];
  let loss = 0;
  for (const hero of heroes) { const cut = Math.floor(hero.gold * 0.15); hero.gold -= cut; hero.stats.defeats++; loss += cut; }
  persist();
  sfx.lose();
  if (SCRUI.on() && !isParty() && world.battle) return SCRUI.defeat(retreat, loss);
  mount(h('header', { class: 'victory defeat' }, h('div', { class: 't-eyebrow' }, S.quest?.name || ''), h('h1', {}, retreat ? 'You withdraw' : 'You have fallen'),
    h('p', { class: 'muted' }, retreat ? 'A wise person lives to fight tomorrow.' : 'The dark wins this round. It does not get to keep you.')),
  section('', h('p', {}, loss ? `You dropped ${loss} 🪙 in the dust.` : 'You lost nothing but pride.'), h('p', { class: 'muted' }, 'Your level, gear and perks are safe. Rest at camp, then try again.')),
  primary('⛺ Return to camp', () => showCamp({ fromBoard: false }), { cls: 'wide big' }));
}

// ------------------------------------------------------------------ camp
function showCamp({ fromBoard = false } = {}) {
  S.battle = null;
  if (S.company?.members?.length) {
    if (!S.company.members[S.seat]) S.seat = 0;
    S.hero = S.company.members[S.seat];
  }
  persist(); renderCamp(fromBoard);
}
function seatBar(fromBoard) {
  if ((S.company?.members.length || 0) < 2) return null;
  return h('div', { class: 'seats' }, S.company.members.map((m, i) => h('button', {
    type: 'button', class: S.seat === i ? 'on' : '',
    onclick: () => { S.seat = i; S.hero = m; sfx.select(); renderCamp(fromBoard); },
  }, h('b', {}, `${D.CLASSES[m.cls].glyph} ${m.name}`), h('small', {}, `Lv ${m.level} · 🪙 ${m.gold}`))));
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
    h('p', { class: 'muted' }, S.company?.kind === 'company' ? 'Each hero spends their own gold. The peddler is shared. The road ahead is shared too.' : 'You are healed and your cards are ready. Gold is spent here; Magic only matters in a fight.'),
    seatBar(fromBoard),
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
  const sub = u.next ? `→ d${u.next}${hero.level < gate ? ` · unlocks at level ${gate}` : ''}` : 'Fully grown';
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
    section('Equipped', h('div', { class: 'loot' }, worn), h('p', { class: 'fine' }, 'Red faces attack, blue faces defend. Only two-handed weapons can land the top-row triple.')),
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
    section('Always available', h('div', { class: 'cardlist' }, h('div', { class: 'mini-card' }, h('b', {}, 'Heal'), h('small', {}, `${E.healCostOf(hero)}✦ · restore ${D.HEAL_AMOUNT} HP`)), h('div', { class: 'mini-card' }, h('b', {}, 'Heart nudge'), h('small', {}, `${D.NUDGE_COST}✦ · move your heart die up or down by 1`)))),
    chronicleBlock());
}
function chronicleBlock() {
  const log = (S.company?.campaign || S.hero?.campaign)?.chronicle || [];
  if (!log.length) return null;
  return section('The road remembers', h('div', { class: 'cardlist' }, log.slice(0, 8).map((entry) => h('div', { class: 'mini-card' }, h('b', {}, entry.title), h('small', {}, entry.text)))));
}

SCRUI.bind({
  S, members: membersOf, persist, fresh, mountAs, adopt, unlock, tip, menu, startQuest, showCamp, showBoard, showCreate, showTogether, showImport, showHowTo, resume,
  showRoadOrBoard, actName, actOf, nextPerkOffer, renderVictory, renderCamp, currentCode, copyCode, showTitle,
});
// Test/debug hook: only exposed when the page is opened with ?debug.
attachRoom({ S, mount, primary, ghost, section, cmd, bodyWrap, banner, showTitle, showHowTo, flicker });
export async function boot() {
  const gl = await world.boot($('#gl'));
  if (gl) { $('.app-frame').classList.add('has-gl'); document.body.classList.add('sx'); SCRUI.chrome(isMuted()); }
  await bootNet(showTitle);
}
export const debugApi = { S, E, D, startQuest, showBoard, showCamp, renderBattle, renderReset, world, B3, scr: SCR, showTitle, showCreate, showRoad, showRoadResult, showVictory, defeat, adopt, showRoadOrBoard, renderVictory };
