# T21: two-player live playtest, rewards waiting and Ranger starting equipment
25 October 2026. Owner: Claude. Priority: urgent live-playtest follow-up, before further experimental balance work.

## Dave's report
During a two-player game, the second player waited too long before being able to choose post-battle rewards. Dave asks for the game to check more often whose turn it is. Both players are archers and expect to start with Bow and Arrows, but see no Bow in their hands. Cards look older than the latest mockups. Exact device builds, duration, new versus imported heroes and online versus shared-phone mode are not yet confirmed; do not invent those details.

## Initial source/deployment check by Director
- Hosted root HTML fetched successfully on 25 October: build 20261025cards4, css/cards.css present. Main index matches. This does not establish either phone's loaded version.
- T05 presentation integration is deployed; T17 weapon-size/no-wear cards and the latest objective-front mockups are not live.
- js/g3/online.js waitPoll runs every 3 seconds only when a battle fighter is locked/skipped/down. It returns without fetching during victory/reward drafting. This is a plausible recovery gap, not proof of the observed cause.
- Released WEAPONS2.classes.ranger is ['quiver','bow']; newHero puts these in NW/NE. START_DICE lacks NE, so the Bow can be equipped but its die locked. Check real online creation, imports/migration, rendering and saves before diagnosing the user's instance.

## Assignment and authorization
1. Reproduce two-player post-battle reward handoff through the real table/session/UI path. Trace authoritative draft advancement, listener arrival and rerender separately. Extend recovery to waiting reward selection and refresh on visible/resume/reconnect as appropriate. Keep live updates primary, deduplicate in-flight fetches, reject stale snapshots, stop on leave/hidden and preserve selection/scroll and pending commands. A bounded roughly 2–3 second fallback while visibly waiting is reasonable; do not blindly hammer Firebase or use host push to skip somebody's reward. Ensure only the eligible player can pick, each reward is taken once, and delayed/out-of-order replies cannot roll back the UI. Fix within existing behavior and publish under standing authorization after checks.
2. Dave explicitly expects a new archer to begin with a usable Bow and Arrows pair. Reproduce the missing Bow and implement a narrow Ranger-start correction if the locked NE is the cause; preserve other classes and existing slot purchases. Distinguish equipped items, active dice and miniature appearance. Check online-created and solo-created Rangers and imported older Rangers. Never reset heroes, replace earned gear or grant duplicate weapons. Document a safe existing-Ranger repair policy before applying any conversion that overwrites equipment or refunds purchases. This request is independent of T17 and does not authorize no-wear or new face tables at the live root.
3. Check card rendering on online victory/loot and camp against current T05 integration. Fix an omitted online rendering path if found. Do not treat absence of T17 mockups as a deployment bug or publish unfinished experimental card rules.
4. Return minimal reproduction, cause, tests, build/commit and limitations directly to BOARD. Use a meaningful two-client UI test for the handoff and record whether real Firestore/two-phone testing happened. Keep fresh-page build versus already-open phone session distinct. Source/deployment reading here was not a two-phone reproduction.

Dave is actively playing. Do not require him to clear browser storage, recreate heroes or abandon the current table to diagnose this. Capture whatever additional evidence is available without disrupting play. No fix is claimed in this intake.


## Follow-up evidence: two Rangers defeated at Act I step 2
Dave supplied the readable report and JSON in chat on 25 October. This section preserves a diagnostic extract, not the complete original JSON. Report id `mvo829c812sx`, savedAt `2026-10-25T19:29:53.096Z`, build `20261025cards4`, online table, Normal, The Siege of Burnt Orchard, defeat after 3 rounds. The reporting phone's build and online mode are now confirmed; JP's client build is not established.

Dave: "We both got beat up pretty bad on normal on the second battle ... We both were Rangers and did not have our bows. We felt very weak."

### Captured facts and player testimony
- Dav: Ranger level 1, 28 maximum HP, two potions healing 10 each. Arrows NW inPlay=true. Bow NE inPlay=false, explicitly "equipped but NOT IN PLAY, its die is not unlocked, so it rolled nothing." Powers Aimed Shot, Quick Draw, Volley. Start magic 6; road effect A good omen.
- JP: Ranger, 28 maximum HP. The observer does not capture JP's equipment, level or client build. Dave says both lacked bows; the available round-1/2 lane evaluations show only a left weapon for each hero.
- Enemy maximum HP: Kindle (bonfire) 71, Smudge (goblin) 45, Magpie Gang (magpies) 45. Each reports power die d8, fightBonus 13. Do not interpret this field as a flat +13 to every hit: the captured damage parts below use four d8 plus 1.
- Round 1: both target Kindle, JP deals 14 and Dav 7 (21 total). Each suffers 5 retaliation burn and ends at 23 HP.
- Round 2: both again target Kindle, Dav deals 16 and JP 20 (36 total). Kindle therefore has 14 HP entering round 3. Each suffers another 5 retaliation burn. Magpie Shiny! rolls 13, fully blocked (JP 9, Dav 4). Dav ends at 18, JP at 21.
- Round 3: all three enemies show 5–33 attacks. Their initiative rolls are each 4; Dav rolls 3 and JP 1. All enemies act before either hero. No hero strike is recorded.
- JP is the slowest-feet leader and takes the larger shares. Captured healing is 7 for JP, 0 for Dav, before these blows; report-derived JP sequence begins effectively at 28 despite pre-resolution health 21.

| Round 3 enemy | Captured dice and total | JP share, no block | Dav share, no block |
|---|---|---:|---:|
| Kindle Nip | 1 + d8 [4,1,8,7] = 21 | 14 | 7 |
| Smudge Fire Bomb (pierce) | 1 + d8 [2,5,7,5] = 20 | 13 | 7 |
| Magpie Stab | 1 + d8 [5,8,6,4] = 24 | 16 | 8 |
| Total | 65 | 43 | 22 |

JP: 21 + 7 healing - 43 damage, clamped to 0 by game; derived path 14, 1, -15.
Dav: 18 - 22 damage, clamped to 0; derived path 11, 4, -4.
The report derives Magpie's Stab as lethal to both. Dav still has two potions before round 3. This does not establish that the loss was the player's fault, unavoidable, or fixable by a single potion: even full 28 HP is below JP's captured 43 damage without prevention or an earlier kill.

### Required extension to T21
1. Treat Dav's disabled Bow as confirmed evidence, not an old-build guess. Reproduce both Rangers' starter equipment through the online table path. Carry through the authorized usable Bow/Arrows correction and safe save handling.
2. Audit this early Normal encounter separately from T19's late boss changes. Trace the source of three foes, HP factors and four-d8 attacks at two level-1 Rangers. Check whether heroStrength/scaling includes equipment or dice that cannot actually participate. Inspect the road/campaign composition and active-slot handling before suggesting a global difficulty change.
3. Compare the current starter against the corrected playable pair with the same setup and matched seeds. Measure damage, warning visibility, initiative, ward retaliation, block/pierce, hero falls and plausible available responses. Do not claim an exact replay without the seed/table state, JP's full loadout and uncaptured actions. Adding a Bow alone is not proof this loss would reverse, since all enemies acted first in the fatal round; prior-round damage may change the outcome.
4. Report-export defects to inspect in the same evidence:
   - Dav's final dice include NE, SE and P with sides=null, rendered as "dnull", even though the captured diceSides omits them. Do not imply these locked/unowned slots contributed. Filter by actual participation or mark unavailable correctly.
   - Round 3 omits attack/block/heal totals and targets for the heroes who died before striking. Check whether committed evaluation can be captured independently of whether a strike occurs.
   - `outcome.enemiesLeft: []` on this defeat is misleading: Kindle was at 14 and the other two at 45 before round 3, and no hero struck. Capture surviving foes when available or explicitly mark unavailable.
   - The pasted native-share output still prepends the share title directly to the report heading. Record as unresolved native-share formatting, separate from direct Copy.
   - Local online magic falls 8→5 before round 2 and 12→7 before round 3 while actions=[]; do not read that empty list as evidence no actions were used. Preserve online capture limitations.
5. Post reproduction, narrow fixes and any distinct balance proposal on BOARD. Starter/reward/report corrections remain priority; a blanket early-game nerf is not authorized by this one report.

This intake reviewed the supplied text/JSON arithmetic only. No new simulation or two-client reproduction performed.
