// Balance report: per-round output of every resource and the monsters' damage, plus difficulty clear rates (Act I, bot players).
//   node tools/balance.mjs [campaigns per class = 6]
import { makeRng, newHero, questsFor, battleRewards, gainXp, advanceCampaign } from '../js/engine.js';
import { botRound, botCamp } from './sim.mjs';
import { newBattle } from '../js/engine.js';
import { DIFFICULTY } from '../js/data.js';

const N = Number(process.argv[2] || 6); const classes = ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
function play(cls, seed, diff, stats) {
  const rng = makeRng(seed); const hero = newHero({ name: 'B', cls, seed }); hero.difficulty = diff;
  let defeats = 0; let rounds = 0; let fights = 0; let hp = 0;
  for (let n = 0; n < 10; n++) {
    const quest = questsFor(hero)[0]; let b; let tries = 0;
    do {
      b = newBattle(hero, quest, rng, 1); let g = 0; tries++;
      while (!b.outcome && g++ < 60) { const rep = botRound(b, rng); if (stats) { const bucket = n < 3 ? 'early' : n < 7 ? 'middle' : 'late'; const t = stats[bucket]; t.n++; for (const k of ['atk', 'block', 'pierce', 'heal', 'magic', 'gold']) t[k] += rep.T[k] || 0; t.taken += rep.taken || 0; } }
      if (b.outcome === 'defeat') defeats++;
    } while (b.outcome === 'defeat' && tries < 4);
    rounds += b.round; fights++;
    if (b.outcome !== 'victory') return { cleared: false, defeats, rounds, fights, hp };
    hp += b.hp / b.maxHp; const r = battleRewards(b); hero.gold += r.gold; gainXp(hero, r.xp); advanceCampaign(hero); botCamp(hero, rng);
  }
  return { cleared: true, defeats, rounds, fights, hp };
}
const mkStats = () => ({ early: { n: 0, atk: 0, block: 0, pierce: 0, heal: 0, magic: 0, gold: 0, taken: 0 }, middle: { n: 0, atk: 0, block: 0, pierce: 0, heal: 0, magic: 0, gold: 0, taken: 0 }, late: { n: 0, atk: 0, block: 0, pierce: 0, heal: 0, magic: 0, gold: 0, taken: 0 } });
const stats = mkStats();
for (const diff of Object.keys(DIFFICULTY)) {
  let cl = 0; let def = 0; let rd = 0; let ft = 0; let hp = 0; let tot = 0;
  for (const cls of classes) for (let s = 0; s < N; s++) { const r = play(cls, 900 + s, diff, diff === 'normal' ? stats : null); tot++; if (r.cleared) cl++; def += r.defeats; rd += r.rounds / r.fights; hp += r.hp / Math.max(1, r.fights - (r.cleared ? 0 : 1)); }
  console.log(`${DIFFICULTY[diff].name.padEnd(7)} clears Act I ${(100 * cl / tot).toFixed(0)}%   defeats per run ${(def / tot).toFixed(2)}   rounds per fight ${(rd / tot).toFixed(1)}   hp left after a win ${(100 * hp / tot).toFixed(0)}%`);
}
console.log('\nAverage per ROUND (normal difficulty, bot players):');
console.log('stage    atk   block pierce heal  magic gold | damage taken');
for (const [k, t] of Object.entries(stats)) console.log(`${k.padEnd(8)} ${[t.atk, t.block, t.pierce, t.heal, t.magic, t.gold].map((x) => (x / t.n).toFixed(1).padStart(5)).join(' ')}  | ${(t.taken / t.n).toFixed(1)}`);
