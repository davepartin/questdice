// Weapons, second edition (the experiment, docs/ideas/WEAPONS_REDESIGN_2026-10-22.md). It is OFF in the game: this file checks that,
// then switches it on (each test file runs in its own process, so the other files never see it) and checks stage 1.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { WEAPONS, LOOT_WEIGHTS, CLASSES, DIAMOND, LEGENDARY, EXPERIMENT } from '../js/data.js';

test('off by default: today\'s weapons, loot and classes', () => {
  assert.equal(EXPERIMENT.weapons2, false);
  assert.ok(!WEAPONS.axe, 'no Axe in the live game');
  assert.ok(LOOT_WEIGHTS.warhammer && LOOT_WEIGHTS.bow, 'two-handers still drop');
  assert.deepEqual(CLASSES.ranger.weapons, ['bow']);
});

test('switched on: six one-handed weapons with the proposed Bronze faces', () => {
  const swordBefore = E.weaponFaces(E.makeWeapon('sword', 0, E.makeRng(1), 8), 8).map((f) => `${f.c}${f.v}`).join(' ');
  E.useWeapons2();
  assert.equal(EXPERIMENT.weapons2, true);
  const f = (id, size, rarity = 0) => E.weaponFaces(E.makeWeapon(id, rarity, E.makeRng(1), size), size).map((x) => `${x.c === 'b' ? 'B' : 'R'}${x.v}`).join(' ');
  assert.equal(f('sword', 8), 'R0 B1 R2 R3 B4 R5 R6 R8'); assert.notEqual(f('sword', 8), swordBefore);
  assert.equal(f('dagger', 6), 'R0 B1 R1 R3 R5 R5');
  assert.equal(f('axe', 10), 'R0 R0 R0 B0 R4 R6 R8 R8 R10 R10');
  assert.equal(f('spear', 4), 'R0 R1 B3 R4');
  assert.equal(f('shield', 4), 'B0 R1 B2 B4', 'the Round Shield is the Sword with its colours swapped');
  assert.equal(f('tower', 4), 'B0 R0 B4 B4', 'the Tower Shield is the Axe swapped');
  assert.equal(f('sword', 8, 2), f('sword', 8, 0), 'Silver and Gold keep the same numbers (stage 1: no symbols yet)');
  for (const id of ['sword', 'dagger', 'axe', 'spear', 'shield', 'tower']) for (const n of [4, 6, 8, 10]) {
    const faces = E.weaponFaces(E.makeWeapon(id, 0, E.makeRng(1), n), n);
    assert.equal(faces.length, n, `${id} d${n} has ${n} faces`); assert.ok(faces.every((x) => x.v <= n), `${id} d${n}: no number past the die`);
    assert.ok(faces.some((x) => x.c === 'r') && faces.some((x) => x.c === 'b'), `${id} d${n} has both colours`);
  }
  // a d8 weapon in a d6 hand rolls its d6 faces
  assert.equal(E.weaponFaces(E.makeWeapon('axe', 0, E.makeRng(1), 8), 6).length, 6);
});

test('switched on: one-handed loot, class weapons and Diamonds; the two-handed legendaries leave the pool', () => {
  E.useWeapons2();
  assert.deepEqual(Object.keys(LOOT_WEIGHTS).sort(), ['axe', 'dagger', 'shield', 'spear', 'sword', 'tower']);
  for (const c of Object.values(CLASSES)) for (const w of c.weapons) assert.equal(WEAPONS[w].hands, 1);
  assert.ok(DIAMOND.pool.every((id) => WEAPONS[id].hands === 1));
  assert.ok(LEGENDARY.every((id) => WEAPONS[id].hands === 1));
  assert.equal(WEAPONS.shield.name, 'Round Shield');
  const h = E.newHero({ name: 'W', cls: 'dwarf', seed: 3 }); h.dice = [...new Set([...(h.dice || []), 'NE'])]; // both hands in play
  assert.deepEqual([h.loadout.NW.id, h.loadout.NE.id], ['axe', 'tower']);
  // a blue blank still sends the hand's number to block (a coloured +0): Tower d4 face 1 is B0
  const ev = E.evaluate(h, Object.fromEntries(Object.entries({ NW: 3, NE: 1, N: 1, W: 2, C: 1, E: 3, S: 1, SW: 1, SE: 1, P: 1 }).map(([k, v]) => [k, { v }])));
  assert.equal(ev.lanes.R.weapon, 0); assert.equal(ev.lanes.R.color, 'b', 'a blue blank'); assert.equal(ev.lanes.R.value, ev.lanes.R.str, 'it still blocks for the hand');
  const drops = E.rollDrops ? E.rollDrops(E.makeRng(9), 40, {}) : [];
  for (const d of drops) assert.ok(d.diamond || WEAPONS[d.id].hands === 1, `${d.id} is one-handed`);
});
