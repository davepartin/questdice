# Quest Dice: UI Director Handoff
Prepared for Dave Partin | October 20, 2026

Repository: https://github.com/Davepartin/questdice
Live game: https://davepartin.github.io/questdice/

## Current implementation status

October 20 checkpoint: draft PR #30 on `ui/camp-art-pass` now contains the camp artwork/body dice pass, the weapon workshop, the talent die editor, and the camp power library. Read 04-CAMP-ART-REVIEW.md, 05-WEAPON-WORKSHOP-REVIEW.md 06-TALENT-WORKSHOP-REVIEW.md and 07-CAMP-POWERS-REVIEW.md before editing. These implemented checkpoints supersede the exploratory state and Phase 1 starting instructions below. Latest steering prioritizes camp visual finish toward the original concept. Read 08-CAMP-VISUAL-FINISH-REVIEW.md. Painted campsite implemented in 09-CAMPSITE-ART-REVIEW.md. Dave rejected approximated camp silhouettes. Actual battle dice portraits are implemented in 11-ACTUAL-DICE-REVIEW.md, superseding the silhouette implementation in 10-CAMP-DICE-REVIEW.md. Battle magic-powers layout is implemented in 12-BATTLE-POWERS-REVIEW.md. Next: review the complete phone journey before widening scope. Keep this work on the review branch until Dave approves publishing.

## Purpose

Raise the quality of an already working mobile web game, especially camp and upgrades. Preserve the enjoyable dice, tabletop identity, battle counters, and existing mechanics. Improve organization, texture, visual hierarchy, and the feeling of interacting with a character.

This is a UI project. It is not a gameplay redesign or an engine rewrite.

Dave's priorities, in order:
1. The game continues to work.
2. It remains responsive and practical on phones, especially iPhone Safari.
3. Camp and upgrading feel coherent, tactile, and rewarding.
4. Players quickly understand what they selected, what changes, and what it costs.
5. Work stays small enough to review and continue across limited AI sessions.

## How to use this package

1. Give the builder this whole folder and repository access.
2. Paste the prompt in 01-BUILDER-PROMPT.md.
3. Start with Phase 1 only. Do not ask for the entire redesign in one run.
4. Give the director the builder's screenshots and the short report in 03-ACCEPTANCE-AND-REVIEW.md.
5. Apply the director's concrete corrections, then move to the next phase.

These instructions are model independent. Use them with the coding model and environment you have available. This package does not depend on any particular model version.

## What has and has not been done

The director reviewed source from the default branch and Dave's iPhone screenshots. A concept image illustrated a proposed camp board, a selected-die detail panel, and a weapon workshop. Dave liked that direction.

A preliminary implementation was explored in a local working session on a branch named ui/camp-board-workshop. It was NOT pushed, merged, or published. It is NOT a completed or accepted implementation, and it may not be available in another session. Start from the current repository. If you find that branch or an equivalent patch, inspect it before reusing anything.

The exploratory version demonstrated a still camp board using the battle tray's decal code and existing body illustrations, separate camp categories, and an inline die inspector. Its screenshots also revealed issues that must be corrected:
- The default board was too tall, with its bottom row obscured by the sticky road button.
- Camp tabs scrolled behind the fixed hero/gold header.
- Existing sheet CSS overrode parts of the intended inspector header.
- The compact inspector board needed spacing checks for labels and badges.

Treat those as lessons, not as a recommendation to copy the prototype unchanged.

No real iPhone performance testing, full purchase regression pass, complete campaign playthrough, or online-room acceptance testing was completed for the prototype.

## Evidence captured during exploration

Source reference: default-branch commit 4a93daa684781ed663d80d32dafa950588dd43d8, inspected October 20, 2026. The repository may have advanced. Recheck current HEAD and current code before editing.

At that reference, the baseline npm test run reported 320 tests: 318 passed and 2 failed. Both failures were in test/server.test.mjs:
- two phones can sit, and a lock stays private on the wire
- a hero takes their seat back from a new phone after the game has started

These were observed BEFORE UI edits. Do not assume they still fail. Run a fresh baseline, report actual results, and do not change unrelated rules to force a green report.

One local headless Chromium baseline at 390 by 740 CSS pixels, low quality and manual clock, observed approximately 5.32 MB of encoded same-origin resource bodies across 111 entries after opening a sample wizard camp. This is a limited observation, not a site-size audit or a real-phone speed measurement. It excluded external resources and did not represent all campaigns, assets, or cold-load conditions. The prototype observation was approximately 5.34 MB across 113 entries. Reproduce a controlled baseline before drawing conclusions.

## Visual references

Ask Dave to attach the original three-panel camp concept and his four game screenshots to the builder's session if they are not already present. The images are references for mood and layout only.

The real game is authoritative for symbols, colors, dice, labels, mechanics, and art. The concept image contains illustrative prices, die shapes, and equipment. Do not copy those into rules or promise a pixel-for-pixel result.

The existing battle screen is stronger than the concept in some important ways. Preserve its recognizable miniature figures, dice, board positions, and colored outcome counters. Camp should feel like another view of that same game.

## Direction in one sentence

Use the familiar nine-slot character board as camp's primary navigation, and reveal one focused, readable upgrade interaction when the player taps a die.

## Decisions and future approval

The board-and-inspector approach is the primary direction. Exact category placement, detailed weapon workshop styling, talent editor refinements, and magic-powers layout are proposals to implement and review in stages.

Use a separate branch and reviewable commits. Do not publish to the live main branch in response to this handoff alone, even if older project notes describe automatic live pushes. Dave requested staged visual approval in this conversation. Bring him a working preview or a PR and accurate screenshots first.

No new libraries, character art, shaders, animation systems, or gameplay features are required for Phase 1.
