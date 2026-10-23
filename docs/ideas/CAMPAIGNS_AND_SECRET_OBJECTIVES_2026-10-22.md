# Campaign ideas and secret objectives: hidden competition
Date: October 22, 2026
Status: design proposals and Dave's preferences, not an implementation request.

## Ownership and scope
Claude remains the code editor for the current weapons, monsters, arrows, magic, and class work. This document records ideas for later review. It changes no game rules or code and does not authorize implementation, deployment, or a new balance system.
Read alongside [existing secret objectives](../SECRET_OBJECTIVES.md), [campaign authoring](../WRITING_A_CAMPAIGN.md), and [weapon proposals](WEAPONS_REDESIGN_2026-10-22.md).
The existing secret-objective document already specifies rivalries, challenges, and bribes, with an implementation status section. This document extends that design. Current runtime behavior must be inspected before implementation; documentation alone is not proof that a feature is live.

## Dave's direction
The game should feel like a light strategy board game shared around a table:
- In battle: I read the situation and made decisions that helped us win.
- At camp: I made decisions that prepared me for the next fight.
- Around the table: private goals create competition, suspicion, laughter, and a satisfying reveal while everyone fights the monsters.

Dave explicitly likes:
- Two players receiving the same secret objective and competing for it.
- Sometimes all players receiving the same objective, without being told everyone has it.
- Most gold, most magic damage, most triples, most straights, and interesting most/least stat contests.
- Personal ambition that occasionally pulls against the team's easiest plan.
- A special campaign battle where a possessed hero fights beside the monsters, chooses a hero to attack, and may either pursue valuable loot for winning or try to roll badly to resist.

Do not narrow this into purely cooperative achievements. Competitive friction is part of the desired experience. Earlier advice to avoid all harmful objectives was too restrictive for Dave's stated direction. The existing bribe design already accommodates some selfish play.

## 1. Secret contests
Use the existing envelope and rewards/reveal flow. A rivalry card states its scoring rule and reward but does not disclose who else received it.

### Three deal patterns
| Pattern | Deal | Intended moment |
| --- | --- | --- |
| Hidden pair | Two players receive the same rivalry; others receive different secrets | Why are both of you suddenly chasing gold? |
| Hidden group | Three or more players share a contest | A surprising scramble around one stat |
| Whole-table secret contest | Everyone privately receives the same contest without knowing it | We were ALL trying to make straights! |

Keep a whole-table secret contest distinct from an announced public contest. It is the hidden duplication that produces the reveal. Vary deal patterns so players cannot assume all envelopes match.

Proposed scoring clarification: compete against the recipients of that contest, not an uninvolved player who never received it. The private card can say "Highest score among holders of this objective wins." It must not disclose the count or identities. Compare this with current judging code before deciding whether it is a change.
At reveal, show all participating names, scores, ties, and prizes together. Reuse the existing rule that ties split the prize, with a specified integer-gold remainder rule before implementation.
Ordinary rivalries retain the existing team-victory payout condition. Possession rewards are a separate encounter proposal.

### Candidate contests
| Working title | Metric | Decision or tension |
| --- | --- | --- |
| Gold Rush | Most gold earned during this battle | Chase gold outcomes or take the attack that ends the fight |
| Arcane Ace | Most actual damage attributed to magic powers | Spend, charge, target, or save magic |
| Lucky Streak | Most qualifying triples | Preserve a combination or chase useful individual results |
| Straight Shooter | Most qualifying straights | Keep a sequence or take the strongest combat faces |
| Stone Wall | Most damage actually blocked | Seek useful defense and accept exposure |
| The Finisher | Most killing blows | Coordinate targets while wanting the finishing hit |
| Big Swing | Largest actual damage total in one round | Build a burst and choose the release moment |
| Field Medic's Wager | Most effective healing delivered | Heal where it matters instead of where the number looks biggest |
| Frugal Caster | Least magic spent, with a minimum useful contribution | Solve the battle efficiently |
| Light Touch | Least damage dealt among eligible contestants | Contribute through defense, healing, or control |
| Unscathed | Least health lost, with active participation | Avoid danger without abandoning the fight |
| Barely Standing | Lowest positive health at victory | A risky edge-of-survival challenge |
| Tight Purse | Least battle gold earned, with active participation | Give up tempting gold results to pursue something else |

Most of the first seven already have counterparts in SECRET_OBJECTIVES.md. Extend or reuse them rather than create duplicate cards or counters.
Least-stat contests are exploration candidates, not all approved rules. "Least of any stat" needs individual review: zero actions or a disconnected phone must not become the optimal winner. Preserve mischievous decisions while testing how much frustration they create.
A pair with unequal classes or equipment may not have a fair contest for magic damage or blocking. Check eligibility and rotate opportunities. Do not automatically give the Mage every magic contest or reveal assignments through predictable class matching.

### Scoring definitions to settle
- Window: this battle only unless a card explicitly says otherwise. Never use lifetime gold or preexisting wealth for a battle gold contest.
- Gold: exclude objective payouts from the measured total, avoiding recursive scoring.
- Damage: use actual health removed, capped at remaining enemy health, after applicable defenses. Define attribution when weapon and power damage combine before Guard.
- Magic damage: classify by source. Arrow enchantments and magic-funded rerolls should not silently count as spell damage.
- Healing: actual health restored, excluding overheal. Define self versus ally healing per card.
- Blocking: damage actually absorbed, not unused block generated.
- Triples: decide whether each qualifying line counts or only one event per round. Count resolved boards, never every transient reroll.
- Straights: use the existing awarded straight event; do not count every shorter sequence inside one long straight.
- Multiplayer combos: define individual credit for team triples to prevent double-counting surprises.
- Least health lost: track actual loss, not merely starting HP minus ending HP, which healing can hide.
- Downed/disconnected players: specify eligibility, minimum participation, and late-join handling.
- Ties: retain split prizes; define zero-score ties and integer rounding. Proposed: no payout for a most-stat contest where all scores are zero.
These are required design decisions, not assertions about current counters.

### Reveal examples
- "Mira and Rowan BOTH had Gold Rush. Rowan wins, 31 to 26."
- "Everyone had Straight Shooter. Three heroes tied with two straights. The prize is shared."
- "You thought the Bard was saving magic for healing. The Bard was chasing Frugal Caster."

## 2. Personal secret challenges
Keep a mix alongside rivalries so envelopes are not always races.
Candidates:
- Just Enough: defeat an enemy with no more than two excess damage. Needs a precise overkill definition.
- Against the Odds: retain a natural 1 from the first roll through lock-in, then win.
- The Bodyguard: a secretly assigned teammate is standing at victory.
- Change of Plans: win two battles using different weapon combinations. Requires a multi-battle objective lifecycle.
- Break the Formation: defeat a small enemy before the strongest enemy falls.
- The Specialist: achieve a useful class-specific effect, such as effective support or a well-timed control action.
- The Rescuer: help a threatened ally survive. Counterfactual judging is complicated, so use a clear observable version first.
Offer goals supported by the player's available abilities. Do not deal an ally-healing goal before that player can heal allies.
Compare against existing challenges before adding any. Prototype a small set.

## 3. Possession encounter: The Enemy Within
Dave's original proposal: one hero joins the monsters for a battle, chooses which hero to fight, and can pursue amazing loot by winning. The player can also resist by trying to minimize damage. The unusual fun is rolling badly on purpose while still producing an outcome.

### Proposed battle flow
1. The campaign signals before selection that it includes temporary hero-versus-hero encounters.
2. At the encounter, reveal the possessed hero. The player controls that hero's own dice.
3. Replace part of the enemy force with the hero; do not add a full hero to an otherwise unchanged fight.
4. The possessed hero chooses targets and shapes rolls, either helping the monsters or resisting.
5. End possession at a defined battle outcome. Everyone rejoins the campaign afterward.

Resisting uses familiar mechanics:
- Keep low Strength.
- Prefer blue weapon faces when that reduces harm to heroes.
- Break an attack triple or decline to chase it.
- A red +0 still carries Strength. A blank does not cancel the lane.
Do not accidentally make healing, charging, resource generation, or repeated zero-damage turns a way to farm rewards indefinitely.

### Rewards and intent
Dave wants a tempting reward for winning on the monster side. Preserve that temptation.
Proposal to evaluate: give successful resistance a different appealing reward so protecting friends is also a meaningful path. Comparable value was suggested, but exact rewards are not settled.
Examples: a powerful cursed item with a clear tradeoff for giving in; a useful cleansing blessing or different treasure for resisting.
Define resistance success with an explicit condition. Do not infer player intent solely from low damage.
No permanent inventory destruction or theft is proposed.

### Rescue variant: Break the Seal
The other heroes can:
- Defeat the possessed hero to break the spell; or
- Destroy a seal to release the hero while preserving more of their fighting strength.

The freed hero rejoins the team with defined remaining resources. This creates a shared choice between removing the threat and rescuing an ally.
Still undecided: how the seal is represented, who can target it, transition timing, and whether the freed hero acts in the same round. Do not grant an accidental extra turn.

### Open mechanical questions
- Translate monster targeting into hero targets, with clear legal choices.
- Where do the possessed hero's blue faces send block? Self or monsters?
- How do healing, splash, piercing, Frost, pets, and class powers treat allegiance?
- What happens to cooperative triples and shared support?
- How are initiative, downed heroes, revives, and simultaneous outcomes handled?
- How does reward eligibility interact with normal battle defeat?
- How do duplicate support/control effects behave?
- How is enemy strength adjusted for party size and which hero is possessed?
- What happens at two players, where one is suddenly alone? Solo needs a separate authored alternative.
This is a dedicated encounter system, not just a secret-objective card.

## 4. Campaign concepts
Working titles and story ideas only; no existing pack is replaced.

### The Collector's Games
A mysterious collector offers private wagers while the party retrieves stolen treasures. Hidden pairs appear early; occasional whole-table contests arrive later. The final reveal exposes overlapping bargains.
Primary feature: most/least contests and competing rewards within cooperative battles.

### The Broken Seal
A relic temporarily turns a companion against the party. Players can fight the possessed hero or break the seal to recover their ally.
Primary feature: one carefully authored possession encounter, followed by reunion. Test this before a whole campaign of allegiance changes.

### The Rival Patrons
Two patrons secretly recruit heroes for personal goals. Players sometimes share the same assignment without knowing it. Later encounters shuffle assignments so rivalries do not become permanent teams.
Primary feature: shared secret objectives, class-varied goals, and revealing overlapping loyalties.

### The Champion's Wager
A tournament expedition mixes normal monster fights with secret contests for triples, straights, gold, precision, or survival. Sometimes everyone has the same card.
Primary feature: a straightforward first pack for testing hidden competition with existing counters.

## 5. Evaluation and build order
1. Audit js/secrets.js, existing counters, deal rules, payouts, and multiplayer reveal. Reuse what already exists.
2. Present a small proposed extension: hidden pair, hidden group, and occasional whole-table contest.
3. Set exact scoring, eligibility, ties, rewards, and assignment frequency before implementing.
4. Test 2, 3, 4, 5, and 6 players, mixed classes, duplicate classes, uneven gear, and disconnects.
5. Playtest whether secrets change decisions and produce enjoyable reveals. Measure party success, rewards, battle length, and whether players feel pressured to sabotage.
6. Prototype a single possession encounter separately, with explicit allegiance and end conditions.
7. Expand into a campaign only after the encounter works.

Player questions after a session:
- Did the objective make you choose differently?
- Did you suspect someone had your objective?
- Was the reveal funny or satisfying?
- Did someone else's secret make your own turn frustrating?
- Did you still want the group to win?
- Would you choose to play this campaign again?

Success: friends compete over personal goals while working through a shared battle, then enjoy discovering what each other was trying to do.
