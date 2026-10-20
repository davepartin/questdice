# Acceptance, Testing, and Director Review

## Phase 1 required acceptance

- [ ] All nine board slots are visible or clearly reachable.
- [ ] No fixed header, tab, browser toolbar, or sticky road button covers a required control.
- [ ] Slot labels identify the position and current actual die size.
- [ ] Tapping a slot selects it and opens details for that same slot.
- [ ] The selected slot remains recognizable.
- [ ] Current and next die sizes are read from existing rules.
- [ ] Purchase cost and remaining gold match actual state.
- [ ] An affordable upgrade buys exactly once through the existing handler.
- [ ] The board, inspector, gold display, and available actions update after success.
- [ ] Unaffordable, locked, and maxed states are distinct and truthful.
- [ ] Repeated taps cannot create an unintended double purchase.
- [ ] Closing and reopening works, with useful focus and scroll restored.
- [ ] Every other existing camp service remains reachable.
- [ ] No engine numbers, mechanics, save schema, or multiplayer authority changed.
- [ ] No new runtime dependency, animated scene, or continuous camp render loop.
- [ ] Reduced-motion mode remains usable.
- [ ] Changed styles are consolidated and do not leak into battle or other modals.
- [ ] Cache versioning follows the project's current procedure.
- [ ] The result is on a review branch, not silently deployed live.

## State coverage for later camp completion

Test with disposable fixtures, not production player saves.

| Scenario | Verify |
| --- | --- |
| New hero with little gold | Affordability, locked dice, clear ways forward |
| Zero gold | Inspect still works; no fake available purchases |
| Exact purchase price | Success leaves exactly zero; next action refreshes |
| One gold short | Disabled purchase and truthful shortage |
| Act-limited growth | Actual requirement shown; no preview implying immediate purchase |
| Maximum die size | Maximum message, no invalid next size |
| Heart | Existing behavior explained; no invented upgrade |
| Two-handed weapon | Both sockets reflect one item; no duplicate independent purchase |
| Train blocked by hand size | Requirement displayed; handler still rejects invalid purchase |
| Empty hand | No invented equipped item |
| Pack swap | Right hero, right slot, correct equipped state |
| Legendary and Diamond | Existing special rules and inventory behavior retained |
| Talent edit | Only legal faces/symbols; correct cost and refresh |
| Talent grow/shrink | Face editor selection remains valid |
| Pet | Existing access, training, and state preserved |
| Pending perk | Clearly reachable and still selectable |
| Multiple local heroes | Correct hero, gold, equipment, and selection after switching |
| Online room | Host-authoritative updates, pending/rejected actions, reconnect |
| Load or resume | Existing hero and upgrades survive by the existing route |
| Leave camp for battle and return | No stale inspector, duplicate listeners, or hidden expensive scene |
| Store and back | Category and scroll behave predictably |

For each applicable path, verify the resulting state, not just whether the button looks right.

## Magic-powers acceptance for Phase 3

- [ ] A/B/C powers and utility actions are clearly distinguished.
- [ ] Names, costs, current magic, and health remain readable.
- [ ] Availability, charge, cooldown, once-per-battle, and recharge states are accurate.
- [ ] Spending adjustment respects actual minimum, maximum, and available magic.
- [ ] Cast/Use follows the original target and authority flow.
- [ ] Heal, Potion, and Heart Change preserve their existing restrictions.
- [ ] Used or unavailable powers cannot cast through rapid repeated input.
- [ ] Closing restores battle interaction.
- [ ] Taps cannot leak through to hidden battle controls.
- [ ] The six colored battle counters retain their familiar roles.
- [ ] No overlapping controls in the short viewport.

## Viewports and devices

Capture matched before/after states at:
- 390 by 740 CSS pixels as a practical reduced-height phone view.
- 375 by 600 CSS pixels as a short viewport stress check.
- 393 by 852 CSS pixels as a taller phone view.
- Approximately 844 by 390 CSS pixels for phone landscape.
- Approximately 1280 by 800 CSS pixels for desktop.

These are layout checks. They do not certify physical iPhone Safari performance.

Dave should check real Safari with its bars visible and hidden:
1. Open camp from an ordinary fight.
2. Tap Head, a hand, a weapon, and a locked/talent slot.
3. Buy one affordable upgrade.
4. Confirm gold and the new die.
5. Open another category and Store, then return.
6. Return to battle and roll.
7. Repeat camp visits a few times.
8. Report any delayed taps, jumping layout, tiny text, clipped controls, heat, or new stutter.

A short screen recording is more useful for motion problems than a still screenshot.

## Verification procedure

1. Run the existing tests before edits.
2. Record pre-existing failures with names and output.
3. After edits, rerun the relevant tests and the required project-wide gate.
4. Compare changed files. Rules files should remain unchanged for this UI assignment.
5. Exercise actual UI handlers with disposable state.
6. Check browser console errors.
7. Capture the intended states after artwork and fonts have loaded.
8. Compare resource transfer using the same cache condition, hero, quality, viewport, and route.
9. Repeat open/close/visit actions to detect accumulating listeners, canvases, or stale state.
10. Report what could not be checked.

Do not rerun long balance simulations for a presentation-only change unless an actual rules dependency changed or the project requires that gate. Do not rewrite tests to make an altered mechanic appear compatible.

## Screenshot requirements

Phase 1:
- Original camp and original selected body die.
- New camp with all nine positions.
- Selected body die before purchase.
- Updated slot and balance after purchase.
- Unaffordable or gated state.
- Short viewport and landscape.

Phase 2 adds weapon, two-handed, and talent views.
Phase 3 adds powers overview, selected action, and unavailable state.

Capture actual implementation. Never present generated concept art as a working screenshot. Sample fixtures must be clearly identified as test data.

## Builder report template

Keep the report compact enough to paste back to the director:

PHASE:
BASE COMMIT:
BRANCH / COMMIT / PR OR PREVIEW:

WHAT CHANGED:
- Up to five concrete points.

RULES AND SAVE CHANGES:
- None, or list and explain any unexpected change before proceeding.

BEHAVIOR VERIFIED:
- Actual purchase:
- Gold and board refresh:
- Close/reopen/focus:
- Save/resume:
- Solo/company/online:
- Short viewport and landscape:

TEST RESULTS:
- Baseline:
- After:
- Existing failures:
- New failures:

PERFORMANCE:
- Controlled before/after transfer:
- New assets/dependencies:
- Rendering or cache changes:
- Real-device observations:
- Measurement limitations:

SCREENSHOTS:
- Named images or links, including viewport and fixture.

OPEN ISSUES:
- Concrete problems, not vague polish notes.

NEXT SMALL TASK:
- One bounded recommendation.

## Director review prompt

Review this phase of Quest Dice against the attached handoff and actual screenshots. Focus on camp clarity, coherent tabletop identity, selected-slot context, phone legibility, feature access, and performance evidence.

Do not invent mechanics or ask for new gameplay. Do not request a global redesign. Distinguish what the screenshots prove from behavior or performance that needs testing.

Return:
1. Ready for Dave's phone test / Revise first.
2. Three strongest improvements.
3. At most five corrections, in priority order. For each, name the screen/state, describe the visible problem, and give a concrete fix.
4. Any behavior or performance evidence missing.
5. The next bounded task.

Do not judge the implementation against every decorative detail of the generated concept. Judge whether it is a clear, usable, lightweight version of the intended experience.

## Continuation note for a short builder session

Before running out of context, save one coherent checkpoint and leave:
- Current branch and commit.
- Files changed.
- Completed phase and specific remaining work.
- Test commands and actual outcomes.
- Screenshot/preview location.
- Known regressions or unverified paths.
- One exact next action.

Keep this note short. The next session should read it and the current brief, then inspect only the relevant files.

## Later collaboration

Dave can return the builder report and screenshots to the director for review. The director provides corrections; the builder implements them; Dave tests the phone experience. This is a manual handoff loop, not an autonomous cross-model integration.
