# QuestDice balance notes

Measured with `node tools/balance.mjs` (Act I, bot players, 5 campaigns per class). Bots reroll cleverly but never misread a screen, so
read these as upper bounds on how strong a human is. Re-run after any rules change.

## What one round is worth (normal difficulty)
| stage | attack | block | pierce | heal | magic | gold | damage taken |
|---|---|---|---|---|---|---|---|
| early (fights 1-3) | 11.6 | 6.4 | 5.9 | 0.4 | 3.6 | 3.1 | 2.8 |
| middle (4-7) | 15.3 | 9.8 | 5.0 | 1.9 | 3.9 | 6.2 | 2.5 |
| late (8-10) | 18.1 | 10.0 | 4.6 | 2.4 | 3.0 | 8.3 | 4.6 |

Reading it: a round earns about 12-18 attack, 6-10 block, 4-6 pierce, 3-4 magic and 3-8 gold. Block is almost always enough, so monsters hurt less
than they could; that is where Hard gets its teeth.

## Difficulty (monsters only; rules never change)
| level | monster health | flat damage per hit | gold | bot clears Act I | defeats per run | rounds per fight |
|---|---|---|---|---|---|---|
| Easy | x0.8 | -1 | x1 | 100% | 0.00 | 4.0 |
| Normal | x1 | 0 | x1 | 100% | 0.24 | 4.7 |
| Hard | x1.3 | +2 | x1.15 | 92% | 0.88 | 5.7 |

Targets while we have no human data: Normal should lose a fight now and then to a careless player, Hard should hurt the bot. Tune after real play.

## Economy
Income is about 27 gold a normal fight, 57 an elite, 85 a boss, roughly 350 gold for Act I. Prices: first bonus die 15 (affordable after fight one),
second 30-35, symbol slots 25 each, hand dice 40/100/220, weapon forge 40/120/300, weapon training 30/80/180.
Principle: the first upgrade costs about half a fight, the next two to four fights, the top steps eight to ten.

## Talent dice
- Symbols: attack, block, magic, heal (x2), gold (x0.5). Pierce is NOT allowed on talent dice (it ignores block and has no defence); it lives on weapons, cards and the number 2.
- A d4 hand averages 2.5, d6 3.5, d8 4.5, d10 5.5. A symbol is worth that average times its multiplier, shown in the camp picker.
- Max two of one symbol per die, two symbols per face, 25 gold per slot.
