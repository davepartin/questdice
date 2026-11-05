# T32 Four-face monster move cards

Dave's direction, 5 November 2026. Owner: Director. Build `20261106md4a`.

Four readable choices: 1–2 basic attacks, 3 a character move, 4 the largest direct hit. A numbered ivory D4 rests at the top right of the miniature. The existing tall cards, selected-move details, two-second roll, target selection and Attack & Roll flow remain. Identical basics still get separate numbered rows: the Goblin reads Stab / Stab / Pilfer / Fire Bomb. Wolf: Bite / Lunge / Howl / Rend. The bottom Special retains its active colour and inactive grey.

## Rules and compatibility

- `js/monster-d4.js` explicitly maps all 50 roster entries and derives each rage/pack variation from its actual sheet. Base six-face sheets stay available for comparisons; `applyRelease` enables the four-face rules. Hero dice and monster damage/initiative die sizes are unchanged. Camp scouting and the quest-danger estimate read the released four-face moves too (the estimate divides by four).
- Face 4 has strictly greater expected direct damage than every other face at that monster's actual power die size. A basic Lunge becomes one damage die rather than inflating Rend to outdo a two-die basic. The fourth face gets the smallest integer fixed bonus needed to remain the largest. Control/guard moves remain on 3; Drain, Pilfer and similar personality attacks can still deal damage.
- Every ordinary intent draw uses the actual face-array length: one independent D4 draw, including the optional move bag. Both solo and party rage transitions use four faces.
- No die-based Wind-Up remains. Ogre/large bruiser Slam lives in the existing counterable Special system. Lich Raise Dead, Matriarch Call Brood and Hive Queen Brood Call use the existing interruptible Spawn Special, summoning their own minion species. Adult dragon Inferno uses the existing wind-up/double-hit Special with breath damage; it can be interrupted by meeting its damage goal. At most one Special per monster.
- Existing scripted Special turns (Wind-Up/Slam, sleep) and unbroken Stalk/Pounce still override a normal move roll. On those turns the D4 shows a dash, with the actual action above the four rows and the Special at the foot. It does not fabricate a number. Normal roll odds are 25% per face, not a promise that forced Special turns also roll.
- A saved six-face round retains its current intent, result and Special. At the next intent draw its moves convert to four and its old bag is discarded. Existing fight Specials are preserved; the new signature assignment starts with the next fight. No hero save fields, gold, training or magic prices changed.

## Verification

- `npm test`: 575/575 passing. Eight new tests cover every roster/rage face, deterministic quarter intervals, one random draw, pack overrides, old-fight conversion/array identity, signature assignments and Inferno breath. Historical grouped-six-face tests remain explicitly scoped to their baseline.
- `node dev/monster-d4-layouts.mjs`: 250 checks, all 50 monsters at 390×844, 430×932, 375×667, 375×548 and larger text. Four rows, largest face highlighted, upper-right die, reachable action and no horizontal overflow. Two-second reveal, final die values and touch selection checked. [Layout results](monster-d4-evidence/layouts.json), [card image](monster-d4-evidence/three-monsters.webp).
- `node dev/monster-d4-check.mjs`: actual battle, independent enemy results, four rows, two-second disabled action, matching highlighted numbers, real target touch and Attack & Roll onto the dice grid; all four sizes and reduced motion pass. [Battle results](monster-d4-evidence/battle-results.json). [In-game phone image](monster-d4-evidence/battle-phone.webp).
- `node tools/t32-monsters.mjs`: [complete mapping and raw direct-damage expectations](monster-d4-evidence/roster.md). These raw means exclude forced Slams, guard, control and Specials and cannot establish battle balance by themselves.

## Balance checkpoint

Matched campaigns use the unchanged T31 bot, seeds 7000–7002 for each of five heroes. Baseline command: `T31_PATCH=./t32-legacy.mjs node tools/t31-campaign.mjs 3`; candidate: `node tools/t31-campaign.mjs 3`. This is a bounded smoke comparison, not a statistically precise balance certification. Each campaign can retry fights up to four times. Bots have known gaps with some support/trick cards. Results (campaigns clearing Act I / II / III):

| Hero | Six faces | Four faces |
|---|---|---|
| Knight | 3 / 1 / 0 | 2 / 1 / 0 |
| Ranger | 2 / 1 / 0 | 3 / 1 / 0 |
| Wizard | 2 / 1 / 1 | 3 / 1 / 0 |
| Dwarf | 3 / 2 / 2 | 2 / 1 / 1 |
| Bard | 1 / 0 / 0 | 2 / 0 / 0 |
| All (15 campaigns per arm) | 11 / 5 / 3 | 12 / 4 / 1 |

[Baseline output](monster-d4-evidence/campaign-before.txt), [D4 output](monster-d4-evidence/campaign-after.txt). Early-road completion is comparable in this small check; later clearance is lower. This flags late-game difficulty for human playtesting and a larger matched run if needed. It does not establish equal difficulty or justify a global HP/gold/magic rebalance. Raw per-face means are also not whole-fight strength: forced Slams, control, defense and interrupted summons change their value.

Integration: preserved concurrent build `20261106a3` (six learnable mixed-dice powers and the cleaner hero inspector). The rule merge was clean; regenerated the shared cache files. Repeated the combined full suite (**580/580 passing**) and a real 375×667 battle/action check after integration; [integrated phone result](monster-d4-evidence/integrated-battle.json). The campaign comparison above was made against the preceding `20261106a2` magic rules, before that concurrent side-game release; it is not a balance certificate for the combined build.

Headless Chromium was used. Real iPhone/Safari and two-device Firebase play remain unverified.
