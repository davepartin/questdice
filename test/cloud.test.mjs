// An online room saves the table as text after every move and loads it back on the next.
// Play the same company twice, once in memory and once through save/load, and check every phone sees the same game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTable, joinTable, command, playerView, saveTable, loadTable, playerByToken } from '../js/table.js';
import { pack, unpack } from '../js/pack.js';
import * as E from '../js/engine.js';

Date.now = () => 1791000000000; // heroes stamp when they were made

function seat(names) {
  const table = createTable({ code: 'CLOU', seed: 777, name: 'Cloud Company' });
  for (const [i, [name, cls]] of names.entries()) assert.equal(joinTable(table, { name, cls, token: `uid${i}` }).ok, true);
  return table;
}

// A simple bot: the next sensible move for anyone at the table.
function nextMove(table) {
  const ps = table.players;
  const v = (p) => playerView(table, p.id);
  const host = ps[0];
  switch (table.phase) {
    case 'lobby': {
      const p = ps.find((x) => !x.ready);
      return p ? [p, { type: 'ready' }] : [host, { type: 'start' }];
    }
    case 'road': {
      const road = v(host).road;
      if (!road.done) return [ps[ps.length - 1], { type: 'choose', id: road.choices[0].id }];
      return [ps.find((x) => !x.ready), { type: 'onward' }];
    }
    case 'board': return [host, { type: 'quest', id: v(host).board.quests[0].id }];
    case 'battle': {
      for (const p of ps) {
        const me = v(p).battle.me;
        if (!me) continue;
        if (me.stage === 'reset') return [p, { type: 'roll' }];
        if (me.stage === 'shape') return [p, { type: 'lock', target: 0, straight: 'atk' }];
      }
      throw new Error('Nobody can move in battle.');
    }
    case 'victory': {
      const p = ps.find((x) => x.hero.pendingPerks > 0);
      if (p) return [p, { type: 'perk', id: v(p).perkOffer[0] }];
      const who = E.draftWho(table.rewards.draft);
      const picker = ps.find((x) => x.hero.name === who);
      return [picker || host, { type: 'pass-loot' }];
    }
    case 'camp': {
      const p = ps.find((x) => x.hero.pendingPerks > 0);
      if (p) return [p, { type: 'perk', id: v(p).perkOffer[0] }];
      return [ps.find((x) => !x.ready), { type: 'ready' }];
    }
    case 'defeat': return [host, { type: 'rest' }];
    default: throw new Error(`Unknown phase ${table.phase}`);
  }
}

test('pack keeps shared objects shared and drops functions', () => {
  const hero = { name: 'Ada', hp: 10 };
  const root = { a: hero, list: [hero, { f: () => 1, x: 2 }], self: null, arr: [1, 2] };
  root.self = root; root.again = root.arr;
  const back = unpack(pack(root));
  assert.equal(back.a, back.list[0]);
  assert.equal(back.self, back);
  assert.equal(back.again, back.arr);
  assert.deepEqual(back.list[1], { x: 2 });
  back.a.hp = 3;
  assert.equal(back.list[0].hp, 3);
});

test('a company plays the same through the cloud as in memory', () => {
  const names = [['Ada', 'knight'], ['Bea', 'bard'], ['Cy', 'ranger']];
  const mem = seat(names);
  let text = saveTable(seat(names));
  const phases = new Set();
  let battles = 0;
  for (let step = 0; step < 900; step++) {
    const [p, cmd] = nextMove(mem);
    const a = command(mem, p.id, cmd);
    const cloud = loadTable(text);
    const q = playerByToken(cloud, p.token);
    const b = command(cloud, q.id, cmd);
    assert.deepEqual(b, a, `step ${step} ${cmd.type}`);
    assert.equal(a.ok, true, `step ${step} ${cmd.type}: ${a.error}`);
    text = saveTable(cloud);
    // The hero in the seat is still the hero in the company and the battle.
    const again = loadTable(text);
    for (const [i, pl] of again.players.entries()) {
      if (again.company) assert.equal(pl.hero, again.company.members[i]);
      if (again.battle) assert.equal(again.battle.fighters[i]?.hero, pl.hero);
    }
    for (const pl of mem.players) assert.deepEqual(playerView(again, pl.id), playerView(mem, pl.id), `view after step ${step}`);
    if (mem.phase === 'battle' && !phases.has(`b${battles}`)) phases.add(`b${battles}`);
    if (cmd.type === 'quest') battles++;
    phases.add(mem.phase);
  }
  assert.ok(battles >= 3, `played ${battles} battles`);
  for (const ph of ['road', 'board', 'battle', 'camp']) assert.ok(phases.has(ph), `reached ${ph}`);
  assert.ok(phases.has('victory') || phases.has('defeat'));
  assert.ok(text.length < 900000, `table is ${text.length} characters`);
});
