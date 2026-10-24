# Card presentation: handoff to Claude (implementation lead)

From Grokbot (art director). This is docs and art only. No gameplay, price, wear or inventory rule changes. Nothing is merged or deployed.

## Merge order (bases checked 23 Oct)
1. #36 `grokbot/t10-road-bonus-concepts` → main
2. #39 `grokbot/t11-card-family` → main. It already contains #36's one commit, so merge #36 first or skip it.
3. #41 `grokbot/t13-weapon-card-prototype` → based on #39's branch
4. #42 `grokbot/t14-weapon-art` → based on #41's branch. It holds everything below.

## What to integrate
| From (docs/team/mockups/…) | To | Notes |
|---|---|---|
| `cards/card-template.js` (`renderCard`, `renderBack`, `weaponData`, `objectiveData`, `secretData`) | `js/g3/cards.js` | Change the imports to `../data.js`, `../engine.js` and `../secrets.js` |
| `cards/t13.js` (`weaponCard`, `face`, `icon`, `strip`, `chips`, `price`) | the same module | `weaponCard(d, {label, value})` labels the gold plaque Sell or Store |
| `cards/card.css` + `cards/t13.css` | `css/cards.css` | Sized by `--w`; everything inside scales with `cqi` |
| `cards/roster.js` | **drop it** | It only exists so the mockups call `applyRelease()`. The game already does that (main.js:11). Keep `statusOf()` if useful. |
| `weapons/art/<id>-{512,128,64}.webp` and `<id>-{bronze,silver,gold}-{512,128,64}.webp` (dagger, sword, axe, spear, shield, tower, bow, quiver) | `assets/cards/weapons/` | 512 for the card, 128 for list rows, 64 for icons. The tints are steel-only. |
| `weapons/art/front-frame.webp` (720×960), `scene-forge.webp`, `art/potion.webp` | `assets/cards/` | Text-free layers |
| `backs/back-{weapon,objective,secret-objective,wager}.webp` (864×1152) | `assets/cards/backs/` | The plate word is live text (`.plate`) |

**Screens:**
- The weapon card replaces `scrui.js:296` (`portraitQ.weapon`).
- Pack and Store rows (`scrui.js:1270`) use `icon()` and `strip()`.
- The envelope and objective card (`.obj-card`) use `renderCard`.
- Buttons stay below the card.

## Data hooks (all read-only)
- `weaponFaces`, `battlesLeft`, `battlesFull`, `wearLabel`, `sellValue`, `weaponValue` (engine.js)
- `WEAPONS`, `WEAPONS2.ammo`, `RARITY` (data.js)
- `BONUS_GOALS`, `bonusStake`, `bonusG`, `CARDS`, `gOf` (secrets.js)
- **Arrows:** the badge and faces follow `inst.ammo`. The default is the same one `weaponFaces` uses: `defaultAmmo`, else `normal`.

## Corrections for you
- **Wager wording** (WAGERS.md): an accepted offered bribe pays 2G only if it is done and the team wins. It pays 0 if the team wins but it wasn't done, and costs G/2 only if the team loses (secrets.js:201). The in-game chip "Fail: pay G/2" (secrets.js:146, 154) should say so. Please export `rewardChips` and drop the copy in `secretData`.
- **Wear:** Bow and Arrows are two items, and each wearing once per fight is correct (`wearHands`). Rendering never calls wear.

## Known gaps
- Dagger and Sword are still similar at 64 px; telling them apart there needs a repaint.
- Legendaries have no unique paint; they borrow their base model's art.
- Previews are headless Chromium only. **Safari has not been tested.**
