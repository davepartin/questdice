# T11 (Art): physical-card family, CONCEPT

**Owner:** Art director (Grokbot) · **Status:** REVIEW · Docs only. Built on T10 (PR #36, `shared.css`). No runtime, rules, inventory or save changes.

One card family covers weapons, objective fronts and the objective back. It uses the same wood frame (camp board), parchment face with an inset gold line, 5:7 playing-card proportion, Cormorant Garamond names, Oxanium labels and numbers, and Inter for reading. All text and numbers are live HTML. No image contains text.

| Card | Source | 390x664 (Chromium / WebKit) | 375x548 (Chromium / WebKit, + `_full` when it scrolls) |
|---|---|---|---|
| Weapon, Silver Sword d6 | [weapon-card.html](weapon-card.html) | `png/weapon-card_390x664_*.png` | `png/weapon-card_375x548_*.png` (+ `_full`, 12px scroll) |
| Weapon, Silver Sword d10 | [weapon-card-d10.html](weapon-card-d10.html) | `png/weapon-card-d10_390x664_*.png` | `png/weapon-card-d10_375x548_*.png` |
| Objective front, No potions | [objective-front.html](objective-front.html) | `png/objective-front_390x664_*.png` | `png/objective-front_375x548_*.png` |
| Objective back | [objective-back.html](objective-back.html) | `png/objective-back_390x664_*.png` | `png/objective-back_375x548_*.png` (+ `_full`) |

`node shoot-cards.mjs` re-renders everything. It uses Playwright 1.x, with headless Chrome and Playwright WebKit as a rough stand-in for Safari. Not tested on a physical iPhone.

## Facts from code (main, 23 Oct)
- Weapon faces come from `weaponFaces(makeWeapon('sword', 1, rng, size))` in js/engine.js:101. They follow the `balanced` row of `WEAPON_DICE` in js/data.js and get Silver icons from `metalIcons` (engine.js). The faces were printed by running the engine, not typed by hand.
  - d6: R0 · R2 · B3 · R4 · R5+magic1 · R6+pierce2
  - d10: R0 · R2 · B3 · R4 · R5 · R6+magic1 · B7 · R8+pierce1 · R9+magic1 · R10+pierce2
- Wear: Silver lasts 6 battles (`WEAR_BATTLES`, data.js:86). The label format matches `wearLabel`, "6 battles left" (engine.js:247).
- Sell price: `sellValue` gives 36 gold for d6 and 72 gold for d10.
- Objective: `BONUS_GOALS.nopotion` at js/secrets.js:251, rule "Win without using a potion." The check also counts thrown potions. The stake is `BONUS_STAKE[1]` = 20 (Act II) × `BONUS_RETURN` 3 = 60 returned (secrets.js:243-244), so the net gain is 40.
- Icons are the pierce and magic paths from js/g3/hudkit.js. Colours are the red/blue face tiles from the camp face preview, pierce #ff8a1a and magic purple. A blank shows its colour (a red 0).

## Reusable assets
- Weapon art: the existing Sword portrait. The mockup crops docs/screens/weapon-workshop/forge.webp with CSS. In the game, use `js/g3/portrait.js`, which already renders weapon PNGs at runtime. That gives the correct metal tint; the crop shows the Bronze render.
- Frame, parchment and gold CTA come from shared.css (T10) and css/screens.css `.obj-card`. Fonts are already loaded by index.html.

## New assets
- Back emblem: an inline SVG (gold shield, ivory d6 with red pips) with the wordmark "QUEST DICE" as live Archivo Black text. No occult imagery, nothing campaign-specific, no bitmap. This covers T04's brief, which was READY, assigned to the Art director.
- Optional: a set of objective rule icons (crossed-out flask and others). These would be inline SVG.

## Integration notes (for Claude later; do nothing now)
- Build one `.pc` card component (frame, face, back) and use it in the Camp weapon inspector, the loot/spoils offer and the objective envelope. Keep buttons in normal flow below the card.
- Render faces from `weaponFaces()` into a `.faces.d{n}` grid: 3 columns for d4 and d6, 5 for d8 and d10. Never shrink the tiles; let the page scroll.
- The objective back pairs with T05's tap-to-reveal. With reduced motion, use a crossfade instead of a flip.
- The weapons2 experiment (off) would use the same component. Arrow faces would need one more icon.
