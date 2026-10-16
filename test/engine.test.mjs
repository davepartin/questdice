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

test('weapon temperaments: steady never blank, balanced one blank, risky and brutal two at d4 and all one colour; brutal has its top number most often', () => {
  const want = { steady: 0, balanced: 1, risky: 2, brutal: 2 };
  for (const [id, w] of Object.entries(WEAPONS)) {
    if (w.hidden || w.legendary) continue;
    assert.ok(w.temper in want, `${id} has a temperament`);
    const f = weaponFaces({ id, rarity: 1 }); const blanks = f.filter((x) => x.v === 0).length;
    assert.equal(blanks, want[w.temper], `${id} blanks`);
    if (w.temper === 'risky' || w.temper === 'brutal') assert.ok(f.every((x) => x.c === f[0].c), `${id} is all one colour`);
  }
  const topCount = (id) => { const f = weaponFaces({ id, rarity: 1, size: 8 }); const m = Math.max(...f.map((x) => x.v)); return f.filter((x) => x.v === m).length; };
  assert.ok(topCount('mace') > topCount('spear') && topCount('spear') > topCount('sword'));
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

test('straights need 5 in a row across the seven numeric dice; blanks never count; cash for gold', () => {
  const r = ranger(); r.strength.E = 6; // a d6 hand can show a 5
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

test('training a weapon needs the hand first, and gold; forging a tier costs gold and keeps both copies in step', () => {
  const h = newHero({ name: 'T', cls: 'knight', seed: 1 }); h.strength = { W: 4, E: 4 };
  const uid = h.loadout.NW.uid;
  h.gold = 1000;
  assert.equal(trainInfo(h, uid).why, 'hands');
  assert.equal(trainWeapon(h, uid), false);
  h.strength.W = 6; assert.equal(trainWeapon(h, uid), true);
  assert.equal(h.loadout.NW.size, 6); assert.equal(h.gold, 1000 - WEAPON_SIZE_STEPS[4]);
  assert.equal(trainInfo(h, uid).why, 'hands'); // d8 needs a d8 hand
  assert.equal(forgeWeapon(h, uid), true); assert.equal(h.loadout.NW.rarity, 1);
  assert.equal(h.gold, 1000 - WEAPON_SIZE_STEPS[4] - FORGE_COST[1]);
  h.gold = 0; assert.equal(forgeInfo(h, uid).why, 'gold');
  // a two-hander sits in both hands, but each hand's die (the bow, then its arrows) is forged on its own
  const r = newHero({ name: 'R', cls: 'ranger', seed: 1 }); r.gold = 1000; const ru = r.loadout.NW.uid;
  assert.equal(r.loadout.NE.twin, true); assert.notEqual(r.loadout.NE.uid, ru);
  assert.equal(forgeWeapon(r, ru), true);
  assert.equal(r.loadout.NW.rarity, 1); assert.equal(r.loadout.NE.rarity, 0, 'the arrows stay as they were');
  assert.equal(r.gold, 1000 - Math.round(FORGE_COST[1] * 1.4));
  assert.equal(forgeWeapon(r, r.loadout.NE.uid), true); assert.equal(r.loadout.NE.rarity, 1);
});

test('Gold, the best metal, cannot be forged further and fists cannot be improved', () => {
  const h = newHero({ name: 'T', cls: 'knight', seed: 1 }); h.gold = 9999; const uid = h.loadout.NW.uid;
  for (let i = 0; i < 2; i++) assert.equal(forgeWeapon(h, uid), true);
  assert.equal(h.loadout.NW.rarity, 2); assert.equal(forgeInfo(h, uid).why, 'max');
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
  const rel = castPower(b, 'rally', { release: true });
  assert.equal(rel.released, 2); assert.equal(b.mods.atk - before.atk, 6); assert.equal(b.mods.block - before.block, 6);
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
  const r = castPower(b, 'coil', { release: true }); assert.equal(r.total, 15); assert.equal(b.mods.atk, 15); assert.equal(b.mods.splash, 7);
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
  const h = knight(); h.special = { SW: 6, SE: 6 }; h.talent = { SW: [], SE: [] };
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
  assert.equal(DIFFICULTY.legendary.hp, 1.15); assert.equal(DIFFICULTY.legendary.flat, 2); assert.equal(DIFFICULTY.legendary.gold, 1.25); assert.equal(DIFFICULTY.legendary.budget, 1.25);
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
  assert.equal(legend.enemies[0].maxHp, Math.round(30 * 1.15));
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
  assert.equal(party.enemies[0].maxHp, Math.round(30 * 1.15 * 1.8));
  assert.equal(party.enemies[0].flat, 2);
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
        assert.deepEqual(questsFor(h)[0].enemies, locked, `${act.name} step ${step} ${diff}`);
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

test('each power level adds half the base number (3, 5, 7, 9), and pierce stays a little under attack', async () => {
  const { scaleNum } = await import('../js/engine.js');
  assert.deepEqual([0, 1, 2, 3].map((l) => scaleNum(3, l)), [3, 5, 7, 9]);
  assert.deepEqual([0, 1, 2, 3].map((l) => scaleNum(5, l)), [5, 8, 11, 14]);
  assert.deepEqual([0, 1, 2, 3].map((l) => scaleNum(12, l)), [12, 18, 24, 30]);
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
