import test from 'node:test';
import assert from 'node:assert/strict';
import { createTable, joinTable, command, playerView } from '../js/table.js';

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
  assert.equal(command(table, players[0].id, { type: 'start' }).ok, false);
  assert.equal(command(table, players[0].id, { type: 'ready' }).ok, true);
  assert.equal(command(table, players[0].id, { type: 'start' }).ok, true);
  assert.equal(table.phase, 'road');

  const { table: t2, players: ps } = make();
  command(t2, ps[0].id, { type: 'ready' });
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
