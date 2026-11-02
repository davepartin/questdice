# Ranger magic card template

Build 20261031rg1. All seven Ranger powers use the approved Knight/Wizard shell. Engine rules, costs, dice, saves and balance are unchanged.

| Card | Display | Existing art reused |
| --- | --- | --- |
| Aimed Shot | Large orange Pierce d6s, Pierce symbol, dynamic corner cost | Aimed Shot |
| Rain of Arrows | Target Pierce plus red attack to every enemy; minimum round and once-per-battle reminder | Aimed Shot |
| Quick Draw | Reroll symbol with 2 / 3 / 4 reroll dice at ranks I / II / III | Aimed Shot |
| Hunter's Mark | Pierce and conditional gold reward if target falls; both upgraded with engine scaleNum | Hunter's Mark |
| Snare | Weaken symbol and reduced enemy attack; engine-derived upgrade values | Hunter's Mark |
| Volley | Orange cumulative Pierce track; Charge OR Use | Volley |
| Vanish | Blue cumulative Block track; Charge OR Use | Volley |

Shared layout retains the title below artwork, left artwork icon and effect tags, top-right magic cost, bottom-left current Roman rank, parchment covers and printed right-side prices 50 / 90. Four alternatives reuse existing Ranger paintings until dedicated artwork review.

The effect template handles differing rules explicitly: rerolls add one die per rank, conditional gold is not an immediate reward, and Rain's target Pierce is distinct from its attack to all enemies. Cream-panel gold/reroll/weaken icons use darker ink for contrast. Aimed Shot preserves mounted art/frame while stepping and previews remaining magic before Roll pays once. Ranger selection remains visible after casting.

## Verification

42 renderer fixtures cover seven cards at all three ranks and 375x667 / 390x844; final contrast/text refinements also rechecked on affected cards. Loaded artwork, contained card/cover content, shared prices, no type tags and charge OR verified. Real Ranger battle checks pass for Aimed Shot stepper/art stability, preview, payment and Pierce; Hunter's Mark payment/Pierce/conditional gold setup/round lock; Volley charge and release. Twelve existing Ranger/Knight/Wizard engine tests pass. Chromium only; no Safari or balance simulation claim.

Reproduce: `HERO=ranger CARDS=aimed,rain,quickdraw,mark,snare,volley,vanish CHROME=/path/to/chrome node dev/knight-templates.mjs /tmp/ranger-templates` and `CHROME=/path/to/chrome node dev/magic-ranger.mjs /tmp/ranger-battle`.

Focused renderer screenshots: [Aimed Shot](aimed.webp), [Rain of Arrows](rain.webp), [Quick Draw](quickdraw.webp), [Hunter's Mark](mark.webp), [Snare](snare.webp), [Volley](volley.webp), [Vanish](vanish.webp).


## Individual Ranger review, 20261102rn2

Reviewed all seven Ranger cards against the Knight/Bard/Wizard work. All Ranger rank panels, including completed ranks, now use natural unframed paper and a restrained printed edge. Fixed effects and upgrade cover values use muted ink; selected dice/charges and controls retain their clear active state. Shared frame geometry, cost slot, six-tile menu, ranks, 50/90 cover prices and action controls remain.

| Card | Review result |
| --- | --- |
| [Aimed Shot](review-20261102/aimed.webp) | Reviewed orange Pierce dice and purchase track, stable artwork, cost preview and printed paper ranks. |
| [Rain of Arrows](review-20261102/rain.webp) | Dedicated magical arrow-rain painting. Target Pierce and Every enemy attack have separate rows, including explicit target/all labels on roomier upgrade covers. Round gate and once-per-battle reminder retained. |
| [Quick Draw](review-20261102/quickdraw.webp) | Dedicated magical second-chance dice painting; printed reroll count and readable reroll dice label. Counts remain 2/3/4 across ranks. |
| [Hunter's Mark](review-20261102/mark.webp) | Immediate Pierce is separate from the conditional gold reward. Main panel says If target falls this round; each cover marks its gold on defeat. Values still scale from the engine data. |
| [Snare](review-20261102/snare.webp) | Dedicated woodland snare painting, printed weakening amount and readable enemy attack label. |
| [Volley](review-20261102/volley.webp) | Reviewed cumulative Pierce track, selected charge ring and Charge OR Use on paper. |
| [Vanish](review-20261102/vanish.webp) | Dedicated magical evasion painting; blue Block growth track and Charge OR Use preserved. |

No names, IDs, costs, effect numbers, unlocks, saves or battle rules changed. Ranger-specific summary markup keeps conditional rewards and all-enemy effects distinct. The original Aimed Shot, Hunter's Mark and Volley paintings remain. Other heroes and common utilities are outside the new mc-ranger styles.

Four new illustrations replace shared paintings. Preserved source PNGs in /workspace/generated_images: exec-dac6da90-f245-43c5-adcf-8c4aa8f7f3b6.png (Rain of Arrows), exec-2cf19b75-ce31-4846-aaeb-acaecf02fcea.png (Quick Draw), exec-b569f9fd-53b8-42ce-9d23-b19ce1ad12ac.png (Snare), exec-91c6e4f5-7d2b-4e5b-9327-3b2c2e68dece.png (Vanish).

Validation: all 527 game tests pass. dev/ranger-review.mjs checks all seven cards at ranks I/II/III and 375x667, 390x844, 430x932 and 390x664 (84 cases) with the full six-tile sheet. Artwork loads, active/upgrade content stays inside the card/panel, prices and Charge OR Use are correct. Rank-specific checks compare shown Pierce, all-enemy attack, conditional gold, reroll counts and weakening to existing data/helpers, and preserve target/reward conditions. Real Ranger battle checks pass Aimed Shot art/picker stability, preview/payment and Pierce dice, Hunter's Mark payment/Pierce/conditional reward setup/round lock, and Volley charge/release. Screenshots of all seven cards inspected in Chromium; Safari and two-client play unverified.

[Rank/layout checks](review-20261102/ranks-checks.txt) · [Real battle checks](review-20261102/battle-checks.txt).
