// The camp economy, measured (Dave, 3 Nov 2026: "how much gold is normal a round, how many potions, and how many upgrades can a new player
// actually buy by the end of Act I, II and III?"). Bots play whole campaigns on the live rules (training on). At every camp the hero buys
// potions first, then spends the rest the way the sim's camp bot does. Nothing in the game changes: levers are modelled here only.
//   node tools/t26-camp-economy.mjs [campaigns per class=3] [difficulty=normal] [out=/tmp/t26.md]
//   GOLD=1.25     every monster's gold x1.25 (a lever)          SPEED=5   a bonus of 5 gold per round under the fight's par (a lever)
//   TRAIN=first   buy Max health, Max magic and Starting magic before the dice (the default buys them last, with what is left)
process.env.RELEASE = '1';
import fs from 'node:fs';
const E = await import('../js/engine.js'); const D = await import('../js/data.js'); const S = await import('./sim.mjs');
E.useCampTraining();
const N = +process.argv[2] || 3; const SKILL = process.argv[3] || 'normal'; const OUT = process.argv[4] || '/tmp/t26.md';
const GOLD = +(process.env.GOLD || 1); const SPEED = +(process.env.SPEED || 0); const TRAIN = process.env.TRAIN || 'last';
if (process.env.ACTGOLD) process.env.ACTGOLD.split(',').forEach((v, i) => { D.ACT_GOLD[i] = +v; }); // ACTGOLD=1,0.5,0.25 sets each act's kill-gold multiplier outright
if (GOLD !== 1) for (let i = 0; i < D.ACT_GOLD.length; i++) D.ACT_GOLD[i] *= GOLD;
S.PLAY.style = 'smart'; S.setScore(null);
const classes = ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
const PAR = { 1: 4, 2: 6, 3: 8 }; // a fight's par, in rounds, for the SPEED lever (about the measured averages)

// what the hero owns, as counts we can subtract (the camp's purchases are the difference)
const owned = (h) => {
  const slots = ['W', 'E', 'N', 'S', 'SW', 'SE']; let dice = 0; let unlocked = 0; let sym = 0; let power = 0; let weap = 0; let forge = 0; let train = 0;
  for (const s of slots) if (E.isActive(h, s)) dice += Math.max(0, (E.sidesOf(h, s) - 4) / 2);
  for (const s of ['SW', 'NE', 'SE']) if (E.isActive(h, s)) unlocked++;
  for (const s of ['SW', 'SE']) sym += (h.talent?.[s] || []).filter((x) => (Array.isArray(x) ? x.length : x)).length;
  for (const k of E.cardsOf(h)) power += E.powerLevel(h, k.id);
  for (const s of ['NW', 'NE']) { const w = h.loadout[s]; if (w && w.id !== 'fists') { weap += (E.weaponSize(w) - 4) / 2; forge += w.rarity || 0; } }
  train = Object.values(h.training || {}).reduce((a, x) => a + x, 0);
  return { dice, unlocked, sym, power, weap, forge, train, reroll: h.rerollDie ? 1 : 0, pet: h.pet ? 1 : 0, belt: E.potionMaxOf(h), sold: E.shopStock(h).filter((it) => it.sold).length };
};
const act = {}; const cell = (a) => (act[a] ||= { fights: 0, rounds: 0, income: 0, kills: 0, dice: 0, retreats: 0, wins: 0, heartGold: 0, potionsDrunk: 0, potionBuy: 0, potionGold: 0, camps: 0, spend: 0, left: 0, spendable: [], inc: [],
  p: { dice: 0, unlocked: 0, sym: 0, power: 0, weap: 0, forge: 0, train: 0, reroll: 0, pet: 0, belt: 0, sold: 0 }, camps40: 0, camps60: 0, camps100: 0, campaigns: 0, atEnd: [], byStep: {} });
for (const cls of classes) for (let s = 0; s < N; s++) {
  const seed = 8800 + s; const rng = E.makeRng(seed); const hero = E.newHero({ name: 'E', cls, seed }); hero.difficulty = SKILL; let alive = true; const seen = new Set();
  for (let n = 0; n < D.QUESTS_PER_ACT * 3 && alive; n++) {
    const quest = E.questsFor(hero)[0]; const a = hero.campaign.act; const c = cell(a); if (!seen.has(a)) { seen.add(a); c.campaigns++; }
    S.botArm(hero, quest);
    const g0 = hero.gold; const pot0 = E.potionStock(hero); let b; let tries = 0; let rounds = 0; let restock = 0; let hg = 0;
    do {
      if (tries) while (E.buyPotion(hero)) { const pr = E.potionPriceOf(hero); restock += pr; c.potionBuy++; c.potionGold += pr; } // a retreat restocks
      b = E.newBattle(hero, quest, rng, 1); let g = 0; tries++; hg = 0;
      while (!b.outcome && g++ < 80) { S.botRound(b, rng); const hb = b.report?.ev?.heartBoost; if (hb && hb.sym === 'gold') hg += hb.n; } // the Heart's gold, round by round
      rounds = b.round; E.shatterDiamonds(hero);
      if (b.outcome === 'defeat') c.retreats++;
    } while (b.outcome === 'defeat' && tries < 6);
    if (b.outcome !== 'victory') { alive = false; break; }
    c.wins++; c.heartGold += hg; c.diceGold = (c.diceGold || 0) + (b.goldEarned || 0); c.mons = (c.mons || 0) + b.enemies.length; c.monGold = (c.monGold || 0) + b.enemies.reduce((q, e) => q + e.gold, 0); const r = E.battleRewards(b); const bonus = SPEED ? Math.max(0, PAR[a] - rounds) * SPEED : 0;
    hero.gold += r.gold + bonus; E.gainXp(hero, r.xp); S.botLoot(hero, r.drops); if (r.diamond) E.takeDiamond(hero, r.diamond);
    const income = hero.gold - g0 + restock; c.fights++; c.rounds += rounds; c.income += income; c.kills += r.gold; c.inc.push(income);
    c.potionsDrunk += Math.max(0, pot0 - E.potionStock(hero) + 0); const stepNo = hero.campaign.step; E.advanceCampaign(hero);
    // the camp: potions first, then everything else
    const p1 = hero.gold; while (E.buyPotion(hero)) c.potionBuy++; const p2 = hero.gold; c.potionGold += p1 - p2;
    const bs = (c.byStep[stepNo] ||= { inc: [], left: [], kind: quest.kind }); bs.inc.push(income); bs.left.push(p2);
    c.camps++; c.spendable.push(p2); if (p2 >= 40) c.camps40++; if (p2 >= 60) c.camps60++; if (p2 >= 100) c.camps100++;
    const before = owned(hero);
    if (TRAIN === 'first') for (const k of ['health', 'capacity', 'start']) for (let i = 0; i < 3; i++) { const t = E.trainingInfo(hero, k); if (!t.ok || !E.buyTraining(hero, k, t.rank, 'camp')) break; }
    S.botCamp(hero, rng);
    if (TRAIN !== 'first') for (const k of ['health', 'capacity', 'start']) for (let i = 0; i < 3; i++) { const t = E.trainingInfo(hero, k); if (!t.ok || !E.buyTraining(hero, k, t.rank, 'camp')) break; }
    const after = owned(hero); c.spend += p2 - hero.gold; c.left += hero.gold;
    for (const k of Object.keys(c.p)) c.p[k] += Math.max(0, after[k] - before[k]);
    if (hero.campaign.act !== a || n === D.QUESTS_PER_ACT * 3 - 1 || (n + 1) % D.QUESTS_PER_ACT === 0) c.atEnd.push({ lvl: hero.level, hp: E.maxHpOf(hero), cap: E.magicCapOf(hero), dice: after.dice, power: after.power, train: after.train });
  }
}
// the full shopping list a hero could ever buy, from the game's own price tables (so you can see how much of it a campaign pays for)
const sum = (xs) => xs.reduce((x, y) => x + y, 0); const steps = (t) => sum(Object.values(t).map((v) => v[0]));
const LIST = [
  ['Strength dice, both hands (d4 to d10)', 2 * steps(D.STRENGTH_STEPS)], ['Head die (d4 to d10)', steps(D.MIND_STEPS)], ['Feet die (d4 to d10)', steps(D.SPEED_STEPS)],
  ['Talent dice: unlock and grow, both', D.UNLOCK_COST.SW + D.UNLOCK_COST.SE + 2 * steps(D.SPECIAL_STEPS)],
  ['Weapon sizes, two weapons', 2 * sum(Object.values(D.WEAPON_TRAINING.prices))], ['Three magic powers, all ranks', 3 * sum(D.POWER_UPGRADE)],
  ['Max health, Max magic, Starting magic', sum(['health', 'capacity', 'start'].map((k) => sum([...(k === 'health' ? [50, 100, 180] : k === 'start' ? [75, 150, 250] : [40, 80, 140])])))],
  ['Reroll die, Pet, Potion belt', D.REROLL_DIE_COST + D.PET_PRICE + 90],
];
const fmt = (x, d = 0) => (Number.isFinite(x) ? x.toFixed(d) : '–'); const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
let md = `# The camp economy, measured (bots, smart play, live rules + training, ${SKILL}; ${N} campaigns per class; GOLD x${GOLD}${SPEED ? `, SPEED bonus ${SPEED}/round under par` : ''}, training bought ${TRAIN})\n\n`;
md += `## What comes in, and what the potions take\n\n| Act | Fights won | Rounds a fight | Gold a fight (median) | Gold a round | Potions drunk a fight | Potion gold a fight | Gold a fight from the Heart's +4 | Left after potions, per camp (median) | Camps with 40+ left | 60+ | 100+ |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const a of [1, 2, 3]) { const c = act[a]; if (!c) continue; md += `| ${a} | ${c.fights} | ${fmt(c.rounds / c.fights, 1)} | ${fmt(c.income / c.fights)} (${fmt(med(c.inc))}) | ${fmt(c.income / c.rounds, 1)} | ${fmt(c.potionBuy / c.fights, 2)} | ${fmt(c.potionGold / c.fights, 1)} | ${fmt(c.heartGold / c.fights, 1)} | ${fmt(med(c.spendable))} | ${fmt(100 * c.camps40 / c.camps)}% | ${fmt(100 * c.camps60 / c.camps)}% | ${fmt(100 * c.camps100 / c.camps)}% |\n`; }
md += `\n## What a campaign bought, per hero, by act\n\n| Act | Gold earned | Gold on potions | Gold on upgrades | Unspent at the end | Die sizes | New dice | Talent symbols | Power ranks | Weapon sizes | Forges | Training ranks | Weapons bought | Retreats a hero |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const a of [1, 2, 3]) { const c = act[a]; if (!c) continue; const k = c.campaigns || 1; md += `| ${a} | ${fmt(c.income / k)} | ${fmt(c.potionGold / k)} | ${fmt(c.spend / k)} | ${fmt(c.left / c.camps)} | ${fmt(c.p.dice / k, 1)} | ${fmt(c.p.unlocked / k, 1)} | ${fmt(c.p.sym / k, 1)} | ${fmt(c.p.power / k, 1)} | ${fmt(c.p.weap / k, 1)} | ${fmt(c.p.forge / k, 1)} | ${fmt(c.p.train / k, 1)} | ${fmt(c.p.sold / k, 1)} | ${fmt(c.retreats / k, 1)} |\n`; }
md += `\n## Fight by fight: what each step pays, and what is left after potions (median; step 5 is the elite, step 10 the boss)\n\n`;
for (const a of [1, 2, 3]) { const c = act[a]; if (!c) continue; md += `Act ${a}\n\n| Step | ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].join(' | ')} |\n|---|${'---|'.repeat(10)}\n| Gold paid | ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (c.byStep[i] ? fmt(med(c.byStep[i].inc)) : '–')).join(' | ')} |\n| Left after potions | ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (c.byStep[i] ? fmt(med(c.byStep[i].left)) : '–')).join(' | ')} |\n\n`; }
const cum = [1, 2, 3].reduce((o, a) => { const c = act[a]; const k = c?.campaigns || 1; o.push((o.length ? o[o.length - 1] : 0) + (c ? c.income / k : 0)); return o; }, []);
const total = sum(LIST.map((x) => x[1]));
md += `\n## The whole shopping list against the gold a campaign earns\n\n| What you can buy | Gold to buy all of it |\n|---|---|\n${LIST.map(([n, v]) => `| ${n} | ${v} |`).join('\n')}\n| **Everything above** | **${total}** (plus weapons from the store, potions every camp, and the Heart die) |\n\n`;
md += `Gold earned by the end of Act I: ${fmt(cum[0])} · Act II: ${fmt(cum[1])} · Act III: ${fmt(cum[2])} (all fights, before potions). The list is ${fmt(100 * total / cum[2])}% of everything a whole campaign earns.\n\n`;
md += `## How strong the hero is at the end of each act\n\n| Act | Level | Max health | Magic capacity | Power ranks | Die sizes |\n|---|---|---|---|---|---|\n`;
for (const a of [1, 2, 3]) { const c = act[a]; if (!c?.atEnd.length) continue; const v = (f) => fmt(sum(c.atEnd.map((x) => x[f])) / c.atEnd.length, 1); md += `| ${a} | ${v('lvl')} | ${v('hp')} | ${v('cap')} | ${v('power')} | ${v('dice')} |\n`; }
md += `\n## Where a fight's gold comes from\n\n| Act | Monsters a fight | Monster gold, base (each) | Gold from kills a fight | Gold from your dice a fight | Rounds a fight |\n|---|---|---|---|---|---|\n`;
for (const a of [1, 2, 3]) { const c = act[a]; if (!c || !c.fights) continue; md += `| ${a} | ${fmt(c.mons / c.fights, 1)} | ${fmt(c.monGold / c.mons, 1)} | ${fmt((c.kills - c.diceGold) / c.fights)} | ${fmt(c.diceGold / c.fights)} | ${fmt(c.rounds / c.fights, 1)} |\n`; }
fs.writeFileSync(OUT, md); console.log(md);
