// Class identity (CLASS2 in js/data.js, docs/ideas/CLASS_IDENTITY_2026-10-22.md). Off in the game; each test file runs in its own
// process, so switching it on here never touches the other files.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { CLASS2 } from '../js/data.js';

const hero = (cls, name = cls) => { const h = E.newHero({ name, cls, seed: 3 }); h.campaign.act = 1; return h; };
const quest = (enemies) => ({ enemies, hpMult: 4, flat: 0, rewardMult: 1, kind: 'battle' });
const board = (o = {}) => Object.fromEntries(Object.entries({ NW: 1, NE: 1, N: 1, W: 1, C: 1, E: 1, S: 1, SW: 1, SE: 1, P: 1, ...o }).map(([k, v]) => [k, { v, bound: false }]));

test('off by default: no Dig In, no Guard, no songs', () => {
  assert.equal(CLASS2.on, false);
  const b = E.newBattle(hero('dwarf'), quest(['ogre']), E.makeRng(1), 1); b.hp = 10; while (b.round < 6) E.beginReset(b);
  assert.equal(b.hp, 10);
});

test('Dig In: from round 5 the Dwarf heals 2 at the start of each round; other classes do not', () => {
  E.CLASS2_ON();
  const b = E.newBattle(hero('dwarf'), quest(['ogre']), E.makeRng(1), 1); b.hp = 10;
  while (b.round < 4) E.beginReset(b); assert.equal(b.hp, 10, 'not before round 5');
  E.beginReset(b); assert.equal(b.round, 5); assert.equal(b.hp, 12); assert.equal(b.dugIn, 2);
  E.beginReset(b); assert.equal(b.hp, 14);
  const k = E.newBattle(hero('knight'), quest(['ogre']), E.makeRng(1), 1); k.hp = 10; while (k.round < 6) E.beginReset(k); assert.equal(k.hp, 10);
});

// a two-hero table: each hero's dice set, then the round resolves
function table(a, c, setup) {
  const b = E.newPartyBattle([a, c], quest(['ogre']), E.makeRng(7));
  setup?.(b);
  for (let i = 0; i < 2; i++) { E.startFighter(b, i); const f = b.fighters[i]; f.board = board({ S: i === 0 ? 4 : 1 }); f.target = 0; i === 0 && b._cast?.(b); E.commitFighter(b, i); }
  const o = b.enemies[0]; o.intent = { n: 'Club', v: 'strike', f: 12, m: 0 }; o.windup = false;
  E.resolveParty(b); return b;
}

test('Guard: a Knight who uses Shield Up takes the double share, even when a friend is slower', () => {
  E.CLASS2_ON();
  const run = (guard) => { CLASS2.guard = guard; const b = table(hero('knight', 'Kay'), hero('wizard', 'Wil'), (bb) => { bb._cast = (x) => { x.fighters[0].magic = 9; assert.ok(E.castPower(x.fighters[0], 'shieldwall') || E.castPower(x, 'shieldwall')); }; }); return b.report.leader; };
  assert.equal(run(false), 'Wil', 'without Guard the slower feet (1) draw the blows');
  assert.equal(run(true), 'Kay', 'with Guard the Knight steps in front');
});

test('Songs carry: a Bard\'s healing power lands on the most hurt hero at the table', () => {
  E.CLASS2_ON(); CLASS2.songs = true;
  const b = table(hero('bard', 'Bea'), hero('knight', 'Kit'), (bb) => { bb.fighters[1].hp = 5; bb._cast = (x) => { const f = x.fighters[0]; f.magic = 9; f.mods.heal += 7; }; });
  assert.deepEqual(b.songs?.map((s) => [s.from, s.to, s.n]), [['Bea', 'Kit', 7]]);
});
