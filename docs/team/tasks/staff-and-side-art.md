# Staff metal wides and six side-game paintings

Shipped 6 November 2026 (build 20261106a13). Dave said go. No new ask.

## Staff

Bronze, silver and gold product shots, same metal-wide pattern as the Dagger:

- `assets/cards/weapons/staff-bronze-wide.webp` (1280×720)
- `assets/cards/weapons/staff-silver-wide.webp`
- `assets/cards/weapons/staff-gold-wide.webp`

`weaponArt17` in `js/g3/cards.js` picks `staff-<metal>-wide.webp` the same way it picks `dagger-<metal>-wide.webp`. Staff is in the baked-metal set, so store icons use `staff-<metal>-128.webp` / `64`. Those squares (and the 512s) are crops of the new wides, not different paintings. `staff-wide.webp` stays as a silver fallback for a Diamond or anything else without a metal wide.

The old Barrier crop is gone from the live Staff card. Other weapon art was not touched.

## Six side-game cards

New files. The paintings they used to borrow are still on those other cards.

| Card | File | Used to borrow |
|---|---|---|
| Crowd Pleaser | `assets/cards/magic/bard-crowdpleaser.webp` | Hymn of Gold (`bard-goldhymn`) |
| Battle Hymn | `assets/cards/magic/bard-battlehymn.webp` | Mending Song (`bard-mending`) |
| Showboat | `assets/cards/magic/knight-showboat.webp` | Rally Cry (`knight-rally`) |
| Field Dressing | `assets/cards/magic/knight-fielddressing.webp` | Counterstrike (`knight-riposte`) |
| Thief's Gambit | `assets/cards/magic/ranger-thiefsgambit.webp` | Hunter's Mark (`ranger-mark`) |
| Whirlwind | `assets/cards/magic/dwarf-whirlwind.webp` | Forge Fury (`dwarf-forgefury`) |

Each card's `art` field in `js/data.js` points at its new file (`powerArt` in `js/g3/magiccard.js`). No rules, prices or dice changed.

## Checks

- `npm test` (573 pass), including Staff metal-wide wiring and `powerArt` for the six new cards and the six they used to borrow.
- Headless Chrome: Staff bronze/silver/gold cards load `staff-<metal>-wide.webp`; the six side-game cards load their new files; Hymn of Gold, Mending Song, Rally Cry, Counterstrike, Hunter's Mark and Forge Fury still load their originals. Chromium, not Safari.
