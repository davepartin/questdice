# QuestDice — Bestiary and Enemy Mechanics

How monsters think, what they can do, and how to build a new one. The player's side of the game is in [DESIGN.md](DESIGN.md). Every number here lives in `js/data.js` (`MONSTERS`, `ACTS`, `PARTY`) and is rules-checked by `test/engine.test.mjs`.

---

## 1. The idea in one paragraph

In most dice games you fight a number. In QuestDice you fight a creature with habits. Each round, **before you roll,** the monster rolls a single six-sided **Intention die** and shows you the face: a stab, a guard, a hex, a wind-up. You now know *what kind* of thing is coming, and a range for *how hard.* Then you roll your own body, shape it, and lock in. The monster **never rerolls**, so its behavior is readable, and all of your agency goes into answering it well. That is the Gloomhaven half (read the enemy's card, plan around it) married to the Minecraft Dungeons half (you can see the big hit coming and do something about it).

## 2. A monster's anatomy

A monster is much simpler than a hero. At minimum it has:

| Part | What it is |
|---|---|
| **Health** | Shown as a bar. Scales with the quest and the party. |
| **Intention die (d6)** | Rolled at the start of every round. Each face is a named move from the monster's own table. Shown to you. |
| **Power die** | Rolled at lock-in, together with your resolve. Decides how hard the move lands. Its size is the monster's *strength*: d8 for the common minions (d10 for the tougher Act II ones), d10 to d12 for elites, d12 and up for bosses. |
| **Slam** (elites, bosses) | The big hit that follows a Wind-Up. |
| **Rage table** (bosses) | A second Intention table, used at half health. |
| **Reinforcement** (some) | Which monster it summons. |

A simple monster has just an Intention die and a Power die. Bigger monsters accumulate behaviors, not boards. (A natural future step is giving a boss its own vertical line of dice, head to feet, mirroring the player, so a boss can have its own amplifier. See section 11.)

### 2.1 Why the Intention is shown but the Power is hidden

Showing the *kind* of move and a *range* gives you a decision without removing the thrill. If you know a goblin will stab for somewhere between 4 and 11, you decide how much block to chase. The exact number is rolled with your lock-in, at the same moment as yours. The tension is in the reveal.

### 2.2 The magnitude formula

```
damage  =  f  +  m × Power  +  quest flat  +  pack buff  −  your weaken
guard   =  f  +  m × Power
```

`f` and `m` come from the face. The **quest flat** is a bonus every strike gets (starts at +2, grows by 1 every three quests, +3 more per Ascent). A **pack buff** comes from a Howl. **Weaken** comes from cards like Snare and Discord. Damage never drops below zero.

---

## 3. The moves (verbs)

Every face of every monster is one of ten verbs.

| Verb | What it does | Your answer |
|---|---|---|
| **Strike** | Damage. Your block reduces it. | Block, or kill it first. |
| **Pierce** | Damage that **ignores block.** | Kill it, weaken it, or heal. |
| **Guard** | This round the monster blocks that much of your **non-piercing** damage. | Aim at someone else, or use pierce. |
| **Mend** | Heals itself. | Burst it down. |
| **Wind-Up** | Does nothing this round. **Next round it Slams** unless staggered. | Stagger it or brace. See 4. |
| **Howl** | Every monster's next strike gains +k. | Kill the howler or block harder. |
| **Bind** | Locks *k* of your dice next round: you cannot reroll them. | Plan around them, or nudge the heart. |
| **Drain** | Strikes, and steals *k* Magic. | Spend your Magic first. |
| **Pilfer** | Strikes, and if it connects, steals up to 6 gold. The thief carries it. | Kill the thief and you get it back. |
| **Summon** | Calls *k* reinforcements (they join next round). | Kill the caller, or thin the crowd. |

A summoned monster has three-quarters of its normal health, gives no XP or gold, and joins on the following round rather than acting immediately. There are never more than four monsters at once.

---

## 4. Wind-Up, Slam and Stagger

This is the signature mechanic and it deserves a longer look.

**The promise.** When a monster rolls a Wind-Up, the Reset screen tells you plainly: *"Wind-Up: SLAM next round. Deal 21+ this round to break it."* The monster itself does nothing damaging that round. It is a free round for you, and a warning.

**The Slam.** Next round its Intention is automatically a Slam, which is a strike with a much bigger formula (for the Hill Ogre, `2 + 2 × Power`, on top of the quest flat). The Reset screen shows it in red with its damage range, and a banner tells you to brace.

**Your two answers.**

1. **Stagger it.** Deal at least the monster's **stagger threshold** in a *single round* to *that monster* and the wind-up is cancelled. The threshold is a quarter of its maximum health, never less than 4. Damage counts, including pierce, and any **stagger** your gear and cards add (Shield bash, Long Sword 4, Crushing Blow, Snare, Bulwark Smash). Doing it means turning your whole board to offense for a round.
2. **Brace for it.** Roll into block, play a Shield Wall, a Stonehide, or a Barrier, and take the hit on your terms. Weaken cards shave the Slam too.

Both are real choices, and neither is free. If you stagger, you spend a round on offense and ignore the monster's other friends. If you brace, you take a lot of damage and the Wind-Up round was wasted setting up defenses.

**In a party** this becomes a team call: who bursts, who braces, who heals. Because the Slam is telegraphed a full round early, it is a coordination puzzle rather than a surprise.

---

## 5. Rage (boss phases)

At **half health or lower**, a boss enters a rage. Its **Power die grows** (d12 → d14 for the Goblin King) and its **Intention table changes** to a meaner one with more summons and more Wind-Ups. A banner and a screen shake mark the change, and the card shows its rage name ("Greed-Mad", "Unbound"). The new table applies from the *next* round.

This gives a boss fight a shape: a first half that teaches you the monster, and a second half that raises the stakes right when you are most tired. It is the Minecraft Dungeons boss rhythm in a dice game.

---

## 6. Targeting and focus

With more than one monster you tap the one you want to hit. Your attack goes to that monster alone, so overkill is wasted. Your strike lands **before** the monsters act, so a monster you kill never strikes back. This makes focus fire strong and makes the order of a swarm matter: remove the Howler first, or the Summoner, or the one winding up.

A **Guard** only protects the monster that rolled it, so if one of two goblins ducks, hit the other.

---

## 7. How encounters scale

| Lever | Effect |
|---|---|
| **Quest step** (1 to 10) | Health +5% per step beyond the first. Flat damage +1 every three steps. |
| **Act** | +20% health for each Act in the list. |
| **Ascent** (the road loops) | +80% health and +3 flat damage per full cycle. |
| **Perilous road** | +25% health, +1 flat damage, ×1.5 gold and XP. |
| **Party size** | Health ×1 / 1.8 / 2.5 / 3.1 / 3.6 / 4.0 for 1–6 players, plus 0 / 0 / 0 / 1 / 1 / 2 extra goblins. Only solo has been tuned. |

The two roads offered at each step are drawn from the Act's pool; the **Standard** road is always the lighter formation of the pair.

---

## 8. Reading a monster table

Below, each monster shows its six Intention faces. The number after the verb is the **base range** (`f + m × 1` to `f + m × Power`), before the quest flat, which begins at +2. For example, a Goblin's Stab shows 2–9; in the first quest it really lands for 4–11.

Tiers: **minion** (the common rank and file), **elite** (a mini-boss with a Wind-Up) and **boss** (one per Act, with rage).

---

## 9. The monsters

### Act I — The Ashen Marches

#### 👺 Goblin Skulker — minion
Base HP 30 · Power die d8 · XP 8 · gold 6

| d6 | Intention |
|---|---|
| 1 | Stab (Strike 2–9) |
| 2 | Stab (Strike 2–9) |
| 3 | Pilfer (Pilfer 1–8) |
| 4 | Duck (Guard 2–9) |
| 5 | Slash (Strike 3–10) |
| 6 | Fire Bomb (Pierce 2–9) |

*The first thing you meet. It is fragile and sneaky: it pilfers gold, ducks behind a Guard, and throws a Fire Bomb that ignores your shield. A pair of them is the standard opening fight.*

#### 🐺 Dire Wolf — minion
Base HP 40 · Power die d8 · XP 10 · gold 8

| d6 | Intention |
|---|---|
| 1 | Bite (Strike 2–9) |
| 2 | Bite (Strike 2–9) |
| 3 | Howl (Howl k=2) |
| 4 | Lunge (Strike 2–16) |
| 5 | Bite (Strike 2–9) |
| 6 | Rend (Strike 3–10) |

*The pack animal. Alone it is a tough biter. Two together are dangerous, because a Howl makes every bite hit harder.*

#### 🧙 Ashen Cultist — minion
Base HP 34 · Power die d8 · XP 12 · gold 10

| d6 | Intention |
|---|---|
| 1 | Hex (Bind k=1) |
| 2 | Ember (Pierce 1–8) |
| 3 | Ward (Guard 2–16) |
| 4 | Siphon (Drain 1–8 k=2) |
| 5 | Bolt (Strike 2–9) |
| 6 | Hex (Bind k=2) |

*The first spellcaster. It never hits very hard, but it takes things away from you: locked dice, drained Magic, a Ward that blunts your attack. Kill it early.*

#### 👹 Hill Ogre — elite
Base HP 84 · Power die d10 · XP 30 · gold 28 · Slam 2+2×power

| d6 | Intention |
|---|---|
| 1 | Club (Strike 1–10) |
| 2 | Club (Strike 2–11) |
| 3 | Stomp (Strike 1–10) |
| 4 | Wind-Up (Wind-Up) |
| 5 | Roar (Guard 3–12) |
| 6 | Wind-Up (Wind-Up) |

*The first Elite and the first Wind-Up. It is slow and heavy, and it teaches you to read the telegraph. The Slam is brutal, but the Ogre does nothing damaging while it winds up.*

#### 👑 The Goblin King — boss
Base HP 100 · Power die d12 · XP 80 · gold 70 · Slam 3+2×power · calls Goblin Skulker

| d6 | Intention |
|---|---|
| 1 | Scepter (Strike 2–13) |
| 2 | Scepter (Strike 2–13) |
| 3 | Rally! (Summon k=1) |
| 4 | Gold Shield (Guard 3–14) |
| 5 | Wind-Up (Wind-Up) |
| 6 | Fire Bombs (Pierce 3–14) |

**Greed-Mad** (at half health, power die becomes d14):

| d6 | Intention |
|---|---|
| 1 | Frenzy (Strike 3–16) |
| 2 | Rally! (Summon k=1) |
| 3 | Rally! (Summon k=1) |
| 4 | Wind-Up (Wind-Up) |
| 5 | Fire Bombs (Pierce 3–16) |
| 6 | Wind-Up (Wind-Up) |

*The Act I boss. He calls goblin reinforcements, hides behind a Gold Shield, and winds up a Slam. At half health he goes Greed-Mad: bigger Power die, more calls for help, more Wind-Ups. Break his Wind-Ups and thin the crowd.*

### Act II — The Hollow Crypt *(draft numbers, untuned)*

The dead do not rest. They organize. These are first-draft numbers and have not been playtested as carefully as Act I.

#### 💀 Bone Soldier — minion
Base HP 46 · Power die d8 · XP 14 · gold 10

| d6 | Intention |
|---|---|
| 1 | Slash (Strike 2–9) |
| 2 | Slash (Strike 2–9) |
| 3 | Shield Up (Guard 3–10) |
| 4 | Stab (Strike 3–10) |
| 5 | Bone Throw (Pierce 2–9) |
| 6 | Slash (Strike 2–9) |

#### 👻 Wraith — minion
Base HP 40 · Power die d10 · XP 18 · gold 14

| d6 | Intention |
|---|---|
| 1 | Chill (Pierce 1–10) |
| 2 | Chill (Pierce 1–10) |
| 3 | Drain (Drain 1–10 k=3) |
| 4 | Wail (Bind k=2) |
| 5 | Phase (Guard 2–20) |
| 6 | Touch (Strike 2–11) |

#### 🕷️ Crypt Spider — minion
Base HP 48 · Power die d10 · XP 16 · gold 12

| d6 | Intention |
|---|---|
| 1 | Bite (Strike 2–11) |
| 2 | Web (Bind k=2) |
| 3 | Venom (Pierce 2–11) |
| 4 | Skitter (Guard 2–11) |
| 5 | Pounce (Strike 2–20) |
| 6 | Bite (Strike 2–11) |

#### 🦴 Bone Warden — elite
Base HP 150 · Power die d12 · XP 55 · gold 46 · Slam 3+2×power · calls Bone Soldier

| d6 | Intention |
|---|---|
| 1 | Cleave (Strike 3–14) |
| 2 | Wind-Up (Wind-Up) |
| 3 | Bone Wall (Guard 3–14) |
| 4 | Raise Dead (Summon k=1) |
| 5 | Smash (Strike 2–24) |
| 6 | Wind-Up (Wind-Up) |

#### ☠️ The Hollow Lich — boss
Base HP 230 · Power die d12 · XP 140 · gold 120 · Slam 4+2×power · calls Bone Soldier

| d6 | Intention |
|---|---|
| 1 | Soul Bolt (Pierce 3–14) |
| 2 | Raise Dead (Summon k=1) |
| 3 | Drain Life (Drain 1–12 k=3) |
| 4 | Dread (Bind k=2) |
| 5 | Wind-Up (Wind-Up) |
| 6 | Bone Armor (Guard 3–14) |

**Unbound** (at half health, power die becomes d14):

| d6 | Intention |
|---|---|
| 1 | Soul Storm (Pierce 4–17) |
| 2 | Raise Dead (Summon k=2) |
| 3 | Drain Life (Drain 2–15 k=4) |
| 4 | Dread (Bind k=3) |
| 5 | Wind-Up (Wind-Up) |
| 6 | Wind-Up (Wind-Up) |

---

## 10. Building a new monster

Monsters are data, not code. A new one is a single entry in `MONSTERS` in `js/data.js`:

```js
cinderhound: {
  name: 'Cinder Hound', glyph: '🐕', hp: 36, power: 8, xp: 12, gold: 9, tier: 'minion',
  faces: [S('Bite', 1, 1), S('Bite', 1, 1), { n: 'Howl', v: 'howl', f: 0, m: 0, k: 2 },
          S('Pounce', 0, 2), { n: 'Flame', v: 'pierce', f: 1, m: 1 }, S('Bite', 1, 1)],
}
```

Then add it to a formation in an Act's `pool`. Run `npm test` (it checks that every table has six faces, valid verbs, a slam when it can wind up, and `adds` when it can summon) and `npm run sim` to see how it plays.

**A rough budget** to aim for, solo, at the start of the game:

| Tier | Health | Power | Raw damage a round | Fight length |
|---|---|---|---|---|
| Minion | 30–40 | d8 | 5–7 if it attacks | Four to six rounds (alone or in a pair) |
| Elite | 70–110 | d10 to d12 | 6–8, plus a Slam of 12 to 20 | Six to ten rounds |
| Boss | 100–230 | d12 and up | 8–12, with a rage | Eight to fourteen rounds |

A hero deals roughly 10 to 16 damage a round and blocks 4 to 5, so minion health is about three rounds of damage per monster. A face list should be mostly damage, with **one or two** utility faces (a Guard, a Howl, a Hex) that give the monster a personality. Keep a *signature* move at the sixth face if you can. The faces that are not damage are what make a monster memorable.

**Rules of thumb.**

- Never give a monster two ways to lock the player down (two Bind faces is the limit).
- A Wind-Up must always have a Slam. Make the Slam several times a normal hit, not a little more.
- If a monster summons, the summon should be one of its *weaker* faces, so the reinforcements are earned by luck, not guaranteed every round.
- Bosses should always have a rage.

---

## 11. Ideas not yet built

These came from the original brainstorm or from playtesting thoughts, and are designed but not implemented.

- **Ghost duels.** Some rounds each player is split off to fight their own opponent one on one, all at once. In a party this becomes a set of small simultaneous fights that end together.
- **Swarms.** Twenty small monsters, where each player can only engage one at a time, so the party has to spread out and choose.
- **A boss with its own body.** A vertical line of dice, head to feet, for the biggest bosses, with its own amplifier in the middle. The Intention die becomes the heart.
- **Weak points.** A face of the Intention die that opens a vulnerability: the next hit of a given color does extra.
- **Statuses.** Poison, burn, fear, slow, each with a clear icon and a limited number of rounds.
- **Elemental weaknesses.** A monster that takes extra from one weapon family.
- **Environmental hazards.** A cursed ground that locks a corner die for the whole battle.
- **Monster initiative** in a party: a boss that targets whoever has the highest feet, not just takes a shared hit.
