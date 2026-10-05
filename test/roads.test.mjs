import test from 'node:test';
import assert from 'node:assert/strict';
import { newHero } from '../js/engine.js';
import { roadIsOpen, ensureRoad, chooseRoad, roadSlot } from '../js/roads.js';

const at = (hero, act, step, wins) => { Object.assign(hero.campaign, { act, step, wins, road: null }); return hero; };

test('a road event comes before fights 3, 5, 7, 9 and the boss, and not before the others', () => {
  const h = newHero({ name: 'T', cls: 'knight', seed: 2 });
  const open = [];
  for (let step = 2; step <= 10; step++) { at(h, 1, step, step - 1); if (roadIsOpen(h)) open.push(step); }
  assert.deepEqual(open, [3, 5, 7, 9, 10]);
  assert.ok(roadSlot({ step: 3 }) && !roadSlot({ step: 4 }));
});

test('the very first fight still opens with the Nine-Stone Gate', () => {
  const h = newHero({ name: 'T', cls: 'knight', seed: 2 });
  assert.equal(roadIsOpen(h), true); assert.equal(ensureRoad(h, [h]).id, 'gate');
});

test('the traveller shows up only every second or third fight, and a purchase moves gold into the pack', () => {
  let slots = 0; let seen = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const h = newHero({ name: 'T', cls: 'knight', seed });
    for (let step = 3; step <= 9; step += 2) { at(h, 1, step, step - 1); slots++; if (ensureRoad(h, [h]).id === 'traveller') seen++; }
  }
  assert.ok(seen / slots > 0.2 && seen / slots < 0.8, `the traveller appeared on ${seen} of ${slots} road events`);
  const h2 = newHero({ name: 'T', cls: 'knight', seed: 4 }); h2.campaign.travellerAt = 0;
  at(h2, 1, 5, 4); h2.gold = 500;
  const ev = ensureRoad(h2, [h2]); assert.equal(ev.id, 'traveller');
  const price = h2.campaign.traveller.price;
  const res = chooseRoad(h2, [h2], 'buy'); assert.ok(res.text.length > 10);
  assert.equal(h2.gold, 500 - price); assert.equal(h2.bag.length, 1);
  // too poor: the road refuses
  const h3 = newHero({ name: 'T', cls: 'knight', seed: 4 }); at(h3, 1, 5, 4); h3.gold = 0; ensureRoad(h3, [h3]);
  assert.equal(chooseRoad(h3, [h3], 'buy'), null);
});
