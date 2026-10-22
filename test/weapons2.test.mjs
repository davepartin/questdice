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
  const h = E.newHero({ name: 'L', cls: 'ranger', seed: 1 }); assert.equal(E.setAmmo(h, h.loadout.NW.uid, 'fire'), false, 'no ammunition to pick in the live game');
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

test('stage 3, arrows: the Ranger carries Arrows and a Bow; each arrowhead pays the hand\'s Strength its own way', () => {
  E.useWeapons2();
  const r = E.newHero({ name: 'A', cls: 'ranger', seed: 2 }); r.dice = [...new Set([...(r.dice || []), 'NE'])];
  assert.deepEqual([r.loadout.NW.id, r.loadout.NE.id], ['quiver', 'bow']);
  assert.ok(E.setAmmo(r, r.loadout.NW.uid, 'frost')); assert.equal(r.loadout.NW.ammo, 'frost', 'picked at camp');
  assert.equal(E.setAmmo(r, r.loadout.NW.uid, 'poison'), false, 'only the four'); assert.equal(E.setAmmo(r, r.loadout.NE.uid, 'fire'), false, 'the Bow takes no ammunition');
  const faces = (ammo, n = 8) => E.weaponFaces({ uid: 'q', id: 'quiver', ammo, rarity: 0, size: n }, n);
  assert.equal(faces('normal').filter((f) => f.arrow).length, 0, 'normal arrows: numbers only');
  for (const a of ['pierce', 'fire', 'frost']) { assert.equal(faces(a, 4).filter((f) => f.arrow === a).length, 1); assert.equal(faces(a, 8).filter((f) => f.arrow === a).length, 3, 'bigger dice, more arrowheads'); }
  const board = (o) => Object.fromEntries(Object.entries({ NW: 1, NE: 1, N: 1, W: 1, C: 1, E: 1, S: 1, SW: 1, SE: 1, P: 1, ...o }).map(([k, v]) => [k, { v }]));
  const ev = (ammo, o) => { r.loadout.NW = { uid: `q-${ammo}`, id: 'quiver', ammo, rarity: 0 }; return E.evaluate(r, board(o)); };
  const head = faces('pierce', 4).findIndex((f) => f.arrow) + 1; // the d4's arrowhead face
  const plain = ev('normal', { NW: head, W: 3 }); const p = ev('pierce', { NW: head, W: 3 });
  assert.equal(p.pierce - plain.pierce, 3, 'Piercing: the left hand\'s 3 becomes 3 pierce');
  const f = ev('fire', { NW: head, W: 3 }); assert.equal(f.fire, 1, 'Fire: half of 3, rounded down, to every other monster');
  const fr = ev('frost', { NW: head, W: 3 }); assert.ok(fr.frost, 'Frost: the target is chilled');
  const charm = E.newHero({ name: 'C', cls: 'ranger', seed: 2 }); charm.dice = r.dice; charm.loadout.NW = { uid: 'qe', id: 'quiver', ammo: 'fire', rarity: 0 }; E.takeCharm(charm, 'ember');
  assert.ok(!E.evaluate(charm, board({ NW: head, W: 3, NE: 2 })).notes.some((n) => /Ember/.test(n)), 'an arrowhead is not a blank: no Ember Locket (the bow shows a 1, not its blank)');
});

test('stage 3, arrows in a fight: Fire splashes past the target (guard can stop it), Frost halves the next blow once', () => {
  E.useWeapons2();
  const r = E.newHero({ name: 'F', cls: 'ranger', seed: 5 }); r.dice = [...new Set([...(r.dice || []), 'NE'])];
  const q = { enemies: ['goblin', 'goblin'], hpMult: 3, flat: 0, rewardMult: 1, kind: 'battle' };
  r.loadout.NW = { uid: 'qf', id: 'quiver', ammo: 'fire', rarity: 0 };
  const head = E.weaponFaces(r.loadout.NW, 4).findIndex((f) => f.arrow) + 1;
  const b = E.newBattle(r, q, E.makeRng(3), 1); E.startRoll(b);
  for (const [k, v] of Object.entries({ NW: head, W: 4, NE: 1 })) b.board[k] = { v, bound: false };
  const other = b.enemies[1]; other.intent = { n: 'Stab', v: 'strike', f: 1, m: 0 }; const hp0 = other.hp;
  E.resolve(b, { target: 0 }); assert.equal(hp0 - other.hp, 2, 'Fire: half of 4 to the other goblin');
  const r2 = E.newHero({ name: 'G', cls: 'ranger', seed: 6 }); r2.dice = r.dice; r2.loadout.NW = { uid: 'qi', id: 'quiver', ammo: 'frost', rarity: 0 };
  const b2 = E.newBattle(r2, { ...q, enemies: ['ogre'] }, E.makeRng(4), 1); E.startRoll(b2);
  for (const [k, v] of Object.entries({ NW: head, W: 4, NE: 1 })) b2.board[k] = { v, bound: false };
  const o = b2.enemies[0]; o.intent = { n: 'Club', v: 'strike', f: 10, m: 0 }; o.windup = false;
  E.resolve(b2, { target: 0 }); const act = b2.report.acts.find((a) => a.uid === o.uid);
  assert.ok(act.frosted, 'its blow this round was halved'); assert.equal(act.mag, 5, '10 halved to 5'); assert.ok(!o.frost, 'and the frost cleared');
});

test('stage 3, arrows at a table: two archers\' frost still chills once', () => {
  E.useWeapons2();
  const fight = (ammo) => {
    const mk = (n) => { const h = E.newHero({ name: n, cls: 'ranger', seed: n.length }); h.dice = [...new Set([...(h.dice || []), 'NE'])]; h.loadout.NW = { uid: `q${n}`, id: 'quiver', ammo, rarity: 0 }; return h; };
    const b = E.newPartyBattle([mk('Ann'), mk('Cole')], { enemies: ['ogre', 'goblin'], hpMult: 3, flat: 0, rewardMult: 1, kind: 'battle' }, E.makeRng(5));
    const head = E.weaponFaces({ id: 'quiver', ammo: 'frost', rarity: 0 }, 4).findIndex((f) => f.arrow) + 1;
    for (let i = 0; i < 2; i++) { E.startFighter(b, i); const f = b.fighters[i]; for (const [k, v] of Object.entries({ NW: head, W: 4, NE: 1 })) f.board[k] = { v, bound: false }; f.target = 0; E.commitFighter(b, i); }
    const o = b.enemies[0]; o.intent = { n: 'Club', v: 'strike', f: 12, m: 0 }; o.windup = false;
    E.resolveParty(b); return { act: b.report.acts.find((x) => x.uid === o.uid), o };
  };
  const plain = fight('pierce'); const cold = fight('frost');
  assert.ok(cold.act.frosted); assert.equal(cold.act.mag, Math.floor(plain.act.mag / 2), 'halved once, not quartered'); assert.ok(!cold.o.frost, 'and cleared');
});
