// Balance simulator: a simple bot plays the real engine. Usage: node tools/sim.mjs [battles] [class]
import {
  makeRng, newHero, newBattle, startRoll, reroll, rerollInfo, evaluate, resolve, playCard, healSpend,
  cardsOf, battleRewards, gainXp, takePerk, offerPerks, upgradeDie, questsFor, advanceCampaign,
  rollSlot, canReroll, healCostOf, shopStock, buyItem,
} from '../js/engine.js';
import { CLASSES, ROLE, QUESTS_PER_ACT } from '../js/data.js';

const score = (ev) => ev.atk + 0.8 * ev.block + 1.1 * ev.pierce + 0.55 * ev.magic + 0.25 * ev.gold + 0.5 * ev.heal;

function subsets(slots, k) {
  const out = [];
  const rec = (start, cur) => {
    if (cur.length) out.push([...cur]);
    if (cur.length === k) return;
    for (let i = start; i < slots.length; i++) { cur.push(slots[i]); rec(i + 1, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}

function expectedAfter(b, slots, rng, n = 14) {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const copy = { ...b.board };
    for (const s of slots) copy[s] = rollSlot(b.hero, s, rng);
    sum += score(evaluate(b.hero, copy));
  }
  return sum / n;
}

export function botRound(b, rng) {
  startRoll(b);
  const slotsAll = Object.keys(ROLE);
  for (let guard = 0; guard < 4; guard++) {
    const info = rerollInfo(b);
    if (info.kind === 'none') break;
    const free = slotsAll.filter((s) => !b.board[s].bound);
    const base = score(evaluate(b.hero, b.board));
    let best = null;
    for (const sub of subsets(free, info.dice)) {
      if (!canReroll(b, sub)) continue;
      const gain = expectedAfter(b, sub, rng) - base - info.perDie * sub.length * 1.1;
      if (!best || gain > best.gain) best = { sub, gain };
    }
    if (!best || best.gain < 0.6) break;
    reroll(b, best.sub);
  }
  // heal when hurt
  while (b.hp <= b.maxHp - 4 && b.hp < b.maxHp * 0.55 && b.magic >= healCostOf(b.hero)) healSpend(b);
  // cards: lean on them when the round matters
  for (const c of cardsOf(b.hero)) {
    if (b.used[c.id] || b.magic < c.cost) continue;
    const f = c.fx;
    if (f.heal && b.hp > b.maxHp * 0.6) continue;
    if (f.free) continue;
    if (b.magic - c.cost < 1 && b.hp > b.maxHp * 0.5) continue;
    playCard(b, c.id);
  }
  // target: weakest, but prefer an enemy winding up
  const alive = b.enemies.map((e, i) => ({ e, i })).filter((x) => x.e.hp > 0);
  alive.sort((a, c) => (c.e.intent.v === 'charge') - (a.e.intent.v === 'charge') || a.e.hp - c.e.hp);
  const ev = evaluate(b.hero, b.board);
  const straight = b.hero.gold < 200 ? 'gold' : 'atk';
  return resolve(b, { target: alive[0].i, straight: ev.straight && straight === 'gold' && b.hp > b.maxHp * 0.6 ? 'gold' : 'atk' });
}

export function fight(hero, quest, rng) {
  const b = newBattle(hero, quest, rng, 1);
  let guard = 0;
  while (!b.outcome && guard++ < 60) botRound(b, rng);
  return b;
}

// Greedy camp: buy the best affordable strength/special upgrade; take the first perk.
export function botCamp(hero, rng) {
  while (hero.pendingPerks > 0) takePerk(hero, offerPerks(hero, rng)[0]);
  let acted = true;
  while (acted) {
    acted = false;
    for (const slot of ['W', 'E']) if (upgradeDie(hero, 'strength', slot)) acted = true;
    for (const slot of ['SW', 'SE']) if (upgradeDie(hero, 'special', slot)) acted = true;
  }
  // gear: buy any upgrade in rarity we can afford, equipping the best-scoring layout is out of scope; just stash
  const items = shopStock(hero);
  items.forEach((it, i) => { if (!it.sold && it.inst.rarity >= 1 && hero.gold >= it.price + 60) buyItem(hero, i); });
}

export function campaign(cls, seed, acts = 1) {
  const rng = makeRng(seed);
  const hero = newHero({ name: 'Sim', cls, seed });
  const log = [];
  let defeats = 0;
  for (let n = 0; n < QUESTS_PER_ACT * acts; n++) {
    const opts = questsFor(hero);
    const quest = opts[0];
    let b = fight(hero, quest, rng);
    let tries = 1;
    while (b.outcome === 'defeat' && tries < 4) { defeats++; tries++; b = fight(hero, quest, rng); }
    if (b.outcome === 'victory') {
      const r = battleRewards(b);
      hero.gold += r.gold; gainXp(hero, r.xp); advanceCampaign(hero);
    }
    botCamp(hero, rng);
    log.push({ step: quest.step, kind: quest.kind, rounds: b.round, hp: b.hp, maxHp: b.maxHp, outcome: b.outcome, tries, lvl: hero.level, gold: hero.gold, str: `${hero.strength.W}/${hero.strength.E}` });
    if (b.outcome !== 'victory') break;
  }
  return { hero, log, defeats };
}

if (process.argv[1].endsWith('sim.mjs')) {
  const N = Number(process.argv[2] || 60);
  const classes = process.argv[3] ? [process.argv[3]] : Object.keys(CLASSES);
  for (const cls of classes) {
    // 1. L1 single fights against each opener
    let wins = 0, rounds = 0, hpLeft = 0, tot = 0;
    for (let s = 0; s < N; s++) {
      const rng = makeRng(1000 + s);
      const hero = newHero({ name: 'T', cls, seed: s });
      const quest = questsFor(hero)[0];
      const b = fight(hero, quest, rng);
      tot++; if (b.outcome === 'victory') { wins++; hpLeft += b.hp / b.maxHp; } rounds += b.round;
    }
    console.log(`${cls.padEnd(8)} L1 quest 1: win ${(100 * wins / tot).toFixed(0)}%  avg rounds ${(rounds / tot).toFixed(1)}  hp left ${(100 * hpLeft / Math.max(1, wins)).toFixed(0)}%`);
  }
  console.log('\nFull Act I campaign (bot, standard quests, 3 retries per quest):');
  for (const cls of classes) {
    const agg = {};
    let finished = 0, defeats = 0, finalLvl = 0;
    const M = Math.max(10, Math.floor(N / 4));
    for (let s = 0; s < M; s++) {
      const { hero, log, defeats: d } = campaign(cls, 5000 + s);
      defeats += d;
      if (log.length === QUESTS_PER_ACT && log[log.length - 1].outcome === 'victory') finished++;
      finalLvl += hero.level;
      for (const l of log) {
        const a = (agg[l.step] ||= { n: 0, rounds: 0, hp: 0, tries: 0, lvl: 0 });
        a.n++; a.rounds += l.rounds; a.hp += l.hp / l.maxHp; a.tries += l.tries; a.lvl += l.lvl;
      }
    }
    console.log(`\n${cls}: cleared Act I ${finished}/${M}, avg defeats ${(defeats / M).toFixed(1)}, avg final level ${(finalLvl / M).toFixed(1)}`);
    for (const [step, a] of Object.entries(agg)) {
      console.log(`  step ${String(step).padStart(2)}  rounds ${(a.rounds / a.n).toFixed(1)}  hp left ${(100 * a.hp / a.n).toFixed(0)}%  tries ${(a.tries / a.n).toFixed(2)}  lvl ${(a.lvl / a.n).toFixed(1)}`);
    }
  }
}
