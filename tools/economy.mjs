// The economy study (Dave, Oct 2026): where the gold comes from, what it buys in attack and block, how both sides grow along the
// road, and whether a player who saves up for big upgrades still has enough. A hero plays the campaign with the wise bot
// (tools/sim.mjs) and spends its gold one of three ways (SPEND):
//   greedy  buys the next thing it can afford (the bot every balance table used: botCamp)
//   value   buys whatever adds the most power per gold first, again and again
//   saver   saves for the single biggest power gain it can work towards, and buys it when it can
// Every step prints the gold in and out, the hero's average throw, and the fight it meets; checkpoints print the camp's price list.
//   SKILL=normal SPEND=value node tools/economy.mjs [acts=3] [class=knight] [seed=1]      PRICES=1 for the price lists
import { makeRng, newHero, questsFor, battleRewards, gainXp, advanceCampaign, newBattle, buyPotion, maxHpOf, upgradeDie, unlockDie,
  trainWeapon, forgeWeapon, addTalent, talentInfo, withDifficulty, upgradePower, cardsOf, isActive, evaluate, rollBoard } from '../js/engine.js';
import { botRound, botCamp, botLoot, PLAY, setScore } from './sim.mjs';
import { QUESTS_PER_ACT, MONSTERS } from '../js/data.js';

const ACTS = Number(process.argv[2] || 3); const CLS = process.argv[3] || 'knight'; const SEED = Number(process.argv[4] || 1);
const SPEND = process.env.SPEND || 'greedy'; const T = Number(process.env.TRIALS || 0);
const clone = (h) => JSON.parse(JSON.stringify(h));
// One number for a throw: attack and pierce count fully, block 0.8, heal 0.5, magic 0.55, gold 0.25 (the bot's own weights).
export const worth = (p) => p.dmg + 0.8 * p.block + 0.5 * p.heal + 0.55 * p.magic + 0.25 * p.gold;
// An average throw, measured on the same dice rolls for every build (so a price list compares like with like).
const P = (h, n = 4000) => { const r = makeRng(424242); const t = { atk: 0, pierce: 0, block: 0, heal: 0, magic: 0, gold: 0 };
  for (let i = 0; i < n; i++) { const ev = evaluate(h, rollBoard(h, r)); for (const k in t) t[k] += ev[k] || 0; }
  for (const k in t) t[k] /= n; return { ...t, dmg: t.atk + t.pierce, hp: maxHpOf(h) }; };

// Everything the camp sells that changes the dice, with its price and what it adds to an average throw.
export function priceList(hero) {
  const base = P(hero); const out = [];
  const tryIt = (label, fn) => {
    const h = clone(hero); h.gold = 1e6; if (!fn(h)) return; const cost = 1e6 - h.gold; if (cost <= 0) return;
    const p = P(h); out.push({ label, cost, dAtk: p.dmg - base.dmg, dBlk: p.block - base.block, dHeal: p.heal - base.heal, dMagic: p.magic - base.magic, dWorth: worth(p) - worth(base), act: (x) => fn(x) });
  };
  tryIt('Left hand bigger', (h) => upgradeDie(h, 'strength', 'W'));
  tryIt('Right hand bigger', (h) => upgradeDie(h, 'strength', 'E'));
  tryIt('Feet bigger', (h) => upgradeDie(h, 'speed', 'S'));
  tryIt('Head bigger', (h) => upgradeDie(h, 'mind', 'N'));
  for (const s of ['SW', 'SE']) if (isActive(hero, s)) tryIt(`Talent ${s} bigger`, (h) => upgradeDie(h, 'special', s));
  for (const s of ['NE', 'SW', 'SE']) if (!isActive(hero, s)) tryIt(`New die ${s}`, (h) => unlockDie(h, s));
  const held = [...new Set(['NW', 'NE'].map((k) => hero.loadout[k]).filter((w) => w && w.id !== 'fists').map((w) => w.uid))];
  for (const uid of held) { const w = Object.values(hero.loadout).find((x) => x?.uid === uid); tryIt(`Train ${w.id}`, (h) => trainWeapon(h, uid)); tryIt(`Forge ${w.id}`, (h) => forgeWeapon(h, uid)); }
  for (const s of ['SW', 'SE']) {
    if (!isActive(hero, s)) continue; const t = talentInfo(hero, s);
    for (let f = 0; f < t.faces; f++) {
      const have = hero.talent?.[s]?.[f]; if (Array.isArray(have) ? have.length : have) continue;
      let best = null;
      for (const sym of ['atk', 'block', 'heal', 'magic', 'gold']) { const h = clone(hero); h.gold = 1e6; if (!addTalent(h, s, f, sym)) continue; const d = worth(P(h)) - worth(base); if (!best || d > best.d) best = { sym, d }; }
      if (best) tryIt(`Talent ${s} face ${t.nums[f]}: ${best.sym}`, (h) => addTalent(h, s, f, best.sym));
    }
  }
  return out.sort((a, b) => b.dWorth / b.cost - a.dWorth / a.cost);
}

// Camp, by spending style. Potions are refilled first by every style (they are what keeps a run alive).
function camp(hero, rng) {
  if (SPEND === 'greedy') { botCamp(hero, rng); return; }
  while (hero.pendingPerks > 0) botCamp({ ...hero, gold: 0 }, rng) && 0; // (perks are taken by botCamp below)
  const gold0 = hero.gold; hero.gold = 0; botCamp(hero, rng); hero.gold += gold0; // perks only (no gold to spend)
  while (buyPotion(hero)) { /* refill */ }
  for (let guard = 0; guard < 30; guard++) {
    const list = priceList(hero).filter((o) => o.dWorth > 0.05);
    if (!list.length) break;
    let pick;
    if (SPEND === 'value') pick = list.find((o) => o.cost <= hero.gold);
    else { const big = [...list].sort((a, b) => b.dWorth - a.dWorth)[0]; pick = big.cost <= hero.gold ? big : null; } // saver: the biggest gain, or wait
    if (!pick) break;
    if (!pick.act(hero)) break;
  }
  for (const k of cardsOf(hero)) if (hero.gold > 260) upgradePower(hero, k.id);
}

// The fight a step brings: the monsters' total health and their average hit a round (before your block), at this difficulty.
function foeSide(hero, quest0) {
  const q = withDifficulty(hero, quest0); let hp = 0; let hit = 0;
  for (const id of q.enemies) {
    const M = MONSTERS[id]; hp += Math.round(M.hp * (q.hpMult ?? 1)); const ep = (M.power + 1) / 2; let d = 0;
    for (const f of M.faces) if (['strike', 'pierce', 'drain', 'pilfer', 'breath'].includes(f.v)) d += Math.max(0, f.f + f.m * ep + (q.flat || 0));
    hit += d / 6;
  }
  return { hp, hit };
}

PLAY.style = 'wise'; setScore(null);
const rng = makeRng(7000 + SEED); const hero = newHero({ name: 'E', cls: CLS, seed: 7000 + SEED }); hero.difficulty = process.env.SKILL || 'normal';
const rows = []; let earned = 0; let sold = 0; let spent = 0;
for (let n = 0; n < QUESTS_PER_ACT * ACTS; n++) {
  const quest = questsFor(hero)[0]; const key = `${hero.campaign.act}.${String(hero.campaign.step).padStart(2, '0')}`;
  const p = P(hero); const foe = foeSide(hero, quest);
  let wins = null;
  if (T) { let w = 0; for (let i = 0; i < T; i++) { const r = makeRng(SEED * 1000 + n * 37 + i); const b = newBattle(clone(hero), quest, r, 1); let g = 0; while (!b.outcome && g++ < 80) botRound(b, r); if (b.outcome === 'victory') w++; } wins = w / T; }
  if (process.env.PRICES && /\.(01|05|09)$/.test(key)) {
    console.log(`\n${key} camp price list (${CLS}, ${hero.gold} gold): cost · +attack · +block · +heal · +magic · gold per point of power`);
    for (const o of priceList(hero).slice(0, 12)) console.log(`  ${o.label.padEnd(30)} ${String(o.cost).padStart(4)}  ${o.dAtk.toFixed(1).padStart(5)}  ${o.dBlk.toFixed(1).padStart(5)}  ${o.dHeal.toFixed(1).padStart(5)}  ${o.dMagic.toFixed(1).padStart(5)}   ${(o.cost / Math.max(0.01, o.dWorth)).toFixed(0).padStart(5)}`);
  }
  let b; let tries = 0;
  do { if (tries) while (buyPotion(hero)) { /* restock */ } b = newBattle(hero, quest, rng, 1); let g = 0; tries++; while (!b.outcome && g++ < 80) botRound(b, rng); } while (b.outcome === 'defeat' && tries < 6);
  if (b.outcome !== 'victory') { console.log(`fell at ${key}`); break; }
  const dealtPerRound = b.stats.dealt / Math.max(1, b.round); const takenPerRound = b.stats.taken / Math.max(1, b.round);
  const r = battleRewards(b); hero.gold += r.gold; earned += r.gold; gainXp(hero, r.xp);
  const g1 = hero.gold; botLoot(hero, r.drops); sold += hero.gold - g1;
  advanceCampaign(hero); const g2 = hero.gold; camp(hero, rng); spent += g2 - hero.gold;
  rows.push({ key, kind: quest.kind, lvl: hero.level, gold: r.gold, sold: hero.gold - g1 + (g2 - hero.gold) * 0, atk: p.dmg, blk: p.block, heal: p.heal, magic: p.magic, worth: worth(p), hp: maxHpOf(hero), foeHp: foe.hp, foeHit: foe.hit, bank: hero.gold, wins, tries, dealtPerRound, takenPerRound, rounds: b.round });
}
console.log(`\n${CLS}, ${hero.difficulty}, spending: ${SPEND}. Earned in fights ${earned}, from selling ${sold}, spent at camp ${spent}, left ${hero.gold}`);
console.log('step   kind    lvl  fight gold  bank | average throw: attack  block  heal  magic  power  health | monster health  hit/round | in the fight: dealt/round  taken/round  rounds' + (T ? ' | wise wins' : ''));
for (const r of rows) {
  console.log(`${r.key}  ${r.kind.padEnd(6)} ${String(r.lvl).padStart(3)}  ${String(r.gold).padStart(9)}  ${String(r.bank).padStart(4)} | ${r.atk.toFixed(1).padStart(20)}  ${r.blk.toFixed(1).padStart(5)}  ${r.heal.toFixed(1).padStart(4)}  ${r.magic.toFixed(1).padStart(5)}  ${r.worth.toFixed(1).padStart(5)}  ${String(r.hp).padStart(6)} | ${String(r.foeHp).padStart(14)}  ${r.foeHit.toFixed(1).padStart(9)} | ${r.dealtPerRound.toFixed(1).padStart(24)}  ${r.takenPerRound.toFixed(1).padStart(11)}  ${String(r.rounds).padStart(6)}` + (T ? ` | ${(100 * r.wins).toFixed(0).padStart(8)}%` : ''));
}
if (process.env.OUT) (await import('node:fs')).writeFileSync(process.env.OUT, JSON.stringify({ rows, earned, sold, spent, left: hero.gold }));
