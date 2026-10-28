# Compact details and consistent Close, 27 October 2026

Build 20261027ui2. Dave requested enemy inspection without wasted vertical space, one approved Close button, and a polished objective result screen.

Enemy inspection uses a shorter miniature stage, compact stat rows and ability cards, and a properly aligned 44px Close control. The same Close label/style is applied centrally to dismiss buttons built with the shared DOM helper. Camp inspectors and the Soul Code dialog now say Close rather than Done. Continue, Cancel and purchase actions retain their own meaning.

Objective results use a full reading area, one card frame, hero/outcome headings, an explicit Completed or Not completed status when the rules supply it, and separate gold amounts. Solo objectives now carry their existing name, rule and stake into the view, so the card can show the actual objective instead of repeating a long narrative sentence. Legacy and multiplayer envelopes retain their existing explanation. The decorative miniature strip and nested border are removed from this result view. No rules, payouts or saves changed.

Bounded Chromium checks: real battle inspection for bonfire and goblin, all abilities within the panel and Close dismisses it. The test uses the pierce move where available to exercise the longer explanation. Phone widths 375 and 430 plus the earlier 390x664 check. Actual single-objective result and shared font/loading checks included. Existing card/price tests: 20 pass. Safari is not directly tested. No balance simulations.

Evidence: [enemy](enemy.png), [objective](objective.png). Reproduce with CHROME=/path/to/chrome node dev/compact-review.mjs shots/compact-review 8195. The browser fixtures use disposable local state.
