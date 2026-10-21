# Battle dice: restrained satin finish

Dave approved exploring the refined satin concept, prioritizing dice that are clear, smooth and fun on a phone. This checkpoint is a small rendering change for review, not a completed realism overhaul or a physical-device performance certification.

## Change

The existing clean dice style deliberately reduced resting side-face brightness to 6% for most shapes and 20% for d8s. Resting sides now retain 30% and 36%, respectively. The result face stays at its original brightness. The transition still follows the tray's existing rest animation; moving dice retain full face brightness.

The clean material has a restrained specular highlight (0.12 to 0.26) and environment contribution (0.08 to 0.16). Clearcoat remains disabled. Face artwork, symbols, numbers, geometry, physics, materials' texture resolution, and engine outcomes are unchanged. Other dice styles retain their previous settings. Camp portraits share this material and receive the same restrained finish.

No new image assets, lights, render passes, particles, geometry, texture fetches or animation loops. These parameter changes do not establish an FPS improvement. Confirm on an actual iPhone before calling performance verified.

## Verification

`dev/dice-satin-review.mjs` runs the real battle tray at phone size with deterministic heroes and boards, covers d4/d6/d8/d10 body dice, and checks requested values after physical throws. Optional `DICE_BASELINE` supplies the original dice module to the same browser route for before/after renders. It blocks cloud auth and Firestore requests and uses disposable local saves.

Before/after boards, visible mesh counts and geometry counts match. Both versions complete the requested throws with no page errors. Screenshots are in `docs/screens/dice-satin/`.

`npm test`: 330 pass, 2 fail out of 332. The failures are the previously observed server tests: `two phones can sit, and a lock stays private on the wire` and `a hero takes their seat back from a new phone after the game has started`.

## Next

Review result-face dominance, especially d8/d10 side numerals, on a physical phone. Check roll/reroll smoothness and selected, bound and Heart Boost states. Keep this as a separate review branch until Dave approves merging. Use rendered game screenshots as implementation evidence; the AI material comparison is an art reference only.
