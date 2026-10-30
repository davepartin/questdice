// mw1 (PROPOSED): Wizard magic cards live. Arc Bolt 2 magic per d8 with half arcing, Polymorph frogs the target, Storm Coil 4 per charge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cardsOf, makeRng, newHero, newBattle, startRoll, resolve, castPower, beginReset, questsFor, chargeGain, powerDice, powerCost } from '../js/engine.js';
const wiz = () => newHero({ name: 'W', cls: 'wizard', seed: 3, full: true });
const fight = (h = wiz()) => { const b = newBattle(h, questsFor(h)[0], makeRng(2), 1); startRoll(b); return b; };
test('Wizard starts with Arc Bolt, Polymorph and Storm Coil', () => { assert.deepEqual(cardsOf(wiz()).map((k) => k.id), ['arcbolt', 'polymorph', 'coil']); });
test('Arc Bolt: 2 magic per d8, up to 6d8, half arcs, every round', () => {
  const b = fight(); b.magic = 16; const k = cardsOf(b.hero)[0]; assert.equal(powerDice(k, 12), 6);
  const r = castPower(b, 'arcbolt', { x: 6 }); assert.equal(r.rolls.length, 3); assert.equal(r.die, 8); assert.equal(b.magic, 10); assert.equal(b.mods.splash, Math.floor(r.total / 2));
  assert.equal(castPower(b, 'arcbolt', { x: 2 }), null); beginReset(b); startRoll(b); assert.ok(castPower(b, 'arcbolt', { x: 2 }));
});
test('Polymorph: 3 magic once a round, the target cannot attack; Level II +4 pierce; Level III costs 2', () => {
  const b = fight(); b.magic = 9; assert.ok(castPower(b, 'polymorph')); assert.equal(b.magic, 6); assert.equal(castPower(b, 'polymorph'), null);
  for (const e of b.enemies) e.hp = 999; const rep = resolve(b, { target: 0 });
  assert.equal(rep.frog, b.enemies[0].uid); assert.ok(!rep.acts.some((a) => a.uid === b.enemies[0].uid && !a.frog));
  const h = wiz(); const k = cardsOf(h).find((c) => c.id === 'polymorph'); assert.deepEqual([0, 1, 2].map((l) => powerCost(k, null, l)), [3, 3, 2]);
  h.powerLevel = { polymorph: 1 }; const b2 = fight(h); b2.magic = 9; castPower(b2, 'polymorph'); assert.equal(b2.mods.pierce, 4);
  h.powerLevel = { polymorph: 2 }; const b3 = fight(h); b3.magic = 9; castPower(b3, 'polymorph'); assert.equal(b3.magic, 7);
});
test('Storm Coil releases 24 at 4 charges, half splashing', () => { const k = cardsOf(wiz()).find((c) => c.id === 'coil'); assert.equal(chargeGain(k, 4).atk, 24); assert.equal(k.splash, 'half'); });
