# Ranger magic cards: pass 1 (t412, mockup only)

All numbers come from `js/data.js` and `js/engine.js` as they stand today. **PROPOSED** items are not in the game.
Level upgrades cost 50 gold (Level II) and 90 gold (Level III), from `POWER_UPGRADE`.
Every die uses the template: orange, with white pips on d6s and white numbers on d8s.

## Starting cards (live rules)
| Power | One line | Cost | Level I / II / III |
|---|---|---|---|
| Aimed Shot | Buy d6 pierce attack dice, 1 magic each. | 1 per die | Live: 1d6 for 1 magic, up to 4 magic (4d6 / 5d6 / 6d6 at max). **Mockup shows a PROPOSED max of 6 dice.** |
| Quick Draw | Every round, reroll some of your dice for free. | 1 a round | 2 / 3 / 4 free rerolls |
| Volley | Store 1 magic a round (up to 4), then release it all as pierce attack. | 1 per charge | Release totals for 1/2/3/4 charges: I 3/8/15/24, II 5/12/21/32, III 7/16/27/40 |

## PROPOSED unlockables (art: natural subject, purple only in the background)
| Power | One line | Cost | Level I / II / III |
|---|---|---|---|
| Hunter's Mark (slot A) | Every round: +2 pierce attack, plus +1 gold. | 1 a round | +2 pierce +1 gold / +3 +2 / +4 +3 |
| Forager (slot B) | Once a battle: roll d6s and heal that much. | 2 | 2d6 / 3d6 / 4d6 heal |
| Twin Arrows (slot C) | Buy d8 pierce attack dice, 2 magic each (big-dice version of Aimed Shot). | 2 per die | 1d8 / 2d8 / 3d8 for 2 magic, +1d8 for each extra 2 magic, up to 6 dice |

## Rule mismatches and flags
1. **Aimed Shot max.** The live card stops at 4 magic: 4d6 at Level I, 5d6 at II, 6d6 at III. The mockup shows 6 slots at Level I, the PROPOSED max from t410. Changing the rule would mean editing data.js. Not done.
2. **Volley wording.** The text "3, 5, 7, 9 pierce" is what each charge adds. The released total is 3, 8, 15, 24. The card shows the totals.
3. **Fourth upgrade price.** `POWER_UPGRADE` has a third price (140) that no card uses. The cards only show Levels II and III.
4. **Ranger already has unlockables in data.js:** Rain of Arrows (A, unlocks at hero level 5), Snare (B) and Vanish (C). The 3 PROPOSED cards above are new ideas and would replace those or add to them. That's Dave's call.
5. **Dice colour.** Every die is now template orange, including the Level II/III rows and the heal dice. The old colour code (green heal, red attack and so on) now shows only on icons and words.

## Open questions for Dave
- Should the 3 PROPOSED powers replace Rain of Arrows, Snare and Vanish, or be extra choices?
- Should Hunter's Mark gold come every round, or only when the marked monster falls?
- Is Forager too strong at 4d6 for Level III? Ranger HP is 28.
- Should Twin Arrows' d8 dice also get a max of 6 dice, like Aimed Shot?
