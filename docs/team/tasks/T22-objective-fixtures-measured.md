# Objective audit fixtures (bots, 200 two-hero fights per cell, released rules)

## Lone Wolf: "Never attack the monster a teammate attacks that round"

| Monsters at the start | Policy | Passes the card | Fights with a forced shared target (one monster left, both heroes striking) | Passes when no round was forced | Mean rounds |
|---|---|---|---|---|---|
| 1 | the ordinary bot | 0/200 (0%) | 200/200 (100%) | n/a | 1.2 |
| 1 | a hero who tries to avoid the teammate | 0/200 (0%) | 200/200 (100%) | n/a | 1.2 |
| 2 | the ordinary bot | 0/200 (0%) | 181/200 (91%) | 0/19 (0%) | 2.3 |
| 2 | a hero who tries to avoid the teammate | 91/200 (46%) | 109/200 (55%) | 91/91 (100%) | 2.5 |
| 3 | the ordinary bot | 0/200 (0%) | 176/200 (88%) | 0/24 (0%) | 3.4 |
| 3 | a hero who tries to avoid the teammate | 38/200 (19%) | 162/200 (81%) | 38/38 (100%) | 3.7 |
| 4 | the ordinary bot | 0/200 (0%) | 118/200 (59%) | 0/82 (0%) | 4.0 |
| 4 | a hero who tries to avoid the teammate | 139/200 (70%) | 61/200 (31%) | 139/139 (100%) | 4.0 |

## Glass Shield: "Have no block at all in 2 rounds"

Block comes from blue faces (a blue +0 still pays the hand's number) and block powers. "Dodger" throws back every die that shows a block face with the legal free rerolls; "ordinary" plays like the bot.

| Loadout | Policy | Rounds with zero block (mean per fight) | Passes the card (two zero-block rounds) | Mean fight length |
|---|---|---|---|---|
| Sword + Round Shield (Bronze d4) | ordinary | 0.3 | 7/200 (4%) | 4.3 |
| Sword + Round Shield (Bronze d4) | dodger | 2.8 | 167/200 (84%) | 5.7 |
| Sword + Tower Shield (Bronze d4) | ordinary | 0.2 | 4/200 (2%) | 4.5 |
| Sword + Tower Shield (Bronze d4) | dodger | 3.0 | 168/200 (84%) | 6.1 |
| Dagger + Dagger (Bronze d4) | ordinary | 1.5 | 101/200 (51%) | 3.4 |
| Dagger + Dagger (Bronze d4) | dodger | 2.4 | 135/200 (68%) | 4.9 |
| Arrows + Bow (Bronze d4) | ordinary | 1.2 | 64/200 (32%) | 3.9 |
| Arrows + Bow (Bronze d4) | dodger | 2.6 | 142/200 (71%) | 5.1 |
| Sword + Round Shield (Silver d6) | ordinary | 0.9 | 41/200 (21%) | 4.0 |
| Sword + Round Shield (Silver d6) | dodger | 2.3 | 134/200 (67%) | 4.4 |
