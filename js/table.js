// One table, many phones. The server holds the company. Each phone sends only its own
// choices. Monster intentions are rolled when the round opens, before any hero locks.
// The round resolves once, when every living hero has locked or been skipped.
import { CLASSES, SLOTS } from './data.js';
import * as E from './engine.js';
import * as R from './roads.js';
import { pack, unpack } from './pack.js';

const clone = (v) => JSON.parse(JSON.stringify(v));
const clean = (s, max) => String(s || '').trim().replace(/\s+/g, ' ').slice(0, max);

export function createTable({ code, seed, name }) {
  const title = clean(name, 24);
  return {
    code, seed: (seed ?? 1) >>> 0, name: title.length >= 2 ? title : 'Company',
    hostId: null, seq: 1, phase: 'lobby', players: [],
    company: null, battle: null, quest: null, lastReport: null, rewards: null,
    roadResult: null, perkOffers: {}, loss: 0, retreat: false,
  };
}

export function joinTable(table, { name, cls, token }) {
  if (table.phase !== 'lobby') return fail('This table has already taken the road.');
  if (table.players.length >= 6) return fail('Six heroes is a full company.');
  const heroName = clean(name, 16);
  if (heroName.length < 2) return fail('Give your hero a name (2–16 characters).');
  if (!CLASSES[cls]) return fail('Pick a class.');
  if (!token) return fail('Missing seat.');
  if (table.players.some((p) => p.name.toLowerCase() === heroName.toLowerCase())) return fail('Another hero already has that name.');
  const player = { id: `p${table.players.length + 1}${token.slice(0, 4)}`, token, name: heroName, cls, ready: false, hero: null };
  table.players.push(player);
  if (!table.hostId) table.hostId = player.id;
  table.seq += 1;
  return { ok: true, player };
}

export function playerByToken(table, token) {
  return table.players.find((p) => p.token === token) || null;
}

export function command(table, playerId, cmd) {
  const player = table.players.find((p) => p.id === playerId);
  if (!player) return fail('You are not at this table.');
  // The dice roller is rebuilt from the seed and move number, so a table saved online rolls the same as one in memory.
  if (table.battle) table.battle.rng = E.makeRng(E.hashSeed(table.seed, 'move', table.seq));
  const before = E.uidCount();
  E.uidCount(table.uids || 0);
  const res = dispatch(table, player, cmd || {});
  table.uids = E.uidCount();
  E.uidCount(Math.max(before, table.uids));
  if (res.ok) table.seq += 1;
  return res;
}

function fail(error) { return { ok: false, error }; }
const ok = () => ({ ok: true });
const host = (table) => table.players.find((p) => p.id === table.hostId);
const members = (table) => table.company?.members || [];

function dispatch(table, player, cmd) {
  switch (cmd.type) {
    case 'sit': return sit(table, player, cmd);
    case 'ready': return ready(table, player, cmd);
    case 'start': return startCampaign(table, player);
    case 'choose': return chooseRoad(table, player, cmd);
    case 'onward': return onward(table, player);
    case 'quest': return startQuest(table, cmd);
    case 'camp': return goCamp(table);
    case 'upgrade': return upgrade(table, player, cmd);
    case 'buy': return buy(table, player, cmd);
    case 'potion': return potion(table, player);
    case 'equip': return equip(table, player, cmd);
    case 'sell': return sell(table, player, cmd);
    case 'perk': return perk(table, player, cmd);
    case 'heal': return heal(table, player);
    case 'recharge': return recharge(table, player, cmd);
    case 'roll': return roll(table, player);
    case 'reroll': return reroll(table, player, cmd);
    case 'nudge': return nudge(table, player, cmd);
    case 'card': return card(table, player, cmd);
    case 'lock': return lock(table, player, cmd);
    case 'unlock': return unlock(table, player);
    case 'skip': return skip(table, player, cmd);
    case 'retreat': return retreat(table);
    case 'loot': return loot(table, player, cmd);
    case 'pass-loot': return passLoot(table, player);
    case 'team': return team(table, player, cmd);
    case 'rest': return rest(table);
    default: return fail('Unknown choice.');
  }
}

function sit(table, player, cmd) {
  if (table.phase !== 'lobby') return fail('The campaign has already started.');
  const heroName = clean(cmd.name, 16);
  if (heroName.length < 2) return fail('Give your hero a name (2–16 characters).');
  if (!CLASSES[cmd.cls]) return fail('Pick a class.');
  if (table.players.some((p) => p !== player && p.name.toLowerCase() === heroName.toLowerCase())) return fail('Another hero already has that name.');
  player.name = heroName;
  player.cls = cmd.cls;
  player.ready = false;
  return ok();
}

function ready(table, player, cmd) {
  if (table.phase === 'lobby') {
    if (cmd.name || cmd.cls) {
      const sat = sit(table, player, cmd);
      if (!sat.ok) return sat;
    }
    player.ready = cmd.on !== false;
    return ok();
  }
  if (table.phase === 'camp') return readyCamp(table, player);
  if (table.phase === 'road') return onward(table, player);
  return fail('Not now.');
}

function startCampaign(table, player) {
  if (table.phase !== 'lobby') return fail('The campaign has already started.');
  if (player.id !== table.hostId) return fail('The host starts the campaign.');
  if (table.players.length < 1 || table.players.length > 6) return fail('The table seats one to six heroes.');
  if (table.players.some((p) => !p.ready)) return fail('Every hero has to be ready.');
  const company = E.newCompany({
    name: table.name,
    roster: table.players.map((p) => ({ name: p.name, cls: p.cls })),
    seed: table.seed,
  });
  table.players.forEach((p, i) => { p.hero = company.members[i]; p.ready = false; });
  table.company = company;
  return enterRoad(table);
}

function enterRoad(table) {
  table.phase = 'road';
  table.roadResult = null;
  table.players.forEach((p) => { p.ready = false; });
  R.ensureRoad(members(table)[0], members(table));
  return ok();
}

function chooseRoad(table, player, cmd) {
  if (table.phase !== 'road') return fail('There is no road in front of you.');
  if (table.company.campaign.road?.done) return fail('The company already chose.');
  const res = R.chooseRoad(player.hero, members(table), cmd.id);
  if (!res) return fail('The road will not take that.');
  table.roadResult = { title: res.title, text: res.text, by: player.name };
  table.players.forEach((p) => { p.ready = false; });
  return ok();
}

function onward(table, player) {
  if (table.phase !== 'road') return fail('Not on the road.');
  if (!table.company.campaign.road?.done) return fail('Choose first.');
  player.ready = true;
  if (table.players.every((p) => p.ready)) {
    table.phase = 'board';
    table.players.forEach((p) => { p.ready = false; });
  }
  return ok();
}

function startQuest(table, cmd) {
  if (table.phase !== 'board') return fail('Choose a quest from the board.');
  const hero = members(table)[0];
  const q = E.questsFor(hero).find((quest) => quest.id === cmd.id);
  if (!q) return fail('That road has moved.');
  const quest = E.withAmbush(q, hero.campaign);
  const rng = E.makeRng(E.hashSeed(table.seed, hero.campaign.act, hero.campaign.step, 'battle', table.seq));
  table.quest = quest;
  table.battle = E.newPartyBattle(members(table), quest, rng);
  for (const f of table.battle.fighters) { f.locked = false; f.skipped = false; }
  table.lastReport = null;
  table.phase = 'battle';
  return ok();
}

function goCamp(table) {
  if (table.phase !== 'board') return fail('Camp is not open.');
  return enterCamp(table);
}

function enterCamp(table) {
  table.phase = 'camp';
  table.battle = null;
  table.players.forEach((p) => { p.ready = false; });
  E.shopStock(members(table)[0]);
  return ok();
}

function readyCamp(table, player) {
  if (player.hero.pendingPerks > 0) return fail('Choose your perk first.');
  player.ready = true;
  if (table.players.every((p) => p.ready)) {
    const hero = members(table)[0];
    table.players.forEach((p) => { p.ready = false; });
    if (R.roadIsOpen(hero)) return enterRoad(table);
    table.phase = 'board';
  }
  return ok();
}

function upgrade(table, player, cmd) {
  if (table.phase !== 'camp') return fail('The forge is at camp.');
  if (cmd.kind !== 'strength' && cmd.kind !== 'special') return fail('Unknown die.');
  if (!E.upgradeDie(player.hero, cmd.kind, cmd.slot)) return fail('That die will not grow yet.');
  player.ready = false;
  return ok();
}
function potion(table, player) {
  if (table.phase !== 'camp') return fail('Potions are sold at camp.');
  const r = E.potionBuyInfo(player.hero);
  if (!r.ok) return fail(r.why === 'Belt full' ? 'Your belt is full.' : 'Not enough gold.');
  E.buyPotion(player.hero); player.ready = false;
  return ok();
}
function buy(table, player, cmd) {
  if (table.phase !== 'camp') return fail('The peddler is at camp.');
  if (!E.buyItem(player.hero, cmd.index | 0)) return fail('You cannot buy that.');
  player.ready = false;
  return ok();
}
function equip(table, player, cmd) {
  if (table.phase !== 'camp') return fail('Change gear at camp.');
  const side = cmd.side === 'NE' ? 'NE' : 'NW';
  const can = E.canEquip(player.hero, cmd.uid, side); if (!can.ok) return fail(can.why);
  if (!E.equip(player.hero, cmd.uid, side)) return fail('That weapon is not in your pack.');
  player.ready = false;
  return ok();
}
function sell(table, player, cmd) {
  if (table.phase !== 'camp') return fail('Sell at camp.');
  if (!E.sellItem(player.hero, cmd.uid)) return fail('That weapon is not in your pack.');
  player.ready = false;
  return ok();
}

function offerKey(hero) { return `${hero.name}:${hero.level}:${hero.pendingPerks}:${hero.perks.length}`; }
function ensureOffer(table, hero) {
  if (hero.pendingPerks <= 0) return null;
  const key = offerKey(hero);
  if (!table.perkOffers[key]) {
    const rng = E.makeRng(E.hashSeed(table.seed, 'perk', key));
    table.perkOffers[key] = E.offerPerks(hero, rng);
  }
  return table.perkOffers[key];
}
function perk(table, player, cmd) {
  if (table.phase !== 'camp' && table.phase !== 'victory') return fail('No perk to choose.');
  const key = offerKey(player.hero);
  const offer = ensureOffer(table, player.hero);
  if (!offer || !offer.includes(cmd.id)) return fail('That perk is not on offer.');
  if (!E.takePerk(player.hero, cmd.id)) return fail('No perk to choose.');
  delete table.perkOffers[key];
  player.ready = false;
  if (table.phase === 'victory') settleVictory(table);
  return ok();
}

function fighterOf(table, player) {
  return table.battle?.fighters.find((f) => f.hero === player.hero) || null;
}
function withFighter(table, player, fn) {
  const b = table.battle;
  const i = b.fighters.findIndex((f) => f.hero === player.hero);
  if (i < 0) return false;
  E.focusFighter(b, i);
  const result = fn(b, b.fighters[i]);
  E.commitFighter(b);
  return result;
}
function withDice(table, fighter, fn) {
  const b = table.battle;
  const saved = b.rng;
  const draw = fighter._draws || 0;
  b.rng = E.makeRng(E.hashSeed(table.seed, 'body', fighter.hero.name, b.round, draw));
  try { fn(); fighter._draws = draw + 1; }
  finally { b.rng = saved; }
}

function heal(table, player) {
  if (table.phase !== 'battle') return fail('You can heal in a fight.');
  const done = withFighter(table, player, (b, f) => {
    if (f.hp <= 0 || f.locked) return false;
    return E.healSpend(b);
  });
  return done ? ok() : fail('Not enough ✦ Magic, or you are already full.');
}
function recharge(table, player, cmd) {
  if (table.phase !== 'battle') return fail('Not in a fight.');
  const done = withFighter(table, player, (b, f) => {
    if (f.hp <= 0 || f.locked) return false;
    return E.recharge(b, cmd.id);
  });
  return done ? ok() : fail('Not enough ✦ Magic.');
}
function roll(table, player) {
  if (table.phase !== 'battle') return fail('Not in a fight.');
  const f = fighterOf(table, player);
  if (!f || f.hp <= 0) return fail('You are down.');
  if (f.locked) return fail('You already locked in.');
  if (f.board) return fail('Your dice are already out.');
  withFighter(table, player, (b, fighter) => {
    withDice(table, fighter, () => { E.startRoll(b); });
    return true;
  });
  return ok();
}
function cleanSlots(slots) {
  if (!Array.isArray(slots) || !slots.length) return null;
  const out = [];
  for (const s of slots) {
    if (!SLOTS.includes(s) || out.includes(s)) return null;
    out.push(s);
  }
  return out;
}
function reroll(table, player, cmd) {
  if (table.phase !== 'battle') return fail('Not in a fight.');
  const slots = cleanSlots(cmd.slots);
  if (!slots) return fail('Tap the dice you want to reroll.');
  let error = 'Those dice will not reroll.';
  const done = withFighter(table, player, (b, f) => {
    if (f.hp <= 0 || f.locked || !f.board) { error = 'Roll your dice before you shape them.'; return false; }
    if (!E.canReroll(b, slots)) return false;
    withDice(table, f, () => { E.reroll(b, slots); });
    return true;
  });
  return done ? ok() : fail(error);
}
function nudge(table, player, cmd) {
  if (table.phase !== 'battle') return fail('Not in a fight.');
  const dir = cmd.dir === 1 || cmd.dir === -1 ? cmd.dir : 0;
  if (!dir) return fail('The heart cannot go that way.');
  const done = withFighter(table, player, (b, f) => {
    if (f.hp <= 0 || f.locked || !f.board) return false;
    return E.nudge(b, dir);
  });
  return done ? ok() : fail('Not enough ✦ Magic, or the heart cannot go that way.');
}
function card(table, player, cmd) {
  if (table.phase !== 'battle') return fail('Not in a fight.');
  const done = withFighter(table, player, (b, f) => {
    if (f.hp <= 0 || f.locked || !f.board) return false;
    return E.playCard(b, cmd.id);
  });
  return done ? ok() : fail('Not enough ✦ Magic, or that card is spent.');
}
function living(battle) { return battle.fighters.filter((f) => f.hp > 0); }
function maybeResolve(table) {
  const b = table.battle;
  if (!b || b.outcome) return;
  if (!living(b).every((f) => f.locked)) return;
  const seen = b.enemies.filter((e) => e.hp > 0).map((e) => ({ uid: e.uid, v: e.intent?.v, n: e.intent?.n }));
  const rep = E.resolveParty(b);
  rep._committed = seen;
  table.lastReport = rep;
  if (b.outcome === 'victory') return enterVictory(table);
  if (b.outcome === 'defeat') return enterDefeat(table, false);
  for (const f of b.fighters) { f.locked = false; f.skipped = false; }
  return ok();
}
function lock(table, player, cmd) {
  if (table.phase !== 'battle') return fail('Not in a fight.');
  const f = fighterOf(table, player);
  if (!f || f.hp <= 0) return fail('You are down.');
  if (f.locked) return fail('You already locked in.');
  if (!f.board) return fail('Roll your dice first.');
  const alive = table.battle.enemies.map((e, i) => (e.hp > 0 ? i : -1)).filter((i) => i >= 0);
  let target = cmd.target | 0;
  if (!alive.includes(target)) target = alive[0] ?? 0;
  f.target = target;
  f.straight = cmd.straight === 'gold' ? 'gold' : 'atk';
  f.locked = true;
  maybeResolve(table);
  return ok();
}
function unlock(table, player) {
  if (table.phase !== 'battle') return fail('Not in a fight.');
  const f = fighterOf(table, player);
  if (!f || !f.locked) return fail('You have not locked in.');
  if (f.skipped) return fail('The host marked you away this round.');
  f.locked = false;
  return ok();
}
function skip(table, player, cmd) {
  if (table.phase !== 'battle') return fail('Not in a fight.');
  if (player.id !== table.hostId) return fail('Only the host can skip a hero who left.');
  const who = table.players.find((p) => p.id === cmd.playerId);
  if (!who || who.id === player.id) return fail('Each hero decides on their own phone.');
  const f = fighterOf(table, who);
  if (!f || f.hp <= 0) return fail('That hero is not in the fight.');
  if (f.locked) return fail('They already locked in.');
  f.locked = true;
  f.skipped = true;
  maybeResolve(table);
  return ok();
}
function retreat(table) {
  if (table.phase !== 'battle') return fail('You are not in a fight.');
  return enterDefeat(table, true);
}
// A team action on a friend: throw a potion, share magic, or revive (see E.teamAction). One per round.
function team(table, player, cmd) {
  if (table.phase !== 'battle') return fail('Not in a fight.');
  const b = table.battle; const from = b.fighters.findIndex((f) => f.hero.name === player.hero?.name);
  const to = b.fighters.findIndex((f) => f.hero.name === cmd.to);
  if (from < 0) return fail('You are not in this fight.');
  const r = E.teamAction(b, from, cmd.kind, to);
  return r.ok ? ok() : fail(r.why);
}
function enterVictory(table) {
  const b = table.battle;
  const levels = {};
  for (const f of b.fighters) levels[f.hero.name] = f.hero.level;
  const r = E.partyRewards(b);
  for (const f of b.fighters) {
    const g = r.gold[f.hero.name] || 0;
    f.hero.gold = Math.max(0, f.hero.gold + g);
    f.hero.stats.goldEarned += Math.max(0, g);
    f.hero.stats.battles++;
    E.gainXp(f.hero, r.xp);
    E.recordBattle(f.hero, { points: r.points[f.hero.name], place: r.place[f.hero.name], heroes: b.fighters.length, won: true });
  }
  E.spendBlessings(table.company.campaign);
  E.clearAmbush(table.company.campaign);
  E.advanceCampaign(b.fighters[0].hero);
  table.rewards = {
    xp: r.xp, gold: r.gold, drops: r.drops, order: r.order, contrib: r.contrib, points: r.points, place: r.place,
    levels, draft: E.newDraft(r.order, r.drops.length), questName: table.quest?.name || '',
  };
  table.phase = 'victory';
  table.players.forEach((p) => { p.ready = false; });
  settleVictory(table);
  return ok();
}
function settleVictory(table) {
  if (table.phase !== 'victory') return;
  const r = table.rewards;
  const perks = members(table).some((m) => m.pendingPerks > 0);
  if (!perks && r.draft.done) enterCamp(table);
}
function loot(table, player, cmd) {
  if (table.phase !== 'victory') return fail('No spoils yet.');
  const r = table.rewards;
  const who = E.draftWho(r.draft);
  if (player.hero.name !== who) return fail(`${who} is choosing.`);
  const i = String(cmd.index | 0);
  const inst = r.drops[i];
  if (!inst || r.draft.picked[i]) return fail('That weapon is gone.');
  if (E.bagFull(player.hero)) return fail('Your pack is full. Sell something first, or skip.');
  player.hero.bag.push(inst);
  E.draftPick(r.draft, who, i);
  settleVictory(table);
  return ok();
}
function passLoot(table, player) {
  if (table.phase !== 'victory') return fail('No spoils yet.');
  const r = table.rewards;
  const who = E.draftWho(r.draft);
  if (!who) return fail('The spoils are done.');
  if (player.hero.name !== who && player.id !== table.hostId) return fail(`${who} is choosing.`);
  E.draftSkip(r.draft, who);
  settleVictory(table);
  return ok();
}
function enterDefeat(table, retreatFlag) {
  let loss = 0;
  for (const m of members(table)) {
    const cut = Math.floor(m.gold * 0.15);
    m.gold -= cut;
    m.stats.defeats++;
    loss += cut;
  }
  E.spendBlessings(table.company.campaign);
  E.clearAmbush(table.company.campaign);
  table.loss = loss;
  table.retreat = !!retreatFlag;
  table.phase = 'defeat';
  table.battle = null;
  return ok();
}
function rest(table) {
  if (table.phase !== 'defeat') return fail('The company is not defeated.');
  return enterCamp(table);
}

function stageOf(f) {
  if (f.hp <= 0) return 'down';
  if (f.skipped) return 'skipped';
  if (f.locked) return 'locked';
  if (f.board) return 'shape';
  return 'reset';
}
function publicEnemy(e) {
  return {
    uid: e.uid, id: e.id, name: e.name, glyph: e.glyph, tier: e.tier,
    hp: e.hp, maxHp: e.maxHp, powerDie: e.powerDie, flat: e.flat, buff: e.buff,
    intent: e.intent ? { ...e.intent } : null,
    raged: !!e.raged, rageName: e.rageName || '', carried: e.carried || 0, windup: !!e.windup,
  };
}

export function playerView(table, playerId) {
  const player = table.players.find((p) => p.id === playerId);
  const base = {
    seq: table.seq, code: table.code, name: table.name, phase: table.phase,
    you: player ? { id: player.id, name: player.name, cls: player.cls, host: player.id === table.hostId, ready: !!player.ready } : null,
    players: table.players.map((p) => ({ id: p.id, name: p.name, cls: p.cls, ready: !!p.ready, host: p.id === table.hostId })),
  };
  if (!table.company) return base;
  const me = player?.hero;
  if (table.phase === 'road') {
    const ev = R.ensureRoad(members(table)[0], members(table));
    base.road = table.roadResult
      ? { done: true, ...table.roadResult, waiting: table.players.filter((p) => !p.ready).map((p) => p.name) }
      : { done: false, ...ev };
    base.hero = me ? clone(me) : null;
    return base;
  }
  if (table.phase === 'board') {
    const hero = members(table)[0];
    const c = hero.campaign;
    base.board = {
      act: c.act, step: c.step,
      blessings: (c.blessings || []).filter((b) => (b.fights ?? 1) > 0).map((b) => b.text),
      ambush: !!(c.ambush && c.ambush.length),
      quests: E.questsFor(hero),
    };
    base.hero = me ? clone(me) : null;
    base.mates = members(table).map((m) => ({ name: m.name, cls: m.cls, level: m.level, gold: m.gold }));
    return base;
  }
  if (table.phase === 'camp') {
    base.hero = me ? clone(me) : null;
    base.perkOffer = me ? ensureOffer(table, me) : null;
    base.mates = table.players.map((p) => ({
      id: p.id, name: p.name, cls: p.cls, level: p.hero.level, gold: p.hero.gold,
      ready: !!p.ready, pending: p.hero.pendingPerks || 0,
    }));
    return base;
  }
  if (table.phase === 'battle' && table.battle) {
    const f = me && fighterOf(table, player);
    const stage = f ? stageOf(f) : 'down';
    base.battle = {
      round: table.battle.round,
      questName: table.quest?.name || '',
      enemies: table.battle.enemies.map(publicEnemy),
      roster: table.battle.fighters.map((g) => ({
        id: table.players.find((p) => p.hero === g.hero)?.id,
        name: g.hero.name, cls: g.hero.cls, hp: g.hp, maxHp: g.maxHp, status: stageOf(g),
      })),
      me: f ? {
        stage, hp: f.hp, maxHp: f.maxHp, magic: f.magic,
        board: f.board && stage !== 'down' ? clone(f.board) : null,
        actionsLeft: f.actionsLeft, freeActions: f.freeActions || [], used: { ...f.used },
        mods: { ...f.mods }, boundNow: f.boundNow || 0,
        hero: clone(f.hero), target: f.target || 0, straight: f.straight || 'atk',
      } : null,
      report: table.lastReport ? clone(table.lastReport) : null,
    };
    base.hero = f ? base.battle.me.hero : (me ? clone(me) : null);
    return base;
  }
  if (table.phase === 'victory' && table.rewards) {
    const r = table.rewards;
    base.victory = {
      questName: r.questName, xp: r.xp, gold: r.gold, contrib: r.contrib, levels: r.levels,
      order: r.order, picker: r.draft.done ? r.order.length : r.draft.turn % r.order.length, picked: r.draft.picked, drops: r.drops,
      waiting: E.draftWho(r.draft),
    };
    base.hero = me ? clone(me) : null;
    base.perkOffer = me ? ensureOffer(table, me) : null;
    return base;
  }
  if (table.phase === 'defeat') {
    base.defeat = { retreat: !!table.retreat, loss: table.loss || 0, questName: table.quest?.name || '' };
    base.hero = me ? clone(me) : null;
    return base;
  }
  base.hero = me ? clone(me) : null;
  return base;
}

export { host };

// Save a table as text (for an online room) and load it back.
export function saveTable(table) { return pack(table); }
export function loadTable(text) {
  const table = unpack(text);
  if (table.battle) table.battle.rng = E.makeRng(E.hashSeed(table.seed, 'move', table.seq));
  return table;
}
