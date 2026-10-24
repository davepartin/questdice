# T17 plan: weapon size, no wear (Claude: gameplay implementation and economy checks)

Status: **plan and measurements only. No game code has changed.** Corrected 24 Oct after the Director's review: the earlier face table (d4 preserved only) is **withdrawn**; the tables are now a cumulative ladder with prefix checks. Rules live behind a switch that is off at the live root; the experiment is published only as an isolated preview with its own storage. Source: the ruling in [T17.md](T17.md); measured faces in [T17-faces.md](T17-faces.md) (`node tools/t17-faces.mjs`).

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

## 4. Cumulative size ladder: what the corrected measurements say (full tables: [T17-faces.md](T17-faces.md); JSON for the mockup: [T17-faces.json](T17-faces.json); code: `tools/t17-ladder.mjs`, `test/t17faces.test.mjs`)

**Correction.** The first table built each size from d4 and the strongest faces of that size's released spread, so it protected only the original four faces. The new ladder is genuinely cumulative: d4 faces fixed; d6 appends two faces; d8 appends two to the d6 set; d10 appends two to the d8 set. Full face identity (colour, number, bonus plus, every effect, ammunition marking) never changes once on the ladder. The appended faces are the two best of what today's released spread at that size has beyond the faces already on the ladder. Checked for all eight active types (Dagger, Sword, Axe, Spear, Round Shield, Tower Shield, Bow, Arrows; the earlier plan said six), Bronze, Silver and Gold, and Arrows in Normal, Piercing, Fire and Frost: face count equals the die size and each size is an exact prefix of the next (6 tests; the check is itself tested against a reshuffled ladder). Attack and block are measured separately, with how often each effect is on the die.

**Result over all 99 purchases (11 variants × 3 metals × 3 steps):** the total of expected attack plus expected block **never falls**, but the purchase is not better in every respect:
- **28 purchases lower E[attack] or E[block]** (never both). Mostly the Dagger, Spear, Sword and Round Shield: the appended faces are strong attack faces, so E[attack] rises a lot while E[block] slips slightly (for example Bronze Dagger d4→d6: +1.17 attack, −0.08 block); on the Round Shield the same happens the other way round.
- **18 purchases dilute an effect's share of faces** even when its icon count holds: pierce on Dagger and Round Shield, magic on Sword and Round Shield, pierce on the Arrows variants. A d10 Silver Dagger has pierce on 0.20 of its faces against 0.33 at d6.
- So the earlier "small buff" characterisation, from the Silver Dagger alone, is withdrawn. The honest reading: the ladder raises the main output, and trades some effect frequency and the other colour's share for it. Whether that is "worthwhile progression" for each weapon is the Director's call per the corrected rows; I am not claiming every upgrade is better.

## 4b. Diamond proposal (for review; nothing implemented; acquisition stays held)

Package, source and starting size are in [T17-faces.md](T17-faces.md) (section "Diamond") with every face listed: the weapon's Gold ladder plus a growing crit step, permanent, same d4 to d10 sizes and prices, cumulative (checked). **Source proposed:** a rare drop from the final Act III boss only (Vharaxis, step 10), 30% on a first victory, at most one Diamond per hero, never in the shop, starting at d6; eligible types Dagger, Sword, Axe, Spear, Round Shield, Tower Shield (Bow and Arrows are paired items and are not offered as Diamonds first). The old special-case Diamond table (which listed six faces for a d4) is not used.

## 5. Economy checks to run before anything goes near live play

1. Buy/sell exploits: buy at the shop, upgrade, sell (must never profit; upgrade gold is not refunded, and the card must say so before payment); buy a found weapon, sell, rebuy.
2. Gold budget: total gold by the end of Acts I, II and III (`tools/gold.mjs`) against the cost of upgrading the pack's best weapon to d10 (260 gold for the three steps) plus metals, supplies and the hand and body dice. Is anything left once sizes are bought, and does a hero reach d10 too early?
3. Output per gold of each purchase (the "What each size purchase adds" table), compared with a hand-die upgrade at the same price.
4. Battle outcomes with wear removed and sizes owned: the matched-campaign harness (`tools/`), by independent campaign with its error, for solo and parties.
5. The loss of the hand-die ceiling (section 1): does it make the hand die upgrades pointless?

## 6. Tests to write with the code

Switch off at the live root, lab and both previews; with it on: no wear for any weapon including Bow, Arrows and Diamond; size purchase prices and one-step ordering; a found d8 has d6 uncovered; purchases do not change sell value or the shop price; each owned weapon keeps its own size (two Silver Daggers); an unopened slot stays unopened; no strength requirement or `heroStrength` change; nested faces keep the lower faces at every size; Diamond permanent and absent from the ordinary shop; the card's price and "no refund" line match the purchase; storage namespace test (section 3).

## 7. Old-save migration proposal (draft; live-save migration is not approved)

Nothing converts silently. Under the experiment a hero keeps every weapon as saved; `left` (battles left) is ignored; `size` stays the purchased size; `sizeFound` is set to the current size; a Diamond in the old case is moved to a pack slot if there is room and otherwise stays in the case, never deleted; a hand die keeps its size; gold is not touched; a one-time message says what changed.

**Correction to my earlier statement.** "So selling never pays a windfall" was wrong. Removing the wear discount **raises** what an old worn weapon sells for, because today a sale returns half the worth times the battles left over the full life. Measured with the engine's own functions over the eight active types, three metals and four sizes: a weapon with full life sells for the same as before (difference 0); with half its life left it sells for about **27 gold more** on average; with one battle left about **46 gold more** on average and up to **157 gold more** (a Gold Tower Shield d10 at 1 of 8 battles: 23 today, 180 under as-found half-worth). Examples: Silver Dagger d6 at 6, 3 and 1 battles left sells for 27, 14 and 5 today and 27 in every case under the experiment; Gold Axe d10 at 8, 4 and 1 sells for 156, 78 and 20 today and 156 under the experiment. A hero who keeps worn spares in the pack could therefore sell them all for a one-time gain. Options for the Director: accept the windfall (it is bounded by what a hero carries: four pack slots and two hands), cap it by keeping the old wear discount for already-worn weapons at migration, or sell old worn weapons at their old value once. The preview does not import any hero, so this decision is needed only before a release.

**As-found basis stays stable:** `sizeFound` is written once when a weapon is found or bought, copied unchanged on save/load and on any transfer, and never changed by a size purchase. Tests: save/load round trip and a buy, upgrade, sell, rebuy cycle that never profits. One existing exception to check, not caused by T17: the shop's `priceMod` can go as low as 0.4 of the worth (`js/engine.js:1475`, discount camp flags) while a sale returns 0.5, so a discounted purchase can already be sold at a profit; the buy/sell test will measure it with and without discount flags.

## 8. Order of work (each step checked and recorded on the board)

1. Namespace per preview folder (`js/lab.js`) with the isolation test. 2. The switch and the wear removal. 3. `sizeFound`, sell value, `sizeUpgradeInfo` and `buySize` with the sell and price tests. 4. The hand-die ceiling change behind the switch. 5. Cumulative faces for the eight active types (data from the table, once the Director has seen it). 6. Card and camp UI (with Grok's revised mockup). 7. The isolated preview (`preview/weapon-size/`). 8. Economy runs and the report. Nothing is merged to the live root with the switch on.

## Director's answers (24 Oct) and what changed

1. **Faces:** worthwhile progression, no deliberate blanks; top-end additions acceptable only as a genuinely cumulative ladder with corrected measurements. Done: section 4. Not approved yet.
2. **Hand upgrade prices:** unchanged for the first comparison; measure their remaining value without the weapon ceiling (economy check 5).
3. **Diamond:** a rare late-campaign boss reward; exact encounter, chance, starting size and faces submitted together: section 4b. Acquisition stays held.
4. **Sale value:** half the as-found worth, no wear discount, no refund for size increases: adopted, with the migration windfall now quantified (section 7).

## Next (independent of the face review, preview only, off at the live root)

Per-preview storage namespace and its isolation test; the switch-off baseline; the purchase infrastructure (`sizeFound`, `sizeUpgradeInfo`/`buySize`, no-refund line). Not started until the corrected tables are on the board; face balance is not published as settled.
