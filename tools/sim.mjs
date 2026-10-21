// Balance simulator: a simple bot plays the real engine. Usage: node tools/sim.mjs [battles] [class]
import {
  makeRng, newHero, newBattle, startRoll, reroll, rerollInfo, evaluate, resolve, playCard, healSpend,
  cardsOf, powerState, castPower, upgradePower, battleRewards, gainXp, takePerk, offerPerks, upgradeDie, questsFor, advanceCampaign,
  rollSlot, canReroll, healCostOf, shopStock, buyItem, activeSlots, unlockDie, drinkPotion, POTION_HP, buyPotion,
  heroPower, equip, sellItem, buyRerollDie, sellDrop, takeDrop, trainWeapon, forgeWeapon, isTwoHanded,
  buyPet, addPetSymbol, growPet, petGrowInfo, talentInfo, addTalent, intentRange, isDamageIntent, drinkPotion as drink,
} from '../js/engine.js';
import { CLASSES, ROLE, QUESTS_PER_ACT, PETS, PET_PRICE, CLASS_TALENT, BAG_MAX } from '../js/data.js';
import * as ENGINE from '../js/engine.js';
// Pets on or off for the bot (QD_PETS=0 turns them off, to compare balance with and without).
export const SIM = { pets: typeof process === 'undefined' || process.env.QD_PETS !== '0' };

const baseScore = (ev) => ev.atk + 0.8 * ev.block + 1.1 * ev.pierce + 0.55 * ev.magic + 0.25 * ev.gold + 0.5 * ev.heal;
// How the bot values a roll. tools/strategy.mjs swaps in other play styles (score(ev, battle)).
let score = (ev) => baseScore(ev);
export function setScore(fn) { score = fn || ((ev) => baseScore(ev)); }
// How well the bot plays (PLAY=first|smart|wise; Dave, Oct 2026: careless play should lose more the harder the setting, wise play should
// still win on Legendary):
//   first: keeps its first roll, never rerolls, never casts a power, swings at the first monster, drinks a potion when low.
//   smart: rerolls for the best average throw, uses powers by simple rules (the bot every balance table used until now).
//   wise:  rerolls by reading each monster's move (block is worth a lot up to the hit that is coming, attack past what kills everything
//          is worth nothing), then thinks before it locks in: it plays out its choices (target, powers, charges, heals, potions) a few
//          times each and keeps the ones that leave it best off (see wiseLock).
export const PLAY = { style: (typeof process !== 'undefined' && process.env.PLAY) || 'smart' };
// The damage the monsters can throw this round that block can soak (pierce goes through), at the top of their range for big moves.
export function threatOf(b) {
  return b.enemies.filter((e) => e.hp > 0 && e.intent && isDamageIntent(e.intent) && e.intent.v !== 'pierce').reduce((a, e) => {
    const r = intentRange(e); if (!r) return a; const hit = e.intent.slam ? r[1] : (r[0] + 2 * r[1]) / 3; return a + (e.intent.v === 'breath' ? hit / 2 : hit); // breath: half of it goes through block
  }, 0);
}
const wiseScore = (ev, b) => {
  const t = threatOf(b); const left = b.enemies.filter((e) => e.hp > 0).reduce((a, e) => a + e.hp, 0);
  const atk = Math.min(ev.atk + ev.pierce, left + 4);
  return atk + 0.1 * ev.pierce + 1.25 * Math.min(ev.block, t) + 0.1 * Math.max(0, ev.block - t) + 0.55 * ev.magic + 0.2 * ev.gold + 0.6 * Math.min(ev.heal, b.maxHp - b.hp);
};

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
    sum += score(evaluate(b.hero, copy), b);
  }
  return sum / n;
}

// ---- the wise player's turn: try the choices in its head before locking in (one round of look-ahead, a few dice futures each).
// Choices: which monster to hit, and any of: cast a power (a scaling one at its least, half its magic, or its most), store or release
// charges, heal with magic, drink a potion. It adds the single choice that helps most, then the next, until nothing helps.
// How good a future is: alive and healthy, monsters hurt or dead, and magic, potions and stored charges kept for later.
const LOOK = Number((typeof process !== 'undefined' && process.env.LOOK) || 6);
function cloneB(b, seed) { const r = b.rng; b.rng = null; const c = JSON.parse(JSON.stringify(b)); b.rng = r; c.rng = makeRng(seed); return c; }
function futureValue(c) {
  const foes = c.enemies.filter((e) => e.hp > 0);
  if (c.outcome === 'defeat' || c.hp <= 0) return -2000;
  const hpFrac = c.hp / c.maxHp;
  let v = c.hp * 1.0 - (hpFrac < 0.35 ? (0.35 - hpFrac) * c.maxHp * 2 : 0); // low health is worth less than it looks: the next hit may end it
  v += c.magic * 2.2 + (c.potions || 0) * 9;
  for (const [id, n] of Object.entries(c.charge || {})) { const card = cardsOf(c.hero).find((k) => k.id === id); const per = card?.per || {}; v += n * 0.7 * Object.values(typeof per === 'number' ? { atk: per } : per).reduce((a, x) => a + x, 0); }
  if (c.outcome === 'victory') return v + 400;
  // focus fire: a point of damage is worth more on a monster that is nearly down (a living monster keeps hitting you every round)
  for (const e of foes) v -= e.hp * 0.5 + 8 * Math.sqrt(e.hp) + 10 + (e.windup || e.pounce ? 12 : 0);
  return v;
}
function wiseChoices(b) {
  const out = [];
  for (const c of cardsOf(b.hero)) {
    if (c.kind === 'charge') {
      out.push({ k: `${c.id}+`, go: (x) => castPower(x, c.id) });
      out.push({ k: `${c.id}!`, go: (x) => castPower(x, c.id, { release: true }) });
      continue;
    }
    if (c.fx?.free) continue;
    if (c.kind === 'scale') { for (const n of new Set([c.cost, Math.max(c.cost, Math.floor(b.magic / 2)), Math.min(c.max, b.magic)])) out.push({ k: `${c.id}:${n}`, go: (x) => castPower(x, c.id, { x: n }) }); continue; }
    out.push({ k: c.id, go: (x) => castPower(x, c.id) });
  }
  out.push({ k: 'heal', go: (x) => healSpend(x) });
  out.push({ k: 'potion', go: (x) => drinkPotion(x) });
  return out;
}
function wiseLock(b, rng) {
  const seeds = Array.from({ length: LOOK }, () => Math.floor(rng() * 2 ** 31));
  const ev0 = evaluate(b.hero, b.board); const straight = ev0.straight && b.hero.gold < 200 && b.hp > b.maxHp * 0.6 ? 'gold' : 'atk';
  const score = (plan, target) => {
    let t = 0;
    for (const sd of seeds) { const c = cloneB(b, sd); for (const a of plan) if (!a.go(c)) return -1e9; resolve(c, { target, straight }); t += futureValue(c); }
    return t / seeds.length;
  };
  const alive = b.enemies.map((e, i) => ({ e, i })).filter((x) => x.e.hp > 0);
  let target = alive[0].i; let best = -1e9;
  for (const { i } of alive) { const v = score([], i); if (v > best) { best = v; target = i; } }
  const plan = []; const pool = wiseChoices(b);
  for (let step = 0; step < 4; step++) {
    let pick = null;
    for (const a of pool) { if (plan.some((p) => p.k === a.k && a.k !== 'heal' && a.k !== 'potion')) continue; const v = score([...plan, a], target); if (v > best + 0.5 && (!pick || v > pick.v)) pick = { a, v }; }
    if (!pick) break; plan.push(pick.a); best = pick.v;
  }
  // the simple rules' plan is one more candidate, so thinking never does worse than not thinking
  let smartV = 0; for (const sd of seeds) { const c = cloneB(b, sd); const o = smartActs(c); resolve(c, o); smartV += futureValue(c); } smartV /= seeds.length;
  if (smartV > best) return resolve(b, smartActs(b));
  for (const a of plan) a.go(b);
  return resolve(b, { target, straight });
}

export function botRound(b, rng) {
  if (PLAY.style === 'first') {
    startRoll(b);
    while (b.hp < b.maxHp * 0.35 && drink(b)) { /* gulp */ }
    const first = b.enemies.findIndex((e) => e.hp > 0);
    return resolve(b, { target: first, straight: 'atk' });
  }
  const wise = PLAY.style === 'wise';
  if (wise) setScore(wiseScore);
  startRoll(b);
  botShape(b, rng);
  if (wise) return wiseLock(b, rng);
  return resolve(b, smartActs(b));
}
// The rerolls a bot makes on a rolled board (shared by botRound and the party simulator, tools/party.mjs).
export function botShape(b, rng) {
  const slotsAll = activeSlots(b.hero);
  for (let guard = 0; guard < 8; guard++) {
    const info = rerollInfo(b);
    if (info.kind === 'none') break;
    const free = slotsAll.filter((s) => !b.board[s].bound);
    const base = score(evaluate(b.hero, b.board), b);
    let best = null;
    for (const sub of subsets(free, info.dice)) {
      if (!canReroll(b, sub)) continue;
      const gain = expectedAfter(b, sub, rng) - base - info.perDie * sub.length * 1.1;
      if (!best || gain > best.gain) best = { sub, gain };
    }
    if (!best || best.gain < 0.6) break;
    reroll(b, best.sub);
  }
}

// The smart bot's choices before it locks in (potions, magic heals, powers, target), applied to b. Returns the resolve options.
export function smartActs(b) {
  const wise = false;
  // potions first (free), then magic heals, when hurt
  while (b.hp <= b.maxHp - POTION_HP && b.hp < b.maxHp * 0.5 && drinkPotion(b)) { /* gulp */ }
  while (b.hp <= b.maxHp - 4 && b.hp < b.maxHp * 0.55 && b.magic >= healCostOf(b.hero)) healSpend(b);
  // powers: at-will ones when there is magic to spare, the rest when the round matters; supers once the fight is big enough to need them
  const foes = b.enemies.filter((e) => e.hp > 0).length;
  // charges: release when full, when hurt, or when a foe is nearly down; otherwise keep storing
  for (const c of cardsOf(b.hero)) {
    if (c.kind !== 'charge') continue; const n = (b.charge && b.charge[c.id]) || 0;
    const low = b.enemies.some((e) => e.hp > 0 && e.hp <= 12); const per = c.per || {};
    if (n >= c.max || (n >= 2 && (low || (per.heal && b.hp < b.maxHp * 0.5) || (per.block && b.hp < b.maxHp * 0.5)))) castPower(b, c.id, { release: true });
  }
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
  // target: weakest, but hit a Stalker or a foe winding up first, and leave a Fire Ward or a Phasing foe alone when there is another
  const alive = b.enemies.map((e, i) => ({ e, i })).filter((x) => x.e.hp > 0);
  const want = (e) => (['charge', 'stalk'].includes(e.intent?.v) || (wise && e.windup) ? 1 : ['ward', 'phase'].includes(e.intent?.v) ? -1 : 0);
  alive.sort((a, c) => want(c.e) - want(a.e) || a.e.hp - c.e.hp);
  const ev = evaluate(b.hero, b.board);
  const straight = b.hero.gold < 200 ? 'gold' : 'atk';
  return { target: alive[0].i, straight: ev.straight && straight === 'gold' && b.hp > b.maxHp * 0.6 ? 'gold' : 'atk' };
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
  while (buyPotion(hero)) { /* refill the belt first: potions are bought at camp now */ }
  for (const k of cardsOf(hero)) if (hero.gold > 260) upgradePower(hero, k.id);
  for (const slot of ['SW', 'NE', 'SE']) unlockDie(hero, slot); // buy the next die as soon as it can be afforded
  if (hero.gold >= 230) buyRerollDie(hero); // the 4th reroll die once there is a little to spare
  if (SIM.pets) botPet(hero);
  botTalent(hero);
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
    if (buyItem(hero, i)) { equip(hero, it.inst.uid, r.side); trimBag(hero); }
  });
  botReady(hero);
}
// Wear (Oct 2026): a broken weapon leaves an empty hand. Before the next fight the bot fills it with the best weapon in its pack.
export function botReady(hero) {
  for (let guard = 0; guard < 3; guard++) {
    const empty = ['NW', 'NE'].some((k) => (k === 'NW' || isActiveSlot(hero, k)) && (!hero.loadout[k] || hero.loadout[k].id === 'fists'));
    if (!empty || !hero.bag.length) return;
    let pick = null;
    for (const w of hero.bag) { const r = bestSlotFor(hero, w); if (!pick || r.gain > pick.gain) pick = { w, ...r }; }
    if (!pick?.side || !equip(hero, pick.w.uid, pick.side)) return;
  }
}
const isActiveSlot = (hero, k) => !hero.dice || hero.dice.includes(k);
// The bot keeps a few spares (weapons wear out now) and sells the least valuable past what the pack holds.
function trimBag(hero) {
  const keep = Math.max(0, BAG_MAX - 1); // room for the next spoils
  while (hero.bag.length > keep) { const worst = [...hero.bag].sort((a, b) => sellValueOf(a) - sellValueOf(b))[0]; sellItem(hero, worst.uid); }
}

// Talent dice (v3): buy a symbol for the biggest empty number face while there is gold to spare, the class's own symbols first.
function botTalent(hero) {
  for (const slot of ['SW', 'SE']) {
    if (!(hero.dice || []).includes(slot)) continue;
    const t = talentInfo(hero, slot); const mine = hero.cls;
    const order = [CLASS_TALENT[mine]?.[slot], 'atk', 'block', 'heal', 'magic', 'gold'].filter(Boolean);
    for (let f = t.faces - 1; f >= 0; f--) {
      const have = hero.talent?.[slot]?.[f]; if (Array.isArray(have) ? have.length : have) continue;
      if (hero.gold < t.costs[f] + 60) continue;
      for (const sym of order) if (addTalent(hero, slot, f, sym)) break;
    }
  }
}

// Pets: adopt the traveler's pet once there is gold to spare, fill its faces with its own symbol (then gold), grow it later.
function botPet(hero) {
  if (!hero.pet) { if (hero.gold >= PET_PRICE + 40) buyPet(hero); if (!hero.pet) return; }
  const kind = PETS[hero.pet.type].kind;
  for (let f = 0; f < hero.pet.size - 1 && hero.gold >= 25 + 30; f++) while (hero.gold >= 25 + 30 && addPetSymbol(hero, f, kind)) { /* fill */ }
  const g = petGrowInfo(hero); if (g?.cost && hero.gold >= g.cost + 60) growPet(hero);
  for (let f = 0; f < hero.pet.size - 1 && hero.gold >= 25 + 120; f++) addPetSymbol(hero, f, 'gold');
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
  if (pick) { hero.bag.push(pick.d); equip(hero, pick.d.uid, pick.side); }
  // the rest go in the pack as spares (weapons wear out), and the pack sheds its least valuable past what it holds
  for (const d of drops) if (d !== pick?.d && !hero.bag.includes(d)) hero.bag.push(d);
  trimBag(hero); botReady(hero);
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
// Diamonds (one fight each, two at most): a careful player brings every Diamond that helps to a boss, and one to an elite when the
// case is full (so the next find is not wasted), each in the hand where it adds the most (a Diamond Shield replaces the shield, not
// the sword; with a two-handed weapon, one Diamond alone may not be worth losing it). A careless player forgets they have them.
const throwWorth = (h, n = 500) => { const r = ENGINE.makeRng(99); let w = 0;
  for (let i = 0; i < n; i++) { const ev = ENGINE.evaluate(h, ENGINE.rollBoard(h, r)); w += (ev.atk || 0) + (ev.pierce || 0) + 0.4 * (ev.block || 0) + 0.5 * (ev.heal || 0) + 0.55 * (ev.magic || 0); } // block past a monster's hit is wasted, so it counts less here
  return w / n; };
// The best way to bring up to `max` of these Diamonds (exactly `max` if exact): [{ uid, slot }], best first, and its worth.
export function bestDiamondArm(hero, max = 2, { exact = false } = {}) {
  const ds = ENGINE.diamondsOf(hero); const hands = ENGINE.diamondHands(hero); const plans = exact && max > 0 ? [] : [[]];
  for (const d of ds) for (const s of hands) plans.push([{ uid: d.uid, slot: s }]);
  if (max >= 2 && hands.length >= 2) for (const a of ds) for (const b of ds) if (a !== b) plans.push([{ uid: a.uid, slot: 'NW' }, { uid: b.uid, slot: 'NE' }]);
  const want = plans.filter((p) => (exact ? p.length === Math.min(max, p.length === 2 || hands.length < 2 || ds.length < 2 ? max : 1) && p.length <= max : p.length <= max));
  let best = null;
  for (const plan of want.length ? want : plans) {
    const h = JSON.parse(JSON.stringify(hero)); delete h.armed; delete h.lent;
    for (const x of plan) ENGINE.armDiamond(h, x.uid, x.slot); ENGINE.wieldDiamonds(h);
    const w = throwWorth(h); if (!best || w > best.w) best = { plan, w };
  }
  return best || { plan: [], w: 0 };
}
export function botArm(hero, quest) {
  if (PLAY.style === 'first') return;
  const E = ENGINE; if (!E.diamondsOf(hero).length) return;
  const max = quest.kind === 'boss' ? 2 : quest.kind === 'elite' && E.diamondCaseFull(hero) ? 1 : 0; if (!max) return;
  for (const x of bestDiamondArm(hero, max).plan) E.armDiamond(hero, x.uid, x.slot);
}
