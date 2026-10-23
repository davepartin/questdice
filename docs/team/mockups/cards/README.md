# Card templates (CONCEPT, Art director: Grokbot)

Dave: "make these as templates, so as we change the stats of something, then the cards are easy to change."
Every card is drawn by `renderCard(kind, data)` from the game's own data. There are no per-card images. Images are only text-free layers:
- the front frame (`../weapons/art/front-frame.webp`)
- the backs (`../backs/*.webp`)
- the scene and weapon art
- the potion and heart-die art

Every word, number and die face is live HTML.

## Files
- `card-template.js` exports `renderCard`, `renderBack`, `weaponData`, `objectiveData`, `secretData`, `WEAPON_ART` and `SYM`.
- `card.css` holds all card styles. The card is sized by `--w`, and everything inside scales with `cqi`.
- `gallery.html` shows every weapon type × metal (plus legendaries), every Bonus Goal, every envelope card and all four backs: 87 cards in all.
- `card.html` shows one card with its buttons below. It takes `?id=&metal=&size=` for weapons, or `?kind=objective&id=` for objectives.
- `shoot.mjs` serves the repo over http (ES modules do not load from `file://`) and renders `png/`.

## Where the data comes from (read-only imports; the game files are not changed)
| Shown | Source |
|---|---|
| Name, hands, symbols | `WEAPONS` in js/data.js |
| Faces | `weaponFaces()` in js/engine.js:101 |
| Metal | `RARITY`, js/data.js:74 |
| Battles left | `battlesFull` / `battlesLeft` / `wearLabel`, js/engine.js:213-249 (`WEAR_BATTLES`, data.js:86) |
| Sell price | `sellValue`, js/engine.js:1460 (= `weaponValue` × `SELL_SHARE` × wear share, engine.js:1458) |
| Corner accents | the symbols that actually appear on the faces (pierce, magic, heal, and attack/block for +1 faces), in css/powers.css colours |
| Objective bet / return | `BONUS_GOALS`, `bonusStake`, `bonusG`, js/secrets.js:243-256 |
| Secret objective and wager prizes | `CARDS` and `gOf` in js/secrets.js. The sums mirror `rewardChips` (secrets.js:146), which is not exported; Claude should export it and drop the copy |

"Wager" is my reading: the offered bribes (win 2G / fail pay G/2). Confirm with the director.

## Proof that stats flow through (temp copy, not committed)
I changed three lines in a copy of the repo and re-rendered. No art was touched.
- **Dagger price** 18 → 30: the Silver Dagger d6 sell value went from 27 to 45.
- **Silver wear** `WEAR_BATTLES` [4,6,8] → [4,7,8]: "6 battles left" became "7 battles left".
- **`BONUS_RETURN`** 3 → 4: No potions went from "get back 60, net +40" to "get back 80, net +60".

## Lifting it into the game (Claude, later)
1. Move `card-template.js` to `js/g3/cards.js` and `card.css` to `css/cards.css`. Change the imports to `../data.js`, `../engine.js` and `../secrets.js`. Point the art URLs at `assets/cards/`.
2. Replace the weapon card stage (`scrui.js:296`, which uses `portraitQ.weapon`) and the envelope/objective card (`.obj-card` in css/screens.css) with `renderCard(...)`. Keep the existing buttons below the card.
3. Store and pack rows use the 128 or 64 px export of the same art (`WEAPON_ART[id]`), so every screen shows the same weapon picture.
4. Export `rewardChips` from secrets.js and use it in `secretData`.
5. Final backs: export the four backs with a blank plate. `renderBack` already overlays live plate text.

## Adding a weapon
1. Add it to `WEAPONS` in js/data.js, as today.
2. Drop `assets/cards/weapons/<id>-512.webp`, `-128.webp` and `-64.webp` into place (painted master, neutral steel, 45° diagonal).
3. Add `<id>: '<id>'` to `WEAPON_ART`.

The faces, metal, wear, price and corner accents then come from the data. Until the art exists, the card shows a labelled placeholder silhouette. A legendary reuses its `model`'s art automatically.
