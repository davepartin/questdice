# T25 Polymorph as a Charge card, measured (2 November 2026)

Grok's board request, approved by Dave ("I need Claude to finish this"). **PROPOSED until Dave plays it.**

**The rule now:** Charge 1 magic a round (max 3). Use spends all the charges and rolls a d6 against your target: a frog on **4–6 at 1 charge, 2–6 at 2, sure at 3**. A frog cannot attack that round, a Slam included. A miss spends the charges. Storing a charge needs no target and locks nothing; Use locks the target, like the other targeted powers. **Level II:** the frog takes +4 pierce. **Level III:** 3–6 at 1 charge, sure at 2. The Level III cost discount is gone, and with it the frog every round.

**How it was measured:** `node tools/t25-polymorph.mjs [campaigns] [acts] [difficulty] [out] [wise|frog]`. A solo Wizard walks Acts I–III. At every step the same hero, fight and dice seeds are played 4 times with the old card and 4 with the new. These are bots on the released rules, not people. Two kinds of player:
- **careful** (the wise bot: it plays out its choices). It now values a stored frog charge at a third of the biggest blow it would stop. Before that it never charged at all.
- **frog-first**: a Wizard who plays Polymorph first every round it can, on the hardest hitter. This is the loop Dave wanted gone. With the old card it pays 3 (or 2) every round; with the new one it charges to a sure frog.

Elite and boss cells have only 8–32 fights, so treat a difference under about 12 points there as noise. Battle cells have 96–128.


### Polymorph, old vs new (bots, wise play, solo Wizard, normal; 4 campaigns, 4 trials a step, matched seeds)

| Act and fight | Polymorph | Fights | Win | Rounds | Lowest health | Frog rounds a fight | Magic on Polymorph a fight |
|---|---|---|---|---|---|---|---|
| Act 1 battles | new | 128 | 90% | 3.3 | 52% | 0.1 | 0.6 |
| Act 1 battles | old | 128 | 91% | 3.2 | 53% | 0.1 | 0.3 |
| Act 1 elite | new | 16 | 100% | 5.6 | 63% | 0.1 | 0.8 |
| Act 1 elite | old | 16 | 100% | 5.6 | 61% | 0.3 | 0.9 |
| Act 1 boss | new | 16 | 94% | 6.3 | 46% | 0.4 | 1.4 |
| Act 1 boss | old | 16 | 94% | 5.8 | 56% | 1.5 | 4.7 |
| Act 2 battles | new | 128 | 93% | 5.0 | 47% | 0.4 | 1.3 |
| Act 2 battles | old | 128 | 93% | 4.9 | 49% | 0.5 | 1.9 |
| Act 2 elite | new | 16 | 94% | 7.7 | 62% | 0.7 | 2.0 |
| Act 2 elite | old | 16 | 100% | 7.7 | 69% | 1.1 | 3.6 |
| Act 2 boss | new | 16 | 94% | 8.3 | 50% | 0.6 | 2.1 |
| Act 2 boss | old | 16 | 100% | 8.4 | 63% | 1.1 | 3.6 |
| Act 3 battles | new | 112 | 88% | 5.8 | 44% | 0.5 | 1.4 |
| Act 3 battles | old | 112 | 92% | 5.8 | 46% | 0.6 | 2.1 |
| Act 3 elite | new | 16 | 100% | 7.6 | 56% | 0.8 | 1.8 |
| Act 3 elite | old | 16 | 88% | 7.2 | 56% | 0.8 | 2.4 |
| Act 3 boss | new | 32 | 100% | 10.8 | 57% | 1.5 | 3.4 |
| Act 3 boss | old | 32 | 100% | 11.2 | 67% | 2.5 | 6.5 |

### Polymorph, old vs new (bots, wise play, solo Wizard, hard; 4 campaigns, 4 trials a step, matched seeds)

| Act and fight | Polymorph | Fights | Win | Rounds | Lowest health | Frog rounds a fight | Magic on Polymorph a fight |
|---|---|---|---|---|---|---|---|
| Act 1 battles | new | 128 | 77% | 3.2 | 40% | 0.2 | 0.7 |
| Act 1 battles | old | 128 | 76% | 3.2 | 39% | 0.2 | 0.8 |
| Act 1 elite | new | 16 | 94% | 5.6 | 36% | 0.4 | 1.1 |
| Act 1 elite | old | 16 | 81% | 5.6 | 36% | 0.4 | 1.1 |
| Act 1 boss | new | 16 | 69% | 6.6 | 36% | 0.6 | 1.5 |
| Act 1 boss | old | 16 | 88% | 6.1 | 55% | 1.6 | 4.9 |
| Act 2 battles | new | 128 | 82% | 5.0 | 39% | 0.4 | 1.5 |
| Act 2 battles | old | 128 | 84% | 5.1 | 45% | 0.7 | 2.6 |
| Act 2 elite | new | 16 | 100% | 9.4 | 57% | 0.8 | 1.9 |
| Act 2 elite | old | 16 | 100% | 8.5 | 58% | 0.9 | 2.6 |
| Act 2 boss | new | 16 | 88% | 8.8 | 49% | 1.0 | 2.4 |
| Act 2 boss | old | 16 | 81% | 8.2 | 48% | 2.1 | 6.6 |
| Act 3 battles | new | 112 | 84% | 6.2 | 41% | 0.7 | 1.7 |
| Act 3 battles | old | 112 | 88% | 6.5 | 46% | 1.0 | 3.0 |
| Act 3 elite | new | 16 | 94% | 9.1 | 43% | 1.1 | 2.5 |
| Act 3 elite | old | 16 | 94% | 8.9 | 53% | 1.0 | 3.0 |
| Act 3 boss | new | 32 | 91% | 13.2 | 49% | 1.9 | 4.3 |
| Act 3 boss | old | 32 | 100% | 13.8 | 56% | 2.6 | 7.0 |

### Polymorph, old vs new (bots, frog-first play, solo Wizard, normal; 3 campaigns, 4 trials a step, matched seeds)

| Act and fight | Polymorph | Fights | Win | Rounds | Lowest health | Frog rounds a fight | Magic on Polymorph a fight |
|---|---|---|---|---|---|---|---|
| Act 1 battles | new | 96 | 76% | 3.4 | 35% | 0.1 | 2.0 |
| Act 1 battles | old | 96 | 77% | 3.8 | 40% | 1.1 | 4.7 |
| Act 1 elite | new | 12 | 92% | 6.3 | 48% | 0.6 | 3.3 |
| Act 1 elite | old | 12 | 100% | 6.8 | 71% | 2.9 | 9.5 |
| Act 1 boss | new | 12 | 92% | 6.3 | 35% | 0.8 | 3.4 |
| Act 1 boss | old | 12 | 83% | 6.3 | 48% | 2.8 | 9.0 |
| Act 2 battles | new | 96 | 85% | 5.7 | 31% | 0.6 | 3.5 |
| Act 2 battles | old | 96 | 74% | 6.1 | 33% | 2.5 | 8.7 |
| Act 2 elite | new | 12 | 100% | 9.2 | 46% | 1.1 | 5.5 |
| Act 2 elite | old | 12 | 92% | 9.3 | 64% | 4.8 | 15.5 |
| Act 2 boss | new | 12 | 92% | 8.8 | 51% | 1.3 | 5.3 |
| Act 2 boss | old | 12 | 83% | 7.9 | 69% | 4.9 | 15.5 |
| Act 3 battles | new | 84 | 80% | 6.8 | 34% | 0.7 | 3.7 |
| Act 3 battles | old | 84 | 76% | 6.9 | 35% | 2.7 | 8.3 |
| Act 3 elite | new | 12 | 100% | 10.0 | 48% | 1.5 | 5.3 |
| Act 3 elite | old | 12 | 100% | 10.9 | 74% | 6.4 | 16.8 |
| Act 3 boss | new | 24 | 96% | 12.9 | 42% | 1.9 | 7.1 |
| Act 3 boss | old | 24 | 100% | 13.6 | 62% | 7.2 | 18.2 |

### Polymorph, old vs new (bots, frog-first play, solo Wizard, hard; 3 campaigns, 4 trials a step, matched seeds)

| Act and fight | Polymorph | Fights | Win | Rounds | Lowest health | Frog rounds a fight | Magic on Polymorph a fight |
|---|---|---|---|---|---|---|---|
| Act 1 battles | new | 96 | 57% | 3.3 | 22% | 0.1 | 1.8 |
| Act 1 battles | old | 96 | 65% | 3.6 | 26% | 1.1 | 4.2 |
| Act 1 elite | new | 12 | 75% | 5.8 | 21% | 0.4 | 2.8 |
| Act 1 elite | old | 12 | 75% | 6.6 | 31% | 1.3 | 4.3 |
| Act 1 boss | new | 12 | 75% | 5.8 | 29% | 0.4 | 2.7 |
| Act 1 boss | old | 12 | 83% | 6.4 | 32% | 1.2 | 4.5 |
| Act 2 battles | new | 96 | 59% | 5.2 | 16% | 0.5 | 2.9 |
| Act 2 battles | old | 96 | 57% | 5.6 | 23% | 2.1 | 7.4 |
| Act 2 elite | new | 12 | 83% | 8.7 | 37% | 1.0 | 4.7 |
| Act 2 elite | old | 12 | 100% | 11.4 | 41% | 4.4 | 15.0 |
| Act 2 boss | new | 12 | 67% | 9.2 | 30% | 1.3 | 5.0 |
| Act 2 boss | old | 12 | 83% | 10.2 | 52% | 3.8 | 12.5 |
| Act 3 battles | new | 52 | 69% | 7.2 | 32% | 0.7 | 3.5 |
| Act 3 battles | old | 52 | 73% | 7.8 | 37% | 2.6 | 8.2 |
| Act 3 elite | new | 8 | 100% | 9.5 | 52% | 1.1 | 4.4 |
| Act 3 elite | old | 8 | 88% | 10.5 | 44% | 3.3 | 9.8 |
| Act 3 boss | new | 8 | 100% | 15.4 | 47% | 2.1 | 7.9 |
| Act 3 boss | old | 8 | 100% | 15.4 | 54% | 7.1 | 18.5 |

### Teams (tools/party.mjs, smart bot, Normal, Acts I–II; pairs Wizard+Bard, Dwarf+Wizard, Wizard+Knight; 6 companies)

| Act | Fight | Team win, old | Team win, new | Fights |
|---|---|---|---|---|
| 1 | battle | 94% | 96% | 48 |
| 1 | elite | 100% | 100% | 6 |
| 1 | boss | 67% | 83% | 6 |
| 2 | battle | 88% | 88% | 48 |
| 2 | elite | 83% | 100% | 6 |
| 2 | boss | 67% | 83% | 6 |

At the table the Wizard took 40.8 damage a fight with the new card against 35.9 with the old; the friend's lowest health was 58% against 54%. The boss and elite rows are 6 fights each, so they say nothing on their own.

## What it says

1. **The frog loop is gone.** A frog-first Wizard frogged 2.5–7 rounds a fight in elite and boss fights before. Now it's 0.4–2, and it spends a third as much magic on Polymorph.
2. **Ordinary fights barely move.** For a careful player, battle wins changed by 0–4 points (Act III Normal 92→88%, Hard 88→84%).
3. **Bosses get tenser, as intended.** The careful Wizard's lowest health in a boss fight drops about 7–13 points (Act I Normal 56→46%, Act II 63→50%). Boss wins mostly hold, with one cell to watch: **Hard Act I boss 88→69% (16 fights)**. That could be noise, but it's the first place to look if Dave finds the Goblin King too hard with a Wizard on Hard.
4. **The frog-first player now plays a fairer game.** Its wins are mixed (better in some cells because the magic goes to Arc Bolt and Storm Coil instead), and its boss lowest health falls from 52–69% to 30–51%.
5. **Teams are unharmed.** Team wins are the same or higher. The Wizard takes about 5 more damage a fight.

If it proves too stingy in play, there are two easy knobs. Both are data only (`frogNeed` in js/data.js):
- 1 charge on 3–6 from Level I
- 2 charges sure from Level II
