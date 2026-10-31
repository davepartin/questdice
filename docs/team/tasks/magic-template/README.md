# Magic card template, first card: Rally Cry

Build 20261030rt1. Dave approved the Rally Cry mockup. Implement this card first, then review the others individually. The approved shell now covers Knight and Wizard cards via usesCardTemplate and mc-reviewed-template. No engine, balance, costs or save changes.

## Shared design decisions

- Roman numerals I, II, III. No word Level or circular rank badge. Current numeral at the bottom left, per Dave's final placement.
- Title in the band beneath the painting. Matching menu/power glyph in the painting's upper left; selected magic cost in its upper right.
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
| Knight | Cleave | Dice | Implemented, awaiting visual feedback |
| Knight | Judgment | One-shot | Implemented, awaiting visual feedback |
| Knight | Shield Up | One-shot | Implemented, awaiting visual feedback |
| Knight | Riposte | One-shot | Implemented, awaiting visual feedback |
| Knight | Press the Attack | One-shot | Implemented, awaiting visual feedback |
| Knight | Rally Cry | Build | Implemented, awaiting visual feedback |
| Knight | Second Wind | Build | Implemented, awaiting visual feedback |
| Ranger | Aimed Shot | Dice | Individual review pending |
| Ranger | Rain of Arrows | One-shot | Individual review pending |
| Ranger | Quick Draw | One-shot | Individual review pending |
| Ranger | Hunter's Mark | One-shot | Individual review pending |
| Ranger | Snare | One-shot | Individual review pending |
| Ranger | Volley | Build | Individual review pending |
| Ranger | Vanish | Build | Individual review pending |
| Wizard | Arc Bolt | Dice | Implemented, awaiting visual feedback |
| Wizard | Meteor | Build | Implemented, awaiting visual feedback |
| Wizard | Magic Missile | One-shot | Implemented, awaiting visual feedback |
| Wizard | Polymorph | One-shot | Implemented, awaiting visual feedback |
| Wizard | Barrier | One-shot | Implemented, awaiting visual feedback |
| Wizard | Storm Coil | Build | Implemented, awaiting visual feedback |
| Wizard | Healing Light | Build | Implemented, awaiting visual feedback |
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

## Round flow correction, 20261030rt2

Dave reported the card disappearing after charging and both controls disabled on the next round. The controller deliberately cleared every selected power after casting; charge powers now retain their track. The existing reset phase requires rolling the battle dice before using magic. Rally Cry now says “Roll your dice first” with a Back to dice action instead of leaving two unexplained disabled controls. A spent-round message also explains the exclusive charge/use choice. No engine rule change.

`dev/rally-round-check.mjs` passes at 390x844 and 375x667: real Charge button spends one magic, track stays visible, both actions lock that round; engine beginReset starts next round, guidance appears, Back to dice closes the sheet, actual Roll button rolls, Charge re-enables, and clicking stores the second charge with the card visible. This is a bounded browser flow using the real round transition, not a complete battle resolution or Safari check. Five existing knight/charge-use tests pass. [Reset guidance](roll-first.webp).

### Feedback refinement, 20261030rt3

Dave removed the charged/used explanation: grey disabled buttons are sufficient. Do not put that paragraph back. Pre-roll guidance is separate and remains.

## Knight family rollout

All seven Knight cards now use the shared shell. [Details, artwork limits and screenshots](knight/README.md). Other heroes remain pending individual review.

## Wizard family rollout

All seven Wizard cards now share the shell. Costs, dice and effects preserved. [Details, shared-art limits and screenshots](wizard/README.md).
