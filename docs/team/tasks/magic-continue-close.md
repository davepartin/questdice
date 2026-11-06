# Continue closes Magical Powers so the totals can fly to the counters

6 November 2026. Dave, from his iPhone: after a magic card's roll or Use, tapping **Continue** left the Magical Powers page up, so he could not see the coloured totals float to the matching battle counters.

## What was wrong

`cardRoll` / `cardCast` already clone the totals onto the page and `floatAway` aims them at Attack (red), Pierce (orange), Splash (pink), Block (blue), Heal (green), Gold (gold) and Magic (purple). The Magical Powers sheet is a full-screen overlay (`.b3-sheet.open:has(.mc-sheet)`, `inset: 0`, `z-index: 60`). Continue waited ~900 ms, then `doCard` refreshed the sheet and kept it open. The board and the counter row stayed covered.

## What Continue does now

1. Clone each coloured total where it sits on the card (so the start point is still the card).
2. Close Magical Powers immediately (`togglePowers(false)`), the same path as the sheet's Close button.
3. Aim each ghost at the now-visible counter chip of that colour, and start the existing 1.2 s float.
4. After the Continue wait, refresh the HUD and bump the counters. The sheet stays closed.

Charge Cards that only store a charge still have no Continue (`chargeLit`); that path is unchanged. Charge Use and Finisher Cards already share Continue with Every-Round Cards, so they get the same close-then-float.

No card rules, prices, dice, templates, or destination colours changed.

## Checks

- `npm test` — 578/578
- `node --check` on `js/g3/powers.js` and `js/g3/battle3d.js`
- `CHROME=/opt/google/chrome/chrome node dev/card-roll-check.mjs` — all passed. Cleave, Showboat, Battle Hymn, Crowd Pleaser, Arc Bolt: Continue closes `.b3-sheet.open` at 250 ms with coloured `.mc-res-fly` ghosts in flight; after the float the matching counters fill (Cleave +10 attack / +5 splash, Crowd Pleaser +5 gold, and so on).
- `CHROME=/opt/google/chrome/chrome node dev/card-cast-check.mjs` — all passed. Every-Round (Counterstrike, Shield Up, Hunter's Mark, Quick Draw, Snare, Magic Missile, Grudge), Charge Use (Rally Cry, Storm Coil, Stonehide), Finisher (Judgment, Rain of Arrows, Meteor): the same close-then-float.

Headless Chromium, not Safari. No new ask for Dave.
