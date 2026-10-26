# Heart upgrade pricing decision and evidence
Director, 25 October 2026. Dave explicitly wants Heart progression and asks Director to settle costs while Grok handles visuals.

## Starting implementation specification
Heart remains a d6. Rank 1 is free/default, symbol boost +2 per eligible matching white die and attack/block +4 per matching weapon lane. Rank 2 costs **150 gold**, raises these to **+3 / +6**. Rank 3 costs **300 additional gold**, raises them to **+4 / +8**. Total investment 450. Three ranks only, one purchase at a time; no rank 4, automatic upgrade, per-battle fee or resale. These are selected initial playtest prices, not a claim that balance is proven. No additional act gate selected at this stage.

Dave has authorized developing this mechanic. Proceed with an isolated tested implementation and Grok's card using these real candidate prices. A live release follows the focused balance and authority checks below. Do not let old 'Heart never upgrades' copy block development; it describes the old rule. The actual die size, face numbers, turn-Heart cost/limit and Heart-to-Heart bonus remain unchanged for this comparison.

## Source facts
data.js: HEART_AMP [2,2,2,2], HEART_COLOR_BONUS 4, FACE_PAY, HEAL_COST 2, HEAL_AMOUNT 3. engine evaluate matches symbols on Head, Left Hand, Right Hand and Feet, not Talents or weapons; faces 5/6 boost matching blue/red weapon lanes. sidesOf(C) is 6 and campbuy returns no Heart price. There is currently no rank purchase in those inspected paths. Head d4->d6 costs 50, hands 40; later head steps 110/230 and hands 100/220. Heart pricing is a premium flexible alternative; the second rank step costs more because it follows the first and is a later investment, not because its marginal bonus is larger.

## Exact fresh-roll expectation
Computed directly from current FACE_PAY: sum across four white dice of the fraction of faces carrying a resource, divided by 6 for its Heart face. Each step adds one per match. For both weapon lanes combined, expected extra attack+block is 2 lanes x 2 increment / 6 = 0.667 per round, assuming each lane has a red or blue colour and ignoring suppression. This combined diagnostic does not value attack and block equally.

Extra amounts over TEN ROUNDS, PER purchased rank step:

| White dice sizes (Head, hands, Feet) | Heal | Pierce | Magic | Gold | Attack + block combined |
|---|---:|---:|---:|---:|---:|
| 4/4/4/4 | 1.67 | 1.67 | 1.67 | 1.67 | 6.67 |
| 6/6/6/6 | 2.22 | 2.22 | 1.11 | 1.11 | 6.67 |
| 8/8/8/6 | 1.81 | 1.81 | 1.53 | 1.53 | 6.67 |
| 10/10/10/6 | 2.06 | 2.06 | 1.78 | 1.78 | 6.67 |
| 10/10/10/8 | 1.92 | 1.92 | 1.92 | 1.92 | 6.67 |

Rank 3 versus rank 1 doubles these increments. Ten rounds is an illustrative duration, NOT a measured average fight or campaign length. One Heart result per round selects the benefit; the player does not get four resources simultaneously. Reproducible calculation: tools/heart-costs.mjs. Arithmetic was evaluated during this review in JavaScript from the retrieved current FACE_PAY; the committed Node entry point has not been run in the full repository here.

Limits: fresh uniform independent rolls, no rerolls/turning, no hush, caps/overheal, incoming damage, gold multipliers or class policies. Real choices can increase the benefit markedly. This is an exact expectation under stated assumptions, not a campaign simulation or human playtest. Do not call it a general lower bound.

## Healing and self-funding checks
At d4, the extra 1.67 magic/ten rounds per rank step is about 2.5 health at today's 2 magic -> 3 health, before caps/overheal and integer spending. Direct healing is separate.
If the player arranges all four white dice to carry Magic and selects Heart Magic, rank 2 adds FOUR extra magic that round versus rank 1, equivalent to SIX healing. Rank 3 adds EIGHT versus rank 1, equivalent to TWELVE healing. On a Heal Heart round the corresponding direct increment is 4/8 health, not simultaneous magic+healing. This is a conditional upper scenario, not an expected policy rate.
Likewise the extra gold could be 4/8 on a fully matched Gold round before gold modifiers. With uniform d4 rolls a 150-gold first rank takes about 900 rounds to repay from incremental gold alone, but focused play can shorten this substantially. Do not infer an exploit is absent from that naive expectation.
A larger purchase price delays access; it cannot cure an immortal-healing strategy after purchase. Test focused policies and long boss tails before releasing, and return any failing case for a mechanic ruling rather than silently weakening healing.

## Next implementation and review
Director owns this pricing project; Grok continues existing Strength/Talent visuals without conflicting edits and may mock up the Heart card next. Any available implementer must reserve files and coordinate before coding. Keep first candidate isolated with its own save space. Per-hero heartRank defaults safely to 1 for older saves; validate bounded integer ranks; migration never replaces gear, resets heroes or retroactively charges gold. Purchases camp-only and authoritative online, reject stale/double commands and insufficient gold, save/resume correctly; record purchased rank in candidate diagnostics. Both solo and party evaluate must use that hero's rank.

Measure ranks 1/2/3 on matched existing encounters at early/mid/late progression, ordinary and focused magic/heal/gold policies, representative classes and solo/2/4/6. Separate earned/spent/overflow magic, direct healing/overheal, magic-funded healing, damage prevented, damage dealt, gold and duration/wins/falls. Include safe boss-only phases, Heart turning's real 3-magic cost, capped magic, unavailable matches and hush. Compare 150/300 opportunity cost to actual other purchases under no-wear rules. Use existing fixtures and record uncertainty by independent campaign where campaigns are used. Do not wait on a large weapon rebalance to create this isolated candidate.
After results, Director reviews pricing and safety of sustained output; Grok shows exact reviewed values in the final card. No real phone/Safari/Firebase test or runtime release is claimed by this document.

## Talent screenshot
Dave's attached IMG_7283.jpeg was visually reviewed: side-by-side talents, cardboard covers and round symbol chits make purchased versus unopened rows clear. Maintain that visual direction. The plain-symbol chits need an accessible inspection stating the face number and actual payout (e.g. face 7 gives 7 Magic), because the symbol alone does not communicate magnitude. Preserve that information without crowding the card.
