# T17 resale candidate: specification and checks (Claude, 26 Oct 2026)

Answers Director handoff item 4 (25 Oct) and Dave's resale direction in T17.md ("upgrading a weapon must increase its value, including displayed sell value; prevent profitable buy/upgrade/sell loops; cover found upgrades, transfers and old saves"). Isolated: `WEAPON_SIZE.resale` is null in every build; nothing in the live game, the existing T17 preview or any save changes until it is set. Nothing is activated by this note.

## The one specification

**Sale value = 50% × (A + U), rounded to the nearest gold, never below 1.**

- **A, the acquisition value** = the engine's `weaponValue` at the size the weapon was **found** at (base price × metal × size factor), *or the gold the camp store was actually paid for it if that was lower* (a discount is not resold at full worth; a mark-up is not resold above worth).
- **U, upgrades** = the gold actually paid for sizes since (40, 80, 140; recorded in `inst.upgraded` each time a size is bought).

No double counting: the sale looks at the found size for A and at paid gold for U, never at the current size's worth as well. A found d8 is worth its d8 as-found worth (what a d8 spoil is worth today) and nothing is credited for covers someone else removed. The sale rises with every purchase (each size adds half its price) and never returns the full amount put in. The store price and today's other rules are untouched.

Before-purchase display: `trainInfo` now returns `sellNow` and `sellAfter` (the Size card shows "Selling this weapon pays X gold now and Y after this size" when the switch is on; with it off the old "size is not refunded" text stays).

Fields: `bought` (written when the store sells it), `upgraded` (written when a size is bought), both with `found`; they live on the weapon, so the sale is the same in the bag, in a hand, after a save and in the online table (the whole hero is in the table). An old save has none of them and is valued at its found worth: no refund is invented for sizes it was never charged for.


Rule under test: **sale = 50% × (what the weapon was worth as found, or what the store was actually paid when that was less, + every size bought since)**. Worth as found is the engine's weaponValue at the found size (base price × metal × size factor). Nothing in the game uses it; the switch is WEAPON_SIZE.resale (null everywhere).

## Before and after, one weapon grown a size at a time

A Silver weapon found at d4 (a spoil, cost nothing), then grown with the covers (40, 80, 140). "Today" is the T17 rule now (half as found, nothing for sizes). The last column is the sale value the purchase would show before it is made.

| Weapon | Size | Gold put in (covers) | Sale today | Sale, candidate | Gain from this size |
| --- | --- | --- | --- | --- | --- |
| Dagger | d4 (found) | 0 | 18 | 18 |  |
|  | d6 | 40 | 18 | 38 | +20 |
|  | d8 | 120 | 18 | 78 | +40 |
|  | d10 | 260 | 18 | 148 | +70 |
| Sword | d4 (found) | 0 | 24 | 24 |  |
|  | d6 | 40 | 24 | 44 | +20 |
|  | d8 | 120 | 24 | 84 | +40 |
|  | d10 | 260 | 24 | 154 | +70 |
| Spear | d4 (found) | 0 | 27 | 27 |  |
|  | d6 | 40 | 27 | 47 | +20 |
|  | d8 | 120 | 27 | 87 | +40 |
|  | d10 | 260 | 27 | 157 | +70 |

## Loops: buy at the store (any price modifier from 0.4 to 1.25), grow 0 to 3 sizes, sell

1728 combinations (8 weapons × 3 metals × 3 bought sizes × 6 price modifiers × 0–3 growths). Best net gold for the player on any loop: **-3** (a loop pays only above 0). Loops that pay: **0**.

| Sizes grown | Best net | Worst net |
| --- | --- | --- |
| 0 | -3 | -198 |
| 1 | -23 | -268 |
| 2 | -63 | -268 |
| 3 | -78 | -268 |

Cheapest store price (0.4 of worth), Bronze d4, nothing grown: buy price against sale: Dagger 7→4, Sword 10→5, Axe 10→5, Spear 11→6, Round Shield 10→5, Tower Shield 12→6, Bow 10→5, Arrows 8→4.

On today's T17 rule (half of worth as found, whatever was paid) the cheapest store price is itself a loop: 72 of 72 weapons bought at 0.4 of worth sell back for more than was paid (best +26). The candidate caps the basis at what was paid, which closes it.

A found weapon (paid nothing) grown 1–3 sizes, gold gained by growing it before selling instead of selling it as found (sale after growing, minus the covers paid, minus the sale it would have had): best -20, worst -130. Never above zero: each cover returns half of itself.

One bounded effect remains and is the same on today's rule: a weapon found for nothing sells for half its worth, and a store with the cheapest price (0.4 of worth) sells the same weapon back for less than that sale, so one found weapon can bank up to 0.1 of its worth once by selling it and re-buying one like it. It consumes the found weapon and repeats only as often as weapons are found; it is not a loop.

## Edge checks

- Rounding: 0 store prices at 0.4–0.5 of worth, any weapon or metal, returned more than they cost (sale = round(½ × min(worth, paid)), never above paid for any price of 1 or more).
- Save and load, bag against hand: sale 35 in the bag, 35 after a JSON round trip, 35 in the left hand. Identical.
- An old save (a weapon with neither field): worth as found, 78 (0.5 × 156); it was never charged for sizes, so no refund is invented.
- A two-handed weapon (Bow with its twin, both copies grow): the bag copy pays 44 once for one purchase (covers paid 40, sale 0.5 × (48 + 40)); the twin is not a second sale.

## What is not established

- Whether 50% is the right share. The loop check does not choose it: with the paid-gold cap and sizes credited at what they cost, no share up to 100% pays on a bought weapon (best loop −3 gold at 50%, −3 at 60%, −2 at 75%, −1 at 90%, exactly 0 at 100%). So the share is an economy and feel question (how much selling should fund the next metal), not an arbitrage one, and one for Dave and the Director.
- Economy effect: found weapons sell for the same as today, so the only gold change is half of every size bought coming back on a sale. A full-game economy measure (gold per act with players who sell on upgrade) has not been run; it belongs with the no-wear economy re-measure.
- No two-handed refinement beyond the Bow's twin; no Diamond sale change (Diamonds stay out of the T17 shop and spoils).
- Tests: test/resale.test.mjs (4); the wide check is tools/t17-resale.mjs. No Safari, no phone, no online table was exercised; the online claim rests on the weapon fields traveling with the hero state.
