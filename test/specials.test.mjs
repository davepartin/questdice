// T24 Monster Specials (SPECIALS in js/data.js, off in the game): each Special's goal, its miss, its label and its report line, solo and at a table.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';

applyRelease();
const hero = (cls = 'knight', act = 1, step = 4) => { const h = E.newHero({ name: 'Spec', cls, seed: 4 }); h.level = 6; h.campaign.act = act; h.campaign.step = step; return h; };
const fight = (enemies, { act = 1, step = 4, kind = 'battle' } = {}) => { const h = hero('knight', act, step); return E.newBattle(h, { ...E.questsFor(h)[0], enemies, kind, step }, E.makeRng(7), 1); };
const give = (b, e, id) => { e.special = undefined; b.specialsSet = true; D.SPECIALS.on = true; e.special = { id, ...(id === 'slam' ? { goal: 20, wait: 0 } : id === 'shield' ? { goal: 25, block: 12 } : id === 'regrow' ? { goal: 8 } : id === 'bounty' ? { gold: 8, left: 2 } : id === 'spawn' ? { spawned: 0 } : {}) }; };
const roll = (b, atk = 0, pierce = 0) => { E.startRoll(b); b.mods.atk = atk; b.mods.pierce = pierce; for (const s of Object.keys(b.board)) b.board[s].v = 1; };
const after = (b, opts) => E.resolve(b, { target: 0, straight: 'atk', ...opts });
test.afterEach(() => { D.SPECIALS.on = false; });

test('off: no monster gets a Special and nothing reads one', () => {
  D.SPECIALS.on = false; const b = fight(['goblin', 'goblin']);
  assert.ok(b.enemies.every((e) => !e.special)); assert.deepEqual(E.specialPlan(b), []); assert.equal(E.specialView(b, b.enemies[0]), null);
});

test('assignment: Act I steps 1-2 plain, step 3 one soft Special, step 4 a Slam, the elite a Shield, the boss Regrow (alone)', () => {
  D.SPECIALS.on = true; const r = () => 0.3;
  assert.deepEqual(E.pickSpecials(1, 1, 'battle', 3, r), [null, null, null]);
  assert.equal(E.pickSpecials(1, 3, 'battle', 3, r).filter(Boolean).length, 1);
  assert.ok(['spawn', 'bounty'].includes(E.pickSpecials(1, 3, 'battle', 2, r).find(Boolean)));
  assert.ok(E.pickSpecials(1, 4, 'battle', 2, r).includes('slam'));
  assert.deepEqual(E.pickSpecials(1, 5, 'elite', 1, r), ['shield']);
  const boss = fight(['goblinking'], { step: 10, kind: 'boss' });
  assert.equal(boss.enemies[0].special?.id, 'regrow'); assert.equal(boss.enemies.length, 1, 'no extra helper: measured, it cost 6 points of wins by its own blows');
  for (let s = 0; s < 40; s++) { const ids = E.pickSpecials(1, 6, 'battle', 3, () => (s * 0.37) % 1); assert.ok(ids.filter((x) => x && !E.specialInfo(x).soft).length <= 1, 'at most one punishing Special a fight in Act I'); }
});

test('Slam: winds up with "Damage 20 / or Slam 2x"; 20 damage breaks it, less and the next blow lands double', () => {
  // (a monster with no Wind-Up of its own on its move die, so every wind-up here is the Special's)
  const b = fight(['skeleton']); const e = b.enemies[0]; give(b, e, 'slam'); e.hp = e.maxHp = 900; E.rollIntent(e, b.rng);
  assert.equal(e.intent.v, 'charge'); const v = E.specialView(b, e); assert.equal(v.top, 'Damage 20'); assert.equal(v.bottom, 'or Slam 2x');
  roll(b, 30); let rep = after(b); let row = rep.specials.find((x) => x.id === 'slam');
  assert.equal(row.ok, true); assert.match(row.line, /Slam broken, \d+ of 20/); assert.equal(e.windup, false);
  assert.notEqual(e.intent.v, 'charge', 'one ordinary round after a broken wind-up');
  roll(b, 0); rep = after(b); assert.equal(e.intent.v, 'charge', 'then it winds up again');
  roll(b, 0); rep = after(b); row = rep.specials.find((x) => x.id === 'slam'); assert.equal(row.ok, false, 'an all-ones roll (11) misses 20'); assert.match(row.line, /Slam next round/);
  assert.equal(e.intent.double, true); assert.equal(E.specialView(b, e).bottom, 'Slams 2x now');
  roll(b, 0); rep = after(b); const act = rep.acts.find((x) => x.uid === e.uid); assert.equal(act.slam2x, true); assert.ok(act.mag > 0);
});

test('Shield: stops 12 until the attack reaches 25, then breaks for good', () => {
  const b = fight(['ogre']); const e = b.enemies[0]; give(b, e, 'shield'); e.hp = e.maxHp = 900;
  e.intent = { n: 'Club', v: 'strike', f: 0, m: 0 }; roll(b, 5); let rep = after(b); // 11 from the dice + 5 = 16, under 25
  assert.ok(rep.guarded >= 12); assert.equal(rep.specials[0].ok, false); assert.match(rep.specials[0].line, /stopped 12/);
  e.intent = { n: 'Club', v: 'strike', f: 0, m: 0 }; roll(b, 20); rep = after(b);
  assert.equal(rep.specials[0].ok, true); assert.match(rep.specials[0].line, /Shield broken, \d+ of 25/);
  assert.equal(e.special.broken, true); assert.equal(E.specialView(b, e), null, 'a broken shield leaves the label');
});

test('Spawn: any damage stops it; none and it calls one small monster that joins next round', () => {
  const b = fight(['goblin', 'goblin']); const [a, c] = b.enemies; give(b, c, 'spawn'); a.hp = a.maxHp = c.hp = c.maxHp = 300; a.intent = c.intent = { n: 'Poke', v: 'strike', f: 0, m: 0 };
  roll(b, 5); let rep = after(b, { target: 0 }); const row = rep.specials.find((x) => x.id === 'spawn'); assert.equal(row.ok, false); assert.equal(b.enemies.length, 3); assert.equal(b.enemies[2].fresh, false, 'it acts from next round');
  a.intent = c.intent = { n: 'Poke', v: 'strike', f: 0, m: 0 }; b.enemies[2].intent = { n: 'Poke', v: 'strike', f: 0, m: 0 };
  roll(b, 5); rep = after(b, { target: 1 }); assert.equal(rep.specials.find((x) => x.id === 'spawn').ok, true); assert.equal(b.enemies.length, 3);
});

test('Bounty: kill it in time for gold; miss the window and it is gone', () => {
  const b = fight(['goblin']); const e = b.enemies[0]; give(b, e, 'bounty'); e.hp = 5; e.intent = { n: 'Poke', v: 'strike', f: 0, m: 0 };
  const g0 = b.goldEarned; roll(b, 50); const rep = after(b); assert.equal(rep.specials[0].ok, true); assert.equal(b.goldEarned - g0 >= 8, true);
  const b2 = fight(['goblin']); const e2 = b2.enemies[0]; give(b2, e2, 'bounty'); e2.hp = e2.maxHp = 300;
  for (let i = 0; i < 2; i++) { e2.intent = { n: 'Poke', v: 'strike', f: 0, m: 0 }; roll(b2, 1); after(b2); }
  assert.equal(e2.special.left, 0); assert.equal(E.specialView(b2, e2), null);
});

test('Regrow: the goal in damage stops it; less and it heals that much', () => {
  const b = fight(['ogre']); const e = b.enemies[0]; give(b, e, 'regrow'); e.special.goal = 20; e.maxHp = 300; e.hp = 200;
  e.intent = { n: 'Club', v: 'strike', f: 0, m: 0 }; roll(b, 3); let rep = after(b); // 14 under 20
  assert.equal(rep.specials[0].ok, false); assert.equal(e.hp, 200 - rep.dealt + 20);
  const hp = e.hp; e.intent = { n: 'Club', v: 'strike', f: 0, m: 0 }; roll(b, 20); rep = after(b);
  assert.equal(rep.specials[0].ok, true); assert.equal(e.hp, hp - rep.dealt);
});

test('Sleeping: does nothing; a blow that kills it is safe; a blow that does not wakes it and it hits double', () => {
  const b = fight(['goblin', 'ogre']); const [g, o] = b.enemies; give(b, o, 'sleeping'); o.hp = o.maxHp = 60; E.rollIntent(o, b.rng); g.intent = { n: 'Poke', v: 'strike', f: 0, m: 0 };
  assert.equal(o.intent.v, 'sleep'); assert.equal(E.specialView(b, o).top, 'Damage 60');
  roll(b, 5); let rep = after(b, { target: 0 }); assert.equal(rep.specials.find((x) => x.id === 'sleeping').line, 'Still asleep.'); assert.equal(rep.acts.find((a) => a.uid === o.uid)?.mag || 0, 0);
  E.rollIntent(o, b.rng); g.intent = { n: 'Poke', v: 'strike', f: 0, m: 0 }; roll(b, 10); rep = after(b, { target: 1 }); assert.equal(o.special.awake, true); assert.equal(rep.specials.find((x) => x.id === 'sleeping').ok, false);
  E.rollIntent(o, b.rng); assert.notEqual(o.intent.v, 'sleep'); assert.equal(E.specialView(b, o).bottom, 'Hits 2x');
});

test('labels stay within 14 characters (Grok: the narrowest phone)', () => {
  const b = fight(['ogre', 'goblin']); const e = b.enemies[0];
  for (const id of ['slam', 'shield', 'spawn', 'bounty', 'regrow', 'sleeping']) {
    give(b, e, id); e.hp = e.maxHp = 999; E.rollIntent(e, b.rng); if (id === 'slam') e.intent = { n: 'Wind-Up', v: 'charge', f: 0, m: 0 };
    const v = E.specialView(b, e); assert.ok(v, id); assert.ok(v.top.length <= 14 && v.bottom.length <= 14, `${id}: ${v.top} / ${v.bottom}`);
    assert.ok(E.specialPlan(b).some((r) => r.uid === e.uid && r.line.length > 0));
  }
});

test('at a table the whole party’s attack counts toward a Shield, and the Bounty goes to the hero who made the kill', () => {
  D.SPECIALS.on = true;
  const hs = [hero('knight'), hero('ranger')]; hs[1].name = 'Two'; const q = { ...E.questsFor(hs[0])[0], enemies: ['ogre', 'goblin'], kind: 'battle', step: 4 };
  const b = E.newPartyBattle(hs, q, E.makeRng(3)); const [o, g] = b.enemies; give(b, o, 'shield'); give(b, g, 'bounty'); o.hp = o.maxHp = 900; g.hp = 4;
  o.special.goal = 30; o.intent = g.intent = { n: 'Poke', v: 'strike', f: 0, m: 0 };
  for (let i = 0; i < 2; i++) { E.startFighter(b, i); b.mods.atk = 16; E.commitFighter(b); b.fighters[i].target = 0; b.fighters[i].locked = true; }
  b.fighters[1].target = 1; b.fighters[1].fighterAtk = true; E.focusFighter(b, 1); b.mods.atk = 20; E.commitFighter(b);
  b.fighters[0].target = 0; E.focusFighter(b, 0); b.mods.atk = 32; E.commitFighter(b);
  const g0 = b.fighters[1].goldEarned || 0; E.resolveParty(b); const rep = b.report;
  assert.equal(o.special.broken, true, '32 on the ogre reaches the goal of 30');
  const bounty = rep.specials.find((x) => x.id === 'bounty'); assert.equal(bounty.ok, true); assert.ok((b.fighters[1].goldEarned || 0) - g0 >= 8);
});
