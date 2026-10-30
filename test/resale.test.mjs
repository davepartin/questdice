// The live resale rule (WEAPON_TRAINING): no buy / grow / sell loop pays at any store price from half of worth up, and growing a size never pays at any price.
// At the store's floor price (0.4 of worth, which nothing in the game sets) a bought weapon sells back for more: pinned here so a future discount cannot slip in unseen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loops } from '../tools/t17-resale.mjs';

test('no loop pays at a store price of half the worth or more; growing never pays at any price', () => {
  const rows = loops();
  assert.ok(rows.length > 1500);
  assert.ok(rows.filter((r) => r.mod >= 0.5).every((r) => r.net <= 0), 'a bought weapon sold back, grown or not, never returns more than it cost');
  assert.ok(rows.filter((r) => r.grow > 0).every((r) => r.net <= 0));
});

test('the 0.4 floor is a latent loop (a discount the game does not have): a weapon bought at 0.4 of worth sells back for more', () => {
  const rows = loops([0.4]); assert.ok(rows.some((r) => r.grow === 0 && r.net > 0), 'if this fails the rule was fixed: change this test to assert no loop pays');
});
