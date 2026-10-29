# Ranger magic cards (t412 → t413, mockup only)

Numbers come from `js/data.js` / `js/engine.js`. **PROPOSED** = not in the game. Upgrades cost 50 gold (Level II) and 90 gold (Level III).
Dice are the colour of what they add to the hero: orange pierce, green health, yellow gold, purple magic, red attack, blue block. Pips and numbers are white.

## Final Ranger set
| | Power | Verb | One line | Cost | Level I / II / III |
|---|---|---|---|---|---|
| Start A | Aimed Shot | burst | Buy d6 pierce attack dice, 1 magic each. | 1 per die | up to 4d6 / up to 4d8 / up to 6d8 (**PROPOSED path**) |
| Start B | Quick Draw | control | Every round, reroll some of your dice for free. | 1 a round | 2 / 3 / 4 rerolls |
| Start C | Volley | build-up | Store 1 magic a round (up to 4), then release it all as pierce attack. | 1 per charge | totals for 1-4 charges: 3/8/15/24 · 5/12/21/32 · 7/16/27/40 |
| Unlock A | Hunter's Mark (**PROPOSED**) | risk / economy | +2 pierce attack now; +3 gold if your target falls this round. | 1 a round | +2 & 3 gold / +3 & 4 gold / +4 & 5 gold |
| Unlock B | Forager (**PROPOSED**) | sustain | Once a battle: heal by 2d6. | 2 | 2d6 / 3d6 / 4d6 heal |
| Unlock C | Rain of Arrows (live) | area finisher | Round 3 or later: +6 pierce attack on your target and 9 to every monster. | 5 | +6 & 9 all / +8 & 11 / +9 & 14 |

**Aimed Shot path:** Level II swaps the d6 for a d8 (bigger hits, same magic), and Level III raises the cap to 6 dice. Each upgrade feels different instead of just adding +1.

**Cut:** Twin Arrows. It was Aimed Shot with d8s, so the d8 is now Aimed Shot's Level II. Snare and Vanish stay in data.js as alternates but are not in this set: Vanish is the same store-and-release verb as Volley, and Snare's "monsters hit softer" overlaps Forager's defensive job.

## Design reasoning
- **One verb per power.** Burst (Aimed Shot), control (Quick Draw), build-up (Volley), economy with risk (Hunter's Mark), sustain (Forager) and an area finisher (Rain). No two powers answer the same question.
- **A real choice each round.** Spending on Aimed Shot now competes with saving into Volley for later. Rain makes you hold 5 magic until round 3.
- **Press your luck.** Hunter's Mark pays gold only if the target falls that round, so you mark the wounded monster and push for the kill. Aimed Shot's − / + is a small "how much do I bet" choice.
- **Tactile and readable.** Dice drop into spaces and you see the total roll up. The dice colour tells you what you get before you read a word.
- **Hunter's Mark decision:** I made it the economy and risk power, because the Ranger had no gold engine and no gamble. The earlier version (always +1 gold) was a dull passive.
- **Forager:** numbers kept (Dave: not too strong).

## Rule notes (live game unchanged)
1. Live Aimed Shot: up to 4 magic, which is 4d6 / 5d6 / 6d6 by level (levels add a die). The PROPOSED path above would need a data.js change. Not done.
2. Volley's text "3, 5, 7, 9" is what each charge adds; the card shows the totals.
3. `POWER_UPGRADE` has an unused third price (140).

## Open questions for Dave
- Keep Snare and Vanish as alternate unlocks, or retire them?
- Is +3 gold the right size for a Hunter's Mark kill?

## t421: starter order (PROPOSED). The 3 most fun cards start.
| | Power | Why |
|---|---|---|
| **Start** | Aimed Shot | The signature tactile toy: drop dice into spaces, then roll. Teaches magic-for-dice on turn 1. |
| **Start** | Hunter's Mark | Press-your-luck from day one: mark the wounded monster and push for the kill and the gold. |
| **Start** | Volley | Teaches saving: watch the charge pips fill, then a big release. |
| Unlock | Quick Draw | Rerolls are strong but subtle; better once players know their dice. |
| Unlock | Forager | Healing is useful, but it's a safety pick rather than the thrill. |
| Unlock | Rain of Arrows | The aspirational round-3 screen-clearer; worth earning. |
Balance and the area-dice option are in KNIGHT.md ("Cross-hero balance").
