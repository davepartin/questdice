import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';

// Dave (27 Oct 2026): no act limit on die growth. Gold is the only limit; every die grows to d10 in any act.
const rich = (act) => { const h = E.newHero({ name: 'T', cls: 'knight', seed: 3 }); h.level = 1; h.gold = 5000; h.campaign.act = act; h.strength = { W: 4, E: 4 }; h.special = { SW: 4, SE: 4 }; return h; };

test('Act I: strength and talent dice grow all the way to d10 at level 1', () => {
  const h = rich(1);
  for (const want of [6, 8, 10]) { assert.ok(E.strengthUpgrade(h, 'W').ok, `-> d${want} needs no act`); assert.ok(E.upgradeDie(h, 'strength', 'W')); assert.equal(h.strength.W, want); }
  assert.equal(E.strengthUpgrade(h, 'W').why, 'Max size');
  for (const want of [6, 8, 10]) { assert.ok(E.specialUpgrade(h, 'SW').ok); assert.ok(E.upgradeDie(h, 'special', 'SW')); assert.equal(h.special.SW, want); }
});
test('the feet (initiative) die grows past d6 to d10 for every class', () => {
  for (const cls of ['knight', 'ranger', 'wizard', 'dwarf', 'bard']) {
    const h = E.newHero({ name: 'F', cls, seed: 3 }); h.gold = 5000; h.campaign.act = 1;
    while (E.speedUpgrade(h).ok) assert.ok(E.upgradeDie(h, 'speed', 'S'));
    assert.equal(E.feetSize(h), 10, `${cls} reaches d10`); assert.equal(E.speedUpgrade(h).why, 'Max size');
  }
});
test('gold is the only limit', () => {
  const h = rich(1); h.gold = 10;
  const u = E.strengthUpgrade(h, 'W'); assert.equal(u.ok, false); assert.equal(u.why, 'Need gold');
});
