// Magic before the roll (Dave, 31 Oct 2026): any power may be used before the dice are out, except a free reroll; a targeted power is one whose effect belongs to
// the monster you hit (Polymorph, Hunter's Mark, the supers); heal, charge, release and the rest are never targeted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';

applyRelease();
const fight = (cls, enemies = ['goblin', 'goblin', 'goblin']) => {
  const h = E.newHero({ name: 'T', cls, seed: 5 }); h.level = 9; const q = { ...E.questsFor(h)[0], enemies, kind: 'battle' };
  const b = E.newBattle(h, q, E.makeRng(9), 1); b.magic = 12; return { h, b };
};
const card = (cls, id) => D.CLASSES[cls].cards.find((c) => c.id === id);

test('which powers are targeted: Polymorph, Hunter’s Mark and the supers; nothing else', () => {
  const targeted = []; for (const [cls, v] of Object.entries(D.CLASSES)) for (const k of v.cards || []) if (E.isTargeted(k)) targeted.push(`${cls}:${k.id}`);
  assert.deepEqual(targeted.sort(), ['dwarf:avalanche', 'bard:finale', 'knight:judgment', 'ranger:mark', 'ranger:rain', 'wizard:polymorph'].sort());
  for (const k of ['volley', 'aimed', 'quickdraw']) assert.equal(E.isTargeted(card('ranger', k)), false);
  assert.equal(E.needsDice(card('ranger', 'quickdraw')), true, 'a free reroll needs dice');
  assert.equal(E.needsDice(card('ranger', 'mark')), false);
});

test('before the roll a power can be used: it costs magic and sets its counters; the roll keeps them', () => {
  const { b } = fight('ranger'); assert.equal(b.phase, 'reset'); assert.equal(b.board, null);
  const r = E.castPower(b, 'mark'); assert.ok(r, 'Hunter’s Mark before the roll'); assert.equal(b.magic, 10); assert.equal(b.mods.pierce, 3); const gold = b.markGold; assert.ok(gold >= 5);
  assert.ok(E.castPower(b, 'volley'), 'a charge before the roll'); assert.equal(b.charge.volley, 1);
  assert.equal(E.castPower(b, 'mark'), null, 'once a round');
  E.startRoll(b); assert.equal(b.phase, 'shape'); assert.equal(b.mods.pierce, 3, 'the roll does not clear what you used before it'); assert.equal(b.markGold, gold);
});

test('heal works any time before the lock; a pre-roll Polymorph still freezes the monster you lock in on', () => {
  const { b } = fight('wizard'); b.hp = Math.max(1, b.maxHp - 12); const hp = b.hp;
  assert.ok(E.healSpend(b), 'heal before the roll'); assert.ok(b.hp > hp);
  assert.ok(E.castPower(b, 'polymorph'), 'Polymorph before the roll'); assert.equal(b.mods.frog, 1);
  E.startRoll(b); const rep = E.resolve(b, { target: 1 }); assert.equal(rep.frog, b.enemies[1].uid, 'the frog is the target that was locked in on');
});

test('no power before the fight is on (done) and none with the wrong id', () => {
  const { b } = fight('ranger'); assert.equal(E.castPower(b, 'nope'), null); b.phase = 'done'; assert.equal(E.castPower(b, 'mark'), null);
});
