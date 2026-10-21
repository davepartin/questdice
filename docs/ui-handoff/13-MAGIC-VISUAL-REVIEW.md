# Magic screen visual finish

October 21, 2026. Review branch ui/camp-art-pass, draft PR #30. Not merged or published.

## Direction

Dave found checkpoint 12 too plain, boxy and visually uneven. This pass treats the screen as a textured fantasy spellbook, with a balanced triangle, purple atmosphere and a crafted selected-power card.

## Implemented

- One midnight-violet slate/fabric painting with fine haze and sparse points of light.
- An equilateral violet-glass triangle set into dark metal, with bright edges and a restrained static halo. Vertices in the 360x280 viewBox are (180,39.867), (76,220), (284,220), giving sides of approximately 208 units. Medallion centers share those positions.
- Equal medallions with warm metal rims and dark illuminated centers; small slot and cost badges.
- A selected-power card with a beveled gold edge, parchment-colored serif title, tilted emblem and faint oversized emblem imprint.
- Helpers have quieter, open styling beneath the triangle. Magic/health totals remain above.
- When inspecting a power, the triangle shrinks proportionally to leave room for its card. The overview keeps a larger triangle. Short screens scroll to every action.

The atmosphere is static. There are no new particle loops, animated filters or continuous effects. This avoids turning a visual finish into constant rendering work. Existing spell rules/handlers/costs remain unchanged.

## Asset

`assets/bg/magic-vellum.webp`: 640x960, 28,512 bytes, quality 70, metadata stripped. Shared by sheet and card backgrounds. Raw decoded RGBA pixel data is approximately 2.34 MiB, excluding browser/GPU overhead. Full-resolution generated source is not shipped to players.

Created with the built-in image-generation tool. Prompt:

Use case: stylized-concept. Production seamless-looking background texture for a premium fantasy tabletop game's magic selection panel. Portrait 2:3 composition, no interface or mockup. Extremely dark midnight violet weathered slate and subtle aged fabric grain, luminous violet mist drifting through the upper and side edges, delicate lavender light threads and a few very sparse pinpoints of starlight. Soft layered atmosphere, tactile painted material rather than flat gradients. Keep central and lower regions very dark and quiet for legible UI overlays. Refined restrained magical atmosphere, not outer space. No letters, no numbers, no emblems, no geometric symbols, no triangle, no circles, no runes, no characters, no objects, no occult imagery, no borders, no interface. A background only. Low contrast and dark enough for cream text.

## Verification

The battle powers browser review checks selection and scaled previews leave battle state unchanged, actual casting deducts displayed magic, charge details open, and both heart controls remain reachable on phone/short-phone/landscape/desktop. Added physical layout checks compare all three distances between medallion centers: maximum difference below one CSS pixel in overview, selected state and resized layouts. The selected A medallion is also checked against the resource row on the tall phone.

Actual running-game screenshots were inspected before saving. One software-rendered screenshot capture exceeded 30 seconds; the repeat completed with a 60-second capture timeout. The final review passed, including geometry and action checks. Tests use disposable local saves, seeded battle and reduced motion, blocking cloud database/authentication. Physical iPhone Safari battery/frame-time/memory measurements and live multiplayer remain unverified. No rule changes or full battle-rule unit rerun.

## Screenshots

- [Overview](../screens/magic-finish/overview.webp)
- [Selected Arc Bolt](../screens/magic-finish/selected.webp)
- [Charge power](../screens/magic-finish/charge.webp)
- [Short phone](../screens/magic-finish/short.webp)
- [Landscape](../screens/magic-finish/landscape.webp)

## Resume

Ask Dave to assess actual screenshots against the desired quality before expanding scope. Existing game dice remain the visual authority. Preserve the equilateral geometry and touch control readability when changing the art. Keep work on the draft review branch until publishing is approved.
