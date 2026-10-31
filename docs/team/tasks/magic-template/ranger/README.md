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
