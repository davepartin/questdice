# Monster rules, one at a time (22 October 2026)

ChatGPT asked to isolate each pressure rule (PRESSURE in js/data.js, all off in the game). Same Act II heroes of every class,
same eight Bronze loadouts from the six new weapons, the same four fights, 16 fights a cell, wise bot. Full tables beside this
file: `pressure_<rule>.txt` (`node tools/matchup.mjs`, W2=1 plus FURY / RALLY / MEND / BAG / PRESS).

Health a fight costs for the wise player (lower is better). "Two shields" = Round Shield + Tower Shield.

| Rules on | Heavy (ogre) best | Swarm (3 goblins) best | Two shields in the swarm | Swarm wins | Guard (warden) best | Healer (oak) best |
|---|---|---|---|---|---|---|
| none | two shields 1.8 | two shields 37.2 | 37.2 (best) | 78-90% | two shields 3.5 | two shields 2.6 |
| fury | two shields 3.9 | **Axe + Tower 41.3** | 47.6 (6th of 8) | 74-80% | two shields 10.5 | two shields 3.9 |
| rally (swarms call friends) | two shields 1.9 | **Sword + Shield 50.9** | 61.0 (worst) | 54-68% | two shields 3.5 | two shields 1.6 |
| mend (a lone monster heals when it guards) | two shields 1.6 | two shields 41.3 | 41.3 (best) | 74-85% | two shields 3.1 | two shields 1.6 |
| bag (moves come out of a shuffled bag) | two shields 3.3 | two shields 44.5 | 44.5 (best) | 68-81% | two shields 4.8 | two shields 2.8 |
| all four | two shields 2.9 | **Axe + Spear 56.0** | 67.0 (worst) | 44-64% | two shields 8.2 | two shields 2.7 |

What it says:

1. **Fury is the useful rule.** On its own it moves the swarm from two shields to Axe + Tower Shield, without making the fight
   brutal (wins stay 74-80%), and it triples what the long guard fight costs two shields (3.5 to 10.5).
2. **Rallying swarms work too well.** Alone they drop swarm wins to 54-68%. Every three rounds is too often; try every four, or
   only once a fight.
3. **Mend and the bag barely move anything.** Mend triggers only when a lone monster guards, which is rare. The bag cannot help a
   bot that does not read it; its value is for a human planning around "what is still in the bag", and has to be judged in play.
4. **Two shields still win every single-monster fight under every rule.** Fury only bites from round 5, and two shields finish the
   ogre in about 6 rounds, so they pay one or two rounds of it. If single fights should reward attack too, fury has to start
   earlier (round 4) or grow faster; that is the next test, not a change yet.
5. All four together make the swarm the hardest fight in the act (44-64%), mostly because of rallying. Too much as it stands.

Proposed next settings to test (still off in the game): fury from round 4; rally every 4 rounds, at most once a fight; mend
and the bag unchanged (judge them in play in the lab).
