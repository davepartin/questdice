import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeRng, newHero, evaluate, newBattle, startRoll, resolve, maxHpOf, shopStock,
  newCompany, splitInt, shareWeights, rankFighters, heatRank, newPartyBattle, resolveParty, partyRewards,
  spendBlessings, weaponValue, startFighter, commitFighter, castPower, questsFor,
} from '../js/engine.js';
import { ensureRoad, roadIsOpen, chooseRoad } from '../js/roads.js';
import { WEAPONS, CLASSES } from '../js/data.js';

const board = (o) => {
  const b = {};
  for (const s of ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE']) b[s] = { v: 1, bound: false };
  for (const [k, v] of Object.entries(o)) b[k] = { v, bound: false };
  return b;
};
// Sword blank (red 0) and shield bash (red 1). Both lanes attack, so block stays 0. Heart 2 or 3 matches no head/hand/feet
// here and pumps no colour; the two heroes get different hearts so no team triple or Heartbeat sneaks into these tests.
const quiet = (feet, hands = 1) => board({ NW: 1, NE: 2, W: hands, E: hands, N: 4, S: feet, C: feet === 4 ? 2 : 3, SW: 1, SE: 1 });

function company(seed = 4, roster) {
  return newCompany({
    name: 'Lanterns',
    roster: roster || [{ name: 'Ada', cls: 'knight' }, { name: 'Bea', cls: 'knight' }],
    seed,
  });
}
const quest = { enemies: ['goblin'], hpMult: 1, flat: 0, rewardMult: 1, kind: 'battle', perilous: false };
const strike = { n: 'Stab', v: 'strike', f: 9, m: 0 };

function partyFight(members, intent, hp = 999, enemy = 'goblin') {
  const b = newPartyBattle(members, { ...quest, enemies: [enemy] }, makeRng(7));
  const e = b.enemies[0];
  e.hp = hp; e.maxHp = Math.max(e.maxHp, hp); e.intent = intent; e.flat = 0; e.buff = 0;
  b.fighters.forEach((f, i) => {
    f.board = quiet(i === 0 ? 1 : 4); // Ada is slow (Feet 1), so the monsters go after her; Bea is quick (Feet 4)
    f.mods = { atk: 0, pierce: 0, block: 0, heal: 0, weaken: 0 };
    f.target = 0; f.straight = 'atk';
  });
  return b;
}
const byName = (rep, name) => rep.fighters.find((f) => f.name === name);

test('feet shares are the design table, as whole numbers', () => {
  const w = (n) => shareWeights(Array.from({ length: n }));
  assert.deepEqual(w(2), [2, 1]);
  assert.deepEqual(splitInt(9, w(2)), [6, 3]);
  assert.deepEqual(splitInt(8, w(3)), [4, 2, 2]);
  assert.deepEqual(splitInt(10, w(4)), [4, 2, 2, 2]);
  assert.deepEqual(splitInt(5, [1, 1, 1]), [2, 2, 1]); // remainder prefers the earlier hero
});

test('the slowest hero draws the attacks; a tie goes to more health, then a coin', () => {
  const hero = (name, feet, hp = 10) => ({ hp, hero: { name }, board: quiet(feet) });
  assert.equal(heatRank([hero('Ada', 4), hero('Bea', 1)], () => 0.5)[0].f.hero.name, 'Bea');
  assert.equal(heatRank([hero('Ada', 2, 30), hero('Bea', 2, 12)], () => 0.5)[0].f.hero.name, 'Ada');
  assert.equal(heatRank([hero('Ada', 2, 12), hero('Bea', 2, 30)], () => 0.5)[0].f.hero.name, 'Bea');
  let i = 0; const coins = [0.2, 0.9];
  assert.equal(heatRank([hero('Ada', 3), hero('Bea', 3)], () => coins[i++])[0].f.hero.name, 'Bea');
  assert.equal(heatRank([hero('Ada', 1, 0), hero('Bea', 3)], () => 0.5)[0].f.hero.name, 'Bea', 'a fallen hero is never the target');
});

test('initiative: feet, then hands, then a coin, decide who acts first', () => {
  const hero = (name, feet, hands) => ({ hp: 10, hero: { name }, board: quiet(feet, hands) });
  const highFeet = rankFighters([hero('Ada', 4, 1), hero('Bea', 1, 4)], () => 0.99);
  assert.equal(highFeet[0].f.hero.name, 'Ada');
  const highHands = rankFighters([hero('Ada', 2, 1), hero('Bea', 2, 4)], () => 0.01);
  assert.equal(highHands[0].f.hero.name, 'Bea');
  let i = 0;
  const coins = [0.2, 0.9];
  const flip = rankFighters([hero('Ada', 3, 2), hero('Bea', 3, 2)], () => coins[i++]);
  assert.equal(flip[0].f.hero.name, 'Bea');
});

test('a company shares one road, and retaliation splits 6 and 3', () => {
  const c = company();
  assert.equal(c.members[0].campaign, c.members[1].campaign);
  const b = partyFight(c.members, strike);
  const rep = resolveParty(b);
  const ada = byName(rep, 'Ada'); const bea = byName(rep, 'Bea');
  assert.equal(ada.leader, true);
  assert.equal(ada.taken, 6); assert.equal(bea.taken, 3);
  assert.equal(ada.absorbed, 0); assert.equal(bea.absorbed, 0);
  assert.equal(rep.leader, 'Ada');
});

test('the leader’s block soaks only the leader’s share', () => {
  const c = company();
  const b = partyFight(c.members, strike);
  b.fighters[0].mods.block = 4;
  const rep = resolveParty(b);
  assert.equal(byName(rep, 'Ada').taken, 2);
  assert.equal(byName(rep, 'Ada').absorbed, 4);
  assert.equal(byName(rep, 'Bea').taken, 3);
  assert.equal(byName(rep, 'Bea').absorbed, 0);
});

test('a guarding monster has one pool, and the fastest hero spends it first', () => {
  const c = company();
  const b = partyFight(c.members, { n: 'Duck', v: 'guard', f: 6, m: 0 });
  for (const f of b.fighters) f.mods.atk = 4 - evaluate(f.hero, f.board).atk;
  const rep = resolveParty(b);
  const ada = rep.strikes.find((s) => s.name === 'Ada');
  const bea = rep.strikes.find((s) => s.name === 'Bea');
  assert.equal(bea.atk, 4); assert.equal(bea.guarded, 4); assert.equal(bea.dealt, 0); // Bea's Feet 4 acts first
  assert.equal(ada.atk, 4); assert.equal(ada.guarded, 2); assert.equal(ada.dealt, 2);
});

test('a killed monster does not strike the company', () => {
  const c = company();
  const b = partyFight(c.members, strike, 1);
  b.fighters[0].mods.atk = 80;
  const rep = resolveParty(b);
  assert.equal(b.outcome, 'victory');
  assert.equal(rep.fighters.reduce((a, f) => a + f.taken, 0), 0);
  assert.equal(rep.killed.length, 1);
});


test('a weaken blessing applies once; weaken cards still stack', () => {
  const c = company();
  const b = partyFight(c.members, strike);
  for (const f of b.fighters) f.boon = { ...f.boon, weaken: 2 };
  const rep = resolveParty(b);
  assert.equal(byName(rep, 'Ada').taken + byName(rep, 'Bea').taken, 7);

  const stacked = partyFight(c.members, strike);
  for (const f of stacked.fighters) f.boon = { ...f.boon, weaken: 2 };
  stacked.fighters[0].mods.weaken = 3;
  const rep2 = resolveParty(stacked);
  assert.equal(byName(rep2, 'Ada').taken + byName(rep2, 'Bea').taken, 4);
});

test('bind, drain and a stolen purse land on the hero the monsters go after', () => {
  const c = company();
  c.members[0].gold = 10;
  const b = partyFight(c.members, { n: 'Hex', v: 'bind', f: 0, m: 0, k: 2 });
  const bound = resolveParty(b);
  assert.equal(bound.bound, 2);
  assert.equal(b.fighters[0].nextBound, 2);
  assert.equal(b.fighters[1].nextBound || 0, 0);

  const theft = partyFight(c.members, { n: 'Cutpurse', v: 'pilfer', f: 9, m: 0 });
  c.members[0].gold = 10;
  const rep = resolveParty(theft);
  const ada = theft.fighters[0];
  assert.equal(rep.leader, 'Ada');
  assert.equal(rep.goldStolen, 6);
  assert.equal(ada.purseLost, 6);
  assert.equal(theft.enemies[0].carried, 6);
  assert.equal(ada.goldEarned, ada.T.gold - 6);

  const earned = ada.goldEarned;
  theft.enemies[0].hp = 1;
  theft.enemies[0].intent = { n: 'Stab', v: 'strike', f: 0, m: 0 };
  for (const f of theft.fighters) {
    f.board = quiet(f.hero.name === 'Ada' ? 4 : 1);
    f.mods = { atk: f.hero.name === 'Ada' ? 40 : 0, pierce: 0, block: 0, heal: 0, weaken: 0 };
  }
  resolveParty(theft);
  assert.equal(ada.purseLost, 0);
  assert.equal(ada.goldEarned, earned + ada.T.gold + 6);
});

test('opening attack is only the first round', () => {
  const c = company();
  const b = partyFight(c.members, { n: 'Duck', v: 'guard', f: 0, m: 0 });
  for (const f of b.fighters) f.boon = { ...f.boon, openingAtk: 3 };
  const first = resolveParty(b);
  const bare = evaluate(c.members[0], quiet(4)).atk;
  assert.equal(first.strikes.find((s) => s.name === 'Ada').atk, bare + 3);

  for (const f of b.fighters) {
    f.board = quiet(f.hero.name === 'Ada' ? 4 : 1);
    f.mods = { atk: 0, pierce: 0, block: 0, heal: 0, weaken: 0 };
  }
  b.enemies[0].intent = { n: 'Duck', v: 'guard', f: 0, m: 0 };
  b.enemies[0].hp = 999;
  const second = resolveParty(b);
  assert.equal(second.round, 2);
  assert.equal(second.strikes.find((s) => s.name === 'Ada').atk, bare);
});

test('kill gold splits by points: the top scorer gets half a share more; dice gold stays; Gold Sense per share; XP not split', () => {
  const c = company();
  c.members[1].perks.push('greed');
  const b = {
    quest,
    enemies: [{ xp: 8, gold: 10 }],
    fighters: [
      { hero: c.members[0], points: 20, goldEarned: 3 },
      { hero: c.members[1], points: 5, goldEarned: 0 },
    ],
  };
  const r = partyRewards(b);
  assert.equal(r.xp, 8);
  assert.equal(r.order[0], 'Ada'); assert.equal(r.place.Ada, 1); assert.equal(r.place.Bea, 2);
  assert.equal(r.gold.Ada, Math.round(5 * 1.5) + 3);
  assert.equal(r.gold.Bea, Math.round(5 * 1.25), 'with two heroes there is no runner-up bonus');
  assert.equal(r.drops.length, 3);
});

test('three heroes: 1st gets +50% of a share, 2nd +25%, the rest the even share', () => {
  const c = company(4, [{ name: 'Ada', cls: 'knight' }, { name: 'Bea', cls: 'knight' }, { name: 'Cy', cls: 'knight' }]);
  const b = { quest, enemies: [{ xp: 9, gold: 30 }], fighters: c.members.map((m, i) => ({ hero: m, points: [5, 50, 20][i], goldEarned: 0 })) };
  const r = partyRewards(b);
  assert.deepEqual(r.order, ['Bea', 'Cy', 'Ada']);
  assert.equal(r.gold.Bea, 15); assert.equal(r.gold.Cy, Math.round(10 * 1.25)); assert.equal(r.gold.Ada, 10);
});

test('team triples: two Strength Triples on the same monster are a Team Strength Attack, +10 each', () => {
  const c = company();
  const b = partyFight(c.members, { n: 'Duck', v: 'guard', f: 0, m: 0 });
  b.fighters.forEach((f) => { f.board = board({ NW: 1, NE: 2, W: 2, E: 2, C: 2, N: 4, S: 1, SW: 1, SE: 1 }); });
  const solo = evaluate(c.members[0], b.fighters[0].board).atk;
  const rep = resolveParty(b);
  assert.equal(rep.team.length, 1); assert.equal(rep.team[0].label, 'Team Strength Attack');
  for (const s of rep.strikes) assert.ok(s.atk >= solo + 10);
  assert.equal(rep.heartbeat.magic, 2, 'both hearts show 2: Heartbeat gives each hero 2 magic');
});

test('team attack needs the same monster', () => {
  const c = company();
  const b = partyFight(c.members, { n: 'Duck', v: 'guard', f: 0, m: 0 });
  b.enemies.push({ ...b.enemies[0], uid: 'other', hp: 999 });
  b.fighters.forEach((f, i) => { f.board = board({ NW: 1, NE: 2, W: 2, E: 2, C: 2, N: 4, S: 1, SW: 1, SE: 1 }); f.target = i; });
  const rep = resolveParty(b);
  assert.equal(rep.team.length, 0);
});

test('Moral Boost: the killing blow gives the next hero +3 attack', () => {
  const c = company();
  const b = partyFight(c.members, { n: 'Duck', v: 'guard', f: 0, m: 0 }, 1);
  b.enemies.push({ ...b.enemies[0], uid: 'second', hp: 999, maxHp: 999 });
  b.fighters[1].target = 1;
  b.fighters[0].board.S.v = 4; b.fighters[1].board.S.v = 1; // Ada acts first and lands the killing blow; Bea is next
  const rep = resolveParty(b);
  assert.equal(rep.moral.length, 1); assert.equal(rep.moral[0].n, 3); assert.equal(rep.moral[0].to, 'Bea');
});

test('team actions: a thrown potion, shared magic, a revive; one a round', async () => {
  const { teamAction } = await import('../js/engine.js');
  const c = company();
  const b = newPartyBattle(c.members, quest, makeRng(2));
  const [A, B] = b.fighters;
  B.hp = B.maxHp - 12; A.magic = 12; b.magic = 12; // hero 0 is the focused one: the battle mirrors their magic
  assert.equal(teamAction(b, 0, 'potion', 1).ok, true); assert.equal(B.hp, B.maxHp - 2); assert.equal(A.potions, 1);
  assert.equal(teamAction(b, 0, 'magic', 1).ok, false, 'one team action a round');
  b.round++; const bm = B.magic;
  assert.equal(teamAction(b, 0, 'magic', 1).ok, true); assert.equal(A.magic, 10); assert.equal(B.magic, bm + 2);
  b.round++; B.hp = 0;
  assert.equal(teamAction(b, 0, 'revive', 1).ok, true); assert.equal(B.hp, 10); assert.equal(A.magic, 0);
  b.round++; B.hp = 0; A.magic = 12; b.magic = 12;
  assert.equal(teamAction(b, 0, 'revive', 1).ok, false, 'one revive a battle');
  assert.ok(A.points > 0);
});

test('the spoils draft goes by points, lets you skip, and comes back around', async () => {
  const { newDraft, draftWho, draftPick, draftSkip } = await import('../js/engine.js');
  const d = newDraft(['Bea', 'Ada', 'Cy'], 3);
  assert.equal(draftWho(d), 'Bea'); assert.equal(draftSkip(d, 'Bea'), true);
  assert.equal(draftPick(d, 'Ada', 2), true); assert.equal(draftPick(d, 'Ada', 1), false, 'not your turn');
  assert.equal(draftPick(d, 'Cy', 0), true);
  assert.equal(draftWho(d), 'Bea', 'it comes back around'); assert.equal(draftPick(d, 'Bea', 1), true);
  assert.equal(d.done, true);
  const e = newDraft(['A', 'B'], 3); draftSkip(e, 'A'); draftSkip(e, 'B'); assert.equal(e.done, true, 'everyone skipped in a row');
});

test('battle points add up; the lifetime record keeps 1st places (and 2nd only with 3+ heroes)', async () => {
  const { recordBattle } = await import('../js/engine.js');
  const h = newHero({ name: 'R', cls: 'knight', seed: 1 });
  recordBattle(h, { points: 120, place: 1, heroes: 2 }); recordBattle(h, { points: 80, place: 2, heroes: 2 }); recordBattle(h, { points: 60, place: 2, heroes: 4 }); recordBattle(h, { points: 40 });
  assert.deepEqual(h.record, { battles: 4, points: 300, best: 120, firsts: 1, seconds: 1, wins: 4 });
  const b = newBattle(h, quest, makeRng(5), 1); startRoll(b); resolve(b, { target: 0 });
  assert.ok(b.points > 0, 'a solo round scores points');
});

test('blessings raise this fight’s max HP, skip other heroes, and wait to be spent', () => {
  const hero = newHero({ name: 'K', cls: 'knight', seed: 1 });
  hero.campaign.blessings = [{ who: 'Someone', startHp: 4, atk: 9, fights: 1 }];
  const skipped = newBattle(hero, quest, makeRng(1), 1);
  assert.equal(skipped.maxHp, maxHpOf(hero));
  assert.equal(skipped.boon.atk, 0);
  assert.equal(hero.campaign.blessings[0].fights, 1);

  const named = newHero({ name: 'Someone', cls: 'knight', seed: 1 });
  named.campaign.blessings = [{ who: 'Someone', startHp: 4, wound: 6, startMagic: -10, fights: 2, atk: 3 }];
  const b = newBattle(named, quest, makeRng(1), 1);
  assert.equal(b.maxHp, maxHpOf(named) + 4);
  assert.equal(b.hp, b.maxHp - 6);
  assert.equal(b.magic, 0);
  assert.equal(b.boon.atk, 3);
  spendBlessings(named.campaign);
  assert.equal(named.campaign.blessings[0].fights, 1);

  const soft = newHero({ name: 'K', cls: 'knight', seed: 2 });
  soft.campaign.blessings = [{ weaken: 2, fights: 1 }];
  const duel = newBattle(soft, quest, makeRng(3), 1);
  startRoll(duel);
  duel.board = quiet(4);
  duel.enemies[0].intent = strike;
  duel.enemies[0].hp = 999; duel.enemies[0].maxHp = 999;
  const rep = resolve(duel, {});
  assert.equal(rep.T.block, 0);
  assert.equal(rep.taken, 7);
});

test('a camp discount is applied once, when the peddler lays out new stock', () => {
  const fullHero = newHero({ name: 'A', cls: 'knight', seed: 3 });
  const cutHero = newHero({ name: 'A', cls: 'knight', seed: 3 });
  cutHero.campaign.campFlags = { discount: 0.25 };
  const full = shopStock(fullHero);
  const cut = shopStock(cutHero);
  cut.forEach((it, i) => {
    const price = Math.max(1, Math.round(weaponValue(it.inst) * 0.75));
    assert.equal(it.price, price);
    assert.ok(it.price < full[i].price);
  });
  assert.deepEqual(cutHero.campaign.campFlags, {});
  assert.equal(shopStock(cutHero), cut); // cache hit does not look at flags again
});

test('the road is seeded, a choice sticks, and a toll you cannot pay does not', () => {
  const c = company(42);
  assert.equal(ensureRoad(c.members[0], c.members).id, 'gate');
  assert.equal(roadIsOpen(c.members[0]), true);
  const again = company(42);
  again.campaign.step = 3; again.campaign.wins = 1;
  c.campaign.step = 3; c.campaign.wins = 1;
  const scene = ensureRoad(c.members[0], c.members);
  assert.equal(scene.id, ensureRoad(again.members[0], again.members).id);
  assert.equal(ensureRoad(c.members[0], c.members).id, scene.id);

  c.campaign.road = { key: '1.3', id: 'toll', done: false };
  assert.equal(chooseRoad(c.members[0], c.members, 'pay'), null);
  assert.equal(c.campaign.road.done, false);
  c.members[0].gold = 12;
  const paid = chooseRoad(c.members[0], c.members, 'pay');
  assert.ok(paid.text);
  assert.equal(c.members[0].gold, 2);
  assert.equal(roadIsOpen(c.members[0]), false);

  c.campaign.road = { key: '1.3', id: 'shrine', done: false };
  chooseRoad(c.members[0], c.members, 'drink');
  assert.equal(c.campaign.blessings.at(-1).atk, 2);
  assert.equal(c.campaign.blessings.at(-1).block, 2);
  assert.ok(c.campaign.chronicle[0].title);

  c.members[0].gold = 8;
  c.campaign.road = { key: '1.3', id: 'bridge', done: false };
  assert.equal(chooseRoad(c.members[0], c.members, 'carve').text.includes('Eight gold'), true);
  assert.equal(c.members[0].bonusHp, 2);
  assert.equal(c.members[1].bonusHp, 2);
  assert.equal(c.campaign.carved, true);
  assert.equal(maxHpOf(c.members[0]), CLASSES.knight.hp + 2);
  c.campaign.road.done = false;
  assert.equal(chooseRoad(c.members[0], c.members, 'carve'), null);
});

test('party initiative: the round plays high to low, ties go to the heroes, round 1 is the heroes first', () => {
  const c = company();
  const b = partyFight(c.members, strike); b.round = 2;
  b.fighters[0].board.S.v = 3; b.fighters[1].board.S.v = 1;
  const rep = resolveParty(b);
  const vs = rep.order.map((x) => x.v);
  assert.deepEqual(vs, [...vs].sort((x, y) => y - x));
  for (let i = 1; i < rep.order.length; i++) if (rep.order[i].v === rep.order[i - 1].v) assert.ok(!(rep.order[i - 1].kind === 'foe' && rep.order[i].kind === 'hero'));
  const b1 = partyFight(company().members, strike);
  const r1 = resolveParty(b1);
  assert.equal(r1.init.forced, true); assert.equal(r1.order.at(-1).kind, 'foe'); assert.equal(r1.order[0].kind, 'hero');
});

test('a monster killed before its initiative does nothing; one that is faster still lands its blow', () => {
  let slow = 0; let fast = 0;
  for (let seed = 1; seed < 80; seed++) {
    const c = company();
    const b = partyFight(c.members, strike, 1); b.round = 2; b.rng = makeRng(seed);
    b.fighters[0].mods.atk = 80; b.fighters[0].board.S.v = 3; b.fighters[1].board.S.v = 1; // Bea slower than Ada
    const e = b.enemies[0]; const rep = resolveParty(b);
    const foe = rep.init.foes[0].init;
    const takenTotal = rep.fighters.reduce((a, f) => a + f.taken, 0);
    if (foe <= 3) { slow++; assert.equal(rep.acts.length, 0); assert.equal(takenTotal, 0); assert.equal(e.hp, 0); } // dead before it could act
    else { fast++; assert.ok(rep.acts.length === 1); assert.ok(takenTotal > 0); } // beat the hero's initiative, so it swings first
  }
  assert.ok(slow > 5 && fast > 5);
});

test('the hero the monsters target is the shield: blocks count double, and standing firm holds the line', async () => {
  const { roundPoints } = await import('../js/engine.js');
  assert.equal(roundPoints({ absorbed: 6 }), 6, 'a block point is worth a damage point');
  assert.equal(roundPoints({ absorbed: 6, shield: true, heldLine: true }), 22);
  const c = company();
  const b = partyFight(c.members, strike); // Ada (Feet 1) is targeted: 6 of the 9 comes at her
  b.fighters[0].mods.block = 4; b.fighters[1].mods.block = 4;
  const rep = resolveParty(b);
  assert.deepEqual(rep.shield, { name: 'Ada', blocked: 4, held: true });
  const ada = byName(rep, 'Ada'); const bea = byName(rep, 'Bea');
  assert.equal(ada.absorbed, 4); assert.equal(bea.absorbed, 3);
  // same dice and attack for both; the difference is the shield: 4 blocked x2 + 10, against Bea's 3 blocked x1
  assert.equal(ada.points - bea.points, (4 * 2 + 10) - 3);
  const quietRound = partyFight(c.members, { n: 'Duck', v: 'guard', f: 3, m: 0 });
  assert.equal(resolveParty(quietRound).shield.held, false, 'no swing at the shield, no bonus');
});

test('company looks: a second and third hero of the same class wear other colours', async () => {
  const { lookIndex, lookOf, HERO_LOOKS } = await import('../js/data.js');
  const heroes = [{ cls: 'knight' }, { cls: 'wizard' }, { cls: 'knight' }, { cls: 'knight' }, { cls: 'wizard' }, { cls: 'knight' }];
  assert.deepEqual(heroes.map((_, i) => lookIndex(heroes, i)), [0, 0, 1, 2, 1, 0]); // a fourth Knight wraps to the first look
  assert.equal(lookOf(heroes, 2).name, HERO_LOOKS.knight[1].name);
  for (const [cls, looks] of Object.entries(HERO_LOOKS)) {
    assert.ok(looks.length >= 3, cls);
    assert.equal(new Set(looks.map((l) => l.hue)).size, looks.length, `${cls} looks have different chip colours`);
    for (const l of looks.slice(1)) assert.ok(typeof l.cloth === 'number' && typeof l.accent === 'number', `${cls} ${l.name} recolours cloth and accent`);
  }
});

test('company: every-round powers come back each round, and each hero keeps their own charges', () => {
  const a = newHero({ name: 'A', cls: 'knight', seed: 1, full: true });
  const c = newHero({ name: 'C', cls: 'knight', seed: 2, full: true });
  const b = newPartyBattle([a, c], { ...questsFor(a)[0], enemies: ['ogre'] }, makeRng(3));
  for (const e of b.enemies) e.hp = 999;
  for (let round = 1; round <= 3; round++) {
    for (const i of [0, 1]) {
      startFighter(b, i); b.magic = 10;
      assert.ok(castPower(b, 'shieldwall'), `hero ${i} raises Shield Up in round ${round}`);
      assert.equal(castPower(b, 'rally').charged, round, `hero ${i} stores their own charge ${round}`);
      assert.equal(castPower(b, 'shieldwall'), null); // still once a round
      commitFighter(b);
    }
    resolveParty(b);
  }
});
