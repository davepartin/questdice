// Secret objectives (docs/SECRET_OBJECTIVES.md): dealing, judging, payouts and the Reveal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { CARDS, dealEnvelopes, judge, cardView, answer, payOut, gOf, COVER_LINES } from '../js/secrets.js';

const NAMES = ['WizKid', 'Smalls', 'Ada', 'Bea', 'Cy', 'Di'];
const CLS = ['wizard', 'dwarf', 'knight', 'bard', 'ranger', 'knight'];
const company = (n, seed = 1) => { const hs = NAMES.slice(0, n).map((name, i) => E.newHero({ name, cls: CLS[i], seed: seed + i })); for (const h of hs) h.campaign = hs[0].campaign; return hs; };
const quest = { enemies: ['goblin', 'wolf'], hpMult: 1, flat: 0, rewardMult: 1, kind: 'battle', perilous: false };

test('every hero gets one card; solo gets a challenge; team-only cards stay at tables; a rivalry always has two or more holders', () => {
  for (let n = 1; n <= 6; n++) {
    for (let seed = 1; seed <= 40; seed++) {
      const hs = company(n, seed); hs[0].campaign.step = 1 + (seed % 9);
      const env = dealEnvelopes({ c: hs[0].campaign, heroes: hs, enemies: [{ uid: 'e1', name: 'Gob', tier: 'minion', hp: 10 }, { uid: 'e2', name: 'Wolf', tier: 'minion', hp: 10 }] });
      assert.equal(Object.keys(env.cards).length, n);
      assert.ok(COVER_LINES.includes(env.cover));
      const kinds = Object.values(env.cards).map((c) => CARDS[c.id].kind);
      if (n === 1) { assert.deepEqual(kinds, ['challenge']); assert.equal(CARDS[env.cards.WizKid.id].team, undefined); }
      assert.ok(kinds.filter((k) => k === 'bribe').length <= 1, 'at most one bribe');
      const rivals = {}; for (const c of Object.values(env.cards)) if (CARDS[c.id].kind === 'rival') rivals[c.id] = (rivals[c.id] || 0) + 1;
      for (const k of Object.values(rivals)) assert.ok(k >= 2, 'a rivalry has two or more holders');
      for (const c of Object.values(env.cards)) if (CARDS[c.id].kind === 'bribe') assert.equal(c.mode, CARDS[c.id].mode);
    }
  }
});

test('the Envelope shows only your own card, with the shared scene and cover line; an offered bribe records the answer', () => {
  const hs = company(3, 5); const env = dealEnvelopes({ c: hs[0].campaign, heroes: hs });
  const v = cardView(env, 'Smalls');
  assert.equal(v.cover, env.cover); assert.equal(v.scene, env.scene); assert.equal(v.id, env.cards.Smalls.id);
  env.cards.Smalls = { id: 'slacker', mode: 'offer' };
  answer(env, 'Smalls', { accept: true }); assert.equal(env.cards.Smalls.accepted, true);
});

// a hand-made battle log: WizKid and Smalls, three rounds
function fakeBattle(rows, fighters) {
  return { secretLog: rows, enemies: [{ uid: 'e1', maxHp: 40 }, { uid: 'e2', maxHp: 90 }], fighters: fighters.map((f) => ({ magic0: 4, potions0: 2, potions: 2, stats: {}, points: 0, ...f, hero: { name: f.name, mind: { N: 6 } } })) };
}
const row = (r, name, o = {}) => ({ r, name, dealt: 0, magic: 0, kills: [], blocked: 0, blk: 5, gold: 0, triples: 0, straight: null, N: 1, W: 1, E: 2, S: 1, C: 1, talents: 0, leader: false, target: 'e1', hp: 20, mp: 4, paid: 0, ...o });

test('a rivalry pays the best of its holders; Gold Rush doubles the winner’s gold; a lost battle pays no prize', () => {
  const b = fakeBattle([row(1, 'WizKid', { gold: 12 }), row(1, 'Smalls', { gold: 7 }), row(2, 'WizKid', { gold: 3 })], [{ name: 'WizKid', hp: 10 }, { name: 'Smalls', hp: 10 }]);
  const env = { act: 1, voice: 'Old Whisper', cards: { WizKid: { id: 'goldrush' }, Smalls: { id: 'goldrush' } }, answered: {} };
  const won = judge(env, b, { won: true });
  const wiz = won.results.find((r) => r.name === 'WizKid'); const sm = won.results.find((r) => r.name === 'Smalls');
  assert.equal(wiz.met, true); assert.equal(wiz.gold, 15); assert.equal(sm.met, false); assert.equal(sm.gold, 0);
  assert.match(wiz.line, /WizKid was secretly chasing gold/); assert.match(wiz.line, /Smalls \(7\)/);
  const lost = judge(env, b, { won: false });
  assert.equal(lost.results.every((r) => r.gold === 0), true);
  // the Hall of Fame counts a rivalry only when it paid (the team won)
  const hero = (name) => ({ name, gold: 0 });
  const lostHeroes = { WizKid: hero('WizKid'), Smalls: hero('Smalls') }; payOut(lost, lostHeroes);
  assert.equal(lostHeroes.WizKid.record.secrets.rivalries, 0);
  const wonHeroes = { WizKid: hero('WizKid'), Smalls: hero('Smalls') }; payOut(won, wonHeroes);
  assert.equal(wonHeroes.WizKid.record.secrets.rivalries, 1);
});

test('bribes: accepted and met pays double; accepted and lost costs a cut; declined earns Honor; forced pays if met; all crooks lose more', () => {
  const G = gOf(1);
  const b = fakeBattle([row(1, 'WizKid', { dealt: 30 }), row(1, 'Smalls', { dealt: 4 }), row(2, 'WizKid', { dealt: 20 }), row(2, 'Smalls', { dealt: 2 })], [{ name: 'WizKid', hp: 10 }, { name: 'Smalls', hp: 10, magic: 8 }]);
  const slacker = (accepted) => ({ act: 1, voice: 'the Lunch King', cards: { WizKid: { id: 'lead' }, Smalls: { id: 'slacker', mode: 'offer', accepted } }, answered: {} });
  const winTake = judge(slacker(true), b, { won: true }).results.find((r) => r.name === 'Smalls');
  assert.equal(winTake.gold, 2 * G); assert.match(winTake.line, /Smalls took the bribe from the Lunch King/); assert.match(winTake.line, /pulled it off/);
  const loseTake = judge(slacker(true), b, { won: false });
  assert.equal(loseTake.crooks, true, 'the only offered bribe was taken and the battle lost');
  assert.equal(loseTake.results.find((r) => r.name === 'Smalls').gold, -Math.round(G / 2) - Math.round(G / 2));
  assert.equal(loseTake.results.find((r) => r.name === 'WizKid').gold, -Math.round(G / 2));
  const loseDecline = judge(slacker(false), b, { won: false });
  assert.equal(loseDecline.crooks, false); assert.ok(loseDecline.results.find((r) => r.name === 'Smalls').gold > 0, 'Honor');
  const forced = { act: 1, voice: 'Old Whisper', cards: { WizKid: { id: 'lead' }, Smalls: { id: 'hoarder', mode: 'forced' } }, answered: {} };
  const f = judge(forced, b, { won: true }).results.find((r) => r.name === 'Smalls');
  assert.equal(f.met, true); assert.equal(f.gold, G); assert.match(f.line, /Smalls was chosen by Old Whisper/);
});

test('a real team battle keeps the round log, and judging it gives a line for every hero', () => {
  const hs = company(3, 9);
  const b = E.newPartyBattle(hs, quest, E.makeRng(4));
  const env = dealEnvelopes({ c: hs[0].campaign, heroes: hs, enemies: b.enemies });
  for (let round = 0; round < 8 && !b.outcome; round++) {
    b.fighters.forEach((f, i) => { if (f.hp > 0) { E.startFighter(b, i); f.target = 0; f.locked = true; } });
    E.resolveParty(b);
  }
  assert.ok(b.secretLog.length >= 3);
  for (const k of ['dealt', 'blk', 'S', 'W', 'E', 'N', 'C', 'gold']) assert.equal(typeof b.secretLog[0][k], 'number', k);
  const j = judge(env, b, { won: b.outcome === 'victory' });
  assert.equal(j.results.length, 3);
  for (const r of j.results) { assert.ok(r.line.length > 20); assert.doesNotMatch(r.line, /undefined|NaN|\{/); }
  const heroes = Object.fromEntries(hs.map((h) => [h.name, h])); const before = hs.map((h) => h.gold);
  payOut(j, heroes); hs.forEach((h, i) => assert.equal(h.gold, Math.max(0, before[i] + j.results.find((r) => r.name === h.name).gold)));
});

test('The Pact: half damage, and the monsters cannot knock that hero out', () => {
  const hs = company(2, 3);
  const b = E.newPartyBattle(hs, { ...quest, enemies: ['ogre'] }, E.makeRng(2));
  b.fighters[0].pactBribe = true; b.fighters[0].hp = 1;
  b.enemies[0].hp = b.enemies[0].maxHp = 999;
  for (let round = 0; round < 3; round++) { b.fighters.forEach((f, i) => { if (f.hp > 0) { E.startFighter(b, i); f.locked = true; } }); E.resolveParty(b); }
  assert.ok(b.fighters[0].hp >= 1, 'never knocked out');
});

test('a solo battle keeps the log too, and a solo challenge pays only on a win', () => {
  const h = E.newHero({ name: 'Solo', cls: 'knight', seed: 3 });
  const b = E.newBattle(h, quest, E.makeRng(5), 1);
  const env = dealEnvelopes({ c: h.campaign, heroes: [h] });
  for (let i = 0; i < 12 && !b.outcome; i++) { E.startRoll(b); E.resolve(b, { target: 0 }); if (!b.outcome) E.beginReset(b); }
  assert.ok(b.secretLog.length >= 1);
  const j = judge(env, b, { won: b.outcome === 'victory' });
  assert.equal(j.results.length, 1); assert.doesNotMatch(j.results[0].line, /undefined|NaN/);
  if (b.outcome !== 'victory') assert.equal(j.results[0].gold, 0);
});

test('Spare That One works in a fight of any length: the spared monster has to be the last to fall', () => {
  const env = (spare) => ({ act: 1, voice: 'Old Whisper', cards: { WizKid: { id: 'spare', mode: 'forced', spare, spareName: 'Grub' } }, answered: {} });
  const short = fakeBattle([row(1, 'WizKid', { kills: ['a'] }), row(2, 'WizKid', { kills: ['grub'] })], [{ name: 'WizKid', hp: 10 }]);
  const early = fakeBattle([row(1, 'WizKid', { kills: ['grub'] }), row(2, 'WizKid', { kills: ['a'] })], [{ name: 'WizKid', hp: 10 }]);
  assert.equal(judge(env('grub'), short, { won: true }).results[0].met, true, 'a two-round fight can still be won with it');
  assert.equal(judge(env('grub'), early, { won: true }).results[0].met, false);
  assert.match(CARDS.spare.rule, /last monster to fall/);
});
