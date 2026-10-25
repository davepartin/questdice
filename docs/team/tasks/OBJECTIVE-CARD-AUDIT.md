# Objective / Secret Objective card audit

# PROPOSED - needs Astra ruling

By Crockpot (Grok Bot), 25 Oct 2026, at Dave's request ("some are impossible to do and need a review"). Read-only audit of `BONUS_GOALS` and `CARDS` in `js/secrets.js` against the current code. **No game data or code was changed.** Every fix below is a proposal. Nothing was simulated; claims come from reading the code. Where a card's chance needs numbers, the fix says "measure" (Claude's harness).

## Facts from the code that drive the verdicts
- **Who gets what.** Solo (1 hero) gets one `BONUS_GOALS` card as a wager (`dealBonusGoal`). Tables of 2 to 6 get `CARDS` envelopes (`dealEnvelopes`: `team = n > 1`; solo never gets an envelope). So teammate-based `CARDS` never reach a solo player. The `team: true` flag is not used as a filter today (`ids(kind, true)` is always called with `true`), but this is harmless because envelopes are only dealt at 2+.
- **Payouts.** Covers, challenges and rivals pay only when the team wins (`judge`). Bonus Goals pay only on a win (`judgeBonus`).
- **Bonus Goal thresholds are fixed numbers (40 / 50) in every act**, but stakes and payouts grow by act (`BONUS_STAKE` 10/20/30).
- **Starting dice.** `START_DICE` = N, W, C, E, S, NW, SW. Head and hands are d4 (`newHero` strength W 4 or 6, E 4; `mindSize` 4), talents d4, heart d6. T21 adds NE, so every hero starts with a weapon die on each side. Non-Rangers get a Bronze shield on the right, which means block every round.
- **Straights** need 6 in a row (`straightMin`, `STRAIGHT_RULE`, "six in a row for the whole game"). With mostly d4s, a straight needs two dice showing 5 and 6. Early on that is rare.
- **Round log** (`logRound`, `js/engine.js` ~2031) records these fields:
  - `magic` = min(dealt, power mods atk/pierce/splash/aoe), so only damage from powers counts.
  - `leader` = first by heat (slowest feet or guard), and only with 2+ heroes.
  - `target` = the monster you attacked; `blk` = your block total; `paid` = rerolls beyond the free ones.
- **Team actions** (`teamAction` ~2020): potion throw, magic share, revive. Each is one team action a round.

## Summary

| Verdict | Count | Cards |
|---|---:|---|
| OK | 26 | nopotion, medic, together, quick, spark, goldrush, finisher, wall, bigswing, lucky, crowd, mittens, thinker, teetotal, biggame, heartmatch, cliffhanger, saver, talentshow, slacker, cold, longfight, pact, fall, laststand, spare |
| IMPOSSIBLE (in some deals) | 1 | lonewolf |
| UNFAIR (near impossible, luck/class-locked, or wrong scale by act) | 12 | magic40, block40, deal50, arcane, straights, fleet, strongarm, bright, thrice, neverlast, glass, goldfumble |
| TRIVIAL | 4 | noreroll, thrifty, hoarder, lead (lead is trivial by design) |
| UNCLEAR wording | 1 | shield |

## Problem cards (proposed fixes)

| Card | Verdict | Why (code) | Proposed fix |
|---|---|---|---|
| **lonewolf** Lone Wolf (forced bribe) | IMPOSSIBLE when one monster is left or the fight has one monster | Fails if you ever share a target with a teammate in the same round (`x.others ... o.target === r.target`). Bribes come mainly in big fights (`big ? 2 : 0.3`); bosses are often alone, and every hero must target that one monster. | Deal only when the fight has 3+ monsters at the start (like `spare`'s `spareable.length >= 2` filter), or reword to "...while two or more monsters stand". |
| **magic40** Spark storm (solo Bonus Goal) | UNFAIR | Only damage from powers counts (`logRound` `magic`). The fixed 40 at Act I with about 6 start magic is likely out of reach; at Act III it is easier. Classes with fewer damage powers are worse off. | Scale by act (e.g. 20 / 40 / 60) or by class; measure the rate in the harness. |
| **block40** Hold the line (solo) | UNFAIR (scale) | Fixed 40 blocked; trivial with a late shield die, hard for an Act I Ranger with no shield. | Scale by act; measure per class. |
| **deal50** Heavy hitter (solo) | UNFAIR (scale) | Fixed 50 dealt; trivial late, tight early. | Scale by act (e.g. 30 / 60 / 90); measure. |
| **noreroll** First rolls (solo) | TRIVIAL | Met by just not paying for rerolls (`paid` = 0); a free 3x return for doing nothing. Same goal as `thrifty`. | Cut, or make it "Win without any reroll, free ones included". |
| **arcane** Arcane Ace (rival) | UNFAIR (class) | Scores only damage from powers; a hero with weak or no damage powers scores near 0. When both score 0, nobody wins (`best > 0`). | Deal only when both rivals have a damage power, or switch to "spend the most magic". |
| **straights** Straight Shooter (rival) | UNFAIR (early) | 6-in-a-row with mostly d4 dice is rare in Act I; usually 0-0, so no winner. | Deal only from Act II, or only when both rivals have the dice for one (`straightMin` reachable). |
| **fleet / strongarm / bright** (rivals: feet, hands, head totals) | UNFAIR (class) | They sum raw die numbers, so a bigger die wins (feet size by class `CLASSES.feet`, slow classes' d6 hand, bought mind sizes). This rewards owning bigger dice, not play. | Score "rolled your die's top face most often", or deal only between same-size dice. |
| **thrice** Three Times Lucky (challenge) | UNFAIR (near impossible) | Needs a triple in 3 separate rounds; fights often end in about 3 rounds (T21 report: 3 rounds), so it needs one almost every round. | Lower to 2 rounds (like `mittens`), or deal only in big fights. |
| **neverlast** Never Last (challenge) | UNFAIR (luck) | You must never be `leader` (slowest feet or guard) in any round. At 2 players it is about a coin flip each round, and feet die size by class decides most of it. | Reword to "Be the target at most once", or deal only at 4+ heroes. |
| **glass** Glass Shield (offered bribe) | UNFAIR after T21 | Needs `blk` = 0 in 2 rounds. After T21 every non-Ranger has a Bronze shield die active on the right, so they block almost every round; the player cannot switch it off. | Reword to "Block 3 or less in 2 rounds", or deal only to heroes without a shield die. |
| **goldfumble** Golden Fumble (forced bribe) | UNFAIR (early) | Requires rolling at least one straight; rare in Act I (see straights), so the forced card usually just fails. | Deal only from Act II, or drop "(and roll at least one)" so it means "never take the attack side". |
| **thrifty** Thrifty (challenge) | TRIVIAL | Same as `noreroll`: just do not pay for rerolls. | Raise to "Use no rerolls at all" or cut. |
| **hoarder** The Hoarder (forced bribe) | TRIVIAL early | Keep 6+ magic; heroes can start with about 6 (T21 report) and do nothing. Being mild is intended for forced cards, but here it is free. | Make it "End with more than you started +4", or accept as is. |
| **lead** Lead the Charge (cover) | TRIVIAL (by design) | Met by winning; cover cards are meant to be honest and easy. | Keep (intended); noted only. |
| **shield** The Shield (cover) | UNCLEAR | "Be the monsters' target" but damage is split among heroes; the code means you were the `leader` (slowest feet or guard) in 2+ rounds. | Reword: "Be the slowest hero (or guard) in 2 or more rounds and still be standing." |

## Other notes
- **Duplicates:** `nopotion` (solo) = `teetotal` (table); `noreroll` (solo) = `thrifty` (table). Fine as solo/table twins, but both reroll ones are trivial.
- **The Pact:** its check is always true, so accepting it and winning always pays 2G; the real cost is half damage (`pactBribe`, engine ~2122/2256). It works as designed; flagged only so Astra knows it is a guaranteed payout.
- **Rival "no winner" at 0-0** (`best > 0`) makes the rare-event rivals (straights, lucky early) often pay nobody.
- **2-player co-op:** Bribe chance at 2 players is 1/6 (×0.3 in ordinary fights, ×2 in big ones). The teammate cards (`slacker`, `laststand`, `fall`, `lonewolf`) all work with one teammate except lonewolf (above).

## Asked of Astra
Rule on each row in "Problem cards": cut, reword, re-number (scale by act), or restrict the deal (party size, act, monster count, class). Claude can then measure the chosen numbers in the harness before any change ships.
