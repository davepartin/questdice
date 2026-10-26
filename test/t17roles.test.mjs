import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import { ROLES, SIZES, METALS, AMMO, buildLadder, facesOf } from '../js/weaponladder.js';

applyRelease();
const L = buildLadder();
const identity = (f) => JSON.stringify({ c: f.c, v: f.v, fx: Object.fromEntries(Object.entries(f.fx || {}).sort()), arrow: f.arrow || null });

test('the candidate is off in the release: no ladder installed, switch off', () => {
  assert.equal(D.WEAPON_SIZE.cumulative, false);
  assert.equal(D.WEAPON_SIZE.ladder, null);
});

test('numbers run 1 to n in order at every size, metal and weapon', () => {
  for (const [key, byMetal] of Object.entries(L)) for (const m of METALS) for (const s of SIZES) {
    const faces = byMetal[m][s];
    assert.equal(faces.length, s, `${key} ${m} d${s} has ${s} faces`);
    assert.deepEqual(faces.map((f) => f.v), Array.from({ length: s }, (_, i) => i + 1), `${key} ${m} d${s} numbers`);
  }
});

test('cumulative: a bigger die keeps every earlier face exactly and adds two', () => {
  for (const [key, byMetal] of Object.entries(L)) for (const m of METALS) for (let i = 1; i < SIZES.length; i++) {
    const a = byMetal[m][SIZES[i - 1]]; const b = byMetal[m][SIZES[i]];
    assert.equal(b.length - a.length, 2, `${key} ${m} d${SIZES[i]} adds two faces`);
    a.forEach((f, k) => assert.equal(identity(b[k]), identity(f), `${key} ${m} d${SIZES[i]} keeps face ${k + 1}`));
  }
});

test('metal adds effects, never numbers or colours; Gold carries every effect Silver does', () => {
  for (const [key, byMetal] of Object.entries(L)) for (const s of SIZES) {
    const [br, si, go] = METALS.map((m) => byMetal[m][s]);
    br.forEach((f, k) => {
      assert.equal(si[k].v, f.v); assert.equal(go[k].v, f.v); assert.equal(si[k].c, f.c); assert.equal(go[k].c, f.c);
      assert.ok(!f.fx, `${key} Bronze is plain`);
      for (const [kind, n] of Object.entries(si[k].fx || {})) assert.ok((go[k].fx?.[kind] || 0) >= n, `${key} d${s} face ${k + 1}: Gold has Silver's ${kind}`);
    });
  }
});

test('every weapon has red and blue faces at every size (the Arrows are all attack, their Bow guards)', () => {
  for (const id of Object.keys(ROLES)) {
    if (id === 'quiver') continue;
    for (const s of SIZES) { const f = facesOf(id, 'Bronze', s); assert.ok(f.some((x) => x.c === 'r') && f.some((x) => x.c === 'b'), `${id} d${s}`); }
  }
});

test('the arrows keep their arrowheads: 1, 2, 3 and 3 by size, on the same numbers at every size', () => {
  for (const a of AMMO.filter((x) => x !== 'normal')) for (const m of METALS) {
    assert.deepEqual(SIZES.map((s) => L[`quiver:${a}`][m][s].filter((f) => f.arrow).length), [1, 2, 3, 3]);
    assert.deepEqual(L[`quiver:${a}`][m][10].filter((f) => f.arrow).map((f) => f.v), ROLES.quiver.heads);
  }
  assert.equal(L['quiver:normal'].Gold[10].filter((f) => f.arrow).length, 0);
});

test('weaponFaces reads the ladder only when the switch is on, and every size of one weapon is a prefix of its d10', () => {
  const w = (id, r, s, ammo) => { const x = E.makeWeapon(id, r, () => 0.5, s); if (ammo) x.ammo = ammo; return x; };
  const before = E.weaponFaces(w('spear', 2, 6)).map(identity);
  try {
    D.WEAPON_SIZE.ladder = L; D.WEAPON_SIZE.cumulative = true;
    for (const id of ['dagger', 'sword', 'axe', 'spear', 'shield', 'tower', 'bow']) for (let r = 0; r < 3; r++) {
      const top = E.weaponFaces(w(id, r, 10)).map(identity);
      for (const s of SIZES) assert.deepEqual(E.weaponFaces(w(id, r, s)).map(identity), top.slice(0, s), `${id} ${METALS[r]} d${s}`);
    }
    for (const a of AMMO) assert.deepEqual(E.weaponFaces(w('quiver', 1, 8, a)).map(identity), E.weaponFaces(w('quiver', 1, 10, a)).map(identity).slice(0, 8), `arrows ${a}`);
  } finally { D.WEAPON_SIZE.ladder = null; D.WEAPON_SIZE.cumulative = false; }
  assert.deepEqual(E.weaponFaces(w('spear', 2, 6)).map(identity), before, 'switch off: today\'s faces again');
});
