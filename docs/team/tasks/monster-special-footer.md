# Monster card Special footer — 3 November 2026

Dave asked for the Special at the bottom, colored when active and gray when inactive. Each card has a bottom-anchored Special section labeled Active, Inactive or None. Active abilities retain their own colors and the team's gold reveal; inactive and absent states are gray. The card continues to scroll on short screens. [Phone screenshot](monster-special-footer-evidence/active.webp).

The latest team build already provided the two-second dice animation, highlighted rolled move, only the current move's full details, and same-name move faces on consecutive numbers. Those changes are retained. An existing fight now keeps its current rolled face and move but groups its monster's faces at the next roll; already-grouped arrays retain identity so the optional move bag continues to work. Each move keeps all its original faces and probabilities.

Validation: `dev/special-footer-check.mjs` checks active/inactive/none, distinct colors, bottom placement and four phone sizes (390×844, 430×932, 375×667, 375×548). `test/movedie.test.mjs` checks saved-round migration and stable identity; `test/specials.test.mjs` covers monster Specials. Full suite and headless Chromium checks are recorded on the team board. Chromium is not Safari.
