# CAMP-02 — Focused Store, permanent training and gold choices

Requested 2 November 2026. Extends CAMP-01. Status: direction recorded; candidate gains/prices require economy validation before release. No new training or heart/gold rule is live from this document.

## Decisions and recommendation

Dave wants gold to force interesting long-term choices: grow a die, choose talent faces, upgrade a power, or train health/magic. He explicitly removes temporary next-fight Store boosts. Potions remain an intentional consumable; weapons remain a core purchase. Put all meaningful permanent spending choices in a discoverable overview connected to the Dice board.

Recommended structure:

- **Store:** potions and clearly displayed weapons. Belt capacity remains attached to potions. Remove future tonic/rental/next-fight buff offers and their purchase paths. Do not merely relabel temporary buffs as Training.
- **Training:** permanent Max health, Starting magic, and Magic capacity. Each shows current → next value, exact price, purchased rank and any limit. These are different benefits, not one ambiguous “Magic upgrade.”
- **All upgrades:** one overview accessible prominently above the Dice board and through Hero's Train link. Do not add a cramped sixth tab. Six core categories: Dice sizes, Talent faces, Powers, Max health, Starting magic, Magic capacity. Permanent utility purchases such as reroll capacity/companion growth belong in their appropriate Dice/equipment subgroups; include clear links to Store/gear rather than hiding spend options.
- **Battle:** gold earned should visibly register and contribute to a clear camp goal. Audit the existing gold tally and reward feedback first; do not open the camp shop or sell permanent upgrades during combat.

Keep the board-to-card interaction. An overview item opens the same authoritative workbench/card, not a duplicate purchase implementation. All upgrades share gold, so spending on health really competes with a die, talent face or power rank.

## Current rules verified from source

- Max HP = class HP + 4 per level after the first + perks + existing bonusHp.
- Starting magic and capacity are already separate helpers. Starting magic is clamped to capacity at battle start. Capacity also grows with level and perks; extra capacity does not generate magic.
- Current perks provide +6 HP (Vitality), +1 starting magic (Arcane Reserve), and +2 capacity (Deep Well). Keep existing perks, ownership and class differences; do not silently convert or remove them.
- Body dice gold faces: 4 gives 2; 8 gives 3; 10 gives 2 plus magic. Heart 4 currently adds +2 per matching gold-bearing **body die** (head, hands, feet), not every talent/pet gold source. Talents, pets, straights, some powers, monster rewards and weapon sales are additional gold sources.
- Gold from rolling is already accrued during battle and paid through battle rewards. It usually buys power for later camp visits rather than dealing immediate damage. This is a feedback/opportunity-cost question, not proof that rolling gold does nothing.
- Weapon resale currently uses 50% of computed value, with paid size investment accounted for. Keep buy/sell loops and investment accounting in balance tests.
- Benchmark prices: body hand growth 40/100/220; talent growth 60/130/240; power rank upgrades use current engine costs (the reviewed first two covers are 50/90); face 4's first symbol currently costs 10, other face prices grow with the face number. Derive UI prices from authoritative helpers.

## Training candidate — explicitly not final balance

Start with three ranks per track, unlocked sequentially in Acts I / II / III. This limits early stacking and keeps the menu small. Costs below are marginal per rank, not cumulative.

| Permanent benefit per rank | Rank I | Rank II | Rank III | Total at max |
| --- | ---: | ---: | ---: | --- |
| +4 max health | 50 gold | 100 gold | 180 gold | +12 HP for 330 gold |
| +1 starting magic each fight | 75 gold | 150 gold | 250 gold | +3 start for 475 gold |
| +2 magic capacity | 40 gold | 80 gold | 140 gold | +6 capacity for 260 gold |

The first rank of each track costs 165 together: already a meaningful alternative to early card/die upgrades. All three completed tracks cost 1,065 gold. These numbers define a testable candidate; they are not justified simply because they resemble existing prices.

Why separate prices: +4 HP is extra survival buffer in every future fight; +1 starting magic can buy an earlier turn-one spell but only once per fight; +2 capacity helps only when magic would otherwise overflow or when saving for a spell. Value depends on class, battle length, spending policy and how many fights remain.

A d4 talent face 4 with Magic costs 10 and averages one magic per unmodified random roll (4 × 1/4), received through the round. That does not make it identical to starting magic, which is available before any dice income, but it shows why a flat “gold per magic point” formula is insufficient. Health training similarly cannot be valued by potion price alone: maximum health can prevent a burst defeat but gives no benefit when the extra buffer is never needed. Capacity can be worthless for a hero who never overflows.

Disable a starting-magic purchase if clamping would make its immediate benefit zero; explain capacity first. Show capacity training as storage, never “start with more.” Preserve current level/perk/class progression. Candidate rank gates, gains, caps and prices can change after tests; do not hardcode them in art.

## Heart 4: hold at +2 unless evidence calls for +4

Matching the printed +4 on heart 5/6 would not make the effects equal. Heart 4 can match four body dice; heart 5/6 can match at most two weapons. A +4 heart-4 bonus therefore has a ceiling of +16 gold per round, versus the current +8 gold bonus. The weapon bonus ceiling is +8 attack/block, a different resource and timing.

For four body dice of the same size, independent uniform rolls, a fair d6 heart and no rerolls/charms:

| Body dice | Gold-face probability | Extra gold/round if heart-4 amp goes 2 → 4 | Extra if heart 4 is already held |
| --- | ---: | ---: | ---: |
| d4 | 1/4 | 0.333 | 2.000 |
| d6 | 1/6 | 0.222 | 1.333 |
| d8 | 1/4 | 0.333 | 2.000 |
| d10 | 3/10 | 0.400 | 2.400 |

Formula: extra = P(heart=4) × sum of gold-face probabilities × 2. With heart 4 held, omit its 1/6 probability. Mixed-size body dice use their individual probabilities. These are exact neutral-roll expectations, not a simulation of deliberate gold chasing. Rerolls, heart turning, survival, class powers and battle stalling can change the value substantially. The extra maximum is +8 per round. Positive-feedback gold upgrades need to be tested with gold-seeking policies.

Recommendation: retain +2 for the first training candidate. First make current gold income visible and add the new permanent sinks. Change the bonus only if resulting campaign budgets and playtests show insufficient discretionary gold. Do not change gold income and all training prices together: that would obscure which change solved the problem.

## Remove temporary Store offers safely

Approved direction: stop offering Sharpening Oil, Borrowed Boots, Rented Tower Shield, War Paint, Strong Tea and Hearty Stew as new purchases. Enforce removal both in the visible Store and authoritative solo/table operations, including restored/shared shops; a stale client must not buy a retired offer.

Already purchased effects/owned items must not disappear from saves or lose paid value silently. Preserve their existing consumption behavior unless a deliberate migration/refund is specified. Do not delete general road-event blessings, which share some of the same underlying fields.

Additional clarity recommendation: remove the mystery weapon bundle from the primary Store so new players choose visible equipment. It grants a persistent weapon, so it is **not** the same mechanic as a temporary tonic. Review consumable Diamond weapon shop offers separately: the focused Store should default to persistent weapons, with no unannounced deletion of owned Diamonds or changes to loot drops. This document does not authorize erasing existing items. Pets and permanent utility upgrades should be organized, not mistaken for temporary buffs.

## Required economy validation before final prices

Use current released rules, not old data defaults. Record configuration, seeds, class, difficulty, policy, completion/defeat, battle length, retry costs and purchases. Preserve per-campaign results; fights from a campaign are not independent samples.

1. **Current baseline:** all five classes, Normal and Hard; separate gold from faces/heart, straights, powers, kills and sales. Track potion expenditure, permanent expenditure and unspent gold after each camp. Report distributions by act and class, not one pooled mean.
2. **Removal only:** same seeds/policies with future temporary Store offers removed. The current default bot does not buy tonics, so an unchanged bot result cannot measure their removal; include a policy that actually used them and human sessions.
3. **Training candidate:** compare saver, balanced, health-heavy, start-magic-heavy and capacity-heavy spending; include dice/talent/card alternatives at the same gold budget. Measure win rate, retries, turns, first-round options, capacity overflow prevented and upgrade cadence. Use matched seeds and uncertainty intervals across campaigns.
4. **Gold seeking:** compare deliberate gold rerolls/straight choices against combat choices, particularly with trained HP/magic and long sustainable fights. Check sale/rebuy economics, all class-specific gold sources and cooperative gold allocation/ownership.
5. **Only then test heart +4:** same candidate prices, same seeds/policies, one changed income rule. Keep +2 if the new sinks already leave healthy choices. Do not decide from identical printed numerals or from a small pilot.

Before running the larger study, agree target upgrade cadence: an ordinary early fight should leave a credible choice among entry purchases after supplies, while larger upgrades require saving. No track should dominate every class or make its alternative pointless. Candidate gates/caps should prevent exhausting all three training tracks early. Evaluate actual player decisions, not just an aggregate victory rate.

Existing tools/gold.mjs can provide a limited baseline. Its summary is per won fight, groups attempts imperfectly, uses a fixed existing spending bot, omits the proposed training and is not a multiplayer or human gold-chase model. Its output is evidence of current flows only, not sufficient pricing validation.

## Preliminary measured baseline

A completed, deliberately small released-rule pilot used one three-act campaign per class, Normal, existing smart spending and SIM_SAMPLES=2. It recorded 10 won fights per act/class, 150 wins total. Approximate battle income plus weapon sales ranged 60–72 gold per won fight in Act I, 132–162 in Act II and 239–343 in Act III. Purse after the existing camp purchases was 15–23 / 43–55 / 53–76, respectively. These are single-seed class ranges, not confidence intervals or proof of affordability. The bot already spends most income and does not buy the proposed training or normally buy tonics. Retry losses, deliberate gold chasing, Hard and co-op need separate study.

[Raw evidence, commands and limitations](camp-economy-evidence/README.md). This supports testing training against existing income first. It does not justify a heart-gold increase or final candidate prices. Stream per-campaign output in the larger study; the tool's end-only summaries made a larger initial diagnostic impractical for this pass.

## Implementation contract and work order

This extends CAMP-01's earlier “no rule changes” visual scope with a new, separately tested mechanics package. Keep C01-A's exclusive ownership of scrui.js and C01-B's physical components. Do not independently add a competing Training UI or change prices in those visual tasks.

- **C02-A READY — focused Store removal:** remove new temporary offers from both camp render paths, availability counts and authoritative purchase handlers/whitelists as appropriate. Cover solo/table/stale clients and already-purchased effects. Preserve potion/weapon purchases and saves. Component rendering remains with the existing owner.
- **C02-B READY — economy study:** owns isolated analysis/fixtures and evidence, not main rule edits. Test the training table above and alternatives; conclude with final candidate or revise it. Cross-check existing gold tools before extending them.
- **C02-C BLOCKED on B's balance result — training rules:** one owner for data/engine/save/table changes. Add canonical training ranks defaulting to zero; derive permanent benefits in maxHpOf/startMagicOf/magicCapOf. Keep bonusHp and existing perks separate. Expose info/purchase APIs with current→next, cost, gate and reason. Validate camp phase, hero ownership, expected rank, affordability and duplicate requests authoritatively; deduct exactly once. Keep progression on that hero in solo and co-op.
- **C02-D READY for non-mutating mockup, integration after C — overview and cards:** six clearly priced core upgrade categories, both Dice-board and Hero access, one purchase implementation per upgrade. Use the CAMP-01 physical component contract; prices/gains come from the new info APIs. Keep battle cost/rank cards and player-facing Hero values consistent.
- **C02-E BLOCKED on measured need — heart-gold candidate:** +4 remains a hypothesis. If tested, update engine, all face art/boost labels, multiplayer and reports together. Do not ship a tooltip-only change.

Rule tests must include existing-save migration, additive perks/class differences, rank/act caps, no-op start-magic purchase, exact payment, stale/double request rejection, co-op ownership/phase, and correct stats at solo/party battle creation. UI checks need low gold, capped/unlocked states, all overview routes, clear permanent versus consumable wording and mobile affordability. No automatic rebalance of XP/perks, enemy rewards, resale or heart numbers in the visual camp work.
