# Gold, magic and attack: a rough exchange rate (22 Oct 2026)

Dave asked for "a rough balance on gold as this much attack, magic as this much attack or health" so that new things can be priced against it. `tools/worth.mjs` measures it: a simulated hero plays the campaign, and at two steps of every act the same fights are replayed with one purchase made and without it. Raw tables are in `worth_2026-10-22_*.txt`; the campaign comparison is in `curve_2026-10-22_magic-old.txt` and `-new.txt`.

## What a fight looks like (Normal)

| | Act I | Act II | Act III |
| --- | --- | --- | --- |
| Attack thrown a round | 25 | 40 | 42 to 49 |
| Rounds a fight | 3.4 | 4.4 | 7 to 9 |
| Magic earned a round from dice | 3 | 5 | 6 |
| Monster health a fight | 100 | 210 | 400 |

## Magic

- **1 magic is about 1.5 health** (Heal: 2 magic heals 3).
- **1 magic is about 2 to 4 attack** when spent on powers: an every-round power gives +2 to +4 for 1 magic; a full Storm Coil gives 28 for 4 magic (7 a magic) but needs four quiet rounds; Arc Bolt gives about 2.25 attack a magic.
- In real play, charges are stored 2 to 3 times a fight and released about once, about 2 charges at a time. That is why charge upgrades now add **+2 on every charge** a level: an upgrade has to be felt in a 5-round fight, not only in a long boss fight.

## Gold (attack added per fight, for each 100 gold)

| Purchase | Act I | Act II | Act III | Kept for |
| --- | --- | --- | --- | --- |
| A bigger hand die | about 20 | about 7 | about 4.5 | the rest of the campaign |
| A power level (now 50 / 90 / 140 gold) | 2 to 4 | 2 to 4 | 3 to 4 | the rest of the campaign |
| A weapon one metal better | about 3 | about 2 | under 1 | 4 to 8 battles (wear) |

Gold buys less attack as the acts go on: a bigger hand die is the best buy early, but each act caps how big a die can grow. Once your dice are as big as the act allows, power levels are the next-best permanent buy. Before this pass they cost 60 / 140 / 260 gold and were worth about a quarter of what they are now for the same gold.

## The change, and what it did to the game

- Power levels cost **50, 90, 140** gold (was 60, 140, 260).
- Every charge gets **+2 a level** (Storm Coil: total 28, 36, 44, 52). The old rule added a share and rounded, so the screens could only say "+0, 1, 1, 1".
- Every-round powers stay at about +1 a level: they are used every round, so +1 a round is already worth about +4 a fight.
- Campaign comparison, 20 campaigns each, same bot: campaigns cleared **17 → 20 of 20**; powers' share of the damage 5–7% → 6–9%; Act III fights about half a round shorter. Act II bosses won 89% → 78% (heroes now also buy power levels with gold that used to go on store weapons). Something to watch in play; Normal was "too easy" before.
