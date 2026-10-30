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
  for (let i = 0; i < 2; i++) { E.startFighter(b, i); const f = b.fighters[i]; b.board = board({ S: i === 0 ? 4 : 1 }); E.commitFighter(b); f.target = 0; if (i === 0) b._cast?.(b); }
  const o = b.enemies[0]; o.intent = { n: 'Club', v: 'strike', f: 12, m: 0 }; o.windup = false;
  E.resolveParty(b); return b;
}

const shieldUp = (h) => { h.learned = [...(h.learned || []), 'shieldwall']; h.powers = { ...(h.powers || {}), B: 'shieldwall' }; return h; }; // mk1: Riposte starts in slot B; Shield Up is learned
test('Guard: a Knight who uses Shield Up takes the double share, even when a friend is slower', () => {
  E.CLASS2_ON();
  const run = (guard) => { CLASS2.guard = guard; const b = table(shieldUp(hero('knight', 'Kay')), hero('wizard', 'Wil'), (bb) => { bb._cast = (x) => { x.fighters[0].magic = 9; assert.ok(E.castPower(x.fighters[0], 'shieldwall') || E.castPower(x, 'shieldwall')); }; }); return [b.report.leader, b.report.leaderWhy].join(' '); };
  assert.equal(run(false), 'Wil feet', 'without Guard the slower feet (1) draw the blows');
  assert.equal(run(true), 'Kay guard', 'with Guard the Knight steps in front, and the report says why (the banner reads SHIELD UP)');
});

test('Songs carry: a Bard\'s healing power lands on the most hurt hero at the table', () => {
  E.CLASS2_ON(); CLASS2.songs = true;
  const b = table(hero('bard', 'Bea'), hero('knight', 'Kit'), (bb) => { bb.fighters[1].hp = 5; bb._cast = (x) => { const f = x.fighters[0]; f.magic = 9; f.mods.heal += 7; }; });
  assert.deepEqual(b.songs?.map((s) => [s.from, s.to, s.n]), [['Bea', 'Kit', 7]]);
});

test('Verse for a friend: the Bard chooses; for itself it is attack as before, for a friend the same number is healing', () => {
  E.CLASS2_ON(); CLASS2.verse = true;
  const play = (to) => {
    const b = table(hero('bard', 'Bea'), hero('knight', 'Kit'), (bb) => { bb.fighters[1].hp = 5; bb._cast = (x) => { const f = x.fighters[0]; x.magic = 9; x.rng = () => 0.9; E.castPower(x, 'luckyverse', { to }); }; });
    return b;
  };
  const self = play(undefined); assert.equal((self.report.verses || []).length, 0, 'no target: attack for the Bard, as now');
  const friend = play(1); assert.deepEqual(friend.report.verses.map((v) => [v.from, v.to, v.n]), [['Bea', 'Kit', E.LUCK.top]], 'a 5-6 for Kit: the top result as healing (mc1: 10)');
});

test('The targeted song (T08 experiment): Courage is attack, Shelter is block, for the Bard or a friend; off unless CLASS2.song is set', () => {
  E.CLASS2_ON(); CLASS2.song = 'steady';
  try {
    const play = (to, song) => table(hero('bard', 'Bea'), hero('knight', 'Kit'), (bb) => { bb._cast = (x) => { x.magic = 9; E.castPower(x, 'luckyverse', { to, song }); }; });
    const shelter = play(1, 'block'); assert.deepEqual(shelter.report.verses.map((v) => [v.from, v.to, v.n, v.k]), [['Bea', 'Kit', 5, 'block']], 'Shelter for Kit: +5 block on his share');
    const courage = play(1, 'atk'); assert.deepEqual(courage.report.verses.map((v) => [v.to, v.n, v.k]), [['Kit', 4, 'atk']], 'Courage for Kit: +4 attack');
    const self = play(undefined, 'block'); assert.equal((self.report.verses || []).length, 0, 'for herself it stays on her own board');
  } finally { CLASS2.song = null; }
});
