# Utility magic cards

Build 20261031ut1. Potion, Heal and Heart Change share the approved frame, title band, artwork emblem and corner cost. Potion reuses the existing bottle asset; Heal and Heart use lightweight native icons and colored light. Cream panels show healing amount, actual health meter and inventory, or the original heart die choices. These utilities have no invented upgrade ranks or prices.

Existing callbacks, reasons and disabled rules are preserved. Heart controls move from the existing controller-created panel into the card; no target or timing code is changed. Result notes remain visible. No changes to battle3d.js, engine.js or powers.js, which Claude has reserved.

`dev/magic-utilities.mjs` passes real-battle checks at 390x844 and 375x667: all three cards fit without page scroll, Heal spends magic/restores health, Potion consumes inventory, Heart Up changes the face and locks both controls, result/selection remains visible, no page errors. Chromium only.

[Screenshot: Potion](bigheal.webp), [Heal](heal.webp), [Heart Change](heart.webp).
