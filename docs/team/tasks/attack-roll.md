# Monster target picker: Attack & Roll — 3 November 2026

Dave asked for the heading higher, the older Choose Target prompt hidden behind the picker, and one action to choose a monster and roll the hero dice. The heading gets up to 20 additional CSS pixels of lift (tapered on short screens); the card and button positions stay as in the previous spacing pass. The underlying battle caption is hidden while the picker is visible and returns afterward.

The picker says **Attack & Roll** in a selectable round. After the monster's two-second move-die reveal, tapping it disables repeat input and slides the cards off before invoking the normal battle roll. Reduced-motion users skip the slide. The game selects the chosen living target, then invokes the existing `doRoll`, which rolls and animates the hero's real dice onto the grid. One monster, an unchanged existing target and a newly selected target all work. Later rounds use the same flow. Read-only monster inspection continues to say Close and does not roll; targeted-power locks and tutorial roll guards remain in effect.

For a shared table, the selected aim is acknowledged before rolling. A rejected network aim does not roll: the player sees the error and can choose again. The callback checks the current round, active hero, phase, target health and battle state after asynchronous changes, so an old card cannot roll for a different round or hero. Local party play still rolls only the active hero. The optional `?nominicards` flow remains available.

## Verification

- `npm test`: 565/565 pass; `test/table.test.mjs` confirms online aim then one authorized roll, with the other fighter untouched and duplicate roll rejected.
- `dev/picker-spacing-check.mjs`: 16 combinations of four phone viewports and 1–4 cards, heading lift/card layout, unchanged button position and real touch selection.
- `dev/minicard-taps.mjs`: actual solo battles with 1–4 monsters, picker label and hidden old prompt, selecting a back card, automatic real dice roll, later-round target switch, and recap button. A normal WebGL frame was rendered for the [dice-grid screenshot](attack-roll-evidence/dice-grid.webp); [picker screenshot](attack-roll-evidence/picker.webp).
- `dev/attack-roll-transition-check.mjs`: slide completes before callback, repeat input disabled, reduced motion, read-only Close and caption restoration.
- `dev/attack-roll-party-check.mjs`: local two-hero party targets the chosen enemy and rolls only the active hero.
- `dev/attack-roll-online-check.mjs`: a real local four-seat table and browser, intentionally rejects the first aim; confirms no roll, then retries and confirms aim is accepted before exactly one roll for the active hero. This tests the local table transport, not a live Firebase table.

Headless Chromium, not Safari. Build `20261103zt1`.
