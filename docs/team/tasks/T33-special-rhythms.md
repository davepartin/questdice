# T33 Visible monster Special rhythms

Dave asked to build the timing cues and show three example monsters. Build `20261106mr1`.

The card footer now explains the actual timing, without changing any combat state, damage, chance, cooldown or save field.

- **Slam / Inferno:** Wind-Up → Slam/Inferno → Normal. The current step is highlighted. Wind-Up gives the interrupt goal and a conditional warning about the next turn; the ordinary turn explicitly says “Wind-Up next round.” Interrupting skips the big step, so the readout follows the current intent and never guesses from round modulo three.
- **Spawn / Raise Dead:** Every round, the actual minion name, and a remaining-summon count. The dots count successful summons left, not rounds left. Empty summons go grey.
- **Regrow:** Every round and the actual damage/heal threshold.
- **Shield:** Until broken and the actual attack/block numbers. Broken shields remain as a grey “Shield broken” footer, so the player can see why the ability ended.
- **Bounty:** remaining-round countdown, then Expired.
- **Sleeping:** Until hit, with an explicit option to leave it alone. Once awake, the footer says double attacks last until defeated.

The repeated Wind-Up box and misleading “rolls again next round” line are removed when the new Special footer explains the turn. The four move rows, D4 and full details on a forced damaging Special turn remain. Legacy callers without timing data retain their old footer.

## Implementation

`specialTiming(b,e)` in `js/engine.js` is a pure readout: it does not mutate monsters or consume randomness. `cardFactsOf` passes it into the production mini-card renderer; the footer uses existing Special colors, with grey inactive/finished states. No phase counters or timing state were added to saves.

## Evidence

All **586 tests pass**, including six new timing tests: actual uninterrupted Slam cycle, actual interrupted cycle, Inferno naming, summon limits and minions, persistent/completed conditions, disabled/dead cases, and readout purity.

`node dev/special-rhythm-shots.mjs`: **45 phone/state/text layouts** at 390×844, 430×932, 375×667, 375×548 and larger text, covering every Special type and active/inactive/completed states. Checked readable/reachable footers, action position, horizontal fit and truthful normal-turn prediction. The final renderer was also checked in an actual three-monster battle, with screenshots of each monster selected and no page errors.

The example is a valid seeded battle with Hill Ogre (Slam), Hollow Lich (Raise Dead), and Bone Soldier (Shield). The wide comparison lays the production card DOM side by side for viewing; gameplay retains its overlapping target picker. Card details in the wide view come from the engine and the same production `cardFactsOf` adapter, rather than invented labels. The phone screenshots show the actual battle UI.

- [Three example cards](special-rhythm-evidence/three-monsters.webp)
- [Ogre phone view](special-rhythm-evidence/ogre-phone.webp)
- [Lich phone view](special-rhythm-evidence/lich-phone.webp)
- [Bone Soldier phone view](special-rhythm-evidence/skeleton-phone.webp)
- [Browser results and fixture](special-rhythm-evidence/results.json)

Headless Chromium, not Safari; live two-device Firebase play was not repeated for this display-only change.
