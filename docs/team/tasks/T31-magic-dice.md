# T31 Magic dice by colour: price, balance and side games (5 to 6 November 2026)

Dave: "Splash in many games is overpowered. If there are 3 enemies it is 3x powerful unless the damage is divided somehow... we need
to weight. Red attack. Orange pierce and pink splash." Then: "As we have these magic powers that roll a d6 and it cost the same for
all the colors, that's kind of broken. So we need to use different size dice, different numbers of dice, and the cost of the dice
based on the outcome." And: "you roll green dice when you have a magic power that heals you, you roll a pink dice to try to do some
splash damage, maybe sometimes you roll one pink and one pierce... a yellow d6 and get some gold."

The idea underneath: every colour has a strength and a weakness, and you live with the mix you chose. Splash is great against a crowd
and weak against the last monster; pierce is strong against one monster; red is steady. Some things are great, some medium, some a
luxury.

## Decisions already made (Dave)

- **Splash is not pierce.** Each other monster's guard stops splash from powers and weapons, as it always stopped a Fire Arrow
  (build 20261105a9). The level 5 finishers' hit on every monster is unchanged.
- **A pink Splash counter** sits under the board, the seventh counter (build 20261106a1).
- The 15 starting cards stay the starting cards, simple and one colour each where they are now; the mixed side-game cards are learned
  at camp.

## What one point of each colour is worth (measured)

`node tools/t31-rounds.mjs 5 3` (the steady method): real heroes from the bot campaign (all five classes, five campaigns each, Acts
I–III, 3,133 rounds). At every round, after the bot rolls, rerolls and casts, the battle is copied and that one round is played
again with +3 of one colour on the same dice. Offence is scored by the monster health it removes, defence by the hero health it saves.

| One extra point… | All rounds | One monster left | Two left | Three or more | Bosses |
|---|---|---|---|---|---|
| Red attack (monster health) | 0.67 | 0.78 | 0.60 | 0.47 | 0.91 |
| Orange pierce | 0.70 | 0.81 | 0.64 | 0.48 | 0.92 |
| Pink splash | 0.78 | 0.01 | 1.19 | **2.31** | 0.28 |
| Blue block (your health saved) | 0.37 | 0.28 | 0.40 | 0.57 | 0.32 |
| Green heal (your health) | 0.59 | 0.65 | 0.58 | 0.43 | 0.66 |

What it says:

1. **Dave is right about splash.** Against three or more monsters a pink point is worth about five red points; alone it is worth
   nothing. On average it is a little better than red (0.78 against 0.67), because many rounds have more than one monster.
2. **Pierce is barely better than red today** (0.70 against 0.67): the monsters seldom block enough for passing block to matter. For
   pierce to be "much more powerful than a normal attack", some monsters need real armour or bigger guards. That is a monster question
   (the bestiary), not a dice one. Until then, price orange about the same as red.
3. **Block is worth about half a red point** (block past the monster's hit is wasted); **heal about 0.9** of a red point.

Earlier attempts and why they were not used: `tools/t31-weights.mjs` (rounds to win; offence only), `tools/t31-colours.mjs` (heroes two
levels under with starting dice: they mostly lose to the strongest monster, which hides splash), `tools/t31-real.mjs` (whole fights
with real heroes: the dice drift apart and the health left swings more than the bonus moves it).

**Price table (red-equivalents a point, red = 1):** orange 1.05 · pink 1.16 on average, up to ~5 in a crowd · blue 0.55 · green 0.88.
A fair magic card pays about **3.5 red-equivalents a magic** (a red d6 for 1 magic); a charge card about twice that (you wait for it).

## The 15 starting cards, priced

Per magic, in red-equivalents (`charge` cards at four charges):

| Card | Dice / pay | Per magic | Note |
|---|---|---|---|
| Cleave | 2d6 red for 3, +1 d6 a magic (to 4d6), half splashes | 3.7 (4.4 at full) | fair; the splash makes it strong in a crowd, weak alone |
| Aimed Shot | 1 orange d6 a magic | 3.7 | fair |
| Arc Bolt | 1 red d8 for 2 magic, half arcs | 3.55 | fair |
| Anvil Strike | 1 blue d8 a magic, 8 = 3 gold | 2.5 | low by the table, but the Dwarf is the bots' strongest class: left alone |
| Mending Song | 1 green d6 a magic, heals every hero | 3.1 solo | fair (more in a party) |
| Rally Cry | 20 attack + 16 block at 4 charges | 7.2 | the charge yardstick |
| Volley | 24 pierce at 4 charges | 6.3 | low |
| Storm Coil | 24 attack + 12 splash at 4 charges | **9.5** | high |
| Stonehide | 32 block at 4 charges | 4.4 | low |
| Rising Ballad | 20 attack + 16 heal at 4 charges | 8.5 | a little high; the Bard is the bots' weakest class: left alone |
| Counterstrike, Hunter's Mark, Grudge, Lucky Verse, Frog Morph | every-round and trick cards | — | Hunter's Mark is seldom cast by the bot: +3 pierce is thin for 2 magic |

## The proposal being tested

Storm Coil 3 a step (was 4): 20 attack and 10 splash at four charges, about 7.9. Volley 5 a step (was 4): 28 pierce, about 7.4.
Stonehide 8 a step (was 6): 40 block, about 5.5. Hunter's Mark +4 pierce (was +3). Results below.

## Side games (mockups for Dave; `node dev/t31-side-games.mjs`)

Eight learnable cards, each a little dice game. Prices are first guesses for the bots to tune; the art is borrowed.

1. **Crowd Pleaser** (Bard, 2 magic): a gold d6: 1–2 nothing, 3–4 +5 gold, 5–6 +10 gold (Dave's table; 5 gold a roll on average).
2. **Battle Hymn** (Bard, 3 magic): two green d6 heal every hero, and a pink d4 splashes every other monster.
3. **Showboat** (Knight, 2 magic): a red d6 at your target and a gold d6 (5–6: +5 gold).
4. **Thief's Gambit** (Ranger, 2 magic): an orange d4 at your target and a gold d6 (5–6: +5 gold).
5. **Whirlwind** (Dwarf, 2 magic a pink d4, up to 6): every die hits every monster; each one's block stops it.
6. **Field Dressing** (Knight, 2 magic): a green d6 and a blue d6.
7. **Wild Surge** (Wizard, 2 magic): a purple d6: 1–2 nothing, 3–5 +2 magic, 6 +5 magic (pays back a little under its cost).
8. **Adventurer's Choice** (any, 4 magic): pick any three dice (red d6, orange d4, pink d4, blue d8, green d6), then roll them.

Engine needs (small): a card may list several dice groups (`dice: [{n, s, to}, …]`), a gold or magic die reads a table like Lucky
Verse's, and `to: 'splash'` adds to the splash total (each monster's guard stops it).
