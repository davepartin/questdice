// Balance simulator: a simple bot plays the real engine. Usage: node tools/sim.mjs [battles] [class]
import {
  makeRng, newHero, newBattle, startRoll, reroll, rerollInfo, evaluate, resolve, playCard, healSpend,
  cardsOf, powerState, castPower, upgradePower, battleRewards, gainXp, takePerk, offerPerks, upgradeDie, questsFor, advanceCampaign,
  rollSlot, canReroll, healCostOf, shopStock, buyItem, activeSlots, unlockDie,
  heroPower, equip, sellItem, sellDrop, takeDrop, trainWeapon, forgeWeapon, isTwoHanded,
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

const SAMPLES = Number(process.env.SIM_SAMPLES || 14); // fewer for long progression runs
function expectedAfter(b, slots, rng, n = SAMPLES) {
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
  const slotsAll = activeSlots(b.hero);
  for (let guard = 0; guard < 8; guard++) {
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
  // powers: at-will ones when there is magic to spare, the rest when the round matters; supers once the fight is big enough to need them
  const foes = b.enemies.filter((e) => e.hp > 0).length;
  for (const c of cardsOf(b.hero)) {
    const st = powerState(b, c); if (st.spent || st.early) continue;
    const f = c.fx; const x = c.kind === 'scale' ? Math.min(c.max, Math.max(c.cost, Math.floor(b.magic / 2))) : c.cost;
    if (b.magic < x) continue;
    if (f.heal && !c.dice && b.hp > b.maxHp * 0.6) continue;
    if (c.dice?.to === 'heal' && b.hp > b.maxHp * 0.6) continue;
    if (f.free) continue;
    if (c.kind === 'super' && foes < 2 && b.round < 4) continue;
    if (c.atwill ? b.magic - x < 2 : (b.magic - x < 1 && b.hp > b.maxHp * 0.5)) continue;
    castPower(b, c.id, { x });
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
  for (const k of cardsOf(hero)) if (hero.gold > 260) upgradePower(hero, k.id);
  for (const slot of ['SW', 'NE', 'SE']) unlockDie(hero, slot); // buy the next die as soon as it can be afforded
  let acted = true;
  while (acted) {
    acted = false;
    for (const slot of ['W', 'E']) if (upgradeDie(hero, 'strength', slot)) acted = true;
    for (const slot of ['SW', 'SE']) if (upgradeDie(hero, 'special', slot)) acted = true;
  }
  // weapons: train them as the hands allow, then forge tiers with spare gold
  const held = [...new Set(['NW', 'NE'].map((k) => hero.loadout[k]).filter((w) => w && w.id !== 'fists').map((w) => w.uid))];
  for (const uid of held) while (trainWeapon(hero, uid)) { /* grow it */ }
  for (const uid of held) if (hero.gold > 120) forgeWeapon(hero, uid);
  // the peddler: buy a weapon only if wielding it is a real step up
  const items = shopStock(hero);
  items.forEach((it, i) => {
    if (it.sold || hero.gold < it.price + 30) return;
    const r = bestSlotFor(hero, it.inst); if (r.gain < 1) return;
    if (buyItem(hero, i)) { equip(hero, it.inst.uid, r.side); while (hero.bag.length) sellItem(hero, hero.bag[0].uid); }
  });
}

// Gear sense: a weapon is worth wielding if the hero's average throw gets better with it.
const gearScore = (h) => { const p = heroPower(h, 160); return p.dmg + 0.8 * p.block + 0.4 * p.heal + 0.4 * p.magic; };
const cloneH = (h) => JSON.parse(JSON.stringify(h));
function bestSlotFor(hero, inst) { // returns { gain, side } for wielding `inst` instead of what is held
  const base = gearScore(hero); let best = { gain: -1e9, side: null };
  for (const side of WEAPONS_SIDES(inst)) {
    const h = cloneH(hero); h.bag.push({ ...inst }); if (!equip(h, inst.uid, side)) continue;
    const g = gearScore(h) - base; if (g > best.gain) best = { gain: g, side };
  }
  return best;
}
const WEAPONS_SIDES = (inst) => (inst.id && ['bow', 'longsword', 'staff'].includes(inst.id) ? ['NW'] : ['NW', 'NE']);
// Spoils: wield the drop that helps most; otherwise sell the most valuable one on the spot.
export function botLoot(hero, drops) {
  if (!drops?.length) return;
  let pick = null;
  for (const d of drops) { const r = bestSlotFor(hero, d); if (r.gain > 0.4 && (!pick || r.gain > pick.gain)) pick = { d, ...r }; }
  if (pick) {
    hero.bag.push(pick.d); equip(hero, pick.d.uid, pick.side);
    while (hero.bag.length) sellItem(hero, hero.bag[0].uid); // the bot travels light: sell what it put down
    return;
  }
  const best = [...drops].sort((a, b) => sellValueOf(b) - sellValueOf(a))[0];
  sellDrop(hero, best);
}
const sellValueOf = (inst) => { const h = { gold: 0 }; sellDrop(h, inst); return h.gold; };
void takeDrop; void isTwoHanded;

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
