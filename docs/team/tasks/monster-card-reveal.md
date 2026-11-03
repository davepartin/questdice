# Monster card clarity and dice reveal — 3 November 2026

The miniature cards label each monster's Special as active, inactive, or absent this round. The Special is named once, with a shorter explanation of its goal and consequence. Cards are wider and taller; a short viewport can scroll a card to read all its content instead of clipping it. Long labels wrap.

At an automatic round-start reveal, each monster's distinctly colored die tumbles and cycles through pip faces before it lands on the engine's already-rolled result. Only then does its move light up and Attack become available. This animation does not roll or change the game result. Forced non-die moves are shown without inventing a roll. Reduced motion immediately shows the actual result. Opening a monster card later for inspection does not replay the roll.

Each monster already has its own six-face move table and independently rolls a d6; different monster types map numbers to different moves. This change makes their individual dice visible without changing face mappings, probabilities or combat balance. See [game screenshot](monster-card-reveal-evidence/card.webp).

Validation: `npm test` 558/558; `dev/monster-reveal-check.mjs` checks animation, final pips, matching highlight, active/inactive/absent text, reduced motion and four phone sizes including 375×548. Real touchscreen battle checks are in `dev/monster-reveal-round.mjs`. Headless Chromium, not Safari.
