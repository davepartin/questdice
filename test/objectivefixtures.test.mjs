// Objective audit fixtures (Director, 25 Oct 2026): the exact conditions of Lone Wolf and Glass Shield, so a structurally impossible deal and a merely unlikely one are told apart.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS } from '../js/secrets.js';
const row = (name, r, target, blk = 1) => ({ name, r, target, blk });
const ctx = (me, others) => ({ me: me.rows, rows: { [me.name]: me.rows, ...Object.fromEntries(others.map((o) => [o.name, o.rows])) }, others: others.map((o) => o.name) });
const hero = (name, rows) => ({ name, rows });

test('Lone Wolf: passes with different targets, fails on a shared target in the same round, ignores rounds the teammate did not act or the hero did not strike', () => {
  const check = CARDS.lonewolf.check;
  assert.equal(check(ctx(hero('A', [row('A', 1, 'g1'), row('A', 2, 'g1')]), [hero('B', [row('B', 1, 'g2'), row('B', 2, 'g2')])])), true, 'different monsters every round');
  assert.equal(check(ctx(hero('A', [row('A', 1, 'g1')]), [hero('B', [row('B', 1, 'g1')])])), false, 'the same monster in the same round');
  assert.equal(check(ctx(hero('A', [row('A', 1, 'g1'), row('A', 2, 'g1')]), [hero('B', [row('B', 1, 'g2')])])), true, 'the teammate fell after round 1: round 2 has no row to share with');
  assert.equal(check(ctx(hero('A', [row('A', 1, null)]), [hero('B', [row('B', 1, null)])])), true, 'no target for either (skipped or fallen) is not a shared target');
  assert.equal(check(ctx(hero('A', [row('A', 1, 'g1')]), [hero('B', [row('B', 2, 'g1')])])), true, 'the same monster in DIFFERENT rounds does not count');
});

test('Lone Wolf is impossible by construction whenever one monster is left and two heroes strike it, so a deal needs more than one monster living for every round both strike', () => {
  const check = CARDS.lonewolf.check;
  // with a single monster in the fight (one uid), every possible pair of rows for a round shares it, whatever either hero chooses
  for (const rounds of [1, 2, 4]) { const a = Array.from({ length: rounds }, (_, i) => row('A', i + 1, 'only')); const b = Array.from({ length: rounds }, (_, i) => row('B', i + 1, 'only')); assert.equal(check(ctx(hero('A', a), [hero('B', b)])), false, `${rounds} rounds, one monster`); }
});

test('Glass Shield counts rounds with zero total block; one round is not enough and a round with any block does not count', () => {
  const check = CARDS.glass.check;
  assert.equal(check({ me: [row('A', 1, 'g', 0), row('A', 2, 'g', 0)] }), true);
  assert.equal(check({ me: [row('A', 1, 'g', 0), row('A', 2, 'g', 1)] }), false, 'one zero-block round only');
  assert.equal(check({ me: [row('A', 1, 'g', 2), row('A', 2, 'g', 3), row('A', 3, 'g', 1)] }), false, 'owning a shield that rolls block every round fails');
  assert.equal(check({ me: [] }), false, 'no rounds, no card');
});
