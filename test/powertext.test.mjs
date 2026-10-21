// The words on every power (camp library, upgrade compare, battle sheet) must say what the engine actually does, at every level
// (Dave, Oct 2026: Storm Coil said "+5 per charge, upgrade +6" while it really paid 4, 6, 8, 10 and the upgrade 5, 7, 9, 11).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, newHero, newBattle, startRoll, questsFor, castPower, chargeValues, chargeGain, roundGain, powerDice, scaleMax, scaleNum } from '../js/engine.js';
import { CLASSES } from '../js/data.js';
import { shortLine, effectLine } from '../js/g3/powers.js';

const all = Object.values(CLASSES).flatMap((c) => c.cards.map((k) => ({ cls: c, k })));
const LEVELS = [0, 1, 2, 3];
const fxOf = (k) => (typeof k.per === 'number' ? { atk: k.per } : k.per || {});

// a battle in the shape phase with this power equipped at this level and plenty of magic
function castable(clsId, k, lvl, round = 1) {
  const hero = newHero({ name: 't', cls: clsId, seed: 5 }); hero.level = 9;
  hero.powers = { ...(hero.powers || {}), [k.slot]: k.id }; hero.learned = [...new Set([...(hero.learned || []), k.id])];
  hero.powerLevel = { [k.id]: lvl };
  const b = newBattle(hero, questsFor(hero)[0], makeRng(11), 1); startRoll(b); b.round = round; b.magic = 99;
  return b;
}
const clsIdOf = (c) => Object.entries(CLASSES).find(([, v]) => v === c)[0];

test('charge powers: the listed charges and total are what a release pays, at every level', () => {
  for (const { cls, k } of all.filter((x) => x.k.kind === 'charge')) for (const lvl of LEVELS) {
    const vals = chargeValues(k, k.max, lvl); const tot = chargeGain(k, k.max, lvl);
    const short = shortLine(k, lvl); const long = effectLine(k, { level: lvl });
    for (const [f, xs] of Object.entries(vals)) {
      assert.ok(short.includes(xs.join(', ')), `${k.name} L${lvl} short "${short}" lists ${xs}`);
      assert.ok(long.includes(xs.join(', ')), `${k.name} L${lvl} effect lists ${xs}`);
      assert.ok(short.includes(String(tot[f])), `${k.name} L${lvl} short shows the total ${tot[f]}`);
      assert.equal(xs.reduce((a, x) => a + x, 0), tot[f]);
    }
    assert.ok(!/per charge/.test(short), `${k.name}: no flat "per charge" number (each charge is worth more than the last)`);
    // the engine pays exactly the total
    const b = castable(clsIdOf(cls), k, lvl); const id = k.id;
    for (let i = 0; i < k.max; i++) { b.usedRound = {}; assert.ok(castPower(b, id), `${k.name} stores charge ${i + 1}`); }
    b.usedRound = {}; const before = { ...b.mods }; const g0 = b.goldEarned || 0;
    const r = castPower(b, id, { release: true }); assert.ok(r, `${k.name} releases`);
    for (const f of Object.keys(fxOf(k))) assert.equal(f === 'gold' ? (b.goldEarned || 0) - g0 : b.mods[f] - (before[f] || 0), tot[f], `${k.name} L${lvl} ${f}`);
  }
});

test('Storm Coil reads the way the engine pays it: 4, 6, 8, 10 now and 5, 7, 9, 11 after the first upgrade', () => {
  const coil = all.find((x) => x.k.id === 'coil').k;
  assert.equal(shortLine(coil, 0), '+4, 6, 8, 10 attack (all 4: +28)');
  assert.equal(shortLine(coil, 1), '+5, 7, 9, 11 attack (all 4: +32)');
});

test('round powers: the sample rounds shown are what a cast in that round gives', () => {
  for (const { cls, k } of all.filter((x) => x.k.kind === 'round')) for (const lvl of LEVELS) {
    const r0 = Math.max(2, k.minRound || 0);
    for (const r of [r0, r0 + 1, r0 + 2]) {
      assert.ok(shortLine(k, lvl).includes(`${r}: +${roundGain(k, r, lvl)}`), `${k.name} L${lvl} round ${r}`);
      const b = castable(clsIdOf(cls), k, lvl, r); const a0 = b.mods.atk;
      assert.ok(castPower(b, k.id)); assert.equal(b.mods.atk - a0, roundGain(k, r, lvl), `${k.name} L${lvl} cast in round ${r}`);
      assert.ok(effectLine(k, { level: lvl, round: r }).includes(`Round ${r}: +${roundGain(k, r, lvl)}`));
    }
  }
});

test('dice and scale powers: the dice named are the dice rolled, and the top of the scale is right at every level', () => {
  for (const { cls, k } of all.filter((x) => x.k.kind === 'dice' || x.k.kind === 'scale')) for (const lvl of LEVELS) {
    const n = powerDice(k, k.cost, lvl);
    assert.ok(shortLine(k, lvl).includes(`${n}d${k.dice.s}`), `${k.name} L${lvl}`);
    const b = castable(clsIdOf(cls), k, lvl); const r = castPower(b, k.id, { x: k.cost });
    assert.equal(r.rolls.length, n, `${k.name} L${lvl} rolls ${n} dice`);
    if (k.kind === 'scale') {
      const top = powerDice(k, scaleMax(k, lvl), lvl);
      assert.ok(shortLine(k, lvl).includes(`up to ${top}d${k.dice.s}`), `${k.name} L${lvl} top ${top}`);
      assert.ok(effectLine(k, { level: lvl }).includes(`up to ${top}d${k.dice.s} for ${scaleMax(k, lvl)} magic`), `${k.name} L${lvl} effect top`);
      const b2 = castable(clsIdOf(cls), k, lvl); assert.equal(castPower(b2, k.id, { x: 99 }).rolls.length, top, `${k.name} L${lvl} at full magic`);
    }
  }
});

test('flat and super powers: the numbers shown are the numbers added', () => {
  for (const { cls, k } of all.filter((x) => x.k.kind === 'flat' || x.k.kind === 'super')) for (const lvl of LEVELS) {
    const b = castable(clsIdOf(cls), k, lvl, 5); const m0 = { ...b.mods }; const f0 = b.freeActions.length;
    assert.ok(castPower(b, k.id), `${k.name} casts`);
    for (const [f, v] of Object.entries(k.fx)) {
      const want = f === 'free' ? v + lvl : scaleNum(v, lvl);
      assert.ok(shortLine(k, lvl).includes(String(want)), `${k.name} L${lvl} shows ${want} ${f}`);
      if (f === 'free') assert.equal(b.freeActions.length - f0, 1); else assert.equal(b.mods[f] - (m0[f] || 0), want, `${k.name} L${lvl} ${f}`);
    }
    if (k.kind === 'super') assert.ok(shortLine(k, lvl).includes(`${scaleNum(k.aoe, lvl)} to all`));
  }
});
