// QuestDice — static game data. Pure data, no DOM, safe to import from node.
// Every number here is a tuning knob; see docs/DESIGN.md for the reasoning.

export const SLOTS = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'];
export const ROLE = {
  NW: 'weapon', NE: 'weapon', N: 'head', S: 'feet',
  W: 'hand', E: 'hand', C: 'heart', SW: 'special', SE: 'special',
};
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
export const REROLL_DICE = 4;
export const REROLL_ACTIONS = 6; // free + paid, for the UI pips
export const SYNERGY_BONUS = 10;
export const HEAL_COST = 2; // magic
export const HEAL_AMOUNT = 4; // hp  (1 magic = 2 hp)
export const NUDGE_COST = 3; // turning the heart die is a special, pricey act
export const RECHARGE_COST = 3;

// Universal number language on head, hands and feet (see FACE_PAY): 1 heal, 2 pierce, 3 magic, 4 gold at 2 each; 5-8 repeat the pattern at 3; 9 = 2 heal + 2 pierce; 10 = 2 magic + 2 gold.
export const RES_BY_SIZE = { 4: [2, 2, 2, 2], 6: [2, 2, 2, 2], 8: [2, 2, 2, 2], 10: [2, 2, 2, 2] }; // faces 1-4 (kept for older callers)
// What each face of a head / hand / feet die pays. Same pattern all the way up: heal, pierce, magic, gold.
export const FACE_PAY = [null,
  { heal: 2 }, { pierce: 2 }, { magic: 2 }, { gold: 2 },        // 1-4: the same on every die
  { heal: 3 }, { pierce: 3 }, { magic: 3 }, { gold: 3 },        // 5-8: three of the symbol
  { heal: 2, pierce: 2 }, { magic: 2, gold: 2 }];               // 9, 10: two kinds, two each
// Heart amplifier: +2 per matching head / hand / feet die. Faces 1-4 (heal, pierce, magic, gold).
export const HEART_AMP = [2, 2, 2, 2];
export const HEART_COLOR_BONUS = 4; // face 5: +4 block on each blue weapon, face 6: +4 attack on each red weapon

// Straights across the seven numeric dice (blanks never count): length -> bonus (attack, or the same number in gold).
export const STRAIGHT = { 5: 10, 6: 18, 7: 30 };

export const RARITY = ['Bronze', 'Silver', 'Gold', 'Diamond'];
export const RARITY_WEIGHTS = [70, 22, 7, 1];
export const RARITY_SELL = [6, 14, 34, 90]; // (old flat sell table; selling now pays SELL_SHARE of a weapon's worth)
// A weapon's worth = its base price x tier x size. The shop charges the full worth; selling returns half.
export const RARITY_MULT = [1, 2, 4, 8];
export const SIZE_VALUE = { 4: 1, 6: 1.5, 8: 2.2, 10: 3 };
export const SELL_SHARE = 0.5;
// You carry what you wield plus a small pack. A full pack means choosing: sell, swap, or leave the spoils.
export const BAG_MAX = 4;
// The size of a found weapon. A bigger die needs a hand (Strength) at least that big, or it rolls as the hand's size.
// Weights for [d4, d6, d8, d10] by act; the boss always drops one a size up, the perilous road leans bigger.
export const DROP_SIZES = { 1: [100, 0, 0, 0], 1.5: [70, 30, 0, 0], 2: [45, 45, 10, 0], 3: [15, 50, 30, 5] };
// TIER (Bronze..Diamond) = how many corner bonus symbols a weapon carries: forging adds the weapon's next `bonus`. Numbers never change.
export const FORGE_COST = [0, 40, 120, 300];            // gold to reach Silver, Gold, Diamond (two-handed x1.4)
// SIZE (d4..d10) = the number range. A weapon die can never be bigger than the hand holding it.
export const WEAPON_SIZE_STEPS = { 4: 30, 6: 80, 8: 180 }; // gold to grow a weapon from this size to the next

// Faces are [value, color]; color r = offense (red), b = defense (blue). `fx` is the weapon's icon.
const F = (v, c, fx) => (fx ? { v, c, fx } : { v, c });
// Three temperaments (Dave): every weapon averages about +2 a roll at d4 Bronze; they differ in how much they swing.
//   steady   1, 2, 2, 3   never blank, low ceiling
//   balanced 0, 2, 3, 3
//   risky    two blanks, big top faces (0, 0, 4, 4 or sharper)
// `temper` names it for the cards. Metals raise numbers (see engine weaponFaces) and add the `bonus` corner abilities in order.
export const WEAPONS = {
  fists: { name: 'Fists', hands: 1, lean: 'off', hidden: true, tag: 'Bare knuckles.',
    faces: [F(0, 'r'), F(0, 'b'), F(1, 'r'), F(1, 'b')] },
  dagger: { name: 'Dagger', hands: 1, lean: 'off', temper: 'steady', glyph: '🗡️', price: 18,
    tag: 'Steady: never blank. A 3 mends 1.',
    faces: [F(1, 'r'), F(2, 'r'), F(2, 'b'), F(3, 'r', { heal: 1 })],
    bonus: [{ face: 1, fx: { pierce: 1 } }, { face: 2, fx: { heal: 1 } }, { face: 3, fx: { pierce: 1 } }] },
  bracer: { name: 'Bracer', hands: 1, lean: 'def', temper: 'steady', glyph: '🛡️', price: 18,
    tag: 'Steady guard: never blank. A 3 sparks 1 magic.',
    faces: [F(1, 'b'), F(2, 'b'), F(2, 'r'), F(3, 'b', { magic: 1 })],
    bonus: [{ face: 1, fx: { heal: 1 } }, { face: 2, fx: { magic: 1 } }, { face: 3, fx: { heal: 1 } }] },
  sword: { name: 'Sword', hands: 1, lean: 'off', temper: 'balanced', glyph: '⚔️', price: 24,
    tag: 'Balanced. A 3 pierces for 1.',
    faces: [F(0, 'r'), F(2, 'b'), F(3, 'r'), F(3, 'r', { pierce: 1 })],
    bonus: [{ face: 2, fx: { pierce: 1 } }, { face: 1, fx: { magic: 1 } }, { face: 3, fx: { pierce: 1 } }] },
  shield: { name: 'Shield', hands: 1, lean: 'def', temper: 'balanced', glyph: '🛡️', price: 24,
    tag: 'Balanced wall. The red 2 is a bash that hits back.',
    faces: [F(0, 'b'), F(2, 'r'), F(3, 'b'), F(3, 'b')],
    bonus: [{ face: 2, fx: { heal: 1 } }, { face: 3, fx: { magic: 1 } }, { face: 1, fx: { pierce: 1 } }] },
  spear: { name: 'Spear', hands: 1, lean: 'off', temper: 'risky', glyph: '🔱', price: 27,
    tag: 'Risky reach: two blanks, two 4s that pierce.',
    faces: [F(0, 'r'), F(0, 'b'), F(4, 'r', { pierce: 1 }), F(4, 'r', { pierce: 1 })],
    bonus: [{ face: 3, fx: { pierce: 1 } }, { face: 2, fx: { pierce: 1 } }, { face: 2, fx: { magic: 1 } }] },
  mace: { name: 'Mace', hands: 1, lean: 'off', temper: 'risky', glyph: '🔨', price: 26,
    tag: 'Risky crusher: two blanks, a 3 and a big 5.',
    faces: [F(0, 'r'), F(0, 'r'), F(3, 'r'), F(5, 'r')],
    bonus: [{ face: 3, fx: { pierce: 1 } }, { face: 2, fx: { heal: 1 } }, { face: 3, fx: { pierce: 1 } }] },
  tower: { name: 'Tower Shield', hands: 1, lean: 'def', temper: 'risky', glyph: '🛡️', price: 30,
    tag: 'Risky wall: two blanks, two big blue 4s.',
    faces: [F(0, 'b'), F(0, 'b'), F(4, 'b'), F(4, 'b', { heal: 1 })],
    bonus: [{ face: 2, fx: { heal: 1 } }, { face: 3, fx: { magic: 1 } }, { face: 2, fx: { magic: 1 } }] },
  bow: { name: 'Bow', twinName: 'Arrows', hands: 2, lean: 'off', temper: 'steady', glyph: '🏹', price: 42,
    tag: 'Two-handed and steady: a bow in one hand and arrows in the other. Good odds at triples. A red 3 pierces.',
    faces: [F(1, 'b'), F(2, 'r'), F(2, 'r'), F(3, 'r', { pierce: 1 })],
    bonus: [{ face: 3, fx: { pierce: 1 } }, { face: 2, fx: { pierce: 1 } }, { face: 1, fx: { magic: 1 } }] },
  staff: { name: 'Staff', hands: 2, lean: 'off', temper: 'balanced', glyph: '🪄', price: 45,
    tag: 'Two-handed channel. A 3 gives 2 magic.',
    faces: [F(0, 'b'), F(2, 'b'), F(3, 'r'), F(3, 'r', { magic: 2 })],
    bonus: [{ face: 2, fx: { magic: 1 } }, { face: 3, fx: { magic: 1 } }, { face: 1, fx: { heal: 1 } }] },
  longsword: { name: 'Long Sword', hands: 2, lean: 'off', temper: 'risky', glyph: '⚔️', price: 45,
    tag: 'Two-handed and risky: two blanks, two big red 4s.',
    faces: [F(0, 'r'), F(0, 'b'), F(4, 'r'), F(4, 'r')],
    bonus: [{ face: 2, fx: { pierce: 1 } }, { face: 3, fx: { pierce: 1 } }, { face: 2, fx: { magic: 1 } }] },
  warhammer: { name: 'War Hammer', hands: 2, lean: 'off', temper: 'risky', glyph: '🔨', price: 48,
    tag: 'Two-handed, all or nothing: two blanks, a 2 and a crushing 6.',
    faces: [F(0, 'r'), F(0, 'r'), F(2, 'r'), F(6, 'r')],
    bonus: [{ face: 3, fx: { pierce: 1 } }, { face: 2, fx: { pierce: 1 } }, { face: 3, fx: { heal: 1 } }] },
  // LEGENDARY weapons (Dave): rare and named, each with one rule of its own. Found only in elite and boss spoils, or now and
  // then from the traveler. Their faces are fixed (no forging; training a size still works), about +10 at d4, and they use
  // the `model` weapon's 3D shape. Only one legendary may be in your hands at a time.
  dawnbreaker: { name: 'Dawnbreaker', model: 'sword', legendary: true, hands: 1, lean: 'off', temper: 'legendary', glyph: '⚔️', price: 160,
    tag: 'Legendary sword of the first light. Its 4 also hits every other monster for 2.',
    faces: [F(1, 'r'), F(2, 'b'), F(3, 'r'), F(4, 'r', { splash: 2 })] },
  oakheart: { name: 'Oakheart', model: 'shield', legendary: true, hands: 1, lean: 'def', temper: 'legendary', glyph: '🛡️', price: 160,
    tag: 'Legendary shield of living oak. A blue 3 or 4 also heals 2.',
    faces: [F(1, 'b'), F(2, 'r'), F(3, 'b', { heal: 2 }), F(4, 'b', { heal: 2 })] },
  thunderspear: { name: 'Thunder Spear', model: 'spear', legendary: true, hands: 1, lean: 'off', temper: 'legendary', glyph: '🔱', price: 160,
    tag: 'Legendary spear that rings like a storm. Every red face pierces 1.',
    faces: [F(1, 'r', { pierce: 1 }), F(1, 'b'), F(4, 'r', { pierce: 1 }), F(4, 'r', { pierce: 1 })] },
  fortune: { name: 'Fortune’s Dagger', model: 'dagger', legendary: true, hands: 1, lean: 'off', temper: 'legendary', glyph: '🗡️', price: 160,
    tag: 'Legendary dagger with a lucky edge. Never blank, and a 3 also pays 3 gold.',
    faces: [F(2, 'r'), F(2, 'b'), F(3, 'r', { loot: 3 }), F(3, 'r', { loot: 3 })] },
  starfire: { name: 'Starfire Staff', model: 'staff', legendary: true, hands: 2, lean: 'off', temper: 'legendary', glyph: '🪄', price: 220,
    tag: 'Legendary two-handed staff. Every face gives magic, the 4 gives 2.',
    faces: [F(1, 'b', { magic: 1 }), F(2, 'b', { magic: 1 }), F(3, 'r', { magic: 1 }), F(4, 'r', { magic: 2 })] },
  twinfang: { name: 'Twinfang Bow', twinName: 'Twinfang Arrows', model: 'bow', legendary: true, hands: 2, lean: 'off', temper: 'legendary', glyph: '🏹', price: 220,
    twinShot: 3, tag: 'Legendary two-handed bow. Twin shot: when the bow and the arrows roll the same number, +3 attack.',
    faces: [F(1, 'b'), F(2, 'r'), F(3, 'r', { pierce: 1 }), F(3, 'r', { pierce: 1 })] },
};
export const LEGENDARY = Object.keys(WEAPONS).filter((id) => WEAPONS[id].legendary);
export const isLegendary = (inst) => !!(inst && WEAPONS[inst.id]?.legendary);
export const modelOf = (id) => WEAPONS[id]?.model || id; // the ordinary weapon whose 3D shape and poses a legendary borrows
export const tierName = (inst) => (isLegendary(inst) ? 'Legendary' : RARITY[(inst?.rarity | 0)] || 'Bronze');
// The chance a fight's spoils hold a legendary you do not already carry, and the traveler's chance (Act II on) to bring one.
export const LEGENDARY_CHANCE = { elite: 0.06, boss: 0.15, perilous: 0.03, shop: 0.05 };
export const LOOT_WEIGHTS = {
  dagger: 10, bracer: 8, sword: 10, shield: 10, spear: 8, mace: 7, tower: 7, bow: 7, longsword: 7, staff: 7, warhammer: 5,
};

// TALENT dice (the bottom corners; the old "special" dice). Faces: two blanks, a 2x (doubles that hand's strength in its lane),
// then symbol faces: one on a d4, three on a d6. Each symbol face holds up to two symbols; any one symbol may appear at most twice on a die.
// A symbol is worth the strength rolled on the hand above the die: one for one, every symbol (Dave).
export const TALENT_SYMS = {
  atk: { name: 'Attack', text: 'Attack equal to your hand strength.' },
  block: { name: 'Block', text: 'Block equal to your hand strength.' },
  magic: { name: 'Magic', text: 'Magic equal to your hand strength.' },
  heal: { name: 'Heal', text: 'Heal equal to your hand strength.' },
  gold: { name: 'Gold', text: 'Gold equal to your hand strength.' },
};
// A new hero starts with six dice: head, hands, feet, heart and one weapon. Camp unlocks the rest, one die at a time.
export const START_DICE = ['N', 'W', 'C', 'E', 'S', 'NW', 'SW']; // head, hands, feet, heart, one weapon, and one talent die
export const UNLOCK_COST = { SW: 15, SE: 35, NE: 30 }; // the first costs less than one fight pays, so a new player can buy it at their first camp
export const UNLOCK_ORDER = ['SW', 'NE', 'SE'];
// POWERS (the old "cards"): spent with magic. A power is used once per battle unless it is `atwill` (once per round, weaker).
// kinds: flat (fixed numbers) | dice (roll NdS) | scale (more Magic = more dice) | round (grows with the round number) | luck (roll for a table) | super (round gate, hits everyone).
export const POWER_UPGRADE = [60, 140, 260]; // gold to reach level 1, 2. Each level: +25% numbers, +1 die on dice powers.
// Learning another power from your class library at camp (it then swaps freely into its slot). Supers also need level 5.
export const POWER_LEARN = 50;
export const POWER_SLOTS = ['A', 'B', 'C'];
export const SLOT_NAME = { A: 'Big move', B: 'Every round', C: 'Charge' };
export const TALENT_MAX_SAME = 2;
export const TALENT_PER_FACE = 2;
export const TALENT_SLOT_COST = 25; // gold per symbol slot, the same for every slot
export const TALENT_FACES = { 4: 1, 6: 3 };
// (No pierce on talent dice: it ignores block and has no defence, so it stays on weapons, cards and the number 2.)
export const CLASS_TALENT = {
  knight: { SW: 'heal', SE: 'atk' }, ranger: { SW: 'block', SE: 'atk' }, wizard: { SW: 'magic', SE: 'heal' },
  dwarf: { SW: 'block', SE: 'heal' }, bard: { SW: 'gold', SE: 'magic' },
};
// Difficulty scales the monsters only (never the rules): health, and flat damage added to every hit.
export const DIFFICULTY = {
  easy: { name: 'Easy', text: 'Gentler monsters. Learn the dice at your own pace.', hp: 0.8, flat: -1, gold: 1 },
  normal: { name: 'Normal', text: 'The intended game.', hp: 1, flat: 0, gold: 1 },
  hard: { name: 'Hard', text: 'Tougher, harder-hitting monsters. Pays 15% more gold.', hp: 1.3, flat: 3, gold: 1.15 },
};
// Display helpers for the old flat UI and captions.
export const TALENT_GLYPH = { atk: '⚔', block: '🛡', pierce: '◆', magic: '✦', heal: '✚', gold: '🪙' };
export const talentLabel = (sym) => (sym === 'X2' ? '2×' : Array.isArray(sym) ? sym.map((x) => TALENT_GLYPH[x]).join('') : '');
export const talentName = (sym) => (sym === 'X2' ? '2× Strength' : Array.isArray(sym) ? sym.map((x) => TALENT_SYMS[x].name).join(' + ') : 'Blank');
export const talentText = (sym) => (sym === 'X2' ? 'Doubles this hand’s strength in its lane.' : Array.isArray(sym) ? sym.map((x) => TALENT_SYMS[x].text).join(' ') : 'Nothing happens.');

// Strength / special upgrade ladder: [from size, gold, minimum hero level].
export const STRENGTH_STEPS = { 4: [40, 3], 6: [100, 7], 8: [220, 12] };
export const SPECIAL_STEPS = { 4: [60, 3] }; // the talent die grows d4 -> d6 only
// Speed: the feet die is the initiative die; a bigger one beats more monster rolls. [gold, hero level]
export const SPEED_STEPS = { 4: [60, 2], 6: [140, 6] }; // feet stop at d6 (the Ranger alone can train them to d8)
export const NEXT_SIZE = { 4: 6, 6: 8, 8: 10 };

export const xpToNext = (lvl) => 28 + 12 * (lvl - 1);

// -------------------------------------------------------------------------------------------
// Classes. The board is identical for everyone; the class lives in the card menu.
// A card is { id, name, cost, text, fx }. fx keys: atk, pierce, block, heal, magic,
// weaken (enemy damage -N this round), free (a free reroll action of N dice).
// -------------------------------------------------------------------------------------------
export const CLASSES = {
  // Asymmetric starts, uniform dice (Dave): every class has the same nine dice and rules. They differ in health, speed
  // (feet), a strong hand, starting weapons and magic: startMagic, magicCap (default MAGIC_CAP), healAmount (health per
  // Heal with magic, default HEAL_AMOUNT), powerLevels (how far powers upgrade, default 2) and maxFeet (default 6).
  knight: {
    feet: 4, hands: 6, startMagic: 4, // slow but strong: one d6 hand (left) from the start
    trait: 'Balanced: a strong left hand and a shield.',
    name: 'Knight', glyph: '⚔️', hp: 34,
    blurb: 'Steel and stubbornness. Sword and shield, simple and sturdy.',
    weapons: ['sword', 'shield'],
    // Powers fill three slots (Dave): A a big move (once a battle), B every round, C a charge. `start` is what a
    // new hero carries; the others are learned at camp and swapped into their slot.
    cards: [
      { id: 'cleave', slot: 'A', start: true, name: 'Cleave', kind: 'dice', cost: 2, dice: { n: 2, s: 6, to: 'atk' }, splash: 'half', fx: { atk: 7 }, text: 'Roll 2d6 attack. Half of it splashes on every other monster.' },
      { id: 'judgment', slot: 'A', name: 'Judgment', kind: 'super', cost: 6, minRound: 3, aoe: 12, fx: { atk: 14 }, text: 'Round 3+: +14 attack on your target and 12 to EVERY monster.', unlock: 5 },
      { id: 'shieldwall', slot: 'B', start: true, name: 'Shield Up', kind: 'flat', atwill: true, cost: 1, fx: { block: 4 }, text: 'Every round: +4 block.' },
      { id: 'press', slot: 'B', name: 'Press the Attack', kind: 'flat', atwill: true, cost: 1, fx: { atk: 3 }, text: 'Every round: +3 attack.' },
      { id: 'rally', slot: 'C', start: true, name: 'Rally Cry', kind: 'charge', atwill: true, cost: 1, max: 4, per: { atk: 3, block: 3 }, fx: { atk: 3, block: 3 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them for +3 attack and +3 block each.' },
      { id: 'secondwind', slot: 'C', name: 'Second Wind', kind: 'charge', atwill: true, cost: 1, max: 4, per: { heal: 5 }, fx: { heal: 5 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them to heal 5 each.' },
    ],
  },
  ranger: {
    feet: 6, maxFeet: 8, startMagic: 4,
    trait: 'The fastest: the only class that can train speed to a d8.',
    name: 'Ranger', glyph: '🏹', hp: 28,
    blurb: 'Quick hands, quick eyes. A bow for the best odds at triples; rerolls 4 dice at a time.',
    weapons: ['bow'],
    cards: [
      { id: 'aimed', slot: 'A', start: true, name: 'Aimed Shot', kind: 'scale', cost: 2, max: 5, dice: { n: 2, s: 6, to: 'pierce' }, fx: { pierce: 7 }, text: 'Roll pierce dice: 2 magic = 2d6, each extra magic adds a die (up to 5d6).' },
      { id: 'rain', slot: 'A', name: 'Rain of Arrows', kind: 'super', cost: 5, minRound: 3, aoe: 9, fx: { pierce: 6 }, text: 'Round 3+: +6 pierce on your target and 9 to EVERY monster.', unlock: 5 },
      { id: 'quickdraw', slot: 'B', start: true, name: 'Quick Draw', kind: 'flat', atwill: true, cost: 1, fx: { free: 2 }, text: 'Every round: a free reroll of 2 dice.' },
      { id: 'snare', slot: 'B', name: 'Snare', kind: 'flat', atwill: true, cost: 1, fx: { weaken: 2 }, text: 'Every round: monsters hit 2 softer.' },
      { id: 'volley', slot: 'C', start: true, name: 'Volley', kind: 'charge', atwill: true, cost: 1, max: 4, per: { pierce: 4 }, fx: { pierce: 4 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them for 4 pierce each.' },
      { id: 'vanish', slot: 'C', name: 'Vanish', kind: 'charge', atwill: true, cost: 1, max: 4, per: { block: 5 }, fx: { block: 5 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them for +5 block each.' },
    ],
  },
  wizard: {
    feet: 4, startMagic: 6, magicCap: 15, healAmount: 6, powerLevels: 3,
    trait: 'Weak and slow, the strongest magic: starts with 6, holds 15, heals 6 for 2 magic, powers grow to level 3.',
    name: 'Wizard', glyph: '🧙', hp: 24,
    blurb: 'A frail body and a deep well of magic. No shield, but a spell for every problem and healing to spare.',
    weapons: ['staff'],
    cards: [
      { id: 'arcbolt', slot: 'A', start: true, name: 'Arc Bolt', kind: 'scale', cost: 2, max: 6, dice: { n: 1, s: 8, to: 'atk' }, fx: { atk: 5 }, text: 'Roll attack dice: 2 magic = 1d8, each extra magic adds a die (up to 5d8).' },
      { id: 'meteor', slot: 'A', name: 'Meteor', kind: 'round', cost: 5, minRound: 3, per: 4, splash: 'half', fx: { atk: 12 }, text: 'Round 3+: attack equal to 4 x the round number; half splashes to the others.', unlock: 5 },
      { id: 'bolt', slot: 'B', start: true, name: 'Magic Missile', kind: 'flat', atwill: true, cost: 1, fx: { pierce: 3 }, text: 'Every round: +3 pierce.' },
      { id: 'barrier', slot: 'B', name: 'Barrier', kind: 'flat', atwill: true, cost: 1, fx: { block: 4 }, text: 'Every round: +4 block.' },
      { id: 'coil', slot: 'C', start: true, name: 'Storm Coil', kind: 'charge', atwill: true, cost: 1, max: 4, per: { atk: 5 }, splash: 'half', fx: { atk: 5 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them for 5 attack each, half splashing.' },
      { id: 'light', slot: 'C', name: 'Healing Light', kind: 'charge', atwill: true, cost: 1, max: 4, per: { heal: 6 }, fx: { heal: 6 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them to heal 6 each.' },
    ],
  },
  dwarf: {
    feet: 4, hands: 6, startMagic: 3, // the slowest, the toughest: one d6 hand (left) from the start
    trait: 'The wall: the most health, a crushing mace and a tower shield.',
    name: 'Dwarf Warden', glyph: '🪓', hp: 40,
    blurb: 'Stone-skinned and grudge-keeping. The deepest health pool, the thickest wall.',
    weapons: ['mace', 'tower'],
    cards: [
      { id: 'grudge', slot: 'A', start: true, name: 'Grudge', kind: 'round', cost: 3, per: 2, fx: { atk: 6 }, text: 'Attack equal to 2 x the round number. Slow to start, brutal late.' },
      { id: 'avalanche', slot: 'A', name: 'Avalanche', kind: 'super', cost: 6, minRound: 3, aoe: 10, fx: { atk: 10, block: 10 }, text: 'Round 3+: +10 attack, +10 block, and 10 to EVERY monster.', unlock: 5 },
      { id: 'bulwark', slot: 'B', start: true, name: 'Shield Bash', kind: 'flat', atwill: true, cost: 1, fx: { atk: 4 }, text: 'Every round: +4 attack.' },
      { id: 'brace', slot: 'B', name: 'Brace', kind: 'flat', atwill: true, cost: 1, fx: { block: 4 }, text: 'Every round: +4 block.' },
      { id: 'stonehide', slot: 'C', start: true, name: 'Stonehide', kind: 'charge', atwill: true, cost: 1, max: 4, per: { block: 6 }, fx: { block: 6 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them for +6 block each.' },
      { id: 'forgefury', slot: 'C', name: 'Forge Fury', kind: 'charge', atwill: true, cost: 1, max: 4, per: { atk: 4, block: 2 }, fx: { atk: 4, block: 2 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them for +4 attack and +2 block each.' },
    ],
  },
  bard: {
    feet: 6, startMagic: 5,
    trait: 'The steady helper: quick, steady weapons, more magic to share.',
    name: 'Bard', glyph: '🪕', hp: 30,
    blurb: 'The heart of the party. Songs that heal, hymns that harden, a knack for chaos.',
    weapons: ['dagger', 'bracer'],
    cards: [
      { id: 'mending', slot: 'A', start: true, name: 'Mending Song', kind: 'dice', cost: 2, dice: { n: 2, s: 6, to: 'heal' }, fx: { heal: 7 }, text: 'Roll 2d6 and heal that much.' },
      { id: 'finale', slot: 'A', name: 'Finale', kind: 'super', cost: 6, minRound: 3, aoe: 8, fx: { atk: 8, heal: 8, block: 8 }, text: 'Round 3+: +8 attack, heal 8, +8 block, and 8 to EVERY monster.', unlock: 5 },
      { id: 'luckyverse', slot: 'B', start: true, name: 'Lucky Verse', kind: 'luck', atwill: true, cost: 1, fx: { atk: 4 }, text: 'Every round, roll a d6: 1-2 +1 magic, 3-4 +5 attack, 5-6 +9 attack and +2 magic.' },
      { id: 'discord', slot: 'B', name: 'Discord', kind: 'flat', atwill: true, cost: 1, fx: { weaken: 2 }, text: 'Every round: monsters hit 2 softer.' },
      { id: 'ballad', slot: 'C', start: true, name: 'Rising Ballad', kind: 'charge', atwill: true, cost: 1, max: 4, per: { atk: 3, heal: 3 }, fx: { atk: 3, heal: 3 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them for +3 attack and heal 3 each.' },
      { id: 'goldhymn', slot: 'C', name: 'Hymn of Gold', kind: 'charge', atwill: true, cost: 1, max: 4, per: { gold: 4 }, fx: { gold: 4 }, text: 'Every round: 1 magic stores a charge (up to 4). Release them for 4 gold each.' },
    ],
  },
};

// -------------------------------------------------------------------------------------------
// Perks: one pick every level, three offered. Stat tweaks that compose without special cases.
// -------------------------------------------------------------------------------------------
export const PERKS = {
  vitality: { name: 'Vitality', text: '+6 max HP.', max: 5, mod: { maxHp: 6 } },
  reserve: { name: 'Arcane Reserve', text: 'Start every battle with +1 Magic.', max: 3, mod: { startMagic: 1 } },
  quick: { name: 'Quick Hands', text: 'Reroll actions may reroll +1 die.', max: 2, mod: { rerollDice: 1 } },
  keen: { name: 'Keen Edge', text: '+1 to every red lane.', max: 3, mod: { redBonus: 1 } },
  ward: { name: 'Ironward', text: '+1 to every blue lane.', max: 3, mod: { blueBonus: 1 } },
  piercer: { name: 'Piercing Pips', text: 'Each 2 you roll on a cardinal die pierces +1.', max: 3, mod: { pierceBonus: 1 } },
  greed: { name: 'Gold Sense', text: '+25% gold from your dice and the fallen.', max: 3, mod: { goldPct: 0.25 } },
  grit: { name: 'Stout Heart', text: '+4 max HP.', max: 2, mod: { maxHp: 4 } },
  frugal: { name: 'Frugal Mender', text: 'The Heal card costs 1 less Magic (minimum 1).', max: 1, mod: { healCost: -1 } },
};

// -------------------------------------------------------------------------------------------
// Bestiary. Faces: v = verb, f = flat, m = multiplier of the Power die, k = extra parameter.
//   strike  damage (blockable)         pierce  damage that ignores block
//   guard   this round the monster blocks f+m*power of your non-pierce damage
//   mend    heals itself               charge  wind-up; next round it Slams (brace with block, or kill it first)
//   howl    every monster's next strike +k bind  lock k of your dice next round
//   drain   strike, and steal k Magic  pilfer  strike, steal gold if it connects; returned on its death
//   summon  call k reinforcements (the monster's `adds` id)
// -------------------------------------------------------------------------------------------
const S = (n, f, m, extra = {}) => ({ n, v: 'strike', f, m, ...extra });
export const MONSTERS = {
  goblin: {
    name: 'Goblin Skulker', glyph: '👺', short: 'GOBL', init: 6, hp: 30, power: 8, xp: 8, gold: 6, tier: 'minion',
    faces: [S('Stab', 1, 1), S('Stab', 1, 1), { n: 'Pilfer', v: 'pilfer', f: 0, m: 1 },
      { n: 'Duck', v: 'guard', f: 1, m: 1 }, S('Slash', 2, 1), { n: 'Fire Bomb', v: 'pierce', f: 1, m: 1 }],
  },
  wolf: {
    name: 'Dire Wolf', glyph: '🐺', short: 'WOLF', init: 8, hp: 40, power: 8, xp: 10, gold: 8, tier: 'minion',
    faces: [S('Bite', 1, 1), S('Bite', 1, 1), { n: 'Howl', v: 'howl', f: 0, m: 0, k: 2 },
      S('Lunge', 0, 2), S('Bite', 1, 1), S('Rend', 2, 1)],
  },
  cultist: {
    name: 'Ember Mage', glyph: '🔥', short: 'MAGE', init: 6, hp: 34, power: 8, xp: 12, gold: 10, tier: 'minion',
    faces: [{ n: 'Tangle', v: 'bind', f: 0, m: 0, k: 1 }, { n: 'Ember', v: 'pierce', f: 0, m: 1 },
      { n: 'Ward', v: 'guard', f: 0, m: 2 }, { n: 'Siphon', v: 'drain', f: 0, m: 1, k: 2 },
      S('Bolt', 1, 1), { n: 'Tangle', v: 'bind', f: 0, m: 0, k: 2 }],
  },
  ogre: {
    name: 'Hill Ogre', glyph: '👹', short: 'OGRE', init: 4, hp: 84, power: 10, xp: 30, gold: 28, tier: 'elite',
    slam: { f: 2, m: 2 },
    faces: [S('Club', 0, 1), S('Club', 1, 1), S('Stomp', 0, 1),
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Roar', v: 'guard', f: 2, m: 1 },
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
  },
  goblinking: {
    name: 'The Goblin King', glyph: '👑', short: 'KING', init: 6, hp: 100, power: 12, xp: 80, gold: 70, tier: 'boss',
    slam: { f: 3, m: 2 }, adds: 'goblin',
    faces: [S('Scepter', 1, 1), S('Scepter', 1, 1), { n: 'Rally!', v: 'summon', f: 0, m: 0, k: 1 },
      { n: 'Gold Shield', v: 'guard', f: 2, m: 1 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 },
      { n: 'Fire Bombs', v: 'pierce', f: 2, m: 1 }],
    rage: {
      name: 'Greed-Mad', power: 14,
      faces: [S('Frenzy', 2, 1), { n: 'Rally!', v: 'summon', f: 0, m: 0, k: 1 },
        { n: 'Rally!', v: 'summon', f: 0, m: 0, k: 1 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 },
        { n: 'Fire Bombs', v: 'pierce', f: 2, m: 1 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
    },
  },
  // ---- Act II (draft numbers, untuned) ----
  skeleton: {
    name: 'Bone Soldier', glyph: '💀', short: 'SKEL', init: 4, hp: 46, power: 8, xp: 14, gold: 10, tier: 'minion',
    faces: [S('Slash', 1, 1), S('Slash', 1, 1), { n: 'Shield Up', v: 'guard', f: 2, m: 1 },
      S('Stab', 2, 1), { n: 'Bone Throw', v: 'pierce', f: 1, m: 1 }, S('Slash', 1, 1)],
  },
  wraith: {
    name: 'Wraith', glyph: '👻', short: 'WRTH', init: 8, hp: 40, power: 10, xp: 18, gold: 14, tier: 'minion',
    faces: [{ n: 'Chill', v: 'pierce', f: 0, m: 1 }, { n: 'Chill', v: 'pierce', f: 0, m: 1 },
      { n: 'Drain', v: 'drain', f: 0, m: 1, k: 3 }, { n: 'Wail', v: 'bind', f: 0, m: 0, k: 2 },
      { n: 'Phase', v: 'guard', f: 0, m: 2 }, S('Touch', 1, 1)],
  },
  spider: {
    name: 'Crypt Spider', glyph: '🕷️', short: 'SPDR', init: 8, hp: 48, power: 10, xp: 16, gold: 12, tier: 'minion',
    faces: [S('Bite', 1, 1), { n: 'Web', v: 'bind', f: 0, m: 0, k: 2 }, { n: 'Venom', v: 'pierce', f: 1, m: 1 },
      { n: 'Skitter', v: 'guard', f: 1, m: 1 }, S('Pounce', 0, 2), S('Bite', 1, 1)],
  },
  bonewarden: {
    name: 'Bone Warden', glyph: '🦴', short: 'WARD', init: 4, hp: 150, power: 12, xp: 55, gold: 46, tier: 'elite',
    slam: { f: 3, m: 2 }, adds: 'skeleton',
    faces: [S('Cleave', 2, 1), { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Bone Wall', v: 'guard', f: 2, m: 1 },
      { n: 'Raise Dead', v: 'summon', f: 0, m: 0, k: 1 }, S('Smash', 0, 2), { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
  },
  lich: {
    name: 'The Hollow Lich', glyph: '☠️', short: 'LICH', init: 6, hp: 185, power: 12, xp: 140, gold: 120, tier: 'boss',
    slam: { f: 4, m: 2 }, adds: 'skeleton',
    faces: [{ n: 'Soul Bolt', v: 'pierce', f: 2, m: 1 }, { n: 'Raise Dead', v: 'summon', f: 0, m: 0, k: 1 },
      { n: 'Drain Life', v: 'drain', f: 0, m: 1, k: 3 }, { n: 'Dread', v: 'bind', f: 0, m: 0, k: 2 },
      { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Bone Armor', v: 'guard', f: 2, m: 1 }],
    rage: {
      name: 'Unbound', power: 14,
      faces: [{ n: 'Soul Storm', v: 'pierce', f: 3, m: 1 }, { n: 'Raise Dead', v: 'summon', f: 0, m: 0, k: 2 },
        { n: 'Drain Life', v: 'drain', f: 1, m: 1, k: 4 }, { n: 'Dread', v: 'bind', f: 0, m: 0, k: 3 },
        { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }, { n: 'Wind-Up', v: 'charge', f: 0, m: 0 }],
    },
  },
};

// -------------------------------------------------------------------------------------------
// Campaign: acts of ten quests. Each step offers two quests; the tenth is the boss.
// -------------------------------------------------------------------------------------------
export const ACTS = [
  {
    id: 1, name: 'The Ashen Marches', tag: 'Goblins, wolves, and a fire that will not die.',
    places: ['Cinder Ford', 'Burnt Orchard', 'Ravens’ Rest', 'Wolfwood Edge', 'Smoke Hollow', 'The Toll Bridge', 'Ashfall Camp', 'Gallows Hill'],
    pool: [['goblin', 'goblin'], ['wolf'], ['wolf', 'goblin'], ['cultist', 'goblin'], ['wolf', 'wolf'], ['cultist'], ['cultist', 'wolf']],
    elite: [['ogre'], ['ogre', 'goblin']],
    boss: ['goblinking'],
  },
  {
    id: 2, name: 'The Hollow Crypt', tag: 'The dead do not rest. They organize.',
    places: ['The Weeping Stair', 'Ossuary Gate', 'Candle Vault', 'The Pale Nave', 'Grave-Silk Hall', 'Mourner’s Row', 'The Drowned Crypt', 'Ash Cloister'],
    pool: [['skeleton', 'skeleton'], ['wraith'], ['spider', 'skeleton'], ['wraith', 'skeleton'], ['spider', 'spider'], ['spider']],
    elite: [['bonewarden']],
    boss: ['lich'],
  },
];
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
export const TEAM_TRIPLE_BONUS = 10; // Team Weapons Attack / Team Strength Attack (same monster) / Team Head to Toe Block
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
export const ACT_HP = [1, 1.15, 1.35];
export const ACT_FLAT = [0, 2, 5];
export const STEP_HP = 0.06;
export const PERIL = { hp: 1.3, flat: 3, reward: 1.75 };
export const ELITE_STEPS = [5];

// Party scaling (index = players - 1). Only 1 player is tuned today.
export const PARTY = {
  hp: [1, 1.8, 2.5, 3.1, 3.6, 4.0],
  adds: [0, 0, 0, 1, 1, 2],
};

export const ENEMY_CAP = 4;
