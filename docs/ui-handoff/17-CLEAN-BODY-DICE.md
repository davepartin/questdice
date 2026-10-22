# Four clean shared body dice

Dave's decision on 22 October 2026 supersedes the corner-icon pilot in checkpoint 16: remove all die watermarks and corner identity marks. Head, both hands and feet use the same white body die for a given size. Only the result number and its effect symbols belong on a face.

## Implementation

`bodyfaces.js` owns four immutable face sets: d4, d6, d8 and d10. They use the existing FACE_PAY values, with identical labels and artwork keys across all classes and body slots. Atlas and rounded-geometry caches therefore reuse the same art/mesh per size and quality. Each slot still has its own independent physical die instance and rolled value.

Removed the corner silhouettes, watermark painting, asynchronous watermark loading/rebuild hooks, camp portrait watermark wait and the decorative body watermarks behind camp cells. The game no longer imports the old body-watermark module or downloads its head/glove/boot images. The old module/assets remain as historical source material, outside the game import graph. The legacy development `setBodyMarks` export is a no-op so old capture tools cannot restore the marks.

The existing clean materials and readable side lighting are retained, including the d6's satin/inset-number finish. Weapon, talent and heart gameplay symbols remain. Die sizes, face payouts, physics, roll outcomes, upgrades and saves are unchanged. No downloaded artwork or render passes were added.

## Verification

- Unit check: all four canonical face sets preserve every FACE_PAY value and cannot be mutated by one slot at the expense of another.
- Browser check `dev/clean-body-review.mjs`: 80 combinations across five classes, four sizes and four body positions share exactly four atlases/geometries at a given quality. No body identifiers remain and no watermark images are requested.
- Actual d4/d6/d8/d10 battle throws settle on requested results; screenshots and actual camp portraits render with no page errors. See `docs/screens/clean-body/`.
- Full suite: 332 pass and the same 2 previously observed server-test failures out of 334. These are `two phones can sit, and a lock stays private on the wire` and `a hero takes their seat back from a new phone after the game has started`.

Cache stamp: `20261022cleanbody1`. This is the current visual direction for body dice. Do not restore class hats, gloves, boots or watermarks to die faces.
