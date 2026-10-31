# Magic card template, first card: Rally Cry

Build 20261030rt1. Dave approved the Rally Cry mockup. Implement this card first, then review the others individually. Production styling is deliberately scoped to Rally Cry, via usesBuildTemplate and mc-build-template. No engine, balance, costs or save changes.

## Shared design decisions

- Roman numerals I, II, III. No word Level or circular rank badge. Current numeral at the upper left.
- Title in the band beneath the painting. Matching menu/power glyph in the painting's upper right.
- No BUILD tag, cadence band or redundant charged/attack/block paragraph on this card. The two colored rows show the progression; selected charge keeps its outline.
- Charge OR Use above the card. Engine already makes these exclusive per round. Preserve both engine checks and disabled button states.
- Upgrade covers retain one parchment texture, with rank left, effects middle and a fixed-width price column right. Price reads as ink, without a separate pill. Rank II 50 and III 90 come from shared POWER_UPGRADE data.
- Text/numbers/icons remain DOM/SVG, not baked into a screenshot. Reuse the existing painting, frame and cover texture.
- Future templates: Build, Dice and One-shot. Reuse shell/price alignment; keep specialized effect displays. Do not migrate the whole library until each card's review.

## Evidence

Five existing knight/charge-use tests pass. Real battle fullscreen checks at 390x844 and 375x667 pass with no scroll or page errors. dev/rally-template.mjs checks engine-derived rank I/II/III displays and cover prices at both sizes. Chromium only; no Safari or fresh two-client verification claimed. No campaign simulations.

[Real battle screenshot](rally.webp).

## Card checklist

Existing cards are already implemented in the game. The status below concerns adoption of this new approved design.

| Hero | Card | Family | New template status |
| --- | --- | --- | --- |
| Knight | Cleave | Dice | Individual review pending |
| Knight | Judgment | One-shot | Individual review pending |
| Knight | Shield Up | One-shot | Individual review pending |
| Knight | Riposte | One-shot | Individual review pending |
| Knight | Press the Attack | One-shot | Individual review pending |
| Knight | Rally Cry | Build | Implemented, awaiting visual feedback |
| Knight | Second Wind | Build | Individual review pending |
| Ranger | Aimed Shot | Dice | Individual review pending |
| Ranger | Rain of Arrows | One-shot | Individual review pending |
| Ranger | Quick Draw | One-shot | Individual review pending |
| Ranger | Hunter's Mark | One-shot | Individual review pending |
| Ranger | Snare | One-shot | Individual review pending |
| Ranger | Volley | Build | Individual review pending |
| Ranger | Vanish | Build | Individual review pending |
| Wizard | Arc Bolt | Dice | Individual review pending |
| Wizard | Meteor | Build | Individual review pending |
| Wizard | Magic Missile | One-shot | Individual review pending |
| Wizard | Polymorph | One-shot | Individual review pending |
| Wizard | Barrier | One-shot | Individual review pending |
| Wizard | Storm Coil | Build | Individual review pending |
| Wizard | Healing Light | Build | Individual review pending |
| Dwarf Warden | Anvil Strike | Dice | Individual review pending |
| Dwarf Warden | Avalanche | One-shot | Individual review pending |
| Dwarf Warden | Grudge | One-shot | Individual review pending |
| Dwarf Warden | Shield Bash | One-shot | Individual review pending |
| Dwarf Warden | Brace | One-shot | Individual review pending |
| Dwarf Warden | Stonehide | Build | Individual review pending |
| Dwarf Warden | Forge Fury | Build | Individual review pending |
| Bard | Mending Song | Dice | Individual review pending |
| Bard | Finale | One-shot | Individual review pending |
| Bard | Lucky Verse | One-shot | Individual review pending |
| Bard | Discord | One-shot | Individual review pending |
| Bard | Rising Ballad | Build | Individual review pending |
| Bard | Hymn of Gold | Build | Individual review pending |
