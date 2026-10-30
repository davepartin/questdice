import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import * as T from '../js/table.js';
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

// ---- the Director's review fixtures (26 Oct): role copy facts, item-specific wording, blue-face pierce, legacy fallback, the table route
const mkw = (id, r, s, ammo) => { const x = E.makeWeapon(id, r, () => 0.5, s); if (ammo) x.ammo = ammo; return x; };
const withLadder = (fn) => { try { D.WEAPON_SIZE.ladder = L; D.WEAPON_SIZE.cumulative = true; return fn(); } finally { D.WEAPON_SIZE.ladder = null; D.WEAPON_SIZE.cumulative = false; } };
const kindsOf = (faces) => new Set(faces.flatMap((f) => Object.keys(f.fx || {})));

test('role copy facts: the Tower gives magic only, the Silver Dagger pierce only (its heal comes with Gold), Bronze is plain except arrowheads', () => {
  for (const m of METALS) assert.deepEqual([...kindsOf(facesOf('tower', m, 10))].sort(), m === 'Bronze' ? [] : ['magic'], `Tower ${m}`);
  assert.deepEqual([...kindsOf(facesOf('dagger', 'Silver', 10))], ['pierce']);
  assert.deepEqual([...kindsOf(facesOf('dagger', 'Gold', 10))].sort(), ['heal', 'pierce']);
  for (const id of Object.keys(ROLES)) assert.equal(kindsOf(facesOf(id, 'Bronze', 10, id === 'quiver' ? 'fire' : undefined)).size, 0, `${id} Bronze has no effects`);
  assert.deepEqual(facesOf('quiver', 'Bronze', 10, 'fire').filter((f) => f.arrow).map((f) => f.v), [3, 5, 7], 'special ammunition keeps its arrowheads at Bronze');
  assert.equal(facesOf('quiver', 'Bronze', 10, 'normal').filter((f) => f.arrow).length, 0);
});

test('item-specific: only an ordinary roster weapon the ladder serves says its faces stay; legacy, Diamond, legendary and Fists do not', () => {
  const diamond = { ...mkw('shield', 2, 8), diamond: true };
  const legend = mkw(D.LEGENDARY[0], 0, 4);
  assert.equal(E.servedByLadder(mkw('spear', 1, 6)), false, 'switch off: no item is served');
  withLadder(() => {
    for (const id of Object.keys(ROLES)) assert.equal(E.servedByLadder(mkw(id, 0, 4)), true, id);
    assert.equal(E.servedByLadder(mkw('quiver', 1, 8, 'frost')), true);
    for (const id of ['mace', 'longsword', 'staff', 'warhammer', 'bracer']) assert.equal(E.servedByLadder(mkw(id, 1, 6)), false, `${id} is outside the roster`);
    assert.equal(E.servedByLadder(diamond), false); assert.equal(E.servedByLadder(legend), false); assert.equal(E.servedByLadder({ id: 'fists', rarity: 0 }), false);
  });
});

test('retained legacy weapons keep today\'s faces with the switch on, and are still trainable', () => {
  for (const id of ['mace', 'bracer', 'longsword', 'staff', 'warhammer']) for (let r = 0; r < 3; r++) for (const s of [4, 6, 8, 10]) {
    const off = E.weaponFaces(mkw(id, r, s)).map(identity);
    withLadder(() => assert.deepEqual(E.weaponFaces(mkw(id, r, s)).map(identity), off, `${id} ${METALS[r]} d${s}`));
  }
  const h = E.newHero({ name: 'Legacy', cls: 'wizard', seed: 5 }); h.gold = 1000; const m = mkw('mace', 1, 4); h.bag = [m]; E.equip(h, m.uid, 'NW');
  withLadder(() => { const t = E.trainInfo(h, m.uid); assert.ok(t.ok, 'a Mace can still be bought up'); assert.ok(E.trainWeapon(h, m.uid, t.next)); assert.equal(E.weaponSize(m), 6); });
});

test('Spear blue faces pierce through a guard: the effect lands whatever the lane colour (evaluate and resolve)', () => {
  const run = (nw) => withLadder(() => {
    const h = E.newHero({ name: 'T', cls: 'knight', seed: 3 }); h.level = 8; h.strength = { W: 6, E: 6 };
    h.loadout.NW = mkw('spear', 1, 10); h.loadout.NE = mkw('shield', 0, 4); if (!h.dice.includes('NE')) h.dice.push('NE');
    const b = E.newBattle(h, E.questsFor(h)[0], E.makeRng(5), 1);
    b.script = { rolls: [{ NW: nw, NE: 1, W: 5, E: 5, N: 5, S: 5, C: 4 }] }; E.startRoll(b);
    const e = b.enemies[0]; e.intent = { ...e.intent, v: 'guard' }; e.mag = 999; e.arm = 0; // a guard no strike can pass
    const ev = E.evaluate(h, b.board); const hp0 = e.hp; E.resolve(b, { target: 0 });
    return { face: E.weaponFaces(h.loadout.NW)[nw - 1], lane: ev.lanes.L.color, pierce: ev.pierce, dealt: hp0 - e.hp };
  });
  const blueEffect = run(3); const blueBare = run(6);
  assert.equal(blueEffect.face.c, 'b'); assert.deepEqual(blueEffect.face.fx, { pierce: 1 }); assert.equal(blueEffect.lane, 'b', 'the lane guards');
  assert.equal(blueBare.face.c, 'b'); assert.equal(blueBare.face.fx, undefined);
  assert.equal(blueEffect.pierce - blueBare.pierce, 1, 'the blue face adds its pierce');
  assert.equal(blueEffect.dealt - blueBare.dealt, 1, 'and it lands through a guard that stops every strike');
});

test('co-op: with the candidate on, a table purchase buys the next size and every face a hero sees is the table\'s', () => {
  withLadder(() => {
    const table = T.createTable({ code: 'ROLE', seed: 5, name: 'Roles' });
    const a = T.joinTable(table, { name: 'Ada', cls: 'wizard', token: 'aaa' }).player;
    a.hero = E.newHero({ name: 'Ada', cls: 'wizard', seed: 5 }); a.hero.gold = 1000; table.phase = 'camp';
    const w = mkw('spear', 1, 4); a.hero.bag = [w]; E.equip(a.hero, w.uid, 'NW');
    const top = E.weaponFaces(mkw('spear', 1, 10)).map(identity);
    for (const [s, gold] of [[6, 950], [8, 850], [10, 650]]) {
      assert.equal(T.command(table, a.id, { type: 'op', op: 'trainWeapon', args: [w.uid, s] }).ok, true, `buy d${s}`);
      assert.equal(a.hero.gold, gold);
      const mine = E.weaponFaces(a.hero.loadout.NW).map(identity); assert.deepEqual(mine, top.slice(0, s), `d${s} is the first ${s} faces of the d10`);
    }
    const back = T.loadTable(T.saveTable(table)).players[0].hero.loadout.NW;
    assert.deepEqual(E.weaponFaces(back).map(identity), top, 'a saved and reloaded table rolls the same faces');
  });
});
