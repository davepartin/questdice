# Knight magic cards (t414, mockup only)

Numbers come from `js/data.js` / `js/engine.js`. **PROPOSED** = not in the game. Upgrades cost 50 gold (Level II) and 90 gold (Level III).
Dice are the colour of what they add, with white pips and numbers.

## Splash in the game today (read-only findings)
- **Power splash (`splash: 'half'`).** Half the power's attack hits every *other* monster (engine.js ~1038-1056, resolved ~1154-1163 solo and ~2214 party). Used by Cleave (Knight), Storm Coil and Meteor (Wizard).
- **Area damage (`aoe`).** Hits *every* monster, including the target, on top of the power (engine.js 1078). Used by the slot-A big moves: Judgment 12, Rain of Arrows 9, Avalanche 10, Finale 8.
- **Weapon splash.** Dawnbreaker (legendary sword) has a 4 face that hits every other monster for 2 (data.js 223, `wf.fx.splash`). Fire arrows splash half the hand's Strength on the others, or all of it with FIRE_FULL, and each monster's guard can stop it (data.js 292/303, engine.js 560 and 1128).
- **Monster breath.** Hits the heroes, not monsters: in a party every hero takes ceil(0.6 × magnitude) (`BREATH_SHARE`, data.js 627/1124, engine.js 1202).
- **Phase monsters** can only be hurt by pierce and splash (data.js 636).
- **Is there a general mechanic?** Yes. Any hero power can carry `splash: 'half'` or `aoe: N`, and the engine handles both, solo and in a party. Splash/aoe hits are logged as "Splash N on <monster>".

## Final Knight set (identity: the front line, with splash)
| | Power | Verb | One line | Cost | Level I / II / III |
|---|---|---|---|---|---|
| Start A | Cleave | burst + splash | Roll red attack dice; half the total splashes on every other monster. | 2, once a battle | 2d6 / 3d6 / 3d8 (**PROPOSED path**; live is 2d6/3d6/4d6) |
| Start B | Shield Up | protection | +4 block every round. | 1 a round | +4 / +5 / +6 |
| Start C | Rally Cry | build-up | Store 1 magic a round (up to 4), then release attack and block together. | 1 per charge | 4 charges: 20 / 28 / 36 of each |
| Unlock A | Judgment (live) | area finisher | Round 3 or later: +14 attack on your target and 12 to every monster. | 6 | +14 & 12 / +18 & 15 / +21 & 18 |
| Unlock B | Riposte (**PROPOSED**) | control / risk | +4 block; any block the monsters don't use hits back as attack. | 1 a round | +4 / +5 / +6 |
| Unlock C | Spoils of War (**PROPOSED**) | economy | Store 1 magic a round, then release attack and gold. | 1 per charge | 4 charges: 20 atk & 16 gold / 28 & 24 / 36 & 32 |

**Cleave path:** Level II adds a die (3d6) and Level III makes the dice bigger (3d8). Both raise the hit, and the splash is half of it.

**Cuts:**
- **Press the Attack** (+3 attack a round) is a plain stat stick and overlaps Cleave's offence. Riposte replaces it, turning defence into offence when you read the monster right.
- **Second Wind** (heal charge) overlaps the Ranger's Forager and the shared Heal/Potion. Spoils of War replaces it and gives the Knight a patient gold plan, unlike the Ranger's gamble with Hunter's Mark.

## Design reasoning
- **Identity:** the Knight stands in front and hits many monsters. Cleave splashes and Judgment hits everyone, while the Ranger is single-target pierce.
- **Distinct jobs:** burst-splash (Cleave), protection (Shield Up), build-up (Rally), area finisher (Judgment), reactive defence (Riposte) and slow economy (Spoils). The Ranger's control is rerolls and its economy is a gamble, so the two heroes don't overlap.
- **Riposte is the fun decision:** over-block on a monster's big Slam and the leftover hits back. You get rewarded for reading the monster's plaque.
- **Spoils vs Rally** is the same slot and the same storing rhythm, with a different payoff: win harder now, or bank gold for camp upgrades.
- **Shield Up art:** the trident emblem is replaced by a gold lion. Mockup art only.

## Open questions for Dave
- Riposte: should leftover block hit back at full value, or half (like splash)?
- Spoils: is up to 16 gold per battle at Level I too generous?
- Should Judgment stay the Knight's area move, or should it splash (half) to match Cleave, and give the area moves to other heroes?
