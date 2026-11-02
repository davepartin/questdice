# Camp phone evidence

Final build 20261102camp1. Run `node dev/camp-upgrades-check.mjs` from the repository root. Screenshots use Chromium with reduced motion, not Safari. All three D4 workbench palettes fit in the viewport: 390×844 (bottom 654px), 430×932 (691px), 375×667 (577px). Larger text and a grown D6 can scroll vertically; no horizontal overflow.

- `overview-live.webp`: released upgrade ledger and category navigation.
- `talent-390.webp`, `talent-375.webp`: growth, all faces and five symbol choices.
- `training-preview.webp`: the three candidate stat tracks; separate preview only.
- `talent-large-text.webp`: 20px root text after buying Magic and growing to D6; current symbol retained.
- `results.json`: all-five-hero navigation, screen bounds, exact purchases and isolated saved training ranks. Zero page errors.

Full game suite: 534 passed. Focused camp/rules rerun after final styling: 16 passed. See ../camp-implementation.md for remaining balance and camp-card work.
