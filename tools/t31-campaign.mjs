// T31: each class's whole campaign (Acts I–III) with the bot, to check a change to the magic cards keeps the game as hard as it was.
// Prints, per class: how many campaigns cleared each act, defeats on the way, and how often each starting power was cast.
//   node tools/t31-campaign.mjs [campaigns a class = 20]      CLASSES=knight,dwarf
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import { botShape, smartActs, botCamp } from './sim.mjs';
applyRelease();
if (process.env.T31_PATCH) await import(process.env.T31_PATCH); // a file that edits D.CLASSES (a proposal) before the run
const N = +(process.argv[2] || 20); const CLASSES = (process.env.CLASSES || 'knight,ranger,wizard,dwarf,bard').split(',');
const casts = {}; E.CAST_HOOK.on = (b, out) => { casts[out.id] = (casts[out.id] || 0) + 1; };
let all = 0, allN = 0;
for (const cls of CLASSES) {
  const acts = [0, 0, 0]; let defeats = 0;
  for (let s = 0; s < N; s++) {
    const rng = E.makeRng(7000 + s); const hero = E.newHero({ name: 'Camp', cls, seed: 7000 + s }); let dead = false;
    for (let i = 0; i < D.QUESTS_PER_ACT * 3 + 6 && hero.campaign.act <= 3 && !dead; i++) {
      const quest = E.questsFor(hero)[0]; if (!quest) break; const actNow = hero.campaign.act; let b = null;
      for (let t = 0; t < 4 && b?.outcome !== 'victory'; t++) { if (t) defeats++; b = E.newBattle(hero, quest, rng, 1); let g = 0; while (!b.outcome && g++ < 60) { E.startRoll(b); botShape(b, rng); E.resolve(b, smartActs(b)); } }
      if (b.outcome !== 'victory') { dead = true; break; }
      const r = E.battleRewards(b); hero.gold += r.gold; E.gainXp(hero, r.xp); E.advanceCampaign(hero); botCamp(hero, rng);
      if (hero.campaign.act > actNow) acts[actNow - 1]++;
    }
    if (acts.length && !dead && hero.campaign.act > 3) { /* cleared */ }
  }
  all += acts[2]; allN += N;
  const pw = D.CLASSES[cls].cards.filter((c) => c.start).map((c) => `${c.name} ${casts[c.id] || 0}`).join(', ');
  console.log(`${cls.padEnd(7)} cleared Act I ${acts[0]}/${N}, Act II ${acts[1]}/${N}, Act III ${acts[2]}/${N}, defeats ${(defeats / N).toFixed(1)} a campaign | casts: ${pw}`);
}
console.log(`all classes: cleared the whole campaign ${all}/${allN}`);
