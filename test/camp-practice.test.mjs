import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TRAINING_DUMMY, MONSTERS } from '../js/data.js';
import { forecastValues } from '../js/g3/hudkit.js';
import {
  makeRng, newHero, newBattle, spawnEnemy, canPay, castPower, startRoll, resolve,
  resetPracticeRound, cardsOf, wanderRoster, mayWander, evaluate,
} from '../js/engine.js';
import { applyRelease } from '../js/release.js';

applyRelease();

const dummyQuest = () => ({
  id: 'camp-practice', name: 'Practice dummy', kind: 'ordinary',
  enemies: ['training-dummy'], rewardMult: 0, hpMult: 1, flat: 0, campPractice: true,
});
const practice = (seed = 4) => {
  const hero = newHero({ name: 'Pat', cls: 'knight', seed, full: true });
  hero.gold = 77; hero.xp = 12; hero.potions = 2;
  const b = newBattle(hero, dummyQuest(), makeRng(seed), 1);
  return { hero, b };
};

test('practice dummy is not a catalog monster and has its own miniature', () => {
  assert.equal(Object.keys(MONSTERS).length, 50);
  assert.equal(MONSTERS['training-dummy'], undefined);
  assert.equal(TRAINING_DUMMY.id, 'training-dummy');
  assert.equal(TRAINING_DUMMY.xp, 0);
  assert.equal(TRAINING_DUMMY.gold, 0);
  assert.equal(TRAINING_DUMMY.look, 'front');
  assert.ok(fs.existsSync(TRAINING_DUMMY.img));
  assert.equal(TRAINING_DUMMY.faces.length, 4);
});

test('spawnEnemy and newBattle can stand the dummy up', () => {
  const e = spawnEnemy('training-dummy', {}, makeRng(1));
  assert.equal(e.id, 'training-dummy');
  assert.equal(e.name, 'Practice Dummy');
  assert.equal(e.xp, 0);
  assert.equal(e.gold, 0);
  const { b } = practice();
  assert.equal(b.campPractice, true);
  assert.equal(b.freeMagic, true);
  assert.equal(b.enemies.length, 1);
  assert.equal(b.enemies[0].id, 'training-dummy');
  assert.equal(b.enemies[0].intent?.v, 'idle');
});

test('dummy never wanders onto the road', () => {
  const hero = newHero({ name: 'W', cls: 'knight', seed: 2 });
  const roster = wanderRoster(hero.campaign, { pool: [] });
  assert.ok(!roster.includes('training-dummy'));
  assert.equal(mayWander('training-dummy', hero.campaign), false);
  assert.ok(!Object.keys(MONSTERS).includes('training-dummy'));
});

test('unlimited magic: every card is usable at 0, and a real fight still needs to pay', () => {
  const { b } = practice();
  b.magic = 0;
  assert.equal(canPay(b, 9), true);
  assert.ok(cardsOf(b.hero).some((c) => c.id === 'riposte'));
  const r = castPower(b, 'riposte');
  assert.ok(r);
  assert.equal(b.magic, 0);
  assert.equal(b.mods.block, 4);
  const live = newBattle(newHero({ name: 'L', cls: 'knight', seed: 5, full: true }), { id: 'q', enemies: ['goblin'] }, makeRng(5), 1);
  live.magic = 0;
  assert.equal(canPay(live, 2), false);
  assert.equal(castPower(live, 'riposte'), null);
});

test('practice resolve: dummy does not hit back, does not end the run, splash still counts', () => {
  const { hero, b } = practice();
  const gold0 = hero.gold; const xp0 = hero.xp; const rounds0 = hero.stats.rounds;
  b.magic = 0;
  startRoll(b);
  const cleave = castPower(b, 'cleave', { x: 3 });
  assert.ok(cleave);
  assert.ok(b.mods.splash > 0);
  const ev = evaluate(hero, b.board, { straight: 'atk' });
  const fc = forecastValues(ev, b.mods, b);
  assert.ok(fc.splash > 0, 'pink splash still shows against one dummy');
  const hp0 = b.hp;
  const rep = resolve(b, { target: 0 });
  assert.equal(b.outcome, null);
  assert.equal(b.phase, 'practice-end');
  assert.equal(rep.taken, 0);
  assert.equal(b.hp, hp0); // dummy does not fight back
  assert.equal(b.enemies[0].hp, b.enemies[0].maxHp); // dummy is not left wounded
  assert.equal(hero.gold, gold0);
  assert.equal(hero.xp, xp0);
  assert.equal(hero.stats.rounds, rounds0);
  assert.ok((rep.T.atk || 0) + (rep.T.block || 0) + (b.mods.splash || 0) > 0);
});

test('Again zeros the colour counters and restores dummy / spent cards', () => {
  const { b } = practice();
  b.magic = 0;
  startRoll(b);
  assert.ok(castPower(b, 'riposte'));
  assert.ok(castPower(b, 'cleave', { x: 3 }));
  resolve(b, { target: 0 });
  assert.ok((b.mods.atk || 0) + (b.mods.block || 0) + (b.mods.splash || 0) > 0);
  const dummyHp = b.enemies[0].hp;
  resetPracticeRound(b);
  assert.equal(b.phase, 'reset');
  assert.equal(b.round, 1);
  assert.equal(b.mods.atk, 0);
  assert.equal(b.mods.block, 0);
  assert.equal(b.mods.splash, 0);
  assert.equal(b.goldEarned, 0);
  assert.equal(b.roundGold, 0);
  assert.equal(b.board, null);
  assert.deepEqual(b.usedRound, {});
  assert.equal(b.enemies[0].hp, b.enemies[0].maxHp);
  assert.ok(dummyHp <= b.enemies[0].maxHp);
  assert.equal(castPower(b, 'riposte')?.name, 'Counterstrike');
});
