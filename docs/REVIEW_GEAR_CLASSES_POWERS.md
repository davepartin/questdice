# Review: weapons, metals, classes and magic powers (Oct 2026)

An evaluation for Dave before any change. Numbers come from `js/data.js` / `js/engine.js` as they stand today.

## 1. The weapons today

**Eight weapons** (plus bare fists): five one-handed, three two-handed. Six lean attack, only two lean block.

| Weapon | Hands | Faces (d4, Bronze) | Avg + per roll | Red / blue total | Blanks | Drop share |
|---|---|---|---|---|---|---|
| Dagger | 1 | 0, 2, 2b, 3 (+heal 1) | 1.75 | 5 / 2 | 1 | 15% |
| Bracer | 1 | 0b, 2b, 2, 3b (+magic 1) | 1.75 | 2 / 5 | 1 | 12% |
| Sword | 1 | 0, 1b, 3, 4 (+pierce 1) | 2.00 | 7 / 1 | 1 | 15% |
| Shield | 1 | 0b, 1, 3b, 4b | 2.00 | 1 / 7 | 1 | 15% |
| Spear | 1 | 0, 1b, 2, 4 (+pierce 2) | 1.75 | 6 / 1 | 1 | 12% |
| Bow + Arrows | 2 | 0b, 1, 2, 3 (+pierce 1) | 1.50 each die | 6 / 0 | 1 | 10% |
| Long Sword | 2 | 0, 0b, 3, 4 | 1.75 each die | 7 / 0 | 2 | 10% |
| Staff | 2 | 0b, 1b, 2, 4 (+magic 2) | 1.75 each die | 6 / 1 | 1 | 10% |

**What a metal adds today:** Bronze, Silver, Gold and Diamond never change a number. Each step only adds one small corner
symbol (+1 pierce, +1 magic or +1 heal on one face). A Diamond sword gives about **+0.75 of a small bonus per roll** over
a Bronze one. That does not feel like levelling up. (Drops: Bronze 70%, Silver 22%, Gold 7%, Diamond 1%; elites drop
Silver or better, bosses Gold or better. Forging costs 40 / 120 / 300 gold.)

**What size adds:** d4 to d6 adds about +1.2 per roll and a higher top number. That is where real growth lives today,
and it waits on Strength (a weapon die never rolls bigger than the hand holding it).

**Steady vs risky:** it exists, but only faintly. Every weapon averages between 1.5 and 2.0; the Long Sword (two blanks,
3 and 4) is the only truly risky one, the Dagger and Bracer (one blank, 2, 2, 3) the steadiest.

**Rare weapons:** none. Nothing feels special to find. Two of the same weapon (even two Diamond spears) can sit in both hands.

## 2. Proposal: weapons and metals

**a. Three temperaments, so steady or risky is a real choice.**

| Temperament | d4 faces | Feel |
|---|---|---|
| Steady | 1, 2, 2, 3 | never blank, low ceiling |
| Balanced | 0, 2, 3, 3 | the middle |
| Risky | 0, 0, 4, 4 | the top number twice, two blanks |

Fill the grid with a few new weapons so each colour has each temperament:

| | Steady | Balanced | Risky |
|---|---|---|---|
| One hand, attack | Dagger | Sword | Spear (pierce) / **Mace** (new, stagger) |
| One hand, block | Bracer | Shield | **Tower Shield** (new) |
| Two hands | Bow + Arrows | Staff (magic) | Long Sword / **War Hammer** (new) |

That is 11 weapons. Blocking finally gets a risky option and a steady one.

**b. Metals raise the numbers, and add abilities.** Each metal step adds +1 to one face (the lowest face first; Diamond
adds +1 to the top face, so it rolls a number no Bronze can) **and** one corner ability. Bronze to Diamond becomes about
**+1.5 per roll**, the same as a size step, and you can see it on the die. A risky weapon keeps one blank until Diamond,
so it stays risky.

**c. Legendary weapons: rare, named, special.** About six, found only from elite and boss chests (or a rare traveler
offer). Each has its own faces and one rule, for example:
- *Dawnbreaker* (sword): its top face also hits every other monster for 2.
- *Oakheart* (shield): a blue 4 or higher also heals 2.
- *Thunder Spear*: every red face pierces 1.
- *Starfire Staff*: +1 magic on every face.
- *Fortune's Dagger*: a 3 also pays 3 gold.
- *Twinfang Bow*: the bow and arrows count as matching for the Weapons Triple when one apart.

**Only one legendary in your hands at a time**, so nobody walks around with two of the best dice. Ordinary drops also
lean away from a weapon you already hold, so matching pairs come from choice, not luck.

## 3. Classes today and a proposal

The dice stay uniform: everyone has the same nine sockets and the same rules. Classes differ only in where they start.

| Class | Health | Feet (speed) | Strong hand | Starting weapons | Start magic |
|---|---|---|---|---|---|
| Knight | 34 | d4 | left d6 | Sword + Shield | 4 |
| Dwarf Warden | 38 | d4 | left d6 | Spear + Shield | 4 |
| Ranger | 28 | d6 | d4 / d4 | Bow + Arrows | 4 |
| Bard | 28 | d6 | d4 / d4 | Dagger + Bracer | 4 |
| Wizard | 26 | d6 | d4 / d4 | Staff | 4 |

Proposal (asymmetric starts, same dice):

| Class | Health | Speed | Hands | Weapons | Magic | Identity |
|---|---|---|---|---|---|---|
| Knight | 34 | slow (d4) | left d6 | Sword + Shield | 4 | the balanced shield |
| Dwarf Warden | 40 | slowest (d4) | left d6 | Mace + Tower Shield | 3 | the wall |
| Ranger | 28 | fastest (d6, first to d8) | d4 / d4 | Bow + Arrows | 4 | strikes first, dodges the hits |
| Bard | 30 | quick (d6) | d4 / d4 | Dagger + Bracer (steady) | 5 | the steady helper |
| Wizard | 24 | slow (d4) | d4 / d4 | Staff (no block weapon) | 6 | weak body, the strongest magic |

**Wizard:** starts weak and slow with no defensive weapon, but carries more magic (start 6, holds up to 15 instead of 12),
heals better with magic (1 magic = 3 health instead of 2), and its powers upgrade one level further than anyone else's.

## 4. Magic powers: three slots and a Healing section

Today each class has four powers (the Wizard five): a mix of once-a-battle, every-round, grows-with-the-round, luck,
charge and a super at level 5. That is too many to hold in your head.

**Proposal: three slots, always the same three kinds.**

| Slot | Kind | How it plays |
|---|---|---|
| **A · Big move** | once a battle | strong, for the moment that matters |
| **B · Every round** | small, cheap | use it every round |
| **C · Charge** | 1 magic a round stores a charge | release any round for a big effect; spaces your magic out |

**Healing** sits under the powers as its own section, not a slot: your bought potions, and Heal with magic
(2 magic = 4 health; the Wizard 2 = 6).

**A power library at camp.** Each class has about six powers, two for each slot. At camp you learn a new one (gold and a
level gate) and choose which slot it replaces, just like putting a weapon in a hand. Today's supers become level-5
library choices for slot A. For example, the Knight: A Cleave or Judgment, B Shield Up or a new Taunt, C Rally (charged).

## 5. The helmet

Keep it a plain number die. Its job is synergy: it is the middle of the Weapons Triple (top row) and the top of the
Head to Toe Triple (down the middle), and it pays its symbol like the hands and feet. Armor pieces can come later.

## 6. Six heroes, two of the same class

Each class already has its own colour set (cloth, trim, glow). A second Knight gets an alternate set (for example steel
blue instead of crimson), a third another, so every hero on the field is easy to tell apart.

## Suggested order

1. Metals raise numbers + steady / balanced / risky + the three new weapons. Re-run the balance sims.
2. Three power slots, the Healing section, and the camp power library.
3. Class starting points (Wizard slow and magic-strong, Ranger fastest, Dwarf the wall).
4. Legendary weapons with the one-legendary rule.
5. Alternate colours for duplicate heroes.
