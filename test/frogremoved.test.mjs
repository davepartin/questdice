// Frog Morph left the game (Dave, 6 Nov 2026: "Remove the frog card from the game").
import test from 'node:test'; import assert from 'node:assert/strict';
import { applyRelease } from '../js/release.js'; import * as E from '../js/engine.js'; import * as D from '../js/data.js'; import { migrateNoFrog } from '../js/save.js';
applyRelease();
test('no class has Frog Morph; the Wizard starts with Magic Missile in its middle slot', () => {
  for (const c of Object.values(D.CLASSES)) assert.ok(!c.cards.some((k) => k.id === 'polymorph' || k.fx?.frog), 'no frog card');
  const w = E.newHero({ name: 'W', cls: 'wizard', seed: 1 }); assert.deepEqual(E.cardsOf(w).map((k) => k.id), ['arcbolt', 'bolt', 'coil']);
});
test('an old Wizard with Frog Morph equipped and ranked gets Magic Missile and the rank gold back, once', () => {
  const w = E.newHero({ name: 'Old', cls: 'wizard', seed: 1 }); w.gold = 10; w.powers = { B: 'polymorph' }; w.learned = ['polymorph']; w.powerLevel = { polymorph: 1 };
  assert.equal(migrateNoFrog(w), D.POWER_UPGRADE[0]); assert.equal(w.gold, 10 + D.POWER_UPGRADE[0]);
  assert.equal(w.powerLevel.polymorph, undefined); assert.ok(!w.learned.includes('polymorph')); assert.equal(E.cardsOf(w)[1].id, 'bolt');
  assert.equal(migrateNoFrog(w), 0, 'only once'); assert.equal(w.gold, 10 + D.POWER_UPGRADE[0]);
  const old = E.newHero({ name: 'Old2', cls: 'wizard', seed: 1 }); old.gold = 0; old.powerLevel = { polymorph: 3 }; old.frogMorphRefundGold = D.POWER_UPGRADE[1] + D.POWER_UPGRADE[2];
  assert.equal(migrateNoFrog(old), D.POWER_UPGRADE[0], 'gold already returned for ranks II and III is not paid twice');
});
