# Head icon alternatives (Crockpot / Grok Bot, 25 Oct 2026) — mockup only

`helmets.html` (+ `heads.js`, `helmets.js`, `shoot-helmets.mjs`) shows the current helmet and 4 options
(A nasal helm, B hood, C circlet, D visored great helm) carved in the board slot, on a head-die face, and on the Head card.
All paths use the same 100x100 box + evenodd fill as `js/gfx/dice/faces.js`, so a swap is one string.

## Where the helmet lives (swappability)
Mostly **one source**: `SVG.helmet` in `js/gfx/dice/faces.js` (line ~36, plus `evenodd` set line ~52). Drawn live from it:
- `js/gfx/dice/tray.js` `SLOT_ICON.head` — the carved icon in the Head slot of the 3D dice tray.
- `js/gfx/dice/art.js` ~207 — the Dwarf class emblem.
- `js/g3/cards.js` FOCUS map (thinker / bright → `helmet`) uses `assets/cards/objectives/emb-helmet.svg`, which is **generated**
  from the same path by `docs/team/mockups/cards/objectives/make-emblems.mjs` → re-run after a swap.
- dev sheets (`dev/iconsheet.mjs`, `dev/bodymarks.mjs`) and mockups (diceboard, objective fronts) import it too.
**Copies that would NOT update automatically:**
- `assets/tutorial/board-*.webp` (board-icons, board-start, board-d-*) — baked images with the helmet carved in; used by
  `js/g3/tutorial.js` and the dice-board mockup background → must be re-rendered.
- `js/mat.js` ~114 — a separate older SVG `helmet()` used by the legacy character mat (`js/view.js` / `js/ui.js`).
- `assets/dice/heads/*.png` + `js/gfx/dice/bodywm.js` — per-class head watermarks; the module doesn't appear to be imported.
- frozen snapshots under `preview/` (ignore).
