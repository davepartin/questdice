# The Bard's full support contribution (23 October 2026)

Dave: "report Bard's full support contribution, not healing alone."

## Setup

- Five four-hero companies with a Bard (one with two Bards) × 2 runs = **10 independent campaigns**, Acts I–III, normal difficulty.
- The players use the teamwork rules on purpose (TEAMPLAY).
- **Matched arms**, the same heroes on the same seeds:
  - **base:** today's Bard, whose Lucky Verse can be sung for a hurt friend;
  - **no verse:** the verse can only be sung for the Bard itself;
  - **Discord:** every Bard carries Discord (every monster hits 2 softer, for the whole table) instead of Lucky Verse.
- Tables: bard_*.txt and compare.txt. Every number is per hero; two Bards at one table each count.

## Everything a Bard gave its table, per fight (base, 360 Bard hero-fights)

| | Bard | Knight | Dwarf | Wizard | Ranger |
|---|---|---|---|---|---|
| Healing to friends | **4.6** (0.86 verses sung for a friend) | 0 | 0 | 0 | 0 |
| Discord: damage softened for the table | 0 (not in the start kit) | – | – | – | – |
| Potions thrown, magic shared, revives | 0 | 0 | 0 | 0 | 0 |
| Team triples joined | 2.2 | 2.2 | 2.3 | 2.3 | 2.2 |
| Heart to Heart groups joined | 3.4 | 3.3 | 3.1 | 3.6 | 3.3 |
| Double-share rounds taken (protecting others) | 0.7 | **2.9** | 2.2 | 1.5 | 0.8 |
| Share of the team's damage (fair 25%) | 26% | 24% | 24% | 23% | 27% |
| Share of the team's block (fair 25%) | **18%** | 31% | 32% | 25% | 21% |
| Hero-fights where the hero fell | 5% | 5% | 4% | 7% | 7% |

With the Discord kit, a Bard cast it 2.75 times a fight and could soften up to 6.5 damage a fight for the table (an upper bound: some of it falls on blows that block would have stopped anyway).

**Not measured:** the simulated players never throw potions, share magic or revive a friend. Those team actions are open to every class, and real players will use them. This is a gap in the simulation.

## What the support is worth (matched changes against the base)

| Arm | Battles won | Falls | Health left after a win | Rounds |
|---|---|---|---|---|
| No verse for friends | 0.0 ± 0.6 | +0.7 ± 0.6 | **−1.8 ± 0.8** (worse in 8 of 10) | −0.13 |
| Discord instead of Lucky Verse | +1.7 ± 1.9 | −1.1 ± 1.2 | −1.5 ± 1.4 | +0.03 |

## What it says

1. **The Bard's support is real and small.** Its verse gives friends about 4.6 health a fight, and taking it away costs the company 1.8 points of health a fight, consistently (8 of 10 campaigns). It does not change who wins.
2. **Discord does no better.** It softens up to 6.5 damage for the table but gives up Lucky Verse's attack; within the error the two kits are even.
3. **Otherwise the Bard is a damage dealer like the rest** (26% of the damage). It joins as many triples and Heart to Heart groups as anyone, blocks the least, and protects the least.
4. **The support identity is thin in numbers.** The Knight's protection (the double share 2.9 rounds a fight, a third of the team's block) is far more visible than the Bard's 4.6 healing.

If the Bard is meant to be the support class, its support tools need to be bigger or more frequent: the targeted song (CLASS_IDENTITY section 7), or Lucky Verse healing a friend more often than one fight in seven rounds. That is a class-identity decision for Dave, not part of this release. Nothing has been changed in the game.
