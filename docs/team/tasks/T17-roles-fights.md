# T17 candidate weapon faces: bot fights, today against candidate (PROPOSED, nothing live changes)

Same hero (knight shell), same encounters and seeds (40 matched fights a cell, so about plus or minus 8 points on a win rate; only gaps of about 20 points mean anything), only the faces change: today = the live faces, candidate = js/weaponladder.js. Run with `RELEASE=1 [T17_CAND=1] ENC=<n,..> node tools/t22-weapons.mjs 40 <out.md>`; the raw per-cell files are the `.md` and `.json` that tool writes. Bots, not people: they play the same everywhere, so this compares face tables with each other and says nothing about how a person plays.


## Act I step 2, Bronze d4

| Weapons | win % today | win % candidate | rounds today | rounds candidate | taken / round today | taken / round candidate | dealt / round today | dealt / round candidate |
|---|---|---|---|---|---|---|---|---|
| Dagger + Round Shield | 98 | 98 | 4.4 | 4.3 | 4.1 | 3.8 | 15.2 | 15.4 |
| Sword + Round Shield | 100 | 100 | 4.2 | 3.8 | 3.5 | 3.4 | 16.3 | 17.7 |
| Axe + Round Shield | 100 | 100 | 4.0 | 4.2 | 3.5 | 3.9 | 17.1 | 16.5 |
| Spear + Round Shield | 100 | 100 | 4.2 | 3.8 | 4.1 | 3.4 | 16.4 | 17.7 |
| Sword + Tower Shield | 100 | 100 | 4.5 | 4.0 | 2.9 | 3.9 | 15.4 | 17.1 |
| Dagger + Tower Shield | 100 | 100 | 4.7 | 4.5 | 3.4 | 3.3 | 14.3 | 15.5 |
| Dagger + Dagger | 95 | 98 | 3.3 | 4.2 | 6.6 | 4.5 | 19.2 | 15.9 |
| Sword + Sword | 100 | 100 | 3.5 | 3.6 | 5.3 | 4.3 | 19.0 | 18.8 |
| Axe + Axe | 100 | 100 | 3.5 | 3.7 | 5.9 | 4.4 | 19.5 | 18.2 |
| Arrows (normal) + Bow | 100 | 100 | 4.0 | 3.6 | 4.4 | 4.7 | 17.3 | 18.8 |
| Arrows (piercing) + Bow | 95 | 100 | 3.8 | 3.6 | 5.7 | 4.9 | 17.7 | 18.8 |
| Arrows (fire) + Bow | 95 | 100 | 3.6 | 3.5 | 5.5 | 4.7 | 18.3 | 19.3 |
| Arrows (frost) + Bow | 95 | 100 | 3.6 | 3.6 | 5.5 | 4.7 | 18.1 | 18.8 |

## Act II step 5, Silver d6

| Weapons | win % today | win % candidate | rounds today | rounds candidate | taken / round today | taken / round candidate | dealt / round today | dealt / round candidate |
|---|---|---|---|---|---|---|---|---|
| Dagger + Round Shield | 58 | 58 | 12.2 | 13.3 | 9.0 | 8.4 | 17.3 | 14.1 |
| Sword + Round Shield | 68 | 72 | 12.9 | 12.1 | 7.9 | 7.8 | 16.6 | 18.7 |
| Axe + Round Shield | 60 | 52 | 10.8 | 11.0 | 9.3 | 9.2 | 17.6 | 17.3 |
| Spear + Round Shield | 55 | 58 | 11.6 | 13.6 | 9.0 | 8.0 | 17.3 | 14.9 |
| Sword + Tower Shield | 48 | 55 | 16.8 | 12.3 | 7.2 | 7.3 | 9.8 | 13.8 |
| Dagger + Tower Shield | 78 | 58 | 15.2 | 14.4 | 6.9 | 7.3 | 13.5 | 13.9 |
| Dagger + Dagger | 60 | 48 | 8.9 | 11.2 | 11.3 | 9.2 | 22.1 | 16.5 |
| Sword + Sword | 68 | 55 | 9.9 | 10.7 | 8.5 | 10.4 | 24.0 | 18.3 |
| Axe + Axe | 50 | 48 | 8.2 | 8.8 | 11.0 | 11.0 | 25.0 | 23.2 |
| Arrows (normal) + Bow | 48 | 60 | 9.8 | 9.7 | 10.5 | 9.9 | 17.2 | 21.6 |
| Arrows (piercing) + Bow | 52 | 52 | 9.3 | 9.7 | 10.3 | 10.0 | 22.1 | 21.0 |
| Arrows (fire) + Bow | 72 | 62 | 9.8 | 9.8 | 9.2 | 9.7 | 24.1 | 22.0 |
| Arrows (frost) + Bow | 65 | 65 | 9.9 | 10.2 | 8.5 | 9.0 | 22.5 | 21.4 |

## Act III step 8, Gold d8

| Weapons | win % today | win % candidate | rounds today | rounds candidate | taken / round today | taken / round candidate | dealt / round today | dealt / round candidate |
|---|---|---|---|---|---|---|---|---|
| Dagger + Round Shield | 52 | 48 | 10.4 | 11.1 | 14.8 | 14.3 | 28.4 | 24.9 |
| Sword + Round Shield | 55 | 42 | 9.9 | 10.4 | 14.8 | 14.9 | 30.3 | 26.2 |
| Axe + Round Shield | 60 | 52 | 10.3 | 9.4 | 14.1 | 16.0 | 30.2 | 29.8 |
| Spear + Round Shield | 50 | 40 | 9.0 | 8.6 | 16.3 | 16.8 | 29.9 | 28.0 |
| Sword + Tower Shield | 60 | 48 | 11.6 | 11.2 | 13.4 | 14.2 | 26.7 | 24.1 |
| Dagger + Tower Shield | 72 | 58 | 13.2 | 12.6 | 11.9 | 12.7 | 25.9 | 25.3 |
| Dagger + Dagger | 38 | 42 | 6.8 | 9.2 | 22.2 | 16.6 | 34.9 | 28.4 |
| Sword + Sword | 35 | 42 | 6.9 | 9.1 | 20.2 | 16.5 | 34.1 | 31.1 |
| Axe + Axe | 28 | 30 | 6.0 | 6.3 | 22.3 | 22.7 | 36.9 | 36.7 |
| Arrows (normal) + Bow | 35 | 30 | 6.5 | 7.4 | 22.1 | 20.2 | 34.0 | 30.2 |
| Arrows (piercing) + Bow | 42 | 28 | 7.3 | 7.5 | 18.2 | 20.1 | 36.9 | 30.4 |
| Arrows (fire) + Bow | 40 | 35 | 6.5 | 7.5 | 20.1 | 19.8 | 39.1 | 30.5 |
| Arrows (frost) + Bow | 45 | 48 | 7.0 | 7.9 | 18.6 | 18.4 | 38.1 | 31.5 |

## Act III step 9, Gold d10

| Weapons | win % today | win % candidate | rounds today | rounds candidate | taken / round today | taken / round candidate | dealt / round today | dealt / round candidate |
|---|---|---|---|---|---|---|---|---|
| Dagger + Round Shield | 52 | 28 | 13.2 | 11.2 | 15.5 | 17.3 | 32.5 | 27.2 |
| Sword + Round Shield | 42 | 55 | 12.7 | 14.8 | 14.6 | 13.9 | 29.9 | 28.7 |
| Axe + Round Shield | 40 | 35 | 10.7 | 10.3 | 17.3 | 17.6 | 32.9 | 35.0 |
| Spear + Round Shield | 42 | 40 | 11.1 | 10.7 | 16.8 | 18.4 | 33.1 | 31.5 |
| Sword + Tower Shield | 72 | 68 | 18.1 | 17.9 | 9.4 | 11.4 | 25.8 | 24.7 |
| Dagger + Tower Shield | 78 | 65 | 18.2 | 18.1 | 10.8 | 10.9 | 27.7 | 24.3 |
| Dagger + Dagger | 18 | 28 | 7.0 | 10.8 | 25.2 | 17.5 | 36.2 | 27.8 |
| Sword + Sword | 25 | 32 | 8.5 | 9.5 | 21.6 | 19.7 | 36.1 | 33.4 |
| Axe + Axe | 25 | 10 | 7.8 | 6.2 | 21.2 | 24.8 | 42.2 | 39.2 |
| Arrows (normal) + Bow | 15 | 15 | 7.9 | 8.3 | 23.1 | 19.6 | 35.8 | 32.1 |
| Arrows (piercing) + Bow | 15 | 20 | 7.9 | 8.8 | 21.7 | 18.9 | 33.2 | 34.3 |
| Arrows (fire) + Bow | 25 | 25 | 7.3 | 10.6 | 23.4 | 15.9 | 34.8 | 35.3 |
| Arrows (frost) + Bow | 28 | 42 | 7.8 | 10.9 | 21.5 | 14.5 | 33.8 | 36.5 |

## Summary: mean and spread of the win rate across the 13 sets

| Encounter | today mean | today range | today sd | candidate mean | candidate range | candidate sd |
|---|---|---|---|---|---|---|
| Act I step 2, Bronze d4 | 98.3 | 95-100 | 2.3 | 99.6 | 98-100 | 0.9 |
| Act II step 5, Silver d6 | 60.0 | 48-78 | 9.2 | 57.1 | 48-72 | 6.6 |
| Act III step 8, Gold d8 | 47.1 | 28-72 | 12.2 | 41.7 | 28-58 | 8.7 |
| Act III step 9, Gold d10 | 36.7 | 15-78 | 19.8 | 35.6 | 10-68 | 17.3 |

The six sets with a shield, same measure:

| Encounter | today mean | candidate mean |
|---|---|---|
| Act I step 2, Bronze d4 | 99.6 | 99.6 |
| Act II step 5, Silver d6 | 60.8 | 58.8 |
| Act III step 8, Gold d8 | 58.3 | 47.9 |
| Act III step 9, Gold d10 | 54.6 | 48.3 |
