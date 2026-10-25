# T20: Show Dave how the released arrows work

Status: READY. Owner: Claude (actual game behavior and demonstration). Grok may assist presentation after mechanics are verified. Requested by Dave, 24 October 2026.
Scope: demonstrate existing released ammunition choices. No arrow balance change; keep separate from proposed T17 faces.

Dave has heard about the four ammunition types but has never seen their effects work and wants concrete comparisons that make the choice feel meaningful.

## Source-checked behavior

Read js/release.js applyRelease, js/data.js WEAPONS2, js/engine.js setAmmo/evaluate/thaw/resolve/newPartyBattle, and js/g3/scrui.js ammoPick. This intake is source inspection, not a browser run.
- Released rules call useWeapons2; ammunition choices are Normal, Piercing, Fire, Frost.
- Camp's Arrows equipment detail contains AMMUNITION controls, free to change. Inst.ammo controls the selection; missing/invalid defaults to Normal.
- Special effects trigger only on marked arrowhead faces. Ordinary numbered faces in special ammunition do not trigger the special effect.
- Released numbered special faces have arrowheads on 1/4 d4 faces, 2/6 d6 faces, 3/8 d8 faces, 3/10 d10 faces. These are per-roll face probabilities before rerolls or other choices, not whole-turn trigger rates.
- Normal has no arrowhead effect and generally larger printed damage values than special ammunition on the corresponding special face.
- Piercing: converts the arrow lane's value at the conversion point to pierce. Do not call the entire hero attack unblockable; later bonuses and other lanes are separate.
- Fire: regular target hit plus splash equal to the associated hand die's printed number to every other living enemy. Their guard/armour can reduce the splash. No other enemies means no splash benefit.
- Frost: regular target hit plus reduction equal to that hand number on the surviving target's next damaging blow, then consumed. Does not stack. Initiative matters: it cannot undo an attack that already occurred.
- Stale comments in data/engine describe half splash or halved next damage; applyRelease overrides to full hand-number splash and hand-number reduction. Demonstrate released behavior, not those old comments.

## Simple arithmetic examples to validate and show

Assume Bronze d4 Arrows, associated hand shows 4, no bonus perks, Heart amplification, talents or other lanes contributing to these examples. Compare the fourth die face; special ammunition uses A2, Normal uses R4. Targets have enough health.
- Normal: 4 + 4 = 8 ordinary attack; against 3 defence this contributes 5 damage.
- Piercing: A2 + 4 = 6 pierce, bypassing the target's 3 defence.
- Fire: A2 + 4 = 6 ordinary attack against the selected target, plus 4 splash to each OTHER enemy before their defence. Against 3 defence on the selected target that is 3 damage there; an unguarded other enemy takes 4.
- Frost: A2 + 4 = 6 ordinary attack plus 4 reduction to the target's next damaging blow. A 12-point blow becomes 8 before applicable player block. Show a case where the archer acts first and another where the monster has already attacked.

These examples describe the arrow lane in isolation, not the Ranger's entire turn or a simulation result.

## Deliverable

After the active T19 investigation, produce a compact actual-game demonstration of selecting ammunition at camp and resolving a marked arrowhead for each type. Show the trigger face, relevant hand number, target, before/after enemy health, affected other enemies and frost reduction. A labeled screenshot sequence or short recording is enough; do not build a new combat system. Include one ordinary non-trigger face and why Fire differs against a lone boss versus several enemies.

Record which build and browser were used. If creating a shareable static demonstration, label any forced dice as demonstration-only and keep it isolated from live saves. Coordinate with Grok through BOARD.md only if explanation/visual polish needs assistance. No additional phone homework for Dave; do not claim Safari testing without it.
