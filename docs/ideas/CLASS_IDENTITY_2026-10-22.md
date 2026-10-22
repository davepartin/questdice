# Class identity: what each class has today, and the smallest changes that would make it feel like itself

22 October 2026. Asked by Dave, with ChatGPT reviewing design and results (no code changes from ChatGPT; Claude is the only code
editor in this phase): "Include class identity in the evaluation: Ranger precision and arrows, Mage magic, Bard team support,
Knight protection, and Dwarf endurance. Review the existing abilities first, then propose the smallest changes that make their
decisions feel different. Keep the experimental work isolated until we review the results."

Nothing here is in the live game. Measurements still running are marked *pending*; they will be filled in below.

## 1. What each class has today (read from js/data.js, CLASSES and CLASS_TALENT)

Every class rolls the same nine dice under the same rules. They differ in health, speed (feet die), a strong hand, starting
magic, starting weapons, their two talent symbols and six magic powers (two choices in each of three slots: A a big move once a
battle, B a power you can use every round, C a charge you store and release).

| | Health | Feet | Magic (start / cap at level 1; the cap grows 1 every two levels) | Weapons | Talents | A (big move) | B (every round) | C (charge) |
|---|---|---|---|---|---|---|---|---|
| **Knight** | 34 | d4 | 4 / 12 | Sword + Shield | heal, attack | Cleave (2d6, half splashes) · Judgment | Shield Up (+4 block) · Press the Attack (+3 attack) | Rally Cry (attack + block) · Second Wind (heal) |
| **Ranger** | 28 | d6, trains to d8 | 4 / 12 | Bow (both hands) | block, attack | Aimed Shot (2d6 to 4d6 pierce) · Rain of Arrows | Quick Draw (free reroll of 2 dice) · Snare (monsters hit 2 softer) | Volley (pierce) · Vanish (block) |
| **Wizard** | 24 | d4 | 6 / 15 | Staff (both hands) | magic, heal | Arc Bolt (1d8 to 5d8 attack) · Meteor | Magic Missile (+2 pierce) · Barrier (+4 block) | Storm Coil (attack, half splashes) · Healing Light (heal) |
| **Dwarf** | 40 | d4 | 3 / 12 | Mace + Tower Shield | block, heal | Grudge (2 × the round) · Avalanche | Shield Bash (+4 attack) · Brace (+4 block) | Stonehide (block) · Forge Fury (attack + block) |
| **Bard** | 30 | d6 | 5 / 12 | Dagger + Bracer | gold, magic | Mending Song (2d6 heal) · Finale | Lucky Verse (a d6 gamble) · Discord (monsters hit 2 softer) | Rising Ballad (attack + heal) · Hymn of Gold (gold) |

## 2. How well each class matches its intended identity today

**Ranger: precision and arrows.** This is the most complete identity already. Precision is in the rules: Quick Draw is the only
every-round power that changes the dice themselves (two free rerolls), Aimed Shot and Volley pay pierce (damage that ignores
block), and only the Ranger can train its feet to a d8 and strike first most often. Arrows are the missing half, and the lab now
carries them: the ammunition choice at camp (Normal, Piercing, Fire, Frost) is a precision decision made before the fight, and the
reroll choice in the fight decides whether to keep an arrowhead. *Gap:* none in the rules. The open question is whether the
ammunition choice actually changes with the fight (the arrow matchups answer that; *pending*).

**Wizard (Mage): magic.** Also clear. The Wizard starts with 6 magic and holds 15 at the start (others 12; every cap grows with level), has the weakest body (24
health), and its signature move, Arc Bolt, is the only power where you decide *how much* magic to pour in (2 magic for 1d8, up to
10 for 5d8). Storm Coil and Meteor splash. *Gap:* the every-round slot is a plain number (Magic Missile +2 pierce, or Barrier +4
block), and Barrier is the same power as the Knight's Shield Up and the Dwarf's Brace. The Wizard's real decision, "spend now or
save for a bigger bolt", happens in slot A only.

**Bard: team support.** This is the biggest gap. In a team game the only Bard power that reaches a friend is Discord (monsters hit
2 softer, and that softening already applies to the whole table). Mending Song, Rising Ballad and Finale heal **only the Bard**.
Lucky Verse and Hymn of Gold are for the Bard alone. The team actions every hero has (share 2 magic, revive a fallen friend for
10) are the same for the Bard as for anyone else. So today the "heart of the party" is a self-healing gambler who earns gold.

**Knight: protection.** Half there. The Knight has a shield, Shield Up (+4 block every round) and slow feet. In a team game the
hero with the slowest speed roll each round takes the double share of the monsters' blows, so a d4 Knight often stands in front,
but that is luck of the feet die, not a choice, and the Dwarf (also d4) competes for it. Shield Up's +4 block protects only the
Knight's own share. Barrier (Wizard) and Brace (Dwarf) are exactly the same power. *Gap:* nothing lets the Knight choose to
protect someone.

**Dwarf: endurance.** Half there. The Dwarf has the most health (40), a Tower Shield, Stonehide (the biggest block charge), and
Grudge, the only big move that grows with the length of the fight (2 × the round number). In the campaign the Dwarf is the
safest class (Act III: 100% of fights won, and only 1% of fights end below a quarter health; the Wizard is at 23%). *Gap:* the
Dwarf is tough, but toughness is a number, not a decision. Brace duplicates Shield Up and Barrier. And endurance only matters if
long fights get harder, which is what the monster-fury rule (from round 5) tests.

**Two things that blur every class.**
1. **The same power three times.** +4 block every round is the Knight's Shield Up, the Wizard's Barrier and the Dwarf's Brace;
   "monsters hit 2 softer" is the Ranger's Snare and the Bard's Discord. A player who picks the safe option ends up with the
   same game in three costumes.
2. **Gear converges.** In the full-campaign runs every class ends Act III carrying the same weapons the bot rates best (two
   Long Swords, or a War Hammer). Weapons stop saying anything about the class after Act I. The one-handed weapons experiment
   helps here (class starting pairs, no two-handers), but the powers have to carry the identity.

## 3. The smallest changes (proposals, each behind a switch, solo play unchanged unless noted)

The rule for choosing these: one sentence each, no new screens, no new dice, and each one should create a *decision*, not just
a bigger number.

**Bard: songs carry (team games only).** The Bard's healing (Mending Song, the heal half of Rising Ballad, Finale's heal) goes to
the most hurt hero at the table, the Bard included. And when the Bard shares magic, the friend gets 3 for the Bard's 2. *Why:*
the Bard's decision becomes "who needs it most", and healing a friend costs the Bard its own safety. Solo play is unchanged.
*Measure:* team games (tools/party.mjs) with a Bard in the pair: does the pair win more, and does the friend's lowest health rise?

**Knight: Guard (team games only).** Shield Up gains a second line: "and you take the double share of the monsters' blows this
round", whatever the feet dice say. *Why:* protection becomes a choice the Knight makes each round (turn it on when a friend is
low, leave it off when you are), not luck of the slowest roll. Solo play is unchanged (there is no one to stand in front of).
*Measure:* team games with a Knight: does the friend's lowest health rise, and do fewer friends fall?

**Dwarf: Dig In (solo and team).** From round 5 the Dwarf heals 2 at the start of every round. *Why:* it is the answer to the
fury rule (monsters grow angrier from round 5), so the Dwarf is the class that wants the long fight; with Grudge it is the
"outlast them" class. The decision it creates: a Dwarf can afford to block and wait where others must race. *Measure:* the
class-kit run and the curve with and without, with fury on and off. It should matter only in long fights.

**Wizard: Overcharge (solo and team), the smallest version.** Arc Bolt may spend past the cap: magic you pour in beyond 10 still
adds dice, but the Wizard loses 3 health for each extra 2 magic. *Why:* the Mage's identity is "how much magic will you burn",
and this makes the biggest moment a real risk on the frailest body. *Alternative if that feels like too much:* no rule change;
replace Barrier with a power only the Wizard has ("Mana Shield: block equal to your magic left, up to 8"), so the Wizard's safe
choice still reads as magic. *Measure:* the class-kit run.

**Ranger: nothing new beyond the arrows.** The Ranger already has the clearest identity. The arrows (in the lab) add the
camp-side precision choice. If the arrow matchups show one ammunition winning every fight, the fix is in the arrow numbers, not in
a new Ranger power.

**Removing the duplicates (optional, after the above).** Once Knight, Dwarf and Wizard each have their own every-round power,
the three copies of +4 block can stay as the plain safe option for each, or be renamed and reshaped. That is a content change for
later, not part of this first test.

## 4. How the evaluation measures identity

Two questions for each class, answered by the bots (the same wise bot that plays every other test):

1. **Do its decisions change with the fight?** tools/classkit.mjs gives every class all eight of its power kits (2 × 2 × 2)
   against four fights (one heavy hitter, a swarm of three, an armoured monster, a monster that heals itself), with the levels it
   bought moved onto whichever power it carries, and reports the best kit for each fight and what choosing per fight is worth
   against sticking with one favourite. This is also the magic test ChatGPT asked for: today's live powers as the baseline,
   "situational choice against a favourite power". *Pending.*
2. **Does the class do its job?** Ranger: pierce and arrowheads landed. Wizard: magic spent and its share of the damage. Bard
   (teams): health given to friends, friends' lowest health. Knight (teams): damage taken for friends. Dwarf: health in fights
   that last past round 5. Today's numbers come from the curve and party tools; the proposals are then switched on one at a
   time, and the same numbers are compared.

## 5. Results

*Pending: class kits (today's powers), team games with each ammunition, the arrow matchups, and the monster rules one at a time.*
