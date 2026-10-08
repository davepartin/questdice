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

- `node tools/dicemath.mjs`: averages for every die, weapon and build.
- `sh tools/progress-all.sh [acts] [runs per class] [steady|smart|bold]`: the campaign report, step by step, both roads.
- `node tools/balance.mjs`: quick Act I clear rates by difficulty.
