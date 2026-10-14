import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, newHero, newBattle, resolve, rollIntent, burnOf, newCompany, newPartyBattle, resolveParty, startRoll, evaluate, recordFled, battleRewards } from '../js/engine.js';
import { MONSTERS, BREATH_SHARE } from '../js/data.js';

const board = (o) => {
  const b = {};
  for (const s of ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE']) b[s] = { v: 1, bound: false };
  for (const [k, v] of Object.entries(o)) b[k] = { v, bound: false };
  return b;
};
// Knight: sword (0r,2b,3r,3r) left, shield right. NW 4 = red 3 + hand; N 1 heals 1.
const strong = board({ NW: 4, NE: 1, W: 6, E: 4, N: 2, C: 2, S: 3 });
const quest = (enemies) => ({ enemies, hpMult: 2, flat: 0, rewardMult: 1, kind: 'battle', perilous: false });
const fight = (enemies) => { const h = newHero({ name: 'K', cls: 'knight', seed: 1, full: true }); h.strength = { W: 6, E: 4 }; const b = newBattle(h, quest(enemies), makeRng(5)); return b; };
const setIntent = (e, intent) => { e.intent = { ...intent }; };

test('Fire Ward: guards, and burns the hero who hits it; hitting another foe is safe', () => {
  const b = fight(['cultist', 'goblin']);
  setIntent(b.enemies[0], { n: 'Fire Ward', v: 'ward', f: 0, m: 1, k: 4 }); setIntent(b.enemies[1], { n: 'Duck', v: 'guard', f: 0, m: 0 });
  assert.equal(burnOf(b.enemies[0]), 4);
  b.board = { ...strong };
  const rep = resolve(b, { target: 0 });
  assert.ok(rep.dealt > 0); assert.equal(rep.burned, 4); assert.ok(rep.taken >= 4, 'the burn ignores block');
  const b2 = fight(['cultist', 'goblin']);
  setIntent(b2.enemies[0], { n: 'Fire Ward', v: 'ward', f: 0, m: 1, k: 4 }); setIntent(b2.enemies[1], { n: 'Duck', v: 'guard', f: 0, m: 0 });
  b2.board = { ...strong };
  const rep2 = resolve(b2, { target: 1 });
  assert.ok(!rep2.burned);
});

test('Phase: normal attack passes through, pierce still lands', () => {
  const b = fight(['wraith']); setIntent(b.enemies[0], { n: 'Phase', v: 'phase', f: 0, m: 0 });
  b.board = { ...strong }; const hp0 = b.enemies[0].hp;
  const rep = resolve(b, { target: 0 });
  assert.ok(rep.phased); assert.equal(hp0 - b.enemies[0].hp, rep.T.pierce, 'only the pierce hurt it');
});

test('Stalk: unhurt, the wolf pounces next round; hit it and the stalk breaks', () => {
  const b = fight(['wolf', 'goblin']);
  setIntent(b.enemies[0], { n: 'Stalk', v: 'stalk', f: 0, m: 0 }); setIntent(b.enemies[1], { n: 'Duck', v: 'guard', f: 0, m: 0 });
  b.board = { ...strong };
  const rep = resolve(b, { target: 1 }); // hit the goblin instead
  assert.deepEqual(rep.stalks, [{ uid: b.enemies[0].uid, broken: false }]);
  assert.equal(b.enemies[0].intent.n, 'Pounce'); assert.ok(b.enemies[0].intent.slam);
  const b2 = fight(['wolf', 'goblin']);
  setIntent(b2.enemies[0], { n: 'Stalk', v: 'stalk', f: 0, m: 0 }); setIntent(b2.enemies[1], { n: 'Duck', v: 'guard', f: 0, m: 0 });
  b2.board = { ...strong };
  const rep2 = resolve(b2, { target: 0 });
  assert.equal(rep2.stalks[0].broken, true); assert.notEqual(b2.enemies[0].intent?.n, 'Pounce');
  const e = { id: 'wolf', pounce: true, faces: [] }; assert.equal(rollIntent(e, makeRng(1)).n, 'Pounce'); assert.equal(e.pounce, false);
});

test('company: the hero who hits a Fire Ward takes the burn; Phase stops attack for everyone', () => {
  const c = newCompany({ name: 'T', roster: [{ name: 'A', cls: 'knight' }, { name: 'B', cls: 'knight' }], seed: 3 });
  const b = newPartyBattle(c.members, quest(['cultist']), makeRng(4));
  setIntent(b.enemies[0], { n: 'Fire Ward', v: 'ward', f: 0, m: 0, k: 4 });
  b.fighters.forEach((f) => { f.board = { ...strong }; f.target = 0; });
  const rep = resolveParty(b);
  const burned = rep.strikes.filter((s) => s.burned > 0);
  assert.ok(burned.length >= 1 && burned.every((s) => s.burned === 4));
  for (const s of burned) { const fr = rep.fighters.find((x) => x.name === s.name); assert.ok(fr.taken >= 4); }
});

const weak = board({ NW: 1, NE: 1, W: 1, E: 1, N: 1, C: 1, S: 1 });

test('always-on armor soaks non-pierce damage even without a guard face', () => {
  const b = fight(['shieldbearer']);
  b.enemies[0].armor = { n: 8, s: 1 };
  setIntent(b.enemies[0], { n: 'Spear', v: 'strike', f: 0, m: 0 });
  b.board = { ...strong };
  const rep = resolve(b, { target: 0 });
  assert.equal(rep.guarded, 8);
});

test('breath: solo half blockable half pierce; party splashes every hero', () => {
  const b = fight(['cinderling']);
  setIntent(b.enemies[0], { n: 'Puff', v: 'breath', f: 10, m: 0 });
  b.board = { ...weak };
  const rep = resolve(b, { target: 0 });
  const puff = rep.acts.find((a) => a.v === 'breath');
  assert.ok(puff && puff.d >= 10);
  assert.ok(puff.net + puff.ab === puff.d);
  const c = newCompany({ name: 'T', roster: [{ name: 'A', cls: 'knight' }, { name: 'B', cls: 'knight' }], seed: 3 });
  const pb = newPartyBattle(c.members, quest(['cinderling']), makeRng(4));
  setIntent(pb.enemies[0], { n: 'Puff', v: 'breath', f: 10, m: 0 });
  pb.fighters.forEach((f) => { f.board = { ...weak }; f.target = 0; f.mods = { atk: 0, pierce: 0, block: 0, heal: 0, weaken: 0 }; });
  const prep = resolveParty(pb);
  const breath = prep.acts.find((a) => a.v === 'breath');
  assert.ok(breath);
  const share = Math.ceil(breath.d * BREATH_SHARE);
  assert.ok(prep.fighters.every((f) => (f.taken + f.absorbed) >= share));
});

test('chain locks dice to last round’s face; hush blanks the heart', () => {
  const h = newHero({ name: 'K', cls: 'knight', seed: 1, full: true });
  const hushBoard = board({ N: 2, W: 2, E: 2, S: 2, C: 2, NW: 1, NE: 1 });
  const open = evaluate(h, hushBoard);
  const muted = evaluate(h, { ...hushBoard, C: { v: 2, bound: false, hushed: true } });
  assert.ok(open.pierce > muted.pierce);
  assert.ok(muted.notes.includes('Heart hushed'));
  assert.equal(muted.heart, 0);
  const b = fight(['chainbinder']);
  b.enemies[0].hp = 999;
  setIntent(b.enemies[0], { n: 'Chain', v: 'chain', f: 0, m: 0, k: 2 });
  b.board = { ...weak };
  resolve(b, { target: 0 });
  assert.equal(b.nextChained, 2);
  const last = b.lastBoard;
  startRoll(b);
  assert.equal(b.chainedNow, 2);
  const chained = Object.entries(b.board).filter(([, d]) => d.chained);
  assert.equal(chained.length, 2);
  assert.ok(chained.every(([s, d]) => d.bound && d.v === last[s]));
});

test('baby dragons flee when hurt and last standing; Vharaxis flees only as an elite', () => {
  const b = fight(['cinderling']);
  const e = b.enemies[0];
  e.hp = Math.floor(e.maxHp * 0.3);
  setIntent(e, { n: 'Hoard', v: 'guard', f: 0, m: 0 });
  b.board = { ...weak };
  const rep = resolve(b, { target: 0 });
  assert.ok(rep.fled.includes(e.uid));
  assert.equal(b.outcome, 'victory');
  recordFled(b.hero.campaign, b);
  assert.equal(b.hero.campaign.nemeses[0].id, 'cinderling');
  const r = battleRewards(b);
  assert.ok(r.xp < MONSTERS.cinderling.xp * 2, 'fled dragons pay a reduced reward');

  const boss = fight(['vharaxis']);
  boss.quest.kind = 'boss';
  boss.enemies[0].hp = Math.floor(boss.enemies[0].maxHp * 0.2);
  setIntent(boss.enemies[0], { n: 'Wing Wall', v: 'guard', f: 0, m: 0 });
  boss.board = { ...weak };
  const br = resolve(boss, { target: 0 });
  assert.deepEqual(br.fled, []);
  const elite = fight(['vharaxis']);
  elite.quest.kind = 'elite';
  elite.enemies[0].hp = Math.floor(elite.enemies[0].maxHp * 0.2);
  setIntent(elite.enemies[0], { n: 'Wing Wall', v: 'guard', f: 0, m: 0 });
  elite.board = { ...weak };
  const er = resolve(elite, { target: 0 });
  assert.ok(er.fled.includes(elite.enemies[0].uid));
});

test('new bosses: Fallen Champion is a boss; Gold-Chain Jailer is not occult; dragons have breath', () => {
  assert.equal(MONSTERS.fallenchampion.tier, 'boss');
  assert.equal(MONSTERS.fallenchampion.name, 'The Fallen Champion');
  assert.ok(MONSTERS.fallenchampion.armor);
  assert.ok(MONSTERS.fallenchampion.rage);
  assert.equal(MONSTERS.chainbinder.name, 'Gold-Chain Jailer');
  assert.ok(!/warlock/i.test(MONSTERS.chainbinder.name));
  for (const id of ['cinderling', 'frostwhelp', 'ashwyrm', 'vharaxis']) {
    assert.ok(MONSTERS[id].faces.some((f) => f.v === 'breath'), `${id} breathes`);
  }
  assert.ok(MONSTERS.cinderling.flee);
  assert.ok(MONSTERS.frostwhelp.flee);
  assert.equal(MONSTERS.vharaxis.flee.onlyAs, 'elite');
  assert.equal(MONSTERS.vharaxis.tier, 'boss');
  assert.ok(MONSTERS.shieldbearer.armor);
  assert.ok(MONSTERS.ironwarden.armor);
  assert.ok(MONSTERS.gloomstalker);
  assert.ok(MONSTERS.dirgesinger.faces.some((f) => f.v === 'hush'));
});

test('every monster rolls a real die: its power die, its enraged form and its armour are d4, d6, d8, d10, d12 or d20', async () => {
  const { MONSTERS } = await import('../js/data.js');
  const real = new Set([4, 6, 8, 10, 12, 20]);
  for (const [id, m] of Object.entries(MONSTERS)) {
    assert.ok(real.has(m.power), `${id} power d${m.power}`);
    if (m.rage?.power) assert.ok(real.has(m.rage.power), `${id} rage d${m.rage.power}`);
    if (m.armor) assert.ok(real.has(m.armor.s), `${id} armor d${m.armor.s}`);
    if (m.init) assert.ok(real.has(m.init), `${id} speed d${m.init}`);
  }
});
