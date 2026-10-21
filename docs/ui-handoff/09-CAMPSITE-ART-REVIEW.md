# Painted campsite checkpoint

October 20, 2026. Review branch `ui/camp-art-pass`, draft PR #30. Not published live.

## What changed

One welcoming campsite painting replaces the temporary act-location backdrop in camp. Canvas tents and lanterns frame a mountain clearing. Hero miniatures, pets, campfire and all controls remain separate live elements. The same shipped asset serves every act; act-specific road art is unchanged.

Phone camp now reserves a bounded 190–230px total header/scene area, including the fixed header. This makes the tents readable. Short phones scroll to lower controls. Desktop camp's visible stage is capped at 420px to prevent an oversized portrait crop. Selecting a die continues to scroll directly to the inspector.

The full-screen camp painting no longer drifts. Existing campfire/hero animation behavior and reduced-motion support remain. No new render loop, dependency, gameplay rule, save format or multiplayer mutation.

## Asset and cost

`assets/bg/camp.webp`: 1280 × 640, 158,774 bytes (155.1 KiB). Converted to WebP at quality 78 with metadata stripped. The same URL is reused behind the scene and in the miniature stage; it is not two different downloads. Decoded RGBA pixel data is about 3.1 MiB, excluding browser/GPU overhead. Physical iPhone battery and frame-time measurements remain unverified.

Artwork created with the built-in image-generation tool, then resized/compressed for this project. The large generated original is not shipped to players.

## Generation prompt

Use case: stylized-concept. Create a production background asset for a premium fantasy tabletop mobile game, NOT a screenshot or UI mockup. Wide landscape 2:1 composition. A welcoming adventurers' campsite at blue hour in an evergreen forest, distant blue mountains and a small moon, weathered canvas tents on left and right, warm amber lanterns shining through tent cloth, wooden supply crates and rolled blankets at edges. Rich painterly realistic materials with warm gold and midnight blue palette, grounded handcrafted board game atmosphere. Frame tents in middle distance. Lower central half is open level earth clearing with subtle amber illumination, reserved for separate game character miniatures and a live campfire overlay. Keep the center unobstructed. Foreground perspective eye level looking slightly down, crisp large shapes that remain legible in a tiny phone banner. No people, no characters, no animals, no actual campfire or flames, no text, no logos, no UI, no borders, no symbols, no occult elements. Deliver only finished artwork.

## Verification

Run `CHROMIUM_PATH=<local chromium> node dev/campsite-review.mjs` with Playwright available. Uses disposable local heroes and blocks cloud authentication/database requests.

Checks cover image decoding, all three acts, actual die upgrade and exact gold deduction, focus restoration, six heroes plus pet, phone/short/landscape/desktop layouts, reduced motion and return to road with no camp stage artwork/fire. Actual game screenshots are saved below. Unit battle-rule tests were not rerun for this scenery-only change.

- [Phone](../screens/campsite/phone.webp)
- [Six heroes and pet](../screens/campsite/party.webp)
- [Selected die](../screens/campsite/selected.webp)
- [Short-phone purchase](../screens/campsite/short-inspect.webp)
- [Desktop](../screens/campsite/desktop.webp)

## Next bounded section

Review the camp dice against the actual designed battle dice. Preserve d4/d6/d8/d10 labels, existing colors/symbols and actual face previews. Do not introduce arbitrary concept pips or prices. The current static camp size diagrams remain distinct from the battle rendering; the overall UI is still not a pixel-for-pixel match to the original illustration.
