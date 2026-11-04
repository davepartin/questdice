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

test('the six weapons (T29): Bronze carries its icon on the top face only, Silver more, Gold more still; the numbers never change', () => {
  applyRelease();
  const f = (rarity) => E.weaponFaces(E.makeWeapon('sword', rarity, E.makeRng(1), 8), 8);
  const icons = (fs) => fs.filter((x) => x.fx).length; const nums = (fs) => fs.map((x) => `${x.c}${x.v}`).join(' ');
  assert.equal(icons(f(0)), 1, 'Bronze: the top face only');
  assert.ok(icons(f(1)) >= 2, 'Silver: half the faces carry an icon'); assert.ok(icons(f(2)) > icons(f(1)), 'Gold: more');
  assert.equal(nums(f(2)), nums(f(0)), 'the numbers stay the same');
  const top = f(2).find((x) => x.fx && Object.values(x.fx)[0] === 3); assert.ok(top, 'Gold: a crit of 3 on the top face');
});

test('a new hero after the release: one-handed class weapons, charms resting, heart to heart at a table', () => {
  applyRelease();
  const w = E.newHero({ name: 'Wren', cls: 'wizard', seed: 3 }); assert.deepEqual([w.loadout.NW.id, w.loadout.NE?.id], ['staff', 'staff']); assert.equal(w.loadout.NE.twin, true, 'the Wizard starts with one two-handed Staff (T29)');
  const r = E.newHero({ name: 'Rook', cls: 'ranger', seed: 3 }); assert.deepEqual([r.loadout.NW.id, r.loadout.NE?.id], ['quiver', 'bow']);
  assert.equal(E.charmsResting(), true);
});

test('T29: an old save with every retired weapon loads with the six (metal, size and uid kept; a two-hander frees its right hand for a Round Shield)', async () => {
  applyRelease();
  const SV = await import('../js/save.js');
  const mk = (id, r, z) => E.makeWeapon(id, r, E.makeRng(7), z);
  const h = E.newHero({ name: 'Oldie', cls: 'knight', seed: 3 });
  const ham = mk('warhammer', 2, 8); h.loadout = { NW: ham, NE: E.twinOf(ham) };
  h.bag = [mk('spear', 1, 6), mk('mace', 0, 4), mk('longsword', 2, 10), mk('bracer', 1, 6), mk('tower', 2, 8), mk('dawnbreaker', 0, 4), mk('dagger', 1, 6)];
  h.diamonds = [{ ...mk('spear', 2, 8), diamond: true }];
  SV.migrateHero(h);
  assert.deepEqual([h.loadout.NW.id, h.loadout.NE.id], ['axe', 'shield'], 'War Hammer -> Axe, and a Round Shield in the freed hand');
  assert.equal(h.loadout.NW.uid, ham.uid); assert.equal(h.loadout.NW.rarity, 2); assert.equal(E.weaponSize(h.loadout.NW), 8);
  assert.equal(h.loadout.NE.rarity, 2); assert.equal(E.weaponSize(h.loadout.NE), 8); assert.ok(!h.loadout.NE.twin);
  assert.deepEqual(h.bag.map((w) => w.id), ['axe', 'axe', 'sword', 'shield', 'shield', 'dawnbreaker', 'dagger'], 'Spear, Mace -> Axe; Long Sword -> Sword; Bracer, Tower -> Shield; Legendaries kept');
  assert.deepEqual(h.bag.map((w) => w.rarity | 0), [1, 0, 2, 1, 2, 0, 1], 'metal kept');
  assert.equal(h.diamonds[0].id, 'axe'); assert.ok(h.diamonds[0].diamond);
  const again = JSON.stringify(h); SV.migrateHero(h); assert.equal(JSON.stringify(h), again, 'loading twice changes nothing');
  for (const w of [h.loadout.NW, ...h.bag]) assert.ok(E.weaponFaces(w).length >= 4);
});
test('T29: the store and spoils carry only the six; a Diamond is its weapon\'s dream version', () => {
  applyRelease();
  assert.deepEqual(Object.keys(D.LOOT_WEIGHTS).sort(), ['axe', 'dagger', 'shield', 'staff', 'sword']);
  const dm = E.weaponFaces({ ...E.makeWeapon('dagger', 2, E.makeRng(3), 8), diamond: true });
  assert.ok(dm.every((f) => f.fx?.pierce), 'a Diamond Dagger pierces on every face');
  assert.match(D.WEAPONS.axe.tag, /Big swings/);
});
test('pets are gone: an old hero with a pet loads without it, and nothing in the game offers one', async () => {
  applyRelease();
  const h = E.newHero({ name: 'Petty', cls: 'bard', seed: 2 }); h.pet = { type: 'bunny', size: 6, faces: [['heal'], ['heal'], [], [], []] }; h.dice = [...h.dice, 'P'];
  SV.migrateHero(h);
  assert.equal(h.pet, undefined); assert.ok(!h.dice.includes('P')); assert.equal(E.isActive(h, 'P'), false);
  for (const fn of ['buyPet', 'petOffer', 'growPet', 'addPetSymbol', 'petFace']) assert.equal(E[fn], undefined, `${fn} is gone`);
  const ev = E.evaluate(h, E.rollBoard(h, E.makeRng(4))); assert.equal(ev.pet, undefined);
});
