// T17 resale candidate (WEAPON_SIZE.resale): off it changes nothing; at 0.5 a sale is half of (the found worth, or what the store was paid if less, plus sizes bought),
// an upgrade always raises it, and no buy / grow / sell loop pays. tools/t17-resale.mjs runs the wide version of these checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import { allLoops } from '../tools/t17-resale.mjs';

applyRelease();
const mk = (id, rarity = 0, size = 4) => E.makeWeapon(id, rarity, E.makeRng(7), size);
const hero = () => { const h = E.newHero({ name: 'Sale', cls: 'knight', seed: 3 }); h.gold = 100000; h.campaign.act = 2; h.campaign.step = 4; return h; };
const stock = (h, inst, price) => { h.campaign.shop = { step: `${h.campaign.act}.${h.campaign.step}`, items: [{ inst, price, sold: false }], charm: null }; };

test('the resale switch is null in the shipped data, and with it null a sale is half of the found worth, nothing for sizes', () => {
  assert.equal(D.WEAPON_SIZE.resale, null); D.EXPERIMENT.weaponSize = true;
  const h = hero(); const w = mk('sword', 1, 4); h.bag.push(w); const before = E.sellValue(w); E.trainWeapon(h, w.uid);
  assert.equal(E.sellValue(w), before, 'no refund for a bought size on today\'s T17 rule'); assert.equal(E.resaleOn(), false); assert.equal(E.trainInfo(h, w.uid).noRefund, true);
});

test('at 0.5 every bought size raises the sale by half its price, shown before the purchase', () => {
  D.EXPERIMENT.weaponSize = true; D.WEAPON_SIZE.resale = 0.5;
  const h = hero(); const w = mk('sword', 1, 4); h.bag.push(w); const base = Math.round(0.5 * E.weaponValue(w)); assert.equal(E.sellValue(w), base);
  let prev = base; for (const [next, cost] of [[6, 40], [8, 80], [10, 140]]) {
    const info = E.trainInfo(h, w.uid); assert.equal(info.next, next); assert.equal(info.cost, cost); assert.equal(info.noRefund, false); assert.equal(info.sellNow, prev);
    assert.ok(info.sellAfter > prev, 'a size always raises the sale'); assert.equal(info.sellAfter, Math.round(0.5 * (E.weaponValue(w) + (w.upgraded || 0) + cost)));
    assert.ok(E.trainWeapon(h, w.uid)); assert.equal(E.sellValue(w), info.sellAfter, 'the sale after buying is what was shown'); prev = E.sellValue(w);
  }
  assert.equal(w.found, 4, 'the as-found worth stays at d4'); assert.equal(w.upgraded, 260);
});

test('a store purchase at a discount is worth no more than was paid, a hike does not raise it, and the sale survives a save, a hand and a twin', () => {
  D.EXPERIMENT.weaponSize = true; D.WEAPON_SIZE.resale = 0.5;
  const h = hero(); const w = mk('axe', 2, 6); const v = E.weaponValue(w);
  stock(h, w, Math.round(v * 0.4)); assert.ok(E.buyItem(h, 0)); assert.equal(E.sellValue(h.bag[0]), Math.round(0.5 * Math.round(v * 0.4)), 'half of what was paid');
  const dear = mk('axe', 2, 6); stock(h, dear, Math.round(v * 1.25)); assert.ok(E.buyItem(h, 0)); assert.equal(E.sellValue(dear), Math.round(0.5 * v), 'a hike is not resold');
  const saved = JSON.parse(JSON.stringify(h)); assert.equal(E.sellValue(saved.bag[0]), E.sellValue(h.bag[0]));
  const bow = mk('bow', 1, 4); h.bag.push(bow); E.ensureTwin?.(h); assert.ok(E.trainWeapon(h, bow.uid)); const inHand = E.sellValue(bow); h.loadout.NW = bow; assert.equal(E.sellValue(h.loadout.NW), inHand);
  const old = mk('sword', 2, 8); assert.equal(E.sellValue(old), Math.round(0.5 * E.weaponValue(old)), 'an old save, neither field, is worth its found worth');
});

test('no buy, grow, sell loop pays (every weapon, metal, bought size, store price modifier and growth)', () => {
  const { rows, worst } = allLoops(0.5); assert.ok(rows.length > 1000); assert.ok(worst < 0, `best loop nets ${worst}`);
  assert.ok(rows.every((r) => r.sell <= r.spent), 'a sale never returns more than was put in on a bought weapon');
  D.WEAPON_SIZE.resale = null;
});
