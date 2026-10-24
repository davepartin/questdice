# T19 part 2: raw tables (Claude, 24 October 2026)

Produced by `tools/t19-party.mjs` (read-only; bot heroes; released rules). Win rate and round tables: 10 fights per cell (one fight is ±15 points at this size). Per-blow damage tables: a separate run of 6 fights per cell. Rounds are not elapsed time.

## Designed step 10 boss

| Table | Heroes | Company factor m (hero strengths: low to high) | Foes at the start (health each) | Boss max health | Team +hit | Win % | Rounds p50 / p90 / max | Boss-only rounds | Heroes who fell | Table dealt per round | Share of damage taken by the worst-hit hero | Share of damage dealt by the top hero | Revives | Lowest hero health (mean) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Solo | 1 | 1.0 (73-73) | vharaxis 690 | 690 | +0 | 100 | 17 / 32 / 32 | 18.0 | 0.0 of 1 | 41 | 100% | 100% | 0.0 | 55% |
| Equal | 2 | 1.9 (61-73) | vharaxis 1376 | 1442 | +9 | 100 | 16 / 20 / 20 | 15.5 | 0.2 of 2 | 95 | 58% | 55% | 0.0 | 45% |
| Half strong, half end of Act II | 2 | 1.7 (47-73) | vharaxis 1220 | 1246 | +7 | 100 | 15 / 19 / 19 | 14.3 | 0.3 of 2 | 88 | 63% | 60% | 0.0 | 45% |
| One strong, rest level-1 | 2 | 1.2 (16-73) | vharaxis 863 | 890 | +2 | 100 | 15 / 29 / 29 | 15.2 | 0.2 of 2 | 62 | 65% | 74% | 0.0 | 39% |
| Equal | 4 | 3.7 (56-73) | vharaxis 2744, goblin 74 | 2885 | +27 | 90 | 14 / 17 / 17 | 13.2 | 0.7 of 4 | 208 | 33% | 31% | 0.0 | 35% |
| Half strong, half end of Act II | 4 | 3.4 (50-73) | vharaxis 2541, goblin 74 | 2707 | +24 | 100 | 13 / 16 / 16 | 12.3 | 0.1 of 4 | 210 | 34% | 29% | 0.0 | 40% |
| One strong, rest level-1 | 4 | 1.7 (14-73) | vharaxis 1212, goblin 74 | 1288 | +7 | 100 | 11 / 19 / 19 | 10.8 | 1.2 of 4 | 119 | 41% | 45% | 0.0 | 30% |
| Equal | 6 | 5.3 (56-73) | vharaxis 4144, goblin 74, goblin 74 | 4249 | +43 | 80 | 14 / 18 / 18 | 11.8 | 2.7 of 6 | 305 | 23% | 22% | 0.0 | 18% |
| Half strong, half end of Act II | 6 | 4.9 (44-73) | vharaxis 3755, goblin 74, goblin 74 | 3946 | +39 | 80 | 13 / 25 / 25 | 12.4 | 2.1 of 6 | 290 | 22% | 22% | 0.0 | 20% |
| One strong, rest level-1 | 6 | 2.2 (13-73) | vharaxis 1545, goblin 74, goblin 74 | 1686 | +12 | 90 | 15 / 26 / 26 | 12.1 | 3.4 of 6 | 129 | 29% | 42% | 0.0 | 13% |

## Nemesis return as Dave met it

| Table | Heroes | Company factor m (hero strengths: low to high) | Foes at the start (health each) | Boss max health | Team +hit | Win % | Rounds p50 / p90 / max | Boss-only rounds | Heroes who fell | Table dealt per round | Share of damage taken by the worst-hit hero | Share of damage dealt by the top hero | Revives | Lowest hero health (mean) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Solo | 1 | 1.0 (73-73) | vharaxis 651, gloomstalker 179, dirgesinger 165 | 1002 | +0 | 40 | 14 / 43 / 43 | 7.2 | 0.6 of 1 | 41 | 100% | 100% | 0.0 | 10% |
| Equal | 2 | 1.9 (61-73) | vharaxis 1299, gloomstalker 357, dirgesinger 328 | 2095 | +9 | 60 | 23 / 65 / 65 | 12.4 | 1.1 of 2 | 84 | 55% | 58% | 0.0 | 15% |
| Half strong, half end of Act II | 2 | 1.7 (47-73) | vharaxis 1152, gloomstalker 317, dirgesinger 291 | 1809 | +7 | 70 | 22 / 62 / 62 | 16.6 | 0.9 of 2 | 72 | 65% | 67% | 0.0 | 14% |
| One strong, rest level-1 | 2 | 1.2 (16-73) | vharaxis 814, gloomstalker 224, dirgesinger 206 | 1292 | +2 | 40 | 14 / 42 / 42 | 7.4 | 1.6 of 2 | 51 | 74% | 86% | 0.0 | 6% |
| Equal | 4 | 3.7 (56-73) | vharaxis 2590, gloomstalker 712, dirgesinger 655, goblin 107 | 4190 | +27 | 40 | 14 / 22 / 22 | 5.1 | 2.7 of 4 | 183 | 32% | 32% | 0.0 | 10% |
| Half strong, half end of Act II | 4 | 3.4 (50-73) | vharaxis 2399, gloomstalker 659, dirgesinger 606, goblin 107 | 3932 | +24 | 40 | 20 / 40 / 40 | 9.9 | 3.2 of 4 | 159 | 33% | 32% | 0.0 | 6% |
| One strong, rest level-1 | 4 | 1.7 (14-73) | vharaxis 1145, gloomstalker 314, dirgesinger 289, goblin 107 | 1870 | +7 | 60 | 16 / 43 / 43 | 8.2 | 2.9 of 4 | 84 | 44% | 58% | 0.0 | 8% |
| Equal | 6 | 5.3 (56-73) | vharaxis 3912, gloomstalker 1075, dirgesinger 989, goblin 107, goblin 107 | 6171 | +43 | 0 | 9 / 25 / 25 | 1.6 | 6.0 of 6 | 236 | 23% | 26% | 0.0 | 0% |
| Half strong, half end of Act II | 6 | 4.9 (44-73) | vharaxis 3544, gloomstalker 974, dirgesinger 896, goblin 107, goblin 107 | 5731 | +39 | 0 | 9 / 20 / 20 | 1.8 | 6.0 of 6 | 207 | 27% | 31% | 0.0 | 0% |
| One strong, rest level-1 | 6 | 2.2 (13-73) | vharaxis 1459, gloomstalker 401, dirgesinger 369, goblin 107, goblin 107 | 2449 | +12 | 30 | 12 / 42 / 42 | 8.7 | 5.7 of 6 | 103 | 40% | 52% | 0.0 | 1% |


---

## Per-blow damage (6 fights per cell)

### Designed step 10 boss: what one blow costs each hero

| Table | Hero max health (mean) | Breath blows (Inferno and slam): full size, then what EACH hero takes, worst single part, per hero after block | Other blows: full size, per hero (one blow is split between the heroes, the slowest takes a double share) |
|---|---|---|---|
| Solo (1) | 85 | 31 full; 19.2 each (23% of a hero); worst 30; 6.8 after block | 27 full; 26.7 each (31%); worst 36 |
| Equal (2) | 87 | 42 full; 25.4 each (29% of a hero); worst 38; 13.1 after block | 35 full; 18.5 each (21%); worst 45 |
| Half strong, half end of Act II (2) | 76 | 39 full; 23.7 each (31% of a hero); worst 33; 12.0 after block | 38 full; 18.8 each (25%); worst 33 |
| One strong, rest level-1 (2) | 58 | 34 full; 20.9 each (36% of a hero); worst 33; 8.3 after block | 29 full; 16.6 each (29%); worst 34 |
| Equal (4) | 85 | 58 full; 35.4 each (42% of a hero); worst 45; 18.8 after block | 54 full; 13.9 each (16%); worst 31 |
| Half strong, half end of Act II (4) | 80 | 59 full; 35.6 each (45% of a hero); worst 46; 19.2 after block | 54 full; 13.5 each (17%); worst 27 |
| One strong, rest level-1 (4) | 45 | 40 full; 24.5 each (55% of a hero); worst 38; 12.5 after block | 34 full; 8.7 each (20%); worst 19 |
| Equal (6) | 85 | 78 full; 47.3 each (55% of a hero); worst 55; 27.3 after block | 69 full; 12.0 each (14%); worst 26 |
| Half strong, half end of Act II (6) | 79 | 72 full; 43.7 each (55% of a hero); worst 56; 23.0 after block | 58 full; 9.9 each (13%); worst 23 |
| One strong, rest level-1 (6) | 40 | 43 full; 26.2 each (65% of a hero); worst 39; 15.4 after block | 36 full; 11.0 each (27%); worst 44 |

## Nemesis return as Dave met it

| Table | Heroes | Company factor m (hero strengths: low to high) | Foes at the start (health each) | Boss max health | Team +hit | Win % | Rounds p50 / p90 / max | Boss-only rounds | Heroes who fell | Table dealt per round | Share of damage taken by the worst-hit hero | Share of damage dealt by the top hero | Revives | Lowest hero health (mean) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Solo | 1 | 1.0 (73-73) | vharaxis 651, gloomstalker 179, dirgesinger 165 | 1002 | +0 | 50 | 19 / 43 / 43 | 9.5 | 0.5 of 1 | 37 | 100% | 100% | 0.0 | 12% |
| Equal | 2 | 1.9 (61-73) | vharaxis 1299, gloomstalker 357, dirgesinger 328 | 2088 | +9 | 83 | 27 / 65 / 65 | 18.0 | 0.8 of 2 | 76 | 55% | 59% | 0.0 | 17% |
| Half strong, half end of Act II | 2 | 1.7 (47-73) | vharaxis 1152, gloomstalker 317, dirgesinger 291 | 1824 | +7 | 83 | 38 / 62 / 62 | 22.2 | 0.8 of 2 | 66 | 65% | 69% | 0.0 | 14% |
| One strong, rest level-1 | 2 | 1.2 (16-73) | vharaxis 814, gloomstalker 224, dirgesinger 206 | 1288 | +3 | 67 | 25 / 42 / 42 | 11.2 | 1.3 of 2 | 51 | 74% | 85% | 0.0 | 10% |
| Equal | 4 | 3.7 (56-73) | vharaxis 2590, gloomstalker 712, dirgesinger 655, goblin 107 | 4200 | +27 | 50 | 18 / 21 / 21 | 4.8 | 2.2 of 4 | 188 | 34% | 32% | 0.0 | 14% |
| Half strong, half end of Act II | 4 | 3.4 (50-73) | vharaxis 2399, gloomstalker 659, dirgesinger 606, goblin 107 | 3902 | +24 | 50 | 22 / 40 / 40 | 11.3 | 3.2 of 4 | 160 | 33% | 31% | 0.0 | 7% |
| One strong, rest level-1 | 4 | 1.7 (14-73) | vharaxis 1145, gloomstalker 314, dirgesinger 289, goblin 107 | 1859 | +7 | 67 | 18 / 43 / 43 | 10.2 | 3.0 of 4 | 85 | 47% | 59% | 0.0 | 7% |
| Equal | 6 | 5.3 (56-73) | vharaxis 3912, gloomstalker 1075, dirgesinger 989, goblin 107, goblin 107 | 6229 | +44 | 0 | 8 / 25 / 25 | 2.7 | 6.0 of 6 | 230 | 23% | 28% | 0.0 | 0% |
| Half strong, half end of Act II | 6 | 4.9 (44-73) | vharaxis 3544, gloomstalker 974, dirgesinger 896, goblin 107, goblin 107 | 5698 | +39 | 0 | 9 / 20 / 20 | 1.8 | 6.0 of 6 | 205 | 26% | 30% | 0.0 | 0% |
| One strong, rest level-1 | 6 | 2.2 (13-73) | vharaxis 1459, gloomstalker 401, dirgesinger 369, goblin 107, goblin 107 | 2427 | +12 | 17 | 11 / 42 / 42 | 5.2 | 5.8 of 6 | 100 | 40% | 53% | 0.0 | 1% |

### Nemesis return as Dave met it: what one blow costs each hero

| Table | Hero max health (mean) | Breath blows (Inferno and slam): full size, then what EACH hero takes, worst single part, per hero after block | Other blows: full size, per hero (one blow is split between the heroes, the slowest takes a double share) |
|---|---|---|---|
| Solo (1) | 85 | 34 full; 20.6 each (24% of a hero); worst 29; 5.1 after block | 23 full; 23.1 each (27%); worst 39 |
| Equal (2) | 87 | 40 full; 24.6 each (28% of a hero); worst 35; 8.5 after block | 32 full; 20.0 each (23%); worst 46 |
| Half strong, half end of Act II (2) | 76 | 39 full; 23.5 each (31% of a hero); worst 38; 8.7 after block | 31 full; 20.3 each (27%); worst 45 |
| One strong, rest level-1 (2) | 58 | 36 full; 22.3 each (39% of a hero); worst 33; 10.6 after block | 26 full; 19.9 each (34%); worst 42 |
| Equal (4) | 85 | 59 full; 36.1 each (42% of a hero); worst 48; 21.1 after block | 50 full; 17.5 each (21%); worst 55 |
| Half strong, half end of Act II (4) | 80 | 58 full; 35.0 each (44% of a hero); worst 52; 19.5 after block | 47 full; 14.9 each (19%); worst 54 |
| One strong, rest level-1 (4) | 45 | 42 full; 25.5 each (57% of a hero); worst 35; 13.7 after block | 30 full; 15.3 each (34%); worst 43 |
| Equal (6) | 85 | 74 full; 44.9 each (53% of a hero); worst 56; 33.7 after block | 66 full; 22.4 each (26%); worst 73 |
| Half strong, half end of Act II (6) | 79 | 71 full; 43.1 each (55% of a hero); worst 50; 30.6 after block | 62 full; 21.5 each (27%); worst 69 |
| One strong, rest level-1 (6) | 40 | 45 full; 27.4 each (68% of a hero); worst 36; 12.4 after block | 36 full; 17.7 each (44%); worst 60 |

