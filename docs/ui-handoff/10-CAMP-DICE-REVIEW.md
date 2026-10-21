# Camp dice and face previews

Superseded: Dave requested the actual battle dice, including weapons. Read 11-ACTUAL-DICE-REVIEW.md. The silhouette approach below was replaced.

October 21, 2026. Review branch `ui/camp-art-pass`, draft PR #30. Not merged or deployed.

## Implemented

Camp body/talent/heart dice now use the battle face definitions, carved numeral paths and symbol paths. Body dice are ivory, talent dice teal, and heart dice dark with a colored boost symbol. Existing weapon portraits and weapon face previews are retained.

The displayed face is an explicitly labeled example (highest numbered face), not a rolled result. d4/d6/d8/d10 size labels sit separately in the tile footer or below the inspector illustration. The underlying perspective silhouettes remain lightweight static SVG, not the complete battle 3D mesh/material renderer.

Body-die inspectors include an All faces disclosure with the current and next die. Every face has a readable value/symbol caption and image alternative. Heart inspection includes all six boost symbols. Existing talent face editing remains intact.

## Source and performance

`campSpec` reads a clone of the hero to avoid legacy-field initialization mutating live state. `dieSpecs` accepts an optional visual preview-size override; existing battle callers keep their original default behavior. All game rules, costs, purchases, save formats and multiplayer mutations are unchanged.

Still face ink uses the existing shared numeral and symbol drawing helpers on small 2D canvases. A 96-entry bounded cache stores the resulting data URLs. No new downloaded art, WebGL context, texture atlas, animation loop or dependency. Approximately 1.8 KB additional gzip-compressed runtime code. Physical iPhone Safari memory, frame time and battery use have not been measured.

## Verification

- `dev/camp-art-review.mjs`: passed the existing camp upgrade/save/focus/category/store/poor/max/locked/weapon/talent/responsive/reduced-motion checks, no page errors.
- `dev/camp-dice-review.mjs`: 125 class/slot/size preview cases match battle specifications and leave heroes unchanged. Current six and future eight face listings checked; upgrade to d8 deducts exactly 100 gold and survives save/reload. Six heart boosts verified. Talent editor and short-phone purchase remain reachable, no horizontal overflow or page errors.
- Actual screenshots inspected. Corrected d8 symbol clipping; checked d10 and removed duplicate size text in the heart inspector.
- No full battle-rule test rerun for this UI-only pass.

Run either browser script with Playwright and `CHROMIUM_PATH` set. They use disposable local saves and block cloud authentication/database requests.

## Actual running-game screenshots

- [Board](../screens/camp-dice/board.webp)
- [Selected die](../screens/camp-dice/selected.webp)
- [All current and upgraded faces](../screens/camp-dice/faces.webp)
- [Heart](../screens/camp-dice/heart.webp)
- [d10](../screens/camp-dice/d10.webp)
- [Short phone](../screens/camp-dice/short.webp)

## Resume

Next bounded section: the battle magic-powers triangle and casting details. Preserve all spell mechanics, magic costs, charge/recharge behavior and multiplayer authority. Continue on the same review branch and leave actual screenshots before publishing.
