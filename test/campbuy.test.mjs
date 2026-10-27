import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { GRID, slotPrice, slotCanBuy } from '../js/campbuy.js';

const fresh = (gold = 0) => {
  const h = E.newHero({ name: 'Camp', cls: 'knight', seed: 3 });
  h.gold = gold;
  return h;
};

test('slot prices do not throw, and the heart costs 200 gold for rank 2', () => {
  const h = fresh(0);
  for (const [slot] of GRID) {
    assert.doesNotThrow(() => slotPrice(h, slot));
    assert.doesNotThrow(() => slotCanBuy(h, slot));
  }
  assert.equal(slotPrice(h, 'C'), 200);
  assert.equal(slotCanBuy(h, 'C'), false);
});

test('a broke level-1 hero cannot buy any die', () => {
  const h = fresh(0);
  assert.equal(h.gold, 0);
  assert.ok(GRID.every(([slot]) => !slotCanBuy(h, slot)));
});

test('grown dice show the next buy price; locked cells show an add cost', () => {
  const h = fresh(500);
  const hand = slotPrice(h, 'E');
  assert.ok(hand > 0);
  assert.equal(slotCanBuy(h, 'E'), true);
  const locked = slotPrice(h, 'SE');
  assert.ok(locked > 0);
  assert.equal(slotCanBuy(h, 'SE'), true);
  h.gold = 0;
  assert.equal(slotPrice(h, 'E'), hand);
  assert.equal(slotCanBuy(h, 'E'), false);
});
