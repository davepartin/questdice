# T17: weapon roles and cumulative faces, candidate for review (Claude, 26 to 27 October 2026)

**Status: PROPOSED, nothing live changes. Director review 26 Oct: structure and roles accepted for an isolated playable candidate, not for the live root ([T17-roles-director-review.md](T17-roles-director-review.md)); this page was corrected after it (27 Oct).** Astra's assignment (26 Oct): finish the distinct weapon roles, the Spear comparison and the cumulative faces, so that buying a bigger size keeps every earlier face and adds two. The purchase wiring (build 20261026wu1) is untouched. The candidate is behind a switch that is off in the release; only a preview folder named `weapon-roles` turns it on.

Files: `js/weaponladder.js` (the whole table, in one place), `tools/t17-roles.mjs` (the measurements), [T17-roles-tables.md](T17-roles-tables.md) (its output), [T17-roles-fights.md](T17-roles-fights.md) (bot fights, today against candidate; descriptive), `test/t17roles.test.mjs`, `dev/weapon-roles-check.mjs` (the real cover-purchase check in the preview). Reproduce: `node tools/t17-roles.mjs --boards=20000`, and `RELEASE=1 T17_CAND=1 ENC=0,1,2,3 node tools/t22-weapons.mjs 40 out.md` (leave `T17_CAND` out for today's faces).

## The rules of the candidate

1. **Numbers run in order.** d4 has 1 to 4, a d6 adds 5 and 6, a d8 adds 7 and 8, a d10 adds 9 and 10. No blanks and no repeated numbers, so every weapon die takes part in straights and triples (Dave, 24 Oct). The face number is what combinations read; effect icons never change it.
2. **A face is fixed by its number.** Its colour, its effects and their amounts depend only on the weapon, the metal and the number, never on the die's size. So a bigger die keeps every earlier face exactly and adds two (tested for every weapon, metal and arrow type).
3. **Every weapon has red and blue faces** (Dave, 25 Oct: each weapon balances attack and block). The role is how much of each, where the effects sit and how big they are. One exception, below: the Arrows.
4. **Metal adds effects, never numbers or colours.** Bronze is plain (the one exception: the special ammunitions' arrowheads are on every metal, Bronze included). Silver is about half an icon a roll and Gold about one, close to what the live game gives today (the tables show both). Gold carries every effect Silver does.
5. **Effect kinds are the ones the engine already has** (pierce, heal, magic). No gold-on-weapons, no new rules, no new speed or range.

## The eight roles

Each is one sentence, and what it is good and bad at. Numbers are d10, Gold (the full table with every size and metal is in [T17-roles-tables.md](T17-roles-tables.md)); "red" is the share of faces that attack at d4 / d6 / d8 / d10.

| Weapon | Role (as the table states it) | Strength | Tradeoff | You pick it when |
|---|---|---|---|---|
| **Dagger** | Mixed: an even split of strike and guard, small effects spread over the faces. **Silver pierces on the strikes; Gold adds a heal on the guards.** | red 50 / 50 / 50 / 50, so never stuck on one colour; at Gold an effect on every face | no big hit, no big guard, no icon bigger than 2 | you want a steady trickle of effects whatever the fight does, with any partner |
| **Sword** | Reliable: leans to attack, guards almost as often. **Silver pays magic on the strikes; Gold adds a heal on the guards.** | red 75 / 67 / 63 / 60 | nothing concentrated, no crit faces | the default; you do not know what is coming |
| **Axe** | Brute: every big number attacks and only the big numbers carry effects (pierce, bigger with the number); the two smallest guard. | red 50 / 67 / 75 / 80; printed attack 5.2 a roll; at Gold d10 1.2 pierce a roll, 3 on the 10 | printed block 0.3 a roll and falling with every step; no effect below the 4 (Silver) or 3 (Gold) | you carry a shield in the other hand and want the fast kill |
| **Spear** | A single pierce on strike and guard faces alike, never a big one: Silver on half the faces, Gold on every face. | red 75 / 67 / 75 / 70; the only weapon whose blue faces also pierce (tested through a guard) | no icon above 1; printed attack 3.7 a roll against the Axe's 5.2; at Gold d10 1.0 pierce a roll against the Axe's 1.2 | you want some pierce every round whichever colour lands |
| **Round Shield** | Steady guard: leans to block, and only its guards carry effects: a heal on the guard, nothing on the few strikes. | red 25 / 33 / 25 / 30; printed block 3.7 | little attack; its strikes carry nothing | you want to survive long fights |
| **Tower Shield** | Wall: every big number guards, and only the big numbers carry effects: **magic** (bigger with the number), no heal; the two smallest strike. | red 50 / 33 / 25 / 20; printed block 5.2; magic 3 on the 10 at Gold | almost no attack; no effects below the 4 (Silver) or 3 (Gold) | the heaviest guard; a dwarf's partner for the Axe |
| **Bow** | Mixed, leaning a little to guard: a pierce on the strikes and magic on the guards, on half the faces at Silver and every face at Gold. | red 50 / 50 / 38 / 40 | modest numbers either way; d6 to d8 lowers printed attack (below) | you want the Arrows to have a guard hand next to them |
| **Arrows** | All attack: a pierce on every other strike at Silver and every strike at Gold; the three arrowheads (3, 5 and 7) carry the ammunition, Bronze included. | printed attack 5.5; arrowheads keep their number | no guard of its own (the Bow gives it) | the Ranger's pair |

"Mixed" and "Reliable" describe the colour mix and where the effects sit. Nothing here is an initiative or speed bonus: the engine gives weapons none.

## The Spear, in numbers

Today the Spear is the weak link in the T22 fights: nearly an Axe at the big sizes and a Dagger at the small ones. In the candidate:

- **What it is:** 70 to 75% red; effects on half the faces at Silver and every face at Gold, all of them a single pierce; and the only weapon whose **blue** faces carry a damaging effect. That is implemented and tested: the pierce is added whatever the lane colour and lands after the guard is subtracted (a Silver Spear's blue 3 deals exactly 1 through a guard that stops every strike; `test/t17roles.test.mjs`). The Axe puts its effects only on red faces, from number 3 or 4, and bigger; the Dagger is 50% red with pierce on the red faces at Silver.
- **Not claimed:** that the Spear is the best anti-armour purchase. The Axe has the larger printed attack, and at Gold d10 more pierce a roll (1.2 against the Spear's 1.0). Armoured against unarmoured matched loadouts are still to be run (below).
- **Distance:** [section 3](T17-roles-tables.md) lists a distance over ten shape numbers. It is an arbitrary weighted summary, not a test of whether two weapons are different to play, and I am not using it to claim the roster is more or less distinct than today (the closest pair in the candidate, Bow and Dagger at 0.07, is closer than today's closest, 0.09). Eight types stay provisional until each has a situation where it is the right choice.
- **In the fights (bots, descriptive):** Spear with a Round Shield wins 55 / 50 / 42% today and 58 / 40 / 40% in the candidate (Act II step 5, Act III steps 8 and 9), beside Dagger and Axe with the same shield. The tables are aggregates, so they cannot show that any of these differences is significant or that the Spear has stopped being an outlier.

## What the numbers say (bots and first-roll boards; descriptive)

Full tables in [T17-roles-tables.md](T17-roles-tables.md) and [T17-roles-fights.md](T17-roles-fights.md). The fight tables are 40 matched fights a cell, aggregates only, so **nothing below is a significance claim**; new runs keep per-seed outcomes and will report paired differences and intervals.

1. **Fights (bots):** mean win rate across the 13 weapon sets, today then candidate: Act II step 5 60.0 and 57.1; Act III step 8 47.1 and 41.7; step 9 36.7 and 35.6. The six sets with a shield at Act III step 8: 58.3 and 47.9, the largest fall in the tables and the first thing to follow up. The spread of win rates between sets is smaller (standard deviation 9.2 to 6.6, 12.2 to 8.7, 19.8 to 17.3); the Dagger with Tower Shield goes 72 / 78 to 58 / 65 and Dagger with Dagger 38 / 18 to 42 / 28 at Act III.
2. **Straights and triples (first roll, no reroll, 20,000 boards a row):** straights at d6 Silver run 3.4 to 6.8% across today's sets and 7.8% for every set in the candidate; at d10 Gold 1.0 to 3.1% today and 3.07%. With every weapon die numbered the same way the weapon dice never differ between sets, so the chance is the same for all. Weapon triples: d6 1.4 to 4.3% today, 2.5% candidate; d10 0.7 to 1.7% today, 0.9% candidate. Reroll-aware rates are still to be measured.
3. **The printed-number budget is equal** (Director: this follows from the requirement, and does not make combat strength equal; colour routes the hand's Strength and effects change value). Every weapon die prints 5.5 a roll at d10 where today they run from 2.8 (Bow) to 5.0 (Arrows). The weapon face's own number rises Bow +96%, Dagger +34%, Spear +25%, Sword and Axe +20%, Arrows +10%; on whole boards the effect is smaller because the hand die dominates. Attack, block and effects are reported separately in the tables.
4. **Defence rises, attack falls, for the mixed weapons.** Dagger with Dagger at d10 Gold, first roll: attack 21.1 to 12.4, block 1.9 to 13.2; attack plus block 23.0 to 25.7. The "two Daggers is a pure attacker" build is gone (Director: keep it that way; the approved Bard starter is Dagger and Round Shield).
5. **Effects.** Icons a roll at d10: Silver 0.5 to 0.6 (today 0.4 to 0.6), Gold 0.8 to 1.2 (today 0.8 to 1.1). At d4 and d6 the candidate has fewer than today (today puts 3 icons on 4 faces of a d4).

## What each size step does (a bigger die is not better in every output)

A bigger die keeps every face and adds two, but the averages are over all faces, so a step can lower one output while raising another. [Section 2b of the tables](T17-roles-tables.md) lists every step with the fall marked ▼. The ones to say honestly on a card:

- **Bow d6 to d8:** printed attack 1.83 to 1.38 while printed block rises 1.67 to 3.13 (the new faces 7 and 8 are both blue).
- **Axe, every step:** printed block falls (0.75, 0.50, 0.38, 0.30) as attack rises 1.75 to 5.20: by design the Axe becomes more of an attacker.
- **Tower Shield, every step:** printed attack falls as block rises; **Round Shield d6 to d8** printed attack falls 1.50 to 1.13 while block rises 2.00 to 3.38; **Spear d6 to d8** printed block falls 1.50 to 1.13 while attack rises 2.00 to 3.38.
- **Gold effects:** Round Shield d4 to d6 lowers Gold icons a roll from 0.75 to 0.67 (a new red face carries none).

## The Director's rulings (26 Oct, [T17-roles-director-review.md](T17-roles-director-review.md)) and how this page follows them

1. **Arrows:** all red, an explicit exception to the mixed-colour rule for this preview; described as such on the card text and here; complete legal loadouts and all four ammunitions to be evaluated.
2. **Equal base-number budget:** accepted (1 to N in order, exact prefixes, metal changes effects only). It does not make combat strength equal; attack, block and effects are reported separately. No skipped or repeated numbers or blanks to keep the old Bow small.
3. **Dagger:** keeps its 50/50 mix. No double-Dagger starter, no starter chooser, no Sword colour profile copied onto it. The approved Bard starter is Dagger and Round Shield. Player copy says "mixed", not "quick". **Measure the Bard and Dagger loadouts in the class stage.**
4. **Existing heroes:** the preview uses the one table for every ordinary item, including a copied hero's, with live storage and cloud isolated and no live save mutated. A later release prefers one consistent ordinary-weapon table, keeping UIDs, ownership, sizes, metals, ammunition, paid investment, gold and sale values, and says faces change. No grandfathering system.
5. **Diamonds and legendaries:** unchanged and separate. Retained legacy ordinary weapons (Staff, Mace, Long Sword and so on) keep today's faces and are tested explicitly.
6. **Card wording:** "Every face you have stays. The new size adds two." only for an item the table actually serves (`E.servedByLadder`); the old wording for anything else. Grok's art and the removed type icons untouched.

## What was checked, and what was not

- `npm test`: all pass, including `test/t17roles.test.mjs` (numbers in order, exact prefix on every purchase, Silver a subset of Gold, role-copy facts, item-specific wording, legacy weapons on today's faces and still trainable, **blue-face pierce through a guard** in evaluate and resolve, a **co-op table purchase** through every size with the saved table rolling the same faces, the switch off and no ladder in the release).
- **Real cover purchases in the preview** (`node dev/weapon-roles-check.mjs`, builds `preview/weapon-roles/` first): 12 runs, all passed: Silver Spear, Gold Axe, Gold Arrows with frost heads and a Silver Mace (outside the roster) at 375x548, 390x844 and 430x932. Each run buys d6, d8 and d10 through the real covers at 50 / 100 / 200; a later cover buys nothing; gold, the sale chip and the covers update with each purchase and the sale value rises; every face on the card (number, colour, effect kind and count, arrowhead) equals the engine's die, and for the roster weapons equals `js/weaponladder.js`; each size is the first n faces of the d10; the stored save, reopened after a reload, rolls the new size and has the right gold; the item-specific sentence is right for the Spear, Axe and Arrows and the old wording for the Mace; nothing spills the width; no page errors. Screenshots in the run folder; configurable `CHROME` and output path.
- **Not claimed:** human play, Safari, Firebase, an online two-phone session (the table route is tested by command, not by two phones), the class stage, parties, campaigns, reroll-aware straight and triple rates, armoured against unarmoured, per-seed paired statistics. Everything measured is bot-simulated and descriptive.
- Preview published as below once it passed; no Diamond, resale, price, monster or Heart change.

## Next (the Director's order)

1. Publish `preview/weapon-roles/` (done when the board says so) and record URL, build, tests and limits on the board.
2. Staged balance using existing results, per-seed outcomes kept: all five classes with their approved starters at early and middle progression; the observed shield-loadout regressions, Dagger pairs and Spear against Axe and Dagger under controlled armour and guard; reroll-aware straight and triple rates; mixed 2, 4 and 6-player parties; a small matched-seed campaign comparison. One compact comparison and recommendation before any live activation. No monster, heal, Heart, price or Diamond change to rescue this table.
