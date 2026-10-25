# T05 objective-card visual follow-up

Owner: Grokbot for visual refinement; Claude for game integration; Director for review.
Requested by Dave on 24 October 2026. This remains part of T05, not a duplicate card system or a gameplay change.

Dave is working with Grok on the weapon-card template and wants the pre-battle objective and special/secret objectives to have the same professional physical-card quality. He reports the version he sees in the game still looks like the old panels.

## Latest naming decision from Dave, 24 October 2026

This supersedes the earlier request to present Objectives, Secret Objectives and Wagers as three separate deck types.

There are **two player-facing objective decks**:
- **Objectives**: public goals players may talk about around the table.
- **Secret Objectives**: private goals, kept secret until the existing rules allow their reveal.

Individual cards are an Objective or a Secret Objective. “Bonus Goal”, “Bonus Challenge”, “Wager” and “Bribe” may remain internal rule/data categories where necessary, but are not additional objective-deck names or backs. A stake or offer remains clearly explained on the front; simplifying the deck name does not erase its cost, conditions or consequences.

Use the existing approved Quest Dice objective and secret-objective back artwork. Both backs share the same family treatment and differ through the objective/secret-objective emblem and words. Back titles: **OBJECTIVES** and **SECRET OBJECTIVES**. Do not show card-specific goal, stake, reward or other identifying information on a back. A distinct Wager back is no longer needed for this objective presentation; preserve source art rather than deleting historical assets.

Grok: show the two backs together and representative public/private fronts. The previous three content examples remain useful to test different rules, but they belong to these two visual deck families, not three decks. Reuse the good existing backs; no unrelated redesign.

Claude: map existing cards by actual visibility, not by reward formula. Any currently private offered bribe or other private goal remains a Secret Objective, even if it involves a wager. Public pre-battle goals use Objectives. Preserve existing reveal timing, private viewing, acceptance, payouts, dealing probabilities and saved IDs. If an existing visibility rule conflicts with this two-deck presentation, document that specific conflict on the board before changing who can see it. Dave's table analogy is a presentation/naming decision, not an instruction to merge all dealing pools, change probabilities or introduce a literal shuffled deck mechanic.

Weapons still have their own weapon cards. This decision concerns the objective family.

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
