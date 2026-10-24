# T19 diagnosis: Jasper's 24-round Wyrmwatch fight (Claude, 24 October 2026)

Brief and evidence: [T19-jasper-wyrmwatch.md](T19-jasper-wyrmwatch.md). **Investigation only: no game file changed, no balance change applied or authorised.** Tools (all read-only): `tools/t19-trace.mjs` (how the fight is built), `tools/t19-fights.mjs` (late Act III fights across classes), `tools/t19-jasper.mjs` (an approximate Jasper), `tools/t19-loadout.mjs` (the War Hammer against active weapons), and for part 2 `tools/t19-phase.mjs` (opening against boss-only phase) and `tools/t19-party.mjs` (tables of 2, 4 and 6; raw tables in [T19-party-tables.md](T19-party-tables.md), rows in [T19-party-rows.json](T19-party-rows.json)). Raw rows: [T19-rows.json](T19-rows.json).

## Diagnosis in one paragraph

This was not an ordinary boss fight and the numbers are not a report error. It was a **nemesis return stacked on an ordinary fight**: Vharaxis fled the step 5 elite below 30% health, and at step 8 the game attached it (as a returning nemesis) to the step's Call-for-Help pair, **using the ordinary-battle health multiplier instead of the boss multiplier**. That gave a 1,002-health maximum Vharaxis (it starts the fight at 65% of that, 651) beside a 179 and a 165 health minion: 995 health on the table at the start, against 340 for the same step's designed fight, 556 for the designed step 5 elite and 690 for the designed finale boss. For the sim bots that fight is nearly unwinnable (11% wins against 94% for the designed step 8). The 14 boss-only rounds that made it feel endless are the ordinary length of an Act III boss against this much health: Jasper dealt about 40 a round after armour against the 553 he had left. The legacy War Hammer is not weak. The 35 heal presses are a separate input-friction problem.

## 1. Where the numbers come from (exact; reproduced in `tools/t19-trace.mjs`)

| Value in the report | Source | Result |
|---|---|---|
| Quest | `roadsFor`, step 8: Call for Help puts the pool pick (Gloom Stalker, Dirge Singer) in the fight at Wyrmwatch; `attachNemesis` adds Vharaxis because its record (fled at step 5) is ready at step 5 + 3 | Vharaxis, Gloom Stalker, Dirge Singer |
| Health multiplier 3.578 | an ordinary battle: (1 + STEP_HP 0.06 × 7) × ACT_HP[Act III] 2.1 × the act's step 8 `fightHp` 1.2 (written for the quiet Kettle Tarn pair, but applied to whatever stands in the step) | 1.42 × 2.1 × 1.2 = 3.578 |
| Vharaxis 1,002 | base 280 × 3.578 | maximum health |
| Gloom Stalker 179, Dirge Singer 165 | base 50 and 46 × 3.578 | matches the report |
| Fight bonus 16 | `flat`: 3 + floor(7/3) + ACT_FLAT[Act III] 5 + the ordinary-battle bonus | matches (the designed finale also has 16) |
| 553 at round 6 | `dressNemesis`: it returns at max(0.6, wound + 0.35) of its maximum; it fled at 30%, so 0.65 | starts at **651** of 1,002; Jasper had dealt 98 by round 6 |

The designed Vharaxis at the same step uses the set-piece multipliers instead: **556** maximum as the step 5 elite (multiplier 1.984) and **690** as the step 10 boss (2.464). The nemesis path never applies them because the quest's kind is `battle`. The same applies to the other boss-tier monsters that can flee as an elite (Goldbelly, Blazemorrow): any boss that fled and returns inherits ordinary-battle scaling. (Not checked here against every campaign pack.)

## 2. Reproduction, with what is missing

Reproduced exactly: the enemy list, health and fight bonus, the nemesis start health, Jasper's maximum health (98), the three potions of 20. **Not known and therefore approximated:** the seed, the first five rounds, early choices, the talents' faces, the power and perk effects beyond the report's list, the pet. `tools/t19-jasper.mjs` builds an approximate Jasper (Knight 13, War Hammer Gold d8, the report's dice sizes, powers and perks) and fights the same quest 120 times with the sim bot. It is **not an exact replay**.

## 3. Measurements (sim bot, released rules; the bot is a greedy plain player, weaker than Dave)

Heroes: the bot plays a campaign to Act III step 8 per class, then every scenario is fought from identical copies of that hero. Two runs of 45 and 35 heroes (5 classes) agree; the second, which also holds the three options below, is shown first.


| Scenario | Fights | Win % | Rounds mean | p50 | p90 | max | Boss-only rounds mean | Boss rounds with no attack (of boss-only) | Heal presses per fight | Fights with 4+ heals in a round | Lowest HP share mean | Potions used | Enemy health at start (mean) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Option A: nemesis at its designed elite health (636 max), both foes kept | 35 | 20.0 | 8.2 | 6 | 16 | 26 | 2.1 | 0.7 | 3.1 | 20.0% | 4.1 | 1.8 | 757 of 980 max |
| Option B: nemesis at 636 max plus one foe | 35 | 54.3 | 11.5 | 12 | 17 | 23 | 6.7 | 2.3 | 2.3 | 11.4% | 12.3 | 1.8 | 592 of 815 max |
| Option C: nemesis at 636 max alone | 35 | 97.1 | 9.7 | 9 | 12 | 16 | 9.7 | 3.4 | 1.0 | 2.9% | 32.7 | 1.4 | 413 of 636 max |
| Nemesis return on the designed step 8 pair (no Call for Help) | 35 | 2.9 | 7.0 | 4 | 12 | 32 | 1.5 | 0.5 | 1.4 | 2.9% | 0.4 | 1.5 | 1051 of 1402 max |
| Nemesis return alone (no other foes) | 35 | 74.3 | 15.1 | 14 | 18 | 30 | 15.1 | 5.3 | 3.4 | 25.7% | 22.2 | 1.7 | 651 of 1002 max |
| Step 8 as designed (no nemesis) | 35 | 94.3 | 7.6 | 8 | 9 | 15 | 0.0 | 0.0 | 1.0 | 2.9% | 28.1 | 1.4 | 340 of 340 max |
| Nemesis return (as Dave met it) | 35 | 11.4 | 9.8 | 8 | 19 | 28 | 2.9 | 0.9 | 3.3 | 22.9% | 2.0 | 1.7 | 995 of 1346 max |
| Nemesis return, boss held to its designed health | 35 | 17.1 | 9.0 | 8 | 18 | 24 | 2.2 | 0.6 | 2.9 | 20.0% | 3.1 | 1.7 | 792 of 1034 max |
| Step 5 elite Vharaxis (designed) | 35 | 100.0 | 10.1 | 10 | 13 | 23 | 10.1 | 3.1 | 0.3 | 2.9% | 42.6 | 0.8 | 556 of 556 max |
| Step 10 boss Vharaxis (designed) | 35 | 74.3 | 15.3 | 15 | 21 | 26 | 15.3 | 4.7 | 2.5 | 20.0% | 20.5 | 1.7 | 690 of 690 max |

## By class: rounds (mean) in the nemesis return and at the designed boss

| Class | Heroes | Nemesis return rounds | Win % | Designed boss rounds | Win % | Boss-only rounds in the return | Heal presses in the return |
|---|---|---|---|---|---|---|---|
| knight | 9 | 14.3 | 33.3 | 15.4 | 77.8 | 5.6 | 6.9 |
| ranger | 5 | 4.4 | 0.0 | 15.4 | 80.0 | 0.0 | 0.0 |
| wizard | 5 | 4.8 | 0.0 | 11.8 | 60.0 | 0.4 | 1.0 |
| dwarf | 9 | 10.6 | 0.0 | 16.1 | 77.8 | 3.1 | 2.0 |
| bard | 7 | 10.6 | 14.3 | 16.6 | 71.4 | 3.1 | 4.3 |


First run (45 heroes), for the same scenarios:


| Scenario | Fights | Win % | Rounds mean | p50 | p90 | max | Boss-only rounds mean | Boss rounds with no attack (of boss-only) | Heal presses per fight | Fights with 4+ heals in a round | Lowest HP share mean | Potions used | Enemy health at start (mean) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Nemesis return on the designed step 8 pair (no Call for Help) | 45 | 2.2 | 6.6 | 5 | 11 | 32 | 1.2 | 0.4 | 1.9 | 11.1% | 0.3 | 1.5 | 1051 of 1402 max |
| Nemesis return alone (no other foes) | 45 | 77.8 | 15.5 | 14 | 20 | 30 | 15.5 | 5.5 | 3.5 | 26.7% | 21.9 | 1.8 | 651 of 1002 max |
| Step 8 as designed (no nemesis) | 45 | 93.3 | 7.7 | 8 | 9 | 15 | 0.0 | 0.0 | 1.0 | 4.4% | 28.5 | 1.4 | 353 of 353 max |
| Nemesis return (as Dave met it) | 45 | 8.9 | 9.5 | 7 | 19 | 28 | 2.6 | 0.8 | 3.5 | 24.4% | 1.5 | 1.7 | 995 of 1346 max |
| Nemesis return, boss held to its designed health | 45 | 13.3 | 8.8 | 7 | 18 | 24 | 2.0 | 0.6 | 3.0 | 20.0% | 2.4 | 1.7 | 792 of 1034 max |
| Step 5 elite Vharaxis (designed) | 45 | 100.0 | 10.1 | 10 | 12 | 23 | 10.1 | 3.0 | 0.4 | 2.2% | 42.4 | 0.8 | 556 of 556 max |
| Step 10 boss Vharaxis (designed) | 45 | 73.3 | 16.0 | 15 | 21 | 30 | 16.0 | 5.0 | 2.9 | 22.2% | 21.2 | 1.6 | 690 of 690 max |

## By class: rounds (mean) in the nemesis return and at the designed boss

| Class | Heroes | Nemesis return rounds | Win % | Designed boss rounds | Win % | Boss-only rounds in the return | Heal presses in the return |
|---|---|---|---|---|---|---|---|
| knight | 12 | 12.9 | 25.0 | 16.8 | 75.0 | 4.4 | 5.8 |
| ranger | 5 | 4.4 | 0.0 | 15.4 | 80.0 | 0.0 | 0.0 |
| wizard | 7 | 5.0 | 0.0 | 13.0 | 57.1 | 0.3 | 3.3 |
| dwarf | 12 | 10.9 | 0.0 | 16.8 | 83.3 | 3.4 | 2.7 |
| bard | 9 | 9.2 | 11.1 | 16.3 | 66.7 | 2.4 | 3.4 |


**Approximate Jasper (120 fights):** the bot **wins 0 of 120**, mean 6.6 rounds, p90 10, max 20. This hero is approximate and the bot is much weaker than Dave (Dave's potions, rerolls, Second Wind and 35 heals were deliberate), so this says how hard the stacked fight is, not that Dave's win was impossible.

**War Hammer against active weapons** (one throw, no rerolls or powers, Jasper-like dice, `tools/t19-loadout.mjs`):

| Loadout | Attack + pierce | Block | p10 | p50 | p90 |
|---|---|---|---|---|---|
| War Hammer (Gold d8, two-handed, as in the report) | 26.3 | 0.7 | 14 | 25 | 40 |
| Gold Sword d8 + Gold Axe d8 | 23.5 | 3.9 | 10 | 23 | 38 |
| Gold Sword d8 + Gold Round Shield d8 | 16.2 | 11.0 | 4 | 15 | 30 |
| Gold Axe d8 + Gold Tower Shield d8 | 15.2 | 11.1 | 4 | 14 | 27 |
| Gold Spear d8 + Gold Sword d8 | 22.7 | 4.4 | 9 | 22 | 37 |

The legacy War Hammer has the highest expected throw of these. It is not the cause. Its cost is block: about 0.7 a roll, so Jasper survived by healing and by Shield Up, not by blocking.

## 4. Boss-only duration, and time spent surviving against time spent reducing the boss

- **Dave's rounds 11 to 24 (14 boss-only rounds):** the boss started that phase at 553 and Jasper dealt 35, 27, 26, 57, 42, 41, 46, 53, 24, 30, 74, 47, 49 and 2, which sums to exactly 553: 39.5 a round after armour (the 2d4 armour took 2 to 8 off each strike). The length is arithmetic: 553 at 40 a round is 14 rounds.
- **6 of those 14 rounds the boss did not attack at all** (4 Inhale, 2 Terrify): 43%. They are recovery rounds, which is why the fight was survivable and also why it dragged. Damage taken in all 14 rounds: 208 in total (a mean of 15).
- **Where the danger was:** rounds 6 to 11, while the Gloom Stalker (rolls up to 37) and the Dirge Singer still stood beside the boss. Jasper ended rounds 9 and 10 at 11 and 10 of 98, and used all three potions before round 6. From round 11 on, the lowest end-of-round health was 14.
- **The designed finale is also long:** a bot hero's step 10 boss fight (690 health) averages about 15 rounds (p90 21, max 26), 31% of the boss's rounds without an attack, and wins 74%. So 14 to 24 rounds is within what Act III boss fights already are; 24 is the tail, made longer by the extra health.
- **Heal presses:** in the bots' fights 1.0 per step 8 fight as designed, 2.5 at the finale, 3.3 in the nemesis return. Dave's 35 in 19 rounds (8 in rounds 8 and 15, 6 in round 18) are human play with plenty of magic; the bot's rule is simpler.

## 5. Repeated healing input (a separate usability issue)

The universal heal is 2 magic for 3 health, the same for every hero and level (`healAmountOf`, ruled by Dave); eight presses in a round is 16 magic for 24 health. Each press is one tap (`healSpend`, one call per tap). **Proposal, not a change:** a multi-heal control that applies N legal heals in one tap, keeping exactly what each heal is today: 2 magic each, +3 health each, stopping when health is full or magic runs out, never more than the player chose. Suggested form: a small stepper on the heal button (x1, x2, x4, "to full") with a live line "N heals: 2N magic for up to 3N health", one confirmation tap, and the battle report recording N separate heals. Costs, caps and effects stay in the engine's `healSpend`; the control only repeats it. Tradeoffs: it makes a heal-heavy round easier, so it should come with no change to the heal rate; a mis-tap spends magic (hence the live line and the single confirmation); the report must still show each heal. Implementation is small (one UI control in `js/g3/battle3d.js`, no rule change) and needs the Director's go-ahead.

## 6. The scaling options for the returning nemesis (measured, none applied)

The three options hold the nemesis at the designed elite scaling for step 8 (636 maximum, the same 65% start) and differ in what stands beside it:

| Option | Win % (bot) | Rounds mean | Enemy health at start | Boss-only rounds |
|---|---|---|---|---|
| As Dave met it | 11 | 9.8 | 995 | 2.9 |
| A: designed health, both foes kept | 20 | 8.2 | 757 | 2.1 |
| B: designed health plus one foe | 54 | 11.5 | 592 | 6.7 |
| C: designed health, alone | 97 | 9.7 | 413 | 9.7 |
| For reference: designed step 8 | 94 | 7.6 | 340 | 0.0 |
| For reference: designed step 10 boss | 74 | 15.3 | 690 | 15.3 |

- **Fixing only the health (A) is not enough:** the stacking of three foes is the larger cause.
- **B or C:** the returning boss replaces the step's fight (C) or shares it with one foe (B). C is easy for bots (97%) and about as long as before; B sits between the step 8 design and the finale. Which is right depends on the win rate the Director wants for a returning nemesis; I have not tuned to a number.
- **Tradeoffs:** a nemesis that is easier than the dread of it may disappoint; scaling it down changes the reward story (bounty, chronicle) not at all; the ambush rule (`attachNemesis`) is shared by every act and every pack, so the change should be limited to boss-tier nemeses, or the step-8 `fightHp` should stop applying to foes it was not written for. Any option changes live Act III balance, so it needs a ruling and stays off until approved.

## 7. Relation to the other tasks, and limits

- **T02 (danger):** this is a stacked-foe danger case the audit's solo Act I focus did not cover. **T03 (progression):** the finale already takes about 15 rounds for bot heroes with an Act III multiplier of 2.1; this does not change that. **T07 (magic outlets):** at level 13 most magic went into 2-for-3 heals; a magic-to-health exchange that poor, with plenty of magic, is what produces eight-tap rounds.
- **Limits:** the sim bot is greedy and weaker than Dave; the campaigns are the bot's, not Dave's; a few dozen heroes per run; the Jasper build is approximate; no elapsed time was measured (rounds are not minutes); win rates describe the bot, not human players; one pack (Ember Peaks) was traced. Nothing here is a balance approval.

## Questions for the Director

1. What win rate should a returning nemesis aim for on Normal for a typical player (Option B and C bracket it)?
2. Should the fix be limited to boss-tier nemeses, or should the step 8 `fightHp` stop applying to foes it was not written for?
3. Do you want the multi-heal control proposed in section 5?
4. Should the other packs' bosses that can flee as elites (Goldbelly, Blazemorrow) be checked before any change?

---

# Part 2 (24 October 2026): opening against the sustained phase, learning, and tables of 2, 4 and 6

Still **investigation only: nothing changed, nothing approved.** Same limits as part 1: the bots are greedy plain players (weaker than Dave), the heroes are the bots' own campaigns, samples are small (45 hero slots for the solo measures, 10 fights per party cell, so a win rate is good to about ±15 points), and **rounds are not elapsed time**: the report has no duration, and a round at a six-player table takes six players' turns, so a round count says nothing about minutes. Elapsed time is therefore not measured here at all.

## 8. The risky opening and the sustained boss-only phase (`tools/t19-phase.mjs`)

For every won fight I looked for the round from which the hero never again ended a round below 40% of maximum health. That is retrospective (a player cannot know it in the moment), so it measures when the fight *was* safe, not when it felt safe. "Pressured" rounds are those with a hit of 15% of maximum health or more, or an end below half health: the rounds that still ask for a defensive decision.

| Fight | Win % | Rounds p50 / p90 / max | Opening (boss and another foe) | Boss alone | Safe from round | Rounds left after that | Boss health left then | Pressured rounds among them |
|---|---|---|---|---|---|---|---|---|
| Nemesis return as Dave met it | 11 (4 of 35) | 8 / 19 / 28 | 6.5 | 13.5 | 14.5 of 20 | 6.5 (31%) | 21% | 2.0 |
| Nemesis alone (1,002 max) | 74 | 14 / 18 / 30 | 0 | 16.1 | 10.2 of 16.1 | 6.9 (40%) | 21% | 1.6 |
| Designed step 10 boss (690 max) | 74 | 15 / 21 / 26 | 0 | 16.1 | 10.3 of 16.1 | 6.7 (41%) | 36% | 1.2 |
| Option B (636 max plus one foe) | 54 | 12 / 17 / 23 | 4.7 | 9.6 | 10.6 of 14.3 | 4.7 (29%) | 19% | 0.9 |

What this says. **The danger is the opening; the length is the boss alone.** When the three foes stand together the bot loses nine times in ten, and the losses come early (lost fights last 8.5 rounds on average). Once it is through the opening, it is safe by round 10 or 11 in every variant, and then it needs about 7 more rounds in the finale-shaped fights, of which only 1 to 2 are rounds that still threaten a hit of 15% or an end below half. That is the "foregone conclusion" Dave worried about: **about 40% of a designed boss fight, and 40% of the nemesis-alone fight, is played after the outcome is secure**, and in most of those rounds the choices left are how to spend magic and how to shape the dice for damage, not whether to defend. With one other foe (Option B) there is a target decision (kill the Gloom Stalker first or ignore it) and the safe tail shrinks to 29%.

Rhythm. Across won fights the boss did not attack in about a third of its rounds (5.2 of 16.1 at the designed boss, 5.8 of 16.1 alone; Dave's own 14 boss-only rounds had 6, 43%). In an idle round the bot's damage taken was about 0% of maximum health; in an attacking round about 13 to 15%. So the rhythm exists as Dave described it: a round of danger costs about a seventh of a hero, an idle round is a recovery window, and the bot pressed heals in both kinds (4.5 against 5.8 in the nemesis fights; 1.0 against 1.2 at the designed boss). The healing and magic generation are not what makes the tail safe: in the safe tail the bot pressed only about 1 to 2 heals in total and took about 30% to 44% of maximum health in damage across about seven rounds. The tail is long because the boss has a lot of health for the output (about 40 a round after armour), not because earned healing is too strong. **I do not recommend reducing healing or Heart support on this evidence**; the learning curve Dave describes (magic, Heart amplification, small enemies first) is what turns the 11%-win opening into a win, and that is a positive result.

## 9. Tables of 2, 4 and 6: how the encounter really scales (`tools/t19-party.mjs`)

Source facts, confirmed against the code and the Director's check. The company factor is `m = sum(heroStrength) / max(heroStrength)`: six equal bot heroes came out at **m 5.3, not 6** (strengths 56 to 73), and a company of one strong hero and five level-1 heroes at m 2.2. Boss health is the encounter's health times `1 + 1.2 (m − 1)`: **690 at one hero, 1,442 at two equal, 2,885 at four equal, 4,249 at six equal** (the exact figures are in the tables). Each blow also gets a team bonus of `round(10 (m − 1))` (+9, +27, +43 at 2, 4, 6 equal) **rolled as extra monster dice**, not a flat add, and two goblins join at six (74 health each: the quest's health factor without the party factor, so they are tiny next to the boss).

**How a blow is shared out, traced in `resolveParty`.** An ordinary blow (Talons, Bite, Club) is *split* between the heroes: the slowest takes a double share and the others a single share, and each hero's block soaks only their own part. So the team bonus is **not** +43 to each hero; it is added to a blow that is then divided (at six equal heroes an ordinary blow averages 69 whole and 12 per hero, 14% of a hero). **Breath is different:** every living hero takes `ceil(0.6 × the whole blow)` (`BREATH_SHARE`, data.js), unsplit. Vharaxis's Inferno and its Slam are breath. So at a bigger table the same blow grows with the team bonus and then lands on everyone at once:

| Table (equal heroes, designed boss) | Hero health (mean) | Breath blow, whole | Each hero takes from one breath | After block | An ordinary blow, per hero |
|---|---|---|---|---|---|
| 1 (solo) | 85 | 31 | 19 (23% of a hero) | 7 | 27 (31%) |
| 2 | 87 | 42 | 25 (29%) | 13 | 19 (21%) |
| 4 | 85 | 58 | 35 (42%) | 19 | 14 (16%) |
| 6 | 85 | 78 | 47 (55%) | 27 | 12 (14%) |

Hero health does not grow with the table, so **the danger that grows with head count is the breath**: from about a quarter of every hero's health at one hero to over half of every hero's health at six, taken by all six at once, while the table's total damage to heroes per breath goes from 19 to about 280. (The new-recruit rows are worse: with five level-1 heroes of about 40 health each, one breath takes 65% of each.) Everything else shrinks per hero as the table grows.

Outcomes (10 fights per cell; win % in brackets; the 6 rows are noisy):

| Table | Designed boss: win %, rounds p50 / p90 | Heroes who fell | Nemesis return (stacked): win % | Heroes who fell |
|---|---|---|---|---|
| Solo | 100, 17 / 32 | 0 of 1 | 40 | 0.6 of 1 |
| 2 equal | 100, 16 / 20 | 0.2 of 2 | 60 | 1.1 of 2 |
| 2: one strong, one level-1 | 100, 15 / 29 | 0.2 of 2 | 40 | 1.6 of 2 |
| 4 equal | 90, 14 / 17 | 0.7 of 4 | 40 | 2.7 of 4 |
| 4: half strong, half end of Act II | 100, 13 / 16 | 0.1 of 4 | 40 | 3.2 of 4 |
| 4: one strong, three level-1 | 100, 11 / 19 | 1.2 of 4 | 60 | 2.9 of 4 |
| 6 equal | 80, 14 / 18 | 2.7 of 6 | **0** | 6.0 of 6 |
| 6: half strong, half end of Act II | 80, 13 / 25 | 2.1 of 6 | **0** | 6.0 of 6 |
| 6: one strong, five level-1 | 90, 15 / 26 | 3.4 of 6 | 30 | 5.7 of 6 |

(Solo rows differ a little from section 3 because the party tool builds its own heroes and its seeds; the small samples move them by tens of points. They are a reference, not a second measurement of the same thing.)

- **Rounds are held roughly constant by the HP formula** (the designed fight runs a median of 11 to 17 rounds at every size): the table's output rises as fast as the boss's health (41 a round solo, 95 at two, 208 at four, 305 at six), so the length does not blow up with head count. The 90th percentile does (17 to 26 at six, and 62 to 65 in the stacked fight at two heroes, where the table sometimes stalemates for dozens of rounds), so the tail, not the average, is where a six-player boss drags.
- **What the scaling does change is falls:** from almost none at two to 2 to 3 heroes down per fight at six, with 10 to 20% of fights lost. Revives were 0.0 in every cell in the bot's play, so recovery after a fall is the bots' blind spot, not evidence the rule fails.
- **The stacked nemesis fight scales terribly**: at six the two companies of strong heroes won 0 of 20 fights (every hero fell, every time), because the six-fold boss, two 1,000-health minions and the extra goblins arrive with the breath cost above. Whatever fixes the nemesis stacking (section 6) matters more at bigger tables than at one.
- **Mixed companies:** the factor uses strength, so a weak hero adds little boss health, but breath takes the same 60% from each hero whatever its health. Five level-1 heroes beside one veteran face about 1,700 boss health (small) and still fall at 3.4 per fight. That is the case where the rule is least fair, and it is also the likeliest at a real table (a new friend joining a veteran).
- **Not simply "multiply by the head count":** Jasper's 1,002 times six would be 6,012, which the formula never produces (4,249 at six equal for the designed boss, 6,171 for the stacked one). The multiplier is 6.2 at six equal (m 5.3), by design a bit more than one per hero.

## 10. Pacing options (proposals only; none measured as a change, none applied)

All are proposals for the Director's ruling. I have not changed anything, and none would approve itself by arithmetic. None adds a timer, a late lethal spike or guaranteed victory.

1. **Fix the nemesis return first (section 6, Options B or C).** It is the biggest cause of the 24-round fight and of the 0% win at six. It also removes the unwinnable opening before anything else is tuned.
2. **Shorten the safe grind with a punishable opening, not less boss health.** The boss already telegraphs (Inhale, Terrify and a wind-up before the slam). Proposal: while the boss is spending a round on a telegraph, it is *exposed*: its armour (the 2d4 that takes 2 to 8 off every strike) does not apply that round, or the hero's strike counts for a fixed amount more. That is a reward for reading the rhythm that does not touch what a hero takes. Arithmetic only (not a simulation): at Dave's 553 health left and 39.5 a round, a 50% bonus in telegraph rounds (43% of rounds) would turn 14 boss-only rounds into about 11.5; at the bot's 32% telegraph share, about 12; a doubled bonus about 10 to 10.5. The fight stays long enough to be an event and the danger rounds are unchanged. I would test it in a preview behind a switch before anyone judged it.
3. **Create target decisions with a finite composition, not replenishment.** Option B (the boss plus one foe, finite) gave a 54% bot win rate, a real opening of 4.7 rounds and a safe tail of 29%, and a choice between targets. A boss that keeps summoning would stretch the safe grind again, so I do not propose one.
4. **Scale party bosses through breath share, not only through health.** At six equal heroes one breath costs 55% of every hero. Options for the Director to weigh: shrink `BREATH_SHARE` as the table grows so that the per-hero cost stays near today's two-hero value (about 29%); or apply the team bonus to split blows only, not breath; or keep the numbers and rely on potions and block. Each changes live party balance, so each needs a ruling and a preview with matched campaigns first. The mixed-strength case (new friend with a veteran) argues for making breath scale with the hero's health share rather than a flat share.
5. **Do not shorten the encounter by reducing earned healing or Heart support** (Dave's instruction, and the numbers do not point there: the safe tail uses 1 to 2 heals in total).
6. **Separate evidence still missing:** real elapsed time (the exporter has none; a play-duration line in the report would give it), a six-player live report, and a human-player sample of the opening.

## Questions for the Director (added)

5. Should the nemesis-return fix be limited to boss-tier nemeses (Q2), given it also decides whether six-player nemesis fights are winnable at all?
6. Of the pacing options above, which should be measured in a preview behind a switch first: the exposed telegraph round (2), the finite one-foe composition (3), or breath scaling at bigger tables (4)?
7. Should the battle report record the time each round took, so the next playtest gives real elapsed time?
