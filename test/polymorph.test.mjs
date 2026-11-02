// Polymorph as a Charge card (Dave, 2 Nov 2026, via Grok's board request; PROPOSED until played): Charge 1 magic a round (max 3); Use spends them all
// and rolls a d6 against the target: a frog on 4-6 at 1 charge, 2-6 at 2, sure at 3. A frog cannot attack that round, a Slam included; a miss spends the charges.
// Level II: the frog takes +4 pierce. Level III: 3-6 at 1 charge, sure at 2 (no cost discount, so no frog-every-round loop).
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';

applyRelease();
const wiz = (lvl = 0) => { const h = E.newHero({ name: 'W', cls: 'wizard', seed: 3, full: true }); h.level = 6; if (lvl) h.powerLevel = { polymorph: lvl }; return h; };
const fight = (h = wiz(), seed = 2) => { const b = E.newBattle(h, { ...E.questsFor(h)[0], enemies: ['ogre', 'goblin'], kind: 'battle' }, E.makeRng(seed), 1); b.magic = 12; return b; };
const card = E.cardsOf(wiz()).find((c) => c.id === 'polymorph');

test('the d6 needed: 4, 2, sure at Levels I-II; 3, sure, sure at Level III', () => {
  assert.deepEqual([1, 2, 3].map((n) => E.frogNeed(card, n, 0)), [4, 2, 1]);
  assert.deepEqual([1, 2, 3].map((n) => E.frogNeed(card, n, 1)), [4, 2, 1]);
  assert.deepEqual([1, 2, 3].map((n) => E.frogNeed(card, n, 2)), [3, 1, 1]);
  assert.deepEqual([4, 2, 1].map(E.frogRange), ['4–6', '2–6', 'sure']);
});

test('storing a charge never needs or locks a target; using them does', () => {
  assert.equal(E.usesTarget(card), false); assert.equal(E.usesTarget(card, { release: true }), true);
});

test('one round stores or uses, not both; the earliest Use is round two', () => {
  const b = fight(); E.startRoll(b); assert.ok(E.castPower(b, 'polymorph')); assert.equal(E.castPower(b, 'polymorph', { release: true }), null);
});

test('a Use at 1 charge frogs on 4-6, about half the time; a miss spends the charges and frogs nothing', () => {
  let ok = 0; const N = 600;
  for (let s = 0; s < N; s++) { const b = fight(wiz(), s + 10); E.startRoll(b); b.charge = { polymorph: 1 }; const r = E.castPower(b, 'polymorph', { release: true });
    assert.equal(r.frog, r.total >= 4); assert.equal(b.charge.polymorph, 0); assert.equal(!!b.mods.frog, r.frog); if (r.frog) ok++; }
  assert.ok(ok / N > 0.42 && ok / N < 0.58, `${ok}/${N}`);
});

test('3 charges are sure: the target cannot attack, even a Slam; Level II adds +4 pierce', () => {
  const b = fight(wiz(1)); E.startRoll(b); b.charge = { polymorph: 3 }; const p0 = b.mods.pierce || 0;
  const o = b.enemies[0]; o.hp = o.maxHp = 999; o.intent = { n: 'Slam', v: 'strike', f: 9, m: 9, slam: true, double: true };
  const r = E.castPower(b, 'polymorph', { release: true }); assert.equal(r.frog, true); assert.equal((b.mods.pierce || 0) - p0, 4);
  const rep = E.resolve(b, { target: 0 }); assert.equal(rep.frog, o.uid); assert.ok(!rep.acts.some((a) => a.uid === o.uid && !a.frog), 'the frog does not act');
});

test('no endless frog: charging 1 a round, a sure frog comes at most every fourth round', () => {
  const b = fight(); let frogs = 0;
  for (let round = 1; round <= 12; round++) { E.startRoll(b); b.usedRound = {}; b.magic = 15; const n = b.charge?.polymorph || 0;
    if (n >= 3) { if (E.castPower(b, 'polymorph', { release: true })?.frog) frogs++; } else E.castPower(b, 'polymorph'); b.mods = { ...b.mods, frog: 0 }; }
  assert.equal(frogs, 3, 'charge, charge, charge, use: 3 frogs in 12 rounds');
});
