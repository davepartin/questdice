// The monster move die (Dave, 3 Nov 2026): identical moves sit on neighbouring numbers ("1–3 Slash"), and every move keeps its odds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';

applyRelease();
const key = (f) => JSON.stringify(f, Object.keys(f).sort());
const count = (faces) => faces.reduce((m, f) => m.set(key(f), (m.get(key(f)) || 0) + 1), new Map());
const all = Object.entries(D.MONSTERS).filter(([, m]) => Array.isArray(m.faces) && m.faces.length);

test('every monster keeps the same moves, each on as many faces as before', () => {
  for (const [id, m] of all) { const g = E.groupFaces(m.faces); assert.equal(g.length, m.faces.length, id); assert.deepEqual([...count(g)].sort(), [...count(m.faces)].sort(), id); }
  for (const [id, m] of all) if (m.rage?.faces) { const g = E.groupFaces(m.rage.faces); assert.deepEqual([...count(g)].sort(), [...count(m.rage.faces)].sort(), `${id} raged`); }
});

test('moves of one name are on neighbouring numbers (two Clubs a point apart count as Club)', () => {
  for (const [id, m] of all) { const g = E.groupFaces(m.faces); const seen = new Set(); let last = null;
    for (const f of g) { const k = `${f.n}|${f.v}`; if (k !== last) { assert.ok(!seen.has(k), `${id}: ${f.n} is split`); seen.add(k); } last = k; } }
  assert.deepEqual(E.groupFaces(D.MONSTERS.cultist.faces).map((f) => f.n).slice(0, 2), ['Tangle', 'Tangle'], 'the Ember Mage: 1–2 Tangle');
  const bone = E.groupFaces(D.MONSTERS.skeleton.faces).map((f) => f.n); assert.deepEqual(bone.slice(0, 3), ['Slash', 'Slash', 'Slash'], 'the Bone Soldier: 1–3 Slash');
});

test('a monster in play rolls on its grouped die, and remembers the face', () => {
  const e = E.spawnEnemy('skeleton', {}, E.makeRng(3)); assert.deepEqual(e.faces.map((f) => f.n).slice(0, 3), ['Slash', 'Slash', 'Slash']);
  const rng = E.makeRng(11); for (let i = 0; i < 40; i++) { E.rollIntent(e, rng); assert.ok(e.face >= 1 && e.face <= 6); assert.equal(e.intent.n, e.faces[e.face - 1].n); }
});
