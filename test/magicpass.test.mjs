// mc1 (PROPOSED): magic cards review pass. Party battles now run Grudge, Riposte and Polymorph; balance outliers raised.
import test from 'node:test';
import assert from 'node:assert/strict';
import { commitFighter, cardsOf, makeRng, newHero, castPower, questsFor, newPartyBattle, startFighter, resolveParty, beginPartyRound, LUCK, newBattle, startRoll, powerState } from '../js/engine.js';
const hero = (cls, name, seed = 1) => newHero({ name, cls, seed, full: true });
const party = (heroes, foes = ['ogre', 'ogre']) => { const b = newPartyBattle(heroes, { ...questsFor(heroes[0])[0], enemies: foes }, makeRng(3)); for (const e of b.enemies) e.hp = 999; beginPartyRound(b); return b; };
test('party Polymorph: the caster\'s target is a frog and does not act', () => {
  const b = party([hero('wizard', 'W'), hero('knight', 'K', 2)]);
  startFighter(b, 0); b.target = 0; b.magic = 9; assert.ok(castPower(b, 'polymorph')); commitFighter(b); startFighter(b, 1);
  for (const f of b.fighters) f.target = 0;
  const rep = resolveParty(b); const frog = b.enemies[0].uid;
  assert.deepEqual(rep.frogs, [frog]); const acts = rep.acts.filter((a) => a.uid === frog); assert.ok(acts.length && acts.every((a) => a.frog));
});
test('party Grudge: damage past block last round comes back as attack', () => {
  const b = party([hero('dwarf', 'D'), hero('knight', 'K', 2)]);
  startFighter(b, 0); startFighter(b, 1); const rep = resolveParty(b);
  const d = b.fighters[0]; const hurt = rep.fighters.find((x) => x.name === 'D').taken; assert.equal(d.lastHurt, hurt);
  beginPartyRound(b); startFighter(b, 0); b.magic = 9; const r = castPower(b, 'grudge'); assert.equal(r.total, hurt);
});
test('party Riposte: leftover block hits the target back', () => {
  const b = party([hero('knight', 'K'), hero('bard', 'B', 2)], ['goblin']);
  startFighter(b, 0); b.magic = 9; assert.ok(castPower(b, 'riposte')); b.mods.block += 40; commitFighter(b); startFighter(b, 1);
  for (const f of b.fighters) f.target = 0;
  const hp0 = b.enemies[0].hp; const rep = resolveParty(b);
  assert.equal(rep.ripostes?.length, 1); assert.equal(rep.ripostes[0].name, 'K'); assert.ok(rep.ripostes[0].n > 0);
  assert.ok(b.fighters[0].riposte === false);
  void hp0;
});
test('balance (PROPOSED): Hunter\'s Mark +3 pierce / +6 gold; Lucky Verse 5 / 10; every starter can be used again next round', () => {
  const m = cardsOf(hero('ranger', 'R')).find((k) => k.id === 'mark'); assert.equal(m.fx.pierce, 3); assert.equal(m.markGold, 6);
  assert.deepEqual(LUCK, { mid: 5, top: 10 });
  for (const cls of ['ranger', 'knight', 'wizard', 'dwarf', 'bard']) for (const k of cardsOf(hero(cls, 'X'))) assert.ok(k.atwill, `${k.name} is every round`);
});
