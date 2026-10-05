// Each phone is one hero. Screens for the shared table: lobby, road, camp, and the
// round where every hero and every monster decides before the fight runs.
import { h, $, toast, modal, buzz } from './dom.js';
import { sfx } from './audio.js';
import * as E from './engine.js';
import * as D from './data.js';
import * as V from './view.js';
import * as Net from './net.js';

let ctx = null;
const state = { view: null };
const seenTips = new Set();
let inflight = false;
let lobbyEdit = false;

export function attachRoom(c) { ctx = c; }
export const inRoom = () => !!ctx?.S?.net;

export async function bootNet(fallback) {
  if (!Net.savedSeat()) { fallback(); return; }
  try {
    const view = await Net.snapshot();
    if (!view) { fallback(); return; }
    if (view.missing) { Net.clearSeat(); fallback(); return; }
    openTable(view);
  } catch {
    fallback();
  }
}
export function resume() { return bootNet(() => ctx.showTitle()); }

export function showTogether() {
  lobbyEdit = false;
  renderEntry();
}

export function renderNet() {
  const view = ctx.S.net?.view || state.view;
  if (!view) return;
  paint(view);
}

function openTable(view) {
  state.view = null;
  ctx.S.netStage = '';
  ctx.S.sel = new Set();
  ctx.S.net = { view, send: act };
  ctx.S.hero = view.hero || null;
  ctx.S.company = null;
  ctx.S.battle = null;
  applyView(view);
  Net.connect((next) => applyView(next));
}

function applyView(view) {
  if (!view || !ctx?.S?.net) return;
  if (state.view && view.seq === state.view.seq) return;
  const prev = state.view;
  const slots = changedSlots(prev, view);
  ctx.S.holdScroll = !!(prev && view.phase === 'battle' && prev.phase === 'battle' && prev.battle?.me?.stage === 'shape' && view.battle?.me?.stage === 'shape');
  if (slots.length) { ctx.S.sel.clear(); ctx.S.focus = null; }
  state.view = view;
  ctx.S.net.view = view;
  if (prev) announce(prev, view);
  paint(view);
  ctx.S.holdScroll = false;
  if (slots.length && view.phase === 'battle' && view.battle?.me?.stage === 'shape') ctx.flicker(slots);
}

function changedSlots(prev, view) {
  const a = prev?.battle?.me?.board;
  const b = view?.battle?.me?.board;
  if (!b) return [];
  if (!a) return D.SLOTS.slice();
  return D.SLOTS.filter((s) => a[s]?.v !== b[s]?.v || !!a[s]?.bound !== !!b[s]?.bound);
}
function announce(prev, view) {
  if (prev.phase === 'battle' && view.phase === 'victory') { sfx.win(); ctx.banner('VICTORY', 'gold'); return; }
  if (prev.phase === 'battle' && view.phase === 'defeat') { sfx.lose(); return; }
  const rep = view.battle?.report;
  if (!rep || rep.round === prev.battle?.report?.round) return;
  if (rep.staggered?.length) { ctx.banner('STAGGERED!', 'gold'); sfx.synergy(); }
  if (rep.raged?.length) { ctx.banner('ENRAGED!', 'bad'); sfx.rage(); }
}

async function act(cmd) {
  if (inflight) return;
  inflight = true;
  try {
    const data = await Net.send(cmd);
    if (data?.view) applyView(data.view);
  } catch (e) {
    toast(e.message || 'The table did not answer.', 'bad');
    sfx.error();
  } finally { inflight = false; }
}

function leave() {
  state.view = null;
  Net.clearSeat();
  ctx.S.net = null;
  ctx.showTitle();
}
function menu(view) {
  const close = modal(h('div', { class: 'form' }, h('h2', {}, view?.name || 'Table'),
    h('div', { class: 'col' },
      ctx.ghost('How to play', () => { close(); ctx.showHowTo(); }),
      view?.phase === 'battle' ? ctx.ghost('Retreat (lose 15% gold)', () => { close(); confirmRetreat(); }) : null,
      ctx.ghost('Leave this phone', () => { close(); leave(); }),
      ctx.ghost('Close', () => close()))));
}
function confirmRetreat() {
  const close = modal(h('div', { class: 'form' }, h('h2', {}, 'Retreat?'),
    h('p', { class: 'muted' }, 'The whole company withdraws. Every hero drops 15% of their gold. Level, gear and perks stay.'),
    h('div', { class: 'row end' }, ctx.ghost('Stay', () => close()), ctx.primary('Retreat', () => { close(); act({ type: 'retreat' }); }))));
}
function hint(key, text) {
  if (seenTips.has(key)) return null;
  return h('div', { class: 'tip' }, h('span', { class: 'tip-i' }, '💡'), h('p', {}, text),
    h('button', { class: 'btn btn-ghost small', type: 'button', onclick: (e) => { seenTips.add(key); e.currentTarget.closest('.tip').remove(); } }, 'Got it'));
}
function chip(view) {
  const c = D.CLASSES[view.you.cls];
  const gold = view.hero ? view.hero.gold : null;
  return h('div', { class: 'herochip' }, h('span', { class: 'hc-glyph' }, c.glyph),
    h('div', {}, h('b', {}, view.you.name), h('small', {}, view.name)),
    gold != null ? h('div', { class: 'hc-res' }, h('span', { class: 'c-gold' }, `🪙 ${gold}`)) : null);
}
function topline(view, kicker, title) {
  return h('div', { class: 'topline' }, h('div', {}, h('div', { class: 't-eyebrow' }, kicker), h('h2', {}, title)), ctx.ghost('Menu', () => menu(view), { cls: 'small' }));
}
const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
function actName(hero) {
  const cycle = Math.floor((hero.campaign.act - 1) / D.ACTS.length);
  const act = D.ACTS[(hero.campaign.act - 1) % D.ACTS.length];
  return act.name + (cycle ? ` · Ascent ${cycle + 1}` : '');
}
function groupNames(ids) {
  const n = {};
  ids.forEach((id) => { n[id] = (n[id] || 0) + 1; });
  return Object.entries(n).map(([id, c]) => `${D.MONSTERS[id].name}${c > 1 ? ` ×${c}` : ''}`).join(' + ');
}

function paint(view) {
  if (view.phase === 'lobby') return renderLobby(view);
  if (view.phase === 'road') return renderRoad(view);
  if (view.phase === 'board') return renderBoard(view);
  if (view.phase === 'camp') return renderCamp(view);
  if (view.phase === 'battle') return renderBattle(view);
  if (view.phase === 'victory') return renderVictory(view);
  if (view.phase === 'defeat') return renderDefeat(view);
  ctx.mount(h('p', {}, 'The table is between moments.'), ctx.ghost('Leave', leave));
}

// ---------------------------------------------------------------- entry
function renderEntry() {
  ctx.mount(
    h('div', { class: 'topline' }, ctx.ghost('‹ Back', () => ctx.showTitle(), { cls: 'small' }), h('h2', {}, 'Play together')),
    ctx.section('',
      h('p', {}, 'One to six heroes, each on their own phone. You decide at the same time, and the monsters decide then too. When every choice is in, the fight runs.'),
      h('p', { class: 'fine' }, 'The host runs node server.mjs and reads the address out loud. One hero can take the road alone. A hero forged from the title never needs the server.')),
    ctx.cmd('Host', 'Open a table', 'You get a code. One to six heroes.', () => renderHost(), { glyph: '⚔', tone: 'versus' }),
    ctx.cmd('Join', 'I have a code', 'Sit down as your own hero.', () => renderJoin(), { glyph: '🎲', tone: 'tutorial' }));
}
function renderHost() {
  let cls = 'knight';
  const table = h('input', { class: 'input', maxlength: 24, placeholder: 'Company name', 'aria-label': 'Company name', autocomplete: 'off' });
  const name = h('input', { class: 'input', maxlength: 16, placeholder: 'Your hero’s name', 'aria-label': 'Hero name', autocomplete: 'off' });
  const msg = h('p', { class: 'form-msg' });
  const grid = h('div', { class: 'class-grid' });
  const detail = h('div', { class: 'panel class-detail' });
  const paintCls = () => {
    grid.replaceChildren(...Object.entries(D.CLASSES).map(([id, c]) => h('button', {
      type: 'button', class: `class-pick ${id === cls ? 'on' : ''}`,
      onclick: () => { cls = id; sfx.select(); paintCls(); },
    }, h('span', {}, c.glyph), h('b', {}, c.name.split(' ')[0]))));
    const c = D.CLASSES[cls];
    detail.replaceChildren(h('p', {}, c.blurb), h('p', { class: 'fine' }, `❤ ${c.hp} HP · ✦ ${c.startMagic} start`));
  };
  paintCls();
  const go = async () => {
    msg.textContent = '';
    try {
      const data = await Net.createSeat({ name: name.value, cls, table: table.value });
      sfx.level();
      openTable(data.view);
    } catch (e) { msg.textContent = e.message; sfx.error(); }
  };
  ctx.mount(
    h('div', { class: 'topline' }, ctx.ghost('‹ Back', renderEntry, { cls: 'small' }), h('h2', {}, 'Open a table')),
    ctx.section('The company', table, name),
    ctx.section('Your hero', grid, detail),
    msg, ctx.primary('Open the table', go, { cls: 'wide' }));
}
function renderJoin() {
  let cls = 'bard';
  const code = h('input', { class: 'input room-code-input', maxlength: 4, placeholder: 'CODE', 'aria-label': 'Room code', autocapitalize: 'characters', autocomplete: 'off' });
  const name = h('input', { class: 'input', maxlength: 16, placeholder: 'Your hero’s name', 'aria-label': 'Hero name', autocomplete: 'off' });
  const msg = h('p', { class: 'form-msg' });
  const holder = h('div');
  const paintCls = () => {
    holder.replaceChildren(h('div', { class: 'class-grid' }, Object.entries(D.CLASSES).map(([id, c]) => h('button', {
      type: 'button', class: `class-pick ${id === cls ? 'on' : ''}`,
      onclick: () => { cls = id; sfx.select(); paintCls(); },
    }, h('span', {}, c.glyph), h('b', {}, c.name.split(' ')[0])))));
  };
  paintCls();
  const go = async () => {
    msg.textContent = '';
    try {
      const data = await Net.joinSeat({ code: code.value, name: name.value, cls });
      sfx.level();
      openTable(data.view);
    } catch (e) { msg.textContent = e.message; sfx.error(); }
  };
  ctx.mount(
    h('div', { class: 'topline' }, ctx.ghost('‹ Back', renderEntry, { cls: 'small' }), h('h2', {}, 'Join a table')),
    ctx.section('The code', code, name, h('p', { class: 'fine' }, 'Four letters from the host’s phone. You bring your own hero.')),
    ctx.section('Your hero', holder),
    msg, ctx.primary('Sit down', go, { cls: 'wide' }));
}

// ---------------------------------------------------------------- lobby
function renderLobby(view) {
  const waiting = view.players.filter((p) => !p.ready).map((p) => p.name);
  const allReady = waiting.length === 0 && view.players.length >= 1 && view.players.length <= 6;
  const left = 6 - view.players.length;
  const seats = left === 5
    ? 'You can take the road alone, or friends can enter this code.'
    : left > 0
      ? `${left} ${left === 1 ? 'seat' : 'seats'} left.`
      : 'Six heroes. The table is full.';
  ctx.mount(
    topline(view, 'The table', view.name),
    h('div', { class: 'room-code', 'aria-label': `Room code ${view.code}` }, view.code.split('').join(' ')),
    h('p', { class: 'muted center' }, 'One to six heroes. Each plays on their own phone.'),
    h('p', { class: 'fine center' }, seats),
    view.links?.length ? h('div', { class: 'room-links' }, h('p', { class: 'fine' }, 'On their phone, open:'), ...view.links.map((u) => h('a', { href: u }, u))) : null,
    h('div', { class: 'row center' }, ctx.ghost('Copy code', () => copyCode(view.code), { cls: 'small' })),
    ctx.section('Heroes', h('div', { class: 'col' }, view.players.map((p) => h('div', { class: 'row between' },
      h('b', {}, `${D.CLASSES[p.cls].glyph} ${p.name}${p.host ? ' · host' : ''}`),
      h('span', { class: 'fine' }, p.ready ? 'Ready' : 'Choosing'))))),
    lobbyEdit ? lobbyEditor(view) : ctx.ghost('Change my hero', () => { lobbyEdit = true; renderLobby(view); }, { cls: 'small' }),
    view.you.ready
      ? ctx.ghost('Not ready', () => act({ type: 'ready', on: false }))
      : ctx.primary('I’m ready', () => act({ type: 'ready', name: view.you.name, cls: view.you.cls })),
    view.you.host ? ctx.primary(allReady ? 'Take the road' : (view.players.length === 1 ? 'Ready up, then you start' : 'Everyone readies, then you start'), () => act({ type: 'start' }), { cls: 'wide big', disabled: !allReady }) : h('p', { class: 'fine center' }, 'The host starts the campaign when every hero is ready.'));
}
function lobbyEditor(view) {
  let cls = view.you.cls;
  const name = h('input', { class: 'input', maxlength: 16, value: view.you.name, 'aria-label': 'Hero name' });
  const holder = h('div');
  const paintCls = () => {
    holder.replaceChildren(h('div', { class: 'class-grid' }, Object.entries(D.CLASSES).map(([id, c]) => h('button', {
      type: 'button', class: `class-pick ${id === cls ? 'on' : ''}`,
      onclick: () => { cls = id; sfx.select(); paintCls(); },
    }, h('span', {}, c.glyph), h('b', {}, c.name.split(' ')[0])))));
  };
  paintCls();
  return ctx.section('Your seat', name, holder, ctx.primary('Save', () => { lobbyEdit = false; act({ type: 'sit', name: name.value, cls }); }, { cls: 'small' }));
}
function copyCode(code) {
  const done = () => toast('Code copied.', 'good');
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done, () => toast(code, 'good'));
  else toast(code, 'good');
}

// ---------------------------------------------------------------- road & board
function renderRoad(view) {
  const road = view.road;
  if (road.done) {
    const waiting = road.waiting || [];
    const mine = waiting.includes(view.you.name);
    ctx.mount(
      topline(view, 'The road answers', road.title),
      h('article', { class: 'road' }, h('p', { class: 'road-tell' }, road.text), h('p', { class: 'fine' }, `${road.by} chose for the company.`)),
      mine ? ctx.primary('Onward', () => act({ type: 'onward' }), { cls: 'wide big' }) : h('p', { class: 'wait' }, `Waiting for ${waiting.join(', ')}.`));
    return;
  }
  ctx.mount(
    topline(view, road.kicker || 'The road', road.title),
    h('article', { class: 'road' }, h('p', { class: 'road-tell' }, road.tell)),
    h('p', { class: 'fine' }, 'Any phone can choose. The first choice is the company’s.'),
    h('div', { class: 'quests' }, road.choices.map((ch) => h('button', {
      class: 'qcard road-choice', type: 'button', disabled: !ch.ok,
      onclick: () => { sfx.click(); act({ type: 'choose', id: ch.id }); },
    }, h('div', { class: 'qbody' }, h('b', {}, ch.label), h('small', {}, ch.hint)), h('span', { class: 'cmd-go' }, '›')))),
    hint('road', 'The computer runs the road. A choice can pay you, wound you, or change the next fight. Everyone sees the same scene.'));
}
function renderBoard(view) {
  const hero = view.hero;
  const b = view.board;
  const c = hero.campaign;
  const path = h('div', { class: 'path' }, Array.from({ length: D.QUESTS_PER_ACT }, (_, i) => {
    const n = i + 1;
    const st = n < c.step ? 'done' : n === c.step ? 'now' : '';
    return h('div', { class: `node ${st} ${n === D.QUESTS_PER_ACT ? 'boss' : D.ELITE_STEPS.includes(n) ? 'elite' : ''}` }, n === D.QUESTS_PER_ACT ? '👑' : D.ELITE_STEPS.includes(n) ? '☠' : n < c.step ? '✓' : String(n));
  }));
  ctx.mount(
    h('div', { class: 'topline' }, chip(view), ctx.ghost('Menu', () => menu(view), { cls: 'small' })),
    h('div', { class: 'levels' }, view.mates.map((m) => h('span', {}, `${D.CLASSES[m.cls].glyph} ${m.name} · Lv ${m.level} · 🪙 ${m.gold}`))),
    h('header', { class: 'act' }, h('div', { class: 't-eyebrow' }, `Act ${romans[c.act - 1] || c.act} · Quest ${c.step} of ${D.QUESTS_PER_ACT}`), h('h2', {}, actName(hero)), h('p', { class: 'muted' }, D.ACTS[(c.act - 1) % D.ACTS.length].tag)),
    path,
    b.blessings?.length ? h('p', { class: 'boon' }, b.blessings.join(' · ')) : null,
    b.ambush ? h('p', { class: 'warn' }, 'An ambush is waiting on whichever road you take.') : null,
    h('p', { class: 'fine' }, 'Any hero can choose the quest. It starts on every phone.'),
    h('div', { class: 'quests' }, b.quests.map((q) => {
      const total = q.enemies.reduce((a, id) => a + Math.round(D.MONSTERS[id].hp * q.hpMult), 0);
      const tag = q.kind === 'boss' ? 'BOSS' : q.kind === 'elite' ? 'ELITE' : q.perilous ? 'PERILOUS · rewards ×1.5' : 'STANDARD';
      return h('button', { class: `qcard ${q.kind} ${q.perilous ? 'perilous' : ''}`, type: 'button', onclick: () => { sfx.click(); act({ type: 'quest', id: q.id }); } },
        h('div', { class: 'qglyphs' }, q.enemies.map((id) => h('span', {}, D.MONSTERS[id].glyph))),
        h('div', { class: 'qbody' }, h('span', { class: 't-eyebrow' }, tag), h('b', {}, q.name), h('small', {}, groupNames(q.enemies)), h('small', { class: 'muted' }, `~${total} total HP · ${q.enemies.reduce((a, id) => a + Math.round(D.MONSTERS[id].xp * q.rewardMult), 0)} XP`)),
        h('span', { class: 'cmd-go' }, '›'));
    })),
    ctx.ghost('⛺ Visit camp', () => act({ type: 'camp' })));
}

// ---------------------------------------------------------------- camp
let campTab = 'forge';
function renderCamp(view) {
  const hero = view.hero;
  ctx.S.hero = hero;
  const tabs = [['forge', '🔨 Forge'], ['gear', '🎒 Gear'], ['hero', '📜 Hero']];
  const body = campTab === 'gear' ? campGear(view) : campTab === 'hero' ? campHero(view) : campForge(hero);
  const offer = view.perkOffer;
  const perks = offer ? h('section', { class: 'panel glow' }, h('div', { class: 't-eyebrow mb' }, 'Choose a perk'),
    h('div', { class: 'perks' }, offer.map((id) => h('button', { class: 'perk', type: 'button', onclick: () => { sfx.level(); act({ type: 'perk', id }); } }, h('b', {}, D.PERKS[id].name), h('small', {}, D.PERKS[id].text))))) : null;
  const waiting = view.mates.filter((m) => !m.ready).map((m) => m.name);
  const iAm = view.mates.find((m) => m.id === view.you.id);
  ctx.mount(
    h('div', { class: 'topline' }, h('div', {}, h('div', { class: 't-eyebrow' }, 'The fire is warm'), h('h2', {}, 'Camp')), chip(view)),
    h('p', { class: 'muted' }, 'Your gold, your dice, your phone. The peddler is shared. Ready up when you want the road.'),
    h('div', { class: 'levels' }, view.mates.map((m) => h('span', {}, `${D.CLASSES[m.cls].glyph} ${m.name}${m.ready ? ' · ready' : ''}`))),
    perks,
    h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, label]) => h('button', { class: campTab === id ? 'on' : '', type: 'button', role: 'tab', onclick: () => { campTab = id; sfx.select(); renderCamp(view); } }, label))),
    body,
    iAm?.ready
      ? h('p', { class: 'wait' }, waiting.length ? `Waiting for ${waiting.join(', ')}.` : 'The company is ready.')
      : ctx.primary(offer ? 'Choose a perk first' : 'Ready for the road', () => act({ type: 'ready' }), { cls: 'wide big', disabled: !!offer }));
}
function campForge(hero) {
  const row = (kind, slot, label) => {
    const size = hero[kind][slot];
    const steps = kind === 'strength' ? D.STRENGTH_STEPS : D.SPECIAL_STEPS;
    const u = kind === 'strength' ? E.strengthUpgrade(hero, slot) : E.specialUpgrade(hero, slot);
    const gate = steps[size]?.[1];
    const sub = u.next ? `→ d${u.next}${hero.level < gate ? ` · unlocks at level ${gate}` : ''}` : 'Fully grown';
    return h('div', { class: 'urow' }, h('div', { class: 'udie' }, `d${size}`), h('div', { class: 'ucopy' }, h('b', {}, label), h('small', { class: 'muted' }, sub)),
      u.next ? ctx.primary(`🪙 ${u.cost}`, () => act({ type: 'upgrade', kind, slot }), { disabled: !u.ok, cls: 'small' }) : h('span', { class: 'maxed' }, 'MAX'));
  };
  return h('div', { class: 'col' },
    ctx.section('Strength dice', row('strength', 'W', 'Left hand'), row('strength', 'E', 'Right hand')),
    ctx.section('Special dice', row('special', 'SW', 'Left special'), row('special', 'SE', 'Right special')),
    h('p', { class: 'fine center' }, `You carry ${hero.gold} 🪙.`));
}
function campGear(view) {
  const hero = view.hero;
  const two = E.isTwoHanded(hero);
  const worn = two ? [V.weaponCard(hero.loadout.NW, { note: 'Both hands' })] : [V.weaponCard(hero.loadout.NW, { note: 'Left hand' }), V.weaponCard(hero.loadout.NE, { note: 'Right hand' })];
  const bag = (hero.bag || []).map((inst) => {
    const w = D.WEAPONS[inst.id];
    const acts = w.hands === 2
      ? [ctx.ghost('Equip', () => act({ type: 'equip', uid: inst.uid }), { cls: 'small' })]
      : [ctx.ghost('Equip L', () => act({ type: 'equip', uid: inst.uid, side: 'NW' }), { cls: 'small' }), ctx.ghost('Equip R', () => act({ type: 'equip', uid: inst.uid, side: 'NE' }), { cls: 'small' })];
    acts.push(ctx.ghost(`Sell 🪙 ${E.sellValue(inst)}`, () => act({ type: 'sell', uid: inst.uid }), { cls: 'small' }));
    return V.weaponCard(inst, { actions: acts });
  });
  const stock = hero.campaign?.shop?.items || [];
  return h('div', { class: 'col' },
    ctx.section('Equipped', h('div', { class: 'loot' }, worn)),
    ctx.section(`Pack (${bag.length})`, bag.length ? h('div', { class: 'loot' }, bag) : h('p', { class: 'muted' }, 'Nothing yet. Monsters drop weapons.')),
    ctx.section('The peddler', stock.length ? h('div', { class: 'loot' }, stock.map((it, i) => V.weaponCard(it.inst, { actions: [it.sold ? h('em', { class: 'muted' }, 'Sold') : ctx.primary(`Buy 🪙 ${it.price}`, () => act({ type: 'buy', index: i }), { disabled: hero.gold < it.price, cls: 'small' })] }))) : h('p', { class: 'muted' }, 'The peddler is packing.')));
}
function campHero(view) {
  const hero = view.hero;
  const c = D.CLASSES[hero.cls];
  const perkCount = {};
  (hero.perks || []).forEach((p) => { perkCount[p] = (perkCount[p] || 0) + 1; });
  const log = hero.campaign?.chronicle || [];
  return h('div', { class: 'col' },
    ctx.section(`${hero.name} · Level ${hero.level} ${c.name}`,
      h('div', { class: 'stats' }, h('span', {}, `❤ ${E.maxHpOf(hero)} HP`), h('span', {}, `⚡ d${E.feetSize(hero)} initiative`))),
    ctx.section('Perks', Object.keys(perkCount).length ? h('div', { class: 'cardlist' }, Object.entries(perkCount).map(([id, n]) => h('div', { class: 'mini-card' }, h('b', {}, `${D.PERKS[id].name}${n > 1 ? ` ×${n}` : ''}`), h('small', {}, D.PERKS[id].text)))) : h('p', { class: 'muted' }, 'You earn a perk every level.')),
    log.length ? ctx.section('The road remembers', h('div', { class: 'cardlist' }, log.slice(0, 6).map((entry) => h('div', { class: 'mini-card' }, h('b', {}, entry.title), h('small', {}, entry.text))))) : null);
}

// ---------------------------------------------------------------- battle
function syncChoice(view) {
  const key = `${view.battle.round}:${view.battle.me?.stage}`;
  if (ctx.S.netStage === key) return;
  ctx.S.netStage = key;
  ctx.S.target = view.battle.me?.target || 0;
  ctx.S.straight = view.battle.me?.straight || 'atk';
  ctx.S.sel.clear();
  ctx.S.focus = null;
}
function hydrate(view) {
  const btl = view.battle;
  const me = btl.me;
  ctx.S.hero = me.hero;
  ctx.S.quest = { name: btl.questName };
  ctx.S.battle = {
    phase: me.stage === 'shape' ? 'shape' : 'reset',
    round: btl.round, hero: me.hero, hp: me.hp, maxHp: me.maxHp, magic: me.magic,
    board: me.board, actionsLeft: me.actionsLeft, freeActions: me.freeActions || [],
    used: me.used || {}, mods: me.mods || { atk: 0, pierce: 0, block: 0, heal: 0, stagger: 0, weaken: 0 },
    boundNow: me.boundNow || 0, enemies: btl.enemies,
  };
}
function statusWord(status) {
  if (status === 'down') return 'Down';
  if (status === 'locked') return 'Locked in';
  if (status === 'skipped') return 'Away this round';
  if (status === 'shape') return 'Shaping';
  return 'Choosing';
}
function roster(view) {
  return h('div', { class: 'roster' }, view.battle.roster.map((r) => h('div', {
    class: `mate ${r.id === view.you.id ? 'on' : ''} ${r.status === 'down' ? 'down' : ''} ${r.status === 'locked' ? 'locked' : ''}`,
  },
  h('div', { class: 'mate-name' }, h('span', {}, D.CLASSES[r.cls].glyph), h('b', {}, r.name)),
  V.hpBar(r.hp, r.maxHp, { cls: 'hero-bar', label: true }),
  h('small', {}, statusWord(r.status)),
  view.you.host && r.id !== view.you.id && (r.status === 'reset' || r.status === 'shape')
    ? h('button', { type: 'button', class: 'btn btn-ghost small', onclick: () => act({ type: 'skip', playerId: r.id }) }, 'Skip this round')
    : null)));
}
function waitingLine(view) {
  const names = view.battle.roster.filter((r) => r.status === 'reset' || r.status === 'shape').map((r) => r.name);
  if (!names.length) return null;
  return h('p', { class: 'wait' }, names.length === view.battle.roster.filter((r) => r.status !== 'down').length
    ? 'Everyone is deciding. The monsters have already chosen.'
    : `Waiting for ${names.join(', ')}. The fight runs when every hero has locked in.`);
}
function teles(enemies) {
  const alive = enemies.filter((e) => e.hp > 0);
  const wind = alive.filter((e) => e.intent?.slam || e.intent?.v === 'charge');
  return h('div', {},
    h('div', { class: 't-eyebrow mb' }, 'The monsters have chosen'),
    h('div', { class: 'teles' }, alive.map((e) => {
      const info = V.intentInfo(e);
      return h('div', { class: `tele ${info.tone}` },
        h('div', { class: 'tele-portrait' }, e.glyph),
        h('div', { class: 'tele-copy' }, h('b', {}, e.name), h('small', { class: 'muted' }, `${Math.ceil(e.hp)}/${e.maxHp} HP · ⚡ d${D.MONSTERS[e.id]?.init || 4}`),
          h('div', { class: `intent big ${info.tone}` }, h('span', { class: 'iicon' }, info.icon), h('div', { class: 'itext' }, h('b', {}, info.title), h('small', {}, info.text)))));
    })),
    wind.length ? h('p', { class: 'warn' }, `⚠ A Slam is coming: ${wind.map((e) => e.name).join(', ')}.`) : null);
}
function logOf(view) {
  const rep = view.battle.report;
  if (!rep?.party) return null;
  const lines = V.partyReportLines(rep, { enemies: view.battle.enemies });
  return ctx.section(`Round ${rep.round}`, h('ul', { class: 'log' }, lines.map((l) => h('li', { class: l.kind }, l.text))));
}
function renderBattle(view) {
  syncChoice(view);
  const stage = view.battle.me?.stage;
  if (stage === 'shape') return renderShape(view);
  if (stage === 'locked') return renderLocked(view);
  if (stage === 'skipped') return renderAway(view);
  return renderReset(view);
}
function renderAway(view) {
  ctx.mount(
    topline(view, view.battle.questName, 'Away this round'),
    roster(view),
    teles(view.battle.enemies),
    h('p', { class: 'muted' }, 'The host marked you away. You do not strike this round, and you do not draw the monsters’ heat.'),
    waitingLine(view));
}
function renderReset(view) {
  const me = view.battle.me;
  const hero = me.hero;
  hydrate(view);
  const cards = E.cardsOf(hero).filter((k) => me.used?.[k.id]);
  ctx.mount(
    topline(view, view.battle.questName, `Round ${view.battle.round}`),
    roster(view),
    logOf(view),
    hint('phones', 'The monsters have already chosen. Shape your own dice on this phone. Nobody sees them until every hero has locked in, and then the fight runs once.'),
    teles(view.battle.enemies),
    ctx.section('You',
      h('div', { class: 'hero-hp-row' }, h('span', { class: 'c-heal' }, '❤'), h('div', { class: 'hero-hp' }, V.hpBar(me.hp, me.maxHp, { cls: 'hero-bar' })), h('span', { class: 'magic-badge' }, `✦ ${me.magic}`)),
      h('div', { class: 'row' }, ctx.ghost(`✚ Heal +${D.HEAL_AMOUNT} · ${E.healCostOf(hero)}✦`, () => { sfx.heal(); act({ type: 'heal' }); }, { cls: 'small', disabled: me.magic < E.healCostOf(hero) || me.hp >= me.maxHp })),
      cards.length ? h('div', { class: 'cardlist' }, cards.map((k) => h('div', { class: 'mini-card spent' }, h('b', {}, k.name), ctx.ghost(`Recharge · ${D.RECHARGE_COST}✦`, () => act({ type: 'recharge', id: k.id }), { cls: 'small', disabled: me.magic < D.RECHARGE_COST })))) : null),
    ctx.bodyWrap(h('div', { class: 'board board-empty', 'aria-hidden': 'true' }), hero),
    waitingLine(view),
    me.stage === 'down'
      ? h('p', { class: 'muted' }, 'You are down. The others will finish this fight.')
      : ctx.primary('🎲 Roll your dice', () => { sfx.roll(); act({ type: 'roll' }); }, { cls: 'wide big' }));
}
function renderLocked(view) {
  const me = view.battle.me;
  hydrate(view);
  const hero = me.hero;
  const ev = E.evaluate(hero, me.board, { straight: me.straight || 'atk' });
  const board = h('div', { class: 'board locked' }, D.SLOTS.map((slot) => V.dieEl(hero, slot, me.board[slot], { dim: true })));
  ctx.mount(
    topline(view, 'Locked in', hero.name),
    roster(view),
    teles(view.battle.enemies),
    ctx.bodyWrap(board, hero),
    V.forecastEl(ev, me.mods || {}),
    h('p', { class: 'wait' }, 'Your dice are in. You can still take them back until everyone has locked.'),
    waitingLine(view),
    ctx.ghost('Unlock', () => act({ type: 'unlock' })));
}
function renderShape(view) {
  hydrate(view);
  const b = ctx.S.battle;
  const hero = ctx.S.hero;
  if (!b.enemies[ctx.S.target] || b.enemies[ctx.S.target].hp <= 0) ctx.S.target = Math.max(0, b.enemies.findIndex((e) => e.hp > 0));
  const ev = E.evaluate(hero, b.board, { straight: ctx.S.straight });
  const info = E.rerollInfo(b);
  const two = E.isTwoHanded(hero);
  const board = h('div', { class: `board ${two ? 'is2h' : ''}` }, D.SLOTS.map((slot) => V.dieEl(hero, slot, b.board[slot], {
    selected: ctx.S.sel.has(slot), onclick: () => toggle(slot), twohand: two && D.ROLE[slot] === 'weapon',
  })));
  if (ev.offense3) ['NW', 'N', 'NE'].forEach((s) => $(`[data-slot="${s}"]`, board).classList.add('syn'));
  if (ev.defense3) ['N', 'C', 'S'].forEach((s) => $(`[data-slot="${s}"]`, board).classList.add('syn'));
  const notes = V.synergyNotes(ev, b.mods);
  const cards = E.cardsOf(hero);
  const pips = h('div', { class: 'pips', 'aria-label': 'Reroll actions left' }, Array.from({ length: D.REROLL_ACTIONS }, (_, i) => h('i', { class: i < b.actionsLeft ? 'on' : '' })), b.freeActions.length ? h('b', { class: 'free' }, `+${b.freeActions.length} free`) : null);
  ctx.mount(
    topline(view, `${D.CLASSES[hero.cls].name} · round ${b.round}`, hero.name),
    roster(view),
    h('div', { class: 'ecards', 'data-n': b.enemies.filter((e) => e.hp > 0).length }, b.enemies.map((e, i) => V.enemyCard(e, { targeted: i === ctx.S.target && e.hp > 0, onclick: () => { ctx.S.target = i; sfx.select(); renderShape(view); } }))),
    h('div', { class: 'hero-hp-row' }, h('span', { class: 'c-heal' }, '❤'), h('div', { class: 'hero-hp' }, V.hpBar(b.hp, b.maxHp, { cls: 'hero-bar' })), h('span', { class: 'magic-badge' }, `✦ ${b.magic}`)),
    b.boundNow ? h('p', { class: 'warn' }, `⛓ ${b.boundNow} of your dice ${b.boundNow > 1 ? 'are' : 'is'} hexed and cannot be rerolled.`) : null,
    h('div', { id: 'live' },
      ctx.bodyWrap(board, hero),
      V.forecastEl(ev, b.mods),
      h('div', { class: 'notes' }, notes.map((n) => h('span', { class: `note ${n.kind}` }, n.text))),
      h('p', { id: 'focus', class: 'focus' }, ctx.S.focus ? V.describeDie(hero, ctx.S.focus, b.board[ctx.S.focus].v) : 'Tap dice to reroll them. Tap a monster to choose your target.')),
    h('div', { class: 'actions' },
      h('div', { class: 'row between' }, pips, h('div', { class: 'row tight' },
        ctx.ghost('♥ ▼', () => act({ type: 'nudge', dir: -1 }), { cls: 'small', disabled: b.magic < D.NUDGE_COST || b.board.C.v <= 1 }),
        ctx.ghost('♥ ▲', () => act({ type: 'nudge', dir: 1 }), { cls: 'small', disabled: b.magic < D.NUDGE_COST || b.board.C.v >= 6 }),
        ctx.ghost(`✚ ${E.healCostOf(hero)}✦`, () => act({ type: 'heal' }), { cls: 'small', disabled: b.magic < E.healCostOf(hero) || b.hp >= b.maxHp }))),
      h('button', { id: 'reroll', class: 'btn btn-buy wide', type: 'button', onclick: () => sendReroll(), disabled: !E.canReroll(b, [...ctx.S.sel]) }, rerollLabel(info))),
    cards.length ? h('div', { class: 'cardbar' }, cards.map((k) => h('button', {
      class: `cardbtn ${b.used[k.id] ? 'spent' : ''}`, type: 'button', disabled: !!b.used[k.id] || b.magic < k.cost,
      onclick: () => { sfx.card(); act({ type: 'card', id: k.id }); },
    }, h('b', {}, k.name), h('span', {}, `${k.cost}✦`), h('small', {}, b.used[k.id] ? 'spent' : k.text)))) : null,
    ev.straight ? h('div', { class: 'straight' }, h('span', {}, `★ ${ev.straight}-straight worth ${ev.straightBonus}`), h('div', { class: 'seg' },
      h('button', { type: 'button', class: ctx.S.straight === 'atk' ? 'on' : '', onclick: () => { ctx.S.straight = 'atk'; renderShape(view); } }, '⚔ Attack'),
      h('button', { type: 'button', class: ctx.S.straight === 'gold' ? 'on' : '', onclick: () => { ctx.S.straight = 'gold'; renderShape(view); } }, '🪙 Gold'))) : null,
    waitingLine(view),
    ctx.primary('🔒 Lock in', () => { sfx.lock(); buzz(20); act({ type: 'lock', target: ctx.S.target, straight: ctx.S.straight }); }, { cls: 'wide big lock' }));
}
function toggle(slot) {
  const b = ctx.S.battle;
  const info = E.rerollInfo(b);
  ctx.S.focus = slot;
  if (b.board[slot].bound) { sfx.error(); toast('That die is hexed. It cannot be rerolled this round.', 'bad'); updateLive(); return; }
  if (ctx.S.sel.has(slot)) ctx.S.sel.delete(slot);
  else if (info.kind === 'none') { sfx.error(); toast('No reroll actions left.'); }
  else if (ctx.S.sel.size >= info.dice) { sfx.error(); toast(`You can reroll up to ${info.dice} dice at a time.`); }
  else { ctx.S.sel.add(slot); sfx.select(); }
  updateLive();
}
function updateLive() {
  const live = $('#live'); if (!live || !ctx.S.battle) return;
  const b = ctx.S.battle;
  document.querySelectorAll('.die').forEach((el) => {
    const s = el.dataset.slot;
    const on = ctx.S.sel.has(s);
    el.classList.toggle('sel', on);
    el.setAttribute('aria-pressed', String(on));
    el.classList.toggle('focus', ctx.S.focus === s);
  });
  const info = E.rerollInfo(b);
  const btn = $('#reroll');
  if (btn) { btn.textContent = rerollLabel(info); btn.disabled = !E.canReroll(b, [...ctx.S.sel]); }
  const f = $('#focus');
  if (f) f.textContent = ctx.S.focus ? V.describeDie(ctx.S.hero, ctx.S.focus, b.board[ctx.S.focus].v) : 'Tap dice to reroll them. Tap a monster to choose your target.';
}
function rerollLabel(info) {
  if (info.kind === 'none') return 'No rerolls left';
  const n = ctx.S.sel.size;
  const cost = info.perDie * n;
  return n ? `Reroll ${n} ${n === 1 ? 'die' : 'dice'} · ${cost ? `${cost}✦` : 'free'}` : `Reroll up to ${info.dice} · ${info.perDie ? `${info.perDie}✦ each` : 'free'}`;
}
function sendReroll() {
  const slots = [...ctx.S.sel];
  if (!E.canReroll(ctx.S.battle, slots)) { sfx.error(); toast(slots.length ? 'Not enough ✦ Magic for that.' : 'Tap the dice you want to reroll.'); return; }
  sfx.roll();
  act({ type: 'reroll', slots });
}

// ---------------------------------------------------------------- victory & defeat
function renderVictory(view) {
  const v = view.victory;
  const hero = view.hero;
  const mine = v.waiting === hero.name;
  const offer = view.perkOffer;
  ctx.mount(
    h('header', { class: 'victory' }, h('div', { class: 't-eyebrow' }, v.questName), h('h1', {}, 'Victory'), h('p', { class: 'muted' }, 'The company is still standing.')),
    h('section', { class: 'panel' }, h('div', { class: 't-eyebrow mb' }, `+${v.xp} XP each`),
      h('div', { class: 'cardlist' }, v.order.map((name) => h('div', { class: 'mini-card' }, h('b', {}, name), h('small', {}, `${v.gold[name] >= 0 ? '+' : ''}${v.gold[name]} 🪙 · contrib ${v.contrib[name] || 0}`))))),
    offer ? h('section', { class: 'panel glow' }, h('div', { class: 't-eyebrow mb' }, 'Choose your perk'),
      h('div', { class: 'perks' }, offer.map((id) => h('button', { class: 'perk', type: 'button', onclick: () => { sfx.level(); act({ type: 'perk', id }); } }, h('b', {}, D.PERKS[id].name), h('small', {}, D.PERKS[id].text))))) : null,
    v.waiting ? h('section', { class: 'panel' }, h('div', { class: 't-eyebrow mb' }, mine ? 'Your pick of the spoils' : `${v.waiting} is choosing`),
      mine ? h('div', { class: 'loot' }, v.drops.map((inst, i) => v.picked[String(i)] ? null : V.weaponCard(inst, { actions: [ctx.primary('Take', () => { sfx.coin(); act({ type: 'loot', index: i }); }, { cls: 'small' })] }))) : h('p', { class: 'muted' }, 'The packs are passed in the order of who did the most.'),
      mine || view.you.host ? ctx.ghost('Leave this pick on the road', () => act({ type: 'pass-loot' }), { cls: 'small' }) : null)
      : h('p', { class: 'muted' }, 'Spoils are settled. Camp is next.'));
}
function renderDefeat(view) {
  const d = view.defeat;
  ctx.mount(
    h('header', { class: 'victory defeat' }, h('div', { class: 't-eyebrow' }, d.questName), h('h1', {}, d.retreat ? 'The company withdraws' : 'The company has fallen'),
      h('p', { class: 'muted' }, d.retreat ? 'A wise company lives to fight tomorrow.' : 'The dark wins this round. It does not get to keep you.')),
    ctx.section('', h('p', {}, d.loss ? `The company dropped ${d.loss} 🪙 in the dust.` : 'You lost nothing but pride.'), h('p', { class: 'muted' }, 'Level, gear and perks are safe.')),
    ctx.primary('⛺ Return to camp', () => act({ type: 'rest' }), { cls: 'wide big' }));
}
