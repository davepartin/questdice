# Actual battle dice in camp

October 21, 2026. Review branch ui/camp-art-pass, draft PR #30. Not merged or deployed.

## User correction

Use the very dice already in battle for every camp slot, including weapons and talents. Show the highest number on each die. Lighter sides are allowed to reveal its 3D shape. Do not redraw approximate silhouettes.

## Implemented

Removed the handmade camp SVG die silhouettes. Camp now builds the existing battle mesh with `createDie`, using its real face atlas, rounded geometry and materials. `restQuat` places the selected face up. The face with the highest numeric text is selected, including weapon values rather than assuming the last weapon face is highest. Size labels stay explicit.

The nine-slot board and die inspectors use cached still portraits. Weapon slots show actual weapon dice instead of swords/shields. The weapon workshop's main image is also its equipped die; gear inventory art is retained.

Camp-only `setRest(0.35)` leaves the sides brighter. Battle's existing rest shading is unchanged. A small turn reveals the die edge. Transparent margins are trimmed to give d4/d6/d8/d10 comparable visual size.

## Rendering and phone scope

Uses the existing idle portrait queue and shared game renderer. No new animation loop or downloaded bitmap assets. Temporary die materials are disposed after rendering; the existing battle atlas/geometry cache is reused. Camp's portrait promise cache is bounded to 48 keys. Cached portraits are reused across repeated camp renders; changed faces/equipment/style create new keys.

This is real 3D-to-still rendering, so the first uncached visit does more work than the rejected vector approximation. It is queued between input opportunities. Phone Safari frame time, battery use and memory pressure still need physical-device measurement. Do not claim zero rendering cost.

`portrait` gains optional preparation and alpha-trimming hooks. Existing portrait callers keep their default behavior. No engine rules, purchases, save formats or multiplayer authority changed.

## Verification

- Earlier camp dice review still passes face-spec, read-only preview, purchase/save, heart and short-phone checks.
- `dev/real-dice-review.mjs` waits for every real die image, confirms nine loaded portraits and highest-number face selection, then checks actual upgrade/deduction/save, weapon/talent access, d10 and short-phone overflow/purchase access.
- Actual screenshots visually inspected for the correct battle appearance and visible side faces. No page errors.
- Full unit battle-rule suite not rerun for portrait-only changes. Live cloud/multiplayer and physical iPhone performance not exercised.

## Screenshots

- [Nine actual battle dice](../screens/real-dice/board.webp)
- [Actual current/next dice](../screens/real-dice/selected.webp)
- [Weapon workshop die](../screens/real-dice/weapon.webp)
- [Actual d10](../screens/real-dice/d10.webp)
- [Short phone](../screens/real-dice/short.webp)

## Resume

Dave's existing dice are the visual authority. Keep actual mesh portraits for camp and do not reintroduce approximations. Next section remains battle magic-powers organization, with all spell mechanics preserved.
