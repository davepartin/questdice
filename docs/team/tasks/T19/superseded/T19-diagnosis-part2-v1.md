# SUPERSEDED: T19 diagnosis part 2 as first posted (24 October 2026)

Kept as evidence only. The Director's review (T19-director-review.md) found the "solo" row was a one-fighter party, the "safe" figure used net health change and treated any move with a number as an attack, "equal" heroes were not equal strength, and the sampling uncertainty was understated. Corrected analysis: the revised part 2 in T19-diagnosis.md, T19-v2-solo.md and T19-v2-party.md. Do not cite the figures below.

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
