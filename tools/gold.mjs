// Where the gold comes from and where it goes (Dave, Oct 2026: "1,000 gold is crazy... keep the commodity of getting gold during
// the battle important"). A bot hero plays the campaign; every won fight is split into gold from straights taken as gold, gold from
// the dice faces (4s, 8s, 10s, heart, talents, pet) and gold for the monsters beaten; plus what selling spare spoils brings, what
// the camp takes, what the purse holds after camp, and what metal the spoils are. Changes no rule.
//   STYLE=smart node tools/gold.mjs [campaigns per class=2] [class]
import { evaluate, makeRng, newHero, questsFor, battleRewards, gainXp, advanceCampaign, newBattle, buyPotion, weaponValue, shatterDiamonds } from '../js/engine.js';
import { botRound, botCamp, botLoot, PLAY, setScore } from './sim.mjs';
import { QUESTS_PER_ACT, RARITY } from '../js/data.js';

PLAY.style = process.env.STYLE || 'smart'; setScore(null);
const N = Number(process.argv[2] || 2); const classes = process.argv[3] ? [process.argv[3]] : ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
const A = {};
for (const cls of classes) for (let s = 0; s < N; s++) {
  const rng = makeRng(7700 + s); const hero = newHero({ name: 'G', cls, seed: 7700 + s }); hero.difficulty = process.env.SKILL || 'normal';
  for (let n = 0; n < QUESTS_PER_ACT * 3; n++) {
    const quest = questsFor(hero)[0]; const act = hero.campaign.act;
    const a = (A[act] ||= { fights: 0, rounds: 0, total: 0, straight: 0, straights: 0, faces: 0, kills: 0, sold: 0, spent: 0, purse: 0, drops: 0, metal: [0, 0, 0], val: [0, 0, 0] });
    let b; let t = 0; let sg = 0; let sn = 0;
    do {
      if (t) while (buyPotion(hero)) { /* restock after a retreat */ }
      b = newBattle(hero, quest, rng, 1); let g = 0; t++; sg = 0; sn = 0;
      while (!b.outcome && g++ < 80) {
        botRound(b, rng); const rep = b.report; if (!rep?.ev?.straight) continue;
        const bd = Object.fromEntries(Object.entries(b.lastBoard || {}).map(([k, v]) => [k, { v }]));
        if (evaluate(b.hero, bd, { straight: 'atk' }).gold < rep.ev.gold) { sg += rep.ev.straightBonus; sn++; }
      }
      shatterDiamonds(hero);
    } while (b.outcome === 'defeat' && t < 6);
    if (b.outcome !== 'victory') break;
    const r = battleRewards(b); a.fights++; a.rounds += b.round; a.total += r.gold; a.straight += sg; a.straights += sn;
    a.faces += b.goldEarned - sg; a.kills += r.gold - b.goldEarned - b.stolen; hero.gold += r.gold; gainXp(hero, r.xp);
    for (const d of r.drops) { a.drops++; a.metal[d.rarity | 0]++; a.val[d.rarity | 0] += weaponValue(d); }
    const g0 = hero.gold; botLoot(hero, r.drops); a.sold += Math.max(0, hero.gold - g0);
    advanceCampaign(hero); const g1 = hero.gold; botCamp(hero, rng); a.spent += Math.max(0, g1 - hero.gold); a.purse += hero.gold;
  }
}
const r0 = (x) => Math.round(x);
console.log(`QuestDice gold · ${process.env.SKILL || 'normal'} · ${PLAY.style} bot · ${N} campaign(s) a class. Per won fight unless it says otherwise.`);
console.log('act   battle gold = straights as gold + gold faces + monsters   | selling spoils | spent at camp | purse after camp | rounds | spoils metal (B/S/G) and average value');
for (const [act, a] of Object.entries(A)) {
  const f = a.fights || 1;
  console.log(`${act}     ${String(r0(a.total / f)).padStart(4)}       = ${String(r0(a.straight / f)).padStart(4)}            + ${String(r0(a.faces / f)).padStart(4)}       + ${String(r0(a.kills / f)).padStart(4)}       | ${String(r0(a.sold / f)).padStart(6)}         | ${String(r0(a.spent / f)).padStart(6)}        | ${String(r0(a.purse / f)).padStart(6)}           | ${(a.rounds / f).toFixed(1).padStart(5)}  | ${a.metal.map((m) => `${r0(100 * m / (a.drops || 1))}%`).join(' / ')}  ${a.val.map((v, i) => (a.metal[i] ? r0(v / a.metal[i]) : '-')).join(' / ')}`);
  console.log(`      straights taken as gold: ${a.straights} times in ${a.fights} fights; dice gold a round (faces only) ${(a.faces / (a.rounds || 1)).toFixed(1)}`);
}
