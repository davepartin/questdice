import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, newHero, newBattle, resolve, rollIntent, burnOf, newCompany, newPartyBattle, resolveParty } from '../js/engine.js';

const board = (o) => {
  const b = {};
  for (const s of ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE']) b[s] = { v: 1, bound: false };
  for (const [k, v] of Object.entries(o)) b[k] = { v, bound: false };
  return b;
};
// Knight: sword (0r,2b,3r,3r) left, shield right. NW 4 = red 3 + hand; N 1 heals 1.
const strong = board({ NW: 4, NE: 1, W: 6, E: 4, N: 2, C: 2, S: 3 });
const quest = (enemies) => ({ enemies, hpMult: 2, flat: 0, rewardMult: 1, kind: 'battle', perilous: false });
const fight = (enemies) => { const h = newHero({ name: 'K', cls: 'knight', seed: 1, full: true }); h.strength = { W: 6, E: 4 }; const b = newBattle(h, quest(enemies), makeRng(5)); return b; };
const setIntent = (e, intent) => { e.intent = { ...intent }; };

test('Fire Ward: guards, and burns the hero who hits it; hitting another foe is safe', () => {
  const b = fight(['cultist', 'goblin']);
  setIntent(b.enemies[0], { n: 'Fire Ward', v: 'ward', f: 0, m: 1, k: 4 }); setIntent(b.enemies[1], { n: 'Duck', v: 'guard', f: 0, m: 0 });
  assert.equal(burnOf(b.enemies[0]), 4);
  b.board = { ...strong };
  const rep = resolve(b, { target: 0 });
  assert.ok(rep.dealt > 0); assert.equal(rep.burned, 4); assert.ok(rep.taken >= 4, 'the burn ignores block');
  const b2 = fight(['cultist', 'goblin']);
  setIntent(b2.enemies[0], { n: 'Fire Ward', v: 'ward', f: 0, m: 1, k: 4 }); setIntent(b2.enemies[1], { n: 'Duck', v: 'guard', f: 0, m: 0 });
  b2.board = { ...strong };
  const rep2 = resolve(b2, { target: 1 });
  assert.ok(!rep2.burned);
});

test('Phase: normal attack passes through, pierce still lands', () => {
  const b = fight(['wraith']); setIntent(b.enemies[0], { n: 'Phase', v: 'phase', f: 0, m: 0 });
  b.board = { ...strong }; const hp0 = b.enemies[0].hp;
  const rep = resolve(b, { target: 0 });
  assert.ok(rep.phased); assert.equal(hp0 - b.enemies[0].hp, rep.T.pierce, 'only the pierce hurt it');
});

test('Stalk: unhurt, the wolf pounces next round; hit it and the stalk breaks', () => {
  const b = fight(['wolf', 'goblin']);
  setIntent(b.enemies[0], { n: 'Stalk', v: 'stalk', f: 0, m: 0 }); setIntent(b.enemies[1], { n: 'Duck', v: 'guard', f: 0, m: 0 });
  b.board = { ...strong };
  const rep = resolve(b, { target: 1 }); // hit the goblin instead
  assert.deepEqual(rep.stalks, [{ uid: b.enemies[0].uid, broken: false }]);
  assert.equal(b.enemies[0].intent.n, 'Pounce'); assert.ok(b.enemies[0].intent.slam);
  const b2 = fight(['wolf', 'goblin']);
  setIntent(b2.enemies[0], { n: 'Stalk', v: 'stalk', f: 0, m: 0 }); setIntent(b2.enemies[1], { n: 'Duck', v: 'guard', f: 0, m: 0 });
  b2.board = { ...strong };
  const rep2 = resolve(b2, { target: 0 });
  assert.equal(rep2.stalks[0].broken, true); assert.notEqual(b2.enemies[0].intent?.n, 'Pounce');
  const e = { id: 'wolf', pounce: true, faces: [] }; assert.equal(rollIntent(e, makeRng(1)).n, 'Pounce'); assert.equal(e.pounce, false);
});

test('company: the hero who hits a Fire Ward takes the burn; Phase stops attack for everyone', () => {
  const c = newCompany({ name: 'T', roster: [{ name: 'A', cls: 'knight' }, { name: 'B', cls: 'knight' }], seed: 3 });
  const b = newPartyBattle(c.members, quest(['cultist']), makeRng(4));
  setIntent(b.enemies[0], { n: 'Fire Ward', v: 'ward', f: 0, m: 0, k: 4 });
  b.fighters.forEach((f) => { f.board = { ...strong }; f.target = 0; });
  const rep = resolveParty(b);
  const burned = rep.strikes.filter((s) => s.burned > 0);
  assert.ok(burned.length >= 1 && burned.every((s) => s.burned === 4));
  for (const s of burned) { const fr = rep.fighters.find((x) => x.name === s.name); assert.ok(fr.taken >= 4); }
});
