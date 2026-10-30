// mw2: a BUILD release and a DICE roll add to the attack, block and pierce already on the board; they never overwrite it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cardsOf, makeRng, newHero, newBattle, startRoll, castPower, chargeGain } from '../js/engine.js';
import { questsFor } from '../js/engine.js';
const battle = (cls) => { const h = newHero({ name: 'S', cls, seed: 3, full: true }); const b = newBattle(h, questsFor(h)[0], makeRng(2), 1); startRoll(b); return b; };
const seed = (b) => { b.mods.atk = 15; b.mods.block = 5; b.mods.pierce = 3; b.mods.splash = 7; };
for (const [cls, id] of [['ranger', 'volley'], ['knight', 'rally'], ['wizard', 'coil']]) {
  test(`${id} release adds to existing attack, block and pierce`, () => {
    const b = battle(cls); const k = cardsOf(b.hero).find((c) => c.id === id); assert.ok(k, id);
    b.charge = { [id]: 2 }; seed(b); const g = chargeGain(k, 2, 0);
    assert.ok(castPower(b, id, { release: true }));
    assert.equal(b.mods.atk, 15 + (g.atk || 0)); assert.equal(b.mods.block, 5 + (g.block || 0)); assert.equal(b.mods.pierce, 3 + (g.pierce || 0));
    if (k.splash === 'half') assert.equal(b.mods.splash, 7 + Math.floor((g.atk || 0) / 2));
  });
}
for (const [cls, id] of [['ranger', 'aimed'], ['knight', 'cleave'], ['wizard', 'arcbolt']]) {
  test(`${id} roll adds to existing attack, block and pierce`, () => {
    const b = battle(cls); const k = cardsOf(b.hero).find((c) => c.id === id); assert.ok(k, id);
    b.magic = 20; seed(b); const r = castPower(b, id, { x: k.cost || 2 }); assert.ok(r);
    const to = k.dice.to; const base = { atk: 15, block: 5, pierce: 3 };
    for (const key of ['atk', 'block', 'pierce']) assert.equal(b.mods[key], base[key] + (key === to ? r.total : 0), key);
  });
}
test('Arc Bolt then Storm Coil release stacks (15 + 8 = 23)', () => {
  const b = battle('wizard'); b.magic = 20; b.mods.atk = 15; b.charge = { coil: 2 };
  castPower(b, 'coil', { release: true }); assert.equal(b.mods.atk, 15 + chargeGain(cardsOf(b.hero).find((c) => c.id === 'coil'), 2, 0).atk);
});
