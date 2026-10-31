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
