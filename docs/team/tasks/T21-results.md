# T21 results: starters, reward handoff, Heart control, card access, report export (Claude, 25 October 2026)

Brief: [T21-two-player-playtest.md](T21-two-player-playtest.md). Build **20261025t21a**. 424 tests pass.

**What was checked, and what was not.** Two real browser phones (headless Chromium 141, Linux, 375x548 and 390x664) played an online table through the game's own cloud code (`js/cloud.js`, the session layer and the table rules inside a transaction). Only the Firebase SDK was replaced, by `dev/fakecloud.mjs`, a small stand-in, because this sandbox cannot reach Google. **That is not real Firestore, it has no security rules or real network behaviour, and it is not Safari.** No two-phone or iPhone test happened, and none is asked of Dave. Re-run with `SIZE=390x664 node dev/t21online.mjs`, `node dev/t21heart.mjs` and `node dev/t21cards.mjs` (each starts its own server).

## 1. Starters (Dave's rule)

Every new hero starts with both weapon dice live at d4: Bronze left class weapon, Bronze right shield (Knight and Wizard Round Shield, Dwarf Tower Shield, Bard a Round Shield instead of the Sword), Ranger Bronze Arrows left and Bronze Bow right. The right-hand unlock (30 gold) is gone from the released rules. Existing heroes keep every item and every die; one who lacks the right-hand die gets it once, with Fists if the hand was empty, no gold taken and nothing reset. The migration (`migrateStarterDice`, run by `migrateHero` and by `migrateTable` for every seat) is idempotent and **never touches a table while a battle is in progress**. `heroStrength` is unchanged. Through the real create/join/start path both Rangers began with Arrows and Bow and both dice live ([online-fixed-390x664.json](T21/online-fixed-390x664.json)). Tests: `test/starters.test.mjs`.

## 2. The early scaling question, before any monster nerf

`tools/t21-starters.mjs 40`: Act I step 2, Normal, level 1, 40 matched-seed fights per cell, old rules (right die locked) against the corrected starters. The table shows win rate old to new: one Knight 85 to 98, Ranger 93 to 95, Wizard 63 to 83, Dwarf 98 to 100, Bard 88 to 93; **two Rangers 68 to 90**, Knight and Bard 90 to 100, **four Rangers 50 to 83**. Heroes who fell per fight for two Rangers dropped from 0.78 to 0.25. These are bot players, 40 fights a cell (a few points of noise), and bots do not fumble as people do. My reading: the live right die accounts for most of the losses Dave saw, so **no monster change is proposed**. Four Rangers at 83% is the weakest cell left and is worth watching, not changing. Full table: [T21/starters.md](T21/starters.md).

## 3. Reward handoff

Reproduced on the real client code, with the second phone's live feed stalled (the replay on its screen allowed to finish first, so the replay is not what is measured): **old code, the waiting phone never learned it was its turn within 15 s and made no reads** ([online-baseline-settled.json](T21/online-baseline-settled.json)). The old safety poll only watched a fight; it did nothing after victory. Now a phone that is waiting on someone else (the spoils, the reveal, a ready-up, the camp) asks the table every 2.5 s, one fetch at a time, and once whenever it returns to the screen or the network comes back. The live feed stays primary. It sends nothing, so it cannot skip anyone's choice. Measured with the same stalled feed: **0.4 to 2.3 s, one read** at both phone sizes.

## 4. Heart control

One compact group: the current face in the middle, Down and Up buttons either side showing the destination symbol and number, the real cost and whether it is used this round, Close, all visible together with no inner scrolling at 375x548 and 390x664; the long explanation sits behind Rules. It updates in place after a change. Once a round, the legal endpoints and the online authoritative command are as before. Screenshots: [heart-375x548-after](T21/heart-375x548-after.png), [heart-390x664-after](T21/heart-390x664-after.png) and the before shots. The check measures every button against the sheet and fails on any clip.

## 5. Full weapon cards online

Pack rows, equipped hands, store shelf rows and the spoils all open the full card (faces included, Close always on screen); rows now carry a visible "Full card ›" hint, spoils say "Tap the card to see it large". Looking changes nothing (hero identical before and after, checked). Online evidence: [gear rows](T21/cards-390x664-gear-rows.png), [large card](T21/cards-390x664-gear-big.png), [store](T21/cards-390x664-store.png), [spoils picker](T21/online-fixed-390x664-spoils.png), [spoils card](T21/online-fixed-390x664-spoils-card.png), and the same at 375x548.

## 6. Report export

Locked-slot dice no longer appear as "dnull" (only dice the hero owns are listed). A hero who fell before striking now keeps the totals and target they locked in, marked as never having struck (the engine reports each fighter's committed totals). A defeat names the foes last seen, marked "last seen", with a note of what that basis is. Test in `test/battlereport.test.mjs` (fails without the fix).

## Not done, and still open

The share sheet's native title prefix is unresolved and separate. Online magic drops still carry empty actions (a limitation of the shared view). Early two-player scaling beyond the table above (three players, the first elite) was not measured. The objective-focus card visuals (T05 follow-up) come next as their own checked update. The Crockpot objective audit lists **Glass Shield** as unfair now that every non-Ranger blocks every round; that is an Astra ruling, not changed here.
