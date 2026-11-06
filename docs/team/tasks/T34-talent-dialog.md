# T34 — Talent upgrades in focused dialogs

Dave asked for a face picker that does not rebuild or jump through the camp page. His current visual direction allows bright digital colours rather than requiring natural cardboard textures.

The Talent card now shows both dice, their purchased faces, and the complete d4 → d6 → d8 → d10 growth path. Tap an empty face to open a focused symbol picker. Choosing a symbol previews its exact bonus without spending gold or rebuilding the card behind it. **Done**, labelled with the price, purchases once and returns to that face with the new symbol visible. Cancel, Escape and backdrop dismissal cost nothing. The underlying card is inert while the picker is open; keyboard focus stays in the dialog and returns without scrolling.

Growth and unlocking also use focused confirmations, preserving existing symbols and exposing new empty faces. Occupied faces show their symbol and a separate **Clear symbol** action with the existing no-refund rule. This does not introduce automatic replacement or refunds.

Only camp presentation changed. Engine prices, face values, the two-of-each-symbol limit, growth availability, save format and existing optimistic table operation route remain unchanged. In particular, the engine already permits d8/d10 growth in Act I; this UI adds no act gate. No magic cards or combat rules changed.

## Validation

- Full suite: 578/578 tests pass.
- `node dev/talent-dialog-check.mjs /workspace/t34-browser`: actual Chromium taps across 390×844, 430×932, 375×667 and 375×548; selection keeps the original card DOM and scroll positions, cancel is free, purchase charges exactly once, saved face reloads correctly.
- Browser checks also cover all five heroes, growth preserving symbols, second-die unlock and editing, two-symbol cap, insufficient gold, occupied-face Done and no-refund clearing, keyboard trap/Escape, backdrop cancel, Act I growth, d10 face 10, enlarged text, and navigation cleanup. No page errors.
- Evidence: [symbol picker](../../../talent-dialog-evidence/symbol-picker.webp), [updated card](../../../talent-dialog-evidence/updated-card.webp), [growth confirmation](../../../talent-dialog-evidence/grow-popup.webp), [short phone with larger text](../../../talent-dialog-evidence/large-text.webp), [browser results](../../../talent-dialog-evidence/results.json).

Browser evidence is Chromium with touch/mobile sizing; native iOS Safari and a two-device table session were not repeated. Existing engine/table tests remain covered by the full suite. Build: `20261106td1`.
