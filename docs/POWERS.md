# Magical powers

Every class has four powers. Magic pays for them. Most work once a battle; the weak "every round" ones come back each round. Rules live in `castPower` (engine.js); data in `CLASSES[x].cards` (data.js).

Kinds: `flat` fixed numbers; `dice` roll NdS; `scale` more magic = more dice; `round` grows with the round number; `luck` roll a d6 for a table; `super` unlocks at hero level 5, usable from round 3, hits every monster, once, cannot be recharged.
Upgrades (gold 60, then 140): +25% numbers, +1 die on dice powers, +aoe on supers. Splash goes to every other monster; `aoe` goes to all.

| Class | Every round | Dice / luck | Fixed | Super (lvl 5) |
|---|---|---|---|---|
| Knight | Shield Up +4 block | Cleave 2d6 + half splash | Rally Cry atk/block/heal | Judgment: +14 atk, 12 to all |
| Ranger | Quick Draw (free reroll of 2) | Aimed Shot 2-5d6 pierce (scale) | Snare | Rain of Arrows: 9 to all |
| Wizard | Magic Missile +3 pierce; Storm Coil stores a charge (level 3), release for 5 each, half splash | Arc Bolt 1-5d8 (scale, 2 magic a die: 2 = 1d8 ... 10 = 5d8) | Barrier | Meteor: 4 x round, half splash |
| Dwarf | Shield Bash +2 atk, +3 stagger | Stonehide 2d6 block | Grudge: 2 x round attack | Avalanche: atk, block, 10 to all |
| Bard | Lucky Verse (d6 table) | Mending Song 2d6 heal | Discord | Finale: atk, heal, block, 8 to all |

Open ideas: charge-up powers (store magic over rounds), team heals in party mode, power dice rolling on the tray instead of a banner.
