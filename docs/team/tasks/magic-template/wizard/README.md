# Wizard magic card template

Build 20261031wt1. All seven Wizard powers use the shared Knight/Rally shell. No engine, save, dice, balance or price changes.

| Card | Effect display | Existing art reused |
| --- | --- | --- |
| Arc Bolt | Large red d8s, attack starburst, Attack / half Splash tags; selected magic cost at top right | Arc Bolt |
| Meteor | Engine-derived attack for the current round, minimum-round reminder, Attack / half Splash | Arc Bolt |
| Magic Missile | Orange Pierce icon and amount | Arc Bolt |
| Polymorph | Transform tag, frog, upgraded Pierce; rank III cost is 2 in corner and button | Polymorph |
| Barrier | Blue Block icon and amount | Polymorph |
| Storm Coil | Cumulative red attack row, half Splash, Charge OR Use | Storm Coil |
| Healing Light | Cumulative green healing row, Charge OR Use | Storm Coil |

Shared layout: title below artwork without purple outline, power icon and effect tags on left of painting, cost on right, current Roman rank bottom-left, parchment upgrade covers with fixed right-side printed prices 50 / 90. Four alternatives share existing Wizard paintings until dedicated art review.

Arc Bolt steppers update only the dice, cost, controls, grid and tally. Artwork/frame stay mounted. The tally previews actual magic minus selected cost, and Roll pays once. Reviewed Wizard cards remain selected after casting. Charge and Use keep the existing exclusive-round checks and grey disabled states. No already-charged explanation is added.

## Verification

42 bounded sheet renders: seven cards, ranks I/II/III, at 375x667 and 390x844, with loaded art, contained card/cover contents, Roman ranks, shared cover prices and no type labels. Real Wizard battle checks cover Arc Bolt stepper DOM stability, preview, payment, attack/splash; Polymorph payment/frog/round lock; Storm Coil charge and release. Knight starter controls and eight existing Wizard/Knight engine tests also checked. Chromium only. No balance simulations or Safari verification.

Reproduce with `HERO=wizard CARDS=arcbolt,meteor,bolt,polymorph,barrier,coil,light CHROME=/path/to/chrome node dev/knight-templates.mjs /tmp/wizard-templates` and `CHROME=/path/to/chrome node dev/magic-wizard.mjs /tmp/wizard-battle`.

Screenshots: [Arc Bolt](arcbolt.webp), [Meteor](meteor.webp), [Magic Missile](bolt.webp), [Polymorph](polymorph.webp), [Barrier](barrier.webp), [Storm Coil](coil.webp), [Healing Light](light.webp). These are focused renderer fixtures; the battle script separately exercises the live controls.
