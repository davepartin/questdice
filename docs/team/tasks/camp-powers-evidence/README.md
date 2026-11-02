# Camp Powers evidence — 2 November 2026

Build `20261102zzcamp3`. Harness: `node dev/camp-powers-check.mjs` (full), `CAMP_RENDER_ONLY=1` (card matrix), `CAMP_UI_ONLY=1` (integrated purchases and navigation). Uses headless Chromium with reduced motion, not iPhone Safari.

- 408 camp layouts: all 34 class cards, ranks I–IV, at 390×844, 430×932 and 375×667. Actual 720:1052 aspect ratio, active row bounds, rank-aware costs, no hero mutation, no horizontal overflow. Formulas replace invented battle damage/rounds; charge tracks show potential payouts.
- 408 battle layouts: the same cards/ranks/sizes inside the six-tile magic sheet. No active effect overflow; fourth-rank Grudge shows damage 7 + bonus 6 = 13. Ranks I–III retain their existing layout; rank IV adds its active row.
- Integrated UI: all five heroes, exact 50-gold learning and 50-gold first upgrade, free equip, zero-gold and hero-level gates, fourth-rank Polymorph charge cost 1 and correct d6 success ranges, no Cast/Roll/Charge actions, save/reopen retains purchase and loadout, three phone sizes and 20px root text. No page errors. Camp uses one vertical scroll to read the full card.
- `npm test`: 550 passed.

Screens: the full browsing context (`camp-knight`, `integrated-375`), scrolled complete cards (`camp-card-dwarf`, `camp-card-ranger`), larger text, and printed charge/round formulas (`card-rally`, `card-meteor`). Raw matrix and transaction results are included.

Repeated on the merged team source (Monster Specials, target picker, potion fix and Polymorph Charge rebalance preserved). The harness also confirms the potion tray stays in place when the result line appears at each phone size.
