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

"Wager" means the offered bribes. See WAGERS.md (T13) for the real payouts: the G/2 loss applies only when the team loses.

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

## T13: weapon card prototype (builds on the cards above; nothing is redesigned)
Every T13 page imports `roster.js` first. It calls the game's own `applyRelease()` (js/release.js), so faces, names and pools are the **released** game's. See ROSTER.md.

| File | What |
|---|---|
| `ROSTER.md` | Active / Legacy / Experiment / Proposed, with file:line |
| `WAGERS.md` | Each wager's real stake, return and failure cost, by act |
| `roster.js` | `applyRelease()` plus `statusOf(id)`. The gallery uses it to split Active from Legacy. |
| `t13.js`, `t13.css` | `weaponCard(d)` is `renderCard('weapon', d)` with a d10-ready face grid and a metal treatment (engraved metal name, a metal ring over the frame). It also exports the compact views: `icon` (64/128 px art), `strip` (all faces in one row), `chips` and `price`. |
| `weapon-d10.html` | **The d10 card:** Silver Dagger d10. `?id=&metal=&size=&left=` |
| `inventory.html` | One phone page: the same card in Spoils, the hands and pack rows, the Camp Store shelf and the Ranger's paired Arrows + Bow |
| `upgrade-concept.html` | CONCEPT: covered upgrade slots, prices unspecified, kept off the card face |
| `back.html` | One card back at phone size (`?kind=wager`) |

How a face reads, matching the dice (js/gfx/dice/dice.js:37-38):
- `+N`: a blank is `+0`, because it still sends the hand's number.
- Attack and block are told apart by shape **and** word: the red starburst with ATK, or the blue shield with BLK.
- Blanks are hatched.
- Bonus symbols are repeated as on the die: pierce 2 shows two arrows.
- Repeats are shown face by face; all 10 faces are on the card.

### Paired equipment (Bow and Arrows): follow current behaviour
- In the released game, Bow and Arrows are **two separate one-handed weapons**: Arrows in the left hand, Bow in the right (data.js:291-292, 297). Each has its own `left` counter.
- `wearHands` takes one battle off each hand's weapon (engine.js:217-226). The two-hander "counts once" path (engine.js:222-223) applies only to legacy two-handers.
- The cards show exactly that: two cards, two counters. **Two visual cards must not create two wear events.** A card is a picture of an item. It must never call wear itself, and showing the pair must not add a decrement beyond what `wearHands` already does.
- **Claude:** please verify wear against the equipment model. Today a Ranger's pair loses two item-battles per fight (one each), the same as any two one-handers. Whether that is intended for a pair is a gameplay decision for Dave and Astra, not a card decision.
- The prototype does not show a permanent Bow, arrow restocking, a strength lock, carry limits, Diamond changes or returning two-handers.
