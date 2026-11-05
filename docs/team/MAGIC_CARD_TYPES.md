# Magic card types: the five templates

Dave, 6 November 2026: "label them with a title for each type so that when the different bots work on this, they know they're working on
this template … so that we can have some uniformity."

There are **39 magic cards** and **five types**. Each type is one template: every card of that type is drawn the same way, so a change to a
template changes all its cards at once. Use these exact names everywhere: in talk, on the board, in task notes and in code.

Every card carries its type in the game data (`type: 'Dice Card'` and so on, in `CLASSES[cls].cards` in js/data.js). The drawing code for
each template is marked with the same name in `t28Body` in js/g3/magiccard.js (`// ---- Dice Card template`). `test/cardtypes.test.mjs`
checks that every card has a type and that it matches how the card plays.

**Rules for every type** (decided this week):

- **One card per rank.** A card shows only its own rank, as a small purple numeral beside its name (Arc Bolt II). There is no rank chart
  on the card. At camp, "Upgrade to II" shows the next card before you buy it.
- **The game's colours.** Red is attack, orange is pierce, pink is splash (the Fork), blue is block, green is heal, gold is gold, and purple
  is magic. Symbols are solid, with no inner line.
- **Numbers come from the engine.** Never type a number into a card.
- **Every card fits** at 390 × 844 and 375 × 667, at every rank: `node dev/magic-camp-cards.mjs` with LEVEL=0 and LEVEL=3.

## 1. Dice Card

Pay magic per die and roll coloured dice into carved sockets that fill as you add magic. Dice are up to 65 px. Then comes the colour word,
then one plain line (½ splashes, heals every hero, each 8 = +3 gold), then the cost line.

Cleave (Knight, starts) · Aimed Shot (Ranger, starts) · Arc Bolt (Wizard, starts) · Anvil Strike (Dwarf, starts) · Mending Song (Bard,
starts) · Whirlwind (Dwarf)

## 2. Charge Card

Store one charge a round, then use them all. A row of four symbols per colour, the number inside each; the charged ones fill with colour
and the latest glows. Under the row: "Use now: +N" once charged.

Rally Cry (Knight, starts) · Volley (Ranger, starts) · Storm Coil (Wizard, starts) · Stonehide (Dwarf, starts) · Rising Ballad (Bard,
starts) · Second Wind · Vanish · Healing Light · Forge Fury · Hymn of Gold

## 3. Every-Round Card

Pay a little magic and get a fixed bonus, once a round. One big symbol and its number, the colour word, and one short rule line (unused
block hits back; +6 gold if it falls; equal to the damage you took). **Open question for Dave:** the number beside the symbol in its colour
(layout A in `node dev/flat-card-styles.mjs`), or inside it as now.

Counterstrike (Knight, starts) · Hunter's Mark (Ranger, starts) · Magic Missile (Wizard, starts) · Grudge (Dwarf, starts) · Shield Up ·
Press the Attack · Quick Draw · Snare · Barrier · Shield Bash · Brace · Discord

## 4. Side-Game Card

A little dice game: roll a mix of colours and take what lands. The dice in a row, 65 px, smaller when a rank brings more. Then what each
colour pays; a gold or purple die shows its table (1–2 nothing, 3–4 +5, 5–6 +10). A die that pays nothing says so when it lands.

Lucky Verse (Bard, starts) · Crowd Pleaser · Battle Hymn · Showboat · Thief's Gambit · Field Dressing

## 5. Finisher Card

The big moment from round 3 on, once a battle. Your bonuses as big symbols, then the hit on every monster as a pink tag, then "Round 3+ ·
once a battle". (Meteor grows with the round instead.)

Judgment · Rain of Arrows · Avalanche · Finale · Meteor

## The dice on the cards

Dice Cards and Side-Game Cards show the game's own 3D dice (the battle board's), one shape per size, coloured for what they add, turned to
show their number. Nothing is painted per card: a new card gets its dice for free. (`die()` → `to3d()` in js/g3/magiccard.js.)

## Rolling on the card (Dice Cards and Side-Game Cards)

Tapping Roll or Cast rolls the card's own dice right on the card: they hop, tumble and land; the totals show in their colours; **Continue**
sends them to the counters. A new Dice Card or Side-Game Card gets this for free. (`cardRoll` in js/g3/powers.js.)
