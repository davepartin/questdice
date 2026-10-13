import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';

// Dave: a die grows as far as the act allows (Act I d6, Act II d8, Act III d10) and level never gets in the way.
const rich = (act) => { const h = E.newHero({ name: 'T', cls: 'knight', seed: 3 }); h.level = 1; h.gold = 5000; h.campaign.act = act; h.strength = { W: 4, E: 4 }; h.special = { SW: 4, SE: 4 }; return h; };

test('Act I: strength and talent dice grow to d6 at level 1, then wait for Act II', () => {
  const h = rich(1);
  assert.equal(h.strength.W, 4);
  assert.ok(E.strengthUpgrade(h, 'W').ok, 'd4 -> d6 needs no level');
  assert.ok(E.upgradeDie(h, 'strength', 'W')); assert.equal(h.strength.W, 6);
  const next = E.strengthUpgrade(h, 'W');
  assert.equal(next.ok, false); assert.equal(next.why, 'Act II'); assert.equal(next.next, 8);
  const sp = E.specialUpgrade(h, 'SW'); assert.ok(sp.ok, 'talent die d4 -> d6 needs no level');
});
test('Act II and III open d8 and d10 at any level', () => {
  const h = rich(2); h.strength.W = 6;
  assert.ok(E.strengthUpgrade(h, 'W').ok);
  E.upgradeDie(h, 'strength', 'W'); assert.equal(h.strength.W, 8);
  assert.equal(E.strengthUpgrade(h, 'W').why, 'Act III');
  const h3 = rich(3); h3.strength.W = 8; assert.ok(E.strengthUpgrade(h3, 'W').ok);
});
test('gold is still the other limit', () => {
  const h = rich(1); h.gold = 10;
  const u = E.strengthUpgrade(h, 'W'); assert.equal(u.ok, false); assert.equal(u.why, 'Need gold');
});
