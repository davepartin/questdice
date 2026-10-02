# QuestDice — Game Design

*A cooperative fantasy dice campaign for one to six friends. Roll your body. Break the dark.*

Brainstormed by Dave Partin on October 1, 2026, as a companion to [Fleet Dice](https://davepartin.github.io/fleetdice/). This document merges the original brainstorm notes with everything decided while building the first playable version. Where the build forced a change or settled a contradiction, it is called out in **Decisions** (section 15) so nothing is lost or silently altered.

The numbers in this document are the numbers in `js/data.js`. If they ever disagree, the code is what players feel, so fix the document.

---

## 1. What this game is

QuestDice is a campaign you can play alone or with up to five friends. You build a hero, fight monsters in short dice battles, make camp, grow stronger, and then do it again for a very long time. A fight takes a few minutes. A campaign takes months.

The one idea everything hangs on is this: **your 3×3 board of dice is your body.** The center die is your heart. The die on top is your head, the one on the bottom is your feet, the two at your sides are your hands, and the four corners hold your weapons and your special gifts. You do not manage a hand of cards or a stack of stats. You roll yourself, shape the result with a few well-chosen rerolls, and commit.

### The four things we are chasing

**Gloomhaven's depth.** A class that is more than a number. Cards you must ration, because you can only use the best ones once per fight. A monster whose next move you can read, so every round is a decision rather than a guess. A hero who grows through small, meaningful choices. A quest that adjusts to how many people sit down to play.

**Minecraft Dungeons' flow.** Fights that are short and readable. Attacks you see coming and can answer. Loot that makes you lean forward, with colors that tell you at a glance how lucky you got. Defeat that stings without ending the story. Easy to pick up and drop into with friends.

**Fleet Dice's feel.** The same near-black void, the same hull blues, the red of attack and the blue of shield, the yellow of energy (our Magic) and the purple of a direct hit (our Pierce). The same flagship die in the middle that amplifies what you roll around it. The same quick, tactile, two-tap interface, and the same four-digit-and-a-link way to bring a friend in.

**A fun Dungeons & Dragons night.** Classic roles (the knight, the archer, the wizard, the dwarf, the bard), a party that needs each other, named villains, a last stand when all seems lost, and a campaign that remembers who you are.

### Design pillars

1. **Read the board, not a rulebook.** Every die on the board means the same thing for every class. You learn it once.
2. **Telegraph, then decide.** Monsters show you their intention before you roll. The tension is choosing well, not guessing.
3. **Luck you can shape.** You roll, but you always get a say, and every say costs something (Magic).
4. **Short fights, long story.** A battle ends in four to eight rounds. The campaign never does.
5. **Everyone matters.** Healing, shielding, and big plays all count. The one who rolled the biggest number is not the only hero.
6. **Grace over grind.** Defeat sends you back to camp, not back to the start. You keep your level, your gear and your perks.

---

## 2. The rhythm of play

Words matter here, because the screens are named after them.

A **Round** is one cycle of roll, shape, lock in, resolve. A **Battle** is a series of rounds until the monsters or the heroes fall. A **Quest** is one battle on the road. An **Act** is a run of ten quests that ends with a boss.

Between rounds there is the **Reset**. Between battles there is **Camp**. They are different places for different kinds of decisions.

| Moment | Where | What you spend | What you decide |
|---|---|---|---|
| Between rounds | **Reset** | Magic (✦) | Heal? Recharge a spent card? Brace for what the monsters just showed you. |
| During a round | **Shape** | Magic (✦) | Which dice to reroll, which cards to play, whom to target. |
| Between battles | **Camp** | Gold (🪙) | Bigger dice, new weapons, perks, and a save. |
| Between camps | **Quest Board** | Nothing | Which road to take. |

### One round, step by step

1. **Reset.** The monsters roll their Intention die first and show it to everyone. You see exactly what kind of move is coming, and a range for how hard it can hit. You may spend Magic here to heal or recharge a card.
2. **Roll.** Your full board rolls at once.
3. **Shape.** The first reroll action is free. Two more are available at a cost. Cards, heals and heart nudges also cost Magic. Tap a monster to choose your target.
4. **Lock in.** When you are happy, you lock your board. In a party, everyone locks, and the game waits for the last person.
5. **Resolve.** Your strike lands first. Then the monsters that are still standing act. Healing, resources and bonuses settle. If anyone is still on their feet, the next Reset begins.

> **Why your blow lands first.** Fleet Dice resolves both sides at once. In a co-op game that makes a killing blow feel hollow, because the monster you just defeated still hits you. Letting the hero land first rewards focus and burst, makes target choice matter, and gives swarm fights a satisfying snowball. A dead monster does not strike back.

---

## 3. The board: your body

```
   ┌─────────────┬─────────────┬─────────────┐
   │  L.WEAPON   │    HEAD     │  R.WEAPON   │
   │ (red/blue)  │     d4      │ (red/blue)  │
   ├─────────────┼─────────────┼─────────────┤
   │  L.HAND     │   HEART     │  R.HAND     │
   │ strength    │     d6      │ strength    │
   ├─────────────┼─────────────┼─────────────┤
   │ L.SPECIAL   │    FEET     │ R.SPECIAL   │
   │ symbols     │     d4      │ symbols     │
   └─────────────┴─────────────┴─────────────┘
```

Each side of the body is a **lane**: a weapon die in the corner above the hand, the hand's strength die, and a special die in the corner below. The left lane is the left column, the right lane is the right column. Head, heart and feet are shared.

| Slot | Die | Always… | Role |
|---|---|---|---|
| Heart (center) | d6 | rolled, never chosen | The **amplifier.** Boosts matching dice on *your own* board (see 4.5). |
| Head (north) | d4, no blanks | contributes | Pays out by the universal number language. Takes part in synergy. |
| Feet (south) | d4, no blanks | contributes | Same, plus **initiative** in a party (section 10). |
| Hands (west, east) | d4 growing to d10, no blanks | contributes | **Strength.** Adds to its lane and pays out by the number language. |
| Weapons (upper corners) | d4 with colored faces and at least one blank | risks | Decide whether a lane **attacks or defends.** |
| Specials (lower corners) | d4 growing to d10, always two blanks | risks | Symbols that use the hand's number. |

---

## 4. The dice, in full

### 4.1 The universal number language

Head, feet and both hands share one mapping, so you only learn it once. These four dice never blank.

| Roll | Pays out | Notes |
|---|---|---|
| **1** | 🪙 **Gold** | The "selfish" number. It helps you, not the fight. |
| **2** | ◆ **Pierce** | Damage that goes straight through block. Only healing answers it. |
| **3** | ✦ **Magic** | The fuel for everything in battle. |
| **4** | ✦ **Magic** (a little) | Also the biggest natural number on a d4. |
| 5 and up | nothing extra | Pure power. Only hands can roll these (d6 and larger). |

The amounts grow as the hand dice grow. Head and feet are always d4.

| Hand die | 1 → 🪙 | 2 → ◆ | 3 → ✦ | 4 → ✦ |
|---|---|---|---|---|
| d4 | 2 | 2 | 2 | 1 |
| d6 | 2 | 3 | 3 | 1 |
| d8 | 3 | 3 | 3 | 2 |
| d10 | 3 | 4 | 4 | 2 |

The result is a pleasant tension: **low numbers are utility, high numbers are power.** A hand showing 1 gives you gold but adds only 1 to its lane. A hand showing 4 adds 4, and magic.

Automatic healing on a roll was removed in the first design pass. Healing only happens by spending Magic or by a Mend symbol (4.4).

### 4.2 Strength (the hands)

A hand die is a pure number with no color. It **adds** to the weapon die in its lane. Addition, not multiplication: multiplication was tested and rejected because at d10 it produces absurd numbers. Hands grow d4 → d6 → d8 → d10 at Camp, gated by level (section 11).

### 4.3 Weapons (the upper corners)

A weapon die is a d4. Its **color** decides what its whole lane does that round. A red face means the lane **attacks** for (weapon + strength). A blue face means the lane **blocks** for the same amount. Even a blank face has a color, which is the weapon's home identity: an offensive weapon's blank is red, a defensive weapon's blank is blue.

Every weapon has a **tagline** and one or two **icon faces**. The rule is that you should be able to say what a weapon does in one breath, whatever its size or rarity.

| Weapon | Hands | Faces (value, color) | Sum | Icon |
|---|---|---|---|---|
| **Dagger** | 1 | 0 red · 2 red · 2 blue · 3 red | 7 | red 3 mends 1 |
| **Bracer** | 1 | 0 blue · 2 blue · 2 red · 3 blue | 7 | blue 3 sparks 1 ✦ |
| **Sword** | 1 | 0 red · 1 blue · 3 red · 4 red | 8 | red 4 pierces 1 |
| **Shield** | 1 | 0 blue · 1 red · 3 blue · 4 blue | 8 | red 1 bashes (stagger 3) |
| **Spear** | 1 | 0 red · 1 blue · 2 red · 4 red | 7 | red 4 pierces 2 |
| **Bow** | 2 | 0 blue · 1 red · 2 red · 3 red (both dice) | 6 | red 3 pierces 1 |
| **Long Sword** | 2 | 0 red · 0 blue · 3 red · 4 red (both dice) | 7 | red 4 staggers 3 |
| **Staff** | 2 | 0 blue · 1 blue · 2 red · 4 red (both dice) | 7 | red 4 gives 2 ✦ |

Dagger and Bracer, and Sword and Shield, are color mirrors of each other. The Spear, Staff and Fists are new. The Staff was the Long Sword's earlier sketch and now belongs to the wizard.

**One-handed and two-handed.** A one-handed weapon fills one corner, so you can pair a sword with a shield, or two daggers. A two-handed weapon fills both upper corners (both dice share the same face set) and is the only way to reach the **top-row synergy** (section 7). That is the trade: freedom to mix attack and defense, against a shot at a +10.

**Bow versus Long Sword** is the headline balance story. The Bow has one blank and a lower average, but the best odds of lining up a triple. The Long Sword has two blanks per die and hits harder on average, but is far worse at triples. In the original simulation the Long Sword averaged about 3.5 per hand against the Bow's 3.0, while the Bow landed the triple around 41% of the time against the Long Sword's 25%. No hand-tuning was needed. The trade balances itself.

### 4.4 Special dice (the lower corners)

A special die always has **exactly two blank faces**, however large it grows. The rest are symbols, repeating as the die grows. So the miss chance shrinks on its own: 50% blank at d4, 20% at d10.

The symbol decides *what* happens. The hand's number in the same lane decides *how much*.

| Die | Symbols | Effect |
|---|---|---|
| Left special | ✚ **Mend**, ⚡ **Surge** | Mend heals HP equal to the left hand's strength. Surge doubles that hand's strength in its lane. |
| Right special | ✦ **Spark**, ⚡ **Surge** | Spark gives Magic equal to the right hand's strength. Surge doubles that hand's strength in its lane. |

A Surge doubles only the hand's strength, not the weapon and not the whole lane, to keep numbers from spiraling.

The class does **not** change what these dice mean. The board is identical for every class so players always know what each die does. Class flavor lives in the **cards** (section 8).

### 4.5 The heart (center die)

A d6, deliberately larger than the d4s around it so that lining it up for a synergy is harder, and so the Heart Nudge card is worth buying instead of redundant. Like Fleet Dice's flagship, it amplifies matching results on your own board. It never touches your teammates' boards.

| Heart | Effect |
|---|---|
| 1 | +2 🪙 for every *other* cardinal die showing a 1 |
| 2 | +2 ◆ for every other cardinal die showing a 2 |
| 3 | +2 ✦ for every other cardinal die showing a 3 |
| 4 | +1 ✦ for every other cardinal die showing a 4 (kept small, because a triple 4 already earns the flat +10) |
| 5 | +4 to your best **blue** lane |
| 6 | +4 to your best **red** lane |

"Cardinal" means head, hands and feet. Corners are not touched by the 1 to 4 amplifiers. Faces 5 and 6 lift the *lane total*, not a corner die. See Decision 2.

A "reactor" idea from the early drafts, where a face permanently raised passive magic, was removed entirely. Magic is never generated passively.

---

## 5. How a round resolves

Totals before anything else:

- **Attack** = the sum of every red lane (weapon + strength, with surge and heart boosts) + any synergy bonus + card bonuses.
- **Block** = the sum of every blue lane + any synergy bonus + card bonuses.
- **Pierce, Magic, Gold, Heal, Stagger** come from the number language, icons, specials and cards.

Then, in order:

1. **Your strike.** Damage to your target is `max(0, attack − the target's Guard) + pierce`. Pierce ignores Guard.
2. **Stagger check.** If the target was winding up and your damage plus stagger reaches its threshold, the wind-up is broken (see the Bestiary).
3. **Survivors act.** Each living monster does what it telegraphed. Strikes are reduced by your block, shared as one pool across all of them in order. Pierce is not reduced.
4. **Rage.** A boss at half health or lower changes its ways, starting next round.
5. **You.** Heal is applied, then damage. Magic and gold are gathered.
6. **Last Stand.** If you would fall, you survive once per battle at 1 HP (more with a perk). A second time, you fall.

Block that goes unused is simply lost. It does not carry over to the next round, which is why leaning on defense against a monster that is guarding or winding up is a deliberate bet rather than a free one.

---

## 6. Rerolls and the Magic economy

Each round gives you **three reroll actions**. Each action lets you pick **up to three dice** from anywhere on your nine and reroll only those. This is a deliberate limit compared to Fleet Dice's "reroll everything": you cannot fix the whole board, so you must choose whether the heart, a hand, a weapon or a corner is worth fixing. A class may carry a different limit; the Ranger rerolls four.

**Cost.** The first action each round is **free**. The second and third cost **1 Magic per die**. This replaces two earlier statements that could not both be true (see Decision 3).

**Magic** is the fuel for everything fast and in-battle:

| Spend | Cost |
|---|---|
| Rerolls (second and third action) | 1 per die |
| **Heal** (always available) | 2 → restore 4 HP (1 Magic = 2 HP) |
| **Heart Nudge** (always available) | 1 → move the heart die up or down by 1 |
| A class card | listed on the card (1 to 3) |
| Recharge a spent class card (Reset only) | 3 |

Magic starts each battle at a class-specific amount (2 to 4), caps at 12, and is only earned from the dice. **Gold** is the opposite temperament: slow, deliberate, spent only at Camp. Keeping the two separate is intentional. Each serves a different tension.

**Pierce** is the third resource, a damage type rather than a currency. It goes both ways: yours cuts through a guarding monster, and a monster's cuts through your block.

---

## 7. Synergy

Matching numbers is the heart of the Fleet Dice feel, and it pays flat, memorable bonuses.

**Top-row triple (+10 attack).** The top row is **weapon · head · weapon.** When both weapon dice and the head all show the same number, you earn +10 attack. This needs a **two-handed** weapon, because only then are both weapon dice the same family. A blank (0) never counts, and the head has no blank, so it can never match one. This is what the original Bow versus Long Sword simulation actually measured. See Decision 1.

**Head–Heart–Feet triple (+10 block).** The vertical line, three of a kind, earns +10 block for anyone.

**Straights (+10 to +30).** A run of consecutive numbers across the **seven numeric dice** (head, feet, heart, both hands, both weapons) pays out, scaling with length: 5 in a row is +10, 6 is +18, 7 is +30. You choose whether to take it as **attack** or cash it in for the same amount of **gold**. The two special dice carry symbols, not numbers, so they do not take part. Blanks do not count. Solo, a straight is yours alone; in a party it rewards only the roller.

The original note said a straight could be built "anywhere across all nine dice" with no length limit. Built that way, a simple three-in-a-row appeared on **70% of first rolls**, which made the bonus free. The rule above makes a straight a once-in-twenty first roll and a once-in-five *chased* one (Decision 5).

| Event | First roll | With a bot chasing it |
|---|---|---|
| Top-row triple (two-handed only) | about 4.7% | about 30% |
| Head–Heart–Feet triple | about 4.2% | rises, but costs rerolls |
| Straight of 5 or more | about 5% (d4 hands) to 9% (d6 hands) | about 20% |

---

## 8. Classes and cards

Five archetypes in the Gloomhaven and Lord of the Rings tradition. They share a board and differ in starting gear, health, reroll style, and cards.

| Class | HP | Start ✦ | Dice per reroll | Gear | Identity |
|---|---|---|---|---|---|
| **Knight** | 34 | 3 | 3 | Sword + Shield | Sturdy and simple. Balanced offense and defense. |
| **Ranger** | 28 | 3 | **4** | Bow | Highest damage, best triple odds, fragile. |
| **Wizard** | 26 | **4** | 3 | Staff | Magic is ammunition. Two-handed synergy engine. |
| **Dwarf Warden** | **38** | 2 | 3 | Spear + Shield | Deepest health, thickest wall. |
| **Bard** | 28 | 3 | 3 | Dagger + Bracer | Healer and support. Slowest to kill, hardest to lose. |

Each hero starts with three unique **class cards**, with a fourth unlocking at level 4. (Original target was four to six; the roster is data-driven, so adding more is a data change.)

- **Once per battle.** The strongest options cannot be spammed every round.
- **Rechargeable.** A spent card can be recharged during a Reset for 3 Magic, so a rich-in-Magic hero can use it again.
- **Played live.** Cards are used in the Shape step. Their effect lands that round.

| Class | Cards (cost) |
|---|---|
| Knight | Cleave (2) +6 attack · Shield Wall (2) +8 block · Rally Cry (3) +4 attack and +4 block · *Crushing Blow (3) +4 pierce and +6 stagger* |
| Ranger | Aimed Shot (2) +5 pierce · Volley (2) +6 attack · Snare (2) foes hit 3 softer, +4 stagger · *Sprint (1) a free reroll of 4 dice* |
| Wizard | Arc Bolt (2) +4 attack and +3 pierce · Foresee (1) a free reroll of 3 dice · Barrier (2) +7 block · *Siphon (3) +4 pierce and +3 Magic* |
| Dwarf Warden | Stonehide (2) +10 block · Bulwark Smash (2) +5 attack and +5 stagger · Grudge (3) +8 attack · *Hearthsong (3) heal 8, +4 block* |
| Bard | Mending Song (2) heal 8 · Battle Hymn (2) +4 attack and +4 block · Discord (2) foes hit 4 softer · *Encore (3) a free reroll of 3 dice and +2 Magic* |

*Italic cards unlock at level 4.*

---

## 9. Monsters

Monsters are covered fully in [BESTIARY.md](BESTIARY.md). The short version:

- A monster rolls an **Intention die (d6)** *before* you roll, and shows you the result. The face tells you the kind of move; a **Power die** rolled at lock-in decides how hard.
- Monsters **never reroll.** Whatever they commit to, they do. This keeps them readable and leaves the tactical agency with the players.
- A **Wind-Up** is a visible promise of a huge Slam next round. You can break it by dealing enough damage in a single round, which is the **Stagger** mechanic, or you can brace for it.
- **Bosses** change at half health with a new table and a bigger Power die.
- Monsters can **bind** your dice, **drain** your Magic, **pilfer** your gold, **howl** to buff the pack, and **summon** reinforcements.

---

## 10. One to six players

QuestDice is built for one to six. **Solo is built first** so every system can be tested and tuned before adding the complexity of a party. The engine already accepts a player count; the interface is solo today.

### 10.1 How a quest adjusts

| Players | Monster HP × | Extra reinforcements |
|---|---|---|
| 1 | 1.0 | 0 |
| 2 | 1.8 | 0 |
| 3 | 2.5 | 0 |
| 4 | 3.1 | 1 goblin |
| 5 | 3.6 | 1 goblin |
| 6 | 4.0 | 2 goblins |

HP grows slower than the headcount because friends make each other stronger (more synergy, more healing, more cards), so each added player should speed the fight up slightly rather than leave it unchanged. The original rough idea was "15 HP per player"; this replaces it with a table because the right answer should be found in playtesting, not guessed. **Only the solo numbers have been tuned.** The party numbers are a starting point.

Loot also scales: the number of weapon drops after a battle is the player count plus one, so a party of four chooses from five.

### 10.2 Initiative: who takes the heat

Combat resolves at the same time, so turn order does not matter. Instead the **Feet die** decides who is the most active and aggressive this round. When a shared monster retaliates, the player with the **highest Feet** draws the largest share of its damage. This is a *risk, not a reward.* It gives the party a real choice about who tanks a given round, independent of class.

The leader takes about double any other player's share:

| Players | Leader | Each other player |
|---|---|---|
| 2 | 66.7% | 33.3% |
| 3 | 50% | 25% |
| 4 | 40% | 20% |
| 5 | 32% | 17% |
| 6 | 30% | 14% |

General rule: leader share = 2 ÷ (players + 1), with the rest split evenly, then hand-rounded to the cleanest nearby numbers. Each player's block applies to their own share. Ties go to the higher hand total, then to a coin flip. Feet and activity also feed the contribution score (section 11.4).

Solo, there is no one to split with, so the Feet die only pays out and joins synergies.

### 10.3 How a party plays together

- **Simultaneous.** Everyone rolls and shapes at once. The round resolves when the last person locks in. A short timer is an option for impatient tables.
- **Shared target.** The party agrees (or the leader picks) which monster to hit, or each player may choose their own.
- **Fleet Dice style joining.** A four-digit code and a link. No account needed.
- **Host-authoritative.** One device runs the rules. Because the engine takes its randomness from an injected seed, a battle is reproducible: clients send only what they chose (rerolls, cards, target, lock-in) and the host replies with results. This keeps cheating out and lets a dropped player rejoin.
- **Variety by encounter.** Whole party versus one big monster; or a **ghost duel**, where each player fights an individual opponent at the same time; or a **swarm** of twenty small monsters where each player can only engage one at a time, so the party must spread out.

---

## 11. Progression

### 11.1 Levels and XP

XP comes from monsters. The next level costs `28 + 12 × (level − 1)` XP. The cap is **level 20**. In simulation a hero ends Act I around level 5 and Act II around level 9, so a long campaign has real room to run.

Each level gives:

- **+4 max HP.**
- **One perk**, chosen from three offered at random.
- A **class card** at the fourth level.
- A new tier of **dice growth** at the right levels (11.3).

### 11.2 Perks

Small, composable, Gloomhaven-flavored choices. Each has a limit so no hero stacks one forever.

| Perk | Effect | Max |
|---|---|---|
| Vitality | +6 max HP | 5 |
| Arcane Reserve | +1 Magic at the start of every battle | 3 |
| Quick Hands | Reroll actions may reroll +1 die | 2 |
| Keen Edge | +1 to every red lane | 3 |
| Ironward | +1 to every blue lane | 3 |
| Piercing Pips | Each 2 rolled on a cardinal die pierces +1 | 3 |
| Gold Sense | +25% gold from dice and the fallen | 3 |
| Last Stand Grit | Last Stand leaves +4 HP | 2 |
| Frugal Mender | The Heal card costs 1 less Magic (minimum 1) | 1 |

### 11.3 Camp: the Forge, the Pack and the peddler

At Camp you are always healed and every card is ready. You spend **gold**:

| Upgrade | d4 → d6 | d6 → d8 | d8 → d10 |
|---|---|---|---|
| Strength die (each hand) | 40 🪙, level 3 | 100 🪙, level 7 | 220 🪙, level 12 |
| Special die (each corner) | 50 🪙, level 4 | 120 🪙, level 9 | 250 🪙, level 14 |

A bigger die cannot be bought before its level. This is the "a low-strength character cannot wield a bigger die than their strength allows" rule, made concrete.

A **peddler** sells four weapons that change as you move down the road, and your **Pack** holds anything you have found. You can equip a one-handed weapon to either hand, equip a two-handed one to both, or sell anything for gold. Camp saves your hero automatically.

### 11.4 Loot, rarity and the contribution score

When a monster falls it drops weapons. You choose **one** from a set (player count plus one). In a party, the player who contributed most chooses first, and gold is split equally.

**Contribution** is calculated by the game, not by who dealt the most damage. It counts damage, healing, shielding, saves, big plays, and being the initiative leader. A great healer can finish first.

**Rarity** is a color tier, independent of die size:

| Tier | Color | Effect |
|---|---|---|
| Bronze | bronze | Base faces |
| Silver | silver | +1 to the blank face |
| Gold | gold | +1 to the blank and +1 to the top face |
| Diamond | cyan | +1 to the blank, the top, and the next-highest face |

Higher tiers are rarer: roughly 70 / 22 / 7 / 1 percent, shifted upward by elites, bosses, perilous quests and deeper acts. Elites always drop Silver or better, and bosses Gold or better. The original note left it open whether rarity does anything besides color; this version says yes, a little, so that finding a Diamond is exciting rather than only decorative (Open Question 6).

---

## 12. The campaign

The road is a series of **Acts**, each ten quests long. At each quest you pick one of two roads: a **Standard** quest, or a **Perilous** one with tougher monsters and **1.5× gold and XP.** The fifth quest of an Act is an **Elite**. The tenth is the **Boss**.

| Act | Name | Mood | Boss |
|---|---|---|---|
| I | The Ashen Marches | Goblins, wolves, a fire that will not die | The Goblin King |
| II | The Hollow Crypt | The dead do not rest. They organize. | The Hollow Lich |

Act II numbers are a first draft. When the list of Acts runs out, the road loops as an **Ascent**: monsters have +80% health and +3 damage per cycle, so the campaign can run for as long as anyone wants. More Acts are a content addition, not a code change, because they live in `js/data.js` as data.

Quest names and the order of encounters are generated from a **campaign seed**, so a hero sees the same road every time they reload.

**Defeat is not the end.** A fallen or retreating hero returns to Camp having lost 15% of their gold. Level, gear and perks are safe. Try again.

---

## 13. Saving a hero

A hero is saved by **name and password**. Heroes live in the browser's local storage on the device. The password is hashed (SHA-256 with a salt) and is checked before the hero opens. Camp, a victory and the quest board all save automatically.

**What this is, and what it is not.** It is a friendly gate that keeps a sibling from opening your hero. It is *not* encryption, and it does not travel between devices by itself. A hero is lost if browser data is cleared.

Two things soften that:

- **Soul Code.** Any hero can be exported as a short code and imported on another device or restored after clearing data. The code carries the hero and the password hash, so it should be treated like a password.
- **Cloud saves (planned).** The right long-term answer is a small server that stores a hero against a name and password hash with rate limiting. It is also what four-digit party codes will need. See the roadmap.

---

## 14. Balance, and how we know

A bot plays the real engine (`tools/sim.mjs`) and the numbers above came from watching it. The bot is a competent but not clever player: it rerolls to maximize a value score, heals when hurt, spends cards, and targets the weakest monster, or one that is winding up.

| Class | Damage / round | Damage taken / round | First fight | HP left after |
|---|---|---|---|---|
| Knight | 11.1 | 2.0 | 4.4 rounds | 84% |
| Ranger | 15.9 | 3.5 | 3.5 rounds | 72% |
| Wizard | 14.1 | 2.5 | 3.6 rounds | 76% |
| Dwarf Warden | 11.2 | 1.9 | 4.6 rounds | 82% |
| Bard | 10.0 | 2.0 | 5.3 rounds | 91% |

Across a ten-quest Act I, every class clears it, with the boss as the real test (about 8 to 14 rounds, ending with 40–60% health). Fights of ordinary monsters run four to six rounds and elites run six to ten. A human will play worse than the bot, so the early game errs on the forgiving side.

**Things the simulation caught.** (1) Monsters were too weak: the hero was taking half a point of damage a round because block soaked everything. Monster health went up about 1.7× and every strike gained a flat bonus. (2) Straights were free (section 7). (3) A reinforcement summoned mid-round crashed the engine; it now joins the *next* round.

Run it yourself: `npm run sim`.

---

## 15. Decisions

Each of these changed or settled something from the original brainstorm. They are listed so you can overturn any of them.

1. **What is the "top row"?** The notes called it "Head + both Hand/Weapon dice" but also placed the hands on the east and west of the grid, which makes the top row *weapon · head · weapon.* The Bow versus Long Sword tests measured weapon faces, so the top row is weapon · head · weapon. Hands are not part of it.
2. **Heart faces 5 and 6.** They boosted "blue and red results," but color lives only on the weapon corners, and the heart is not supposed to touch the corners. Resolved: they lift the **lane total** of the best lane of that color. The 1 to 4 faces keep the "cardinal dice only" rule.
3. **Rerolls versus Magic.** The notes said both "three free actions of three dice" and "each reroll costs 1 Magic," and nobody starts with Magic. Resolved: **the first action is free; later actions cost 1 Magic per die;** every class starts with 2 to 4 Magic.
4. **Sword and Shield sum to 8,** not 7 (0 + 1 + 3 + 4). The face lists are kept exactly as designed. The tests record this as a known exception. If you want the budget to be strict, one face drops by 1 (for example, 0, 1, 3, 3).
5. **Straights** now require 5 in a row, ignore blanks, and use the seven numeric dice (section 7).
6. **Naming.** The old "Reset Phase" (the gold shop) is now **Camp**. **Reset** is the screen between rounds, where Magic is spent. Gold is spent only at Camp.
7. **Specials.** The notes gave example symbols (repair, loot, magic, 2×). They are now fixed: ✚ Mend and ⚡ Surge on the left, ✦ Spark and ⚡ Surge on the right. A "loot" symbol was dropped because gold already comes from 1s.
8. **Hand payouts scale with die size** (table in 4.1), as the notes expected but did not specify.
9. **Your strike lands first,** and a fallen monster does not retaliate.
10. **Last Stand.** A once-per-battle survival at 1 HP, as the kindness of Minecraft Dungeons meeting the stakes of Gloomhaven.
11. **Camp after every battle.** The notes left this open. It is the Minecraft Dungeons rhythm and keeps saves frequent.
12. **Rarity does something** (a small pip bonus), not only color.
13. **Weapon die size stays d4.** The notes said bigger dice later; growth lives on the hands and specials, and rarity covers weapon improvement.
14. **Monster health is not a strict per-player formula.** It is a table (10.1), and fights target four to eight rounds.
15. **Feet in solo** have no combat role beyond payouts and synergy. Initiative begins at two players.

---

## 16. Open questions

1. Final helmet and boots abilities beyond the shared number language.
2. Whether special dice are fixed per class or can be found as loot.
3. Class card numbers: balance beyond the first draft, and four to six cards per class.
4. Whether Sword and Shield should be 8 or 7.
5. The full roster of weapons (eight exist; more are cheap to add).
6. Whether rarity should do more than adjust pips.
7. A **mid-fight Reset spending** question: today Reset allows healing and recharging; should it also allow weapon swaps?
8. Party balance for two to six players. Nothing beyond the starting table has been tested.
9. A name that is not "QuestDice" (a working title).
10. Statuses beyond bind and drain (poison, burn, fear) and elemental weaknesses.

---

## 17. Roadmap

| Stage | What | Status |
|---|---|---|
| **0. Foundations** | Engine, data, balance simulator, tests | Done |
| **1. Solo playable** | One hero, full battle loop, Reset, Camp, quest board, levels, perks, loot, passwords, Soul Code, two Acts, tutorial tips | Done |
| **2. Solo polish** | Hand-drawn art and monster portraits, music, dice animation, a first-run tutorial battle, more weapons and cards, Act III | Next |
| **3. Party play** | Server and room codes, 2–6 players, initiative split, contribution score, party loot rules, reconnect | Planned |
| **4. Cloud saves** | Name and password stored server-side with proper rate limiting | Planned |
| **5. Live content** | New Acts, seasons, weekly challenge seeds | Later |
