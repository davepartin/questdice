// Encounters and the Camp Store (Dave, Oct 2026): what the road and the store give must be felt in the next fight.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';

const hero = (name = 'WizKid', cls = 'wizard', seed = 3) => E.newHero({ name, cls, seed });
const quest = { enemies: ['goblin'], hpMult: 1, flat: 0, rewardMult: 1, kind: 'battle', perilous: false };
const fight = (h) => { const b = E.newBattle(h, quest, E.makeRng(7), 1); E.startRoll(b); return b; };

test('round 1 block from an encounter counts in round 1 only; enchanted pierce counts every round', () => {
  const h = hero(); h.campaign.blessings = [{ id: 'x', fights: 1, openingBlock: 10, pierce: 3 }];
  const plain = hero(); const b0 = fight(plain); const b = fight(h);
  b.board = structuredClone(b0.board);
  E.resolve(b); E.resolve(b0);
  assert.equal(b.report.T.block - b0.report.T.block, 10, 'round 1: +10 block');
  assert.equal(b.report.T.pierce - b0.report.T.pierce, 3, 'round 1: +3 pierce');
  if (b.phase !== 'done' && b0.phase !== 'done') {
    E.startRoll(b); E.startRoll(b0); b.board = structuredClone(b0.board);
    E.resolve(b); E.resolve(b0);
    assert.equal(b.report.T.block - b0.report.T.block, 0, 'round 2: no opening block');
    assert.equal(b.report.T.pierce - b0.report.T.pierce, 3, 'round 2: still +3 pierce');
  }
});

test('a stomach bug costs health every round but never the last point', () => {
  const h = hero(); h.campaign.blessings = [{ id: 'bug', fights: 1, sick: 3, bane: true }];
  const b = fight(h); b.enemies.forEach((e) => { e.hp = 999; e.maxHp = 999; }); b.hp = 10;
  E.resolve(b); assert.ok(b.report.sick > 0 || b.hp <= 1, 'the bug bites');
  b.hp = 2; b.phase = 'reset'; E.startRoll(b); E.resolve(b);
  assert.ok(b.hp >= 0); if (b.report.sick) assert.ok(b.hp >= 1, 'never the last point');
});

test('borrowed boots: the feet roll the bigger die for one fight, then go back', () => {
  const h = hero(); const own = E.sidesOf(h, 'S');
  h.campaign.blessings = [{ id: 'boots', fights: 1, feet: 10 }];
  assert.equal(E.sidesOf(h, 'S'), Math.max(own, 10));
  E.spendBlessings(h.campaign);
  assert.equal(E.sidesOf(h, 'S'), own, 'the cobbler has them back');
});

test('the Camp Store: two specials a camp, each for the hero who buys it, and a mystery bundle once a camp', () => {
  const a = hero('Ada', 'knight', 1); const s = hero('Smalls', 'dwarf', 2); s.campaign = a.campaign; a.gold = 300; s.gold = 300;
  const t = E.storeTonics(a); assert.equal(t.length, 2); assert.notEqual(t[0].id, t[1].id);
  assert.equal(E.buyTonic(a, t[0].id), true);
  assert.equal(E.buyTonic(a, t[0].id), false, 'one each');
  assert.equal(E.storeTonics(s)[0].bought, false, 'the other hero can still buy theirs');
  const bl = a.campaign.blessings.at(-1); assert.equal(bl.who, 'Ada');
  assert.deepEqual(E.pullBlessings(s), E.pullBlessings(hero('X', 'knight', 9)), 'Smalls gets nothing from Ada’s special');
  const o = E.bundleOffer(a); const inst = E.buyBundle(a);
  assert.ok(inst && a.bag.length === 1 && a.gold === 300 - t[0].price - o.price);
  assert.equal(E.buyBundle(a), false, 'one bundle a camp');
  a.campaign.step += 1; assert.equal(E.bundleOffer(a).bought, false, 'new stock next camp');
});
