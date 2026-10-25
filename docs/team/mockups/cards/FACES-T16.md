# T16 die-shaped faces (presentation only, CONCEPT)

**T16b (current main layout, Dave):** `shapes.js` draws every weapon face as inline SVG in a progression: faces 1-4 d4 triangles, 5-6 d6 squares, 7-8 d8 diamonds (rhombus), 9-10 d10 kites. Rows: d4|d6, then d8|d10, with a fine gold rule between groups. Game weapon-face colours (js/gfx/dice/faces.js:388), gold bevel lit from the upper left, number + attack/block symbol + bonus icons centred on each shape's centroid. Shapes sized by area, not bounding box. Used by `die-card.html`, `ladder.html`, `nested.html`. The earlier game-renderer path (`dieface.js`) remains for reference.


- `die-card.html?id=&metal=&size=&ammo=` – weapon card with faces drawn by the game's own `faceImage()` (js/gfx/dice/dice.js, polygons from poly.js) via `dieface.js`; d4 triangle, d6 square, d8 triangle (the true d8 face; it read better than a rhombus and matches the 3D die), d10 kite. `&mode=ladder` = Dave's variant: each face keeps the shape of the smallest die that has it.
- Faces come from `weaponFaces()` after `applyRelease()` (roster.js). Under each face: starburst = attack, shield = block (shape, not colour) plus bonus icons. Blanks are dimmed.
- `ladder.html` – one weapon d4→d10; gold ring = face differs from the same face one size down. Bottom = pack/inventory rows.
- `nested.html` – **CONCEPT, proposed rule, not decided**: nested faces, Bronze/Silver/Gold Dagger, d6–d10 dimmed as locked (no prices). Icon placement illustrative, not balanced. No game data changed.
- `face-ladder-check.mjs` – `node face-ladder-check.mjs` prints which lower faces change at each size for every weapon and metal.

## Does a bigger die keep the lower faces? (released data, `weaponFaces` js/engine.js:101)
No, for every active sized weapon. Each size is a fresh spread, so lower faces reshuffle (numbers or bonus icons). Examples, Silver: Dagger d6 changes 3,4; d8 5,6; d10 6,8. Axe d6 2,3,4; d8 4,5,6; d10 3,4,6,7,8. Round Shield Gold d10 changes 2-8. Only Bronze Bow keeps its faces from d6 up (d6 changes 3). Fixed-face items (fists, legendaries) keep all faces because they don't scale. Full table: run the script.
