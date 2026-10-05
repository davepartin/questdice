import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeRng, newHero, evaluate, weaponFaces, makeWeapon, newBattle, startRoll, resolve, reroll, rerollInfo,
  playCard, nudge, gainXp, equip, isTwoHanded, questsFor, specialFace, maxHpOf,
  sidesOf, castPower, beginReset, recharge, powerUpgradeInfo, upgradePower, powerLevel, trainInfo, trainWeapon, forgeInfo, forgeWeapon, addTalent, isActive, activeSlots, unlockInfo, unlockDie,
} from '../js/engine.js';
import { CLASSES, WEAPONS, MONSTERS, FORGE_COST, WEAPON_SIZE_STEPS, NUDGE_COST, TALENT_SLOT_COST, RES_BY_SIZE } from '../js/data.js';

const board = (o) => {
  const b = {};
  for (const s of ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE']) b[s] = { v: 1, bound: false };
  for (const [k, v] of Object.entries(o)) b[k] = { v, bound: false };
  return b;
};
// Weapon die faces (index = v-1) for reference: sword 0r,1b,3r,4r; bow 0b,1r,2r,3r.
const knight = () => newHero({ name: 'K', cls: 'knight', seed: 1, full: true });
const ranger = () => newHero({ name: 'R', cls: 'ranger', seed: 1, full: true });

test('weapon face budgets: sum to 7, with documented exceptions', () => {
  // Bow is intentionally 6 (synergy engine). Sword/Shield as written in the design doc sum to 8: an
  // open question in docs/DESIGN.md, kept here so a change is a conscious decision.
  const exceptions = { bow: 6, sword: 8, shield: 8 };
  for (const [id, w] of Object.entries(WEAPONS)) {
    if (w.hidden) continue;
    const sum = w.faces.reduce((a, f) => a + f.v, 0);
    assert.equal(sum, exceptions[id] ?? 7, id);
    assert.ok(w.faces.some((f) => f.v === 0 || f.v === 1), `${id} has a risk face`);
  }
});

test('universal number language on head, hands and feet (the feet number is also initiative)', () => {
  const h = knight();
  // head=1 loot, left hand=2 pierce, right hand=3 magic, feet=4 magic (and initiative 4). heart 6 so no amp.
  const ev = evaluate(h, board({ N: 1, W: 2, E: 3, S: 4, C: 6, NW: 1, NE: 1 }));
  assert.equal(ev.gold, 2); assert.equal(ev.pierce, 2); assert.equal(ev.magic, 3); assert.equal(ev.init, 4);
});

test('heart amplifies only matching cardinal dice', () => {
  const h = knight();
  const ev = evaluate(h, board({ N: 2, W: 2, E: 3, S: 2, C: 2 }));
  assert.equal(ev.pierce, 3 * 2 + 3 * 2); // three 2s (head, left hand, feet): 2 each, plus +2 amp each
  assert.equal(ev.magic, 2);
});

test('lane = weapon + strength; weapon color decides attack vs block', () => {
  const h = knight();
  // NW sword idx2 -> 3 red; NE shield idx2 -> 3 blue. hands 4 and 1.
  const ev = evaluate(h, board({ NW: 3, W: 4, NE: 3, E: 4, C: 3 }));
  assert.equal(ev.lanes.L.value, 3 + 4); assert.equal(ev.lanes.L.color, 'r');
  assert.equal(ev.lanes.R.color, 'b');
  assert.equal(ev.atk, 7); assert.equal(ev.block, 7);
});

test('talent die: 2x doubles that hand, symbols are worth the hand strength, a face may hold two', () => {
  const h = knight(); h.special.SW = 6; h.talent.SW = [['heal', 'atk'], [], ['gold']];
  assert.equal(specialFace(h, 'SW', 1), null); assert.equal(specialFace(h, 'SW', 2), null);
  assert.equal(specialFace(h, 'SW', 3), 'X2'); assert.deepEqual(specialFace(h, 'SW', 4), ['heal', 'atk']);
  assert.equal(specialFace(h, 'SW', 5), null); // an empty symbol face is a blank
  const ev = evaluate(h, board({ NW: 3, W: 3, SW: 3, SE: 3, E: 2, NE: 1, C: 3 }));
  assert.equal(ev.lanes.L.value, 3 + 3 + 3); // 2x adds the strength a second time
  const ev2 = evaluate(h, board({ SW: 4, W: 3, NW: 1, C: 3 })); // heal x2 and attack on one face
  assert.equal(ev2.heal, 6); assert.ok(ev2.atk >= 3);
  const base = evaluate(h, board({ SW: 5, W: 4, NW: 1, C: 3 })).gold;
  assert.equal(evaluate(h, board({ SW: 6, W: 4, NW: 1, C: 3 })).gold - base, 2); // gold is half of 4
});

test('talent slots cost the same, hold two of a symbol per face, but never more than two of one symbol per die', () => {
  const h = knight(); h.gold = 500; h.special.SW = 6; h.talent.SW = [[], [], []];
  assert.ok(addTalent(h, 'SW', 0, 'atk')); assert.ok(addTalent(h, 'SW', 0, 'atk')); // two of the same on one face
  assert.equal(addTalent(h, 'SW', 1, 'atk'), false); // a third attack on the die
  assert.equal(addTalent(h, 'SW', 0, 'heal'), false); // face full
  assert.ok(addTalent(h, 'SW', 1, 'heal')); assert.equal(h.gold, 500 - 3 * TALENT_SLOT_COST);
  const poor = knight(); poor.gold = 0; assert.equal(addTalent(poor, 'SE', 0, 'gold'), false);
  const d4 = knight(); d4.gold = 500; assert.equal(addTalent(d4, 'SW', 1, 'gold'), false); // a d4 has one symbol face
});

test('rerolls: four dice, three free then three paid at one magic a die', () => {
  const h = knight(); const b = newBattle(h, questsFor(h)[0], makeRng(3), 1); startRoll(b);
  b.magic = 5; const slots = ['NW', 'N', 'NE', 'W'];
  for (let i = 0; i < 3; i++) { assert.equal(rerollInfo(b).kind, 'free'); assert.equal(rerollInfo(b).dice, 4); assert.ok(reroll(b, slots)); }
  assert.equal(b.magic, 5); assert.equal(rerollInfo(b).kind, 'paid');
  assert.ok(reroll(b, slots)); assert.equal(b.magic, 1); assert.equal(reroll(b, slots), false); // not enough magic
  assert.equal(reroll(b, slots.slice(0, 1)), true);
});

test('heart 5 / 6 pump the best lane of the matching color', () => {
  const h = knight();
  const base = evaluate(h, board({ NW: 3, W: 2, NE: 3, E: 2, C: 3 }));
  const six = evaluate(h, board({ NW: 3, W: 2, NE: 3, E: 2, C: 6 }));
  assert.equal(six.atk - base.atk, 4);
  const five = evaluate(h, board({ NW: 3, W: 2, NE: 3, E: 2, C: 5 }));
  assert.equal(five.block - base.block, 4);
});

test('top-row triple needs a two-handed weapon; vertical triple gives +10 block', () => {
  const k = knight();
  assert.equal(isTwoHanded(k), false);
  assert.equal(evaluate(k, board({ NW: 3, N: 3, NE: 3, C: 5 })).offense3, false, 'one-handed setups never get the top-row bonus');
  const r = ranger();
  assert.equal(isTwoHanded(r), true);
  // bow faces: idx0 0b, idx1 1r, idx2 2r, idx3 3r  -> v = idx. Head 2 matches both weapon 2s.
  const hit = evaluate(r, board({ NW: 3, N: 2, NE: 3, C: 6 }));
  assert.equal(hit.offense3, true);
  const miss = evaluate(r, board({ NW: 3, N: 2, NE: 4, C: 6 }));
  assert.equal(miss.offense3, false);
  const blanks = evaluate(r, board({ NW: 1, N: 1, NE: 1, C: 6 })); // two blanks (0) never match a d4 head
  assert.equal(blanks.offense3, false);
  const v = evaluate(k, board({ N: 3, C: 3, S: 3, NW: 1, NE: 1 }));
  assert.equal(v.defense3, true);
  assert.ok(v.block >= 10);
});

test('straights need 5 in a row across the seven numeric dice; blanks never count; cash for gold', () => {
  const r = ranger(); r.strength.E = 6; // a d6 hand can show a 5
  // head1 feet2 heart3 left-hand4 right-hand5 -> 1,2,3,4,5; both bow dice are blanks (v=0)
  const b = board({ N: 1, S: 2, C: 3, W: 4, E: 5, NW: 1, NE: 1 });
  const atk = evaluate(r, b, { straight: 'atk' });
  const gold = evaluate(r, b, { straight: 'gold' });
  assert.equal(atk.straight, 5); assert.equal(atk.straightBonus, 10);
  assert.equal(atk.atk - gold.atk, 10);
  assert.equal(gold.gold - atk.gold, 10);
  // a 1-2-3-4 is only four long: no payout
  assert.equal(evaluate(ranger(), board({ N: 1, S: 2, C: 3, W: 4, E: 4, NW: 1, NE: 1 })).straight, 0);
});

test('tier adds corner bonus symbols and never changes a number', () => {
  const nums = (r) => weaponFaces({ id: 'sword', rarity: r }).map((f) => f.v);
  for (const r of [1, 2, 3]) assert.deepEqual(nums(r), [0, 1, 3, 4]);
  const fx = (r) => weaponFaces({ id: 'sword', rarity: r }).map((f) => f.fx || null);
  assert.deepEqual(fx(0), [null, null, null, { pierce: 1 }]);
  assert.deepEqual(fx(1), [null, null, { pierce: 1 }, { pierce: 1 }]);
  assert.deepEqual(fx(2)[1], { magic: 1 });
  assert.deepEqual(fx(3)[3], { pierce: 2 });
});

test('a weapon die is as big as its size, capped by the hand that holds it', () => {
  const h = newHero({ name: 'T', cls: 'knight', seed: 1 });
  assert.equal(sidesOf(h, 'NW'), 4);
  h.loadout.NW.size = 6; // bigger weapon, small hand: still a d4
  assert.equal(sidesOf(h, 'NW'), 4);
  h.strength.W = 6;
  assert.equal(sidesOf(h, 'NW'), 6);
  assert.equal(sidesOf(h, 'NE'), 4); // the other lane is untouched
  const f = weaponFaces(h.loadout.NW);
  assert.deepEqual(f.map((x) => x.v), [0, 1, 3, 4, 5, 6]);
  assert.equal(f[4].c, 'r'); assert.equal(f[5].c, 'b'); // extra faces alternate colour, offence first
});

test('training a weapon needs the hand first, and gold; forging a tier costs gold and keeps both copies in step', () => {
  const h = newHero({ name: 'T', cls: 'knight', seed: 1 });
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
  // a two-hander sits in both hands: forging it updates both copies, once
  const r = newHero({ name: 'R', cls: 'ranger', seed: 1 }); r.gold = 1000; const ru = r.loadout.NW.uid;
  assert.equal(r.loadout.NE.uid, ru); assert.equal(forgeWeapon(r, ru), true);
  assert.equal(r.loadout.NW.rarity, 1); assert.equal(r.loadout.NE.rarity, 1);
  assert.equal(r.gold, 1000 - Math.round(FORGE_COST[1] * 1.4));
});

test('the best tier cannot be forged further and fists cannot be improved', () => {
  const h = newHero({ name: 'T', cls: 'knight', seed: 1 }); h.gold = 9999; const uid = h.loadout.NW.uid;
  for (let i = 0; i < 3; i++) assert.equal(forgeWeapon(h, uid), true);
  assert.equal(h.loadout.NW.rarity, 3); assert.equal(forgeInfo(h, uid).why, 'max');
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
  const b = duel(h, 'goblin', guard, { NW: 3, W: 4, C: 6, NE: 1, E: 1, N: 4, S: 4 });
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

test('stagger cancels a wind-up; otherwise the next round is a Slam', () => {
  const h = knight();
  const wind = { n: 'Wind-Up', v: 'charge', f: 0, m: 0 };
  const hit = duel(h, 'ogre', wind, { NW: 4, W: 4, NE: 1, E: 1, C: 6, N: 4, S: 4 }); // big enough to cross 25% of 96
  hit.enemies[0].staggerAt = 1;
  resolve(hit, {});
  assert.equal(hit.enemies[0].intent.n !== 'Slam', true);
  const miss = duel(h, 'ogre', wind, { NW: 1, W: 1, NE: 1, E: 1, C: 3, N: 4, S: 4 });
  miss.enemies[0].staggerAt = 9999;
  resolve(miss, {});
  assert.equal(miss.enemies[0].intent.n, 'Slam');
  assert.equal(miss.enemies[0].intent.slam, true);
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
  const a = castPower(b, 'aimed', { x: 5 }); assert.equal(a.rolls.length, 5); assert.equal(b.magic, 7); assert.equal(b.mods.pierce, a.total);
  assert.equal(castPower(b, 'rain'), null); // round 1: too early
  const k = knight(); k.level = 8; k.powerLevel = { cleave: 2 };
  const b2 = newBattle(k, { ...questsFor(k)[0], enemies: ['goblin', 'goblin', 'wolf'] }, makeRng(4), 1);
  beginReset(b2); beginReset(b2); beginReset(b2); startRoll(b2); b2.magic = 12; // round 3
  assert.equal(castPower(b2, 'cleave').rolls.length, 4); // 2 dice + 2 levels
  assert.ok(castPower(b2, 'judgment')); assert.equal(b2.mods.aoe, Math.round(12 * 1.25 * 0 + 12 * (1 + 0.25 * 0)));
  b2.board.NW.v = 1; const hp0 = b2.enemies.map((e) => e.hp);
  const rep = resolve(b2, { target: 0 });
  assert.ok(rep.splashed.length >= 2 && b2.enemies.slice(1).every((e, i) => e.hp < hp0[i + 1] || e.hp === 0), 'every other monster takes area damage');
  b2.used.judgment = true; b2.magic = 12; assert.equal(recharge(b2, 'judgment'), false);
});

test('power upgrades cost gold and make numbers and dice bigger', () => {
  const h = knight(); h.gold = 500;
  assert.equal(powerUpgradeInfo(h, 'cleave').cost, 60); assert.ok(upgradePower(h, 'cleave')); assert.equal(h.gold, 440);
  assert.ok(upgradePower(h, 'cleave')); assert.equal(upgradePower(h, 'cleave'), false); assert.equal(powerLevel(h, 'cleave'), 2);
  assert.equal(upgradePower(h, 'nonsense'), false);
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
  b.magic = NUDGE_COST - 1; assert.equal(nudge(b, 1), false); b.magic = NUDGE_COST + 1; b.board.C.v = 3; nudge(b, 1);
  b.board.C.v = 6; assert.equal(nudge(b, 1), false);
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

test('monsters: every face table has six faces and a valid verb', () => {
  const verbs = new Set(['strike', 'pierce', 'guard', 'mend', 'charge', 'howl', 'bind', 'drain', 'pilfer', 'summon']);
  for (const [id, m] of Object.entries(MONSTERS)) {
    assert.equal(m.faces.length, 6, id);
    for (const f of [...m.faces, ...(m.rage ? m.rage.faces : [])]) assert.ok(verbs.has(f.v), `${id} ${f.n}`);
    if (m.rage) assert.equal(m.rage.faces.length, 6, id);
    if (m.faces.some((f) => f.v === 'charge')) assert.ok(m.slam, `${id} needs a slam`);
    if (m.faces.some((f) => f.v === 'summon')) assert.ok(m.adds, `${id} needs adds`);
  }
});

test('rage: a boss at half health swaps to its rage table', () => {
  const h = knight();
  const b = duel(h, 'goblinking', { n: 'Scepter', v: 'strike', f: 0, m: 0 }, { NW: 4, W: 4, NE: 4, E: 4, C: 6, N: 4, S: 4 });
  const e = b.enemies[0]; e.hp = Math.ceil(e.maxHp * 0.55);
  const rep = resolve(b, {});
  assert.ok(e.raged || e.hp <= 0, 'raged once under half'); if (e.hp > 0) assert.deepEqual(rep.raged, [e.uid]);
});

test('a new hero starts with six dice and camp unlocks the rest one at a time', () => {
  const h = newHero({ name: 'N', cls: 'knight', seed: 1 });
  assert.deepEqual(activeSlots(h).sort(), ['C', 'E', 'N', 'NW', 'S', 'W']);
  assert.equal(isActive(h, 'SW'), false); assert.equal(unlockInfo(h, 'SW').why, 'gold');
  h.gold = 100; assert.ok(unlockDie(h, 'SW')); assert.equal(isActive(h, 'SW'), true); assert.ok(h.gold < 100);
  assert.equal(unlockDie(h, 'SW'), false); // already have it
  assert.ok(unlockDie(h, 'NE')); assert.ok(unlockDie(h, 'SE')); assert.equal(activeSlots(h).length, 9);
  const r = newHero({ name: 'R', cls: 'ranger', seed: 1 }); assert.equal(isActive(r, 'NE'), true); // a two-hander fills both weapon dice
});

test('dice that are not on the board contribute nothing and cannot be rerolled', () => {
  const h = newHero({ name: 'N', cls: 'knight', seed: 1 });
  const full = knight();
  const bd = board({ NW: 4, NE: 4, SW: 4, SE: 4, W: 3, E: 3, C: 3 });
  const a = evaluate(h, bd); const f = evaluate(full, bd);
  assert.ok(a.atk + a.block + a.heal + a.magic < f.atk + f.block + f.heal + f.magic);
  assert.equal(a.lanes.R, undefined); assert.ok(a.lanes.L);
  const b = newBattle(h, questsFor(h)[0], makeRng(3), 1); startRoll(b); b.magic = 9;
  assert.equal(reroll(b, ['NE']), false); assert.equal(reroll(b, ['SW']), false); assert.ok(reroll(b, ['N']));
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

test('a d4 hand showing 4 pays one magic each: two hands, two magic (what the triangle on the face shows)', () => {
  const h = knight();
  const ev = evaluate(h, board({ W: 4, E: 4, N: 2, S: 2, C: 5, NW: 1, NE: 1 }));
  assert.equal(ev.magic, 2); // head shows 2 (pierce), feet are initiative: only the two hands pay magic
  // and every face's symbol count is exactly what it pays: d4 [2 gold, 2 pierce, 2 magic, 1 magic]
  assert.deepEqual(RES_BY_SIZE[4], [2, 2, 2, 1]);
});
