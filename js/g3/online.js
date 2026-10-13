// Playing together, each on their own phone (Dave, Oct 2026). This is the whole online game: one table, up to six
// heroes, and every phone shows it in the same 3D screens as a solo game. No game server: the table is a document
// (cloud.js) or lives in `node server.mjs` (net.js), and this phone keeps a copy of it (session.js).
//
// What this file does: open or join a table, then, whenever the table changes phase, put the right screen up:
//   lobby   gather round the fire, share the code, ready up, the host starts
//   road    a road event the company decides together        board   the quest board (the host or anyone picks)
//   battle  the 3D battle, one hero per phone (battle3d.js, net mode)
//   victory / defeat   spoils, perks, back to camp               camp   every hero's own camp, then ready up
// Rules live in table.js (commands) and engine.js; this file only decides what is on screen and what to send.
import { h, $, toast, modal } from '../dom.js';
import { sfx } from '../audio.js';
import * as E from '../engine.js';
import * as D from '../data.js';
import * as Net from '../net.js';
import * as Sess from '../session.js';
import * as SCRUI from './scrui.js';
import * as SCR from './screens.js';
import * as ST from '../story.js';
import * as R from '../roads.js';
import { world } from './world.js';
import * as B3 from './battle3d.js';
import { bragBoard, closeBrag, bragOpen } from './brag.js';

let X = null; // what ui.js hands over (S, showTitle, ...)
let stop = null; // the live feed
export function bind(ctx) { X = ctx; }
export const inRoom = () => Sess.active() && !!X?.S?.net;
const K = () => SCRUI.kit;

// ------------------------------------------------------------------------------------------------ getting to a table
// A shared invite link (?join=CODE) opens the join screen with the code filled in; a seat this tab still holds comes back in.
export async function boot(fallback) {
  const params = new URLSearchParams(location.search);
  const invite = (params.get('join') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (invite) {
    params.delete('join');
    history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`);
    if (Net.savedSeat()?.code !== invite) { fallback(); join(invite); return; }
  }
  if (!Net.savedSeat()) { fallback(); return; }
  try {
    const view = await Net.snapshot();
    if (!view) { fallback(); return; }
    if (view.missing) { Net.clearSeat(); fallback(); return; }
    openTable(view);
  } catch { fallback(); }
}
export function resume() { return boot(() => X.showTitle()); }

// "Play together": host a table or join one.
export function together() {
  const { plaque, mountAs, lay, eyebrow, flourish } = K();
  const menu = h('nav', { class: 'sx-menu', 'aria-label': 'Play together' },
    h('div', { class: 'sx-eye menu-label' }, 'Play together'),
    plaque({ eyebrow: 'Host', title: 'Open a table', sub: 'You get a code. Share it with your friends.', icon: 'people', tone: 'is-together', primary: true, onclick: () => host() }),
    plaque({ eyebrow: 'Join', title: 'Join a table', sub: 'Enter the four-letter code a friend gave you.', icon: 'key', tone: 'is-together', onclick: () => join('') }),
    plaque({ eyebrow: '', title: 'Back', icon: 'chevron', onclick: () => X.showTitle() }));
  void eyebrow; void flourish;
  X.S.net = null;
  mountAs('title', h('div', { class: 'sx-title-shell' }, h('div', { class: 'sx-title-brand' }), h('div', { class: 'sx-title-menu' }, menu)));
  lay('title'); SCR.enter('title', { cls: 'knight' }, 'title:together');
}
function host() {
  SCRUI.create({ table: { mode: 'host', back: together, onDone: async (name, cls, x) => {
    const data = await Net.createSeat({ name, cls, table: x.table || `${name}'s company` });
    sfx.level(); openTable(data.view);
  } } });
}
export function join(prefill = '') {
  SCRUI.create({ table: { mode: 'join', code: prefill, back: together, onDone: async (name, cls, x) => {
    const data = await Net.joinSeat({ code: x.code, name, cls });
    sfx.level(); openTable(data.view);
  } } });
}

// Sit down: start the session, listen for the table, put its screen up.
function openTable(view) {
  const S = X.S;
  S.net = { code: view.code };
  S.practice = null; S.battle = null; S.company = null; S.hero = null;
  Sess.close(); Sess.open(view);
  Sess.onChange((prev, next, info) => changed(prev, next, info));
  stop?.(); Net.connect((v) => Sess.adopt(v, 'feed')); stop = () => Net.disconnect();
  show();
}
export function leave() {
  stop?.(); stop = null;
  Net.clearSeat(); Sess.close();
  const S = X.S; S.net = null; S.hero = null; S.company = null; S.battle = null;
  X.showTitle();
}

// ------------------------------------------------------------------------------------------------ routing
// The solo screens read S.hero / S.company / S.battle: point them at this phone's copy of the table.
const localTips = {}; // hints this phone has seen (the table's copy of the hero is replaced on every change)
export function persistLocal() { const hero = X.S.hero; if (hero?.tips) localTips[hero.name] = { ...localTips[hero.name], ...hero.tips }; }
function sync(t) {
  const S = X.S; const player = Sess.me();
  if (player?.hero && localTips[player.hero.name]) player.hero.tips = { ...(player.hero.tips || {}), ...localTips[player.hero.name] };
  t.company && (t.company.kind = 'online');
  S.company = t.company || null; S.hero = player?.hero || null; S.net = { code: t.code };
  S.battle = t.battle || null;
}
let shown = '';
function changed(prev, next, info) {
  if (!inRoom()) return;
  if (B3.running()) { sync(next); B3.netChanged(prev, next); return; } // a battle is on screen: it decides when to show what
  if (!prev || prev.phase !== next.phase || shown !== next.phase) return show();
  update(prev, next, info);
}
export function show() {
  const t = Sess.current(); if (!t) return;
  if (t.phase !== 'victory') closeBrag();
  sync(t); shown = t.phase;
  switch (t.phase) {
    case 'lobby': return lobby(t);
    case 'road': return road(t);
    case 'board': return board(t);
    case 'battle': return battle(t);
    case 'victory': return victory(t);
    case 'defeat': return defeat(t);
    case 'camp': return camp(t);
    default: return placeholder(t);
  }
}
function update(prev, next) { show(); void prev; void next; }
function placeholder(t) {
  const { mountAs, panel, eyebrow, lay } = K();
  mountAs('road', h('div', { class: 'sx-split sx-road' }, h('div', { class: 'sx-viewport' }), h('div', { class: 'sx-side' }, panel('', eyebrow(t.phase), h('p', {}, `Table ${t.code}: ${t.phase}`)))));
  lay('road');
}

// ------------------------------------------------------------------------------------------------ the lobby
function lobby(t) {
  const { btn, panel, eyebrow, mountAs, lay, emblem, ico, flourish, clsName } = K();
  const you = Sess.me(); const host = Sess.isHost(); const view = Sess.view();
  const everyone = t.players.every((p) => p.ready || p.id === t.hostId); // the host starting is their own ready
  const base = view?.links?.[0]; // (online tables already carry ?join=CODE; a laptop table gives its address)
  const link = base ? (/[?&]join=/.test(base) ? base : `${base}${base.includes('?') ? '&' : '?'}join=${t.code}`) : '';
  const share = async () => {
    const text = link || t.code;
    try { if (navigator.share) { await navigator.share({ title: 'QuestDice', text: `Join my QuestDice table: ${t.code}`, url: link || undefined }); return; } } catch { /* fall through to copy */ }
    try { await navigator.clipboard.writeText(text); toast('Invite copied. Send it to your friends.'); } catch { toast(`The code is ${t.code}.`); }
  };
  const rows = t.players.map((p, i) => h('li', { class: `lb-row ${p.ready || p.id === t.hostId ? 'ready' : ''} ${p.id === you.id ? 'you' : ''}`, style: { '--i': i, '--hue': K().CLS_HUE[p.cls] } },
    emblem(p.cls), h('div', { class: 'lb-who' }, h('b', {}, p.name, p.id === t.hostId ? h('i', { class: 'lb-host', title: 'Host' }, ico('crown')) : null), h('small', {}, clsName(p.cls))),
    h('span', { class: 'lb-state' }, p.ready || p.id === t.hostId ? [ico('check'), p.id === t.hostId ? 'Host' : 'Ready'] : 'Getting ready')));
  const seats = Array.from({ length: Math.max(0, Math.min(6, Math.max(t.players.length + 1, 2)) - t.players.length) }, () => h('li', { class: 'lb-row empty' }, h('span', { class: 'lb-open' }, ico('people')), h('div', { class: 'lb-who' }, h('small', {}, 'An open seat'))));
  const go = host
    ? btn(everyone ? (t.players.length > 1 ? 'Take the road together' : 'Take the road') : 'Waiting for your friends to be ready', () => Sess.send({ type: 'start' }).catch(fail), { big: true, icon: 'chevron', iconAfter: true, cls: 'wide', disabled: !everyone })
    : btn(you.ready ? 'Not ready yet' : 'I am ready', () => Sess.send({ type: 'ready', on: !you.ready }).catch(fail), { kind: you.ready ? 'ghost' : 'primary', big: true, icon: you.ready ? 'back' : 'check', cls: 'wide' });
  mountAs('camp', h('div', { class: 'sx-split sx-camp sx-lobby' }, h('div', { class: 'sx-viewport' }, h('header', { class: 'sx-top' }, h('div', { class: 'sx-camp-title' }, eyebrow('The company gathers'), h('h1', {}, t.name)))),
    h('div', { class: 'sx-side' },
      h('div', { class: 'sx-sidetop' }),
      panel('lb-code', h('div', { class: 'lb-top' }, h('div', {}, eyebrow('Table code'), h('div', { class: 'lb-letters', 'aria-label': `Table code ${t.code.split('').join(' ')}` }, t.code.split('').map((c) => h('b', {}, c)))),
        btn('Invite', share, { kind: 'ghost', icon: 'link', cls: 'lb-invite' })),
        host ? h('p', { class: 'fine' }, 'Friends tap Play together, then Join a table, and type the code.') : null),
      panel('lb-roster', eyebrow(`Heroes · ${t.players.length} of 6`), h('ul', { class: 'lb-list' }, ...rows, ...seats)),
      flourish(),
      h('div', { class: 'sx-cta lb-cta' }, go,
        host ? null : h('p', { class: 'fine center' }, `${t.players.find((p) => p.id === t.hostId)?.name || 'The host'} starts the campaign when everyone is ready.`)))));
  lay('camp');
  const preview = E.newHero({ name: you.name, cls: you.cls });
  SCR.enter('camp', { hero: preview }, `lobby:${you.cls}`).then((hd) => { hd?.sync?.(preview); });
  void world;
}
function fail(e) { toast(e?.message || 'The table did not answer.', 'bad'); sfx.error(); }

// ------------------------------------------------------------------------------------------------ the company bar
// Who is at the table, with a tick for each hero who has pressed ready (used on the road and at camp).
export function partyBar() {
  const t = Sess.current(); if (!t) return null; const { emblem, ico } = K(); const you = Sess.me();
  const showReady = t.phase === 'road' || t.phase === 'camp';
  const tick = (p) => (t.phase === 'victory' ? p.seenBrag : showReady && p.ready);
  return h('div', { class: 'sx-party', role: 'list', 'aria-label': 'The company' }, t.players.map((p) => h('span', { role: 'listitem', class: `pt ${p.id === you?.id ? 'you' : ''} ${tick(p) ? 'ready' : ''}`, style: { '--hue': K().CLS_HUE[p.cls] } },
    emblem(p.cls), h('b', {}, p.name), tick(p) ? h('i', { class: 'pt-ok' }, ico('check')) : null)));
}

// ------------------------------------------------------------------------------------------------ road and quest board
const beatsSeen = new Set();
function nextBeat(t) {
  const c = t.company?.campaign; if (!c) return null;
  const b = ST.pending(c).find((x) => !beatsSeen.has(`${t.code}:${x.id}@${x.act}`));
  return b ? ST.beat(b.id, b.act) : null;
}
function story(b, t) {
  SCRUI.story(b, () => { beatsSeen.add(`${t.code}:${b.id}@${b.act}`); show(); });
}
function road(t) {
  const beat = nextBeat(t); if (beat) return story(beat, t);
  if (t.company.campaign.road?.done) return roadDone(t);
  SCRUI.road();
}
// The host can move a table on without a hero whose phone went to sleep.
function pushButton(t) {
  const { btn } = K();
  if (!Sess.isHost() || t.players.every((p) => p.ready || p.id === Sess.me()?.id)) return null;
  return h('div', { class: 'sx-push' }, btn('Go on without them', () => Sess.send({ type: 'push' }).catch(fail), { kind: 'ghost', icon: 'chevron', iconAfter: true, cls: 'wide', aria: 'Move the table on without the heroes who have not answered' }));
}
function roadDone(t) {
  const res = t.roadResult || { title: 'The road', text: 'The company has chosen.', by: '' }; const you = Sess.me();
  const waiting = t.players.filter((p) => !p.ready).map((p) => p.name);
  SCRUI.roadResult({ title: res.title, text: res.text }, {
    kicker: res.by ? `${res.by} chose for the company` : 'The road answers', label: you.ready ? 'Waiting for the others' : 'Onward', disabled: you.ready,
    onward: () => Sess.send({ type: 'onward' }).catch(fail), note: you.ready && waiting.length ? `Waiting for ${waiting.join(', ')}.` : '', extra: you.ready ? pushButton(t) : null,
  });
}
export function chooseRoad(id) { Sess.send({ type: 'choose', id }).catch(fail); }
function board(t) {
  const beat = nextBeat(t); if (beat) return story(beat, t);
  SCRUI.board(); void t;
}
export function startQuest(q) { Sess.send({ type: 'quest', id: q.id }).catch(fail); }
// ------------------------------------------------------------------------------------------------ battle
function battle(t) {
  if (B3.running()) return;
  const S = X.S; S.quest = t.quest; S.battle = t.battle; S.hero = Sess.hero();
  t.quest.seed = E.hashSeed(t.company.campaign.seed, t.quest.id);
  SCR.release(); shown = 'battle';
  Sess.hold(); B3.start(X.battleCtx()).catch((e) => console.error('battle start failed', e)).finally(() => Sess.release());
}
// The battle on screen is over (victory or defeat): the table already moved on, so put its screen up.
export function afterBattle() { show(); }
export function goCamp() { Sess.send({ type: Sess.current()?.phase === 'defeat' ? 'rest' : 'camp' }).catch(fail); }

// ------------------------------------------------------------------------------------------------ camp
// Every hero has their own camp (the same screens as a solo game); the road goes on when everyone is ready.
function camp(t) { void t; SCRUI.camp(false); }
export function netOp(name, args, local) {
  const res = local(); if (res === false) return res; // refused on my own copy: nothing to send
  Sess.hold();
  Sess.send({ type: 'op', op: name, args }).catch((e) => { fail(e); return Sess.resync().catch(() => {}); }).finally(() => Sess.release());
  return res;
}
export function netPerk(id) { Sess.send({ type: 'perk', id }).catch(fail); }
export function netPerkOffer() { return Sess.view()?.perkOffer || []; }
export function campCta(btn) {
  const t = Sess.current(); const you = Sess.me(); const waiting = t.players.filter((p) => !p.ready && p.id !== you.id).map((p) => p.name);
  const owes = you.hero.pendingPerks > 0;
  return [btn(you.ready ? 'Waiting for the others' : owes ? 'Choose your perk first' : 'Ready for the road', () => Sess.send({ type: 'ready' }).catch(fail), { big: true, icon: 'map', cls: 'wide', disabled: you.ready || owes }),
    you.ready && waiting.length ? h('p', { class: 'fine center' }, `Waiting for ${waiting.join(', ')}.`) : null, you.ready ? pushButton(t) : null];
}

// ------------------------------------------------------------------------------------------------ victory, defeat
// Brag board first (per phone), then everyone's points, places, gold and XP; then each hero picks their own perk
// at once, and the spoils are drafted in order of points. The table moves to camp when the perks, the draft and
// every phone's brag board are done (the host can still push past a quiet phone).
let bragDismissed = '';
function bragKey(t) {
  const c = t.company?.campaign;
  return `${t.code}:${c?.act || 0}:${c?.step || 0}:${t.rewards?.questName || ''}`;
}
function openBrag(t, sendSeen) {
  const you = Sess.me();
  bragBoard({
    table: t, youName: you?.hero?.name || you?.name,
    onOnward: () => {
      bragDismissed = bragKey(t);
      closeBrag();
      if (sendSeen) Sess.send({ type: 'brag-seen' }).catch(fail);
    },
  });
}
function victory(t) {
  const { btn, panel, eyebrow, flourish, mountAs, lay, emblem, ico, weaponCard, perkCard } = K();
  const R = t.rewards; const members = t.company.members; const n = members.length; const you = Sess.me(); const hero = you.hero;
  const offer = Sess.view()?.perkOffer; const draft = R.draft; const who = E.draftWho(draft);
  const placeWord = (p) => (p === 1 && n >= 2 ? '1st place' : p === 2 && n >= 3 ? '2nd place' : '');
  const lead = R.order[0];
  const sub = n >= 3 ? `${lead} did the most this battle, with ${R.order[1]} close behind.` : n === 2 ? `${lead} did the most this battle.` : 'The way is open.';
  const rows = panel('sx-places', eyebrow(`+${R.xp} XP each`, 'gold'),
    h('div', { class: 'pl-list' }, R.order.map((name) => {
      const m = members.find((x) => x.name === name); const p = R.place[name]; const pw = placeWord(p);
      return h('div', { class: `pl-row ${p === 1 && n >= 2 ? 'first' : p === 2 && n >= 3 ? 'second' : ''} ${m === hero ? 'you' : ''}` },
        h('span', { class: 'pl-medal' }, pw ? (p === 1 ? '1' : '2') : ''), emblem(m.cls),
        h('div', { class: 'pl-copy' }, h('b', {}, name), h('small', {}, pw || 'Victory', m.level > (R.levels[name] || 0) ? ` · Level ${m.level}!` : '')),
        h('div', { class: 'pl-nums' }, h('b', {}, `${R.points[name] || 0}`), h('small', {}, 'points'), h('span', { class: 'pl-gold' }, ico('coin'), `${R.gold[name] >= 0 ? '+' : ''}${R.gold[name]}`)));
    })));
  const owing = members.filter((m) => m.pendingPerks > 0 && m !== hero).map((m) => m.name);
  const perks = hero.pendingPerks > 0 && offer ? panel('sx-perks glow', eyebrow(`Level up. Choose a perk`, 'gold'),
    h('div', { class: 'perk-row' }, offer.map((id, i) => perkCard(id, hero, () => { sfx.level(); Sess.send({ type: 'perk', id }).catch(fail); }, i))))
    : owing.length ? panel('sx-perks', h('p', { class: 'muted' }, `Waiting for ${owing.join(', ')} to choose a perk.`), Sess.isHost() ? h('div', { class: 'sx-push' }, btn('Go on without them', () => Sess.send({ type: 'push' }).catch(fail), { kind: 'ghost', cls: 'wide' })) : null) : null;
  const mine = who === hero.name; const picker = who && members.find((m) => m.name === who);
  const loot = !draft.done
    ? panel('sx-loot', eyebrow(mine ? 'Your pick of the spoils' : `${who} is choosing · ${R.points[who] || 0} points`, 'gold'),
      h('p', { class: 'fine' }, mine ? 'Highest points choose first. Take a weapon or skip; the choice comes back around.' : 'The spoils go round in order of points.'),
      h('div', { class: 'loot-row' }, R.drops.map((inst, i) => draft.picked[i] != null ? null : weaponCard(inst, { cls: 'pick', actions: mine ? [
        btn(E.bagFull(hero) ? 'Pack full' : 'Take', () => { sfx.coin(); Sess.send({ type: 'loot', index: i }).catch(fail); }, { kind: 'primary', icon: 'bag', disabled: E.bagFull(hero) })] : [] }))),
      mine || Sess.isHost() ? h('div', { class: 'sx-cta' }, btn(mine ? 'Skip' : `Skip ${who}'s pick`, () => { sfx.select(); Sess.send({ type: 'pass-loot' }).catch(fail); }, { kind: 'ghost', cls: 'wide' })) : null)
    : panel('sx-loot done', h('div', { class: 'cardlist' }, Object.entries(draft.picked).length ? Object.entries(draft.picked).map(([i, name]) => h('p', { class: 'muted' }, `${name} took the ${D.tierName(R.drops[i])} ${D.WEAPONS[R.drops[i].id].name}.`)) : h('p', { class: 'muted' }, 'The spoils stay on the road.')));
  void picker;
  const reopen = btn('View brag board', () => openBrag(t, !you.seenBrag), { kind: 'link', cls: 'wide brag-reopen' });
  mountAs('victory', h('div', { class: 'sx-split sx-victory' }, h('div', { class: 'sx-viewport' }),
    h('div', { class: 'sx-side' },
      h('header', { class: 'vc-head' }, eyebrow(R.questName), h('h1', { class: 'vc-title' }, 'Victory'), h('p', {}, sub), flourish()),
      partyBar(), reopen, rows, perks, loot)));
  lay('victory'); if (!SCR.victory(hero, t.quest?.place)) SCR.enter('camp', { hero }, `victory:${hero.name}`);
  if (!you.seenBrag && bragDismissed !== bragKey(t) && !bragOpen()) openBrag(t, true);
}
function defeat(t) {
  const hero = Sess.hero(); X.S.hero = hero;
  SCRUI.defeat(!!t.retreat, t.loss || 0);
  if (!SCR.defeat(hero, t.quest?.place)) SCR.enter('camp', { hero }, `defeat:${hero.name}`);
}

// ------------------------------------------------------------------------------------------------ the menu
export function menu() {
  const t = Sess.current();
  const close = modal(h('div', { class: 'form' }, h('h2', {}, t?.name || 'Table'),
    h('div', { class: 'col' },
      X.ghost('Rules', () => { close(); X.showHowTo(); }),
      t?.phase === 'battle' && Sess.isHost() ? X.ghost('Retreat (every hero loses 15% gold)', () => { close(); askRetreat(); }) : null,
      X.ghost('Step away (keep my seat)', () => { close(); stepAway(); }),
      X.ghost('Leave this table for good', () => { close(); askLeave(); }),
      X.ghost('Close', () => close()))));
}
function askRetreat() {
  const close = modal(h('div', { class: 'form' }, h('h2', {}, 'Retreat?'),
    h('p', { class: 'muted' }, 'The whole company withdraws. Every hero drops 15% of their gold. Level, gear and perks stay.'),
    h('div', { class: 'row end' }, X.ghost('Stay', () => close()), X.primary('Retreat', () => { close(); Sess.send({ type: 'retreat' }).catch(fail); }))));
}
// Home, but the seat stays: the title shows "Rejoin" and the table carries on without a word.
export function stepAway() {
  stop?.(); stop = null; Net.disconnect(); Sess.close();
  const S = X.S; S.net = null; S.hero = null; S.company = null; S.battle = null;
  X.showTitle();
}
function askLeave() {
  const close = modal(h('div', { class: 'form' }, h('h2', {}, 'Leave this table for good?'),
    h('p', { class: 'muted' }, 'Your seat goes back to the table. To come back later without losing your place, choose Step away instead.'),
    h('div', { class: 'row end' }, X.ghost('Stay', () => close()), X.primary('Leave', () => { close(); leave(); }))));
}
