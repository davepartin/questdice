# Camp Powers card integration

2 November 2026 · CAMP-01 C01-D · build `20261102zzcamp3`.

The camp Powers tab now uses the same reviewed paintings, frame, corner emblems, role colors, effect rows and cardboard rank covers as battle. Choose Big move / Every round / Charge, then a role-colored power tile. The selected card keeps one width and aspect ratio. Learn & equip, Equip or Upgrade sits above it; these still call the existing authoritative `HE.learnPower`, `HE.equipPower` and `HE.upgradePower` paths. Prices, rules, save format and training availability are unchanged. Two-choice libraries fill their row; hero changes reset retained camp scroll.

`magiccard.js` exports presentation-only `campCard(hero,id,{glyph})` and `campChoice(...)`. The adapter gets the class card and derives rank/cost with engine helpers, without a battle object or mutation callbacks. Camp shows magic-to-dice conversion, Grudge's damage-past-block formula, Meteor's round formula and charge payout tracks. No reserved magic, stored charge selection, current round or current damage is invented. Large-text Card rules remain available below the physical card. Camp artwork and quest trail compact while browsing Powers, with one vertical scroll.

## Existing fourth-rank mismatch

The engine already sells three upgrades (50 / 90 / 140), reaching displayed rank IV. The old battle renderer hardcoded only ranks I–III, so a rank-IV purchase had no active effect row. Camp now prints all legal ranks. Battle retains the reviewed three-row layout at ranks I–III and expands only at rank IV. Finite Grudge/Polymorph tables clamp to their last value in presentation exactly as casting does; the rank-IV Grudge bonus and Polymorph pierce and success ranges no longer display a fallback value. This changes presentation, not rules or prices.

Some finite power tables have no additional effect at rank IV (Grudge and Polymorph). The engine already offers that purchase; this task preserves it and displays the actual unchanged effect. Track any cap/price change with CAMP-02 economy work rather than inventing a new bonus here.

## Verification

550 full game tests pass. The browser harness checks 408 camp + 408 battle layouts (34 cards × 4 ranks × 3 phone sizes) with correct aspect ratio, costs, effects and active bounds. Integrated checks cover all heroes, learn/upgrade/equip amounts, inspection without spending, level/affordability gates, save/reopen and three sizes plus larger text. No page errors. Rendered evidence was inspected; headless Chromium is not Safari. See [evidence](camp-powers-evidence/README.md).

## Next work

C01's shared camp power presentation is implemented. The broader Gear/Store/Hero material and interaction review and CAMP-02's training-price study remain. The training candidate remains isolated; Heart 4 stays +2 gold. Preserve other owners' T24 engine and Specials screen work.

## Team integration

Merged released team heads e5c9942 and 8278891 before publication, retaining Monster Specials, the monster target picker, their imports/styles and the potion tray position fix. Repeated the 816-layout matrix and integrated purchase/save/phone checks on the combined source. Added potion tray before/after-result position checks at all three sizes (less than 1px shift). Preserved the released Polymorph Charge rebalance. Camp displays potential d6 success ranges via `E.frogNeed` / `E.frogRange`, the 1-magic charge cost and clamped pierce bonus, without inventing a current stored charge. The repeated card matrix and purchase checks include this new rule.

Retained the subsequent Monster mini-card update (1959e1b) and its imports/stamps before publishing. It does not change the camp card adapter; its scripts parse, and all 550 game tests and 816 card layouts passed on the integrated camp/Polymorph source.
