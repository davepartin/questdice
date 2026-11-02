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


## Individual Wizard review, 20261102wz2

Reviewed all seven Wizard cards against the Knight/Bard work. Wizard rank panels now use natural unframed paper with a restrained printed edge, including earlier completed ranks. Fixed Pierce/Block results and cover values use muted ink, while selected dice, charges, action controls and live values remain distinct. Titles, frame geometry, cost box, rank numerals, upgrade prices and six-tile menu retain the shared shell.

| Card | Review result |
| --- | --- |
| [Arc Bolt](review-20261102/arcbolt.webp) | Reviewed red d8 purchase track, cost preview, half-splash tag, persistent art and paper rank panels. |
| [Meteor](review-20261102/meteor.webp) | Dedicated meteor painting, prominent actual current-round damage and round label. Upgrade covers show 5 × round / 6 × round instead of a fixed round-three payout. |
| [Magic Missile](review-20261102/bolt.webp) | Dedicated precise piercing-spell painting and muted printed orange Pierce result. |
| [Polymorph](review-20261102/polymorph.webp) | Removed the neon FROG! badge styling, retained a quiet Frog result and clear skipped-attack sentence. Rank III cover explicitly labels cost 2; live cost remains engine-derived. |
| [Barrier](review-20261102/barrier.webp) | Dedicated blue protective-shield painting and printed Block result. |
| [Storm Coil](review-20261102/coil.webp) | Reviewed attack growth track, selected charge ring and Charge OR Use on natural paper. |
| [Healing Light](review-20261102/light.webp) | Dedicated healing-magic painting; green growth track and Charge OR Use retained. |

No names, IDs, effects, balance numbers, costs, unlocks or save data changed. Meteor's actual damage still comes from roundGain; its printed per-round upgrade multiplier also comes from that helper. Arc Bolt, Polymorph and Storm Coil retain their original paintings. Other hero and common utility styles are untouched by the new mc-wizard scope.

Four new paintings replace shared art. Source PNGs are preserved under /workspace/generated_images: exec-1f090a80-7a8b-441e-862b-744b38074e0d.png (Meteor), exec-42216996-3447-45de-8a9a-96f40cb0ad66.png (Magic Missile), exec-22d7e189-ef03-4bb0-897f-56a09c2a784b.png (Barrier), exec-6aea62b3-276f-455f-b42e-e7764f0f048c.png (final Healing Light, edited from preserved exec-16ddf9fa-0e04-497f-88b1-2465d1cd03f5.png).

Validation: all 527 game tests pass. dev/wizard-review.mjs checks all seven cards at ranks I/II/III and 375x667, 390x844, 430x932 and 390x664 (84 cases), with a full six-tile sheet, loaded artwork, contained active/upgrade content, prices and Charge OR Use. Checks also compare Meteor's shown damage/formulas to engine helpers and Polymorph's cost/Pierce to its real rank data. Final 375px checks repeat all 21 ranks after the last printed-cost/art details. A later-round Meteor check verifies all three ranks in round 8. Real Wizard battle checks pass Arc Bolt picker stability, preview, actual payment/attack/splash, Polymorph frog/payment/round lock and Storm Coil charge/release. The battle setup now waits for full startup. Screenshots inspected in Chromium; Safari and two-client play unverified.

[Rank/layout checks](review-20261102/ranks-checks.txt) · [Final details](review-20261102/final-detail-checks.txt) · [Round 8](review-20261102/round8-checks.txt) · [Real battle](review-20261102/battle-checks.txt).
