// T17: the cumulative size ladder (tools/t17-ladder.mjs). A proposal being measured; nothing in the game uses it. These checks are the ones the
// Director asked for: the number of faces equals the die size, and each size is an exact prefix of the next, for every active type,
// metal and supported ammunition, and for the proposed Diamond tier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SIZES, ACTIVE, METAL, AMMO, variants, ladder, diamondLadder, check, identity } from '../tools/t17-ladder.mjs';
import * as D from '../js/data.js';

test('the ladder covers all eight active weapon types and every ammunition', () => {
  assert.deepEqual(ACTIVE.filter((id) => D.WEAPONS[id]), ACTIVE, 'every active id exists in the weapon data');
  assert.equal(ACTIVE.length, 8);
  assert.deepEqual(AMMO.sort(), Object.keys(D.WEAPONS2.ammo).sort());
  assert.equal(variants().length, 7 + AMMO.length, 'seven non-quiver types plus one Arrows variant per ammunition');
});

test('every ladder has exactly the die size in faces and each size is an exact prefix of the next', () => {
  for (const v of variants()) for (let r = 0; r < METAL.length; r++) {
    const l = ladder(v.id, r, v.ammo);
    for (const s of SIZES) assert.equal(l[s].length, s, `${v.id} ${v.ammo || ''} ${METAL[r]} d${s}`);
    assert.deepEqual(check(l), [], `${v.id} ${v.ammo || ''} ${METAL[r]}`);
    SIZES.slice(1).forEach((s, i) => { const p = l[SIZES[i]]; p.forEach((f, k) => assert.equal(identity(l[s][k]), identity(f), `${v.id} d${s} face ${k + 1}`)); });
  }
});

test('the check really fails on a ladder that is not cumulative', () => {
  const l = ladder('dagger', 1); const broken = { ...l, 8: [...l[8].slice(2), ...l[8].slice(0, 2)] };
  assert.ok(check(broken).length > 0, 'a reshuffled d8 is caught');
  const short = { ...l, 6: l[6].slice(1) }; assert.ok(check(short).some((p) => /faces/.test(p)), 'a wrong face count is caught');
});

test('a ladder keeps weapon identity: block weapons stay block weapons, Arrows keep their arrowhead faces for the chosen ammunition', () => {
  for (const r of [0, 1, 2]) { const l = ladder('shield', r); assert.ok(l[10].filter((f) => f.c === 'b').length >= l[10].filter((f) => f.c === 'r').length, 'the Round Shield is mostly block'); }
  for (const am of AMMO) if (am !== 'normal') { const l = ladder('quiver', 1, am); const heads = l[10].filter((f) => f.arrow); assert.ok(heads.length > 0 && heads.every((f) => f.arrow === am)); }
  assert.ok(!ladder('quiver', 1, 'normal')[10].some((f) => f.arrow), 'normal arrows have no arrowhead faces');
});

test('the proposed Diamond tier is a permanent ladder with the same counts and prefixes, for the one-handed active types', () => {
  for (const id of ['dagger', 'sword', 'axe', 'spear', 'shield', 'tower']) {
    const d = diamondLadder(id); for (const s of SIZES) assert.equal(d[s].length, s);
    assert.deepEqual(check(d), [], `${id} Diamond`);
    const g = ladder(id, 2); for (const s of SIZES) { g[s].forEach((f, k) => { assert.equal(f.c, d[s][k].c); assert.equal(f.v, d[s][k].v); }); }
  }
});

test('building a ladder never changes the weapon data (it only reads)', () => {
  const before = JSON.stringify(D.WEAPONS); ladder('dagger', 1); diamondLadder('sword'); assert.equal(JSON.stringify(D.WEAPONS), before);
});
