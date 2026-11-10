# QuestDice2: Build your hero inside the battle

Status: concept notebook, not an implementation specification.
Owner: Dave, with Director design support.
Scope: dream, compare, and eventually test on paper. No code commissioned.

## The feeling we want

**Camp shapes your possibilities. Battle brings them to life.**

Dave's concern: QuestDice has strong bones, attractive cards, meaningful attributes, and a lot of character variety. But repeated rounds can feel like collecting some magic, attack, pierce, and perhaps health, then locking in. The resources change while the player's available decisions stay too similar.

Fleet Dice supplies a feeling worth recovering: start with a modest board, choose what to grow, and feel the next roll change because of the choice you just made. QuestDice2 explores that rhythm inside a cooperative fantasy campaign.

This is a new design direction to explore, not a decision to discard QuestDice or rebuild it immediately.

## Dave's direction

- Keep the dice, existing attributes, fantasy heroes, cooperative battles, and camp choices.
- Start battles with basic dice and build during the fight.
- Between rounds, spend the purple-triangle resource to activate or improve part of the board. Dave's example: unlock the top-left corner, “pull your sword,” and now roll the sword.
- Camp gold improves the options available in future battles: which weapon can be activated, which powers can be learned, and how dice can grow.
- Some modest permanent improvement can carry into the next battle, such as better starting health or one small starting advantage.
- Keep room for splash, risky big swings, reliable pierce, and other distinct tools.
- Explore a broader name for Magic while keeping the purple triangles.
- Shelf movement and the map. A small checkerboard and feet-based movement remain a parked possibility, not part of this proposal. Team discussion and phone space are already precious.

## What the existing games teach us

Fleet Dice's README describes an opening cross of four ships around the flagship, with corners purchased later. Those corners open additional combinations. It also records an important lesson: an opening layout can accidentally make a combination practically unavailable. QuestDice2's starting board should offer interesting combinations immediately, with new slots adding opportunities.

QuestDice already supplies a substantial vocabulary: Heart matching, body dice, distinct weapons, talent faces, attack, block, pierce, splash, healing, gold, cooperative targeting, and power cards. The latest team record includes six weapon families, five magic-card types, and learned powers at camp. We can reuse the visual language and selected mechanics without requiring every existing system in the first experiment.

Monster Specials have also already been developed and recorded as released. They address the other half of the problem: why the party's priorities change. Within-battle growth should work alongside readable enemy pressure, rather than assume an expanding hero board alone solves repetition.

Sources: [Fleet Dice README](https://github.com/davepartin/fleetdice/blob/main/README.md), [QuestDice design](../DESIGN.md), [team board](../team/BOARD.md), [Monster Specials](../team/tasks/T24-monster-specials.md), and [magic-card types](../team/MAGIC_CARD_TYPES.md). These are design references, not a fresh audit of live rules or balance.

## Two kinds of growth

| Layer | What changes | What survives the battle |
| --- | --- | --- |
| Camp | The weapons, techniques, talent configurations, and upgrade choices you can bring | Purchases, learned options, selected loadout, modest permanent benefits |
| Battle | Which prepared options are active, which dice have grown, which power you bring online | These activations reset for the next battle |
| Round | The rolls you keep, immediate powers you use, target, and whether to invest or respond | Resolved effects plus unspent battle resource, if banking is adopted |

A purchased sword remains yours. Its battle slot begins covered again next fight. The explanation should be entering your fighting rhythm, not forgetting how to hold your own weapon.

Camp should mostly improve the choices available during the climb. If it eventually buys away the entire climb, the original problem returns.

## Proposed starting point, not a ruling

Try the five-die body cross: Heart, Head, Feet, and two Hands. Start with the four corners covered. Keep a small, readable list of prepared options behind those covers.

**A hero must be useful from the first roll.** Decide what a hand does before its weapon corner opens. A simple possibility is a basic strike or guard, replaced or enhanced when that weapon activates. Check this explicitly: the existing lane rules cannot simply be assumed to work with missing weapons.

Every hero should have an immediately recognizable identity. A Knight and Wizard can share the same starting board shape while bringing different prepared choices or one simple starting technique. Do not delay all class identity until round three.

An alternative to compare is one active signature corner at the start. It gives faster identity but leaves less room to grow. This is an opening-board choice to test, not two modes we need to build.

## A round with an actual fork in the road

Proposed order:

1. See the enemy's coming threat.
2. Between rounds, spend banked purple triangles on at most one board improvement, or save them. For the first round, use a small starting allowance.
3. Roll and shape your available dice.
4. Choose whether to spend remaining triangles on an immediate technique.
5. Lock in together and resolve.
6. Collect that round's earned triangles for the next round.

Newly rolled triangles become spendable next round in this first sketch. That keeps the timing clear and prevents a die from funding a new die that rolls and funds another purchase in the same round.

The interesting choice is: **“Can we afford for me to get stronger, or do we need my help right now?”**

One improvement per round is a proposed speed limit, not a new action-point currency. Costs and the usefulness of upgrades still need testing.

## What a battle could feel like

Illustrative sequence, not balanced costs or guaranteed rolls:

| Round | What the player sees | Meaningful choice |
| --- | --- | --- |
| Opening | A modest board and two very different enemies | Prepare a sword for early pressure or a shield to survive while a teammate builds |
| Second | One teammate is ready to attack; a monster threatens a large hit | Use a defensive technique now or grow a hand die for future rounds |
| Third | Small enemies are still alive | Activate the prepared splash option instead of the single-target upgrade originally planned |
| Fourth | Only the armored leader remains | Stop investing and spend the remaining resource on reliable pierce |
| Finish | The party has reached its strongest state | Enjoy using the completed build long enough for those choices to pay off |

The desired story is, “I was going to build this way, but then that happened.” If players always follow the same purchase order, changing the board has only added a shopping chore.

## Camp: improve your next climb

Camp could offer three understandable kinds of purchase:

- **Equipment:** change the sword, shield, bow, or other weapon available behind a corner.
- **Training:** improve a later battle upgrade, customize eligible dice faces, or learn a new technique.
- **Readiness:** a modest lasting benefit such as starting health or one chosen starting advantage.

A learned technique might be a crowd attack, a risky heavy swing, or reliable pierce. Those are choices with different uses, not a ladder where the expensive option is best at everything.

Recommend a small prepared loadout for each battle. Learning more powers should expand your collection without placing the entire collection on the combat screen. A candidate is three prepared techniques, but the exact count is open.

A stronger upgrade can occupy the same place in the battle sequence as its earlier version. Buying a better sword at camp could improve what “Ready Sword” gives you next battle without making it cost an extra two rounds to reach. Avoid increasing both camp cost and activation delay automatically.

Do not turn camp into another long optimization phase. One satisfying purchase or loadout adjustment can be enough.

## The purple triangles

**Working recommendation: Focus.**

“Gain Focus.” “Spend 3 Focus to ready your sword.” “Spend 2 Focus to use Pierce.” The word works for martial skill, concentration, healing, and spell-like abilities without sounding restricted to wizards.

| Name | Strength | Concern |
| --- | --- | --- |
| Focus | Broad, short, works with weapons and powers | Needs visual distinction from ordinary attention or targeting |
| Energy | Immediately understandable and familiar from Fleet Dice | Less distinctive fantasy flavor |
| Skill | Fits training and techniques | Spending it can sound like losing permanent expertise |
| Resolve | Heroic and fits pressure | Sounds more like morale than a general power resource |

Use **Momentum** for the feeling of an increasingly capable hero. Do not add a separate Momentum meter or currency in the first version. Focus replaces the role/name of Magic in this exploration; it does not sit beside another magical resource.

Keeping one resource for both growth and immediate powers creates a useful tension. It also risks making growth always correct early and powers always correct late. That needs to be tested, not celebrated as automatically strategic.

## Three ways to make growth happen

| Approach | Benefit | Risk |
| --- | --- | --- |
| Buy upgrades with rolled Focus | Closest to Dave's idea; economy competes with immediate help | Poor rolls can leave a hero behind; resource generation may dominate |
| Choose one free upgrade each round | Everyone develops; fast and easy to teach | Growth can become automatic, with little sacrifice |
| Small guaranteed Focus income plus rolled Focus | A dependable floor with room for better rolls | Extra explanation; careless tuning can make Focus abundant |

Start with purchased growth as Dave proposed. If resource drought keeps people out of the fun, compare a small guaranteed income before adding catch-up subsystems. No final income, price, or round count is decided.

## Guardrails that make the idea worth keeping

**Avoid the compulsory sword tax.** If every build must buy the same corner first, either make it part of the starting kit or give the alternatives a real reason to exist.

**Avoid an investment snowball.** Buying Focus production cannot be the universal best opening. Resource dice, Heart amplification, healing, and future upgrades interact. Preserve threats that sometimes reward immediate attack or defense.

**Avoid farming the last monster.** Keeping one weak enemy alive must not produce unlimited healing, camp gold, or setup rewards. Consider bounded earnings or simple visible enemy escalation only if testing shows the need. Avoid a collection of hidden anti-farming rules.

**Make changes visible.** Opening a covered corner, adding a die, or changing its faces should clearly change the next roll. A hidden percentage increase will not deliver Dave's desired feeling.

**Keep a satisfying peak.** A short fight can end before a late upgrade gets used; a long fight can return to several identical rounds on a full board. The useful question is how many rounds players enjoy their evolving board, not merely how many upgrades exist.

**Keep friends playing.** Plan upgrades simultaneously, let each player own their build, and keep only a few relevant choices visible. Avoid a shared spending queue, traded upgrade currency, positional debate, or a required discussion after every purchase.

**Give enemies different questions.** An armored foe makes pierce attractive; a crowd makes splash attractive; an announced heavy hit makes defense matter. Raw enemy health alone would make all builds feel like the same race.

**Preserve the attributes without multiplying systems.** Feet can retain their initiative purpose while movement is shelved. Existing resources and icons are enough for the first experiment.

## Smallest useful tabletop experiment

When Dave is ready to test, use paper covers on a 3-by-3 grid and existing dice. No application or second repository is required.

- Two heroes, one repeatable encounter, three prepared upgrade choices each.
- Basic attack, block, and Focus first. Introduce the other existing effects only when needed for the comparison.
- Play the same encounter with a static full board and with a growing board.
- Then change the encounter from an armored foe to a small crowd. See whether the preferred opening changes.
- Compare a fully reset battle with one modest camp benefit carried in.
- Record opening choices, first upgrade timing, upgrades actually used, resource-starved rounds, total rounds, and time spent waiting on a teammate.
- Ask players which choice changed their plan and which round they most enjoyed.

Success means more anticipation and different decisions without appreciably longer waits. Winning more often or showing larger numbers does not establish that it is more fun.

## Questions to dream through next

1. What can the starting hero do before any corner opens?
2. Does an upgrade add a new die, improve an existing die, or offer either choice?
3. How much of a hero's identity is present on the first roll?
4. What exactly carries between battles: health state, gold, purchases, loadout, and starting benefits? Distinguish starting/max-health upgrades from post-battle healing.
5. How many purchases fit into a satisfying battle, with time left to use them?
6. Which choice is genuinely difficult: grow versus act, offense versus defense, or which tool to unlock first?
7. How do two-handed weapons activate without awkwardly requiring two separate purchases?
8. Which existing power types strengthen the new rhythm, and which can wait?
9. Should secret objectives return after the basic loop works? Gold-seeking objectives need review so they do not reward abandoning the team during the buildup.
10. If the growing board is already engaging, is there any remaining reason to add a map?

## Current recommendation

Explore QuestDice2 as a focused design notebook within this repository. Keep the existing game intact. Start with **a capable basic hero, covered corners, Focus spent on growth or immediate help, and camp purchases that improve the choices behind those covers**.

The promise to test: **“Every battle, I build toward a hero I am excited to play. Every camp, I change what that hero could become.”**
