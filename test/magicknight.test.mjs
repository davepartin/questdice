// mk1 (PROPOSED): Knight magic cards live. Cleave buys dice every round, Riposte hits back with leftover block, Rally Cry block 2 per charge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cardsOf, makeRng, newHero, newBattle, startRoll, resolve, castPower, beginReset, questsFor, chargeGain, powerDice } from '../js/engine.js';
const knight = () => newHero({ name: 'K', cls: 'knight', seed: 3, full: true });
const fight = () => { const h = knight(); const b = newBattle(h, questsFor(h)[0], makeRng(2), 1); startRoll(b); return b; };
test('Knight starts with Cleave, Riposte and Rally Cry', () => { assert.deepEqual(cardsOf(knight()).map((k) => k.id), ['cleave', 'riposte', 'rally']); });
test('Cleave: 2 magic = 2d6, each extra magic a d6, up to 4d6, half splashes, every round', () => {
  const b = fight(); b.magic = 9; const k = cardsOf(b.hero)[0];
  assert.equal(powerDice(k, 2), 2); assert.equal(powerDice(k, 4), 4); assert.equal(powerDice(k, 9), 4);
  const r = castPower(b, 'cleave', { x: 4 }); assert.equal(r.rolls.length, 4); assert.equal(b.magic, 5); assert.equal(b.mods.atk, r.total); assert.equal(b.mods.splash, Math.floor(r.total / 2));
  assert.equal(castPower(b, 'cleave', { x: 2 }), null); beginReset(b); startRoll(b); assert.ok(castPower(b, 'cleave', { x: 2 }));
});
test('Riposte: 2 magic, +4 block, once a round; unused block hits back', () => {
  const b = fight(); b.magic = 6; assert.ok(castPower(b, 'riposte')); assert.equal(b.magic, 4); assert.equal(b.mods.block, 4); assert.equal(castPower(b, 'riposte'), null);
  b.mods.block += 200; b.enemies[0].hp = 900; b.enemies[0].maxHp = 900; const hp0 = 900;
  const rep = resolve(b, { target: 0 }); const R = (rep.report || rep).riposte;
  assert.ok(R && R.n > 100, JSON.stringify(R)); assert.ok(b.enemies[0].hp <= hp0 - R.n); assert.equal(b.riposte, false);
  const b2 = fight(); b2.mods.block += 200; b2.enemies[0].hp = 900; const r2 = resolve(b2, { target: 0 }); assert.ok(!(r2.report || r2).riposte); // no Riposte, no hit back
});
test('Rally Cry releases 20 attack + 16 block at 4 charges', () => {
  const k = cardsOf(knight()).find((c) => c.id === 'rally'); assert.deepEqual(chargeGain(k, 4), { atk: 20, block: 16 });
});
