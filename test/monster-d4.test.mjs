import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import { MONSTER_D4, fourMoves } from '../js/monster-d4.js';
import { CAMPAIGNS, monsterOf } from '../js/campaigns.js';
applyRelease();
const strength = (f, size) => E.isDamageIntent(f) ? f.f + f.m * (size + 1) / 2 : 0;

test('every released monster and rage has four moves, personality on 3 and largest blow on 4', () => {
  for (const [id, m] of Object.entries(D.MONSTERS)) for (const sheet of [m, m.rage].filter(Boolean)) {
    const faces = fourMoves(id, sheet, m); assert.equal(faces.length, 4, id);
    assert.ok(faces.every(f => f?.n && f.v && Number.isFinite(f.f) && Number.isFinite(f.m)), id);
    assert.ok(faces.every(f => f.v !== 'charge'), `${id}: Wind-Up belongs to its Special`);
    assert.ok(E.isDamageIntent(faces[0]) && E.isDamageIntent(faces[1]), `${id}: basics`);
    const power = sheet.power || m.power;
    assert.ok(E.isDamageIntent(faces[3]), id);
    assert.ok(faces.slice(0, 3).every(f => strength(f, power) < strength(faces[3], power)), `${id}: 4 is largest`);
  }
});

test('each D4 quarter selects exactly that face with one random draw, independently per monster', () => {
  for (const id of Object.keys(D.MONSTERS)) for (let face = 1; face <= 4; face++) {
    const e = E.spawnEnemy(id, {}, E.makeRng(7)); let calls = 0;
    E.rollIntent(e, () => { calls++; return (face - .5) / 4; });
    assert.equal(calls, 1, id); assert.equal(e.face, face, id); assert.deepEqual(e.intent, e.faces[face - 1]);
  }
});

test('Goblin and Wolf retain Dave’s four named moves; no two-die basic Lunge', () => {
  const spawn = id => E.spawnEnemy(id, {}, E.makeRng(1));
  assert.deepEqual(spawn('goblin').faces.map(f => f.n), ['Stab', 'Stab', 'Pilfer', 'Fire Bomb']);
  const wolf = spawn('wolf'); assert.deepEqual(wolf.faces.map(f => f.n), ['Bite', 'Lunge', 'Howl', 'Rend']);
  assert.equal(wolf.faces[1].m, 1);
});

test('a saved six-face round keeps its move until the next roll, then gets four valid faces', () => {
  const e = E.spawnEnemy('skeleton', {}, E.makeRng(1)); e.faces = D.MONSTERS.skeleton.faces;
  e.face = 6; e.intent = { ...e.faces[5] }; e.bag = [5]; e.bagOf = e.faces;
  const old = JSON.stringify(e); assert.equal(JSON.parse(old).face, 6);
  E.rollIntent(e, () => .99); assert.equal(e.faces.length, 4); assert.equal(e.face, 4); assert.equal(e.intent.n, 'Stab');
  const faces = e.faces; E.rollIntent(e, () => 0); assert.equal(e.faces, faces); assert.equal(e.face, 1);
});

test('all campaign monster overrides also use four faces, retaining their name and stats', () => {
  for (const pack of Object.values(CAMPAIGNS)) for (const id of new Set([...Object.keys(D.MONSTERS), ...Object.keys(pack.monsters || {})])) {
    const d = monsterOf(id, pack.id); if (!d) continue;
    const e = E.spawnEnemy(id, { campaign: pack.id }, E.makeRng(7));
    assert.equal(e.faces.length, 4, `${pack.id}/${id}`); assert.equal(e.name, d.name); assert.equal(e.maxHp, d.hp);
  }
});
const fight = id => {
  const h = E.newHero({ name: 'Four', cls: 'knight', seed: 7 }); h.campaign.act = 3;
  return E.newBattle(h, { id: 'test', name: 'Test', enemies: [id], kind: 'boss', step: 10 }, E.makeRng(4));
};
test('signature Specials replace, rather than duplicate, die summons and Wind-Up', () => {
  for (const id of ['lich', 'silkwood', 'hivequeen']) {
    const b = fight(id), e = b.enemies[0]; assert.equal(e.special.id, 'spawn'); assert.equal(e.special.minion, D.MONSTERS[id].adds);
    assert.ok(e.faces.every(f => f.v !== 'summon')); assert.equal(E.specialView(b, e).name, e.special.name);
  }
  const ogre = fight('ogre').enemies[0]; assert.equal(ogre.special.id, 'slam'); assert.ok(ogre.faces.every(f => f.v !== 'charge'));
});

test('Inferno is a counterable breath Special; the D4 retains four moves in both phases', () => {
  const b = fight('vharaxis'), e = b.enemies[0]; assert.equal(e.special.name, 'Inferno');
  assert.equal(e.intent.v, 'charge'); assert.match(E.specialView(b, e).bottom, /Inferno/);
  e.windup = true; E.rollIntent(e, () => .5); assert.equal(e.intent.n, 'Inferno'); assert.equal(e.intent.v, 'breath'); assert.equal(e.intent.double, true);
  assert.equal(e.face, null); // a scripted Special does not pretend it rolled a face
  assert.equal(fourMoves('vharaxis', e.rage, D.MONSTERS.vharaxis).length, 4);
});

test('D4 is a release switch: legacy comparison still uses historical six-face sheets', () => {
  try { MONSTER_D4.on = false; assert.equal(E.spawnEnemy('goblin', {}, E.makeRng(1)).faces.length, 6); }
  finally { MONSTER_D4.on = true; }
});
