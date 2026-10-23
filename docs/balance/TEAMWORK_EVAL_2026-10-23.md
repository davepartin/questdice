# Teamwork evaluation (23 October 2026)

The handoff's comparison (docs/ideas/TEAMWORK_IMPLEMENTATION_HANDOFF_2026-10-22.md): `node tools/teamwork.mjs 12` for seven
parties (pairs, trios, a four, and duplicate classes: two Dwarves, two Bards, two Rangers), four encounters, three ways of
choosing targets, each with and without Heart to Heart. 2016 fights, 12 seeded fights a cell per party, the same seeds in every
cell. Act II heroes grown from the solo campaign; today's monsters and weapons; charms resting in both arms. Full table:
teamwork_eval.txt.

**The three ways of choosing targets (what the bots do)**
- focus: everyone on the weakest monster.
- split: each hero on a different monster.
- adaptive: each hero goes for the biggest threat first (a monster winding up, a summoner about to call), then the weakest; with
  Heart to Heart on it also joins a friend who locked in with the same heart (or turns its heart by one to match, if it can pay).

**Results: health the whole party loses a fight (± standard error), wins**

| | mixed (summoner, ogre, hurt goblin) | 4 goblins | ogre | Bone Warden |
|---|---|---|---|---|
| focus | 32.4±2.5 · 100% | 61.4±4.2 · 96% | 8.3±1.2 | 12.3±1.4 |
| focus + Heart to Heart | 33.0±2.6 · 100% | 58.7±4.0 · 98% | 7.5±1.2 | 11.6±1.5 |
| split | 52.2±4.2 · 99% | 113.7±7.8 · **77%** | 8.3±1.2 | 14.9±1.7 |
| split + Heart to Heart | 54.8±4.6 · 96% | 114.5±7.9 · 79% | 7.5±1.2 | 14.1±1.7 |
| adaptive | **84.3±7.6 · 88%** | 61.4±4.2 · 96% | 8.6±1.3 | 16.8±2.0 |
| adaptive + Heart to Heart | 75.9±7.4 · 88% | 63.3±4.9 · 95% | **6.7±1.1** | 15.5±2.1 |

Heroes in a Heart to Heart group: 27-37% of hero-rounds when focusing (matching hearts by chance), 35-43% when the bot joins
friends on purpose, 3-10% when splitting. Summons allowed: 0.3-0.5 a fight in every arm; slams that landed: 0.1-2 a fight.

**What it says**
1. **Focus fire wins, clearly.** Everyone on the weakest monster costs the least health in every crowd, by a margin far larger
   than the error (mixed: 32 against 52 split; 4 goblins: 61 against 114, and splitting loses a quarter of those fights).
   Removing an attacker removes its blows for the rest of the fight, which is worth more than anything else here.
2. **The "biggest threat first" bot is a poor player, not evidence that threats don't matter.** It sends everyone at the ogre
   or the Bone Warden when they wind up, but they have 150-300 health and cannot be stopped in time, so the slam lands anyway
   while the small monsters keep hitting (12% of mixed fights lost). The example below is exactly that. A better rule would be
   "hit the wind-up only if you can kill it this round"; the bots do not know that yet. This is a limit of the simulation.
3. **Heart to Heart helps a little, and helps most where heroes already share a target**: ogre fights 8.6 to 6.7 with the
   joining bot, mixed fights 84 to 76, 4 goblins 61 to 59 with focus. Most of these gaps are within one or two standard errors:
   it is a bonus, not a decider, and it never made focusing worse beyond the noise. It gives friends a reason to talk about the
   same monster, which is the point; whether that is fun is a question for the phone, not the bots.
4. **Party size**: the four-hero party suffers most from splitting (83 health a fight against 39 focusing). Duplicate classes
   behave like their class (two Dwarves are slow to finish fights; two Bards are close to a Wizard + Bard).
5. **Example of a decision that helped**: round 1, a Knight and a Ranger matched heart 4 on a Goblin with 27 health left: 27
   damage, 20 of it from Heart to Heart; the kill needed it.
   **Example of a tempting decision that hurt**: round 2, the company hit the Hill Ogre while the Bone Warden's wound-up slam
   landed for 31.

Limits: bots do not talk, pick targets by fixed rules, and only the adaptive bot turns its heart to match. The numbers say what
the choices are worth when made consistently; human table talk needs the phone.
