# T35 — Splash as a Talent symbol

Dave explicitly requested **Add splash** after finishing the compact Talent layout.

Splash is the sixth choice alongside Attack, Block, Magic, Heal and Gold. It uses the existing pink three-way fork from the dice/cards/HUD. A bought face pays its printed number as Splash to **every other monster**, not the chosen target. Each recipient's guard, armour and Shield still protect it. With no other monster, Splash adds no damage. It uses the existing face price and the two-of-one-symbol-per-die limit; occupied faces still require clearing with no refund before replacement.

The existing generic Talent evaluation already pays a symbol's printed face value into `out[symbol]`, and the existing solo/party damage paths already consume Splash. No engine resolution, monster rules, save schema, prices, or layout redesign is necessary. The change adds the symbol definition/legacy caption, camp icon/help/colour, and pink colour support for face art and legacy chits. The latest teal die portraits and numbered rows remain intact. No other Talent gains or weapon effects are changed.

Validation:

- Six meaningful regression cases cover standard purchasing/caps/no-refund replacement, face values 4/6/8/10 and packed heroes, actual solo resolution with three/one monsters, ordinary guard and Shield overflow, actual two-hero resolution, and authoritative table operations plus table save/load.
- Browser flow: six choices, Splash purchase and saved hero round-trip for all five heroes; actual die portrait and numbered row; the two-Splash cap; a d10 face purchase on a 375×548 phone with enlarged text and a reachable Done button; no page errors.
- Evidence: [picker](../../../talent-splash-evidence/splash-picker.webp), [d6 card](../../../talent-splash-evidence/splash-d6.webp), [short phone](../../../talent-splash-evidence/splash-short-phone.webp), [browser results](../../../talent-splash-evidence/results.json).
- Reproduce: `npm test`; `node dev/talent-splash-check.mjs /workspace/t35-browser`.

Browser evidence is touch-sized Chromium rather than native iOS Safari. Authoritative co-op behavior is tested through actual table commands and resolution, not a live two-device session. Existing prices are retained for this addition; Splash's value naturally rises with the number of other unprotected monsters. Build `20261106ts1`.

Final validation: **584/584 tests pass** (including the six new regressions); focused browser checks pass all five heroes, six choices, saved purchases, the two-Splash cap, real portrait rendering and the enlarged-text short-phone case. No browser page errors.
