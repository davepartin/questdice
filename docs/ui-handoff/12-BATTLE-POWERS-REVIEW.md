# Battle magic-powers layout

October 21, 2026. Draft PR #30 on ui/camp-art-pass. Not deployed live.

## Result

The three equipped class powers A/B/C form the purple triangle. Potion, Heal and Heart Change sit in a separate three-button helper row. Available magic and health appear above the choices and stay visible during scrolling. Selecting a power highlights its medallion and opens its description, effect, cost and action below.

The panel uses muted metal framing and a blue cloth-like detail surface consistent with camp. Removed continuous ready-ring pulsing and triangle breathing from this selection view. Existing casting reveals remain.

The sheet's content scrolls on short phones and landscape layouts. Both heart-change directions and casting controls remain reachable rather than being clipped by a flex layout. The battle counters and bottom action bar remain outside the sheet.

## Scope

Changed only powers selection DOM and CSS. Reused existing power/utility glyphs and authoritative effect text. No new bitmap assets, dependencies or animation loop. Changed runtime CSS/JS adds about 928 gzip-compressed bytes. Spell costs, availability, scaled spending, charges, release, recharge, utility handlers, casting reveals and multiplayer mutation paths remain in the existing code.

## Verification

`dev/battle-powers-review.mjs` starts a disposable local wizard battle and blocks cloud authentication/database requests. Verifies three class choices and three helpers; selecting a power and changing its magic preview leave battle state unchanged; an actual Arc Bolt cast deducts the displayed magic. Charge details and both heart-change controls remain reachable at 393x852, 375x600, 844x390 and 1280x800. No horizontal document overflow or page errors. Screenshots inspected, including helper badges and selected details.

The UI test uses reduced motion and a seeded battle fixture. This pass does not establish physical iPhone Safari frame rate/battery use or verify live online casting. Full unit battle-rule tests were not rerun because rule handlers are unchanged. Charge/recharge logic is retained; those full round-trip flows were not exercised by this layout test.

## Actual screenshots

- [Overview](../screens/battle-powers/overview.webp)
- [Selected power and cast controls](../screens/battle-powers/selected.webp)
- [Charge detail](../screens/battle-powers/charge.webp)
- [Short phone](../screens/battle-powers/short.webp)
- [Landscape](../screens/battle-powers/landscape.webp)

## Resume

Review the complete phone journey through camp, an upgrade, returning to the road and battle powers. Keep existing dice as the visual authority. Compare actual game screenshots to the original reference before widening scope. Work remains on the review branch until Dave approves publishing.
