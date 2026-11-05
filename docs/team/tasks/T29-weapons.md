# T29 Weapons: six weapons with clear personalities (4 November 2026)

Dave: "We've made the weapons dice much more complicated than we need to… everybody is just trying to roll for straights and
triples and get high numbers. I just want the players to know I'm choosing the dagger because I like this, the sword because I
like that, the battle axe because I like this, or the staff because I want extra magic." Keep the Diamonds as one-fight treats.
Bronze is mostly numbers, Silver adds icons, Gold the most icons.

**Status: an experiment, not in the game.** `EXPERIMENT.weapons3` (off) in js/data.js, `WEAPONS3` (faces, icons, the one-line
"because"), and `faces3` in js/engine.js. Tool: `node tools/t29-weapons.mjs [fights a step] [out]` (`PART=faces|throws|fights`,
`WEAPONS=dagger,axe`). The Bow and its Arrows are unchanged. Nothing about Diamonds is changed yet.

## The rule

- Faces show only a number and a colour (A attack, B block). No hidden "+1s".
- Each weapon has **one icon**: Dagger **pierce**, Sword **gold** (its Gold top face also **pierces**), Axe **splash**
  (hits the other monsters), Staff **magic** on attack faces and **heal** on block faces, Shield **heal**.
- Metal adds icons, never numbers: **Bronze** on the top face, **Silver** on the top half, **Gold** on every face that can
  carry one. The top face is a crit worth 1, 2 or 3. An Axe's splash and a Staff's magic count double.

## The faces


### Dagger

_Steady hits, no blanks, and lots of matching numbers for triples. Pierce slips past armour._

| Size | Bronze | Silver | Gold |
|---|---|---|---|
| d4 | A1  A1  A2  A3·pierce | A1  A1  A2·pierce  A3·pierce2 | A1·pierce  A1·pierce  A2·pierce  A3·pierce3 |
| d6 | A1  A1  A2  A3  A3  A4·pierce | A1  A1  A2  A3·pierce  A3·pierce  A4·pierce2 | A1·pierce  A1·pierce  A2·pierce  A3·pierce  A3·pierce  A4·pierce3 |
| d8 | A1  A2  A2  A3  A4  A4  A5  A5·pierce | A1  A2  A2  A3  A4·pierce  A4·pierce  A5·pierce  A5·pierce2 | A1·pierce  A2·pierce  A2·pierce  A3·pierce  A4·pierce  A4·pierce  A5·pierce  A5·pierce3 |
| d10 | A1  A2  A3  A4  A4  A5  A5  A6  A6  A7·pierce | A1  A2  A3  A4  A4  A5·pierce  A5·pierce  A6·pierce  A6·pierce  A7·pierce2 | A1·pierce  A2·pierce  A3·pierce  A4·pierce  A4·pierce  A5·pierce  A5·pierce  A6·pierce  A6·pierce  A7·pierce3 |

### Sword

_A bit of everything, a little guard, and gold when it lands. The best face pierces too._

| Size | Bronze | Silver | Gold |
|---|---|---|---|
| d4 | A0  B2  A2  A4·gold | A0  B2  A2·gold  A4·gold2 | A0  B2  A2·gold  A4·gold3·pierce |
| d6 | A0  B2  A2  A3  B4  A5·gold | A0  B2  A2  A3·gold  B4  A5·gold2 | A0  B2  A2·gold  A3·gold  B4  A5·gold3·pierce |
| d8 | A0  B2  A2  A3  B4  A5  A6  A7·gold | A0  B2  A2  A3  B4  A5·gold  A6·gold  A7·gold2 | A0  B2  A2·gold  A3·gold  B4  A5·gold  A6·gold  A7·gold3·pierce |
| d10 | A0  B2  A2  A3  B4  A5  A6  B6  A8  A9·gold | A0  B2  A2  A3  B4  A5  A6·gold  B6  A8·gold  A9·gold2 | A0  B2  A2·gold  A3·gold  B4  A5·gold  A6·gold  B6  A8·gold  A9·gold3·pierce |

### Axe

_Big swings. Some blanks, but the top faces hit hard and splash onto the other monsters._

| Size | Bronze | Silver | Gold |
|---|---|---|---|
| d4 | A0  A0  A3  A5·splash2 | A0  A0  A3·splash2  A5·splash4 | A0  A0  A3·splash2  A5·splash6 |
| d6 | A0  A0  A0  A4  A6  A6·splash2 | A0  A0  A0  A4  A6·splash2  A6·splash4 | A0  A0  A0  A4·splash2  A6·splash2  A6·splash6 |
| d8 | A0  A0  A0  A3  A5  A6  A7  A8·splash2 | A0  A0  A0  A3  A5  A6·splash2  A7·splash2  A8·splash4 | A0  A0  A0  A3·splash2  A5·splash2  A6·splash2  A7·splash2  A8·splash6 |
| d10 | A0  A0  A0  A0  A5  A6  A7  A8  A9  A10·splash2 | A0  A0  A0  A0  A5  A6  A7  A8·splash2  A9·splash2  A10·splash4 | A0  A0  A0  A0  A5·splash2  A6·splash2  A7·splash2  A8·splash2  A9·splash2  A10·splash6 |

### Staff (two hands)

_Two hands, half attack and half block: magic on every strike, healing on every guard._

| Size | Bronze | Silver | Gold |
|---|---|---|---|
| d4 | B1  A2  B2  A3·magic2 | B1  A2  B2·heal  A3·magic4 | B1·heal  A2·magic2  B2·heal  A3·magic6 |
| d6 | B1  A2  B2  A3  B3  A4·magic2 | B1  A2  B2  A3·magic2  B3·heal  A4·magic4 | B1·heal  A2·magic2  B2·heal  A3·magic2  B3·heal  A4·magic6 |
| d8 | B1  A2  B2  A3  B3  A4  B4  A5·magic2 | B1  A2  B2  A3  B3·heal  A4·magic2  B4·heal  A5·magic4 | B1·heal  A2·magic2  B2·heal  A3·magic2  B3·heal  A4·magic2  B4·heal  A5·magic6 |
| d10 | B1  A2  B2  A3  B3  A4  B4  A5  B5  A6·magic2 | B1  A2  B2  A3  B3  A4·magic2  B4·heal  A5·magic2  B5·heal  A6·magic4 | B1·heal  A2·magic2  B2·heal  A3·magic2  B3·heal  A4·magic2  B4·heal  A5·magic2  B5·heal  A6·magic6 |

### Round Shield

_Stay standing: big blocks that heal you._

| Size | Bronze | Silver | Gold |
|---|---|---|---|
| d4 | B0  A2  B2  B4·heal | B0  A2  B2·heal  B4·heal2 | B0  A2  B2·heal  B4·heal3 |
| d6 | B0  A2  B2  B3  A4  B5·heal | B0  A2  B2  B3·heal  A4  B5·heal2 | B0  A2  B2·heal  B3·heal  A4  B5·heal3 |
| d8 | B0  A2  B2  B3  A4  B5  B6  B7·heal | B0  A2  B2  B3  A4  B5·heal  B6·heal  B7·heal2 | B0  A2  B2·heal  B3·heal  A4  B5·heal  B6·heal  B7·heal3 |
| d10 | B0  A2  B2  B3  A4  B5  B6  A6  B8  B9·heal | B0  A2  B2  B3  A4  B5  B6·heal  A6  B8·heal  B9·heal2 | B0  A2  B2·heal  B3·heal  A4  B5·heal  B6·heal  A6  B8·heal  B9·heal3 |


## One throw (Knight, weapon in the left hand, Round Shield in the right; the Staff takes both; 6000 throws, no rerolls or powers)

Attack + pierce is the weapon side's total hit; p10 to p90 is how wide the swings are.

| Weapon | Plan | Metal | Size | Attack | Pierce | Attack + pierce | p10 to p90 | Block | Heal | Magic | Gold | Splash | Triples a throw |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dagger | today | Bronze | d4 | 6.4 | 2.4 | 8.8 | 2 to 16 | 6.3 | 3.3 | 2.3 | 2.7 | 0.0 | 0.17 |
| Dagger | today | Bronze | d6 | 10.5 | 3.8 | 14.3 | 5 to 25 | 6.5 | 4.4 | 1.6 | 1.8 | 0.0 | 0.11 |
| Dagger | today | Bronze | d8 | 11.7 | 2.8 | 14.5 | 4 to 26 | 8.5 | 3.3 | 2.9 | 3.2 | 0.0 | 0.07 |
| Dagger | today | Bronze | d10 | 14.9 | 3.0 | 17.9 | 6 to 31 | 9.4 | 3.4 | 3.0 | 3.4 | 0.0 | 0.06 |
| Dagger | today | Gold | d4 | 6.4 | 2.9 | 9.3 | 2 to 17 | 6.3 | 5.0 | 2.6 | 2.7 | 0.0 | 0.17 |
| Dagger | today | Gold | d6 | 10.5 | 4.3 | 14.8 | 5 to 25 | 6.5 | 5.9 | 1.9 | 1.8 | 0.0 | 0.11 |
| Dagger | today | Gold | d8 | 11.7 | 3.4 | 15.1 | 5 to 27 | 8.5 | 4.7 | 3.1 | 3.2 | 0.0 | 0.07 |
| Dagger | today | Gold | d10 | 14.9 | 3.7 | 18.6 | 7 to 32 | 9.4 | 4.6 | 3.3 | 3.4 | 0.0 | 0.06 |
| Sword | today | Bronze | d4 | 6.8 | 2.4 | 9.2 | 2 to 18 | 6.6 | 3.3 | 2.3 | 2.7 | 0.0 | 0.23 |
| Sword | today | Bronze | d6 | 9.3 | 3.8 | 13.0 | 3 to 24 | 7.9 | 4.4 | 1.6 | 1.8 | 0.0 | 0.12 |
| Sword | today | Bronze | d8 | 10.9 | 2.8 | 13.7 | 3 to 25 | 9.7 | 3.3 | 2.9 | 3.2 | 0.0 | 0.07 |
| Sword | today | Bronze | d10 | 12.8 | 3.0 | 15.8 | 3 to 29 | 11.9 | 3.4 | 3.0 | 3.4 | 0.0 | 0.06 |
| Sword | today | Gold | d4 | 6.8 | 3.6 | 10.4 | 3 to 19 | 6.6 | 4.0 | 2.8 | 2.7 | 0.0 | 0.23 |
| Sword | today | Gold | d6 | 9.3 | 4.8 | 14.0 | 4 to 25 | 7.9 | 5.1 | 2.2 | 1.8 | 0.0 | 0.12 |
| Sword | today | Gold | d8 | 10.9 | 3.8 | 14.7 | 3 to 27 | 9.7 | 3.9 | 3.5 | 3.2 | 0.0 | 0.07 |
| Sword | today | Gold | d10 | 12.8 | 4.0 | 16.8 | 4 to 31 | 11.9 | 3.9 | 3.7 | 3.4 | 0.0 | 0.06 |
| Axe | today | Bronze | d4 | 7.1 | 2.4 | 9.5 | 2 to 18 | 6.3 | 3.3 | 2.3 | 2.7 | 0.0 | 0.21 |
| Axe | today | Bronze | d6 | 10.6 | 3.8 | 14.3 | 4 to 26 | 6.3 | 4.4 | 1.6 | 1.8 | 0.0 | 0.11 |
| Axe | today | Bronze | d8 | 12.0 | 2.8 | 14.8 | 4 to 26 | 8.3 | 3.3 | 2.9 | 3.2 | 0.0 | 0.07 |
| Axe | today | Bronze | d10 | 15.1 | 3.0 | 18.1 | 6 to 31 | 9.2 | 3.4 | 3.0 | 3.4 | 0.0 | 0.06 |
| Axe | today | Gold | d4 | 7.1 | 3.6 | 10.7 | 2 to 20 | 6.3 | 4.0 | 2.6 | 2.7 | 0.0 | 0.21 |
| Axe | today | Gold | d6 | 10.6 | 4.7 | 15.3 | 5 to 27 | 6.3 | 5.1 | 1.9 | 1.8 | 0.0 | 0.11 |
| Axe | today | Gold | d8 | 12.0 | 3.9 | 15.9 | 5 to 28 | 8.3 | 3.9 | 3.1 | 3.2 | 0.0 | 0.07 |
| Axe | today | Gold | d10 | 15.1 | 4.1 | 19.2 | 6 to 33 | 9.2 | 3.9 | 3.3 | 3.4 | 0.0 | 0.06 |
| Staff | today | Bronze | d4 | 10.4 | 2.4 | 12.8 | 5 to 22 | 3.9 | 3.3 | 2.8 | 2.7 | 0.0 | 0.23 |
| Staff | today | Bronze | d6 | 14.4 | 3.8 | 18.2 | 8 to 29 | 3.1 | 4.4 | 1.9 | 1.8 | 0.0 | 0.12 |
| Staff | today | Bronze | d8 | 16.2 | 2.8 | 19.0 | 7 to 32 | 5.4 | 3.3 | 3.1 | 3.2 | 0.0 | 0.07 |
| Staff | today | Bronze | d10 | 20.6 | 3.0 | 23.6 | 9 to 38 | 5.0 | 3.4 | 3.2 | 3.4 | 0.0 | 0.06 |
| Staff | today | Gold | d4 | 10.4 | 2.4 | 12.8 | 5 to 22 | 3.9 | 3.8 | 4.3 | 2.7 | 0.0 | 0.23 |
| Staff | today | Gold | d6 | 15.3 | 3.8 | 19.1 | 9 to 30 | 3.2 | 5.1 | 3.2 | 1.8 | 0.0 | 0.13 |
| Staff | today | Gold | d8 | 16.9 | 2.8 | 19.7 | 8 to 32 | 5.4 | 4.0 | 4.4 | 3.2 | 0.0 | 0.08 |
| Staff | today | Gold | d10 | 21.1 | 3.0 | 24.1 | 10 to 38 | 5.0 | 4.2 | 4.4 | 3.4 | 0.0 | 0.06 |
| Round Shield | today | Bronze | d4 | 3.7 | 2.4 | 6.1 | 0 to 13 | 9.7 | 3.3 | 2.3 | 2.7 | 0.0 | 0.23 |
| Round Shield | today | Bronze | d6 | 6.7 | 3.8 | 10.5 | 2 to 21 | 10.4 | 4.4 | 1.6 | 1.8 | 0.0 | 0.12 |
| Round Shield | today | Bronze | d8 | 5.9 | 2.8 | 8.7 | 0 to 20 | 14.7 | 3.3 | 2.9 | 3.2 | 0.0 | 0.07 |
| Round Shield | today | Bronze | d10 | 8.0 | 3.0 | 11.1 | 0 to 24 | 16.6 | 3.4 | 3.0 | 3.4 | 0.0 | 0.06 |
| Round Shield | today | Gold | d4 | 3.7 | 2.9 | 6.6 | 0 to 14 | 9.7 | 4.8 | 2.8 | 2.7 | 0.0 | 0.23 |
| Round Shield | today | Gold | d6 | 6.7 | 4.1 | 10.8 | 2 to 21 | 10.4 | 5.7 | 2.2 | 1.8 | 0.0 | 0.12 |
| Round Shield | today | Gold | d8 | 5.9 | 3.3 | 9.2 | 0 to 20 | 14.7 | 4.5 | 3.4 | 3.2 | 0.0 | 0.07 |
| Round Shield | today | Gold | d10 | 8.0 | 3.7 | 11.7 | 1 to 25 | 16.6 | 4.4 | 3.6 | 3.4 | 0.0 | 0.06 |
| Dagger | plan | Bronze | d4 | 8.1 | 2.6 | 10.7 | 5 to 18 | 5.4 | 3.5 | 2.3 | 2.7 | 0.0 | 0.21 |
| Dagger | plan | Bronze | d6 | 11.7 | 3.9 | 15.6 | 7 to 26 | 5.4 | 4.6 | 1.6 | 1.8 | 0.0 | 0.12 |
| Dagger | plan | Bronze | d8 | 13.1 | 2.9 | 16.0 | 7 to 27 | 7.5 | 3.4 | 2.9 | 3.2 | 0.0 | 0.09 |
| Dagger | plan | Bronze | d10 | 16.1 | 3.1 | 19.2 | 9 to 31 | 8.5 | 3.5 | 3.0 | 3.4 | 0.0 | 0.07 |
| Dagger | plan | Gold | d4 | 8.1 | 3.9 | 11.9 | 6 to 20 | 5.4 | 4.3 | 2.3 | 2.7 | 0.0 | 0.21 |
| Dagger | plan | Gold | d6 | 11.7 | 5.1 | 16.8 | 8 to 27 | 5.4 | 5.3 | 1.6 | 1.8 | 0.0 | 0.12 |
| Dagger | plan | Gold | d8 | 13.1 | 4.1 | 17.1 | 8 to 28 | 7.5 | 4.2 | 2.9 | 3.2 | 0.0 | 0.09 |
| Dagger | plan | Gold | d10 | 16.1 | 4.2 | 20.3 | 10 to 33 | 8.5 | 4.2 | 3.0 | 3.4 | 0.0 | 0.07 |
| Sword | plan | Bronze | d4 | 7.3 | 2.4 | 9.7 | 2 to 19 | 7.1 | 3.5 | 2.3 | 2.9 | 0.0 | 0.29 |
| Sword | plan | Bronze | d6 | 9.2 | 3.8 | 13.0 | 3 to 24 | 8.0 | 4.6 | 1.6 | 1.9 | 0.0 | 0.14 |
| Sword | plan | Bronze | d8 | 11.1 | 2.8 | 13.9 | 3 to 25 | 9.8 | 3.4 | 2.9 | 3.3 | 0.0 | 0.08 |
| Sword | plan | Bronze | d10 | 12.8 | 3.0 | 15.8 | 3 to 29 | 11.8 | 3.5 | 3.0 | 3.5 | 0.0 | 0.07 |
| Sword | plan | Gold | d4 | 7.3 | 2.6 | 10.0 | 2 to 19 | 7.1 | 4.3 | 2.3 | 3.6 | 0.0 | 0.29 |
| Sword | plan | Gold | d6 | 9.2 | 3.9 | 13.2 | 3 to 24 | 8.0 | 5.3 | 1.6 | 2.6 | 0.0 | 0.14 |
| Sword | plan | Gold | d8 | 11.1 | 2.9 | 14.0 | 3 to 26 | 9.8 | 4.2 | 2.9 | 4.0 | 0.0 | 0.08 |
| Sword | plan | Gold | d10 | 12.8 | 3.1 | 15.9 | 3 to 30 | 11.8 | 4.2 | 3.0 | 4.2 | 0.0 | 0.07 |
| Axe | plan | Bronze | d4 | 8.1 | 2.4 | 10.5 | 4 to 18 | 5.2 | 3.5 | 2.3 | 2.7 | 0.5 | 0.17 |
| Axe | plan | Bronze | d6 | 11.3 | 3.8 | 15.1 | 6 to 26 | 5.4 | 4.6 | 1.6 | 1.8 | 0.3 | 0.11 |
| Axe | plan | Bronze | d8 | 13.1 | 2.8 | 15.9 | 6 to 27 | 7.4 | 3.4 | 2.9 | 3.2 | 0.2 | 0.07 |
| Axe | plan | Bronze | d10 | 15.7 | 3.0 | 18.8 | 8 to 31 | 8.4 | 3.5 | 3.0 | 3.4 | 0.2 | 0.05 |
| Axe | plan | Gold | d4 | 8.1 | 2.4 | 10.5 | 4 to 18 | 5.2 | 4.3 | 2.3 | 2.7 | 1.9 | 0.17 |
| Axe | plan | Gold | d6 | 11.3 | 3.8 | 15.1 | 6 to 26 | 5.4 | 5.3 | 1.6 | 1.8 | 1.6 | 0.11 |
| Axe | plan | Gold | d8 | 13.1 | 2.8 | 15.9 | 6 to 27 | 7.4 | 4.2 | 2.9 | 3.2 | 1.7 | 0.07 |
| Axe | plan | Gold | d10 | 15.7 | 3.0 | 18.8 | 8 to 31 | 8.4 | 4.2 | 3.0 | 3.4 | 1.5 | 0.05 |
| Staff | plan | Bronze | d4 | 7.9 | 2.4 | 10.3 | 2 to 20 | 6.4 | 3.3 | 3.3 | 2.7 | 0.0 | 0.28 |
| Staff | plan | Bronze | d6 | 10.1 | 3.8 | 13.9 | 3 to 25 | 7.3 | 4.4 | 2.2 | 1.8 | 0.0 | 0.15 |
| Staff | plan | Bronze | d8 | 11.4 | 2.8 | 14.2 | 2 to 27 | 8.5 | 3.3 | 3.4 | 3.2 | 0.0 | 0.09 |
| Staff | plan | Bronze | d10 | 12.8 | 3.0 | 15.9 | 2 to 30 | 10.1 | 3.4 | 3.4 | 3.4 | 0.0 | 0.08 |
| Staff | plan | Gold | d4 | 7.9 | 2.4 | 10.3 | 2 to 20 | 6.4 | 4.3 | 6.2 | 2.7 | 0.0 | 0.28 |
| Staff | plan | Gold | d6 | 10.1 | 3.8 | 13.9 | 3 to 25 | 7.3 | 5.4 | 4.9 | 1.8 | 0.0 | 0.15 |
| Staff | plan | Gold | d8 | 11.4 | 2.8 | 14.2 | 2 to 27 | 8.5 | 4.3 | 5.9 | 3.2 | 0.0 | 0.09 |
| Staff | plan | Gold | d10 | 12.8 | 3.0 | 15.9 | 2 to 30 | 10.1 | 4.4 | 5.8 | 3.4 | 0.0 | 0.08 |
| Round Shield | plan | Bronze | d4 | 4.5 | 2.4 | 6.9 | 0 to 15 | 10.0 | 3.8 | 2.3 | 2.7 | 0.0 | 0.29 |
| Round Shield | plan | Bronze | d6 | 7.0 | 3.8 | 10.8 | 2 to 22 | 10.2 | 4.8 | 1.6 | 1.8 | 0.0 | 0.14 |
| Round Shield | plan | Bronze | d8 | 6.3 | 2.8 | 9.1 | 0 to 21 | 14.5 | 3.5 | 2.9 | 3.2 | 0.0 | 0.08 |
| Round Shield | plan | Bronze | d10 | 8.2 | 3.0 | 11.2 | 0 to 24 | 16.4 | 3.6 | 3.0 | 3.4 | 0.0 | 0.07 |
| Round Shield | plan | Gold | d4 | 4.5 | 2.4 | 6.9 | 0 to 15 | 10.0 | 5.3 | 2.3 | 2.7 | 0.0 | 0.29 |
| Round Shield | plan | Gold | d6 | 7.0 | 3.8 | 10.8 | 2 to 22 | 10.2 | 6.1 | 1.6 | 1.8 | 0.0 | 0.14 |
| Round Shield | plan | Gold | d8 | 6.3 | 2.8 | 9.1 | 0 to 21 | 14.5 | 5.0 | 2.9 | 3.2 | 0.0 | 0.08 |
| Round Shield | plan | Gold | d10 | 8.2 | 3.0 | 11.2 | 0 to 24 | 16.4 | 5.0 | 3.0 | 3.4 | 0.0 | 0.07 |

## Real fights (smart bot, 4 fights a step: d4 Act I steps 2-6 at level 3; d6 Act I 6-9 at level 5; d8 Act II at level 8; d10 Act III at level 12)

These heroes have bigger dice but no talent symbols or power ranks, so the late win rates are low on purpose; compare rows,
not the absolute numbers. About 16 to 24 fights a cell, so a 10-point gap is noise.

| Weapon | Plan | Metal | Size | Win | Rounds | Health left |
|---|---|---|---|---|---|---|
| Dagger | today | Bronze | d4 | 100% | 4.8 | 60% |
| Dagger | today | Bronze | d6 | 94% | 5.8 | 68% |
| Dagger | today | Bronze | d8 | 54% | 6.9 | 49% |
| Dagger | today | Bronze | d10 | 33% | 8.0 | 57% |
| Dagger | today | Gold | d4 | 100% | 4.3 | 74% |
| Dagger | today | Gold | d6 | 94% | 6.1 | 70% |
| Dagger | today | Gold | d8 | 63% | 7.7 | 57% |
| Dagger | today | Gold | d10 | 25% | 6.7 | 63% |
| Dagger | plan | Bronze | d4 | 94% | 4.3 | 80% |
| Dagger | plan | Bronze | d6 | 75% | 4.5 | 65% |
| Dagger | plan | Bronze | d8 | 50% | 6.7 | 49% |
| Dagger | plan | Bronze | d10 | 29% | 6.5 | 60% |
| Dagger | plan | Gold | d4 | 100% | 4.2 | 77% |
| Dagger | plan | Gold | d6 | 81% | 4.8 | 66% |
| Dagger | plan | Gold | d8 | 71% | 7.9 | 56% |
| Dagger | plan | Gold | d10 | 33% | 7.6 | 44% |
| Sword | today | Bronze | d4 | 100% | 4.4 | 82% |
| Sword | today | Bronze | d6 | 88% | 5.5 | 61% |
| Sword | today | Bronze | d8 | 54% | 8.1 | 39% |
| Sword | today | Bronze | d10 | 33% | 8.9 | 45% |
| Sword | today | Gold | d4 | 100% | 4.0 | 86% |
| Sword | today | Gold | d6 | 94% | 5.3 | 70% |
| Sword | today | Gold | d8 | 79% | 8.0 | 47% |
| Sword | today | Gold | d10 | 50% | 8.5 | 40% |
| Sword | plan | Bronze | d4 | 100% | 4.4 | 82% |
| Sword | plan | Bronze | d6 | 88% | 5.0 | 68% |
| Sword | plan | Bronze | d8 | 58% | 8.5 | 71% |
| Sword | plan | Bronze | d10 | 38% | 7.2 | 36% |
| Sword | plan | Gold | d4 | 100% | 4.6 | 81% |
| Sword | plan | Gold | d6 | 81% | 5.3 | 69% |
| Sword | plan | Gold | d8 | 58% | 7.8 | 63% |
| Sword | plan | Gold | d10 | 46% | 8.2 | 51% |
| Axe | today | Bronze | d4 | 100% | 4.8 | 71% |
| Axe | today | Bronze | d6 | 88% | 5.4 | 57% |
| Axe | today | Bronze | d8 | 67% | 7.7 | 41% |
| Axe | today | Bronze | d10 | 25% | 6.6 | 50% |
| Axe | today | Gold | d4 | 100% | 4.5 | 77% |
| Axe | today | Gold | d6 | 88% | 5.7 | 70% |
| Axe | today | Gold | d8 | 92% | 7.9 | 53% |
| Axe | today | Gold | d10 | 46% | 7.5 | 60% |
| Axe | plan | Bronze | d4 | 100% | 4.8 | 73% |
| Axe | plan | Bronze | d6 | 88% | 5.5 | 67% |
| Axe | plan | Bronze | d8 | 63% | 7.3 | 48% |
| Axe | plan | Bronze | d10 | 42% | 8.3 | 45% |
| Axe | plan | Gold | d4 | 100% | 4.1 | 76% |
| Axe | plan | Gold | d6 | 94% | 5.5 | 73% |
| Axe | plan | Gold | d8 | 75% | 7.0 | 53% |
| Axe | plan | Gold | d10 | 54% | 8.3 | 48% |
| Staff | today | Bronze | d4 | 94% | 3.9 | 71% |
| Staff | today | Bronze | d6 | 81% | 4.4 | 65% |
| Staff | today | Bronze | d8 | 58% | 6.0 | 48% |
| Staff | today | Bronze | d10 | 29% | 5.5 | 41% |
| Staff | today | Gold | d4 | 94% | 3.6 | 73% |
| Staff | today | Gold | d6 | 81% | 4.4 | 73% |
| Staff | today | Gold | d8 | 58% | 6.0 | 53% |
| Staff | today | Gold | d10 | 42% | 7.1 | 51% |
| Staff | plan | Bronze | d4 | 94% | 3.9 | 70% |
| Staff | plan | Bronze | d6 | 63% | 5.1 | 67% |
| Staff | plan | Bronze | d8 | 50% | 6.2 | 50% |
| Staff | plan | Bronze | d10 | 21% | 7.0 | 43% |
| Staff | plan | Gold | d4 | 100% | 3.8 | 75% |
| Staff | plan | Gold | d6 | 94% | 4.8 | 67% |
| Staff | plan | Gold | d8 | 67% | 6.3 | 57% |
| Staff | plan | Gold | d10 | 54% | 7.4 | 51% |
| Round Shield | today | Bronze | d4 | 100% | 5.9 | 79% |
| Round Shield | today | Bronze | d6 | 75% | 6.4 | 63% |
| Round Shield | today | Bronze | d8 | 54% | 10.4 | 50% |
| Round Shield | today | Bronze | d10 | 29% | 10.1 | 48% |
| Round Shield | today | Gold | d4 | 100% | 4.8 | 86% |
| Round Shield | today | Gold | d6 | 94% | 7.4 | 84% |
| Round Shield | today | Gold | d8 | 71% | 11.2 | 63% |
| Round Shield | today | Gold | d10 | 42% | 9.8 | 70% |
| Round Shield | plan | Bronze | d4 | 100% | 4.6 | 78% |
| Round Shield | plan | Bronze | d6 | 81% | 6.8 | 77% |
| Round Shield | plan | Bronze | d8 | 58% | 9.8 | 49% |
| Round Shield | plan | Bronze | d10 | 21% | 7.9 | 40% |
| Round Shield | plan | Gold | d4 | 100% | 4.7 | 83% |
| Round Shield | plan | Gold | d6 | 81% | 7.8 | 81% |
| Round Shield | plan | Gold | d8 | 58% | 12.2 | 60% |
| Round Shield | plan | Gold | d10 | 33% | 10.3 | 55% |

## What it shows

1. **The plan is as strong as today, weapon for weapon.** Most cells sit within the noise of today's weapon. Nothing runs away.
2. **The three main weapons feel different in the way Dave described.** The Dagger has the highest floor (its worst 1 in 10
   throws still hits 5 to 10; the Axe's 4 to 8, the Sword's 2 to 3) and the most triples among the attack weapons; the Axe has
   the biggest tops and splash; the Sword trades a little hit for block and gold.
3. **Gold now visibly upgrades each weapon's personality:** Gold Dagger +1.2 pierce a throw; Gold Sword +0.7 gold; Gold Axe
   about 1.6 splash on the other monsters; Gold Staff about +3 magic a throw over Bronze (it was +1.5 today); Gold Shield +1.5 heal.
4. **The Staff is now really "the magic weapon"**: Gold Staff won the most of any Gold weapon at d6 to d10 in these runs.
5. Watch: a Bronze Dagger lost a little at d6 (75% against 94% today, inside the noise but worth a bigger run); the Sword's gold
   is modest (+0.7 gold a throw at Gold), which suits the economy we just tightened.


## The bigger run (12 fights a step, 48 to 72 fights a cell; Dagger and Staff after their final nudge)

Win rate, today -> plan. At this size a 7-point gap is still within luck.

| Weapon | Metal | d4 | d6 | d8 | d10 |
|---|---|---|---|---|---|
| Dagger | Bronze | 96% -> 94% | 90% -> 85% | 50% -> 46% | 39% -> 33% |
| Dagger | Gold | 96% -> 98% | 94% -> 90% | 58% -> 57% | 39% -> 39% |
| Sword | Bronze | 100% -> 100% | 85% -> 88% | 50% -> 57% | 32% -> 46% |
| Sword | Gold | 98% -> 100% | 90% -> 88% | 65% -> 60% | 43% -> 51% |
| Axe | Bronze | 94% -> 100% | 88% -> 88% | 58% -> 64% | 31% -> 44% |
| Axe | Gold | 98% -> 98% | 88% -> 94% | 75% -> 72% | 50% -> 54% |
| Staff | Bronze | 98% -> 98% | 85% -> 81% | 56% -> 43% | 43% -> 38% |
| Staff | Gold | 96% -> 100% | 85% -> 88% | 60% -> 69% | 43% -> 49% |
| Round Shield | Bronze | 100% -> 100% | 81% -> 92% | 57% -> 57% | 32% -> 36% |
| Round Shield | Gold | 98% -> 100% | 94% -> 94% | 67% -> 61% | 46% -> 43% |

Reading: every Gold weapon is level with today or better. Bronze Sword, Axe and Shield are level or better. **Bronze Dagger and Bronze Staff sit about 5 points under today** at the bigger sizes (Dagger d6 85% vs 90%, d10 33% vs 39%; Staff d10 38% vs 43%), inside the luck of this run but in the same direction each time. Raising their numbers a step moved the Staff's d10 from 26% to 38%; the Dagger barely moved. The likely reason for the Dagger: today's Bronze Dagger carries a block face and the new one is all attack (about 1 less block a throw), so it hits harder per throw but takes more. Watch both in play; one more step on each is easy.

## Save-swap map (Grok asked for it before any cut; nothing applied yet)

Each retired weapon becomes the new weapon with the same job, **keeping its metal (Bronze/Silver/Gold), its die size, its uid
and anything forged into it**. Where a two-handed weapon becomes a one-handed one, the freed right hand gets a **Round Shield of
the same metal and size** (the two-hander was holding both hands, so the hero ends with the same two dice, not one).

| Retired | Becomes | Why that one |
|---|---|---|
| Spear (1 hand, risky, pierce) | **Axe** | Same shape: blanks and big tops. Its pierce identity would point to the Dagger, but a Spear player chose the big swing, and the Axe keeps the swing. |
| Mace (1 hand, brutal) | **Axe** | Same shape, the Axe is the big-hit weapon now. |
| Long Sword (2 hands, risky) | **Sword** + Round Shield | Keeps the name its owner chose; the shield fills the freed hand. |
| War Hammer (2 hands, brutal) | **Axe** + Round Shield | The biggest-hit weapon goes to the big-hit weapon; the shield fills the freed hand. |
| Bracer (1 hand, steady, block with a magic icon) | **Round Shield** | It was a guard; the Shield is the guard now. (Its magic icon goes; a player who wants magic picks the Staff.) |
| Tower Shield (1 hand, risky block) | **Round Shield** | One shield in the new set. |
| Fists, Dagger, Sword, Axe, Staff, Round Shield, Bow, Arrows | unchanged | Already in the six. |
| Legendaries (Dawnbreaker, Oakheart, Thunder Spear, Fortune's Dagger, Starfire Staff, Twinfang Bow) | **unchanged, held** | Dave and Grok: keep the named toys for now. |
| Diamonds | same map by type (a Diamond Spear becomes a Diamond Axe; a Diamond Tower Shield a Diamond Round Shield) | Diamonds stay as the one-fight dream version. |

Where a weapon can be in a save, all swapped the same way: both hands (including a two-hander's twin), the pack, the Diamond
case, a hero's borrowed-for-a-fight hands (`hero.lent`), and today's Camp Store stock (it restocks at the next camp anyway).
Sell values follow the new weapon's price at the same metal and size. A test will load an old save holding one of every
retired weapon and check each lands where this table says.

## Decisions for Dave before building

- The six one-line "because" sentences (above each table).
- Retire the Spear, Mace, Long Sword, War Hammer, Bracer and Tower Shield (old saves swap to the nearest new weapon at the
  same metal and size), and the Legendaries; keep the Diamonds as the dream version of a weapon for one fight.
- Then: a bigger bot run (12 fights a step), the save swap, the weapon cards in the magic-card style, and the store and spoils
  lists cut to the six.

## LIVE (build 20261104b1; Dave, 4 Nov 2026: "go and be free")

- `useWeapons3()` in the release (js/engine.js) switches on the six weapons' faces and icons, trims the spoils and the Camp Store
  to Dagger, Sword, Axe, Staff and Round Shield (the Bow and Arrows as before), sets Diamonds by type, and gives each weapon its
  one-line "because" as its tag (shown on the weapon cards in the next step).
- **Starting kits:** Knight Sword and Round Shield; Ranger Arrows and Bow; **Wizard the two-handed Staff**; **Dwarf Axe and Round
  Shield** (the Tower Shield is retired); Bard Dagger and Round Shield.
- **Bronze Dagger:** one small parry face (d4 A1 B1 A2 A3; d6 A1 B2 A2 A3 A3 A4; and so on), since the all-attack version trailed
  today's by about 5 points.
- **Old saves:** `migrateWeapons3` in js/save.js applies the swap map above (tests in test/release.test.mjs load a save holding
  every retired weapon). Legendaries are kept as they are.
- Retired weapons stay defined in js/data.js so old saves and the Legendaries' 3D models still load.
- Next: the weapon cards in the magic-card style (with the "because" line under each name), after Dave plays a few fights.
- Whole-campaign bot run with the six weapons and new kits (3 acts, 2 campaigns a class): **7 of 10 campaigns cleared** (bard 2,
  dwarf 2, knight 1, ranger 1, wizard 1), against 9 of 10 in the T27 run. Per-step win rates are level (Act I boss 77% vs 83%,
  Act II boss 80% vs 69-77%, Act III boss 86% vs 69-74%, the Act III slope 73% vs 74%); with 2 campaigns a class one lost run
  moves a class from 2 to 1, so this is within luck. Watch it in play.

## The new weapon cards (build 20261104b3; Dave: "fonts are too small… large words is always better than two sentences of tiny words")

- `weaponCardT29` in js/g3/cards.js (used whenever the six weapons are live): the magic cards' look, a slim gold edge, the
  painting on top with the die size badge (d4 to d10) and the sell chip, the name in big type, then a beige panel with:
  **a few big words** (`WEAPONS3.short`: "Steady hits. Triples. Pierce.", "A bit of everything. Gold.", "Big swings. Splash.",
  "Magic and healing.", "Big blocks that heal.", "A light bow. A little guard.", "Choose your arrows."), **the faces as
  symbols** (a red starburst for attack, a blue shield for block, the number inside in heavy type, a blank face faded) with
  the weapon's icon and its crit under each face, **a key** naming the icons on this die, and **one slim strip per bigger
  die** ("d8 · up to 5 · 100 gold"; the next one lit; tapping a later one says which comes first).
- On a phone the few words are about 24 px and the face numbers larger; nothing smaller than about 14 px.
- The Staff had no painted weapon art: a stand-in cropped from the Wizard's Barrier painting (assets/cards/weapons/staff-wide.webp)
  until the art team paints one (Bronze, Silver and Gold, like the Dagger's wide pictures).
- Checks: `node dev/weapon-cards-t29.mjs` (all 84: 7 weapons x 3 metals x 4 sizes, fails if anything spills or the parts are
  out of order) and `node dev/weapon-grow-check.mjs` (real taps in camp: open, grow d4 to d6 for 50 gold, the shelf).


## Faces on their die shape (build 20261105a2; Dave: "see the triangles behind the d4 dice, and square behind the d6")

Each face symbol (starburst, shield) now sits on an ivory die shape whose edge takes the weapon's metal colour: d4 a
triangle, d6 a rounded square, d8 a diamond, d10 a kite. The small faces on the grow strips use the shape of the die you
would grow to. Code: `DIE_SHAPE`, `SYM_ON` and `symSvg(k, v, cls, die)` in js/g3/cards.js; `.t29s .die` in css/cards17.css.

## The real dice on the card (build 20261105a3; Dave: "use literally the dice that are being drawn on the 3-D images")

Red is attack and blue is block everywhere in the game, so the card no longer draws its own symbols: each face is the 3D
die's own face picture (`faceShot` cuts it from the die's painted texture, clipped to the face's outline), so a d4 face is
the triangle you see on the board, a d6 the square, a d8 the triangle, a d10 the kite. The card HTML marks each face
(`data-shot="<sides>:<face>"`, the weapon in `data-wi`); `realFaces` in js/g3/cardboard.js swaps the pictures in before the
card paints, on any screen. The earlier ivory die-shape symbols stay only as the stand-in when there is no browser (tests).
