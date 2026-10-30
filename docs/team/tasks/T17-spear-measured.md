# T17 Spear candidate: matched measurement and what it does and does not show (Claude, 26 Oct 2026)

Answers Director handoff items 1, 2 and 6 for the Spear. Bots on the real engine (tools/t17-spear.mjs; nothing in the game changes). Two runs: **one foe, 160 matched fights per cell** (the ogre family has the same health with and without armor: ogre, treant 1d6, direbear 1d4; Act I uses goblins and shieldbearers), and **two foes at once, 120 per cell** (the same foes doubled, HARD=1) because single foes were won 99–100% of the time and cannot separate weapons by winning. Red attack, pierce and blue block are reported apart everywhere; there is no "average hit". Each interval is 95% on the mean of the matched differences from today's Spear with its released icons; r is the correlation between the two rows' fights. Same-face rows share dice streams (r about 0.4–0.55); rows with different faces diverge from round one (r near 0), so those intervals are close to unpaired: about ±1 damage a round, ±11 points of win rate at 120 fights.

## What the numbers say

1. **The Spear is not the weak link in this run.** In the two-foe Silver fights today's Spear won 66, 70 and 53%, the Dagger 58, 68 and 55%, the Axe 62, 71 and 58%: the same, within the intervals. Only the **Sword** stands out (73, 78, 76%; +23 ± 12 points on two direbears), and it does so by block: it takes 1.2 to 2.8 less damage a round and rolls 1.9 ± 0.9 more blue than the Spear, while dealing the same. That is the pattern the earlier T22 table showed (a shield-side weapon pays), but this larger matched run does not reproduce "Spear 53–58% against Sword and Axe 70–78%": there the Spear was one of three equal attackers. The earlier cells used one road encounter per act and 40 fights; this was a controlled foe and 120–160 fights. I would drop "Spear is the weak link" as a finding and keep "Spear shares its numbers with the Dagger and Axe".
2. **Base profile (steady, no blank, lower top, same red and blue totals) against today's base** with the same icons: Silver single foes +1.5 to +2.2 (±1.0) damage a round and 0.4 to 0.6 rounds shorter; two foes +7, +1 and +11 (±12) points of win rate; Gold within noise (0.0 to +0.6 damage, −0.2 to +0.6 rounds). A reliable base looks a little better at Silver and indistinguishable at Gold. In Bronze it is not better: against shieldbearers it took 0.9 ± 0.4 more damage a round (goblins +0.3 ± 0.5) for the same speed. It is a modest effect that mostly reaches significance only in single-foe Silver. It does not justify a base change by itself.
3. **Icons are worth about one damage a round, and that is the identity question.** Taking today's icons away costs 0.8 to 1.5 damage a round (single foes, ±0.6 to 0.7) and adds 0.3 to 0.9 rounds. Pierce on every red face ("Spear icons") against today's icons is within noise on armored foes (+0.6 and +0.3 ± 0.7 damage a round on the single Silver treant and direbear) and small on the unarmored one (+1.2 ± 0.7 on the ogre); at Gold it is −0.2. It raises pierce rolled (+0.7 ± 0.3 on the Silver treant) but lowers red rolled by the same amount, so the total hardly moves.
4. **The armor-piercing identity is not visible in damage.** Armor costs every weapon about 2.5 damage a round against a single Silver treant (control 23.7 ogre → 21.1 treant; steady base with Spear icons 25.4 → 23.2; Sword 23.0 → 20.5); no Spear variant narrows that gap by more than about 0.4. With armor of 1d6 or 1d4 rolled once a round, a pierce icon of 1 on a few faces cannot do it. If anti-armor is to be a real identity, the pierce points have to be larger than today's icons (and that is a rules/number change the Director would need to approve, not something this harness has tested).
5. **The shell has a ceiling.** Gold d8 against two Act III foes is almost unwinnable for this hero shell (2–18%), so those rows carry little information on winning; their damage and rounds columns are still matched.

## Recommendation (for Director review, not a freeze)

Do not rebuild the Spear's base for balance: today's base is statistically level with the Dagger and Axe. If the Director wants a distinct Spear for cards, a steady base is a modest improvement at Silver and costs nothing at Gold; the pierce-on-every-red-face icon rule is harmless but has no measured effect on armored foes, so it should be sold on the card as flavour, not as a stat. A real anti-armor role would need bigger pierce numbers or a different icon, which is a separate, approved experiment. Bow/Arrows and the shields were not part of this run; neither were class, party or human play.

Limits: bots (one policy, same for every weapon), one knight shell, one fight at a time, current monsters and powers, released non-cumulative faces for every other weapon, 120–160 fights a cell, matching only partial. The Silver and Gold rows come from the isolated face table (WEAPON_SIZE.ladder) with a self-test that today's icon rule is reproduced exactly (the tool throws otherwise).

# Run A: one foe, 160 fights a cell

Tool: tools/t17-spear.mjs. Knight shell, Round Shield in the other hand, strength set to the weapon's size, hero level and act per encounter. Only the left-hand weapon changes between rows. **Red (attack), pierce and blue (block) are reported separately; nothing here is "average hit".** Intervals are 95% on the mean of the matched differences from today's Spear (same seed, same foes); r is the correlation between the two rows' fights, which shows how much the matching helps (the opening monster rolls match, the dice diverge from round one, so it is small and the interval is close to an unpaired one for fight-length measures). One hero shell, bots, one fight at a time: this cannot validate the cumulative ladder, other classes, party play or human play.

## Faces (analytic, per roll of the die by itself)

Red and blue are the mean face value of that colour over all faces; blanks are faces showing 0; peak is the biggest number.

| Size | Base | Red mean | Blue mean | Blanks | Peak | Red total / blue total |
|---|---|---|---|---|---|---|
| d4 | released | 1.25 | 0.75 | 1/4 | 4 | 5 / 3 |
| d4 | steady | 1.25 | 0.75 | 0/4 | 3 | 5 / 3 |
| d6 | released | 2.00 | 0.50 | 2/6 | 6 | 12 / 3 |
| d6 | steady | 2.00 | 0.50 | 0/6 | 4 | 12 / 3 |
| d8 | released | 3.00 | 0.38 | 2/8 | 8 | 24 / 3 |
| d8 | steady | 3.00 | 0.38 | 0/8 | 6 | 24 / 3 |
| d10 | released | 4.10 | 0.30 | 2/10 | 10 | 41 / 3 |
| d10 | steady | 4.10 | 0.30 | 0/10 | 8 | 41 / 3 |

Pierce icon points per roll on the released base (the number on the face is unchanged by icons):

| Size | Metal | released icons | spear icons (pierce on every red face) |
|---|---|---|---|
| d6 | Silver | 0.33 | 0.67 |
| d6 | Gold | 0.67 | 0.83 |
| d8 | Silver | 0.38 | 0.75 |
| d8 | Gold | 0.63 | 0.88 |

## Act I, Bronze d4, goblins (no armor)

The control row (today's Spear) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.

| Left-hand weapon | Win % | Damage dealt / round | Damage taken / round | Red attack rolled / round | Pierce rolled / round | Blue block rolled / round | Rounds | Health left when won % |
|---|---|---|---|---|---|---|---|---|
| **control: released base, none icons** | 100 | 13.8 | 3.2 | 18.1 | 4.1 | 10.8 | 2.8 | 87 |
| steady base, none icons | 100 (+0 ± 0, r 0.00) | 13.4 (−0.4 ± 0.7, r 0.26) | 3.5 (+0.3 ± 0.5, r 0.40) | 17.3 (−0.8 ± 1.1, r 0.24) | 4.2 (+0.1 ± 0.5, r 0.52) | 9.0 (−1.8 ± 0.9, r 0.26) | 2.9 (+0.1 ± 0.2, r 0.30) | 87 (−0 ± 3, r 0.12) |
| Sword (released) | 100 (+0 ± 0, r 0.00) | 14.0 (+0.2 ± 0.6, r 0.36) | 2.9 (−0.2 ± 0.5, r 0.38) | 17.4 (−0.7 ± 0.9, r 0.26) | 4.6 (+0.6 ± 0.5, r 0.56) | 11.8 (+1.0 ± 0.9, r 0.19) | 2.8 (−0.1 ± 0.1, r 0.34) | 88 (+1 ± 3, r 0.18) |
| Dagger (released) | 100 (+0 ± 0, r 0.00) | 13.4 (−0.4 ± 0.7, r 0.25) | 3.6 (+0.4 ± 0.5, r 0.27) | 15.8 (−2.3 ± 0.9, r 0.16) | 4.6 (+0.6 ± 0.5, r 0.44) | 8.9 (−1.8 ± 0.9, r 0.12) | 2.9 (+0.1 ± 0.2, r 0.22) | 84 (−3 ± 3, r 0.08) |
| Axe (released) | 100 (+0 ± 0, r 0.00) | 14.6 (+0.7 ± 0.6, r 0.33) | 2.7 (−0.4 ± 0.4, r 0.47) | 19.0 (+0.9 ± 0.9, r 0.30) | 4.0 (−0.1 ± 0.4, r 0.61) | 11.6 (+0.9 ± 0.8, r 0.25) | 2.6 (−0.2 ± 0.1, r 0.25) | 89 (+2 ± 2, r 0.30) |

## Act I, Bronze d4, shieldbearers (armor 1d6)

The control row (today's Spear) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.

| Left-hand weapon | Win % | Damage dealt / round | Damage taken / round | Red attack rolled / round | Pierce rolled / round | Blue block rolled / round | Rounds | Health left when won % |
|---|---|---|---|---|---|---|---|---|
| **control: released base, none icons** | 100 | 12.9 | 2.2 | 17.1 | 3.7 | 11.6 | 4.6 | 93 |
| steady base, none icons | 100 (+0 ± 0, r 0.00) | 13.4 (+0.5 ± 0.8, r 0.20) | 3.1 (+0.9 ± 0.4, r 0.27) | 16.7 (−0.5 ± 0.9, r 0.21) | 4.3 (+0.7 ± 0.4, r 0.38) | 9.3 (−2.3 ± 0.8, r 0.18) | 4.3 (−0.3 ± 0.3, r 0.14) | 88 (−5 ± 2, r 0.14) |
| Sword (released) | 100 (+0 ± 0, r 0.00) | 13.6 (+0.7 ± 0.8, r 0.34) | 1.9 (−0.3 ± 0.4, r 0.26) | 17.7 (+0.5 ± 0.8, r 0.36) | 4.6 (+1.0 ± 0.4, r 0.55) | 12.2 (+0.5 ± 0.8, r 0.16) | 4.3 (−0.3 ± 0.2, r 0.32) | 93 (−0 ± 2, r 0.05) |
| Dagger (released) | 100 (+0 ± 0, r 0.00) | 12.4 (−0.5 ± 0.8, r 0.12) | 2.7 (+0.5 ± 0.4, r 0.09) | 15.3 (−1.8 ± 0.8, r 0.21) | 4.6 (+1.0 ± 0.4, r 0.30) | 9.8 (−1.8 ± 0.8, r 0.09) | 4.6 (+0.0 ± 0.3, r 0.05) | 90 (−3 ± 2, r 0.05) |
| Axe (released) | 100 (+0 ± 0, r 0.00) | 14.0 (+1.1 ± 0.8, r 0.21) | 1.7 (−0.5 ± 0.3, r 0.32) | 19.0 (+1.9 ± 0.9, r 0.20) | 3.8 (+0.2 ± 0.4, r 0.37) | 11.8 (+0.2 ± 0.7, r 0.30) | 4.2 (−0.4 ± 0.3, r 0.15) | 94 (+1 ± 2, r 0.07) |

## Act II, Silver d6, ogre (no armor)

The control row (today's Spear with its released icons) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.

| Left-hand weapon | Win % | Damage dealt / round | Damage taken / round | Red attack rolled / round | Pierce rolled / round | Blue block rolled / round | Rounds | Health left when won % |
|---|---|---|---|---|---|---|---|---|
| released base, none icons | 100 (+0 ± 0, r 0.00) | 22.8 (−1.0 ± 0.7, r 0.52) | 4.3 (−0.3 ± 0.4, r 0.41) | 20.7 (−0.9 ± 0.8, r 0.49) | 5.3 (−0.5 ± 0.3, r 0.35) | 11.5 (−0.0 ± 0.7, r 0.46) | 6.9 (+0.3 ± 0.2, r 0.49) | 85 (+2 ± 3, r 0.15) |
| **control: released base, released icons** | 100 | 23.7 | 4.6 | 21.6 | 5.8 | 11.5 | 6.6 | 83 |
| released base, spear icons | 100 (+0 ± 0, r 0.00) | 25.0 (+1.2 ± 0.7, r 0.61) | 4.5 (−0.1 ± 0.5, r 0.40) | 21.7 (+0.1 ± 0.8, r 0.56) | 6.5 (+0.7 ± 0.3, r 0.45) | 10.8 (−0.6 ± 0.6, r 0.50) | 6.3 (−0.3 ± 0.2, r 0.49) | 84 (+1 ± 3, r 0.17) |
| steady base, none icons | 100 (+0 ± 0, r 0.00) | 24.3 (+0.6 ± 1.0, r 0.21) | 4.0 (−0.7 ± 0.5, r 0.11) | 22.8 (+1.2 ± 1.1, r 0.12) | 4.9 (−0.9 ± 0.3, r 0.25) | 12.9 (+1.4 ± 0.9, r 0.18) | 6.5 (−0.1 ± 0.3, r 0.22) | 85 (+3 ± 4, r 0.04) |
| steady base, released icons | 100 (+0 ± 0, r 0.00) | 25.2 (+1.5 ± 1.0, r 0.24) | 3.9 (−0.8 ± 0.5, r 0.16) | 23.1 (+1.5 ± 1.0, r 0.19) | 5.6 (−0.2 ± 0.4, r 0.17) | 13.5 (+2.0 ± 0.8, r 0.24) | 6.2 (−0.4 ± 0.2, r 0.21) | 83 (+1 ± 4, r -0.05) |
| steady base, spear icons | 100 (+0 ± 0, r 0.00) | 25.4 (+1.6 ± 1.0, r 0.17) | 3.8 (−0.8 ± 0.5, r 0.08) | 23.1 (+1.6 ± 1.1, r 0.09) | 6.3 (+0.5 ± 0.4, r 0.21) | 13.1 (+1.6 ± 0.9, r 0.13) | 6.2 (−0.4 ± 0.2, r 0.17) | 86 (+3 ± 4, r 0.00) |
| Sword (released) | 100 (+0 ± 0, r 0.00) | 23.0 (−0.8 ± 0.9, r 0.29) | 3.8 (−0.9 ± 0.5, r 0.15) | 20.2 (−1.3 ± 1.0, r 0.09) | 5.7 (−0.0 ± 0.4, r 0.14) | 14.3 (+2.8 ± 0.8, r 0.17) | 6.8 (+0.2 ± 0.2, r 0.24) | 86 (+3 ± 4, r 0.02) |
| Dagger (released) | 100 (+0 ± 0, r 0.00) | 23.8 (+0.1 ± 1.0, r 0.23) | 4.9 (+0.2 ± 0.5, r 0.16) | 21.4 (−0.1 ± 1.0, r 0.20) | 5.4 (−0.4 ± 0.3, r 0.15) | 10.2 (−1.3 ± 0.9, r 0.09) | 6.6 (−0.0 ± 0.2, r 0.24) | 86 (+3 ± 4, r 0.10) |
| Axe (released) | 100 (+0 ± 0, r 0.00) | 25.1 (+1.4 ± 0.9, r 0.23) | 5.0 (+0.3 ± 0.6, r 0.10) | 22.9 (+1.3 ± 1.0, r 0.23) | 5.9 (+0.2 ± 0.4, r 0.05) | 10.3 (−1.2 ± 0.9, r 0.04) | 6.2 (−0.4 ± 0.2, r 0.19) | 82 (−1 ± 4, r 0.01) |

## Act II, Silver d6, treant (armor 1d6)

The control row (today's Spear with its released icons) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.

| Left-hand weapon | Win % | Damage dealt / round | Damage taken / round | Red attack rolled / round | Pierce rolled / round | Blue block rolled / round | Rounds | Health left when won % |
|---|---|---|---|---|---|---|---|---|
| released base, none icons | 100 (+0 ± 0, r 0.00) | 20.0 (−1.2 ± 0.6, r 0.51) | 3.4 (−0.2 ± 0.4, r 0.38) | 20.5 (−0.9 ± 0.7, r 0.55) | 5.1 (−0.6 ± 0.3, r 0.35) | 12.9 (+0.2 ± 0.7, r 0.46) | 7.9 (+0.4 ± 0.2, r 0.45) | 85 (−1 ± 3, r 0.11) |
| **control: released base, released icons** | 100 | 21.1 | 3.6 | 21.4 | 5.7 | 12.7 | 7.4 | 85 |
| released base, spear icons | 100 (+0 ± 0, r 0.00) | 21.7 (+0.6 ± 0.7, r 0.44) | 3.8 (+0.2 ± 0.4, r 0.42) | 21.2 (−0.2 ± 0.7, r 0.52) | 6.4 (+0.7 ± 0.3, r 0.46) | 11.8 (−0.8 ± 0.6, r 0.51) | 7.2 (−0.2 ± 0.2, r 0.36) | 84 (−1 ± 4, r -0.03) |
| steady base, none icons | 100 (+0 ± 0, r 0.00) | 22.0 (+0.8 ± 1.0, r 0.05) | 3.7 (+0.1 ± 0.5, r 0.20) | 23.0 (+1.6 ± 1.0, r 0.17) | 4.9 (−0.8 ± 0.3, r 0.08) | 13.3 (+0.6 ± 0.8, r 0.22) | 7.2 (−0.2 ± 0.3, r -0.02) | 85 (+0 ± 4, r 0.11) |
| steady base, released icons | 100 (+0 ± 0, r 0.00) | 23.4 (+2.2 ± 1.0, r 0.15) | 3.6 (−0.0 ± 0.5, r 0.10) | 24.4 (+3.0 ± 1.1, r 0.16) | 5.5 (−0.2 ± 0.3, r 0.10) | 12.8 (+0.2 ± 0.8, r 0.23) | 6.8 (−0.6 ± 0.3, r 0.11) | 84 (−2 ± 4, r 0.04) |
| steady base, spear icons | 100 (+0 ± 0, r 0.00) | 23.2 (+2.0 ± 1.0, r -0.03) | 3.7 (+0.1 ± 0.5, r 0.07) | 23.1 (+1.6 ± 1.0, r 0.15) | 6.1 (+0.4 ± 0.3, r 0.15) | 13.3 (+0.6 ± 0.8, r 0.21) | 6.8 (−0.7 ± 0.3, r -0.04) | 84 (−1 ± 4, r 0.02) |
| Sword (released) | 100 (+0 ± 0, r 0.00) | 20.5 (−0.7 ± 0.9, r -0.03) | 2.9 (−0.7 ± 0.5, r 0.03) | 20.3 (−1.1 ± 1.0, r -0.11) | 5.9 (+0.2 ± 0.3, r 0.12) | 14.6 (+1.9 ± 0.9, r -0.02) | 7.7 (+0.2 ± 0.3, r -0.02) | 88 (+3 ± 4, r -0.12) |
| Dagger (released) | 100 (+0 ± 0, r 0.00) | 21.4 (+0.3 ± 1.0, r -0.00) | 4.1 (+0.5 ± 0.4, r 0.24) | 21.9 (+0.5 ± 1.0, r 0.08) | 5.4 (−0.3 ± 0.3, r 0.11) | 10.5 (−2.2 ± 0.7, r 0.30) | 7.3 (−0.1 ± 0.3, r 0.02) | 86 (+0 ± 4, r -0.05) |
| Axe (released) | 100 (+0 ± 0, r 0.00) | 22.3 (+1.1 ± 0.9, r 0.04) | 4.0 (+0.4 ± 0.5, r 0.14) | 22.4 (+1.0 ± 0.9, r 0.08) | 5.9 (+0.2 ± 0.3, r 0.11) | 11.2 (−1.5 ± 0.8, r 0.24) | 7.0 (−0.4 ± 0.3, r 0.05) | 83 (−2 ± 4, r 0.02) |

## Act II, Silver d6, direbear (armor 1d4)

The control row (today's Spear with its released icons) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.

| Left-hand weapon | Win % | Damage dealt / round | Damage taken / round | Red attack rolled / round | Pierce rolled / round | Blue block rolled / round | Rounds | Health left when won % |
|---|---|---|---|---|---|---|---|---|
| released base, none icons | 100 (+0 ± 0, r 0.00) | 21.5 (−1.2 ± 0.7, r 0.39) | 4.1 (−0.3 ± 0.4, r 0.40) | 20.8 (−0.7 ± 0.8, r 0.37) | 5.2 (−0.6 ± 0.3, r 0.44) | 12.3 (+0.3 ± 0.7, r 0.49) | 7.2 (+0.3 ± 0.2, r 0.35) | 85 (+1 ± 3, r 0.30) |
| **control: released base, released icons** | 100 | 22.7 | 4.4 | 21.5 | 5.8 | 12.1 | 6.9 | 84 |
| released base, spear icons | 100 (+0 ± 0, r 0.00) | 23.0 (+0.3 ± 0.7, r 0.37) | 4.3 (−0.0 ± 0.3, r 0.51) | 21.3 (−0.2 ± 0.8, r 0.37) | 6.4 (+0.6 ± 0.3, r 0.47) | 11.5 (−0.5 ± 0.7, r 0.52) | 6.8 (−0.1 ± 0.2, r 0.30) | 84 (−0 ± 3, r 0.24) |
| steady base, none icons | 100 (+0 ± 0, r 0.00) | 22.5 (−0.2 ± 1.1, r -0.10) | 4.1 (−0.3 ± 0.5, r -0.02) | 22.5 (+1.0 ± 1.1, r -0.05) | 4.8 (−1.0 ± 0.3, r 0.14) | 13.5 (+1.4 ± 1.0, r 0.08) | 7.0 (+0.1 ± 0.3, r -0.09) | 83 (−1 ± 4, r -0.05) |
| steady base, released icons | 100 (+0 ± 0, r 0.00) | 24.2 (+1.5 ± 1.1, r -0.06) | 4.0 (−0.4 ± 0.5, r 0.06) | 23.7 (+2.2 ± 1.2, r -0.11) | 5.5 (−0.3 ± 0.3, r 0.22) | 12.9 (+0.9 ± 0.9, r 0.13) | 6.5 (−0.4 ± 0.3, r -0.11) | 85 (+0 ± 3, r -0.01) |
| steady base, spear icons | 100 (+0 ± 0, r 0.00) | 23.9 (+1.2 ± 1.0, r -0.08) | 4.0 (−0.4 ± 0.5, r -0.04) | 22.7 (+1.2 ± 1.1, r -0.08) | 6.1 (+0.3 ± 0.4, r 0.15) | 13.3 (+1.2 ± 0.9, r 0.10) | 6.6 (−0.3 ± 0.3, r -0.10) | 85 (+1 ± 4, r -0.00) |
| Sword (released) | 100 (+0 ± 0, r 0.00) | 21.8 (−0.9 ± 0.9, r -0.02) | 3.6 (−0.8 ± 0.5, r 0.03) | 20.1 (−1.3 ± 1.0, r 0.02) | 6.1 (+0.3 ± 0.4, r 0.10) | 14.6 (+2.6 ± 0.9, r 0.19) | 7.2 (+0.3 ± 0.3, r -0.01) | 86 (+1 ± 4, r -0.06) |
| Dagger (released) | 100 (+0 ± 0, r 0.00) | 22.8 (+0.1 ± 0.9, r 0.06) | 4.5 (+0.1 ± 0.5, r 0.09) | 22.0 (+0.5 ± 1.0, r 0.03) | 5.5 (−0.3 ± 0.4, r 0.11) | 10.5 (−1.5 ± 0.8, r 0.23) | 6.8 (−0.1 ± 0.3, r 0.08) | 87 (+2 ± 3, r -0.03) |
| Axe (released) | 100 (+0 ± 0, r 0.00) | 23.9 (+1.2 ± 1.0, r 0.00) | 4.6 (+0.2 ± 0.5, r 0.06) | 22.5 (+1.0 ± 1.0, r 0.09) | 6.2 (+0.4 ± 0.4, r 0.14) | 11.4 (−0.6 ± 0.9, r 0.15) | 6.5 (−0.4 ± 0.3, r 0.02) | 83 (−1 ± 4, r 0.01) |

## Act III, Gold d8, ogre (no armor)

The control row (today's Spear with its released icons) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.

| Left-hand weapon | Win % | Damage dealt / round | Damage taken / round | Red attack rolled / round | Pierce rolled / round | Blue block rolled / round | Rounds | Health left when won % |
|---|---|---|---|---|---|---|---|---|
| released base, none icons | 99 (−1 ± 1, r 0.00) | 26.6 (−0.8 ± 0.7, r 0.36) | 5.8 (+0.4 ± 0.5, r 0.23) | 24.6 (−0.1 ± 0.7, r 0.35) | 4.4 (−1.2 ± 0.2, r 0.47) | 18.4 (−0.8 ± 0.7, r 0.37) | 11.5 (+0.3 ± 0.3, r 0.31) | 81 (−1 ± 4, r 0.03) |
| **control: released base, released icons** | 100 | 27.5 | 5.4 | 24.7 | 5.6 | 19.3 | 11.2 | 83 |
| released base, spear icons | 100 (+0 ± 0, r 0.00) | 27.3 (−0.2 ± 0.6, r 0.53) | 5.8 (+0.4 ± 0.5, r 0.19) | 24.0 (−0.7 ± 0.6, r 0.48) | 5.8 (+0.2 ± 0.2, r 0.38) | 18.7 (−0.6 ± 0.9, r 0.21) | 11.3 (+0.1 ± 0.3, r 0.48) | 79 (−3 ± 4, r 0.01) |
| steady base, none icons | 100 (+0 ± 0, r 0.00) | 26.6 (−0.9 ± 0.9, r 0.04) | 5.8 (+0.4 ± 0.5, r 0.07) | 24.6 (−0.1 ± 0.9, r -0.00) | 4.2 (−1.4 ± 0.3, r 0.08) | 19.0 (−0.3 ± 0.9, r 0.06) | 11.6 (+0.4 ± 0.4, r -0.04) | 80 (−3 ± 4, r 0.13) |
| steady base, released icons | 100 (+0 ± 0, r 0.00) | 27.5 (+0.0 ± 0.8, r 0.16) | 5.5 (+0.1 ± 0.5, r 0.06) | 24.7 (−0.0 ± 0.9, r 0.09) | 5.4 (−0.1 ± 0.3, r 0.09) | 19.6 (+0.3 ± 0.9, r 0.12) | 11.2 (−0.0 ± 0.3, r 0.09) | 81 (−2 ± 4, r -0.00) |
| steady base, spear icons | 99 (−1 ± 1, r 0.00) | 28.1 (+0.6 ± 0.9, r 0.14) | 5.7 (+0.3 ± 0.5, r 0.13) | 25.1 (+0.4 ± 0.9, r 0.09) | 5.6 (+0.1 ± 0.3, r 0.04) | 18.5 (−0.8 ± 1.0, r 0.09) | 11.0 (−0.2 ± 0.3, r 0.05) | 81 (−2 ± 4, r 0.03) |
| Sword (released) | 99 (−1 ± 1, r 0.00) | 27.4 (−0.1 ± 0.8, r 0.19) | 5.3 (−0.1 ± 0.5, r 0.10) | 24.3 (−0.4 ± 0.8, r 0.19) | 5.5 (−0.0 ± 0.3, r 0.12) | 20.2 (+0.9 ± 0.9, r 0.15) | 11.2 (+0.0 ± 0.3, r 0.11) | 82 (−1 ± 4, r -0.02) |
| Dagger (released) | 100 (+0 ± 0, r 0.00) | 26.9 (−0.6 ± 0.9, r 0.11) | 6.1 (+0.7 ± 0.5, r 0.00) | 24.7 (−0.0 ± 0.9, r 0.05) | 4.6 (−0.9 ± 0.3, r 0.00) | 17.3 (−2.0 ± 0.9, r 0.03) | 11.5 (+0.3 ± 0.4, r 0.05) | 84 (+2 ± 4, r -0.05) |
| Axe (released) | 100 (+0 ± 0, r 0.00) | 28.4 (+0.9 ± 0.8, r 0.27) | 6.1 (+0.7 ± 0.5, r 0.13) | 25.1 (+0.4 ± 0.7, r 0.24) | 5.7 (+0.2 ± 0.3, r 0.08) | 18.0 (−1.2 ± 0.9, r 0.06) | 10.8 (−0.3 ± 0.3, r 0.19) | 80 (−3 ± 4, r 0.00) |

## Act III, Gold d8, treant (armor 1d6)

The control row (today's Spear with its released icons) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.

| Left-hand weapon | Win % | Damage dealt / round | Damage taken / round | Red attack rolled / round | Pierce rolled / round | Blue block rolled / round | Rounds | Health left when won % |
|---|---|---|---|---|---|---|---|---|
| released base, none icons | 99 (−1 ± 1, r 0.00) | 22.9 (−1.5 ± 0.6, r 0.32) | 5.0 (−0.1 ± 0.4, r 0.36) | 23.4 (−0.9 ± 0.6, r 0.32) | 4.3 (−1.0 ± 0.2, r 0.33) | 19.4 (+0.1 ± 0.8, r 0.37) | 13.4 (+0.9 ± 0.3, r 0.30) | 82 (+1 ± 4, r -0.03) |
| **control: released base, released icons** | 100 | 24.4 | 5.1 | 24.3 | 5.3 | 19.4 | 12.5 | 81 |
| released base, spear icons | 99 (−1 ± 1, r 0.00) | 24.3 (−0.2 ± 0.6, r 0.34) | 5.2 (+0.1 ± 0.4, r 0.46) | 23.8 (−0.5 ± 0.6, r 0.29) | 5.7 (+0.4 ± 0.2, r 0.39) | 19.0 (−0.3 ± 0.7, r 0.38) | 12.6 (+0.1 ± 0.3, r 0.32) | 78 (−2 ± 4, r 0.13) |
| steady base, none icons | 99 (−1 ± 1, r 0.00) | 23.4 (−1.1 ± 0.7, r 0.04) | 5.5 (+0.4 ± 0.5, r -0.06) | 24.0 (−0.3 ± 0.7, r 0.10) | 4.5 (−0.9 ± 0.3, r -0.09) | 18.7 (−0.6 ± 1.0, r -0.06) | 13.2 (+0.7 ± 0.4, r 0.04) | 77 (−4 ± 4, r -0.10) |
| steady base, released icons | 100 (+0 ± 0, r 0.00) | 24.5 (+0.1 ± 0.7, r 0.00) | 5.1 (+0.1 ± 0.5, r -0.02) | 24.2 (−0.1 ± 0.7, r 0.02) | 5.4 (+0.1 ± 0.3, r 0.05) | 19.6 (+0.3 ± 0.9, r 0.07) | 12.5 (−0.0 ± 0.4, r 0.02) | 81 (+0 ± 4, r 0.11) |
| steady base, spear icons | 100 (+0 ± 0, r 0.00) | 24.4 (−0.1 ± 0.7, r 0.08) | 5.5 (+0.4 ± 0.5, r 0.05) | 23.8 (−0.5 ± 0.7, r 0.06) | 5.9 (+0.5 ± 0.3, r -0.03) | 18.8 (−0.6 ± 0.9, r 0.05) | 12.6 (+0.1 ± 0.3, r 0.13) | 79 (−2 ± 4, r -0.04) |
| Sword (released) | 100 (+0 ± 0, r 0.00) | 24.2 (−0.3 ± 0.7, r 0.13) | 4.9 (−0.2 ± 0.5, r 0.11) | 23.9 (−0.4 ± 0.8, r -0.00) | 5.3 (+0.0 ± 0.3, r 0.07) | 19.5 (+0.2 ± 0.9, r 0.16) | 12.7 (+0.2 ± 0.3, r 0.15) | 81 (+0 ± 4, r 0.08) |
| Dagger (released) | 100 (+0 ± 0, r 0.00) | 23.4 (−1.0 ± 0.6, r 0.09) | 5.1 (−0.0 ± 0.5, r -0.04) | 24.0 (−0.3 ± 0.6, r 0.11) | 4.5 (−0.8 ± 0.2, r 0.08) | 18.1 (−1.3 ± 0.9, r 0.10) | 13.1 (+0.6 ± 0.3, r 0.09) | 86 (+5 ± 4, r -0.06) |
| Axe (released) | 99 (−1 ± 1, r 0.00) | 25.5 (+1.1 ± 0.7, r 0.26) | 5.6 (+0.5 ± 0.5, r 0.20) | 24.9 (+0.6 ± 0.7, r 0.26) | 6.0 (+0.7 ± 0.3, r 0.09) | 18.4 (−0.9 ± 0.9, r 0.10) | 12.1 (−0.5 ± 0.3, r 0.26) | 79 (−1 ± 4, r 0.02) |

## Act III, Gold d8, direbear (armor 1d4)

The control row (today's Spear with its released icons) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.

| Left-hand weapon | Win % | Damage dealt / round | Damage taken / round | Red attack rolled / round | Pierce rolled / round | Blue block rolled / round | Rounds | Health left when won % |
|---|---|---|---|---|---|---|---|---|
| released base, none icons | 99 (+0 ± 2, r -0.01) | 24.2 (−1.4 ± 0.7, r 0.18) | 5.5 (−0.5 ± 0.4, r 0.21) | 23.9 (−0.2 ± 0.7, r 0.26) | 4.1 (−1.3 ± 0.2, r 0.41) | 19.1 (−0.0 ± 0.8, r 0.38) | 12.6 (+0.7 ± 0.3, r 0.13) | 81 (+3 ± 4, r 0.01) |
| **control: released base, released icons** | 99 | 25.7 | 6.0 | 24.0 | 5.5 | 19.1 | 11.9 | 78 |
| released base, spear icons | 100 (+1 ± 1, r 0.00) | 25.5 (−0.2 ± 0.6, r 0.29) | 5.7 (−0.3 ± 0.4, r 0.28) | 23.8 (−0.2 ± 0.7, r 0.22) | 5.6 (+0.2 ± 0.2, r 0.36) | 18.7 (−0.5 ± 0.7, r 0.41) | 12.0 (+0.1 ± 0.3, r 0.30) | 81 (+4 ± 4, r 0.16) |
| steady base, none icons | 100 (+1 ± 1, r 0.00) | 25.1 (−0.6 ± 0.8, r -0.03) | 6.0 (−0.1 ± 0.5, r 0.07) | 24.6 (+0.6 ± 0.8, r 0.01) | 4.3 (−1.2 ± 0.3, r -0.00) | 18.6 (−0.5 ± 1.0, r 0.05) | 12.2 (+0.3 ± 0.4, r -0.00) | 76 (−2 ± 5, r -0.11) |
| steady base, released icons | 100 (+1 ± 1, r 0.00) | 26.3 (+0.6 ± 0.8, r 0.07) | 5.8 (−0.2 ± 0.5, r 0.04) | 24.8 (+0.8 ± 0.8, r 0.06) | 5.4 (−0.0 ± 0.3, r 0.04) | 19.6 (+0.5 ± 1.0, r 0.05) | 11.7 (−0.2 ± 0.4, r 0.08) | 77 (−1 ± 4, r 0.00) |
| steady base, spear icons | 100 (+1 ± 1, r 0.00) | 26.3 (+0.7 ± 0.7, r 0.17) | 6.1 (+0.1 ± 0.5, r 0.04) | 24.8 (+0.7 ± 0.8, r 0.17) | 5.8 (+0.3 ± 0.3, r 0.08) | 18.4 (−0.8 ± 1.0, r 0.09) | 11.6 (−0.3 ± 0.3, r 0.14) | 78 (−0 ± 5, r -0.13) |
| Sword (released) | 98 (−2 ± 3, r -0.01) | 25.9 (+0.2 ± 0.9, r -0.01) | 5.8 (−0.3 ± 0.6, r -0.04) | 24.2 (+0.2 ± 0.9, r 0.01) | 5.6 (+0.1 ± 0.3, r 0.10) | 19.9 (+0.7 ± 1.0, r -0.04) | 11.8 (−0.1 ± 0.4, r -0.10) | 79 (+1 ± 5, r -0.10) |
| Dagger (released) | 99 (−1 ± 2, r -0.01) | 25.4 (−0.3 ± 0.7, r 0.12) | 6.5 (+0.5 ± 0.5, r -0.06) | 24.5 (+0.5 ± 0.8, r 0.14) | 4.7 (−0.7 ± 0.3, r 0.07) | 17.1 (−2.0 ± 0.9, r 0.10) | 12.1 (+0.1 ± 0.4, r 0.06) | 78 (−0 ± 5, r -0.20) |
| Axe (released) | 99 (+0 ± 2, r -0.01) | 27.5 (+1.8 ± 0.8, r 0.09) | 6.1 (+0.1 ± 0.5, r 0.09) | 25.8 (+1.7 ± 0.8, r 0.16) | 6.1 (+0.6 ± 0.3, r 0.18) | 18.2 (−0.9 ± 1.0, r 0.07) | 11.1 (−0.8 ± 0.3, r 0.06) | 79 (+1 ± 4, r -0.04) |

# Run B: two foes at once, 120 fights a cell

## Act II, Silver d6, two ogres (no armor)

The control row (today's Spear with its released icons) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.

| Left-hand weapon | Win % | Damage dealt / round | Damage taken / round | Red attack rolled / round | Pierce rolled / round | Blue block rolled / round | Rounds | Health left when won % |
|---|---|---|---|---|---|---|---|---|
| released base, none icons | 48 (−18 ± 12, r 0.12) | 25.1 (−1.3 ± 1.0, r 0.19) | 12.0 (+1.7 ± 1.1, r 0.34) | 22.1 (−0.6 ± 1.0, r 0.16) | 5.0 (−0.9 ± 0.3, r 0.18) | 10.4 (−0.3 ± 0.8, r 0.22) | 9.4 (−0.8 ± 0.8, r 0.18) | 32 (−16 ± 10, r 0.07) |
| **control: released base, released icons** | 66 | 26.4 | 10.3 | 22.6 | 5.9 | 10.7 | 10.2 | 48 |
| released base, spear icons | 58 (−8 ± 11, r 0.14) | 26.1 (−0.3 ± 0.9, r 0.40) | 11.7 (+1.3 ± 1.1, r 0.32) | 22.3 (−0.4 ± 0.8, r 0.45) | 6.3 (+0.4 ± 0.3, r 0.29) | 9.6 (−1.0 ± 0.8, r 0.25) | 9.7 (−0.5 ± 0.7, r 0.27) | 38 (−10 ± 9, r 0.17) |
| steady base, none icons | 66 (+0 ± 13, r -0.15) | 25.7 (−0.7 ± 1.1, r 0.13) | 10.2 (−0.1 ± 1.4, r -0.02) | 23.4 (+0.8 ± 1.1, r 0.12) | 5.0 (−0.9 ± 0.4, r 0.12) | 11.9 (+1.2 ± 0.9, r 0.12) | 10.1 (−0.1 ± 0.9, r -0.08) | 47 (−1 ± 10, r -0.08) |
| steady base, released icons | 73 (+7 ± 12, r -0.05) | 26.3 (−0.1 ± 1.2, r -0.04) | 9.7 (−0.6 ± 1.4, r -0.08) | 23.2 (+0.5 ± 1.2, r -0.07) | 5.5 (−0.4 ± 0.3, r 0.18) | 12.1 (+1.4 ± 0.9, r 0.18) | 10.2 (−0.0 ± 0.8, r -0.11) | 50 (+2 ± 10, r -0.05) |
| steady base, spear icons | 68 (+3 ± 12, r -0.07) | 27.0 (+0.6 ± 1.3, r 0.02) | 10.6 (+0.3 ± 1.5, r -0.06) | 23.9 (+1.3 ± 1.1, r 0.06) | 5.9 (+0.0 ± 0.3, r 0.12) | 11.1 (+0.4 ± 0.9, r 0.08) | 9.8 (−0.4 ± 0.9, r -0.09) | 46 (−1 ± 10, r -0.11) |
| Sword (released) | 73 (+8 ± 12, r -0.04) | 25.1 (−1.3 ± 1.2, r 0.09) | 9.2 (−1.2 ± 1.3, r -0.00) | 21.5 (−1.1 ± 1.1, r 0.05) | 6.0 (+0.1 ± 0.4, r -0.03) | 13.2 (+2.6 ± 0.9, r 0.03) | 10.8 (+0.7 ± 0.9, r -0.10) | 53 (+5 ± 10, r -0.06) |
| Dagger (released) | 58 (−8 ± 12, r 0.03) | 26.0 (−0.4 ± 1.2, r -0.13) | 11.7 (+1.4 ± 1.4, r -0.09) | 23.0 (+0.3 ± 1.2, r -0.21) | 5.5 (−0.4 ± 0.3, r 0.24) | 9.3 (−1.4 ± 0.8, r 0.04) | 9.3 (−0.9 ± 0.9, r -0.15) | 41 (−7 ± 10, r 0.04) |
| Axe (released) | 62 (−4 ± 12, r 0.08) | 27.3 (+0.9 ± 1.1, r 0.13) | 11.2 (+0.9 ± 1.3, r 0.03) | 24.0 (+1.4 ± 1.0, r 0.15) | 6.1 (+0.2 ± 0.4, r 0.14) | 9.2 (−1.5 ± 0.8, r 0.15) | 9.3 (−0.9 ± 0.8, r 0.13) | 41 (−7 ± 9, r 0.11) |

## Act II, Silver d6, two treants (armor 1d6)

The control row (today's Spear with its released icons) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.

| Left-hand weapon | Win % | Damage dealt / round | Damage taken / round | Red attack rolled / round | Pierce rolled / round | Blue block rolled / round | Rounds | Health left when won % |
|---|---|---|---|---|---|---|---|---|
| released base, none icons | 69 (−1 ± 11, r 0.07) | 21.6 (−1.5 ± 1.1, r 0.13) | 9.4 (−0.1 ± 1.0, r 0.43) | 21.8 (−0.4 ± 1.0, r 0.14) | 5.1 (−1.0 ± 0.3, r 0.32) | 10.7 (−0.3 ± 0.7, r 0.38) | 12.0 (+0.7 ± 1.0, r 0.11) | 49 (−2 ± 9, r 0.12) |
| **control: released base, released icons** | 70 | 23.2 | 9.5 | 22.2 | 6.0 | 11.0 | 11.4 | 51 |
| released base, spear icons | 72 (+2 ± 11, r 0.15) | 22.6 (−0.6 ± 1.0, r 0.25) | 9.6 (+0.1 ± 1.0, r 0.38) | 21.6 (−0.5 ± 0.9, r 0.36) | 6.2 (+0.1 ± 0.3, r 0.33) | 10.1 (−0.8 ± 0.7, r 0.28) | 11.8 (+0.4 ± 0.9, r 0.15) | 48 (−3 ± 9, r 0.04) |
| steady base, none icons | 68 (−2 ± 12, r -0.02) | 22.1 (−1.1 ± 1.1, r 0.13) | 8.9 (−0.6 ± 1.3, r 0.03) | 22.7 (+0.5 ± 1.0, r 0.15) | 4.9 (−1.2 ± 0.4, r 0.06) | 11.6 (+0.6 ± 0.8, r 0.04) | 11.8 (+0.4 ± 1.0, r 0.09) | 53 (+2 ± 9, r 0.06) |
| steady base, released icons | 71 (+1 ± 11, r 0.18) | 24.3 (+1.2 ± 1.2, r -0.11) | 9.0 (−0.5 ± 1.2, r 0.17) | 24.2 (+2.1 ± 1.1, r 0.01) | 5.6 (−0.4 ± 0.4, r 0.15) | 11.5 (+0.6 ± 0.9, r 0.02) | 11.0 (−0.4 ± 0.9, r 0.13) | 52 (+1 ± 9, r 0.13) |
| steady base, spear icons | 71 (+1 ± 12, r -0.02) | 23.5 (+0.3 ± 1.2, r 0.05) | 9.6 (+0.1 ± 1.3, r 0.03) | 23.3 (+1.1 ± 1.1, r 0.06) | 6.0 (−0.1 ± 0.4, r 0.01) | 10.9 (−0.1 ± 0.8, r 0.16) | 11.0 (−0.4 ± 1.0, r 0.02) | 49 (−2 ± 9, r 0.03) |
| Sword (released) | 78 (+8 ± 11, r 0.10) | 22.4 (−0.8 ± 1.1, r 0.13) | 8.0 (−1.5 ± 1.1, r 0.06) | 21.6 (−0.6 ± 1.1, r -0.01) | 5.8 (−0.2 ± 0.4, r -0.03) | 12.5 (+1.6 ± 0.8, r -0.04) | 12.3 (+0.9 ± 1.0, r 0.11) | 57 (+6 ± 9, r 0.04) |
| Dagger (released) | 68 (−3 ± 13, r -0.14) | 22.4 (−0.8 ± 1.2, r -0.07) | 9.6 (+0.1 ± 1.3, r -0.03) | 22.1 (−0.0 ± 1.1, r -0.09) | 5.3 (−0.7 ± 0.4, r 0.16) | 10.0 (−1.0 ± 0.8, r 0.05) | 11.4 (+0.1 ± 1.1, r -0.13) | 52 (+1 ± 10, r -0.12) |
| Axe (released) | 71 (+1 ± 11, r 0.06) | 23.5 (+0.3 ± 1.1, r 0.23) | 9.3 (−0.2 ± 1.2, r 0.13) | 23.3 (+1.1 ± 1.0, r 0.26) | 5.8 (−0.2 ± 0.4, r 0.09) | 9.7 (−1.3 ± 0.7, r 0.08) | 11.5 (+0.1 ± 1.0, r 0.10) | 50 (−1 ± 10, r 0.00) |

## Act II, Silver d6, two direbears (armor 1d4)

The control row (today's Spear with its released icons) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.

| Left-hand weapon | Win % | Damage dealt / round | Damage taken / round | Red attack rolled / round | Pierce rolled / round | Blue block rolled / round | Rounds | Health left when won % |
|---|---|---|---|---|---|---|---|---|
| released base, none icons | 51 (−2 ± 12, r 0.17) | 23.5 (−0.9 ± 0.9, r 0.38) | 12.1 (+0.3 ± 1.2, r 0.34) | 22.0 (−0.7 ± 0.9, r 0.36) | 4.9 (−1.2 ± 0.3, r 0.31) | 10.7 (+0.2 ± 0.7, r 0.24) | 9.7 (+0.1 ± 0.8, r 0.18) | 32 (−3 ± 8, r 0.19) |
| **control: released base, released icons** | 53 | 24.4 | 11.9 | 22.7 | 6.1 | 10.6 | 9.6 | 36 |
| released base, spear icons | 53 (+1 ± 12, r 0.11) | 24.4 (+0.0 ± 1.0, r 0.26) | 11.9 (+0.1 ± 1.2, r 0.34) | 22.3 (−0.4 ± 0.8, r 0.43) | 6.3 (+0.2 ± 0.3, r 0.42) | 10.2 (−0.4 ± 0.7, r 0.34) | 9.7 (+0.0 ± 0.8, r 0.13) | 34 (−2 ± 9, r 0.05) |
| steady base, none icons | 53 (+1 ± 13, r 0.01) | 24.8 (+0.4 ± 1.1, r 0.12) | 11.7 (−0.1 ± 1.4, r 0.06) | 24.3 (+1.6 ± 1.0, r 0.13) | 5.0 (−1.1 ± 0.4, r 0.03) | 11.2 (+0.6 ± 1.0, r -0.06) | 9.6 (+0.0 ± 1.0, r -0.02) | 37 (+2 ± 10, r 0.03) |
| steady base, released icons | 63 (+11 ± 12, r 0.00) | 24.7 (+0.3 ± 1.1, r 0.00) | 10.6 (−1.2 ± 1.4, r 0.03) | 23.8 (+1.1 ± 1.1, r 0.15) | 5.8 (−0.3 ± 0.4, r 0.09) | 11.4 (+0.9 ± 0.9, r -0.03) | 10.2 (+0.6 ± 0.9, r -0.01) | 45 (+9 ± 10, r 0.01) |
| steady base, spear icons | 55 (+3 ± 12, r 0.05) | 25.0 (+0.6 ± 1.2, r 0.00) | 11.8 (−0.1 ± 1.5, r 0.05) | 24.0 (+1.4 ± 1.0, r 0.10) | 6.2 (+0.1 ± 0.4, r -0.00) | 11.0 (+0.4 ± 1.0, r -0.14) | 9.4 (−0.2 ± 0.9, r 0.01) | 39 (+3 ± 10, r 0.06) |
| Sword (released) | 76 (+23 ± 12, r 0.01) | 23.2 (−1.2 ± 1.1, r 0.16) | 9.0 (−2.8 ± 1.3, r 0.00) | 21.7 (−1.0 ± 1.0, r 0.09) | 5.6 (−0.5 ± 0.4, r 0.20) | 13.5 (+3.0 ± 0.9, r 0.02) | 11.6 (+2.0 ± 1.0, r -0.13) | 56 (+20 ± 9, r 0.10) |
| Dagger (released) | 55 (+3 ± 13, r -0.12) | 24.9 (+0.4 ± 1.2, r 0.10) | 12.4 (+0.5 ± 1.5, r -0.05) | 23.7 (+1.1 ± 1.0, r 0.17) | 5.4 (−0.7 ± 0.4, r 0.19) | 9.1 (−1.4 ± 0.8, r 0.06) | 9.6 (+0.0 ± 1.0, r -0.12) | 35 (−1 ± 10, r -0.06) |
| Axe (released) | 58 (+5 ± 12, r 0.03) | 25.3 (+0.9 ± 1.1, r 0.08) | 11.7 (−0.2 ± 1.4, r 0.04) | 23.9 (+1.2 ± 0.9, r 0.18) | 6.0 (−0.1 ± 0.4, r -0.01) | 9.6 (−0.9 ± 0.7, r 0.19) | 9.7 (+0.1 ± 0.9, r 0.08) | 36 (+0 ± 9, r 0.04) |

## Act III, Gold d8, two ogres (no armor)

The control row (today's Spear with its released icons) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.

| Left-hand weapon | Win % | Damage dealt / round | Damage taken / round | Red attack rolled / round | Pierce rolled / round | Blue block rolled / round | Rounds | Health left when won % |
|---|---|---|---|---|---|---|---|---|
| released base, none icons | 3 (−8 ± 6, r 0.08) | 28.3 (−1.5 ± 1.3, r 0.38) | 19.7 (+0.7 ± 1.2, r 0.48) | 25.0 (−0.5 ± 0.9, r 0.48) | 4.2 (−1.3 ± 0.3, r 0.46) | 16.3 (+0.5 ± 0.9, r 0.53) | 7.9 (−0.5 ± 1.0, r 0.27) | 1 (−6 ± 4, r 0.04) |
| **control: released base, released icons** | 12 | 29.9 | 19.1 | 25.5 | 5.5 | 15.8 | 8.3 | 7 |
| released base, spear icons | 3 (−8 ± 6, r 0.08) | 29.9 (−0.0 ± 1.4, r 0.29) | 19.6 (+0.5 ± 1.2, r 0.50) | 25.4 (−0.1 ± 0.9, r 0.47) | 5.8 (+0.4 ± 0.3, r 0.47) | 15.9 (+0.1 ± 0.9, r 0.56) | 7.5 (−0.8 ± 1.0, r 0.23) | 2 (−5 ± 4, r 0.06) |
| steady base, none icons | 3 (−8 ± 7, r -0.07) | 29.0 (−0.8 ± 1.7, r 0.08) | 20.5 (+1.4 ± 1.5, r 0.20) | 26.1 (+0.7 ± 1.3, r 0.15) | 4.0 (−1.4 ± 0.4, r -0.12) | 15.7 (−0.1 ± 1.2, r 0.17) | 7.3 (−1.0 ± 1.1, r 0.03) | 2 (−6 ± 4, r -0.05) |
| steady base, released icons | 11 (−1 ± 8, r -0.04) | 30.7 (+0.8 ± 1.6, r 0.01) | 19.4 (+0.4 ± 1.5, r 0.28) | 26.5 (+1.0 ± 1.4, r 0.06) | 5.3 (−0.1 ± 0.4, r -0.09) | 15.8 (+0.1 ± 1.2, r 0.16) | 8.5 (+0.1 ± 1.2, r 0.09) | 5 (−2 ± 5, r -0.10) |
| steady base, spear icons | 4 (−8 ± 6, r 0.18) | 30.5 (+0.6 ± 1.7, r 0.07) | 20.5 (+1.4 ± 1.5, r 0.22) | 25.8 (+0.3 ± 1.3, r 0.22) | 5.5 (+0.1 ± 0.4, r -0.16) | 15.5 (−0.3 ± 1.2, r 0.20) | 7.3 (−1.0 ± 1.0, r 0.18) | 2 (−5 ± 4, r 0.41) |
| Sword (released) | 8 (−4 ± 8, r -0.10) | 29.6 (−0.2 ± 1.5, r 0.08) | 18.9 (−0.2 ± 1.7, r 0.14) | 25.1 (−0.4 ± 1.2, r 0.15) | 5.4 (−0.0 ± 0.4, r 0.06) | 16.9 (+1.2 ± 1.2, r 0.22) | 8.5 (+0.1 ± 1.2, r 0.02) | 5 (−3 ± 5, r -0.09) |
| Dagger (released) | 5 (−7 ± 7, r 0.04) | 30.1 (+0.3 ± 1.7, r 0.13) | 20.3 (+1.2 ± 1.5, r 0.14) | 26.7 (+1.2 ± 1.3, r 0.18) | 4.5 (−0.9 ± 0.3, r 0.10) | 13.9 (−1.8 ± 1.2, r 0.17) | 7.8 (−0.5 ± 1.1, r 0.02) | 3 (−4 ± 4, r 0.09) |
| Axe (released) | 7 (−5 ± 8, r -0.10) | 30.7 (+0.8 ± 1.6, r 0.09) | 19.9 (+0.8 ± 1.5, r 0.13) | 26.2 (+0.7 ± 1.2, r 0.11) | 5.6 (+0.2 ± 0.3, r 0.21) | 15.7 (−0.0 ± 1.2, r 0.14) | 7.5 (−0.8 ± 1.1, r 0.01) | 3 (−4 ± 5, r -0.08) |

## Act III, Gold d8, two treants (armor 1d6)

The control row (today's Spear with its released icons) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.

| Left-hand weapon | Win % | Damage dealt / round | Damage taken / round | Red attack rolled / round | Pierce rolled / round | Blue block rolled / round | Rounds | Health left when won % |
|---|---|---|---|---|---|---|---|---|
| released base, none icons | 8 (−3 ± 8, r -0.02) | 25.5 (−2.1 ± 1.2, r 0.29) | 16.3 (+0.6 ± 1.1, r 0.39) | 25.4 (−1.0 ± 1.1, r 0.34) | 4.1 (−1.1 ± 0.3, r 0.22) | 15.8 (+0.2 ± 0.8, r 0.46) | 10.4 (+0.2 ± 1.3, r 0.06) | 6 (−2 ± 5, r -0.05) |
| **control: released base, released icons** | 12 | 27.6 | 15.7 | 26.4 | 5.2 | 15.6 | 10.2 | 7 |
| released base, spear icons | 11 (−1 ± 8, r 0.12) | 26.7 (−0.9 ± 1.0, r 0.50) | 16.8 (+1.1 ± 1.1, r 0.49) | 25.5 (−0.9 ± 1.0, r 0.43) | 5.5 (+0.3 ± 0.3, r 0.38) | 15.6 (−0.0 ± 0.8, r 0.49) | 9.9 (−0.3 ± 1.1, r 0.26) | 6 (−1 ± 5, r 0.14) |
| steady base, none icons | 12 (+0 ± 9, r -0.13) | 25.0 (−2.6 ± 1.4, r 0.07) | 15.9 (+0.2 ± 1.4, r 0.04) | 25.3 (−1.1 ± 1.3, r 0.08) | 4.2 (−1.0 ± 0.3, r 0.05) | 15.8 (+0.1 ± 1.1, r 0.04) | 10.5 (+0.3 ± 1.5, r -0.15) | 6 (−2 ± 5, r -0.11) |
| steady base, released icons | 13 (+1 ± 8, r 0.10) | 26.1 (−1.5 ± 1.5, r 0.10) | 15.7 (+0.0 ± 1.3, r 0.06) | 25.2 (−1.2 ± 1.3, r 0.08) | 5.3 (+0.1 ± 0.3, r 0.26) | 15.5 (−0.2 ± 1.1, r 0.09) | 10.9 (+0.7 ± 1.3, r 0.14) | 8 (+0 ± 6, r -0.02) |
| steady base, spear icons | 12 (+0 ± 8, r -0.05) | 26.2 (−1.4 ± 1.3, r 0.14) | 16.3 (+0.6 ± 1.6, r -0.14) | 25.2 (−1.2 ± 1.2, r 0.11) | 5.5 (+0.3 ± 0.3, r 0.25) | 15.1 (−0.5 ± 1.1, r 0.05) | 10.3 (+0.1 ± 1.4, r -0.09) | 7 (−0 ± 5, r -0.05) |
| Sword (released) | 18 (+7 ± 9, r -0.04) | 26.1 (−1.5 ± 1.5, r -0.12) | 15.2 (−0.5 ± 1.4, r 0.02) | 24.8 (−1.6 ± 1.3, r -0.02) | 5.5 (+0.2 ± 0.4, r 0.03) | 16.7 (+1.0 ± 1.0, r 0.07) | 11.0 (+0.8 ± 1.4, r 0.04) | 12 (+5 ± 7, r -0.08) |
| Dagger (released) | 12 (+0 ± 8, r -0.05) | 26.8 (−0.8 ± 1.3, r 0.17) | 17.0 (+1.3 ± 1.4, r 0.10) | 26.7 (+0.3 ± 1.2, r 0.16) | 4.5 (−0.7 ± 0.3, r -0.04) | 13.9 (−1.7 ± 1.1, r -0.03) | 10.6 (+0.4 ± 1.3, r 0.04) | 8 (+1 ± 6, r -0.07) |
| Axe (released) | 11 (−1 ± 9, r -0.13) | 28.0 (+0.4 ± 1.5, r -0.02) | 16.5 (+0.8 ± 1.3, r 0.06) | 26.8 (+0.4 ± 1.3, r -0.02) | 5.7 (+0.5 ± 0.3, r 0.30) | 15.2 (−0.4 ± 1.0, r 0.13) | 9.8 (−0.4 ± 1.3, r -0.01) | 6 (−2 ± 5, r -0.11) |

## Act III, Gold d8, two direbears (armor 1d4)

The control row (today's Spear with its released icons) is the zero of every difference. Cells: mean, then the matched difference from the control with its 95% interval and r.

| Left-hand weapon | Win % | Damage dealt / round | Damage taken / round | Red attack rolled / round | Pierce rolled / round | Blue block rolled / round | Rounds | Health left when won % |
|---|---|---|---|---|---|---|---|---|
| released base, none icons | 3 (+2 ± 4, r -0.02) | 27.2 (−1.9 ± 1.4, r 0.35) | 21.2 (+0.5 ± 1.2, r 0.50) | 25.8 (−0.9 ± 1.1, r 0.39) | 4.6 (−0.9 ± 0.3, r 0.48) | 14.9 (+0.0 ± 0.9, r 0.59) | 7.2 (−0.0 ± 0.9, r 0.22) | 2 (+2 ± 2, r -0.02) |
| **control: released base, released icons** | 2 | 29.1 | 20.7 | 26.7 | 5.4 | 14.9 | 7.2 | 0 |
| released base, spear icons | 3 (+2 ± 4, r -0.02) | 28.4 (−0.7 ± 1.2, r 0.50) | 20.9 (+0.1 ± 1.0, r 0.67) | 25.2 (−1.5 ± 0.9, r 0.56) | 6.1 (+0.6 ± 0.3, r 0.50) | 14.6 (−0.3 ± 0.8, r 0.64) | 7.2 (−0.0 ± 0.7, r 0.34) | 2 (+2 ± 2, r -0.02) |
| steady base, none icons | 5 (+3 ± 5, r -0.03) | 26.5 (−2.6 ± 1.6, r 0.12) | 19.4 (−1.4 ± 1.6, r -0.05) | 25.3 (−1.4 ± 1.4, r 0.07) | 4.4 (−1.1 ± 0.4, r 0.10) | 16.5 (+1.6 ± 1.3, r 0.02) | 7.9 (+0.7 ± 1.0, r -0.07) | 2 (+2 ± 2, r -0.03) |
| steady base, released icons | 3 (+2 ± 4, r -0.02) | 28.3 (−0.8 ± 1.5, r 0.13) | 19.8 (−1.0 ± 1.5, r 0.12) | 25.7 (−1.0 ± 1.3, r 0.08) | 5.4 (−0.0 ± 0.4, r 0.06) | 15.8 (+1.0 ± 1.2, r 0.20) | 7.4 (+0.2 ± 0.9, r -0.01) | 2 (+2 ± 2, r -0.02) |
| steady base, spear icons | 2 (+0 ± 3, r -0.02) | 28.5 (−0.5 ± 1.6, r 0.04) | 20.0 (−0.8 ± 1.6, r -0.09) | 25.7 (−1.0 ± 1.4, r 0.07) | 5.9 (+0.5 ± 0.4, r 0.07) | 15.3 (+0.4 ± 1.2, r 0.16) | 7.1 (−0.1 ± 0.9, r -0.11) | 1 (+0 ± 1, r -0.02) |
| Sword (released) | 9 (+8 ± 5, r 0.18) | 28.5 (−0.6 ± 1.7, r 0.04) | 19.6 (−1.2 ± 1.5, r 0.18) | 26.1 (−0.6 ± 1.3, r 0.15) | 5.5 (+0.0 ± 0.4, r 0.12) | 16.5 (+1.6 ± 1.2, r 0.26) | 8.2 (+1.0 ± 0.9, r 0.18) | 5 (+5 ± 3, r 0.42) |
| Dagger (released) | 5 (+3 ± 5, r -0.03) | 28.0 (−1.1 ± 1.7, r -0.07) | 20.5 (−0.3 ± 1.6, r -0.12) | 26.2 (−0.5 ± 1.4, r -0.04) | 4.8 (−0.7 ± 0.4, r 0.10) | 14.2 (−0.7 ± 1.3, r -0.05) | 7.6 (+0.4 ± 1.0, r -0.05) | 3 (+2 ± 2, r -0.03) |
| Axe (released) | 4 (+3 ± 4, r -0.03) | 29.1 (+0.0 ± 1.6, r 0.06) | 21.0 (+0.2 ± 1.5, r 0.19) | 26.5 (−0.2 ± 1.3, r 0.18) | 5.7 (+0.3 ± 0.4, r 0.26) | 14.3 (−0.6 ± 1.1, r 0.34) | 7.0 (−0.2 ± 1.0, r -0.09) | 2 (+2 ± 2, r -0.02) |
