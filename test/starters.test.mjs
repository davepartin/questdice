// T21 (Dave, 25 Oct 2026): every hero starts with both weapon dice live, Bronze left weapon and right shield (Ranger: Arrows and Bow), and a hero made
// earlier gets a missing right weapon die once, for nothing, with nothing else touched. Mid-round tables are never changed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import * as SV from '../js/save.js';
import * as T from '../js/table.js';

applyRelease();
const CLS = ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
const LEFT = { knight: 'sword', ranger: 'quiver', wizard: 'dagger', dwarf: 'axe', bard: 'dagger' };
const RIGHT = { knight: 'shield', ranger: 'bow', wizard: 'shield', dwarf: 'tower', bard: 'shield' };

test('a new hero of every class has both top weapon dice live at d4, Bronze, the left weapon it always had and a right shield (Ranger: Arrows and Bow)', () => {
  for (const cls of CLS) {
    const h = E.newHero({ name: `N-${cls}`, cls, seed: 4 });
    assert.equal(h.loadout.NW.id, LEFT[cls], `${cls} left`); assert.equal(h.loadout.NE.id, RIGHT[cls], `${cls} right`);
    for (const k of ['NW', 'NE']) { assert.equal(h.loadout[k].rarity | 0, 0, `${cls} ${k} Bronze`); assert.equal(E.weaponSize(h.loadout[k]), 4); assert.ok(E.isActive(h, k)); assert.equal(E.sidesOf(h, k), 4); assert.ok(!h.loadout[k].twin); }
    assert.equal(E.unlockInfo(h, 'NE').why, 'have', 'nothing to buy'); assert.equal(h.gold, E.newHero({ name: 'X', cls, seed: 4 }).gold);
    assert.deepEqual([...h.dice].sort(), ['C', 'E', 'N', 'NE', 'NW', 'S', 'SW', 'W'], 'only the right weapon die is added: no second talent, no pet');
    assert.notEqual(h.loadout.NW.uid, h.loadout.NE.uid);
  }
  assert.equal(E.newHero({ name: 'B', cls: 'bard', seed: 1 }).loadout.NE.id, 'shield', 'the Bard now carries a Bronze Round Shield, not a second Sword');
  assert.equal(D.WEAPONS.shield.name, 'Round Shield');
});
test('the strength formula is unchanged and sees the live right die', () => {
  const h = E.newHero({ name: 'S', cls: 'knight', seed: 2 }); const off = structuredClone(h); off.dice = off.dice.filter((d) => d !== 'NE');
  assert.ok(E.heroStrength(h) > E.heroStrength(off), 'a live second weapon die counts');
  assert.ok(Math.abs(E.heroStrength(off) - E.heroStrength(E.newHero({ name: 'S', cls: 'knight', seed: 2, full: false }) && off)) < 1e-9);
});
test('an older hero gets the missing right die once: nothing carried, owned or paid for changes, a second load changes nothing', () => {
  const old = E.newHero({ name: 'Old', cls: 'knight', seed: 9 }); old.dice = old.dice.filter((d) => d !== 'NE');
  old.loadout.NW = { ...E.makeWeapon('sword', 2, E.makeRng(1), 8) }; old.loadout.NE = { ...E.makeWeapon('dagger', 1, E.makeRng(2), 6), left: 2 }; old.bag.push(E.makeWeapon('axe', 0, E.makeRng(3)));
  old.gold = 77; old.level = 6; old.strength = { W: 6, E: 6 }; old.potionBuys = 2;
  const before = JSON.parse(JSON.stringify(old)); delete before.dice;
  assert.equal(SV.migrateStarterDice(old), true); assert.ok(old.dice.includes('NE'));
  const after = JSON.parse(JSON.stringify(old)); delete after.dice; assert.deepEqual(after, before, 'nothing but the die list changed');
  assert.equal(SV.migrateStarterDice(old), false, 'idempotent'); assert.equal(old.dice.filter((d) => d === 'NE').length, 1);
  const full = E.newHero({ name: 'F', cls: 'ranger', seed: 1, full: true }); const f0 = JSON.stringify(full); assert.equal(SV.migrateStarterDice(full), false); assert.equal(JSON.stringify(full), f0, 'a hero who plays with every die is left alone');
  const open = E.newHero({ name: 'O', cls: 'dwarf', seed: 1 }); delete open.loadout.NE; open.dice = open.dice.filter((d) => d !== 'NE'); SV.migrateStarterDice(open); assert.equal(open.loadout.NE.id, 'fists', 'an empty right hand gets bare fists, as a bought die always did');
  const paid = E.newHero({ name: 'P', cls: 'bard', seed: 1 }); paid.dice = paid.dice.filter((d) => d !== 'NE'); const via = SV.migrateHero(JSON.parse(JSON.stringify(paid))); assert.ok(via.dice.includes('NE'), 'loading a saved hero does it');
});
test('a table: a hero seated before the change gets the die when the table is next loaded at rest, never in the middle of a round', () => {
  const mkTable = (phase) => { const t = T.createTable({ code: 'ABCD', seed: 5, name: 'Tbl', difficulty: 'normal' }); const j = T.joinTable(t, { name: 'Rob', cls: 'ranger', token: 'u1' }); assert.ok(j.ok, j.error);
    const st = T.command(t, j.player.id, { type: 'start' }); assert.ok(st.ok, st.error);
    const hero = t.players[0].hero; assert.ok(hero.dice.includes('NE'), 'a seat made now starts with it'); hero.dice = hero.dice.filter((d) => d !== 'NE'); t.phase = phase; return t; };
  const camp = T.loadTable(T.saveTable(mkTable('camp'))); assert.ok(camp.players[0].hero.dice.includes('NE'), 'at rest: migrated');
  const mid = mkTable('battle'); mid.battle = { fighters: [{ hero: mid.players[0].hero }] };
  const kept = T.loadTable(T.saveTable(mid)); assert.ok(!kept.players[0].hero.dice.includes('NE'), 'mid-battle: untouched');
  kept.phase = 'camp'; const later = T.loadTable(T.saveTable(kept)); assert.ok(later.players[0].hero.dice.includes('NE'), 'after the fight the next load does it');
  assert.equal(T.loadTable(T.saveTable(later)).players[0].hero.dice.filter((d) => d === 'NE').length, 1, 'once');
  const fresh = T.createTable({ code: 'WXYZ', seed: 1, name: 'Fresh', difficulty: 'normal' }); const a1 = T.joinTable(fresh, { name: 'Ann', cls: 'ranger', token: 'u1' }); const b1 = T.joinTable(fresh, { name: 'Bob', cls: 'bard', token: 'u2' });
  T.command(fresh, b1.player.id, { type: 'ready', on: true }); assert.ok(T.command(fresh, a1.player.id, { type: 'start' }).ok);
  assert.deepEqual(fresh.players.map((p) => [p.hero.loadout.NW.id, p.hero.loadout.NE.id, p.hero.dice.includes('NE')]), [['quiver', 'bow', true], ['dagger', 'shield', true]], 'seats made now start right');
});
