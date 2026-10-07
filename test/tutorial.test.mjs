// The practice battle in Learn to play promises exact numbers on its cards. Keep them true.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';

const quest = { id: 'practice', act: 1, step: 1, kind: 'battle', enemies: ['goblin'], place: 'Wolfwood Edge', name: 'Practice', hpMult: 1, flat: 0, rewardMult: 0 };

test('the practice roll teaches 11 attack, then a Strength Triple for 21', () => {
  const hero = E.newHero({ name: 'You', cls: 'knight' });
  const b = E.newBattle(hero, quest, E.makeRng(9), 1);
  b.script = { rolls: [{ NW: 3, N: 2, W: 4, C: 4, E: 1, SW: 3, S: 3 }], rerolls: [{ E: 4 }] };
  E.startRoll(b);
  let ev = E.evaluate(hero, b.board);
  assert.equal(ev.atk, 11, 'sword +3, hand 4, 2x talent counts the 4 again');
  assert.equal(ev.triples.length, 0);
  assert.equal(E.rerollInfo(b).kind, 'free');
  assert.ok(E.reroll(b, ['E']));
  ev = E.evaluate(hero, b.board);
  assert.deepEqual(ev.triples.map((t) => t.name), ['Strength Triple']);
  assert.equal(ev.atk, 21);
  assert.ok(ev.atk + ev.pierce < b.enemies[0].hp, 'the goblin survives round 1, so the player finishes it');
  assert.equal(b.script.rolls.length + b.script.rerolls.length, 0, 'the script is used up; later rolls are free');
});

test('a battle without a script rolls as before', () => {
  const hero = E.newHero({ name: 'Ann', cls: 'bard' });
  const a = E.newBattle(hero, quest, E.makeRng(4), 1); const c = E.newBattle(hero, quest, E.makeRng(4), 1);
  E.startRoll(a); E.startRoll(c);
  assert.deepEqual(a.board, c.board);
});
