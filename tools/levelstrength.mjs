// What a typical hero of each level is worth (heroStrength), for story campaigns that scale monsters by level rather than by
// the road (Dave, Oct 2026: Grok's duo campaigns). Heroes of every class play the campaign with the smart bot; prints the
// average strength at each level, ready for LEVEL_STRENGTH in data.js.   node tools/levelstrength.mjs [seeds=3]
import { makeRng, newHero, questsFor, battleRewards, gainXp, advanceCampaign, heroStrength } from '../js/engine.js';
import { fight, botCamp } from './sim.mjs';
import { QUESTS_PER_ACT } from '../js/data.js';
const SEEDS = Number(process.argv[2] || 3); const by = {};
for (const cls of ['knight', 'ranger', 'wizard', 'dwarf', 'bard']) for (let s = 0; s < SEEDS; s++) {
  const h = newHero({ name: 'L', cls, seed: 31 * s + 7 }); const rng = makeRng(400 + s);
  for (let n = 0; n < QUESTS_PER_ACT * 3; n++) {
    (by[h.level] ||= []).push(heroStrength(h));
    const q = questsFor(h)[0]; let b = fight(h, q, rng); let t = 1; while (b.outcome !== 'victory' && t++ < 4) b = fight(h, q, rng);
    if (b.outcome !== 'victory') break;
    const r = battleRewards(b); h.gold += r.gold; gainXp(h, r.xp); advanceCampaign(h); botCamp(h, rng);
  }
}
const levels = Object.keys(by).map(Number).sort((a, b) => a - b);
console.log('level  strength  (samples)');
for (const L of levels) console.log(`${String(L).padStart(5)}  ${(by[L].reduce((a, x) => a + x, 0) / by[L].length).toFixed(1).padStart(8)}  (${by[L].length})`);
console.log(`\nLEVEL_STRENGTH = [${levels.map((L) => Math.round(by[L].reduce((a, x) => a + x, 0) / by[L].length)).join(', ')}] // levels ${levels[0]}..${levels.at(-1)}`);
