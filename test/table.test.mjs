import test from 'node:test';
import assert from 'node:assert/strict';
import { createTable, joinTable, command, playerView } from '../js/table.js';
import * as E from '../js/engine.js';
import * as R from '../js/roads.js';
import * as SV from '../js/save.js';

function make(names = [['Ada', 'knight'], ['Bea', 'bard']]) {
  const table = createTable({ code: 'TEST', seed: 12345, name: 'Ash Company' });
  const players = names.map(([name, cls], i) => {
    const res = joinTable(table, { name, cls, token: `tok${i}aaaa` });
    assert.equal(res.ok, true, res.error);
    return res.player;
  });
  return { table, players };
}

function begin(table, players) {
  for (const p of players) assert.equal(command(table, p.id, { type: 'ready', name: p.name, cls: p.cls }).ok, true);
  const started = command(table, players[0].id, { type: 'start' });
  assert.equal(started.ok, true, started.error);
  const road = playerView(table, players[0].id).road;
  assert.equal(road.done, false);
  const choice = command(table, players[1].id, { type: 'choose', id: road.choices[0].id });
  assert.equal(choice.ok, true, choice.error);
  for (const p of players) assert.equal(command(table, p.id, { type: 'onward' }).ok, true);
  assert.equal(table.phase, 'board');
  const quest = playerView(table, players[0].id).board.quests[0];
  const go = command(table, players[0].id, { type: 'quest', id: quest.id });
  assert.equal(go.ok, true, go.error);
  assert.equal(table.phase, 'battle');
}

test('the table seats one to six, and only the host opens the road', () => {
  const { table, players } = make([['Ada', 'knight']]);
  assert.equal(command(table, players[0].id, { type: 'start' }).ok, true, 'a lone host starting is their own ready');
  assert.equal(table.phase, 'road');

  const { table: t2, players: ps } = make();
  assert.equal(command(t2, ps[0].id, { type: 'start' }).ok, false, 'a friend who is not ready holds the road');
  command(t2, ps[1].id, { type: 'ready' });
  assert.equal(command(t2, ps[1].id, { type: 'start' }).ok, false);
  assert.equal(command(t2, ps[0].id, { type: 'start' }).ok, true);
  assert.equal(t2.phase, 'road');

  const full = createTable({ code: 'FULL', seed: 1, name: 'Full' });
  for (let i = 0; i < 6; i++) {
    const joined = joinTable(full, { name: `Hero ${i + 1}`, cls: 'knight', token: `tok${i}full` });
    assert.equal(joined.ok, true, joined.error);
  }
  const seventh = joinTable(full, { name: 'Extra', cls: 'bard', token: 'tokoverflow' });
  assert.equal(seventh.ok, false);
});

test('one hero resolves the round when they lock', () => {
  const { table, players } = make([['Ada', 'knight']]);
  const ada = players[0];
  assert.equal(command(table, ada.id, { type: 'ready' }).ok, true);
  assert.equal(command(table, ada.id, { type: 'start' }).ok, true);
  const road = playerView(table, ada.id).road;
  assert.equal(command(table, ada.id, { type: 'choose', id: road.choices[0].id }).ok, true);
  assert.equal(command(table, ada.id, { type: 'onward' }).ok, true);
  assert.equal(table.phase, 'board');
  const quest = playerView(table, ada.id).board.quests[0];
  assert.equal(command(table, ada.id, { type: 'quest', id: quest.id }).ok, true);
  assert.equal(table.battle.players, 1);
  assert.equal(table.battle.enemies.length, quest.enemies.length);
  assert.equal(command(table, ada.id, { type: 'roll' }).ok, true);
  assert.equal(command(table, ada.id, { type: 'lock', target: 0, straight: 'atk' }).ok, true);
  assert.equal(table.lastReport.strikes.length, 1);
  assert.equal(table.lastReport.strikes[0].name, 'Ada');
});

test('dice do not depend on who rolls first', () => {
  const boards = (order) => {
    const { table, players } = make();
    begin(table, players);
    const by = Object.fromEntries(players.map((p) => [p.name, p]));
    for (const name of order) assert.equal(command(table, by[name].id, { type: 'roll' }).ok, true);
    return Object.fromEntries(table.battle.fighters.map((f) => [f.hero.name, f.board]));
  };
  const ab = boards(['Ada', 'Bea']);
  const ba = boards(['Bea', 'Ada']);
  assert.deepEqual(ab.Ada, ba.Ada);
  assert.deepEqual(ab.Bea, ba.Bea);
});

test('monsters choose when the round opens, and the fight waits for every phone', () => {
  const { table, players } = make();
  begin(table, players);
  const [ada, bea] = players;
  const before = playerView(table, ada.id);
  assert.ok(before.battle.enemies.every((e) => e.intent && e.intent.v));
  assert.equal(before.battle.me.stage, 'reset');
  assert.equal(before.battle.me.board, null);
  assert.deepEqual(before.battle.enemies.map((e) => e.intent.n), playerView(table, bea.id).battle.enemies.map((e) => e.intent.n));

  assert.equal(command(table, ada.id, { type: 'roll' }).ok, true);
  const secret = table.battle.fighters[0].board;
  assert.ok(secret);
  const beaView = playerView(table, bea.id);
  assert.equal(beaView.battle.me.board, null);
  assert.ok(beaView.battle.roster.every((r) => !('board' in r)));
  assert.equal(JSON.stringify(beaView).includes(JSON.stringify(secret)), false);
  assert.equal(beaView.battle.roster.find((r) => r.name === 'Ada').status, 'shape');
  assert.deepEqual(playerView(table, ada.id).battle.me.board, secret);

  const intents = table.battle.enemies.map((e) => ({ uid: e.uid, n: e.intent.n, v: e.intent.v }));
  const round = table.battle.round;
  for (const e of table.battle.enemies) { e.hp = 999; e.maxHp = 999; }
  for (const f of table.battle.fighters) { f.hp = 999; f.maxHp = 999; }
  assert.equal(command(table, ada.id, { type: 'lock', target: 0, straight: 'atk' }).ok, true);
  assert.equal(table.lastReport, null);
  assert.equal(table.battle.round, round);
  assert.deepEqual(table.battle.enemies.map((e) => e.intent.n), intents.map((i) => i.n));
  assert.equal(playerView(table, bea.id).battle.roster.find((r) => r.name === 'Ada').status, 'locked');
  assert.equal(JSON.stringify(playerView(table, bea.id)).includes(JSON.stringify(secret)), false);

  assert.equal(command(table, bea.id, { type: 'roll' }).ok, true);
  assert.equal(command(table, bea.id, { type: 'lock', target: 0, straight: 'atk' }).ok, true);
  assert.ok(table.lastReport);
  assert.equal(table.lastReport.strikes.length, 2);
  for (const intent of intents) {
    const act = table.lastReport.acts.find((a) => a.uid === intent.uid);
    assert.ok(act, intent.n);
    assert.equal(act.v, intent.v);
    assert.equal(act.name, intent.n);
  }
  assert.equal(table.phase, 'battle');
  assert.ok(table.battle.round > round);
  assert.equal(playerView(table, ada.id).battle.me.board, null);
  assert.ok(playerView(table, ada.id).battle.enemies.every((e) => e.intent));
});

test('the host can skip a phone that left, and that hero does not get a look at the dice', () => {
  const { table, players } = make();
  begin(table, players);
  const [ada, bea] = players;
  assert.equal(command(table, ada.id, { type: 'roll' }).ok, true);
  assert.equal(command(table, ada.id, { type: 'skip', playerId: ada.id }).ok, false);
  assert.equal(command(table, bea.id, { type: 'skip', playerId: ada.id }).ok, false);
  assert.equal(command(table, ada.id, { type: 'lock', target: 0 }).ok, true);
  const secret = table.battle.fighters[0].board;
  assert.equal(command(table, ada.id, { type: 'skip', playerId: bea.id }).ok, true);
  assert.ok(table.lastReport);
  assert.equal(table.lastReport.strikes.length, 1);
  assert.equal(table.lastReport.strikes[0].name, 'Ada');
  assert.equal(JSON.stringify(playerView(table, bea.id)).includes(JSON.stringify(secret)), false);
});

test('in a table fight: powers with their magic, potions from your own belt', () => {
  const { table, players } = make([['Wyn', 'wizard'], ['Bo', 'knight']]);
  command(table, players[1].id, { type: 'ready' }); command(table, table.hostId, { type: 'start' });
  for (let i = 0; i < 4 && table.phase === 'road'; i++) {
    const ev = R.ensureRoad(table.company.members[0], table.company.members); const ch = ev.choices.find((x) => x.ok);
    if (!table.company.campaign.road.done) command(table, table.hostId, { type: 'choose', id: ch.id });
    for (const p of table.players) command(table, p.id, { type: 'onward' });
  }
  assert.equal(table.phase, 'board');
  const q = E.questsFor(table.company.members[0])[0]; assert.ok(command(table, table.hostId, { type: 'quest', id: q.id }).ok);
  const wiz = players[0]; assert.ok(command(table, wiz.id, { type: 'roll' }).ok);
  const f = table.battle.fighters[0]; f.magic = 9;
  const r = command(table, wiz.id, { type: 'card', id: 'arcbolt', x: 6 }); assert.ok(r.ok, r.error);
  assert.equal(f.lastCast.rolls.length, 3, 'Arc Bolt: 6 magic is 3 dice, and the table remembers what was rolled');
  assert.equal(f.magic, 3);
  assert.equal(command(table, wiz.id, { type: 'card', id: 'coil' }).ok, true); assert.equal(f.charge.coil, 1);
  assert.equal(command(table, wiz.id, { type: 'card', id: 'coil', release: true }).ok, true);
  f.hp = f.maxHp - 5; const potions = f.hero.potions ?? 2; assert.ok(command(table, wiz.id, { type: 'drink' }).ok); assert.equal(f.hero.potions, potions - 1);
  assert.equal(command(table, wiz.id, { type: 'drink' }).ok, false, 'full health: no potion wasted');
});

test('the host can move a table on without a hero who went quiet', () => {
  const { table, players } = make([['Ada', 'knight'], ['Bea', 'bard'], ['Cy', 'ranger']]);
  for (const p of players.slice(1)) command(table, p.id, { type: 'ready' });
  command(table, table.hostId, { type: 'start' });
  const ev = R.ensureRoad(table.company.members[0], table.company.members);
  command(table, players[1].id, { type: 'choose', id: ev.choices.find((x) => x.ok).id });
  command(table, players[0].id, { type: 'onward' }); command(table, players[1].id, { type: 'onward' }); // Cy is asleep
  assert.equal(table.phase, 'road');
  assert.equal(command(table, players[1].id, { type: 'push' }).ok, false, 'only the host');
  assert.ok(command(table, players[0].id, { type: 'push' }).ok);
  assert.equal(table.phase, 'board');
  assert.equal(command(table, players[0].id, { type: 'push' }).ok, false, 'nothing to wait for on the board');
});

function toVictory(table, players) {
  begin(table, players);
  let guard = 0;
  while (table.phase === 'battle' && guard++ < 16) {
    for (const e of table.battle.enemies) if (e.hp > 0) e.hp = 1;
    for (const p of players) {
      if (table.phase !== 'battle') break;
      const f = table.battle.fighters.find((x) => x.hero === p.hero);
      if (!f || f.hp <= 0 || f.locked) continue;
      if (!f.board) assert.equal(command(table, p.id, { type: 'roll' }).ok, true);
      f.mods = { ...(f.mods || {}), atk: 80, pierce: 0, block: 0, heal: 0, weaken: 0 };
      assert.equal(command(table, p.id, { type: 'lock', target: 0, straight: 'atk' }).ok, true);
    }
  }
  assert.equal(table.phase, 'victory', `stuck in ${table.phase}`);
}
function finishSpoils(table) {
  let guard = 0;
  while (table.phase === 'victory' && guard++ < 40) {
    const p = table.players.find((x) => x.hero.pendingPerks > 0);
    if (p) {
      const offer = playerView(table, p.id).perkOffer;
      assert.ok(command(table, p.id, { type: 'perk', id: offer[0] }).ok);
      continue;
    }
    const who = E.draftWho(table.rewards.draft);
    if (!who) break;
    const picker = table.players.find((x) => x.hero.name === who) || table.players[0];
    assert.ok(command(table, picker.id, { type: 'pass-loot' }).ok);
  }
}

test('victory copies battle stats, and camp waits until every phone has seen the brag board', () => {
  const { table, players } = make();
  toVictory(table, players);
  assert.equal(table.players.every((p) => p.seenBrag === false), true);
  const stats = table.rewards.stats;
  assert.ok(stats.Ada && stats.Bea);
  for (const name of ['Ada', 'Bea']) {
    const s = stats[name];
    for (const key of ['dealt', 'taken', 'healed', 'kills', 'blocked', 'shieldRounds', 'heldLine', 'potionsThrown', 'magicShared', 'revives']) {
      assert.equal(typeof s[key], 'number', `${name}.${key}`);
    }
    assert.equal(typeof s.bossKill, 'boolean');
  }
  assert.ok((stats.Ada.kills + stats.Bea.kills) >= 1);
  finishSpoils(table);
  assert.equal(table.phase, 'victory', 'camp waits for the brag board');
  assert.equal(command(table, players[0].id, { type: 'brag-seen' }).ok, true);
  assert.equal(table.phase, 'victory');
  assert.equal(command(table, players[1].id, { type: 'brag-seen' }).ok, true);
  assert.equal(table.phase, 'camp');
  const view = playerView(table, players[0].id);
  assert.equal(view.you.seenBrag, true);
});

test('the host push overrides a brag board that has not been seen', () => {
  const { table, players } = make();
  toVictory(table, players);
  assert.equal(table.phase, 'victory');
  assert.equal(command(table, players[1].id, { type: 'push' }).ok, false, 'only the host');
  assert.ok(command(table, players[0].id, { type: 'push' }).ok);
  assert.equal(table.phase, 'camp');
  assert.equal(table.players.every((p) => p.seenBrag), true);
});

test('a brought hero keeps their gear, and the table walks the host\'s road', () => {
  const table = createTable({ code: 'HERO', seed: 9, name: 'Road' });
  const ada = E.newHero({ name: 'Ada', cls: 'knight', seed: 1 });
  ada.level = 5; ada.gold = 80; ada.perks = ['iron'];
  ada.campaign.act = 2; ada.campaign.step = 3; ada.campaign.reached = { act: 2, step: 3 };
  const bea = E.newHero({ name: 'Bea', cls: 'bard', seed: 2 });
  bea.level = 2; bea.gold = 12;
  assert.equal(joinTable(table, { name: 'Ada', cls: 'knight', token: 'tok0aaaa', hero: ada }).ok, true);
  assert.equal(joinTable(table, { name: 'Bea', cls: 'bard', token: 'tok1bbbb', hero: bea }).ok, true);
  assert.equal(table.players[0].brought.level, 5);
  assert.equal(command(table, table.players[1].id, { type: 'ready' }).ok, true);
  assert.equal(command(table, table.hostId, { type: 'start' }).ok, true);
  assert.equal(table.phase, 'road');
  assert.equal(table.company.campaign.act, 2);
  assert.equal(table.company.campaign.step, 3);
  assert.equal(table.players[0].hero.level, 5);
  assert.equal(table.players[0].hero.gold, 80);
  assert.equal(table.players[0].hero.perks.includes('iron'), true);
  assert.equal(table.players[1].hero.level, 2);
  assert.equal(table.players[1].hero.gold, 12);
  assert.equal(table.players[0].hero.campaign, table.company.campaign);
  assert.equal(table.players[1].hero.campaign, table.company.campaign);
  assert.equal(table.players[0].brought, null);
  const seated = createTable({ code: 'SEE2', seed: 1, name: 'See' });
  joinTable(seated, { name: 'Cy', cls: 'ranger', token: 'tok2cccc', hero: ada });
  assert.equal(playerView(seated, seated.players[0].id).players[0].level, 5);
});

test('Act I tables refuse a hero who has already beaten a step', () => {
  const table = createTable({ code: 'ACT1', seed: 2, name: 'Gate' });
  assert.equal(joinTable(table, { name: 'Host', cls: 'knight', token: 'tok0aaaa' }).ok, true);
  const vet = E.newHero({ name: 'Vet', cls: 'bard', seed: 8 });
  vet.campaign.act = 1; vet.campaign.step = 4; vet.campaign.wins = 3; vet.campaign.reached = { act: 1, step: 4 };
  const join = joinTable(table, { name: 'Vet', cls: 'bard', token: 'tok1bbbb', hero: vet });
  assert.equal(join.ok, false);
  assert.match(join.error, /Act I is for a new hero/);
  const fresh = E.newHero({ name: 'Nia', cls: 'wizard', seed: 9 });
  assert.equal(joinTable(table, { name: 'Nia', cls: 'wizard', token: 'tok2cccc', hero: fresh }).ok, true);
  const hostVet = createTable({ code: 'HVET', seed: 3, name: 'No' });
  const mid = E.newHero({ name: 'Ada', cls: 'knight', seed: 1 });
  mid.campaign.act = 1; mid.campaign.step = 5; mid.campaign.wins = 4; mid.campaign.reached = { act: 1, step: 5 };
  const hostJoin = joinTable(hostVet, { name: 'Ada', cls: 'knight', token: 'tok3dddd', hero: mid });
  assert.equal(hostJoin.ok, false);
  assert.match(hostJoin.error, /Act I is for a new hero/);
});

test('a built-up hero may bring their save into an Act II table', () => {
  const table = createTable({ code: 'ACT2', seed: 4, name: 'Crypt' });
  const host = E.newHero({ name: 'Ada', cls: 'knight', seed: 1 });
  host.level = 6; host.campaign.act = 2; host.campaign.step = 1; host.campaign.reached = { act: 2, step: 4 }; host.campaign.wins = 13;
  const friend = E.newHero({ name: 'Bea', cls: 'bard', seed: 2 });
  friend.level = 5; friend.campaign.act = 2; friend.campaign.step = 2; friend.campaign.reached = { act: 2, step: 2 }; friend.campaign.wins = 11;
  assert.equal(joinTable(table, { name: 'Ada', cls: 'knight', token: 'tok0aaaa', hero: host }).ok, true);
  assert.equal(joinTable(table, { name: 'Bea', cls: 'bard', token: 'tok1bbbb', hero: friend }).ok, true);
  assert.equal(command(table, table.players[1].id, { type: 'ready' }).ok, true);
  assert.equal(command(table, table.hostId, { type: 'start' }).ok, true);
  assert.equal(table.company.campaign.act, 2);
});

test('a repeat clear pays that hero nothing; a first-clear friend still earns', () => {
  const { table, players } = make();
  begin(table, players);
  const c = table.company.campaign;
  const ada = table.company.members.find((m) => m.name === 'Ada');
  const bea = table.company.members.find((m) => m.name === 'Bea');
  ada.cleared = [SV.stepKey(c.act, c.step)];
  ada.gold = 50; bea.gold = 50;
  const adaXp = ada.xp; const adaLv = ada.level; const adaPerks = ada.pendingPerks;
  const beaXp = bea.xp;
  let guard = 0;
  while (table.phase === 'battle' && guard++ < 16) {
    for (const e of table.battle.enemies) if (e.hp > 0) e.hp = 1;
    for (const p of players) {
      if (table.phase !== 'battle') break;
      const f = table.battle.fighters.find((x) => x.hero === p.hero);
      if (!f || f.hp <= 0 || f.locked) continue;
      if (!f.board) assert.equal(command(table, p.id, { type: 'roll' }).ok, true);
      f.mods = { ...(f.mods || {}), atk: 80, pierce: 0, block: 0, heal: 0, weaken: 0 };
      assert.equal(command(table, p.id, { type: 'lock', target: 0, straight: 'atk' }).ok, true);
    }
  }
  assert.equal(table.phase, 'victory');
  assert.equal(table.rewards.repeat.Ada, true);
  assert.equal(table.rewards.repeat.Bea, false);
  assert.equal(table.rewards.gold.Ada, 0);
  assert.ok(table.rewards.gold.Bea > 0);
  assert.equal(ada.gold, 50);
  assert.equal(ada.xp, adaXp);
  assert.equal(ada.level, adaLv);
  assert.equal(ada.pendingPerks, adaPerks);
  assert.ok(bea.gold > 50);
  assert.ok(bea.xp > beaXp || bea.pendingPerks > 0 || bea.level > 1);
  assert.ok(table.rewards.drops.length > 0);
  assert.deepEqual(table.rewards.draft.order, ['Bea']);
  const view = playerView(table, players[0].id);
  assert.equal(view.victory.repeat.Ada, true);
});

test('when every hero is replaying, the table withholds XP, gold and spoils', () => {
  const { table, players } = make();
  begin(table, players);
  const c = table.company.campaign;
  const key = SV.stepKey(c.act, c.step);
  for (const m of table.company.members) {
    m.cleared = [key];
    m.gold = 40;
    m.xp = 0;
    m.pendingPerks = 0;
  }
  let guard = 0;
  while (table.phase === 'battle' && guard++ < 16) {
    for (const e of table.battle.enemies) if (e.hp > 0) e.hp = 1;
    for (const p of players) {
      if (table.phase !== 'battle') break;
      const f = table.battle.fighters.find((x) => x.hero === p.hero);
      if (!f || f.hp <= 0 || f.locked) continue;
      if (!f.board) assert.equal(command(table, p.id, { type: 'roll' }).ok, true);
      f.mods = { ...(f.mods || {}), atk: 80, pierce: 0, block: 0, heal: 0, weaken: 0 };
      assert.equal(command(table, p.id, { type: 'lock', target: 0, straight: 'atk' }).ok, true);
    }
  }
  assert.equal(table.phase, 'victory');
  assert.equal(table.rewards.repeat.Ada, true);
  assert.equal(table.rewards.repeat.Bea, true);
  assert.equal(table.rewards.gold.Ada, 0);
  assert.equal(table.rewards.gold.Bea, 0);
  assert.equal(table.rewards.drops.length, 0);
  assert.equal(table.rewards.draft.done, true);
  assert.equal(table.company.members[0].gold, 40);
  assert.equal(table.company.members[1].gold, 40);
  assert.equal(table.company.members[0].pendingPerks, 0);
});
