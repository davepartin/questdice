# Bard magic card template

Build 20261031bd1. All six Bard powers use the approved shared shell. This completes the template rollout to all 34 magic cards across five heroes. Costs, dice, engine effects and saves are unchanged in this build.

| Card | Effect display | Existing art reused |
| --- | --- | --- |
| Mending Song | Large green healing d6s, Heal and Party tags, selected cost | Mending Song |
| Finale | Attack, heal and block, plus separate attack to every enemy; round 3+ and once-per-battle reminder | Rising Ballad |
| Lucky Verse | Three rows: 1–2 returns magic; 3–4 adds attack; 5–6 adds attack and returns one magic | Lucky Verse |
| Discord | Weaken icon and reduced enemy attack | Lucky Verse |
| Rising Ballad | Cumulative red attack / green healing tracks; Charge OR Use | Rising Ballad |
| Hymn of Gold | Cumulative gold track; Charge OR Use | Rising Ballad |

Shared title below painting, artwork icon/traits left and cost right, bottom-left Roman rank, parchment covers with printed right-side prices 50 / 90. Three alternatives share existing Bard paintings until dedicated artwork review. Finale uses a compact two-column trait group and multi-effect covers. Lucky Verse covers list all three upgraded payouts, including the high-roll magic return, using engine LUCK and scaleNum rather than the unused fx placeholder.

Mending steppers preserve mounted artwork/frame and preview remaining magic before Roll pays once. The Party tag preserves its team-healing meaning. Bard cards stay selected after casts; charge/use round locks remain exclusive and use grey disabled buttons without the removed explanation.

## Verification

36 bounded renderer fixtures cover all six cards at ranks I/II/III and 375x667 / 390x844, with loaded art, contained card/cover content, prices, no type tags and Charge OR Use. Real solo battle checks cover full-screen/no page scroll, green dice and Party tag, stable Mending artwork and cost preview/payment/healing, Lucky Verse three displayed ranges and actual payout/round lock, and Rising Ballad cumulative tracks/charge/release. Twenty-two existing five-hero engine tests pass, including Mending healing every party hero. Chromium only; no two-client or Safari verification and no balance simulation claim.

Reproduce: `HERO=bard CARDS=mending,finale,luckyverse,discord,ballad,goldhymn CHROME=/path/to/chrome node dev/knight-templates.mjs /tmp/bard-templates` and `CHROME=/path/to/chrome node dev/magic-bard.mjs /tmp/bard-battle`.

Focused renderer screenshots: [Mending Song](mending.webp), [Finale](finale.webp), [Lucky Verse](luckyverse.webp), [Discord](discord.webp), [Rising Ballad](ballad.webp), [Hymn of Gold](goldhymn.webp).


## Individual Bard review, 20261102bd2

Reviewed all six cards against the current Knight layout. The frame, boxed cost, colored controls, Roman ranks and 50/90 covers remain. Bard rank panels now use the unframed paper stock introduced for physical utility components, including completed lower ranks. Fixed outcome and cover symbols blend as printed ink; current charge tracks and picker controls retain their distinct highlights.

| Card | Review result |
| --- | --- |
| [Mending Song](review-20261102/mending.webp) | Clear All heroes tag, six healing-die spaces, persistent art/cost preview, paper rank panels. |
| [Finale](review-20261102/finale.webp) | Dedicated crescendo battle painting; separate attack/heal/block group and Every enemy attack row; roomier two-line upgrade covers. Round gate and once-per-battle note preserved. |
| [Lucky Verse](review-20261102/luckyverse.webp) | Divided payout rows and larger stacked upgrade tables. All three ranges and the high-roll magic return remain visible at each rank. |
| [Discord](review-20261102/discord.webp) | Dedicated weakening-magic painting, larger enemy attack label, restrained paper presentation. |
| [Rising Ballad](review-20261102/ballad.webp) | Reviewed attack/healing growth tracks and selected charge rings; Charge OR Use preserved on the shared paper panel. |
| [Hymn of Gold](review-20261102/goldhymn.webp) | Dedicated musical coin-gathering painting; gold growth track and Charge OR Use preserved on paper. |

No card names, costs, effect numbers, IDs, unlocks or save data changed. Common utility and other heroes' cards are outside the new mc-bard styles. Finale values still use scaleNum with the existing fx/aoe fields. Existing Bard paintings remain for its three starting cards. Three new illustrations replace previous shared artwork; their source PNGs are preserved under /workspace/generated_images: exec-fd0c5e41-b302-4db6-b521-592c2ed060eb.png (Finale), exec-476293d9-286c-4359-89b0-a30b27e3e681.png (Discord), exec-f796b745-d747-476f-9990-afc09b181590.png (Hymn of Gold).

All 527 game tests pass. dev/bard-review.mjs checks every card at ranks I/II/III with the full six-tile sheet at 375x667, 390x844, 430x932 and 390x664 (72 cases): artwork loads, active content stays within its panel, upgrade content stays in the card, prices/OR controls and card height are correct. Final 375px renders were repeated after the last paper refinement. Real Bard battle checks pass magic preview/payment and persistent Mending art, actual healing dice, Lucky Verse payouts and per-round use lock, and Rising Ballad charge/release totals. The browser script now waits for the sheet's actual entrance to settle before measuring its height, and for full battle startup before opening it. Chromium screenshots inspected; Safari and two-client play unverified.

[Rank/layout checks](review-20261102/ranks-checks.txt) · [Final paper checks](review-20261102/final-detail-checks.txt) · [Real battle checks](review-20261102/battle-checks.txt).
