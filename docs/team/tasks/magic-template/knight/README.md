# Knight card family, 20261030kt1

Dave expanded the Cleave request to all Knight cards. There are seven in the current library, including learned alternatives. All share the approved Rally Cry shell: title below painting, matching power icon in art, no type/kick band, current Roman rank bottom-left, printed prices in fixed right cover columns and no “Level” prefix. Dice, flat, special and charge content remain distinct. Charge OR Use stays exclusive; disabled buttons communicate spent state without explanatory text. All values and prices come from existing engine helpers. No engine/data/save changes.

| Card | Display | Art |
| --- | --- | --- |
| [Cleave](cleave.webp) | Dice slots, magic-to-dice purchase, half splash note | Existing Cleave |
| [Judgment](judgment.webp) | Target attack plus separate all-enemy damage, round gate and once-per-battle note | Shared Cleave |
| [Shield Up](shieldwall.webp) | Magic to block | Shared Riposte |
| [Riposte](riposte.webp) | Magic to block, unused block hits back | Existing Riposte |
| [Press the Attack](press.webp) | Magic to attack | Shared Cleave |
| [Rally Cry](rally.webp) | Attack/block charge tracks | Existing Rally Cry |
| [Second Wind](secondwind.webp) | Healing charge track | Shared Rally Cry |

The four alternatives had no dedicated paintings; shared Knight art prevents missing-image cards. Their names/icons remain distinct. Dedicated paintings can be reviewed later, with no large new asset download in this pass. Other heroes are unchanged.

Checks: 42 bounded real-renderer rank fixtures (7 cards x 3 ranks x 2 phone sizes) check no card content spills, art loads, shared frame/title, no type tag, correct OR behavior and cover prices. 390x844 and 375x667. `dev/knight-templates.mjs` reproduces. Real battle `dev/magic-knight.mjs` passes Cleave picking/rolling and actual attack/splash/magic changes, Riposte block/return state and spending, Rally charge/use and per-round disabling; no page errors. `dev/magic-fullscreen.mjs` with HEROES=knight:cleave passes both sizes. Existing Knight/charge-use unit tests 5 pass. Chromium only, no Safari/two-phone verification or balance simulation.

## Cleave refinement, 20261031ct1

Dave's template feedback: no stepping flash, larger dice, explicit attack symbol, Attack red and ½ Splash white tags under the power icon, adjustable cost in the top-right, no repeated cost/dice sentence beneath the dice, and no purple title outline.

The picker now preserves the same connected card/artwork/frame DOM nodes and updates only the changed controls/numbers; Cleave's entrance/dice animations are disabled. Dice are 11cqi instead of 8.2cqi and wrap in four columns at higher ranks. The red attack starburst identifies what the dice add. Top-right cost stays synchronized with the picker and Roll. The magic bar previews the uncommitted balance after the selected cost. Minus refunds the preview; switching cards cancels the preview. The actual balance is untouched until Roll, which charges once using the existing engine. A title/accessible label describes the reserved preview without extra visible prose. Title outline removal applies to the reviewed Knight template. Gameplay numbers, saves, and damage rules unchanged.

Checks: actual Knight battle test passes picker min/max, persistent art/frame identity, no dice animation, synchronized cost, remaining-magic preview, actual single deduction and attack/half-splash result; also passes Riposte and Rally controls. All six Cleave rank/phone renders pass (I/II/III at 375x667 and 390x844); five existing Knight/charge-use tests pass. Chromium only. [Updated Cleave](cleave-refined.webp).

## Complete latest Knight template, 20261031kt2

Dave authorized building all Knight cards after the magic-value review. All seven now have the latest cost slot top-right, power icon top-left, colored effect tags below it, title below the painting without an outline, plain bottom-left current Roman rank and fixed printed-price covers. Attack is red, Block blue, Heal green, Splash/All enemies white and Counter gold. Flat effects no longer repeat their magic cost in the cream area. Charge cards keep Charge OR Use and their colored growth tracks. Selected Knight cards remain visible after casting; spent controls turn grey without a paragraph. Four alternatives still share the existing Knight paintings, as documented above. Other heroes are unchanged.

Approved balance change: Cleave base cost 2→3 and maximum spend 4→5. At rank I, 3/4/5 magic buys 2/3/4d6. Each upgrade still adds one die under the existing engine rule, and half splash remains. No other power was repriced or given new mechanics. The same data drives solo and authoritative party casting. No save-format changes.

Validation: all 523 repository tests pass; actual Knight browser flow passes the new 3→4→5 picker, stable artwork, remaining-magic preview, 5-magic single deduction, attack/splash, Riposte, and Rally charge/use. All 42 rank/phone renderer cases pass. Screenshots above updated. Chromium only; these checks do not prove campaign balance or Safari/two-phone behavior.
