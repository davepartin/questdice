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
