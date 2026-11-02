# Camp implementation — 2 November 2026

CAMP-01/02 first integrated release, build `20261102camp1`.

## Released behavior

- Dice and Hero have **All upgrades** access. A physical card-stock ledger names each die-size purchase, talent face customization, equipped power ranks, belt/reroll upgrades and pet offer. Prices and gates come from engine helpers; talent face prices are distinct from die growth. Categories jump to their sections; Store and Gear stay connected.
- A talent die opens one compact workbench. The D4 → D6 → D8 → D10 rail and next-size purchase are always visible. Current faces and all five symbol choices are present together; the first empty face is selected initially. Fixed faces, same-symbol limits and explicit buy/clear actions remain. Existing face purchases and growth use the same authoritative handlers and preserve symbols.
- Workbenches and the upgrade ledger compact the decorative camp scene and quest trail on phones. Normal Dice browsing keeps the scene and dice board. Closing returns to the board and restores focus.
- The six temporary next-fight Store boosts are retired. `storeTonics` returns no offers, `buyTonic` rejects stale/online calls without a charge. Existing paid blessings and their personal targeting/expiry stay intact. Potions, permanent weapons and weapon bundles remain. Owned Diamonds and loot are preserved.
- Hero summaries use rank formulas instead of raw development copy. Counterstrike explains its return attack; Polymorph explains the frog and extra pierce. Camp power magic costs respect upgrades (rank III Polymorph costs 2); player-facing ranks begin at I.
- Tab switches reset retained scroll so Hero's heading is visible after a long Powers page. This corrects stale scroll; the originally reported intermittent Hero failure had no proven root cause and is not claimed universally fixed.

## Training candidate, separate from live rules

[Open camp training preview](https://davepartin.github.io/questdice/preview/camp-training/). This small entry page shares current root assets and uses the existing `preview-camp-training` save namespace. No cloud or online tables. Create a preview hero, reach camp and use **All upgrades**.

| Track | Effect per rank | Marginal costs |
| --- | --- | --- |
| Maximum health | +4 | 50 / 100 / 180 gold |
| Starting magic | +1 | 75 / 150 / 250 gold |
| Magic capacity | +2 | 40 / 80 / 140 gold |

Three ranks; the next rank requires Act I/II/III. These are the CAMP-02 **test candidates**, not validated release prices. Canonical `hero.training` ranks default to zero and are bounded on migration. They preserve perks, class baselines and existing bonus HP. Derived bonuses apply to both solo and party battle creation only while this candidate is enabled. Root play ignores the candidate ranks and rejects purchases.

`trainingInfo` supplies current/next/cost/rank/gate/reason; `buyTraining` validates the candidate switch, camp context, known track, finite gold, affordability, act and expected rank. The expected rank prevents a stale double click buying the following rank. Starting magic refuses a purchase that would have no effect until capacity grows. The table command retains authoritative phase/seat checks; candidate online transport remains disabled by the preview sandbox.

## Validation

- `npm test`: **534 passed**, including old paid boost retention, rejected stale Store transactions, training release-off behavior, migration, every class with perks, solo/party stat derivation, exact/insufficient payment, act/rank gates, duplicate requests, invalid gold and authoritative seat ownership.
- Browser harness: `node dev/camp-upgrades-check.mjs`. Phone sizes 390×844, 430×932, 375×667, plus 20px root text. Real pointer purchases set a talent symbol, grow the die, preserve the symbol and deduct the exact prices. Training purchases change stats and save only in the preview namespace. All five Hero tabs and upgraded Polymorph are exercised, along with Store retirement and repeated/long-scroll navigation.
- Final rendered screenshots and results are in `camp-implementation-evidence/`. Chromium with reduced motion for deterministic layout; no claim of iPhone Safari verification. An earlier normal-motion pass also completed transactions and all three sizes. Parallel full-suite/browser runs produced occasional headless pointer-action timeouts without a page error; final verification is run separately.

## Remaining plan work

This release is the first integrated camp slice, not a claim that every camp card has been replaced. C01's reusable full reviewed power-card adapter and broader Gear/Store art consistency remain. C02-B's matched-seed spending/survival study still gates release of training prices. The five-campaign pilot is not sufficient balance evidence. Heart face 4 stays **+2 gold**; no income buff was made.
