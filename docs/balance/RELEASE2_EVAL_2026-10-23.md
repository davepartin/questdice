# Release 2 evaluation (23 October 2026)

This answers ChatGPT's review of the Release 2 report, relayed by Dave:
- finish the class and magic evaluations before changing balance;
- say whether contribution is per hero or per class;
- prove the simulated strategies really behave differently;
- check that the simulated parties use the teamwork rules;
- look at the Wizard's attack kit alongside a Barrier start;
- put the six-player gap and replay pacing first;
- report sample sizes and uncertainty, and save each batch as it finishes.

No gameplay rule changed while measuring. Every table sits next to this file as `release2_*.txt`, saved as each batch finished.

## How to read the numbers

- **Independent campaigns.** Fights inside one campaign share a hero and its gear, so they are not independent samples. The new runs grow several separate heroes or companies from their own seeds. Their errors are standard errors *across campaigns*, and every number names its campaign count.
- **Paired comparisons.** Where two arms fight with the same grown heroes and seeds (the Wizard variants), the difference is taken within each campaign, then averaged. That error is much smaller than the error of either arm alone.
- **Two simulated players.** The *smart* player follows simple rules. The *wise* player looks ahead a few rolls and picks the plan that scores best. Real players probably sit between the two.
- **Released rules throughout:** RELEASE=1, the new weapons, Heart to Heart, charms resting, class rules on, no fury.

## 1. Does spending or saving magic matter? (tools/magicaudit.mjs)

The first magic table (release2_magic_*.txt) did not test the decision. Its runs used the wise player, which plans by look-ahead; the spend/save setting only changed the simple rules it falls back on, which it rarely uses. ChatGPT's suspicion was right.

The new audit counts every real cast (look-ahead copies excluded) under six policies:
- smart, with its usual reserve, with no reserve ("spend"), and keeping 4 magic in hand ("save");
- wise, valuing a point of magic in hand at 2.2 health (its default), at 0.8 ("spend"), or at 4.5 ("save").

Each class: 5 independent campaigns, Act II heroes, 240 fights a policy (60 per fight type: one big hitter, three goblins, an armoured monster, a self-healer).

**The policies behave differently.** Magic spent per fight, wise player:

| Class | spend | default | save |
|---|---|---|---|
| Wizard | 8.2 | 7.2 | 5.1 |
| Knight | 4.1 | 3.9 | 1.8 |
| Bard | 5.5 | 5.2 | 3.6 |

The casts shift with it. A saving Knight casts Shield Up 0.07 times a fight against 0.45 when spending, and Rally Cry 0.11 against 2.17. A saving Wizard stores Storm Coil 0.43 times against 2.6.

**Health a fight, wise player (± across campaigns):**

| | spend | default | save |
|---|---|---|---|
| Wizard | 12.2±1.8 | 13.2±2.3 | 12.5±2.1 |
| Knight | 12.6±1.1 | 13.4±1.3 | 14.6±1.3 |
| Ranger | 15.9±2.6 | 16.3±2.4 | 16.6±2.3 |
| Dwarf | 10.0±0.7 | 10.5±0.7 | 11.7±0.6 |
| Bard | 10.3±2.7 | 12.1±3.0 | 14.8±3.8 |

Spending is never worse, and hoarding costs the Bard, Knight and Dwarf 1–4 health a fight. The decision is real but small. Playing well (wise against smart) is worth 5–9 health a fight in every class, far more than the magic style.

**The Wizard ends fights holding 8–11 magic** under every policy, the most of any class (Knight 3–5). Its identity is "the most magic", but its powers cannot turn that magic into anything. Arc Bolt is once a battle, Magic Missile and Storm Coil take 1 magic a round each, and the surplus is simply left over.

## 2. The Wizard: a Barrier start against a stronger attack kit (paired, 5 campaigns, 240 fights an arm)

Every variant fought with the same five grown Wizards and the same seeds, using the wise player. Results are health a fight against the current start (Arc Bolt, Magic Missile, Storm Coil); negative is better.

| Variant | All four fights | Three goblins |
|---|---|---|
| Barrier instead of Magic Missile | **−1.6 ± 0.4** (better in 4 of 5 campaigns) | −1.9 ± 1.3 |
| Magic Missile +3 pierce (from +2) | −0.1 ± 0.4 | 0.0 ± 0.3 |
| Magic Missile +4 pierce | 0.0 ± 0.2 | −0.2 ± 0.4 |
| Storm Coil 6, 8, 10, 12 (from 5…) | +0.1 ± 0.3 | +0.6 ± 1.5 |
| 28 health (from 24) | +0.1 ± 0.1 | +0.2 ± 0.4 |

- **The Wizard is not the weak class** once campaigns are independent. Its start kit costs 13.2 health a fight, against Knight 13.4, Ranger 16.3, Dwarf 10.5 and Bard 12.1. The earlier "27 a fight" (release2_classkit.txt) came from one campaign's hero, the independence problem in action.
- **Stronger every-round attack spells do nothing.** The wise player casts a +4 Missile twice as often (1.8 a fight against 0.9), and the fights cost the same. Extra health does nothing either. The Wizard's opening is not too punishing in Act II.
- **Barrier is a small, real gain:** 1.6 health a fight, about 12%.
- **The deeper issue is the unspent magic.** A better fix than swapping the start spell may be giving the magic a use: a second Arc Bolt in a battle at a price, or a Missile that takes more magic for more pierce. That would keep the Wizard a magic specialist instead of turning it into a third wall.
- **Recommendation:** do not change the start yet. If Dave wants a change now, Barrier is the one with evidence. My preference is to try a magic outlet first and measure it against Barrier the same paired way.

## 3. Finishing monsters early (from the same audit, three goblins)

Health lost a round with three, two and one goblin still standing, smart player:

| Class | 3 standing | 2 standing | 1 standing |
|---|---|---|---|
| Wizard | 18.7 | 6.5 | 2.9 |
| Knight | 18.1 | 6.4 | 2.6 |
| Ranger | 21.1 | 7.7 | 3.3 |
| Dwarf | 18.9 | 8.4 | 2.4 |
| Bard | 19.6 | 8.0 | 2.5 |

The first kill is worth about 12 health for every round it comes sooner, so finishing fast already pays in crowds. It does not in one-monster fights (heavy, guard, healer), where blocking costs nothing extra. That is the defensive-dominance question ChatGPT raised: encounters where speed pays need more monsters, summons that grow, or self-healing that outpaces slow damage.

## 4. Party sizes, with and without deliberate teamwork (tools/party.mjs, 10 independent campaigns each)

Equal progression: every hero also grows through the solo campaign step by step, and the table fights the same quest. TEAMPLAY=1 bots use the teamwork rules on purpose: a Knight above half health guards when a friend is worse off, and a hero joins a friend with the same heart, or turns its heart by one to match.

| Company | Team battles won first try, per campaign | Act III battles (70 fights) | Act III boss, first try | Hero-fights where the hero fell |
|---|---|---|---|---|
| 2, plain | 96% ± 1% | 99% | 20 of 20 | 5.0% |
| 2, team play | 98% ± 1% | 99% | 19 of 20 | 3.6% |
| 4, plain | 97% ± 1% | 97% | 20 of 20 | 4.5% |
| 4, team play | 97% ± 1% | 99% | 20 of 20 | 3.8% |
| 6, plain | **87% ± 2%** | **80%** | 18 of 20 | **15.4%** |
| 6, team play | **88% ± 2%** | **86%** | 17 of 20 | **14.8%** |

**The six-hero gap is real, and better teamwork does not close it.** With equal progression and 10 independent campaigns per size:
- six heroes win about 9 points fewer battles than two or four (87–88% against 96–98%, each ± 1–2%);
- a hero falls in about one fight in seven, against one in twenty-five.

Team play lifted Heart to Heart to 69% of hero-rounds and guarding to 27% of rounds, yet left the gap where it was. So it is the scaling (monsters are built at about 5.3 times a single hero's strength for six), not the bots ignoring the teamwork rules.

The Act III boss is fine at every size: 17–20 of 20, each a separate campaign's boss. Ordinary battles are where six suffer.

**Proposal, not applied:** soften the six-hero factor (and perhaps five), then rerun this same comparison. That means lowering the PARTY scaling for six until six-hero battles sit near 95%. It is a balance change, so it waits for Dave.

**What the bots did with the teamwork rules:**

| Company | Heart to Heart (hero-rounds) | Focused on one monster | Rounds a Knight guarded | Bard verses for a friend a round |
|---|---|---|---|---|
| 2, plain | 18% | 100% | 10% | 0.02 |
| 2, team play | 28% | 100% | 11% | 0.02 |
| 4, plain | 47% | 100% | 12% | 0.10 |
| 4, team play | 54% | 100% | 20% | 0.10 |
| 6, plain | 61% | 100% | 17% | 0.23 |
| 6, team play | 69% | 100% | 27% | 0.21 |

All the bots focus fire (everyone on the weakest monster, or on one winding up). The Knight guards rarely, because it seldom has spare magic. The Bard almost never sings for a friend, because its rule waits for a friend below 60% health and worse off than itself.

## 5. Per hero, not per class; what support and protection add

Every class number in party.mjs is **per hero**: two Bards at one table each count separately, and a fair share is 1 ÷ heroes. Four heroes, team play (release2_size4_team.txt):

| Hero | Damage share | Block share | Double-share rounds a fight (by Shield Up) | Healing to friends a fight | Fell |
|---|---|---|---|---|---|
| Knight | 25% | 31% | 2.8 (1.5) | 0 | 4% |
| Ranger | 26% | 23% | 0.8 | 0 | 4% |
| Wizard | 23% | 23% | 1.3 | 0 | 5% |
| Dwarf | 25% | 33% | 2.2 | 0 | 1% |
| Bard | 26% | 16% | 0.8 | 3.5 | 5% |

Equal damage does not mean equal roles, and these numbers show where the roles are thin:
- **Knight protection is real but rare.** It takes the most double shares, half of them by choice, and blocks a third of the team's total.
- **The Dwarf is the wall:** most block, fewest falls.
- **Bard support barely exists in play.** It gives 2–3.5 health a fight to friends, blocks the least and falls the most, and otherwise deals damage like everyone else.

Making the Bard's support visible and valuable belongs with the class-identity work (the targeted song recommendation in CLASS_IDENTITY section 7), not this release.

## 6. Arrows and Heart to Heart with the new weapons

- **Arrows** (release2_arrows.txt; Act II heroes of every class, 160 fights a cell):
  - Frost is the best arrow against a summoner (28.7±2.3 against 35.6±2.5 for normal) and against an armoured monster (12.5±1.0 against 15.8±1.3).
  - Fire and piercing sit between them.
  - Four goblins beat a lone hero more than half the time with any loadout (39–48% wins).
  - Sword and shield cost less health than any bow in every column: the bow trades block for reach.
- **Heart to Heart** (release2_teamwork.txt, 960 fights, 40 a cell):
  - Focus fire still wins clearly: in the mixed crowd, focus costs 27.1±4.2 health against 60.1±7.7 for split.
  - Heart to Heart on top of focus helps a little (23.7±3.9), within the error.

## 7. Replay pacing (js/g3/flat.js replayPace)

The round replay is fitted to a fixed window, whatever happens in it:

| Heroes and monsters acting | Seconds per strike | Replay |
|---|---|---|
| 2 | 6.3 | 15.0 s |
| 3 | 4.2 | 15.1 s |
| 6 | 2.4 | 17.0 s |
| 10 | 1.45 | 17.0 s |

On top come banners (Heart to Heart, team triples, about 1 s each) and 1.3 s of settling before the recap. A round therefore costs 17–21 s of watching, and a 13-round Act III boss about 4–4½ minutes before anyone decides anything.

In small fights each strike is held 4–6 seconds; that is padding, not content. Letting the replay scale with what happens (about 1.5 s a strike, no 15-second floor) would cut a two-hero boss's watching time by more than half without touching the rules. That is a presentation change, waiting for Dave's word and the group playtest, which is still the only real measure of minutes.

## What changed in the game today

Only presentation:
- the tutorial pictures;
- the six-hero crowding;
- Knight Guard visible on the card, banner, round card and rules: a double share to the Knight, a single share to everyone else;
- the Dwarf's Dig In line.

No balance numbers moved.

## Decisions waiting for Dave

1. **Six-hero scaling.** Soften the six (and five) hero factor and rerun the same 10-campaign comparison until six-hero battles sit near 95%.
2. **Wizard.** Either keep the start as it is, or adopt the Barrier start (1.6 ± 0.4 health a fight better). My preference is to try a magic outlet first (a priced second Arc Bolt, or a scaling Missile) and measure it against Barrier the same paired way.
3. **Replay pacing.** Let the replay scale with the number of strikes (about 1.5 s each, no 15-second floor). Presentation only, best judged after the group playtest.
4. **Bard support and encounters where speed pays.** Both belong to the class-identity and encounter work, not to this release.

## Tools added for this report

- **tools/magicaudit.mjs:** casts counted per policy, independent campaigns, Wizard variants.
- **tools/party.mjs:**
  - TEAMPLAY=1 bots;
  - Heart to Heart, focus, guard and verse counts;
  - double-share credit per hero;
  - fight counts and errors per row;
  - a per-campaign error.
- **Engine:** CAST_HOOK, a listener only the tools set.
- **test/syntax.test.mjs** now checks every tool and dev script parses. A stray comment had silently cost one batch.
