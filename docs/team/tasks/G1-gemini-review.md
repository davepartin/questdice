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
2. **Rule churn and retired features (G1-2, Gemini, IN PROGRESS).** `applyRelease()` and `useWeapons2()` overwrite WEAPONS, LOOT_WEIGHTS, CLASSES, START_DICE, WEAR.off and TEAMWORK at startup, so reading data.js or DESIGN.md gives rules that are not live. Charms (`TEAMWORK.noCharms`), weapon wear (`WEAR.off`) and store tonics are retired but their code, UI branches and comments remain; daily.js still picks a daily charm that `charmsResting()` hides.
3. **Large files and two UI layers.** engine.js, scrui.js, screens.css, battle3d.js and hud.css are very large; the old 2D UI (ui.js, view.js) and the 3D layer (scrui.js, battle3d.js) both exist, plus preview copies.
4. **Six-in-a-row straights and hidden +1 faces.** Straights are rare in Act I; risky/brutal weapon faces show a +1 icon but count as the lower number for triples and straights.
5. **Online security and reliability (G1-5, Gemini, IN PROGRESS).** Each room is one JSON blob in `qdRooms/{CODE}.state`, rewritten in a transaction on every tap (contention with 4 to 6 phones). In `firestore.rules`, any signed-in phone can post any daily score up to 99999 to its own `qdDaily/{day}/scores/{uid}`, can update another hero's public card (`qdHeroPublic`, name fixed but class, level, act and step changeable), and hero names in `qdHeroNames` can never be released (`update, delete: if false`).

## Claude's check of the claims (3 November 2026)
- Confirmed in code: `STRAIGHT_RULE = { less: 2, min: 6, max: 6 }`; BALANCE.md says Act III reuses Act I's monsters; the three firestore.rules findings match the file as quoted above.
- Firebase rules deploy separately from the game: `firebase.json` points at `firestore.rules`; deploy with `firebase deploy --only firestore:rules`.
- Note for Bad #1: today's monster-gold cut (`ACT_GOLD = [1, 0.75, 0.5]`) means fewer late upgrades, so watch Act III's pacing.
