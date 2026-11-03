// mw1 (PROPOSED): Wizard magic cards live. Arc Bolt 2 magic per d8 with half arcing, Polymorph frogs the target, Storm Coil 4 per charge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cardsOf, makeRng, newHero, newBattle, startRoll, resolve, castPower, beginReset, questsFor, chargeGain, powerDice, powerCost, frogNeed } from '../js/engine.js';
const wiz = () => newHero({ name: 'W', cls: 'wizard', seed: 3, full: true });
const fight = (h = wiz()) => { const b = newBattle(h, questsFor(h)[0], makeRng(2), 1); startRoll(b); return b; };
test('Wizard starts with Arc Bolt, Polymorph and Storm Coil', () => { assert.deepEqual(cardsOf(wiz()).map((k) => k.id), ['arcbolt', 'polymorph', 'coil']); });
test('Arc Bolt: 2 magic per d8, up to 6d8, half arcs, every round', () => {
  const b = fight(); b.magic = 16; const k = cardsOf(b.hero)[0]; assert.equal(powerDice(k, 12), 6);
  const r = castPower(b, 'arcbolt', { x: 6 }); assert.equal(r.rolls.length, 3); assert.equal(r.die, 8); assert.equal(b.magic, 10); assert.equal(b.mods.splash, Math.floor(r.total / 2));
  assert.equal(castPower(b, 'arcbolt', { x: 2 }), null); beginReset(b); startRoll(b); assert.ok(castPower(b, 'arcbolt', { x: 2 }));
});
test('Frog Morph loads a pair for 3 magic, max 3 pairs; its Use rolls a d6 (test/polymorph.test.mjs has the odds)', () => {
  const k = cardsOf(wiz()).find((c) => c.id === 'polymorph'); assert.equal(k.kind, 'charge'); assert.equal(k.max, 3); assert.equal(k.cost, 3); assert.equal(k.costLv, undefined, 'no Level III discount');
  const b = fight(); b.magic = 9; assert.ok(castPower(b, 'polymorph')); assert.equal(b.magic, 6); assert.equal(b.charge.polymorph, 1); assert.equal(b.mods.frog || 0, 0, 'storing a charge frogs nothing');
});
test('Storm Coil releases 24 at 4 charges, half splashing', () => { const k = cardsOf(wiz()).find((c) => c.id === 'coil'); assert.equal(chargeGain(k, 4).atk, 24); assert.equal(k.splash, 'half'); });
