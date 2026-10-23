// What the live game plays (js/release.js). Each test file runs in its own process, so applying the release here touches no other file.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import * as SV from '../js/save.js';
import { applyRelease } from '../js/release.js';

test('an old save from before the new weapons: its two-handed Bow becomes Arrows + Bow, the right hand die with it', () => {
  const old = E.newHero({ name: 'Robin', cls: 'ranger', seed: 2 }); // made with today's rules: one Bow filling both hands
  old.loadout.NW.rarity = 1; old.loadout.NW.size = 6; old.loadout.NE = E.twinOf(old.loadout.NW);
  assert.equal(old.loadout.NE.twin, true); assert.ok(!old.dice.includes('NE'));
  const saved = JSON.parse(JSON.stringify(old));
  applyRelease();
  assert.equal(D.EXPERIMENT.weapons2, true); assert.equal(D.TEAMWORK.heartToHeart, true); assert.equal(D.CLASS2.on, true); assert.equal(D.PRESSURE.on, false, 'monster fury stays in the lab');
  assert.equal(D.WEAPONS2.arrowRules.fire, 'full');
  const h = SV.migrateHero(saved);
  assert.equal(h.loadout.NW.id, 'quiver'); assert.equal(h.loadout.NW.ammo, 'normal'); assert.equal(h.loadout.NW.rarity, 1); assert.equal(h.loadout.NW.size, 6);
  assert.equal(h.loadout.NE.id, 'bow'); assert.ok(!h.loadout.NE.twin); assert.ok(h.dice.includes('NE'), 'the right hand die comes with it');
  assert.notEqual(h.loadout.NW.uid, h.loadout.NE.uid);
  assert.equal(SV.migrateWeapons2(h), false, 'a second load changes nothing');
  assert.ok(E.isActive(h, 'NE') && E.weaponFaces(h.loadout.NE, 6).length === 6);
});

test('the new weapons: Silver and Gold add today\'s metal icons (numbers unchanged); Bronze has none', () => {
  applyRelease();
  const f = (rarity) => E.weaponFaces(E.makeWeapon('sword', rarity, E.makeRng(1), 8), 8);
  const icons = (fs) => fs.filter((x) => x.fx).length; const nums = (fs) => fs.map((x) => `${x.c}${x.v}`).join(' ');
  assert.equal(icons(f(0)), 0, 'Bronze: plain');
  assert.ok(icons(f(1)) >= 2, 'Silver: half the faces carry an icon'); assert.ok(icons(f(2)) > icons(f(1)), 'Gold: more');
  assert.equal(nums(f(2)), nums(f(0)), 'the numbers stay the same');
  const top = f(2).find((x) => x.fx && Object.values(x.fx)[0] === 3); assert.ok(top, 'Gold: a crit of 3 on the top face');
});

test('a new hero after the release: one-handed class weapons, charms resting, heart to heart at a table', () => {
  applyRelease();
  const w = E.newHero({ name: 'Wren', cls: 'wizard', seed: 3 }); assert.deepEqual([w.loadout.NW.id, w.loadout.NE?.id], ['dagger', 'shield']);
  const r = E.newHero({ name: 'Rook', cls: 'ranger', seed: 3 }); assert.deepEqual([r.loadout.NW.id, r.loadout.NE?.id], ['quiver', 'bow']);
  assert.equal(E.charmsResting(), true);
});
