// QuestDice — static game data. Pure data, no DOM, safe to import from node.
// Every number here is a tuning knob; see docs/DESIGN.md for the reasoning.

export const SLOTS = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'];
export const ROLE = {
  NW: 'weapon', NE: 'weapon', N: 'head', S: 'feet',
  W: 'hand', E: 'hand', C: 'heart', SW: 'special', SE: 'special',
  P: 'pet', // the pet die, on its own stand left of the board (only when the hero has a pet)
};
// PETS (Dave, Oct 2026): the Camp Store sells one pet a camp. A pet is one die beside the board: one face always blank, the
// rest hold symbols like a talent die (train them at camp). It starts with two of its own symbol. Each symbol pays the pet's
// power (2 on a d4, 3 on a d6, 4 on a d8): pets have no hand above them. Each pet wears its symbol's colour (Dave's pictures,
// assets/pets/<img>.webp, cut from assets/pets/src by dev/petcut.mjs).
export const PETS = {
  ember: { name: 'Ember', kind: 'atk', color: '#ff3b3b', img: 'ember', text: 'A little black dragon with a flame on its tail, and opinions about everything. Starts with two attack symbols.' },
  bristle: { name: 'Bristle', kind: 'pierce', color: '#ff8a1a', img: 'bristle', text: 'A brave hedgehog with a spear, convinced it is nine feet tall. Starts with two pierce symbols.' },
  turtle: { name: 'Shellback', kind: 'block', color: '#3aa4ff', img: 'turtle', text: 'A turtle in blue armour with a shield. Unhurried. Unmoved. Starts with two block symbols.' },
  bunny: { name: 'Sprig', kind: 'heal', color: '#38e87a', img: 'bunny', text: 'A gentle bunny in a leafy cloak. Soft paws, stubborn kindness. Starts with two heal symbols.' },
  owl: { name: 'Starling', kind: 'magic', color: '#b46cff', img: 'owl', text: 'A little owl in a wizard’s hat, which it takes very seriously. Starts with two magic symbols.' },
  penny: { name: 'Penny', kind: 'gold', color: '#ffc21a', img: 'penny', text: 'A golden baby dragon on a pile of coins. The pile is the point. Starts with two gold symbols.' },
};
// The first pets (a fox and a magpie) became Ember and Penny: old saves still find them (hidden from the store's list).
Object.defineProperty(PETS, 'pup', { value: PETS.ember, enumerable: false });
Object.defineProperty(PETS, 'magpie', { value: PETS.penny, enumerable: false });
export const SYM_NAMES = { atk: 'Attack', block: 'Block', pierce: 'Pierce', magic: 'Magic', heal: 'Heal', gold: 'Gold' };
export const PET_PRICE = 90;          // gold, at the Camp Store
export const PET_POWER = { 4: 2, 6: 3, 8: 4 }; // what each symbol pays, by die size
export const PET_GROW = { 4: 80, 6: 180 };     // gold to grow the pet die to the next size (d4 -> d6 -> d8)
export const PET_KIND_MAX = { 4: 4, 6: 6, 8: 8 }; // the pet's own symbol: up to one per side of the die (others twice, like talents), so a bigger pet hits harder
export const petKindMax = (size) => PET_KIND_MAX[size] || 4;
// Each side of the body is a "lane": weapon (corner) + strength (hand) + special (lower corner).
export const LANES = {
  L: { weapon: 'NW', hand: 'W', special: 'SW' },
  R: { weapon: 'NE', hand: 'E', special: 'SE' },
};
export const CARDINALS = ['N', 'W', 'E', 'S']; // head, hands, feet: the "always contribute" dice

export const MAGIC_CAP = 12;
export const MAX_LEVEL = 20;
// Rerolls: `free` actions cost nothing, then `paid` actions cost 1 magic per die. Each action rerolls up to the class's dice (+diceBonus).
// (Mutable so the balance simulator can compare rule sets.)
export const RULES = { free: 3, paid: 3, diceBonus: 1 };
// The same for every hero (not a class choice): magic at the start of a fight, and dice you may reroll at once.
export const START_MAGIC = 4;
export const REROLL_DICE = 3; // dice per reroll (Dave, Oct 2026: 3 to start; a 4th is bought at camp)
export const REROLL_DIE_COST = 200; // gold, once: every reroll may take a 4th die from then on
export const REROLL_DICE_MAX = 4;
export const REROLL_ACTIONS = 6; // free + paid, for the UI pips
export const SYNERGY_BONUS = 10;
export const TRIPLE_BY_ACT = [10, 15, 20]; // what each triple pays in Act I / II / III, attack or block (Dave, Oct 2026: triples keep up with the act)
export const HEAL_COST = 2; // magic; each further heal in the same round costs 1 more (too much of one thing is worth less)
export const HEAL_AMOUNT = 4; // hp  (1 magic = 2 hp)
export const NUDGE_COST = 3; // turning the heart die is a special, pricey act
export const RECHARGE_COST = 3;

// Universal number language on head, hands and feet (see FACE_PAY): 1 heal at 3; 2 pierce, 3 magic, 4 gold at 2 each; 5-8 repeat the pattern at 3; 9 = 2 heal + 2 pierce; 10 = 2 magic + 2 gold.
export const RES_BY_SIZE = { 4: [2, 2, 2, 2], 6: [2, 2, 2, 2], 8: [2, 2, 2, 2], 10: [2, 2, 2, 2] }; // faces 1-4 (kept for older callers)
// What each face of a head / hand / feet die pays. Same pattern all the way up: heal, pierce, magic, gold.
export const FACE_PAY = [null,
  { heal: 3 }, { pierce: 2 }, { magic: 2 }, { gold: 2 },        // 1-4: the same on every die
  { heal: 3 }, { pierce: 3 }, { magic: 3 }, { gold: 3 },        // 5-8: three of the symbol
  { heal: 2, pierce: 2 }, { magic: 2, gold: 2 }];               // 9, 10: two kinds, two each
// Heart amplifier: a heart of 1-4 (heal, pierce, magic, gold) adds +2 for every head / hand / feet die showing that symbol (any face).
export const HEART_AMP = [2, 2, 2, 2];
export const HEART_COLOR_BONUS = 4; // face 5: +4 block on each blue weapon, face 6: +4 attack on each red weapon

// Straights across the seven numeric dice (blanks never count): length -> bonus (attack, or the same number in gold).
// The shortest straight that counts, by the hero's biggest body die (engine straightMin): stays special as the dice grow (Dave, Oct 2026).
export const STRAIGHT_MIN = { 4: 5, 6: 6, 8: 7, 10: 7 }; // about one round in three in every act (tools/curve.mjs, 21 Oct)
export const STRAIGHT = { 5: 10, 6: 18, 7: 30, 8: 45, 9: 60 }; // 8 and 9 in a row are possible with talent dice, the heart and weapon faces (Dave's 1-to-8 paid nothing)

export const RARITY = ['Bronze', 'Silver', 'Gold']; // three metals (Dave, Oct 2026): Gold is the finished weapon
export const RARITY_WEIGHTS = [70, 23, 7];
export const RARITY_SELL = [6, 14, 34]; // (old flat sell table; selling now pays SELL_SHARE of a weapon's worth)
// A weapon's worth = its base price x tier x size. The shop charges the full worth; selling returns half.
export const RARITY_MULT = [1, 2, 4];
export const SIZE_VALUE = { 4: 1, 6: 1.5, 8: 2.2, 10: 3 };
export const SELL_SHARE = 0.5;
// You carry what you wield plus a small pack. A full pack means choosing: sell, swap, or leave the spoils.
export const BAG_MAX = 4;
// Weapons wear out (Dave, Oct 2026: "it's good for so many battles, and then it's done"; no repair). Battles a weapon lasts by
// metal (Bronze, Silver, Gold); a legendary lasts as Gold; a Diamond is its own one-fight rule. Every battle it is carried into
// counts, won, lost or left. It never breaks mid-fight: after its last battle it is gone.
export const WEAR_BATTLES = [4, 6, 8];
// Spoils are mostly Bronze (Dave: "you rarely get them just for free for beating a boss"); Silver and Gold come from the store.
export const SPOILS_RARITY = [85, 13, 2];
// The Camp Store's four weapons, by metal: one Bronze, two Silver, one Gold. The fancy weapons are bought, and saved up for.
export const STORE_RARITY = [0, 1, 1, 2];
// The size of a found weapon. A bigger die needs a hand (Strength) at least that big, or it rolls as the hand's size.
// Weights for [d4, d6, d8, d10] by act; the boss always drops one a size up, the perilous road leans bigger.
export const DROP_SIZES = { 1: [100, 0, 0, 0], 1.5: [70, 30, 0, 0], 2: [45, 45, 10, 0], 3: [15, 50, 30, 5] };
// TIER (Bronze, Silver, Gold) = how many corner bonus symbols a weapon carries. (Forging and training weapons retired with wear, Oct 2026: a
// weapon is what you find or buy. These prices stay for old tools.)
export const FORGE_COST = [0, 40, 120];                 // gold to reach Silver, Gold (two-handed x1.4)
// SIZE (d4..d10) = the number range. A weapon die can never be bigger than the hand holding it.
export const WEAPON_SIZE_STEPS = { 4: 30, 6: 80, 8: 180 }; // gold to grow a weapon from this size to the next

// Faces are [value, color]; color r = offense (red), b = defense (blue). `fx` is the weapon's icon.
const F = (v, c, fx) => (fx ? { v, c, fx } : { v, c });
// Honest weapon dice (Dave, Oct 2026): a weapon is a custom die, but a dN never shows a number bigger than N. Four temperaments,
// for attack (red) and guard (blue) weapons alike; the faces for each size are below (O(n) = the other colour: a sword's blue
// parry, a shield's red bash). Metal adds the icons (see engine weaponFaces); `faces` and `bonus` on a weapon only name its icons.
//   steady     never blank, middle numbers, a low ceiling          dagger, bow, bracer
//   balanced   one blank, a spread of numbers, a parry face or two   sword, staff, shield
//   risky      two or three blanks, its top number twice             spear, long sword, tower shield
//   brutal     three or four blanks, its top number three or four times   mace, war hammer
const O = (v) => ({ v, o: 1 });
// A face that shows one number but hits harder (Dave, Oct 2026): P(3) is a 3 with an attack icon (a block icon on a blocking weapon),
// so it hits for 4, yet counts as a 3 for triples and straights. The all-or-nothing weapons never show their top number twice:
// a doubled top drops a step and takes the icon, which keeps their force and spreads their numbers (fewer free Weapons Triples
// on a two-hander, more straights).
const P = (v, plus = 1) => ({ v, plus });
export const WEAPON_DICE = {
  steady: { 4: [1, 2, O(2), 3], 6: [2, O(2), 3, 3, 4, 5], 8: [2, 3, O(3), 4, 4, 5, 5, 6], 10: [2, 3, O(3), 4, 4, 5, 5, 6, 7, 8] },
  balanced: { 4: [0, O(2), 3, 4], 6: [0, 2, O(3), 4, 5, 6], 8: [0, 2, O(3), 4, 5, O(6), 7, 8], 10: [0, 2, O(3), 4, 5, 6, O(7), 8, 9, 10] },
  risky: { 4: [0, 0, P(3), 4], 6: [0, 0, 4, 5, P(5), 6], 8: [0, 0, 0, 5, 6, 7, P(7), 8], 10: [0, 0, 0, 6, 7, 8, P(8), 9, P(9), 10] },
  brutal: { 4: [0, 0, P(3), 4], 6: [0, 0, 0, P(4, 2), P(5), 6], 8: [0, 0, 0, 0, 7, P(6, 2), P(7), 8], 10: [0, 0, 0, 0, 8, 9, P(7, 3), P(8, 2), P(9), 10] },
};
// Diamond weapons (Dave, Oct 2026): rare, awesome, and good for ONE fight. You find about one and a half an act (spoils, now and then
// the Camp Store), carry at most two in your Diamond case (they never take pack room), and bring one into a fight in place of a hand's
// weapon, or two, one in each hand (with a two-handed weapon, one Diamond fills both hands). When the fight ends, win, lose or
// withdraw, it shatters. Honest dice with no blanks: every face
// carries an icon and the top faces are crits with three. A Diamond rolls at its full size in any hand.
export const DIAMOND = {
  max: 2,
  chance: { battle: 0.04, elite: 0.35, boss: 0.3, shop: 0.03, perk: 0.25 }, // perk: the chance a level-up offers one as one of its three perks
  pool: ['dagger', 'sword', 'spear', 'mace', 'bracer', 'shield', 'tower'], // one-handed, so you can hold one in each hand
  sizeByAct: [6, 8, 10], // Dave: they get better each act (Act I d6, Act II d8, Act III d10); no blanks and crits keep even a d6 a treasure
  dice: { 6: [3, 4, 5, 6, 6, 6], 8: [5, 6, 6, 7, 7, 8, 8, 8], 10: [6, 7, 8, 8, 9, 9, 10, 10, 10, 10] },
  price: 3.2, // the Camp Store's price, times the weapon's base price per size step
};
// Charms (Dave, Oct 2026: "items that bend the rules", like relics in other roguelikes). Small trinkets, three at most, each changing one
// rule of the dice rather than adding a number. Found in the spoils of big fights and now and then in the Camp Store; kept for good.
export const CHARM_MAX = 3;
// Said plainly (Dave, Oct 2026: "I have no idea what charms are or what these words are saying"); the glossary lists all of them
export const CHARMS = {
  ember: { name: 'Ember Locket', icon: 'flame', text: 'If a weapon die lands on 0, you still get 6 attack and 2 magic.' },
  mirror: { name: 'Mirror Shard', icon: 'shine', text: 'Every straight you roll also heals you 12.' },
  twins: { name: 'Twin Coin', icon: 'coin', text: 'Both weapon dice land on the same number: bonus attack, the same as a triple.' },
  thorns: { name: 'Thorn Crown', icon: 'crown', text: 'The small icons on your weapon faces count twice. Three arrows give 6, not 3.' },
  bone: { name: 'Gambler’s Bone', icon: 'dice', text: 'A 1 on your head, hand or feet die counts as a 6.' },
  fang: { name: 'Wolf Fang', icon: 'skull', text: 'Every triple you roll pays double.' },
  lantern: { name: 'Wanderer’s Lantern', icon: 'reroll', text: 'One extra free reroll every round.' },
  phoenix: { name: 'Phoenix Feather', icon: 'heart', text: 'Once a battle, a hit that would knock you out leaves you at 10 health.' },
  pact: { name: 'Blood Pact', icon: 'spark', text: 'Start every battle with full magic, but 8 less health.' },
  heartstone: { name: 'Heartstone', icon: 'star', text: 'Your heart die rolls twice, and you keep the higher number.' },
};
export const CHARM_CHANCE = { boss: 1, elite: 0.5, battle: 0.03, shop: 0.2 }; // a boss offers a choice of two; the others one
export const CHARM_PRICE = [110, 150, 200]; // the Camp Store's price, by act
// The Camp Store (Dave, Oct 2026: the traveller who interrupted the road is gone; the store is always at camp). Besides weapons,
// two of these specials sit on the counter each camp: one fight's worth of help, bought for yourself. `by` scales the effect
// by act (I, II, III); prices are by act too.
export const STORE_TONICS = {
  oil: { name: 'Sharpening Oil', icon: 'pierce', text: (n) => `Your weapons bite: +${n} pierce every round of your next fight.`, by: [3, 4, 5], key: 'pierce', price: [30, 55, 80] },
  boots: { name: 'Borrowed Boots', icon: 'boot', text: (n) => `Fast boots for one fight: your feet roll a d${n}. They go back after.`, by: [8, 10, 12], key: 'feet', price: [25, 45, 70] },
  shield: { name: 'Rented Tower Shield', icon: 'block', text: (n) => `+${n} block in round 1 of your next fight.`, by: [10, 15, 20], key: 'openingBlock', price: [25, 45, 70] },
  paint: { name: 'War Paint', icon: 'atk', text: (n) => `+${n} attack in round 1 of your next fight.`, by: [10, 15, 20], key: 'openingAtk', price: [25, 45, 70] },
  tea: { name: 'Strong Tea', icon: 'magic', text: (n) => `Start your next fight with ${n} more magic.`, by: [3, 4, 5], key: 'startMagic', price: [30, 55, 80] },
  stew: { name: 'Hearty Stew', icon: 'heal', text: (n) => `+${n} health for your next fight.`, by: [10, 15, 20], key: 'startHp', price: [25, 45, 70] },
};
export const STORE_TONICS_SHOWN = 2;
// The mystery bundle (it was the traveller's gamble): a wrapped weapon at a flat price. Odds Bronze / Silver / Gold.
export const BUNDLE_ODDS = [0.5, 0.32, 0.18];
export const bundlePrice = (act = 1) => 70 + 25 * (Math.min(3, Math.max(1, act)) - 1);
export const WEAPONS = {
  fists: { name: 'Fists', hands: 1, lean: 'off', hidden: true, tag: 'Bare knuckles. A last resort, and a first language.',
    faces: [F(0, 'r'), F(0, 'b'), F(1, 'r'), F(1, 'b')] },
  dagger: { name: 'Dagger', hands: 1, lean: 'off', temper: 'steady', glyph: '🗡️', price: 18,
    tag: 'Steady: hardly ever blank, small sure numbers, a little mending. Small, honest, and always in the fight.',
    faces: [F(1, 'r'), F(2, 'r'), F(2, 'b'), F(3, 'r', { heal: 1 })],
    bonus: [{ face: 1, fx: { pierce: 1 } }, { face: 2, fx: { heal: 1 } }, { face: 3, fx: { pierce: 1 } }] },
  bracer: { name: 'Bracer', hands: 1, lean: 'def', temper: 'steady', glyph: '🛡️', price: 18,
    tag: 'Steady guard: hardly ever blank, small sure blues, sparks of magic. The polite way to say no.',
    faces: [F(1, 'b'), F(2, 'b'), F(2, 'r'), F(3, 'b', { magic: 1 })],
    bonus: [{ face: 1, fx: { heal: 1 } }, { face: 2, fx: { magic: 1 } }, { face: 3, fx: { heal: 1 } }] },
  sword: { name: 'Sword', hands: 1, lean: 'off', temper: 'balanced', glyph: '⚔️', price: 24,
    tag: 'Balanced: one blank, a spread of red, a blue parry or two, and a pierce on top. The old promise: cut, and keep cutting.',
    faces: [F(0, 'r'), F(2, 'b'), F(3, 'r'), F(3, 'r', { pierce: 1 })],
    bonus: [{ face: 2, fx: { pierce: 1 } }, { face: 1, fx: { magic: 1 } }, { face: 3, fx: { pierce: 1 } }] },
  shield: { name: 'Shield', hands: 1, lean: 'def', temper: 'balanced', glyph: '🛡️', price: 24,
    tag: 'Balanced wall: one blank, a spread of blue, a red bash or two. Shields have feelings too.',
    faces: [F(0, 'b'), F(2, 'r'), F(3, 'b'), F(3, 'b')],
    bonus: [{ face: 2, fx: { heal: 1 } }, { face: 3, fx: { magic: 1 } }, { face: 1, fx: { pierce: 1 } }] },
  spear: { name: 'Spear', hands: 1, lean: 'off', temper: 'risky', glyph: '🔱', price: 27,
    tag: 'Risky reach: two or three blanks, but when it lands it hits near the top (its second-best face carries a +1), and it pierces. Miss, miss, then through.',
    faces: [F(0, 'r'), F(0, 'b'), F(4, 'r', { pierce: 1 }), F(4, 'r', { pierce: 1 })],
    bonus: [{ face: 3, fx: { pierce: 1 } }, { face: 2, fx: { pierce: 1 } }, { face: 2, fx: { magic: 1 } }] },
  mace: { name: 'Mace', hands: 1, lean: 'off', temper: 'brutal', glyph: '🔨', price: 26,
    tag: 'Brutal: mostly blanks, but every face that lands hits for its top (the lower numbers carry +1 or +2 icons to get there). Patience, then a door coming off its hinges.',
    faces: [F(0, 'r'), F(0, 'r'), F(3, 'r'), F(5, 'r')],
    bonus: [{ face: 3, fx: { pierce: 1 } }, { face: 2, fx: { heal: 1 } }, { face: 3, fx: { pierce: 1 } }] },
  tower: { name: 'Tower Shield', hands: 1, lean: 'def', temper: 'risky', glyph: '🛡️', price: 30,
    tag: 'Risky wall: two or three blanks, and its second-best blue carries a +1 shield. Either nothing, or a house in the way.',
    faces: [F(0, 'b'), F(0, 'b'), F(4, 'b'), F(4, 'b', { heal: 1 })],
    bonus: [{ face: 2, fx: { heal: 1 } }, { face: 3, fx: { magic: 1 } }, { face: 2, fx: { magic: 1 } }] },
  bow: { name: 'Bow', twinName: 'Arrows', hands: 2, lean: 'off', temper: 'steady', glyph: '🏹', price: 42,
    tag: 'Two-handed and steady: a bow in one hand and arrows in the other. Hardly ever blank, sure numbers that pierce, and good odds at triples. Breathe. Loose.',
    faces: [F(1, 'b'), F(2, 'r'), F(2, 'r'), F(3, 'r', { pierce: 1 })],
    bonus: [{ face: 3, fx: { pierce: 1 } }, { face: 2, fx: { pierce: 1 } }, { face: 1, fx: { magic: 1 } }] },
  staff: { name: 'Staff', hands: 2, lean: 'off', temper: 'balanced', glyph: '🪄', price: 45,
    tag: 'Two-handed and balanced: a spread of numbers that spark magic. The stick does most of the talking.',
    faces: [F(0, 'b'), F(2, 'b'), F(3, 'r'), F(3, 'r', { magic: 2 })],
    bonus: [{ face: 2, fx: { magic: 1 } }, { face: 3, fx: { magic: 1 } }, { face: 1, fx: { heal: 1 } }] },
  longsword: { name: 'Long Sword', hands: 2, lean: 'off', temper: 'risky', glyph: '⚔️', price: 45,
    tag: 'Two-handed and risky: two or three blanks, and its second-best face carries a +1. All or a lot. Never a little.',
    faces: [F(0, 'r'), F(0, 'b'), F(4, 'r'), F(4, 'r')],
    bonus: [{ face: 2, fx: { pierce: 1 } }, { face: 3, fx: { pierce: 1 } }, { face: 2, fx: { magic: 1 } }] },
  warhammer: { name: 'War Hammer', hands: 2, lean: 'off', temper: 'brutal', glyph: '🔨', price: 48,
    tag: 'Two-handed and brutal: mostly blanks, but every face that lands hits for its top (the lower numbers carry icons to get there). When it lands, the hill notices.',
    faces: [F(0, 'r'), F(0, 'r'), F(2, 'r'), F(6, 'r')],
    bonus: [{ face: 3, fx: { pierce: 1 } }, { face: 2, fx: { pierce: 1 } }, { face: 3, fx: { heal: 1 } }] },
  // LEGENDARY weapons (Dave): rare and named, each with one rule of its own. Found only in elite and boss spoils, or now and
  // then from the Camp Store. Their faces are fixed (no forging; training a size still works), about +10 at d4, and they use
  // the `model` weapon's 3D shape. Only one legendary may be in your hands at a time.
  dawnbreaker: { name: 'Dawnbreaker', model: 'sword', legendary: true, hands: 1, lean: 'off', temper: 'legendary', glyph: '⚔️', price: 160,
    tag: 'Legendary sword of the first light. Its 4 also hits every other monster for 2. Dawn, with an edge.',
    faces: [F(1, 'r'), F(2, 'b'), F(3, 'r'), F(4, 'r', { splash: 2 })] },
  oakheart: { name: 'Oakheart', model: 'shield', legendary: true, hands: 1, lean: 'def', temper: 'legendary', glyph: '🛡️', price: 160,
    tag: 'Legendary shield of living oak. A blue 3 or 4 also heals 2. The tree still looks after you.',
    faces: [F(1, 'b'), F(2, 'r'), F(3, 'b', { heal: 2 }), F(4, 'b', { heal: 2 })] },
  thunderspear: { name: 'Thunder Spear', model: 'spear', legendary: true, hands: 1, lean: 'off', temper: 'legendary', glyph: '🔱', price: 160,
    tag: 'Legendary spear that rings like a storm. Every red face pierces 1. Thunder, aimed.',
    faces: [F(1, 'r', { pierce: 1 }), F(1, 'b'), F(4, 'r', { pierce: 1 }), F(4, 'r', { pierce: 1 })] },
  fortune: { name: 'Fortune’s Dagger', model: 'dagger', legendary: true, hands: 1, lean: 'off', temper: 'legendary', glyph: '🗡️', price: 160,
    tag: 'Legendary dagger with a lucky edge. Never blank, and a 3 also pays 3 gold. Fortune likes company.',
    faces: [F(2, 'r'), F(2, 'b'), F(3, 'r', { loot: 3 }), F(3, 'r', { loot: 3 })] },
  starfire: { name: 'Starfire Staff', model: 'staff', legendary: true, hands: 2, lean: 'off', temper: 'legendary', glyph: '🪄', price: 220,
    tag: 'Legendary two-handed staff. Every face gives magic, the 4 gives 2. Night sky, in the wood.',
    faces: [F(1, 'b', { magic: 1 }), F(2, 'b', { magic: 1 }), F(3, 'r', { magic: 1 }), F(4, 'r', { magic: 2 })] },
  twinfang: { name: 'Twinfang Bow', twinName: 'Twinfang Arrows', model: 'bow', legendary: true, hands: 2, lean: 'off', temper: 'legendary', glyph: '🏹', price: 220,
    twinShot: 3, tag: 'Legendary two-handed bow. Twin shot: when the bow and the arrows roll the same number, +3 attack. Two fangs. One thought.',
    faces: [F(1, 'b'), F(2, 'r'), F(3, 'r', { pierce: 1 }), F(3, 'r', { pierce: 1 })] },
};
export const LEGENDARY = Object.keys(WEAPONS).filter((id) => WEAPONS[id].legendary);
export const isLegendary = (inst) => !!(inst && WEAPONS[inst.id]?.legendary);
export const modelOf = (id) => WEAPONS[id]?.model || id; // the ordinary weapon whose 3D shape and poses a legendary borrows
export const tierName = (inst) => (isLegendary(inst) ? 'Legendary' : inst?.diamond ? 'Diamond' : RARITY[(inst?.rarity | 0)] || 'Bronze');
// The chance a fight's spoils hold a legendary you do not already carry, and the Camp Store's chance (Act II on) to stock one.
export const LEGENDARY_CHANCE = { elite: 0.06, boss: 0.15, perilous: 0.03, shop: 0.05 };
export const LOOT_WEIGHTS = {
  dagger: 10, bracer: 8, sword: 10, shield: 10, spear: 8, mace: 7, tower: 7, bow: 7, longsword: 7, staff: 7, warhammer: 5,
};

// TALENT dice (the bottom corners; the old "special" dice). Faces: two blanks, a 2x (doubles that hand's strength in its lane),
// then symbol faces: one on a d4, three on a d6. Each symbol face holds up to two symbols; any one symbol may appear at most twice on a die.
// A talent symbol pays the number on its face (see TALENT_FACES). The 2x face doubles the hand above it in its weapon lane.
export const TALENT_SYMS = {
  atk: { name: 'Attack', text: 'Attack equal to the number on its face. Hit what you meant.' },
  block: { name: 'Block', text: 'Block equal to the number on its face. Hold what you must.' },
  magic: { name: 'Magic', text: 'Magic equal to the number on its face. Keep it for later.' },
  heal: { name: 'Heal', text: 'Heal equal to the number on its face. Patch the hole.' },
  gold: { name: 'Gold', text: 'Gold equal to the number on its face. Peddlers will smile.' },
};
// A new hero starts with six dice: head, hands, feet, heart and one weapon. Camp unlocks the rest, one die at a time.
export const START_DICE = ['N', 'W', 'C', 'E', 'S', 'NW', 'SW']; // head, hands, feet, heart, one weapon, and one talent die
export const UNLOCK_COST = { SW: 15, SE: 35, NE: 30 }; // the first costs less than one fight pays, so a new player can buy it at their first camp
export const UNLOCK_ORDER = ['SW', 'NE', 'SE'];
// POWERS (the old "cards"): spent with magic. A power is used once per battle unless it is `atwill` (once per round, weaker).
// kinds: flat (fixed numbers) | dice (roll NdS) | scale (more Magic = more dice) | round (grows with the round number) | luck (roll for a table) | super (round gate, hits everyone).
// What a power level adds (Dave, Oct 2026: "go up in relation to how much magic is worth in attack compared to the gold it costs to
// upgrade"). At camp about 105-175 gold buys +1 to an average round (tools/economy.mjs priceList), so the 60 / 140 / 260 gold levels add
// a quarter, a quarter more, then half more of the power's number (at least 1, 2, 4): level 3 doubles it. Charge releases grow by an
// eighth, a quarter, then a half, since one release stands for several rounds of saving. (Was +50% of the number every level.)
export const POWER_LEVEL_FRAC = [0, 0.25, 0.5, 1];
export const POWER_LEVEL_MIN = [0, 1, 2, 4];
export const CHARGE_LEVEL_FRAC = [0, 0.125, 0.25, 0.5];
// Charges start one lower and climb by 2 (Dave: "start one attack less... then increases after every charge"): +5 a charge is 4, 6, 8, 10.
export const CHARGE_STEP = 2;
export const POWER_UPGRADE = [60, 140, 260]; // gold to reach level 1, 2, 3. Each level: a steady step up in the numbers (see scaleNum), +1 die on dice powers.
// Learning another power from your class library at camp (it then swaps freely into its slot). Supers also need level 5.
export const POWER_LEARN = 50;
export const POWER_SLOTS = ['A', 'B', 'C'];
export const SLOT_NAME = { A: 'Big move', B: 'Every round', C: 'Charge' };
export const TALENT_MAX_SAME = 2; // a die can carry two of one symbol at most: choose which faces get which
// TALENT DICE (Dave, 13 Oct): faces 1 and 2 are blank, face 3 is 2x, and face k (4 up to the die's size) shows the number k and
// pays k of the symbol you buy for it: face 6 with magic = 6 magic. A face starts empty (it does nothing) and you pay once to
// give it a symbol; the bigger the number, the more it costs. A new, bigger die brings new empty faces; the old ones keep theirs.
export const TALENT_PER_FACE = 2; // (the pet's die still holds two symbols a face)
export const TALENT_SLOT_COST = 25; // (a pet's symbol slot costs this; talent faces are priced by their number)
export const TALENT_FACES = { 4: 1, 6: 3, 8: 5, 10: 7 }; // number faces on a d4 / d6 / d8 / d10 (faces 4..size)
export const TALENT_FACE_COST = 10; // gold per point on the face: 4 costs 40, 5 costs 50 ... 10 costs 100
export const talentFaceCost = (num) => TALENT_FACE_COST * num;
export const talentFaceNum = (faceIndex) => faceIndex + 4; // index in hero.talent[slot] -> the number on the die
// (No pierce on talent dice: it ignores block and has no defence, so it stays on weapons, cards and the number 2.)
export const CLASS_TALENT = {
  knight: { SW: 'heal', SE: 'atk' }, ranger: { SW: 'block', SE: 'atk' }, wizard: { SW: 'magic', SE: 'heal' },
  dwarf: { SW: 'block', SE: 'heal' }, bard: { SW: 'gold', SE: 'magic' },
};
// Game difficulty. Scales the monsters only, never the heroes: how much trouble the game sends (`budget`, see ENCOUNTER
// below), their health, the flat damage added to every hit, and gold. Every player gets the same hero treatment.
// Keys easy/normal/hard are the old Noob/Mid/Expert monster-side knobs; older saves stored those keys (or the names
// noob/mid/expert). Legendary is a new rung and still needs tuning.
export const DIFFICULTY = {
  easy: { name: 'Easy', text: 'Fewer, gentler monsters. A kind road.', hp: 0.8, flat: -1, gold: 1, budget: 0.7 },
  normal: { name: 'Normal', text: 'The road as it was meant to be walked.', hp: 1, flat: 0, gold: 1, budget: 1 },
  hard: { name: 'Hard', text: 'Tougher monsters, and the moves they announce hit harder. Pays 15% more gold. You will earn it.', hp: 1.15, flat: 2, gold: 1.15, budget: 1.15, edge: { slam: 3, burn: 2 } },
  // edge (optional, Hard and Legendary): the moves a monster announces hit harder. slam: added to a wind-up Slam and a Pounce; burn: added to Fire
// Ward's burn. A player who reads the plaque (blocks the Slam, hits the stalker, leaves the ward alone) pays little for it; one who doesn't pays a lot.
  legendary: { name: 'Legendary', text: 'The cruellest road. Monsters are much tougher, and slams and wards hit far harder: read every monster and spend your magic well. Finish it and you are a pro. For heroes who have beaten Hard.', hp: 1.4, flat: 2, gold: 1.25, budget: 1.25, edge: { slam: 6, burn: 4 } },
};
const DIFFICULTY_ALIAS = { noob: 'easy', mid: 'normal', expert: 'hard' };
export function normalizeDifficulty(id) {
  const k = String(id || 'normal').toLowerCase();
  const mapped = DIFFICULTY_ALIAS[k] || k;
  return DIFFICULTY[mapped] ? mapped : 'normal';
}
// Random encounters (Ascents / act 4+, and the balance tools). Acts I–III lock their first-pass cast in `ACTS.fights`.
// Each monster has a `threat`; a crowd costs a little more than the sum, GROUP_PLUS per extra monster. The budget grows
// through the act and is scaled by game difficulty, so some steps are one big monster, some a few small ones. { base, slope } per act.
export const ENCOUNTER = {
  acts: [{ base: 1.2, slope: 0.22 }, { base: 2.2, slope: 0.26 }, { base: 3.0, slope: 0.3 }],
  groupPlus: 0.15,
  jitter: [0.75, 1.25], // each fight's budget is the step's budget times a seeded draw from this range, so no two steps are alike
  bigFrom: 4, bigMax: 4, // elite-tier monsters join ordinary fights from this step, if their threat is at most bigMax
};
// Display helpers for the old flat UI and captions.
export const TALENT_GLYPH = { atk: '⚔', block: '🛡', pierce: '◆', magic: '✦', heal: '✚', gold: '🪙' };
export const talentLabel = (sym) => (sym === 'X2' ? '2×' : Array.isArray(sym) ? sym.map((x) => TALENT_GLYPH[x]).join('') : '');
export const talentName = (sym) => (sym === 'X2' ? '2× Strength' : Array.isArray(sym) ? sym.map((x) => TALENT_SYMS[x].name).join(' + ') : 'Blank');
export const talentText = (sym) => (sym === 'X2' ? 'Doubles the strength this hand adds to its weapon.' : Array.isArray(sym) ? sym.map((x) => TALENT_SYMS[x].text).join(' ') : 'Nothing happens.');

// Strength / special upgrade ladder: [gold to grow from this size]. No level gate (Dave): the only limit besides gold is the act's die cap below.
export const STRENGTH_STEPS = { 4: [40], 6: [100], 8: [220] };
export const SPECIAL_STEPS = { 4: [60], 6: [130], 8: [240] }; // the talent die grows d4 -> d6 -> d8 -> d10
// The act decides how big a die can grow (Dave): Act I d4 -> d6, Act II d6 -> d8, Act III d8 -> d10. Applies to strength and talent dice.
export const ACT_MAX_DIE = { 1: 6, 2: 8, 3: 10 };
export const dieCapForAct = (act) => ACT_MAX_DIE[Math.min(3, Math.max(1, act | 0 || 1))];
export const ROMAN = { 1: 'I', 2: 'II', 3: 'III' };
// Speed: the feet die is the initiative die; a bigger one beats more monster rolls. [gold, hero level]
// Company looks live after CLASSES (painted colour variants). The head die is wisdom (Dave, 14 Oct): it starts a d4 and grows like a hand, as far as the act allows. It is rolled in every battle (its faces
// pay heal / pierce / magic / gold like the hands) and in the road's Tests of Wisdom (trials.js).
export const MIND_STEPS = { 4: [50], 6: [110], 8: [230] };
export const SPEED_STEPS = { 4: [60], 6: [140] }; // feet stop at d6 (the Ranger alone can train them to d8)
export const NEXT_SIZE = { 4: 6, 6: 8, 8: 10 };
export const PREV_SIZE = { 6: 4, 8: 6, 10: 8 };
// Shrinking a die (Dave): sometimes a smaller die is the better die. It costs gold (by the size it leaves), nothing is refunded, and on a talent
// die or the pet's die the symbols on the faces that go away are lost. Works on hands, feet, talent dice, weapons and the pet's die.
export const DOWNGRADE_COST = { 6: 20, 8: 30, 10: 40 };

export const xpToNext = (lvl) => 28 + 12 * (lvl - 1);

// -------------------------------------------------------------------------------------------
// Classes. The board is identical for everyone; the class lives in the card menu.
// A card is { id, name, cost, text, fx }. fx keys: atk, pierce, block, heal, magic,
// weaken (enemy damage -N this round), free (a free reroll action of N dice).
// -------------------------------------------------------------------------------------------
// Painted mini base disc, as fractions of the image: centre x, bottom-row y, disc width.
// Callers aim a little above y (the visual middle of the disc) at whatever the piece stands on.
// Which way a painted miniature looks (`look`: 'left' | 'right' | 'front'). Not `faces` — on a monster that key is the attack list.
// Standard (every hero and monster): monsters a slight three-quarter looking left; heroes look/walk right.
// needsFlip(def, 'right') for a hero, (def, 'left') for a monster. Camp uses the same helper toward the fire.
// Flip only a piece that would otherwise face away. `front` is kept for a painting that faces the camera (never mirrored).
export const LOOK = new Set(['left', 'right', 'front']);
export const paintedLook = (def) => (LOOK.has(def?.look) ? def.look : 'left');
export const needsFlip = (def, want) => {
  const look = paintedLook(def);
  if (look === 'front') return false;
  return look !== want;
};
const IB = (W, H, cx, by, bw) => ({ x: cx / W, y: by / H, w: bw / W });
export const CLASSES = {
  // Asymmetric starts, uniform dice (Dave): every class has the same nine dice and rules. They differ in health, speed
  // (feet), a strong hand, starting weapons and magic: startMagic, magicCap (default MAGIC_CAP), powerLevels (how far powers upgrade, default 3) and maxFeet (default 6).
  knight: {
    feet: 4, hands: 6, startMagic: 4, // slow but strong: one d6 hand (left) from the start
    trait: 'Balanced: a strong left hand and a shield. Stands in front, on purpose.',
    name: 'Knight', glyph: '⚔️', img: 'assets/miniatures/knight-blue.webp', look: 'right', imgBase: IB(512, 495, 189.5, 488, 367), hp: 34,
    blurb: 'Steel and stubbornness. Sword and shield, simple and sturdy. The sort of hero who holds the door, and the line.',
    weapons: ['sword', 'shield'],
    // Powers fill three slots (Dave): A a big move (once a battle), B every round, C a charge. `start` is what a
    // new hero carries; the others are learned at camp and swapped into their slot.
    cards: [
      { id: 'cleave', slot: 'A', start: true, name: 'Cleave', kind: 'dice', cost: 2, dice: { n: 2, s: 6, to: 'atk' }, splash: 'half', fx: { atk: 7 }, text: 'A wide swing. Roll 2d6 attack. Half of it splashes on every other monster.' },
      { id: 'judgment', slot: 'A', name: 'Judgment', kind: 'super', cost: 6, minRound: 3, aoe: 12, fx: { atk: 14 }, text: 'Round 3+: +14 attack on your target and 12 to EVERY monster. The room will remember.', unlock: 5 },
      { id: 'shieldwall', slot: 'B', start: true, name: 'Shield Up', kind: 'flat', atwill: true, cost: 1, fx: { block: 4 }, text: 'Every round: +4 block. Hold the line. That is the job.' },
      { id: 'press', slot: 'B', name: 'Press the Attack', kind: 'flat', atwill: true, cost: 1, fx: { atk: 3 }, text: 'Every round: +3 attack. Do not let them breathe.' },
      { id: 'rally', slot: 'C', start: true, name: 'Rally Cry', kind: 'charge', atwill: true, cost: 1, max: 4, per: { atk: 3, block: 3 }, fx: { atk: 3, block: 3 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them together: the first gives +2 attack and +2 block, and each one after gives 2 more.' },
      { id: 'secondwind', slot: 'C', name: 'Second Wind', kind: 'charge', atwill: true, cost: 1, max: 4, per: { heal: 5 }, fx: { heal: 5 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them together: the first heals 4, and each one after heals 2 more. Up you get.' },
    ],
  },
  ranger: {
    feet: 6, maxFeet: 8, startMagic: 4,
    trait: 'The fastest on the road. The only class that can train speed to a d8.',
    name: 'Ranger', glyph: '🏹', img: 'assets/miniatures/ranger-green.webp', look: 'right', imgBase: IB(344, 512, 162.5, 505, 313), hp: 28,
    blurb: 'Quick hands, quicker eyes. A bow for the best odds at triples. First to the fight, last to be surprised.',
    weapons: ['bow'],
    cards: [
      { id: 'aimed', slot: 'A', start: true, name: 'Aimed Shot', kind: 'scale', cost: 2, max: 4, dice: { n: 2, s: 6, to: 'pierce' }, fx: { pierce: 7 }, text: 'Breathe. Loose. Roll pierce dice: 2 magic = 2d6, each extra magic adds a die (up to 4d6).' },
      { id: 'rain', slot: 'A', name: 'Rain of Arrows', kind: 'super', cost: 5, minRound: 3, aoe: 9, fx: { pierce: 6 }, text: 'Round 3+: +6 pierce on your target and 9 to EVERY monster. Share the weather.', unlock: 5 },
      { id: 'quickdraw', slot: 'B', start: true, name: 'Quick Draw', kind: 'flat', atwill: true, cost: 1, fx: { free: 2 }, text: 'Every round: a free reroll of 2 dice. Second chances, on purpose.' },
      { id: 'snare', slot: 'B', name: 'Snare', kind: 'flat', atwill: true, cost: 1, fx: { weaken: 2 }, text: 'Every round: monsters hit 2 softer. Trip them. Politely.' },
      { id: 'volley', slot: 'C', start: true, name: 'Volley', kind: 'charge', atwill: true, cost: 1, max: 4, per: { pierce: 4 }, fx: { pierce: 4 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them together: the first gives 3 pierce, and each one after gives 2 more.' },
      { id: 'vanish', slot: 'C', name: 'Vanish', kind: 'charge', atwill: true, cost: 1, max: 4, per: { block: 5 }, fx: { block: 5 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them together: the first gives +4 block, and each one after gives 2 more. Now you see me.' },
    ],
  },
  wizard: {
    feet: 4, startMagic: 6, magicCap: 15,
    trait: 'Weak and slow, the strongest magic: starts with 6 and holds 15.',
    name: 'Wizard', glyph: '🧙', img: 'assets/miniatures/wizard-blue.webp', look: 'right', imgBase: IB(456, 512, 262.5, 505, 355), hp: 24,
    blurb: 'A frail body and a deep well of magic. No shield. A trick for every problem, and the magic to keep mending.',
    weapons: ['staff'],
    cards: [
      { id: 'arcbolt', slot: 'A', start: true, name: 'Arc Bolt', kind: 'scale', cost: 2, step: 2, max: 10, maxDice: 5, dice: { n: 1, s: 8, to: 'atk' }, fx: { atk: 5 }, text: 'Point. Spark. Roll attack dice: 2 magic = 1d8, every 2 more magic adds a die (up to 5d8).' }, // Dave: was 1 magic a die, too strong
      { id: 'meteor', slot: 'A', name: 'Meteor', kind: 'round', cost: 5, minRound: 3, per: 4, splash: 'half', fx: { atk: 12 }, text: 'Round 3+: attack equal to 4 x the round number; half splashes to the others. From a great height.', unlock: 5 },
      { id: 'bolt', slot: 'B', start: true, name: 'Magic Missile', kind: 'flat', atwill: true, cost: 1, fx: { pierce: 2 }, text: 'Every round: +2 pierce. Small, rude, and on time.' },
      { id: 'barrier', slot: 'B', name: 'Barrier', kind: 'flat', atwill: true, cost: 1, fx: { block: 4 }, text: 'Every round: +4 block. A wall you packed yourself.' },
      { id: 'coil', slot: 'C', start: true, name: 'Storm Coil', kind: 'charge', atwill: true, cost: 1, max: 4, per: { atk: 5 }, splash: 'half', fx: { atk: 5 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them together: the first gives 4 attack, each one after gives 2 more, half splashing.' },
      { id: 'light', slot: 'C', name: 'Healing Light', kind: 'charge', atwill: true, cost: 1, max: 4, per: { heal: 6 }, fx: { heal: 6 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them together: the first heals 5, and each one after heals 2 more. Warm as a window.' },
    ],
  },
  dwarf: {
    feet: 4, hands: 6, startMagic: 3, // the slowest, the toughest: one d6 hand (left) from the start
    trait: 'The wall: the most health, a crushing mace and a tower shield.',
    name: 'Dwarf Warden', glyph: '🪓', img: 'assets/miniatures/dwarf-blue.webp', look: 'right', imgBase: IB(489, 512, 271, 505, 374), hp: 40,
    blurb: 'Stone-skinned and grudge-keeping. The deepest health pool, the thickest wall. Will not be moved. Has tried.',
    weapons: ['mace', 'tower'],
    cards: [
      { id: 'grudge', slot: 'A', start: true, name: 'Grudge', kind: 'round', cost: 3, per: 2, fx: { atk: 6 }, text: 'Attack equal to 2 x the round number. Slow to start, brutal late. Dwarves keep receipts.' },
      { id: 'avalanche', slot: 'A', name: 'Avalanche', kind: 'super', cost: 6, minRound: 3, aoe: 10, fx: { atk: 10, block: 10 }, text: 'Round 3+: +10 attack, +10 block, and 10 to EVERY monster. The mountain joins in.', unlock: 5 },
      { id: 'bulwark', slot: 'B', start: true, name: 'Shield Bash', kind: 'flat', atwill: true, cost: 1, fx: { atk: 4 }, text: 'Every round: +4 attack. The shield has feelings too.' },
      { id: 'brace', slot: 'B', name: 'Brace', kind: 'flat', atwill: true, cost: 1, fx: { block: 4 }, text: 'Every round: +4 block. Plant the boots. Stay planted.' },
      { id: 'stonehide', slot: 'C', start: true, name: 'Stonehide', kind: 'charge', atwill: true, cost: 1, max: 4, per: { block: 6 }, fx: { block: 6 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them together: the first gives +5 block, and each one after gives 2 more.' },
      { id: 'forgefury', slot: 'C', name: 'Forge Fury', kind: 'charge', atwill: true, cost: 1, max: 4, per: { atk: 4, block: 2 }, fx: { atk: 4, block: 2 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them together: the first gives +3 attack and +1 block, and each one after gives 2 more.' },
    ],
  },
  bard: {
    feet: 6, startMagic: 5,
    trait: 'The steady helper: quick, steady weapons, more magic to share.',
    name: 'Bard', glyph: '🪕', img: 'assets/miniatures/bard-teal.webp', look: 'right', imgBase: IB(396, 512, 208.5, 505, 341), hp: 30,
    blurb: 'The heart of the party. Songs that heal, hymns that harden, and a knack for chaos that somehow helps.',
    weapons: ['dagger', 'bracer'],
    cards: [
      { id: 'mending', slot: 'A', start: true, name: 'Mending Song', kind: 'dice', cost: 2, dice: { n: 2, s: 6, to: 'heal' }, fx: { heal: 7 }, text: 'A tune you can feel in the ribs. Roll 2d6 and heal that much.' },
      { id: 'finale', slot: 'A', name: 'Finale', kind: 'super', cost: 6, minRound: 3, aoe: 8, fx: { atk: 8, heal: 8, block: 8 }, text: 'Round 3+: +8 attack, heal 8, +8 block, and 8 to EVERY monster. Encore not required.', unlock: 5 },
      { id: 'luckyverse', slot: 'B', start: true, name: 'Lucky Verse', kind: 'luck', atwill: true, cost: 1, fx: { atk: 4 }, text: 'Every round, roll a d6: 1-2 +1 magic, 3-4 +3 attack, 5-6 +6 attack and +1 magic. Fingers crossed. Professionally.' },
      { id: 'discord', slot: 'B', name: 'Discord', kind: 'flat', atwill: true, cost: 1, fx: { weaken: 2 }, text: 'Every round: monsters hit 2 softer. A note they did not ask for.' },
      { id: 'ballad', slot: 'C', start: true, name: 'Rising Ballad', kind: 'charge', atwill: true, cost: 1, max: 4, per: { atk: 3, heal: 3 }, fx: { atk: 3, heal: 3 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them together: the first gives +2 attack and heal 2, and each one after gives 2 more.' },
      { id: 'goldhymn', slot: 'C', name: 'Hymn of Gold', kind: 'charge', atwill: true, cost: 1, max: 4, per: { gold: 4 }, fx: { gold: 4 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them together: the first gives 3 gold, and each one after gives 2 more. Music to a peddler\'s ears.' },
    ],
  },
};

// Company looks (Dave): each class has its original painting plus three colour variants, so two Knights
// at a table never wear the same coat. Look 0 (`id: 'default'`) is the class's own colours (the new right-facing painting; the old
// one wore the same colours, so it is not offered twice); the others
// are painted facing right. `hue` colours the hero's chip in the battle roster. `hero.color` is the id.
export const HERO_LOOKS = {
  knight: [
    { id: 'default', name: 'Blue', hue: '#6aa8ff', img: 'assets/miniatures/knight-blue.webp', look: 'right', imgBase: IB(512, 495, 189.5, 488, 367) }, // its own colours, in the new right-facing painting
    { id: 'crimson', name: 'Crimson', hue: '#e4454a', img: 'assets/miniatures/knight-crimson.webp', look: 'right', imgBase: IB(512, 481, 187, 474, 350) },
    { id: 'green', name: 'Green', hue: '#5ad060', img: 'assets/miniatures/knight-green.webp', look: 'right', imgBase: IB(490, 512, 173.5, 505, 335) },
  ],
  ranger: [
    { id: 'default', name: 'Green', hue: '#4ad070', img: 'assets/miniatures/ranger-green.webp', look: 'right', imgBase: IB(344, 512, 162.5, 505, 313) }, // its own colours, in the new right-facing painting
    { id: 'rust', name: 'Rust', hue: '#ffa040', img: 'assets/miniatures/ranger-rust.webp', look: 'right', imgBase: IB(367, 512, 171.5, 505, 321) },
    { id: 'grey', name: 'Grey', hue: '#a8dcff', img: 'assets/miniatures/ranger-grey.webp', look: 'right', imgBase: IB(390, 512, 191, 505, 340) },
  ],
  wizard: [
    { id: 'default', name: 'Blue', hue: '#3a90ff', img: 'assets/miniatures/wizard-blue.webp', look: 'right', imgBase: IB(456, 512, 262.5, 505, 355) }, // its own colours, in the new right-facing painting
    { id: 'crimson', name: 'Crimson', hue: '#ff6a80', img: 'assets/miniatures/wizard-crimson.webp', look: 'right', imgBase: IB(325, 512, 162, 505, 312) },
    { id: 'white', name: 'White and gold', hue: '#ffe080', img: 'assets/miniatures/wizard-white.webp', look: 'right', imgBase: IB(370, 512, 205, 505, 316) },
  ],
  dwarf: [
    { id: 'default', name: 'Deep blue', hue: '#7ac0ff', img: 'assets/miniatures/dwarf-blue.webp', look: 'right', imgBase: IB(489, 512, 271, 505, 374) }, // its own colours, in the new right-facing painting
    { id: 'crimson', name: 'Crimson', hue: '#ff6a4a', img: 'assets/miniatures/dwarf-crimson.webp', look: 'right', imgBase: IB(474, 512, 272, 505, 380) },
    { id: 'green', name: 'Moss', hue: '#8aff8a', img: 'assets/miniatures/dwarf-green.webp', look: 'right', imgBase: IB(464, 512, 255, 505, 404) },
  ],
  bard: [
    { id: 'default', name: 'Teal', hue: '#2ad0c0', img: 'assets/miniatures/bard-teal.webp', look: 'right', imgBase: IB(396, 512, 208.5, 505, 341) }, // its own colours, in the new right-facing painting
    { id: 'crimson', name: 'Crimson', hue: '#ff8ac8', img: 'assets/miniatures/bard-crimson.webp', look: 'right', imgBase: IB(512, 483, 221, 476, 340) },
    { id: 'blue', name: 'Blue', hue: '#6aa8ff', img: 'assets/miniatures/bard-blue.webp', look: 'right', imgBase: IB(388, 512, 186.5, 505, 357) },
  ],
};
export const colorsOf = (cls) => HERO_LOOKS[cls] || [];
export const lookById = (cls, id) => colorsOf(cls).find((l) => l.id === id) || colorsOf(cls)[0] || null;
export const colorIdOf = (hero) => {
  const looks = colorsOf(hero?.cls);
  if (hero?.color && looks.some((l) => l.id === hero.color)) return hero.color;
  return looks[0]?.id || 'default';
};
export const lookDef = (hero) => lookById(hero?.cls, colorIdOf(hero));
// First free colour of this class; if every coat is taken, keep the preferred one (a fifth Knight shares).
export const claimColor = (hero, takenIds) => {
  const looks = colorsOf(hero?.cls);
  if (!looks.length) return 'default';
  const taken = new Set(takenIds || []);
  const want = colorIdOf(hero);
  if (!taken.has(want)) return want;
  return looks.find((l) => !taken.has(l.id))?.id || want;
};
export const uniqueColors = (heroes) => {
  const used = {};
  for (const h of heroes || []) {
    if (!h?.cls) continue;
    const id = claimColor(h, used[h.cls] || []);
    h.color = id;
    (used[h.cls] ||= []).push(id);
  }
  return heroes;
};
export const assignedColor = (heroes, i) => {
  const hero = heroes?.[i];
  const looks = colorsOf(hero?.cls);
  if (!looks.length) return 'default';
  const taken = [];
  for (let j = 0; j < i; j++) if (heroes[j]?.cls === hero.cls) taken.push(assignedColor(heroes, j));
  return claimColor(hero, taken);
};
export const lookIndex = (heroes, i) => {
  const looks = colorsOf(heroes?.[i]?.cls);
  const n = looks.findIndex((l) => l.id === assignedColor(heroes, i));
  return n < 0 ? 0 : n;
};
export const lookOf = (heroes, i) => colorsOf(heroes?.[i]?.cls)[lookIndex(heroes, i)] || null;

// -------------------------------------------------------------------------------------------
// Perks: one pick every level, three offered. Stat tweaks that compose without special cases.
// -------------------------------------------------------------------------------------------
export const PERKS = {
  // a level-up now and then offers a Diamond weapon for the case instead of a third perk (never kept in hero.perks; see takePerk)
  diamond: { name: 'A Diamond weapon', text: 'One goes into your Diamond case: no blanks, an icon on every face, a crit of three. Good for one fight.', max: 1, retired: true, diamond: true },
  vitality: { name: 'Vitality', text: '+6 max HP. Room for one more bruise.', max: 5, mod: { maxHp: 6 } },
  reserve: { name: 'Arcane Reserve', text: 'Start every battle with +1 Magic. A spark in the pocket.', max: 3, mod: { startMagic: 1 } },
  quick: { name: 'Quick Hands', text: 'Reroll actions may reroll +1 die.', max: 2, mod: { rerollDice: 1 }, retired: true }, // no longer offered (the 4th die is bought at camp); heroes who took it keep it
  keen: { name: 'Keen Edge', text: '+1 attack from every weapon that is attacking (red face). Sharper mornings.', max: 3, mod: { redBonus: 1 } },
  ward: { name: 'Ironward', text: '+1 block from every weapon that is blocking (blue face). Hold a little harder.', max: 3, mod: { blueBonus: 1 } },
  piercer: { name: 'Piercing Pips', text: 'Each white body die that rolls pierce pierces +1 more. Through, not around.', max: 3, mod: { pierceBonus: 1 } },
  greed: { name: 'Gold Sense', text: '+25% gold from your dice and the fallen. Coins like you already.', max: 3, mod: { goldPct: 0.25 } },
  grit: { name: 'Stout Heart', text: '+4 max HP. A little more of you to go round.', max: 2, mod: { maxHp: 4 }, retired: true }, // no longer offered (Dave: too close to Vitality); heroes who took it keep it
  linebreaker: { name: 'Line Breaker', text: 'Every triple pays +2 more, attack or block. Three in a line, then a little extra.', max: 5, mod: { tripleBonus: 2 } },
  frugal: { name: 'Frugal Mender', text: 'Retired: Heal with Magic is the same for everyone.', max: 1, mod: {}, retired: true }, // Dave, Oct 2026: 2 magic for 4 health is standard, no perk changes it (old saves get the pick back: save.js migrateHero)
};

// -------------------------------------------------------------------------------------------
// Bestiary. Faces: v = verb, f = flat, m = multiplier of the Power die, k = extra parameter.
//   strike  damage (blockable)         pierce  damage that ignores block
//   guard   this round the monster blocks f+m*power of your non-pierce damage
//   mend    heals itself               charge  wind-up; next round it Slams (brace with block, or kill it first)
//   howl    every monster's next strike +k bind  lock k of your dice next round
//   drain   strike, and steal k Magic  pilfer  strike, steal gold if it connects; returned on its death
//   summon  call k reinforcements (the monster's `adds` id)
//   breath  fire that splashes: party every hero takes ceil(0.6×mag); solo half blockable, half pierce
//   chain   next roll, k dice (not heart or pet) keep last round's face and cannot be rerolled
//   hush    next round the heart die pays no amp, no colour bonus, and cannot finish a triple
//   armor   always-on guard { n, s } dice, rolled every round (pierce still goes through)
// -------------------------------------------------------------------------------------------
const S = (n, f, m, extra = {}) => ({ n, v: 'strike', f, m, ...extra });
// Moves that change the right answer for a round (Dave: break the "read the box" habit):
//   ward   Fire Ward: guards like a shield, and burns whoever hits it this round for k (+ half the act's flat). Hit something else, or accept the burn.
//   stalk  Stalk: no attack now, but if it is not hurt this round it Pounces next round (its `pounce` strike). Hit it now.
//   phase  Phase: normal attack passes straight through it this round; only pierce (and splash) can hurt it.
// Optional land tag: 1 Marches, 2 Crypt, 3 Peaks (same numbers the writer packs already use on each act).
export const LANDS = { 1: 'marches', 2: 'crypt', 3: 'peaks' };
export function landsOf(m) {
  const v = m?.lands || m?.land;
  if (v == null || v === '') return [];
  return (Array.isArray(v) ? v : [v]).map(Number).filter((n) => n > 0);
}
export const MONSTERS = {
  goblin: {
    name: 'Goblin Skulker', glyph: '👺', img: 'assets/miniatures/goblin.webp', look: 'left', imgBase: IB(404, 415, 230.5, 409, 306), short: 'GOBL', init: 6, hp: 30, power: 8, xp: 8, gold: 6, tier: 'minion', threat: 1.0, land: 1,
    faces: [S('Stab', 1, 1), S('Stab', 1, 1), { n: 'Pilfer', v: 'pilfer', f: 0, m: 1 },
      { n: 'Duck', v: 'guard', f: 1, m: 1 }, S('Slash', 2, 1), { n: 'Fire Bomb', v: 'pierce', f: 1, m: 1 }],
  },
  wolf: {
    name: 'Dire Wolf', glyph: '🐺', img: 'assets/miniatures/wolf.webp', look: 'left', imgBase: IB(467, 415, 235, 410, 383), short: 'WOLF', init: 8, hp: 40, power: 8, xp: 10, gold: 8, tier: 'minion', threat: 1.3, land: 1,
    pounce: { f: 1, m: 2 }, // after a Stalk it was not hit out of
    faces: [S('Bite', 1, 1), S('Bite', 1, 1), { n: 'Howl', v: 'howl', f: 0, m: 0, k: 2 },
      S('Lunge', 0, 2), { n: 'Stalk', v: 'stalk', f: 0, m: 0 }, S('Rend', 2, 1)],
  },
  cultist: {
    name: 'Ember Mage', glyph: '🔥', img: 'assets/miniatures/cultist.webp', look: 'left', imgBase: IB(322, 475, 160, 470, 297), short: 'MAGE', init: 6, hp: 34, power: 8, xp: 12, gold: 10, tier: 'minion', threat: 1.1, lands: [1, 3],
    faces: [{ n: 'Tangle', v: 'bind', f: 0, m: 0, k: 1 }, { n: 'Ember', v: 'pierce', f: 0, m: 1 },
      { n: 'Fire Ward', v: 'ward', f: 0, m: 1, k: 4 }, { n: 'Siphon', v: 'drain', f: 0, m: 1, k: 2 },
      S('Bolt', 1, 1), { n: 'Tangle', v: 'bind', f: 0, m: 0, k: 2 }],
  },
  ogre: {
    name: 'Hill Ogre', glyph: '👹', img: 'assets/miniatures/ogre.webp', look: 'left', imgBase: IB(431, 462, 248, 457, 341), short: 'OGRE', init: 4, hp: 84, power: 10, xp: 30, gold: 28, tier: 'elite', threat: 2.8, land: 1,
    slam: { f: 2, m: 2 },
    faces: [S('Club', 0, 1), S('Club', 1, 1), S('Stomp', 0, 1),
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Roar', v: 'guard', f: 2, m: 1 },
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
  },
  // Painted looking left (same as every other monster). Do not flip: needsFlip(..., 'left') stays false.
  bigwheel: {
    name: 'Big Wheel', glyph: '🧀', img: 'assets/miniatures/bigwheel.webp', look: 'left', imgBase: IB(418, 512, 210.5, 505, 342), short: 'WHEL', init: 4, hp: 84, power: 10, xp: 30, gold: 28, tier: 'elite', threat: 2.8, land: 2,
    slam: { f: 2, m: 2 },
    faces: [S('Club', 0, 1), S('Club', 1, 1), S('Stomp', 0, 1),
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Roar', v: 'guard', f: 2, m: 1 },
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
  },
  mungo: {
    name: 'Mungo', glyph: '👹', img: 'assets/miniatures/mungo.webp', look: 'left', imgBase: IB(448, 512, 201.5, 505, 392), short: 'MUNG', init: 4, hp: 84, power: 10, xp: 30, gold: 28, tier: 'elite', threat: 2.8, land: 1,
    slam: { f: 2, m: 2 },
    faces: [S('Club', 0, 1), S('Club', 1, 1), S('Stomp', 0, 1),
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Roar', v: 'guard', f: 2, m: 1 },
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
  },
  goblinking: {
    name: 'The Goblin King', glyph: '👑', img: 'assets/miniatures/goblinking.webp', look: 'left', imgBase: IB(371, 462, 184, 457, 315), short: 'KING', init: 6, hp: 100, power: 12, xp: 80, gold: 70, tier: 'boss', threat: 9, land: 1,
    slam: { f: 3, m: 2 }, adds: 'goblin',
    faces: [S('Scepter', 1, 1), S('Scepter', 1, 1), { n: 'Rally!', v: 'summon', f: 0, m: 0, k: 1 },
      { n: 'Gold Shield', v: 'guard', f: 2, m: 1 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 },
      { n: 'Fire Bombs', v: 'pierce', f: 2, m: 1 }],
    rage: {
      name: 'Greed-Mad', power: 12,
      faces: [S('Frenzy', 3, 1), { n: 'Rally!', v: 'summon', f: 0, m: 0, k: 1 },
        { n: 'Rally!', v: 'summon', f: 0, m: 0, k: 1 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 },
        { n: 'Fire Bombs', v: 'pierce', f: 3, m: 1 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
    },
  },
  // ---- Act II (draft numbers, untuned) ----
  skeleton: {
    name: 'Bone Soldier', glyph: '💀', img: 'assets/miniatures/skeleton.webp', look: 'left', imgBase: IB(418, 483, 249.5, 478, 304), short: 'SKEL', init: 4, hp: 46, power: 8, xp: 14, gold: 10, tier: 'minion', threat: 1.6, land: 2,
    faces: [S('Slash', 1, 1), S('Slash', 1, 1), { n: 'Shield Up', v: 'guard', f: 2, m: 1 },
      S('Stab', 2, 1), { n: 'Bone Throw', v: 'pierce', f: 1, m: 1 }, S('Slash', 1, 1)],
  },
  wraith: {
    name: 'Wraith', glyph: '👻', img: 'assets/miniatures/wraith.webp', look: 'left', imgBase: IB(339, 461, 168.5, 456, 252), short: 'WRTH', init: 8, hp: 40, power: 10, xp: 18, gold: 14, tier: 'minion', threat: 1.5, land: 2,
    faces: [{ n: 'Chill', v: 'pierce', f: 0, m: 1 }, { n: 'Chill', v: 'pierce', f: 0, m: 1 },
      { n: 'Drain', v: 'drain', f: 0, m: 1, k: 3 }, { n: 'Wail', v: 'bind', f: 0, m: 0, k: 2 },
      { n: 'Phase', v: 'phase', f: 0, m: 0 }, S('Touch', 1, 1)],
  },
  spider: {
    name: 'Crypt Spider', glyph: '🕷️', img: 'assets/miniatures/spider.webp', look: 'left', imgBase: IB(512, 439, 260.5, 433, 358), short: 'SPDR', init: 8, hp: 48, power: 10, xp: 16, gold: 12, tier: 'minion', threat: 1.8, land: 2,
    faces: [S('Bite', 1, 1), { n: 'Web', v: 'bind', f: 0, m: 0, k: 2 }, { n: 'Venom', v: 'pierce', f: 1, m: 1 },
      { n: 'Skitter', v: 'guard', f: 1, m: 1 }, S('Pounce', 0, 2), S('Bite', 1, 1)],
  },
  bonewarden: {
    name: 'Bone Warden', glyph: '🦴', img: 'assets/miniatures/bonewarden.webp', look: 'left', imgBase: IB(417, 468, 218, 463, 319), short: 'WARD', init: 4, hp: 150, power: 12, xp: 55, gold: 46, tier: 'elite', threat: 7, land: 2,
    slam: { f: 3, m: 2 }, adds: 'skeleton',
    faces: [S('Cleave', 2, 1), { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Bone Wall', v: 'guard', f: 2, m: 1 },
      { n: 'Raise Dead', v: 'summon', f: 0, m: 0, k: 1 }, S('Smash', 0, 2), { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
  },
  lich: {
    name: 'The Hollow Lich', glyph: '☠️', img: 'assets/miniatures/lich.webp', look: 'left', imgBase: IB(368, 489, 191.5, 484, 320), short: 'LICH', init: 6, hp: 185, power: 12, xp: 140, gold: 120, tier: 'boss', threat: 11, land: 2,
    slam: { f: 4, m: 2 }, adds: 'skeleton',
    faces: [{ n: 'Soul Bolt', v: 'pierce', f: 2, m: 1 }, { n: 'Raise Dead', v: 'summon', f: 0, m: 0, k: 1 },
      { n: 'Drain Life', v: 'drain', f: 0, m: 1, k: 3 }, { n: 'Dread', v: 'bind', f: 0, m: 0, k: 2 },
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Bone Armor', v: 'guard', f: 2, m: 1 }],
    rage: {
      name: 'Unbound', power: 12,
      faces: [{ n: 'Soul Storm', v: 'pierce', f: 4, m: 1 }, { n: 'Raise Dead', v: 'summon', f: 0, m: 0, k: 2 },
        { n: 'Drain Life', v: 'drain', f: 2, m: 1, k: 4 }, { n: 'Dread', v: 'bind', f: 0, m: 0, k: 3 },
        { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
    },
  },
  // ---- Hired blades and dark mirrors (each with its own painted miniature) ----
  shieldbearer: {
    name: 'Shieldbearer', glyph: '🛡️', img: 'assets/miniatures/shieldbearer.webp', look: 'left', imgBase: IB(336, 480, 167.5, 473, 248), short: 'SHLD', init: 4, hp: 44, power: 6, xp: 10, gold: 8, tier: 'minion', threat: 1.3, lands: [1, 3],
    armor: { n: 1, s: 6 },
    faces: [S('Spear', 1, 1), S('Spear', 1, 1), S('Spear', 2, 1),
      { n: 'Lock Shields', v: 'guard', f: 2, m: 1 }, S('Shove', 0, 1), S('Spear', 1, 1)],
  },
  gloomstalker: {
    name: 'Gloom Stalker', glyph: '🏹', img: 'assets/miniatures/gloomstalker.webp', look: 'left', imgBase: IB(376, 480, 194, 473, 336), short: 'GLOM', init: 8, hp: 50, power: 8, xp: 14, gold: 11, tier: 'minion', threat: 1.3, lands: [2, 3],
    pounce: { f: 2, m: 2 },
    faces: [{ n: 'Black Arrow', v: 'pierce', f: 0, m: 1 }, { n: 'Black Arrow', v: 'pierce', f: 0, m: 1 },
      { n: 'Stalk', v: 'stalk', f: 0, m: 0 }, { n: 'Snare', v: 'bind', f: 0, m: 0, k: 1 },
      S('Knife', 1, 1), { n: 'Fade', v: 'phase', f: 0, m: 0 }],
  },
  chainbinder: {
    name: 'Gold-Chain Jailer', glyph: '⛓️', img: 'assets/miniatures/chainbinder.webp', look: 'left', imgBase: IB(413, 480, 225.5, 473, 367), short: 'CHNB', init: 6, hp: 52, power: 10, xp: 16, gold: 13, tier: 'minion', threat: 1.5, land: 3,
    faces: [{ n: 'Chain', v: 'chain', f: 0, m: 0, k: 1 }, { n: 'Chain', v: 'chain', f: 0, m: 0, k: 2 },
      { n: 'Chain Bolt', v: 'pierce', f: 0, m: 1 }, S('Rod', 1, 1),
      { n: 'Siphon', v: 'drain', f: 0, m: 1, k: 2 }, { n: 'Chain Ward', v: 'ward', f: 0, m: 1, k: 3 }],
  },
  dirgesinger: {
    name: 'Dirge Singer', glyph: '🎻', img: 'assets/miniatures/dirgesinger.webp', look: 'left', imgBase: IB(381, 480, 190, 473, 280), short: 'DIRG', init: 6, hp: 46, power: 8, xp: 15, gold: 12, tier: 'minion', threat: 1.4, lands: [2, 3],
    faces: [{ n: 'Hush', v: 'hush', f: 0, m: 0 }, { n: 'Dirge', v: 'howl', f: 0, m: 0, k: 2 },
      S('Lute Smash', 1, 1), { n: 'Sour Note', v: 'pierce', f: 0, m: 1 },
      { n: 'Hush', v: 'hush', f: 0, m: 0 }, S('Lute Smash', 1, 1)],
  },
  ironwarden: {
    name: 'Ironclad Warden', glyph: '🛡️', img: 'assets/miniatures/ironwarden.webp', look: 'left', imgBase: IB(412, 480, 218, 473, 380), short: 'IRON', init: 4, hp: 110, power: 10, xp: 40, gold: 34, tier: 'elite', threat: 3.0, land: 3,
    slam: { f: 3, m: 2 }, armor: { n: 2, s: 4 },
    faces: [S('Axe', 1, 1), S('Axe', 1, 1), { n: 'Stone Wall', v: 'guard', f: 2, m: 1 },
      S('Shield Bash', 2, 1), { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, S('Axe', 0, 1)],
  },
  fallenchampion: {
    name: 'The Fallen Champion', glyph: '⚜️', img: 'assets/miniatures/fallenchampion.webp', look: 'left', imgBase: IB(331, 480, 165, 473, 255), short: 'CHMP', init: 6, hp: 240, power: 12, xp: 160, gold: 140, tier: 'boss', threat: 10, land: 3,
    slam: { f: 5, m: 2 }, armor: { n: 2, s: 4 },
    faces: [S('Oathbreaker', 3, 1), { n: 'Chain', v: 'chain', f: 0, m: 0, k: 2 }, { n: 'Hush', v: 'hush', f: 0, m: 0 },
      { n: 'Oath Smite', v: 'pierce', f: 3, m: 1 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, S('Oathbreaker', 3, 1)],
    rage: {
      name: 'Oath Undone', power: 12, armor: null,
      faces: [S('Oathbreaker', 4, 1), { n: 'Chain', v: 'chain', f: 0, m: 0, k: 3 }, { n: 'Hush', v: 'hush', f: 0, m: 0, k: 3 },
        { n: 'Oath Smite', v: 'pierce', f: 4, m: 1 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
    },
  },
  // ---- Dragons ----
  cinderling: {
    name: 'Cinderling', glyph: '🐉', img: 'assets/miniatures/cinderling.webp', look: 'left', imgBase: IB(393, 480, 193.5, 473, 381), short: 'CNDR', init: 6, hp: 48, power: 8, xp: 14, gold: 16, tier: 'minion', threat: 1.2, lands: [1, 3],
    flee: { at: 0.35, chance: 1 },
    faces: [S('Nip', 1, 1), S('Nip', 1, 1), { n: 'Puff', v: 'breath', f: 0, m: 1 },
      { n: 'Hoard', v: 'guard', f: 1, m: 1 }, { n: 'Snatch', v: 'pilfer', f: 0, m: 1 }, S('Tail Flick', 2, 1)],
  },
  frostwhelp: {
    name: 'Frostwhelp', glyph: '🐲', img: 'assets/miniatures/frostwhelp.webp', look: 'left', imgBase: IB(474, 480, 225.5, 473, 443), short: 'FRST', init: 8, hp: 56, power: 8, xp: 16, gold: 14, tier: 'minion', threat: 1.4, lands: [2, 3],
    flee: { at: 0.35, chance: 1 },
    faces: [S('Bite', 1, 1), { n: 'Frost Puff', v: 'breath', f: 0, m: 1 }, { n: 'Icy Wings', v: 'bind', f: 0, m: 0, k: 1 },
      { n: 'Curl Up', v: 'guard', f: 2, m: 1 }, S('Claw', 1, 1), { n: 'Frost Puff', v: 'breath', f: 0, m: 1 }],
  },
  ashwyrm: {
    name: 'Ashmaw the Wyrm', glyph: '🐉', img: 'assets/miniatures/ashwyrm.webp', look: 'left', imgBase: IB(431, 480, 215, 473, 424), short: 'ASHM', init: 6, hp: 150, power: 12, xp: 60, gold: 70, tier: 'elite', threat: 3.5, land: 3,
    slam: { f: 2, m: 2, v: 'breath' }, armor: { n: 1, s: 4 }, flee: { at: 0.25, chance: 1 },
    faces: [S('Claw', 2, 1), S('Claw', 2, 1), { n: 'Fire Breath', v: 'breath', f: 2, m: 1 },
      { n: 'Inhale', v: 'charge', f: 0, m: 0 }, { n: 'Wing Buffet', v: 'guard', f: 2, m: 1 }, S('Tail Sweep', 1, 1)],
  },
  vharaxis: {
    name: 'Vharaxis, the Ember Queen', glyph: '🐲', img: 'assets/miniatures/vharaxis.webp', look: 'left', imgBase: IB(480, 399, 222, 393, 394), short: 'VHRX', init: 4, hp: 280, power: 12, xp: 180, gold: 200, tier: 'boss', threat: 12, land: 3,
    slam: { f: 7, m: 2, v: 'breath' }, armor: { n: 2, s: 4 }, flee: { at: 0.3, chance: 1, onlyAs: 'elite' },
    faces: [S('Talons', 3, 1), { n: 'Inferno', v: 'breath', f: 4, m: 1 }, { n: 'Inhale', v: 'charge', f: 0, m: 0 },
      { n: 'Terrify', v: 'bind', f: 0, m: 0, k: 2 }, S('Bite', 4, 1), { n: 'Wing Wall', v: 'guard', f: 4, m: 1 }],
    rage: {
      name: 'Molten Fury', power: 12,
      faces: [{ n: 'Inferno', v: 'breath', f: 6, m: 1 }, { n: 'Inferno', v: 'breath', f: 6, m: 1 }, { n: 'Inhale', v: 'charge', f: 0, m: 0 },
        S('Talons', 5, 1), { n: 'Terrify', v: 'bind', f: 0, m: 0, k: 3 }, { n: 'Inhale', v: 'charge', f: 0, m: 0 }],
    },
  },
  // Painted looking left (same as every other monster). Do not flip: needsFlip(..., 'left') stays false.
  goldbelly: {
    name: 'Duchess Goldbelly', glyph: '🐲', img: 'assets/miniatures/goldbelly.webp', look: 'left', imgBase: IB(512, 425, 240.5, 418, 426), short: 'GOLD', init: 4, hp: 280, power: 12, xp: 180, gold: 200, tier: 'boss', threat: 12, land: 3,
    slam: { f: 7, m: 2, v: 'breath' }, armor: { n: 2, s: 4 }, flee: { at: 0.3, chance: 1, onlyAs: 'elite' },
    faces: [S('Talons', 3, 1), { n: 'Inferno', v: 'breath', f: 4, m: 1 }, { n: 'Inhale', v: 'charge', f: 0, m: 0 },
      { n: 'Terrify', v: 'bind', f: 0, m: 0, k: 2 }, S('Bite', 4, 1), { n: 'Wing Wall', v: 'guard', f: 4, m: 1 }],
    rage: {
      name: 'Molten Fury', power: 12,
      faces: [{ n: 'Inferno', v: 'breath', f: 6, m: 1 }, { n: 'Inferno', v: 'breath', f: 6, m: 1 }, { n: 'Inhale', v: 'charge', f: 0, m: 0 },
        S('Talons', 5, 1), { n: 'Terrify', v: 'bind', f: 0, m: 0, k: 3 }, { n: 'Inhale', v: 'charge', f: 0, m: 0 }],
    },
  },
  blazemorrow: {
    name: 'The Dowager Blazemorrow', glyph: '🐲', img: 'assets/miniatures/blazemorrow.webp', look: 'left', imgBase: IB(512, 458, 217.5, 451, 402), short: 'BLAZ', init: 4, hp: 280, power: 12, xp: 180, gold: 200, tier: 'boss', threat: 12, land: 3,
    slam: { f: 7, m: 2, v: 'breath' }, armor: { n: 2, s: 4 }, flee: { at: 0.3, chance: 1, onlyAs: 'elite' },
    faces: [S('Talons', 3, 1), { n: 'Inferno', v: 'breath', f: 4, m: 1 }, { n: 'Inhale', v: 'charge', f: 0, m: 0 },
      { n: 'Terrify', v: 'bind', f: 0, m: 0, k: 2 }, S('Bite', 4, 1), { n: 'Wing Wall', v: 'guard', f: 4, m: 1 }],
    rage: {
      name: 'Molten Fury', power: 12,
      faces: [{ n: 'Inferno', v: 'breath', f: 6, m: 1 }, { n: 'Inferno', v: 'breath', f: 6, m: 1 }, { n: 'Inhale', v: 'charge', f: 0, m: 0 },
        S('Talons', 5, 1), { n: 'Terrify', v: 'bind', f: 0, m: 0, k: 3 }, { n: 'Inhale', v: 'charge', f: 0, m: 0 }],
    },
  },
  // Clover Heist essential minis. Painted looking left. Do not flip.
  magpieking: {
    name: 'The Magpie King', glyph: '🐦', img: 'assets/miniatures/magpieking.webp', look: 'left', imgBase: IB(493, 512, 212.5, 505, 370), short: 'MAGK', init: 6, hp: 100, power: 12, xp: 80, gold: 70, tier: 'boss', threat: 9, land: 3,
    slam: { f: 3, m: 2 }, adds: 'magpies',
    faces: [S('Scepter', 1, 1), S('Scepter', 1, 1), { n: 'Rally!', v: 'summon', f: 0, m: 0, k: 1 },
      { n: 'Gold Shield', v: 'guard', f: 2, m: 1 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 },
      { n: 'Snatch the Luck', v: 'hush', f: 0, m: 0 }],
    rage: {
      name: 'Greed-Mad', power: 12,
      faces: [S('Frenzy', 3, 1), { n: 'Rally!', v: 'summon', f: 0, m: 0, k: 1 },
        { n: 'Rally!', v: 'summon', f: 0, m: 0, k: 1 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 },
        { n: 'Snatch the Luck', v: 'hush', f: 0, m: 0 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
    },
  },
  magpies: {
    name: 'Magpie Gang', glyph: '🐦', img: 'assets/miniatures/magpies.webp', look: 'left', imgBase: IB(512, 388, 218, 381, 351), short: 'MAGS', init: 6, hp: 30, power: 8, xp: 8, gold: 6, tier: 'minion', threat: 1.0, land: 1,
    faces: [S('Stab', 1, 1), { n: 'Shiny!', v: 'pilfer', f: 0, m: 1 }, { n: 'Shiny!', v: 'pilfer', f: 0, m: 1 },
      { n: 'Duck', v: 'guard', f: 1, m: 1 }, S('Slash', 2, 1), { n: 'Scatter', v: 'phase', f: 0, m: 0 }],
  },
  foxrogue: {
    name: 'Sir Reginald Brush', glyph: '🦊', img: 'assets/miniatures/foxrogue.webp', look: 'left', imgBase: IB(364, 512, 178, 505, 345), short: 'FOX', init: 8, hp: 50, power: 8, xp: 14, gold: 11, tier: 'minion', threat: 1.3, land: 1,
    pounce: { f: 2, m: 2 }, flee: { at: 0.5, chance: 1 }, nemesis: false, wander: false, // story-only: pinned returns, never a random wanderer
    faces: [{ n: 'Pilfer', v: 'pilfer', f: 0, m: 1 }, { n: 'Pilfer', v: 'pilfer', f: 0, m: 1 },
      { n: 'Stalk', v: 'stalk', f: 0, m: 0 }, { n: 'Snare', v: 'bind', f: 0, m: 0, k: 1 },
      S('Knife', 1, 1), { n: 'Fade', v: 'phase', f: 0, m: 0 }],
  },
  // ---- Painted roster fill (23): look left, existing verbs only. Copy-source comments are the stats template. ----
  treant: { // ogre + armor 1d6
    name: 'The Wrath-Oak', glyph: '🌳', img: 'assets/miniatures/treant.webp', look: 'left', imgBase: IB(432, 512, 209.0, 505, 389), short: 'OAK', init: 4, hp: 84, power: 10, xp: 30, gold: 28, tier: 'elite', threat: 2.8, land: 1,
    slam: { f: 2, m: 2 }, armor: { n: 1, s: 6 },
    faces: [S('Branch', 0, 1), { n: 'Regrow Bark', v: 'mend', f: 0, m: 1 }, { n: 'Root Grip', v: 'bind', f: 0, m: 0, k: 2 },
      { n: 'Uproot', v: 'charge', f: 0, m: 0 }, S('Stomp', 0, 1), { n: 'Uproot', v: 'charge', f: 0, m: 0 }],
    rage: {
      name: 'Wrath of the Wood', power: 10,
      faces: [S('Branch', 2, 1), { n: 'Uproot', v: 'charge', f: 0, m: 0 }, { n: 'Uproot', v: 'charge', f: 0, m: 0 },
        { n: 'Root Grip', v: 'bind', f: 0, m: 0, k: 2 }, { n: 'Uproot', v: 'charge', f: 0, m: 0 }, S('Stomp', 2, 1)],
    },
  },
  puffball: { // frostwhelp, no flee; comic, written-only
    name: 'Puffball', glyph: '🍄', img: 'assets/miniatures/puffball.webp', look: 'left', imgBase: IB(484, 512, 254.0, 505, 447), short: 'PUFF', init: 8, hp: 56, power: 8, xp: 16, gold: 14, tier: 'minion', threat: 1.4, land: 2, wander: false,
    faces: [S('Bite', 1, 1), { n: 'Spore Sneeze', v: 'breath', f: 0, m: 1 }, { n: 'Spore Sneeze', v: 'breath', f: 0, m: 1 },
      { n: 'Curl Up', v: 'guard', f: 2, m: 1 }, S('Claw', 1, 1), { n: 'Spore Sneeze', v: 'breath', f: 0, m: 1 }],
  },
  raincloud: { // frostwhelp, no flee
    name: 'Squall', glyph: '⛈️', img: 'assets/miniatures/raincloud.webp', look: 'left', imgBase: IB(388, 512, 190.5, 505, 358), short: 'SQAL', init: 8, hp: 56, power: 8, xp: 16, gold: 14, tier: 'minion', threat: 1.4, land: 1,
    faces: [S('Bite', 1, 1), { n: 'Washout', v: 'drain', f: 0, m: 1, k: 1 }, { n: 'Soaked', v: 'bind', f: 0, m: 0, k: 2 },
      { n: 'Curl Up', v: 'guard', f: 2, m: 1 }, S('Claw', 1, 1), { n: 'Soaked', v: 'bind', f: 0, m: 0, k: 2 }],
  },
  bonfire: { // cinderling, no flee
    name: 'Wildfire', glyph: '🔥', img: 'assets/miniatures/bonfire.webp', look: 'left', imgBase: IB(358, 512, 178.5, 505, 348), short: 'FIRE', init: 6, hp: 48, power: 8, xp: 14, gold: 16, tier: 'minion', threat: 1.2, lands: [1, 3],
    faces: [S('Nip', 1, 1), S('Nip', 1, 1), { n: 'Flare', v: 'breath', f: 0, m: 1 },
      { n: 'Hot Coals', v: 'ward', f: 0, m: 1, k: 4 }, S('Ember Kick', 2, 1), { n: 'Flare', v: 'breath', f: 0, m: 1 }],
  },
  wisp: { // wraith, no drain
    name: 'Will-o’-the-Wisp', glyph: '✨', img: 'assets/miniatures/wisp.webp', look: 'left', imgBase: IB(399, 512, 199.0, 505, 389), short: 'WISP', init: 8, hp: 40, power: 10, xp: 18, gold: 14, tier: 'minion', threat: 1.5, land: 2,
    faces: [{ n: 'Chill', v: 'pierce', f: 0, m: 1 }, { n: 'Chill', v: 'pierce', f: 0, m: 1 },
      { n: 'Lead Astray', v: 'chain', f: 0, m: 0, k: 1 }, { n: 'Wail', v: 'bind', f: 0, m: 0, k: 2 },
      { n: 'Phase', v: 'phase', f: 0, m: 0 }, S('Touch', 1, 1)],
  },
  lampsnuffer: { // bonewarden, adds wisp; Jinx optional → hush
    name: 'The Lamp-Snuffer', glyph: '🕯️', img: 'assets/miniatures/lampsnuffer.webp', look: 'left', imgBase: IB(337, 512, 168.0, 505, 327), short: 'SNUF', init: 4, hp: 150, power: 12, xp: 55, gold: 46, tier: 'elite', threat: 7, land: 2,
    slam: { f: 3, m: 2 }, adds: 'wisp',
    faces: [S('Cleave', 2, 1), { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Snuff', v: 'hush', f: 0, m: 0 },
      { n: 'Call the Dark', v: 'summon', f: 0, m: 0, k: 1 }, S('Smash', 0, 2), { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
  },
  moonjelly: { // wraith; comic, written-only
    name: 'Peepers, the Moon-Jelly', glyph: '🪼', img: 'assets/miniatures/moonjelly.webp', look: 'left', imgBase: IB(330, 512, 170.0, 505, 307), short: 'PEEP', init: 8, hp: 40, power: 10, xp: 18, gold: 14, tier: 'minion', threat: 1.5, land: 3, wander: false,
    faces: [{ n: 'Chill', v: 'pierce', f: 0, m: 1 }, { n: 'Chill', v: 'pierce', f: 0, m: 1 },
      { n: 'Sleepy Stare', v: 'hush', f: 0, m: 0 }, { n: 'Wail', v: 'bind', f: 0, m: 0, k: 2 },
      { n: 'Phase', v: 'phase', f: 0, m: 0 }, S('Touch', 1, 1)],
  },
  visitor: { // dirgesinger
    name: 'The Hive Scout', glyph: '👽', img: 'assets/miniatures/visitor.webp', look: 'left', imgBase: IB(428, 512, 213.5, 505, 418), short: 'SCOT', init: 6, hp: 46, power: 8, xp: 15, gold: 12, tier: 'minion', threat: 1.4, land: 3,
    faces: [{ n: 'Hush', v: 'hush', f: 0, m: 0 }, { n: 'Take a Sample', v: 'drain', f: 0, m: 1, k: 2 },
      S('Prod', 1, 1), { n: 'Sour Note', v: 'pierce', f: 0, m: 1 },
      { n: 'Hold Still', v: 'chain', f: 0, m: 0, k: 1 }, S('Prod', 1, 1)],
  },
  hedgeboar: { // wolf + slam
    name: 'Razorback', glyph: '🐗', img: 'assets/miniatures/hedgeboar.webp', look: 'left', imgBase: IB(512, 451, 257.0, 444, 499), short: 'RAZR', init: 8, hp: 40, power: 8, xp: 10, gold: 8, tier: 'minion', threat: 1.3, land: 1,
    slam: { f: 2, m: 2 },
    faces: [S('Bite', 1, 1), S('Bite', 1, 1), { n: 'Gore', v: 'pierce', f: 1, m: 1 },
      S('Lunge', 0, 2), { n: 'Paw the Ground', v: 'charge', f: 0, m: 0 }, S('Rend', 2, 1)],
  },
  silkwood: { // lich, adds spider. Dawn name is fierce; Clover Heist overlays Madam Silkwood
    name: 'The Grave-Silk Matriarch', glyph: '🕸️', img: 'assets/miniatures/silkwood.webp', look: 'left', imgBase: IB(512, 470, 255.5, 463, 500), short: 'SILK', init: 6, hp: 185, power: 12, xp: 140, gold: 120, tier: 'boss', threat: 11, land: 2,
    slam: { f: 4, m: 2 }, adds: 'spider',
    faces: [{ n: 'Needle', v: 'pierce', f: 2, m: 1 }, { n: 'Call Brood', v: 'summon', f: 0, m: 0, k: 1 },
      { n: 'Drain Life', v: 'drain', f: 0, m: 1, k: 3 }, { n: 'Web', v: 'bind', f: 0, m: 0, k: 2 },
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Silk Armor', v: 'guard', f: 2, m: 1 }],
    rage: {
      name: 'Frenzy', power: 12,
      faces: [{ n: 'Needle Storm', v: 'pierce', f: 4, m: 1 }, { n: 'Call Brood', v: 'summon', f: 0, m: 0, k: 2 },
        { n: 'Drain Life', v: 'drain', f: 2, m: 1, k: 4 }, { n: 'Web', v: 'bind', f: 0, m: 0, k: 3 },
        { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
    },
  },
  gargoyle: { // shieldbearer
    name: 'Vault Sentinel', glyph: '🗿', img: 'assets/miniatures/gargoyle.webp', look: 'left', imgBase: IB(443, 512, 221.0, 505, 429), short: 'GARG', init: 4, hp: 44, power: 6, xp: 10, gold: 8, tier: 'minion', threat: 1.3, lands: [2, 3],
    armor: { n: 1, s: 6 },
    faces: [S('Claw', 1, 1), S('Claw', 1, 1), { n: 'Spout', v: 'breath', f: 0, m: 1 },
      { n: 'Turn to Stone', v: 'guard', f: 2, m: 1 }, S('Shove', 0, 1), S('Claw', 1, 1)],
  },
  yeti: { // ogre; comic rare Ascent elite, never a wanderer
    name: 'Big Muriel', glyph: '🏔️', img: 'assets/miniatures/yeti.webp', look: 'left', imgBase: IB(458, 512, 233.0, 505, 385), short: 'MURL', init: 4, hp: 84, power: 10, xp: 30, gold: 28, tier: 'elite', threat: 2.8, land: 3, wander: false,
    slam: { f: 2, m: 2, v: 'breath' },
    faces: [S('Swipe', 0, 1), { n: 'Frosty Huff', v: 'breath', f: 0, m: 1 }, S('Stomp', 0, 1),
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Bear Hug', v: 'bind', f: 0, m: 0, k: 2 },
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
  },
  direbear: { // ogre + armor 1d4
    name: 'Gravelhide, the Dire Bear', glyph: '🐻', img: 'assets/miniatures/direbear.webp', look: 'left', imgBase: IB(418, 512, 210.0, 505, 405), short: 'BEAR', init: 4, hp: 84, power: 10, xp: 30, gold: 28, tier: 'elite', threat: 2.8, land: 1,
    slam: { f: 2, m: 2 }, armor: { n: 1, s: 4 },
    faces: [S('Maul', 0, 1), S('Maul', 1, 1), S('Claw', 0, 1),
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Roar', v: 'howl', f: 0, m: 0, k: 2 },
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
    rage: {
      name: 'Wounded Fury', power: 10,
      faces: [S('Maul', 2, 1), { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 },
        { n: 'Roar', v: 'howl', f: 0, m: 0, k: 2 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, S('Claw', 2, 1)],
    },
  },
  tuskraider: { // shieldbearer
    name: 'Ash-Tusk Raider', glyph: '🪓', img: 'assets/miniatures/tuskraider.webp', look: 'left', imgBase: IB(512, 501, 283.0, 494, 395), short: 'TUSK', init: 4, hp: 44, power: 6, xp: 10, gold: 8, tier: 'minion', threat: 1.3, lands: [1, 3],
    slam: { f: 1, m: 2 }, armor: { n: 1, s: 6 },
    faces: [S('Cleave', 1, 1), S('Cleave', 1, 1), { n: 'Shield Rush', v: 'charge', f: 0, m: 0 },
      { n: 'War Cry', v: 'howl', f: 0, m: 0, k: 1 }, S('Shove', 0, 1), S('Cleave', 1, 1)],
  },
  tuskwarlord: { // goblinking, adds tuskraider
    name: 'Gorvash, Warlord of the Ash-Tusks', glyph: '🪓', img: 'assets/miniatures/tuskwarlord.webp', look: 'left', imgBase: IB(401, 512, 200.5, 505, 342), short: 'GORV', init: 6, hp: 100, power: 12, xp: 80, gold: 70, tier: 'boss', threat: 9, land: 1,
    slam: { f: 3, m: 2 }, adds: 'tuskraider',
    faces: [S('Cleave', 1, 1), S('Cleave', 1, 1), { n: 'Sound the Horn', v: 'summon', f: 0, m: 0, k: 1 },
      { n: 'War Cry', v: 'howl', f: 0, m: 0, k: 2 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 },
      { n: 'Iron Guard', v: 'guard', f: 2, m: 1 }],
    rage: {
      name: 'Last Stand', power: 12,
      faces: [S('Frenzy', 3, 1), { n: 'Sound the Horn', v: 'summon', f: 0, m: 0, k: 1 },
        { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 },
        { n: 'War Cry', v: 'howl', f: 0, m: 0, k: 2 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
    },
  },
  barrowrider: { // bonewarden + armor 1d6
    name: 'The Barrow Rider', glyph: '🐴', img: 'assets/miniatures/barrowrider.webp', look: 'left', imgBase: IB(410, 512, 204.5, 505, 402), short: 'BARW', init: 4, hp: 150, power: 12, xp: 55, gold: 46, tier: 'elite', threat: 7, land: 2,
    slam: { f: 3, m: 2 }, armor: { n: 1, s: 6 }, adds: 'skeleton',
    faces: [S('Cleave', 2, 1), { n: 'Barrow Charge', v: 'charge', f: 0, m: 0 }, { n: 'Grave Chill', v: 'drain', f: 0, m: 1, k: 1 },
      { n: 'Call the Barrow Guard', v: 'summon', f: 0, m: 0, k: 1 }, S('Smash', 0, 2), { n: 'Barrow Charge', v: 'charge', f: 0, m: 0 }],
  },
  stormtyrant: { // ashwyrm
    name: 'Vexmor, the Storm-Tyrant', glyph: '⚡', img: 'assets/miniatures/stormtyrant.webp', look: 'left', imgBase: IB(512, 508, 287.5, 501, 336), short: 'VEXM', init: 6, hp: 150, power: 12, xp: 60, gold: 70, tier: 'elite', threat: 3.5, land: 3,
    slam: { f: 2, m: 2 }, armor: { n: 1, s: 4 }, flee: { at: 0.25, chance: 1 },
    faces: [S('Glaive', 2, 1), S('Glaive', 2, 1), { n: 'Chain Lightning', v: 'breath', f: 2, m: 1 },
      { n: 'Thunderclap', v: 'charge', f: 0, m: 0 }, { n: 'Static Lock', v: 'chain', f: 0, m: 0, k: 2 }, S('Glaive', 1, 1)],
  },
  hivedrone: { // spider
    name: 'Glass-Hive Stinger', glyph: '🪲', img: 'assets/miniatures/hivedrone.webp', look: 'left', imgBase: IB(512, 437, 228.5, 430, 344), short: 'DRON', init: 8, hp: 48, power: 10, xp: 16, gold: 12, tier: 'minion', threat: 1.8, lands: [2, 3],
    faces: [S('Bite', 1, 1), { n: 'Paralysing Sting', v: 'bind', f: 0, m: 0, k: 2 }, { n: 'Glass Barb', v: 'pierce', f: 1, m: 1 },
      { n: 'Carapace', v: 'guard', f: 1, m: 1 }, S('Pounce', 0, 2), S('Bite', 1, 1)],
  },
  hivequeen: { // lich, adds hivedrone
    name: 'The Glass-Hive Queen', glyph: '👑', img: 'assets/miniatures/hivequeen.webp', look: 'left', imgBase: IB(453, 512, 228.0, 505, 439), short: 'HIVE', init: 6, hp: 185, power: 12, xp: 140, gold: 120, tier: 'boss', threat: 11, land: 2,
    slam: { f: 4, m: 2 }, adds: 'hivedrone',
    faces: [{ n: 'Glass Bolt', v: 'pierce', f: 2, m: 1 }, { n: 'Brood Call', v: 'summon', f: 0, m: 0, k: 1 },
      { n: 'Drink the Luck', v: 'drain', f: 0, m: 1, k: 2 }, { n: 'Resin', v: 'bind', f: 0, m: 0, k: 2 },
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Carapace', v: 'guard', f: 2, m: 1 }],
    rage: {
      name: 'Swarm', power: 12,
      faces: [{ n: 'Glass Storm', v: 'pierce', f: 4, m: 1 }, { n: 'Brood Call', v: 'summon', f: 0, m: 0, k: 2 },
        { n: 'Drink the Luck', v: 'drain', f: 2, m: 1, k: 2 }, { n: 'Resin', v: 'bind', f: 0, m: 0, k: 3 },
        { n: 'Brood Call', v: 'summon', f: 0, m: 0, k: 1 }, { n: 'Brood Call', v: 'summon', f: 0, m: 0, k: 1 }],
    },
  },
  nightblade: { // gloomstalker; hush in place of bind
    name: 'The Nightblade', glyph: '🗡️', img: 'assets/miniatures/nightblade.webp', look: 'left', imgBase: IB(467, 512, 239.5, 505, 370), short: 'NITE', init: 8, hp: 50, power: 8, xp: 14, gold: 11, tier: 'minion', threat: 1.3, lands: [2, 3],
    pounce: { f: 2, m: 2 },
    faces: [{ n: 'Shadow Cut', v: 'pierce', f: 0, m: 1 }, { n: 'Shadow Cut', v: 'pierce', f: 0, m: 1 },
      { n: 'From the Dark', v: 'stalk', f: 0, m: 0 }, { n: 'Silence', v: 'hush', f: 0, m: 0 },
      S('Knife', 1, 1), { n: 'Melt Away', v: 'phase', f: 0, m: 0 }],
  },
  basilisk: { // chainbinder; pierce in place of drain
    name: 'Glarefang, the Basilisk', glyph: '🦎', img: 'assets/miniatures/basilisk.webp', look: 'left', imgBase: IB(512, 311, 226.5, 304, 448), short: 'GLAR', init: 6, hp: 52, power: 10, xp: 16, gold: 13, tier: 'minion', threat: 1.5, land: 3,
    faces: [{ n: 'Stone Gaze', v: 'chain', f: 0, m: 0, k: 2 }, { n: 'Stone Gaze', v: 'chain', f: 0, m: 0, k: 2 },
      { n: 'Fang', v: 'pierce', f: 0, m: 1 }, S('Bite', 1, 1),
      { n: 'Fang', v: 'pierce', f: 1, m: 1 }, { n: 'Stone Crust', v: 'ward', f: 0, m: 1, k: 3 }],
  },
  slagcolossus: { // ironwarden
    name: 'The Slag Colossus', glyph: '🌋', img: 'assets/miniatures/slagcolossus.webp', look: 'left', imgBase: IB(440, 512, 237.5, 505, 378), short: 'SLAG', init: 4, hp: 110, power: 10, xp: 40, gold: 34, tier: 'elite', threat: 3.0, land: 3,
    slam: { f: 3, m: 2 }, armor: { n: 2, s: 4 },
    faces: [S('Forge-Fist', 1, 1), S('Forge-Fist', 1, 1), { n: 'Molten Skin', v: 'ward', f: 0, m: 1, k: 4 },
      { n: 'Slag Spray', v: 'breath', f: 2, m: 1 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, S('Forge-Fist', 0, 1)],
  },
  frostgiant: { // bonewarden, no summon, + armor 1d4
    name: 'Hrimvald, the Rime-Giant', glyph: '❄️', img: 'assets/miniatures/frostgiant.webp', look: 'left', imgBase: IB(503, 512, 281.5, 505, 432), short: 'HRIM', init: 4, hp: 150, power: 12, xp: 55, gold: 46, tier: 'elite', threat: 7, land: 3,
    slam: { f: 3, m: 2 }, armor: { n: 1, s: 4 },
    faces: [S('Trunk', 2, 1), { n: 'Frostbind', v: 'bind', f: 0, m: 0, k: 2 }, { n: 'Blizzard', v: 'breath', f: 2, m: 1 },
      { n: 'Frozen Solid', v: 'chain', f: 0, m: 0, k: 2 }, S('Smash', 0, 2), { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
  },
};

// -------------------------------------------------------------------------------------------
// Campaign: acts of ten quests. Each step offers two quests; the tenth is the boss.
// -------------------------------------------------------------------------------------------
export const ACTS = [
  {
    id: 1, name: 'The Ashen Marches', land: 1, tag: 'Goblins, wolves, and a fire that will not die. Bring a stubborn heart.',
    places: ['Cinder Ford', 'Burnt Orchard', 'Ravens’ Rest', 'Wolfwood Edge', 'Smoke Hollow', 'The Toll Bridge', 'Ashfall Camp', 'Gallows Hill'],
    pool: [['goblin', 'goblin'], ['wolf'], ['wolf', 'goblin'], ['cultist', 'goblin'], ['wolf', 'wolf'], ['cultist'], ['cultist', 'wolf'], ['cinderling', 'goblin'], ['shieldbearer', 'goblin'],
      ['hedgeboar'], ['raincloud'], ['tuskraider', 'goblin'], ['bonfire'], ['raincloud', 'hedgeboar'], ['tuskraider']],
    elite: [['ogre'], ['ogre', 'goblin'], ['treant'], ['direbear']],
    boss: ['goblinking'],
    help: ['Cinder Ford', 'Burnt Orchard'],
    // where each step's fight happens, in story order (the arrival beats are written for this order; step 8 may become a Call for Help)
    route: ['Cinder Ford', 'Burnt Orchard', 'Ravens’ Rest', 'Wolfwood Edge', 'The Toll Bridge', 'Smoke Hollow', 'Ashfall Camp', 'Smoke Hollow', 'Ashfall Camp', 'Gallows Hill'],
    // First pass only (acts 1–3). Difficulty scales HP / damage / summoned adds, never this cast.
    // fightHp: a step's monsters are sturdier (>1) or frailer (<1) than the act's growth gives them, to keep a crowd fair for the level it is met at.
    fightHp: { 2: 0.9, 4: 0.85, 7: 0.55, 9: 0.6 }, // (honest dice: a new hero's Bronze d4 has a blank, so the cinderling and the wolf pair ease off)
    fights: [
      ['goblin'],                          // 1 Cinder Ford — the lesson
      ['cinderling', 'goblin'],            // 2 Burnt Orchard — a bickering pair
      ['cultist', 'wolf'],                 // 3 Ravens’ Rest
      ['wolf', 'wolf'],                    // 4 Wolfwood Edge — a pair, not a nation
      ['ogre'],                            // 5 The Toll Bridge — elite
      ['cultist', 'cinderling'],           // 6 Smoke Hollow
      ['goblin', 'goblin', 'goblin'],      // 7 Ashfall Camp — Pip, Pog and Nib
      ['cultist', 'cinderling'],           // 8 Smoke Hollow fallback (step 8 is usually Help)
      ['goblin', 'goblin', 'goblin'],      // 9 Ashfall Camp
      ['goblinking'],                      // 10 Gallows Hill — boss
    ],
  },
  {
    id: 2, name: 'The Hollow Crypt', land: 2, tag: 'The dead do not rest. They organise. Mind the stairs.',
    places: ['The Weeping Stair', 'Ossuary Gate', 'Candle Vault', 'The Pale Nave', 'Grave-Silk Hall', 'Mourner’s Row', 'The Drowned Crypt', 'Ash Cloister'],
    pool: [['skeleton', 'skeleton'], ['wraith'], ['spider', 'skeleton'], ['wraith', 'skeleton'], ['spider', 'spider'], ['spider'], ['frostwhelp', 'spider'], ['gloomstalker', 'skeleton'], ['dirgesinger', 'wraith'],
      ['wisp'], ['gargoyle'], ['nightblade'], ['hivedrone'], ['wisp', 'skeleton'], ['gargoyle', 'wraith'], ['puffball']],
    elite: [['bonewarden'], ['lampsnuffer'], ['barrowrider']],
    boss: ['lich'],
    help: ['Candle Vault', 'The Pale Nave'],
    route: ['The Weeping Stair', 'Candle Vault', 'The Pale Nave', 'Grave-Silk Hall', 'Ossuary Gate', 'Mourner’s Row', 'The Drowned Crypt', 'Mourner’s Row', 'The Drowned Crypt', 'Ash Cloister'],
    fightHp: { 3: 0.5, 6: 1.2, 7: 1.15, 8: 1.2, 9: 1.15 }, // the back half of the crypt pushes harder (Oct 2026 tuning)
    fights: [
      ['skeleton', 'skeleton'],                  // 1 The Weeping Stair
      ['wraith', 'skeleton'],                    // 2 Candle Vault
      ['dirgesinger', 'skeleton', 'skeleton'],   // 3 The Pale Nave
      ['spider', 'spider'],                      // 4 Grave-Silk Hall
      ['bonewarden'],                            // 5 Ossuary Gate — elite
      ['wraith', 'gloomstalker'],                // 6 Mourner’s Row
      ['frostwhelp', 'frostwhelp'],              // 7 The Drowned Crypt
      ['wraith', 'gloomstalker'],                // 8 Mourner’s Row fallback
      ['frostwhelp', 'frostwhelp'],              // 9 The Drowned Crypt
      ['lich'],                                  // 10 Ash Cloister — boss
    ],
  },
  {
    id: 3, name: 'The Ember Peaks', land: 3, tag: 'Dragon fire, broken oaths, and a queen who wants it all. Take water.',
    places: ['Kindling Steps', 'The Glass Fields', 'Wyrmwatch', 'Hoardfall Mine', 'The Brazen Bridge', 'Kettle Tarn', 'Oathbreak Keep', 'Ember Throne slopes', 'The Ember Throne'],
    pool: [['cinderling', 'cinderling'], ['gloomstalker', 'shieldbearer'], ['chainbinder', 'cinderling'], ['dirgesinger', 'gloomstalker'],
      ['frostwhelp', 'frostwhelp'], ['shieldbearer', 'chainbinder'], ['cinderling', 'frostwhelp'], ['ironwarden'], ['ashwyrm'],
      ['bonfire'], ['visitor'], ['basilisk'], ['moonjelly'], ['gargoyle', 'chainbinder'], ['hivedrone', 'nightblade'], ['tuskraider', 'cinderling']],
    elite: [['vharaxis'], ['ashwyrm'], ['yeti'], ['frostgiant'], ['slagcolossus'], ['stormtyrant']],
    boss: ['vharaxis'],
    help: ['Wyrmwatch', 'Hoardfall Mine'],
    route: ['Kindling Steps', 'The Glass Fields', 'Wyrmwatch', 'Hoardfall Mine', 'The Brazen Bridge', 'Kettle Tarn', 'Oathbreak Keep', 'Kettle Tarn', 'Ember Throne slopes', 'The Ember Throne'],
    fightHp: { 2: 1.2, 3: 1.2, 6: 1.2, 7: 1.25, 8: 1.2 }, // heroes are strong by Act III: the quieter steps and Oathbreak Keep stand up to them
    fights: [
      ['cinderling', 'cinderling'],              // 1 Kindling Steps
      ['gloomstalker', 'shieldbearer'],          // 2 The Glass Fields
      ['chainbinder', 'cinderling'],             // 3 Wyrmwatch
      ['ironwarden', 'cinderling'],              // 4 Hoardfall Mine
      ['vharaxis'],                              // 5 The Brazen Bridge — elite (pinned)
      ['frostwhelp', 'frostwhelp'],              // 6 Kettle Tarn
      ['fallenchampion'],                        // 7 Oathbreak Keep — mid-boss (pinned)
      ['frostwhelp', 'frostwhelp'],              // 8 Kettle Tarn fallback
      ['ashwyrm', 'shieldbearer'],               // 9 Ember Throne slopes
      ['vharaxis'],                              // 10 The Ember Throne — boss (pinned)
    ],
    // Pin the set-piece fights so Oathbreak Keep is a proper boss and the Queen is the finale.
    gates: {
      5: { kind: 'elite', place: 'The Brazen Bridge', enemies: ['vharaxis'] },
      7: { kind: 'boss', place: 'Oathbreak Keep', enemies: ['fallenchampion'] },
      9: { kind: 'battle', place: 'Ember Throne slopes' },
      10: { kind: 'boss', place: 'The Ember Throne', enemies: ['vharaxis'] },
    },
  },
];
// Painted battle backdrops live at assets/bg/<slug>.webp. A place name becomes a slug by lowering
// case, dropping apostrophes, and turning spaces into hyphens (Ravens’ Rest → ravens-rest).
export const placeSlug = (name) => String(name || '').toLowerCase().replace(/['’]/g, '').replace(/\s+/g, '-');
// The slopes painting is named ember-throne-slopes.webp; older copy said "the-ember-throne-slopes".
export const PLACE_ALIAS = { 'the-ember-throne-slopes': 'ember-throne-slopes' };
const canonSlug = (name) => PLACE_ALIAS[placeSlug(name)] || placeSlug(name);
export function placeLook(name) {
  const slug = canonSlug(name);
  const act = ACTS.find((a) => a.places.some((p) => canonSlug(p) === slug));
  if (!slug || !act) return { slug: '', url: '', weather: '' };
  const weather = act.id === 1 ? 'ash' : act.id === 2 ? 'crypt' : act.id === 3 ? 'ember' : '';
  return { slug, url: `assets/bg/${slug}.webp`, weather };
}
export const BREATH_SHARE = 0.6; // party: every living hero takes ceil(mag × this)
export const FLEE_REWARD = 0.4;  // a fled dragon pays this share of xp/gold and no extra drop bump
export const QUESTS_PER_ACT = 10;
// BATTLE POINTS, like an arcade score. Every battle starts at 0; your hero keeps a lifetime total, and in party games the
// battle's top scorer gets the 1st place trophy (2nd place too with 3+ heroes), first pick of the spoils, and more gold.
export const POINTS = {
  dealt: 1,          // per point of damage you deal
  absorbed: 1,       // per point of damage your block stops (blocking is worth the same as hitting)
  shieldBlock: 2,    // team games: per point you block while the monsters are targeting you (you are the company's shield)
  heldLine: 10,      // team games: the monsters came at you and you are still standing at the end of the round
  healSelf: 0.5,     // per health you mend on yourself
  healFriend: 2,     // per health you give a friend (a thrown potion)
  kill: 15,          // the killing blow
  triple: 10,        // each triple you roll
  teamTriple: 20,    // each team triple you share in
  straight: 10,      // a straight
  magicGift: 4,      // per magic you give a friend
  revive: 40,        // bringing a fallen friend back
  knockedOut: -40,   // falling in battle
};
// Party: the gold from the fallen is shared evenly, then the top scorer gets PLACE_GOLD[0] more (as a share of that split)
// and, with three or more heroes, the runner-up PLACE_GOLD[1].
export const PLACE_GOLD = [0.5, 0.25];
// Team play
export const TEAM_TRIPLE_BONUS = 10; // (Act I; it grows with the act like a triple: TRIPLE_BY_ACT) Team Weapons Attack / Team Strength Attack (same monster) / Team Head to Toe, Left and Right Guard Block
export const MORAL_BOOST = 3;        // the killing blow gives the next hero to act +3 attack
export const SHARE_MAGIC = 2;        // a team action: pay 2 magic, a friend gains 2
export const REVIVE_COST = 10;       // a team action, once a battle: 10 magic brings a fallen friend back
export const REVIVE_HP = 10;
// Potion belt: every hero starts with 2 potions a battle and can train a third at camp.
export const POTION_BELT = { 2: [90, 4] }; // from 2 to 3: [gold, hero level]
// Healing potions are bought at camp and carried from battle to battle (Dave): what you drink is gone until you buy more.
// Price and strength grow with the act, so a potion stays worth carrying. A new hero leaves home with POTION_START.
export const POTION_PRICE = [10, 20, 30];  // gold, Act I / II / III
export const POTION_HEAL = [10, 15, 20];   // health, Act I / II / III
export const POTION_START = 2;
// How the monsters grow. Health x ACT_HP[act] x (1 + STEP_HP per step); every hit +ACT_FLAT[act] (+1 every three steps).
// The perilous road: tougher (PERIL.hp, +PERIL.flat a hit), pays PERIL.reward x the gold and experience, and leans to bigger loot.
export const ACT_HP = [1.05, 1.55, 2.35]; // (Oct 2026: heroes grow ~+10 damage a round each act now, so the monsters grow too; Act III 2.25 -> 2.35 when its triples went to +20)
export const ACT_FLAT = [0, 2, 5];
export const STEP_HP = 0.06;
// The gold a fallen monster drops, by act (Acts I, II, III): later acts pay more so a hero can keep growing (Oct 2026 economy study).
export const ACT_GOLD = [1, 1.1, 1.2]; // Oct 2026 (gold as a currency): the monsters' gold grows slowly, so the dice stay at least half of what a fight pays (was 1, 1.3, 1.8)
export const PERIL = { hp: 1.3, flat: 3, reward: 1.75 };
// The standard road hits harder (Dave: "real danger"), so most of its fights end with you a little scared: +flat[act] on
// every monster hit, and +lone more when a monster fights alone (a pair already presses you; a lone one was a speed bump).
// The perilous road and Act III were already tense and are left alone; so is the first fight, the lone-goblin lesson.
export const ORDINARY = { flat: [3, 5, 6], lone: 2 };
// Elites and bosses by act (Acts I, II, III): extra health (x) and extra on every hit (+). Tuned with tools/progress-all.sh.
export const SET_PIECE = { elite: { hp: [1.5, 1.45, 1.6], flat: [3, 2, 5] }, boss: { hp: [1.3, 1.15, 2.2], flat: [1, 2, 5] } };
export const ELITE_STEPS = [5];
// What a numbered step is, for the trail and the road. An act may pin set-pieces in `gates`.
export function stepKind(act, step) {
  const gate = act?.gates?.[step];
  if (gate?.kind) return gate.kind;
  if (step >= QUESTS_PER_ACT) return 'boss';
  if (ELITE_STEPS.includes(step)) return 'elite';
  return 'battle';
}

// Party scaling (index = players - 1). Only 1 player is tuned today.
// Monsters at a table fit the company's real strength (Dave, Oct 2026). The strongest hero sets the fight (the road's own scaling,
// at the chosen difficulty); every other hero adds their strength as a share of the strongest's (engine.js teamFactor: 2 for an
// equal pair, 1.4 for a strong hero with a beginner). For each extra "strongest hero" the monsters get hpPer more health and
// flatPer more on every hit (added to the hit's base number, so the monster's card shows it: a team splits each hit and each block
// soaks its share, so health alone made a team untouchable). An equal pair: x2.2 health, +10 a hit (tools/party.mjs).
// What a typical hero of each level is worth (engine.js heroStrength), from heroes of every class playing the campaign
// (tools/levelstrength.mjs): levels 1..13, about 19 + 5.4 a level. For story campaigns that set their fights by level.
export const LEVEL_STRENGTH = [19, 27, 31, 35, 41, 47, 52, 57, 62, 67, 73, 79, 84];
export const PARTY = {
  hpPer: 1.2,
  flatPer: 10,
  flatBy: { easy: 10, normal: 10, hard: 13, legendary: 16 }, // the hit power per extra hero, by difficulty (big hits split too)
  hp: [1, 2.2, 2.5, 3.1, 3.6, 4.0], // by head count, for a battle made without the heroes at hand
  adds: [0, 0, 0, 1, 1, 2], // goblins that join big tables, by head count
  flat: [0, 10, 0, 0, 0, 0],
};

export const ENEMY_CAP = 4;
