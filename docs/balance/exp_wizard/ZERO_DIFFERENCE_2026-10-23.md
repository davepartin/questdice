# Why three Wizard variants changed nothing (23 October 2026)

ChatGPT's question: Magic Missile +3 or +4 pierce, Storm Coil 6, and 28 health each came out within ±0.4 health a fight of the current start. Is that a bug in the test, or the truth?

**Source:** the paired run in ../release2_wizard_variants.txt. 5 independent campaigns, Act II Wizards, the wise player, 240 fights an arm on the same seeds, so every arm met the same rolls.

| Arm | Fights lost | Health left after a win | Fights identical to the start | Missile casts a fight | Coil magic released a fight |
|---|---|---|---|---|---|
| start | 8 | 79.2% | 240 | 0.89 | 1.10 |
| 28 health | 9 | 80.9% | 217 | 0.88 | 1.11 |
| Missile +3 | 6 | 78.6% | 176 | 1.52 | 1.05 |
| Missile +4 | 6 | 78.4% | 162 | 1.79 | 0.83 |
| Coil 6, 8, 10, 12 | 8 | 79.0% | 200 | 0.85 | 1.18 |
| Barrier | 7 | 81.8% | 149 | 0 | 1.19 |

"Identical" means the same health lost and the same number of rounds, fight for fight. "Health left after a win" is approximate: 1 minus health lost (with potions counted) over maximum health.

## Findings

1. **The variants did reach the fights.**
   - The 28-health Wizard fought with 4 more maximum health (48 instead of 44 in the first campaign).
   - The stronger Missile was cast twice as often (1.8 a fight against 0.9).
   - The Coil arm carried the new numbers.
2. **28 health: the measure could not see it.** The table counted health *lost*, and more health does not reduce damage taken. It only matters when it keeps the Wizard standing, and the Act II Wizard already wins about 97% of these fights. Measured as health *left*, it is +1.7 points, all from the larger pool. Extra health is not what the Wizard lacks in these fights; fights where it falls (Act I, crowds) would be the place to look again.
3. **Storm Coil: almost never charged.** These fights last about 4 rounds, and the Coil needs 4 rounds of storing to reach its big release. On average it gives up about 1 magic's worth a fight, so raising its payout adds about 1 attack a fight. That is the true size of that change.
4. **Magic Missile: too small to move a kill.** +1 or +2 pierce, cast 1.5–1.8 times a fight, is 2–4 extra damage against monsters with 40 health or more. It rarely changes the round a monster dies, so two thirds of the fights came out identical. It did save two fights (6 lost against 8).
5. **Barrier changes the most fights** (91 of 240 differ). Block works every round a monster hits; small extra damage only matters on a killing round.

## What this means

The Wizard's spells are not mis-coded. In short fights, small every-round increments are invisible, and slow-building powers never reach their payoff. The magic ledger (ledger.txt in this folder) shows where the Wizard's magic actually goes, before any new outlet is added.
