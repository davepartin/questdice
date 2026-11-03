# T26 The camp economy: gold in, potions out, what a new player can buy (3 November 2026)

Dave: "do an overview of the gold… the potions that need to be bought, and which upgrades a new player will do by the end of Act I… we need to make sure the player is getting enough gold so that when they see all these upgrade options it begins to help them move forward." **Measurement only; no rule changed.** All numbers are bots (the smart bot, Normal, the live rules with training on, 3 campaigns per class = 15 heroes), so read them as a map, not a verdict. `node tools/t26-camp-economy.mjs [campaigns] [difficulty] [out]`, levers `GOLD=`, `SPEED=`, `TRAIN=first`.

## What it says, in short

1. **Gold per won fight: 74 in Act I, 167 in Act II, 287 in Act III** (x2.3, then x1.7). A whole campaign earns about 5,000 gold; everything the camp sells (dice, talents, powers, training, weapons sizes, rerolls, pet, belt) costs 5,445, so a bot buys about 40 upgrades: **10.6 in Act I, 13.3 in Act II, 16.6 in Act III.** That is roughly one upgrade after every fight in Act I, and more later.
2. **Act I's first fights are the tight spot.** Median gold by step: **12, 40, 61, 67, 85, 82, 71, 85, 78, 153 (boss).** After fight 1 there is barely 12 gold, and a refill potion is 10 of it. This is exactly the "I spent it all on potions" feeling. (A human will earn less than the bot: it sells every spare weapon, 29% of Act I gold, and takes straights as gold, 24% of Act I fight gold.)
3. **Acts II and III are rich, and prices do not rise.** Upgrade prices are the same in every act (d6 40, d8 100, d10 220; power ranks 50/90/140; training the same), but income more than doubles, and act gates (d8 needs Act II, d10 Act III, training ranks open with the acts) cap what can be bought. By Act III the bots have 109 gold unspent per camp. "Everything gets more expensive in Acts II and III" is not true today: only the income rises.
4. **Potions are no longer the problem at 10 gold.** About 1.1 to 1.5 a fight = 11 to 15 gold = **15% / 7.5% / 5% of income** (Acts I / II / III). Before today's change (10/20/30) it was about 11 / 25 / 44 gold a fight, about 15% of every act.
5. **The Heart's +4 gold is not a gold engine:** it adds **2.6 / 5.1 / 9.2 gold a fight** (about 3% of income), because it only boosts gold faces on head, hands and feet.
6. **Gold does not buy power evenly.** Gold per point of average power (ranger, Act I): a talent symbol on face 4 = 10; hand die d4 to d6 = 26 to 31; a new talent die = 32; weapon training = 56; head die = 128; weapon second step = 129 and up; **growing a talent die or the feet die adds ~0 power on its own** (a bigger talent die only adds empty faces until you also pay 50 to 60 to fill each one).

## Levers tried (same heroes and seeds; noise is about one upgrade)

| Variant | Act I gold a fight | Upgrades bought, Act I / II / III | Unspent a camp, Act III | Reading |
|---|---|---|---|---|
| Baseline | 74 | 10.6 / 13.3 / 16.6 | 109 | |
| Monster gold +25% | 82 | 11.1 / 14.6 / 16.9 | 133 | More gold mostly piles up unspent in Act III: **not a fix** |
| Quick-win bonus (8 gold a round under par) | 79 (step 1: 26, was 12) | 11.4 / 13.1 / 19.1 | 94 | Helps the early, short fights most: **aimed at the actual pinch** |
| Buy Max health, Max magic, Starting magic first | 71 | 9.9 / 10.7 / 12.1 | 85 | +3 to 7 health and +1.7 capacity by Act I, but fewer dice and powers; **no clear win**, so the training prices look fair |

## Recommendations (for Dave to choose; nothing is shipped)

1. **Lift Act I steps 1 to 3** so the first camp pays about 30 and the next two about 50 and 65: a small gold floor on the first three fights, or a "first fight on the house". Cheapest way to make the first purchase fun.
2. **A Swift Victory bonus** (a few gold a round under the fight's par, shown on the victory screen). It does the same job as the floor, rewards the "beat it quickly" play Dave likes, and costs almost nothing in Acts II and III.
3. **Make Acts II and III spend more than Act I:** either scale upgrade prices by act (x1, x1.5, x2 to test) or add things to buy there (new weapon sizes, bigger potions and belt, new slots). Today the extra gold has nowhere to go, and the data says it is gold, not price, that is the surplus.
4. **Talent die growth** reads as 60 gold for nothing. Either let a bigger talent die come with its first face filled free, or lower its price; the card now says "GROW TO D6" so the player at least sees what they pay for.
5. **Keep potions at 10 gold.**

## The tables (baseline)

## What comes in, and what the potions take

| Act | Fights won | Rounds a fight | Gold a fight (median) | Gold a round | Potions drunk a fight | Potion gold a fight | Gold a fight from the Heart's +4 | Left after potions, per camp (median) | Camps with 40+ left | 60+ | 100+ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 145 | 4.3 | 74 (70) | 17.0 | 1.14 | 11.4 | 2.6 | 72 | 88% | 68% | 18% |
| 2 | 140 | 6.4 | 167 (142) | 26.0 | 1.26 | 12.6 | 5.1 | 165 | 100% | 100% | 91% |
| 3 | 129 | 8.5 | 287 (227) | 33.7 | 1.47 | 14.7 | 9.2 | 271 | 100% | 100% | 98% |

## What a campaign bought, per hero, by act

| Act | Gold earned | Gold on potions | Gold on upgrades | Unspent at the end | Die sizes | New dice | Talent symbols | Power ranks | Weapon sizes | Forges | Training ranks | Weapons bought | Retreats a hero |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 712 | 110 | 564 | 20 | 3.9 | 1.0 | 2.4 | 1.0 | 0.6 | 0.0 | 1.7 | 0.0 | 3.4 |
| 2 | 1670 | 126 | 1545 | 36 | 3.1 | 0.0 | 5.1 | 2.1 | 0.8 | 0.1 | 1.9 | 0.2 | 2.5 |
| 3 | 2645 | 136 | 2271 | 109 | 4.1 | 0.0 | 4.9 | 4.2 | 0.6 | 0.0 | 2.4 | 0.4 | 3.3 |

## Fight by fight: what each step pays, and what is left after potions (median; step 5 is the elite, step 10 the boss)

Act 1

| Step | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Gold paid | 12 | 40 | 61 | 67 | 85 | 82 | 71 | 85 | 78 | 153 |
| Left after potions | 12 | 49 | 66 | 70 | 90 | 80 | 67 | 88 | 86 | 179 |

Act 2

| Step | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Gold paid | 105 | 116 | 127 | 131 | 193 | 159 | 142 | 151 | 127 | 377 |
| Left after potions | 147 | 158 | 152 | 162 | 215 | 160 | 173 | 181 | 166 | 400 |

Act 3

| Step | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Gold paid | 150 | 190 | 169 | 257 | 298 | 170 | 497 | 163 | 264 | 557 |
| Left after potions | 180 | 214 | 193 | 300 | 356 | 206 | 528 | 227 | 359 | 618 |


## The whole shopping list against the gold a campaign earns

| What you can buy | Gold to buy all of it |
|---|---|
| Strength dice, both hands (d4 to d10) | 720 |
| Head die (d4 to d10) | 390 |
| Feet die (d4 to d10) | 440 |
| Talent dice: unlock and grow, both | 910 |
| Weapon sizes, two weapons | 700 |
| Three magic powers, all ranks | 840 |
| Max health, Max magic, Starting magic | 1065 |
| Reroll die, Pet, Potion belt | 380 |
| **Everything above** | **5445** (plus weapons from the store, potions every camp, and the Heart die) |

Gold earned by the end of Act I: 712 · Act II: 2382 · Act III: 5028 (all fights, before potions). The list is 108% of everything a whole campaign earns.

## How strong the hero is at the end of each act

| Act | Level | Max health | Magic capacity | Power ranks | Die sizes |
|---|---|---|---|---|---|
| 1 | 6.0 | 57.4 | 17.6 | 1.1 | 4.8 |
| 2 | 10.0 | 75.6 | 22.5 | 3.2 | 7.9 |
| 3 | 14.0 | 98.9 | 26.5 | 7.6 | 12.1 |

## Gold per point of power, ranger, first camps (tools/economy.mjs PRICES=1)

```
1.01 camp price list (ranger, 0 gold): cost · +attack · +block · +heal · +magic · gold per point of power
  Talent SW face 4: atk            10    1.0    0.0    0.0    0.0      10
  Left hand bigger                 40    1.6   -0.1    0.3   -0.2      26
  Right hand bigger                40    0.9    0.5    0.2   -0.2      31
  New die SE                       35    0.6    0.7    0.0    0.0      32
  Train quiver                     50    0.9   -0.1    0.0    0.0      56
  Head bigger                      50    0.5   -0.0    0.3   -0.2     128
  Train bow                        50    0.3    0.2    0.0    0.0     129
  Talent SW bigger                 60    0.0   -0.1    0.0    0.0    6000
  Feet bigger                     140   -0.2   -0.1   -0.3    0.3   140001.05 camp price list (ranger, 10 gold): cost · +attack · +block · +heal · +magic · gold per point of power
  Talent SW face 4: atk            10    1.0    0.0    0.0    0.0      10
  Talent SE face 4: atk            10    1.0    0.0    0.0    0.0      10
  Train quiver                     50    0.9   -0.1    0.0    0.0      57
  Train axe                        50    1.1   -0.6    0.0    0.0      81
  Right hand bigger               100    0.6    0.3   -0.3    0.3      98
  Left hand bigger                100    0.9   -0.0   -0.3    0.3     102
  Head bigger                      50    0.4   -0.0    0.3   -0.2     156
  Feet bigger                     140   -0.3   -0.1   -0.3    0.3   14000
  Talent SE bigger                 60   -0.1   -0.1    0.0    0.0    6000
  Talent SW bigger                 60   -0.2   -0.1    0.0    0.0    60001.09 camp price list (ranger, 45 gold): cost · +attack · +block · +heal · +magic · gold per point of power
  Talent SW face 6: atk            60    1.0    0.0    0.0    0.0      58
  Talent SE face 5: atk            50    0.8    0.0    0.0    0.0      59
  Talent SE face 6: atk            60    1.0    0.0    0.0    0.0      63
  Train quiver                    100    0.9   -0.1    0.0    0.0     130
  Left hand bigger                100    0.7   -0.1   -0.3    0.3     138
  Train sword                      50   -0.4    0.9    0.0   -0.1     142
  Right hand bigger               100    0.3    0.2   -0.3    0.3     150
  Head bigger                      50    0.4   -0.0    0.3   -0.2     179
  Feet bigger                     140   -0.4   -0.1   -0.3    0.3   14000
  Talent SE bigger                130   -0.3   -0.1    0.0    0.0   13000
  Talent SW bigger                130   -0.1   -0.5    0.0    0.0   13000
```

## Follow-up (3 November 2026, after Dave's reply)

**Shipped (build 20261103cp9): a welcome purse.** Act I's first two fights add 25 and 15 gold (`WELCOME_GOLD` in js/data.js, `welcomeGold` in js/engine.js; shown on the victory screen as "Gold · 25 welcome"). Not tied to rounds, as Dave asked. Heart 4 stays +4 gold.

**Why gold grows so much (measured, 2 campaigns x 5 classes, bot):**

| Act | Monsters a fight | Base gold each | Kill gold a fight | Dice gold a fight | Rounds a fight |
|---|---|---|---|---|---|
| 1 | 2.4 | 10.5 | 29 | 20 | 4.1 |
| 2 | 2.5 | 15.6 | 52 | 76 | 6.5 |
| 3 | 2.1 | 36.1 | 99 | 120 | 7.9 |

The act multiplier (x1.1, x1.2) is not the cause. Two things are: monsters' own gold climbs (10 to 36 each), and the hero's dice gold climbs even faster (20 to 120 a fight) because fights last twice as long and the hero owns bigger dice with more gold faces. Dice gold is more than half of Act II and III income.

**Open for Dave:** make late gold scarcer. Cleanest lever is upgrade prices that rise by act (the shopping list stays the same, each item costs more), not cutting the gold dice that make "going for gold" fun.
