# T17: camp weapon purchases, 26 October 2026

Status: **DEPLOYED**, build `20261026wu1`. Dave explicitly approved publication on 26 October 2026. [PR #51](https://github.com/davepartin/questdice/pull/51) merged as `04b55af3cdbfd45e6b0ce67b8ef027b7b081f8bc`; [Pages deployment](https://github.com/davepartin/questdice/actions/runs/40416038386) succeeded and the hosted root stamp was verified. Dave supplied the live NOT YET screenshot and explicitly asked for implementation. This bounded delivery uses the current released face tables. The wider T17 cumulative face/role redesign and T23 Heart candidate are separate.

## Behavior

- Camp weapon cards buy d4 to d6 for 50 gold, d6 to d8 for 100, d8 to d10 for 200. Purchases are sequential and checked against actual owned equipment and current funds.
- Both weapon dice roll their full purchased or found size, independently of the Strength dice. This also removes the hand ceiling from existing found gear. Strength purchases retain their own effect and prices.
- Current face tables are preserved verbatim. They are not cumulative: earlier faces can change at a new size. The inspector explicitly says this, offers a preview of all next-size faces, and rebuilds every row after purchase so the card agrees with combat. This is functional size purchasing, not final T17 numerical approval.
- Resale keeps the weapon's original found-size value and recovers 50% of actual gold subsequently paid for sizes. A Bronze Dagger starts at 9 and rises to 34/84/184 after 50/100/200 paid. This is the leading recovery candidate made reviewable, not full refunds. Found d6/d8 gear does not receive imaginary paid investments. Existing unmodified gear keeps its previous resale value.
- `sizeInvestment: {from, gold}` travels with the weapon through existing local saves, table packing and transfers. No reset or new save epoch; no migration rewrites earned equipment.
- Repeated or stale co-op requests include the intended next size and cannot accidentally buy another size. Authority checks ownership, funds and camp phase. Right/left and same-type items remain independent.
- Diamonds and legendaries have no size purchases. Diamond acquisition and shattering retain current behavior. The broader `EXPERIMENT.weaponSize` remains off; its old preview behavior is preserved.
- Only camp inspection gets a buy callback. Spoils and store cards remain read-only. Selling equipped equipment still happens through the pack.
- LAN server startup now applies the same release as the phones. Without this, the authoritative LAN table refused purchases that the phone had accepted. Browser Firebase tables already initialize the release through main.js.

## Verification

- `npm test`: **450/450 pass**, including nine new engine/save/table tests and the HTTP LAN purchase regression. Full output in [unit-tests.txt](unit-tests.txt).
- `dev/weapon-upgrades.mjs`: real camp purchases through d10 at **375x548, 390x844, 430x932**, exact gold/sale changes, no skipping, insufficient-funds refusal, all current faces matching engine, no horizontal spills, actual stored save after reload, and combat rolling 10 with a d4 hand. Chromium, reduced motion. Results: [browser-checks.json](browser-checks.json).
- `dev/camp-cardboard.mjs`: existing camp/store checks exercised, including independent purchases in both weapons, Head/Hand/Talent progression, save/reload and all store purchases. Its nested price-chip run exposed a CSS specificity bug: old cover styling overrode the new poor-price red text. Fixed in css/price.css; standalone price-chip regression passed after the fix ([log](price-browser-checks.txt)), and all three weapon phone checks passed again with computed red-text assertions. Keep the original log as diagnostic history, not an all-pass claim.
- Focused assertions include all eight types, three metals, every found size, all ammunition choices, found/paid value, repeated/missing/foreign purchases, same-type ownership, duplicate references and save preservation. A purchase always recovers less than its cost, including discounted-base comparisons, so adding upgrades cannot create a profitable sale cycle.
- Rendered before/after: [before](../../../screens/weapon-upgrades/before.png), [d10](../../../screens/weapon-upgrades/upgraded-d10.png). Screenshots were inspected.

## Economy smoke

`RELEASE=1 node tools/gold.mjs 2` completed two seeded Normal campaigns for each of Knight, Ranger, Wizard, Dwarf and Bard with current released body/power prices and the new weapon purchases. Raw output: [economy-candidate.txt](economy-candidate.txt).

| Per won fight | Act I | Act II | Act III |
|---|---:|---:|---:|
| Battle gold | 44 | 102 | 232 |
| Selling spoils | 23 | 43 | 60 |
| Camp spending | 63 | 143 | 279 |
| Purse after camp | 23 | 43 | 66 |
| Rounds | 4.1 | 6.5 | 8.8 |

There are 100 won encounters per act across the ten campaign runs. The runner permits retries, aggregates classes and excludes failed attempts from these per-win summaries; this is purchase-affordability smoke, not a win-rate or statistical balance claim. Bots prioritize other upgrades before weapon sizes and do not model all human healing/sharing choices. The baseline comparison was interrupted; no paired improvement claim. This does not validate replacing all other prices with 50/100/200 or the wider unapproved cumulative/role table.

## Limits and publication

No real iPhone Safari or two-phone Firebase/Firestore end-to-end session was run. Co-op commands and serialization were tested directly and over the local HTTP transport. Current non-cumulative faces retain their existing secondary-output tradeoffs; final role/straight balance remains T17 follow-up. There are no new act gates on weapons, consistent with the existing T17 size-purchase path; other dice retain their act caps.

Automatic approval review rejected the initial documentation push directly to main because it publishes to the shared default branch without explicit deployment approval. This delivery will use a separate branch and pull request. Do not describe build wu1 as live until deployment is authorized and verified.


Publication update, 26 October 2026: the initial automatic approval block above was resolved by Dave's explicit instruction to publish and push to main. The verified implementation is live. No further approval is pending for this delivery.
