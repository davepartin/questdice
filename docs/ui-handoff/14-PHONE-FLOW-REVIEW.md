# Phone flow and portrait loading

October 21, 2026. Draft PR #30 on ui/camp-art-pass. Not published live.

## Walkthrough

A single local wizard hero walked through the connected experience at 375x600: camp, inspect right hand, grow d6 to d8 for 100 gold, close with focus restored, visit Store, return to camp, use To the road, select a real quest, roll in battle, inspect and cast Arc Bolt, reopen the saved hero and return to camp.

The fixture starts at Act II's final quest with story/road beats marked completed, all dice unlocked and 420 gold. The test grants 12 magic before the casting step to make that action deterministic. It uses real quest selection and roll controls, not a synthetic replacement board. No battle was resolved to victory or rewards.

Verified: right hand d8 and 320 gold reach the battle hero and survive save/open. Inspecting the spell is read-only and casting spends the displayed cost. Nine actual portraits load. Store navigation and closing the inspector leave reachable controls. No page errors or horizontal document overflow.

## Fix

Cold portrait tiles previously stayed visually blank while their images were queued. They now show their die size and a quiet Preparing die label until the actual image loads. Null/cancelled/rejected or failed image loads show Preview unavailable while retaining the size and working slot button. Labels are static and disappear on image load. The nine existing accessible slot labels remain authoritative.

No rules, costs, save formats or multiplayer authority changed. No new image downloads, dependencies or animation loops.

## Performance finding

The first complete nine-portrait set took 16,050 ms in one headless Chromium run using software WebGL, including game setup/idle queuing. This is a diagnostic observation, not an iPhone timing or frame-rate measurement.

A lower-detail thumbnail trial completed at 13,859 ms in one run but softened faces. It was reverted; the existing medium-detail actual meshes/materials remain. These single timings are noisy and do not establish a performance gain. The final code only improves loading feedback. Physical iPhone Safari first-open delay, battery, frame-time and memory behavior remain unverified.

## Reproduce

Run `CHROMIUM_PATH=<local chromium> node dev/phone-journey-review.mjs` with Playwright available. Uses disposable local saves, reduced motion and blocked cloud authentication/database calls. The explicit failed-preview case injects a null portrait result only inside the test and restores the original renderer immediately afterward.

Existing detail rendering was preserved. A fresh screenshot was captured after reverting the lower-detail trial:

- [Reviewed camp with actual medium-detail dice](../screens/phone-journey/reviewed-camp.webp)

## Resume

The current camp, upgrades and battle spellbook are concrete reviewable work in PR #30. Next gate is Dave's visual review and physical-phone performance observation. Do not publish main until approved, expand scope without a clear need, replace actual dice with redraws, or claim physical phone smoothness based on headless tests.
