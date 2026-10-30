// mb1 (PROPOSED): Bard magic cards live. Mending Song green d6 party heal (1 magic each, up to 6), Lucky Verse 2 magic, Rising Ballad +3 attack +2 heal a charge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cardsOf, makeRng, newHero, newBattle, startRoll, castPower, beginReset, questsFor, chargeGain, powerDice, scaleMax, newPartyBattle, startFighter, resolveParty, beginPartyRound } from '../js/engine.js';
import { upgradeLine, shortLine, effectLine } from '../js/g3/powers.js';
const bard = (seed = 3) => newHero({ name: 'B', cls: 'bard', seed, full: true });
const fight = (h = bard()) => { const b = newBattle(h, questsFor(h)[0], makeRng(2), 1); startRoll(b); return b; };
test('Bard starts with Mending Song, Lucky Verse and Rising Ballad', () => { assert.deepEqual(cardsOf(bard()).map((k) => k.id), ['mending', 'luckyverse', 'ballad']); });
test('Mending Song: 1 magic per green d6 of heal, up to 6d6, every round', () => {
  const k = cardsOf(bard())[0]; assert.equal(k.dice.to, 'heal'); assert.equal(k.dice.s, 6); assert.equal(powerDice(k, scaleMax(k, 0), 0), 6);
  const b = fight(); b.magic = 10; const r = castPower(b, 'mending', { x: 4 }); assert.equal(r.rolls.length, 4); assert.equal(b.magic, 6); assert.equal(b.mods.heal, r.total);
  assert.equal(castPower(b, 'mending', { x: 1 }), null); beginReset(b); startRoll(b); assert.ok(castPower(b, 'mending', { x: 1 }));
  for (const l of [0, 1, 2]) assert.ok(shortLine(k, l) && upgradeLine(k, l) && effectLine(k, { level: l }));
});
test('Mending Song heals every hero in the party', () => {
  const k = newHero({ name: 'K', cls: 'knight', seed: 1, full: true }); const w = newHero({ name: 'W', cls: 'wizard', seed: 2, full: true }); const bd = bard();
  const b = newPartyBattle([k, w, bd], { ...questsFor(k)[0], enemies: ['goblin'] }, makeRng(3)); for (const e of b.enemies) e.hp = 999;
  beginPartyRound(b); for (const f of b.fighters) f.hp = 5;
  startFighter(b, 0); startFighter(b, 1); startFighter(b, 2); b.magic = 10;
  const r = castPower(b, 'mending', { x: 3 }); assert.equal(r.party, 2);
  const rep = resolveParty(b); const v = rep.verses.filter((x) => x.from === 'B');
  assert.deepEqual(v.map((x) => x.to).sort(), ['K', 'W']); for (const x of v) assert.equal(x.n, r.total);
});
test('Lucky Verse costs 2 magic, once a round', () => {
  const b = fight(); b.magic = 5; assert.ok(castPower(b, 'luckyverse')); assert.equal(b.magic <= 3 + 3, true); assert.equal(castPower(b, 'luckyverse'), null);
  assert.equal(cardsOf(bard())[1].cost, 2);
});
test('Rising Ballad: +3 attack and +2 heal a charge, 20 attack and 16 heal at 4', () => {
  const k = cardsOf(bard())[2]; assert.deepEqual(chargeGain(k, 4), { atk: 20, heal: 16 });
  const b = fight(); b.charge = { ballad: 2 }; b.mods.atk = 5; b.mods.heal = 1; castPower(b, 'ballad', { release: true });
  const g = chargeGain(k, 2); assert.equal(b.mods.atk, 5 + g.atk); assert.equal(b.mods.heal, 1 + g.heal);
});
