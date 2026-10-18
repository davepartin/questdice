// Team games (Dave, Oct 2026: "our first two-player game was very easy"). Pairs of heroes grow along a campaign side by side;
// at every step each fights that step's quest alone, and then the pair fights it together at a table (newPartyBattle, PARTY
// scaling), with the smart bot playing every hero's dice. Prints solo vs team win rate, rounds and health left, by act.
//   node tools/party.mjs [acts=2] [runs=2] [heroes=2]        SKILL=hard for another difficulty
import { makeRng, newHero, questsFor, battleRewards, gainXp, advanceCampaign, newPartyBattle, startFighter, commitFighter, resolveParty, withDifficulty } from '../js/engine.js';
import { fight, botCamp, botShape, smartActs } from './sim.mjs';
import { QUESTS_PER_ACT, PARTY } from '../js/data.js';
if (process.env.PARTY_HP) process.env.PARTY_HP.split(',').forEach((v, i) => { if (v) PARTY.hp[i + 1] = Number(v); }); // try other team health: PARTY_HP=2.4 (two heroes), PARTY_HP=2.4,3.2 (two, three)

const ACTS = Number(process.argv[2] || 2); const RUNS = Number(process.argv[3] || 2); const N = Number(process.argv[4] || 2);
const SKILL = process.env.SKILL || 'normal';
const PAIRS = [['wizard', 'bard'], ['knight', 'ranger'], ['dwarf', 'wizard'], ['ranger', 'bard'], ['knight', 'dwarf']];
const ALL = ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];

// One team fight: each living hero rolls, rerolls and locks in with the smart bot, then the table resolves the round.
function teamFight(heroes, quest, rng) {
  const b = newPartyBattle(heroes.map((h) => structuredClone(h)), quest, rng);
  for (let guard = 0; guard < 60 && !b.outcome; guard++) {
    for (let i = 0; i < b.fighters.length; i++) {
      if (!startFighter(b, i)) continue;
      botShape(b, rng); const o = smartActs(b); commitFighter(b);
      const f = b.fighters[i]; f.target = o.target; f.straight = o.straight; f.locked = true;
    }
    resolveParty(b);
    for (const f of b.fighters) f.locked = false;
  }
  return b;
}
const acts = {}; const key = (a, k) => `${a}|${k}`;
const add = (a, kind, mode, won, rounds, hpk) => { const r = (acts[key(a, kind)] ||= { a, kind, solo: { n: 0, w: 0, r: 0, h: 0 }, team: { n: 0, w: 0, r: 0, h: 0 } })[mode]; r.n++; r.w += won ? 1 : 0; r.r += rounds; r.h += hpk; };
for (let run = 0; run < RUNS; run++) {
  for (const [p, pair0] of PAIRS.entries()) {
    const pair = N === 2 ? pair0 : Array.from({ length: N }, (_, i) => ALL[(p + i) % ALL.length]);
    const rng = makeRng(1000 * run + 17 * p + 3);
    const heroes = pair.map((cls, i) => { const h = newHero({ name: `${cls}${i}`, cls, seed: 97 * run + 13 * p + i }); h.difficulty = SKILL; return h; });
    for (let n = 0; n < QUESTS_PER_ACT * ACTS; n++) {
      const quest = questsFor(heroes[0])[0]; const act = heroes[0].campaign.act;
      // the team, against this step's quest
      const tb = teamFight(heroes, quest, rng);
      const alive = tb.fighters.reduce((a, f) => a + Math.max(0, f.hp) / f.maxHp, 0) / tb.fighters.length;
      add(act, quest.kind, 'team', tb.outcome === 'victory', tb.round, tb.outcome === 'victory' ? alive : 0);
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
console.log(`team health x${PARTY.hp[N - 1]} · ${SKILL}, ${N} heroes, ${RUNS * PAIRS.length} companies: win rate (first try) · rounds · health left when won`);
console.log('act kind      solo: win  rnds  hp      team: win  rnds  hp');
for (const r of Object.values(acts).sort((x, y) => x.a - y.a || x.kind.localeCompare(y.kind))) {
  const s = r.solo; const t = r.team;
  console.log(`${r.a}   ${r.kind.padEnd(7)}   ${pct(s.w / s.n)}  ${(s.r / s.n).toFixed(1).padStart(4)}  ${pct(s.h / Math.max(1, s.w))}      ${pct(t.w / t.n)}  ${(t.r / t.n).toFixed(1).padStart(4)}  ${pct(t.h / Math.max(1, t.w))}`);
}
