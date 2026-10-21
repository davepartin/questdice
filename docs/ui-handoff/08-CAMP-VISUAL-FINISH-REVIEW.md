# Camp material and framing checkpoint

The original illustrated concept remains the visual target. This is a bounded framing/material pass, not a claim of full visual parity.

## Implemented

- Wood-grain framing on the board, header and navigation with recessed, double-edged slots.
- Existing head/hand/feet artwork behind the dice, without adding downloaded art.
- Serif slot labels, gold selection corner marks, and blue woven surfaces for the inspector and road button.
- Existing explicit die-size labels, actual weapon portraits, face previews, costs, and upgrade handlers retained. Camp size diagrams remain static SVG illustrations, not battle rolls.
- Board width retained at 330px to avoid sacrificing phone space for ornament.

## Validation

Existing camp browser review passed: nine slots, upgrade and exact gold deduction, save/reload, focus restoration, five categories, store return, poor/max/locked states, weapon/talent access, short/tall/landscape/desktop layouts and reduced-motion repeated opening. No browser page errors. Final lighter material contrast and original board width checked again at 393x852 and 375x600.

No mechanics, engine, save format, multiplayer code or new dependencies changed. No added bitmap assets, render loops or continuous visual effects. Static CSS materials and four reused decorative images are the only new rendering work. Changed runtime CSS/JS grows by 1,794 raw bytes, or approximately 484 bytes when gzip-compressed per file. Physical iPhone Safari frame time and battery use have not been measured.

## Actual game screenshots

- [Camp board](../screens/camp-finish/board.webp)
- [Selected die](../screens/camp-finish/selected.webp)
- [Short-phone inspector](../screens/camp-finish/short.webp)

## Resume

Review branch: ui/camp-art-pass, draft PR #30. Not merged or published live.

Next work should improve the campsite atmosphere toward the reference, with a small compressed still asset only if needed. Preserve live hero identity and clear dice; do not substitute a mockup image for the functioning UI. Existing camp SVG size diagrams still differ from battle dice artwork, so review that deliberately before claiming the full concept is achieved. Continue one bounded section per checkpoint.
