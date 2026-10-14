import test from 'node:test';
import assert from 'node:assert/strict';
import { newHero, sidesOf, upgradeDie, mindUpgrade, downgradeDie } from '../js/engine.js';
import { ensureRoad, chooseRoad, roadIsOpen, rematchInfo, rematchTrial, TRIALS } from '../js/roads.js';
import { statDice, championFor, winChance, rollTrial, oppSize, TRIAL_STEPS } from '../js/trials.js';

const at = (h, act, step) => { Object.assign(h.campaign, { act, step, wins: step - 1 + (act - 1) * 10, road: null }); return h; };

test('the head die is wisdom: it starts a d4 and grows like a hand, as far as the act allows', () => {
  const h = newHero({ name: 'W', cls: 'wizard', seed: 1 }); h.gold = 999;
  assert.equal(sidesOf(h, 'N'), 4);
  assert.ok(upgradeDie(h, 'mind', 'N')); assert.equal(sidesOf(h, 'N'), 6);
  assert.equal(mindUpgrade(h).why, 'Act II', 'Act I stops at d6');
  h.campaign.act = 2; assert.ok(upgradeDie(h, 'mind', 'N')); assert.equal(sidesOf(h, 'N'), 8);
  h.campaign.act = 3; assert.ok(upgradeDie(h, 'mind', 'N')); assert.equal(sidesOf(h, 'N'), 10);
  assert.ok(downgradeDie(h, 'mind', 'N')); assert.equal(sidesOf(h, 'N'), 8);
});

test('tests come four times an act, at steps 2, 4, 6 and 9, and are seeded', () => {
  const h = newHero({ name: 'T', cls: 'knight', seed: 5 });
  for (const act of [1, 2, 3]) for (const step of TRIAL_STEPS) {
    at(h, act, step); assert.equal(roadIsOpen(h), true);
    const ev = ensureRoad(h, [h]); assert.ok(ev.id.startsWith('t-'), `${act}.${step} is a test (${ev.id})`); assert.ok(ev.stat);
    assert.ok(ev.choices.some((c) => c.test));
  }
  const a = newHero({ name: 'T', cls: 'knight', seed: 9 }); const b = newHero({ name: 'T', cls: 'knight', seed: 9 });
  at(a, 1, 4); at(b, 1, 4); assert.equal(ensureRoad(a, [a]).id, ensureRoad(b, [b]).id);
});

test('the right dice are tested, and the odds are exact (a tie goes to you)', () => {
  const h = newHero({ name: 'T', cls: 'ranger', seed: 1 });
  assert.deepEqual(statDice(h, 'wisdom'), [4]);
  assert.deepEqual(statDice(h, 'speed'), [6]);
  assert.deepEqual(statDice(h, 'strength'), [h.strength.W, h.strength.E]);
  assert.ok(Math.abs(winChance([6], [6]) - 21 / 36) < 1e-9);
  assert.ok(Math.abs(winChance([4], [6]) - 10 / 24) < 1e-9);
  assert.equal(oppSize(1), 4); assert.equal(oppSize(2), 6); assert.equal(oppSize(3), 8); assert.equal(oppSize(2, true), 8);
});

test('in a company the hero with the best dice for the test steps up', () => {
  const k = newHero({ name: 'Kay', cls: 'knight', seed: 1 }); const r = newHero({ name: 'Rae', cls: 'ranger', seed: 2 });
  assert.equal(championFor([k, r], 'speed', k).name, 'Rae'); // the ranger's feet are a d6
  r.campaign = k.campaign;
  const t = rollTrial({ campaign: k.campaign, members: [k, r], stat: 'speed', chooser: k });
  assert.equal(t.who, 'Rae'); assert.equal(t.heroSizes[0], 6);
  const t2 = rollTrial({ campaign: k.campaign, members: [k, r], stat: 'speed', chooser: k });
  assert.deepEqual(t2.heroDice, t.heroDice, 'the same roll every time');
});

test('a test choice rolls, pays out or costs, and a lost test offers one rematch for gold', () => {
  let lost = 0; let won = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const h = newHero({ name: 'T', cls: 'knight', seed }); h.gold = 300; at(h, 2, 6);
    const ev = ensureRoad(h, [h]); const ch = ev.choices.find((c) => c.test && c.ok);
    const before = h.gold;
    const res = chooseRoad(h, [h], ch.id);
    assert.ok(res.trial && res.text.length > 20);
    assert.equal(res.trial.win, res.trial.heroTotal >= res.trial.oppTotal);
    if (res.trial.win) { won++; assert.equal(rematchInfo(h, [h]), null); continue; }
    lost++;
    const info = rematchInfo(h, [h]); assert.ok(info.ok);
    const g = h.gold; const r2 = rematchTrial(h, [h]);
    assert.ok(r2.trial.attempt === 1 && h.gold <= g - info.cost + 200);
    assert.equal(rematchInfo(h, [h]), null, 'only one rematch');
    void before;
  }
  assert.ok(won > 0 && lost > 0, `both outcomes happen (${won} won, ${lost} lost)`);
});

test('every test is family-friendly content with a stat, a foe and at least one test choice', () => {
  for (const t of TRIALS) {
    assert.ok(['wisdom', 'strength', 'speed'].includes(t.stat), t.id); assert.ok(t.foe, t.id);
    assert.ok(t.choices.some((c) => c.test && c.win && c.lose), t.id);
  }
  for (const stat of ['wisdom', 'strength', 'speed']) assert.ok(TRIALS.filter((t) => t.stat === stat).length >= 3, stat);
});
