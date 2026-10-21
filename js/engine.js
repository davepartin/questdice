// QuestDice engine — pure rules, no DOM. Everything random flows through an injected rng so
// battles are reproducible and the balance simulator (tools/sim.mjs) can run the same code.

import {
  ROLE, LANES, CARDINALS, MAGIC_CAP, MAX_LEVEL, SYNERGY_BONUS, TRIPLE_BY_ACT, HEAL_COST,
  HEAL_AMOUNT, NUDGE_COST, RECHARGE_COST, START_MAGIC, REROLL_DICE, REROLL_DIE_COST, REROLL_DICE_MAX, RES_BY_SIZE, FACE_PAY, SPEED_STEPS, HEART_AMP, HEART_COLOR_BONUS, STRAIGHT_MIN,
  STRAIGHT, RARITY_WEIGHTS, RARITY_SELL, WEAPONS, LOOT_WEIGHTS, START_DICE, UNLOCK_COST, DIFFICULTY, normalizeDifficulty, ENCOUNTER, TALENT_SYMS, TALENT_MAX_SAME, talentFaceCost, talentFaceNum, POWER_UPGRADE, TALENT_PER_FACE, TALENT_SLOT_COST, TALENT_FACES, CLASS_TALENT, RULES, STRENGTH_STEPS, POWER_LEARN, POWER_SLOTS,
  SPECIAL_STEPS, MIND_STEPS, NEXT_SIZE, PREV_SIZE, DOWNGRADE_COST, dieCapForAct, ROMAN, xpToNext, CLASSES, PERKS, MONSTERS, ACTS, QUESTS_PER_ACT, ELITE_STEPS,
  PARTY, LEVEL_STRENGTH, ENEMY_CAP, ORDINARY, SET_PIECE, ACT_GOLD, WEAPON_DICE, DIAMOND, CHARMS, CHARM_MAX, CHARM_CHANCE, CHARM_PRICE, FORGE_COST, WEAPON_SIZE_STEPS, ACT_HP, ACT_FLAT, STEP_HP, PERIL, POINTS, PLACE_GOLD, TEAM_TRIPLE_BONUS, MORAL_BOOST, SHARE_MAGIC, REVIVE_COST, REVIVE_HP, POTION_BELT, POTION_PRICE, POTION_HEAL, POTION_START, RARITY_MULT, SIZE_VALUE, SELL_SHARE, BAG_MAX, DROP_SIZES, POWER_LEVEL_FRAC, POWER_LEVEL_MIN, CHARGE_LEVEL_FRAC, CHARGE_STEP, WEAR_BATTLES, SPOILS_RARITY, STORE_RARITY, RARITY,
  colorIdOf, uniqueColors, landsOf, stepKind,
  LEGENDARY, LEGENDARY_CHANCE, isLegendary, PETS, PET_PRICE, PET_POWER, PET_GROW, petKindMax, BREATH_SHARE, FLEE_REWARD,
  STORE_TONICS, STORE_TONICS_SHOWN, BUNDLE_ODDS, bundlePrice,
} from './data.js';
import { monsterOf as packMonster, actsOf as packActs, packIdOf, bansOf } from './campaigns.js';

const mdef = (id, camp) => packMonster(id, camp) || MONSTERS[id];
const campOfBattle = (b) => b?.hero?.campaign || b?.fighters?.[0]?.hero?.campaign;
const mof = (id, b) => mdef(id, campOfBattle(b));

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
// A table played online keeps its own count, so every phone hands out the same ids (see table.js command).
export const uidCount = (n) => { if (n != null) uidCounter = n; return uidCounter; };
export const newUid = (rng) => `u${(++uidCounter).toString(36)}${Math.floor((rng ? rng() : Math.random()) * 1e6).toString(36)}`;

// ------------------------------------------------------------------------------- weapons
// A weapon's faces. SIZE (inst.size, default d4) sets how many faces and so the number range; TIER (inst.rarity) adds corner
// bonus symbols. Both raise the numbers of the weapon's own colour (see weaponFaces). Extra faces beyond the first four carry the next numbers.
export const weaponSize = (inst) => inst.size || 4;
// A weapon's faces: honest dice (Dave, Oct 2026). A dN never shows more than N; each temperament has its own custom faces for every
// size (data.js WEAPON_DICE), so size is the range: a bigger die has bigger numbers, more numbers for straights, and its blanks
// come up less often. Metal is the quality: a Bronze weapon from a d6 up is a little dull (its lowest number of its own colour
// is chipped blank, unless it is brutal; any better metal mends it), and every metal adds icons from the top face down. Three
// metals: Bronze 1 (on its top face), Silver about half its numbers with 2 on the top face, Gold every number with 3 on the top
// face (the crit: a 10 with three pierce arrows hits like a 13). A brutal weapon's top faces each carry an icon from Silver. A weapon in a
// smaller hand rolls, and is built, as the hand's size. A blank still sends the hand's Strength that way. Legendaries keep their faces.
// A Diamond's faces: no blanks, all its own colour, an icon on every face, and its top number a crit with three (pierce for a weapon
// that has it, heal for a guard that has it, else the weapon's first icon).
function diamondFaces(def, size) {
  const own = def.lean === 'def' ? 'b' : 'r';
  const vals = DIAMOND.dice[size] || DIAMOND.dice[Object.keys(DIAMOND.dice).map(Number).filter((n) => n <= size).pop() || 6];
  const kinds = [...new Set([...def.faces.flatMap((f) => Object.keys(f.fx || {})), ...(def.bonus || []).flatMap((b) => Object.keys(b.fx))])];
  const want = own === 'r' ? 'pierce' : 'heal'; const crit = kinds.includes(want) ? want : kinds[0] || want;
  const rest = kinds.filter((k) => k !== crit); const top = Math.max(...vals);
  return vals.map((v, i) => ({ v, c: own, fx: v === top ? { [crit]: 3 } : { [rest.length ? rest[i % rest.length] : crit]: 1 } }));
}
function legendaryFaces(def, size) {
  const faces = def.faces.map((f) => (f.fx ? { ...f, fx: { ...f.fx } } : { ...f }));
  const first = def.lean === 'def' ? 'b' : 'r'; const other = first === 'r' ? 'b' : 'r';
  for (let i = 4; i < size; i++) faces.push({ v: i + 1, c: (i - 4) % 3 === 2 ? other : first });
  return faces;
}
export function weaponFaces(inst, rollSize) {
  const def = WEAPONS[inst.id];
  if (inst.diamond) return diamondFaces(def, weaponSize(inst)); // a Diamond rolls at its full size in any hand
  const size = Math.min(weaponSize(inst), rollSize || weaponSize(inst));
  if (inst.id === 'fists') return def.faces.map((f) => ({ ...f }));
  if (def.legendary) return legendaryFaces(def, size);
  const own = def.lean === 'def' ? 'b' : 'r'; const other = own === 'r' ? 'b' : 'r';
  const temper = WEAPON_DICE[def.temper] ? def.temper : 'balanced'; const tier = Math.min(2, inst.rarity | 0);
  const faces = (WEAPON_DICE[temper][size] || WEAPON_DICE[temper][4]).map((f) => (typeof f !== 'object' ? { v: f, c: own } : f.plus ? { v: f.v, c: own, plus: f.plus } : { v: f.v, c: other }));
  const hit = (f) => f.v + (f.plus || 0); // what a face hits for (its number, plus any attack/block icons)
  if (tier === 0 && size >= 6 && temper !== 'brutal') { // a cheap Bronze weapon is a little dull: its lowest number of its own colour is chipped blank (a brutal one, already mostly blank, is dull by bare tops instead)
    let lo = -1; faces.forEach((f, k) => { if (f.c === own && f.v > 0 && (lo < 0 || f.v < faces[lo].v)) lo = k; });
    if (lo >= 0) faces[lo] = { v: 0, c: own };
  }
  const kinds = [...new Set([...def.faces.flatMap((f) => Object.keys(f.fx || {})), ...(def.bonus || []).flatMap((b) => Object.keys(b.fx))])];
  if (!kinds.length) kinds.push(own === 'r' ? 'pierce' : 'heal');
  // icons from the top face down: its own colour first (highest number, then the later face), the other colour only on Gold
  const live = faces.map((f, k) => ({ f, k })).filter((x) => x.f.v > 0 && (x.f.c === own || tier >= 2))
    .sort((a, b) => (a.f.c === own ? 0 : 1) - (b.f.c === own ? 0 : 1) || hit(b.f) - hit(a.f) || b.f.v - a.f.v || b.k - a.k);
  const n = live.length; const count = Math.min(n, tier >= 2 ? n : tier === 1 ? Math.max(2, Math.ceil(n / 2)) : 1);
  const top = live[0] ? hit(live[0].f) : 0; const crit = [1, 2, 3][tier];
  live.forEach((x, i) => {
    const brutalTop = temper === 'brutal' && tier >= 1 && hit(x.f) === top && x.f.c === own; // every face that hits for the top
    if (i >= count && !brutalTop) return;
    x.f.fx = { [kinds[i % kinds.length]]: i === 0 ? crit : 1 };
  });
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

// ---- Diamond weapons (Dave, Oct 2026): one fight each, at most two carried (DIAMOND in data.js).
export function makeDiamond(rng, act = 1) {
  const id = pick(rng, DIAMOND.pool); const size = DIAMOND.sizeByAct[Math.min(3, Math.max(1, act)) - 1];
  return { uid: newUid(rng), id, rarity: 3, size, diamond: true };
}
export const diamondsOf = (hero) => hero.diamonds || []; // (reading never adds an empty case; takeDiamond makes it)
export const diamondCaseFull = (hero) => (hero.diamonds || []).length >= DIAMOND.max; // a look, so it never adds an empty case to a hero
// Selling a Diamond (Dave): it is made to be used, so it sells for what the plain weapon of its kind and size would, nothing more.
export const diamondSellValue = (inst) => sellValue({ id: inst.id, rarity: 0, size: inst.size });
export function sellDiamond(hero, uid) {
  const i = diamondsOf(hero).findIndex((d) => d.uid === uid); if (i < 0) return false;
  const [d] = diamondsOf(hero).splice(i, 1); armDiamond(hero, uid, null); hero.gold += diamondSellValue(d); return true;
}
export function takeDiamond(hero, inst) { if (!inst?.diamond || diamondCaseFull(hero)) return false; (hero.diamonds ||= []).push(inst); return true; }
// Which hands can hold a Diamond: the left always; the right when you have a right-hand weapon die, or a two-handed weapon fills both.
export const diamondHands = (hero) => ['NW', 'NE'].filter((s) => s === 'NW' || isActive(hero, s));
// Bring a Diamond into the next fight in a hand (or null to leave it in its case). Two Diamonds can go, one in each hand.
export function armDiamond(hero, uid, slot) {
  const a = (hero.armed ||= {});
  for (const k of ['NW', 'NE']) if (a[k] === uid) delete a[k];
  if (slot && diamondHands(hero).includes(slot) && diamondsOf(hero).some((d) => d.uid === uid)) a[slot] = uid;
  if (!a.NW && !a.NE) delete hero.armed;
  return true;
}
export const armedSlot = (hero, uid) => ['NW', 'NE'].find((k) => hero.armed?.[k] === uid) || null;
// The fight begins: each armed Diamond leaves its case and takes its hand; the weapons it replaces wait in hero.lent. A two-handed
// weapon is set aside whole, and a single Diamond then fills both hands (as the two-hander did).
export function wieldDiamonds(hero) {
  const a = hero.armed; delete hero.armed; if (!a || hero.lent) return [];
  const take = (uid) => { const i = diamondsOf(hero).findIndex((d) => d.uid === uid); return i < 0 ? null : diamondsOf(hero).splice(i, 1)[0]; };
  const pick2 = { NW: a.NW && take(a.NW), NE: a.NE && take(a.NE) };
  if (!pick2.NW && !pick2.NE) return [];
  const two = isTwoHanded(hero);
  hero.lent = { NW: hero.loadout.NW, NE: hero.loadout.NE ?? null, dice: hero.dice ? [...hero.dice] : null };
  if (two) { // a two-handed weapon is set aside whole; one Diamond then fills both hands, as the two-hander did
    const one = pick2.NW || pick2.NE;
    hero.loadout.NW = pick2.NW || pick2.NE; hero.loadout.NE = pick2.NW && pick2.NE ? pick2.NE : { ...one, uid: `${one.uid}~R`, twin: true };
    if (hero.dice && !hero.dice.includes('NE')) hero.dice = [...hero.dice, 'NE'];
  }
  else for (const k of ['NW', 'NE']) if (pick2[k]) hero.loadout[k] = pick2[k];
  hero.wielding = [pick2.NW, pick2.NE].filter(Boolean);
  return hero.wielding;
}
// The fight is over (won, lost or left): the Diamonds shatter and the hands get their own weapons back, and every weapon that was in
// a hand wears a battle (a weapon set aside for a Diamond does not). Returns what shattered; what broke is left in hero.justBroke.
export function shatterDiamonds(hero) {
  if (!hero?.loadout) return [];
  const skip = new Set(['NW', 'NE'].filter((k) => hero.loadout[k]?.diamond)); // hands a Diamond held this fight
  let gone = [];
  if (hero.lent) {
    const L = hero.lent; hero.loadout.NW = L.NW; if (L.NE) hero.loadout.NE = L.NE; else delete hero.loadout.NE;
    if (L.dice) hero.dice = L.dice; else delete hero.dice;
    gone = hero.wielding || []; delete hero.lent; delete hero.wielding;
  }
  const broke = wearHands(hero, skip);
  if (broke.length) hero.justBroke = [...(hero.justBroke || []), ...broke]; // the victory or defeat screen says so, then clears it
  return gone;
}
// ---- wear (Oct 2026): battles a weapon lasts, and how many it has left. Fists and Diamonds never wear here.
export const battlesFull = (inst) => (!inst || inst.id === 'fists' || inst.diamond ? Infinity : WEAR_BATTLES[isLegendary(inst) ? 2 : Math.min(2, inst.rarity | 0)]);
export const battlesLeft = (inst) => { const f = battlesFull(inst); return f === Infinity ? Infinity : Math.max(0, Math.min(f, inst.left ?? f)); };
// One battle off every weapon in the hands (a two-hander counts once). A weapon with none left breaks: its hand is empty.
// A hero is never left with nothing at all: with empty hands and an empty pack, a plain Bronze weapon of the class is waiting.
export function wearHands(hero, skip = new Set()) {
  const broke = [];
  for (const k of ['NW', 'NE']) {
    const w = hero.loadout[k]; if (!w || w.id === 'fists' || w.twin || w.diamond || skip.has(k)) continue;
    w.left = battlesLeft(w) - 1;
    const two = WEAPONS[w.id]?.hands === 2;
    if (two && hero.loadout.NE?.twin) hero.loadout.NE.left = w.left;
    if (w.left > 0) continue;
    broke.push({ id: w.id, rarity: w.rarity | 0, size: weaponSize(w) });
    if (two) { hero.loadout.NW = fists('L'); hero.loadout.NE = fists('R'); } else hero.loadout[k] = fists(k === 'NW' ? 'L' : 'R');
  }
  const empty = ['NW', 'NE'].every((k) => !hero.loadout[k] || hero.loadout[k].id === 'fists');
  if (broke.length && empty && !hero.bag.length) {
    const id = CLASSES[hero.cls]?.weapons?.[0] || 'sword'; const c = hero.campaign || {};
    const w = makeWeapon(id, 0, makeRng(hashSeed(c.seed || 1, c.act || 1, c.step || 1, 'spare', hero.stats?.battles || 0)));
    hero.loadout.NW = w; if (WEAPONS[id].hands === 2) hero.loadout.NE = twinOf(w);
    hero.justSpare = id;
  }
  return broke;
}
// What broke after the last fight (and the plain weapon waiting, if both hands came up empty), for the victory or defeat screen.
// Reading it clears it.
export function takeBroken(hero) { const broke = hero?.justBroke || []; const spare = hero?.justSpare || null; if (hero) { delete hero.justBroke; delete hero.justSpare; } return { broke, spare }; }
export function brokenLine({ broke, spare }) {
  if (!broke?.length) return '';
  const names = broke.map((w) => `${RARITY[w.rarity] || ''} ${WEAPONS[w.id]?.name || 'weapon'}`.trim());
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return `Your ${list} ${names.length > 1 ? 'are' : 'is'} worn out after this battle.${spare ? ` A plain Bronze ${WEAPONS[spare]?.name || 'weapon'} is waiting.` : ' Equip a spare from your pack at camp.'}`;
}
// What a weapon card says about its wear: "3 battles left", or "one fight" for a Diamond.
export function wearLabel(inst) {
  if (!inst || inst.id === 'fists') return ''; if (inst.diamond) return 'one fight';
  const n = battlesLeft(inst); return `${n} battle${n === 1 ? '' : 's'} left`;
}
export const isTwoHanded = (hero) => WEAPONS[hero.loadout.NW.id].hands === 2;

// ------------------------------------------------------------------------------- heroes
export function newHero({ name, cls, seed, full = false, color, pack } = {}) {
  const c = CLASSES[cls];
  const rng = makeRng(hashSeed(name, cls, seed ?? Date.now()));
  const loadout = {};
  if (c.weapons.length === 1) { const w = makeWeapon(c.weapons[0], 0, rng); loadout.NW = w; loadout.NE = twinOf(w); }
  else { loadout.NW = makeWeapon(c.weapons[0], 0, rng); loadout.NE = makeWeapon(c.weapons[1], 0, rng); }
  const packId = packIdOf(pack);
  return {
    v: 1, name, cls, color: colorIdOf({ cls, color }), level: 1, xp: 0, gold: 0, perks: [], pendingPerks: 0, potions: POTION_START,
    // slow classes (hands: 6) start with ONE d6 hand: the left, weapon hand
    strength: { W: c.hands || 4, E: 4 }, special: { SW: 4, SE: 4 }, talent: { SW: [[CLASS_TALENT[cls].SW]], SE: [[CLASS_TALENT[cls].SE]] }, dice: full ? null : [...START_DICE], difficulty: 'normal', loadout, bag: [],
    campaign: { pack: packId, act: 1, step: 1, seed: (seed ?? Math.floor(Math.random() * 1e9)) >>> 0, shop: null, wins: 0, nemeses: [], blessings: [], chronicle: [] },
    stats: { battles: 0, defeats: 0, rounds: 0, triples: 0, straights: 0, goldEarned: 0 },
    created: Date.now(),
  };
}

export function heroMods(hero) {
  const m = { maxHp: 0, startMagic: 0, rerollDice: 0, redBonus: 0, blueBonus: 0, pierceBonus: 0, goldPct: 0, lastStandHp: 0, healCost: 0, tripleBonus: 0 };
  for (const id of hero.perks) for (const [k, v] of Object.entries(PERKS[id].mod)) m[k] += v;
  return m;
}
// ---- charms (data.js CHARMS): rule-benders, three at most
export const charmsOf = (hero) => (hero?.charms || []).filter((id) => CHARMS[id]);
export const hasCharm = (hero, id) => !!hero?.charms?.includes(id);
export const charmFull = (hero) => charmsOf(hero).length >= CHARM_MAX;
export function takeCharm(hero, id) { if (!CHARMS[id] || hasCharm(hero, id) || charmFull(hero)) return false; (hero.charms ||= []).push(id); return true; }
export function dropCharm(hero, id) { const i = (hero.charms || []).indexOf(id); if (i < 0) return false; hero.charms.splice(i, 1); return true; }
// charms you could be offered: ones you do not hold, picked by a seeded rng
export function charmChoices(hero, rng, n = 1) { const pool = Object.keys(CHARMS).filter((id) => !hasCharm(hero, id)); const out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]); return out; }
export const maxHpOf = (hero) => CLASSES[hero.cls].hp + 4 * (hero.level - 1) + heroMods(hero).maxHp + (hero.bonusHp || 0);
export const startMagicOf = (hero) => (CLASSES[hero.cls]?.startMagic ?? START_MAGIC) + heroMods(hero).startMagic;
export const magicCapOf = (hero) => CLASSES[hero?.cls]?.magicCap ?? MAGIC_CAP;
export const healAmountOf = () => HEAL_AMOUNT; // Heal with Magic is the same for every hero (Dave): 2 magic for 4 health, no class or perk changes it
export const powerLevelsOf = (hero) => Math.min(POWER_UPGRADE.length, CLASSES[hero?.cls]?.powerLevels ?? 3);
export const maxFeetOf = (hero) => CLASSES[hero?.cls]?.maxFeet ?? 6;
export const rerollTotal = () => RULES.free + RULES.paid;
export const rerollDiceOf = (hero) => Math.min(REROLL_DICE_MAX, REROLL_DICE + (hero.rerollDie ? 1 : 0) + heroMods(hero).rerollDice);
// The 4th reroll die: bought once at camp for REROLL_DIE_COST gold.
export function rerollDieInfo(hero) {
  const cur = rerollDiceOf(hero);
  if (cur >= REROLL_DICE_MAX) return { ok: false, why: 'Max', cur };
  if (hero.gold < REROLL_DIE_COST) return { ok: false, why: 'Need gold', cost: REROLL_DIE_COST, next: cur + 1, cur };
  return { ok: true, cost: REROLL_DIE_COST, next: cur + 1, cur };
}
export function buyRerollDie(hero) { const r = rerollDieInfo(hero); if (!r.ok) return false; hero.gold -= r.cost; hero.rerollDie = true; return true; }
export const healCostOf = (hero, b = null) => HEAL_COST + (b?.healsRound || 0); // each further heal in the same round costs 1 more
// Powers: three slots (A big move, B every round, C charge), one power in each. hero.powers = { A: id, B: id, C: id };
// a slot nobody chose holds the class's `start` power. hero.learned lists powers bought from the class library at camp.
const libraryOf = (hero) => CLASSES[hero.cls].cards;
const startPower = (hero, slot) => libraryOf(hero).find((c) => c.slot === slot && c.start);
export const powerLearned = (hero, id) => !!libraryOf(hero).find((c) => c.id === id && (c.start || (hero.learned || []).includes(id)));
export function cardsOf(hero) {
  return POWER_SLOTS.map((slot) => {
    const want = libraryOf(hero).find((c) => c.id === hero.powers?.[slot] && c.slot === slot);
    return want && (want.unlock ?? 1) <= hero.level && powerLearned(hero, want.id) ? want : startPower(hero, slot);
  }).filter(Boolean);
}
// The whole class library for camp: what each power is, whether it is learned, equipped, or waits on a level.
export function powerLibrary(hero) {
  const eq = new Set(cardsOf(hero).map((c) => c.id));
  return libraryOf(hero).map((c) => ({ card: c, learned: powerLearned(hero, c.id), equipped: eq.has(c.id), gate: (c.unlock ?? 1) > hero.level ? c.unlock : 0 }));
}
export function learnInfo(hero, id) {
  const c = libraryOf(hero).find((x) => x.id === id); if (!c) return { ok: false, why: 'unknown' };
  if (powerLearned(hero, id)) return { ok: false, why: 'learned' };
  if ((c.unlock ?? 1) > hero.level) return { ok: false, why: `Level ${c.unlock}`, cost: POWER_LEARN };
  if (hero.gold < POWER_LEARN) return { ok: false, why: 'Need gold', cost: POWER_LEARN };
  return { ok: true, cost: POWER_LEARN };
}
export function learnPower(hero, id) {
  const r = learnInfo(hero, id); if (!r.ok) return false;
  hero.gold -= r.cost; hero.learned = [...(hero.learned || []), id]; equipPower(hero, id); return true;
}
export function equipPower(hero, id) {
  const c = libraryOf(hero).find((x) => x.id === id);
  if (!c || !powerLearned(hero, id) || (c.unlock ?? 1) > hero.level) return false;
  hero.powers = { ...(hero.powers || {}), [c.slot]: id }; return true;
}

// ------------------------------------------------------------------------------- dice
// Which dice are on the hero's board. `dice: null` means all nine (older saves). A two-handed weapon always fills both weapon dice.
export function isActive(hero, slot) {
  if (slot === 'P') return !!hero.pet; // the pet die only exists once a pet is bought
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
// The head die (wisdom): every hero starts with a d4 and grows it at camp.
export function mindSize(hero) { hero.mind = hero.mind || { N: 4 }; return hero.mind.N; }
export function mindUpgrade(hero) {
  const size = mindSize(hero); const step = MIND_STEPS[size];
  if (!step) return { ok: false, why: 'Max size' };
  { const g = actGate(hero, size); if (g) return { ...g, cost: step[0] }; }
  if (hero.gold < step[0]) return { ok: false, why: 'Need gold', cost: step[0], next: NEXT_SIZE[size] };
  return { ok: true, cost: step[0], next: NEXT_SIZE[size] };
}
export function speedUpgrade(hero) {
  const size = feetSize(hero); const step = size < maxFeetOf(hero) ? SPEED_STEPS[size] : null;
  if (!step) return { ok: false, why: 'Max size' };
  if (hero.gold < step[0]) return { ok: false, why: 'Need gold', cost: step[0], next: NEXT_SIZE[size] };
  return { ok: true, cost: step[0], next: NEXT_SIZE[size] };
}
export function sidesOf(hero, slot) {
  switch (ROLE[slot]) {
    case 'head': return mindSize(hero);
    case 'feet': return Math.max(feetSize(hero), borrowedFeet(hero)); // borrowed boots from an encounter, for one fight
    case 'weapon': return hero.loadout[slot]?.diamond ? weaponSize(hero.loadout[slot]) : Math.min(weaponSize(hero.loadout[slot]), hero.strength[slot === 'NW' ? 'W' : 'E']); // the hand holding it is the ceiling (a Diamond ignores it)
    case 'heart': return 6;
    case 'hand': return hero.strength[slot];
    case 'special': return hero.special[slot];
    case 'pet': return hero.pet?.size || 4;
    default: throw new Error(`bad slot ${slot}`);
  }
}
// Talent die faces (Dave, Oct 2026): 1 and 3 blank, 2 = 2x, 4+ = number faces that pay their number in the symbol bought for them. Returns
// null (blank or not bought yet), 'X2', or [symbol] (older saves kept several per face: only the first counts now). Every number on a talent
// die, the 2x as a 2 and an unbought 4+ included, also counts toward straights (talentNumber).
export const talentNumber = (v) => (v === 1 || v === 3 ? 0 : v); // what a talent face counts as in a straight (its blanks count as nothing)
export function specialFace(hero, slot, v) {
  const n = hero.special[slot];
  if (v < 1 || v > n || v === 1 || v === 3) return null;
  if (v === 2) return 'X2';
  const entry = hero.talent?.[slot]?.[v - 4]; const sym = Array.isArray(entry) ? entry[0] : entry;
  return sym ? [sym] : null;
}
// ---- the pet die: face 1 is always blank; faces 2..n hold symbols (hero.pet.faces[v - 2])
export function petFace(hero, v) {
  const p = hero.pet; if (!p || v <= 1 || v > p.size) return null;
  const syms = p.faces?.[v - 2] || []; return syms.length ? syms : null;
}
export const petPowerOf = (hero) => PET_POWER[hero.pet?.size || 4] || 2;
export function newPet(type) { const k = PETS[type].kind; return { type, size: 4, faces: [[k], [k], []] }; }
// The Camp Store's pet this camp (one a visit, by the campaign seed), unless the hero already has that one.
export function petOffer(hero) {
  const c = hero.campaign; if (!c) return null;
  const types = Object.keys(PETS); const r = makeRng(hashSeed(c.seed, c.act, c.step, 'pet'));
  const type = types[Math.floor(r() * types.length)];
  return { type, price: PET_PRICE, owned: !!hero.pet && PETS[hero.pet.type] === PETS[type] };
}
export function buyPet(hero) {
  const o = petOffer(hero); if (!o || o.owned || hero.gold < o.price) return false;
  hero.gold -= o.price; hero.pet = newPet(o.type); return true;
}
export function petTrainInfo(hero) {
  const p = hero.pet; if (!p) return null;
  return { faces: p.size - 1, slots: (p.size - 1) * TALENT_PER_FACE, used: p.faces.flat().length, cost: TALENT_SLOT_COST };
}
export function addPetSymbol(hero, face, sym) {
  const p = hero.pet; if (!p || !(TALENT_SYMS[sym] || sym === PETS[p.type].kind)) return false; // a pet's own symbol may be one talents lack (pierce)
  const t = petTrainInfo(hero); if (face < 0 || face >= t.faces || hero.gold < t.cost) return false;
  while (p.faces.length < t.faces) p.faces.push([]);
  const have = p.faces.flat().filter((x) => x === sym).length; const cap = sym === PETS[p.type].kind ? petKindMax(p.size) : TALENT_MAX_SAME;
  if (p.faces[face].length >= TALENT_PER_FACE || have >= cap) return false;
  hero.gold -= t.cost; p.faces[face].push(sym); return true;
}
export function removePetSymbol(hero, face, idx) { const f = hero.pet?.faces?.[face]; if (!f || idx < 0 || idx >= f.length) return false; f.splice(idx, 1); return true; }
export function petGrowInfo(hero) {
  const p = hero.pet; if (!p) return null; const cost = PET_GROW[p.size];
  if (!cost) return { ok: false, why: 'Max', cur: p.size };
  return { ok: hero.gold >= cost, why: hero.gold >= cost ? '' : 'Need gold', cost, cur: p.size, next: p.size + 2 };
}
export function growPet(hero) { const r = petGrowInfo(hero); if (!r?.ok) return false; hero.gold -= r.cost; hero.pet.size = r.next; while (hero.pet.faces.length < r.next - 1) hero.pet.faces.push([]); return true; }
export const talentCount = (hero, slot, sym) => (hero.talent?.[slot] || []).flat().filter((x) => x === sym).length;
export function talentInfo(hero, slot) {
  const size = hero.special[slot]; const faces = TALENT_FACES[size] || 1; const cur = hero.talent?.[slot] || [];
  const nums = Array.from({ length: faces }, (_, i) => talentFaceNum(i));
  return { faces, nums, costs: nums.map(talentFaceCost), same: TALENT_MAX_SAME, used: cur.filter((e) => (Array.isArray(e) ? e.length : e)).length };
}
// Buy a symbol for a number face (0-based; face 0 is the 4). Pay once for the face, more the bigger its number. Pierce is never offered,
// a face that already has a symbol must be cleared first, and a die carries at most two of one symbol.
export function addTalent(hero, slot, face, sym) {
  if (!TALENT_SYMS[sym]) return false;
  const t = talentInfo(hero, slot); if (face < 0 || face >= t.faces) return false;
  const cost = t.costs[face]; if (hero.gold < cost) return false;
  hero.talent = hero.talent || {}; const faces = (hero.talent[slot] = hero.talent[slot] || []);
  while (faces.length < t.faces) faces.push([]);
  if ((Array.isArray(faces[face]) ? faces[face].length : faces[face]) || talentCount(hero, slot, sym) >= t.same) return false;
  hero.gold -= cost; faces[face] = [sym]; return true;
}
export function removeTalent(hero, slot, face, idx = 0) {
  const f = hero.talent?.[slot]?.[face]; if (!f || !f.length || idx < 0 || idx >= f.length) return false; f.splice(idx, 1); return true;
}
export function rollSlot(hero, slot, rng) { return { v: die(rng, sidesOf(hero, slot)), bound: false }; }
export function rollBoard(hero, rng) {
  const board = {};
  for (const s of Object.keys(ROLE)) board[s] = s === 'P' && !hero.pet ? { v: 1, bound: false } : rollSlot(hero, s, rng); // no pet: no roll (keeps the dice stream the same)
  if (hasCharm(hero, 'heartstone')) { const again = rollSlot(hero, 'C', rng); if (again.v > board.C.v) board.C = again; } // Heartstone: the better of two
  return board;
}

// The feet die pays symbols like the head and hands, and its number is also the INITIATIVE (who acts first).
const PAYERS = CARDINALS; // head, hands and feet all pay their symbols; the feet number is ALSO the initiative
// ------------------------------------------------------------------------------- evaluation
// Turns a locked board into resource totals. This is also the live "forecast" the UI shows.
// What one triple pays this act: 10 / 15 / 20 (attack or block). A team triple adds the same again.
export function tripleBonus(hero) { const a = Math.min(3, Math.max(1, hero?.campaign?.act || 1)); return TRIPLE_BY_ACT[a - 1] ?? SYNERGY_BONUS; }
// How long a straight must be (Dave, Oct 2026: with nine dice and talent faces a straight came most rounds). It grows with the
// hero's biggest body die (head, hands, feet), so it stays special as the dice grow: d4 five in a row, d6 six, d8 and d10 seven.
export function straightMin(hero) {
  const big = Math.max(...['N', 'W', 'E', 'S'].map((s) => sidesOf(hero, s) || 4));
  return STRAIGHT_MIN[big] ?? (big >= 8 ? 7 : big >= 6 ? 6 : 5);
}
export function evaluate(hero, board, opts = {}) {
  const mods = heroMods(hero);
  const BONE = new Set(['N', 'W', 'E', 'S']); const boneOn = hasCharm(hero, 'bone'); // Gambler's Bone: a 1 on a white die is a 6
  const bone = boneOn && [...BONE].some((s) => board[s]?.v === 1);
  const val = (s) => (boneOn && BONE.has(s) && board[s].v === 1 ? 6 : board[s].v);
  const TRIPLE = (tripleBonus(hero) + mods.tripleBonus) * (hasCharm(hero, 'fang') ? 2 : 1); // Line Breaker adds 2 a rank; Wolf Fang doubles the lot
  const out = {
    init: val('S'), atk: 0, block: 0, pierce: 0, heal: 0, magic: 0, gold: 0, splash: 0,
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
  const hushed = !!(opts.hushed || board.C?.hushed);
  if (hushed) { out.heart = 0; out.notes.push('Heart hushed'); }
  if (hv <= 4 && !hushed) {
    // Dave, Oct 2026: the heart backs its SYMBOL, not just its number, so it stays useful as the dice grow: a heart 1 (heal)
    // boosts every head / hand / feet die showing a heal face (1, 5 or 9); 2 pierce (2, 6, 9); 3 magic (3, 7, 10); 4 gold (4, 8, 10).
    const sym = ['heal', 'pierce', 'magic', 'gold'][hv - 1];
    const hit = PAYERS.filter((s) => FACE_PAY[val(s)]?.[sym]); out.heartSlots = hit;
    const matches = hit.length;
    const amp = HEART_AMP[hv - 1] * matches;
    if (hv === 1) out.heal += amp; else if (hv === 2) out.pierce += amp; else if (hv === 3) out.magic += amp; else out.gold += amp;
    if (matches) out.notes.push(`Heart ${hv} amplifies ${matches}`);
  }

  // Lanes: weapon (color + number) + hand strength (doubled by 2x); a talent number face pays its number in its symbol.
  for (const [key, lane] of Object.entries(LANES)) {
    if (!isActive(hero, lane.weapon)) continue; // no weapon on this side yet
    const inst = hero.loadout[lane.weapon];
    const wf = weaponFaces(inst, sidesOf(hero, lane.weapon))[val(lane.weapon) - 1];
    const str = val(lane.hand);
    const sym = isActive(hero, lane.special) ? specialFace(hero, lane.special, val(lane.special)) : null;
    const x2 = sym === 'X2'; const tsyms = Array.isArray(sym) ? sym : [];
    const plus = (wf.plus || 0) * (hasCharm(hero, 'thorns') ? 2 : 1); // Thorn Crown doubles every weapon icon, these too
    let value = wf.v + plus + str + (x2 ? str : 0); // a face's attack/block icons add to what it hits for (its number alone counts for triples and straights)
    if (wf.c === 'r') value += mods.redBonus; else value += mods.blueBonus;
    const L = { key, slot: lane.weapon, color: wf.c, weapon: wf.v, plus, str, sym: x2 ? 'SURGE' : tsyms.length ? tsyms : null, value, amp: 0, fx: wf.fx || null };
    if (wf.fx) {
      const x = (n) => (hasCharm(hero, 'thorns') ? n * 2 : n); // Thorn Crown: weapon icons count double
      out.pierce += x(wf.fx.pierce || 0); out.magic += x(wf.fx.magic || 0); out.heal += x(wf.fx.heal || 0);
      out.gold += x(wf.fx.loot || 0); out.splash += x(wf.fx.splash || 0);
    }
    if (wf.v === 0 && hasCharm(hero, 'ember')) { out.atk += 6; out.magic += 2; out.notes.push('Ember Locket +6 attack, +2 magic'); }
    for (const t of tsyms) out[t] = (out[t] || 0) + val(lane.special); // a number face pays its number in its symbol (face 6 with magic = 6 magic)
    out.lanes[key] = L;
  }
  // The pet die: each symbol on the face it shows pays the pet's power.
  if (isActive(hero, 'P') && board.P) {
    const syms = petFace(hero, val('P')) || []; const pw = petPowerOf(hero);
    for (const t of syms) out[t] = (out[t] || 0) + pw;
    out.pet = { syms, power: pw };
  }
  // Heart 5 gives +4 block to every blue weapon lane, heart 6 +4 attack to every red weapon lane.
  if (hv >= 5 && !hushed) {
    const want = hv === 5 ? 'b' : 'r'; let n = 0;
    for (const l of Object.values(out.lanes)) if (l.color === want) { l.value += HEART_COLOR_BONUS; l.amp = HEART_COLOR_BONUS; n++; }
    if (n) out.notes.push(`Heart ${hv}: +${HEART_COLOR_BONUS} ${want === 'r' ? 'attack' : 'block'} on ${n} weapon${n > 1 ? 's' : ''}`);
  }
  for (const l of Object.values(out.lanes)) { if (l.color === 'r') out.atk += l.value; else out.block += l.value; }

  // Triples. Across (top row: weapon, head, weapon by the weapons' +N; middle row: hand, heart, hand; bottom row: talent, feet, talent) = +10 attack each (15 in Act II, 20 in Act III: tripleBonus).
  // Down (head, heart, feet, and the two side columns below) = +10 block. Every die in the line must be in play; a +0 weapon never matches.
  out.triples = [];
  if (isActive(hero, 'NW') && isActive(hero, 'NE')) {
    const a = weaponFaces(hero.loadout.NW, sidesOf(hero, 'NW'))[val('NW') - 1].v;
    const b = weaponFaces(hero.loadout.NE, sidesOf(hero, 'NE'))[val('NE') - 1].v;
    if (a === b && b === val('N') && a > 0) { out.triples.push({ slots: ['NW', 'N', 'NE'], kind: 'atk', row: 'weapons', name: 'Weapons Triple' }); out.atk += TRIPLE; }
    // Twinfang's twin shot: the bow and its arrows on the same number add a little more attack
    const tw = WEAPONS[hero.loadout.NW.id].twinShot;
    if (tw && hero.loadout.NE?.id === hero.loadout.NW.id && a === b && a > 0) { out.atk += tw; out.twinShot = tw; out.notes.push(`Twin shot +${tw}`); }
  }
  if (!hushed && isActive(hero, 'W') && isActive(hero, 'E') && val('W') === val('C') && val('C') === val('E')) { out.triples.push({ slots: ['W', 'C', 'E'], kind: 'atk', row: 'strength', name: 'Strength Triple' }); out.atk += TRIPLE; }
  // Talent Triple (Dave, Oct 2026): the bottom row, talent, feet, talent, on the same number = +10 attack (a talent blank never matches; the 2x is a 2)
  if (!hushed && isActive(hero, 'SW') && isActive(hero, 'SE')) { const a = talentNumber(val('SW')); if (a > 0 && a === talentNumber(val('SE')) && a === val('S')) { out.triples.push({ slots: ['SW', 'S', 'SE'], kind: 'atk', row: 'talents', name: 'Talent Triple' }); out.atk += TRIPLE; } }
  if (!hushed && val('N') === val('C') && val('C') === val('S')) { out.triples.push({ slots: ['N', 'C', 'S'], kind: 'block', row: 'headtoe', name: 'Head to Toe Triple' }); out.block += TRIPLE; }
  // Side triples (Dave, Oct 2026): every row attacks, every column guards. Left column (weapon +N, hand, talent) and right
  // column on the same number = +10 block each (a +0 weapon or a talent blank never matches; the 2x is a 2).
  for (const [w, hd, t, row, name] of [['NW', 'W', 'SW', 'left', 'Left Guard Triple'], ['NE', 'E', 'SE', 'right', 'Right Guard Triple']]) {
    if (!isActive(hero, w) || !isActive(hero, hd) || !isActive(hero, t)) continue;
    const a = weaponFaces(hero.loadout[w], sidesOf(hero, w))[val(w) - 1].v;
    if (a > 0 && a === val(hd) && a === talentNumber(val(t))) { out.triples.push({ slots: [w, hd, t], kind: 'block', row, name }); out.block += TRIPLE; }
  }
  for (const t of out.triples) t.bonus = TRIPLE; // what each pays (Wolf Fang doubles it), for the banners
  out.offense3 = out.triples.some((t) => t.kind === 'atk'); out.defense3 = out.triples.some((t) => t.kind === 'block');

  // Straights across the numeric dice: head, hands, feet, heart, weapons, and the two talent dice (their 2, and 4 and up).
  // which die shows each number (the first one in board order), so the tray can light the dice that make the straight
  const numSlot = new Map();
  for (const k of ['NW', 'N', 'NE', 'W', 'C', 'E', 'S', 'SW', 'SE']) {
    if ((k === 'NW' || k === 'NE' || k === 'SW' || k === 'SE') && !isActive(hero, k)) continue;
    const v = k === 'NW' || k === 'NE' ? weaponFaces(hero.loadout[k], sidesOf(hero, k))[val(k) - 1].v : k === 'SW' || k === 'SE' ? talentNumber(val(k)) : val(k);
    if (v > 0 && !numSlot.has(v)) numSlot.set(v, k); // a blank is a miss, not a number
  }
  const sorted = [...numSlot.keys()].sort((x, y) => x - y);
  let best = 1, run = 1, top = sorted[0];
  for (let i = 1; i < sorted.length; i++) { run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1; if (run > best) { best = run; top = sorted[i]; } }
  if (best >= straightMin(hero)) {
    const keys = Object.keys(STRAIGHT).map(Number); best = Math.min(best, Math.max(...keys)); // a run past the table still pays its top prize
    out.straightSlots = Array.from({ length: best }, (_, i) => numSlot.get(top - best + 1 + i));
    out.straight = best; out.straightBonus = STRAIGHT[best];
    if ((opts.straight || 'atk') === 'gold') out.gold += out.straightBonus; else out.atk += out.straightBonus;
    if (hasCharm(hero, 'mirror')) { out.heal += 12; out.notes.push('Mirror Shard heals 12'); }
  }
  if (hasCharm(hero, 'twins') && out.lanes.L && out.lanes.R && out.lanes.L.weapon > 0 && out.lanes.L.weapon === out.lanes.R.weapon) { const tw = tripleBonus(hero); out.atk += tw; out.twinCoin = true; out.notes.push(`Twin Coin +${tw}`); }
  if (bone) out.notes.push('Gambler’s Bone: a 1 is a 6');
  out.gold = Math.round(out.gold * (1 + mods.goldPct));
  return out;
}

// ------------------------------------------------------------------------------- enemies
export function partyScale(players, heroes = null) {
  const i = Math.max(0, Math.min(5, players - 1));
  if (heroes && heroes.length > 1) { // the company's real strength (see PARTY in data.js)
    const m = teamFactor(heroes); const per = PARTY.flatBy?.[normalizeDifficulty(heroes[0]?.difficulty)] ?? PARTY.flatPer;
    return { hp: 1 + (m - 1) * PARTY.hpPer, adds: PARTY.adds[i], flat: Math.round((m - 1) * per), m };
  }
  return { hp: PARTY.hp[i], adds: PARTY.adds[i], flat: PARTY.flat?.[i] || 0, m: players };
}
// A hero's strength (Dave, Oct 2026: "the computer should know this is a good battle for this team"): an average throw's damage,
// magic (it feeds the powers), half its block and healing, and the health behind it (heroPower: level, dice, gear, talents, perks).
// Classes come out within ~15% of each other at the same point of the road; it grows ~4x from level 1 to level 10.
// (It measures a copy: rolling fills in a hero's default dice, and measuring must not change the hero.)
export function heroStrength(hero) { const P = heroPower(structuredClone(hero)); return Math.max(1, (P.dmg + 1.5 * P.magic + 0.5 * (P.block + P.heal)) * Math.sqrt(P.hp / 30)); }
// How many of its strongest hero a company is worth: 1 alone, 2 for an equal pair, ~1.4 for a level-4 hero with a level-1 friend.
// What a typical hero of this level is worth (LEVEL_STRENGTH, straight on past its end).
export function levelStrength(level) { const L = Math.max(1, level | 0); const T = LEVEL_STRENGTH; return L <= T.length ? T[L - 1] : T[T.length - 1] + (L - T.length) * 5.4; }
// For a story campaign whose fights are written for one hero of `level` (Grok's duo campaigns): how much tougher its monsters
// should be for these heroes, by their real strength against that level's typical hero. Same rules as a table (PARTY):
// { m, hp: monster health multiplier, flat: added to every hit }. Two typical heroes of that level: m 2, x2.2, +10;
// heroes who grew stronger than the story expects meet stronger monsters; a lone hero of that level gets x1, +0.
// (Rival Duo and That’s Not How It Went follow the road at a table, so newPartyBattle's teamFactor fits them already;
// storyScale is for a story that sets its fights by level instead of by the road. docs/TEAMS.md)
export function storyScale(heroes, level) {
  const m = Math.max(0.6, heroes.reduce((a, h) => a + heroStrength(h), 0) / levelStrength(level));
  return { m: +m.toFixed(2), hp: +(1 + (m - 1) * PARTY.hpPer).toFixed(2), flat: Math.max(0, Math.round((m - 1) * PARTY.flatPer)) };
}
export function teamFactor(heroes) { const s = heroes.map(heroStrength); const top = Math.max(...s); return s.reduce((a, x) => a + x, 0) / top; }
export function spawnEnemy(id, { hpMult = 1, flat = 0, rewardMult = 1, edge = null, campaign = null, name = null, teamFlat = 0 } = {}, rng) {
  const d = mdef(id, campaign);
  const hp = Math.max(1, Math.round(d.hp * hpMult));
  return {
    uid: newUid(rng), id, name: name || d.name, glyph: d.glyph, tier: d.tier, hp, maxHp: hp, powerDie: d.power,
    faces: d.faces, flat: flat + teamFlat, teamFlat, buff: 0, windup: false, raged: false, intent: null, p: 0, mag: 0,
    xp: Math.round(d.xp * rewardMult), gold: Math.round(d.gold * rewardMult),
    carried: 0, hpMult, rewardMult, armor: d.armor ? { ...d.armor } : null, arm: 0, edge,
    // pounce is a round flag (true after an unbroken Stalk), not the sheet's pounce stats
    slam: d.slam, adds: d.adds, flee: d.flee, rage: d.rage, initDie: d.init,
  };
}
export function rollIntent(e, rng) {
  if (e.windup) {
    const s = e.slam || mdef(e.id).slam || { f: 0, m: 0 };
    e.windup = false;
    const v = s.v || 'strike';
    e.intent = { n: v === 'breath' ? 'Breath Slam' : 'Slam', v, f: (s.f || 0) + (e.edge?.slam || 0), m: s.m || 0, slam: true };
  } else if (e.pounce) { // a Stalk nobody broke — the boolean flag, stats from the sheet
    const s = mdef(e.id).pounce || { f: 0, m: 0 };
    e.pounce = false;
    e.intent = { n: 'Pounce', v: 'strike', f: (s.f || 0) + (e.edge?.slam || 0), m: s.m || 0, slam: true, pounce: true };
  } else {
    e.intent = { ...e.faces[die(rng, 6) - 1] };
  }
  return e.intent;
}
const DAMAGE_VERBS = new Set(['strike', 'pierce', 'drain', 'pilfer', 'breath']);
const sumDice = (rng, n, s) => { let t = 0; for (let i = 0; i < n; i++) t += die(rng, s); return t; };
export const armorOf = (e, rng) => (e?.armor ? sumDice(rng, e.armor.n, e.armor.s) : 0);
export const isDamageIntent = (i) => DAMAGE_VERBS.has(i.v);
export const GUARD_VERBS = new Set(['guard', 'ward']);
export const burnOf = (e) => (e?.intent?.v === 'ward' ? (e.intent.k || 0) + Math.floor(((e.flat || 0) - (e.teamFlat || 0)) / 2) + (e.edge?.burn || 0) : 0); // Fire Ward's burn (a table's extra hit power is for split hits, not this)
// After the round: a Stalker that took no harm will Pounce next round.
function settleStalks(b, rep) {
  rep.stalks = [];
  for (const e of b.enemies) {
    if (e.hp <= 0 || e.intent?.v !== 'stalk' || e.fresh) continue;
    const broken = e.hp < (e.hp0 ?? e.hp);
    if (!broken) e.pounce = true;
    rep.stalks.push({ uid: e.uid, broken });
  }
}
// A monster rolls its power die once for each point of the move's multiplier (Dave): a Lunge (x2) rolls TWO separate dice, a Bite (x1) one.
// (A move with no multiplier still draws one die so the random stream is the same as before; it just does not count.)
export const rollPower = (e, intent, rng) => Array.from({ length: Math.max(1, intent?.m || 0) }, () => die(rng, e.powerDie));
const diceSum = (intent, dice) => (dice || []).slice(0, intent.m || 0).reduce((a, v) => a + v, 0);
function magnitude(e, intent, dice, weaken) {
  let m = intent.f + diceSum(intent, dice);
  if (isDamageIntent(intent)) m = Math.max(0, m + e.flat + e.buff - weaken);
  return m;
}
// What made a monster's number this round, for the recap: its move's fixed part, the dice it rolled, the fight's flat bonus, a howl, and any
// softening from your powers. (f + the dice + flat + howl - softened = the attack or guard.)
const magnitudeParts = (e, intent, dice, weaken) => { const dmg = isDamageIntent(intent); return { f: intent.f, m: intent.m, p: dice[0], dice: dice.slice(0, Math.max(1, intent.m || 0)), size: e.powerDie, flat: dmg ? e.flat : 0, buff: dmg ? e.buff : 0, weaken: dmg ? weaken : 0 }; };
// A monster's BASE attack (or guard): the number it always has before its dice. The move's own number, plus the fight's extra hit and any
// howl for a blow; a guard has just the move's own number. The attack is then base + the dice it rolls.
export const intentBase = (e, i = e.intent) => (i ? i.f + (isDamageIntent(i) ? (e.flat || 0) + (e.buff || 0) : 0) : 0);
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
  // (Dave, Oct 2026: encounters should matter) openingBlock: round 1 block; pierce: every round (an enchanted weapon); sick: health
  // lost at the end of every round (a stomach bug; never the last point); feet: the borrowed boots' die size (sidesOf reads it)
  const o = { startHp: 0, wound: 0, startMagic: 0, atk: 0, block: 0, openingAtk: 0, openingBlock: 0, pierce: 0, sick: 0, weaken: 0, breathBlock: 0 };
  for (const bl of hero.campaign?.blessings || []) {
    if (bl.who && bl.who !== hero.name) continue;
    o.startHp += bl.startHp || 0; o.wound += bl.wound || 0; o.startMagic += bl.startMagic || 0;
    o.atk += bl.atk || 0; o.block += bl.block || 0; o.openingAtk += bl.openingAtk || 0;
    o.weaken += bl.weaken || 0; o.breathBlock += bl.breathBlock || 0;
    o.openingBlock += bl.openingBlock || 0; o.pierce += bl.pierce || 0; o.sick += bl.sick || 0;
  }
  return o;
}
// Borrowed boots (an encounter's loan): the feet die rolls this size until the fight they were lent for is over.
export function borrowedFeet(hero) {
  let n = 0; for (const bl of hero?.campaign?.blessings || []) if ((!bl.who || bl.who === hero.name) && bl.feet) n = Math.max(n, bl.feet);
  return n;
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
export const SCARS = { blade: 'Notched Wing', pierce: 'Broken Horn', magic: 'Cracked Scale', tank: 'Blind Eye' };
function dressNemesis(enemies, n) {
  if (!n) return;
  const e = enemies.find((x) => x.id === n.id && !x.nemesis);
  if (!e) return;
  e.nemesis = true; e.scar = n.scar; e.grudge = Math.min(3, n.grudge || 0);
  e.flat += e.grudge;
  const frac = Math.max(0.6, (n.wound || 0) + 0.35);
  e.hp = Math.max(1, Math.round(e.maxHp * frac));
  const bounty = n.bounty || 1;
  e.xp = Math.round(e.xp * bounty); e.gold = Math.round(e.gold * bounty); e.bountyPay = bounty;
}

// Apply game difficulty to a quest (monster health, flat damage, gold). Done once per battle.
// `who` is a hero, a table, or a difficulty id; heroes are never buffed or penalised.
export const difficultyOf = (who) => {
  const id = typeof who === 'string' ? who : (who?.difficulty ?? who?.hero?.difficulty);
  return DIFFICULTY[normalizeDifficulty(id)] || DIFFICULTY.normal;
};
export function withDifficulty(hero, quest) {
  const d = difficultyOf(hero);
  return { ...quest, hpMult: (quest.hpMult ?? 1) * d.hp, flat: (quest.flat ?? 0) + d.flat, rewardMult: (quest.rewardMult ?? 1) * d.gold, edge: d.edge || null };
}
export function newBattle(hero, quest0, rng, players = 1) {
  const quest = withDifficulty(hero, quest0);
  wieldDiamonds(hero); // the Diamonds you chose to bring take their hands for this fight
  const sc = partyScale(players);
  const enemies = [];
  for (let i = 0; i < quest.enemies.length; i++) {
    const id = quest.enemies[i];
    enemies.push(spawnEnemy(id, { hpMult: quest.hpMult * sc.hp, flat: quest.flat, teamFlat: sc.flat, rewardMult: quest.rewardMult, edge: quest.edge, campaign: hero.campaign, name: quest.foeNames?.[i] }, rng));
  }
  for (let i = 0; i < sc.adds; i++) enemies.push(spawnEnemy('goblin', { hpMult: quest.hpMult, flat: quest.flat, teamFlat: sc.flat, rewardMult: quest.rewardMult, edge: quest.edge, campaign: hero.campaign }, rng));
  const boon = pullBlessings(hero);
  const pact = hasCharm(hero, 'pact'); // Blood Pact: full magic, 8 less health
  const maxHp = Math.max(1, maxHpOf(hero) + Math.max(0, boon.startHp || 0) - (pact ? 8 : 0));
  const b = {
    rng, hero, quest, players, enemies, round: 0, phase: 'reset', outcome: null,
    hp: Math.max(1, maxHp - (boon.wound || 0)), maxHp,
    magic: pact ? magicCapOf(hero) : Math.max(0, Math.min(magicCapOf(hero), startMagicOf(hero) + boon.startMagic)), boon,
    board: null, actionsLeft: rerollTotal(), freeActions: [], used: {}, usedRound: {}, lastStandUsed: false, potions: potionStock(hero), points: 0,
    mods: blankMods(), nextBound: 0, nextChained: 0, lastBoard: null, nextHushed: false, hushedNow: false, goldEarned: 0, log: [], report: null, stolen: 0, stats: { dealt: 0, taken: 0, healed: 0 },
  };
  b.magic0 = b.magic; b.potions0 = b.potions; // for secret objectives
  dressNemesis(b.enemies, quest.nemesis);
  beginReset(b);
  return b;
}
const blankMods = () => ({ atk: 0, pierce: 0, block: 0, heal: 0, weaken: 0, splash: 0, aoe: 0 });

// A new round begins on the Reset screen: monsters have rolled their Intention and shown it.
export function beginReset(b) {
  b.round += 1; b.phase = 'reset'; b.board = null; b.mods = blankMods(); b.usedRound = {}; b.healsRound = 0;
  for (const e of b.enemies) if (e.hp > 0) rollIntent(e, b.rng);
}
// The practice battle sets some dice: b.script = { rolls: [{ slot: value }], rerolls: [{ slot: value }] }, used in order.
// A slot it does not name rolls as usual. Normal battles have no script.
const scripted = (hero, slot, v, rng) => (v != null ? { v: Math.min(Math.max(1, v), sidesOf(hero, slot)), bound: false } : rollSlot(hero, slot, rng));
export function startRoll(b) {
  const plan = b.script?.rolls?.shift();
  b.board = plan ? Object.fromEntries(Object.keys(ROLE).map((s) => [s, s === 'P' && !b.hero.pet ? { v: 1, bound: false } : scripted(b.hero, s, plan[s], b.rng)])) : rollBoard(b.hero, b.rng);
  b.actionsLeft = rerollTotal() + (hasCharm(b.hero, 'lantern') ? 1 : 0); b.freeActions = []; b.phase = 'shape'; // the Lantern: one more free reroll
  const slots = Object.keys(ROLE).filter((s) => s !== 'C' && s !== 'P'); // the pet's die is not on the board, so it is never tangled
  const cap = 4;
  const binds = Math.min(b.nextBound || 0, cap);
  for (let i = 0; i < binds && slots.length; i++) {
    const s = slots.splice(Math.floor(b.rng() * slots.length), 1)[0];
    b.board[s].bound = true;
  }
  b.boundNow = binds; b.nextBound = 0;
  const chains = Math.min(b.nextChained || 0, cap - binds);
  for (let i = 0; i < chains && slots.length; i++) {
    const s = slots.splice(Math.floor(b.rng() * slots.length), 1)[0];
    const keep = b.lastBoard?.[s] ?? b.board[s].v;
    b.board[s] = { v: keep, bound: true, chained: true };
  }
  b.chainedNow = chains; b.nextChained = 0;
  b.hushedNow = !!b.nextHushed; b.nextHushed = false;
  if (b.hushedNow && b.board.C) b.board.C.hushed = true;
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
  if (slots.some((s) => s === 'P' || b.board[s].bound || !isActive(b.hero, s))) return false; // the pet's die is one roll of luck (Dave)
  return b.magic >= info.perDie * slots.length;
}
export function reroll(b, slots) {
  if (!canReroll(b, slots)) return false;
  const info = rerollInfo(b);
  b.magic -= info.perDie * slots.length;
  if (info.kind === 'card') b.freeActions.shift(); else b.actionsLeft -= 1;
  const plan = b.script?.rerolls?.shift();
  for (const s of slots) b.board[s] = { ...scripted(b.hero, s, plan?.[s], b.rng), bound: false };
  return true;
}
// Turning the heart: once a round (Dave, Oct 2026), marked on this round's board so each hero in a company has their own.
export const nudgedThisRound = (b) => !!b.board?.nudged;
export function nudge(b, dir) {
  if (!b.board || b.board.nudged || b.magic < NUDGE_COST || b.hushedNow || b.board.C?.hushed) return false;
  const v = b.board.C.v + dir;
  if (v < 1 || v > 6) return false;
  b.magic -= NUDGE_COST; b.board.C.v = v; b.board.nudged = true; return true;
}
export function healSpend(b) {
  const cost = healCostOf(b.hero, b);
  if (b.magic < cost || b.hp >= b.maxHp) return false;
  b.magic -= cost; b.healsRound = (b.healsRound || 0) + 1; const before = b.hp; b.hp = Math.min(b.maxHp, b.hp + healAmountOf(b.hero)); b.stats.healed += b.hp - before; return true;
}
// Healing potions: bought at camp and carried from battle to battle (hero.potions); the belt holds potionMaxOf(hero).
// Free to drink, heals potionHpOf(hero) (more each act). In a party a potion can be thrown to a friend (`to` = that fighter);
// solo it is always you. Any time before you lock in. What you drink is gone until you buy more.
export const POTIONS = 2; export const POTION_HP = POTION_HEAL[0];
const actIdx = (hero) => Math.max(0, Math.min(2, (hero?.campaign?.act || 1) - 1));
export const potionMaxOf = (hero) => hero?.potionMax || POTIONS;
export const potionStock = (hero) => Math.min(potionMaxOf(hero), hero?.potions ?? potionMaxOf(hero)); // older saves arrive with a full belt
export const potionHpOf = (hero) => POTION_HEAL[actIdx(hero)];
export const potionPriceOf = (hero) => POTION_PRICE[actIdx(hero)];
export const potionsLeft = (b) => (b.potions ?? POTIONS);
export function drinkPotion(b, to = b) {
  if (potionsLeft(b) <= 0 || !to || to.hp <= 0 || to.hp >= to.maxHp) return false;
  b.potions = potionsLeft(b) - 1; if (b.hero) b.hero.potions = b.potions; // gone from the belt for good
  const before = to.hp; to.hp = Math.min(to.maxHp, to.hp + potionHpOf(b.hero));
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
export function upgradePotions(hero) { const r = potionUpgrade(hero); if (!r.ok) return false; const have = potionStock(hero); hero.gold -= r.cost; hero.potionMax = r.next; hero.potions = have; return true; }
// Buying potions at camp: one at a time, up to what the belt holds.
export function potionBuyInfo(hero) {
  const have = potionStock(hero); const max = potionMaxOf(hero); const price = potionPriceOf(hero);
  if (have >= max) return { ok: false, why: 'Belt full', have, max, price };
  if (hero.gold < price) return { ok: false, why: 'Need gold', have, max, price };
  return { ok: true, have, max, price };
}
export function buyPotion(hero) { const r = potionBuyInfo(hero); if (!r.ok) return false; hero.gold -= r.price; hero.potions = r.have + 1; return true; }

// ------------------------------------------------------------------------------- battle points
// Arcade-style points (POINTS in data.js). `who` is a solo battle or a party fighter: both keep `.points`.
export function award(who, n) { if (!who || !n) return 0; who.points = (who.points || 0) + n; return n; }
export const pointsOf = (who) => Math.round(who?.points || 0);
// What a round was worth, from its tallies.
// shield: in a company game the monsters targeted this hero, so each point blocked counts POINTS.shieldBlock; heldLine adds POINTS.heldLine.
export function roundPoints({ dealt = 0, absorbed = 0, healed = 0, kills = 0, triples = 0, teamTriples = 0, straight = false, down = false, shield = false, heldLine = false } = {}) {
  return dealt * POINTS.dealt + absorbed * (shield ? POINTS.shieldBlock : POINTS.absorbed) + (heldLine ? POINTS.heldLine : 0) + healed * POINTS.healSelf + kills * POINTS.kill
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
export const BIG_HEAL = { cost: 0, hp: POTION_HP }; // (old name, kept for callers; the real amount is potionHpOf)
export const healBig = (b) => drinkPotion(b);
// ---- powers. Each level makes a power stronger by about what its gold buys elsewhere at camp (POWER_LEVEL_FRAC: a quarter, a quarter, a half; level 3 doubles) and +1 die on dice powers.
export const powerLevel = (hero, id) => (hero.powerLevel && hero.powerLevel[id]) || 0;
// Each power level adds half the base number (at least 1): a 4 becomes 6, 8, 10; a 12 becomes 18, 24, 30.
export const scaleNum = (v, lvl) => { const l = Math.max(0, Math.min(POWER_LEVEL_FRAC.length - 1, lvl | 0)); return l ? v + Math.max(POWER_LEVEL_MIN[l], Math.round(v * POWER_LEVEL_FRAC[l])) : v; };
// Scale powers: `cost` buys the first dice, every `step` more magic (default 1) adds a die, up to `max` magic and, if set,
// `maxDice` dice in all (power levels add dice, so an upgraded power reaches the cap for less magic).
export const scaleStep = (card) => card.step || 1;
export function scaleMax(card, lvl = 0) {
  if (card.maxDice == null) return card.max;
  return Math.min(card.max, card.cost + Math.max(0, card.maxDice - card.dice.n - lvl) * scaleStep(card));
}
export function powerCost(card, x, lvl = 0) {
  if (card.kind !== 'scale') return card.cost;
  const v = Math.max(card.cost, Math.min(scaleMax(card, lvl), x ?? card.cost)); const st = scaleStep(card);
  return card.cost + Math.floor((v - card.cost) / st) * st;
}
export function powerDice(card, x, lvl = 0) {
  const n = card.dice.n + lvl + (card.kind === 'scale' ? (powerCost(card, x, lvl) - card.cost) / scaleStep(card) : 0);
  return card.maxDice == null ? n : Math.min(card.maxDice, n);
}
export function powerState(b, card) {
  const spent = card.atwill ? !!(b.usedRound && b.usedRound[card.id]) : !!b.used[card.id];
  const early = !!(card.minRound && b.round < card.minRound);
  return { spent, early, canPay: b.magic >= card.cost };
}
// Charges grow (Dave, Oct 2026: "the first round does three, the next four, the next five, the next six; that motivates you to keep
// investing"): each stored charge is worth 1 more of each of its effects than the one before, so 4 charges of +5 give 5+6+7+8 = 26.
// (Oct 2026: they start one lower and climb by CHARGE_STEP, so +5 a charge stores 4, 6, 8, 10.)
export const chargeSteps = (v, n) => Array.from({ length: Math.max(0, n) }, (_, i) => Math.max(1, v - 1) + CHARGE_STEP * i);
export function chargeGain(card, n, lvl = 0) {
  const per = typeof card.per === 'number' ? { atk: card.per } : card.per || {};
  const l = Math.max(0, Math.min(CHARGE_LEVEL_FRAC.length - 1, lvl | 0));
  return Object.fromEntries(Object.entries(per).map(([k, v]) => { const t = chargeSteps(v, n).reduce((a, x) => a + x, 0); return [k, Math.round(t * (1 + CHARGE_LEVEL_FRAC[l]))]; }));
}
export function castPower(b, id, { x, release } = {}) {
  const card = cardsOf(b.hero).find((c) => c.id === id);
  if (!card || b.phase !== 'shape') return null;
  if (card.kind === 'charge' && release) { // let the stored charges go
    b.charge = b.charge || {}; const n = b.charge[id] || 0; const key = `${id}:release`;
    if (!n || (b.usedRound && b.usedRound[key])) return null;
    (b.usedRound = b.usedRound || {})[key] = true; b.charge[id] = 0;
    const lvl = powerLevel(b.hero, id); let total = 0;
    const per = typeof card.per === 'number' ? { atk: card.per } : card.per; const gain = chargeGain(card, n, lvl);
    for (const k of Object.keys(per)) {
      const amt = gain[k]; total += amt;
      if (k === 'gold') b.goldEarned = (b.goldEarned || 0) + amt; else b.mods[k] = (b.mods[k] || 0) + amt;
      if (k === 'atk' && card.splash === 'half') b.mods.splash += Math.floor(amt / 2);
    }
    b.lastCast = { id, name: card.name, cost: 0, rolls: [], total, notes: [`released ${n}`], released: n, per }; return b.lastCast;
  }
  const st = powerState(b, card); if (st.spent || st.early) return null;
  const cost = powerCost(card, x, powerLevel(b.hero, id)); if (b.magic < cost) return null;
  b.magic -= cost;
  if (card.atwill) (b.usedRound = b.usedRound || {})[id] = true; else b.used[id] = true;
  const lvl = powerLevel(b.hero, id); const out = { id, name: card.name, cost, rolls: [], total: 0, notes: [] };
  const add = (k, v) => { if (k === 'free') b.freeActions.push(v); else if (k === 'magic') b.magic = Math.min(magicCapOf(b.hero), b.magic + v); else b.mods[k] = (b.mods[k] || 0) + v; };
  if (card.dice) { // roll them
    const n = powerDice(card, cost, lvl);
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
    if (r <= 2) add('magic', 1 + lvl); else if (r <= 4) add('atk', scaleNum(LUCK.mid, lvl)); else { add('atk', scaleNum(LUCK.top, lvl)); add('magic', 1); }
    out.total = r;
  } else {
    for (const [k, v] of Object.entries(card.fx)) add(k, k === 'free' ? v + lvl : scaleNum(v, lvl)); // a free reroll gains one die a level
  }
  if (card.kind === 'super') { b.mods.aoe += scaleNum(card.aoe, lvl); }
  b.lastCast = out; return out;
}
// Lucky Verse's d6 (Oct 2026, brought into line with the other every-round powers): 1-2 magic back, 3-4 a little attack, 5-6 more and 1 magic.
export const LUCK = { mid: 3, top: 6 };
export const playCard = (b, id, opts) => !!castPower(b, id, opts);
export function powerUpgradeInfo(hero, id) {
  const lvl = powerLevel(hero, id); if (lvl >= powerLevelsOf(hero)) return { ok: false, why: 'max', lvl };
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
    pierce: ev.pierce + m.pierce + (boon.pierce || 0), block: ev.block + m.block + (boon.block || 0) + (b.round === 1 ? (boon.openingBlock || 0) : 0), heal: ev.heal + m.heal,
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
  for (const e of alive) { e.pdice = rollPower(e, e.intent, b.rng); e.p = e.pdice[0]; e.mag = magnitude(e, e.intent, e.pdice, m.weaken + (boon.weaken || 0)); e.calc = magnitudeParts(e, e.intent, e.pdice, m.weaken + (boon.weaken || 0)); e.buffUsed = e.buff; e.buff = 0; e.hp0 = e.hp; e.arm = armorOf(e, b.rng); }

  let block = T.block; rep.dealtBefore = b.stats.dealt;
  // Your strike.
  let tgt = null;
  const strike = () => {
    tgt = b.enemies[target];
    if (!tgt || tgt.hp <= 0) tgt = alive[0];
    rep.targetUid = tgt.uid;
    const phase = tgt.intent.v === 'phase'; // normal attack passes through; pierce still lands
    const guard = phase ? T.atk : (GUARD_VERBS.has(tgt.intent.v) ? tgt.mag : 0) + (tgt.arm || 0);
    tgt.lastHurt = T.pierce > T.atk ? 'pierce' : (ev.splash || m.aoe) ? 'magic' : T.block > T.atk ? 'tank' : 'blade';
    const dmg = Math.max(0, T.atk - guard) + T.pierce;
    rep.guarded = Math.min(guard, T.atk); if (phase) rep.phased = true;
    rep.dealt = Math.min(tgt.hp, dmg);
    tgt.hp = Math.max(0, tgt.hp - dmg);
    b.stats.dealt += rep.dealt;
    const burn = rep.dealt > 0 ? burnOf(tgt) : 0; // Fire Ward: hitting it burns you (block does not help)
    if (burn) { rep.burned = burn; rep.taken += burn; }
    if (tgt.hp <= 0) { rep.killed.push(tgt.uid); b.stolen += tgt.carried; tgt.carried = 0; }
    // splash (to the others) and area damage (to everyone), from powers
    rep.splashed = [];
    const splash = m.splash + (ev.splash || 0); // powers, and Dawnbreaker's top face
    rep.magicHit = (m.atk || 0) + (m.pierce || 0) + splash + (m.aoe || 0) > 0; // a power put something into this blow (the board sparkles)
    if (splash > 0 || m.aoe > 0) {
      for (const e of b.enemies) {
        if (e.hp <= 0 && e !== tgt) continue;
        const hit = (e === tgt ? 0 : splash) + m.aoe; if (hit <= 0 || (e === tgt && tgt.hp <= 0)) continue;
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
    const i = e.intent; const act = { uid: e.uid, name: i.n, v: i.v, mag: e.mag, p: e.p, calc: e.calc, k: i.k || 0, slam: !!i.slam, arm: e.arm || 0, early, init: e.init ?? null };
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
      case 'chain': b.nextChained += i.k; rep.chained = (rep.chained || 0) + i.k; break;
      case 'hush': b.nextHushed = true; rep.hushed = true; if (i.k) { b.nextChained += i.k; rep.chained = (rep.chained || 0) + i.k; } break;
      case 'breath': {
        const half = Math.ceil(e.mag / 2);
        const a = strikeHit({ mag: Math.max(0, half - (boon.breathBlock || 0)) }, false);
        const p = strikeHit({ mag: e.mag - half }, true);
        Object.assign(act, { d: e.mag, net: a.net + p.net, ab: a.ab });
        break;
      }
      case 'summon': {
        const room = ENEMY_CAP - living().length; const add = e.adds || mof(e.id, b).adds;
        for (let n = 0; n < Math.min(i.k, room); n++) {
          const s = spawnEnemy(add, { hpMult: e.hpMult * 0.75, flat: e.flat - (e.teamFlat || 0), teamFlat: e.teamFlat || 0, rewardMult: 0, edge: e.edge, campaign: campOfBattle(b) }, b.rng);
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
  for (const e of alive) { const initDie = e.initDie || mof(e.id, b)?.init || 4; e.init = b.round === 1 ? null : die(b.rng, initDie); rep.init.foes.push({ uid: e.uid, init: e.init, die: initDie }); if (e.init != null && e.init > initV) early.push(e); }
  if (early.length) rep.init.first = 'foes';
  rep.early = early.map((e) => e.uid);
  actFor(early, true);
  const heroDown = early.length > 0 && Math.min(b.maxHp, b.hp + T.heal) - rep.taken <= 0;
  if (heroDown) { rep.heroDown = true; rep.targetUid = null; } else {
    strike();
    actFor(b.enemies.filter((e) => !early.includes(e)), false);
  }
  settleStalks(b, rep);
  for (const e of b.enemies) { e.cancelled = false; e.fresh = false; }

  // 3. Rage: bosses change their ways at half health.
  for (const e of living()) {
    const rg = e.rage || mof(e.id, b).rage;
    if (rg && !e.raged && e.hp <= e.maxHp / 2) {
      e.raged = true; e.powerDie = rg.power; e.faces = rg.faces; e.rageName = rg.name; rep.raged.push(e.uid);
      if ('armor' in rg) e.armor = rg.armor;
    }
  }
  tryFlee(b, rep);
  if (b.board) b.lastBoard = Object.fromEntries(Object.entries(b.board).map(([s, d]) => [s, d.v]));

  // 4. You.
  const hpBeforeHit = b.hp;
  let hp = Math.min(b.maxHp, b.hp + T.heal) - rep.taken;
  rep.healed = Math.max(0, Math.min(b.maxHp, hpBeforeHit + T.heal) - hpBeforeHit);
  b.stats.healed += rep.healed; b.stats.taken += rep.taken;
  b.hp = Math.max(0, Math.min(b.maxHp, hp));
  if (b.hp <= 0 && hasCharm(hero, 'phoenix') && !b.phoenixUsed) { b.phoenixUsed = true; b.hp = Math.min(b.maxHp, 10); rep.phoenix = true; } // Phoenix Feather
  if (boon.sick && b.hp > 1) { rep.sick = Math.min(boon.sick, b.hp - 1); b.hp -= rep.sick; } // a bug from the road: it hurts, it never finishes you
  const stolen = Math.min(b.magic + T.magic, rep.magicStolen); rep.magicStolen = stolen;
  b.magic = Math.max(0, Math.min(magicCapOf(b.hero), b.magic + T.magic - stolen));
  rep.hpAfter = b.hp; rep.magicAfter = b.magic;
  hero.stats.rounds++;
  rep.points = Math.round(roundPoints({ dealt: b.stats.dealt - (rep.dealtBefore ?? b.stats.dealt), absorbed: rep.absorbed, healed: rep.healed, kills: rep.killed.length, triples: (ev.triples || []).length, straight: !!ev.straight, down: b.hp <= 0 }));
  award(b, rep.points);

  b.report = rep;
  logRound(b, { hero, board: b.board, mods: m, _dealt: b.stats.dealt - (rep.dealtBefore ?? b.stats.dealt), _killed: rep.killed, T, ev, straight, actionsLeft: b.actionsLeft, hp: b.hp, magic: b.magic }, { blocked: rep.absorbed || 0 });
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
export function rollDrops(rng, count, { minRarity = 0, rarityBoost = 0, sizes = [100, 0, 0, 0], minSize = 4, weights = RARITY_WEIGHTS, rarities = null } = {}) {
  const drops = [];
  const ids = Object.keys(LOOT_WEIGHTS);
  for (let i = 0; i < count; i++) {
    const id = ids[weighted(rng, ids.map((k) => LOOT_WEIGHTS[k]))];
    const w = weights.map((x, r) => (r === 0 ? Math.max(1, x - rarityBoost * 4) : x + rarityBoost * (r === 1 ? 3 : r === 2 ? 1.5 : 0.5)));
    const rolled = weighted(rng, w); const rarity = Math.max(minRarity, rarities ? rarities[i % rarities.length] : rolled);
    const size = Math.max(minSize, SIZES[weighted(rng, sizes)] || 4);
    drops.push(makeWeapon(id, rarity, rng, size));
  }
  return drops;
}
// The gold these monsters pay (a fled one pays FLEE_REWARD of it), with the hero's gold bonus and the act's multiplier.
function killGold(b, list) {
  const gm = 1 + heroMods(b.hero).goldPct;
  const actGold = ACT_GOLD[Math.min(ACT_GOLD.length, b.hero.campaign?.act || 1) - 1] || 1;
  return Math.round(list.reduce((a, e) => a + e.gold * (e.fled ? FLEE_REWARD : 1), 0) * gm * actGold);
}
// Gold won so far in a solo fight (dice, kills, purses taken back, less anything a thief has run off with): what the
// battle's gold chip adds to the hero's purse each round, so it climbs like magic does. battleRewards pays it at the end.
export function battleGoldSoFar(b) { return killGold(b, b.enemies.filter((e) => e.hp <= 0 && !e.fled)) + (b.goldEarned || 0) + (b.stolen || 0); }
// The charms a won fight offers this hero (CHARM_CHANCE by kind; a boss offers a choice of two, even to a hero with three, who may swap).
// `salt` keeps heroes at one table from all being offered the same ones.
export function charmOffer(hero, quest, salt = '') {
  const c = hero.campaign; const crng = makeRng(salt ? hashSeed(c.seed, c.act, c.step, 'charm', salt) : hashSeed(c.seed, c.act, c.step, 'charm')); // solo: the same roll as ever
  const cch = CHARM_CHANCE[quest.kind] ?? CHARM_CHANCE.battle;
  return !charmFull(hero) || quest.kind === 'boss' ? (crng() < cch ? charmChoices(hero, crng, quest.kind === 'boss' ? 2 : 1) : []) : [];
}
export function battleRewards(b) {
  const { quest, hero } = b;
  const dead = b.enemies; // includes adds: they carry rewardMult 0
  const pay = (e) => (e.fled ? FLEE_REWARD : 1);
  const xp = dead.reduce((a, e) => a + Math.round(e.xp * pay(e)), 0);
  const kills = killGold(b, dead);
  const gold = kills + b.goldEarned + b.stolen; // may be negative if a thief got away with your purse
  const rng = makeRng(hashSeed(hero.campaign.seed, hero.campaign.act, hero.campaign.step, 'drops'));
  const nemesisKill = dead.some((e) => e.nemesis && !e.fled && e.hp <= 0);
  // spoils are mostly Bronze (wear, Oct 2026): a boss or a nemesis leaves at least a Silver one, Gold only now and then
  const minRarity = quest.kind === 'boss' || nemesisKill ? 1 : 0;
  const c = hero.campaign; const sizes = dropSizeWeights(c.act, c.step, quest.perilous ? 1 : 0);
  const drops = rollDrops(rng, b.players + 1, { minRarity, rarityBoost: (quest.perilous ? 1 : 0) + (quest.kind === 'boss' ? 1 : 0), sizes, weights: SPOILS_RARITY });
  if (quest.kind === 'boss' || quest.kind === 'elite') { const big = SIZES[Math.min(3, SIZES.indexOf(weaponSize(drops[0])) + 1)]; drops[0].size = big; } // the big fights always leave one weapon a size up
  addLegendary(drops, quest, [hero], hashSeed(c.seed, c.act, c.step, 'legend'));
  const drng = makeRng(hashSeed(c.seed, c.act, c.step, 'diamond')); const dch = DIAMOND.chance[quest.kind] ?? DIAMOND.chance.battle;
  const diamond = drng() < dch ? makeDiamond(drng, c.act) : null; // now and then the fight leaves a Diamond behind
  const charms = charmOffer(hero, quest);
  return { xp, gold, drops, diamond, charms };
}
function tryFlee(b, rep) {
  rep.fled = rep.fled || [];
  const living = b.enemies.filter((e) => e.hp > 0);
  for (const e of living) {
    const fl = e.flee || mof(e.id, b)?.flee;
    if (!fl || e.fled) continue;
    if (fl.onlyAs && b.quest?.kind !== fl.onlyAs) continue;
    if (living.length > 1) continue; // last foe standing, so the fight ends cleanly
    if (e.hp > e.maxHp * fl.at) continue;
    if (fl.chance != null && b.rng() >= fl.chance) continue;
    e.fled = true; e.hpLeft = e.hp; e.hp = 0; e.scar = e.scar || SCARS[e.lastHurt] || SCARS.blade;
    rep.fled.push(e.uid);
  }
}
export function recordFled(campaign, b) {
  if (!campaign || !b) return;
  campaign.nemeses = campaign.nemeses || [];
  campaign.chronicle = campaign.chronicle || [];
  for (const e of b.enemies) {
    if (e.fled) {
      if (mof(e.id, b)?.nemesis === false) continue; // pinned returns only (Sir Reginald); skip the random ambush loop
      const prev = campaign.nemeses.find((n) => n.id === e.id);
      const rec = {
        id: e.id, name: e.name, scar: e.scar || SCARS.blade,
        wound: (e.hpLeft || 0) / Math.max(1, e.maxHp),
        act: campaign.act, step: campaign.step,
        grudge: prev ? Math.min(3, (prev.grudge || 0) + 1) : 0,
        bounty: prev ? Math.round(((prev.bounty || 1) * 1.5) * 100) / 100 : 1.5,
      };
      campaign.nemeses = campaign.nemeses.filter((n) => n.id !== e.id);
      campaign.nemeses.push(rec);
    } else if (e.nemesis && e.hp <= 0) {
      campaign.nemeses = campaign.nemeses.filter((n) => n.id !== e.id);
      campaign.chronicle = [{ act: campaign.act, step: campaign.step, title: e.name, text: `${e.name} falls at last. In its hoard: everything it ever stole from you, and more. Dragons keep receipts. So, it turns out, do you.` }, ...(campaign.chronicle || [])].slice(0, 18);
    }
  }
}
// Now and then an elite or boss leaves a legendary in place of the last ordinary drop: one nobody in the fight already carries.
const carried = (hero) => [...Object.values(hero.loadout || {}), ...(hero.bag || [])].filter(Boolean).map((w) => w.id);
export function legendaryChance(quest) {
  const base = LEGENDARY_CHANCE[quest.kind] || 0;
  return base ? base + (quest.perilous ? LEGENDARY_CHANCE.perilous : 0) : 0;
}
function addLegendary(drops, quest, heroes, seed) {
  const p = legendaryChance(quest); if (!p || !drops.length) return null;
  const rng = makeRng(seed); if (rng() >= p) return null;
  const owned = new Set(heroes.flatMap(carried));
  const pool = LEGENDARY.filter((id) => !owned.has(id)); if (!pool.length) return null;
  const last = drops.length - 1;
  drops[last] = makeWeapon(pick(rng, pool), 3, rng, weaponSize(drops[last]));
  return drops[last];
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
  const avail = Object.keys(PERKS).filter((id) => !PERKS[id].retired && have(id) < PERKS[id].max);
  const out = [];
  while (out.length < 3 && avail.length) out.push(avail.splice(Math.floor(rng() * avail.length), 1)[0]);
  if (out.length === 3 && !diamondCaseFull(hero) && rng() < DIAMOND.chance.perk) out[2] = 'diamond'; // now and then, a Diamond instead
  return out;
}
export function takePerk(hero, id) {
  if (hero.pendingPerks <= 0) return false;
  if (id === 'diamond') { // a Diamond for the case, not a perk to keep
    const c = hero.campaign || {}; const d = makeDiamond(makeRng(hashSeed(c.seed || 1, c.act || 1, c.step || 1, 'perk-diamond', hero.level)), c.act || 1);
    if (!takeDiamond(hero, d)) return false; hero.pendingPerks--; return true;
  }
  hero.perks.push(id); hero.pendingPerks--; return true;
}

// Camp economy.
// A die can only grow as far as the act allows (Act I d6, Act II d8, Act III d10): the hero must reach the next act first.
function actGate(hero, size) {
  const act = hero.campaign?.act || 1; const next = NEXT_SIZE[size];
  if (next > dieCapForAct(act)) { const need = Math.ceil((next - 4) / 2); return { ok: false, why: `Act ${ROMAN[need]}`, act: need, next }; }
  return null;
}
export function strengthUpgrade(hero, slot) {
  const size = hero.strength[slot]; const step = STRENGTH_STEPS[size];
  if (!step) return { ok: false, why: 'Max size' };
  { const g = actGate(hero, size); if (g) return { ...g, cost: step[0] }; }
  if (hero.gold < step[0]) return { ok: false, why: 'Need gold', cost: step[0], next: NEXT_SIZE[size] };
  return { ok: true, cost: step[0], next: NEXT_SIZE[size] };
}
export function specialUpgrade(hero, slot) {
  const size = hero.special[slot]; const step = SPECIAL_STEPS[size];
  if (!step) return { ok: false, why: 'Max size' };
  { const g = actGate(hero, size); if (g) return { ...g, cost: step[0] }; }
  if (hero.gold < step[0]) return { ok: false, why: 'Need gold', cost: step[0], next: NEXT_SIZE[size] };
  return { ok: true, cost: step[0], next: NEXT_SIZE[size] };
}
export function upgradeDie(hero, kind, slot) {
  const r = kind === 'strength' ? strengthUpgrade(hero, slot) : kind === 'speed' ? speedUpgrade(hero) : kind === 'mind' ? mindUpgrade(hero) : specialUpgrade(hero, slot);
  if (!r.ok) return false;
  hero.gold -= r.cost; feetSize(hero); mindSize(hero); hero[kind][kind === 'mind' ? 'N' : slot] = r.next; return true;
}
// ---- forging (Tier) and training (Size) a weapon. Both cost gold; instances are found by uid (a two-hander sits in both hands).
const copiesOf = (hero, uid) => [...Object.values(hero.loadout), ...hero.bag].filter((w) => w && w.uid === uid);
const handsMul = (inst) => (WEAPONS[inst.id].hands === 2 ? 1.4 : 1);
export function forgeInfo(hero, uid) {
  return { ok: false, why: 'wear' }; // retired with wear (Oct 2026): a weapon is what you find or buy
}
export function forgeInfoOld(hero, uid) {
  ensureTwin(hero);
  const c = copiesOf(hero, uid); if (!c.length) return { ok: false, why: 'missing' };
  const inst = c[0]; const next = (inst.rarity | 0) + 1;
  if (isLegendary(inst)) return { ok: false, why: 'legendary' }; // a legendary's faces are fixed
  if (inst.id === 'fists' || next > 2 || !(WEAPONS[inst.id].bonus || [])[next - 1]) return { ok: false, why: 'max' };
  const cost = Math.round(FORGE_COST[next] * handsMul(inst));
  return { ok: hero.gold >= cost, why: hero.gold >= cost ? '' : 'gold', cost, next };
}
export function forgeWeapon(hero, uid) {
  const r = forgeInfo(hero, uid); if (!r.ok) return false;
  hero.gold -= r.cost; for (const w of copiesOf(hero, uid)) w.rarity = r.next; return true;
}
export function trainInfo(hero, uid) {
  return { ok: false, why: 'wear' }; // retired with wear (Oct 2026)
}
export function trainInfoOld(hero, uid) {
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
export const weaponValue = (inst) => (inst.id === 'fists' ? 0 : Math.round((WEAPONS[inst.id].price || 0) * (isLegendary(inst) ? 1 : RARITY_MULT[inst.rarity | 0]) * (SIZE_VALUE[weaponSize(inst)] || 1)));
// A sale returns half its worth, less for a worn weapon (by the battles it has left).
export const sellValue = (inst) => { if (inst.id === 'fists') return 0; const f = battlesFull(inst); const share = f === Infinity ? 1 : battlesLeft(inst) / f; return Math.max(1, Math.round(weaponValue(inst) * SELL_SHARE * share)); };
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
  const items = rollDrops(rng, 4, { rarities: STORE_RARITY, sizes: dropSizeWeights(c.act, c.step) }).map((inst) => ({ // one Bronze, two Silver, one Gold
    inst, price: Math.max(1, Math.round(weaponValue(inst) * priceMod)), sold: false,
  }));
  // from Act II the Camp Store sometimes stocks one legendary you do not already own
  const lrng = makeRng(hashSeed(c.seed, c.act, c.step, 'shop-legend'));
  if (c.act >= 2 && lrng() < LEGENDARY_CHANCE.shop) {
    const pool = LEGENDARY.filter((id) => !carried(hero).includes(id));
    if (pool.length) { const inst = makeWeapon(pick(lrng, pool), 3, lrng, items[items.length - 1].inst.size || 4); items[items.length - 1] = { inst, price: Math.max(1, Math.round(weaponValue(inst) * priceMod)), sold: false }; }
  }
  const drng = makeRng(hashSeed(c.seed, c.act, c.step, 'shop-diamond'));
  if (drng() < DIAMOND.chance.shop) { const inst = makeDiamond(drng, c.act); items[0] = { inst, price: Math.round((WEAPONS[inst.id].price || 20) * DIAMOND.price * (SIZES.indexOf(inst.size) + 1) * priceMod), sold: false }; } // rarely, a Diamond, and dear
  const chrng = makeRng(hashSeed(c.seed, c.act, c.step, 'shop-charm'));
  const charm = chrng() < CHARM_CHANCE.shop ? charmChoices(hero, chrng, 1)[0] || null : null;
  if (flags.discount || flags.hike) c.campFlags = {};
  c.shop = { step: `${c.act}.${c.step}`, items, charm: charm ? { id: charm, price: Math.round(CHARM_PRICE[Math.min(3, c.act) - 1] * priceMod), sold: false } : null };
  return items;
}
export function shopCharm(hero) { shopStock(hero); return hero.campaign.shop?.charm || null; }
export function buyCharm(hero) {
  const c = shopCharm(hero); if (!c || c.sold || hero.gold < c.price || hasCharm(hero, c.id) || charmFull(hero)) return false;
  hero.gold -= c.price; c.sold = true; return takeCharm(hero, c.id);
}
export function buyItem(hero, i) {
  const it = shopStock(hero)[i];
  if (!it || it.sold || hero.gold < it.price) return false;
  if (it.inst.diamond) { if (diamondCaseFull(hero)) return false; hero.gold -= it.price; it.sold = true; (hero.diamonds ||= []).push(it.inst); return true; } // into the Diamond case
  if (bagFull(hero)) return false;
  hero.gold -= it.price; it.sold = true; hero.bag.push(it.inst); return true;
}
// ---- the Camp Store's counter: two specials a camp (one fight each, for the hero who buys it) and a mystery bundle.
// At a table the counter is shared but every hero buys their own; `who` lists the heroes who already have one.
const actIx = (c) => Math.min(3, Math.max(1, c?.act || 1)) - 1;
export function storeTonics(hero) {
  const c = hero.campaign; if (!c) return [];
  shopStock(hero);
  if (!c.shop.tonics) {
    const ids = Object.keys(STORE_TONICS); const r = makeRng(hashSeed(c.seed, c.act, c.step, 'tonics'));
    const pickN = []; while (pickN.length < Math.min(STORE_TONICS_SHOWN, ids.length)) { const id = ids[Math.floor(r() * ids.length)]; if (!pickN.includes(id)) pickN.push(id); }
    c.shop.tonics = pickN.map((id) => ({ id, who: [] }));
  }
  const ai = actIx(c);
  return c.shop.tonics.map((t) => { const d = STORE_TONICS[t.id]; const n = d.by[ai];
    return { id: t.id, name: d.name, icon: d.icon, n, text: d.text(n), price: d.price[ai], bought: t.who.includes(hero.name) }; });
}
export function buyTonic(hero, id) {
  const t = storeTonics(hero).find((x) => x.id === id); if (!t || t.bought || hero.gold < t.price) return false;
  const d = STORE_TONICS[id]; hero.gold -= t.price;
  hero.campaign.shop.tonics.find((x) => x.id === id).who.push(hero.name);
  hero.campaign.blessings = [...(hero.campaign.blessings || []), { id: `store-${id}`, name: d.name, text: t.text, fights: 1, who: hero.name, [d.key]: t.n }];
  return true;
}
export function bundleOffer(hero) {
  const c = hero.campaign; if (!c) return null;
  shopStock(hero);
  const rng = makeRng(hashSeed(c.seed, c.act, c.step, 'bundle', hero.name));
  let r = rng(); let tier = 0;
  for (let i = 0; i < BUNDLE_ODDS.length; i++) { r -= BUNDLE_ODDS[i]; if (r < 0) { tier = i; break; } }
  const [inst] = rollDrops(rng, 1, { minRarity: tier, sizes: dropSizeWeights(c.act, c.step) }); inst.rarity = tier;
  return { inst, price: bundlePrice(c.act), odds: BUNDLE_ODDS, bought: (c.shop.bundles || []).includes(hero.name) };
}
export function buyBundle(hero) {
  const o = bundleOffer(hero); if (!o || o.bought || hero.gold < o.price || bagFull(hero)) return false;
  hero.gold -= o.price; hero.bag.push(o.inst); hero.campaign.shop.bundles = [...(hero.campaign.shop.bundles || []), hero.name];
  return o.inst;
}
// Only one legendary in your hands at a time (Dave). A two-handed legendary fills both hands, so it never meets another.
export function canEquip(hero, uid, side = 'NW') {
  const inst = hero.bag.find((w) => w.uid === uid);
  if (!inst) return { ok: false, why: 'That weapon is not in your pack.' };
  if (!isLegendary(inst) || WEAPONS[inst.id].hands === 2 || isTwoHanded(hero)) return { ok: true };
  const other = hero.loadout[side === 'NW' ? 'NE' : 'NW'];
  if (isLegendary(other)) return { ok: false, why: `Only one legendary in your hands at a time. Swap it in for ${WEAPONS[other.id].name} instead, in the same hand.` };
  return { ok: true };
}
export function equip(hero, uid, side = 'NW') {
  const idx = hero.bag.findIndex((w) => w.uid === uid);
  if (idx < 0 || !canEquip(hero, uid, side).ok) return false;
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
  const wkey = (w) => (w ? [w.id, w.rarity | 0, w.size || 4, !!w.diamond, !!w.twin] : null); // what the weapon is, not which copy (two alike heroes measure alike)
  const key = JSON.stringify([hero.cls, hero.level, hero.strength, hero.special, hero.speed, hero.mind, hero.talent, hero.dice, hero.perks, wkey(hero.loadout.NW), wkey(hero.loadout.NE)]);
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
  let hp = 0; let hit = 0; let blockable = 0; let armorTax = 0;
  for (const id of quest.enemies) {
    const M = mdef(id, hero?.campaign); hp += Math.round(M.hp * (quest.hpMult ?? 1)); const ep = (M.power + 1) / 2;
    let dmg = 0; let blk = 0;
    for (const f of M.faces) {
      if (!DAMAGE_VERBS.has(f.v)) continue;
      const amt = Math.max(0, f.f + f.m * ep + (quest.flat || 0));
      const pierceLike = f.v === 'pierce' || f.v === 'breath';
      dmg += pierceLike ? amt * 1.2 : amt;
      if (!pierceLike) blk += amt;
    }
    hit += dmg / 6; blockable += blk / 6;
    if (M.armor) armorTax += 0.6 * M.armor.n * (M.armor.s + 1) / 2;
  }
  const deal = Math.max(1, P.dmg * 1.7 - armorTax); // rerolls and powers: a played round deals ~1.7x an average throw (measured on bot runs)
  const rounds = hp / deal;
  const perRound = Math.max(0, hit - Math.min(blockable, P.block * 1.2)) - P.heal * 0.5;
  const taken = Math.max(0, perRound) * rounds * 0.3; // monsters fall as the fight goes on, and rerolls, block powers and mending soak most of the rest
  const score = taken / P.hp;
  const label = score < 0.35 ? 'Easy' : score < 0.5 ? 'Fair' : score < 0.7 ? 'Hard' : 'Deadly'; // calibrated on 3-act bot runs with potions: ~96%, ~85%, ~73%, ~45% wins
  return { score, label, rounds: Math.max(1, Math.round(rounds)), taken: Math.round(taken), foeHp: hp, deal: Math.round(deal) };
}

// ------------------------------------------------------------------------------- campaign
const PREFIX =['Ambush at', 'Trouble at', 'The Siege of', 'Showdown at', 'Night Raid on', 'Skirmish near'];
// The standard road's extra bite (data.js ORDINARY).
export const standardFlat = (act, enemies) => (ORDINARY.flat[Math.min(ORDINARY.flat.length, act) - 1] || 0) + (enemies.length === 1 ? ORDINARY.lone : 0);
// The road ahead: ONE fight per step (Dave, Oct 2026: "only one option to fight, since you can already choose level in the game").
// The old second road, the perilous one, is still generated (so the same seed gives the same monsters as before and the
// balance tools can measure it) but it is no longer offered: at an elite step the elite is the fight, otherwise the standard road.
export function questsFor(hero) { return roadsFor(hero, { random: true }).slice(0, 1); }

// ---- random encounters: used on Ascents (act 4+) and by the balance tools. Acts I–III lock their first-pass cast in
// `act.fights` so the story and the fight name the same foes. Difficulty still scales HP, damage and summoned adds, never
// that locked roster. The budget grows through the act and follows Easy / Normal / Hard / Legendary; each monster has a
// `threat`, and a crowd costs a little more than its sum. Deterministic for a campaign (seed, act, step).
export const crowdThreat = (ids, camp) => ids.reduce((t, id) => t + (mdef(id, camp)?.threat || 1), 0) * (1 + ENCOUNTER.groupPlus * Math.max(0, ids.length - 1));
export function encounterBudget(hero) {
  const c = hero.campaign; const a = ENCOUNTER.acts[Math.min(ENCOUNTER.acts.length, c.act) - 1];
  return (a.base + a.slope * (c.step - 1)) * difficultyOf(hero).budget;
}
export function encounterFor(hero) {
  const c = hero.campaign; const acts = packActs(c); const act = acts[(c.act - 1) % acts.length];
  const rng = makeRng(hashSeed(c.seed, c.act, c.step, 'encounter'));
  const budget = encounterBudget(hero) * (ENCOUNTER.jitter[0] + (ENCOUNTER.jitter[1] - ENCOUNTER.jitter[0]) * rng());
  // the act's own monsters; the smaller elite-tier ones (an ogre) join the ordinary fights from the middle of the act
  const kinds = [...new Set(act.pool.flat())];
  const bigs = rng() >= 0.4 ? [] : [...new Set(act.elite.flat())].filter((id) => mdef(id, c).tier === 'elite' && c.step >= ENCOUNTER.bigFrom && mdef(id, c).threat <= ENCOUNTER.bigMax);
  const roster = [...kinds, ...bigs].sort((x, y) => (mdef(x, c).threat - mdef(y, c).threat) || x.localeCompare(y));
  const cheapest = mdef(roster[0], c).threat;
  const tries = [];
  for (let i = 0; i < 14; i++) {
    const ids = []; const shape = rng(); // under a third: aim for one big monster; otherwise fill the budget with whatever fits
    const lone = shape < 0.3;
    for (let n = 0; n < ENEMY_CAP; n++) {
      const fit = roster.filter((id) => crowdThreat([...ids, id], c) <= budget * 1.08 && !(ids.length >= 2 && ids.every((x) => x === id)));
      if (!fit.length) break;
      const pool = lone && !ids.length ? fit.slice(-2) : fit; // a lone fight takes the biggest monsters that fit
      ids.push(pick(rng, pool));
      if (lone) break;
      if (rng() < 0.18 * ids.length) break; // sometimes stop early, so crowds are not always the maximum
    }
    if (!ids.length) ids.push(roster[0]);
    tries.push({ ids, gap: Math.abs(budget - crowdThreat(ids, c)) + (new Set(ids).size === 1 && ids.length > 2 ? 0.4 : 0) });
  }
  tries.sort((x, y) => x.gap - y.gap);
  const best = tries.slice(0, 4); // among the closest fits, pick at random so fights vary
  void cheapest;
  return pick(rng, best).ids;
}
export function roadsFor(hero, opts = {}) {
  const c = hero.campaign; const acts = packActs(c); const actIdx = (c.act - 1) % acts.length; const act = acts[actIdx];
  const cycle = Math.floor((c.act - 1) / acts.length);
  const rng = makeRng(hashSeed(c.seed, c.act, c.step, 'quests'));
  const s = c.step;
  const ai = Math.min(ACT_HP.length - 1, c.act - 1); // act 3+ reuses the act data with the act-3 growth until it has its own monsters
  const base = (1 + STEP_HP * (s - 1)) * ACT_HP[ai] * (1 + 0.6 * Math.max(0, cycle - (c.act > ACT_HP.length ? 1 : 0)));
  const flat = 3 + Math.floor((s - 1) / 3) + ACT_FLAT[ai]; // (3, not 2: every hero now carries two free potions)
  const lesson = c.act === 1 && s === 1 && !(c.wins > 0); // the first fight teaches; it stays gentle
  const reserved = new Set(Object.values(act.gates || {}).map((g) => g.place).filter(Boolean));
  const roamPlaces = act.places.filter((p) => !reserved.has(p));
  // First time through Acts I–III: the story names these foes. Ascents (cycle >= 1) still roll encounterFor.
  const locked = cycle === 0 && act.fights?.[s - 1]?.length ? act.fights[s - 1] : null;
  const labels = cycle === 0 && act.names?.[s - 1]?.length ? act.names[s - 1] : null;
  const mk = (kind, enemies, extra = {}) => {
    const prefix = kind === 'boss' ? null : pick(rng, PREFIX);
    // the story walks the act in order (act.route, one place per step); the draw is kept so the rest of the seeded picks stay the same
    const roam = kind === 'boss' ? null : pick(rng, roamPlaces.length ? roamPlaces : act.places);
    const place = extra.place || (kind === 'boss' ? act.places[act.places.length - 1] : act.route?.[s - 1] || roam);
    const foeNames = extra.foeNames || (locked && labels && enemies === locked ? labels : null)
      || (labels && extra.useNames ? labels : null);
    const titled = (kind === 'boss' || kind === 'elite') && foeNames?.[0];
    const q = {
    id: `${c.act}.${s}.${extra.perilous ? 'p' : kind}`, act: c.act, step: s, kind, enemies, place,
    name: titled ? foeNames[0] : (kind === 'boss' ? `${mdef(enemies[0], c).name}` : `${prefix} ${place}`),
    foeNames: foeNames || undefined,
    // elites and bosses are built for their own act already; the act growth only lifts them when an act reuses older monsters
    hpMult: ((kind === 'boss' || kind === 'elite') && c.act <= acts.length ? (1 + STEP_HP * (s - 1)) : base * (extra.perilous ? PERIL.hp : 1) * (locked && kind === 'battle' ? (act.fightHp?.[s] ?? 1) : 1)) * (SET_PIECE[kind]?.hp[ai] ?? 1) * ((kind === 'boss' || kind === 'elite') && locked ? (act.fightHp?.[s] ?? 1) : 1),
    flat: flat + (extra.perilous ? PERIL.flat : 0) + (kind === 'battle' && !extra.perilous && !lesson ? standardFlat(c.act, enemies) : 0) + (SET_PIECE[kind]?.flat[ai] ?? 0),
    rewardMult: extra.perilous ? PERIL.reward : 1, perilous: !!extra.perilous,
    };
    return attachNemesis(q, c);
  };
  const poolPick = () => pick(rng, act.pool);
  // Call for Help (step 8) wins over the route lock and over any gate — unless this pack turned it off.
  if (s === 8 && c.nextPlace && (act.help?.length || c.nextEnemies?.length)) {
    const help = c.nextEnemies?.length ? c.nextEnemies : (locked || (opts.random ? encounterFor(hero) : poolPick()));
    return [mk('battle', help, { place: c.nextPlace })];
  }
  const gate = act.gates?.[s];
  if (gate) {
    const foes = locked || gate.enemies || (gate.kind === 'boss' ? act.boss : gate.kind === 'elite' ? pick(rng, act.elite) : (opts.random ? encounterFor(hero) : poolPick()));
    return [mk(gate.kind, foes, { place: gate.place, boss: gate.kind === 'boss', useNames: !!locked })];
  }
  if (s >= QUESTS_PER_ACT) return [mk('boss', locked || act.boss, { boss: true, useNames: !!locked })];
  if (ELITE_STEPS.includes(s)) {
    let el = locked || pick(rng, act.elite);
    // Easy used to drop the extra add from a two-monster elite. Story acts keep the locked cast; Ascents may still slim it.
    if (!locked && opts.random) { const sorted = [...act.elite].sort((x, y) => x.length - y.length); el = normalizeDifficulty(hero.difficulty) === 'easy' ? sorted[0] : el; }
    return [mk('elite', el, { useNames: !!locked }), mk('battle', poolPick(), { perilous: true })];
  }
  let a = locked || poolPick(); let bq = poolPick();
  for (let tries = 0; tries < 6 && bq.join() === a.join(); tries++) bq = poolPick();
  const weight = (f) => f.reduce((t, id) => t + mdef(id, c).hp, 0);
  if (!locked && weight(a) > weight(bq)) [a, bq] = [bq, a]; // Standard is always the lighter road (tools / Ascents)
  // The very first fight is a lesson: a lone goblin on the standard road, so a new player can learn the dice without a crowd.
  if (c.act === 1 && s === 1 && !(c.wins > 0) && !locked) a = ['goblin'];
  else if (!locked && opts.random) a = encounterFor(hero); // Ascents and the balance tools
  const std = mk('battle', a, { useNames: !!locked });
  return [withWanderer(std, c, act, s), mk('battle', bq, { perilous: true })];
}
// Wanderers (Dave, Oct 2026: "it's always a dog, a goblin and a little red dragon"): on some ordinary fights a monster from
// outside this act's usual crowd wanders in, so a campaign meets more of the bestiary. The story's own foes keep their names;
// the wanderer is extra, so the cast shares its health out (WANDER.share) and every hit is a little softer (flatCut), to keep
// the fight about as hard as it was (tools/skill-all.sh with WANDER='{"chance":0}' measures the difference).
export const WANDER = { chance: 0.45, from: 2, share: 1.3, flatCut: 3, maxCast: 2 }; // maxCast: only fights of one or two foes get a wanderer (no crowd of four)
// Story-only characters set wander: false on the sheet (Sir Reginald today; Marmalade, Captain Squawk, Inspector Croak, Monsieur Gratin later).
export function mayWander(id, camp) {
  const m = mdef(id, camp) || MONSTERS[id];
  return !!(m && m.tier === 'minion' && m.wander !== false);
}
export function wanderRoster(c, act) {
  const home = new Set((act?.pool || []).flat());
  const ban = new Set(bansOf(c));
  return Object.keys(MONSTERS).filter((id) => mayWander(id, c) && !home.has(id) && !ban.has(id)).sort();
}
function preferLand(ids, land) {
  if (!land) return ids;
  const hit = ids.filter((id) => landsOf(MONSTERS[id]).includes(land));
  return hit.length ? hit : ids;
}
function shuffleWander(ids, c) {
  const order = [...ids];
  const rng = makeRng(hashSeed(c.seed, c.act, 'wander-order'));
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order;
}
function pickWanderId(order, s, skip) {
  if (!order.length) return null;
  const blocked = new Set((skip || []).filter(Boolean));
  const start = ((s % order.length) + order.length) % order.length;
  for (let k = 0; k < order.length; k++) {
    const id = order[(start + k) % order.length];
    if (!blocked.has(id)) return id;
  }
  return order[start]; // no other choice: keep the seeded pick
}
function stepOpenForWander(act, s, c) {
  if (s < WANDER.from || s >= QUESTS_PER_ACT) return false;
  if (stepKind(act, s) !== 'battle') return false;
  if (act.gates?.[s]) return false;
  if (s === 8 && c?.nextPlace && (act.help?.length || c.nextEnemies?.length)) return false;
  return true;
}
function foesAtStep(act, s) { return act.fights?.[s - 1] || []; }
function wandererAtStep(c, act, s, enemies) {
  if (!stepOpenForWander(act, s, c)) return null;
  const foes = enemies || foesAtStep(act, s);
  if (foes.length > WANDER.maxCast) return null;
  const rng = makeRng(hashSeed(c.seed, c.act, s, 'wander'));
  if (rng() >= WANDER.chance) return null;
  const roster = preferLand(wanderRoster(c, act), act.land);
  if (!roster.length) return null;
  const prev = s > WANDER.from ? wandererAtStep(c, act, s - 1) : null;
  return pickWanderId(shuffleWander(roster, c), s, [...foes, prev]);
}
function withWanderer(q, c, act, s) {
  if (WANDER.chance <= 0 || q.kind !== 'battle' || q.enemies.length > WANDER.maxCast) return q;
  const id = wandererAtStep(c, act, s, q.enemies);
  if (!id) return q;
  const n = q.enemies.length;
  return { ...q, enemies: [...q.enemies, id], wanderer: id, hpMult: q.hpMult * (n / (n + WANDER.share)), flat: Math.max(0, q.flat - WANDER.flatCut) }; // (the story's names stay as written; one more mouth to feed, so each hits a little softer)
}
function attachNemesis(quest, campaign) {
  if (!campaign || quest.kind === 'boss' || quest.perilous) return quest;
  const ready = (campaign.nemeses || []).filter((n) => campaign.act > n.act || campaign.step >= n.step + 3);
  if (!ready.length) return quest;
  const n = ready[0];
  if (quest.enemies.includes(n.id)) return { ...quest, nemesis: n };
  return { ...quest, enemies: [n.id, ...quest.enemies].slice(0, ENEMY_CAP), nemesis: n, ambushed: true };
}
export function advanceCampaign(hero) {
  const c = hero.campaign;
  c.wins++; c.shop = null;
  c.nextPlace = null; c.nextEnemies = null;
  if (c.step >= QUESTS_PER_ACT) { c.act++; c.step = 1; } else c.step++;
  const r = c.reached || { act: 1, step: 1 };
  if (c.act > r.act || (c.act === r.act && c.step > r.step)) c.reached = { act: c.act, step: c.step };
}

// ------------------------------------------------------------------------------- company battles
// A company resolves once, after every living hero has locked a board. The computer has
// already rolled every monster intention for the round. Feet decide who draws the
// retaliation: the slowest hero (lowest Feet) is the one the monsters go after and takes 2/(n+1), everyone else 1/(n+1).
// Phones gather the locks.
// The math does not care which device rolled them.

export function newCompany({ name, roster, seed, pack }) {
  const packId = packIdOf(pack);
  const campaign = {
    pack: packId, act: 1, step: 1, seed: (seed ?? Math.floor(Math.random() * 1e9)) >>> 0, shop: null, wins: 0,
    blessings: [], seenRoads: [], campFlags: {}, ambush: null, chronicle: [], nemeses: [],
  };
  const members = roster.map((r, i) => {
    const hero = newHero({ name: r.name, cls: r.cls, color: r.color, seed: (campaign.seed + i * 997) >>> 0, pack: packId });
    hero.campaign = campaign;
    return hero;
  });
  uniqueColors(members);
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

// Living fighters who have rolled, in INITIATIVE order: highest Feet, then highest hands, then a coin flip.
export function rankFighters(fighters, rng) {
  const rows = fighters.filter((f) => f.hp > 0 && f.board).map((f) => ({
    f, feet: f.board.S.v, hands: f.board.W.v + f.board.E.v, coin: rng(),
  }));
  rows.sort((a, b) => b.feet - a.feet || b.hands - a.hands || b.coin - a.coin);
  return rows;
}
// Who the monsters go after (the "leader" of the round, who takes the double share): the slowest hero, lowest Feet.
// A tie goes to the hero with more health right now, then a coin flip.
export function heatRank(fighters, rng) {
  const rows = fighters.filter((f) => f.hp > 0 && f.board).map((f) => ({ f, feet: f.board.S.v, hp: f.hp, coin: rng() }));
  rows.sort((a, b) => a.feet - b.feet || b.hp - a.hp || b.coin - a.coin);
  return rows;
}
export function shareWeights(ranked) {
  const n = ranked.length;
  if (n <= 1) return ranked.map(() => 1);
  return ranked.map((_, i) => (i === 0 ? 2 : 1));
}

function makeFighter(hero) {
  wieldDiamonds(hero); // a Diamond brought from camp takes its hand for this fight (after the company's strength was measured, so it helps)
  const boon = pullBlessings(hero); const pact = hasCharm(hero, 'pact');
  const maxHp = Math.max(1, maxHpOf(hero) + Math.max(0, boon.startHp || 0) - (pact ? 8 : 0));
  return {
    hero, maxHp, hp: Math.max(1, maxHp - (boon.wound || 0)),
    magic: pact ? magicCapOf(hero) : Math.max(0, Math.min(magicCapOf(hero), startMagicOf(hero) + boon.startMagic)), boon,
    board: null, actionsLeft: rerollTotal(), freeActions: [], used: {}, usedRound: {}, charge: {}, mods: blankMods(), potions: potionStock(hero), points: 0, reviveUsed: false, teamRound: 0,
    nextBound: 0, nextChained: 0, lastBoard: null, nextHushed: false, hushedNow: false, boundNow: 0, lastStandUsed: false, goldEarned: 0, straight: 'atk', target: 0,
    stats: blankPartyStats(), contrib: 0,
    magic0: pact ? magicCapOf(hero) : Math.max(0, Math.min(magicCapOf(hero), startMagicOf(hero) + boon.startMagic)), potions0: potionStock(hero), // for secret objectives
  };
}
function blankPartyStats() {
  return { dealt: 0, taken: 0, healed: 0, kills: 0, blocked: 0, shieldRounds: 0, heldLine: 0, potionsThrown: 0, magicShared: 0, revives: 0, bossKill: false, shares: 0, healGiven: 0 };
}
// usedRound and charge are each hero's own: every-round powers come back each round, charges are stored per hero.
const MIRROR = ['hp', 'maxHp', 'magic', 'board', 'actionsLeft', 'freeActions', 'used', 'usedRound', 'charge', 'lastCast', 'mods', 'nextBound', 'boundNow', 'nextChained', 'lastBoard', 'nextHushed', 'hushedNow', 'lastStandUsed', 'goldEarned', 'potions', 'points'];
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

export function newPartyBattle(heroes, quest0, rng) {
  const players = heroes.length;
  const quest = withDifficulty(heroes[0], quest0);
  const sc = partyScale(players, heroes);
  const hpMult = quest.hpMult ?? 1; const flat = quest.flat ?? 0; const rewardMult = quest.rewardMult ?? 1; const edge = quest.edge || null;
  const enemies = [];
  for (let i = 0; i < quest.enemies.length; i++) {
    const id = quest.enemies[i];
    enemies.push(spawnEnemy(id, { hpMult: hpMult * sc.hp, flat, teamFlat: sc.flat, rewardMult, edge, campaign: heroes[0].campaign, name: quest.foeNames?.[i] }, rng));
  }
  for (let i = 0; i < sc.adds; i++) enemies.push(spawnEnemy('goblin', { hpMult, flat, teamFlat: sc.flat, rewardMult, edge, campaign: heroes[0].campaign }, rng));
  dressNemesis(enemies, quest.nemesis);
  const b = {
    kind: 'party', rng, quest, players, heroes, enemies, fighters: heroes.map(makeFighter), team: { m: +sc.m.toFixed(2), hp: +sc.hp.toFixed(2), flat: sc.flat }, // how hard the company made it
    active: 0, round: 0, phase: 'reset', outcome: null, report: null, stolen: 0,
  };
  beginPartyRound(b);
  focusFighter(b, 0);
  return b;
}
function livingFighters(b) { return b.fighters.filter((f) => f.hp > 0); }
export function beginPartyRound(b) {
  b.round += 1; b.phase = 'reset';
  for (const f of b.fighters) { f.board = null; f.mods = blankMods(); f.usedRound = {}; f.straight = 'atk'; }
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
    pierce: ev.pierce + (m.pierce || 0) + (boon.pierce || 0),
    block: ev.block + (m.block || 0) + (boon.block || 0) + (round === 1 ? (boon.openingBlock || 0) : 0),
    heal: ev.heal + (m.heal || 0),
    magic: ev.magic, gold: ev.gold,
  };
  return { ev, T };
}

// Team triples: two or more heroes landing the same kind of triple in one round each get TEAM_TRIPLE_BONUS more (scaled by act).
// Attack rows (Weapons, Strength, Talent) only count when they hit the same monster. Heartbeat: if every hero's heart die shows
// the same face, each gains magic equal to the number of heroes.
const TEAM_LABEL = { weapons: 'Team Weapons Attack', strength: 'Team Strength Attack', talents: 'Team Talent Attack', headtoe: 'Team Head to Toe Block', left: 'Team Left Guard', right: 'Team Right Guard' };
const GUARD_ROWS = new Set(['headtoe', 'left', 'right']); // the columns: they add block for the whole party, not attack on one monster
function teamBonuses(b, acting) {
  const out = { team: [], heartbeat: null };
  if (acting.length < 2) return out;
  const tgtOf = (f) => { const t = b.enemies[f.target]; return t && t.hp > 0 ? t.uid : b.enemies.find((e) => e.hp > 0)?.uid; };
  for (const row of ['weapons', 'strength', 'talents', 'headtoe', 'left', 'right']) {
    const who = acting.filter((f) => (f.ev.triples || []).some((t) => t.row === row));
    if (who.length < 2) continue;
    const groups = new Map();
    for (const f of who) { const k = GUARD_ROWS.has(row) ? 'all' : tgtOf(f); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
    for (const g of groups.values()) {
      if (g.length < 2) continue;
      const bonus = TEAM_TRIPLE_BONUS * tripleBonus(g[0].hero) / SYNERGY_BONUS; // grows with the act like a triple
      for (const f of g) { if (GUARD_ROWS.has(row)) f.T.block += bonus; else f.T.atk += bonus; f._team++; }
      out.team.push({ row, label: TEAM_LABEL[row], names: g.map((f) => f.hero.name), bonus });
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
  if (kind === 'magic') { if (F.magic < SHARE_MAGIC) return { ok: false, why: `Needs ${SHARE_MAGIC} magic.` }; if (T.hp <= 0) return { ok: false, why: `${T.hero.name} is down.` }; if (T.magic >= magicCapOf(T.hero)) return { ok: false, why: `${T.hero.name} is full of magic.` }; return { ok: true }; }
  if (kind === 'revive') { if (F.reviveUsed) return { ok: false, why: 'You have used your revive this battle.' }; if (T.hp > 0) return { ok: false, why: `${T.hero.name} is still standing.` }; if (F.magic < REVIVE_COST) return { ok: false, why: `Needs ${REVIVE_COST} magic.` }; return { ok: true }; }
  return { ok: false, why: 'Unknown action.' };
}
export function teamAction(b, from, kind, to) {
  if (b.fighters[b.active]) commitFighter(b);
  const r = teamActionInfo(b, from, kind, to); if (!r.ok) { if (b.fighters[b.active]) focusFighter(b, b.active); return r; }
  const F = b.fighters[from]; const T = b.fighters[to];
  if (kind === 'potion') { const before = T.hp; if (drinkPotion(F, T)) { F.stats.potionsThrown = (F.stats.potionsThrown || 0) + 1; F.stats.healGiven = (F.stats.healGiven || 0) + (T.hp - before); } }
  else if (kind === 'magic') { F.stats.shares = (F.stats.shares || 0) + 1; F.magic -= SHARE_MAGIC; const got = Math.min(magicCapOf(T.hero), T.magic + SHARE_MAGIC) - T.magic; T.magic += got; F.stats.magicShared = (F.stats.magicShared || 0) + got; award(F, SHARE_MAGIC * POINTS.magicGift); }
  else if (kind === 'revive') { F.magic -= REVIVE_COST; F.reviveUsed = true; T.hp = Math.min(T.maxHp, REVIVE_HP); F.stats.healGiven = (F.stats.healGiven || 0) + T.hp; T.board = null; F.stats.revives = (F.stats.revives || 0) + 1; award(F, POINTS.revive); }
  F.teamRound = b.round; F.contrib = F.points;
  if (b.fighters[b.active]) focusFighter(b, b.active);
  return { ok: true };
}
// The round log for secret objectives (secrets.js judges the cards from it): what each hero did this round.
function logRound(b, f, { blocked = 0, leader = false, target = null } = {}) {
  const bd = f.board || {}; const v = (s) => bd[s]?.v || 0; const m = f.mods || {};
  const used = rerollTotal() - (f.actionsLeft ?? rerollTotal());
  (b.secretLog ||= []).push({
    r: b.round, name: f.hero.name, dealt: f._dealt || 0, magic: Math.min(f._dealt || 0, (m.atk || 0) + (m.pierce || 0) + (m.splash || 0) + (m.aoe || 0)),
    kills: [...(f._killed || [])], blocked, blk: f.T?.block || 0, gold: f.T?.gold || 0, triples: (f.ev?.triples || []).length, straight: f.ev?.straight ? (f.straight || 'atk') : null,
    N: v('N'), W: v('W'), E: v('E'), S: v('S'), C: v('C'), talents: ['SW', 'SE'].filter((sl) => bd[sl] && isActive(f.hero, sl) && specialFace(f.hero, sl, bd[sl].v)).length,
    leader, target, hp: f.hp, mp: f.magic, paid: Math.max(0, used - RULES.free),
  });
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
    f.ev = ev; f.T = T; f._dealt = 0; f._kills = 0; f._team = 0; f._killed = [];
    if (ev.offense3 || ev.defense3) f.hero.stats.triples++;
    if (ev.straight) f.hero.stats.straights++;
    f.goldEarned += T.gold;
    f.hero.stats.rounds++;
  }
  const team = teamBonuses(b, acting);
  const alive = b.enemies.filter((e) => e.hp > 0);
  for (const e of alive) {
    e.pdice = rollPower(e, e.intent, b.rng); e.p = e.pdice[0];
    e.mag = magnitude(e, e.intent, e.pdice, weaken); e.calc = magnitudeParts(e, e.intent, e.pdice, weaken);
    e.buffUsed = e.buff; e.buff = 0; e.hp0 = e.hp; e.arm = armorOf(e, b.rng);
  }
  const order = rankFighters(acting, b.rng); // who acts first
  const heat = heatRank(acting, b.rng);      // who the monsters go after
  const rep = {
    round: b.round, party: true, leader: heat[0]?.f.hero.name || '', strikes: [], team: team.team, heartbeat: team.heartbeat, moral: [],
    killed: [], raged: [], summoned: [], acts: [],
    fighters: [], bound: 0, magicStolen: 0, goldStolen: 0,
  };
  const guardLeft = new Map();
  for (const e of alive) {
    const g = (GUARD_VERBS.has(e.intent?.v) ? e.mag : 0) + (e.arm || 0);
    if (g) guardLeft.set(e.uid, g);
  }
  // Monsters answer the living. The slowest hero takes the double share; each hero's block soaks only their share.
  const snap = heat.map((r) => r.f);
  const weights = shareWeights(heat);
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
    const phase = tgt.intent?.v === 'phase';
    const pool = phase ? T.atk : guardLeft.get(tgt.uid) || 0;
    tgt.lastHurt = T.pierce > T.atk ? 'pierce' : (f.ev.splash || f.mods?.aoe) ? 'magic' : T.block > T.atk ? 'tank' : 'blade';
    const guarded = Math.min(pool, T.atk);
    if (guardLeft.has(tgt.uid)) guardLeft.set(tgt.uid, pool - guarded);
    const dmg = Math.floor((Math.max(0, T.atk - guarded) + T.pierce) * (f.pactBribe ? 0.5 : 1)); // The Pact (a secret bribe): half damage
    const dealt = Math.min(tgt.hp, dmg);
    tgt.hp = Math.max(0, tgt.hp - dmg);
    f.stats.dealt += dealt; f._dealt += dealt;
    const burn = dealt > 0 ? burnOf(tgt) : 0; // Fire Ward burns the hero who hit it
    if (burn) { const k = snap.indexOf(f); if (k >= 0) taken[k] += burn; }
    const kill = (e) => { // the killing blow: credit, Moral Boost, and the stolen gold goes back to whoever lost it
      rep.killed.push(e.uid); f._kills++; f.stats.kills = (f.stats.kills || 0) + 1; (f._killed ||= []).push(e.uid);
      if (e.tier === 'boss') f.stats.bossKill = true;
      moral = { from: f.hero.name, n: MORAL_BOOST };
      let pot = e.carried;
      const victims = [...b.fighters].filter((v) => v.purseLost > 0).sort((a, c) => c.purseLost - a.purseLost);
      for (const v of victims) {
        const back = Math.min(pot, v.purseLost); v.goldEarned += back; v.purseLost -= back; pot -= back;
      }
      e.carried = 0;
    };
    const killed = tgt.hp <= 0;
    if (killed) kill(tgt);
    // splash (to the others) and area damage (to everyone), from powers, as in a solo fight
    const splashed = [];
    const splash = (f.mods?.splash || 0) + (f.ev.splash || 0); const aoe = f.mods?.aoe || 0;
    if (splash > 0 || aoe > 0) {
      for (const e of b.enemies) {
        if (e.hp <= 0) continue;
        const hit = Math.floor(((e === tgt ? 0 : splash) + aoe) * (f.pactBribe ? 0.5 : 1)); if (hit <= 0) continue;
        const before = e.hp; e.hp = Math.max(0, e.hp - hit); const d = before - e.hp;
        splashed.push({ uid: e.uid, dealt: d, killed: e.hp <= 0 }); f.stats.dealt += d; f._dealt += d;
        if (e.hp <= 0) kill(e);
      }
    }
    const fm = f.mods || {}; const magic = (fm.atk || 0) + (fm.pierce || 0) + splash + aoe > 0; // a power put something into this blow
    rep.strikes.push({
      name: f.hero.name, uid: f.hero.name, targetUid: tgt.uid, dealt, guarded, pierce: T.pierce, atk: T.atk,
      killed, ev: f.ev, T, burned: burn || 0, phased: phase, splashed, magic,
    });
  };
  const actFor = (e) => {
    if (e.hp <= 0 || !e.intent || e.fresh) return;
    const i = e.intent; const act = { uid: e.uid, name: i.n, v: i.v, mag: e.mag, p: e.p, calc: e.calc, k: i.k || 0, slam: !!i.slam, arm: e.arm || 0 };
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
      case 'chain': if (leader) { leader.nextChained += i.k; rep.chained = (rep.chained || 0) + i.k; } break;
      case 'hush': if (leader) { leader.nextHushed = true; rep.hushed = true; if (i.k) { leader.nextChained += i.k; rep.chained = (rep.chained || 0) + i.k; } } break;
      case 'breath': {
        const part = Math.ceil(e.mag * BREATH_SHARE);
        const nets = []; const parts = [];
        snap.forEach((f, i) => {
          const soak = (f.boon?.breathBlock || 0);
          const hit = Math.max(0, part - soak);
          parts.push(hit);
          const ab = Math.min(blocks[i], hit); blocks[i] -= ab; absorbed[i] += ab; taken[i] += hit - ab; nets.push(hit - ab);
        });
        Object.assign(act, { d: e.mag, net: nets.reduce((a, n) => a + n, 0), ab: parts.reduce((a, p, i) => a + (p - (nets[i] || 0)), 0), parts, nets });
        break;
      }
      case 'summon': {
        const room = ENEMY_CAP - livingNow().length; const add = e.adds || mof(e.id, b).adds;
        for (let n = 0; n < Math.min(i.k, room); n++) {
          const s = spawnEnemy(add, { hpMult: e.hpMult * 0.75, flat: e.flat - (e.teamFlat || 0), teamFlat: e.teamFlat || 0, rewardMult: 0, edge: e.edge, campaign: campOfBattle(b) }, b.rng);
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
  for (const e of alive) { const initDie = e.initDie || mof(e.id, b)?.init || 4; e.init = forced ? null : die(b.rng, initDie); e._initDie = initDie; }
  const line = [];
  order.forEach((r, k) => line.push({ kind: 'hero', f: r.f, v: forced ? 99 : r.feet, tie: 0, k }));
  alive.forEach((e, k) => line.push({ kind: 'foe', e, v: forced ? -1 : e.init, tie: 1, k }));
  line.sort((x, y) => y.v - x.v || x.tie - y.tie || x.k - y.k);
  rep.init = { forced, heroes: order.map((r) => ({ name: r.f.hero.name, init: r.feet, die: feetSize(r.f.hero) })), foes: alive.map((e) => ({ uid: e.uid, init: e.init, die: e._initDie || e.initDie || 4 })) };
  rep.order = line.map((x) => (x.kind === 'hero' ? { kind: 'hero', name: x.f.hero.name, v: heroInit.get(x.f) } : { kind: 'foe', uid: x.e.uid, name: x.e.name, v: x.e.init }));
  const runningHp = (f) => { const i = snap.indexOf(f); return Math.min(f.maxHp, f.hp + f.T.heal) - taken[i]; };
  for (const x of line) {
    if (x.kind === 'hero') { if (runningHp(x.f) <= 0) { (rep.fallen = rep.fallen || []).push(x.f.hero.name); continue; } strikeFor(x.f); } else actFor(x.e);
  }
  if (moral) b.moralNext = moral; // nobody left to act this round: it carries to the first hero next round
  settleStalks(b, rep);
  for (const e of b.enemies) { e.cancelled = false; e.fresh = false; }
  for (const e of livingNow()) {
    const rg = e.rage || mof(e.id, b).rage;
    if (rg && !e.raged && e.hp <= e.maxHp / 2) {
      e.raged = true; e.powerDie = rg.power; e.faces = rg.faces; e.rageName = rg.name; rep.raged.push(e.uid);
      if ('armor' in rg) e.armor = rg.armor;
    }
  }
  tryFlee(b, rep);
  if (leader?.board) leader.lastBoard = Object.fromEntries(Object.entries(leader.board).map(([s, d]) => [s, d.v]));
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
    if (f.hp <= 0 && hasCharm(f.hero, 'phoenix') && !f.phoenixUsed) { f.phoenixUsed = true; f.hp = Math.min(f.maxHp, 10); (rep.phoenix ||= []).push(f.hero.name); }
    if (f.pactBribe && f.hp < 1) f.hp = 1; // ...and the monster keeps its promise: never knocked out
    if (f.boon?.sick && f.hp > 1) { const n = Math.min(f.boon.sick, f.hp - 1); f.hp -= n; (rep.sick ||= []).push({ name: f.hero.name, n }); } // the road's bug: never the last point
    f.stats.healed += healed; f.stats.taken += taken[i];
    f.stats.blocked = (f.stats.blocked || 0) + absorbed[i];
    // The hero the monsters went after is the company's shield: blocks count double, and standing at the end holds the line.
    const shield = i === 0 && snap.length > 1;
    const held = shield && absorbed[i] + taken[i] > 0 && f.hp > 0;
    if (shield) { f.stats.shieldRounds = (f.stats.shieldRounds || 0) + 1; rep.shield = { name: f.hero.name, blocked: absorbed[i], held }; }
    if (held) f.stats.heldLine = (f.stats.heldLine || 0) + 1;
    const pts = Math.round(roundPoints({ dealt: f._dealt, absorbed: absorbed[i], healed, kills: f._kills, triples: (f.ev.triples || []).length, teamTriples: f._team, straight: !!f.ev.straight, down: hpBefore > 0 && f.hp <= 0, shield, heldLine: held }));
    award(f, pts); f.contrib = f.points;
    let magic = f.magic + T.magic;
    if (f === leader && rep.magicStolen) magic -= rep.magicStolen;
    f.magic = Math.max(0, Math.min(magicCapOf(f.hero), magic));
    rep.fighters.push({
      name: f.hero.name, taken: taken[i], absorbed: absorbed[i], healed,
      hpAfter: f.hp, magicAfter: f.magic, gold: T.gold, feet: f.board.S.v, leader: i === 0, contrib: f.contrib, points: pts, total: pointsOf(f),
    });
    logRound(b, f, { blocked: absorbed[i], leader: i === 0 && snap.length > 1, target: b.enemies[f.target]?.uid ?? null });
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
  const pay = (e) => (e.fled ? FLEE_REWARD : 1);
  const xp = dead.reduce((a, e) => a + Math.round(e.xp * pay(e)), 0);
  const act0 = b.fighters[0]?.hero?.campaign?.act || 1; const baseKills = Math.round(dead.reduce((a, e) => a + e.gold * pay(e), 0) * (ACT_GOLD[Math.min(ACT_GOLD.length, act0) - 1] || 1));
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
  const nemesisKill = dead.some((e) => e.nemesis && !e.fled && e.hp <= 0);
  const minRarity = quest.kind === 'boss' ? 2 : quest.kind === 'elite' ? 1 : nemesisKill ? 2 : 0;
  const drops = rollDrops(rng, n + 1, { minRarity, rarityBoost: (quest.perilous ? 2 : 0) + (quest.kind === 'boss' ? 2 : 0) + sample.campaign.act - 1, sizes: dropSizeWeights(sample.campaign.act, sample.campaign.step, quest.perilous ? 1 : 0) });
  addLegendary(drops, quest, b.fighters.map((f) => f.hero), hashSeed(sample.campaign.seed, sample.campaign.act, sample.campaign.step, 'legend'));
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

// ------------------------------------------------------------------------------- shrinking dice (Dave)
// What would be lost: the symbols on the faces that go away (talent dice and the pet's die).
function shrinkLoss(hero, kind, slot, next) {
  if (kind === 'special') { const keep = TALENT_FACES[next] || 1; return (hero.talent?.[slot] || []).slice(keep).flat().length; }
  return 0;
}
export function downgradeInfo(hero, kind, slot) {
  let size;
  if (kind === 'speed') size = feetSize(hero); else if (kind === 'mind') size = mindSize(hero); else if (kind === 'strength' || kind === 'special') size = hero[kind]?.[slot];
  else if (kind === 'weapon') { ensureTwin(hero); const c = copiesOf(hero, slot); if (!c.length || c[0].id === 'fists') return { ok: false, why: 'none' }; size = weaponSize(c[0]); }
  else if (kind === 'pet') size = hero.pet?.size;
  const next = PREV_SIZE[size]; if (!size || !next) return { ok: false, why: 'smallest', size };
  const cost = DOWNGRADE_COST[size]; const lose = kind === 'pet' ? (hero.pet.faces || []).slice(next - 1).flat().length : shrinkLoss(hero, kind, slot, next);
  return { ok: hero.gold >= cost, why: hero.gold >= cost ? '' : 'gold', cost, size, next, lose };
}
export function downgradeDie(hero, kind, slot) {
  const r = downgradeInfo(hero, kind, slot); if (!r.ok) return false;
  hero.gold -= r.cost;
  if (kind === 'speed') { feetSize(hero); hero.speed.S = r.next; }
  else if (kind === 'mind') { mindSize(hero); hero.mind.N = r.next; }
  else if (kind === 'strength') hero.strength[slot] = r.next;
  else if (kind === 'special') { hero.special[slot] = r.next; if (hero.talent?.[slot]) hero.talent[slot] = hero.talent[slot].slice(0, TALENT_FACES[r.next] || 1); }
  else if (kind === 'weapon') for (const w of copiesOf(hero, slot)) w.size = r.next;
  else if (kind === 'pet') { hero.pet.size = r.next; hero.pet.faces = hero.pet.faces.slice(0, r.next - 1); }
  return true;
}
