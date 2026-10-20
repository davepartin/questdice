# Copy-and-paste builder prompt

You are implementing a carefully scoped UI improvement for Dave Partin's working game, Davepartin/questdice.

Read 00-START-HERE.md, 02-DESIGN-AND-BUILD-PLAN.md, and 03-ACCEPTANCE-AND-REVIEW.md from this handoff. Then inspect the current repository and applicable project instructions.

Your assignment for this session is PHASE 1 ONLY: camp's character board and one polished body-die upgrade interaction, with all existing camp features still reachable.

The game currently works. Preserve mechanics, balance, purchases, prices, equipment requirements, save formats, campaign progression, and multiplayer authority. Do not refactor the battle engine or replace the rendering architecture.

Work on a separate branch. Do not merge or publish the live site. Treat the visual concept as an art-direction reference, never as a source for mechanics or sample values.

Before editing:
- Record the current commit and worktree state. Preserve unrelated changes.
- Read the current top-level handoff/status notes and relevant recent camp notes in docs/PLAN.md. Do not dump the entire long file into context.
- Read js/g3/scrui.js camp and slot-sheet functions, js/campbuy.js, relevant camp CSS, and their direct dependencies.
- Check how solo and online camp actions delegate mutations.
- Run the existing tests and record pre-existing failures.
- Capture the current camp and one upgrade at a phone-sized viewport.
- Record a small repeatable loading/interaction baseline. Do not claim real-phone performance from emulation.

Build:
1. Use the same nine-slot character layout and recognizable visual language as battle.
2. Reuse existing artwork, body markings, symbols, and board trim. Prefer a still board with accessible HTML controls; do not add a second live 3D scene.
3. Make tapping a die highlight that slot and open a contextual detail panel. Keep enough board context visible to identify the slot. Use a compact board only while inspecting if needed.
4. For one body die, show its role, actual current and next die sizes, actual cost, and remaining gold after purchase. Reuse the current rules and action handler.
5. Handle affordable, unaffordable, locked, and maxed states clearly.
6. Keep all other existing camp controls reachable. If reorganizing navigation in this phase would endanger that, preserve the old path temporarily and document it. Do not remove features to make a screenshot cleaner.
7. Ensure the entire nine-slot board can be reached and no sticky button covers a slot or control.
8. Use one coherent layer of styles. Consolidate the camp selectors you replace instead of endlessly appending overrides.
9. Respect reduced motion. Use short feedback on selection and purchase, not continuous decoration.
10. Test the real purchase, updated board, gold, focus, closing, reopening, and saving. Never use live player saves or production cloud data for testing.

Stop after this bounded milestone is reviewable. Do not continue automatically into weapons, talents, battle powers, rewards, or a global redesign.

Deliver:
- Branch and commit, plus a PR or working preview if supported.
- Before and after screenshots at the same viewport and game state.
- A 390 by 740 view, a shorter phone view, and a landscape check.
- Actual test results, separated into existing failures and new failures.
- Transfer-size change and a qualified account of interaction checks.
- A short report using the exact review format in 03-ACCEPTANCE-AND-REVIEW.md.
- A dated handoff note describing what changed and what remains.
- Specific verification limits. If you cannot run a browser or use real Safari, say so.

Communicate in plain language. No emojis or em dashes in new user-facing copy or reports. Do not put AI model names into repository commits, code, or project notes.

If you hit a context limit, finish a coherent checkpoint, save it, and leave the short handoff. Do not start a broad rewrite or leave hidden mechanics changes.
