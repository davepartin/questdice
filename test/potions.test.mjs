// Healing potions are bought at camp and carried from battle to battle (Dave, Oct 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';

const quest = { id: 'q', act: 1, step: 1, kind: 'battle', enemies: ['goblin'], hpMult: 1, flat: 0, rewardMult: 1 };

test('a new hero leaves home with two potions; what you drink is gone next battle', () => {
  const hero = E.newHero({ name: 'Ann', cls: 'knight' });
  assert.equal(E.potionStock(hero), 2);
  const b = E.newBattle(hero, quest, E.makeRng(1), 1);
  b.hp = 5;
  assert.ok(E.drinkPotion(b));
  assert.equal(b.hp, 5 + E.potionHpOf(hero));
  assert.equal(hero.potions, 1, 'gone from the belt for good');
  const next = E.newBattle(hero, quest, E.makeRng(2), 1);
  assert.equal(E.potionsLeft(next), 1);
});

test('camp sells potions by the act, never past the belt', () => {
  const hero = E.newHero({ name: 'Bo', cls: 'bard' }); hero.potions = 0; hero.gold = 100;
  assert.equal(E.potionPriceOf(hero), 10); assert.equal(E.potionHpOf(hero), 10);
  assert.ok(E.buyPotion(hero)); assert.ok(E.buyPotion(hero));
  assert.equal(hero.gold, 80); assert.equal(hero.potions, 2);
  assert.equal(E.buyPotion(hero), false, 'the belt holds two');
  hero.campaign.act = 2; hero.potions = 0;
  assert.equal(E.potionPriceOf(hero), 20); assert.equal(E.potionHpOf(hero), 15);
  hero.campaign.act = 3; assert.equal(E.potionPriceOf(hero), 30); assert.equal(E.potionHpOf(hero), 20);
  hero.gold = 25; assert.equal(E.buyPotion(hero), false, 'not enough gold');
});

test('an older save without a potion count arrives with a full belt', () => {
  const hero = E.newHero({ name: 'Cy', cls: 'ranger' }); delete hero.potions;
  assert.equal(E.potionStock(hero), 2);
  hero.potionMax = 3; assert.equal(E.potionStock(hero), 3);
});

test('in a company, a potion thrown to a friend comes out of your own belt', () => {
  const c = E.newCompany({ name: 'Pair', roster: [{ name: 'A', cls: 'knight' }, { name: 'B', cls: 'bard' }], seed: 3 });
  const b = E.newPartyBattle(c.members, quest, E.makeRng(3));
  b.fighters[1].hp = 5;
  assert.ok(E.teamAction(b, 0, 'potion', 1).ok);
  assert.equal(c.members[0].potions, 1); assert.equal(c.members[1].potions, 2);
});
