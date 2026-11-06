# T31 Director review: magic prices by colour

6 November 2026. Reviewed the posted T31 table against release `20261106a12` (source `2a8af34`; the preceding `2a3f3b7` stamped that build). Scoped repair build: `20261106cr1`.

## Verdict

**Approve colour-dependent dice sizes/costs as the design direction. Keep the current prices provisionally. Do not treat the old factors as universal exchange rates or as a balance certificate for the current D4 release.**

The earlier measurement is a useful description of its sampled solo rounds. It does not justify a fresh Anvil Strike buff, Rising Ballad nerf, across-the-board pierce surcharge, or a party-healing change. A reproducible solo Shield/Splash defect was found and repaired under Dave's already-approved “splash is not pierce” rule. No magic prices, monster stats, ranks, card types, templates or saves changed.

## 1. Confirmed rules defect, now fixed

A controlled first-round fight has two living monsters, no ordinary guard or armour, and a 20-block Shield Special on the **off-target** monster. Apply 3 splash:

| Mode | Before repair: health lost behind Shield | After repair |
|---|---:|---:|
| Solo | **3** | **0** |
| Party | 0 | 0 |

Solo `stopSplash` counted ordinary guard and armour, but omitted the Shield Special. The party guard pool already included it. Added `shieldGuard(e, 0)` to solo splash protection. Zero attack is deliberate: splash does not meet that monster's Attack goal, and a big attack against a different monster must not break its Shield.

The existing spent-guard map still spends protection only once across power/weapon/Fire-arrow splash. Six regression tests check small hits, overflow, broken shields, combined guard/armour, off-target attacks, a real Fire arrow plus power splash, solo/party parity, and the separately approved finisher exception. The patch also protects the same Shield from Fire-arrow splash, which uses the same helper.

This repair reduces damage that was incorrectly bypassing Shields in solo; it is not a new splash rule or a general splash nerf. The approved finisher damage on every monster remains unchanged.

## 2. The table measures selected outcomes, not every consequence

The old round-replay tool scores attack/pierce/splash by monster health removed, and block/heal by the one hero's health saved. That definition is explicit and useful, but its scalar result omits some effects:

- **Counterstrike:** in a controlled no-incoming-damage round, +3 block changes hero health by **0**, but returns **3 additional damage** to the monster. The current defensive metric records blue's value as 0 there. “Unused block is wasted” is not true when Counterstrike is active. Record both sides' health outcomes for every colour, and separate active Counterstrike rounds.
- **Party healing:** the existing table explicitly says solo; that limitation is acknowledged, not a hidden implementation defect. Verified through the party engine: one Mending Song roll of 4 adds **8 / 16 / 24 total health** to 2 / 4 / 6 injured heroes. A coefficient measured on a lone hero cannot price that group effect without measuring party demand and overheal.
- **Pierce has contextual value:** against a strong intact target Shield, controlled +3 red removes **0** additional monster health while +3 orange removes **3**. The old 1.05 average is not evidence that these colours are interchangeable in the new Shield puzzle.
- **Whirlwind is not a pure off-target splash bonus:** it pays normal attack to the target and splash to the others. “Splash is worth zero against one monster” does not mean Whirlwind is worthless there. Price its two allocations, then guard/overkill, rather than the die's pink appearance alone.
- **Gold and conditional payouts:** Anvil Strike pays expected 0.375 gold per rank-I d8 as well as block. Hunter's Mark adds conditional gold; Lucky Verse can return magic. Those benefits are not in the five-colour damage/health table. Crowd Pleaser is an economic choice, not an attack point.

Dividing hero health saved by monster health removed also assumes a design exchange rate between those resources. It does not establish that rate empirically. The reported 1.05 / 1.16 / 0.55 / 0.88 are acceptable provisional yardsticks for that sample, not precise universal prices.

## 3. Exact rank-I arithmetic corrections and current cards

Recomputed from the released engine, including rounding half-splash **after** the roll. Values below use the old factors solely to reconcile the old table; they are **not new recommended prices**. Damage, healing and block are potential output before guard, missing-health limits and overkill.

| Card | Current rank-I potential output | Old heuristic per magic |
|---|---|---:|
| Cleave, minimum cast | 3 magic: expected 7 attack + **3.25** splash | **3.59**, not about 3.7 |
| Cleave, full cast | 5 magic: expected 14 attack + 6.75 splash | 4.37 |
| Aimed Shot | 1 magic: expected 3.5 pierce | 3.68 |
| Arc Bolt, minimum cast | 2 magic: expected 4.5 attack + **2** splash | **3.41**, not 3.55 |
| Anvil Strike | 1 magic: expected 4.5 block + **0.375 gold** | 2.48, with gold unpriced |
| Mending Song | 1 magic: expected 3.5 healing **per living recipient** | 3.08 per recipient, before overheal |
| Magic Missile | 1 magic: guaranteed 2 pierce | 2.10; Every-Round Card, not a Dice Card |
| Rally Cry, four charges | 4 magic: 20 attack + 16 block | 7.20 |
| Volley, four charges | 4 magic: 28 pierce | 7.35 |
| Storm Coil, four charges | 4 magic: 20 attack + 10 splash | 7.90 |
| Stonehide, four charges | 4 magic: 40 block | 5.50 |
| Rising Ballad, four charges | 4 magic: 20 attack + 16 healing | 8.52 |

**Charge Card timing matters:** storing and using are mutually exclusive in one round. Verified with actual casts: charge on rounds 1–4, earliest full release on **round 5**, not round 4. A one-charge Rally Cry pays only 2 attack + 1 block, about 2.55 under the same heuristic, and cannot be used until the following round. The four-charge average is not a free payoff available in a short fight.

**The old table is historical:** it still names Frog Morph. Today's Wizard starts with Magic Missile. The five current template names remain Dice Card, Charge Card, Every-Round Card, Side-Game Card, Finisher Card; this review changes none of them.

## 4. Ranks and economic choices need their own comparison

Gold-funded ranks deliberately improve efficiency. Rank IV minimum Aimed Shot rolls 4d6 for 1 magic; minimum Arc Bolt rolls 4d8 for 2; minimum Mending Song rolls 4d6 for 1. Applying the rank-I “3.5 per magic” yardstick to those ranks would erase the upgrades players purchased. Compare each rank to its gold opportunity cost, not to a universal base-rank cap.

Likewise, rank-I Crowd Pleaser pays expected 5 gold for 2 magic; rank IV pays expected 10 for the same magic, retaining zero payouts on 1–2. Those are fight-purse expectations, not guaranteed campaign income: survival, winning and spending magic on offense/healing still matter. Keep the approved gold dice table rather than inventing an unsupported combat/gold exchange rate.

Anvil Strike's gold and the bot's limited support-card use are reasons to leave Anvil and Rising Ballad alone until better evidence exists, rather than to buff/nerf them from the old scalar score.

## 5. Next measurement handoff — implementation lead

No broad campaign rerun was started during this review: the measurement definition and confirmed rules defect needed attention first.

1. On the repaired current release, keep the paired same-state/same-seed method, but record **monster HP progress and every hero's HP change for every colour**. Keep newly summoned health and monster regrowth separate from direct damage; they are useful strategic effects, not interchangeable raw damage.
2. Report per-class/per-act results, party sizes 1/2/4/6, one/two/three-plus monsters, and real defence states (no guard, guard, armour, Shield Special). Mark Counterstrike and party-heal contexts. Sample the actual D4 and forced Special turns rather than assuming six-face frequencies.
3. Keep campaign seeds as the independent units for uncertainty; 3,133 rounds from 25 campaigns are not 3,133 independent campaigns. Report card-use coverage as well as outcomes, especially for Bard support and Hunter's Mark.
4. Check rank I and rank IV, both minimum and full Dice Card casts, and Charge Card cash-outs at 1–4 charges. Include the release turn and unused charges when fights end.
5. Use matched whole-fight/campaign outcomes to assess any candidate price change. The small prior D4 smoke comparison (Act III 3/15 → 1/15, before the current magic changes) flags late-game investigation, not a license for a blanket hero buff or monster nerf.

Finish line: report which candidate changes improve a measured problem, with uncertainty and actual card use. Keep current prices unless that evidence supports a focused change. The Director price-table review itself is complete.

## Reproduction and validation

`node tools/t31-director-review.mjs > report.json` runs exact arithmetic across all 39 cards/four ranks where applicable, controlled shield/colour/Counterstrike cases, actual 2/4/6-hero healing, and the real charge/release schedule. It never edits the rules. The old-defect expectation is available only when deliberately running the pre-repair engine with `EXPECT_SOLO_SHIELD_LEAK=1`.

- [Before repair evidence](T31-review-evidence/before.json): released a12 engine, confirms the solo leak.
- [After repair and current card audit](T31-review-evidence/after.json): parity restored; retains the other context findings.
- `node --test test/splash-shield.test.mjs`: six regression tests pass.
- `npm test`: **578/578 pass** on the current combined release. The current test count differs from the historical T33 count because subsequent changes retired Frog Morph tests and added other checks.

Production patch: one guard term in `js/engine.js`. No visual templates changed, so no new layout screenshots were needed. Real Safari and two-device Firebase play were not repeated for this pure resolution calculation.
