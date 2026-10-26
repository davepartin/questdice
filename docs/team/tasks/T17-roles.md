# T17: weapon roles and cumulative faces, candidate for review (Claude, 26 October 2026)

**Status: PROPOSED, nothing live changes.** Astra's assignment (26 Oct): finish the distinct weapon roles, the Spear comparison and the cumulative faces, so that buying a bigger size keeps every earlier face and adds two. The purchase wiring (build 20261026wu1) is untouched. The candidate is behind a switch that is off in the release; only a preview folder named `weapon-roles` turns it on.

Files: `js/weaponladder.js` (the whole table, in one place), `tools/t17-roles.mjs` (the measurements), [T17-roles-tables.md](T17-roles-tables.md) (its output), [T17-roles-fights.md](T17-roles-fights.md) (bot fights, today against candidate), `test/t17roles.test.mjs`, `dev/weaponroles.mjs` (the preview check). Reproduce: `node tools/t17-roles.mjs --boards=20000`, and `RELEASE=1 T17_CAND=1 ENC=0,1,2,3 node tools/t22-weapons.mjs 40 out.md` (leave `T17_CAND` out for today's faces).

## The rules of the candidate

1. **Numbers run in order.** d4 has 1 to 4, a d6 adds 5 and 6, a d8 adds 7 and 8, a d10 adds 9 and 10. No blanks and no repeated numbers, so every weapon die takes part in straights and triples (Dave, 24 Oct). The face number is what combinations read; effect icons never change it.
2. **A face is fixed by its number.** Its colour, its effects and their amounts depend only on the weapon, the metal and the number, never on the die's size. So a bigger die keeps every earlier face exactly and adds two (tested for every weapon, metal and arrow type).
3. **Every weapon has red and blue faces** (Dave, 25 Oct: each weapon balances attack and block). The role is how much of each, where the effects sit and how big they are. One exception, below: the Arrows.
4. **Metal adds effects, never numbers or colours.** Bronze is plain. Silver is about half an icon a roll and Gold about one, close to what the live game gives today (the tables show both). Gold carries every effect Silver does.
5. **Effect kinds are the ones the engine already has** (pierce, heal, magic). No gold-on-weapons, no new rules, no new speed or range.

## The eight roles

Each is one sentence, and what it is good and bad at. Numbers are d10, Gold (the full table with every size and metal is in [T17-roles-tables.md](T17-roles-tables.md)); "red" is the share of faces that attack at d4 / d6 / d8 / d10.

| Weapon | Role | Strength | Tradeoff | You pick it when |
|---|---|---|---|---|
| **Dagger** | Quick: an even mix, a small effect on every other face | red 50 / 50 / 50 / 50; pierce when it strikes, heal when it guards; never stuck on one colour | no big hit, no big guard, no icon bigger than 2 | you want a steady trickle of effects whatever the fight does, with any partner |
| **Sword** | Reliable: leans to attack, guards almost as often | red 75 / 67 / 63 / 60; magic on strikes, heal on guards | nothing concentrated, no crit faces | the default; you do not know what is coming |
| **Axe** | Brute: every big number attacks | red 50 / 67 / 75 / 80; expected attack 5.2 a roll, the biggest pierce (3 on the 10) | nearly no guard (0.3 a roll); effects only start at 3, big ones only from 8 | you carry a shield in the other hand and want the fast kill |
| **Spear** | Armour breaker: a steady single pierce on strike and guard faces alike, never a big one | red 75 / 67 / 75 / 70; the only weapon whose blue faces also pierce; a pierce on every face at Gold | no crit, attack 3.7 a roll against the Axe's 5.2 | the monsters have armour, and you want pierce every round whichever colour lands |
| **Round Shield** | Steady guard: leans to block and heals when it does | red 25 / 33 / 25 / 30; expected block 3.7; heal on its guards | little attack; its few strikes carry nothing | you want to survive long fights |
| **Tower Shield** | Wall: every big number guards | red 50 / 33 / 25 / 20; expected block 5.2; magic and heal on big numbers, up to 3 on the 10 | almost no attack; no effects below the 3, big ones only from 8 | the heaviest guard; a dwarf's partner for the Axe |
| **Bow** | Even, leaning a little to guard | red 50 / 50 / 38 / 40; pierce on strikes, magic on guards | modest numbers either way | you want the Arrows to have a guard hand next to them |
| **Arrows** | All attack; the ammunition marks three arrowheads (3, 5 and 7) | expected attack 5.5; arrowheads keep their number | no guard of its own (the Bow gives it); see Open question 1 | the Ranger's pair |

## The Spear, in numbers

Today the Spear is the weak link: nearly an Axe at the big sizes and a Dagger at the small ones, and the worst offensive weapon from Act II on in the T22 fights. In the candidate:

- **What it is:** 70 to 75% red, effects on every face at Gold, all of them a single pierce, and the only weapon with effects on blue faces that hit. The Axe puts its effects only on red faces, big, and only from number 3; the Dagger is 50% red with pierce on red and heal on blue.
- **How far apart (my distance over ten shape numbers; [section 3](T17-roles-tables.md)):** today the Spear's nearest weapons are the Sword 0.09, the Axe 0.11 and the Dagger 0.13; in the candidate they are the Dagger 0.09, the Bow 0.10, the Sword 0.12 and the Axe 0.13. **This is honest: by that distance the Spear is not much farther from the others than before.** The candidate's change is that its identity is easier to say and to see on a card (pierce on every face, blue faces too, never big), not that it is far away in every number. The smallest gap among all pairs is the Bow and the Dagger, 0.07 (today 0.09, Spear and Sword), so no pair is closer than today's closest, but the roster is not wildly more spread out either.
- **In the fights (bots):** today Spear with a Round Shield wins 55% / 50% / 42% (Act II step 5, Act III step 8, step 9); the candidate 58% / 40% / 40%, the same band as Dagger and Axe with the same shield (58/48/28 and 52/52/35). Gaps of 10 points are inside the noise at 40 fights a cell, so the claim is only that the Spear is **no longer an outlier**, not that it is better.

## What the numbers say (bots and first-roll boards)

Full tables in [T17-roles-tables.md](T17-roles-tables.md) and [T17-roles-fights.md](T17-roles-fights.md); the headline:

1. **No windfall in fights.** Mean win rate across the 13 weapon sets: Act II 60.0 today, 57.1 candidate; Act III step 8 47.1 and 41.7; step 9 36.7 and 35.6. All within the noise except Act III step 8, which is about 5 points lower; the six sets with a shield lose about 10 points there (58 to 48).
2. **The spread between weapon sets narrows** (standard deviation of win rates across sets: 9.2 to 6.6, 12.2 to 8.7, 19.8 to 17.3). The extremes move in: Dagger with Tower Shield at Act III 72 / 78 today, 58 / 65; Dagger with Dagger 38 / 18, 42 / 28. Fewer weapon sets are dominant or hopeless.
3. **Straights and triples even out, and rise at small sizes** (first roll, no reroll, 20,000 boards a row): straights at d6 Silver run 3.4 to 6.8% across today's sets (the Axe and Tower pair is lowest) and 7.8% for every set in the candidate; at d10 Gold 1.0 to 3.1% today and 3.07% candidate. With every weapon die numbered the same way the weapon dice never differ between sets, so the chance is the same for all. Weapon triples: d6 1.4 to 4.3% today, 2.5% candidate; d10 0.7 to 1.7% today, 0.9% candidate.
4. **The number budget is equal.** Every weapon die now totals the same, 5.5 a roll at d10 (the sum 1 to 10 over ten faces), where today they run from 2.8 (Bow) to 5.0 (Arrows) and 4.1 to 4.6 for the rest. So the old "the Bow is half a Sword" difference is gone: weapons now differ in colour, effects and where they sit, not in how big their numbers are. The weapon face's own number rises Bow +96%, Dagger +34%, Spear +25%, Sword and Axe +20%, Arrows +10%; the effect on whole boards is much smaller because the hand die dominates.
5. **Defence rises, attack falls, for the mixed weapons.** Dagger with Dagger at d10 Gold, first roll: attack 21.1 to 12.4, block 1.9 to 13.2. Total attack plus block goes 23.0 to 25.7 (about +12%). That is the cost of every weapon having both colours: the "two Daggers is a pure attacker" start is gone (see Open question 3).
6. **Effects.** Icons a roll at d10: Silver 0.5 to 0.6 (today 0.4 to 0.6), Gold 0.8 to 1.2 (today 0.8 to 1.1). At d4 and d6 the candidate has fewer than today (today puts 3 icons on 4 faces of a d4); a bigger die is now worth more in effects as well as numbers. A bigger die only adds faces, so no face is lost, but an added face can move a share: the Dagger's red share stays 50%, the Sword's falls from 75% to 60%, the Round Shield's goes 25 / 33 / 25 / 30%.

## Open questions for Astra (and Dave)

1. **The Arrows are all red.** They keep the arrowhead ammunition faces and are the Ranger's attack hand, with the Bow as its guard. If "every weapon red and blue" should include them, the cost is the Ranger's attack (a blue face on the Arrows is a miss of an arrow). Recommendation: leave the Arrows all red and say so on the card.
2. **Equal number budgets.** This is the real design change and the reason straights improve. Alternatives that keep Bow small and Arrows large would need numbers repeated or skipped, which is what the old tables did and what Dave asked to move away from.
3. **Dagger with Dagger and the Bard.** The aggressive double-Dagger start (attack 14 and block 2 at d6 today) becomes an even mix (9 and 9). If Dave wants it kept as an option, the cheapest way is a Dagger that leans red, which makes it the Sword's twin; I did not do that.
4. **Existing heroes.** Turning the switch on changes every owned weapon's faces (their sizes, metals and sale values stay). No save changes. Astra to rule whether that is acceptable or whether owned weapons keep today's faces and only new ones use the table.
5. **Diamond and legendary weapons** keep their own faces (not in this table). A Diamond ladder proposal is in T17-faces.md; the Diamond decision is Astra's.
6. **The card text.** With the switch on, the camp weapon sheet says "Every face you have stays. The new size adds two." (one line in js/g3/scrui.js). Grok's card and the Preview d-next faces strip already read the engine, so they show the candidate's faces (checked in the preview). Anything else Grok wants to say on the card is theirs.

## What was checked, and what was not

- `npm test`: all pass, including `test/t17roles.test.mjs` (numbers in order at every size, metal and weapon; every earlier face kept exactly when the die grows; Silver is a subset of Gold; Bronze plain; arrowheads 1, 2, 3, 3 by size on the same numbers; the switch off means today's faces; the release has no ladder installed).
- Preview check (`dev/weaponroles.mjs`, a copy built with `node tools/preview.mjs . weapon-roles` and deleted again, never published): a Silver Spear bought d6 then d8 at camp, the earlier faces stayed, the card showed +1 to +4 then +5, +6 added.
- Bot fights: 40 per cell, four encounters, 13 weapon sets, released rules, same seeds for both modes. **Not done:** human play, Safari, the staged class matrix and 2/4/6-player parties the Director asked for, campaign-level runs, and a sweep of the straight and triple rates with a real reroll policy (the board table is a first roll only). Simulated only; nothing here is human-playtested.
- Preview not published. No Diamond, no resale or price change.

## Next

On Astra's ruling: tune the table if asked (it is data in one file), run the staged class matrix and party batches, then publish `preview/weapon-roles/` for Dave to try, and only then consider turning `WEAPON_SIZE.cumulative` on in the release.
