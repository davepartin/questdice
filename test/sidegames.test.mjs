// T31 side games (Dave, 6 Nov 2026: "1-6 are awesome. Build it"): six learnable cards, each a little dice game.
import test from 'node:test'; import assert from 'node:assert/strict';
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
applyRelease();
const SIDE = { crowd: 'bard', hymn: 'bard', showboat: 'knight', dressing: 'knight', gambit: 'ranger', whirlwind: 'dwarf' };
const card = (id) => D.CLASSES[SIDE[id]].cards.find((c) => c.id === id);
function battle(id, enemies = ['goblin', 'goblin', 'wolf'], seed = 5) {
  const h = E.newHero({ name: 'T', cls: SIDE[id], seed: 2 }); h.learned = [...(h.learned || []), id]; assert.ok(E.equipPower(h, id), `${id} equips`);
  const b = E.newBattle(h, { enemies, hpMult: 1, flat: 0, rewardMult: 1, kind: 'battle' }, E.makeRng(seed), 1); E.startRoll(b); b.magic = 12; return b;
}
test('the six side-game cards are learnable at camp, not starting cards, and each sits in a slot', () => {
  for (const id of Object.keys(SIDE)) { const k = card(id); assert.ok(k, id); assert.ok(!k.start, `${k.name} is learned, not a starter`); assert.ok(['A', 'B', 'C'].includes(k.slot)); assert.ok(k.atwill, `${k.name} is every round`); }
});
test('Crowd Pleaser: a gold d6, 1–2 nothing, 3–4 five gold, 5–6 ten gold (Dave\'s table), straight to the purse', () => {
  const g = card('crowd').roll[0]; assert.deepEqual([1, 2, 3, 4, 5, 6].map((r) => E.mixPay(g, r)), [0, 0, 5, 5, 10, 10]);
  assert.equal(E.mixAverage(g), 5);
  assert.deepEqual([1, 2].map((r) => E.mixPay(g, r, 3)), [0, 0], 'a nothing stays nothing at every rank');
  for (let s = 1; s <= 12; s++) { const b = battle('crowd', undefined, s); const before = b.goldEarned || 0; const out = E.castPower(b, 'crowd'); assert.equal(b.magic, 10);
    assert.equal((b.goldEarned || 0) - before, E.mixPay(g, out.rolls[0])); assert.equal(b.mods.atk, 0); }
});
test('Battle Hymn: two green d6 heal and a pink d4 splash; Showboat, Gambit and Field Dressing pay each colour to its counter', () => {
  const b = battle('hymn'); const out = E.castPower(b, 'hymn'); assert.equal(b.magic, 9);
  assert.equal(out.groups[0].rolls.length, 2); assert.equal(out.groups[1].s, 4); assert.equal(b.mods.heal, out.groups[0].total); assert.equal(b.mods.splash, out.groups[1].total);
  const s = battle('showboat'); const o2 = E.castPower(s, 'showboat'); assert.equal(s.mods.atk, o2.groups[0].total); assert.equal(s.goldEarned || 0, o2.groups[1].total);
  const t = battle('gambit'); const o3 = E.castPower(t, 'gambit'); assert.equal(t.mods.pierce, o3.groups[0].total); assert.ok(o3.groups[0].rolls[0] <= 4, 'an orange d4');
  const f = battle('dressing'); const o4 = E.castPower(f, 'dressing'); assert.equal(f.mods.heal, o4.groups[0].total); assert.equal(f.mods.block, o4.groups[1].total);
  assert.equal(E.castPower(f, 'dressing'), null, 'once a round');
});
test('a rank adds a die to the first group (a gold table pays more instead)', () => {
  assert.equal(E.mixGroups(card('hymn'), 2)[0].n, 4); assert.equal(E.mixGroups(card('hymn'), 2)[1].n, 1);
  assert.equal(E.mixGroups(card('crowd'), 2)[0].n, 1); assert.ok(E.mixPay(card('crowd').roll[0], 6, 2) > 10);
});
test('Whirlwind: 2 magic a pink d4; the total hits the target as attack and every other monster as splash, which each one\'s block stops', () => {
  const k = card('whirlwind'); assert.equal(k.dice.s, 4); assert.equal(k.dice.to, 'whirl');
  const b = battle('whirlwind'); const out = E.castPower(b, 'whirlwind', { x: 6 }); assert.equal(out.rolls.length, 3); assert.equal(b.magic, 6);
  assert.equal(b.mods.atk, out.total); assert.equal(b.mods.splash, out.total);
});
