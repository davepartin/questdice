# Monster target picker spacing — 3 November 2026

Dave asked for the target heading and tall monster cards to move up slightly while Attack stays where it is. A visual-only transform lifts the heading and stack together by up to 18 CSS pixels, without changing layout or the button's position. The lift tapers to zero on very short viewports to keep the heading and cards on screen. Card appearance, move dice and action logic are unchanged.

Validation: `npm test` 564/564; `dev/picker-spacing-check.mjs` checks 16 combinations of 390×844, 430×932, 375×667 and 375×548 with one through four cards. It compares the Attack button's exact before/after position, confirms the heading and cards move together and remain on screen, and uses touch input to bring every card forward. Headless Chromium, not Safari. [Screenshot](picker-spacing-evidence/390-two.webp), [measurements](picker-spacing-evidence/results.json).
