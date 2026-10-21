import test from 'node:test';
import assert from 'node:assert/strict';
import { cardsOf, equipPower, learnPower, learnInfo, rerollDieInfo, buyRerollDie, rerollDiceOf, offerPerks,
  makeRng, newHero, evaluate, weaponFaces, makeWeapon, newBattle, startRoll, resolve, reroll, rerollInfo,
  playCard, nudge, gainXp, equip, isTwoHanded, questsFor, specialFace, maxHpOf,
  sidesOf, castPower, beginReset, recharge, powerUpgradeInfo, upgradePower, powerLevel, trainInfo, trainWeapon, forgeInfo, forgeWeapon, addTalent, removeTalent, isActive, activeSlots, unlockInfo, unlockDie,
  difficultyOf, withDifficulty, newPartyBattle, rollIntent, burnOf,
} from '../js/engine.js';
import { CLASSES, WEAPONS, MONSTERS, FORGE_COST, WEAPON_SIZE_STEPS, NUDGE_COST, TALENT_SLOT_COST, talentFaceCost, RES_BY_SIZE, FACE_PAY, DIFFICULTY, normalizeDifficulty } from '../js/data.js';

const board = (o) => {
  const b = {};
  for (const s of ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE']) b[s] = { v: 1, bound: false };
  for (const [k, v] of Object.entries(o)) b[k] = { v, bound: false };
  return b;
};
// Weapon die faces (index = v-1) for reference, Bronze d4: sword 0 2b 3 4 (red); shield 0 2r 3 4 (blue); bow 1 2 2b 3 (red).
const knight = () => newHero({ name: 'K', cls: 'knight', seed: 1, full: true });
const ranger = () => newHero({ name: 'R', cls: 'ranger', seed: 1, full: true });

test('weapon temperaments: steady never blank, balanced one blank, risky and brutal two at d4 and all one colour; brutal hits for its top most often', () => {
  const want = { steady: 0, balanced: 1, risky: 2, brutal: 2 };
  for (const [id, w] of Object.entries(WEAPONS)) {
    if (w.hidden || w.legendary) continue;
    assert.ok(w.temper in want, `${id} has a temperament`);
    const f = weaponFaces({ id, rarity: 1 }); const blanks = f.filter((x) => x.v === 0).length;
    assert.equal(blanks, want[w.temper], `${id} blanks`);
    if (w.temper === 'risky' || w.temper === 'brutal') assert.ok(f.every((x) => x.c === f[0].c), `${id} is all one colour`);
  }
  const hit = (x) => x.v + (x.plus || 0);
  const topCount = (id) => { const f = weaponFaces({ id, rarity: 1, size: 8 }); const m = Math.max(...f.map(hit)); return f.filter((x) => hit(x) === m).length; };
  assert.ok(topCount('mace') > topCount('spear') && topCount('spear') > topCount('sword'));
});

test('all-or-nothing weapons never show their top number twice: a doubled top drops a step with a +1 icon, same force', () => {
  const OLD = { risky: { 4: [0, 0, 4, 4], 6: [0, 0, 4, 5, 6, 6], 8: [0, 0, 0, 5, 6, 7, 8, 8], 10: [0, 0, 0, 6, 7, 8, 9, 9, 10, 10] },
    brutal: { 4: [0, 0, 4, 4], 6: [0, 0, 0, 6, 6, 6], 8: [0, 0, 0, 0, 7, 8, 8, 8], 10: [0, 0, 0, 0, 8, 9, 10, 10, 10, 10] } };
  for (const id of ['longsword', 'warhammer', 'spear', 'mace', 'tower']) {
    for (const size of [4, 6, 8, 10]) {
      const f = weaponFaces({ id, rarity: 2, size }); const top = Math.max(...f.map((x) => x.v));
      assert.equal(f.filter((x) => x.v === top).length, 1, `${id} d${size} shows its top once`);
      assert.equal(f.reduce((a, x) => a + x.v + (x.plus || 0), 0), OLD[WEAPONS[id].temper][size].reduce((a, v) => a + v, 0), `${id} d${size} hits as hard as before`);
    }
  }
  assert.deepEqual(weaponFaces({ id: 'longsword', rarity: 0 }).map((x) => [x.v, x.plus || 0]), [[0, 0], [0, 0], [3, 1], [4, 0]]);
  // the 3 with an icon hits for 4 but is a 3 for the Weapons Triple
  const h = knight(); const ls = { uid: 'ls', id: 'longsword', rarity: 0 }; h.bag.push(ls); assert.ok(equip(h, 'ls'));
  const plain = evaluate(h, board({ NW: 4, NE: 1, N: 1, C: 2 })); const iconed = evaluate(h, board({ NW: 3, NE: 1, N: 1, C: 2 }));
  assert.equal(iconed.atk, plain.atk, 'the 3 with an icon hits like the 4');
  assert.deepEqual(evaluate(h, board({ NW: 3, NE: 3, N: 3, C: 2 })).triples.map((t) => t.name), ['Weapons Triple'], 'three 3s: the icon face still counts as a 3');
  assert.equal(evaluate(h, board({ NW: 3, NE: 4, N: 4, C: 2 })).triples.length, 0, 'and not as a 4');
});

test('universal number language on head, hands and feet: 1 heal, 2 pierce, 3 magic, 4 gold (2 each); feet also set initiative', () => {
  const h = knight();
  const ev = evaluate(h, board({ N: 1, W: 2, E: 3, S: 4, C: 6, NW: 1, NE: 1 }));
  assert.equal(ev.heal, 3); assert.equal(ev.pierce, 2); assert.equal(ev.magic, 2); assert.equal(ev.gold, 2); assert.equal(ev.init, 4);
});

test('heart 1-4 adds +2 per matching head/hand/feet die; heart 5 and 6 add +4 to every blue / red weapon lane', () => {
  const h = knight();
  const ev = evaluate(h, board({ N: 2, W: 2, E: 3, S: 2, C: 2 }));
  assert.equal(ev.pierce, 3 * 2 + 3 * 2); // three 2s: 2 each, +2 amp each
  assert.equal(ev.magic, 2);
  const blue = evaluate(h, board({ NW: 4, W: 4, NE: 4, E: 4, C: 5 })); // NW red 4, NE blue 4
  assert.equal(blue.lanes.R.value, 4 + 4 + 4); assert.equal(blue.lanes.L.value, 4 + 4);
  const red = evaluate(h, board({ NW: 4, W: 4, NE: 4, E: 4, C: 6 }));
  assert.equal(red.lanes.L.value, 4 + 4 + 4); assert.equal(red.lanes.R.value, 4 + 4);
});

test('lane = weapon + strength; weapon color decides attack vs block', () => {
  const h = knight();
  // NW sword face 4 -> red 4; NE shield face 4 -> blue 4. hands 4 and 4.
  const ev = evaluate(h, board({ NW: 4, W: 4, NE: 4, E: 4, C: 3 }));
  assert.equal(ev.lanes.L.value, 4 + 4); assert.equal(ev.lanes.L.color, 'r');
  assert.equal(ev.lanes.R.color, 'b');
  assert.equal(ev.atk, 8); assert.equal(ev.block, 8);
});

test('talent die: 2x doubles that hand, a number face pays its number in its symbol', () => {
  const h = knight(); h.special.SW = 6; h.talent.SW = [['heal'], [], ['gold']]; // face 4 = heal, face 5 empty, face 6 = gold
  assert.equal(specialFace(h, 'SW', 1), null); assert.equal(specialFace(h, 'SW', 3), null);
  assert.equal(specialFace(h, 'SW', 2), 'X2'); assert.deepEqual(specialFace(h, 'SW', 4), ['heal']);
  assert.equal(specialFace(h, 'SW', 5), null); // not bought yet: it does nothing
  assert.deepEqual(specialFace(h, 'SW', 6), ['gold']);
  const ev = evaluate(h, board({ NW: 3, W: 3, SW: 2, SE: 2, E: 2, NE: 1, C: 3 })); // the sword's red 3; the 2x face
  assert.equal(ev.lanes.L.value, 3 + 3 + 3); // 2x adds the strength a second time
  const four = evaluate(h, board({ SW: 4, W: 3, NW: 1, C: 3 })); const five = evaluate(h, board({ SW: 5, W: 3, NW: 1, C: 3 }));
  assert.equal(four.heal - five.heal, 4); // face 4 pays 4 heal, whatever the hand rolled
  for (const W of [1, 4]) assert.equal(evaluate(h, board({ SW: 6, W, NW: 1, C: 3 })).gold - evaluate(h, board({ SW: 5, W, NW: 1, C: 3 })).gold, 6); // face 6 pays 6 gold, hand or no hand
});

test('talent faces are bought one at a time, dearer the bigger the number, two of a symbol at most, never pierce', () => {
  const h = knight(); h.gold = 1000; h.special.SW = 6; h.talent.SW = [[], [], []];
  assert.ok(addTalent(h, 'SW', 0, 'atk')); assert.equal(h.gold, 1000 - talentFaceCost(4)); // face 4
  assert.ok(addTalent(h, 'SW', 1, 'atk')); assert.equal(h.gold, 1000 - talentFaceCost(4) - talentFaceCost(5)); // face 5, the same symbol again
  assert.equal(addTalent(h, 'SW', 2, 'atk'), false, 'a third attack on the die is not allowed');
  assert.equal(addTalent(h, 'SW', 0, 'heal'), false, 'a face with a symbol must be cleared first');
  assert.equal(addTalent(h, 'SW', 2, 'pierce'), false, 'pierce is never on a talent die');
  assert.ok(talentFaceCost(5) > talentFaceCost(4) && talentFaceCost(6) > talentFaceCost(5));
  const g = h.gold; assert.ok(addTalent(h, 'SW', 2, 'magic')); assert.equal(h.gold, g - talentFaceCost(6));
  const poor = knight(); poor.gold = 0; assert.equal(addTalent(poor, 'SE', 0, 'gold'), false);
  assert.ok(removeTalent(h, 'SW', 0)); assert.ok(addTalent(h, 'SW', 0, 'block')); // clear a face and pick again (paying again)
});

test('a bigger talent die brings new empty faces that do nothing until bought', async () => {
  const { upgradeDie } = await import('../js/engine.js');
  const h = knight(); h.gold = 9999; h.level = 20; h.special.SW = 4; h.talent.SW = [['atk']]; // the class's free face 4
  assert.ok(upgradeDie(h, 'special', 'SW')); assert.equal(h.special.SW, 6);
  assert.deepEqual(specialFace(h, 'SW', 4), ['atk']);
  assert.equal(specialFace(h, 'SW', 5), null); assert.equal(specialFace(h, 'SW', 6), null);
  assert.ok(addTalent(h, 'SW', 2, 'magic')); assert.deepEqual(specialFace(h, 'SW', 6), ['magic']);
});

test('rerolls: three dice, three free then three paid at one magic a die', () => {
  const h = knight(); const b = newBattle(h, questsFor(h)[0], makeRng(3), 1); startRoll(b);
  b.magic = 5; const slots = ['NW', 'N', 'W'];
  for (let i = 0; i < 3; i++) { assert.equal(rerollInfo(b).kind, 'free'); assert.equal(rerollInfo(b).dice, 3); assert.ok(reroll(b, slots)); }
  assert.equal(b.magic, 5); assert.equal(rerollInfo(b).kind, 'paid');
  assert.equal(reroll(b, [...slots, 'S']), false, 'four dice is one too many');
  assert.ok(reroll(b, slots)); assert.equal(b.magic, 2); assert.equal(reroll(b, slots), false); // not enough magic
  assert.equal(reroll(b, slots.slice(0, 1)), true);
});

test('the 4th reroll die is bought once at camp for 200 gold; Quick Hands is no longer offered', () => {
  const h = knight(); h.gold = 199;
  assert.equal(rerollDieInfo(h).why, 'Need gold'); assert.equal(buyRerollDie(h), false);
  h.gold = 250; assert.ok(buyRerollDie(h)); assert.equal(h.gold, 50); assert.equal(rerollDiceOf(h), 4);
  assert.equal(rerollDieInfo(h).why, 'Max'); assert.equal(buyRerollDie(h), false);
  const b = newBattle(h, questsFor(h)[0], makeRng(3), 1); startRoll(b); assert.equal(rerollInfo(b).dice, 4);
  for (let s = 0; s < 40; s++) assert.ok(!offerPerks(knight(), makeRng(s)).includes('quick'));
  const old = knight(); old.perks = ['quick', 'quick']; assert.equal(rerollDiceOf(old), 4, 'older heroes with Quick Hands keep one extra die, capped at 4');
});

test('heart 5 / 6 pump the best lane of the matching color', () => {
  const h = knight();
  const base = evaluate(h, board({ NW: 3, W: 2, NE: 3, E: 2, C: 3 }));
  const six = evaluate(h, board({ NW: 3, W: 2, NE: 3, E: 2, C: 6 }));
  assert.equal(six.atk - base.atk, 4);
  const five = evaluate(h, board({ NW: 3, W: 2, NE: 3, E: 2, C: 5 }));
  assert.equal(five.block - base.block, 4);
});

test('triples: top row and middle row give +10 attack each; head-heart-feet gives +10 block', () => {
  const r = ranger();
  // bow faces: 0, r2, b3, r4. Head 2 matches both weapon 2s.
  const hit = evaluate(r, board({ NW: 2, N: 2, NE: 2, C: 6 }));
  assert.equal(hit.offense3, true);
  assert.deepEqual(hit.triples.map((t) => t.name), ['Weapons Triple']);
  const miss = evaluate(r, board({ NW: 3, N: 2, NE: 4, C: 6 }));
  assert.equal(miss.offense3, false);
  const k = knight();
  const base = evaluate(k, board({ W: 1, C: 2, E: 1 }));
  const mid = evaluate(k, board({ W: 1, C: 1, E: 1 }));
  assert.ok(mid.triples.some((t) => t.name === 'Strength Triple'), 'three 1s across the middle row is a triple');
  assert.equal(mid.atk - base.atk, 10, 'the middle-row triple adds 10 attack');
  const v = evaluate(k, board({ N: 3, C: 3, S: 3, NW: 1, NE: 1 }));
  assert.equal(v.defense3, true);
  assert.ok(v.block >= 10);
});

test('Talent Triple: talent, feet, talent on the same number across the bottom row is +10 attack; a talent blank never matches', () => {
  const h = knight(); h.special = { SW: 6, SE: 6 }; h.speed = { S: 6 }; h.talent = { SW: [], SE: [] };
  const base = evaluate(h, board({ SW: 5, S: 4, SE: 5, NW: 1, NE: 1, C: 6 }));
  const hit = evaluate(h, board({ SW: 5, S: 5, SE: 5, NW: 1, NE: 1, C: 6 }));
  assert.deepEqual(hit.triples.map((t) => t.name), ['Talent Triple']);
  assert.deepEqual(hit.triples[0].slots, ['SW', 'S', 'SE']);
  assert.ok(hit.atk >= base.atk + 10);
  assert.deepEqual(evaluate(h, board({ SW: 2, S: 2, SE: 2, NW: 1, NE: 1, C: 6 })).triples.map((t) => t.name), ['Talent Triple'], 'the 2x faces count as 2s');
  assert.equal(evaluate(h, board({ SW: 3, S: 3, SE: 3, NW: 1, NE: 1, C: 6 })).triples.length, 0, 'a talent blank (face 3) is not a 3');
});

test('Guard Triples: a side column (weapon +N, hand, talent) on the same number is +10 block; blanks never match', async () => {
  const h = knight(); h.special = { SW: 6, SE: 6 }; h.talent = { SW: [], SE: [] }; // sword d4: 0, 2, 3, 4; shield d4: 0, 2, 3, 4
  const names = (b) => evaluate(h, board(b)).triples.map((t) => t.name);
  const rest = { N: 1, C: 6, S: 2 }; // no row or middle-column triple
  const base = evaluate(h, board({ ...rest, NW: 4, W: 4, SW: 5, NE: 1, E: 1, SE: 5 }));
  const left = evaluate(h, board({ ...rest, NW: 4, W: 4, SW: 4, NE: 1, E: 1, SE: 5 }));
  assert.deepEqual(left.triples.map((t) => t.name), ['Left Guard Triple']);
  assert.deepEqual(left.triples[0].slots, ['NW', 'W', 'SW']);
  assert.equal(left.defense3, true); assert.equal(left.offense3, false);
  assert.equal(left.block - base.block, 10, 'the left column adds 10 block');
  assert.deepEqual(names({ ...rest, NW: 1, W: 1, SW: 5, NE: 4, E: 4, SE: 4 }), ['Right Guard Triple']);
  assert.deepEqual(names({ ...rest, NW: 4, W: 4, SW: 4, NE: 4, E: 4, SE: 4, C: 5 }), ['Left Guard Triple', 'Right Guard Triple'], 'both sides at once');
  assert.deepEqual(names({ ...rest, NW: 2, W: 2, SW: 2, NE: 1, E: 1, SE: 5 }), ['Left Guard Triple'], 'the 2x counts as a 2');
  assert.deepEqual(names({ ...rest, NW: 3, W: 3, SW: 3, NE: 1, E: 1, SE: 5 }), [], 'a talent blank (face 3) is not a 3');
  assert.deepEqual(names({ ...rest, NW: 1, W: 1, SW: 1, NE: 1, E: 1, SE: 1 }), [], 'a +0 weapon never matches');
  const E = await import('../js/engine.js'); const fang = knight(); Object.assign(fang, { special: h.special, talent: h.talent }); assert.ok(E.takeCharm(fang, 'fang'));
  const lf = evaluate(fang, board({ ...rest, NW: 4, W: 4, SW: 4, NE: 1, E: 1, SE: 5 }));
  assert.equal(lf.block - base.block, 20, 'Wolf Fang: +20'); assert.equal(lf.triples[0].bonus, 20);
});

test('triples pay 10 / 15 / 20 in Act I / II / III, attack and block alike; Wolf Fang doubles that', async () => {
  const E = await import('../js/engine.js');
  const at = (act, fang = false) => { const h = knight(); h.campaign.act = act; if (fang) assert.ok(E.takeCharm(h, 'fang')); return h; };
  const gain = (h, b, base, k) => evaluate(h, board(b))[k] - evaluate(h, board(base))[k];
  const strength = [{ W: 1, C: 1, E: 1 }, { W: 1, C: 2, E: 1 }]; // the middle row: attack
  const headtoe = [{ N: 3, C: 3, S: 3, NW: 1, NE: 1 }, { N: 3, C: 2, S: 3, NW: 1, NE: 1 }]; // down the middle: block
  for (const [act, want] of [[1, 10], [2, 15], [3, 20]]) {
    assert.equal(gain(at(act), ...strength, 'atk'), want, `Act ${act} attack triple`);
    assert.equal(gain(at(act), ...headtoe, 'block'), want, `Act ${act} block triple`);
    assert.equal(evaluate(at(act), board(strength[0])).triples[0].bonus, want);
    assert.equal(E.tripleBonus(at(act)), want);
  }
  assert.equal(gain(at(2, true), ...strength, 'atk'), 30, 'Wolf Fang in Act II');
  assert.equal(gain(at(3, true), ...headtoe, 'block'), 40, 'Wolf Fang in Act III');
});

test('the battle gold chip climbs round by round and ends on what victory pays', async () => {
  const E = await import('../js/engine.js');
  for (const seed of [3, 4, 5, 6]) {
    const h = newHero({ name: 'G', cls: 'bard', seed, full: true }); h.strength = { W: 8, E: 8 };
    const b = newBattle(h, questsFor(h)[0], makeRng(seed), 1);
    let rounds = 0; const seen = [E.battleGoldSoFar(b)];
    while (!b.outcome && rounds++ < 40) { startRoll(b); resolve(b, { target: b.enemies.findIndex((e) => e.hp > 0) }); seen.push(E.battleGoldSoFar(b)); }
    if (b.outcome !== 'victory' || b.enemies.some((e) => e.fled)) continue;
    assert.equal(seen.at(-1), E.battleRewards(b).gold, 'the chip ends where the reward lands');
    assert.ok(seen.at(-1) > seen[0], 'gold came in during the fight');
  }
});

test('straights need 5 in a row across the seven numeric dice; blanks never count; cash for gold', async () => {
  const { STRAIGHT_MIN } = await import('../js/data.js'); const keep = STRAIGHT_MIN[6];
  const r = ranger(); r.strength.E = 6; // a d6 hand can show a 5
  assert.equal(evaluate(r, board({ N: 1, S: 2, C: 3, W: 4, E: 5, NW: 1, NE: 1 })).straight, 0, 'with a d6 die a straight needs six in a row now');
  STRAIGHT_MIN[6] = 5; // the rest checks how a five-run is read and paid
  // head1 feet2 heart3 left-hand4 right-hand5 -> 1,2,3,4,5 (the bow's face 1 is a 1 too)
  const b = board({ N: 1, S: 2, C: 3, W: 4, E: 5, NW: 1, NE: 1 });
  const atk = evaluate(r, b, { straight: 'atk' });
  const gold = evaluate(r, b, { straight: 'gold' });
  assert.equal(atk.straight, 5); assert.equal(atk.straightBonus, 10);
  assert.deepEqual(atk.straightSlots, ['NW', 'S', 'C', 'W', 'E'], 'one die per number, low to high (for the magenta glow); the bow’s 1 comes first on the board');
  assert.equal(atk.atk - gold.atk, 10);
  assert.equal(gold.gold - atk.gold, 10);
  // a 1-2-3-4 is only four long: no payout
  assert.equal(evaluate(ranger(), board({ N: 1, S: 2, C: 3, W: 4, E: 4, NW: 1, NE: 1 })).straight, 0);
  assert.equal(evaluate(ranger(), board({ N: 1, S: 2, C: 3, W: 4, E: 4, NW: 1, NE: 1 })).straightSlots, undefined);
  STRAIGHT_MIN[6] = keep;
});

test('honest dice: a dN never shows more than N; size is the range, metal adds the icons (Bronze is a little dull from a d6 up)', () => {
  const faces = (id, size, r) => weaponFaces({ id, rarity: r, size });
  const zeros = (f) => f.filter((x) => x.v === 0).length;
  const iconSum = (f) => f.reduce((a, x) => a + Object.values(x.fx || {}).reduce((p, q) => p + q, 0), 0);
  for (const [id, w] of Object.entries(WEAPONS)) {
    if (w.hidden || w.legendary) continue;
    for (const size of [4, 6, 8, 10]) {
      const all = [0, 1, 2].map((r) => faces(id, size, r));
      for (const f of all) { assert.equal(f.length, size); assert.ok(f.every((x) => x.v >= 0 && x.v <= size), `${id} d${size} is honest`); }
      for (let r = 1; r < 3; r++) assert.ok(iconSum(all[r]) > iconSum(all[r - 1]), `${id} d${size}: metal ${r} adds icons`);
      if (size >= 6) assert.equal(zeros(all[0]), zeros(all[1]) + (w.temper === 'brutal' ? 0 : 1), `${id} d${size}: Bronze has one chipped face that metal mends`);
      assert.ok(all[2].every((x) => x.v === 0 || x.fx), `${id} d${size}: Gold has an icon on every number`);
      assert.equal(Math.max(...all[2].map((x) => Object.values(x.fx || {})[0] || 0)), 3, `${id} d${size}: the Gold crit carries three icons`);
    }
  }
  // a bigger die is a bigger weapon: its own colour averages more a roll
  const avg = (id, size) => { const f = faces(id, size, 1); const c = f.find((x) => x.v > 0 && x.fx)?.c; return f.filter((x) => x.c === c).reduce((a, x) => a + x.v, 0) / f.length; };
  for (const id of ['dagger', 'sword', 'spear', 'mace']) for (const [a, b] of [[4, 6], [6, 8], [8, 10]]) assert.ok(avg(id, b) > avg(id, a), `${id} d${b} beats d${a}`);
});

test('a weapon die is as big as its size, capped by the hand that holds it', () => {
  const h = newHero({ name: 'T', cls: 'knight', seed: 1 }); h.strength = { W: 4, E: 4 };
  assert.equal(sidesOf(h, 'NW'), 4);
  h.loadout.NW.size = 6; // bigger weapon, small hand: still a d4
  assert.equal(sidesOf(h, 'NW'), 4);
  assert.deepEqual(weaponFaces(h.loadout.NW, sidesOf(h, 'NW')), weaponFaces({ ...h.loadout.NW, size: 4 }), 'in a d4 hand it rolls, and is built, as a d4');
  h.strength.W = 6;
  assert.equal(sidesOf(h, 'NW'), 6);
  assert.equal(sidesOf(h, 'NE'), 4); // the other lane is untouched
  assert.equal(weaponFaces(h.loadout.NW, sidesOf(h, 'NW')).length, 6);
});

test('weapons are what you find or buy: forging and training are retired (wear, Oct 2026)', () => {
  const h = newHero({ name: 'T', cls: 'knight', seed: 1 }); h.gold = 9999; const uid = h.loadout.NW.uid; h.strength.W = 8;
  assert.equal(forgeInfo(h, uid).ok, false); assert.equal(forgeWeapon(h, uid), false);
  assert.equal(trainInfo(h, uid).ok, false); assert.equal(trainWeapon(h, uid), false);
  assert.equal(h.gold, 9999); assert.equal(h.loadout.NW.rarity, 0); void WEAPON_SIZE_STEPS; void FORGE_COST;
});

test('a weapon lasts its battles (Bronze 4, Silver 6, Gold 8), then breaks after the fight; the hand is empty', async () => {
  const E = await import('../js/engine.js');
  const h = newHero({ name: 'W', cls: 'knight', seed: 1 }); const sword = h.loadout.NW; const shield = h.loadout.NE;
  assert.equal(E.battlesLeft(sword), 4);
  const spare = makeWeapon('dagger', 2, makeRng(3)); h.bag.push(spare); assert.equal(E.battlesLeft(spare), 8);
  for (let i = 0; i < 3; i++) E.shatterDiamonds(h);
  assert.equal(E.battlesLeft(h.loadout.NW), 1, 'three battles used'); assert.equal(E.battlesLeft(spare), 8, 'a weapon in the pack rests');
  assert.equal(h.justBroke, undefined);
  E.shatterDiamonds(h);
  assert.equal(h.loadout.NW.id, 'fists'); assert.equal(h.loadout.NE.id, 'fists', 'the shield broke the same battle');
  assert.deepEqual(h.justBroke.map((w) => w.id), [sword.id, shield.id]);
  assert.ok(h.bag.includes(spare), 'the pack is untouched: equip the spare at camp');
});

test('a two-hander counts once and breaks whole; with empty hands and an empty pack a plain Bronze weapon waits', async () => {
  const E = await import('../js/engine.js');
  const r = newHero({ name: 'R', cls: 'ranger', seed: 1 }); assert.equal(r.loadout.NE.twin, true);
  for (let i = 0; i < 3; i++) E.shatterDiamonds(r);
  assert.equal(E.battlesLeft(r.loadout.NW), 1); assert.equal(E.battlesLeft(r.loadout.NE), 1, 'the arrows keep step with the bow');
  E.shatterDiamonds(r);
  assert.equal(r.justBroke.length, 1, 'one weapon, not two');
  assert.equal(r.loadout.NW.id, 'bow', 'nothing in the pack: a plain Bronze bow waits'); assert.equal(r.loadout.NW.rarity, 0);
  assert.equal(E.battlesLeft(r.loadout.NW), 4);
});

test('a hand that held a Diamond does not wear its own weapon; a worn weapon sells for less', async () => {
  const E = await import('../js/engine.js');
  const h = newHero({ name: 'D', cls: 'knight', seed: 2 }); const own = h.loadout.NW;
  const d = E.makeDiamond(makeRng(4), 1); E.takeDiamond(h, d); E.armDiamond(h, d.uid, 'NW'); E.wieldDiamonds(h);
  E.shatterDiamonds(h);
  assert.equal(h.loadout.NW, own); assert.equal(E.battlesLeft(own), 4, 'set aside for the Diamond, so it rested');
  assert.equal(E.battlesLeft(h.loadout.NE), 3, 'the shield fought');
  const g = makeWeapon('sword', 2, makeRng(5)); const full = E.sellValue(g); g.left = 4;
  assert.equal(E.sellValue(g), Math.round(E.weaponValue(g) * 0.5 * 4 / 8)); assert.ok(E.sellValue(g) < full);
});

test('spoils are mostly Bronze, a boss leaves at least Silver; the store sells one Bronze, two Silver and one Gold', async () => {
  const E = await import('../js/engine.js');
  const h = newHero({ name: 'S', cls: 'knight', seed: 9 });
  const metal = [0, 0, 0]; const rng = makeRng(11);
  for (let i = 0; i < 400; i++) for (const w of E.rollDrops(rng, 2, { weights: [85, 13, 2] })) metal[w.rarity]++;
  assert.ok(metal[0] > 600 && metal[2] < 40, `spoils metal ${metal}`);
  for (let s = 1; s <= 6; s++) { h.campaign.step = s; h.campaign.shop = null;
    const items = E.shopStock(h).filter((it) => !it.inst.diamond && it.inst.rarity < 3);
    if (items.length === 4) assert.deepEqual(items.map((it) => it.inst.rarity), [0, 1, 1, 2]); }
});

function duel(hero, enemyId, intent, boardSpec, opts = {}) {
  const quest = { enemies: [enemyId], hpMult: opts.hpMult ?? 1, flat: 0, rewardMult: 1, kind: 'battle' };
  const b = newBattle(hero, quest, makeRng(7), 1);
  startRoll(b);
  b.board = board(boardSpec);
  b.enemies[0].intent = intent;
  return b;
}

test('pierce ignores a monster guard; plain attack does not', () => {
  const h = knight();
  const guard = { n: 'Duck', v: 'guard', f: 5, m: 0 };
  const b = duel(h, 'goblin', guard, { NW: 4, W: 4, C: 6, NE: 1, E: 1, N: 4, S: 4 });
  const e = b.enemies[0]; const hp = e.hp;
  const rep = resolve(b, { target: 0 });
  assert.equal(rep.guarded, 5);
  assert.equal(hp - e.hp, Math.max(0, rep.T.atk - 5) + rep.T.pierce);
});

test('block absorbs strikes but not pierce', () => {
  const h = knight();
  const b = duel(h, 'goblin', { n: 'Stab', v: 'strike', f: 6, m: 0 }, { NW: 1, W: 1, NE: 4, E: 4, C: 3, N: 4, S: 4 });
  b.enemies[0].hp = 999; b.enemies[0].maxHp = 999;
  const hp0 = b.hp;
  const rep = resolve(b, {});
  assert.equal(rep.taken, Math.max(0, 6 - rep.T.block));
  assert.equal(b.hp, hp0 - rep.taken + 0 > b.maxHp ? b.maxHp : hp0 - rep.taken + rep.healed);
  const b2 = duel(h, 'goblin', { n: 'Bomb', v: 'pierce', f: 6, m: 0 }, { NW: 1, W: 1, NE: 4, E: 4, C: 3, N: 4, S: 4 });
  b2.enemies[0].hp = 999; b2.enemies[0].maxHp = 999;
  assert.equal(resolve(b2, {}).taken, 6);
});

test('a killed monster does not strike back', () => {
  const h = knight();
  const b = duel(h, 'goblin', { n: 'Stab', v: 'strike', f: 9, m: 0 }, { NW: 4, W: 4, NE: 4, E: 4, C: 6, N: 4, S: 4 }, { hpMult: 0.1 });
  const rep = resolve(b, {});
  assert.equal(b.outcome, 'victory'); assert.equal(rep.taken, 0);
});

test('no Last Stand: lethal damage means defeat', () => {
  const h = knight();
  const b = duel(h, 'ogre', { n: 'Stab', v: 'strike', f: 500, m: 0 }, { NW: 1, W: 1, NE: 1, E: 1, C: 3, N: 4, S: 4 });
  const rep = resolve(b, {});
  assert.equal(rep.lastStand, undefined); assert.equal(b.hp, 0); assert.equal(b.outcome, 'defeat');
});

test('a wind-up cannot be broken by damage: the next round is always a Slam', () => {
  const h = knight();
  const wind = { n: 'Wind-Up', v: 'charge', f: 0, m: 0 };
  const big = duel(h, 'ogre', wind, { NW: 4, W: 4, NE: 1, E: 1, C: 6, N: 4, S: 4 });
  big.enemies[0].hp = big.enemies[0].maxHp = 9999;
  resolve(big, {});
  assert.equal(big.enemies[0].intent.n, 'Slam'); assert.equal(big.enemies[0].intent.slam, true);
});

test('rerolls: first action is free, later actions cost 1 Magic per die, bound dice are locked', () => {
  const h = knight();
  const b = newBattle(h, questsFor(h)[0], makeRng(2), 1);
  startRoll(b);
  b.board.N.bound = false;
  const m0 = b.magic;
  assert.equal(rerollInfo(b).kind, 'free');
  assert.ok(reroll(b, ['N', 'S', 'W']));
  assert.equal(b.magic, m0);
  reroll(b, ['N']); reroll(b, ['N']); // three free actions in all
  assert.equal(rerollInfo(b).kind, 'paid');
  assert.ok(reroll(b, ['N', 'S']));
  assert.equal(b.magic, m0 - 2);
  b.board.W.bound = true;
  assert.equal(reroll(b, ['W']), false);
  assert.equal(reroll(b, ['N', 'S', 'E', 'C']), false, 'a Knight rerolls at most 3 dice per action');
});

test('powers spend Magic and work once per battle; at-will powers return every round', () => {
  const h = knight();
  const b = newBattle(h, questsFor(h)[0], makeRng(2), 1);
  startRoll(b); b.magic = 5;
  const r = castPower(b, 'cleave'); assert.ok(r); assert.equal(b.magic, 3); assert.equal(r.rolls.length, 2);
  assert.equal(b.mods.atk, r.total); assert.equal(b.mods.splash, Math.floor(r.total / 2));
  assert.equal(castPower(b, 'cleave'), null);
  assert.ok(castPower(b, 'shieldwall')); assert.equal(b.mods.block, 4); assert.equal(castPower(b, 'shieldwall'), null); // once a round
  beginReset(b); startRoll(b); assert.ok(castPower(b, 'shieldwall')); // back next round
  const w = newHero({ name: 'W', cls: 'ranger', seed: 3, full: true });
  const b2 = newBattle(w, questsFor(w)[0], makeRng(2), 1); startRoll(b2); b2.magic = 3;
  assert.ok(playCard(b2, 'quickdraw')); assert.equal(rerollInfo(b2).kind, 'card');
  const before = b2.magic; assert.ok(reroll(b2, ['N', 'S'])); assert.equal(b2.magic, before);
});

test('scale powers: more magic, more dice; round powers grow; supers wait for round 3, hit everyone and cannot be recharged', () => {
  const r = ranger(); r.level = 8;
  const b = newBattle(r, questsFor(r)[0], makeRng(4), 1); startRoll(b); b.magic = 12;
  const a = castPower(b, 'aimed', { x: 5 }); assert.equal(a.rolls.length, 4); assert.equal(b.magic, 8); // up to 4d6 now: pierce is a little weaker than attack, since nothing blocks it
   assert.equal(b.mods.pierce, a.total);
  assert.equal(castPower(b, 'rain'), null); // not in a slot
  r.learned = ['rain']; r.powers = { A: 'rain' }; const br = newBattle(r, questsFor(r)[0], makeRng(4), 1); startRoll(br); br.magic = 12;
  assert.equal(castPower(br, 'rain'), null); // round 1: too early
  const k = knight(); k.level = 8; k.powerLevel = { cleave: 2 };
  const b1 = newBattle(k, questsFor(k)[0], makeRng(4), 1); startRoll(b1); b1.magic = 12;
  assert.equal(castPower(b1, 'cleave').rolls.length, 4); // 2 dice + 2 levels
  k.learned = ['judgment']; k.powers = { A: 'judgment' };
  const b2 = newBattle(k, { ...questsFor(k)[0], enemies: ['goblin', 'goblin', 'wolf'] }, makeRng(4), 1);
  beginReset(b2); beginReset(b2); beginReset(b2); startRoll(b2); b2.magic = 12; // round 3
  assert.ok(castPower(b2, 'judgment')); assert.equal(b2.mods.aoe, Math.round(12 * 1.25 * 0 + 12 * (1 + 0.25 * 0)));
  b2.board.NW.v = 1; const hp0 = b2.enemies.map((e) => e.hp);
  const rep = resolve(b2, { target: 0 });
  assert.ok(rep.splashed.length >= 2 && b2.enemies.slice(1).every((e, i) => e.hp < hp0[i + 1] || e.hp === 0), 'every other monster takes area damage');
  b2.used.judgment = true; b2.magic = 12; assert.equal(recharge(b2, 'judgment'), false);
});

test('power upgrades cost gold and make numbers and dice bigger', () => {
  const h = knight(); h.gold = 500;
  assert.equal(powerUpgradeInfo(h, 'cleave').cost, 60); assert.ok(upgradePower(h, 'cleave')); assert.equal(h.gold, 440);
  assert.ok(upgradePower(h, 'cleave')); assert.ok(upgradePower(h, 'cleave'), 'a third level for every class'); assert.equal(upgradePower(h, 'cleave'), false); assert.equal(powerLevel(h, 'cleave'), 3);
  assert.equal(upgradePower(h, 'nonsense'), false);
});

test('powers: three slots, a start power in each, learn another at camp and swap it in; charges release any effect', () => {
  for (const [id, c] of Object.entries(CLASSES)) for (const slot of ['A', 'B', 'C']) {
    assert.equal(c.cards.filter((k) => k.slot === slot && k.start).length, 1, `${id} ${slot} start`);
    assert.ok(c.cards.filter((k) => k.slot === slot).length >= 2, `${id} ${slot} has a choice`);
  }
  const k = knight(); k.gold = 100;
  assert.deepEqual(cardsOf(k).map((c) => c.id), ['cleave', 'shieldwall', 'rally']);
  assert.equal(equipPower(k, 'press'), false, 'not learned yet');
  assert.ok(learnPower(k, 'press')); assert.equal(k.gold, 50);
  assert.deepEqual(cardsOf(k).map((c) => c.id), ['cleave', 'press', 'rally']);
  assert.ok(equipPower(k, 'shieldwall')); assert.deepEqual(cardsOf(k).map((c) => c.id), ['cleave', 'shieldwall', 'rally']);
  assert.equal(learnInfo(k, 'judgment').ok, false, 'a super waits for level 5');
  const b = newBattle(k, questsFor(k)[0], makeRng(4), 1); startRoll(b); b.magic = 12;
  castPower(b, 'rally'); b.usedRound = {}; castPower(b, 'rally');
  const before = { atk: b.mods.atk, block: b.mods.block };
  b.usedRound = {}; // the next round (a round stores or releases, not both)
  const rel = castPower(b, 'rally', { release: true });
  assert.equal(rel.released, 2); assert.equal(b.mods.atk - before.atk, 6); assert.equal(b.mods.block - before.block, 6); // one lower to start, then 2 more each: 2 + 4
});

test('every class has at least three powers, at least one at will, and a super', () => {
  for (const [id, c] of Object.entries(CLASSES)) {
    assert.ok(c.cards.length >= 4, id); assert.ok(c.cards.some((k) => k.atwill), `${id} at-will`); assert.ok(c.cards.some((k) => (k.unlock || 1) >= 5), `${id} super`);
    assert.ok(c.cards.every((k) => k.fx && k.text && k.cost > 0), id);
  }
});

test('heart nudge moves the center die by one for its Magic cost', () => {
  const h = knight();
  const b = newBattle(h, questsFor(h)[0], makeRng(2), 1);
  startRoll(b); b.board.C.v = 3; b.magic = NUDGE_COST + 1;
  assert.ok(nudge(b, 1)); assert.equal(b.board.C.v, 4); assert.equal(b.magic, 1);
  b.magic = 99; assert.equal(nudge(b, -1), false, 'once a round'); assert.equal(b.board.C.v, 4);
  b.board.nudged = false; b.magic = NUDGE_COST - 1; assert.equal(nudge(b, 1), false);
  b.magic = NUDGE_COST + 1; b.board.C.v = 6; assert.equal(nudge(b, 1), false);
  startRoll(b); b.magic = 99; assert.ok(nudge(b, b.board.C.v < 6 ? 1 : -1), 'a new round, a new nudge');
});

test('leveling and gear', () => {
  const h = knight();
  const before = maxHpOf(h);
  assert.equal(gainXp(h, 28), 1);
  assert.equal(h.level, 2); assert.equal(h.pendingPerks, 1); assert.equal(maxHpOf(h), before + 4);
  const bow = makeWeapon('bow', 1);
  h.bag.push(bow);
  assert.ok(equip(h, bow.uid));
  assert.equal(isTwoHanded(h), true);
  assert.ok(h.bag.some((w) => w.id === 'sword') && h.bag.some((w) => w.id === 'shield'));
  const dag = makeWeapon('dagger', 0);
  h.bag.push(dag);
  assert.ok(equip(h, dag.uid, 'NE'));
  assert.equal(isTwoHanded(h), false);
  assert.equal(h.loadout.NW.id, 'fists'); assert.equal(h.loadout.NE.id, 'dagger');
});

test('quests are deterministic per hero seed and step; boss on step 10', () => {
  const h = knight();
  assert.deepEqual(questsFor(h), questsFor(h));
  h.campaign.step = 10;
  assert.equal(questsFor(h)[0].kind, 'boss');
  h.campaign.step = 5;
  assert.equal(questsFor(h)[0].kind, 'elite');
});

test('Act 3 gates: Brazen Bridge elite, Oathbreak Keep mid-boss, Ember Throne finale', () => {
  const h = knight(); h.campaign.act = 3; h.campaign.step = 5;
  const elite = questsFor(h)[0];
  assert.equal(elite.kind, 'elite');
  assert.equal(elite.place, 'The Brazen Bridge');
  assert.deepEqual(elite.enemies, ['vharaxis']);
  h.campaign.step = 7;
  const keep = questsFor(h)[0];
  assert.equal(keep.kind, 'boss');
  assert.equal(keep.place, 'Oathbreak Keep');
  assert.deepEqual(keep.enemies, ['fallenchampion']);
  h.campaign.step = 9;
  assert.equal(questsFor(h)[0].place, 'Ember Throne slopes');
  h.campaign.step = 10;
  const throne = questsFor(h)[0];
  assert.equal(throne.kind, 'boss');
  assert.equal(throne.place, 'The Ember Throne');
  assert.deepEqual(throne.enemies, ['vharaxis']);
});

test('monsters: every face table has six faces and a valid verb', () => {
  const verbs = new Set(['strike', 'pierce', 'guard', 'mend', 'charge', 'howl', 'bind', 'drain', 'pilfer', 'summon', 'ward', 'stalk', 'phase', 'breath', 'chain', 'hush']);
  for (const [id, m] of Object.entries(MONSTERS)) {
    assert.equal(m.faces.length, 6, id);
    for (const f of [...m.faces, ...(m.rage ? m.rage.faces : [])]) assert.ok(verbs.has(f.v), `${id} ${f.n}`);
    if (m.rage) assert.equal(m.rage.faces.length, 6, id);
    if (m.faces.some((f) => f.v === 'charge')) assert.ok(m.slam, `${id} needs a slam`);
    if (m.faces.some((f) => f.v === 'summon')) assert.ok(m.adds, `${id} needs adds`);
    if (m.faces.some((f) => f.v === 'stalk')) assert.ok(m.pounce, `${id} needs a pounce`);
    if (m.faces.some((f) => f.v === 'ward')) assert.ok(m.faces.find((f) => f.v === 'ward').k > 0, `${id} ward burns`);
  }
});

test('rage: a boss at half health swaps to its rage table', () => {
  const h = knight();
  const b = duel(h, 'goblinking', { n: 'Scepter', v: 'strike', f: 0, m: 0 }, { NW: 4, W: 4, NE: 4, E: 4, C: 6, N: 4, S: 4 });
  const e = b.enemies[0]; e.hp = Math.ceil(e.maxHp * 0.55);
  const rep = resolve(b, {});
  assert.ok(e.raged || e.hp <= 0, 'raged once under half'); if (e.hp > 0) assert.deepEqual(rep.raged, [e.uid]);
});

test('a new hero starts with seven dice (one talent die included) and camp unlocks the rest', () => {
  const h = newHero({ name: 'N', cls: 'knight', seed: 1 });
  assert.deepEqual(activeSlots(h).sort(), ['C', 'E', 'N', 'NW', 'S', 'SW', 'W']);
  assert.equal(isActive(h, 'NE'), false); assert.equal(unlockInfo(h, 'NE').why, 'gold');
  h.gold = 100; assert.ok(unlockDie(h, 'NE')); assert.equal(isActive(h, 'NE'), true); assert.ok(h.gold < 100);
  assert.equal(unlockDie(h, 'NE'), false); // already have it
  assert.equal(unlockDie(h, 'SW'), false); assert.ok(unlockDie(h, 'SE')); assert.equal(activeSlots(h).length, 9);
  const r = newHero({ name: 'R', cls: 'ranger', seed: 1 }); assert.equal(isActive(r, 'NE'), true); // a two-hander fills both weapon dice
});

test('dice that are not on the board contribute nothing and cannot be rerolled', () => {
  const h = newHero({ name: 'N', cls: 'knight', seed: 1 });
  const full = knight();
  const bd = board({ NW: 4, NE: 4, SW: 4, SE: 4, W: 3, E: 3, C: 3 });
  assert.equal(isActive(h, 'SW'), true);
  const a = evaluate(h, bd); const f = evaluate(full, bd);
  assert.ok(a.atk + a.block + a.heal + a.magic < f.atk + f.block + f.heal + f.magic);
  assert.equal(a.lanes.R, undefined); assert.ok(a.lanes.L);
  const b = newBattle(h, questsFor(h)[0], makeRng(3), 1); startRoll(b); b.magic = 9;
  assert.equal(reroll(b, ['NE']), false); assert.equal(reroll(b, ['SE']), false); assert.ok(reroll(b, ['N']));
});

test('a charge power stores magic across rounds and releases it as one big hit with splash', () => {
  const w = newHero({ name: 'W', cls: 'wizard', seed: 3, full: true }); w.level = 4;
  const b = newBattle(w, questsFor(w)[0], makeRng(6), 1); startRoll(b); b.magic = 9;
  assert.equal(castPower(b, 'coil', { release: true }), null); // nothing stored yet
  assert.equal(castPower(b, 'coil').charged, 1); assert.equal(castPower(b, 'coil'), null); // one charge a round
  beginReset(b); startRoll(b); assert.equal(castPower(b, 'coil').charged, 2);
  beginReset(b); startRoll(b); assert.equal(castPower(b, 'coil').charged, 3);
  assert.equal(castPower(b, 'coil', { release: true }), null, 'stored this round: release next round');
  beginReset(b); startRoll(b);
  const r = castPower(b, 'coil', { release: true }); assert.equal(r.total, 18); assert.equal(b.mods.atk, 18); assert.equal(b.mods.splash, 9); // 4 + 6 + 8: one lower to start, then 2 more each
  assert.equal(castPower(b, 'coil', { release: true }), null); assert.equal(b.charge.coil, 0);
});

test('initiative: round 1 is always yours; ties and lower rolls go to you; a higher roll strikes first', () => {
  const h = knight();
  const spec = (S) => ({ NW: 1, W: 1, NE: 1, E: 1, C: 6, N: 4, S });
  const b1 = duel(h, 'goblin', { n: 'Stab', v: 'strike', f: 3, m: 0 }, spec(1));
  b1.enemies[0].hp = b1.enemies[0].maxHp = 999;
  const r1 = resolve(b1, {});
  assert.equal(r1.init.forced, true); assert.equal(r1.init.first, 'hero'); assert.deepEqual(r1.early, []);
  // a feet 4 can never lose to a d4 monster (the ogre)
  for (let seed = 1; seed < 20; seed++) {
    const b = duel(h, 'ogre', { n: 'Stab', v: 'strike', f: 3, m: 0 }, spec(4)); b.enemies[0].hp = b.enemies[0].maxHp = 999; b.round = 2;
    const r = resolve(b, {}); assert.equal(r.init.first, 'hero');
  }
  // a feet 1 loses to anything higher, and then the monster's blow lands before yours
  let sawEarly = 0;
  for (let seed = 1; seed < 40; seed++) {
    const b = duel(h, 'goblin', { n: 'Stab', v: 'strike', f: 3, m: 0 }, spec(1)); b.enemies[0].hp = b.enemies[0].maxHp = 999; b.round = 2; b.rng = makeRng(seed);
    const r = resolve(b, {}); const foe = r.init.foes[0].init;
    assert.equal(r.init.first, foe > 1 ? 'foes' : 'hero');
    if (foe > 1) { sawEarly++; assert.equal(r.acts[0].early, true); }
  }
  assert.ok(sawEarly > 5);
});

test('a monster that acts first can drop you before you swing', () => {
  const h = knight();
  for (let seed = 1; seed < 60; seed++) {
    const b = duel(h, 'goblin', { n: 'Stab', v: 'strike', f: 999, m: 0 }, { NW: 4, W: 4, NE: 4, E: 4, C: 6, N: 4, S: 1 }); b.round = 2; b.rng = makeRng(seed);
    const r = resolve(b, {});
    if (r.early.length) { assert.equal(r.heroDown, true); assert.equal(r.dealt, 0); assert.equal(b.outcome, 'defeat'); return; }
  }
  assert.fail('never saw the monster win initiative');
});

test('speed: classes start at different feet sizes, monsters have their own initiative die, and speed can be bought', async () => {
  const D = await import('../js/data.js');
  const E = await import('../js/engine.js');
  const dwarf = newHero({ name: 'D', cls: 'dwarf', seed: 1 }); const ranger = newHero({ name: 'R', cls: 'ranger', seed: 1 });
  assert.ok(E.feetSize(ranger) > E.feetSize(dwarf)); assert.equal(E.sidesOf(ranger, 'S'), E.feetSize(ranger));
  assert.ok(D.MONSTERS.wolf.init > D.MONSTERS.ogre.init);
  dwarf.gold = 9999; dwarf.level = 20; const before = E.feetSize(dwarf);
  assert.equal(E.upgradeDie(dwarf, 'speed', 'S'), true); assert.equal(E.feetSize(dwarf), D.NEXT_SIZE[before]);
});

test('every symbol pays its count: faces 1-4 of any die size pay 2 (heal, pierce, magic, gold)', () => {
  const h = knight();
  const ev = evaluate(h, board({ W: 4, E: 4, N: 3, S: 3, C: 5, NW: 1, NE: 1 }));
  assert.equal(ev.gold, 4); assert.equal(ev.magic, 4);
  assert.deepEqual(FACE_PAY.slice(1, 5), [{ heal: 3 }, { pierce: 2 }, { magic: 2 }, { gold: 2 }]);
  assert.deepEqual(FACE_PAY[9], { heal: 2, pierce: 2 }); assert.deepEqual(FACE_PAY[10], { magic: 2, gold: 2 });
  const big = evaluate(h, board({ N: 5, W: 6, E: 7, S: 8, C: 6, NW: 1, NE: 1 }));
  assert.equal(big.heal, 3); assert.equal(big.pierce, 3); assert.equal(big.magic, 3); assert.equal(big.gold, 3);
});

test('two free healing potions a battle, 10 health each, never above max', async () => {
  const { drinkPotion, potionsLeft, POTIONS } = await import('../js/engine.js');
  const h = newHero({ name: 'P', cls: 'knight', seed: 2 }); const b = newBattle(h, questsFor(h)[0], makeRng(1), 1);
  assert.equal(potionsLeft(b), POTIONS);
  assert.equal(drinkPotion(b), false, 'not at full health');
  b.hp = b.maxHp - 15; const m = b.magic;
  assert.equal(drinkPotion(b), true); assert.equal(b.hp, b.maxHp - 5); assert.equal(b.magic, m, 'potions cost no magic');
  assert.equal(drinkPotion(b), true); assert.equal(b.hp, b.maxHp);
  b.hp = 1; assert.equal(drinkPotion(b), false, 'only two'); assert.equal(potionsLeft(b), 0);
});

test('Arc Bolt: 2 magic a die, at most 5d8 (Dave)', () => {
  const w = newHero({ name: 'W', cls: 'wizard', seed: 3, full: true });
  const cast = (x, lvl = 0) => { w.powerLevel = { arcbolt: lvl }; const b = newBattle(w, questsFor(w)[0], makeRng(5), 1); startRoll(b); b.magic = 15; const r = castPower(b, 'arcbolt', { x }); return [r.rolls.length, 15 - b.magic]; };
  assert.deepEqual(cast(2), [1, 2]);
  assert.deepEqual(cast(3), [1, 2]); // an odd magic buys nothing extra
  assert.deepEqual(cast(6), [3, 6]);
  assert.deepEqual(cast(10), [5, 10]);
  assert.deepEqual(cast(15), [5, 10]); // never more than 5 dice
  assert.deepEqual(cast(15, 1), [5, 8]); // a level adds a die, so the cap comes cheaper
});

test('dice grow with the act: I d4->d6, II d6->d8, III d8->d10 (strength and talent dice)', async () => {
  const { strengthUpgrade, specialUpgrade, upgradeDie } = await import('../js/engine.js');
  const h = knight(); h.gold = 9999; h.level = 20; h.strength.E = 4; h.special.SW = 4;
  assert.equal(strengthUpgrade(h, 'E').ok, true); assert.equal(strengthUpgrade(h, 'E').next, 6);
  assert.ok(upgradeDie(h, 'strength', 'E'));
  const g = strengthUpgrade(h, 'E'); assert.equal(g.ok, false); assert.equal(g.why, 'Act II'); assert.equal(g.act, 2);
  assert.equal(upgradeDie(h, 'strength', 'E'), false);
  h.campaign.act = 2; assert.ok(upgradeDie(h, 'strength', 'E')); assert.equal(h.strength.E, 8);
  assert.equal(strengthUpgrade(h, 'E').why, 'Act III');
  h.campaign.act = 3; assert.ok(upgradeDie(h, 'strength', 'E')); assert.equal(h.strength.E, 10);
  assert.equal(strengthUpgrade(h, 'E').why, 'Max size');
  // the talent die follows the same ladder
  h.campaign.act = 1; assert.ok(upgradeDie(h, 'special', 'SW')); assert.equal(specialUpgrade(h, 'SW').why, 'Act II');
  h.campaign.act = 3; assert.ok(upgradeDie(h, 'special', 'SW')); assert.ok(upgradeDie(h, 'special', 'SW')); assert.equal(h.special.SW, 10);
});

test('talent dice count in straights: the 2x face is a 2, every face from 4 up shows its number (bought or not); faces 1 and 3 count as nothing', () => {
  const h = knight(); h.strength.W = 4; h.strength.E = 4; // d4 body dice: five in a row is a straight h.special = { SW: 6, SE: 6 }; h.talent = { SW: [], SE: [] };
  // head 1, talent 2x (a 2), heart 3, left hand 4, right talent 5 (no symbol yet): 1-2-3-4-5
  const run = evaluate(h, board({ N: 1, SW: 2, C: 3, W: 4, SE: 5, E: 1, S: 1, NW: 1, NE: 1 }));
  assert.equal(run.straight, 5);
  assert.ok(run.straightSlots.includes('SW') && run.straightSlots.includes('SE'));
  const gap = evaluate(h, board({ N: 1, SW: 3, C: 3, W: 4, SE: 5, E: 1, S: 1, NW: 1, NE: 1 })); // a blank 3 on the talent die is no 2
  assert.equal(gap.straight, 0);
});

test('a talent die always has two blanks and one 2x; the rest of its faces can carry symbols', () => {
  const h = knight();
  for (const [n, symFaces] of [[4, 1], [6, 3], [8, 5], [10, 7]]) {
    h.special.SW = n; h.talent.SW = Array.from({ length: symFaces }, () => ['atk']);
    const faces = Array.from({ length: n }, (_, i) => specialFace(h, 'SW', i + 1));
    assert.equal(faces.filter((f) => f === null).length, 2, `d${n} blanks`);
    assert.equal(faces.filter((f) => f === 'X2').length, 1, `d${n} 2x`);
    assert.equal(faces.filter((f) => Array.isArray(f)).length, symFaces, `d${n} symbol faces`);
  }
});

test('game difficulty is Easy/Normal/Hard/Legendary, with old noob/mid/expert names mapping onto it', () => {
  assert.deepEqual(Object.keys(DIFFICULTY), ['easy', 'normal', 'hard', 'legendary']);
  assert.equal(DIFFICULTY.easy.name, 'Easy');
  assert.equal(DIFFICULTY.normal.name, 'Normal');
  assert.equal(DIFFICULTY.hard.name, 'Hard');
  assert.equal(DIFFICULTY.legendary.name, 'Legendary');
  assert.equal(DIFFICULTY.easy.hp, 0.8); assert.equal(DIFFICULTY.easy.flat, -1); assert.equal(DIFFICULTY.easy.gold, 1); assert.equal(DIFFICULTY.easy.budget, 0.7);
  assert.equal(DIFFICULTY.normal.hp, 1); assert.equal(DIFFICULTY.normal.flat, 0); assert.equal(DIFFICULTY.normal.gold, 1); assert.equal(DIFFICULTY.normal.budget, 1);
  assert.equal(DIFFICULTY.hard.hp, 1.15); assert.equal(DIFFICULTY.hard.flat, 2); assert.equal(DIFFICULTY.hard.gold, 1.15); assert.equal(DIFFICULTY.hard.budget, 1.15);
  assert.equal(DIFFICULTY.legendary.hp, 1.4); assert.equal(DIFFICULTY.legendary.flat, 2); assert.equal(DIFFICULTY.legendary.gold, 1.25); assert.equal(DIFFICULTY.legendary.budget, 1.25);
  assert.equal(normalizeDifficulty('noob'), 'easy');
  assert.equal(normalizeDifficulty('mid'), 'normal');
  assert.equal(normalizeDifficulty('expert'), 'hard');
  assert.equal(normalizeDifficulty('easy'), 'easy');
  assert.equal(normalizeDifficulty('legendary'), 'legendary');
  assert.equal(normalizeDifficulty('mystery'), 'normal');
  assert.equal(difficultyOf({ difficulty: 'expert' }).name, 'Hard');
  const quest = { enemies: ['goblin'], hpMult: 1, flat: 0, rewardMult: 1 };
  const easyQ = withDifficulty({ difficulty: 'noob' }, quest);
  assert.equal(easyQ.hpMult, 0.8);
  assert.equal(easyQ.flat, -1);
});

test('Hard and Legendary: the moves a monster announces (Slam, Pounce, Fire Ward) hit harder; Normal leaves them alone', () => {
  const quest = { enemies: ['ogre', 'cultist'], hpMult: 1, flat: 0, rewardMult: 1, kind: 'battle' };
  const at = (diff) => { const h = newHero({ name: 'K', cls: 'knight', seed: 1 }); h.difficulty = diff; return newBattle(h, quest, makeRng(1), 1); };
  for (const [diff, slam, burn] of [['normal', 0, 0], ['hard', 3, 2], ['legendary', 6, 4]]) {
    const b = at(diff); const ogre = b.enemies[0]; const mage = b.enemies[1];
    ogre.windup = true; rollIntent(ogre, makeRng(2));
    assert.equal(ogre.intent.f, MONSTERS.ogre.slam.f + slam, `${diff} slam`);
    mage.intent = { n: 'Fire Ward', v: 'ward', f: 0, m: 1, k: 4 };
    assert.equal(burnOf(mage), 4 + Math.floor(mage.flat / 2) + burn, `${diff} burn`);
  }
});
test('difficulty scales monsters, never the hero, including in a party battle', () => {
  const quest = { enemies: ['goblin'], hpMult: 1, flat: 0, rewardMult: 1, kind: 'battle' };
  const hp0 = maxHpOf(knight());
  const spawn = (diff) => {
    const h = newHero({ name: 'K', cls: 'knight', seed: 1 });
    h.difficulty = diff;
    return newBattle(h, quest, makeRng(1), 1);
  };
  const easy = spawn('easy'); const mid = spawn('normal'); const hard = spawn('hard'); const legend = spawn('legendary');
  assert.equal(easy.enemies[0].maxHp, Math.round(30 * 0.8));
  assert.equal(mid.enemies[0].maxHp, 30);
  assert.equal(hard.enemies[0].maxHp, Math.round(30 * 1.15));
  assert.equal(legend.enemies[0].maxHp, Math.round(30 * 1.4)); // Legendary is tougher than Hard (Oct 2026; 1.4 once weapons wore out and straights grew rarer)
  assert.equal(easy.enemies[0].flat, -1);
  assert.equal(hard.enemies[0].flat, 2);
  assert.equal(legend.enemies[0].flat, 2);
  assert.equal(easy.enemies[0].gold, 6);
  assert.equal(hard.enemies[0].gold, Math.round(6 * 1.15));
  assert.equal(legend.enemies[0].gold, Math.round(6 * 1.25));
  assert.equal(easy.maxHp, hp0);
  assert.equal(hard.maxHp, hp0);
  assert.equal(legend.maxHp, hp0);
  const host = newHero({ name: 'Ada', cls: 'knight', seed: 2 }); host.difficulty = 'hard';
  const guest = newHero({ name: 'Bea', cls: 'bard', seed: 3 }); guest.difficulty = 'easy';
  const party = newPartyBattle([host, guest], quest, makeRng(4));
  const m = party.team.m; // the company's strength in "strongest heroes" (Oct 2026)
  assert.ok(m > 1 && m <= 2);
  assert.ok(Math.abs(party.enemies[0].maxHp - 30 * 1.15 * party.team.hp) <= 1, 'Hard health, times the company (team.hp is shown to two places)');
  assert.equal(party.enemies[0].flat, 2 + party.team.flat, 'Hard adds 2 to a hit, the company the rest');
  assert.equal(maxHpOf(guest), maxHpOf(newHero({ name: 'Bea', cls: 'bard', seed: 3 })));
});

test('random encounters: one fight a step, seeded, within the cap, and bigger for higher difficulty', async () => {
  const { encounterFor, encounterBudget, crowdThreat } = await import('../js/engine.js');
  const { ENEMY_CAP } = await import('../js/data.js');
  const mean = (diff, act, step) => {
    let t = 0; const n = 40;
    for (let seed = 1; seed <= n; seed++) {
      const h = newHero({ name: 'x', cls: 'knight', seed }); h.difficulty = diff; h.campaign.act = act; h.campaign.step = step; h.campaign.seed = seed * 7919; h.campaign.wins = 1;
      const a = encounterFor(h); const b = encounterFor(h);
      assert.deepEqual(a, b, 'same campaign, same fight');
      assert.ok(a.length >= 1 && a.length <= ENEMY_CAP);
      for (const id of a) assert.ok(MONSTERS[id], id);
      t += crowdThreat(a);
    }
    return t / n;
  };
  for (const act of [1, 2, 3]) for (const step of [2, 6, 9]) {
    const [n, m, x] = ['easy', 'normal', 'hard'].map((d) => mean(d, act, step));
    assert.ok(n < m && m < x, `act ${act} step ${step}: easy ${n.toFixed(1)} < normal ${m.toFixed(1)} < hard ${x.toFixed(1)}`);
    const L = mean('legendary', act, step);
    assert.ok(x < L, `act ${act} step ${step}: hard ${x.toFixed(1)} < legendary ${L.toFixed(1)}`);
  }
  // it ramps through the act, and the first fight stays the lone-goblin lesson
  assert.ok(mean('normal', 1, 9) > mean('normal', 1, 2) + 0.8);
  const h = newHero({ name: 'x', cls: 'knight', seed: 3 }); assert.deepEqual(questsFor(h)[0].enemies, ['goblin']);
  h.campaign.wins = 1; h.campaign.step = 9; h.difficulty = 'hard';
  assert.ok(encounterBudget(h) > encounterBudget({ ...h, difficulty: 'easy' }));
  assert.ok(encounterBudget({ ...h, difficulty: 'legendary' }) > encounterBudget(h));
  // some steps are a crowd, some a lone big monster
  const shapes = new Set(); for (let seed = 1; seed <= 60; seed++) { h.campaign.seed = seed * 31; h.difficulty = 'normal'; h.campaign.step = 8; shapes.add(encounterFor(h).length); }
  assert.ok(shapes.has(1) && shapes.has(2), `lone and pairs both appear: ${[...shapes]}`);
});

test('Acts I–III lock story foes; difficulty never swaps the cast', async () => {
  const { ACTS } = await import('../js/data.js');
  const { encounterFor } = await import('../js/engine.js');
  for (const act of ACTS) {
    for (let step = 1; step <= 10; step++) {
      const locked = act.fights[step - 1];
      for (const diff of ['easy', 'normal', 'hard', 'legendary']) {
        const h = newHero({ name: 'x', cls: 'knight', seed: 9 });
        h.difficulty = diff; h.campaign.act = act.id; h.campaign.step = step; h.campaign.wins = step === 1 ? 0 : 1;
        const q = questsFor(h)[0]; // the story's foes come first and stay; a wanderer may join after them
        assert.deepEqual(q.enemies.slice(0, locked.length), locked, `${act.name} step ${step} ${diff}`);
        assert.equal(q.enemies.length, locked.length + (q.wanderer ? 1 : 0));
      }
    }
  }
  const help = newHero({ name: 'x', cls: 'knight', seed: 9 });
  help.campaign.act = 1; help.campaign.step = 8; help.campaign.wins = 7;
  help.campaign.nextPlace = 'Cinder Ford'; help.campaign.nextEnemies = ['cinderling', 'goblin'];
  assert.deepEqual(questsFor(help)[0].enemies, ['cinderling', 'goblin']);
  assert.equal(questsFor(help)[0].place, 'Cinder Ford');
  // Ascents still roll encounterFor; the locked Act I cast must not follow them up the hill.
  const ascent = newHero({ name: 'x', cls: 'knight', seed: 9 });
  ascent.campaign.act = 4; ascent.campaign.step = 2; ascent.campaign.wins = 12; ascent.campaign.seed = 4242;
  assert.deepEqual(questsFor(ascent)[0].enemies, encounterFor(ascent));
});

test('power levels add a quarter, a quarter more, then half more (at least 1, 2, 4): level 3 doubles; pierce stays a little under attack', async () => {
  const { scaleNum, chargeGain, chargeSteps, healCostOf } = await import('../js/engine.js');
  assert.deepEqual([0, 1, 2, 3].map((l) => scaleNum(3, l)), [3, 4, 5, 7]);
  assert.deepEqual([0, 1, 2, 3].map((l) => scaleNum(5, l)), [5, 6, 8, 10]);
  assert.deepEqual([0, 1, 2, 3].map((l) => scaleNum(12, l)), [12, 15, 18, 24]);
  // charges start one lower and climb by 2; a release grows an eighth, a quarter, a half by level
  assert.deepEqual(chargeSteps(5, 4), [4, 6, 8, 10]);
  const coil = { per: { atk: 5 } };
  assert.deepEqual([0, 1, 2, 3].map((l) => chargeGain(coil, 4, l).atk), [28, 32, 35, 42]);
  // healing with magic: 2 magic heals 3, the same price every time
  assert.equal(healCostOf(null, { healsRound: 0 }), 2); assert.equal(healCostOf(null, { healsRound: 2 }), 2);
  const { CLASSES } = await import('../js/data.js');
  const fxOf = (c) => (c.kind === 'charge' ? (typeof c.per === 'number' ? { atk: c.per } : c.per) : c.fx) || {};
  const all = Object.values(CLASSES).flatMap((c) => c.cards);
  // for each pierce power, the strongest attack power of the same kind is a little stronger
  for (const c of all.filter((x) => fxOf(x).pierce)) {
    if (c.kind === 'dice' || c.kind === 'scale') continue;
    const best = Math.max(...all.filter((x) => x.kind === c.kind && fxOf(x).atk && !x.dice).map((x) => fxOf(x).atk));
    assert.ok(fxOf(c).pierce < best, `${c.name} pierce ${fxOf(c).pierce} should sit under the best ${c.kind} attack ${best}`);
  }
});

test('a monster round report says which die it rolled and what the roll made (attack and guard)', () => {
  const h = knight(); const b = newBattle(h, { ...questsFor(h)[0], enemies: ['goblin'] }, makeRng(7), 1); startRoll(b);
  const e = b.enemies[0];
  for (const [verb, f, m] of [['strike', 1, 1], ['guard', 2, 1]]) {
    e.intent = { n: verb === 'guard' ? 'Duck' : 'Stab', v: verb, f, m };
    const rep = resolve(b, { target: 0 }); const a = rep.acts.find((x) => x.uid === e.uid);
    if (!a) { b.round = 0; startRoll(b); continue; }
    assert.ok(a.calc && a.calc.size === e.powerDie && a.calc.p === a.p, 'the report carries the die and its roll');
    const total = a.calc.f + a.calc.dice.slice(0, a.calc.m).reduce((x, v) => x + v, 0) + a.calc.flat + a.calc.buff - a.calc.weaken;
    assert.equal(Math.max(0, total), a.mag, `${verb}: move + die + bonuses = the number`);
    if (b.outcome) break;
    startRoll(b);
  }
});

test('a x2 move rolls two separate dice and adds them to its base', () => {
  const h = knight(); const b = newBattle(h, { ...questsFor(h)[0], enemies: ['wolf'] }, makeRng(11), 1); startRoll(b);
  const e = b.enemies[0]; let seen = 0;
  for (let r = 0; r < 12 && !b.outcome && seen < 2; r++) {
    e.intent = { n: 'Lunge', v: 'strike', f: 0, m: 2 }; b.board = b.board || {};
    const rep = resolve(b, { target: 0 }); const a = rep.acts.find((x) => x.uid === e.uid);
    if (a) { const c = a.calc; assert.equal(c.dice.length, 2, 'two dice'); assert.equal(a.mag, Math.max(0, c.f + c.dice[0] + c.dice[1] + c.flat + c.buff - c.weaken)); seen++; }
    if (b.outcome) break; startRoll(b);
  }
  assert.ok(seen >= 1);
});

test('shrinking a die costs gold, refunds nothing, and drops the symbols on the faces that go', async () => {
  const { downgradeInfo, downgradeDie, upgradeDie: upgradeDieLate } = await import('../js/engine.js');
  const { DOWNGRADE_COST, TALENT_FACES } = await import('../js/data.js');
  const h = knight(); h.gold = 500;
  // a talent die: d10 -> d8 loses faces 9 and 10 (the last two number faces)
  h.special.SW = 10; h.talent.SW = [['atk'], ['heal'], ['block'], ['magic'], ['gold'], ['atk'], ['heal']];
  const info = downgradeInfo(h, 'special', 'SW'); assert.equal(info.next, 8); assert.equal(info.cost, DOWNGRADE_COST[10]); assert.equal(info.lose, 2);
  assert.ok(downgradeDie(h, 'special', 'SW')); assert.equal(h.special.SW, 8); assert.equal(h.gold, 500 - DOWNGRADE_COST[10]);
  assert.equal(h.talent.SW.length, TALENT_FACES[8]); assert.deepEqual(h.talent.SW[4], ['gold']);
  // growing back brings empty faces
  h.level = 20; h.campaign.act = 3; assert.ok(upgradeDieLate(h, 'special', 'SW')); assert.deepEqual((h.talent.SW[5] || []), []);
  // a hand die, the feet and a weapon
  h.strength.W = 8; assert.ok(downgradeDie(h, 'strength', 'W')); assert.equal(h.strength.W, 6);
  assert.ok(downgradeDie(h, 'strength', 'W')); assert.equal(h.strength.W, 4); assert.equal(downgradeDie(h, 'strength', 'W'), false, 'd4 is the smallest');
  const hero2 = ranger(); hero2.gold = 100; hero2.speed = { S: 8 }; assert.ok(downgradeDie(hero2, 'speed')); assert.equal(hero2.speed.S, 6);
  const w = hero2.loadout.NW; w.size = 8; assert.ok(downgradeDie(hero2, 'weapon', w.uid)); assert.equal(w.size, 6);
  // too poor
  const poor = knight(); poor.gold = 5; poor.strength.W = 8; assert.equal(downgradeDie(poor, 'strength', 'W'), false); assert.equal(poor.strength.W, 8);
});

test('three metals: an old Diamond weapon loads as Gold, and nothing new comes out above Gold', async () => {
  const { migrateHero } = await import('../js/save.js');
  const h = newHero({ name: 'T', cls: 'knight', seed: 1 }); h.loadout.NW.rarity = 3; h.bag = [{ uid: 'x', id: 'spear', rarity: 3 }];
  migrateHero(h); assert.equal(h.loadout.NW.rarity, 2); assert.equal(h.bag[0].rarity, 2);
  const E = await import('../js/engine.js'); const rng = E.makeRng(3); for (let i = 0; i < 400; i++) assert.ok(E.rollDrops(rng, 1, { rarityBoost: 6 })[0].rarity <= 2);
});

test('Diamond weapons: honest dice with no blanks, every face an icon, crits of three, full size in any hand', async () => {
  const E = await import('../js/engine.js'); const { DIAMOND } = await import('../js/data.js');
  for (const act of [1, 2, 3]) for (let s = 0; s < 30; s++) {
    const d = E.makeDiamond(E.makeRng(act * 100 + s), act); const size = DIAMOND.sizeByAct[act - 1];
    assert.equal(d.size, size); assert.ok(d.diamond && DIAMOND.pool.includes(d.id) && WEAPONS[d.id].hands !== 2);
    const f = E.weaponFaces(d, 4); const own = WEAPONS[d.id].lean === 'def' ? 'b' : 'r';
    assert.equal(f.length, size, 'a Diamond rolls at its full size even in a d4 hand');
    assert.ok(f.every((x) => x.v > 0 && x.v <= size && x.c === own && x.fx), `${d.id} d${size}: no blanks, honest, one colour, icons everywhere`);
    const top = Math.max(...f.map((x) => x.v)); assert.ok(f.filter((x) => x.v === top).every((x) => Object.values(x.fx)[0] === 3));
  }
  const h = newHero({ name: 'T', cls: 'knight', seed: 1 }); h.loadout.NW = E.makeDiamond(E.makeRng(3), 3); assert.equal(sidesOf(h, 'NW'), 10);
  const { tierName } = await import('../js/data.js'); assert.equal(tierName(h.loadout.NW), 'Diamond');
});

test('Diamond weapons: a case of two; bring one in each hand; they shatter after the fight and your weapons come back', async () => {
  const E = await import('../js/engine.js');
  const h = newHero({ name: 'T', cls: 'knight', seed: 1 }); h.dice = [...(h.dice || ['NW', 'NE'])]; if (!h.dice.includes('NE')) h.dice.push('NE');
  const [a, b, c] = [1, 2, 3].map((i) => E.makeDiamond(E.makeRng(i), 2));
  assert.ok(E.takeDiamond(h, a) && E.takeDiamond(h, b)); assert.equal(E.takeDiamond(h, c), false, 'two at most'); assert.ok(E.diamondCaseFull(h));
  const sword = h.loadout.NW.uid; const shield = h.loadout.NE.uid;
  E.armDiamond(h, a.uid, 'NW'); E.armDiamond(h, b.uid, 'NE'); assert.equal(E.armedSlot(h, b.uid), 'NE');
  E.armDiamond(h, a.uid, 'NE'); assert.equal(E.armedSlot(h, a.uid), 'NE'); assert.equal(E.armedSlot(h, b.uid), null, 'one Diamond per hand: the one already there goes back to its case');
  E.armDiamond(h, a.uid, 'NW'); E.armDiamond(h, b.uid, 'NE');
  const quest = { enemies: ['goblin'], hpMult: 1, flat: 0, rewardMult: 1, kind: 'battle' };
  E.newBattle(h, quest, makeRng(1), 1);
  assert.equal(h.loadout.NW.uid, a.uid); assert.equal(h.loadout.NE.uid, b.uid); assert.equal(E.diamondsOf(h).length, 0, 'they left the case'); assert.equal(h.armed, undefined);
  const gone = E.shatterDiamonds(h); assert.equal(gone.length, 2);
  assert.equal(h.loadout.NW.uid, sword); assert.equal(h.loadout.NE.uid, shield); assert.equal(h.lent, undefined);
  E.newBattle(h, quest, makeRng(1), 1); assert.equal(h.loadout.NW.uid, sword, 'nothing armed: your own weapons');
  // a two-handed bow is set aside whole: one Diamond fills both hands, as the bow did; the bow comes back after
  const r = newHero({ name: 'R', cls: 'ranger', seed: 1 }); const bow = r.loadout.NW.uid; E.takeDiamond(r, c); E.armDiamond(r, c.uid, 'NW');
  E.newBattle(r, quest, makeRng(1), 1); assert.equal(r.loadout.NW.uid, c.uid); assert.equal(r.loadout.NE.id, c.id); assert.ok(r.loadout.NE.twin && r.loadout.NE.diamond); assert.ok(isActive(r, 'NE'));
  assert.equal(E.diamondsOf(r).length, 0, 'one Diamond, both hands'); assert.equal(r.wielding.length, 1);
  E.shatterDiamonds(r); assert.equal(r.loadout.NW.uid, bow); assert.equal(WEAPONS[r.loadout.NE.id].hands, 2);
});

test('Diamond weapons: about one and a half an act from fights and the traveller; a save closed mid-fight gives the hands back', async () => {
  const E = await import('../js/engine.js'); const { migrateHero } = await import('../js/save.js');
  let found = 0; const N = 60;
  for (let s = 1; s <= N; s++) {
    const h = newHero({ name: 'T', cls: 'knight', seed: s });
    for (let act = 1; act <= 3; act++) for (let step = 1; step <= 10; step++) {
      h.campaign.act = act; h.campaign.step = step; const quest = E.questsFor(h)[0];
      if (E.battleRewards({ quest, hero: h, enemies: [], players: 1, goldEarned: 0, stolen: 0 }).diamond) found++;
      h.campaign.shop = null; if (E.shopStock(h).some((it) => it.inst.diamond)) found++;
    }
  }
  const perAct = found / N / 3; assert.ok(perAct > 1.1 && perAct < 2, `Diamonds an act: ${perAct.toFixed(2)}`);
  const h = newHero({ name: 'T', cls: 'knight', seed: 1 }); const sword = h.loadout.NW.uid; const d = E.makeDiamond(E.makeRng(9), 1);
  E.takeDiamond(h, d); E.armDiamond(h, d.uid, 'NW'); E.wieldDiamonds(h); assert.equal(h.loadout.NW.uid, d.uid);
  const saved = JSON.parse(JSON.stringify(h)); migrateHero(saved); assert.equal(saved.loadout.NW.uid, sword); assert.equal(saved.lent, undefined);
  const leg = newHero({ name: 'L', cls: 'knight', seed: 1 }); leg.bag = [E.makeWeapon('dawnbreaker', 3, E.makeRng(1))]; migrateHero(leg); assert.equal(leg.bag[0].rarity, 3, 'legendaries keep their tier');
});

test('Diamonds: a level-up now and then offers one instead of a third perk (never with a full case), and one sells for a plain weapon\'s price', async () => {
  const E = await import('../js/engine.js'); const { DIAMOND, PERKS } = await import('../js/data.js');
  assert.deepEqual(DIAMOND.sizeByAct, [6, 8, 10], 'they get better each act');
  let seen = 0; const N = 400;
  for (let s = 0; s < N; s++) { const h = newHero({ name: 'T', cls: 'knight', seed: 1 }); const o = E.offerPerks(h, E.makeRng(s)); assert.equal(o.length, 3); if (o.includes('diamond')) seen++; }
  assert.ok(seen > N * 0.15 && seen < N * 0.35, `offered ${seen} of ${N}`);
  const full = newHero({ name: 'F', cls: 'knight', seed: 1 }); E.takeDiamond(full, E.makeDiamond(E.makeRng(1), 1)); E.takeDiamond(full, E.makeDiamond(E.makeRng(2), 1));
  for (let s = 0; s < 200; s++) assert.ok(!E.offerPerks(full, E.makeRng(s)).includes('diamond'), 'a full case is never offered one');
  const h = newHero({ name: 'P', cls: 'knight', seed: 1 }); h.pendingPerks = 1; h.campaign.act = 2;
  assert.ok(E.takePerk(h, 'diamond')); assert.equal(h.pendingPerks, 0); assert.equal(E.diamondsOf(h).length, 1); assert.equal(E.diamondsOf(h)[0].size, 8); assert.ok(!h.perks.includes('diamond'));
  assert.ok(PERKS.diamond.retired, 'never offered as an ordinary perk');
  const d = E.diamondsOf(h)[0]; const price = E.diamondSellValue(d);
  assert.equal(price, E.sellValue({ id: d.id, rarity: 0, size: d.size }), 'a normal sell price, nothing more');
  const g = h.gold; assert.ok(E.sellDiamond(h, d.uid)); assert.equal(h.gold, g + price); assert.equal(E.diamondsOf(h).length, 0);
});

test('charms bend one rule each, three at most, and a boss offers a choice of two', async () => {
  const E = await import('../js/engine.js'); const { CHARMS, CHARM_MAX } = await import('../js/data.js');
  const knight = () => { const h = newHero({ name: 'C', cls: 'knight', seed: 1 }); h.dice = [...new Set([...(h.dice || []), 'NE'])]; return h; };
  const with_ = (id) => { const h = knight(); assert.ok(E.takeCharm(h, id)); return h; };
  const diff = (id, b, k) => E.evaluate(with_(id), board(b))[k] - E.evaluate(knight(), board(b))[k];
  // Bronze d4 sword face 1 is a blank: the Ember Locket pays 3 magic for it
  assert.equal(diff('ember', { NW: 1, NE: 3 }, 'magic'), 2); assert.equal(diff('ember', { NW: 1, NE: 3 }, 'atk'), 6);
  // Twin Coin: both weapon dice on the same number
  const sw = E.weaponFaces(knight().loadout.NW, 4); const sh = E.weaponFaces(knight().loadout.NE, 4);
  const same = [1, 2, 3, 4].flatMap((a) => [1, 2, 3, 4].map((c) => [a, c])).find(([a, c]) => sw[a - 1].v > 0 && sw[a - 1].v === sh[c - 1].v);
  if (same) assert.equal(diff('twins', { NW: same[0], NE: same[1] }, 'atk'), 10);
  // Wolf Fang: a Head to Toe Triple pays 20 block, not 10
  assert.equal(diff('fang', { N: 3, C: 3, S: 3 }, 'block'), 10);
  // Gambler's Bone: a head 1 counts as 6 (6 with heart 6 and feet 6 is a Head to Toe Triple)
  assert.ok(E.evaluate(with_('bone'), board({ N: 1, C: 6, S: 2 })).triples.length >= 0);
  assert.ok(E.evaluate(with_('bone'), board({ N: 1, C: 6, S: 6, W: 2, E: 2 })).triples.some((t) => t.row === 'headtoe'));
  assert.ok(!E.evaluate(knight(), board({ N: 1, C: 6, S: 6, W: 2, E: 2 })).triples.some((t) => t.row === 'headtoe'));
  // Mirror Shard: a straight heals 6
  const st = { N: 1, W: 2, C: 3, E: 4, S: 5 }; if (E.evaluate(knight(), board(st)).straight) assert.equal(diff('mirror', st, 'heal'), 12);
  // Thorn Crown: a Gold top face's three pierce count six
  const g = knight(); g.loadout.NW = E.makeWeapon('sword', 2, null, 4); const gt = knight(); gt.loadout.NW = E.makeWeapon('sword', 2, null, 4); E.takeCharm(gt, 'thorns');
  assert.equal(E.evaluate(gt, board({ NW: 4 })).pierce - E.evaluate(g, board({ NW: 4 })).pierce, 3);
  // three at most; no doubles
  const h = knight(); const ids = Object.keys(CHARMS);
  for (const id of ids.slice(0, CHARM_MAX)) assert.ok(E.takeCharm(h, id));
  assert.equal(E.takeCharm(h, ids[CHARM_MAX]), false); assert.ok(E.charmFull(h));
  assert.ok(E.dropCharm(h, ids[0])); assert.equal(E.takeCharm(h, ids[1]), false, 'no doubles');
  // Blood Pact: full magic, 8 less health; Lantern: one more reroll; Phoenix: stands at 10 once
  const quest = { enemies: ['goblin'], hpMult: 1, flat: 0, rewardMult: 1, kind: 'battle' };
  const plain = E.newBattle(knight(), quest, makeRng(1), 1); const pact = E.newBattle(with_('pact'), quest, makeRng(1), 1);
  assert.equal(pact.maxHp, plain.maxHp - 8); assert.equal(pact.magic, E.magicCapOf(knight()));
  const lan = E.newBattle(with_('lantern'), quest, makeRng(1), 1); E.startRoll(lan); E.startRoll(plain); assert.equal(lan.actionsLeft, plain.actionsLeft + 1);
  const ph = E.newBattle(with_('phoenix'), { ...quest, enemies: ['ogre'] }, makeRng(2), 1); ph.hp = 1; E.startRoll(ph);
  for (let r = 0; r < 6 && !ph.outcome; r++) { E.resolve(ph, { target: 0 }); if (ph.phoenixUsed) break; if (!ph.outcome) E.startRoll(ph); }
  if (ph.phoenixUsed) assert.ok(ph.hp > 0 || ph.outcome === 'defeat');
  // a boss's spoils offer two charms you do not hold
  let offered = 0; for (let s = 1; s <= 20; s++) { const x = newHero({ name: 'B', cls: 'knight', seed: s }); x.campaign.step = 10; const q = E.questsFor(x)[0];
    const r = E.battleRewards({ quest: q, hero: x, enemies: [], players: 1, goldEarned: 0, stolen: 0 }); if (q.kind === 'boss') { assert.equal(r.charms.length, 2); offered++; } }
  assert.ok(offered > 0);
});

test('Line Breaker: every triple pays +2 more a rank, attack or block; Stout Heart is no longer offered but still counts for those who took it', async () => {
  const E = await import('../js/engine.js'); const D = await import('../js/data.js');
  const strength = [{ W: 1, C: 1, E: 1 }, { W: 1, C: 2, E: 1 }]; const headtoe = [{ N: 3, C: 3, S: 3, NW: 1, NE: 1 }, { N: 3, C: 2, S: 3, NW: 1, NE: 1 }];
  const gain = (h, [hit, miss], k) => evaluate(h, board(hit))[k] - evaluate(h, board(miss))[k];
  const k = knight(); assert.equal(gain(k, strength, 'atk'), 10);
  k.perks.push('linebreaker'); assert.equal(gain(k, strength, 'atk'), 12); assert.equal(gain(k, headtoe, 'block'), 12);
  k.perks.push('linebreaker', 'linebreaker'); assert.equal(gain(k, strength, 'atk'), 16, 'three ranks: +6');
  assert.ok(E.takeCharm(k, 'fang')); assert.equal(gain(k, strength, 'atk'), 32, 'Wolf Fang doubles the lot');
  assert.equal(D.PERKS.linebreaker.max, 5);
  const old = knight(); const hp0 = E.maxHpOf(old); old.perks.push('grit'); assert.equal(E.maxHpOf(old), hp0 + 4, 'an old Stout Heart keeps its health');
  const offers = new Set(); const h = knight(); h.level = 4; h.pendingPerks = 1;
  for (let s = 1; s <= 200; s++) E.offerPerks(h, E.makeRng(s)).forEach((id) => offers.add(id));
  assert.ok(!offers.has('grit'), 'Stout Heart is retired'); assert.ok(offers.has('linebreaker'), 'Line Breaker is offered');
});

test('Heal with Magic is the same for every hero: 2 magic for 3 health; an old Frugal Mender is refunded as a perk pick', async () => {
  const E = await import('../js/engine.js'); const SV = await import('../js/save.js');
  for (const cls of ['knight', 'ranger', 'wizard', 'dwarf', 'bard']) {
    const h = newHero({ name: 'H', cls, seed: 1 }); h.perks.push('frugal');
    assert.equal(E.healCostOf(h), 2, `${cls} pays 2`); assert.equal(E.healAmountOf(h), 3, `${cls} heals 3`);
  }
  const old = newHero({ name: 'Old', cls: 'wizard', seed: 1 }); old.perks = ['vitality', 'frugal']; old.pendingPerks = 0;
  SV.migrateHero(old);
  assert.deepEqual(old.perks, ['vitality']); assert.equal(old.pendingPerks, 1, 'the pick comes back');
  const offers = new Set(); for (let s = 1; s <= 200; s++) E.offerPerks(old, E.makeRng(s)).forEach((id) => offers.add(id));
  assert.ok(!offers.has('frugal'), 'Frugal Mender is no longer offered');
});

test('team monsters fit the company: an equal pair x2.2 and +10 a hit, a beginner beside a veteran adds only their share', async () => {
  const E = await import('../js/engine.js');
  const q = { id: 't', kind: 'battle', enemies: ['goblin'], act: 1, step: 1, hpMult: 1, flat: 0 };
  const mk = (name, cls, level, size) => { const h = newHero({ name, cls, seed: 4 }); h.level = level; if (size) { h.strength = { W: size, E: size }; h.loadout.NW.size = size; } return h; };
  const twinA = mk('A', 'knight', 1); const twinB = mk('B', 'knight', 1);
  const eq = E.newPartyBattle([twinA, twinB], q, makeRng(1));
  assert.equal(eq.team.m, 2); assert.equal(eq.team.hp, 2.2); assert.equal(eq.team.flat, 10);
  const vet = mk('Vet', 'wizard', 6, 8); const kid = mk('Kid', 'bard', 1);
  assert.ok(E.heroStrength(vet) > 1.8 * E.heroStrength(kid), 'a level-6 hero with d8 dice is far stronger than a fresh one');
  const mixed = E.newPartyBattle([vet, kid], q, makeRng(1));
  assert.ok(mixed.team.m > 1.1 && mixed.team.m < 1.6, `a beginner adds a share, not a whole hero (${mixed.team.m})`);
  assert.ok(mixed.team.hp < eq.team.hp && mixed.team.flat < eq.team.flat);
  const trio = E.newPartyBattle([mk('X', 'ranger', 1), mk('Y', 'ranger', 1), mk('Z', 'ranger', 1)], q, makeRng(1));
  assert.equal(trio.team.m, 3); assert.equal(trio.team.hp, 3.4); assert.equal(trio.team.flat, 20);
  const before = JSON.stringify(kid); E.heroStrength(kid); assert.equal(JSON.stringify(kid), before, 'measuring does not change the hero');
});

test('story campaigns: storyScale fits monsters written for one hero of a level to the heroes who came', async () => {
  const E = await import('../js/engine.js');
  assert.equal(E.levelStrength(1), 19); assert.ok(E.levelStrength(20) > E.levelStrength(13));
  const solo = E.storyScale([newHero({ name: 'S', cls: 'knight', seed: 1 })], 1);
  assert.ok(solo.m > 0.6 && solo.m < 1.4, `one fresh hero is about one level-1 hero (${solo.m})`);
  const duo = E.storyScale([newHero({ name: 'A', cls: 'knight', seed: 1 }), newHero({ name: 'B', cls: 'bard', seed: 2 })], 1);
  assert.ok(duo.m > 1.4 && duo.m < 2.4, `a fresh duo is about two (${duo.m})`); assert.ok(duo.hp > solo.hp && duo.flat > solo.flat);
  const grown = newHero({ name: 'G', cls: 'knight', seed: 1 }); grown.level = 6; grown.strength = { W: 8, E: 8 }; grown.loadout.NW.size = 8;
  assert.ok(E.storyScale([grown, newHero({ name: 'B', cls: 'bard', seed: 2 })], 1).m > duo.m, 'heroes stronger than the story expects meet stronger monsters');
});

test('every straight from 5 up pays, and a longer one pays more (a 1-to-8 run used to pay nothing)', async () => {
  const { STRAIGHT } = await import('../js/data.js');
  for (let n = 5; n <= 9; n++) assert.ok(STRAIGHT[n] > (STRAIGHT[n - 1] || 0), `${n} in a row pays more than ${n - 1}`);
});

test('a straight must grow with the biggest body die: d4 five in a row, d6 six, d8 and d10 seven', async () => {
  const E = await import('../js/engine.js'); const h = E.newHero({ name: 'S', cls: 'knight', seed: 2 });
  h.strength.W = 4; h.strength.E = 4; assert.equal(E.straightMin(h), 5);
  h.strength.W = 6; assert.equal(E.straightMin(h), 6);
  h.strength.W = 8; assert.equal(E.straightMin(h), 7);
  h.strength.E = 10; assert.equal(E.straightMin(h), 7);
});

test('the heart backs its symbol on any face: a heart 1 boosts every heal face (1, 5, 9), a 4 every gold face (4, 8, 10)', async () => {
  const E = await import('../js/engine.js');
  const h = E.newHero({ name: 'H', cls: 'knight', seed: 3 }); h.strength = { W: 10, E: 10 };
  const bd = (o) => Object.fromEntries(['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE', 'P'].map((s) => [s, { v: o[s] ?? 2, bound: false }]));
  const base = E.evaluate(h, bd({ C: 6, N: 1, W: 5, E: 9, S: 2 })).heal;
  const boosted = E.evaluate(h, bd({ C: 1, N: 1, W: 5, E: 9, S: 2 }));
  assert.equal(boosted.heal - base, 6, 'head 1, hand 5 and hand 9 all show heal: +2 each');
  assert.deepEqual(boosted.heartSlots.sort(), ['E', 'N', 'W']);
  const gold = E.evaluate(h, bd({ C: 4, N: 4, W: 8, E: 10, S: 3 }));
  assert.equal(gold.heartSlots.length, 3, 'a 4, an 8 and a 10 all carry gold');
});

test('a charge power either stores a charge or releases them in a round, never both', async () => {
  const E = await import('../js/engine.js');
  const h = E.newHero({ name: 'C', cls: 'knight', seed: 4 });
  const b = E.newBattle(h, E.questsFor(h)[0], E.makeRng(4), 1); E.startRoll(b); b.magic = 12;
  assert.ok(E.castPower(b, 'rally')); b.usedRound = {}; assert.ok(E.castPower(b, 'rally'));
  assert.equal(E.castPower(b, 'rally', { release: true }), null, 'stored this round: no release');
  b.usedRound = {};
  assert.ok(E.castPower(b, 'rally', { release: true }), 'a new round: release');
  assert.equal(E.castPower(b, 'rally'), null, 'released this round: no storing');
  assert.equal(E.powerState(b, E.cardsOf(h).find((c) => c.id === 'rally')).spent, true);
});
