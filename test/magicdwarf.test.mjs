// md1 (PROPOSED): Dwarf magic cards live. Anvil Strike blue d8 block dice (8s give 3 gold), Grudge hits back for damage past block, Stonehide store/release.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cardsOf, makeRng, newHero, newBattle, startRoll, resolve, castPower, beginReset, questsFor, chargeGain, powerDice, scaleMax } from '../js/engine.js';
import { upgradeLine, shortLine, effectLine } from '../js/g3/powers.js';
const dw = () => newHero({ name: 'D', cls: 'dwarf', seed: 3, full: true });
const fight = (h = dw()) => { const b = newBattle(h, questsFor(h)[0], makeRng(2), 1); startRoll(b); return b; };
test('Dwarf starts with Anvil Strike, Grudge and Stonehide', () => { assert.deepEqual(cardsOf(dw()).map((k) => k.id), ['anvil', 'grudge', 'stonehide']); });
test('Anvil Strike: 1 magic per blue d8 of block, up to 6d8, every round; 1d8/2d8/3d8 for 1 magic by level', () => {
  const k = cardsOf(dw())[0]; assert.equal(k.dice.to, 'block'); assert.equal(k.dice.s, 8);
  assert.deepEqual([0, 1, 2].map((l) => powerDice(k, 1, l)), [1, 2, 3]); assert.equal(powerDice(k, scaleMax(k, 0), 0), 6);
  const b = fight(); b.magic = 10; const r = castPower(b, 'anvil', { x: 3 }); assert.equal(r.rolls.length, 3); assert.equal(b.magic, 7); assert.equal(b.mods.block, r.total);
  assert.equal(castPower(b, 'anvil', { x: 1 }), null); beginReset(b); startRoll(b); assert.ok(castPower(b, 'anvil', { x: 1 }));
});
test('Anvil Strike: every 8 rolled gives 3 gold', () => {
  let seen = 0; for (let s = 1; s < 60 && seen < 3; s++) { const h = dw(); const b = newBattle(h, questsFor(h)[0], makeRng(s), 1); startRoll(b); b.magic = 10; const g0 = b.goldEarned || 0;
    const r = castPower(b, 'anvil', { x: 6 }); const eights = r.rolls.filter((v) => v === 8).length; assert.equal((b.goldEarned || 0) - g0, eights * 3); assert.equal(r.gold || 0, eights * 3); if (eights) seen++; }
  assert.ok(seen > 0, 'some seed rolled an 8');
});
test('Grudge: 2 magic every round, attack = damage that got past your block last round (+3/+6 by level)', () => {
  const b = fight(); b.magic = 10; assert.equal(castPower(b, 'grudge').total, 0); assert.equal(b.magic, 8); assert.equal(castPower(b, 'grudge'), null);
  for (const e of b.enemies) e.hp = 999; const rep = resolve(b, {}); assert.equal(b.lastHurt, rep.taken);
  beginReset(b); startRoll(b); b.magic = 10; b.mods.atk = 4; const r = castPower(b, 'grudge'); assert.equal(r.total, rep.taken); assert.equal(b.mods.atk, 4 + rep.taken);
  const h = dw(); h.powerLevel = { grudge: 2 }; const b2 = fight(h); b2.magic = 5; b2.lastHurt = 7; castPower(b2, 'grudge'); assert.equal(b2.mods.atk, 13);
  for (const l of [0, 1]) assert.ok(/\+3/.test(upgradeLine(cardsOf(dw())[1], l))); assert.ok(shortLine(cardsOf(dw())[1], 0) && effectLine(cardsOf(dw())[1]));
});
test('Stonehide releases 32 block at 4 charges, and Shield Bash is learnable, not a starter', () => {
  const k = cardsOf(dw())[2]; assert.equal(chargeGain(k, 4).block, 32);
  const h = dw(); assert.ok(!cardsOf(h).some((c) => c.id === 'bulwark'));
});
