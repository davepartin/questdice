# T20 results: the released arrows, shown working (Claude, 24 October 2026)

Brief: [T20-arrow-demonstration.md](T20-arrow-demonstration.md). **Nothing in the game changed.** This is a demonstration of the released behaviour, plus one finding about wording the game shows the player.

**Evidence and its limits.** Build **20261024ns1** (the same stamp as the live site), served from this repository on a local dev server and driven by headless **Chromium 141** (Linux, software rendering). It is **not Safari and not the hosted site**, and no phone test is claimed or asked of Dave. A fresh browser profile was used, so no live save was touched. In the fights **the dice were set** with the practice battle's own script (`b.script.rolls`, the mechanism the tutorial uses); every picture says so. Setting the dice is the only thing that differs from a real fight: the engine, the report and the screens are the game's own.

How to rerun: `node tools/t20-arrows.mjs` (engine-level, checks every number below and fails if one is wrong; also run as `test/t20arrows.test.mjs`), then `node dev/serve.mjs 8135`, `node dev/t20arrows.mjs` and `node dev/t20sheet.mjs` for the pictures. Raw numbers: [T20/arrows.json](T20/arrows.json) (engine) and [T20/ui-results.json](T20/ui-results.json) (what the screens reported).

## Choosing the ammunition at camp

Gear, then the left weapon die, then Arrows: four cards under AMMUNITION, free to change at any time. The strip of faces under "Current" changes with the choice: Normal has no marked face; each of the others has one marked arrowhead on the d4 (face 4, showing "2" and the mark). [Camp sheet](T20/sheet-camp.jpg).

## The setup for every example

Bronze d4 Arrows in the left hand, the left-hand die showing **4**, no perks, charms, talents or Heart bonus on the arrow lane. The arrow lane is shown in isolation, not the Ranger's whole turn. Target guards are a monster's Wing Wall of 3.

| Case | What the die shows | On the target | Others | Picture |
|---|---|---|---|---|
| **Normal**, face 4 | R4 + hand 4 = **8 attack** | guard 3 leaves **5**: 60 → 55 | none | [sheet](T20/sheet-normal.jpg) |
| **Piercing**, arrowhead face 4 | A2 + 4 = **6, all of it pierce** | guard ignored: 60 → 54 | none | [sheet](T20/sheet-pierce.jpg) |
| **Fire**, arrowhead, three goblins | A2 + 4 = **6 attack** | guard 3 leaves **3**: 60 → 57 | the hand's **4** to each other goblin, after its own guard: an open one takes **4** (60 → 56), one guarding 3 takes **1** (60 → 59) | [sheet](T20/sheet-fire-group.jpg) |
| **Fire**, arrowhead, a lone boss | the same 6 | 200 → 197 | nobody is there: **no splash** | [sheet](T20/sheet-fire-lone.jpg) |
| **Fire**, ordinary numbered face 3 (R2) | R2 + 4 = **6**, the same on the target | 60 → 57 | **none**: no mark, no Fire | [sheet](T20/sheet-fire-numbered.jpg) |
| **Frost**, arrowhead, archer first | A2 + 4 = **6 attack** | 200 → 194 | the Ogre's 12-point Club lands as **8** (chilled before any block) | [sheet](T20/sheet-frost-first.jpg) |
| **Frost**, arrowhead, monster first | round 2 | 396 → 390 | the Ogre had already struck at **12**; the chill is spent on its **next** blow in round 3: **8** | [sheet](T20/sheet-frost-late.jpg) |
| **Frost**, ordinary numbered face 3 | R2 + 4 = 6 | 200 → 194 | **no chill**: the Club stays **12** | [sheet](T20/sheet-frost-numbered.jpg) |

These match the arithmetic in the brief exactly (the engine tool asserts each one, and the screens report the same numbers).

Why Fire differs against a lone boss and against several enemies: the arrowhead always puts the same 6 on the chosen target. The Fire part is the extra 4 that goes to every *other* living enemy, so it is worth something only when others stand, and each of them can still guard against it. A lone boss has no other enemy, so you paid for the marked face and the splash has nowhere to go.

Frost and timing: the chill softens the target's **next damaging** blow by the hand's number, once, and it never stacks. In round 1 the archer always acts first, so the chilled blow is the same round's. From round 2 a monster whose initiative die beats your feet die strikes first; then the blow already happened at full strength and the chill lands on the following round's blow. (For the demonstration the monster's initiative die was set high so it would act first.) The chill is applied before your block, so a blow your block already stops entirely gains nothing from it.

## What the choice costs and buys (arrow lane only, left hand 4, per throw)

The marked face keeps a small number (A2 on the d4) instead of the printed 4 on Normal's top face, so every special ammunition gives up a little ordinary damage on average. Mean damage from the arrow lane over a whole die, by target guard 0 / 3 / 6, from `tools/t20-arrows.mjs`:

| Die | Normal (no arrowheads) | Piercing | Fire | Frost |
|---|---|---|---|---|
| d4 (1 arrowhead) | 6.25 / 3.25 / 0.75 | 5.25 / 3.00 / 1.50 | 5.25 / 2.25 / 0 | 5.25 / 2.25 / 0 |
| d6 (2 arrowheads) | 7.00 / 4.00 / 1.50 | 5.83 / 3.83 / 2.33 | 5.83 / 2.83 / 0.33 | 5.83 / 2.83 / 0.33 |
| d8 (3 arrowheads) | 8.00 / 5.00 / 2.38 | 6.38 / 4.50 / 3.00 | 6.38 / 3.38 / 0.75 | 6.38 / 3.38 / 0.75 |
| d10 (3 arrowheads) | 9.00 / 6.00 / 3.30 | 7.30 / 5.20 / 3.40 | 7.30 / 4.30 / 1.60 | 7.30 / 4.30 / 1.60 |

In plain words: Normal hits hardest on the target in front of you and is the steady choice. Piercing gives up a little when the target has no guard, roughly breaks even around a guard of 3, and pulls ahead against heavy guards (6 and up), because the whole arrow hit goes through. Fire and Frost give up about a point a throw on the d4 (more on bigger dice) and pay it back only through their effect: Fire when other enemies stand beside the target, Frost when the target is a big hitter that will survive the round and whose blow your block would not already have stopped. These are per-throw averages of one lane, not a simulation of a fight, and they ignore rerolls (which make an arrowhead more likely to be chosen, not less).

## Finding: the in-game ammunition wording describes the old test rules, not the released ones

The released rules (`applyRelease`) set Piercing to *all*, Frost to *strength* and Fire to *full*. The game's own text still says the older thing:

| Where | Says now | Released behaviour |
|---|---|---|
| Camp card, `AMMO_LINE` in `js/g3/scrui.js:247` | Piercing: "your hand's Strength goes through block." | the whole arrow hit goes through (6 in the example, not 4) |
| same | Fire: "hits, and **half** splashes on the others." | the hand's **full** number splashes (4, not 2) |
| same | Frost: "hits, and **halves** its next blow." | the next blow is **reduced by the hand's number** (12 → 8, not 12 → 6) |
| Battle banner, `js/g3/hudkit.js:228` | Frost: "halves its next blow" | same as above (the Fire and Piercing banners already show the right numbers) |

The engine's own report text is correct ("the target's next blow is 4 softer"), and the numbers the player sees in the round report are right; only the camp card and the Frost banner would mislead someone choosing ammunition. Proposed wording, copy only, no rule change: Piercing "Arrowhead: the whole arrow hit goes through block." Fire "Arrowhead: hits, and your hand's Strength splashes on every other monster." Frost "Arrowhead: hits, and its next blow is softened by your hand's Strength." Banner sub-line "N softer next blow". **Shipped 25 October 2026 at Dave's go-ahead (build 20261025ar1):** the wording now comes from `js/ammotext.js`, which reads the rules in play, with `test/ammotext.test.mjs` pinning it to `arrowRules`; pictures: [camp](T20/ammo-copy-camp.png), [banner](T20/ammo-copy-banner.png). Stale code comments (`data.js` arrowRules, `engine.js` `thaw`) say the same old thing; they are harmless but should be tidied in the same change.

## Limits

One die size (Bronze d4) was shown in the pictures; the table above covers d6 to d10 by calculation from the real faces. Heart and other dice were set to 1, so a Heart Boost heal appears in the banners and is unrelated to the arrow. Chromium on Linux, not Safari. Not run against the hosted site (the build stamp is the same). Probabilities are per throw; they are not whole-turn trigger rates.
