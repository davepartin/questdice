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
