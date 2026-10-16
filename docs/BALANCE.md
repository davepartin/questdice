# QuestDice balance — solo campaign, Acts I to III

This is the working balance plan for the solo campaign, with the numbers that back it up. Every number here can be
changed in `js/data.js`, and every claim can be re-checked with the tools listed at the end. Party play (2 to 6 heroes)
is planned in the last section but is not tuned yet.

## The shape of the journey

A hero should feel three kinds of growth, one after another, and each act leans on a different one.

**Act I, The Ashen Marches (levels 1 to about 5): more dice.** You start with seven dice. At camp you buy the rest
(the second weapon 30 gold, the first talent die 15, the second 35), and at level 3 your first d6 hand (40 gold). Fast
heroes (ranger, wizard, bard) start with d6 feet; slow ones (knight, dwarf) start with one d6 hand and can buy d6 feet at
level 2. Late in the act the first d6 weapons start to drop, and the boss always drops one.

**Act II, The Hollow Crypt (about 5 to 10): bigger dice and sharper weapons.** d8 hands open at level 7 (100 gold),
weapons can be trained to d6 and d8, forging adds bonus symbols, and powers get their first upgrades.

**Act III (about 10 to 15): mastery.** d10 hands at level 12 (220 gold), d8 and d10 weapons, Diamond forging, and the
level 5 supers become fight-winners. Act III does not have its own monsters yet: today it replays Act I's monsters with
the act-three growth. It needs its own bestiary and art (see "What is still open").

## The rule you asked for: Strength is the limit

A weapon die can never roll bigger than the hand that holds it. A d6 sword in a d4 hand rolls as a d4. Found weapons now
come in sizes (all d4 early in Act I, some d6 from step 4, d6 and d8 in Act II, d8 and d10 in Act III; the perilous road
leans one size bigger, and elites and bosses always drop one weapon a size up). Every weapon card says what it needs:
"Needs d6 Strength", with a green check when your hands are big enough, or an orange lock that says "Rolls as a d4
until you train it." Two-handed weapons need that Strength in both hands.

So the order of play is natural: you find a weapon you cannot fully use yet, which gives you a reason to train your hands.

Bigger weapon faces now lean to the weapon's own colour (two of its colour, then one of the other). Before this, every
size above 4 alternated red and blue, so a bigger sword mostly added block, and training Strength barely made you hit
harder. Now an attack weapon gets meaner as it grows, and a guard weapon gets sturdier.

## The pack, the peddler, and selling

You carry what you wield plus a pack of **4**. After a win you choose one spoil and either **take it** into your pack or
**sell it on the spot**. If your pack is full, the spoils screen lists your pack with a Sell button on each, so you can
make room or just sell the spoil. The peddler will not sell to a full pack.

A weapon's **worth** is its base price x its tier x its size (tier: Bronze 1, Silver 2, Gold 4, Diamond 8; size: d4 1,
d6 1.5, d8 2.2, d10 3). The peddler charges the full worth; selling pays **half**. Base prices were lowered so that a
typical spoil sells for about one fight's gold. That keeps selling worthwhile without flooding you with gold.

| Weapon (base) | Bronze d4 | Silver d6 | Gold d8 | Diamond d10 |
|---|---|---|---|---|
| Dagger / Bracer (18) | sells 9 | 27 | 79 | 216 |
| Sword / Shield (24) | 12 | 36 | 106 | 288 |
| Spear (27) | 14 | 41 | 119 | 324 |
| Bow (42) | 21 | 63 | 185 | 504 |
| Long Sword / Staff (45) | 23 | 68 | 198 | 540 |

## The two roads

Every regular step offers two fights. The **steady road** is the lighter group of monsters. The **perilous road** is a
heavier group, with 1.3x health and +3 on every hit, and it pays 1.75x the gold and experience and leans to bigger loot.
Step 5 offers the elite or a perilous fight; step 10 is the boss.

Each road card now shows a **danger read made from your own dice**: the game rolls your board a few hundred times to
learn what you deal, block and mend on an average throw, compares that with the monsters' health and hits, and says
Easy, Fair, Hard or Deadly, plus about how many rounds it should take. The labels were calibrated against the computer
player's real results (see the table below), so they mean something: roughly 97%, 93%, 75% and 50% wins.

That gives the choice you described. A hero who has fallen behind takes the steady road and catches up. A hero who is
ahead takes the perilous road, levels faster and finds better weapons, and can lose. Losing is not the end: you retreat,
keep your level and gear, and try again.

## Healing potions

Every hero carries **2 healing potions** each battle (this replaced the once-a-battle Big Heal). A potion heals 10, costs
no magic, and can be drunk any time before you lock in, even before you roll. In party play a potion can be thrown to a
friend (see docs/TEAMPLAY.md). To keep the challenge where it was, every monster hit got +1 (and Hard +1 more). With
potions, the sensible player clears all three acts 9 times in 10; the Act I boss is won about 92% of the time on the
first try, Act II's about 78%, Act III's about 83%; Hard difficulty clears Act I about 90%.

## Dice math

A hand (Strength) die averages 2.5 on a d4, 3.5 on a d6, 4.5 on a d8 and 5.5 on a d10. Head, hands and feet pay the
same symbols on every die: 1 heals 2, 2 pierces 2, 3 gives 2 magic, 4 gives 2 gold; 5 to 8 repeat that pattern at 3;
9 is 2 heal + 2 pierce; 10 is 2 magic + 2 gold. A lane is a weapon face plus the hand under it, and the weapon's colour
decides whether the whole lane is attack (red) or block (blue).

What a weapon adds to its lane on an average roll (red = attack, blue = block):

| Weapon | d4 | d6 | d8 | d10 |
|---|---|---|---|---|
| Sword | 1.8 red / 0.3 blue | 3.0 / 0.2 | 3.3 / 1.0 | 3.5 / 1.8 |
| Shield | 0.3 / 1.8 | 0.2 / 3.0 | 1.0 / 3.3 | 1.8 / 3.5 |
| Bow | 1.5 / 0.0 | 2.8 / 0.0 | 3.1 / 0.9 | 3.4 / 1.7 |
| Staff | 1.5 / 0.3 | 2.8 / 0.2 | 3.1 / 1.0 | 3.4 / 1.8 |

A whole board on an average throw, before rerolls and powers (a played round with rerolls and powers deals about
1.7 times the attack shown):

| Hero | Level 1 | End of Act I (all dice, d6) | End of Act II (d8, Gold tier) | End of Act III (d10, Diamond) |
|---|---|---|---|---|
| Knight | 6 atk, 2 block, 34 hp | 12 atk, 9 block, 50 hp | 13 atk, 11 block, 70 hp | 14 atk, 13 block, 90 hp |
| Ranger | 10 atk, 3 block, 28 hp | 17 atk, 3 block, 44 hp | 17 atk, 6 block, 64 hp | 18 atk, 10 block, 84 hp |
| Wizard | 8 atk, 4 block, 26 hp | 14 atk, 4 block, 42 hp | 16 atk, 7 block, 62 hp | 16 atk, 10 block, 82 hp |
| Dwarf | 6 atk, 3 block, 38 hp | 10 atk, 9 block, 54 hp | 11 atk, 11 block, 74 hp | 13 atk, 14 block, 94 hp |
| Bard | 5 atk, 2 block, 28 hp | 10 atk, 8 block, 44 hp | 12 atk, 11 block, 64 hp | 14 atk, 12 block, 84 hp |

(Every hero also rolls about 3 pierce, 3 to 5 heal, 2 to 4 magic and 2 to 3 gold a round from head, hands and feet.)
The classes differ the way they should: the ranger hits hardest and blocks least, the dwarf and knight are walls, the
wizard leans on magic and powers, the bard on gold and healing.

## What the computer player saw

A computer player (it rerolls sensibly, uses powers, heals when hurt, keeps better weapons, sells the rest, and spends
its gold at camp) played all three acts with every class. At each step we also tested both roads from where it stood.
Three styles of play:

| Style | Clears all 3 acts | Level at end of Act I / II / III | Notes |
|---|---|---|---|
| Cautious: always the steady road | 8 of 10 | 4 / 7.5 / 10 | safe, slow, falls behind for the bosses |
| Sensible: perilous when it is likely to win (about 4 in 5) | 10 of 10 | 5.4 / 10 / 12.5 | the intended way to play |
| Reckless: always the perilous road | 7 of 10 | 6 / 11 / 14 | levels fastest, sometimes washes out |

For the sensible player, at the moment of choosing:

| | Steady road | Perilous road | Boss (first try) |
|---|---|---|---|
| Act I | 97 to 100% wins, 2 to 4.5 rounds | 60 to 88%, about 4 to 5 rounds | 93% (about 5.5 rounds) |
| Act II | 97 to 100%, 2 to 3.5 rounds | 80 to 92%, about 5 rounds | 72% (about 9.5 rounds) |
| Act III* | 98 to 100%, 2.5 to 4.5 rounds | 62 to 98%, 4 to 7.5 rounds | 80% (about 9.5 rounds) |

The step 5 elite on the steady side wins 88% in Act I. Hard difficulty clears Act I 87% of the time on the steady
road (Normal 100%, Easy 100%), so Hard keeps its bite. *Act III is a stand-in until it has its own monsters.

How well the danger read predicts a real fight (all runs together):

| Read | Danger score | Real wins |
|---|---|---|
| Easy | under 0.35 | about 96% |
| Fair | 0.35 to 0.5 | about 85% |
| Hard | 0.5 to 0.7 | about 73% |
| Deadly | 0.7 and up | about 45% or less |

Full step-by-step tables are in `docs/balance/run_*.txt`.

## Strategy: what to grow, and when

The game should reward thinking, not just grinding, so each act gives a different best buy.

**Act I.** Buy dice first: the talent die (15) at your first camp, then your second weapon (30) and your third talent die
(35). Then your first d6 hand at level 3 (40); slow heroes should also buy d6 Feet (60) so they strike first more often.
Keep one spare weapon in your pack for the fight you see coming (a shield for a heavy hitter, a bow for triples) and
sell the rest. Take the perilous road when it reads Fair or Hard; take the steady road when it reads Deadly.

**Act II.** Train your weapon hand to d8 at level 7 (100) and train the weapon after it (30 to d6, 80 to d8). Forge the
weapon you will keep to Silver (40) so its faces carry bonus symbols. Upgrade the one power you use every fight
(60, then 140). Fill your talent dice with symbols (25 a slot): a talent symbol is worth the strength rolled on the hand
above it, so talents grow with your Strength.

**Act III.** d10 hands at level 12 (220). Forge to Gold (120) and Diamond (300). The level 5 super (Judgment, Rain of
Arrows, Meteor, Avalanche, Finale) wins long fights; save magic for it from round 3.

Real choices along the way: two weapons or one two-hander (two lanes and two colours versus better triple odds); a big
hand now or a talent die now; spend magic on rerolls, on healing, or save it for a power; carry a spare weapon or sell it
for gold today.

## Party play, 2 to 6 heroes (plan, not built)

Today's party rules already do two good things: monsters roll once and every hero's attack goes into the same fight, and
each round the hero with the lowest Feet (the slowest; a tie goes to whoever has more health) is the one the monsters go after
(the "leader" in the code) and takes a double share of the monsters' hits, while
everyone else takes a single share. Each hero's block soaks only their own share. Monster health is multiplied by party
size (1, 1.8, 2.5, 3.1, 3.6, 4.0) and extra goblins join at 4+ players.

What is missing is that the **size of each hit does not grow with the party**. With six heroes the hits are split seven
ways, so everyone is far safer than solo, and with only 4x health against six heroes' damage, fights end in about two
thirds of the solo time. It would feel easy.

Your worry about the leader is fair, but the numbers are kinder than "half": with n heroes the leader takes 2 of n+1
shares (two heroes: 2/3; three: 1/2; six: 2/7). The fix is to scale hits so the leader's share stays about a solo hit:

| Heroes | Leader's share | Others' share | Hit size x | Leader takes (vs solo) | Others take | Monster health x |
|---|---|---|---|---|---|---|
| 1 | all | - | 1.0 | 1.0 | - | 1.0 |
| 2 | 2/3 | 1/3 | 1.6 | 1.07 | 0.53 | 1.9 |
| 3 | 1/2 | 1/4 | 2.1 | 1.05 | 0.53 | 2.8 |
| 4 | 2/5 | 1/5 | 2.6 | 1.04 | 0.52 | 3.6 |
| 5 | 1/3 | 1/6 | 3.0 | 1.00 | 0.50 | 4.4 |
| 6 | 2/7 | 1/7 | 3.4 | 0.97 | 0.49 | 5.2 |

In words: **hits grow by about (heroes + 1) / 2**, so the round's leader carries a normal solo load and everyone else
half of one, and **monster health grows a little under one solo fight per hero** (parties waste some damage on overkill
and enjoy shared triples and powers). Because Feet are re-rolled every round, the dangerous leader seat moves around
the table, which is fair and dramatic. A healer or a big-block hero who wants to protect a friend could later get a
"Guard" power that takes the leader's double share for one round.

Two more party rules worth keeping: a monster killed before its initiative deals nothing (this rewards fast, coordinated
bursts), and every hero gets full experience while gold from kills is shared.

Before building it, the party simulator (`tools/sim2.mjs`) should be brought up to date with these rules and run for
2, 4 and 6 heroes, aiming at the same targets as solo: about 4 to 6 rounds a fight and the same steady/perilous win rates.

## What is still open

- **Act III needs its own monsters and art** (today it replays Act I's monsters with stronger numbers). A plan: "The
  Ember Peaks" with fire-touched trolls, harpies and stone guardians, an elite troll chieftain, and a dragon-like boss,
  with health around Act II's elites and harder hits. Nothing occult.
- **Act II's monsters** still use the undead set (skeletons, wraiths, a lich) from the first draft. If you would rather
  avoid the "raise the dead" theme, Act II can be re-skinned (crypt beasts, stone sentinels, a shadow serpent) without
  changing the numbers.
- **Offense grows modestly after Act I.** Damage per round goes from about 10 (level 1) to about 17 to 18 (end of Act I)
  and only a little higher after that, while block and health keep growing. That keeps fights about 4 to 6 rounds, but
  if Acts II and III should feel more explosive, the next lever is weapon tiers adding +1 to every red face, or perks
  that grow with level.
- **Party play** as planned above.

## Tools

- `tools/tension.mjs [fights] [classes]`: how dangerous ordinary fights feel (damage taken, potions, close calls). TUNE_FLAT=3,4,1 TUNE_LONE=2 try other standard-road settings.

- `node tools/dicemath.mjs`: averages for every die, weapon and build.
- `sh tools/progress-all.sh [acts] [runs per class] [steady|smart|bold]`: the campaign report, step by step, both roads.
- `node tools/balance.mjs`: quick Act I clear rates by difficulty.

## Strategy: block with one hand, attack with the other? (Oct 2026, `tools/strategy.mjs`)

Same hero, same quest, 200 fights per cell, at four checkpoints (Act I quest 5 and boss, Act II quest 5 and boss), Knight
and Ranger. Two loadouts (sword + spear, sword + shield) and three play styles for rerolling:
**All attack** (block is nearly worthless), **Steady mix** (block worth 0.8 of attack, the old bot), and
**Read the box** (block is worth a lot up to the size of the coming hit and almost nothing beyond it).

| Knight | sword + spear, all attack | sword + shield, read the box |
|---|---|---|
| Act I quest 5 (ogre + goblin) | 90% wins, 15 health lost | 99% wins, 6 lost |
| Act I boss | 87%, 26 lost | 88%, 20 lost |
| Act II quest 5 | 98%, 21 lost | 100%, 10 lost |
| Act II boss (lich) | 81%, 37 lost | 87%, 28 lost |

The Ranger shows the same thing more strongly (Act II quest 5: 87% and 25 lost, against 99% and 11 lost).

What it means:
- **How you reroll matters more than what you carry.** Reading the monster's box (go for blue faces when a big hit is
  coming, red when it is small or the monster is bracing) was the best style in every single cell, for both loadouts.
- **A shield in one hand roughly halves the health you lose in ordinary fights**, at the price of 1 to 2 more rounds.
  Less health lost means less magic spent on healing and fewer potions bought.
- **Bosses even it out.** Their big health rewards damage, so sword + shield and two attack weapons win about equally
  often against a boss when played well; the shield still loses a little less health.
- All attack never came out ahead; at best it tied, and it always cost the most health.

## Tension: ordinary fights with real danger (Oct 2026, `tools/tension.mjs`)

Dave: "what is missing to make it fun?" The first answer was danger. The tension study (a bot of each class played to eight
checkpoints, 30 fights per class per cell) measured what a player feels: damage taken as a share of max health (before
potions and heals), potions drunk, and close calls (won after dropping to 30% health or less).

| Standard road | win | damage taken | potions a fight | close calls |
|---|---|---|---|---|
| Before | 100% | 41% (Acts I–II: 23–46%) | 0.29 | 5% (Acts I–II: 0–8%) |
| After (+3 / +4 / +1 a hit by act, +2 more for a lone monster) | 99% | 53% (Acts I–II: 36–64%) | 0.39 | 11% (Acts I–II: 8–17%) |

The perilous road was already dangerous (114% damage taken, 1.4 potions, 47% close calls) and is unchanged (84% wins); a flat bump
there dropped it to 64–71% wins. Act III's standard road was already tense, so it gets only +1.

Three monster moves change the right answer for a round, so "read the box" is no longer the whole game:
- **Fire Ward** (Ember Mage): guards, and burns whoever hits it for 4 (+ half the act's flat). Hit another monster, or accept the burn.
- **Stalk** (Dire Wolf): no attack now; if it is not hurt this round it Pounces next round (1 + 2 x d8 + flat). Hit the wolf.
- **Phase** (Wraith): normal attack passes through it this round; only pierce hurts.

Campaign check (progress-all, 3 acts, 4 campaigns a class): 20/20 cleared; Act I standard fights end with 63–77% health
(was 72–87%), bosses 88–90% / 81% / 85%.

## 13 Oct 2026 — random encounters by difficulty (then called Noob / Mid / Expert; now Easy / Normal / Hard: a setting for the computer, not a player skill)
One fight per step, picked by the game from a trouble budget (`ENCOUNTER`, `encounterFor` in engine.js). Bot (`SKILL=easy|normal|hard sh tools/progress-all.sh 3 3 smart`, 3 acts, 15 campaigns, 5 trials a fight):
- **Noob** (hp x0.8, -1 a hit, budget x0.7): cleared 15/15; almost every fight 99-100%, bosses ~90%.
- **Mid** (the intended game): cleared 14/15; ordinary fights 90-100%, dips to ~80-90% late in an act; bosses 60-85%.
- **Expert** (hp x1.2, +2 a hit, budget x1.15): cleared 3/15; ordinary fights 40-100% (the late steps of each act are the wall), bosses 35-70%. A smart bot is a weak player, so a person should do better.
First pass (Expert hp x1.3, +3 a hit, budget x1.3, elite always with company) cleared 1/15 and 0/15 with a milder setting; the crowds in Act III were the problem (Act I's monsters carry Act III's +5 a hit), so Act III's budget starts lower (1.5, +0.22 a step) and the draw jitter is 0.75-1.25. Knobs: `ENCOUNTER` (budget and jitter) and `DIFFICULTY` in data.js, monster `threat` in `MONSTERS`.

## 13 Oct 2026 — talent dice v3 (numbered faces)
Faces 1-2 blank, face 3 = 2x, face k (4..size) shows the number k and pays k of the symbol you buy for it (no pierce, at most two of a symbol on a die).
Price per face = `TALENT_FACE_COST` (10) x the number: 4 costs 40, 5 costs 50 ... 10 costs 100; a full d10 is 490 gold for seven faces (plus the growth steps 60 / 130 / 240). The class's free starting symbol sits on face 4.
Why 10 gold a point: a number face on a die of n sides shows up 1 time in n and pays k, so face k on a d(n) is worth k/n a roll (a 6 on a d6 or a 10 on a d10 = 1.0; a 4 on a d10 = 0.4). That is roughly 40-100 gold for each point of average roll, in line with a hand upgrade (d4 to d6 costs 100 for about +2 across two lanes).
Bot (`botTalent` in tools/sim.mjs buys the biggest empty face once it has the price plus 60 spare; `SKILL=... sh tools/progress-all.sh 3 3 smart`): Mid cleared 15/15 (was 14/15 without talent buying), Expert 8/15 (was 3/15), damage a round up from about 26 to about 30 in Acts II-III, and the bot still ends Act III with 140-200 gold, so the prices do not choke it. The lever for later tuning is `TALENT_FACE_COST`.

## 15 Oct 2026 — Normal made tense, and the curve turned the right way round
Dave: the game was too easy. Bot (`SKILL=<d> sh tools/progress-all.sh 3 3 smart`, 15 campaigns, the real story fights) before and after. Before, the curve ran backwards: Act I was the hard part and Act III a walkover on every setting (Act III 100% even on Hard).

| Normal | Act I fights | Act I elite / boss | Act II fights | Act II elite / boss | Act III fights | Act III elite / mid-boss / boss | Campaigns cleared |
|---|---|---|---|---|---|---|---|
| Before | 80–100% | 100% / 97% | 87–100% | 99% / 87% | 99–100% | 100% / 100% / 100% | 15/15 |
| After | 79–100% | 99% / 76% | 78–98% | 89% / 78% | 83–100% | 99% / 83% / 82% | 15/15 |

Hard after: fights 52–100%, bosses 52% / 50% / 70% / 65%, 9/15 cleared (was 7/15, all of it lost in Acts I–II). Easy after: fights 84–100%, bosses 94–97%, 15/15. Remember the bot is a weak player: a person should beat these numbers.
What changed (all in js/data.js): `ORDINARY.flat` [3, 4, 1] -> [3, 5, 6] (the standard road's extra on every hit: Act II +1, Act III +5); `ACT_HP` [1, 1.15, 1.35] -> [1, 1.2, 1.5]; new `SET_PIECE` (elites hp x1.3 / 1.2 / 1.2 and +3 / +2 / +5 a hit; bosses hp x1.2 / 1 / 1.3 and +1 / +2 / +5); Act II `fightHp` adds 1.2 / 1.15 / 1.2 / 1.15 at steps 6–9 (the back half of the crypt); Act III `fightHp` 1.2 at steps 2, 3, 6, 8 and 1.25 at Oathbreak Keep (step 7; `fightHp` now also lifts elites and bosses). Act III gets more bite rather than more health, because its boss already runs 12–14 rounds.
Tuning without editing data.js: `TUNE='{"ORDINARY":{"flat":[3,5,6]},"SET_PIECE":{"boss":{"hp":[1.2,1,1.3]}}}' sh tools/progress-all.sh 3 3 smart` (tools/progress.mjs). One full run takes about 8 minutes; win rates move about ±5–10 points between runs at this sample size.
Still soft: the elites of Acts I and III (the ogre and Vharaxis, 99%, even at x1.5 health and +7 a hit: a lone big monster is burst down) and a few quiet early Act III steps (~100%). A lone elite may need a new move rather than bigger numbers.

## 15 Oct 2026 — good play matters, and Legendary is beatable with it
Dave: "you can't just use the first roll and beat the enemy every time. There's some strategy, but as you get more into Legendary you need to use your magic just right and pay attention to what the enemy is going to do. Make sure that with wise decisions it's actually beatable."

**Three computer players** (`PLAY=first|smart|wise` in tools/sim.mjs):
- **First roll**: keeps its first roll, never rerolls, never casts a power, hits the first monster, drinks a potion when low.
- **Sensible** (`smart`, the bot every table above used): rerolls for the best average throw, powers by simple rules.
- **Wise**: rerolls by reading the monsters (block is worth a lot up to the hit that is coming and little past it; only half of a breath can be blocked), then thinks before it locks in: it plays out its choices (target, each power, store or release charges, heal, potion) a few times each and keeps the ones that leave it best off: alive, monsters hurt, focus fire on the one nearly down, magic and potions kept for later. The simple plan is one of its candidates, so thinking never does worse.

**The tool**: `SKILL=<difficulty> sh tools/skill-all.sh 3 2` (tools/skill.mjs). A hero plays the campaign (driven by the wise player; DRIVER= to change), and at every step the SAME hero fights that battle with each player, so the difference is play, not build.

**Legendary changed**: from "monsters have 1.5x health and +3 a hit" (which punishes everyone alike) to health x1.35 and +2 a hit, plus an **edge**: the moves a monster announces hit harder, a Slam or Pounce +6, Fire Ward's burn +4. Reading the plaque (block the Slam, hit the stalker, leave the ward alone) avoids most of it. **Hard** gets half of that (health x1.15, +2, Slam +3, burn +2). Normal and Easy are unchanged. Knob: `edge` on `DIFFICULTY` in data.js.

Win rate on the first try, Acts I / II / III (10 campaigns, 10 fights per player per step):

| | First roll: fights · bosses | Sensible: fights · bosses | Wise: fights · bosses | Wise player clears the campaign |
|---|---|---|---|---|
| Normal | 52–68% · 16–29% | 92–93% · 79–82% | 96–98% · 85–97% | 10/10, 11 retreats |
| Hard | 41–46% · 6–22% | 78–88% · 54–67% | 89–96% · 71–88% | 10/10, 24 retreats |
| Legendary | 31–38% · 2–10% | 74–84% · 48–60% | 87–96% · 56–83% | 10/10, 31 retreats (about 3 a campaign) |

Legendary bosses for the wise player: Goblin King 56%, Lich 60%, Oathbreak Keep 80%, the Ember Queen 83%. So: on Normal the first roll already loses most boss fights; on Legendary careless play is hopeless, sensible play loses about half the big fights, and wise play wins every campaign with a few retreats.
Whole Legendary campaigns, each player on its own (6 tries a fight before it gives up): **wise 10/10** (31 retreats), **sensible 4/10** (107 retreats, stopped at bosses in all three acts and at the Ashwyrm), **first roll 0/10** (all stopped at the second fight).
Bot fixes found on the way (tools only): the wise player first spread its damage and never finished the Shieldbearer that guards the Ashwyrm (it won 32% of that fight, the sensible player 60%); valuing damage on a nearly beaten monster more fixed it (wise 83–97%).

## 16 Oct 2026 — heroes that grow: new weapon dice, stronger powers, act gold, bigger monsters
Dave: growing only +6 of power in Act II and +4 in Act III "seems boring"; he wants about +10 an act, so you feel stronger and face bigger monsters. The economy study (`tools/economy.mjs`) found why: a weapon die barely grew (a sword averaged 2.8 attack a roll at d6 and only 3.4 at Diamond d10), forging raised one face, power levels added a quarter, and even a fully maxed hero gained only about +2.5 attack an act from its dice. Act III fights also paid too little gold for its upgrades, after potions.
- **Weapon dice: size is the range, metal is the quality** (engine `weaponFaces`, Dave's design). Every weapon always has one 0 face, even Diamond. The rest of the die is a run of consecutive numbers whose top climbs with the size (steady d4 tops at 4, d10 at 13; balanced and risky +1). Bronze is a cheap weapon: some low faces of the run are blank; each metal fills blanks (the highest first) and adds icons from the top face down; Diamond has every face numbered, an icon on every number and a double icon on the top face. Steady weapons have few blanks, balanced a few more, risky (all one colour) the most. Every third face of a steady or balanced run is the other colour, never the top. A weapon in a smaller hand rolls, and is built, as the hand's size. Legendaries keep their own faces.
  Examples: Bronze d4 sword 0, 3, (blue) 4, 5; Diamond d10 sword 0, 6 ... 14, an icon on every number. Average of its own colour a roll, Bronze → Diamond: steady d4 1.5, d6 3.5, d8 4.0–4.5, d10 4.2–5.4; balanced d4 2.0, d10 3.4–6.0; risky (all attack) d10 5.9–9.9.
- **Power levels** add half the base number each (was a quarter): 4 → 6, 8, 10.
- **Monster gold by act** (`ACT_GOLD`): x1, x1.3, x1.8.
- **Replays** (Dave): the second win at a step pays half its gold, the third a quarter, and so on; still no XP or spoils (`repeatShare` in save.js; solo and tables).
- **Bigger monsters to match**: `ACT_HP` [1, 1.2, 1.5] → [1.1, 1.45, 2.1]; `SET_PIECE` elite hp [1.5, 1.45, 1.6], boss hp [1.4, 1.25, 1.75]; Legendary health x1.25 (was 1.35).

Damage really dealt per round, averaged over each act (greedy-spending bot, Normal): knight 19 → 28 → 31 before, 27 → 34 → 53 now; ranger 27 → 39 → 46; wizard 27 → 39 → 57. Average throw at each act's end: knight 21 → 26 → 38 (was 23 → 29 → 33).
Win rate on the first try (Normal): first roll fights 38–60%, bosses 6–29%; sensible fights 89–92%, bosses 70–80%; wise fights 95–97%, bosses 84–91%; 10/10 campaigns. Hard: first roll bosses 4–10%; sensible fights 76–84%, bosses 54–60%; wise fights 86–93%, bosses 63–71%; 10/10 campaigns (48 retreats). Legendary: first roll bosses 0–22%; sensible bosses 33–73%; wise bosses 55–88%, campaigns cleared by the wise bot alone 7/10 (53 retreats; the bots never go back to earn replay gold, which a stuck player can).

## 16 Oct 2026 — talent dice count in straights
Dave: big weapon numbers left gaps that made straights rare late (a knight's straight chance fell from 17% at the start to 3% by Act III). Talent dice now have blanks on faces 1 and 3, the 2x on face 2 (it counts as a 2), and every number from 4 up shows on the die and counts toward straights, symbol bought or not (`talentNumber` in engine.js). Straight chance per roll, knight: 25% / 24% / 18% / 11% at the start / end of Acts I, II, III (was 17 / 12 / 7 / 3); ranger 13 / 28 / 21 / 13 (was 9 / 15 / 9 / 4). Triples are unchanged.
To keep Normal tense with more straights: `ACT_HP` [1.1, 1.55, 2.25] (Act II and III up), boss hp [1.4, 1.35, 1.9]; Legendary health x1.15 (from 1.25) so it does not get harder. Normal after: sensible fights 91–94%, bosses 80–85%; wise bosses 83–99%; first roll bosses 15–40%; 10/10 campaigns.
Legendary after: first roll bosses 1–22%; sensible fights 76–89%, bosses 59–80%; wise fights 89–94%, bosses 66–95%; the wise bot cleared 10/10 campaigns (35 retreats).

## 16 Oct 2026 — honest dice, and three metals (branch `honest-dice`, monsters not yet re-tuned)
Dave: keep dice honest (a d8 never shows more than 8) and let the crit carry icons instead ("a 10 with three arrows is basically a 13"); give weapons a spectrum, steady to big-swing, for attack and for defence; then only three metals, Bronze, Silver, Gold.
- **Custom faces per temperament** (`WEAPON_DICE` in data.js; `o` = the other colour). Own-colour average a roll at Silver, d4 / d6 / d8 / d10:
  - steady (dagger, bow, bracer): 1 2 2 3 · 2 2 3 3 4 5 · 2 3 3 4 4 5 5 6 · 2 3 3 4 4 5 5 6 7 8 — 1.5 / 2.8 / 3.6 / 4.4, almost never blank
  - balanced (sword, staff, shield): one blank, two faces the other colour — 1.75 / 2.8 / 3.25 / 4.4
  - risky (spear, longsword, tower shield): two or three blanks, all one colour, top number twice — 2.0 / 3.5 / 4.25 / 5.9
  - brutal (mace, warhammer): half blanks, the top number three or four times — 2.0 / 3.0 / 3.9 / 5.7
- **Metal adds icons from the top face down**: Bronze one icon on the top face (and from a d6 up its lowest number is chipped blank, except brutal, which is already mostly blank); Silver about half its numbers, 2 on the top face, and the chip mended; Gold every number (both colours), 3 on the top face. Brutal weapons put an icon on every top face from Silver. Old Diamond weapons load as Gold (same full die). Drops, the traveller, the gamble (50 / 32 / 18%) and the forge stop at Gold; forge costs 40 and 120.
- **Combos, per roll** (main → honest, d6 Silver / d8 Gold): knight straights 11 → 13% / 7 → 8%; ranger 21 → 27% / 12 → 23%; wizard 17 → 21% / 10 → 14%. Triples the same or a little more (ranger d8 5 → 8%). A fresh d4 hero's straights are rarer (knight 10 → 5%) because its d4 now has a blank.
- **Growth** (damage dealt per round across each act, greedy bot, Normal, main → honest): knight 20/41/58 → 26/43/50; ranger 29/38/61 → 29/40/53; wizard 28/38/58 → 32/39/50; dwarf 25/41/51 → 24/34/48; bard 26/42/61 → 27/42/57. About +10 an act; Act III is 5–8 lower than before, as the big printed numbers are gone. Monsters are re-tuned next.
