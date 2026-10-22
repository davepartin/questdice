# Ivory d6: inset identity and material pilot

Dave authorized implementation and deployment on 22 October 2026, noting the game is in development. This follows the five corner-icon concepts and the proposal to prove the finish on an actual d6 before extending it to other shapes.

## Visible result

Six-sided ivory body dice have compact black corner marks instead of the large background watermark. Head marks vary by class: knight helmet, ranger hood, wizard hat, dwarf helm and bard cap. Left and right gloves occupy opposite upper corners and mirror each other; feet use a boot. Each identifier repeats on every face of that die.

Numerals have recessed normal-map relief and a narrow baked light lip. The plastic has faint static grain, a warm ivory gradient, a warmer brass rim and restrained surface highlights. The number and effect row retain the existing glyphs, values and colours.

This is a phone-scale material pass, not an exact reproduction of the enlarged studio-lit concept. It deliberately targets the ivory d6 only. Other shapes keep their existing artwork until their smaller face layouts get a separate pass. Weapons, heart and talents keep their existing presentation.

## Implementation and cost

- `bodymarks.js` supplies the d6-only slot/class identity; small silhouettes are native paths in `faces.js`.
- The existing canvas atlas builds colour, height/normal and roughness/metallic detail at its original resolution. There are no new downloaded image assets.
- Existing mesh geometry, bevel radius, colliders, lights, shaders, render passes, animation loops and quality levels are unchanged. Clearcoat remains disabled for the clean style.
- Camp portraits use the same real dice and finish as battle.
- Physical iPhone FPS and loading measurements have not been collected. Equal atlas dimensions and geometry counts constrain cost but do not certify device smoothness.

## Validation

`dev/ivory-inlay-review.mjs` produces before/after battle screenshots at 393 x 852, selected/bound states, a shorter phone view and the real camp portraits. It checks 240 faces across five classes, four body slots and low/medium quality for corner/numeral pixel overlap and numeral/effect spacing. It verifies mirrored glove identities and excludes non-body slots and other sizes from the pilot.

Actual tray throws settle to the exact engine-requested faces. Before/after seeded boards, visible mesh counts, geometry counts and atlas dimensions match. No page errors occurred. The harness blocks cloud writes and uses disposable local saves.

Full suite: 331 passing, 2 previously observed server-test failures out of 333. The failures are `two phones can sit, and a lock stays private on the wire` and `a hero takes their seat back from a new phone after the game has started`.

Screenshots: `docs/screens/ivory-inlay/`. Refresh the live game after deployment, then inspect any ivory d6 in camp or battle. Next: Dave's phone-scale visual and smoothness feedback before extending the finish to d4/d8/d10 or changing weapon/talent materials.
