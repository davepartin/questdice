# Weapons, rethought (22 Oct 2026)

A proposal for Dave to react to. Nothing in the game has changed yet. The numbers come from `tools/weaponlab.mjs`, which rolls whole boards for each act and compares weapon patterns. It counts no rerolls, so every straight and triple rate is a floor.

## What Dave asked for

- Weapons, and especially their dice, should feel special without loading the faces with odd numbers.
- Blanks are what make a weapon different. A d8 can be 1 2 3 · · 6 7 8 (big, with a gap), 1 3 5 7, or 2 4 6 8. Not every d8 needs an 8.
- Simpler: one-handed weapons only. Two-handers are like finding two dice at once.
- The **bow and arrows** are the exception and make sense to anyone: the bow in one hand is a plain hit or block, and the arrows in the other carry the special effect.
- Arrows come in kinds: **fire** (splash), **frost** (freeze or slow), **piercing**, maybe **poison** later. The arrow's symbol pays your hand's strength number.
- Splash comes only from arrows and magic, never from a big two-handed swing.
- Every one-handed weapon has some blue (block) on it. There are a few defensive weapons and more offensive ones.
- Bronze, Silver and Gold keep the **same numbers**. A better metal adds abilities under the numbers and lasts more battles.

## What the dice math says

1. **The weapon's number is a small part of a hit.** In Act II a side's attack (weapon plus hand) averages about 5.5 to 7, and the hand alone gives 4.5 of that. The gap between the best and worst number pattern is only about 1.5 a roll. Dave's feeling is right: a 7 instead of a 6 doesn't change much once a round throws 40.
2. **Number patterns barely move triples and straights.** With no rerolls, every pattern makes a 6+ straight about 5 to 9 times in 100 boards, and puts its weapon in a triple 1 to 3 times in 100. Dice with no blanks (the staff) are best for straights, but only a little.
3. **So patterns are the weapon's personality, not its power.** They decide whether it's a sure hit or a big swing, and how much of it is blue.
4. **The power has to come from symbols.** Today's metals barely matter: in the worth tool, a Gold weapon over Bronze added about half an attack a round. A symbol that pays **your hand's number** (the way talent dice already work, and the way Dave described arrows) grows with your strength on its own as the acts go on. It would finally make Silver and Gold feel worth chasing.
5. **A blank isn't a miss today.** The engine still adds your hand's number to a blank weapon side, so a blank means "only your strength". If blanks should sting more, a blank could cancel the hand's number too. That's Dave's call (see the questions at the end).

| Act II, the same pattern in both hands | Number a roll | Blank | Attack a side | Block a side |
| --- | --- | --- | --- | --- |
| Staff · every face (odd red, even blue) | 4.5 | 0% | 4.2 | 4.8 |
| Dagger · low run | 1.9 | 37% | 5.5 | 0.8 |
| Sword · evens | 2.9 | 37% | 6.4 | 0.9 |
| Axe · odds | 2.2 | 38% | 5.8 | 0.8 |
| Mace · Dave's 1 2 3 · · 6 7 8 | 3.0 | 37% | 6.7 | 0.7 |
| Spear · top half | 3.3 | 38% | 7.1 | 0.7 |
| Shield · evens, blue | 2.9 | 37% | 2.6 | 4.8 |
| Tower · high and low, blue | 3.0 | 37% | 2.4 | 5.1 |

## The rules, kept simple

- **Honest dice.** Face 6 shows a 6 or is blank. A weapon is a list of which numbers are live and which of those are blue. You can read it at a glance: "Sword: 2 4 6 8".
- **One hand, one weapon.** No two-handers. The War Hammer folds into the Mace, and the Long Sword into the Sword. The Staff becomes one-handed.
- **A hit is the weapon's number plus your hand's number**, as now. Blue blocks and red attacks.
- **A symbol under a number pays your hand's number** in that symbol: pierce, heal, magic or gold, and on arrows fire or frost. It's one rule, and it already works this way for talent dice.
- **Metal adds symbols and battles, never numbers.** Bronze has no symbols and lasts 4 battles. Silver has symbols on 2 faces and lasts 6. Gold has symbols on 4 faces, the top face carries 2, and it lasts 8.

## Bronze, the full set (live numbers; **b** = blue, · = blank)

| Weapon | Its feel | Symbol (Silver/Gold) | d4 | d6 | d8 | d10 |
| --- | --- | --- | --- | --- | --- | --- |
| **Dagger** | sure, small | gold | 1 2b 3 4 | 1 2b 3 4 5 · | 1 2b 3 4 5 6 · · | 1 2b 3 4 5 6 7 · · · |
| **Sword** | the evens, a parry | pierce | · 2 3b 4 | · 2 3b 4 · 6 | · 2 3b 4 · 6 · 8 | · 2 3b 4 · 6 · 8 · 10 |
| **Axe** | the odds, a parry | heal | 1 2b 3 · | 1 2b 3 · 5 · | 1 2b 3 · 5 · 7 · | 1 2b 3 · 5 · 7 · 9 · |
| **Spear** | reach: high or nothing | pierce | 1b · 3 4 | 1b · · 4 5 6 | 1b · · · 5 6 7 8 | 1b · · · · 6 7 8 9 10 |
| **Mace** | Dave's gap | magic | 1b · · 4 | 1b 2 · · 5 6 | 1b 2 3 · · 6 7 8 | 1b 2 3 · · · 7 8 9 10 |
| **Staff** | every face, half blue | magic | 1 2b 3 4b | 1 2b 3 4b 5 6b | 1 2b 3 4b 5 6b 7 8b | 1 2b … 9 10b |
| **Bracer** | sure guard | magic | 1b 2 3b 4b | 1b 2 3b 4b 5b · | 1b 2 3b 4b 5b 6b · · | 1b 2 3b 4b 5b 6b 7b · · · |
| **Shield** | the evens, a bash | heal | · 2b 3 4b | · 2b 3 4b · 6b | · 2b 3 4b · 6b · 8b | · 2b 3 4b · 6b · 8b · 10b |
| **Tower Shield** | a wall with a gap | heal | 1 · · 4b | 1 2b · · 5b 6b | 1 2b 3b · · 6b 7b 8b | 1 2b 3b · · · 7b 8b 9b 10b |

Five to attack, three to defend, and one even staff. Every attack weapon has a blue face and every defense weapon a red one, as Dave asked. The red/blue swap on the shields is how a shield "bashes".

## Bow and arrows

- **The Bow** goes in one hand. It's plain and modest: 1 2b 3 4b on a d4, up to 1 2b 3 4b 5 · · · on a d8. It hits a little and blocks a little.
- **Arrows** go in the other hand and only shoot with a bow beside them. A quiver of arrows is its own find, so you choose your arrow kind. An arrow die has a few low numbers, blanks, and arrowhead symbols. **Each metal turns a blank into another arrowhead, so the numbers stay the same.**
  - Fire arrows, d8: Bronze 1 2 3 4 · · 🔥 🔥 · Silver 1 2 3 4 · 🔥 🔥 🔥 · Gold 1 2 3 4 🔥 🔥 🔥 🔥
  - **Fire 🔥**: every other monster takes your hand's number. Block and guard don't stop it.
  - **Frost ❄**: the monster you hit swings this round for your hand's number less. Cut to 0, it's **frozen solid** and doesn't act. Big hands freeze small monsters; bosses are only slowed.
  - **Broadhead ↑**: pierce equal to your hand's number.
  - Later: **Poison ☠**, a little damage each round for a few rounds.
- The team idea Dave described works on its own: one player freezes the big monster while the others clear the small ones.

## Magic shares the new symbols

Fire (splash) and frost (freeze) can also appear on class powers. Examples are a Wizard's Storm Coil splashing on release, or a frost power for the Ranger. That way splash and freeze each have exactly two homes: arrows and magic.

## Questions for Dave

1. **Blanks:** should a blank weapon still add your hand's number ("only your strength"), or cancel it ("a true miss")? A true miss makes the patterns matter much more.
2. **Frost:** "swing your hand's number less, frozen at 0" as above, or a simpler "the target loses its next attack"? The second is stronger and needs a boss rule.
3. **Symbols on weapons:** pay the whole hand's number (strong, so Gold feels like Gold), or half of it?
4. **The roster:** is five attack, three defense, Staff, and Bow with three arrow kinds the right size? Is the Axe welcome?
5. **The Staff:** one-handed (simplest), or the one remaining two-hander for wizards?

## Next steps, once these are answered

1. Put the patterns and symbols into `js/data.js` and `weaponFaces`. Old saves convert two-handers to their one-handed cousins (War Hammer to Mace, Long Sword to Sword, Staff to Staff).
2. Add arrows, fire and frost to the engine, the cast and round recap, and the monster cards ("Frozen").
3. Re-measure with `tools/worth.mjs` and `tools/curve.mjs`, then tune how many symbol faces each metal gets.
4. Art: arrowhead and snowflake icons, frozen and burning effects on the minis.

## ChatGPT's version, measured the same way (added 22 Oct)

Dave asked ChatGPT the same question. Its version has six weapons: Sword, Dagger, Axe and Spear, plus a Round Shield and a Tower Shield that are the Sword and Axe with their colours swapped. Repeated numbers are allowed (two 8s), and a blank keeps a colour ("a coloured +0"), so your strength still goes to attack or block. The bow and arrows are one set in both hands, with the ammunition chosen at camp. Fire hits the target and splashes half the strength (blockable); Frost halves the target's next hit (no stacking); Piercing turns the strength into pierce. Silver and Gold add one small bonus on about a quarter or a half of the faces, plus one battle each.

`tools/weaponlab.mjs` now rolls both sets. Act II, same weapon in both hands:

| d8 | Number a roll | Blank | Attack a side | Block a side | In a triple | 6+ straight |
| --- | --- | --- | --- | --- | --- | --- |
| ChatGPT Sword | 3.6 | 13% | 6.3 | 1.7 | 2% | 8% |
| ChatGPT Dagger | 3.1 | 13% | 6.8 | 0.7 | **4%** | **9%** |
| ChatGPT Axe | 3.4 | 38% | **7.4** | 0.5 | 1% | 5% |
| ChatGPT Spear | 3.3 | 26% | 6.9 | 0.9 | 1% | 7% |
| Claude Dagger (low run) | 1.9 | 37% | 5.5 | 0.8 | 2% | 7% |
| Claude Mace (Dave's gap) | 3.0 | 37% | 6.7 | 0.7 | 1% | 6% |

What it shows:
- **ChatGPT's dice are better balanced.** Its attack weapons sit within about 1 of each other (6.3 to 7.4), while mine run from 5.5 to 7.1, and my Dagger is clearly the weakest. Allowing repeated numbers lets it keep blanks rarer without pushing numbers past the die's size.
- **Repeats are a personality I missed.** The Dagger's repeated odd numbers make it twice as likely to land in a triple. That gives it a real reason to exist.
- **Coloured blanks** are a good rule, and the engine already supports them (its weapons carry a colour on their blanks).
- **One bow-and-arrows set, with ammunition chosen at camp,** is simpler than finding a bow and arrows separately.
- **Its Fire and Frost are the safer first version**: half splash, blockable, and a non-stacking halving.

Where I would still differ:
- **Metal needs more than a small bonus.** The worth tool measured today's Gold over Bronze at about half an attack a round, so a small fixed bonus on a quarter or half of the faces will still feel flat. A symbol that pays the hand's number (or half of it) is what would make Gold worth chasing.
- **Wear is already decided at 4 / 6 / 8 battles** (Dave, 21 Oct), not +1 each.

**Merged plan:** use ChatGPT's six weapons and dice as the Bronze base (colour-swapped shields, repeats allowed, coloured blanks) and its arrow effects. Keep this proposal's metal rule (symbols that pay strength) and the 4 / 6 / 8 wear. Leave the Mace, Staff and two-handers out until a role needs them.

## ChatGPT's review of the merged plan, and the triple claim checked (22 Oct)

ChatGPT agreed to the merged plan with these refinements, which this document now adopts:
- **Metal symbols pay half the hand's Strength, rounded up** (Strength 7 gives 4). Full Strength is to be tested beside it, not assumed. Pierce, block and heal are worth different amounts, so the lab measures each.
- **An arrow special that replaces the lane's attack pays full Strength.** Piercing turns it all into pierce. Fire is full Strength on the target and half as splash. Frost is a full Strength attack plus the slow. Strength is never counted twice.
- **Frost halves one attack at every metal, with no stacking and no full freeze.** A complete freeze could later be a rare, limited ability.
- **The triple claim was too broad, and ChatGPT was right.** With each triple counted on its own (`tools/weaponlab.mjs`, loadouts), the Dagger's extra triples come from the **top row**, and only with **two Daggers**. Dagger + Dagger makes a top-row triple 3.0% of the time in Act II, while Dagger + Round Shield makes one 1.5%, the same as Sword + Round Shield. In Act I a Dagger can never make its side-column triple, because a d4 talent die shows only a 4 and the Dagger d4 has no 4. Overall, weapons move triples by only 1 to 2 in 100 boards before rerolls. The Axe roughly halves straights (4.6% against 8.7%).

**Next step:** build the six weapons, coloured blanks, the bow-and-arrows set with ammunition, and the half-Strength symbols in the engine behind a switch that is off in the live game. Then `tools/worth.mjs` and `tools/curve.mjs` can compare half and full Strength with rerolls, monster guard, damage after guard and damage prevented, before anything goes live.

## Agreed and started (22 Oct): a staged experiment behind a switch that is off

Dave approved ChatGPT's narrower plan:
- **Top-row triples: no change.** Today's game already lets any two weapons make the top-row triple (left weapon, head and right weapon on the same number; `evaluate` in js/engine.js). It was never limited to two-handers, so removing two-handers changes nothing here.
- **"Half Strength" means the rolled hand number**, before Heart Boost or a talent's 2×, rounded up. (Stage 2.)
- **Frost:** halve the monster's next damaging attack before your block, rounded down, then clear it. It never stacks. (Stage 3.)
- **Stages:** (1) six ordinary weapons, Bronze numbers, coloured +0s; (2) Silver and Gold symbols, half against full Strength; (3) the bow set, ammunition, fire and frost. Each stage is measured against today's weapons in real fights with rerolls: mixed loadouts, one and two weapons unlocked, solo and team, all three acts.
- **Safety:** the switch (`EXPERIMENT.weapons2` in js/data.js, `useWeapons2()` in js/engine.js) is off in the live game. Only the tools turn it on (`W2=1`). Nothing in a save changes while it is off. A playable experimental mode will keep its saves separate, and none of it reaches the live game without Dave's approval.

**Stage 1 is built (22 Oct):** `WEAPONS2` holds the six weapons' faces (Round Shield = Sword swapped, Tower Shield = Axe swapped), a new Axe (it borrows the Mace's 3D model for now), one-handed loot, stand-in class weapons until the bow arrives (Knight Sword + Round Shield, Ranger Spear + Dagger, Wizard Dagger + Round Shield, Dwarf Axe + Tower Shield, Bard Dagger + Sword), a one-handed Diamond pool, and no two-handed legendaries. Tests: test/weapons2.test.mjs. Measuring: `W2=1 sh tools/curve-all.sh`, `W2=1 WHAT=weapons sh tools/worth-all.sh`, `W2=1 node tools/party.mjs`.

## Stage 1 results (22 Oct)

**Campaigns** (docs/balance/curve_2026-10-22_weapons-today.txt against _weapons2-stage1.txt; 15 campaigns each, same bot): attack a round 30 / 41 / 49 became 26 / 37 / 46 by act, fights won 97 / 94 / 94% became 95 / 92 / 93%, and bosses 89 / 80 / 91% became 82 / 69 / 90%. That is the size of today's metal icons, which stage 1 leaves out. **The classes come much closer together:** Act III attack ran 42 to 55 by class with today's weapons, and runs 45 to 50 with the six.

**Matchups** (tools/matchup.mjs, docs/balance/matchups_2026-10-22_weapons2-stage1.txt; Act II heroes of every class, 8 loadouts × a heavy hitter, a swarm of three and an armoured monster, a careful player and a greedy one):
- **Decisions matter a lot.** The careful player loses 9 to 30 less health a fight than the greedy one with the same loadout, and wins the swarm 77 to 88% of the time against 57 to 61%.
- **Partners matter.** Dagger + Shield costs 6.7 health against the heavy hitter, and Dagger + Dagger 10.3.
- **But defence wins everywhere, for the careful player.** Shield + Tower Shield is best or tied in all three fights (2.7 / 39.4 / 3.1 health), only slower (6 to 9 rounds). Swapping a Shield or Tower Shield into the left hand saves the most health in every act (worth tool, `WHAT=weapons`). So "neither loadout wins everywhere" is **not** met yet.
- **Why:** health is the only thing a fight costs. Nothing rewards finishing faster, so turtling is the best play. This is probably true of today's weapons too (not measured yet).

**Ideas to give attack a reason** (for Dave to choose; none built):
1. **Monsters escalate:** from about round 5, every monster hits a little harder each round, so a long turtle fight starts to cost.
2. **Swarms call friends:** a group of small monsters adds one more every few rounds until thinned, which rewards attack against swarms.
3. **Speed pays:** finishing in few rounds earns more gold or battle points.
The first two fit the matchups best: defence against the heavy hitter, attack against the swarm, pierce against armour.

## Stage 3 built (22 Oct): the bow and its arrows, behind the switch

- **The Bow** goes in the right hand: a little hit and a little guard (d8: B0 R1 B1 R2 B3 R3 R4 B4). **The Arrows** go in the left. Their faces depend on the ammunition (`inst.ammo`), which will be chosen at camp. The Ranger starts with Arrows + Bow.
- **Normal arrows** carry numbers only (d8: 0 1 2 3 5 6 7 8). **Piercing, Fire and Frost** carry low numbers and arrowheads: one on a d4, two on a d6, three on a d8 or d10.
- **An arrowhead pays the hand's printed Strength:**
  - **Piercing** turns all of it into pierce.
  - **Fire** hits the target and splashes half of it, rounded down, on every other monster, and each monster's guard can stop that splash.
  - **Frost** hits and chills the target. Its next damaging blow is halved, rounded down, before your block, then the frost clears. It never stacks, and if the monster already struck early this round, the frost waits for its next blow.
- An arrowhead isn't a blank, so the Ember Locket doesn't fire on it. Fire and Frost aren't in team fights yet.
- Tests: test/weapons2.test.mjs. Measure with `ARROWS=1 W2=1 node tools/matchup.mjs` (four ammunitions, plus Sword + Shield and Dagger + Sword to compare).
- Still to build when this goes live: choosing ammunition at camp, finding or buying ammunition, the next-fight preview at camp, and arrowhead, flame and snowflake art and effects.
