// Pressure (PRESSURE in js/data.js): from round 5 the monsters grow furious, and a swarm calls one more every few rounds while it stands.
// Each test file runs in its own process, so switching it on here never touches the other files.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { PRESSURE } from '../js/data.js';

const hero = (act = 2) => { const h = E.newHero({ name: 'P', cls: 'knight', seed: 4 }); h.campaign.act = act; return h; };
const quest = (enemies, kind = 'battle') => ({ enemies, hpMult: 1, flat: 0, rewardMult: 1, kind });
const toRound = (b, r) => { while (b.round < r) E.beginReset(b); };

test('off by default: no fury, no reinforcements', () => {
  assert.equal(PRESSURE.on, false);
  const b = E.newBattle(hero(), quest(['goblin', 'goblin', 'goblin']), E.makeRng(1), 1); toRound(b, 9);
  assert.equal(E.furyOf(b), 0); assert.equal(b.enemies.length, 3); assert.ok(b.enemies.every((e) => !e.fury));
});

test('fury: from round 5, each round adds the act\'s step to every blow, capped', () => {
  E.PRESSURE_ON();
  const b = E.newBattle(hero(2), quest(['ogre']), E.makeRng(2), 1);
  const at = (r) => { toRound(b, r); return E.furyOf(b); };
  assert.deepEqual([at(1), at(4), at(5), at(6), at(8)], [0, 0, 2, 4, 8], 'Act II: +2 a step');
  toRound(b, 30); assert.equal(E.furyOf(b), PRESSURE.fury.max * PRESSURE.fury.per[1], 'capped');
  const e = b.enemies[0]; assert.equal(e.fury, E.furyOf(b));
  if (e.intent && ['strike', 'pierce', 'slam', 'charge', 'breath'].includes(e.intent.v) && e.intent.m) {
    const r = E.intentRange(e); assert.ok(r[0] >= e.fury, 'the card shows the furious number');
  }
  const b1 = E.newBattle(hero(1), quest(['ogre']), E.makeRng(2), 1); toRound(b1, 6); assert.equal(E.furyOf(b1), 2, 'Act I: +1 a step');
});

test('rally: a swarm calls one more every third round while two still stand; a thinned swarm, a pair or a boss fight does not', () => {
  E.PRESSURE_ON();
  const b = E.newBattle(hero(), quest(['goblin', 'goblin', 'goblin']), E.makeRng(3), 1);
  assert.ok(E.isSwarm(b));
  toRound(b, 3); assert.equal(b.enemies.length, 3, 'not yet');
  toRound(b, 4); assert.equal(b.enemies.length, 4, 'round 4: one more'); assert.equal(b.pressure.rallied.length, 1);
  const extra = b.enemies[3]; assert.equal(extra.id, 'goblin'); assert.equal(extra.rewardMult, 0, 'reinforcements carry no reward');
  for (const e of b.enemies.slice(0, 3)) e.hp = 0; // thinned to one
  toRound(b, 7); assert.equal(b.enemies.filter((e) => e.hp > 0).length, 1, 'one alone does not call');
  const pair = E.newBattle(hero(), quest(['goblin', 'goblin']), E.makeRng(4), 1); toRound(pair, 7); assert.equal(pair.enemies.length, 2, 'two is not a swarm');
  const big = E.newBattle(hero(), quest(['ogre', 'goblin', 'goblin']), E.makeRng(5), 1); toRound(big, 7); assert.equal(big.enemies.length, 3, 'a big monster is not a swarm');
  const boss = E.newBattle(hero(), quest(['goblin', 'goblin', 'goblin'], 'boss'), E.makeRng(6), 1); toRound(boss, 7); assert.equal(boss.enemies.length, 3, 'never in a boss fight');
});
