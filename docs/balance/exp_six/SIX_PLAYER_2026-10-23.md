# Softening six-player ordinary battles (23 October 2026)

Dave: "soften six-player ordinary encounters ... keep bosses unchanged initially. Use matched campaigns."

## Setup

- Five six-hero companies (every class, some doubled) × 2 runs = **10 independent campaigns**, Acts I–III, normal difficulty.
- The players use the teamwork rules on purpose (TEAMPLAY).
- **Matched:** every arm grows the same heroes from the same seeds, and each step's team fight has its own seed. Arms differ only in how ordinary battles are scaled for six players. Changes are taken inside each campaign, then averaged; ± is the standard error across campaigns.
- **Untouched:** bosses and elites, by construction (PARTY.ordinary in data.js applies to `kind: 'battle'` only). Their results are identical in every arm, which confirms it.
- **Today's six-player scaling:** monster health × (1 + 1.2 per extra hero's worth of strength), +10 hit power per extra hero, and 2 extra goblins.

## Results (tables: compare.txt, six_*.txt, four_base.txt)

| Arm | Battles won first try | Hero-fights where the hero fell | Health left after a win | Rounds a battle |
|---|---|---|---|---|
| **Four heroes, today (reference)** | 97.4% ± 1.0% | 5.4% ± 0.9% | 72.1% | 5.17 |
| **Six heroes, today** | 88.7% ± 1.3% | 17.1% ± 1.4% | 67.8% | 4.94 |
| Six: health 1.0 per hero (from 1.2) | +0.9 ± 0.6 → 89.6% | −1.9 ± 0.9 → 15.2% | +1.6 | −0.56 (10 of 10 shorter) |
| Six: 1 extra goblin (from 2) | +6.1 ± 1.3 → 94.8% | −7.2 ± 1.9 → 9.9% | +4.0 | −0.09 |
| Six: hit power 8 per hero (from 10) | +6.1 ± 1.5 → 94.8% | −7.4 ± 1.3 → 9.7% | +4.3 | +0.17 |
| **Six: health 1.0 and 1 extra goblin** | **+8.3 ± 1.0 → 97.0%** (better in 10 of 10) | **−9.6 ± 1.4 → 7.5%** | +4.9 | **−0.72 → 4.22** (10 of 10 shorter) |
| Bosses and elites (every arm) | unchanged: 95% / 100% | | | |

## What it says

1. **The second extra goblin and the hit power are what hurt six players.** Either change alone lifts ordinary battles by about 6 points and cuts falls by more than a third.
2. **Gentler monster health alone barely changes who wins (+0.9), but it shortens every battle by half a round.** That matters for pacing with six friends.
3. **Health 1.0 with one extra goblin brings six players level with four** on wins (97.0% against 97.4%). Falls drop from 17% to 7.5%, still a little above four players' 5.4%, so the table stays a touch tougher. Battles get 0.7 rounds shorter, and the bosses are untouched.

## Recommendation

If Dave wants a release: **health 1.0 per hero and one extra goblin, for ordinary battles at six players.** It is the only arm better in all 10 campaigns, it matches the four-player experience, and it shortens battles. Bosses stay as they are, as asked.

Five-player tables were not tested; they currently get the same two extra goblins. The same change at five is the natural next check before release.
