// Team games (Dave, Oct 2026: "our first two-player game was very easy"). Pairs of heroes grow along a campaign side by side;
// at every step each fights that step's quest alone, and then the pair fights it together at a table (newPartyBattle, PARTY
// scaling), with the smart bot playing every hero's dice. Prints solo vs team win rate, rounds and health left, by act.
//   node tools/party.mjs [acts=2] [runs=2] [heroes=2]        SKILL=hard for another difficulty, PACK=starfall for a writer's campaign
//   PLAY=first   every hero takes its first roll and locks in on the first monster (the lazy player), solo and team alike
//   MIX=1        the last hero is a fresh level-1 hero who joins at the start of Act II (a veteran with a beginner)
import { makeRng, newHero, questsFor, battleRewards, gainXp, advanceCampaign, newPartyBattle, startFighter, commitFighter, resolveParty, withDifficulty } from '../js/engine.js';
import { fight, botCamp, botShape, smartActs } from './sim.mjs';
import { QUESTS_PER_ACT, PARTY } from '../js/data.js';
if (process.env.PARTY_HP) process.env.PARTY_HP.split(',').forEach((v, i) => { if (v) PARTY.hp[i + 1] = Number(v); });
if (process.env.FLAT_PER) for (const k of Object.keys(PARTY.flatBy)) PARTY.flatBy[k] = Number(process.env.FLAT_PER); // FLAT_PER=16: hit power per extra hero
if (process.env.PARTY_FLAT) process.env.PARTY_FLAT.split(',').forEach((v, i) => { if (v) PARTY.flat[i + 1] = Number(v); }); // PARTY_FLAT=4: every hit +4 for two heroes // try other team health: PARTY_HP=2.4 (two heroes), PARTY_HP=2.4,3.2 (two, three)

const ACTS = Number(process.argv[2] || 2); const RUNS = Number(process.argv[3] || 2); const N = Number(process.argv[4] || 2);
const SKILL = process.env.SKILL || 'normal';
const PAIRS = process.env.PAIRS ? process.env.PAIRS.split(';').map((p) => p.split(',')) : [['wizard', 'bard'], ['knight', 'ranger'], ['dwarf', 'wizard'], ['ranger', 'bard'], ['knight', 'dwarf']]; // PAIRS=ranger,ranger;ranger,knight for other companies
const ALL = ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];

// One team fight: each living hero rolls, rerolls and locks in with the smart bot, then the table resolves the round.
function teamFight(heroes, quest, rng) {
  const b = newPartyBattle(heroes.map((h) => structuredClone(h)), quest, rng);
  for (let guard = 0; guard < 60 && !b.outcome; guard++) {
    for (let i = 0; i < b.fighters.length; i++) {
      if (!startFighter(b, i)) continue;
      const lazy = process.env.PLAY === 'first';
      if (!lazy) botShape(b, rng);
      const o = lazy ? { target: b.enemies.findIndex((e) => e.hp > 0), straight: 'atk' } : smartActs(b); commitFighter(b);
      const f = b.fighters[i]; f.target = o.target; f.straight = o.straight; f.locked = true;
    }
    resolveParty(b);
    for (const f of b.fighters) { f.locked = false; f._low = Math.min(f._low ?? 1, Math.max(0, f.hp) / f.maxHp); if (f.hp <= 0) f._fell = 1; }
  }
  return b;
}
const acts = {}; const key = (a, k) => `${a}|${k}`; const byClass = {}; // each class at the table: its own lowest health, its friend's, the damage it took and the healing it gave friends
const mAt = []; // the company's strength factor, by act
const add = (a, kind, mode, won, rounds, hpk) => { const r = (acts[key(a, kind)] ||= { a, kind, solo: { n: 0, w: 0, r: 0, h: 0 }, team: { n: 0, w: 0, r: 0, h: 0 } })[mode]; r.n++; r.w += won ? 1 : 0; r.r += rounds; r.h += hpk; };
for (let run = 0; run < RUNS; run++) {
  for (const [p, pair0] of PAIRS.entries()) {
    const pair = process.env.PAIRS || N === 2 ? pair0 : Array.from({ length: N }, (_, i) => ALL[(p + i) % ALL.length]);
    const rng = makeRng(1000 * run + 17 * p + 3);
    const heroes = pair.map((cls, i) => { const h = newHero({ name: `${cls}${i}`, cls, seed: 97 * run + 13 * p + i, pack: process.env.PACK || undefined }); h.difficulty = SKILL; return h; });
    for (let n = 0; n < QUESTS_PER_ACT * ACTS; n++) {
      if (process.env.MIX && n === QUESTS_PER_ACT) { const last = heroes.length - 1; const old = heroes[last]; const kid = newHero({ name: `${old.cls}new`, cls: old.cls, seed: 991 + p }); kid.difficulty = SKILL; kid.campaign = structuredClone(heroes[0].campaign); heroes[last] = kid; }
      const quest = questsFor(heroes[0])[0]; const act = heroes[0].campaign.act;
      // the team, against this step's quest
      const tb = teamFight(heroes, quest, rng); (mAt[act] ||= []).push(tb.team?.m || 0);
      const alive = tb.fighters.reduce((a, f) => a + Math.max(0, f.hp) / f.maxHp, 0) / tb.fighters.length;
      add(act, quest.kind, 'team', tb.outcome === 'victory', tb.round, tb.outcome === 'victory' ? alive : 0);
      tb.fighters.forEach((f, i) => { const mate = tb.fighters.filter((x) => x !== f); const c = (byClass[f.hero.cls] ||= { n: 0, low: 0, fell: 0, taken: 0, given: 0, mateLow: 0, mateFell: 0, share: 0, blockShare: 0 }); const teamDealt = tb.fighters.reduce((a, x) => a + (x.stats.dealt || 0), 0); const teamBlocked = tb.fighters.reduce((a, x) => a + (x.stats.blocked || 0), 0);
        c.n++; c.share += teamDealt ? (f.stats.dealt || 0) / teamDealt : 0; c.blockShare += teamBlocked ? (f.stats.blocked || 0) / teamBlocked : 0; c.low += f._low ?? 1; c.fell += f._fell || 0; c.taken += f.stats.taken || 0; c.given += f.stats.healGiven || 0;
        c.mateLow += mate.reduce((a, x) => a + (x._low ?? 1), 0) / Math.max(1, mate.length); c.mateFell += mate.reduce((a, x) => a + (x._fell || 0), 0) / Math.max(1, mate.length); void i; });
      // each hero alone (the way the solo campaign grows them)
      for (const h of heroes) {
        const q = questsFor(h)[0];
        let b = fight(h, q, rng); let tries = 1;
        add(act, q.kind, 'solo', b.outcome === 'victory', b.round, b.outcome === 'victory' ? b.hp / b.maxHp : 0);
        while (b.outcome !== 'victory' && tries++ < 4) b = fight(h, q, rng);
        if (b.outcome === 'victory') { const r = battleRewards(b); h.gold += r.gold; gainXp(h, r.xp); }
        advanceCampaign(h); botCamp(h, rng);
      }
    }
  }
}
void withDifficulty;
const pct = (x) => `${Math.round(100 * x)}%`.padStart(5);
console.log(`${process.env.PLAY || 'smart'} play${process.env.MIX ? ', a beginner joins in Act II' : ''} · company strength by act ${mAt.map((a, i) => (a ? `${i}: x${(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2)}` : '')).filter(Boolean).join(' ')} · ${SKILL}, ${[...new Set(PAIRS.map((p) => p.length))].join(" or ")} heroes, ${RUNS * PAIRS.length} companies: win rate (first try) · rounds · health left when won`);
console.log('act kind      solo: win  rnds  hp     n      team: win  rnds  hp     n   (n: fights; team wins ± one standard error)');
for (const r of Object.values(acts).sort((x, y) => x.a - y.a || x.kind.localeCompare(y.kind))) {
  const s = r.solo; const t = r.team;
  console.log(`${r.a}   ${r.kind.padEnd(7)}   ${pct(s.w / s.n)}  ${(s.r / s.n).toFixed(1).padStart(4)}  ${pct(s.h / Math.max(1, s.w))}  ${String(s.n).padStart(4)}      ${pct(t.w / t.n)}  ${(t.r / t.n).toFixed(1).padStart(4)}  ${pct(t.h / Math.max(1, t.w))}  ${String(t.n).padStart(4)}  ±${Math.round(100 * Math.sqrt((t.w / t.n) * (1 - t.w / t.n) / t.n))}%`);
}
console.log(`\nBy class at the table${process.env.CLASSID ? ` · class identity ${process.env.CLASSID}` : ''}${process.env.RELEASE ? ' · the released rules' : ''}: hero-fights · lowest health in a fight · fell · damage taken · healing given to friends · the friend's lowest health · the friend fell · share of the team's damage · share of the team's block (a fair share is 1 / heroes)`);
for (const [cls, c] of Object.entries(byClass)) console.log(`${cls.padEnd(7)} ${String(c.n).padStart(5)}  ${pct(c.low / c.n)}  ${pct(c.fell / c.n)}  ${(c.taken / c.n).toFixed(1).padStart(5)}  ${(c.given / c.n).toFixed(1).padStart(5)}     ${pct(c.mateLow / c.n)}  ${pct(c.mateFell / c.n)}   ${pct(c.share / c.n)}  ${pct(c.blockShare / c.n)}`);
