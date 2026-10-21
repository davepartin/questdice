# Quest Dice UI Handoff

Start with [00-START-HERE.md](00-START-HERE.md), then use the [builder prompt](01-BUILDER-PROMPT.md).

## Documents

- [Project context and starting instructions](00-START-HERE.md)
- [Copy-and-paste builder prompt](01-BUILDER-PROMPT.md)
- [Design direction and phased build plan](02-DESIGN-AND-BUILD-PLAN.md)
- [Acceptance checks and director review](03-ACCEPTANCE-AND-REVIEW.md)

## Implementation checkpoints

Current review branch: `ui/camp-art-pass`, draft PR #30. Read these checkpoints before starting new work:

- [Camp artwork and body dice](04-CAMP-ART-REVIEW.md)
- [Weapon workshop](05-WEAPON-WORKSHOP-REVIEW.md)
- [Talent die editor](06-TALENT-WORKSHOP-REVIEW.md)
- [Camp power library](07-CAMP-POWERS-REVIEW.md)
- [Camp material and framing pass](08-CAMP-VISUAL-FINISH-REVIEW.md)
- [Painted campsite](09-CAMPSITE-ART-REVIEW.md)
- [Camp dice and face previews](10-CAMP-DICE-REVIEW.md)
- [Actual battle dice portraits, supersedes camp approximations](11-ACTUAL-DICE-REVIEW.md)
- [Battle magic-powers layout](12-BATTLE-POWERS-REVIEW.md)
- [Magic screen visual finish and equilateral geometry](13-MAGIC-VISUAL-REVIEW.md)
- [Phone flow review and portrait loading](14-PHONE-FLOW-REVIEW.md)

Latest direction: bring camp toward the original illustrated reference before the battle powers triangle. Board framing, materials and the painted campsite are implemented. Camp now renders the actual battle die meshes/materials to still portraits, including weapons, with the highest numeric face displayed. The earlier SVG approximation has been removed. Battle magic powers now has separate class-power and helper choices, persistent resource totals, and a scrollable detail/cast panel. The magic screen visual finish in checkpoint 13 adds a textured violet backdrop, exact equilateral geometry and a tactile spell card. The linked phone journey now verifies camp, an upgrade, Store return, road, quest entry, a real roll/cast and save reopening. Portrait loading/failure states are explicit. Next: Dave’s visual review and physical-phone performance check before publishing or expanding scope. Work one section at a time, preserve mechanics, and leave screenshots and a resume checkpoint before moving on. These checkpoints supersede the original Phase 1 starting instruction below.

## Original builder instructions

Read docs/ui-handoff/00-START-HERE.md and the other documents in that folder. Begin Phase 1 only, following 01-BUILDER-PROMPT.md. Preserve mechanics and phone performance. Work on a separate branch and return screenshots and the review report before publishing game changes.

This folder contains the original plan and actual implementation review checkpoints. The review branch contains UI changes; they have not been merged or deployed live.
