# G1 Gemini's review of QuestDice (3 November 2026)

Gemini ran a review of the game for Dave. Dave chose **Bad #5** and **Bad #2** for Gemini to work on now. The other items are recorded for later.

## Top 5 best things (Gemini)
1. The 3x3 body of dice: the grid is the hero's anatomy, lanes and rows are readable, and low rolls still pay.
2. Telegraphed monster moves and puzzle-like rounds: heroes act first, Monster Specials and road danger labels give real decisions.
3. Co-op table dynamics: slowest Feet draws the blows, secret objective envelopes, story packs with name interpolation.
4. The tactile board-game look: cardboard camp, punch-out chits, painted magic cards, procedural 3D and audio, offline PWA.
5. A deterministic engine (seeded PRNG), simulators, battle reports and a fast test suite.

## Top 5 bad things (Gemini)
1. **Act III has no bestiary of its own, and late offense plateaus.** Act III reuses Act I's monsters with more health and damage; boss fights drag.
2. **Rule churn and retired features (G1-2, Gemini, REVIEW).** `applyRelease()` and `useWeapons2()` overwrite WEAPONS, LOOT_WEIGHTS, CLASSES, START_DICE, WEAR.off and TEAMWORK at startup, so reading data.js or DESIGN.md gives rules that are not live. Charms (`TEAMWORK.noCharms`), weapon wear (`WEAR.off`) and store tonics are retired but their code, UI branches and comments remain; daily.js still picks a daily charm that `charmsResting()` hides.
3. **Large files and two UI layers.** engine.js, scrui.js, screens.css, battle3d.js and hud.css are very large; the old 2D UI (ui.js, view.js) and the 3D layer (scrui.js, battle3d.js) both exist, plus preview copies.
4. **Six-in-a-row straights and hidden +1 faces.** Straights are rare in Act I; risky/brutal weapon faces show a +1 icon but count as the lower number for triples and straights.
5. **Online security and reliability (G1-5, Gemini, DONE — reviewed by Claude).** Each room is one JSON blob in `qdRooms/{CODE}.state`, rewritten in a transaction on every tap (contention with 4 to 6 phones). In `firestore.rules`, any signed-in phone can post any daily score up to 99999 to its own `qdDaily/{day}/scores/{uid}`, can update another hero's public card (`qdHeroPublic`, name fixed but class, level, act and step changeable), and hero names in `qdHeroNames` can never be released (`update, delete: if false`).

## Claude's check of the claims (3 November 2026)
- Confirmed in code: `STRAIGHT_RULE = { less: 2, min: 6, max: 6 }`; BALANCE.md says Act III reuses Act I's monsters; the three firestore.rules findings match the file as quoted above.
- Firebase rules deploy separately from the game: `firebase.json` points at `firestore.rules`; deploy with `firebase deploy --only firestore:rules`.
- Note for Bad #1: today's monster-gold cut (`ACT_GOLD = [1, 0.75, 0.5]`) means fewer late upgrades, so watch Act III's pacing.

## G1-5 & G1-2 delivery and verification (3 November 2026, Gemini)
- **G1-5 (Online security & contention — commit `c5ea0075`, build `20261103cp11`, live rules deployed to `questdice-eef50`):**
  - `firestore.rules`: Enforced `^[A-Z0-9]{4}$` room code, `hasOnly` schemas on `qdRooms`, `qdHeroNames` and `qdHeroes`, monotonic `seq >= resource.data.seq` on room updates, valid class/level/act/step bounds on `qdHeroPublic`, `YYYY-MM-DD` date key and monotonic `score >= resource.data.score` on `qdDaily/{day}/scores/{uid}` updates, and `allow delete: if false` on `qdHeroes`.
  - `js/cloud.js`: Fixed synchronous `onAuthStateChanged` TDZ reference on `off` in `ready()`, added retry with jittered backoff (`maxAttempts: 10`) for `aborted`/`failed-precondition`/`deadline-exceeded` room transactions, skipped redundant Firestore writes when `aim` targets the already-aimed monster, and validated/clamped `submitDaily` inputs before comparing with stored bests.
  - **Live Firebase verification (`questdice-eef50`):** Deployed rules via `firebase deploy --only firestore:rules --project questdice-eef50` after pushing matching client code. Verified against live Firestore REST API with anonymous auth tokens: room creation (`200`), second guest join + monotonic `seq` increment (`200`), backwards `seq` rejection (`403`), host room deletion (`200`), daily score creation (`200`), lower daily score rejection (`403`), higher daily score update (`200`), invalid date key rejection (`403`), `qdHeroNames` extra-field rejection (`403`), and `qdHeroPublic` invalid-class rejection (`403`).
- **G1-2 (Retired systems & runtime patches — build `20261103g1`):**
  - `js/daily.js` & `test/daily.test.mjs`: Guarded `dailyHero` so `takeCharm` is skipped when `charmsResting()` is true.
  - `js/data.js`: Removed unused `STORE_TONICS` and `STORE_TONICS_SHOWN` constants; updated comments on `WEAR`, `FORGE_COST`, `WEAPON_SIZE_STEPS`, `CHARMS`, `EXPERIMENT`, `WEAPON_TRAINING`, `TEAMWORK` and `CLASS2` to state clearly what `applyRelease()` activates in the live game while keeping base switches and `CHARMS` definitions intact for save compatibility ("Yours are kept safe in your save") and isolated unit tests. Kept `WELCOME_GOLD` and `ACT_GOLD = [1, 0.75, 0.5]`.
  - `js/engine.js`: Removed dead `forgeInfoOld`, `trainInfoOld` and `handsMul` functions and unused `FORGE_COST` / `WEAPON_SIZE_STEPS` imports; kept `forgeInfo`/`forgeWeapon` and `storeTonics`/`buyTonic` stubs so stale operations are rejected cleanly without touching prepaid campaign blessings; updated `useWeapons2()` and `useCampTraining()` comments to reflect live boot state.
  - `js/release.js`: Updated header documentation with the full chronological list of live switches turned on at boot.
  - **Tests:** `npm test` **568/568** passing (`test/cloud.test.mjs`, `test/daily.test.mjs`, `test/release.test.mjs`, `test/nowear.test.mjs`, `test/teamwork.test.mjs`, `test/weapons2.test.mjs`, `test/weaponsize.test.mjs`, `test/weapontraining.test.mjs`, `test/encounters.test.mjs`, `test/save.test.mjs`).
