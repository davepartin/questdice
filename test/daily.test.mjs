import test from 'node:test';
import assert from 'node:assert/strict';
import * as DAY from '../js/daily.js';
import * as E from '../js/engine.js';
import { CLASSES, CHARMS } from '../js/data.js';

test('the daily challenge: the same day for everyone, a fresh one tomorrow', () => {
  const a = DAY.dailyRun('2026-10-16'); const b = DAY.dailyRun('2026-10-16');
  assert.deepEqual(a.quests.map((q) => q.enemies), b.quests.map((q) => q.enemies), 'same fights');
  assert.equal(a.cls, b.cls); assert.equal(a.charm, b.charm); assert.equal(a.seed, b.seed);
  assert.equal(a.quests.length, DAY.FIGHTS); assert.ok(CLASSES[a.cls] && CHARMS[a.charm]);
  assert.equal(a.quests[DAY.FIGHTS - 1].kind, 'boss', 'it ends with the boss');
  assert.ok(a.quests.some((q) => q.kind === 'elite'), 'and has the elite');
  const acts = new Set(['2026-10-16', '2026-10-17', '2026-10-18'].map((k) => DAY.dailyRun(k).act));
  assert.equal(acts.size, 3, 'the act turns with the days');
  const days = new Set(); for (let d = 1; d <= 28; d++) { const r = DAY.dailyRun(`2026-11-${String(d).padStart(2, '0')}`); days.add(`${r.cls}:${r.charm}:${r.act}:${r.steps}`); }
  assert.ok(days.size >= 25, `${days.size} different days of 28`);
});

test('the hero of the day carries the day\'s charm, is built for its act, and is never a saved hero', () => {
  for (const key of ['2026-10-16', '2026-10-17', '2026-10-18']) {
    const run = DAY.dailyRun(key); const h = DAY.dailyHero(run);
    assert.ok(E.hasCharm(h, run.charm)); assert.equal(h.daily, key); assert.equal(h.cls, run.cls); assert.equal(h.gold, 0);
    assert.ok(E.isActive(h, 'NE'));
    const b = E.newBattle(h, run.quests[0], E.makeRng(1), 1); assert.ok(b.hp > 0 && b.enemies.length);
  }
  assert.ok(DAY.dailyHero(DAY.dailyRun('2026-10-18')).level > DAY.dailyHero(DAY.dailyRun('2026-10-16')).level, 'Act III hero is stronger than Act I');
});

test('daily score: battle points, +100 a win, +250 for clearing all five; share text', () => {
  const won = Array.from({ length: DAY.FIGHTS }, () => ({ won: true, score: 150 }));
  assert.equal(DAY.finalScore(won), 150 * DAY.FIGHTS + DAY.CLEAR_BONUS);
  assert.equal(DAY.finalScore([{ won: true, score: 120 }, { won: false, score: 30 }]), 150);
  assert.equal(DAY.fightScore({ points: 42 }, true), 42 + DAY.WIN_BONUS);
  assert.equal(DAY.fightScore({ points: 42, goldEarned: 7, enemies: [{ hp: 0, gold: 6 }, { hp: 5, gold: 9 }] }, true), 42 + DAY.WIN_BONUS + 7 + 6, 'gold counts: dice gold and fallen monsters only');
  const run = DAY.dailyRun('2026-10-16'); const t = DAY.shareText(run, 1234, [{ won: true }, { won: false }]);
  assert.ok(t.includes('2026-10-16') && t.includes('1,234') && t.includes(CHARMS[run.charm].name));
  assert.equal(DAY.dayKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('the hero of the day carries talent symbols: 1 face in Act I, 2 in Act II, 4 in Act III, never more than two of one symbol', () => {
  const seen = new Set();
  for (let d = 1; d <= 30; d++) {
    const run = DAY.dailyRun(`2026-11-${String(d).padStart(2, '0')}`); const h = DAY.dailyHero(run); seen.add(run.act);
    const want = { 1: 1, 2: 2, 3: 4 }[run.act];
    for (const slot of ['SW', 'SE']) {
      if (!h.dice.includes(slot)) continue;
      const faces = (h.talent[slot] || []).filter((f) => (Array.isArray(f) ? f.length : f)); assert.equal(faces.length, want, `act ${run.act} ${slot}`);
      for (const sym of ['atk', 'block', 'magic', 'heal', 'gold']) assert.ok(E.talentCount(h, slot, sym) <= 2, `${slot} ${sym}`);
    }
    assert.equal(h.gold, 0, 'the purchases are not charged to the hero');
  }
  assert.equal(seen.size, 3, 'all three acts were checked');
});

test('the potion shop between daily fights: points pay, the belt limits, the score cannot go below zero', () => {
  const run = DAY.dailyRun('2026-11-02'); const hero = DAY.dailyHero(run); const cost = DAY.potionCost(run);
  assert.deepEqual(DAY.POTION_POINTS, [50, 50, 50]);
  const d = { run, fights: [{ won: true, score: 400 }], spent: 0 };
  assert.equal(DAY.potionShop(d, hero).ok, false, 'belt starts full'); assert.equal(DAY.potionShop(d, hero).why, 'Belt full'); assert.equal(DAY.buyPotion(d, hero), false);
  hero.potions = 0; const s = DAY.potionShop(d, hero); assert.equal(s.ok, true); assert.equal(s.points, 400);
  assert.equal(DAY.buyPotion(d, hero), true); assert.equal(hero.potions, 1); assert.equal(d.spent, cost); assert.equal(DAY.finalScore(d.fights, d.spent), 400 - cost);
  assert.equal(DAY.buyPotion(d, hero), true); assert.equal(hero.potions, 2); assert.equal(DAY.buyPotion(d, hero), false, 'the belt holds 2');
  const poor = { run, fights: [{ won: true, score: cost - 1 }], spent: 0 }; hero.potions = 0;
  assert.equal(DAY.potionShop(poor, hero).ok, false); assert.match(DAY.potionShop(poor, hero).why, /Need 1 more points/); assert.equal(DAY.buyPotion(poor, hero), false); assert.equal(hero.potions, 0);
  assert.equal(DAY.finalScore([{ won: true, score: 10 }], 999), 0, 'never below zero');
});
