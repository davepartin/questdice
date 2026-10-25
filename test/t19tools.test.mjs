// T19 v2 measurement tools: the definitions the Director's review asked to be exact are pinned here (captured damage, the arms of the nemesis comparison,
// the intervals). Read-only tools; nothing in the game is touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { E, D, strongKeys, strongOf, setCampaign, applyArm, eliteBasis, soloFight, wilson, attacking } from '../tools/t19-lib.mjs';

test('Wilson interval: 0 of 12 reaches about 24%, 12 of 12 starts near 76%, and a fixed proportion tightens with more fights', () => {
  const [a0, b0] = wilson(0, 12); assert.equal(a0, 0); assert.ok(Math.abs(b0 - 0.243) < 0.01, `${b0}`);
  const [a1, b1] = wilson(12, 12); assert.ok(Math.abs(a1 - 0.757) < 0.01); assert.ok(b1 > 0.999);
  assert.ok(wilson(35, 70)[1] - wilson(35, 70)[0] < wilson(6, 12)[1] - wilson(6, 12)[0]);
});
test('captured damage: every round, health after = health before + healing received - damage after block (never below 0)', () => {
  const f = soloFight(strongOf(strongKeys[0]), 'designed', 'unchanged', 4242);
  assert.ok(f.rows.length > 3);
  for (const r of f.rows) assert.equal(r.hp1, Math.max(0, Math.min(f.maxHp, r.hp0 + r.healed - r.taken)), JSON.stringify(r));
  assert.ok(f.rows.some((r) => r.taken > 0) && f.rows.some((r) => r.healed > 0 || r.heals === 0));
});
test('the boss counts as attacking only by the engine\'s damage test (a Wing Wall guard does not)', () => {
  assert.equal(E.isDamageIntent({ v: 'guard', f: 4 }), false); assert.equal(E.isDamageIntent({ v: 'breath', f: 4 }), true); assert.equal(E.isDamageIntent({ v: 'charge', f: 0 }), false);
  const boss = (v, f) => ({ intent: { v, f, m: 1 } });
  assert.equal(attacking(boss('guard', 4)), false, 'Wing Wall has a number but is not an attack'); assert.equal(attacking(boss('bind', 0)), false); assert.equal(attacking(boss('charge', 0)), false);
  assert.equal(attacking(boss('breath', 4)), true); assert.equal(attacking(boss('strike', 3)), true); assert.equal(attacking({}), false);
});
test('the arms: A corrects only the boss health, B keeps one companion, C none; party goblins go with B and C; the wound fraction survives; party health factor applies', () => {
  assert.equal(eliteBasis(8), 636);
  const build = (arm) => { const heroes = [strongOf(strongKeys[0]), strongOf(strongKeys[1]), strongOf(strongKeys[2]), strongOf(strongKeys[3])].map((h, i) => { h.name = `H${i}`; return setCampaign(h, 'return'); });
    const c = heroes[0].campaign; heroes.forEach((h) => { h.campaign = structuredClone(c); }); const b = E.newPartyBattle(heroes, E.questsFor(heroes[0])[0], E.makeRng(5)); const before = { n: b.enemies.length, ids: b.enemies.map((e) => e.id), frac: b.enemies.find((e) => e.id === 'vharaxis').hp / b.enemies.find((e) => e.id === 'vharaxis').maxHp }; applyArm(b, arm); return { b, before }; };
  const u = build('unchanged'); assert.deepEqual(u.before.ids.slice(0, 3), ['vharaxis', 'gloomstalker', 'dirgesinger']); assert.ok(u.before.ids.includes('goblin'), 'a table of four adds a goblin');
  const A = build('A'); assert.equal(A.b.enemies.length, u.before.n); const boss = A.b.enemies.find((e) => e.id === 'vharaxis'); assert.equal(boss.maxHp, Math.round(636 * A.b.team.hp)); assert.ok(Math.abs(boss.hp / boss.maxHp - A.before.frac) < 0.01);
  const B = build('B'); assert.deepEqual(B.b.enemies.map((e) => e.id), ['vharaxis', 'gloomstalker'], 'one finite companion, no Dirge Singer, no goblin');
  const C = build('C'); assert.deepEqual(C.b.enemies.map((e) => e.id), ['vharaxis'], 'the boss alone');
  assert.ok(D.MONSTERS.vharaxis.hp === 280);
});
