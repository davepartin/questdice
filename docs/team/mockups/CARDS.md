# T11 (Art): physical-card family, CONCEPT (rev 2: painted TCG layers)

**Owner:** Art director (Grokbot) · **Status:** REVIEW · Docs only. Built on T10 (PR #36, `shared.css`). No runtime, rules, inventory or save changes.

One card family covers weapons, objective fronts and the objective back. It uses the same wood frame (camp board), parchment face with an inset gold line, 5:7 playing-card proportion, Cormorant Garamond names, Oxanium labels and numbers, and Inter for reading. All text and numbers are live HTML. No image contains text.

| Card | Source | 390x664 (Chromium / WebKit) | 375x548 (Chromium / WebKit, + `_full` when it scrolls) |
|---|---|---|---|
| Weapon, Silver Sword d6 | [weapon-card.html](weapon-card.html) | `png/weapon-card_390x664_*.png` | `png/weapon-card_375x548_*.png` (+ `_full`, 12px scroll) |
| Weapon, Silver Sword d10 | [weapon-card-d10.html](weapon-card-d10.html) | `png/weapon-card-d10_390x664_*.png` | `png/weapon-card-d10_375x548_*.png` |
| Objective front, No potions | [objective-front.html](objective-front.html) | `png/objective-front_390x664_*.png` | `png/objective-front_375x548_*.png` |
| Objective back | [objective-back.html](objective-back.html) | `png/objective-back_390x664_*.png` | `png/objective-back_375x548_*.png` (+ `_full`) |

`node shoot-cards.mjs` re-renders everything. It uses Playwright 1.x, with headless Chrome and Playwright WebKit as a rough stand-in for Safari. Not tested on a physical iPhone.


## Rev 2 (Dave: "Make a great looking card"): painted layers
The flat CSS frame is replaced by painted, text-free art layers in `art/`. Each was generated, keyed and checked on magenta. All names, numbers, die faces and badges are still live HTML (`tcg.css`). `cards.css` was removed.

| File | Size | What | Background removal |
|---|---|---|---|
| `art/frame-weapon.webp` | 720x960, 157 KB | Bevelled bronze/gold frame, arched art window, empty red name ribbon, parchment box, sapphire top-left socket (die size), ruby top-right, two bronze medallions at the bottom (battles left, sell value) | Chroma-green window and outer black keyed to alpha, green despilled |
| `art/frame-objective.webp` | 720x960, 172 KB | Same family: circular medallion window, ribbon, tall parchment, two rubies, bottom rosettes | Same as above |
| `art/card-back.webp` | 720x960, 198 KB | Blue tooled-leather back: gold shield holding an ivory d6 (five pips), ruby above, sapphire corners. No occult imagery | Outer black keyed. One stray pip mark on the die's top edge painted out |
| `art/sword-silver.webp` | 719x720, 60 KB | Silver Sword item art in the minis' painted style (silver blade, sapphire pommel) | rembg with alpha matting, cropped to the object |
| `art/potion.webp` | 482x640, 84 KB | Red healing potion for "No potions" | rembg with alpha matting |

Generated but not kept: a blue-ribbon walnut frame variant (weaker metalwork), and a first card back (its die showed an impossible pip count).

**Layer stack (bottom to top):**
1. `.tc-win`, clipped to the window: a CSS spotlight and sunburst with the object art (sword or potion).
2. `.tc-frame`: the painted frame, with its window transparent.
3. Live HTML on top: kicker (metal and hands), ribbon name, sapphire die-size badge, the die faces from `weaponFaces()` in the parchment, and the hourglass battles-left and coin sell-value medallions. On the objective: kind, rule, and three stake tiles. A CSS prohibition ring sits over the potion.

The legend, caption and Take/Sell or Bet/Decline buttons sit below the card. Positions are percentages of the frame, and type uses `cqi`, so text scales with the card, never below phone-readable size. At 375x548 the page scrolls (`*_full.png`). Nothing is cut off.

**For integration:** ship the five WebP files under `assets/cards/`. Weapon art for other weapons needs one painted item image each, the same treatment as `sword-silver.webp`. Metal variants (Bronze, Gold) can be a CSS tint or separate paints. Total art weight is about 670 KB, so a smaller export is advisable before the files go live.

## Facts from code (main, 23 Oct)
- Weapon faces come from `weaponFaces(makeWeapon('sword', 1, rng, size))` in js/engine.js:101. They follow the `balanced` row of `WEAPON_DICE` in js/data.js and get Silver icons from `metalIcons` (engine.js). The faces were printed by running the engine, not typed by hand.
  - d6: R0 · R2 · B3 · R4 · R5+magic1 · R6+pierce2
  - d10: R0 · R2 · B3 · R4 · R5 · R6+magic1 · B7 · R8+pierce1 · R9+magic1 · R10+pierce2
- Wear: Silver lasts 6 battles (`WEAR_BATTLES`, data.js:86). The label format matches `wearLabel`, "6 battles left" (engine.js:247).
- Sell price: `sellValue` gives 36 gold for d6 and 72 gold for d10.
- Objective: `BONUS_GOALS.nopotion` at js/secrets.js:251, rule "Win without using a potion." The check also counts thrown potions. The stake is `BONUS_STAKE[1]` = 20 (Act II) × `BONUS_RETURN` 3 = 60 returned (secrets.js:243-244), so the net gain is 40.
- Icons are the pierce and magic paths from js/g3/hudkit.js. Colours are the red/blue face tiles from the camp face preview, pierce #ff8a1a and magic purple. A blank shows its colour (a red 0).

## Reusable assets
- Weapon art: rev 2 uses the painted `art/sword-silver.webp`. The rev 1 crop of the camp screenshot is gone. `js/g3/portrait.js` remains the fallback for weapons that do not have a painted image yet.
- Frame, parchment and gold CTA come from shared.css (T10) and css/screens.css `.obj-card`. Fonts are already loaded by index.html.

## New assets
- Back emblem: an inline SVG (gold shield, ivory d6 with red pips) with the wordmark "QUEST DICE" as live Archivo Black text. No occult imagery, nothing campaign-specific, no bitmap. This covers T04's brief, which was READY, assigned to the Art director.
- Optional: a set of objective rule icons (crossed-out flask and others). These would be inline SVG.

## Integration notes (for Claude later; do nothing now)
- Build one `.pc` card component (frame, face, back) and use it in the Camp weapon inspector, the loot/spoils offer and the objective envelope. Keep buttons in normal flow below the card.
- Render faces from `weaponFaces()` into a `.faces.d{n}` grid: 3 columns for d4 and d6, 5 for d8 and d10. Never shrink the tiles; let the page scroll.
- The objective back pairs with T05's tap-to-reveal. With reduced motion, use a crossfade instead of a flip.
- The weapons2 experiment (off) would use the same component. Arrow faces would need one more icon.
