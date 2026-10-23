# Five-player check (T07, 23 October 2026)

Dave: "finish the five-player check before recommending release" of the six-player softening.

**Setup:** the same method as the six-player test (exp_six). Five five-hero companies × 2 runs = **10 independent campaigns**, Acts I–III, normal, players using the teamwork rules (TEAMPLAY), matched seeds. Arm: monster health 1.0 per extra hero (from 1.2) for ordinary battles at five or more players (`SOFT=hp1.0,from5`). Bosses and elites untouched.

| | Battles won first try | Hero-fights where the hero fell | Health left after a win | Rounds a battle |
|---|---|---|---|---|
| Four heroes, today (exp_six reference) | 97.4% ± 1.0% | 5.4% ± 0.9% | 72.1% | 5.17 |
| **Five heroes, today** | **97.4% ± 1.0%** | **7.0% ± 1.0%** | 70.7% | 5.10 |
| Six heroes, today (exp_six) | 88.7% ± 1.3% | 17.1% ± 1.4% | 67.8% | 4.94 |
| Five: health 1.0 per hero | +2.2 ± 1.2 → 99.6% (better in 5 of 10) | −2.9 ± 0.8 → 4.1% (9 of 10) | +1.5 | −0.63 (10 of 10 shorter) |
| Bosses and elites | unchanged: 100% / 100% | | | |

## What it says

1. **Five players are already where four are** on wins (97.4% both), with slightly more falls (7.0% against 5.4%). The six-player gap does not start at five.
2. Gentler health at five makes ordinary battles easier than four players' (99.6%) and shorter by 0.6 rounds. It is not needed for fairness; only for pace, if wanted.

## Recommendation

Release the six-player softening (health 1.0 per hero and one extra goblin) **at six players only** (`from: 6`, the default). Leave five as it is. If five-hero battles feel long at the table, health 1.0 at five is a safe, measured option for pacing alone.

Tables: compare.txt, five_base.txt, five_hp10.txt; per-campaign rows in the .json files. Nothing has been changed in the game.
