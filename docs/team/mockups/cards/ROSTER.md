# Weapon roster audit (T13, CONCEPT docs only)

Art director: Grokbot. Checked 23 Oct 2026 against `main` (js/ on `grokbot/t11-card-family` is identical to `origin/main`).

## The key finding
The live game does **not** play `WEAPONS` as written. `js/main.js:11` calls `applyRelease()`, and `js/release.js:15` calls
`useWeapons2()` (js/engine.js:78-85). That is "release 2" (js/release.js:6-9, 23 Oct 2026). It:
- replaces the loot table with `WEAPONS2.loot` (data.js:296; engine.js:81)
- adds Bow (one-handed), Arrows and Axe (`WEAPONS2.add`, data.js:290-294; engine.js:79)
- renames Shield to **Round Shield** (data.js:295)
- sets the class starting weapons (data.js:297; engine.js:82)
- sets the Diamond pool (data.js:298; engine.js:83)
- drops two-handed legendaries from the legendary pool (engine.js:84)
- gives the six one-handed weapons and Bow/Arrows their own face lists (`WEAPONS2.faces`, data.js:268-289; engine.js:93-111)

`EXPERIMENT.weapons2: false` (data.js:243) is only the default before boot. After boot it is true for every player.

PR #39's gallery imported `js/data.js` without `applyRelease()`, so it drew pre-release faces and the pre-release roster.
**Fixed in this branch:** `cards/roster.js` calls `applyRelease()` first. `gallery.html`, `card.html` and every T13 page import it.

## Classification
**Active** means the released game deals it: loot, the Camp Store, a class's starting pair, or the Diamond pool. The Camp Store draws from the same loot table (`rollDrops`, engine.js:1473).

**Legacy** means it is still defined so old saves load (save.js:95-97: "other two-handed weapons a hero already owns ... keep working"), but nothing deals it any more.

| Item | Status | Hands | Where it comes from (released game) | Source |
|---|---|---|---|---|
| Dagger | **Active** | 1 | loot 10; Wizard and Bard start; Diamond pool | data.js:170, 296-298 |
| Sword | **Active** | 1 | loot 10; Knight and Bard start; Diamond pool | data.js:178, 296-298 |
| Round Shield (`shield`) | **Active** | 1 | loot 10; Knight and Wizard start; Diamond pool. The faces are the Sword's with the colours swapped. | data.js:182, 276, 295-298 |
| Spear | **Active** | 1 | loot 8; Diamond pool | data.js:186, 296, 298 |
| Tower Shield | **Active** | 1 | loot 7; Dwarf start; Diamond pool. The faces are the Axe's with the colours swapped. | data.js:194, 276, 296-298 |
| Axe | **Active** | 1 | loot 8; Dwarf start; Diamond pool | data.js:272, 293, 296-298 |
| Bow (one-handed) | **Active** | 1 | Ranger start only (right hand). Not in loot, the Store or the Diamond pool. | data.js:279, 291, 297 |
| Arrows (`quiver`) | **Active** | 1 | Ranger start only (left hand). Ammunition (Normal, Piercing, Fire, Frost) is chosen at camp, free. Also the Ranger's spare weapon (engine.js:228-232). | data.js:280-288, 292, 297; engine.js:87-91 |
| Dawnbreaker, Oakheart, Thunder Spear, Fortune's Dagger | **Active** (legendary) | 1 | elite and boss spoils, and the Act II+ Store, by `LEGENDARY_CHANCE` | data.js:217-228, 304; engine.js:1478 |
| Diamond (any type in the pool) | **Active** (one fight) | 1 | spoils, perk and Store, by chance; it shatters after the fight | data.js:122-130, 298 |
| Bracer | Legacy | 1 | in no live table (it was in the old loot and Bard start) | data.js:174, 306 (old), 497 (old) |
| Mace | Legacy | 1 | in no live table (it was in the old loot, the Dwarf start and the old Diamond pool) | data.js:190, 129 (old), 482 (old) |
| Staff | Legacy | 2 | in no live table | data.js:202, 467 (old) |
| Long Sword | Legacy | 2 | in no live table | data.js:206 |
| War Hammer | Legacy | 2 | in no live table | data.js:210 |
| Old two-handed Bow | Legacy | 2 | `bow` is redefined as one-handed (engine.js:79). An old two-handed Bow becomes Arrows + Bow when the save loads. | data.js:198; save.js:94-104 |
| Starfire Staff, Twinfang Bow | Legacy (legendary) | 2 | removed from the legendary pool | data.js:229-235; engine.js:84 |
| Fists | Hidden | 1 | an empty hand, not a card | data.js:168 |
| Original arrowheads (`quiver.special`) | Experiment (superseded) | — | release 2 swaps in the numbered arrowheads | data.js:283-285; release.js:16 |
| Monster fury from round 4 | Experiment (`?lab` only) | — | not a weapon; listed because the board mentions it | release.js:9, 24-26 |
| Strength lock, carry limits, a permanent Bow, arrow restocking, Diamond rule changes, two-handers coming back, the covered upgrade slots (`upgrade-concept.html`) | **Proposed, not decided** | — | open gameplay decisions (Astra, 23 Oct). Not drawn on any card face. | BOARD.md T03; this PR |

**Counts.**
- Active: 8 weapon types (Dagger, Sword, Round Shield, Spear, Tower Shield, Axe, Bow, Arrows), 4 legendaries and the Diamond.
- Legacy: 5 types (Bracer, Mace, Staff, Long Sword, War Hammer), the old two-handed Bow and 2 legendaries (Starfire Staff, Twinfang Bow).
- Experiment: 2 (the superseded arrowheads; monster fury in `?lab`). Neither is a card.

## PR #39 against the released game
- PR #39 drew 11 types: Dagger, Bracer, Sword, Shield, Spear, Mace, Tower, Bow (two-handed), Staff, Long Sword and War Hammer. With 6 legendaries that made 39 weapon cards; with the backs, 5 objectives, secret objectives and wagers, 87 cards in all.
  - **Active and correct:** Dagger, Sword, Spear, Tower Shield. Their faces were wrong, though (pre-release). Now fixed.
  - **Active but renamed:** Shield is now Round Shield.
  - **Active but changed:** the Bow is one-handed now and comes with Arrows as a second card.
  - **Missing:** Axe and Arrows.
  - **Legacy:** Bracer, Mace, Staff, Long Sword, War Hammer, Starfire Staff and Twinfang Bow.
- The gallery now has three sections: Active, Active legendary and Legacy. Legacy cards are greyed and tagged LEGACY. The roster was not expanded.
- **Art:** all 8 active types now have painted masters (Dagger and Sword are pilots; the other six came in T14). The Mace pilot is legacy, so do not paint more Mace variants.
