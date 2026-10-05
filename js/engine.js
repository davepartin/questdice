// QuestDice engine — pure rules, no DOM. Everything random flows through an injected rng so
// battles are reproducible and the balance simulator (tools/sim.mjs) can run the same code.

import {
  ROLE, LANES, CARDINALS, MAGIC_CAP, MAX_LEVEL, SYNERGY_BONUS, HEAL_COST,
  HEAL_AMOUNT, NUDGE_COST, RECHARGE_COST, SURVIVE_HP, RES_BY_SIZE, HEART_AMP, HEART_COLOR_BONUS,
  STRAIGHT, RARITY_WEIGHTS, RARITY_SELL, WEAPONS, LOOT_WEIGHTS, START_DICE, UNLOCK_COST, DIFFICULTY, TALENT_SYMS, TALENT_MAX_SAME, TALENT_PER_FACE, TALENT_SLOT_COST, TALENT_FACES, CLASS_TALENT, RULES, STRENGTH_STEPS,
  SPECIAL_STEPS, NEXT_SIZE, xpToNext, CLASSES, PERKS, MONSTERS, ACTS, QUESTS_PER_ACT, ELITE_STEPS,
  PARTY, ENEMY_CAP, FORGE_COST, WEAPON_SIZE_STEPS,
} from './data.js';

// ------------------------------------------------------------------------------- randomness
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(...parts) {
  let h = 2166136261;
  for (const ch of parts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const die = (rng, n) => 1 + Math.floor(rng() * n);
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function weighted(rng, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
  return weights.length - 1;
}
let uidCounter = 0;
export const newUid = (rng) => `u${(++uidCounter).toString(36)}${Math.floor((rng ? rng() : Math.random()) * 1e6).toString(36)}`;

// ------------------------------------------------------------------------------- weapons
// A weapon's faces. SIZE (inst.size, default d4) sets how many faces and so the number range; TIER (inst.rarity) adds corner
// bonus symbols and never changes a number. Extra faces beyond the first four carry the next numbers, alternating colours.
export const weaponSize = (inst) => inst.size || 4;
export function weaponFaces(inst) {
  const def = WEAPONS[inst.id];
  const faces = def.faces.map((f) => (f.fx ? { ...f, fx: { ...f.fx } } : { ...f }));
  const first = def.lean === 'def' ? 'b' : 'r';
  for (let i = 4; i < weaponSize(inst); i++) faces.push({ v: i + 1, c: (i - 4) % 2 === 0 ? first : (first === 'r' ? 'b' : 'r') });
  const bonus = def.bonus || [];
  for (let k = 0; k < (inst.rarity | 0) && k < bonus.length; k++) {
    const f = faces[bonus[k].face]; if (!f || f.v === 0) continue;
    f.fx = f.fx || {};
    for (const [key, n] of Object.entries(bonus[k].fx)) f.fx[key] = (f.fx[key] || 0) + n;
  }
  return faces;
}
export function makeWeapon(id, rarity = 0, rng) { return { uid: newUid(rng), id, rarity }; }
const fists = (side) => ({ uid: `fists-${side}`, id: 'fists', rarity: 0 });
export const isTwoHanded = (hero) => WEAPONS[hero.loadout.NW.id].hands === 2;

// ------------------------------------------------------------------------------- heroes
export function newHero({ name, cls, seed, full = false }) {
  const c = CLASSES[cls];
  const rng = makeRng(hashSeed(name, cls, seed ?? Date.now()));
  const loadout = {};
  if (c.weapons.length === 1) { const w = makeWeapon(c.weapons[0], 0, rng); loadout.NW = w; loadout.NE = { ...w }; }
  else { loadout.NW = makeWeapon(c.weapons[0], 0, rng); loadout.NE = makeWeapon(c.weapons[1], 0, rng); }
  return {
    v: 1, name, cls, level: 1, xp: 0, gold: 0, perks: [], pendingPerks: 0,
    strength: { W: 4, E: 4 }, special: { SW: 4, SE: 4 }, talent: { SW: [[CLASS_TALENT[cls].SW]], SE: [[CLASS_TALENT[cls].SE]] }, dice: full ? null : [...START_DICE], difficulty: 'normal', loadout, bag: [],
    campaign: { act: 1, step: 1, seed: (seed ?? Math.floor(Math.random() * 1e9)) >>> 0, shop: null, wins: 0 },
    stats: { battles: 0, defeats: 0, rounds: 0, triples: 0, straights: 0, goldEarned: 0 },
    created: Date.now(),
  };
}

export function heroMods(hero) {
  const m = { maxHp: 0, startMagic: 0, rerollDice: 0, redBonus: 0, blueBonus: 0, pierceBonus: 0, goldPct: 0, lastStandHp: 0, healCost: 0 };
  for (const id of hero.perks) for (const [k, v] of Object.entries(PERKS[id].mod)) m[k] += v;
  return m;
}
export const maxHpOf = (hero) => CLASSES[hero.cls].hp + 4 * (hero.level - 1) + heroMods(hero).maxHp + (hero.bonusHp || 0);
export const startMagicOf = (hero) => CLASSES[hero.cls].startMagic + heroMods(hero).startMagic;
export const rerollTotal = () => RULES.free + RULES.paid;
export const rerollDiceOf = (hero) => CLASSES[hero.cls].rerollDice + RULES.diceBonus + heroMods(hero).rerollDice;
export const healCostOf = (hero) => Math.max(1, HEAL_COST + heroMods(hero).healCost);
export function cardsOf(hero) {
  return CLASSES[hero.cls].cards.filter((c) => (c.unlock ?? 1) <= hero.level);
}

// ------------------------------------------------------------------------------- dice
// Which dice are on the hero's board. `dice: null` means all nine (older saves). A two-handed weapon always fills both weapon dice.
export function isActive(hero, slot) {
  if (!hero.dice) return true;
  if (hero.dice.includes(slot)) return true;
  return slot === 'NE' && WEAPONS[hero.loadout.NW.id].hands === 2;
}
export const activeSlots = (hero) => Object.keys(ROLE).filter((s) => isActive(hero, s));
export function unlockInfo(hero, slot) {
  if (isActive(hero, slot)) return { ok: false, why: 'have' };
  const cost = UNLOCK_COST[slot]; if (cost == null) return { ok: false, why: 'no' };
  return { ok: hero.gold >= cost, why: hero.gold >= cost ? '' : 'gold', cost };
}
export function unlockDie(hero, slot) {
  const r = unlockInfo(hero, slot); if (!r.ok) return false;
  hero.gold -= r.cost; hero.dice = [...(hero.dice || []), slot];
  if (slot === 'NE' && !hero.loadout.NE) hero.loadout.NE = { uid: `fists-R`, id: 'fists', rarity: 0 };
  return true;
}
export function sidesOf(hero, slot) {
  switch (ROLE[slot]) {
    case 'head': case 'feet': return 4;
    case 'weapon': return Math.min(weaponSize(hero.loadout[slot]), hero.strength[slot === 'NW' ? 'W' : 'E']); // the hand holding it is the ceiling
    case 'heart': return 6;
    case 'hand': return hero.strength[slot];
    case 'special': return hero.special[slot];
    default: throw new Error(`bad slot ${slot}`);
  }
}
// Talent die faces: 1-2 blank, 3 = 2x, 4+ = symbol faces. Returns null (blank), 'X2', or an array of symbols (a face with none is blank).
export function specialFace(hero, slot, v) {
  const n = hero.special[slot];
  if (v <= 2 || v > n) return null;
  if (v === 3) return 'X2';
  const syms = (hero.talent?.[slot]?.[v - 4]) || [];
  return syms.length ? syms : null;
}
export const talentCount = (hero, slot, sym) => (hero.talent?.[slot] || []).flat().filter((x) => x === sym).length;
export function talentInfo(hero, slot) {
  const faces = TALENT_FACES[hero.special[slot]] || 1; const cur = hero.talent?.[slot] || [];
  return { faces, slots: faces * TALENT_PER_FACE, used: cur.flat().length, cost: TALENT_SLOT_COST };
}
// Put a symbol on a symbol face (0-based). Every slot costs the same. At most two of one symbol per die, at most two symbols per face.
export function addTalent(hero, slot, face, sym) {
  if (!TALENT_SYMS[sym]) return false;
  const t = talentInfo(hero, slot); if (face < 0 || face >= t.faces || hero.gold < t.cost) return false;
  hero.talent = hero.talent || {}; const faces = (hero.talent[slot] = hero.talent[slot] || []);
  while (faces.length < t.faces) faces.push([]);
  if (faces[face].length >= TALENT_PER_FACE || talentCount(hero, slot, sym) >= TALENT_MAX_SAME) return false;
  hero.gold -= t.cost; faces[face].push(sym); return true;
}
export function removeTalent(hero, slot, face, idx) {
  const f = hero.talent?.[slot]?.[face]; if (!f || idx < 0 || idx >= f.length) return false; f.splice(idx, 1); return true;
}
export function rollSlot(hero, slot, rng) { return { v: die(rng, sidesOf(hero, slot)), bound: false }; }
export function rollBoard(hero, rng) {
  const board = {};
  for (const s of Object.keys(ROLE)) board[s] = rollSlot(hero, s, rng);
  return board;
}

// ------------------------------------------------------------------------------- evaluation
// Turns a locked board into resource totals. This is also the live "forecast" the UI shows.
export function evaluate(hero, board, opts = {}) {
  const mods = heroMods(hero);
  const val = (s) => board[s].v;
  const out = {
    atk: 0, block: 0, pierce: 0, heal: 0, magic: 0, gold: 0, stagger: 0,
    lanes: {}, offense3: false, defense3: false, straight: 0, straightBonus: 0, notes: [],
  };
  const res = (slot) => RES_BY_SIZE[ROLE[slot] === 'hand' ? hero.strength[slot] : 4];

  // Universal number language on the four cardinal dice.
  for (const s of CARDINALS) {
    const v = val(s); const r = res(s);
    if (v === 1) out.gold += r[0];
    else if (v === 2) { out.pierce += r[1] + mods.pierceBonus; }
    else if (v === 3) out.magic += r[2];
    else if (v === 4) out.magic += r[3];
  }
  // Heart: amplifies matching cardinals on this board only.
  const hv = val('C');
  out.heart = hv;
  if (hv <= 4) {
    const matches = CARDINALS.filter((s) => val(s) === hv).length;
    const amp = HEART_AMP[hv - 1] * matches;
    if (hv === 1) out.gold += amp; else if (hv === 2) out.pierce += amp; else out.magic += amp;
    if (matches) out.notes.push(`Heart ${hv} amplifies ${matches}`);
  }

  // Lanes: weapon (color + number) + hand strength + special symbol.
  for (const [key, lane] of Object.entries(LANES)) {
    if (!isActive(hero, lane.weapon)) continue; // no weapon on this side yet
    const inst = hero.loadout[lane.weapon];
    const wf = weaponFaces(inst)[val(lane.weapon) - 1];
    const str = val(lane.hand);
    const sym = isActive(hero, lane.special) ? specialFace(hero, lane.special, val(lane.special)) : null;
    const x2 = sym === 'X2'; const tsyms = Array.isArray(sym) ? sym : [];
    let value = wf.v + str + (x2 ? str : 0);
    if (wf.c === 'r') value += mods.redBonus; else value += mods.blueBonus;
    const L = { key, color: wf.c, weapon: wf.v, str, sym: x2 ? 'SURGE' : tsyms.length ? tsyms : null, value, amp: 0, fx: wf.fx || null };
    if (wf.fx) {
      out.pierce += wf.fx.pierce || 0; out.magic += wf.fx.magic || 0; out.heal += wf.fx.heal || 0;
      out.gold += wf.fx.loot || 0; out.stagger += wf.fx.stagger || 0;
    }
    for (const t of tsyms) {
      if (t === 'atk') out.atk += str; else if (t === 'block') out.block += str; else if (t === 'pierce') out.pierce += Math.round(str * 0.75);
      else if (t === 'magic') out.magic += str; else if (t === 'heal') out.heal += 2 * str; else if (t === 'gold') out.gold += Math.ceil(str / 2);
    }
    out.lanes[key] = L;
  }
  // Heart 5/6 pump the best lane of the matching color.
  if (hv >= 5) {
    const want = hv === 5 ? 'b' : 'r';
    const cand = Object.values(out.lanes).filter((l) => l.color === want).sort((a, b) => b.value - a.value)[0];
    if (cand) { cand.value += HEART_COLOR_BONUS; cand.amp = HEART_COLOR_BONUS; out.notes.push(`Heart ${hv}: +${HEART_COLOR_BONUS} ${want === 'r' ? 'attack' : 'block'}`); }
  }
  for (const l of Object.values(out.lanes)) { if (l.color === 'r') out.atk += l.value; else out.block += l.value; }

  // Synergy. Top row = weapon, head, weapon: only a two-handed weapon is eligible.
  if (isTwoHanded(hero) && isActive(hero, 'NE')) {
    const a = weaponFaces(hero.loadout.NW)[val('NW') - 1].v;
    const b = weaponFaces(hero.loadout.NE)[val('NE') - 1].v;
    if (a === b && b === val('N') && a > 0) { out.offense3 = true; out.atk += SYNERGY_BONUS; }
  }
  if (val('N') === val('C') && val('C') === val('S')) { out.defense3 = true; out.block += SYNERGY_BONUS; }

  // Straights across the seven numeric dice (the two specials carry symbols, not numbers).
  const nums = new Set([val('N'), val('S'), val('C'), val('W'), val('E'),
    ...['NW', 'NE'].filter((k) => isActive(hero, k)).map((k) => weaponFaces(hero.loadout[k])[val(k) - 1].v)]);
  nums.delete(0); // a blank is a miss, not a number
  const sorted = [...nums].sort((x, y) => x - y);
  let best = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) { run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); }
  if (STRAIGHT[best]) {
    out.straight = best; out.straightBonus = STRAIGHT[best];
    if ((opts.straight || 'atk') === 'gold') out.gold += out.straightBonus; else out.atk += out.straightBonus;
  }
  out.gold = Math.round(out.gold * (1 + mods.goldPct));
  return out;
}

// ------------------------------------------------------------------------------- enemies
export function partyScale(players) {
  const i = Math.max(0, Math.min(5, players - 1));
  return { hp: PARTY.hp[i], adds: PARTY.adds[i] };
}
export function spawnEnemy(id, { hpMult = 1, flat = 0, rewardMult = 1 } = {}, rng) {
  const d = MONSTERS[id];
  const hp = Math.max(1, Math.round(d.hp * hpMult));
  return {
    uid: newUid(rng), id, name: d.name, glyph: d.glyph, tier: d.tier, hp, maxHp: hp, powerDie: d.power,
    faces: d.faces, flat, buff: 0, windup: false, raged: false, intent: null, p: 0, mag: 0,
    staggerAt: Math.max(4, Math.ceil(hp * 0.25)), xp: Math.round(d.xp * rewardMult), gold: Math.round(d.gold * rewardMult),
    carried: 0, hpMult, rewardMult,
  };
}
export function rollIntent(e, rng) {
  if (e.windup) {
    const s = MONSTERS[e.id].slam;
    e.windup = false;
    e.intent = { n: 'Slam', v: 'strike', f: s.f, m: s.m, slam: true };
  } else {
    e.intent = { ...e.faces[die(rng, 6) - 1] };
  }
  return e.intent;
}
const DAMAGE_VERBS = new Set(['strike', 'pierce', 'drain', 'pilfer']);
export const isDamageIntent = (i) => DAMAGE_VERBS.has(i.v);
function magnitude(e, intent, p, weaken) {
  let m = intent.f + intent.m * p;
  if (isDamageIntent(intent)) m = Math.max(0, m + e.flat + e.buff - weaken);
  return m;
}
export function intentRange(e) {
  const i = e.intent;
  if (!i || !(i.m || i.f)) return null;
  const lo = i.f + i.m + (isDamageIntent(i) ? e.flat + e.buff : 0);
  const hi = i.f + i.m * e.powerDie + (isDamageIntent(i) ? e.flat + e.buff : 0);
  return [lo, hi];
}

// ------------------------------------------------------------------------------- battle
// Road-event boons. Combat blessings apply for the whole battle they were snapshotted into.
// The campaign list is decremented only when that battle actually ends (spendBlessings).
export function pullBlessings(hero) {
  const o = { startHp: 0, wound: 0, startMagic: 0, atk: 0, block: 0, stagger: 0, openingAtk: 0, weaken: 0 };
  for (const bl of hero.campaign?.blessings || []) {
    if (bl.who && bl.who !== hero.name) continue;
    o.startHp += bl.startHp || 0; o.wound += bl.wound || 0; o.startMagic += bl.startMagic || 0;
    o.atk += bl.atk || 0; o.block += bl.block || 0; o.stagger += bl.stagger || 0; o.openingAtk += bl.openingAtk || 0;
    o.weaken += bl.weaken || 0;
  }
  return o;
}
export function spendBlessings(campaign) {
  if (!campaign?.blessings) return;
  campaign.blessings = campaign.blessings
    .map((bl) => ({ ...bl, fights: (bl.fights ?? 1) - 1 }))
    .filter((bl) => bl.fights > 0);
}
export function clearAmbush(campaign) { if (campaign) campaign.ambush = null; }
export function withAmbush(quest, campaign) {
  const extra = campaign?.ambush;
  if (!extra?.length) return quest;
  const enemies = [...quest.enemies];
  for (const a of extra) for (let n = 0; n < a.count; n++) enemies.push(a.id);
  return { ...quest, enemies: enemies.slice(0, ENEMY_CAP), ambushed: true };
}

// Apply the hero's difficulty to a quest (monster health, flat damage, gold). Done once per battle.
export const difficultyOf = (hero) => DIFFICULTY[hero?.difficulty] || DIFFICULTY.normal;
function withDifficulty(hero, quest) {
  const d = difficultyOf(hero);
  return { ...quest, hpMult: (quest.hpMult ?? 1) * d.hp, flat: (quest.flat ?? 0) + d.flat, rewardMult: (quest.rewardMult ?? 1) * d.gold };
}
export function newBattle(hero, quest0, rng, players = 1) {
  const quest = withDifficulty(hero, quest0);
  const sc = partyScale(players);
  const enemies = [];
  for (const id of quest.enemies) enemies.push(spawnEnemy(id, { hpMult: quest.hpMult * sc.hp, flat: quest.flat, rewardMult: quest.rewardMult }, rng));
  for (let i = 0; i < sc.adds; i++) enemies.push(spawnEnemy('goblin', { hpMult: quest.hpMult, flat: quest.flat, rewardMult: quest.rewardMult }, rng));
  const boon = pullBlessings(hero);
  const maxHp = maxHpOf(hero) + Math.max(0, boon.startHp || 0);
  const b = {
    rng, hero, quest, players, enemies, round: 0, phase: 'reset', outcome: null,
    hp: Math.max(1, maxHp - (boon.wound || 0)), maxHp,
    magic: Math.max(0, Math.min(MAGIC_CAP, startMagicOf(hero) + boon.startMagic)), boon,
    board: null, actionsLeft: rerollTotal(), freeActions: [], used: {}, lastStandUsed: false,
    mods: blankMods(), nextBound: 0, goldEarned: 0, log: [], report: null, stolen: 0, stats: { dealt: 0, taken: 0, healed: 0 },
  };
  beginReset(b);
  return b;
}
const blankMods = () => ({ atk: 0, pierce: 0, block: 0, heal: 0, stagger: 0, weaken: 0 });

// A new round begins on the Reset screen: monsters have rolled their Intention and shown it.
export function beginReset(b) {
  b.round += 1; b.phase = 'reset'; b.board = null; b.mods = blankMods();
  for (const e of b.enemies) if (e.hp > 0) rollIntent(e, b.rng);
}
export function startRoll(b) {
  b.board = rollBoard(b.hero, b.rng);
  b.actionsLeft = rerollTotal(); b.freeActions = []; b.phase = 'shape';
  const slots = Object.keys(ROLE).filter((s) => s !== 'C');
  for (let i = 0; i < b.nextBound && slots.length; i++) {
    const s = slots.splice(Math.floor(b.rng() * slots.length), 1)[0];
    b.board[s].bound = true;
  }
  b.boundNow = b.nextBound; b.nextBound = 0;
}
export function rerollInfo(b) {
  if (b.freeActions.length) return { kind: 'card', dice: b.freeActions[0], perDie: 0, left: b.freeActions.length };
  if (b.actionsLeft <= 0) return { kind: 'none', dice: 0, perDie: 0, left: 0 };
  const first = b.actionsLeft > RULES.paid;
  return { kind: first ? 'free' : 'paid', dice: rerollDiceOf(b.hero), perDie: first ? 0 : 1, left: b.actionsLeft };
}
export function canReroll(b, slots) {
  const info = rerollInfo(b);
  if (info.kind === 'none' || !slots.length) return false;
  if (slots.length > info.dice) return false;
  if (slots.some((s) => b.board[s].bound || !isActive(b.hero, s))) return false;
  return b.magic >= info.perDie * slots.length;
}
export function reroll(b, slots) {
  if (!canReroll(b, slots)) return false;
  const info = rerollInfo(b);
  b.magic -= info.perDie * slots.length;
  if (info.kind === 'card') b.freeActions.shift(); else b.actionsLeft -= 1;
  for (const s of slots) b.board[s] = { ...rollSlot(b.hero, s, b.rng), bound: false };
  return true;
}
export function nudge(b, dir) {
  if (b.magic < NUDGE_COST) return false;
  const v = b.board.C.v + dir;
  if (v < 1 || v > 6) return false;
  b.magic -= NUDGE_COST; b.board.C.v = v; return true;
}
export function healSpend(b) {
  const cost = healCostOf(b.hero);
  if (b.magic < cost || b.hp >= b.maxHp) return false;
  b.magic -= cost; const before = b.hp; b.hp = Math.min(b.maxHp, b.hp + HEAL_AMOUNT); b.stats.healed += b.hp - before; return true;
}
export function playCard(b, id) {
  const card = cardsOf(b.hero).find((c) => c.id === id);
  if (!card || b.used[id] || b.magic < card.cost || b.phase !== 'shape') return false;
  b.magic -= card.cost; b.used[id] = true;
  for (const [k, v] of Object.entries(card.fx)) {
    if (k === 'free') b.freeActions.push(v);
    else if (k === 'magic') b.magic = Math.min(MAGIC_CAP, b.magic + v);
    else b.mods[k] += v;
  }
  return true;
}
export function recharge(b, id) {
  if (!b.used[id] || b.magic < RECHARGE_COST) return false;
  b.magic -= RECHARGE_COST; b.used[id] = false; return true;
}

// Resolve a locked round. Your blow lands first (the fallen do not strike back), then the survivors act.
export function resolve(b, { target = 0, straight = 'atk' } = {}) {
  const { hero } = b;
  const ev = evaluate(hero, b.board, { straight });
  const m = b.mods;
  const boon = b.boon || {};
  const T = {
    atk: ev.atk + m.atk + (boon.atk || 0) + (b.round === 1 ? (boon.openingAtk || 0) : 0),
    pierce: ev.pierce + m.pierce, block: ev.block + m.block + (boon.block || 0), heal: ev.heal + m.heal,
    magic: ev.magic, gold: ev.gold, stagger: ev.stagger + m.stagger + (boon.stagger || 0),
  };
  const rep = {
    round: b.round, ev, T, dealt: 0, guarded: 0, targetUid: null, killed: [], staggered: [], raged: [], summoned: [],
    acts: [], taken: 0, absorbed: 0, healed: 0, lastStand: false, magicStolen: 0, goldStolen: 0, bound: 0, hpBefore: b.hp,
  };
  if (ev.offense3) hero.stats.triples++;
  if (ev.straight) hero.stats.straights++;
  b.goldEarned += T.gold;

  const alive = b.enemies.filter((e) => e.hp > 0);
  for (const e of alive) { e.p = die(b.rng, e.powerDie); e.mag = magnitude(e, e.intent, e.p, m.weaken + (boon.weaken || 0)); e.buffUsed = e.buff; e.buff = 0; }

  // 1. Your strike.
  let tgt = b.enemies[target];
  if (!tgt || tgt.hp <= 0) tgt = alive[0];
  rep.targetUid = tgt.uid;
  const guard = tgt.intent.v === 'guard' ? tgt.mag : 0;
  const dmg = Math.max(0, T.atk - guard) + T.pierce;
  rep.guarded = Math.min(guard, T.atk);
  rep.dealt = Math.min(tgt.hp, dmg);
  tgt.hp = Math.max(0, tgt.hp - dmg);
  b.stats.dealt += rep.dealt;
  if (tgt.intent.v === 'charge' && tgt.hp > 0 && dmg + T.stagger >= tgt.staggerAt) { tgt.windup = false; tgt.cancelled = true; rep.staggered.push(tgt.uid); }
  if (tgt.hp <= 0) { rep.killed.push(tgt.uid); b.stolen += tgt.carried; tgt.carried = 0; }

  // 2. Survivors act.
  let block = T.block;
  const strikeHit = (e, pierceIt) => {
    const d = e.mag;
    let net = d; let ab = 0;
    if (!pierceIt) { ab = Math.min(block, d); block -= ab; rep.absorbed += ab; net = d - ab; }
    rep.taken += net;
    return { d, net, ab };
  };
  const living = () => b.enemies.filter((e) => e.hp > 0);
  for (const e of b.enemies) {
    if (e.hp <= 0 || !e.intent || e.fresh) continue; // reinforcements join next round
    const i = e.intent; const act = { uid: e.uid, name: i.n, v: i.v, mag: e.mag, p: e.p };
    switch (i.v) {
      case 'strike': { const r = strikeHit(e, false); Object.assign(act, r); break; }
      case 'pierce': { const r = strikeHit(e, true); Object.assign(act, r); break; }
      case 'drain': {
        const r = strikeHit(e, false); Object.assign(act, r);
        rep.magicStolen += i.k; break;
      }
      case 'pilfer': {
        const r = strikeHit(e, false); Object.assign(act, r);
        if (r.net > 0) { const take = Math.min(hero.gold + b.goldEarned, 6); e.carried += take; rep.goldStolen += take; b.goldEarned -= take; }
        break;
      }
      case 'guard': break;
      case 'mend': { const before = e.hp; e.hp = Math.min(e.maxHp, e.hp + e.mag); act.healed = e.hp - before; break; }
      case 'charge': if (!e.cancelled) { e.windup = true; } else act.cancelled = true; break;
      case 'howl': for (const o of living()) o.buff += i.k; break;
      case 'bind': b.nextBound += i.k; rep.bound += i.k; break;
      case 'summon': {
        const room = ENEMY_CAP - living().length; const add = MONSTERS[e.id].adds;
        for (let n = 0; n < Math.min(i.k, room); n++) {
          const s = spawnEnemy(add, { hpMult: e.hpMult * 0.75, flat: e.flat, rewardMult: 0 }, b.rng);
          s.fresh = true; b.enemies.push(s); rep.summoned.push(s.uid);
        }
        break;
      }
      default: break;
    }
    rep.acts.push(act);
  }
  for (const e of b.enemies) { e.cancelled = false; e.fresh = false; }

  // 3. Rage: bosses change their ways at half health.
  for (const e of living()) {
    const rg = MONSTERS[e.id].rage;
    if (rg && !e.raged && e.hp <= e.maxHp / 2) { e.raged = true; e.powerDie = rg.power; e.faces = rg.faces; e.rageName = rg.name; rep.raged.push(e.uid); }
  }

  // 4. You.
  const hpBeforeHit = b.hp;
  let hp = Math.min(b.maxHp, b.hp + T.heal) - rep.taken;
  rep.healed = Math.max(0, Math.min(b.maxHp, hpBeforeHit + T.heal) - hpBeforeHit);
  b.stats.healed += rep.healed; b.stats.taken += rep.taken;
  if (hp <= 0 && !b.lastStandUsed) {
    b.lastStandUsed = true; rep.lastStand = true; hp = SURVIVE_HP + heroMods(hero).lastStandHp;
  }
  b.hp = Math.max(0, Math.min(b.maxHp, hp));
  const stolen = Math.min(b.magic + T.magic, rep.magicStolen); rep.magicStolen = stolen;
  b.magic = Math.max(0, Math.min(MAGIC_CAP, b.magic + T.magic - stolen));
  rep.hpAfter = b.hp; rep.magicAfter = b.magic;
  hero.stats.rounds++;

  b.report = rep;
  if (living().length === 0) { b.outcome = 'victory'; b.phase = 'done'; }
  else if (b.hp <= 0) { b.outcome = 'defeat'; b.phase = 'done'; }
  else beginReset(b);
  return rep;
}

// ------------------------------------------------------------------------------- rewards & growth
export function rollDrops(rng, count, { minRarity = 0, rarityBoost = 0 } = {}) {
  const drops = [];
  const ids = Object.keys(LOOT_WEIGHTS);
  for (let i = 0; i < count; i++) {
    const id = ids[weighted(rng, ids.map((k) => LOOT_WEIGHTS[k]))];
    const w = RARITY_WEIGHTS.map((x, r) => (r === 0 ? Math.max(1, x - rarityBoost * 4) : x + rarityBoost * (r === 1 ? 3 : r === 2 ? 1.5 : 0.5)));
    const rarity = Math.max(minRarity, weighted(rng, w));
    drops.push(makeWeapon(id, rarity, rng));
  }
  return drops;
}
export function battleRewards(b) {
  const { quest, hero } = b;
  const dead = b.enemies; // includes adds: they carry rewardMult 0
  const xp = dead.reduce((a, e) => a + e.xp, 0);
  const gm = 1 + heroMods(hero).goldPct;
  const kills = Math.round(dead.reduce((a, e) => a + e.gold, 0) * gm);
  const gold = kills + b.goldEarned + b.stolen; // may be negative if a thief got away with your purse
  const rng = makeRng(hashSeed(hero.campaign.seed, hero.campaign.act, hero.campaign.step, 'drops'));
  const minRarity = quest.kind === 'boss' ? 2 : quest.kind === 'elite' ? 1 : 0;
  const drops = rollDrops(rng, b.players + 1, { minRarity, rarityBoost: (quest.perilous ? 2 : 0) + (quest.kind === 'boss' ? 2 : 0) + hero.campaign.act - 1 });
  return { xp, gold, drops };
}
export function gainXp(hero, xp) {
  hero.xp += xp; let gained = 0;
  while (hero.level < MAX_LEVEL && hero.xp >= xpToNext(hero.level)) {
    hero.xp -= xpToNext(hero.level); hero.level++; hero.pendingPerks++; gained++;
  }
  if (hero.level >= MAX_LEVEL) hero.xp = 0;
  return gained;
}
export function offerPerks(hero, rng) {
  const have = (id) => hero.perks.filter((p) => p === id).length;
  const avail = Object.keys(PERKS).filter((id) => have(id) < PERKS[id].max);
  const out = [];
  while (out.length < 3 && avail.length) out.push(avail.splice(Math.floor(rng() * avail.length), 1)[0]);
  return out;
}
export function takePerk(hero, id) {
  if (hero.pendingPerks <= 0) return false;
  hero.perks.push(id); hero.pendingPerks--; return true;
}

// Camp economy.
export function strengthUpgrade(hero, slot) {
  const size = hero.strength[slot]; const step = STRENGTH_STEPS[size];
  if (!step) return { ok: false, why: 'Max size' };
  if (hero.level < step[1]) return { ok: false, why: `Level ${step[1]}`, cost: step[0], next: NEXT_SIZE[size] };
  if (hero.gold < step[0]) return { ok: false, why: 'Need gold', cost: step[0], next: NEXT_SIZE[size] };
  return { ok: true, cost: step[0], next: NEXT_SIZE[size] };
}
export function specialUpgrade(hero, slot) {
  const size = hero.special[slot]; const step = SPECIAL_STEPS[size];
  if (!step) return { ok: false, why: 'Max size' };
  if (hero.level < step[1]) return { ok: false, why: `Level ${step[1]}`, cost: step[0], next: NEXT_SIZE[size] };
  if (hero.gold < step[0]) return { ok: false, why: 'Need gold', cost: step[0], next: NEXT_SIZE[size] };
  return { ok: true, cost: step[0], next: NEXT_SIZE[size] };
}
export function upgradeDie(hero, kind, slot) {
  const r = kind === 'strength' ? strengthUpgrade(hero, slot) : specialUpgrade(hero, slot);
  if (!r.ok) return false;
  hero.gold -= r.cost; hero[kind][slot] = r.next; return true;
}
// ---- forging (Tier) and training (Size) a weapon. Both cost gold; instances are found by uid (a two-hander sits in both hands).
const copiesOf = (hero, uid) => [...Object.values(hero.loadout), ...hero.bag].filter((w) => w && w.uid === uid);
const handsMul = (inst) => (WEAPONS[inst.id].hands === 2 ? 1.4 : 1);
export function forgeInfo(hero, uid) {
  const c = copiesOf(hero, uid); if (!c.length) return { ok: false, why: 'missing' };
  const inst = c[0]; const next = (inst.rarity | 0) + 1;
  if (inst.id === 'fists' || next > 3 || !(WEAPONS[inst.id].bonus || [])[next - 1]) return { ok: false, why: 'max' };
  const cost = Math.round(FORGE_COST[next] * handsMul(inst));
  return { ok: hero.gold >= cost, why: hero.gold >= cost ? '' : 'gold', cost, next };
}
export function forgeWeapon(hero, uid) {
  const r = forgeInfo(hero, uid); if (!r.ok) return false;
  hero.gold -= r.cost; for (const w of copiesOf(hero, uid)) w.rarity = r.next; return true;
}
export function trainInfo(hero, uid) {
  const c = copiesOf(hero, uid); if (!c.length) return { ok: false, why: 'missing' };
  const inst = c[0]; const size = weaponSize(inst); const next = NEXT_SIZE[size];
  if (inst.id === 'fists' || !next) return { ok: false, why: 'max' };
  if (next > Math.max(hero.strength.W, hero.strength.E)) return { ok: false, why: 'hands', next };
  const cost = Math.round(WEAPON_SIZE_STEPS[size] * handsMul(inst));
  return { ok: hero.gold >= cost, why: hero.gold >= cost ? '' : 'gold', cost, next };
}
export function trainWeapon(hero, uid) {
  const r = trainInfo(hero, uid); if (!r.ok) return false;
  hero.gold -= r.cost; for (const w of copiesOf(hero, uid)) w.size = r.next; return true;
}
export const sellValue = (inst) => Math.round(RARITY_SELL[inst.rarity] * (WEAPONS[inst.id].hands === 2 ? 1.4 : 1));
export function shopStock(hero) {
  const c = hero.campaign;
  if (c.shop && c.shop.step === `${c.act}.${c.step}`) return c.shop.items;
  const rng = makeRng(hashSeed(c.seed, c.act, c.step, 'shop'));
  const mult = [1, 2.3, 5, 11];
  const flags = c.campFlags || {};
  const priceMod = Math.max(0.4, 1 - (flags.discount || 0) + (flags.hike || 0));
  const items = rollDrops(rng, 4, { rarityBoost: c.act - 1 + Math.floor(c.step / 4) }).map((inst) => ({
    inst, price: Math.max(1, Math.round(WEAPONS[inst.id].price * mult[inst.rarity] * priceMod)), sold: false,
  }));
  if (flags.discount || flags.hike) c.campFlags = {};
  c.shop = { step: `${c.act}.${c.step}`, items };
  return items;
}
export function buyItem(hero, i) {
  const it = shopStock(hero)[i];
  if (!it || it.sold || hero.gold < it.price) return false;
  hero.gold -= it.price; it.sold = true; hero.bag.push(it.inst); return true;
}
export function equip(hero, uid, side = 'NW') {
  const idx = hero.bag.findIndex((w) => w.uid === uid);
  if (idx < 0) return false;
  const inst = hero.bag[idx]; const w = WEAPONS[inst.id];
  hero.bag.splice(idx, 1);
  const stash = (it) => { if (it && it.id !== 'fists' && !hero.bag.some((x) => x.uid === it.uid)) hero.bag.push(it); };
  if (w.hands === 2) {
    stash(hero.loadout.NW); stash(hero.loadout.NE);
    hero.loadout.NW = inst; hero.loadout.NE = { ...inst };
  } else {
    if (isTwoHanded(hero)) { stash(hero.loadout.NW); hero.loadout.NW = fists('L'); hero.loadout.NE = fists('R'); }
    stash(hero.loadout[side]); hero.loadout[side] = inst;
  }
  return true;
}
export function sellItem(hero, uid) {
  const idx = hero.bag.findIndex((w) => w.uid === uid);
  if (idx < 0) return false;
  hero.gold += sellValue(hero.bag[idx]); hero.bag.splice(idx, 1); return true;
}
export function takeDrop(hero, inst) { hero.bag.push(inst); }

// ------------------------------------------------------------------------------- campaign
const PREFIX = ['Ambush at', 'Trouble at', 'The Siege of', 'Showdown at', 'Night Raid on', 'Skirmish near'];
export function questsFor(hero) {
  const c = hero.campaign; const actIdx = (c.act - 1) % ACTS.length; const act = ACTS[actIdx];
  const cycle = Math.floor((c.act - 1) / ACTS.length);
  const rng = makeRng(hashSeed(c.seed, c.act, c.step, 'quests'));
  const s = c.step;
  const base = (1 + 0.05 * (s - 1)) * (1 + 0.2 * actIdx) * (1 + 0.8 * cycle);
  const flat = 2 + Math.floor((s - 1) / 3) + 3 * cycle;
  const mk = (kind, enemies, extra = {}) => {
    const prefix = kind === 'boss' ? null : pick(rng, PREFIX);
    const place = kind === 'boss' ? act.places[act.places.length - 1] : pick(rng, act.places);
    return {
    id: `${c.act}.${s}.${extra.perilous ? 'p' : kind}`, act: c.act, step: s, kind, enemies, place,
    name: kind === 'boss' ? `${MONSTERS[enemies[0]].name}` : `${prefix} ${place}`,
    hpMult: base * (extra.perilous ? 1.25 : 1), flat: flat + (extra.perilous ? 1 : 0),
    rewardMult: extra.perilous ? 1.5 : 1, perilous: !!extra.perilous,
    };
  };
  if (s >= QUESTS_PER_ACT) return [mk('boss', act.boss, { boss: true })];
  const poolPick = () => pick(rng, act.pool);
  if (ELITE_STEPS.includes(s)) return [mk('elite', pick(rng, act.elite)), mk('battle', poolPick(), { perilous: true })];
  let a = poolPick(); let bq = poolPick();
  for (let tries = 0; tries < 6 && bq.join() === a.join(); tries++) bq = poolPick();
  const weight = (f) => f.reduce((t, id) => t + MONSTERS[id].hp, 0);
  if (weight(a) > weight(bq)) [a, bq] = [bq, a]; // Standard is always the lighter road
  return [mk('battle', a), mk('battle', bq, { perilous: true })];
}
export function advanceCampaign(hero) {
  const c = hero.campaign;
  c.wins++; c.shop = null;
  if (c.step >= QUESTS_PER_ACT) { c.act++; c.step = 1; } else c.step++;
}

// ------------------------------------------------------------------------------- company battles
// A company resolves once, after every living hero has locked a board. The computer has
// already rolled every monster intention for the round. Feet decide who draws the
// retaliation: the leader takes 2/(n+1), everyone else 1/(n+1). Phones gather the locks.
// The math does not care which device rolled them.

export function newCompany({ name, roster, seed }) {
  const campaign = {
    act: 1, step: 1, seed: (seed ?? Math.floor(Math.random() * 1e9)) >>> 0, shop: null, wins: 0,
    blessings: [], seenRoads: [], campFlags: {}, ambush: null, chronicle: [],
  };
  const members = roster.map((r, i) => {
    const hero = newHero({ name: r.name, cls: r.cls, seed: (campaign.seed + i * 997) >>> 0 });
    hero.campaign = campaign;
    return hero;
  });
  return { kind: 'company', v: 2, name, campaign, members };
}

export function splitInt(total, weights) {
  const t = Math.max(0, total | 0);
  if (!weights.length) return [];
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (t * w) / sum);
  const base = raw.map((x) => Math.floor(x));
  let left = t - base.reduce((a, b) => a + b, 0);
  const order = raw.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < left; k++) base[order[k % order.length].i] += 1;
  return base;
}

// Living fighters who have rolled. Leader is highest Feet, then highest hands, then a coin flip.
export function rankFighters(fighters, rng) {
  const rows = fighters.filter((f) => f.hp > 0 && f.board).map((f) => ({
    f, feet: f.board.S.v, hands: f.board.W.v + f.board.E.v, coin: rng(),
  }));
  rows.sort((a, b) => b.feet - a.feet || b.hands - a.hands || b.coin - a.coin);
  return rows;
}
export function shareWeights(ranked) {
  const n = ranked.length;
  if (n <= 1) return ranked.map(() => 1);
  return ranked.map((_, i) => (i === 0 ? 2 : 1));
}

function makeFighter(hero) {
  const boon = pullBlessings(hero);
  const maxHp = maxHpOf(hero) + Math.max(0, boon.startHp || 0);
  return {
    hero, maxHp, hp: Math.max(1, maxHp - (boon.wound || 0)),
    magic: Math.max(0, Math.min(MAGIC_CAP, startMagicOf(hero) + boon.startMagic)), boon,
    board: null, actionsLeft: rerollTotal(), freeActions: [], used: {}, mods: blankMods(),
    nextBound: 0, boundNow: 0, lastStandUsed: false, goldEarned: 0, straight: 'atk', target: 0,
    stats: { dealt: 0, taken: 0, healed: 0 }, contrib: 0,
  };
}
const MIRROR = ['hp', 'maxHp', 'magic', 'board', 'actionsLeft', 'freeActions', 'used', 'mods', 'nextBound', 'boundNow', 'lastStandUsed', 'goldEarned'];
export function focusFighter(b, i) {
  const f = b.fighters[i];
  b.active = i; b.hero = f.hero; b.boon = f.boon; b.stats = f.stats;
  for (const k of MIRROR) b[k] = f[k];
  return f;
}
export function commitFighter(b) {
  const f = b.fighters[b.active];
  if (!f) return;
  for (const k of MIRROR) f[k] = b[k];
}

export function newPartyBattle(heroes, quest, rng) {
  const players = heroes.length;
  const sc = partyScale(players);
  const hpMult = quest.hpMult ?? 1; const flat = quest.flat ?? 0; const rewardMult = quest.rewardMult ?? 1;
  const enemies = [];
  for (const id of quest.enemies) enemies.push(spawnEnemy(id, { hpMult: hpMult * sc.hp, flat, rewardMult }, rng));
  for (let i = 0; i < sc.adds; i++) enemies.push(spawnEnemy('goblin', { hpMult, flat, rewardMult }, rng));
  const b = {
    kind: 'party', rng, quest, players, heroes, enemies, fighters: heroes.map(makeFighter),
    active: 0, round: 0, phase: 'reset', outcome: null, report: null, stolen: 0,
  };
  beginPartyRound(b);
  focusFighter(b, 0);
  return b;
}
function livingFighters(b) { return b.fighters.filter((f) => f.hp > 0); }
export function beginPartyRound(b) {
  b.round += 1; b.phase = 'reset';
  for (const f of b.fighters) { f.board = null; f.mods = blankMods(); f.straight = 'atk'; }
  for (const e of b.enemies) if (e.hp > 0) rollIntent(e, b.rng);
}
export function startFighter(b, i) {
  focusFighter(b, i);
  if (b.fighters[i].hp <= 0) return false;
  startRoll(b);
  commitFighter(b);
  b.phase = 'shape';
  return true;
}

function totalsFor(f) {
  const ev = evaluate(f.hero, f.board, { straight: f.straight || 'atk' });
  const m = f.mods || blankMods();
  const boon = f.boon || {};
  const round = f._round || 1;
  const T = {
    atk: ev.atk + (m.atk || 0) + (boon.atk || 0) + (round === 1 ? (boon.openingAtk || 0) : 0),
    pierce: ev.pierce + (m.pierce || 0),
    block: ev.block + (m.block || 0) + (boon.block || 0),
    heal: ev.heal + (m.heal || 0),
    magic: ev.magic, gold: ev.gold,
    stagger: ev.stagger + (m.stagger || 0) + (boon.stagger || 0),
  };
  return { ev, T };
}

export function resolveParty(b) {
  // Cards stack: two heroes can both soften a blow. A road blessing is one fact about the fight, so it applies once.
  const cardWeaken = b.fighters.reduce((a, f) => a + ((f.mods && f.mods.weaken) || 0), 0);
  const boonWeaken = b.fighters.reduce((a, f) => Math.max(a, (f.boon && f.boon.weaken) || 0), 0);
  const weaken = cardWeaken + boonWeaken;
  for (const f of b.fighters) f._round = b.round;
  const acting = b.fighters.filter((f) => f.hp > 0 && f.board);
  for (const f of acting) {
    const { ev, T } = totalsFor(f);
    f.ev = ev; f.T = T;
    if (ev.offense3 || ev.defense3) f.hero.stats.triples++;
    if (ev.straight) f.hero.stats.straights++;
    f.goldEarned += T.gold;
    f.hero.stats.rounds++;
  }
  const alive = b.enemies.filter((e) => e.hp > 0);
  for (const e of alive) {
    e.p = die(b.rng, e.powerDie);
    e.mag = magnitude(e, e.intent, e.p, weaken);
    e.buffUsed = e.buff; e.buff = 0;
  }
  const order = rankFighters(acting, b.rng);
  const rep = {
    round: b.round, party: true, leader: order[0]?.f.hero.name || '', strikes: [],
    killed: [], staggered: [], raged: [], summoned: [], acts: [],
    fighters: [], bound: 0, magicStolen: 0, goldStolen: 0,
  };
  const guardLeft = new Map();
  for (const e of alive) if (e.intent?.v === 'guard') guardLeft.set(e.uid, e.mag);
  const pressure = new Map();
  for (const { f } of order) {
    let tgt = b.enemies[f.target];
    if (!tgt || tgt.hp <= 0) tgt = b.enemies.find((e) => e.hp > 0);
    if (!tgt) break;
    const T = f.T;
    const pool = guardLeft.get(tgt.uid) || 0;
    const guarded = Math.min(pool, T.atk);
    if (guardLeft.has(tgt.uid)) guardLeft.set(tgt.uid, pool - guarded);
    const dmg = Math.max(0, T.atk - guarded) + T.pierce;
    const dealt = Math.min(tgt.hp, dmg);
    tgt.hp = Math.max(0, tgt.hp - dmg);
    f.stats.dealt += dealt;
    f.contrib += dealt;
    const bag = pressure.get(tgt.uid) || { dmg: 0, stagger: 0 };
    bag.dmg += dmg; bag.stagger += T.stagger; pressure.set(tgt.uid, bag);
    const killed = tgt.hp <= 0;
    if (killed) {
      rep.killed.push(tgt.uid); f.contrib += 3;
      let pot = tgt.carried;
      const victims = [...b.fighters].filter((v) => v.purseLost > 0).sort((a, c) => c.purseLost - a.purseLost);
      for (const v of victims) {
        const back = Math.min(pot, v.purseLost); v.goldEarned += back; v.purseLost -= back; pot -= back;
      }
      tgt.carried = 0;
    }
    rep.strikes.push({
      name: f.hero.name, uid: f.hero.name, targetUid: tgt.uid, dealt, guarded, pierce: T.pierce, atk: T.atk,
      killed, ev: f.ev, T,
    });
  }
  for (const e of b.enemies) {
    if (e.hp <= 0 || e.intent?.v !== 'charge') continue;
    const bag = pressure.get(e.uid) || { dmg: 0, stagger: 0 };
    if (bag.dmg + bag.stagger >= e.staggerAt) { e.windup = false; e.cancelled = true; rep.staggered.push(e.uid); }
  }
  // Monsters answer the living. Damage is split by Feet; each hero's block soaks only their share.
  const snap = order.map((r) => r.f);
  const weights = shareWeights(order);
  const blocks = snap.map((f) => f.T.block);
  const taken = snap.map(() => 0);
  const absorbed = snap.map(() => 0);
  const strikeHit = (e, pierceIt) => {
    const parts = splitInt(e.mag, weights);
    const nets = [];
    parts.forEach((part, i) => {
      if (pierceIt) { taken[i] += part; nets.push(part); return; }
      const ab = Math.min(blocks[i], part); blocks[i] -= ab; absorbed[i] += ab; taken[i] += part - ab; nets.push(part - ab);
    });
    return { d: e.mag, net: nets.reduce((a, n) => a + n, 0), ab: parts.reduce((a, p, i) => a + (p - (nets[i] || 0)), 0), parts, nets };
  };
  const leader = snap[0];
  const livingNow = () => b.enemies.filter((e) => e.hp > 0);
  for (const e of b.enemies) {
    if (e.hp <= 0 || !e.intent || e.fresh) continue;
    const i = e.intent; const act = { uid: e.uid, name: i.n, v: i.v, mag: e.mag, p: e.p };
    switch (i.v) {
      case 'strike': { Object.assign(act, strikeHit(e, false)); break; }
      case 'pierce': { Object.assign(act, strikeHit(e, true)); break; }
      case 'drain': { Object.assign(act, strikeHit(e, false)); rep.magicStolen += i.k; act.drain = i.k; break; }
      case 'pilfer': {
        Object.assign(act, strikeHit(e, false));
        if (act.net > 0 && leader) {
          const purse = leader.hero.gold + Math.max(0, leader.goldEarned);
          const take = Math.min(purse, 6);
          leader.goldEarned -= take; leader.purseLost = (leader.purseLost || 0) + take;
          e.carried += take; rep.goldStolen += take;
        }
        break;
      }
      case 'guard': break;
      case 'mend': { const before = e.hp; e.hp = Math.min(e.maxHp, e.hp + e.mag); act.healed = e.hp - before; break; }
      case 'charge': if (!e.cancelled) e.windup = true; else act.cancelled = true; break;
      case 'howl': for (const o of livingNow()) o.buff += i.k; break;
      case 'bind': if (leader) { leader.nextBound += i.k; rep.bound += i.k; } break;
      case 'summon': {
        const room = ENEMY_CAP - livingNow().length; const add = MONSTERS[e.id].adds;
        for (let n = 0; n < Math.min(i.k, room); n++) {
          const s = spawnEnemy(add, { hpMult: e.hpMult * 0.75, flat: e.flat, rewardMult: 0 }, b.rng);
          s.fresh = true; b.enemies.push(s); rep.summoned.push(s.uid);
        }
        break;
      }
      default: break;
    }
    rep.acts.push(act);
  }
  for (const e of b.enemies) { e.cancelled = false; e.fresh = false; }
  for (const e of livingNow()) {
    const rg = MONSTERS[e.id].rage;
    if (rg && !e.raged && e.hp <= e.maxHp / 2) { e.raged = true; e.powerDie = rg.power; e.faces = rg.faces; e.rageName = rg.name; rep.raged.push(e.uid); }
  }
  // Drain comes out of the leader. Heal lands before damage. Last Stand is once per hero.
  if (leader && rep.magicStolen) {
    const have = leader.magic + (leader.T?.magic || 0);
    rep.magicStolen = Math.min(have, rep.magicStolen);
  }
  snap.forEach((f, i) => {
    const T = f.T;
    const hpBefore = f.hp;
    const healed = Math.max(0, Math.min(f.maxHp, hpBefore + T.heal) - hpBefore);
    let hp = Math.min(f.maxHp, hpBefore + T.heal) - taken[i];
    let lastStand = false;
    if (hp <= 0 && !f.lastStandUsed) {
      f.lastStandUsed = true; lastStand = true; hp = SURVIVE_HP + heroMods(f.hero).lastStandHp;
    }
    f.hp = Math.max(0, Math.min(f.maxHp, hp));
    f.stats.healed += healed; f.stats.taken += taken[i];
    f.contrib += healed * 1.25 + absorbed[i] * 0.8 + (i === 0 ? 3 : 0);
    if (f.ev.offense3 || f.ev.defense3 || f.ev.straight) f.contrib += 4;
    let magic = f.magic + T.magic;
    if (f === leader && rep.magicStolen) magic -= rep.magicStolen;
    f.magic = Math.max(0, Math.min(MAGIC_CAP, magic));
    rep.fighters.push({
      name: f.hero.name, taken: taken[i], absorbed: absorbed[i], healed, lastStand,
      hpAfter: f.hp, magicAfter: f.magic, gold: T.gold, feet: f.board.S.v, leader: i === 0, contrib: f.contrib,
    });
  });
  // Heroes who never rolled (already down) still appear, unchanged.
  for (const f of b.fighters) if (!snap.includes(f)) {
    rep.fighters.push({ name: f.hero.name, taken: 0, absorbed: 0, healed: 0, lastStand: false, hpAfter: f.hp, magicAfter: f.magic, gold: 0, feet: 0, leader: false, contrib: f.contrib, down: true });
  }
  b.report = rep;
  const foes = b.enemies.filter((e) => e.hp > 0).length;
  const heroesUp = b.fighters.filter((f) => f.hp > 0).length;
  if (foes === 0) { b.outcome = 'victory'; b.phase = 'done'; }
  else if (heroesUp === 0) { b.outcome = 'defeat'; b.phase = 'done'; }
  else beginPartyRound(b);
  return rep;
}

export function partyRewards(b) {
  const { quest } = b;
  const dead = b.enemies;
  const xp = dead.reduce((a, e) => a + e.xp, 0);
  const baseKills = dead.reduce((a, e) => a + e.gold, 0);
  const ranked = [...b.fighters].sort((a, c) => c.contrib - a.contrib || a.hero.name.localeCompare(c.hero.name));
  const n = Math.max(1, ranked.length);
  const parts = splitInt(baseKills, ranked.map(() => 1));
  const gold = {};
  ranked.forEach((f, i) => {
    const gm = 1 + heroMods(f.hero).goldPct;
    const killShare = Math.round(parts[i] * gm);
    gold[f.hero.name] = killShare + f.goldEarned;
  });
  const sample = ranked[0]?.hero;
  const rng = makeRng(hashSeed(sample.campaign.seed, sample.campaign.act, sample.campaign.step, 'drops'));
  const minRarity = quest.kind === 'boss' ? 2 : quest.kind === 'elite' ? 1 : 0;
  const drops = rollDrops(rng, n + 1, { minRarity, rarityBoost: (quest.perilous ? 2 : 0) + (quest.kind === 'boss' ? 2 : 0) + sample.campaign.act - 1 });
  return { xp, gold, drops, order: ranked.map((f) => f.hero.name), contrib: Object.fromEntries(b.fighters.map((f) => [f.hero.name, Math.round(f.contrib)])) };
}

export function companyGold(members) { return members.reduce((a, m) => a + m.gold, 0); }
export function payCompany(members, amount) {
  if (companyGold(members) < amount) return false;
  let left = amount;
  const order = [...members].sort((a, b) => b.gold - a.gold);
  for (const m of order) { const take = Math.min(m.gold, left); m.gold -= take; left -= take; }
  return true;
}
export function grantCompany(members, amount) {
  if (!members.length || amount <= 0) return;
  // Equal shares. Any remainder lands in the poorest purse.
  const order = [...members].sort((a, b) => a.gold - b.gold || a.name.localeCompare(b.name));
  const shares = splitInt(amount, order.map(() => 1));
  order.forEach((m, i) => { m.gold += shares[i]; });
}
export function grantXpEach(members, xp) { for (const m of members) gainXp(m, xp); }
