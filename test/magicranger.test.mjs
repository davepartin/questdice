// mr1 (Dave t434/t435, PROPOSED): Ranger magic cards live. Hunter's Mark one-shot, Aimed Shot every round, Volley 3/8/15/24.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cardsOf, makeRng, newHero, newBattle, startRoll, resolve, castPower, beginReset, questsFor, chargeGain } from '../js/engine.js';
const ranger = () => newHero({ name: 'R', cls: 'ranger', seed: 3, full: true });
test('Ranger starts with Aimed Shot, Hunter\'s Mark and Volley', () => {
  assert.deepEqual(cardsOf(ranger()).map((k) => k.id), ['aimed', 'mark', 'volley']);
});
test('Hunter\'s Mark: 2 magic, +3 pierce, every round; +6 gold only if the target falls', () => {
  const h = ranger(); const b = newBattle(h, questsFor(h)[0], makeRng(2), 1); startRoll(b); b.magic = 6;
  assert.ok(castPower(b, 'mark')); assert.equal(b.magic, 4); assert.equal(b.mods.pierce, 3); assert.equal(b.markGold, 6);
  assert.equal(castPower(b, 'mark'), null);
  b.enemies[0].hp = 1; const rep = resolve(b, { target: 0 });
  assert.equal((rep.report || rep).markGold ?? b.report?.markGold ?? b.lastReport?.markGold, 6); assert.equal(b.markGold, 0);
  const h2 = ranger(); const b2 = newBattle(h2, questsFor(h2)[0], makeRng(2), 1); startRoll(b2); b2.magic = 6; castPower(b2, 'mark');
  b2.enemies[0].hp = 999; const rep2 = resolve(b2, { target: 0 }); assert.ok(!(rep2.report || rep2).markGold); assert.equal(b2.markGold, 0);
});
test('Aimed Shot rolls every round, 1 magic per d6 up to 4', () => {
  const h = ranger(); const b = newBattle(h, questsFor(h)[0], makeRng(2), 1); startRoll(b); b.magic = 9;
  const r = castPower(b, 'aimed', { x: 4 }); assert.equal(r.rolls.length, 4); assert.equal(b.magic, 5); assert.equal(b.mods.pierce, r.total);
  assert.equal(castPower(b, 'aimed', { x: 1 }), null); beginReset(b); startRoll(b); assert.ok(castPower(b, 'aimed', { x: 1 }));
});
test('Volley releases 3/8/15/24', () => {
  const k = cardsOf(ranger()).find((c) => c.id === 'volley');
  assert.deepEqual([1, 2, 3, 4].map((n) => chargeGain(k, n).pierce), [3, 8, 15, 24]);
});
