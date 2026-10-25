# T19 diagnosis: Jasper's 24-round Wyrmwatch fight (Claude, 24 October 2026)

> **Director review, 24 October:** The investigation below is preserved as submitted. [Seven rulings and evidence corrections](T19-director-review.md) now govern the next work. In particular, the party-tool Solo row is a one-fighter party, the phase tool measures net health loss rather than damage, and the claimed secure outcome is not established. The reconstructed flight/wound history is not independently captured. Scoped preview, multi-heal and timing work are authorized in that review; no live balance change is approved.

Brief and evidence: [T19-jasper-wyrmwatch.md](T19-jasper-wyrmwatch.md). **Investigation only: no game file changed, no balance change applied or authorised.** Tools (all read-only): `tools/t19-trace.mjs` (how the fight is built), `tools/t19-fights.mjs` (late Act III fights across classes), `tools/t19-jasper.mjs` (an approximate Jasper), `tools/t19-loadout.mjs` (the War Hammer against active weapons), and for part 2 `tools/t19-phase.mjs` (opening against boss-only phase) and `tools/t19-party.mjs` (tables of 1, 2, 4 and 6; raw tables in [T19-v2-party.md](T19-v2-party.md), rows in `T19/rows-v2.tar.gz`). Raw rows: [T19-rows.json](T19-rows.json).

> **Status, 25 October 2026 (after the Director's review).** Part 1 stands as the diagnosis of what the code does (sections 1 to 7), with two cautions: its bot win rates (11% for the return, 94% for the designed step 8) came from the v1 tools and are superseded by the v2 solo table below (7% and 81% at the finale), and **the nemesis return is a reconstruction**: the report lacks its first rounds and the save, so the step 5 flight, the 30% wound and the 651 starting health are assumptions; 1,002 is the captured maximum health, not proof it began full. **Part 2 as first posted is superseded** (kept in `T19/superseded/`); the revised part 2 is at the end of this file. Corrected tools: `tools/t19-lib.mjs`, `t19-run.mjs`, `t19-phase.mjs`, `t19-party.mjs`; committed hero fixtures in `T19/fixtures/`.

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

# Part 2, revised (25 October 2026): opening against sustained phase, and tables of 1, 2, 4 and 6

**Investigation only: nothing in the game changed and no balance change is approved.** This replaces part 2 as first posted, after the Director's review. What changed in the method: the genuine solo reference is a real `newBattle` / `resolve` fight (the old "Solo" row was the party code with one hero); damage is the engine's captured damage after block (`report.taken`), healing is captured separately, and an attack is the engine's own damage test (the first version counted any move with a number, so a Wing Wall guard counted as an attack); nothing is called "secure"; "equal" parties are now of two kinds (identical clones, whose strength really is equal, and same-stage heroes of mixed classes, whose strengths differ and are labelled so); each hero's exposure is measured against that hero's own maximum health; every cell shows its denominators, timeouts and distinct fixtures; compositions are never pooled. Hero fixtures and the revision are committed (`T19/fixtures/`, revision in each output header) so another agent can reproduce the tables: `node tools/t19-run.mjs ...` per cell, then `node tools/t19-phase.mjs DIR` and `node tools/t19-party.mjs DIR`. Full tables: [T19-v2-solo.md](T19-v2-solo.md) and [T19-v2-party.md](T19-v2-party.md); every cell's raw rows are in `T19/rows-v2.tar.gz` (unpack to a folder and pass it to the two report tools).

**What these numbers are not.** Bots are plain greedy players, weaker than Dave, with known gaps (revives are never used; teamwork is incidental). Win-rate intervals are Wilson 95% intervals that treat fights as independent; with 12 fights a cell they are wide (a 12/12 is 76 to 100%), and the 70 solo fights are 35 fixtures fought twice. **No elapsed time exists in the data**: rounds are not minutes, and a round at a six-player table takes six players' turns.

## 8. Opening and boss-only phase, solo (35 bot heroes, 2 seeds each)

| Fight | Wins (95% interval) | Rounds, wins (mean; p50 / p90 / max) | Rounds, defeats (mean; p50) | In defeats: rounds with the boss and another foe / boss alone |
|---|---|---|---|---|
| Designed step 10 boss (690 max) | 57/70 (81%, 71-89%) | 16.5; 16 / 22 / 29 | 11.3; 11 | 0 / 11.3 |
| Nemesis return, unchanged (1,002 max, both foes) | 5/70 (7%, 3-16%) | 26.6; 26 / 37 / 37 | 5.9; 5 | 5.4 / 0.5 |

- **The opening decides the returning fight; the boss alone sets its length.** In the unchanged return 65 of 70 fights are lost, on average after 5.9 rounds, almost all of them (5.4 rounds) while the boss and another foe both stand. The five that are won take 26.6 rounds, 17.6 of them against the boss alone.
- **The designed finale is itself long** (wins 16.5 rounds, p90 22, max 29) and costs a lot even when won: whole-fight captured damage after block averages 192% of maximum health, balanced by 79% healing received and 3.0 heal presses. Healing is doing real work in that fight.
- **Retrospective healthy suffix (replaces "secure").** Among the 57 wins at the designed boss, from round 9.5 of 16.5 on the hero both started and ended every round at 40% or more of maximum health: 8.0 rounds, 47% of the fight on average (the range across fights is 0% to 100%), with the boss at 42% of its health when it starts. That is a description of how won fights went, **not** a finding that defeat was impossible or that no decision mattered: in those rounds the hero still took 72% of maximum health in total, received 48% in healing, and 2.6 rounds had captured damage of 15% or more of maximum health or ended below half. **The earlier claim that about 40% of the fight is played after the outcome is secure is withdrawn.** (For the unchanged return, the five wins have a 6.8-round suffix, 21%.)
- **Boss rhythm, captured (designed boss, 70 fights).** What the boss announces: Inferno 20% of its rounds, Inhale 19%, Breath Slam 18%, Talons 13%, Terrify 13%, Bite 10%, Wing Wall 8%. The three that do no damage themselves (Inhale, Terrify, Wing Wall) are **40%** of its rounds (the first version's 32% was the Wing Wall miscount). They are not all harmless: Inhale is followed by the Slam, which is the heaviest hit (a hero loses 26% of maximum health in the round a Slam is announced and 21% in an Inferno round, against 15 to 16% for Talons and Bite), and Terrify binds dice. Where the boss stands alone, the rounds it announces Inhale, Terrify or Wing Wall cost the hero nothing in that round (0.0% captured damage) and the rounds with the heavy hits cost 15 to 26% on average, so the rhythm Dave describes (a hit, then a breather) is in the captured data.
- **Healing and magic.** I make no recommendation to reduce them: the evidence above shows heals paying for the damage the fight deals, not an unearned tail, and Dave's coaching (magic, Heart, small enemies first) is what a 7%-win opening needs. The healthy suffix contains about one heal press on average; the heals are spent earlier, where the damage is.

## 9. The returning boss: unchanged, A, B and C (same fixtures and seeds in every arm)

Arms (what each suppresses, exactly): **unchanged** = as the road builds it (boss 1,002 max, Gloom Stalker 179, Dirge Singer 165; in a party also the party's health factor and the goblins it adds). **A** = boss health corrected to the act and step elite basis (636, times the table's health factor), everything else kept. **B** = A, and the whole starting encounter keeps at most one finite companion (the Gloom Stalker): the Dirge Singer and every party goblin are removed. **C** = A with every other foe removed (Stalker, Singer, goblins). Reference: the designed step 10 boss.

| Solo | Wins (95%) | Rounds, wins (mean) | Defeats: rounds |
|---|---|---|---|
| Designed finale (reference) | 57/70 (81%, 71-89%) | 16.5 | 11.3 |
| Unchanged | 5/70 (7%, 3-16%) | 26.6 | 5.9 |
| A | 5/70 (7%, 3-16%) | 19.6 | 5.8 |
| B | 38/70 (54%, 43-65%) | 14.3 | 9.4 |
| C | 64/70 (91%, 83-96%) | 10.2 | 8.7 |

**Health alone (A) does not change the result; the foes do** (7% to 7%). B is meaningfully harder than the finale for a bot soloist (54% against 81%; the intervals do not overlap) and keeps a target decision (in B's wins the opening is 5.4 rounds); C is easier than the finale (91%). At tables, compared with the designed finale at the same table (wins out of 12; falls = heroes down per fight; the full table is in T19-v2-party.md):

| Table (equal-strength clones) | Designed finale | Unchanged return | B | C |
|---|---|---|---|---|
| 2 | 12/12; falls 0.1 | 4/12; falls 1.4 | 11/12; falls 0.3 | 12/12; falls 0.0 |
| 4 | 10/12; falls 1.2 | 2/12; falls 3.7 | 9/12; falls 1.3 | 12/12; falls 0.0 |
| 6 | 6/12; falls 3.7 | **0/12**; falls 6.0 | 4/12; falls 4.7 | 10/12; falls 1.5 |

For the three other compositions (same-stage mixed classes, half end-of-Act-II, one veteran with level-1 friends) the unchanged return is won 0 to 6 of 12 and B 7 to 12 of 12 at every table size (6 of those 9 cells at 11/12 or better). **A is not distinguishable from the unchanged return anywhere. B tracks the designed finale across table sizes**: slightly below it at two and four (11/12, 11/12, 10/12 against 12/12 at two; 9/12, 11/12, 11/12, 11/12 against 10/12, 11/12, 12/12, 12/12 at four) and, at six, equal for three compositions (7/12 and 9/12 and 12/12 against 7/12, 9/12 and 12/12) and lower for clones (4/12 against 6/12, intervals overlapping). Falls at six are high in the finale and in B alike (finale 3.0 to 3.9 a fight, B 2.3 to 4.7), because the breath, not the companion, is what hurts there (below). I have not tuned to a number and make no claim that B's results are acceptable; this is the comparison the Director asked for, to judge across classes and compositions.

## 10. How a table's boss really scales (code trace and captured per-hero exposure)

- **Strength and health.** Boss health is the fight's health times `1 + 1.2 (m − 1)`, with `m = sum(strength) / max(strength)`. For truly equal heroes (clones) m is exactly n: the factor is 2.2, 4.6 and **7.0** at two, four and six, so the designed boss is 1,518, 3,174 and 4,829. For same-stage heroes of mixed classes (strengths 56 to 73) six give m 5.4 (4,357). Group means are not individual exposure: the tables below use each hero's own maximum health.
- **How a blow is shared, traced in `resolveParty`.** The table's bonus (`round(10 (m − 1))`, +50 at six clones) is rolled as extra monster dice on every blow. An ordinary blow is then split between heroes (the leader takes a double share), so the bonus is not +50 to each hero. **Breath is not split:** every living hero takes `ceil(0.6 × the whole blow)`, and Vharaxis's Inferno and Slam are breath (37% of its rounds at the designed boss).
- **Genuine solo against tables, captured (designed boss).** One breath blow, whole, against a lone hero is **36% of that hero's maximum health** (p90 48%, max 61%), **25% after block**; an ordinary blow 30%. At a table, one breath costs each hero, against its own maximum health, before and after block: two equal clones 31% and 18%; four 45% and 27%; six **57% and 38%** (p90 66% before block, max 79%). So the per-hero breath cost at six is about **1.6 times a lone hero's** (57 against 36, before block; 38 against 25 after) while an ordinary blow falls to 15% per hero (from 30%). The earlier "23% solo to 55% at six" was wrong: the "solo" figure was the party code's 60% share for one hero (23% before block, 11% after), not a lone fight.
- **Mixed tables.** In a veteran-and-recruits table the breath takes the same 60% from everyone whatever their health: against their own maximum health level-1 recruits lose about 69% of it at two, 72% at four and 83% at six (before block), and take 113 to 174% of it over a fight (veterans 51 to 105%), with falls of 3.0 at six (the boss is smaller there, 1,627 at six, so the table is won 12 of 12 with heavy losses). The strongest hero's own exposure is below the equal-strength case.
- **Total damage a hero takes over a whole fight** (captured, as % of its own maximum, with healing in the mix) is about the same solo and at six clones (192% and 195%) and lower at two (144%); what the table adds is the same cost borne by every hero at once and, with it, 3.7 of 6 heroes down at the finale (50% win).
- **What I would test, as one narrow separate experiment (proposal only; the Director asked for exactly one):** for **boss-tier breath only, at tables of four or more**, scale the per-hero share from 0.6 down so that a hero's part before block stays near a lone hero's 36% of its maximum health at six equal clones (about 0.38), measured as a fifth arm beside unchanged, A, B and C on the same fixtures and seeds, with falls, low health and win rates per composition reported separately. No global breath change, no change to `heroStrength`, `storyScale` or global `PARTY`.

## Questions for the Director

1. B is harsher than the finale for a solo bot (54% against 81%) and comparable at tables of two and four; C is easier. Is B the arm to build as the isolated preview as is, or should the preview carry B and C switchable so Dave can feel both?
2. Should the single breath experiment above be built into the same preview as a switch, or measured only in the harness first?
3. Round timing (approved): shall I land it as its own checked commit before the preview, so the next playtest report carries real durations?
