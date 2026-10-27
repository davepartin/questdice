// Playing together, each on their own phone (Dave, Oct 2026). This is the whole online game: one table, up to six
// heroes, and every phone shows it in the same 3D screens as a solo game. No game server: the table is a document
// (cloud.js) or lives in `node server.mjs` (net.js), and this phone keeps a copy of it (session.js).
//
// What this file does: open or join a table, then, whenever the table changes phase, put the right screen up:
//   lobby   gather round the fire, share the code, ready up, the host starts
//   road    a road event the company decides together        board   the quest board (the host or anyone picks)
//   envelope  every hero's secret objective (secrets.js), read in private before the fight
//   battle  the 3D battle, one hero per phone (battle3d.js, net mode)
//   victory / defeat   spoils, perks, back to camp               camp   every hero's own camp, then ready up
// Rules live in table.js (commands) and engine.js; this file only decides what is on screen and what to send.
import { h, $, toast, modal } from '../dom.js';
import { sfx } from '../audio.js';
import * as E from '../engine.js';
import * as D from '../data.js';
import * as SV from '../save.js';
import * as Net from '../net.js';
import * as Sess from '../session.js';
import * as SCRUI from './scrui.js';
import * as BR from '../battlereport.js';
import { reportRow } from './reportui.js';
import * as SCR from './screens.js';
import * as ST from '../story.js';
import * as R from '../roads.js';
import { world } from './world.js';
import * as B3 from './battle3d.js';
import { bragBoard, closeBrag, bragOpen } from './brag.js';
import { packOf, packIdOf, partySize, forcedLine } from '../campaigns.js';

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
    Net.savedSeat() ? plaque({ eyebrow: 'Your table', ...Net.seatLabel(), icon: 'people', tone: 'is-together', primary: true, onclick: () => resume() }) : null, // a table this phone sits at: back to it
    plaque({ eyebrow: 'Host', title: 'Open a table', sub: 'Pick a story, then share a code with your friends.', icon: 'people', tone: 'is-together', primary: !Net.savedSeat(), onclick: () => host() }),
    plaque({ eyebrow: 'Join', title: 'Join a table', sub: 'Enter the four-letter code a friend gave you.', icon: 'key', tone: 'is-together', onclick: () => join('') }),
    plaque({ eyebrow: '', title: 'Back', icon: 'chevron', onclick: () => X.showTitle() }));
  void eyebrow; void flourish;
  X.S.net = null;
  mountAs('title', h('div', { class: 'sx-title-shell' }, h('div', { class: 'sx-title-brand' }), h('div', { class: 'sx-title-menu' }, menu)));
  lay('title'); SCR.enter('title', { cls: 'knight' }, 'title:together');
}
function sitAt({ mode, code, hero, back, pack }) {
  SCRUI.create({ pack, table: { mode, code, hero, pack, back: back || together, onDone: async (name, cls, x) => {
    const data = mode === 'host'
      ? await Net.createSeat({ name, cls, table: x.table || `${name}'s company`, hero: x.hero, difficulty: x.difficulty || x.hero?.difficulty, pack: x.pack || pack || x.hero?.campaign?.pack })
      : await Net.joinSeat({ code: x.code, name, cls, hero: x.hero, reclaim: !!x.proven });
    sfx.level(); openTable(data.view);
  } } });
}
function host() { X.showStories({ together: true }); }
export function hostPack(pack) { sitAt({ mode: 'host', pack: packIdOf(pack), back: together }); }
export function hostLoaded() {
  const hero = X.S.hero;
  if (!hero) return together();
  sitAt({ mode: 'host', hero, pack: hero.campaign?.pack, back: () => X.showHeroHub() });
}
export function join(prefill = '') {
  sitAt({ mode: 'join', code: prefill });
}

// Sit down: start the session, listen for the table, put its screen up.
export function openTable(view) { // exported for dev/roadbeat.mjs (sits a phone at a table it was handed)
  const S = X.S;
  S.net = { code: view.code }; Net.tagSeat({ table: view.name, hero: view.you?.name });
  S.practice = null; S.battle = null; S.company = null; S.hero = null;
  Sess.close(); BR.forgetOnline(); Sess.open(view);
  Sess.onChange((prev, next, info) => changed(prev, next, info));
  stop?.(); Net.connect((v) => Sess.adopt(v, 'feed')); const poll = waitPoll(); stop = () => { Net.disconnect(); poll(); };
  show();
}
// Safety net (Dave's first team games: after both locked in, one phone played the round and the other sat waiting a long time; after a fight,
// the second player waited too long before they could choose spoils). The live feed can stall on a phone (Safari, mobile data), so while this
// phone is waiting on another phone's move it also asks the table itself every few seconds, and once whenever it comes back to the screen or the
// network returns. The live feed stays primary. One fetch at a time; an older answer is refused by Sess.adopt (it never steps back), a newer table
// waits its turn while a round plays on screen (hold), and nothing here sends a command, so it cannot skip anybody's choice.
const WAIT_MS = 2500;
function waitingOnOthers() {
  const t = Sess.current(); const me = Sess.me(); if (!t || !me) return false;
  switch (t.phase) {
    case 'battle': { const f = t.battle?.fighters?.[Sess.index()]; return !!f && (f.locked || f.skipped || f.hp <= 0); }
    case 'victory': { const who = t.rewards ? E.draftWho(t.rewards.draft) : null; return !(who && who === me.name); } // everything but my own pick waits on someone
    case 'envelope': return !!t.envelope?.answered?.[me.name] && (t.company?.members || []).some((m) => !t.envelope.answered[m.name]);
    case 'lobby': return t.hostId === me.id ? t.players.some((p) => p.id !== t.hostId && !p.ready) : !!me.ready;
    case 'road': case 'board': case 'camp': return !!me.ready && t.players.some((p) => !p.ready);
    default: return false;
  }
}
let polling = false;
async function askTable(why) {
  if (polling || !inRoom()) return; polling = true;
  try { const v = await Net.snapshot(); if (v && !v.missing) Sess.adopt(v, why); } catch { /* the feed may still bring it */ } finally { polling = false; }
}
function waitPoll() {
  const timer = setInterval(() => { if (!document.hidden && waitingOnOthers()) askTable('poll'); }, WAIT_MS);
  const back = () => { if (!document.hidden) askTable('resume'); };
  document.addEventListener('visibilitychange', back); window.addEventListener('online', back); window.addEventListener('pageshow', back);
  return () => { clearInterval(timer); document.removeEventListener('visibilitychange', back); window.removeEventListener('online', back); window.removeEventListener('pageshow', back); };
}
export function leave() {
  writeBack();
  stop?.(); stop = null;
  Net.clearSeat(); Sess.close(); BR.forgetOnline();
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
  BR.observeView(Sess.view()); // this phone's battle report, built from what the table shows it (js/battlereport.js)
  if (prev && next && prev.phase !== next.phase && (next.phase === 'camp' || next.phase === 'victory' || next.phase === 'defeat' || next.phase === 'board')) writeBack();
  if (prev?.phase === 'road' && next?.phase !== 'road') import('./trialui.js').then((T) => T.dismissTrial()); // the table moved on: no roll left over the next screen
  if (B3.running()) { sync(next); B3.netChanged(prev, next); return; } // a battle is on screen: it decides when to show what
  if (!prev || prev.phase !== next.phase || shown !== next.phase) return show();
  update(prev, next, info);
}
// How far the table has come, in words (the Rejoin button and the saved strip say it)
const whereOf = (t) => { const c = t?.company?.campaign; return c ? `Act ${['I', 'II', 'III'][c.act - 1] || c.act} · step ${c.step}` : ''; };
export function show() {
  const t = Sess.current(); if (!t) return;
  if (t.phase !== 'victory') closeBrag();
  sync(t); shown = t.phase;
  if (t.phase !== 'lobby') Net.tagSeat({ table: t.name, hero: Sess.me()?.name, where: whereOf(t) });
  switch (t.phase) {
    case 'lobby': return lobby(t);
    case 'road': return road(t);
    case 'board': return board(t);
    case 'envelope': return envelope(t);
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
    emblem(p.cls), h('div', { class: 'lb-who' }, h('b', {}, p.name, p.id === t.hostId ? h('i', { class: 'lb-host', title: 'Host' }, ico('crown')) : null), h('small', {}, `${clsName(p.cls)}${(p.brought?.level || p.hero?.level || 1) > 1 ? ` · Lv ${p.brought?.level || p.hero.level}` : ''}`)),
    h('span', { class: 'lb-state' }, p.ready || p.id === t.hostId ? [ico('check'), p.id === t.hostId ? 'Host' : 'Ready'] : 'Getting ready')));
  const story = packOf(t.pack);
  const cap = story.maxHeroes || 6;
  const seats = Array.from({ length: Math.max(0, Math.min(cap, Math.max(t.players.length + 1, story.requiredHeroes || 2)) - t.players.length) }, () => h('li', { class: 'lb-row empty' }, h('span', { class: 'lb-open' }, ico('people')), h('div', { class: 'lb-who' }, h('small', {}, 'An open seat'))));
  const go = host
    ? btn(everyone ? (t.players.length > 1 ? 'Take the road together' : 'Take the road') : 'Waiting for your friends to be ready', () => Sess.send({ type: 'start' }).catch(fail), { big: true, icon: 'chevron', iconAfter: true, cls: 'wide', disabled: !everyone })
    : btn(you.ready ? 'Not ready yet' : 'I am ready', () => Sess.send({ type: 'ready', on: !you.ready }).catch(fail), { kind: you.ready ? 'ghost' : 'primary', big: true, icon: you.ready ? 'back' : 'check', cls: 'wide' });
  mountAs('camp', h('div', { class: 'sx-split sx-camp sx-lobby' }, h('div', { class: 'sx-viewport' }, h('header', { class: 'sx-top' }, h('div', { class: 'sx-camp-title' }, eyebrow('The company gathers'), h('h1', {}, t.name)))),
    h('div', { class: 'sx-side' },
      h('div', { class: 'sx-sidetop' }),
      panel('lb-code', h('div', { class: 'lb-top' }, h('div', {}, eyebrow('Table code'), h('div', { class: 'lb-letters', 'aria-label': `Table code ${t.code.split('').join(' ')}` }, t.code.split('').map((c) => h('b', {}, c)))),
        btn('Invite', share, { kind: 'ghost', icon: 'link', cls: 'lb-invite' })),
        (() => { const d = D.DIFFICULTY[D.normalizeDifficulty(t.difficulty)]; return h('p', { class: 'fine' }, `${story.title}. ${d.name} difficulty. ${d.text}${forcedLine(story) ? ` This tale needs the ${forcedLine(story)}.` : ''}`); })(),
        host ? h('p', { class: 'fine' }, 'Friends tap Play together, then Join a table, and type the code.') : null),
      panel('lb-roster', eyebrow(`Heroes · ${t.players.length} of ${cap}${partySize(story) ? ` · ${partySize(story)}` : ''}`), h('ul', { class: 'lb-list' }, ...rows, ...seats)),
      flourish(),
      h('div', { class: 'sx-cta lb-cta' }, go,
        host ? null : h('p', { class: 'fine center' }, `${t.players.find((p) => p.id === t.hostId)?.name || 'The host'} starts the campaign when everyone is ready.`)))));
  lay('camp');
  const preview = E.newHero({ name: you.name, cls: you.cls });
  SCR.enter('camp', { hero: preview, heroes: t.players.map((p) => ({ name: p.name, cls: p.cls })) }, `lobby:${t.players.map((p) => p.cls).join('')}`).then((hd) => { hd?.sync?.(preview); });
  void world;
}
function fail(e) { toast(e?.message || 'The table did not answer.', 'bad'); sfx.error(); }
function writeBack() {
  const hero = Sess.hero() || X.S.hero;
  if (!hero) return;
  X.persist?.();
  X.flushCloud?.(hero);
}

// ------------------------------------------------------------------------------------------------ the company bar
// Who is at the table, with a tick for each hero who has pressed ready (used on the road and at camp).
export function partyBar() {
  const t = Sess.current(); if (!t) return null; const { emblem, ico } = K(); const you = Sess.me();
  const showReady = t.phase === 'road' || t.phase === 'camp';
  const tick = (p) => (t.phase === 'victory' ? p.seenBrag : showReady && p.ready);
  const bar = h('div', { class: 'sx-party', role: 'list', 'aria-label': 'The company' }, t.players.map((p) => h('span', { role: 'listitem', class: `pt ${p.id === you?.id ? 'you' : ''} ${tick(p) ? 'ready' : ''}`, style: { '--hue': K().CLS_HUE[p.cls] } },
    emblem(p.cls), h('b', {}, p.name), tick(p) ? h('i', { class: 'pt-ok' }, ico('check')) : null)));
  // Dave: "a very clear way to know your progress is saved, and how to get back in"
  const saved = t.phase === 'lobby' ? null : h('button', { type: 'button', class: 'sx-saved', onclick: () => howToReturn(t) },
    ico('check'), h('span', {}, h('b', {}, 'Saved'), ` · ${whereOf(t)} · Table ${t.code}`), h('em', {}, 'How to come back'));
  return saved ? h('div', { class: 'sx-partywrap' }, bar, saved) : bar;
}

// ------------------------------------------------------------------------------------------------ road and quest board
const beatsSeen = new Set();
function nextBeat(t) {
  const c = t.company?.campaign; if (!c) return null;
  // Place arrivals wait for the quest board: the road's test roll and its result come first (Dave's Rival Duo game: the
  // arrival jumped in before the Strength roll). Call for Help has picked the place by then.
  const place = t.phase === 'board' ? (t.quest?.place || E.questsFor(t.company.members[0])?.[0]?.place) : null;
  const x = ST.pending(c, place).find((p) => !beatsSeen.has(`${t.code}:${p.id}@${p.act}`));
  const b = x ? ST.beat(x.id, x.act, t.company?.members || [], c) : null;
  // seen by the pending entry's own key: a pack's step beat carries no act, so a key from the beat never matched and
  // Continue brought the same page straight back
  return b ? { ...b, seenKey: `${t.code}:${x.id}@${x.act}` } : null;
}
function story(b) {
  SCRUI.story(b, () => { beatsSeen.add(b.seenKey); show(); });
}
function road(t) {
  const beat = nextBeat(t); if (beat) return story(beat);
  if (t.company.campaign.road?.done) return roadDone(t);
  SCRUI.road();
}
// The host can move a table on without a hero whose phone went to sleep.
function pushButton(t) {
  const { btn } = K();
  if (!Sess.isHost() || t.players.every((p) => p.ready || p.id === Sess.me()?.id)) return null;
  return h('div', { class: 'sx-push' }, btn('Go on without them', () => Sess.send({ type: 'push' }).catch(fail), { kind: 'ghost', icon: 'chevron', iconAfter: true, cls: 'wide', aria: 'Move the table on without the heroes who have not answered' }));
}
const trialsSeen = new Set(); // which test rolls this phone has already watched (the dice play once on every phone)
function roadDone(t) {
  const res = t.roadResult || { title: 'The road', text: 'The company has chosen.', by: '' }; const you = Sess.me();
  const c = t.company.campaign; const tk = res.trial ? `${t.code}:${c.act}.${c.step}:${res.trial.attempt}` : '';
  if (res.trial && !trialsSeen.has(tk)) {
    trialsSeen.add(tk); const own = Sess.hero()?.name === res.trial.who; // only that hero's phone rolls; the others watch
    import('./trialui.js').then((T) => T.showTrial(res.trial, { title: res.title, members: t.company.members, own })).then(() => { if (Sess.current()?.phase === 'road') show(); });
  }
  const waiting = t.players.filter((p) => !p.ready).map((p) => p.name);
  const { btn } = K();
  const rematch = res.trial && res.trial.canRematch && !you.ready ? btn(`Ask for a rematch · ${res.trial.rematchCost} gold`, () => Sess.send({ type: 'rematch' }).catch(fail), { kind: 'ghost', icon: 'reroll', cls: 'wide' }) : null;
  SCRUI.roadResult({ title: res.title, text: res.text }, {
    kicker: res.trial ? `${res.trial.who} ${res.trial.win ? 'won' : 'lost'} · ${res.trial.heroTotal} to ${res.trial.oppTotal}` : res.by ? `${res.by} chose for the company` : 'The road answers', /* a test shows its roll once (T09) */
    label: you.ready ? 'Waiting for the others' : 'Onward', disabled: you.ready,
    onward: () => Sess.send({ type: 'onward' }).catch(fail), note: you.ready && waiting.length ? `Waiting for ${waiting.join(', ')}.` : '', extra: you.ready ? pushButton(t) : rematch,
  });
}
export function chooseRoad(id) { Sess.send({ type: 'choose', id }).catch(fail); }
function board(t) {
  const beat = nextBeat(t); if (beat) return story(beat);
  SCRUI.board(); void t;
}
export function startQuest(q) { Sess.send({ type: 'quest', id: q.id }).catch(fail); }
// ------------------------------------------------------------------------------------------------ secret objectives
// Every hero reads their own envelope (secrets.js); the battle starts when all have answered (the host can push past a quiet phone).
function envelope(t) {
  const v = Sess.view()?.envelope; if (!v?.card) return placeholder(t);
  const you = Sess.hero()?.name; const waiting = v.waiting.filter((n) => n !== you);
  const { btn } = K();
  const push = Sess.isHost() && waiting.length ? h('div', { class: 'sx-push' }, btn('Go on without them', () => Sess.send({ type: 'push' }).catch(fail), { kind: 'ghost', icon: 'chevron', iconAfter: true, cls: 'wide', aria: 'Start the battle without the heroes who have not read their envelope' })) : null;
  SCRUI.envelope(v.card, { questName: v.questName, waiting, extra: push, bonus: !!v.bonus || v.card?.kind === 'bonus', solo: v.card?.kind === 'bonus', onAnswer: (accept) => Sess.send({ type: 'envelope', accept }).catch(fail) });
}
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
// The Reveal comes first, once on each phone (then the brag board and the spoils): the bots' playtest, Oct 2026.
const revealsSeen = new Set();
function revealFirst(t, won) {
  const rv = Sess.view()?.reveal; const key = `${bragKey(t)}:${won ? 'w' : 'l'}`;
  if (!rv?.lines?.length || revealsSeen.has(key)) return false;
  SCRUI.reveal(rv, { hero: Sess.hero(), place: t.quest?.place, won, onDone: () => { revealsSeen.add(key); show(); } });
  return true;
}
function victory(t) {
  if (revealFirst(t, true)) return;
  const { btn, panel, eyebrow, flourish, mountAs, lay, emblem, ico, weaponCard, perkCard, charmCard, charmGuideBtn } = K();
  const R = t.rewards; const members = t.company.members; const n = members.length; const you = Sess.me(); const hero = you.hero;
  const offer = Sess.view()?.perkOffer; const draft = R.draft; const who = E.draftWho(draft);
  const placeWord = (p) => (p === 1 && n >= 2 ? '1st place' : p === 2 && n >= 3 ? '2nd place' : '');
  const lead = R.order[0];
  const sub = n >= 3 ? `${lead} did the most this battle, with ${R.order[1]} close behind.` : n === 2 ? `${lead} did the most this battle.` : 'The way is open. Go on, then.';
  const youRepeat = !!(R.repeat && R.repeat[hero?.name]);
  const rows = panel('sx-places', eyebrow(youRepeat ? 'Already cleared' : `+${R.xp} XP each`, 'gold'),
    h('div', { class: 'pl-list' }, R.order.map((name) => {
      const m = members.find((x) => x.name === name); const p = R.place[name]; const pw = placeWord(p);
      const again = !!(R.repeat && R.repeat[name]);
      return h('div', { class: `pl-row ${p === 1 && n >= 2 ? 'first' : p === 2 && n >= 3 ? 'second' : ''} ${m === hero ? 'you' : ''}` },
        h('span', { class: 'pl-medal' }, pw ? (p === 1 ? '1' : '2') : ''), emblem(m.cls),
        h('div', { class: 'pl-copy' }, h('b', {}, name), h('small', {}, again ? 'Already cleared · less gold, no XP or spoils.' : (pw || 'Victory'), !again && m.level > (R.levels[name] || 0) ? ` · Level ${m.level}!` : '')),
        h('div', { class: 'pl-nums' }, h('b', {}, `${R.points[name] || 0}`), h('small', {}, 'points'), h('span', { class: 'pl-gold' }, ico('coin'), `${R.gold[name] >= 0 ? '+' : ''}${R.gold[name]}`)));
    })));
  const owing = members.filter((m) => m.pendingPerks > 0 && m !== hero).map((m) => m.name);
  const perks = hero.pendingPerks > 0 && offer ? panel('sx-perks glow', eyebrow(`Level up. Choose a perk`, 'gold'),
    h('div', { class: 'perk-row' }, offer.map((id, i) => perkCard(id, hero, () => { sfx.level(); Sess.send({ type: 'perk', id }).catch(fail); }, i))))
    : owing.length ? panel('sx-perks', h('p', { class: 'muted' }, `Waiting for ${owing.join(', ')} to choose a perk.`), Sess.isHost() ? h('div', { class: 'sx-push' }, btn('Go on without them', () => Sess.send({ type: 'push' }).catch(fail), { kind: 'ghost', cls: 'wide' })) : null) : null;
  // your own charm offer (each hero rolls their own, as solo): take one, or swap one out when you carry three
  const myCharms = (R.charms && R.charms[hero.name]) || []; const took = R.charmTaken && R.charmTaken[hero.name];
  const charms = myCharms.length ? panel('sx-charms-loot', eyebrow(myCharms.length > 1 ? 'Choose a charm' : 'A charm', 'gold'), charmGuideBtn(),
    took ? h('p', { class: 'muted' }, `You took the ${D.CHARMS[took].name}. It works from your next fight.`)
      : h('div', { class: 'ch-list' }, myCharms.map((id) => charmCard(id, { actions: E.charmFull(hero)
        ? E.charmsOf(hero).map((old) => btn(`Swap for ${D.CHARMS[old].name}`, () => { sfx.level(); Sess.send({ type: 'charm', id, swap: old }).catch(fail); }, { kind: 'ghost', cls: 'ch-swap' }))
        : [btn('Take', () => { sfx.level(); Sess.send({ type: 'charm', id }).catch(fail); }, { icon: 'star' })] }))),
    !took && E.charmFull(hero) ? h('p', { class: 'fine' }, `You carry ${D.CHARM_MAX} charms, the most there is. Swap one out, or leave this behind.`) : null) : null;
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
  const note = youRepeat ? h('p', { class: 'sx-repeat' }, n > 1 ? SV.REPEAT_PARTY : SV.REPEAT_NOTE) : null;
  const gone = R.shattered?.[hero.name] || []; // the Diamond this hero brought has shattered
  const shattered = gone.length ? h('p', { class: 'dm-line shattered' }, ico('gem'), `Your Diamond ${gone.map((id) => D.WEAPONS[id]?.name || 'weapon').join(' and ')} shattered into light. One fight, as promised.`) : null;
  mountAs('victory', h('div', { class: 'sx-split sx-victory' }, h('div', { class: 'sx-viewport' }),
    h('div', { class: 'sx-side' },
      h('header', { class: 'vc-head' }, eyebrow(R.questName), h('h1', { class: 'vc-title' }, 'Victory'), h('p', {}, youRepeat ? (n > 1 ? SV.REPEAT_PARTY : SV.REPEAT_NOTE) : sub), flourish()),
      partyBar(), note, shattered, R.worn?.[hero.name] ? h('p', { class: 'dm-line worn' }, ico('sword'), R.worn[hero.name]) : null, reopen, rows, perks, charms, loot, reportRow())));
  lay('victory'); if (!SCR.victory(hero, t.quest?.place)) SCR.enter('camp', { hero }, `victory:${hero.name}`);
  if (!you.seenBrag && bragDismissed !== bragKey(t) && !bragOpen()) openBrag(t, true);
}
function defeat(t) {
  const hero = Sess.hero(); X.S.hero = hero;
  if (revealFirst(t, false)) return;
  SCRUI.defeat(!!t.retreat, t.loss || 0);
  if (!SCR.defeat(hero, t.quest?.place)) SCR.enter('camp', { hero }, `defeat:${hero.name}`);
}

// ------------------------------------------------------------------------------------------------ the menu
export function menu() {
  const t = Sess.current();
  const close = modal(h('div', { class: 'form' }, h('h2', {}, t?.name || 'Table'),
    h('div', { class: 'col' },
      X.ghost('Rules', () => { close(); X.showHowTo(); }),
      X.soundItem(() => close()),
      X.deviceItem(() => close()),
      X.downloadItem(() => close()),
      t?.phase === 'battle' && Sess.isHost() ? X.ghost('Retreat (every hero loses 15% gold). Live to try again.', () => { close(); askRetreat(); }) : null,
      X.ghost('Your game is saved: how to come back', () => { close(); howToReturn(t); }),
      X.ghost('Step away (keep my seat)', () => { close(); stepAway(); }),
      X.ghost('Leave this table for good', () => { close(); askLeave(); }),
      X.ghost('Close', () => close()))));
}
function askRetreat() {
  const close = modal(h('div', { class: 'form' }, h('h2', {}, 'Retreat?'),
    h('p', { class: 'muted' }, 'The whole company withdraws. Every hero drops 15% of their gold. Level, gear and perks stay. Tomorrow is still yours.'),
    h('div', { class: 'row end' }, X.ghost('Stay', () => close()), X.primary('Retreat', () => { close(); Sess.send({ type: 'retreat' }).catch(fail); }))));
}
// The saved strip's card: what is kept and the two ways back to this table.
export function howToReturn(t = Sess.current()) {
  const me = Sess.me()?.name || 'your hero';
  const close = modal(h('div', { class: 'form' }, h('h2', {}, 'Your game is saved'),
    h('p', {}, `The table saves itself after every move: ${whereOf(t)}, with every hero's gold, gear, potions, perks and level. Close the browser whenever you like.`),
    h('p', {}, h('b', {}, 'To come back: '), 'open the game on this phone and tap ', h('b', {}, `Rejoin ${t?.name || 'your table'}`), ' (on the title screen, or under Play together).'),
    h('p', {}, h('b', {}, 'On another phone: '), 'Play together, Join a table, type ', h('b', {}, t?.code || 'the code'), `, choose Cloud save, and enter ${me}'s name and password. You get your seat back.`),
    h('p', { class: 'muted' }, 'Only "Leave this table for good" gives a seat away.'),
    h('div', { class: 'row end' }, X.primary('Got it', () => close()))));
}
// Home, but the seat stays: the title shows "Rejoin" and the table carries on without a word.
export function stepAway() {
  writeBack();
  stop?.(); stop = null; Net.disconnect(); Sess.close(); BR.forgetOnline();
  const S = X.S; S.net = null; S.hero = null; S.company = null; S.battle = null;
  X.showTitle();
}
function askLeave() {
  const close = modal(h('div', { class: 'form' }, h('h2', {}, 'Leave this table for good?'),
    h('p', { class: 'muted' }, 'Your seat goes back to the table. To come back later without losing your place, choose Step away instead.'),
    h('div', { class: 'row end' }, X.ghost('Stay', () => close()), X.primary('Leave', () => { close(); leave(); }))));
}
