// One table, many phones. The server holds the company. Each phone sends only its own
// choices. Monster intentions are rolled when the round opens, before any hero locks.
// The round resolves once, when every living hero has locked or been skipped.
import * as SO from './secrets.js';
import * as LG from './legend.js';
import { CLASSES, SLOTS, CHARM_MAX, normalizeDifficulty, uniqueColors, claimColor, colorIdOf } from './data.js';
import * as E from './engine.js';
import * as R from './roads.js';
import * as SV from './save.js';
import { applyPlaceVictory } from './story.js';
import { pack, unpack } from './pack.js';
import { packOf, packIdOf, classLabel } from './campaigns.js';

const clone = (v) => JSON.parse(JSON.stringify(v));
const clean = (s, max) => String(s || '').trim().replace(/\s+/g, ' ').slice(0, max);

export function createTable({ code, seed, name, difficulty, pack }) {
  const title = clean(name, 24);
  return {
    code, seed: (seed ?? 1) >>> 0, name: title.length >= 2 ? title : 'Company',
    difficulty: normalizeDifficulty(difficulty),
    pack: packIdOf(pack),
    hostId: null, seq: 1, phase: 'lobby', players: [],
    company: null, battle: null, quest: null, lastReport: null, rewards: null,
    roadResult: null, perkOffers: {}, loss: 0, retreat: false,
  };
}

function takeBrought(raw, name, cls) {
  if (!raw || typeof raw !== 'object') return null;
  const brought = clone(raw);
  brought.name = name;
  if (CLASSES[brought.cls]) cls = brought.cls;
  else brought.cls = cls;
  if (!CLASSES[brought.cls]) return null;
  return brought;
}

function packSeatError(table, cls) {
  const p = packOf(table.pack);
  const max = p.maxHeroes || 6;
  if (table.players.length >= max) return fail(max <= 2 ? 'This story seats two heroes.' : 'Six heroes is a full company.');
  if (p.forcedClasses?.length) {
    if (!p.forcedClasses.includes(cls)) return fail(`This story needs the ${p.forcedClasses.map(classLabel).join(' and ')}.`);
    if (table.players.some((x) => x.cls === cls)) return fail(`The ${classLabel(cls)} seat is taken.`);
  }
  return null;
}

export function joinTable(table, { name, cls, token, hero }) {
  if (table.phase !== 'lobby') return fail('This table has already taken the road.');
  const heroName = clean(name, 16);
  if (heroName.length < 2) return fail('Give your hero a name (2–16 characters).');
  if (!CLASSES[cls] && !CLASSES[hero?.cls]) return fail('Pick a class.');
  if (!token) return fail('Missing seat.');
  if (table.players.some((p) => p.name.toLowerCase() === heroName.toLowerCase())) return fail('Another hero already has that name.');
  const brought = takeBrought(hero, heroName, cls || hero?.cls);
  const seatCls = brought?.cls || cls;
  if (!CLASSES[seatCls]) return fail('Pick a class.');
  const packed = packSeatError(table, seatCls);
  if (packed) return packed;
  // (the id shows no part of the token)
  const player = { id: `p${table.players.length + 1}${E.hashSeed(token).toString(36).slice(0, 4)}`, token, name: heroName, cls: seatCls, ready: false, seenBrag: false, hero: null, brought, color: brought?.color };
  seatColor(table, player);
  table.players.push(player);
  if (!table.hostId) table.hostId = player.id;
  table.seq += 1;
  return { ok: true, player };
}

// Take a seat back on a new phone (Dave, Oct 2026: a phone that forgot its seat must not strand a game). The caller has proved
// it is that hero (its cloud save opened with the password); the old phone's seat token is replaced, and the game goes on.
export function seatByName(table, name) { const n = clean(name, 16).toLowerCase(); return table.players.find((p) => p.name.toLowerCase() === n) || null; }
export function reclaimSeat(table, { name, token }) {
  const p = seatByName(table, name);
  if (!p) return fail('That hero is not at this table.');
  if (!token) return fail('Missing seat.');
  p.token = token; table.seq += 1;
  return { ok: true, player: p };
}
// What to say when a started table turns a hero away: if the name is already seated, how to take the seat back.
export function joinRefusal(table, name, error) {
  return table.phase !== 'lobby' && seatByName(table, name) ? `${seatByName(table, name).name} already sits at this table. To take that seat back on this phone, choose Cloud save and enter ${seatByName(table, name).name}'s password.` : error;
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
    case 'rematch': return rematch(table, player);
    case 'onward': return onward(table, player);
    case 'quest': return startQuest(table, cmd);
    case 'camp': return goCamp(table);
    case 'upgrade': return upgrade(table, player, cmd);
    case 'op': return heroOp(table, player, cmd);
    case 'push': return push(table, player);
    case 'envelope': return openEnvelope(table, player, cmd);
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
    case 'drink': return drink(table, player);
    case 'lock': return lock(table, player, cmd);
    case 'unlock': return unlock(table, player);
    case 'skip': return skip(table, player, cmd);
    case 'retreat': return retreat(table);
    case 'loot': return loot(table, player, cmd);
    case 'pass-loot': return passLoot(table, player);
    case 'charm': return takeCharm(table, player, cmd);
    case 'team': return team(table, player, cmd);
    case 'rest': return rest(table);
    case 'brag-seen': return bragSeen(table, player);
    default: return fail('Unknown choice.');
  }
}

function takenColors(table, cls, except) {
  return table.players.filter((p) => p !== except && p.cls === cls).map((p) => p.color || colorIdOf(p.brought || { cls: p.cls }));
}
function seatColor(table, player) {
  const id = claimColor({ cls: player.cls, color: player.brought?.color || player.color }, takenColors(table, player.cls, player));
  player.color = id;
  if (player.brought) player.brought.color = id;
  return id;
}
function hostAct(table, broughtHost) {
  const h = broughtHost || table.players.find((p) => p.id === table.hostId)?.brought;
  return Math.max(1, h?.campaign?.act | 0) || 1;
}
function sit(table, player, cmd) {
  if (table.phase !== 'lobby') return fail('The campaign has already started.');
  const heroName = clean(cmd.name, 16);
  if (heroName.length < 2) return fail('Give your hero a name (2–16 characters).');
  if (table.players.some((p) => p !== player && p.name.toLowerCase() === heroName.toLowerCase())) return fail('Another hero already has that name.');
  if (cmd.hero) {
    const brought = takeBrought(cmd.hero, heroName, cmd.cls || cmd.hero.cls);
    if (!brought) return fail('Pick a class.');
    player.brought = brought;
    player.name = brought.name;
    player.cls = brought.cls;
    player.ready = false;
    seatColor(table, player);
    return ok();
  }
  if (!CLASSES[cmd.cls]) return fail('Pick a class.');
  if (player.cls !== cmd.cls) {
    const other = table.players.find((p) => p !== player && p.cls === cmd.cls);
    const p = packOf(table.pack);
    if (p.forcedClasses?.length && !p.forcedClasses.includes(cmd.cls)) return fail(`This story needs the ${p.forcedClasses.map(classLabel).join(' and ')}.`);
    if (p.forcedClasses?.length && other) return fail(`The ${classLabel(cmd.cls)} seat is taken.`);
  }
  player.name = heroName;
  player.cls = cmd.cls;
  if (!(player.brought && player.brought.name === heroName && player.brought.cls === cmd.cls)) player.brought = null;
  if (cmd.color) player.color = cmd.color;
  player.ready = false;
  seatColor(table, player);
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

function takeHostCampaign(from) {
  if (!from) return null;
  const out = {
    act: Math.max(1, from.act | 0),
    step: Math.max(1, from.step | 0),
    wins: from.wins || 0,
    chronicle: clone(from.chronicle || []),
    nemeses: clone(from.nemeses || []),
    seenRoads: clone(from.seenRoads || []),
    storySeen: clone(from.storySeen || []),
    campFlags: clone(from.campFlags || {}),
    shop: null, blessings: [], ambush: null, road: null, nextPlace: null, nextEnemies: null,
  };
  if (from.seed != null) out.seed = from.seed;
  if (from.reached) out.reached = { act: from.reached.act | 0, step: from.reached.step | 0 };
  if (from.travellerAt != null) out.travellerAt = from.travellerAt;
  if (from.pack) out.pack = packIdOf(from.pack);
  return out;
}

function startCampaign(table, player) {
  if (table.phase !== 'lobby') return fail('The campaign has already started.');
  if (player.id !== table.hostId) return fail('The host starts the campaign.');
  const story = packOf(table.pack);
  const min = story.requiredHeroes || 1;
  const max = story.maxHeroes || 6;
  if (table.players.length < min || table.players.length > max) {
    return fail(min === max ? `This story seats ${min} ${min === 1 ? 'hero' : 'heroes'}.` : 'The table seats one to six heroes.');
  }
  if (story.forcedClasses?.length) {
    const have = table.players.map((p) => p.cls).slice().sort().join();
    const want = story.forcedClasses.slice().sort().join();
    if (have !== want) return fail(`This story needs the ${story.forcedClasses.map(classLabel).join(' and ')}.`);
  }
  if (table.players.some((p) => p.id !== table.hostId && !p.ready)) return fail('Every hero has to be ready.'); // the host starting is their own ready
  const host = table.players.find((p) => p.id === table.hostId);
  const company = E.newCompany({
    name: table.name,
    roster: table.players.map((p) => ({ name: p.name, cls: p.cls, color: p.color || p.brought?.color })),
    seed: table.seed,
    pack: story.id,
  });
  const overlay = story.startMode === 'fresh' ? null : takeHostCampaign(host?.brought?.campaign);
  if (overlay) Object.assign(company.campaign, overlay);
  company.campaign.pack = story.id;
  table.difficulty = normalizeDifficulty(table.difficulty || host?.brought?.difficulty);
  table.players.forEach((p, i) => {
    let hero = company.members[i];
    if (p.brought && story.startMode !== 'fresh') {
      hero = clone(p.brought);
      hero.name = p.name;
      hero.cls = p.cls;
      hero.campaign = company.campaign;
      company.members[i] = hero;
    }
    hero.difficulty = table.difficulty;
    hero.campaign = company.campaign;
    p.hero = hero;
    p.ready = false;
    p.brought = null;
  });
  uniqueColors(company.members);
  table.players.forEach((p, i) => { p.color = company.members[i].color; p.hero = company.members[i]; });
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
  table.roadResult = { title: res.title, text: res.text, by: player.name, trial: res.trial || null };
  table.players.forEach((p) => { p.ready = false; });
  return ok();
}

// After a lost test on the road, anyone may ask for the one rematch (the company pays).
function rematch(table, player) {
  if (table.phase !== 'road' || !table.roadResult?.trial) return fail('There is nothing to rematch.');
  const res = R.rematchTrial(player.hero, members(table));
  if (!res) return fail('No rematch: it is used, or the company cannot pay.');
  table.roadResult = { title: res.title, text: res.text, by: player.name, trial: res.trial };
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
  table.reveal = null;
  table.bonus = null;
  const hs = members(table);
  // Solo: no envelopes; a fight or elite gets a Bonus Goal. Tables of 2–6 keep secret objectives.
  // envelopes === 'off' skips both (the host turned the extras off).
  if (table.envelopes !== 'off' && hs.length === 1 && SO.wantsBonus(quest.kind)) {
    table.bonus = SO.dealBonusGoal({ c: hero.campaign, hero: hs[0], salt: `t${table.seq}` });
    table.envelope = null;
    table.phase = 'envelope';
    return ok();
  }
  if (hs.length > 1 && table.envelopes !== 'off') {
    table.envelope = SO.dealEnvelopes({ c: hero.campaign, heroes: hs, enemies: table.battle.enemies, salt: `t${table.seq}`, big: ['elite', 'boss'].includes(table.quest?.kind) || !!table.quest?.perilous });
    table.phase = 'envelope';
    return ok();
  }
  table.envelope = null;
  table.phase = 'battle';
  return ok();
}
// Your envelope: Got it (or Accept / Decline for an offered bribe). When every hero has answered, the battle begins.
function openEnvelope(table, player, cmd) {
  if (table.phase !== 'envelope') return fail('There is no envelope now.');
  if (table.bonus) {
    if (!SO.answerBonus(table.bonus, { accept: !!cmd.accept, hero: members(table)[0] })) return fail('There is no Bonus Goal for you.');
    table.phase = 'battle';
    return ok();
  }
  if (!table.envelope) return fail('There is no envelope now.');
  if (!SO.answer(table.envelope, player.hero.name, { accept: !!cmd.accept })) return fail('There is no envelope for you.');
  return beginAfterEnvelopes(table);
}
function beginAfterEnvelopes(table) {
  if (table.bonus) { table.phase = 'battle'; return ok(); }
  if (!SO.everyoneAnswered(table.envelope, members(table).map((m) => m.name))) return ok();
  for (const f of table.battle.fighters) { const c = table.envelope.cards[f.hero.name]; if (c?.id === 'pact' && c.accepted) f.pactBribe = true; }
  table.phase = 'battle';
  return ok();
}
// After the battle: every card is revealed and paid (won or lost).
function revealEnvelopes(table, won) {
  const b = table.battle;
  if (table.bonus && b) {
    const j = SO.judgeBonus(table.bonus, b, { won });
    SO.payBonus(j, members(table)[0]);
    table.reveal = { won, voice: table.bonus.voice, crooks: false, lines: j.results.map((r) => ({ name: r.name, gold: r.gold, kind: r.kind, mode: r.mode, accepted: r.accepted, met: r.met, line: r.line })) };
    table.bonus = null;
    return;
  }
  const env = table.envelope; if (!env || !b) return;
  const j = SO.judge(env, b, { won });
  SO.payOut(j, Object.fromEntries(members(table).map((m) => [m.name, m])));
  table.reveal = { won, voice: env.voice, crooks: j.crooks, lines: j.results.map((r) => ({ name: r.name, gold: r.gold, kind: r.kind, mode: r.mode, accepted: r.accepted, met: r.met, line: r.line })) };
  table.envelope = null;
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
// The host moves the table on without a hero who has gone quiet (a phone that went to sleep): their perk is the first on offer,
// their pick of the spoils is passed, and they count as ready.
function push(table, player) {
  if (player.id !== table.hostId) return fail('Only the host can move the table on.');
  if (table.phase === 'envelope' && table.bonus) {
    if (!table.bonus.answered) SO.answerBonus(table.bonus, { accept: false });
    return beginAfterEnvelopes(table);
  }
  if (table.phase === 'envelope' && table.envelope) { // a phone went quiet on its envelope: its card stands, an offered bribe declined
    for (const m of members(table)) if (!table.envelope.answered[m.name]) SO.answer(table.envelope, m.name, { accept: false });
    return beginAfterEnvelopes(table);
  }
  if (table.phase === 'road') {
    if (!table.company.campaign.road?.done) return fail('Choose a road first.');
    table.players.forEach((p) => { p.ready = true; }); table.phase = 'board'; table.players.forEach((p) => { p.ready = false; });
    return ok();
  }
  if (table.phase === 'victory' || table.phase === 'camp') {
    for (const p of table.players) {
      let guard = 0;
      while (p.hero.pendingPerks > 0 && guard++ < 6) { const offer = ensureOffer(table, p.hero); if (!offer?.length) break; delete table.perkOffers[offerKey(p.hero)]; E.takePerk(p.hero, offer[0]); }
    }
    if (table.phase === 'victory') {
      const r = table.rewards; let guard = 0;
      while (!r.draft.done && guard++ < 30) { const who = E.draftWho(r.draft); if (!who) break; E.draftSkip(r.draft, who); }
      table.players.forEach((p) => { p.seenBrag = true; });
      settleVictory(table);
      return ok();
    }
    table.players.forEach((p) => { p.ready = true; });
    const hero = members(table)[0]; table.players.forEach((p) => { p.ready = false; });
    if (R.roadIsOpen(hero)) return enterRoad(table);
    table.phase = 'board';
    return ok();
  }
  return fail('There is nothing to wait for.');
}
// Camp, the whole of it: a change to your own hero, by the name of the rule that makes it (the camp screens call these
// same rules on their own copy first, so the phone answers at once; the table keeps the real one).
const HERO_OPS = new Set(['dropCharm', 'buyCharm', 'sellDiamond', 'upgradeDie', 'upgradePower', 'upgradePotions', 'unlockDie', 'trainWeapon', 'forgeWeapon', 'sellItem', 'removeTalent', 'addTalent', 'downgradeDie',
  'removePetSymbol', 'addPetSymbol', 'growPet', 'buyPet', 'buyPotion', 'buyRerollDie', 'buyItem', 'buyTonic', 'buyBundle', 'equip', 'equipPower', 'learnPower', 'armDiamond']);
function heroOp(table, player, cmd) {
  if (table.phase !== 'camp') return fail('That is done at camp.');
  if (!HERO_OPS.has(cmd.op)) return fail('Unknown camp choice.');
  const args = Array.isArray(cmd.args) ? cmd.args : [];
  if (args.length > 4 || args.some((a) => !['string', 'number', 'boolean'].includes(typeof a))) return fail('That choice was not understood.');
  if (E[cmd.op](player.hero, ...args) === false) return fail('That will not work right now.');
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
    return !!E.castPower(b, cmd.id, { x: cmd.x == null ? undefined : cmd.x | 0, release: !!cmd.release });
  });
  return done ? ok() : fail('Not enough ✦ Magic, or that power is spent.');
}
// A potion from your own belt, any time before you lock in.
function drink(table, player) {
  if (table.phase !== 'battle') return fail('You can drink a potion in a fight.');
  const done = withFighter(table, player, (b, f) => {
    if (f.hp <= 0 || f.locked) return false;
    return E.drinkPotion(b);
  });
  return done ? ok() : fail('No potion to drink, or you are at full health.');
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
  revealEnvelopes(table, true);
  LG.noteBattle(table.company.campaign, b, { won: true, quest: table.quest || b.quest, reveal: table.reveal }); // for the act's Legend
  const shattered = Object.fromEntries(members(table).map((m) => [m.name, E.shatterDiamonds(m).map((d) => d.id)]).filter(([, l]) => l.length)); // win or lose, a Diamond brought to the fight shatters
  const worn = Object.fromEntries(members(table).map((m) => [m.name, E.brokenLine(E.takeBroken(m))]).filter(([, l]) => l)); // weapons worn out by this battle (Oct 2026)
  const levels = {};
  for (const f of b.fighters) levels[f.hero.name] = f.hero.level;
  const r = E.partyRewards(b);
  const c = table.company.campaign;
  const repeat = {};
  const gold = {};
  for (const f of b.fighters) {
    const first = !SV.hasCleared(f.hero, c.act, c.step);
    repeat[f.hero.name] = !first;
    if (first) SV.markCleared(f.hero, c.act, c.step);
    let share = 1; if (!first) { share = SV.repeatShare(f.hero, c.act, c.step); SV.markRepeat(f.hero, c.act, c.step); }
    const g = first ? (r.gold[f.hero.name] || 0) : SV.repeatGold(r.gold[f.hero.name] || 0, share);
    gold[f.hero.name] = g;
    f.hero.gold = Math.max(0, f.hero.gold + g);
    f.hero.stats.goldEarned += Math.max(0, g);
    f.hero.stats.battles++;
    E.gainXp(f.hero, first ? r.xp : 0);
    E.recordBattle(f.hero, { points: r.points[f.hero.name], place: r.place[f.hero.name], heroes: b.fighters.length, won: true });
  }
  const charms = {}; // each hero's own charm offer, as solo (a repeat clear offers none)
  for (const f of b.fighters) if (!repeat[f.hero.name]) { const o = E.charmOffer(f.hero, b.quest, f.hero.name); if (o.length) charms[f.hero.name] = o; }
  const firstOrder = r.order.filter((name) => !repeat[name]);
  const drops = firstOrder.length ? r.drops : [];
  E.recordFled(table.company.campaign, b);
  applyPlaceVictory(table.company.campaign, table.quest?.place);
  E.spendBlessings(table.company.campaign);
  E.clearAmbush(table.company.campaign);
  E.advanceCampaign(b.fighters[0].hero);
  table.rewards = {
    xp: r.xp, gold, drops, order: r.order, contrib: r.contrib, points: r.points, place: r.place,
    levels, draft: E.newDraft(firstOrder, drops.length), questName: table.quest?.name || '',
    repeat, stats: Object.fromEntries(b.fighters.map((f) => [f.hero.name, { ...(f.stats || {}) }])), shattered, worn,
    charms, charmTaken: {},
  };
  table.phase = 'victory';
  table.players.forEach((p) => { p.ready = false; p.seenBrag = false; });
  settleVictory(table);
  return ok();
}
function settleVictory(table) {
  if (table.phase !== 'victory') return;
  const r = table.rewards;
  const perks = members(table).some((m) => m.pendingPerks > 0);
  const seen = table.players.every((p) => p.seenBrag);
  if (!perks && r.draft.done && seen) enterCamp(table);
}
function bragSeen(table, player) {
  if (table.phase !== 'victory') return fail('Not now.');
  player.seenBrag = true;
  settleVictory(table);
  return ok();
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
// A charm from the spoils: your own offer, one at most; with three already, name one to swap out.
function takeCharm(table, player, cmd) {
  if (table.phase !== 'victory') return fail('No spoils yet.');
  const r = table.rewards; const hero = player.hero; const name = hero.name;
  if (!(r.charms?.[name] || []).includes(cmd.id)) return fail('That charm is not on offer to you.');
  if (r.charmTaken?.[name]) return fail('You already took a charm.');
  if (cmd.swap) { if (!E.hasCharm(hero, cmd.swap)) return fail('You do not carry that charm.'); E.dropCharm(hero, cmd.swap); }
  if (!E.takeCharm(hero, cmd.id)) { if (cmd.swap) E.takeCharm(hero, cmd.swap); return fail(`You carry ${CHARM_MAX} charms. Swap one out.`); }
  (r.charmTaken ||= {})[name] = cmd.id;
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
  revealEnvelopes(table, false);
  if (table.battle) LG.noteBattle(table.company.campaign, table.battle, { won: false, quest: table.quest || table.battle.quest, reveal: table.reveal });
  for (const m of members(table)) { E.shatterDiamonds(m); E.takeBroken(m); } // (a worn-out weapon shows in the hero's pack at camp)
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
    difficulty: normalizeDifficulty(table.difficulty),
    pack: packIdOf(table.pack),
    you: player ? { id: player.id, name: player.name, cls: player.cls, color: player.color || player.hero?.color || player.brought?.color, host: player.id === table.hostId, ready: !!player.ready, seenBrag: !!player.seenBrag, level: player.hero?.level || player.brought?.level || 1 } : null,
    players: table.players.map((p) => ({ id: p.id, name: p.name, cls: p.cls, color: p.color || p.hero?.color || p.brought?.color, ready: !!p.ready, seenBrag: !!p.seenBrag, host: p.id === table.hostId, level: p.hero?.level || p.brought?.level || 1 })),
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
  if (table.phase === 'envelope' && table.bonus) {
    base.envelope = { card: SO.bonusView(table.bonus), waiting: table.bonus.answered ? [] : members(table).map((m) => m.name), questName: table.quest?.name || '', bonus: true };
    base.hero = me ? clone(me) : null;
    return base;
  }
  if (table.phase === 'envelope' && table.envelope) {
    base.envelope = { card: me ? SO.cardView(table.envelope, me.name) : null, waiting: members(table).filter((m) => !table.envelope.answered[m.name]).map((m) => m.name), questName: table.quest?.name || '' };
    base.hero = me ? clone(me) : null;
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
  if ((table.phase === 'victory' || table.phase === 'defeat') && table.reveal) base.reveal = table.reveal; // every secret card, after the battle
  if (table.phase === 'victory' && table.rewards) {
    const r = table.rewards;
    base.victory = {
      questName: r.questName, xp: r.xp, gold: r.gold, contrib: r.contrib, levels: r.levels,
      order: r.order, points: r.points, place: r.place, stats: r.stats, repeat: r.repeat || {},
      picker: r.draft.done ? r.order.length : r.draft.turn % r.order.length, picked: r.draft.picked, drops: r.drops,
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
// The table as a phone sees it: everything, but not the seat tokens (they prove who is who).
export function savePublic(table) {
  const tokens = table.players.map((p) => p.token);
  table.players.forEach((p) => { p.token = ''; });
  try { return pack(table); } finally { table.players.forEach((p, i) => { p.token = tokens[i]; }); }
}
export function loadTable(text) {
  const table = unpack(text);
  migrateTable(table);
  if (table.battle) table.battle.rng = E.makeRng(E.hashSeed(table.seed, 'move', table.seq));
  return table;
}
export function migrateTable(table) {
  if (!table || typeof table !== 'object') return table;
  table.pack = packIdOf(table.pack);
  const host = table.players?.find((p) => p.id === table.hostId) || table.players?.[0];
  const from = table.difficulty
    || host?.hero?.difficulty
    || host?.brought?.difficulty
    || table.company?.members?.[0]?.difficulty;
  table.difficulty = normalizeDifficulty(from);
  for (const m of table.company?.members || []) m.difficulty = table.difficulty;
  for (const p of table.players || []) {
    if (p.hero) p.hero.difficulty = table.difficulty;
    if (p.brought) SV.migrateHero(p.brought);
  }
  return table;
}
