// QuestDice engine — pure rules, no DOM. Everything random flows through an injected rng so
// battles are reproducible and the balance simulator (tools/sim.mjs) can run the same code.

import {
  ROLE, LANES, CARDINALS, MAGIC_CAP, MAX_LEVEL, SYNERGY_BONUS, HEAL_COST,
  HEAL_AMOUNT, NUDGE_COST, RECHARGE_COST, START_MAGIC, REROLL_DICE, RES_BY_SIZE, FACE_PAY, SPEED_STEPS, HEART_AMP, HEART_COLOR_BONUS,
  STRAIGHT, RARITY_WEIGHTS, RARITY_SELL, WEAPONS, LOOT_WEIGHTS, START_DICE, UNLOCK_COST, DIFFICULTY, TALENT_SYMS, TALENT_MAX_SAME, POWER_UPGRADE, TALENT_PER_FACE, TALENT_SLOT_COST, TALENT_FACES, CLASS_TALENT, RULES, STRENGTH_STEPS,
  SPECIAL_STEPS, NEXT_SIZE, xpToNext, CLASSES, PERKS, MONSTERS, ACTS, QUESTS_PER_ACT, ELITE_STEPS,
  PARTY, ENEMY_CAP, FORGE_COST, WEAPON_SIZE_STEPS, ACT_HP, ACT_FLAT, STEP_HP, PERIL, POINTS, PLACE_GOLD, TEAM_TRIPLE_BONUS, MORAL_BOOST, SHARE_MAGIC, REVIVE_COST, REVIVE_HP, POTION_BELT, RARITY_MULT, SIZE_VALUE, SELL_SHARE, BAG_MAX, DROP_SIZES,
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
  // bigger faces lean to the weapon's own colour (two of its colour, then one of the other), so a bigger attack weapon hits harder
  // and a bigger guard weapon blocks more, instead of every size splitting half and half
  const other = first === 'r' ? 'b' : 'r';
  for (let i = 4; i < weaponSize(inst); i++) faces.push({ v: i + 1, c: (i - 4) % 3 === 2 ? other : first });
  const bonus = def.bonus || [];
  for (let k = 0; k < (inst.rarity | 0) && k < bonus.length; k++) {
    const f = faces[bonus[k].face]; if (!f || f.v === 0) continue;
    f.fx = f.fx || {};
    for (const [key, n] of Object.entries(bonus[k].fx)) f.fx[key] = (f.fx[key] || 0) + n;
  }
  return faces;
}
export function makeWeapon(id, rarity = 0, rng, size = 4) { const w = { uid: newUid(rng), id, rarity }; if (size > 4) w.size = size; return w; }
// The hand that holds a weapon caps its die: a d6 weapon in a d4 hand rolls as a d4. `wieldInfo` says what a weapon needs.
export function wieldInfo(hero, inst) {
  const need = weaponSize(inst); const two = WEAPONS[inst.id]?.hands === 2;
  const have = two ? Math.min(hero.strength.W, hero.strength.E) : Math.max(hero.strength.W, hero.strength.E);
  return { need, have, ok: have >= need, rollsAs: Math.min(need, have), two };
}
// A two-hander fills both hands. The right-hand die is its own copy (the bow's arrows) so either hand can be forged and trained on its own.
export const twinOf = (inst) => ({ ...inst, uid: `${inst.uid}~R`, twin: true });
export function ensureTwin(hero) { // older saves share one uid between the two hands
  const { NW, NE } = hero.loadout;
  if (NW && NE && WEAPONS[NW.id].hands === 2 && NE.id === NW.id && !NE.twin) hero.loadout.NE = { ...NE, uid: `${NW.uid}~R`, twin: true };
}
const fists = (side) => ({ uid: `fists-${side}`, id: 'fists', rarity: 0 });
export const isTwoHanded = (hero) => WEAPONS[hero.loadout.NW.id].hands === 2;

// ------------------------------------------------------------------------------- heroes
export function newHero({ name, cls, seed, full = false }) {
  const c = CLASSES[cls];
  const rng = makeRng(hashSeed(name, cls, seed ?? Date.now()));
  const loadout = {};
  if (c.weapons.length === 1) { const w = makeWeapon(c.weapons[0], 0, rng); loadout.NW = w; loadout.NE = twinOf(w); }
  else { loadout.NW = makeWeapon(c.weapons[0], 0, rng); loadout.NE = makeWeapon(c.weapons[1], 0, rng); }
  return {
    v: 1, name, cls, level: 1, xp: 0, gold: 0, perks: [], pendingPerks: 0,
    // slow classes (hands: 6) start with ONE d6 hand: the left, weapon hand
    strength: { W: c.hands || 4, E: 4 }, special: { SW: 4, SE: 4 }, talent: { SW: [[CLASS_TALENT[cls].SW]], SE: [[CLASS_TALENT[cls].SE]] }, dice: full ? null : [...START_DICE], difficulty: 'normal', loadout, bag: [],
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
export const startMagicOf = (hero) => START_MAGIC + heroMods(hero).startMagic;
export const rerollTotal = () => RULES.free + RULES.paid;
export const rerollDiceOf = (hero) => REROLL_DICE + heroMods(hero).rerollDice;
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
// The feet die is the initiative die. Each class starts at its own size (hero.speed.S) and can grow it at camp.
export function feetSize(hero) { hero.speed = hero.speed || { S: CLASSES[hero.cls]?.feet || 4 }; return hero.speed.S; }
export function speedUpgrade(hero) {
  const size = feetSize(hero); const step = SPEED_STEPS[size];
  if (!step) return { ok: false, why: 'Max size' };
  if (hero.level < step[1]) return { ok: false, why: `Level ${step[1]}`, cost: step[0], next: NEXT_SIZE[size] };
  if (hero.gold < step[0]) return { ok: false, why: 'Need gold', cost: step[0], next: NEXT_SIZE[size] };
  return { ok: true, cost: step[0], next: NEXT_SIZE[size] };
}
export function sidesOf(hero, slot) {
  switch (ROLE[slot]) {
    case 'head': return 4;
    case 'feet': return feetSize(hero);
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

// The feet die pays symbols like the head and hands, and its number is also the INITIATIVE (who acts first).
const PAYERS = CARDINALS; // head, hands and feet all pay their symbols; the feet number is ALSO the initiative
// ------------------------------------------------------------------------------- evaluation
// Turns a locked board into resource totals. This is also the live "forecast" the UI shows.
export function evaluate(hero, board, opts = {}) {
  const mods = heroMods(hero);
  const val = (s) => board[s].v;
  const out = {
    init: val('S'), atk: 0, block: 0, pierce: 0, heal: 0, magic: 0, gold: 0,
    lanes: {}, offense3: false, defense3: false, triples: [], straight: 0, straightBonus: 0, notes: [],
  };

  // Universal number language on head, hands and feet: FACE_PAY[v] (1 heal, 2 pierce, 3 magic, 4 gold at 2; 5-8 at 3; 9 and 10 pay two kinds).
  for (const s of PAYERS) {
    const pay = FACE_PAY[val(s)]; if (!pay) continue;
    out.heal += pay.heal || 0; out.pierce += (pay.pierce || 0) + (pay.pierce ? mods.pierceBonus : 0); out.magic += pay.magic || 0; out.gold += pay.gold || 0;
  }
  // Heart 1-4: +2 more of the same for every matching 1 / 2 / 3 / 4 on head, hands and feet. Heart 5/6 are handled with the lanes.
  const hv = val('C');
  out.heart = hv;
  if (hv <= 4) {
    const matches = PAYERS.filter((s) => val(s) === hv).length;
    const amp = HEART_AMP[hv - 1] * matches;
    if (hv === 1) out.heal += amp; else if (hv === 2) out.pierce += amp; else if (hv === 3) out.magic += amp; else out.gold += amp;
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
      out.gold += wf.fx.loot || 0;
    }
    for (const t of tsyms) {
      if (t === 'atk') out.atk += str; else if (t === 'block') out.block += str; else if (t === 'pierce') out.pierce += Math.round(str * 0.75);
      else if (t === 'magic') out.magic += str; else if (t === 'heal') out.heal += 2 * str; else if (t === 'gold') out.gold += Math.ceil(str / 2);
    }
    out.lanes[key] = L;
  }
  // Heart 5 gives +4 block to every blue weapon lane, heart 6 +4 attack to every red weapon lane.
  if (hv >= 5) {
    const want = hv === 5 ? 'b' : 'r'; let n = 0;
    for (const l of Object.values(out.lanes)) if (l.color === want) { l.value += HEART_COLOR_BONUS; l.amp = HEART_COLOR_BONUS; n++; }
    if (n) out.notes.push(`Heart ${hv}: +${HEART_COLOR_BONUS} ${want === 'r' ? 'attack' : 'block'} on ${n} weapon${n > 1 ? 's' : ''}`);
  }
  for (const l of Object.values(out.lanes)) { if (l.color === 'r') out.atk += l.value; else out.block += l.value; }

  // Triples. Across (top row: weapon, head, weapon by the weapons' +N; middle row: hand, heart, hand) = +10 attack each.
  // Down (head, heart, feet) = +10 block. Every die in the line must be in play; a +0 weapon never matches.
  out.triples = [];
  if (isActive(hero, 'NW') && isActive(hero, 'NE')) {
    const a = weaponFaces(hero.loadout.NW)[val('NW') - 1].v;
    const b = weaponFaces(hero.loadout.NE)[val('NE') - 1].v;
    if (a === b && b === val('N') && a > 0) { out.triples.push({ slots: ['NW', 'N', 'NE'], kind: 'atk', row: 'weapons', name: 'Weapons Triple' }); out.atk += SYNERGY_BONUS; }
  }
  if (isActive(hero, 'W') && isActive(hero, 'E') && val('W') === val('C') && val('C') === val('E')) { out.triples.push({ slots: ['W', 'C', 'E'], kind: 'atk', row: 'strength', name: 'Strength Triple' }); out.atk += SYNERGY_BONUS; }
  if (val('N') === val('C') && val('C') === val('S')) { out.triples.push({ slots: ['N', 'C', 'S'], kind: 'block', row: 'headtoe', name: 'Head to Toe Triple' }); out.block += SYNERGY_BONUS; }
  out.offense3 = out.triples.some((t) => t.kind === 'atk'); out.defense3 = out.triples.some((t) => t.kind === 'block');

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
    xp: Math.round(d.xp * rewardMult), gold: Math.round(d.gold * rewardMult),
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
  const o = { startHp: 0, wound: 0, startMagic: 0, atk: 0, block: 0, openingAtk: 0, weaken: 0 };
  for (const bl of hero.campaign?.blessings || []) {
    if (bl.who && bl.who !== hero.name) continue;
    o.startHp += bl.startHp || 0; o.wound += bl.wound || 0; o.startMagic += bl.startMagic || 0;
    o.atk += bl.atk || 0; o.block += bl.block || 0; o.openingAtk += bl.openingAtk || 0;
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
    board: null, actionsLeft: rerollTotal(), freeActions: [], used: {}, usedRound: {}, lastStandUsed: false, potions: potionMaxOf(hero), points: 0,
    mods: blankMods(), nextBound: 0, goldEarned: 0, log: [], report: null, stolen: 0, stats: { dealt: 0, taken: 0, healed: 0 },
  };
  beginReset(b);
  return b;
}
const blankMods = () => ({ atk: 0, pierce: 0, block: 0, heal: 0, weaken: 0, splash: 0, aoe: 0 });

// A new round begins on the Reset screen: monsters have rolled their Intention and shown it.
export function beginReset(b) {
  b.round += 1; b.phase = 'reset'; b.board = null; b.mods = blankMods(); b.usedRound = {};
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
// Healing potions: every hero carries POTIONS a battle. Free to drink, heals POTION_HP. In a party a potion can be thrown
// to a friend (`to` = that fighter); solo it is always you. Any time before you lock in.
export const POTIONS = 2; export const POTION_HP = 10;
export const potionMaxOf = (hero) => hero?.potionMax || POTIONS;
export const potionsLeft = (b) => (b.potions ?? POTIONS);
export function drinkPotion(b, to = b) {
  if (potionsLeft(b) <= 0 || !to || to.hp <= 0 || to.hp >= to.maxHp) return false;
  b.potions = potionsLeft(b) - 1; const before = to.hp; to.hp = Math.min(to.maxHp, to.hp + POTION_HP);
  const got = to.hp - before; (to.stats || b.stats).healed += got;
  award(b, got * (to === b ? POINTS.healSelf : POINTS.healFriend));
  return true;
}
// Potion belt: train it at camp to carry a third potion.
export function potionUpgrade(hero) {
  const cur = potionMaxOf(hero); const step = POTION_BELT[cur];
  if (!step) return { ok: false, why: 'Max', cur };
  if (hero.level < step[1]) return { ok: false, why: `Level ${step[1]}`, cost: step[0], next: cur + 1, cur };
  if (hero.gold < step[0]) return { ok: false, why: 'Need gold', cost: step[0], next: cur + 1, cur };
  return { ok: true, cost: step[0], next: cur + 1, cur };
}
export function upgradePotions(hero) { const r = potionUpgrade(hero); if (!r.ok) return false; hero.gold -= r.cost; hero.potionMax = r.next; return true; }

// ------------------------------------------------------------------------------- battle points
// Arcade-style points (POINTS in data.js). `who` is a solo battle or a party fighter: both keep `.points`.
export function award(who, n) { if (!who || !n) return 0; who.points = (who.points || 0) + n; return n; }
export const pointsOf = (who) => Math.round(who?.points || 0);
// What a round was worth, from its tallies.
export function roundPoints({ dealt = 0, absorbed = 0, healed = 0, kills = 0, triples = 0, teamTriples = 0, straight = false, down = false } = {}) {
  return dealt * POINTS.dealt + absorbed * POINTS.absorbed + healed * POINTS.healSelf + kills * POINTS.kill
    + triples * POINTS.triple + teamTriples * POINTS.teamTriple + (straight ? POINTS.straight : 0) + (down ? POINTS.knockedOut : 0);
}
// A hero's lifetime record: every battle's points, plus party trophies (1st place; 2nd place only with 3+ heroes).
export function recordBattle(hero, { points = 0, place = 0, heroes = 1, won = true } = {}) {
  const r = (hero.record ||= { battles: 0, points: 0, best: 0, firsts: 0, seconds: 0, wins: 0 });
  r.battles++; r.points += Math.max(0, Math.round(points)); r.best = Math.max(r.best, Math.round(points)); if (won) r.wins++;
  if (heroes >= 2 && won && place === 1) r.firsts++;
  if (heroes >= 3 && won && place === 2) r.seconds++;
  return r;
}
export const BIG_HEAL = { cost: 0, hp: POTION_HP }; // (old name, kept for callers)
export const healBig = (b) => drinkPotion(b);
// ---- powers. Level (0-2) makes a power stronger: +25% numbers per level and +1 die on dice powers.
export const powerLevel = (hero, id) => (hero.powerLevel && hero.powerLevel[id]) || 0;
const scaleNum = (v, lvl) => Math.round(v * (1 + 0.25 * lvl));
export function powerCost(card, x) { return card.kind === 'scale' ? Math.max(card.cost, Math.min(card.max, x ?? card.cost)) : card.cost; }
export function powerState(b, card) {
  const spent = card.atwill ? !!(b.usedRound && b.usedRound[card.id]) : !!b.used[card.id];
  const early = !!(card.minRound && b.round < card.minRound);
  return { spent, early, canPay: b.magic >= card.cost };
}
export function castPower(b, id, { x, release } = {}) {
  const card = cardsOf(b.hero).find((c) => c.id === id);
  if (!card || b.phase !== 'shape') return null;
  if (card.kind === 'charge' && release) { // let the stored charges go
    b.charge = b.charge || {}; const n = b.charge[id] || 0; const key = `${id}:release`;
    if (!n || (b.usedRound && b.usedRound[key])) return null;
    (b.usedRound = b.usedRound || {})[key] = true; b.charge[id] = 0;
    const lvl = powerLevel(b.hero, id); const total = scaleNum(card.per * n, lvl);
    b.mods.atk += total; if (card.splash === 'half') b.mods.splash += Math.floor(total / 2);
    b.lastCast = { id, name: card.name, cost: 0, rolls: [], total, notes: [`released ${n}`], released: n }; return b.lastCast;
  }
  const st = powerState(b, card); if (st.spent || st.early) return null;
  const cost = powerCost(card, x); if (b.magic < cost) return null;
  b.magic -= cost;
  if (card.atwill) (b.usedRound = b.usedRound || {})[id] = true; else b.used[id] = true;
  const lvl = powerLevel(b.hero, id); const out = { id, name: card.name, cost, rolls: [], total: 0, notes: [] };
  const add = (k, v) => { if (k === 'free') b.freeActions.push(v); else if (k === 'magic') b.magic = Math.min(MAGIC_CAP, b.magic + v); else b.mods[k] = (b.mods[k] || 0) + v; };
  if (card.dice) { // roll them
    const n = card.dice.n + lvl + (card.kind === 'scale' ? cost - card.cost : 0);
    for (let i = 0; i < n; i++) out.rolls.push(1 + Math.floor(b.rng() * card.dice.s));
    out.total = out.rolls.reduce((a, v) => a + v, 0); out.die = card.dice.s;
    add(card.dice.to, out.total);
    if (card.splash === 'half') b.mods.splash += Math.floor(out.total / 2);
  } else if (card.kind === 'round') {
    out.total = scaleNum(card.per * b.round, lvl); add('atk', out.total);
    if (card.splash === 'half') b.mods.splash += Math.floor(out.total / 2);
  } else if (card.kind === 'charge') {
    b.charge = b.charge || {}; b.charge[id] = Math.min(card.max, (b.charge[id] || 0) + 1); out.charged = b.charge[id];
  } else if (card.kind === 'luck') {
    const r = 1 + Math.floor(b.rng() * 6); out.rolls.push(r); out.die = 6;
    if (r <= 2) add('magic', 1 + lvl); else if (r <= 4) add('atk', scaleNum(5, lvl)); else { add('atk', scaleNum(9, lvl)); add('magic', 2); }
    out.total = r;
  } else {
    for (const [k, v] of Object.entries(card.fx)) add(k, k === 'free' ? v : scaleNum(v, lvl));
  }
  if (card.kind === 'super') { b.mods.aoe += scaleNum(card.aoe, lvl); }
  b.lastCast = out; return out;
}
export const playCard = (b, id, opts) => !!castPower(b, id, opts);
export function powerUpgradeInfo(hero, id) {
  const lvl = powerLevel(hero, id); if (lvl >= POWER_UPGRADE.length) return { ok: false, why: 'max', lvl };
  const cost = POWER_UPGRADE[lvl]; return { ok: hero.gold >= cost, why: hero.gold >= cost ? '' : 'gold', cost, lvl, next: lvl + 1 };
}
export function upgradePower(hero, id) {
  if (!cardsOf(hero).some((c) => c.id === id)) return false;
  const r = powerUpgradeInfo(hero, id); if (!r.ok) return false;
  hero.gold -= r.cost; hero.powerLevel = { ...(hero.powerLevel || {}), [id]: r.next }; return true;
}
export function recharge(b, id) {
  if (!b.used[id] || b.magic < RECHARGE_COST || cardsOf(b.hero).find((c) => c.id === id)?.kind === 'super') return false;
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
    magic: ev.magic, gold: ev.gold,
  };
  const rep = {
    round: b.round, ev, T, dealt: 0, guarded: 0, targetUid: null, killed: [], raged: [], summoned: [],
    acts: [], taken: 0, absorbed: 0, healed: 0, magicStolen: 0, goldStolen: 0, bound: 0, hpBefore: b.hp,
  };
  if (ev.offense3) hero.stats.triples++;
  if (ev.straight) hero.stats.straights++;
  b.goldEarned += T.gold;

  const alive = b.enemies.filter((e) => e.hp > 0);
  for (const e of alive) { e.p = die(b.rng, e.powerDie); e.mag = magnitude(e, e.intent, e.p, m.weaken + (boon.weaken || 0)); e.buffUsed = e.buff; e.buff = 0; }

  let block = T.block; rep.dealtBefore = b.stats.dealt;
  // Your strike.
  let tgt = null;
  const strike = () => {
    tgt = b.enemies[target];
    if (!tgt || tgt.hp <= 0) tgt = alive[0];
    rep.targetUid = tgt.uid;
    const guard = tgt.intent.v === 'guard' ? tgt.mag : 0;
    const dmg = Math.max(0, T.atk - guard) + T.pierce;
    rep.guarded = Math.min(guard, T.atk);
    rep.dealt = Math.min(tgt.hp, dmg);
    tgt.hp = Math.max(0, tgt.hp - dmg);
    b.stats.dealt += rep.dealt;
    if (tgt.hp <= 0) { rep.killed.push(tgt.uid); b.stolen += tgt.carried; tgt.carried = 0; }
    // splash (to the others) and area damage (to everyone), from powers
    rep.splashed = [];
    if (m.splash > 0 || m.aoe > 0) {
      for (const e of b.enemies) {
        if (e.hp <= 0 && e !== tgt) continue;
        const hit = (e === tgt ? 0 : m.splash) + m.aoe; if (hit <= 0 || (e === tgt && tgt.hp <= 0)) continue;
        const before = e.hp; e.hp = Math.max(0, e.hp - hit); const d = before - e.hp;
        rep.splashed.push({ uid: e.uid, dealt: d }); b.stats.dealt += d; rep.dealt += e === tgt ? d : 0;
        if (e.hp <= 0 && !rep.killed.includes(e.uid)) { rep.killed.push(e.uid); b.stolen += e.carried; e.carried = 0; }
      }
    }


  };
  const strikeHit = (e, pierceIt) => {
    const d = e.mag;
    let net = d; let ab = 0;
    if (!pierceIt) { ab = Math.min(block, d); block -= ab; rep.absorbed += ab; net = d - ab; }
    rep.taken += net;
    return { d, net, ab };
  };
  const living = () => b.enemies.filter((e) => e.hp > 0);
  const actFor = (list, early) => {
  for (const e of list) {
    if (e.hp <= 0 || !e.intent || e.fresh) continue; // reinforcements join next round
    const i = e.intent; const act = { uid: e.uid, name: i.n, v: i.v, mag: e.mag, p: e.p, early, init: e.init ?? null };
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
  };

  // Initiative: the first round always goes to you. After that each monster rolls a d4 against your feet die; ties go to you.
  const initV = ev.init; const early = [];
  rep.init = { hero: initV, heroDie: feetSize(hero), foes: [], first: 'hero', forced: b.round === 1 };
  for (const e of alive) { e.init = b.round === 1 ? null : die(b.rng, MONSTERS[e.id]?.init || 4); rep.init.foes.push({ uid: e.uid, init: e.init, die: MONSTERS[e.id]?.init || 4 }); if (e.init != null && e.init > initV) early.push(e); }
  if (early.length) rep.init.first = 'foes';
  rep.early = early.map((e) => e.uid);
  actFor(early, true);
  const heroDown = early.length > 0 && Math.min(b.maxHp, b.hp + T.heal) - rep.taken <= 0;
  if (heroDown) { rep.heroDown = true; rep.targetUid = null; } else {
    strike();
    actFor(b.enemies.filter((e) => !early.includes(e)), false);
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
  b.hp = Math.max(0, Math.min(b.maxHp, hp));
  const stolen = Math.min(b.magic + T.magic, rep.magicStolen); rep.magicStolen = stolen;
  b.magic = Math.max(0, Math.min(MAGIC_CAP, b.magic + T.magic - stolen));
  rep.hpAfter = b.hp; rep.magicAfter = b.magic;
  hero.stats.rounds++;
  rep.points = Math.round(roundPoints({ dealt: b.stats.dealt - (rep.dealtBefore ?? b.stats.dealt), absorbed: rep.absorbed, healed: rep.healed, kills: rep.killed.length, triples: (ev.triples || []).length, straight: !!ev.straight, down: b.hp <= 0 }));
  award(b, rep.points);

  b.report = rep;
  if (living().length === 0) { b.outcome = 'victory'; b.phase = 'done'; }
  else if (b.hp <= 0) { b.outcome = 'defeat'; b.phase = 'done'; }
  else beginReset(b);
  return rep;
}

// ------------------------------------------------------------------------------- rewards & growth
const SIZES = [4, 6, 8, 10];
// Size weights for found weapons: early Act I is all d4, later steps and acts bring d6, d8, d10. `up` shifts one size bigger.
export function dropSizeWeights(act, step, up = 0) {
  const key = act >= 3 ? 3 : act === 2 ? 2 : step >= 4 ? 1.5 : 1;
  const w = [...DROP_SIZES[key]];
  for (let i = 0; i < up; i++) { const last = w.pop(); w.unshift(0); w[3] += last; } // shift the odds one size up (d10 keeps what falls off the end)
  return w;
}
export function rollDrops(rng, count, { minRarity = 0, rarityBoost = 0, sizes = [100, 0, 0, 0], minSize = 4 } = {}) {
  const drops = [];
  const ids = Object.keys(LOOT_WEIGHTS);
  for (let i = 0; i < count; i++) {
    const id = ids[weighted(rng, ids.map((k) => LOOT_WEIGHTS[k]))];
    const w = RARITY_WEIGHTS.map((x, r) => (r === 0 ? Math.max(1, x - rarityBoost * 4) : x + rarityBoost * (r === 1 ? 3 : r === 2 ? 1.5 : 0.5)));
    const rarity = Math.max(minRarity, weighted(rng, w));
    const size = Math.max(minSize, SIZES[weighted(rng, sizes)] || 4);
    drops.push(makeWeapon(id, rarity, rng, size));
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
  const c = hero.campaign; const sizes = dropSizeWeights(c.act, c.step, quest.perilous ? 1 : 0);
  const drops = rollDrops(rng, b.players + 1, { minRarity, rarityBoost: (quest.perilous ? 2 : 0) + (quest.kind === 'boss' ? 2 : 0) + c.act - 1, sizes });
  if (quest.kind === 'boss' || quest.kind === 'elite') { const big = SIZES[Math.min(3, SIZES.indexOf(weaponSize(drops[0])) + 1)]; drops[0].size = big; } // the big fights always leave one weapon a size up
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
  const r = kind === 'strength' ? strengthUpgrade(hero, slot) : kind === 'speed' ? speedUpgrade(hero) : specialUpgrade(hero, slot);
  if (!r.ok) return false;
  hero.gold -= r.cost; feetSize(hero); hero[kind][slot] = r.next; return true;
}
// ---- forging (Tier) and training (Size) a weapon. Both cost gold; instances are found by uid (a two-hander sits in both hands).
const copiesOf = (hero, uid) => [...Object.values(hero.loadout), ...hero.bag].filter((w) => w && w.uid === uid);
const handsMul = (inst) => (WEAPONS[inst.id].hands === 2 ? 1.4 : 1);
export function forgeInfo(hero, uid) {
  ensureTwin(hero);
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
  ensureTwin(hero);
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
// What a weapon is worth: base price x tier x size. The shop charges it; a sale returns half (SELL_SHARE).
export const weaponValue = (inst) => (inst.id === 'fists' ? 0 : Math.round((WEAPONS[inst.id].price || 0) * RARITY_MULT[inst.rarity | 0] * (SIZE_VALUE[weaponSize(inst)] || 1)));
export const sellValue = (inst) => (inst.id === 'fists' ? 0 : Math.max(1, Math.round(weaponValue(inst) * SELL_SHARE)));
void RARITY_SELL;
export const bagRoom = (hero) => Math.max(0, BAG_MAX - hero.bag.length);
export const bagFull = (hero) => bagRoom(hero) <= 0;
export function sellDrop(hero, inst) { hero.gold += sellValue(inst); return true; } // sell spoils on the spot, without carrying them
export function shopStock(hero) {
  const c = hero.campaign;
  if (c.shop && c.shop.step === `${c.act}.${c.step}`) return c.shop.items;
  const rng = makeRng(hashSeed(c.seed, c.act, c.step, 'shop'));
  const mult = [1, 2.3, 5, 11];
  const flags = c.campFlags || {};
  const priceMod = Math.max(0.4, 1 - (flags.discount || 0) + (flags.hike || 0));
  void mult;
  const items = rollDrops(rng, 4, { rarityBoost: c.act - 1 + Math.floor(c.step / 4), sizes: dropSizeWeights(c.act, c.step) }).map((inst) => ({
    inst, price: Math.max(1, Math.round(weaponValue(inst) * priceMod)), sold: false,
  }));
  if (flags.discount || flags.hike) c.campFlags = {};
  c.shop = { step: `${c.act}.${c.step}`, items };
  return items;
}
export function buyItem(hero, i) {
  const it = shopStock(hero)[i];
  if (!it || it.sold || hero.gold < it.price || bagFull(hero)) return false;
  hero.gold -= it.price; it.sold = true; hero.bag.push(it.inst); return true;
}
export function equip(hero, uid, side = 'NW') {
  const idx = hero.bag.findIndex((w) => w.uid === uid);
  if (idx < 0) return false;
  const inst = hero.bag[idx]; const w = WEAPONS[inst.id];
  hero.bag.splice(idx, 1);
  const nw = hero.loadout.NW; const ne = hero.loadout.NE; // putting a two-hander away keeps the better of its two hands
  if (ne?.twin && nw && nw.id === ne.id) { nw.rarity = Math.max(nw.rarity | 0, ne.rarity | 0); if (nw.size || ne.size) nw.size = Math.max(nw.size | 0, ne.size | 0) || undefined; }
  const stash = (it) => { if (it && it.id !== 'fists' && !it.twin && !hero.bag.some((x) => x.uid === it.uid)) hero.bag.push(it); };
  if (w.hands === 2) {
    stash(hero.loadout.NW); stash(hero.loadout.NE);
    hero.loadout.NW = inst; hero.loadout.NE = twinOf(inst);
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
export function takeDrop(hero, inst) { if (bagFull(hero)) return false; hero.bag.push(inst); return true; }

// ------------------------------------------------------------------------------- reading the odds
// What a hero's dice give on an average throw (no rerolls): many random boards through the real rules. Same hero, same answer.
const _powerCache = new Map();
export function heroPower(hero, samples = 240) {
  const key = JSON.stringify([hero.cls, hero.level, hero.strength, hero.special, hero.speed, hero.talent, hero.dice, hero.perks, hero.loadout.NW, hero.loadout.NE]);
  if (_powerCache.has(key)) return _powerCache.get(key);
  const rng = makeRng(hashSeed(key)); const t = { atk: 0, pierce: 0, block: 0, heal: 0, magic: 0, gold: 0 };
  for (let i = 0; i < samples; i++) { const ev = evaluate(hero, rollBoard(hero, rng)); for (const k in t) t[k] += ev[k] || 0; }
  for (const k in t) t[k] /= samples;
  const out = { ...t, dmg: t.atk + t.pierce, hp: maxHpOf(hero) };
  if (_powerCache.size > 200) _powerCache.clear();
  _powerCache.set(key, out); return out;
}
// How a quest should go for this hero, from their dice against the monsters' health and hits.
// score ~ the share of your health the fight is likely to cost (1 = all of it). Rerolls and powers are folded in as a flat lift.
export function questDanger(hero, quest0) {
  const quest = withDifficulty(hero, quest0); const P = heroPower(hero);
  let hp = 0; let hit = 0; let blockable = 0;
  for (const id of quest.enemies) {
    const M = MONSTERS[id]; hp += Math.round(M.hp * (quest.hpMult ?? 1)); const ep = (M.power + 1) / 2;
    let dmg = 0; let blk = 0;
    for (const f of M.faces) { if (!DAMAGE_VERBS.has(f.v)) continue; const m = Math.max(0, f.f + f.m * ep + (quest.flat || 0)); dmg += m; if (f.v !== 'pierce') blk += m; }
    hit += dmg / 6; blockable += blk / 6;
  }
  const deal = Math.max(1, P.dmg * 1.7); // rerolls and powers: a played round deals ~1.7x an average throw (measured on bot runs)
  const rounds = hp / deal;
  const perRound = Math.max(0, hit - Math.min(blockable, P.block * 1.2)) - P.heal * 0.5;
  const taken = Math.max(0, perRound) * rounds * 0.3; // monsters fall as the fight goes on, and rerolls, block powers and mending soak most of the rest
  const score = taken / P.hp;
  const label = score < 0.35 ? 'Easy' : score < 0.5 ? 'Fair' : score < 0.7 ? 'Hard' : 'Deadly'; // calibrated on 3-act bot runs with potions: ~96%, ~85%, ~73%, ~45% wins
  return { score, label, rounds: Math.max(1, Math.round(rounds)), taken: Math.round(taken), foeHp: hp, deal: Math.round(deal) };
}

// ------------------------------------------------------------------------------- campaign
const PREFIX =['Ambush at', 'Trouble at', 'The Siege of', 'Showdown at', 'Night Raid on', 'Skirmish near'];
export function questsFor(hero) {
  const c = hero.campaign; const actIdx = (c.act - 1) % ACTS.length; const act = ACTS[actIdx];
  const cycle = Math.floor((c.act - 1) / ACTS.length);
  const rng = makeRng(hashSeed(c.seed, c.act, c.step, 'quests'));
  const s = c.step;
  const ai = Math.min(ACT_HP.length - 1, c.act - 1); // act 3+ reuses the act data with the act-3 growth until it has its own monsters
  const base = (1 + STEP_HP * (s - 1)) * ACT_HP[ai] * (1 + 0.6 * Math.max(0, cycle - (c.act > ACT_HP.length ? 1 : 0)));
  const flat = 3 + Math.floor((s - 1) / 3) + ACT_FLAT[ai]; // (3, not 2: every hero now carries two free potions)
  const mk = (kind, enemies, extra = {}) => {
    const prefix = kind === 'boss' ? null : pick(rng, PREFIX);
    const place = kind === 'boss' ? act.places[act.places.length - 1] : pick(rng, act.places);
    return {
    id: `${c.act}.${s}.${extra.perilous ? 'p' : kind}`, act: c.act, step: s, kind, enemies, place,
    name: kind === 'boss' ? `${MONSTERS[enemies[0]].name}` : `${prefix} ${place}`,
    // elites and bosses are built for their own act already; the act growth only lifts them when an act reuses older monsters
    hpMult: (kind === 'boss' || kind === 'elite') && c.act <= ACTS.length ? (1 + STEP_HP * (s - 1)) : base * (extra.perilous ? PERIL.hp : 1), flat: flat + (extra.perilous ? PERIL.flat : 0),
    rewardMult: extra.perilous ? PERIL.reward : 1, perilous: !!extra.perilous,
    };
  };
  if (s >= QUESTS_PER_ACT) return [mk('boss', act.boss, { boss: true })];
  const poolPick = () => pick(rng, act.pool);
  if (ELITE_STEPS.includes(s)) return [mk('elite', pick(rng, act.elite)), mk('battle', poolPick(), { perilous: true })];
  let a = poolPick(); let bq = poolPick();
  for (let tries = 0; tries < 6 && bq.join() === a.join(); tries++) bq = poolPick();
  const weight = (f) => f.reduce((t, id) => t + MONSTERS[id].hp, 0);
  if (weight(a) > weight(bq)) [a, bq] = [bq, a]; // Standard is always the lighter road
  // The very first fight is a lesson: a lone goblin on the standard road, so a new player can learn the dice without a crowd.
  if (c.act === 1 && s === 1 && !(c.wins > 0)) a = ['goblin'];
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
    board: null, actionsLeft: rerollTotal(), freeActions: [], used: {}, mods: blankMods(), potions: potionMaxOf(hero), points: 0, reviveUsed: false, teamRound: 0,
    nextBound: 0, boundNow: 0, lastStandUsed: false, goldEarned: 0, straight: 'atk', target: 0,
    stats: { dealt: 0, taken: 0, healed: 0 }, contrib: 0,
  };
}
const MIRROR = ['hp', 'maxHp', 'magic', 'board', 'actionsLeft', 'freeActions', 'used', 'mods', 'nextBound', 'boundNow', 'lastStandUsed', 'goldEarned', 'potions', 'points'];
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
  };
  return { ev, T };
}

// Team triples: two or more heroes landing the same kind of triple in one round each get TEAM_TRIPLE_BONUS more.
// Attack rows (Weapons, Strength) only count when they hit the same monster. Heartbeat: if every hero's heart die shows
// the same face, each gains magic equal to the number of heroes.
const TEAM_LABEL = { weapons: 'Team Weapons Attack', strength: 'Team Strength Attack', headtoe: 'Team Head to Toe Block' };
function teamBonuses(b, acting) {
  const out = { team: [], heartbeat: null };
  if (acting.length < 2) return out;
  const tgtOf = (f) => { const t = b.enemies[f.target]; return t && t.hp > 0 ? t.uid : b.enemies.find((e) => e.hp > 0)?.uid; };
  for (const row of ['weapons', 'strength', 'headtoe']) {
    const who = acting.filter((f) => (f.ev.triples || []).some((t) => t.row === row));
    if (who.length < 2) continue;
    const groups = new Map();
    for (const f of who) { const k = row === 'headtoe' ? 'all' : tgtOf(f); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
    for (const g of groups.values()) {
      if (g.length < 2) continue;
      for (const f of g) { if (row === 'headtoe') f.T.block += TEAM_TRIPLE_BONUS; else f.T.atk += TEAM_TRIPLE_BONUS; f._team++; }
      out.team.push({ row, label: TEAM_LABEL[row], names: g.map((f) => f.hero.name), bonus: TEAM_TRIPLE_BONUS });
    }
  }
  const face = acting[0].board.C.v;
  if (acting.every((f) => f.board.C.v === face)) { for (const f of acting) f.T.magic += acting.length; out.heartbeat = { face, magic: acting.length }; }
  return out;
}
// TEAM ACTIONS: each living hero may take one per round, while the round is being shaped. `from`/`to` are fighter indexes.
//   potion  throw one of your potions to a friend (+10 health)
//   magic   pay SHARE_MAGIC magic, your friend gains it
//   revive  once a battle: pay REVIVE_COST magic, a fallen friend stands back up with REVIVE_HP health (acts next round)
export function teamActionInfo(b, from, kind, to) {
  const F = b.fighters[from]; const T = b.fighters[to];
  if (!F || !T || F === T) return { ok: false, why: 'Choose a friend.' };
  if (b.outcome) return { ok: false, why: 'The battle is over.' };
  if (F.hp <= 0) return { ok: false, why: 'You are down.' };
  if (F.teamRound === b.round) return { ok: false, why: 'One team action a round.' };
  if (kind === 'potion') { if (potionsLeft(F) <= 0) return { ok: false, why: 'No potions left.' }; if (T.hp <= 0) return { ok: false, why: `${T.hero.name} is down. Revive them.` }; if (T.hp >= T.maxHp) return { ok: false, why: `${T.hero.name} is at full health.` }; return { ok: true }; }
  if (kind === 'magic') { if (F.magic < SHARE_MAGIC) return { ok: false, why: `Needs ${SHARE_MAGIC} magic.` }; if (T.hp <= 0) return { ok: false, why: `${T.hero.name} is down.` }; if (T.magic >= MAGIC_CAP) return { ok: false, why: `${T.hero.name} is full of magic.` }; return { ok: true }; }
  if (kind === 'revive') { if (F.reviveUsed) return { ok: false, why: 'You have used your revive this battle.' }; if (T.hp > 0) return { ok: false, why: `${T.hero.name} is still standing.` }; if (F.magic < REVIVE_COST) return { ok: false, why: `Needs ${REVIVE_COST} magic.` }; return { ok: true }; }
  return { ok: false, why: 'Unknown action.' };
}
export function teamAction(b, from, kind, to) {
  if (b.fighters[b.active]) commitFighter(b);
  const r = teamActionInfo(b, from, kind, to); if (!r.ok) { if (b.fighters[b.active]) focusFighter(b, b.active); return r; }
  const F = b.fighters[from]; const T = b.fighters[to];
  if (kind === 'potion') drinkPotion(F, T);
  else if (kind === 'magic') { F.magic -= SHARE_MAGIC; const got = Math.min(MAGIC_CAP, T.magic + SHARE_MAGIC) - T.magic; T.magic += got; award(F, SHARE_MAGIC * POINTS.magicGift); }
  else if (kind === 'revive') { F.magic -= REVIVE_COST; F.reviveUsed = true; T.hp = Math.min(T.maxHp, REVIVE_HP); T.board = null; award(F, POINTS.revive); }
  F.teamRound = b.round; F.contrib = F.points;
  if (b.fighters[b.active]) focusFighter(b, b.active);
  return { ok: true };
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
    f.ev = ev; f.T = T; f._dealt = 0; f._kills = 0; f._team = 0;
    if (ev.offense3 || ev.defense3) f.hero.stats.triples++;
    if (ev.straight) f.hero.stats.straights++;
    f.goldEarned += T.gold;
    f.hero.stats.rounds++;
  }
  const team = teamBonuses(b, acting);
  const alive = b.enemies.filter((e) => e.hp > 0);
  for (const e of alive) {
    e.p = die(b.rng, e.powerDie);
    e.mag = magnitude(e, e.intent, e.p, weaken);
    e.buffUsed = e.buff; e.buff = 0;
  }
  const order = rankFighters(acting, b.rng);
  const rep = {
    round: b.round, party: true, leader: order[0]?.f.hero.name || '', strikes: [], team: team.team, heartbeat: team.heartbeat, moral: [],
    killed: [], raged: [], summoned: [], acts: [],
    fighters: [], bound: 0, magicStolen: 0, goldStolen: 0,
  };
  const guardLeft = new Map();
  for (const e of alive) if (e.intent?.v === 'guard') guardLeft.set(e.uid, e.mag);
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
  // Moral Boost: the killing blow gives the next hero to act +MORAL_BOOST attack (carried into next round if nobody is left).
  let moral = b.moralNext || null; b.moralNext = null;
  const strikeFor = (f) => {
    let tgt = b.enemies[f.target];
    if (!tgt || tgt.hp <= 0) tgt = b.enemies.find((e) => e.hp > 0);
    if (!tgt) return;
    const T = f.T;
    if (moral && moral.from !== f.hero.name) { T.atk += moral.n; rep.moral.push({ from: moral.from, to: f.hero.name, n: moral.n }); moral = null; }
    const pool = guardLeft.get(tgt.uid) || 0;
    const guarded = Math.min(pool, T.atk);
    if (guardLeft.has(tgt.uid)) guardLeft.set(tgt.uid, pool - guarded);
    const dmg = Math.max(0, T.atk - guarded) + T.pierce;
    const dealt = Math.min(tgt.hp, dmg);
    tgt.hp = Math.max(0, tgt.hp - dmg);
    f.stats.dealt += dealt; f._dealt += dealt;
    const killed = tgt.hp <= 0;
    if (killed) {
      rep.killed.push(tgt.uid); f._kills++; moral = { from: f.hero.name, n: MORAL_BOOST };
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
  };
  const actFor = (e) => {
    if (e.hp <= 0 || !e.intent || e.fresh) return;
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
  };
  // The round plays in initiative order: every hero acts on their Feet roll and every monster on its own die.
  // Higher goes first; ties go to the heroes; round 1 is always the heroes' (then the monsters).
  const forced = b.round === 1;
  const heroInit = new Map(order.map((r) => [r.f, r.feet]));
  for (const e of alive) e.init = forced ? null : die(b.rng, MONSTERS[e.id]?.init || 4);
  const line = [];
  order.forEach((r, k) => line.push({ kind: 'hero', f: r.f, v: forced ? 99 : r.feet, tie: 0, k }));
  alive.forEach((e, k) => line.push({ kind: 'foe', e, v: forced ? -1 : e.init, tie: 1, k }));
  line.sort((x, y) => y.v - x.v || x.tie - y.tie || x.k - y.k);
  rep.init = { forced, heroes: order.map((r) => ({ name: r.f.hero.name, init: r.feet, die: feetSize(r.f.hero) })), foes: alive.map((e) => ({ uid: e.uid, init: e.init, die: MONSTERS[e.id]?.init || 4 })) };
  rep.order = line.map((x) => (x.kind === 'hero' ? { kind: 'hero', name: x.f.hero.name, v: heroInit.get(x.f) } : { kind: 'foe', uid: x.e.uid, name: x.e.name, v: x.e.init }));
  const runningHp = (f) => { const i = snap.indexOf(f); return Math.min(f.maxHp, f.hp + f.T.heal) - taken[i]; };
  for (const x of line) {
    if (x.kind === 'hero') { if (runningHp(x.f) <= 0) { (rep.fallen = rep.fallen || []).push(x.f.hero.name); continue; } strikeFor(x.f); } else actFor(x.e);
  }
  if (moral) b.moralNext = moral; // nobody left to act this round: it carries to the first hero next round
  for (const e of b.enemies) { e.cancelled = false; e.fresh = false; }
  for (const e of livingNow()) {
    const rg = MONSTERS[e.id].rage;
    if (rg && !e.raged && e.hp <= e.maxHp / 2) { e.raged = true; e.powerDie = rg.power; e.faces = rg.faces; e.rageName = rg.name; rep.raged.push(e.uid); }
  }
  // Drain comes out of the leader. Heal lands before damage. There is no Last Stand: at 0 HP a hero falls.
  if (leader && rep.magicStolen) {
    const have = leader.magic + (leader.T?.magic || 0);
    rep.magicStolen = Math.min(have, rep.magicStolen);
  }
  snap.forEach((f, i) => {
    const T = f.T;
    const hpBefore = f.hp;
    const healed = Math.max(0, Math.min(f.maxHp, hpBefore + T.heal) - hpBefore);
    let hp = Math.min(f.maxHp, hpBefore + T.heal) - taken[i];
    f.hp = Math.max(0, Math.min(f.maxHp, hp));
    f.stats.healed += healed; f.stats.taken += taken[i];
    const pts = Math.round(roundPoints({ dealt: f._dealt, absorbed: absorbed[i], healed, kills: f._kills, triples: (f.ev.triples || []).length, teamTriples: f._team, straight: !!f.ev.straight, down: hpBefore > 0 && f.hp <= 0 }));
    award(f, pts); f.contrib = f.points;
    let magic = f.magic + T.magic;
    if (f === leader && rep.magicStolen) magic -= rep.magicStolen;
    f.magic = Math.max(0, Math.min(MAGIC_CAP, magic));
    rep.fighters.push({
      name: f.hero.name, taken: taken[i], absorbed: absorbed[i], healed,
      hpAfter: f.hp, magicAfter: f.magic, gold: T.gold, feet: f.board.S.v, leader: i === 0, contrib: f.contrib, points: pts, total: pointsOf(f),
    });
  });
  // Heroes who never rolled (already down) still appear, unchanged.
  for (const f of b.fighters) if (!snap.includes(f)) {
    rep.fighters.push({ name: f.hero.name, taken: 0, absorbed: 0, healed: 0, hpAfter: f.hp, magicAfter: f.magic, gold: 0, feet: 0, leader: false, contrib: f.contrib, down: true });
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
  // Ranked by battle points. The gold from the fallen is shared evenly; the top scorer gets PLACE_GOLD[0] of a share more,
  // and (with three or more heroes) the runner-up PLACE_GOLD[1]. Everyone else gets the same even share.
  const ranked = [...b.fighters].sort((a, c) => (c.points || 0) - (a.points || 0) || a.hero.name.localeCompare(c.hero.name));
  const n = Math.max(1, ranked.length);
  const parts = splitInt(baseKills, ranked.map(() => 1));
  const gold = {}; const place = {};
  ranked.forEach((f, i) => {
    const gm = 1 + heroMods(f.hero).goldPct;
    const bonus = n >= 2 && i === 0 ? PLACE_GOLD[0] : n >= 3 && i === 1 ? PLACE_GOLD[1] : 0;
    const killShare = Math.round(parts[i] * (1 + bonus) * gm);
    gold[f.hero.name] = killShare + f.goldEarned;
    place[f.hero.name] = i + 1;
  });
  const sample = ranked[0]?.hero;
  const rng = makeRng(hashSeed(sample.campaign.seed, sample.campaign.act, sample.campaign.step, 'drops'));
  const minRarity = quest.kind === 'boss' ? 2 : quest.kind === 'elite' ? 1 : 0;
  const drops = rollDrops(rng, n + 1, { minRarity, rarityBoost: (quest.perilous ? 2 : 0) + (quest.kind === 'boss' ? 2 : 0) + sample.campaign.act - 1, sizes: dropSizeWeights(sample.campaign.act, sample.campaign.step, quest.perilous ? 1 : 0) });
  const points = Object.fromEntries(b.fighters.map((f) => [f.hero.name, pointsOf(f)]));
  return { xp, gold, drops, order: ranked.map((f) => f.hero.name), place, points, contrib: points };
}
// The spoils draft: heroes choose in order of battle points. On your turn take a weapon or skip; the turn passes on and
// comes back around. It ends when the spoils are gone or everyone skips in a row.
export function newDraft(order, count) { return { order: [...order], turn: 0, left: count, picked: {}, skips: 0, done: count <= 0 || !order.length }; }
export const draftWho = (d) => (d.done ? null : d.order[d.turn % d.order.length]);
export function draftPick(d, name, index) {
  if (d.done || draftWho(d) !== name || d.picked[index] != null) return false;
  d.picked[index] = name; d.left--; d.skips = 0; d.turn++;
  if (d.left <= 0) d.done = true;
  return true;
}
export function draftSkip(d, name) {
  if (d.done || draftWho(d) !== name) return false;
  d.skips++; d.turn++;
  if (d.skips >= d.order.length) d.done = true;
  return true;
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
