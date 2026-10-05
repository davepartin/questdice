import test from 'node:test';
import assert from 'node:assert/strict';
import { judge, newLot, submit, settle, makeOffers, soloOffer, gambleOffer, gamblePrice, GAMBLE_ODDS, revealLine, line, LINE_KINDS, basePrice } from '../js/auction.js';
import { newHero } from '../js/engine.js';

const lot = (gold = { a: 100, b: 100, c: 100 }) => newLot(makeOffers(7)[0], gold);

test('the highest sealed bid wins and pays its own bid', () => {
  const l = lot(); const r = submit(l, { a: 30, b: 45, c: 10 });
  assert.equal(r.status, 'won'); assert.equal(r.winner, 'b'); assert.equal(r.price, 45);
});

test('a bid above your gold counts as all of your gold; nobody can bid what they lack', () => {
  const l = lot({ a: 20, b: 5 }); const r = submit(l, { a: 999, b: 50 });
  assert.equal(r.winner, 'a'); assert.equal(r.price, 20);
});

test('a tie sends only the tied players to a second round and the new bid must be higher', () => {
  const l = lot(); const r1 = submit(l, { a: 40, b: 40, c: 10 });
  assert.equal(r1.status, 'rebid'); assert.deepEqual(l.eligible.sort(), ['a', 'b']); assert.equal(l.min, 40);
  const r2 = submit(l, { a: 41, b: 40 }); // b did not raise, so b's bid does not count
  assert.equal(r2.status, 'won'); assert.equal(r2.winner, 'a'); assert.equal(r2.price, 41);
});

test('tying twice means the traveller keeps the weapon', () => {
  const l = lot(); submit(l, { a: 40, b: 40 });
  const r = submit(l, { a: 60, b: 60 });
  assert.equal(r.status, 'taken'); assert.deepEqual(r.tied.sort(), ['a', 'b']);
});

test('nobody raising in the rebid leaves the lot unsold', () => {
  const l = lot(); submit(l, { a: 40, b: 40 });
  assert.equal(submit(l, { a: 40, b: 10 }).status, 'unsold');
});

test('no bids at all leaves it with the game', () => {
  assert.equal(submit(lot(), { a: 0, b: 0, c: 0 }).status, 'unsold');
  assert.equal(judge({}).status, 'none');
});

test('settling charges the winner their bid and puts the weapon in the bag', () => {
  const h = newHero({ name: 'W', cls: 'knight', seed: 1 }); h.gold = 100;
  const l = newLot(makeOffers(3)[1], { w: 100 }); submit(l, { w: 33 });
  assert.equal(settle(h, l), true); assert.equal(h.gold, 67); assert.equal(h.bag.length, 1);
  assert.equal(h.bag[0].id, l.offer.inst.id);
});

test('offers are a plain, a good and sometimes an amazing weapon, and are reproducible', () => {
  const o = makeOffers(11, { act: 1, step: 2 });
  assert.equal(o.length, 3); assert.equal(o[0].inst.rarity, 0); assert.equal(o[1].inst.rarity, 1); assert.ok(o[2].inst.rarity >= 2);
  assert.deepEqual(makeOffers(11, { act: 1, step: 2 }).map((x) => x.inst.id), o.map((x) => x.inst.id));
  assert.ok(o.every((x) => x.base === basePrice(x.inst) && x.base > 0));
});

test('alone there is just a price', () => {
  const s = soloOffer(5); assert.ok(s.price > 0 && s.inst.id);
  const t = soloOffer(5); assert.equal(t.price, s.price); assert.equal(t.inst.id, s.inst.id); assert.equal(t.inst.rarity, s.inst.rarity);
});

test('the traveller has something to say for every occasion', () => {
  for (const k of LINE_KINDS) assert.ok(line(k).length > 10);
  assert.ok(LINE_KINDS.includes('taken') && LINE_KINDS.includes('rebid'));
});

test('the solo traveller is a gamble: flat price, hidden prize, odds that add up, and the same prize on every reload', () => {
  assert.ok(Math.abs(GAMBLE_ODDS.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  const g = gambleOffer(9, { act: 1, step: 3 }); assert.equal(g.price, gamblePrice(1)); assert.equal(gambleOffer(9, { act: 1, step: 3 }).inst.rarity, g.inst.rarity);
  assert.ok(gamblePrice(2) > gamblePrice(1));
  const tally = [0, 0, 0, 0]; for (let s = 0; s < 800; s++) tally[gambleOffer(s, { act: 1, step: 3 }).inst.rarity]++;
  assert.ok(tally[0] > tally[1] && tally[1] > tally[2] && tally[2] > tally[3] && tally[3] > 0, `odds ${tally}`);
  for (let t = 0; t < 4; t++) assert.ok(revealLine(t).length > 10);
});
