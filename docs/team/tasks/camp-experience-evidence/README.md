# Camp audit evidence — 2 November 2026

Audit/plan only, main source baseline 245954d (live game build 20261102df2). No app changes. Synthetic local heroes in fresh Chromium browser context, Firebase requests blocked; no player saves used. Audit scripts use the normal game boot, which applies released rules. The audit previews UI only; it does not purchase upgrades.

Actual checks: Dice/Powers/Gear/Store/Hero clicked in sequence, repeated Knight Hero visits, Hero on the other four classes, opening Talent one, selecting an empty face, observing the folded growth control and five symbol choices, and a 375x667 talent view. No page errors or horizontal overflow in measured tab checks. Healthy Hero cases rendered. The reported intermittent Hero failure was not reproduced or fixed; Safari, restored-save edge cases and online tables remain untested here.

Additional checks: Hero summaries contain PROPOSED/internal development copy; rank-three Polymorph camp metadata says 3 magic while the engine's actual cost is 2. [cost-act3.json](cost-act3.json) and [screenshot](power-cost-act3.webp) verify the cost mismatch with a legal act-III rank. The earlier supplemental row in audit.json used a manually set rank in the general act-II fixture; use the explicit act-III check as the cost evidence. A scrolled Powers-to-Hero visit also rendered successfully. See [audit.json](audit.json).

Screens: [Dice](dice.webp), [Powers](powers.webp), [Gear](gear.webp), [Store](store.webp), [Hero](hero.webp), [Talent overview](talent-overview.webp), [Short talent viewport](talent-short.webp).

The audit's cardboardCards count used a guessed .cb-card selector and returned zero; it is not evidence of absent cardboard. The screenshot and source confirm that talentsCard is already rendered. The problem is its duplicate editor/length, visual size labels and a second, folded growth UI.

Reproduce from repository root: CHROME=/usr/bin/chromium node docs/team/tasks/camp-experience-evidence/audit.mjs. Output defaults to /workspace/camp-audit, configurable by AUDIT_OUT. The preserved script corrects its supplemental rank fixture to act III. As this is documentation/inspection only, no full game test run or live UI change is claimed.
