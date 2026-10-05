// Compares reroll rules and talent-die builds. node tools/sim2.mjs [campaigns=12]
import { makeRng, newHero, questsFor, battleRewards, gainXp, advanceCampaign, upgradeDie, addTalent, unlockDie, takePerk, offerPerks, talentInfo, talentCount } from '../js/engine.js';
import { fight } from './sim.mjs';
import { RULES, QUESTS_PER_ACT } from '../js/data.js';

const BUILDS = {
  none: () => [],
  focus: (cls) => ({ knight: ['atk', 'block'], ranger: ['atk', 'block'], wizard: ['magic', 'heal'], dwarf: ['block', 'heal'], bard: ['gold', 'magic'] }[cls]),
  allAtk: () => ['atk'], allHeal: () => ['heal'], allGold: () => ['gold'], allMagic: () => ['magic'], allBlock: () => ['block'],
};
function camp(hero, rng, build) {
  while (hero.pendingPerks > 0) takePerk(hero, offerPerks(hero, rng)[0]);
  for (const slot of ['SW', 'NE', 'SE']) unlockDie(hero, slot);
  let acted = true;
  while (acted) {
    acted = false;
    for (const slot of ['W', 'E']) if (upgradeDie(hero, 'strength', slot)) acted = true;
    if (build !== 'none') for (const slot of ['SW', 'SE']) if (upgradeDie(hero, 'special', slot)) acted = true;
  }
  if (build === 'none') return;
  const prefs = BUILDS[build](hero.class || hero.cls);
  let more = true;
  while (more) {
    more = false;
    for (const slot of ['SW', 'SE']) {
      const t = talentInfo(hero, slot);
      for (const sym of prefs) {
        for (let f = 0; f < t.faces; f++) { if (hero.gold >= t.cost && addTalent(hero, slot, f, sym)) { more = true; break; } }
        if (more) break;
      }
      if (more) break;
    }
  }
}
function run(cls, seed, build, acts) {
  const rng = makeRng(seed); const hero = newHero({ name: 'S', cls, seed });
  let defeats = 0; let rounds = 0; let hp = 0; let fights = 0;
  for (let n = 0; n < QUESTS_PER_ACT * acts; n++) {
    const quest = questsFor(hero)[0]; let b = fight(hero, quest, rng); let tries = 1;
    while (b.outcome === 'defeat' && tries < 4) { defeats++; tries++; b = fight(hero, quest, rng); }
    rounds += b.round; if (b.outcome === 'victory') { hp += b.hp / b.maxHp; fights++; const r = battleRewards(b); hero.gold += r.gold; gainXp(hero, r.xp); advanceCampaign(hero); } else return { cleared: false, defeats, rounds, hp, fights };
    camp(hero, rng, build);
  }
  return { cleared: true, defeats, rounds, hp, fights, hero };
}
const N = Number(process.argv[2] || 12); const classes = ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
function report(label, rules, build) {
  Object.assign(RULES, rules);
  let cl = 0; let def = 0; let rd = 0; let hp = 0; let ft = 0; let tot = 0;
  for (const cls of classes) for (let s = 0; s < N; s++) { const r = run(cls, 700 + s, build, 1); tot++; if (r.cleared) cl++; def += r.defeats; rd += r.rounds / Math.max(1, r.fights); hp += r.hp / Math.max(1, r.fights); }
  console.log(`${label.padEnd(34)} clear ${(100 * cl / tot).toFixed(0).padStart(3)}%  defeats/run ${(def / tot).toFixed(2)}  rounds/fight ${(rd / tot).toFixed(1)}  hp left ${(100 * hp / tot).toFixed(0)}%`);
}
const OLD = { free: 1, paid: 2, diceBonus: 0 }; const NEW = { free: 3, paid: 3, diceBonus: 1 };
report('A old rerolls, starter talents', OLD, 'none');
report('B new rerolls, starter talents', NEW, 'none');
report('C new rerolls + class-focus builds', NEW, 'focus');
for (const k of ['allAtk', 'allHeal', 'allGold', 'allMagic', 'allBlock']) report(`D new rerolls + ${k}`, NEW, k);
