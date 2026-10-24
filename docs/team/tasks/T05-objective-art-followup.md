# T05 objective-card visual follow-up

Owner: Grokbot for visual refinement; Claude for game integration; Director for review.
Requested by Dave on 24 October 2026. This remains part of T05, not a duplicate card system or a gameplay change.

Dave is working with Grok on the weapon-card template and wants the pre-battle objective and special/secret objectives to have the same professional physical-card quality. He reports the version he sees in the game still looks like the old panels.

## Reuse work already delivered

Read BOARD.md, mockups/cards/README.md, HANDOFF-CLAUDE.md and WAGERS.md. Existing renderCard templates, painted frames and approved deck backs cover objectives, secret objectives and wagers. Claude's T05 PR #49 includes their integration and is awaiting review. Old handoff wording that says no art is merged is historical; the board records the art chain on main. Do not recreate that work or edit Claude's active implementation files.

## Grok's assignment

Finish the current weapon-template pass with Dave, then produce a compact objective-card comparison using the existing assets/templates and the latest visual direction Dave has accepted.

Show three representative cards:
1. Pre-battle Bonus Goal / objective: No Potions. Large tipped potion bottle with liquid spilling onto the card surface, following Dave's earlier art direction; title, one clear condition sentence, and accurately labelled financial terms from current game data. Also show the free-attempt variation when the player cannot afford the stake.
2. Secret Objective: choose an actual current card from CARDS. Show its approved back, private revealed front and a clearly readable goal/reward. Design the reveal and hide affordances without changing who can see a secret.
3. Offered bribe / Wager: an actual offered card, visually related but clearly distinct from the solo Bonus Goal. No invented upfront stake. Correct outcomes and any conditional team penalty must remain available and readable.

Match the weapon family through frame materials, illustration quality, typography and card proportions. Objectives need their own hierarchy: title, prominent meaningful illustration, condition, reward/risk. Do not copy weapon dice rows or size-upgrade covers onto objective cards. Use the existing Quest Dice Heart-die artwork where appropriate; no generic pip die as a substitute.

Text, values and buttons stay live HTML, with text-free art layers. All amounts come from the current rules; WAGERS.md is a guide that must be checked against current data, not permission to hard-code old payouts. Keep Accept/Decline/Reveal/Hide outside the artwork and reachable. Do not change stakes, rewards, probabilities or objectives as part of this task.

Deliver one side-by-side comparison and front/back phone renders at 375 px and the short 375x548 viewport. Show the longest representative condition, not only a short easy example. Preserve readability, enlarged-text usability, reduced-motion reveal and secret privacy. Static mockups do not prove interaction or Safari behavior: label those checks honestly.

Post the files, screenshots, what changed relative to existing T05, and known limits on the board. Do not ask Dave to forward a handoff.

## Claude and Director

Claude: retain existing PR #49 work. Compare Grok's refinements with the current implementation and integrate only the reviewed visual delta, preserving game behavior and saves. This brief is not a request to scrap the PR or a new blanket hold on unrelated finished work.
Director: review PR #49 and the objective visuals as separate concrete evidence. The purpose is to get the approved cards into the actual screens Dave uses, not accumulate more unintegrated mockups.
