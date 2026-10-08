import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, newHero, evaluate, weaponFaces, makeWeapon, newBattle, resolve, equip, canEquip, forgeInfo, trainInfo,
  battleRewards, weaponValue, legendaryChance } from '../js/engine.js';
import { WEAPONS, LEGENDARY, tierName, modelOf } from '../js/data.js';

const board = (o) => {
  const b = {};
  for (const s of ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE']) b[s] = { v: 1, bound: false };
  for (const [k, v] of Object.entries(o)) b[k] = { v, bound: false };
  return b;
};
const knight = () => newHero({ name: 'K', cls: 'knight', seed: 1, full: true });

test('six legendaries, each borrowing an ordinary weapon\'s shape, about +10 at d4', () => {
  assert.equal(LEGENDARY.length, 6);
  for (const id of LEGENDARY) {
    const w = WEAPONS[id];
    assert.ok(WEAPONS[w.model] && !WEAPONS[w.model].legendary, `${id} borrows a real model`);
    assert.equal(modelOf(id), w.model); assert.equal(modelOf('sword'), 'sword');
    assert.ok(w.faces.reduce((a, f) => a + f.v, 0) >= 9, id);
    assert.equal(WEAPONS[w.model].hands, w.hands, `${id} has its model's hands`);
  }
  assert.equal(tierName({ id: 'dawnbreaker', rarity: 3 }), 'Legendary'); assert.equal(tierName({ id: 'sword', rarity: 3 }), 'Diamond');
});

test('a legendary\'s faces are fixed: no metal raise, no forging, but it can be trained a size up', () => {
  const inst = makeWeapon('oakheart', 3, makeRng(1));
  assert.deepEqual(weaponFaces(inst).map((f) => f.v), [1, 2, 3, 4]);
  assert.deepEqual(weaponFaces(inst)[2].fx, { heal: 2 });
  const h = knight(); h.gold = 9999; h.bag.push(inst);
  assert.equal(forgeInfo(h, inst.uid).why, 'legendary');
  h.strength.W = 6; const t = trainInfo(h, inst.uid); assert.ok(t.ok); assert.equal(t.next, 6);
  assert.equal(weaponValue(inst), WEAPONS.oakheart.price);
});

test('only one legendary in your hands at a time', () => {
  const h = knight(); const rng = makeRng(2);
  const dawn = makeWeapon('dawnbreaker', 3, rng); const oak = makeWeapon('oakheart', 3, rng); const fort = makeWeapon('fortune', 3, rng);
  h.bag.push(dawn, oak, fort);
  assert.ok(equip(h, dawn.uid, 'NW'));
  const no = canEquip(h, oak.uid, 'NE'); assert.equal(no.ok, false); assert.match(no.why, /Dawnbreaker/);
  assert.equal(equip(h, oak.uid, 'NE'), false); assert.ok(h.bag.includes(oak), 'a refused weapon stays in the pack');
  assert.ok(equip(h, fort.uid, 'NW'), 'swapping a legendary into the same hand is fine');
  assert.equal(h.loadout.NW.id, 'fortune'); assert.ok(h.bag.includes(dawn));
  const sf = makeWeapon('starfire', 3, rng); h.bag.push(sf);
  assert.ok(equip(h, sf.uid), 'a two-handed legendary fills both hands');
  assert.ok(equip(h, oak.uid, 'NE'), 'from a two-hander, any one legendary may go in');
});

test('Dawnbreaker\'s 4 hits every other monster for 2', () => {
  const h = knight(); const dawn = makeWeapon('dawnbreaker', 3, makeRng(3)); h.bag.push(dawn); equip(h, dawn.uid, 'NW');
  const q = { enemies: ['goblin', 'goblin', 'goblin'], hpMult: 3, flat: 0, rewardMult: 1, kind: 'battle', perilous: false };
  const b = newBattle(h, q, makeRng(4));
  b.board = board({ NW: 4, NE: 1, W: 1, E: 1, N: 1, C: 2, S: 3 });
  const ev = evaluate(h, b.board); assert.equal(ev.splash, 2);
  const hp0 = b.enemies.map((e) => e.hp);
  const rep = resolve(b, { target: 0 });
  assert.ok(b.enemies[1].hp === hp0[1] - 2 && b.enemies[2].hp === hp0[2] - 2, 'both others lose 2');
  assert.equal(rep.splashed.length, 2);
});

test('Twinfang\'s twin shot: bow and arrows on the same number add +3 attack', () => {
  const h = newHero({ name: 'R', cls: 'ranger', seed: 1, full: true }); const tw = makeWeapon('twinfang', 3, makeRng(5)); h.bag.push(tw); equip(h, tw.uid);
  assert.equal(h.loadout.NE.id, 'twinfang');
  const same = evaluate(h, board({ NW: 3, NE: 3, N: 1, C: 2, S: 4 })); const diff = evaluate(h, board({ NW: 3, NE: 2, N: 1, C: 2, S: 4 }));
  assert.equal(same.twinShot, 3); assert.ok(!diff.twinShot);
});

test('legendaries come only from elites and bosses, never one somebody already carries', () => {
  assert.equal(legendaryChance({ kind: 'battle' }), 0);
  assert.ok(legendaryChance({ kind: 'boss' }) > legendaryChance({ kind: 'elite' }));
  let found = 0; const N = 600;
  for (let s = 0; s < N; s++) {
    const h = newHero({ name: 'K', cls: 'knight', seed: 100 + s });
    const dawn = makeWeapon('dawnbreaker', 3, makeRng(s)); h.bag.push(dawn);
    const b = newBattle(h, { enemies: ['goblin'], hpMult: 1, flat: 0, rewardMult: 1, kind: 'boss', perilous: false }, makeRng(s));
    const legs = battleRewards(b).drops.filter((d) => WEAPONS[d.id].legendary);
    assert.ok(legs.every((d) => d.id !== 'dawnbreaker'));
    assert.ok(legs.every((d) => d.rarity === 3));
    found += legs.length;
  }
  assert.ok(found > N * 0.08 && found < N * 0.24, `about 15% of bosses (${found}/${N})`);
});
