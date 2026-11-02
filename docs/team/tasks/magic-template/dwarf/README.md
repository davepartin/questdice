# Dwarf Warden magic card template

Build 20261031dw1. All seven Dwarf powers use the approved shared shell. Costs, dice, engine rules, saves and balance remain unchanged.

| Card | Effect display | Existing art reused |
| --- | --- | --- |
| Anvil Strike | Large blue block d8s; each rolled 8 gives 3 gold, shown as a die-to-gold equation | Anvil Strike |
| Avalanche | Target attack and block, separate attack to every enemy, round 3+ and once-per-battle reminder | Anvil Strike |
| Grudge | Current attack from last round's damage past block, plus rank bonus 0 / 3 / 6 | Grudge |
| Shield Bash | Red attack icon and engine-scaled amount | Grudge |
| Brace | Blue block icon and engine-scaled amount | Stonehide |
| Stonehide | Cumulative blue block track; Charge OR Use | Stonehide |
| Forge Fury | Cumulative red attack and blue block tracks; Charge OR Use | Anvil Strike |

Shared title below painting, artwork icon/traits on the left and magic cost on the right, current Roman rank bottom-left, parchment covers with printed prices 50 / 90. Four alternatives reuse existing paintings until dedicated artwork review. Avalanche's multi-effect covers and three small traits are sized to fit the shared layout.

Anvil steppers preserve mounted artwork/frame and preview remaining magic, with actual payment once on Roll. The face-triggered gold rule remains visible. Grudge uses actual lastHurt plus its explicit rank bonus; the generic flat-effect renderer must not hide this specialized effect. Dwarf selection stays visible after casting. Charge/use round locks and grey disabled states remain.

## Verification

42 bounded renderer fixtures: seven cards, ranks I/II/III, 375x667 and 390x844, checking loaded art, contained card/cover content, prices, no type tag and Charge OR Use. Real Dwarf battle checks pass: full-screen sheet without page scroll; Anvil stepping/art stability, selected cost/preview/payment and block equal to rolled d8s; Grudge damage-derived attack/payment/round lock; Stonehide charge and release. The real Anvil cast rolled 7,3,2, so the positive gold-on-8 case is covered by the existing engine test rather than claimed from that browser cast. Seventeen existing Dwarf/Knight/Ranger/Wizard engine tests pass. Chromium only; no Safari or balance simulation claim.

Reproduce: `HERO=dwarf CARDS=anvil,avalanche,grudge,bulwark,brace,stonehide,forgefury CHROME=/path/to/chrome node dev/knight-templates.mjs /tmp/dwarf-templates` and `CHROME=/path/to/chrome node dev/magic-dwarf.mjs /tmp/dwarf-battle`.

Focused renderer screenshots: [Anvil Strike](anvil.webp), [Avalanche](avalanche.webp), [Grudge](grudge.webp), [Shield Bash](bulwark.webp), [Brace](brace.webp), [Stonehide](stonehide.webp), [Forge Fury](forgefury.webp).


## Individual Dwarf review, 20261102df2

Reviewed all seven Dwarf cards to complete the requested hero-by-hero review. Dwarf rank panels, including completed ranks, use natural unframed paper with a restrained printed edge. Fixed effects, gold-on-8 reward and cover values use muted printed ink; selected dice, charge rings and action controls remain distinct. Shared frame, cost slot, ranks, 50/90 prices and six-tile menu remain.

| Card | Review result |
| --- | --- |
| [Anvil Strike](review-20261102/anvil.webp) | Reviewed blue block dice, stable cost preview and the face-8 to +3 gold exchange on paper. |
| [Avalanche](review-20261102/avalanche.webp) | Dedicated mountain-cascade painting; attack/block bonuses separated from Every enemy damage, with roomier two-line upgrade covers. Round gate and once-per-battle reminder retained. |
| [Grudge](review-20261102/grudge.webp) | Large actual attack result, explicit damage past block last round, and separate rank bonus. Covers show Hurt / Hurt +3 / Hurt +6 rather than implying flat attack upgrades. |
| [Shield Bash](review-20261102/bulwark.webp) | Dedicated attacking-shield painting and printed fixed Attack result. |
| [Brace](review-20261102/brace.webp) | Dedicated planted defensive-stance painting and printed Block result. |
| [Stonehide](review-20261102/stonehide.webp) | Reviewed cumulative blue Block track, selected charge ring and Charge OR Use on paper. |
| [Forge Fury](review-20261102/forgefury.webp) | Dedicated fiery-hammer/blue-shield painting, with separate attack and block charge tracks. |

No names, IDs, costs, unlocks, effects, saves or battle rules changed. Grudge reads the existing lastHurt and rank bonus values; Avalanche uses the same scaleNum data as before. Its area-effect renderer is shared with Bard Finale, with that renderer renamed to areaEffects without changing Bard output. Other hero/common utility styles are outside the new mc-dwarf scope.

Four new illustrations replace shared art. Original PNGs remain in /workspace/generated_images: exec-482e818a-44fe-49fc-845d-7c8304d7644e.png (Avalanche), exec-821fc602-ddf9-45e0-a53e-fc3451312a4b.png (Shield Bash), exec-a197c336-dd55-4572-9e8f-3f43498ddf25.png (Brace), exec-fa8f46c3-81d0-4a41-8728-75aafda93093.png (Forge Fury).

Validation: all 527 game tests pass. dev/dwarf-review.mjs checks all seven cards at ranks I/II/III and 375x667, 390x844, 430x932 and 390x664 (84 cases), including full menu, loaded art, contained active/upgrade content, prices and Charge OR Use. Values are compared with existing data/helpers for Avalanche attack/block/area damage, Grudge's damage-derived output and the Anvil face reward. Grudge was rechecked at all ranks with seven damage and zero damage after its final caption refinement; the Bard Finale renderer also passes at all three ranks. Real Dwarf battle checks pass Anvil picker/art stability, preview/payment and rolled block, Grudge payment/actual attack/round lock and Stonehide charge/release. That final Anvil browser cast rolled 6,2,4; positive gold-on-8 payouts remain covered by game tests rather than claimed from that cast. Seven card screenshots inspected in Chromium; Safari and two-client play unverified.

[Rank/layout checks](review-20261102/ranks-checks.txt) · [Final Grudge](review-20261102/grudge-checks.txt) · [Zero damage](review-20261102/grudge-zero-checks.txt) · [Bard regression](review-20261102/bard-regression-checks.txt) · [Real battle](review-20261102/battle-checks.txt).

The separately approved ptc1 role-color update landed during publication. It was merged without changing its role tags, white menu cost triangles or color rules; the Dwarf and role-color CSS blocks both remain. The build was restamped and the complete game/rank checks repeated on the merged files. Final evidence screenshots include those role-colored tiles.
