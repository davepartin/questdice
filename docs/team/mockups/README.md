# T10 (Art): road result and bonus challenge, CONCEPT mockups

**Owner:** Art director (Grokbot) · **Status:** REVIEW · Docs only. No runtime file, rule or save changed.

Static HTML concepts that bring the camp finish (docs/ui-handoff/08, PR #30: wood frame, double gold edge, serif titles, Oxanium labels) to two road screens. They are review pictures for Astra and Dave, not the game.

| Screen | 390x844 | 360x640 (visible / full scroll) | Source |
|---|---|---|---|
| Bonus Challenge · No Potions · bet 20, win 60 | [png](bonus-challenge_390x844.png) | [visible](bonus-challenge_360x640.png) · [full](bonus-challenge_360x640_full.png) | [html](bonus-challenge.html) |
| Road result, T09 rev 2 format (PR #35) | [png](road-result_390x844.png) | [visible](road-result_360x640.png) · [full](road-result_360x640_full.png) | [html](road-result.html) |

Rendered with headless Chrome (playwright, `node shoot.mjs`), device scale 2. Not Safari, not a physical phone.

## Layout decisions
- Reading order. Bonus: kind, name, rule icon, rule (the real `nopotion` text from js/secrets.js), stakes, net gain, More. Road: event title, labelled roll chips (`Your roll 7` · `Challenge 2`), verdict, one story sentence, then a reward row naming the recipient with their miniature.
- Stakes are two equal tiles: "Your bet 20 gold" and "On success 60 gold", then "Net gain 40 gold. Fail, and the 20 is lost." Nothing about the reward is clipped.
- Buttons sit directly below the card and never over it. On tall phones the scene strip takes the spare height (flex 1, 112–300px), so there is no empty gap. On 360x640 the strip shrinks to its minimum and the page scrolls 25–50px. Text size stays the same.
- Restrained texture: one wood frame (CSS gradients, as on the camp board), parchment for offers and the dark woven panel for results. No new bitmaps.

## Reusable assets (already in repo)
- `assets/bg/*.webp` place art (kettle-tarn, wolfwood-edge) as the scene strip.
- `assets/miniatures/*.webp`: the hero mini in the strip, the reward recipient row and the header chip. The event creature (wolf) goes in the strip.
- Existing CSS values: `.obj-card` parchment and inner border, `.env-seal` red seal (used here as the rule icon), the camp `#8c714d` wood/border and `#11151d` panel, gold CTA, fonts Oxanium / Inter / Cormorant Garamond.

## New assets needed
- None are required. Optional: a small set of rule-icon SVGs (no potion, no magic, no help, and so on) to go in the seal. The flask-strike in the mockup is inline SVG.
- Optional: per-event creature minis where an event has no matching miniature (for example, a pup for "The Runaway Pup"). Until then, use the place's resident monster or the hero.

## Notes for Claude (integration, when assigned)
- Overlap: the shipped Bonus Challenge card (PLAN 23 Oct, `.obj-card` in css/screens.css), T05 (objective card, Implementation lead) and T09 integration (Claude, wiring PR #35 copy). These concepts are visual input for that work. They do not replace it, and they do not change any copy or rules.
- Road card: render the roll summary, verdict, prose and reward as separate elements (T09 rev 2 list). Company contests: one roll chip per hero (`Ann 7` · `Bob 4`) and one reward row per winner.
- Keep `More` for the full terms. Keep the buttons in normal flow after the card, not `position: fixed` over it.
