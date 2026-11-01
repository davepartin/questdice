# Utility magic cards

Build 20261031ut1. Potion, Heal and Heart Change share the approved frame, title band, artwork emblem and corner cost. Potion reuses the existing bottle asset; Heal and Heart use lightweight native icons and colored light. Cream panels show healing amount, actual health meter and inventory, or the original heart die choices. These utilities have no invented upgrade ranks or prices.

Existing callbacks, reasons and disabled rules are preserved. Heart controls move from the existing controller-created panel into the card; no target or timing code is changed. Result notes remain visible. No changes to battle3d.js, engine.js or powers.js, which Claude has reserved.

`dev/magic-utilities.mjs` passes real-battle checks at 390x844 and 375x667: all three cards fit without page scroll, Heal spends magic/restores health, Potion consumes inventory, Heart Up changes the face and locks both controls, result/selection remains visible, no page errors. Chromium only.

[Screenshot: Potion](bigheal.webp), [Heal](heal.webp), [Heart Change](heart.webp).

## Potion tray, 20261031pt1

Five cardboard recesses replace the large healing number. Carried potions fill them with green bottle chits labeled with the actual act-dependent potion healing amount (new heroes: two +10 chits). Unlocked empty spaces and dashed future spaces stay empty. Existing belt capacity, purchasing, saves and healing values are preserved. Potion corners use subtle green life crosses. A successful drink launches a departing chit after the controller confirms consumption; failed actions do not animate. Newly filled spaces animate on rerender. Reduced-motion preference disables movement. No new image asset is needed; the existing bottle and cardboard textures are reused.

Actual utility flow checks at 390x844 and 375x667 cover five slots/two chits/corners, drinking and departure, refill via the existing purchase function, and Heal/Heart regression. Four existing potion engine tests pass.

## Heart Change refinement, 20261101hc1

Dave requested dice artwork rather than a large heart, title capitalization, a boxed top-right magic cost, clearer controls, and removal of the extra footer captions. Heart Change now combines the existing dice-board painting and a golden 3D heart-die sprite. Its original controller buttons retain their destination faces, payment, once-per-round and disabled rules, with larger hit areas, readable wrapping labels and keyboard focus. The top-right cost box has a stronger border. Potion, Heal and Heart Change no longer render their footer captions; the cream panels use the freed space. Battle controller edits are title strings only. No rules, save or target changes.

Validation: all 527 tests pass. Real-battle utility checks cover phone layouts, actual Heal, Potion consumption/departure/restock, and Heart Up changing the face and disabling both choices. Final screenshots and build verification are recorded on the team board. Chromium only; human iPhone/Safari inspection remains unverified.

Final phone renders: [390x844](heart-change-390.webp), [375x667](heart-change-375.webp). `dev/magic-utilities.mjs` passes all final assertions, including caption removal, title/cost, artwork and button label fit at both sizes.

## Bottle punchboard and center Heart die, 20261101pc2

Dave requested matching empty, spent and future potion spaces; a shared cardboard material; bottle-shaped green chits with +10; emphasis on the grid's actual center die; and Heart controls without explanatory words. All five recesses now share one bottle silhouette and cardboard surface. Carried potions use matching bottle-shaped punched-out chits, with the actual healing amount printed on them (+10 in Act I). Their arrival/departure animations and existing inventory, belt, purchase and heal rules remain intact.

Heart artwork uses two views of the same real board image: a dimmed grid and a softly highlighted center Heart die. The separate off-center sprite is gone. Original controller buttons retain their face images, accessible destination labels, callbacks and disabled rules; only arrows remain visible. Removed Turn one step, Now, Once per round and Heart result prose from this card.

All 527 game tests pass. `dev/magic-utilities.mjs` passes real-battle checks at 390x844 and 375x667: all cards fit without scrolling, bottle silhouettes and identical slot materials, +10 labels, arrow-only controls with accessible names, Heal, Potion consumption/departure, an entirely empty tray after two drinks, Heart Up and restocking. Final renders inspected in Chromium; human Safari remains unverified.

[Filled potion tray](potion-punchboard-390.webp) · [Empty potion tray](potion-empty-375.webp) · [Heart Change](heart-center-375.webp).

## Continuous cardboard and thick chits, 20261101pc3

The prior token-open texture included its own edge/frame and was repeated on the tray, empty bottle silhouettes and chits. That created the doubled panels and black seams Dave reported. The tray now has one unframed plain cardboard surface; identical empty bottle marks use a single flat shade. Chits have separate clipped printed faces and darker layered cut edges beneath them, plus a small contact shadow. Bottle art and +10 remain on top of the cardboard; the whole thick piece moves during the existing drink animation. CSS only; no mechanics or save changes. The concurrent tz1 Talent change is preserved.

All 527 tests pass. Real utility checks at 390x844 and 375x667 pass, including no texture images behind the tray/spaces, identical recesses, drink/departure, empty tray, restock, Heal and Heart regression. Filled/empty phone renders inspected in Chromium; Safari remains unverified. [390x844](potion-thick-390.webp) · [375x667](potion-thick-375.webp).

## Heal exchange card, 20261101he1

Dave requested a simple board-game conversion: two purple magic triangles → three green life pluses, with no duplicate health meter because current health is already above the card. Heal now renders a centered icon exchange using the actual controller cost and engine heal amount. Removed Health now, the meter/totals and the post-Heal result paragraph from the card. The original Heal button, cost, callback and disabled rules are preserved. No engine/save changes.

All 527 tests pass. Real utility checks at 390x844 and 375x667 pass: exactly two input triangles, three output life pluses, no duplicate health UI, no overflow, and an actual button press paying exactly 2 magic and restoring 3 health. Potion and Heart regressions also pass. Both rendered phone layouts inspected in Chromium; Safari remains unverified. [390x844](heal-exchange-390.webp) · [375x667](heal-exchange-375.webp).

## Heart controls above the card, 20261101hc2

Dave requested ▼ OR ▲ above Heart Change so switching powers does not resize the card, with face results shown on the card. Original controller buttons (handlers, accessible destination names and disabled rules) now live in the standard action row, with arrows only and OR between. The cream panel contains passive lower/current/higher face images; the current face is highlighted and updates after a successful change. Unavailable outcomes dim. All selected cards reserve the same 42px action row. No engine, save or payment changes.

All 527 tests pass. Real-battle checks at 390x844 and 375x667 confirm all six selected cards have identical width, height and top position at each viewport; the external controls sit above the card; no buttons remain inside it. Up and Down each pay exactly 3 magic once, update the current face and disable both controls after use; faces 1 and 6 disable only the impossible arrow when otherwise eligible. Heal/Potion regressions and zero page errors pass. Both phone renders inspected in Chromium; Safari remains unverified. [390x844](heart-controls-390.webp) · [375x667](heart-controls-375.webp).

## Fantasy utility paintings and larger Heart choices, 20261101ua1

Dave asked to finish organizing the three second-row utility cards: active fantasy scenes for Heal and Potion, and larger destination faces on Heart Change. New original illustrations show purple healing ribbons around an armored chest and a gloved adventurer drawing a green bottle from a leather potion belt. Optimized WebP assets live in assets/cards/utilities/ (about 175 KB total); original generated PNGs remain in the workspace generated_images directory. Card art fills the existing window without the old bottle tint/rotation. Thick +10 chits and the two-magic/three-life exchange are unchanged.

Heart destination faces are 18cqi versus 12cqi for the center current face, with the existing current-face outline. Scoped selectors override legacy heart-face dimensions. Outside ▼ OR ▲ buttons, costs and all six cards' common geometry remain. No mechanics or saves changed.

All 527 game tests pass. Final real utility checks at 390x844 and 375x667 pass: both scenes loaded untinted, destination/current size ratio, identical six-card geometry, exact Heal payment, Potion departure/restock, Heart Up/Down payment, once-per-round and face boundaries, and zero page errors. The test now waits for table setup to finish and selects the actual Magic button explicitly. Final phone crops inspected in Chromium; Safari remains unverified.

[Heal](fantasy-heal-375.webp) · [Potion](fantasy-potion-375.webp) · [Heart choices](heart-outcomes-375.webp).

## Heart preview, Use and visible turn, 20261101hp1

Dave requested a safer two-step Heart Change: vertical higher/current/lower faces, bold purple rings moving from the current face to a chosen destination, then a separate Use button that returns to battle and shows the real die rotate. Arrow taps now update local preview state only. Use is disabled until a direction is selected and the existing cost/rules allow it. Closing or switching cards discards an unconfirmed selection without spending. Preview can be explored without enough magic; Use remains disabled. No new price, face or once-per-round rules.

Confirmation rechecks the selected face, round and hero, then uses the existing authoritative nudge action. Offline still calls E.nudge once; online still sends the same nudge command and waits for acceptance. Successful confirmation closes the sheet, rotates the actual 3D heart die with the existing tray flip/purple pulse, and blocks conflicting battle controls until the animation finishes. Rapid repeated confirmation cannot pay twice. Reduced motion skips ring travel, the animated rotation and the pulse. A bounded animation wait prevents a replaced pose leaving controls stuck. No save or server protocol changes.

All 527 game tests pass. Final dev/heart-preview.mjs checks pass at 390x844 and 375x667: vertical layout and ring travel, free Up/Down preview, cancel/switch discard, exact single payment, visible physical quaternion motion/desired final face, once-per-round and face-1/6 limits, stale face/round/hero rejection, affordability recheck, reduced motion and zero page errors. The separate magic-utilities check passes Heal/Potion/art/constant-card-size regressions. Rendered 3D turn frames and both phone card layouts inspected in Chromium. Manual Safari and two-phone online animation remain unverified; existing server/table authority tests pass.

[Current face](heart-preview-current.webp) · [Selected destination](heart-preview-selected.webp) · [Turning in battle](heart-preview-turning.webp) · [Desired result](heart-preview-turned.webp) · [Focused check log](heart-preview-checks.txt).

## Spent powers in the grid, 20261101sp1

Dave requested an obvious crossed-out state after a limited-use power is consumed. Tiles now show a muted icon, burnished diagonal strike and a small USED stamp. Names and costs remain readable, and spent tiles remain tappable for inspection. Accessible labels/tooltips say used this round or used this battle.

Power tiles use the existing engine powerState.spent result, including Charge/Use flags. Heart Change uses the current hero's board.nudged flag. No availability rules, costs or timers changed. Merely unaffordable/early powers and full-health Heal/Potion are not falsely marked used. Every-round powers clear on the actual next-round reset; once-per-battle powers retain the mark until the engine restores them.

All 527 game tests pass. Extended dev/heart-preview.mjs checks actual Heart use at 390x844/375x667; actual Cleave/Riposte/Charge casts; passive inspection; real next-round resets; a Judgment cast remaining spent through another round and restoring in a new battle with zero magic; existing preview/confirm/rotation safeguards; and zero page errors. Both rendered grids inspected in Chromium; Safari remains unverified. [390x844](spent-grid-390.webp) · [375x667](spent-grid-375.webp) · [Check log](spent-grid-checks.txt).

## USED without a strike and Heal feedback, 20261101hf1

Dave preferred the USED stamp alone, removed Heal's redundant RESTORE tag, and requested a little flash behind the top-right health number so healing visibly registers. The common diagonal spent-tile pseudo-element is removed; existing USED stamps, muted icons and engine-driven reset behavior remain. Heal alone no longer renders the RESTORE trait; Potion and Heart traits are preserved.

After a successful Heal actually increases health, the newly updated top-right health tally gets a short green background glow behind its number. It fades after 650 ms, or 200 ms for reduced motion, with no movement/reflow. The animation class clears on completion and retriggers on subsequent successful heals. Full health, insufficient magic and failed actions do not trigger it. Existing cost, gain/cap, callbacks and save rules remain.

All 527 tests pass. Real utility checks at 390x844 and 375x667 pass, including no Heal trait, exact conversion/payment, active health-number feedback and cleanup, a capped one-health gain, no flash for blocked heals, USED without a strike, unchanged six-card geometry, Potion/Heart regressions and zero page errors. Both phone layouts and the highlighted tally inspected in Chromium; Safari remains unverified. [Health flash](heal-health-flash.webp) · [USED without strike](used-without-strike.webp) · [Check log](health-feedback-checks.txt).
