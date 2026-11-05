// T31 side games: each new card in a real campaign, against the starting card it replaces in its slot. The same bot campaigns
// (all of a class), once with the starting cards and once with the side-game card equipped in its slot from the start. Prints
// how many campaigns cleared each act, defeats, gold earned, and how often the card was cast. Measurement only.
//   node tools/t31-side.mjs [campaigns = 16]      ONLY=crowd,whirlwind
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import { botShape, smartActs, botCamp } from './sim.mjs';
applyRelease();
const N = +(process.argv[2] || 16);
const SIDE = { crowd: 'bard', hymn: 'bard', showboat: 'knight', dressing: 'knight', gambit: 'ranger', whirlwind: 'dwarf' };
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : Object.keys(SIDE);
let casts = {}; E.CAST_HOOK.on = (b, out) => { casts[out.id] = (casts[out.id] || 0) + 1; };
function run(cls, swap) {
  casts = {}; const acts = [0, 0, 0]; let defeats = 0, gold = 0;
  for (let s = 0; s < N; s++) {
    const rng = E.makeRng(7000 + s); const hero = E.newHero({ name: 'Side', cls, seed: 7000 + s });
    if (swap) { hero.learned = [...(hero.learned || []), swap]; if (!E.equipPower(hero, swap)) throw new Error(`could not equip ${swap}`); } // learned for free at the start (the test is the card, not the 50 gold)
    for (let i = 0; i < D.QUESTS_PER_ACT * 3 + 6 && hero.campaign.act <= 3; i++) {
      const quest = E.questsFor(hero)[0]; if (!quest) break; const actNow = hero.campaign.act; let b = null; const g0 = hero.gold;
      for (let t = 0; t < 4 && b?.outcome !== 'victory'; t++) { if (t) defeats++; b = E.newBattle(hero, quest, rng, 1); let g = 0; while (!b.outcome && g++ < 60) { E.startRoll(b); botShape(b, rng); E.resolve(b, smartActs(b)); } }
      if (b.outcome !== 'victory') break;
      const r = E.battleRewards(b); hero.gold += r.gold; gold += hero.gold - g0; E.gainXp(hero, r.xp); E.advanceCampaign(hero); botCamp(hero, rng);
      if (hero.campaign.act > actNow) acts[actNow - 1]++;
    }
  }
  return { acts, defeats: defeats / N, gold: gold / N, casts: { ...casts } };
}
const base = {};
for (const id of ONLY) {
  const cls = SIDE[id]; base[cls] ||= run(cls, null); const r = run(cls, id); const k = D.CLASSES[cls].cards.find((c) => c.id === id);
  const was = D.CLASSES[cls].cards.find((c) => c.start && c.slot === k.slot);
  const line = (x) => `Act I ${x.acts[0]}, II ${x.acts[1]}, III ${x.acts[2]} of ${N}, defeats ${x.defeats.toFixed(1)}, gold ${Math.round(x.gold)}`;
  console.log(`${k.name.padEnd(15)} (${cls}, slot ${k.slot}, instead of ${was.name}): ${line(r)}, cast ${r.casts[id] || 0}×`);
  console.log(`${''.padEnd(15)}  with ${was.name}: ${line(base[cls])}, cast ${base[cls].casts[was.id] || 0}×`);
}
