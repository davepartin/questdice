# T17 plan: weapon size, no wear (Claude: gameplay implementation and economy checks)

Status: **plan and measurements only. No game code has changed.** Rules live behind a switch that is off at the live root; the experiment is published only as an isolated preview with its own storage. Source: the ruling in [T17.md](T17.md); measured faces in [T17-faces.md](T17-faces.md) (`node tools/t17-faces.mjs`).

## 1. Overlap audit (the Director asked for it; file and line are on main as of 24 Oct)

| Path today | Where | What it does now | Under T17 |
|---|---|---|---|
| **The hand die is the weapon's ceiling** | `sidesOf`, `js/engine.js:374` (case `weapon`): `min(weaponSize, hero.strength[W or E])` | A d8 weapon rolls as a d6 until the hand die is a d8. The camp's Left/Right hand die upgrades (`strengthUpgrade`, `js/campbuy.js:30,49`) are the only way to lift it. | **This is the overlapping upgrade path.** In the experiment the weapon die is `weaponSize` alone (ruling 4: no strength requirement, `heroStrength` untouched). The hand die keeps its own roll and its own effect (it adds its number to a weapon's faces) and is not charged twice; it just stops being a weapon cap. Consequence to flag: the weapon-cap reason to buy a bigger hand die goes away, so those camp prices may need a second look (a balance question, not decided here). |
| Train (size) | `trainInfo`/`trainWeapon`, `js/engine.js:1445-1460` | Already retired with wear: `trainInfo` returns `why: 'wear'`. The old version (`trainInfoOld`) had `WEAPON_SIZE_STEPS`, a hand-die check and a two-hander multiplier. | Replaced by a new `sizeUpgradeInfo` / `buySize` in the experiment: d4→d6 40, d6→d8 80, d8→d10 140 gold, one step at a time, same for every weapon and metal, no hand check, a found d8 already has d6 uncovered. The old function stays retired. |
| Forge (metal) | `forgeInfo`/`forgeWeapon`, `js/engine.js:1429-1445` | Retired with wear (`why: 'wear'`). | Unchanged. Metal is separate from size (ruling 2); "better metals" are bought as weapons, not forged. |
| Wear | `WEAR_BATTLES` (`js/data.js:86`), `battlesFull`/`battlesLeft`/`wearLabel` (`js/engine.js:213-250`), `wearHands` (`js/engine.js:217`, called at the end of a battle, `:208`), the shatter report | A weapon wears a battle; Diamond lasts one fight. | Switch on: `battlesFull` is Infinity for every weapon (Bow, Arrows and Diamond included), `wearHands` is a no-op and reports nothing, `wearLabel` is empty. The cards (T05) already hide the wear chip when the label is empty. |
| Sell value | `weaponValue` includes `SIZE_VALUE` (`js/data.js:79`); `sellValue` (`js/engine.js:1464`) = half the worth times the wear share | Selling a bigger weapon pays more. | Ruling 5: buying size must **not** raise sell value. A weapon records `sizeFound` (its size when found or bought) and `sellValue` uses that size; the shop price of a found or bought weapon is unchanged. With wear gone the wear share is 1, so a sale returns half the worth as found. |
| Diamond | `diamond` weapons, `diamondFaces`, `DIAMOND.max` case, `diamondSellValue` (`js/engine.js:162`), `shop-diamond` in `shopStock` (`js/engine.js:1486`) | One fight, then it shatters; the shop can offer one. | Permanent; keeps its faces and presentation. It must be **removed from the ordinary early shop** (ruling 6); the `shop-diamond` roll is gated off in the experiment until the Director decides where a Diamond comes from. It takes a normal pack slot (ruling 7) instead of the separate case; `DIAMOND.max` stops mattering. |
| Unopened slots | `isActive` / `unlockDie` / `UNLOCK_COST` (`js/engine.js:339-352`, `js/data.js:320`) | The right weapon die costs 30 gold to open. | Unchanged: a bigger weapon does not open another hand (ruling 4). |
| Two-handers | `hands: 2` weapons fill both weapon dice | Legacy. | Not redesigned (ruling 7). |
| Pack limit | `BAG_MAX = 4` (`js/data.js:82`) | Four pack slots. | Unchanged: four pack plus two hands = six weapon cards. |

## 2. How the experiment is kept off the live game

- A rules switch `EXPERIMENT.weaponSize` (default off) in `js/data.js`, switched on **only** by a call from `js/main.js` when the page is the T17 preview (`/preview/weapon-size/`), the same way `applyLab()` is called for `?lab`. Nothing at the live root, in the lab or in the two existing previews switches it on. A test loads each entry point and asserts the switch is off everywhere except that preview.
- Every code change is guarded by that switch, so with it off the engine returns exactly what it returns today (the existing 392 tests are the proof; plus a test that runs the same seeded fights with the switch off and compares to a recorded result).

## 3. Storage namespace (the Director's condition before publishing)

Today every page under `/preview/` uses one namespace, `questdice.preview.*` (`js/lab.js`). T17 gets its own: `SANDBOX_NAME` becomes `preview-weapon-size` for `/preview/weapon-size/`, giving `questdice.preview-weapon-size.hero.*`, `questdice.preview-weapon-size.battlereports` and `qd.preview-weapon-size.daily`. `battle-report` and `cards` keep `preview` exactly as now, so their saved heroes, reports and daily records are untouched. Verification before publishing: a browser run seeds live, lab and both existing preview namespaces, plays the T17 preview, and asserts every seeded value is byte-identical afterwards and only the new keys were written. No hero or equipment is imported or converted from any other namespace.

## 4. Nested faces: what the measurements say (full tables: [T17-faces.md](T17-faces.md))

The rule measured is a proposal for review: d4 faces fixed; a bigger size keeps them and adds (size − 4) faces, taken as the highest-hit faces of today's spread at that size, so the top end of today's weapon is kept and the metal still sets the icons.

- **Today a bigger die reshuffles the lower faces** for every active sized weapon (Grok's finding, confirmed in the "Lower faces change today?" column). Nested faces make an upgrade a pure addition.
- **The proposal is slightly stronger than today's spreads:** about +0.2 to +0.3 average hit at d6, d8 and d10 for the Silver dagger, and the added faces are all "useful" (3 or more, or carrying an icon). So this rule is a small buff, not a neutral re-expression. It also front-loads the value: the first 40 gold step (d4→d6) adds the most per gold.
- **A bigger die is not always better in principle,** but under this rule it is, always, because it only adds. If the Director wants real trade-offs (a bigger size that also dilutes), the added faces need to include low or blank faces; that is a design decision, not made here.
- **Diamond:** today's Diamond faces by size are tabulated for review. No Diamond bonus-face package is proposed yet; it needs the Director's review before any balance is implemented (ruling 6).

## 5. Economy checks to run before anything goes near live play

1. Buy/sell exploits: buy at the shop, upgrade, sell (must never profit; upgrade gold is not refunded, and the card must say so before payment); buy a found weapon, sell, rebuy.
2. Gold budget: total gold by the end of Acts I, II and III (`tools/gold.mjs`) against the cost of upgrading the pack's best weapon to d10 (260 gold for the three steps) plus metals, supplies and the hand and body dice. Is anything left once sizes are bought, and does a hero reach d10 too early?
3. Output per gold of each purchase (the "What each size purchase adds" table), compared with a hand-die upgrade at the same price.
4. Battle outcomes with wear removed and sizes owned: the matched-campaign harness (`tools/`), by independent campaign with its error, for solo and parties.
5. The loss of the hand-die ceiling (section 1): does it make the hand die upgrades pointless?

## 6. Tests to write with the code

Switch off at the live root, lab and both previews; with it on: no wear for any weapon including Bow, Arrows and Diamond; size purchase prices and one-step ordering; a found d8 has d6 uncovered; purchases do not change sell value or the shop price; each owned weapon keeps its own size (two Silver Daggers); an unopened slot stays unopened; no strength requirement or `heroStrength` change; nested faces keep the lower faces at every size; Diamond permanent and absent from the ordinary shop; the card's price and "no refund" line match the purchase; storage namespace test (section 3).

## 7. Old-save migration proposal (draft, required before any release)

Nothing converts silently. A hero keeps every weapon exactly as saved. On first load under the new rules: `left` (battles left) is ignored and then dropped on the next save; `size` is kept as the weapon's purchased size (so a d8 found weapon stays a d8); `sizeFound` is set to the current size so selling never pays a windfall; a Diamond in the old case is moved to a pack slot if there is room, otherwise it stays in the case (still usable) until the player makes room, and is never deleted; a hand die that was bought only to lift a weapon cap keeps its size. A one-time message states what changed. The hero's gold is not touched. Because the live root never switches the rules on until release, this proposal is for the Director's review first; it is written down here so it cannot be forgotten.

## 8. Order of work (each step checked and recorded on the board)

1. Namespace per preview folder (`js/lab.js`) with the isolation test. 2. The switch and the wear removal. 3. `sizeFound`, sell value, `sizeUpgradeInfo` and `buySize` with the sell and price tests. 4. The hand-die ceiling change behind the switch. 5. Nested faces for the six active types (data from the table, once the Director has seen it). 6. Card and camp UI (with Grok's revised mockup). 7. The isolated preview (`preview/weapon-size/`). 8. Economy runs and the report. Nothing is merged to the live root with the switch on.

## Questions for the Director (answers change the code)

1. Is the **nested-faces rule** as measured (top-end faces added, a small buff) the intended one, or should upgrades also add weaker faces so size is a real trade-off?
2. With the hand-die weapon ceiling gone, should the **hand die upgrade prices** be revisited, or left alone for the first test?
3. Where does a **Diamond** come from now (a drop, a boss reward, a quest reward), since it leaves the ordinary shop?
4. Is it right that a sold weapon returns half its **as-found** worth even though wear no longer discounts it?
