// Teamwork pass (TEAMWORK in js/data.js; docs/ideas/TEAMWORK_IMPLEMENTATION_HANDOFF_2026-10-22.md). Off in the live game: this file
// checks that, then switches it on (each test file runs in its own process).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { TEAMWORK, HEART_TO_HEART } from '../js/data.js';

const CLS = ['knight', 'ranger', 'wizard', 'dwarf', 'bard', 'knight'];
// a table of n heroes against `foes`; hearts[i] is hero i's heart, targets[i] the monster it aims at; every other die shows 1
function table(n, foes, hearts, targets, { downed = [] } = {}) {
  const heroes = Array.from({ length: n }, (_, i) => E.newHero({ name: `H${i}`, cls: CLS[i], seed: 10 + i }));
  const b = E.newPartyBattle(heroes, { enemies: foes, hpMult: 6, flat: 0, rewardMult: 1, kind: 'battle' }, E.makeRng(3));
  for (const i of downed) b.fighters[i].hp = 0;
  for (let i = 0; i < n; i++) {
    if (b.fighters[i].hp <= 0) continue;
    E.startFighter(b, i); const f = b.fighters[i];
    b.board = Object.fromEntries(['NW', 'NE', 'N', 'W', 'C', 'E', 'S', 'SW', 'SE', 'P'].map((k) => [k, { v: k === 'C' ? hearts[i] : k === 'S' ? 1 + i : 1, bound: false }]));
    E.commitFighter(b); f.target = targets[i];
  }
  for (const e of b.enemies) { e.intent = { n: 'Wait', v: 'guard', f: 0, m: 0 }; e.windup = false; }
  const atk0 = b.fighters.map((f) => f.magic);
  E.resolveParty(b);
  return { b, rep: b.report, bonus: b.fighters.map((f) => f._heart2heart || 0), magic: b.fighters.map((f, i) => f.magic - atk0[i]) };
}

test('off by default: Heartbeat as before, no Heart to Heart', () => {
  assert.equal(TEAMWORK.heartToHeart, false);
  const { rep } = table(2, ['ogre'], [3, 3], [0, 0]);
  assert.ok(rep.heartbeat, 'old Heartbeat still fires in the live game'); assert.deepEqual(rep.hearts, []);
});

test('Heart to Heart: same heart, same monster: +10 attack each, once; no Heartbeat magic', () => {
  TEAMWORK.heartToHeart = true;
  const two = table(2, ['ogre'], [3, 3], [0, 0]);
  assert.deepEqual(two.bonus, [HEART_TO_HEART, HEART_TO_HEART]); assert.equal(two.rep.hearts.length, 1); assert.equal(two.rep.hearts[0].total, 20);
  assert.equal(two.rep.heartbeat, null, 'no Heartbeat'); assert.equal(HEART_TO_HEART, 10);
  const three = table(3, ['ogre'], [5, 5, 5], [0, 0, 0]); assert.deepEqual(three.bonus, [10, 10, 10], 'three heroes: 30 in all, never per pair');
  const six = table(6, ['ogre'], [2, 2, 2, 2, 2, 2], [0, 0, 0, 0, 0, 0]); assert.deepEqual(six.bonus, [10, 10, 10, 10, 10, 10]); assert.equal(six.rep.hearts[0].total, 60);
});

test('Heart to Heart: groups by monster (not by kind) and by number; mismatches and the lone hero get nothing', () => {
  TEAMWORK.heartToHeart = true;
  const split = table(4, ['goblin', 'goblin'], [4, 4, 4, 4], [0, 0, 1, 1]);
  assert.deepEqual(split.bonus, [10, 10, 10, 10], 'two groups, one on each goblin'); assert.equal(split.rep.hearts.length, 2);
  assert.notEqual(split.rep.hearts[0].uid, split.rep.hearts[1].uid, 'two goblins of the same kind are two monsters');
  const apart = table(2, ['goblin', 'goblin'], [4, 4], [0, 1]); assert.deepEqual(apart.bonus, [0, 0], 'same heart, different monsters: nothing');
  const twoNums = table(4, ['ogre'], [2, 2, 6, 6], [0, 0, 0, 0]); assert.deepEqual(twoNums.bonus, [10, 10, 10, 10], 'two numbers on one monster: two groups');
  const odd = table(3, ['ogre'], [2, 2, 5], [0, 0, 0]); assert.deepEqual(odd.bonus, [10, 10, 0], 'the hero with a different heart is left out');
});

test('Heart to Heart: a downed hero does not count; the bonus is ordinary attack (the monster\'s guard still applies)', () => {
  TEAMWORK.heartToHeart = true;
  const down = table(3, ['ogre'], [3, 3, 3], [0, 0, 0], { downed: [2] }); assert.deepEqual(down.bonus, [10, 10, 0]);
  const alone = table(3, ['ogre'], [3, 3, 3], [0, 0, 0], { downed: [1, 2] }); assert.deepEqual(alone.bonus, [0, 0, 0], 'one hero left standing: no group');
  // the same round with and without the rule: the ogre loses exactly the extra 20 (its guard was already used up by the dice)
  const hit = (on) => { TEAMWORK.heartToHeart = on; const { b } = table(2, ['ogre'], [3, 3], [0, 0]); return b.enemies[0].maxHp - b.enemies[0].hp; };
  const without = hit(false); const withIt = hit(true);
  assert.ok(withIt - without > 0 && withIt - without <= 20, `the bonus lands as attack, through guard (${without} -> ${withIt})`);
});

// At an online table: friends see a hero's heart face and the monster it is looking at, nothing else of its board; the aim is only a
// preview (lock decides), and both clear when the next round begins.
import { createTable, joinTable, command, playerView } from '../js/table.js';
test('online: the public preview is the heart face and the aim; the board stays private; it resets each round', () => {
  TEAMWORK.heartToHeart = true;
  const table = createTable({ code: 'HEART', seed: 777, name: 'Two Phones' }); table.envelopes = 'off';
  const [ada, bea] = [['Ada', 'knight'], ['Bea', 'bard']].map(([name, cls], i) => joinTable(table, { name, cls, token: `tok${i}hhhh` }).player);
  for (const p of [ada, bea]) assert.ok(command(table, p.id, { type: 'ready', name: p.name, cls: p.cls }).ok);
  assert.ok(command(table, ada.id, { type: 'start' }).ok);
  const road = playerView(table, ada.id).road; assert.ok(command(table, bea.id, { type: 'choose', id: road.choices[0].id }).ok);
  for (const p of [ada, bea]) assert.ok(command(table, p.id, { type: 'onward' }).ok);
  assert.ok(command(table, ada.id, { type: 'quest', id: playerView(table, ada.id).board.quests[0].id }).ok); assert.equal(table.phase, 'battle');
  for (const e of table.battle.enemies) { e.hp = 999; e.maxHp = 999; } for (const f of table.battle.fighters) { f.hp = 999; f.maxHp = 999; }
  const adaRow = () => playerView(table, bea.id).battle.roster.find((r) => r.name === 'Ada');
  assert.equal(adaRow().heart, null, 'nothing before the roll');
  assert.ok(command(table, ada.id, { type: 'roll' }).ok);
  const heart = table.battle.fighters[0].board.C.v;
  assert.equal(adaRow().heart, heart, 'Bea sees Ada\'s heart face'); assert.equal(adaRow().aim, null);
  assert.ok(command(table, ada.id, { type: 'aim', target: 0 }).ok); assert.equal(adaRow().aim, 0, 'and where Ada is looking');
  assert.equal(JSON.stringify(playerView(table, bea.id)).includes(JSON.stringify(table.battle.fighters[0].board)), false, 'not the rest of the board');
  assert.ok(command(table, ada.id, { type: 'lock', target: 0, straight: 'atk' }).ok); assert.equal(adaRow().aim, 0); assert.equal(adaRow().status, 'locked');
  assert.ok(command(table, ada.id, { type: 'aim', target: 0 }).ok, 'an aim after lock-in is ignored, not an error');
  assert.ok(command(table, bea.id, { type: 'roll' }).ok); assert.ok(command(table, bea.id, { type: 'lock', target: 0, straight: 'atk' }).ok);
  assert.ok(table.lastReport, 'the round resolved');
  assert.equal(adaRow().heart, null, 'a new round: no stale heart'); assert.equal(adaRow().aim, null, 'and no stale aim');
});
