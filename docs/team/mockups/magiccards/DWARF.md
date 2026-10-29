# Dwarf Warden magic cards (t423, mockup only)

Numbers come from `js/data.js` / `js/engine.js` unless marked **PROPOSED**. Upgrades cost 50 gold (Level II) and 90 gold (Level III).
Dice are the colour of what they add (Anvil Strike's d8s are blue, for block), with white numbers.
Identity: the immovable forge-wall. Block first, hits back when hurt, and digs up gold. The Knight protects by reading the monster; the Dwarf just takes it and gets angrier.

## Final Dwarf set
| | Power | One line | Cost | Level I / II / III | Why |
|---|---|---|---|---|---|
| **Start** | Anvil Strike (**PROPOSED**) | Buy blue d8 block dice; every 8 rolled also gives 3 gold. | 1 per die, up to 6 | 1d8 / 2d8 / 3d8 for 1 magic, +1d8 per extra magic | The Dwarf's dice toy: a forge of shields, with a lucky gold spark to cheer for. |
| **Start** | Grudge (**PROPOSED rework**) | Attack = all the damage you took last round. | 2, once a battle | that damage / +3 / +6 | A creative revenge trick: getting hit becomes the plan. That suits the 40-health Dwarf. |
| **Start** | Stonehide (live) | Store 1 magic a round, then release a big wall of block. | 1 per charge | 4 charges: 32 / 40 / 48 block | The store-and-release payoff: turn to stone right before the boss's Slam. |
| Unlock | Avalanche (live, area **10 → 8 PROPOSED**) | Round 3 or later: +10 attack, +10 block, and 8 to every monster. | 6 | +10 & 8 all / +13 & 10 / +15 & 12 | The mountain joins in, as the late-fight room-clearer. |
| Unlock | Shield Bash (live) | +4 attack every round. | 1 a round | +4 / +5 / +6 | Simple steady offence for a defensive hero. |
| Unlock | Gold Vein (**PROPOSED**) | +2 block and +2 gold every round. | 1 a round | +2/+2, +3/+3, +4/+4 | The patient miner: slow gold while you hold the line. |

**Cut:**
- **Brace** (+4 block a round) is a copy of the Knight's Shield Up.
- **Forge Fury** (store attack + block) is a copy of Rally Cry.
- The **live Grudge** (attack = 2 × round, 3 magic) was weak: about 2.7 per magic even in round 4.

## Balance (value per magic at Level I, 2 monsters; same method as KNIGHT.md)
| Card | Value per magic | Note |
|---|---|---|
| Anvil Strike | 4.5 block × 0.8 + gold chance (1/8 × 3 × 0.3) ≈ **3.7** | Block is worth less than attack, but the Dwarf has the most health. |
| Grudge (rework) | ~7-9 damage taken → ≈ **4** | It's swingy: big against heavy hitters, small if you blocked well. |
| Stonehide | 32 × 0.8 / 4 ≈ **6.4** | A little below Volley (7.8) and Rally (8.2); fine for pure defence. |
| Avalanche (aoe 8) | (10 + 8 + 8 × 2) / 6 ≈ **5.7** | The live area of 10 is ≈ 6.3, as hot as the old Judgment. |
| Shield Bash | 4 | Fine. |
| Gold Vein | 1.6 + 0.6 ≈ 2.2 | Low on purpose: it's economy. |
Starters across heroes, roughly:
- Ranger 4.5 / 3.5 / 7.8
- Knight 5.3 / 4.5 / 8.2
- Wizard 3.4-4.5 / 3 / 9
- Dwarf 3.7 / 4 / 6.4

The Dwarf is a little lower on paper, but it starts with 40 health (Knight 34, Ranger 28), which evens it out.

## Open questions
- Grudge: should it count all damage taken last round, or only damage that got past your block?
- Anvil Strike: is a gold spark on 8s fun enough, or should the Dwarf's dice be gold dice outright?

## Decided (Grok, PROPOSED)
- Grudge counts only the damage that got past your block. Blocking well and then using Grudge pays less, so the two don't stack.
- Anvil Strike keeps the gold spark on 8s. Blue block dice stay true to the colour code, and the spark is the lucky moment.
