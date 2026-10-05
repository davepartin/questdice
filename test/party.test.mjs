import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeRng, newHero, evaluate, newBattle, startRoll, resolve, maxHpOf, shopStock,
  newCompany, splitInt, shareWeights, rankFighters, newPartyBattle, resolveParty, partyRewards,
  spendBlessings,
} from '../js/engine.js';
import { ensureRoad, roadIsOpen, chooseRoad } from '../js/roads.js';
import { WEAPONS, CLASSES } from '../js/data.js';

const board = (o) => {
  const b = {};
  for (const s of ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE']) b[s] = { v: 1, bound: false };
  for (const [k, v] of Object.entries(o)) b[k] = { v, bound: false };
  return b;
};
// Sword blank (red 0) and shield bash (red 1). Both lanes attack, so block stays 0. Heart 1 does not pump a color.
const quiet = (feet, hands = 1) => board({ NW: 1, NE: 2, W: hands, E: hands, N: 4, S: feet, C: 1, SW: 1, SE: 1 });

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
    f.board = quiet(i === 0 ? 4 : 1);
    f.mods = { atk: 0, pierce: 0, block: 0, heal: 0, stagger: 0, weaken: 0 };
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

test('feet, then hands, then a coin, decide the leader', () => {
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

test('a guarding monster has one pool, and the leader spends it first', () => {
  const c = company();
  const b = partyFight(c.members, { n: 'Duck', v: 'guard', f: 6, m: 0 });
  for (const f of b.fighters) f.mods.atk = 4 - evaluate(f.hero, f.board).atk;
  const rep = resolveParty(b);
  const ada = rep.strikes.find((s) => s.name === 'Ada');
  const bea = rep.strikes.find((s) => s.name === 'Bea');
  assert.equal(ada.atk, 4); assert.equal(ada.guarded, 4); assert.equal(ada.dealt, 0);
  assert.equal(bea.atk, 4); assert.equal(bea.guarded, 2); assert.equal(bea.dealt, 2);
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

test('two small hits stagger a wind-up that either hit would have left standing', () => {
  const c = company();
  const intent = { n: 'Wind', v: 'charge', f: 0, m: 0 };
  const alone = partyFight(c.members, intent, 999, 'ogre');
  const pressure = evaluate(c.members[0], alone.fighters[0].board);
  alone.enemies[0].staggerAt = pressure.atk + pressure.stagger + 1;
  alone.fighters[1].hp = 0; alone.fighters[1].board = null;
  assert.equal(resolveParty(alone).staggered.length, 0);

  const both = partyFight(c.members, intent, 999, 'ogre');
  both.enemies[0].staggerAt = pressure.atk + pressure.stagger + 1;
  assert.equal(resolveParty(both).staggered.length, 1);
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

test('bind, drain and a stolen purse land on the feet leader', () => {
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
    f.mods = { atk: f.hero.name === 'Ada' ? 40 : 0, pierce: 0, block: 0, heal: 0, stagger: 0, weaken: 0 };
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
    f.mods = { atk: 0, pierce: 0, block: 0, heal: 0, stagger: 0, weaken: 0 };
  }
  b.enemies[0].intent = { n: 'Duck', v: 'guard', f: 0, m: 0 };
  b.enemies[0].hp = 999;
  const second = resolveParty(b);
  assert.equal(second.round, 2);
  assert.equal(second.strikes.find((s) => s.name === 'Ada').atk, bare);
});

test('kill gold splits, dice gold stays, Gold Sense applies per share, XP is not split', () => {
  const c = company();
  c.members[1].perks.push('greed');
  const b = {
    quest,
    enemies: [{ xp: 8, gold: 10 }],
    fighters: [
      { hero: c.members[0], contrib: 20, goldEarned: 3 },
      { hero: c.members[1], contrib: 5, goldEarned: 0 },
    ],
  };
  const r = partyRewards(b);
  assert.equal(r.xp, 8);
  assert.equal(r.order[0], 'Ada');
  assert.equal(r.gold.Ada, 5 + 3);
  assert.equal(r.gold.Bea, Math.round(5 * 1.25));
  assert.equal(r.drops.length, 3);
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
  const mult = [1, 2.3, 5, 11];
  cut.forEach((it, i) => {
    const price = Math.max(1, Math.round(WEAPONS[it.inst.id].price * mult[it.inst.rarity] * 0.75));
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
