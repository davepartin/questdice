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

### 5.1 Class kits with today's powers (docs/balance/classkit_today.txt)

Act II heroes, every kit of their class, the four fights, 16 fights a cell, wise bot, today's weapons, no pressure rules.

| Class | Start kit, health a fight | Best single kit | Its health a fight | Choosing per fight is worth | Kits that win a fight |
|---|---|---|---|---|---|
| Knight | 20.5 | Judgment / Shield Up / Rally Cry | 19.2 | 0.4 | 3 |
| Ranger | 21.6 | Aimed Shot / Snare / **Vanish** | 19.3 | 0.8 | 3 |
| Wizard | 17.2 | Meteor / **Barrier** / **Healing Light** | 11.9 | 0.8 | 3 |
| Dwarf | 11.3 | Avalanche / **Brace** / Stonehide | 9.7 | 0.3 | 3 |
| Bard | 15.5 | Mending Song / **Discord** / Rising Ballad | 14.7 | 1.0 | 4 |

What it says:

1. **Choosing powers per fight is worth almost nothing today: 0.3 to 1.0 health a fight.** Different kits do edge out in
   different fights (three or four winners per class), but the margins are small. This answers ChatGPT's magic test: a
   situational choice is barely better than a favourite.
2. **The safe option wins every slot, for every class.** The Wizard's best kit swaps Storm Coil for Healing Light and Magic
   Missile for Barrier (17.2 down to 11.9 a fight). The Dwarf takes Brace over Shield Bash, the Ranger Vanish (block) over
   Volley (pierce), the Bard Discord (monsters hit softer) over Lucky Verse. This is the same root cause the weapon matchups
   found: health is the only thing a fight costs, so block and healing always pay and attack only pays by ending the fight a
   little sooner. Left alone, every class drifts toward the same careful kit, which is the opposite of identity.
3. **The start kits are never the best kit.** The Wizard's is the furthest off (5.3 health a fight). Worth a look regardless:
   a new player should start with a kit that is at least close to good.
4. **Class strength is uneven in these fights.** Dwarf 9.7, Wizard 11.9, Bard 14.7, Knight 19.2, Ranger 19.3 health a fight
   (best kits). One snapshot per class at two quests, so treat it as a hint; the full campaign (curve) has the Dwarf safest
   and the Wizard most fragile.

So the identity proposals only make sense together with the pressure work: until long fights cost something, the "careful"
power wins for everyone. Next run: the same kits with fury on (from round 4), to see whether attacking kits start winning
some fights.

### 5.2 Team games with the class rules (docs/balance/classteam_*.txt)

`node tools/party.mjs 2 4` (Acts I and II, 20 companies of two: wizard+bard, knight+ranger, dwarf+wizard, ranger+bard,
knight+dwarf), with CLASSID off, all on, songs only and guard only. Each class at the table:

| | off: own lowest health · fell | off: friend's lowest · friend fell | rules on: own · fell | rules on: friend's · friend fell |
|---|---|---|---|---|
| Wizard | 49% · 7% | 63% · 5% | 49% · 6% | 62% · 4% |
| Bard | 62% · 4% | **48%** · 6% | 62% · 4% | 48% · 6% |
| Knight | 60% · 4% | 62% · 4% | 61% · 4% | 64% · 3% |
| Ranger | 55% · 4% | 58% · 4% | 55% · 4% | 58% · 4% |
| Dwarf | 66% · 3% | 60% · 3% | 65% · **1%** | 61% · 2% |

What it says, honestly:

1. **The Bard's friend is the most hurt hero at any table today** (lowest 48%): the "heart of the party" protects itself.
2. **Songs carry barely fired**: the Bard gave friends 0.2 health a fight. The bots seldom cast the Bard's healing powers at a
   table, because the bot judges a power by what it does for its own hero. The rule cannot be judged by these bots; it needs a
   bot that values a friend's health, or human play in the lab.
3. **Guard works as written but the bot does not choose it.** With Guard the Knight took 37.2 a fight instead of 34.8 and its
   friend's lowest rose a little (62% to 63%), friends falling 4% to 3%. The bot casts Shield Up for its own block, not to
   step in front, so this is the rule's effect without the decision.
4. **Dig In** brings the Dwarf's falls from 3% to 1%; small, as expected without fury.

Conclusion for ChatGPT's review: the three rules do what they say, but the effects are small in bot play, for two reasons
that are not the rules' fault: (a) the team bot plays for itself, and (b) without fury, long fights cost little, so endurance
and protection have little to protect against. Before tuning numbers, the next step is to teach the team bot to count its
friends' health (so songs and Guard become decisions it can make), then measure again with fury on.

**Follow-up (same day).** The team bot now counts a friend when the class rules are on (tools/sim.mjs smartActs: a Bard
sings when the most hurt hero is below 60%; a Knight skips Shield Up when it is itself the weaker one below half health). A
check of 40 Bard + Wizard fights found the Bard's healing reaching a friend only 7 times in 226 rounds, although the friend was
below 60% in 44 of them. The limit is the Bard's kit, not the bot: Mending Song is a big move (once a battle) and Rising
Ballad has to be charged, so even a Bard who always helps can heal a friend about twice a fight. **So "songs carry" alone is
too small a change to make the Bard the team's support.** Two smallest next options for review:
(a) at a table, Lucky Verse's roll goes to the most hurt friend as healing on a 3-6 (the every-round power becomes the Bard's
support, and the gamble stays), or (b) at a table, Discord also heals each friend 2 a round (the Bard's safest power, which
the class-kit run already found best, becomes the support power). Option (a) keeps the Bard's choice between gamble and
safety; option (b) is the simplest to read. Team run with the smarter bot: see 5.4.

### 5.3 Class kits with fury from round 4 (docs/balance/classkit_fury4.txt)

| Class | Best kit, no fury | Best kit, fury from round 4 | Choosing per fight is worth |
|---|---|---|---|
| Knight | Judgment / Shield Up / Rally Cry | Cleave / Shield Up / **Second Wind** | 1.0 (was 0.4) |
| Ranger | Aimed Shot / Snare / Vanish | **Rain of Arrows** / Snare / Vanish | 0.3 |
| Wizard | Meteor / Barrier / Healing Light | **Arc Bolt** / Barrier / Healing Light | 0.6 |
| Dwarf | Avalanche / Brace / Stonehide | **Grudge / Shield Bash** / Stonehide (its start kit) | 0.7 (was 0.3) |
| Bard | Mending Song / Discord / Rising Ballad | the same | 0.6 |

With fury, attack powers start to win slots: the Dwarf's best kit becomes its starting kit (Shield Bash over Brace, Grudge
over Avalanche, which fits "endurance": Grudge grows with the round), the Ranger's Rain of Arrows becomes best against the
swarm, the Wizard's Arc Bolt replaces Meteor. The Wizard and the Bard still prefer their safe every-round power (Barrier,
Discord). Choosing per fight is still worth only about a health a fight: the kits are close; the choice is real but small.

### 5.4 Team games: smarter team bot, class rules off and on, with and without fury (classteam_*2.txt, *_fury*.txt)

| | no fury, rules off | no fury, rules on | fury 4, rules off | fury 4, rules on |
|---|---|---|---|---|
| Bard's friend: lowest · fell | 48% · 6% | 50% · 3% | 47% · 8% | 47% · **4%** |
| Bard's healing to friends a fight | 0.0 | 2.2 | 0.0 | 1.8 |
| Knight: damage taken · friend's lowest · friend fell | 34.8 · 62% · 4% | 33.4 · 64% · 3% | 37.3 · 59% · 5% | **41.6 · 62% · 4%** |
| Dwarf: fell | 3% | 1% | 6% | **3%** |
| Wizard: fell (its partners are the Bard and the Dwarf) | 7% | 4% | 10% | 7% |

With fury on, the three rules show their intent: the Bard's friends fall half as often (8% to 4%), the Knight takes about 4
more damage a fight so its friend stays higher (59% to 62%), and the Dwarf falls half as often (6% to 3%). The effects are
still modest, which suits "smallest change"; the Bard's is held back by its kit (see the follow-up in 5.2), so options (a)
or (b) above are the natural next step for the Bard only.

## 6. Recommendation for review

1. Fury from round 4 is the foundation: without it, the careful option wins every slot for every class and the identity
   rules have little to work on.
2. Keep Guard (Knight) and Dig In (Dwarf) as written; both are one sentence, both show their intended effect with fury.
3. For the Bard, choose between (a) Lucky Verse gambles for the most hurt friend and (b) Discord also heals each friend 2
   a round; songs carry alone is too small.
4. Wizard: no rule change yet. With fury its Arc Bolt kit is best; the remaining blur is Barrier (the same as Shield Up and
   Brace), which is a content change for later.
5. Ranger: identity comes from the arrows; their numbers are still being settled (docs/balance/ARROWS_2026-10-22.md).
6. Start kits: the Wizard's start kit is the furthest from its best (Storm Coil and Magic Missile); worth swapping its
   charge to Healing Light or making Storm Coil stronger, after fury is settled.

## 7. The Bard: comparing the two options and the recommendation (23 Oct 2026)

ChatGPT favours targeted support: a choice of teammate that also works solo through self-targeting. The two options from 5.2:

| | (a) Lucky Verse for a friend | (b) Discord heals every friend 2 a round |
|---|---|---|
| Who chooses | the Bard, every round it casts (1 magic) | nobody: automatic while Discord is on |
| Exact effect | roll a d6: 1-2: the Bard +1 magic (as now). 3-4: **3**. 5-6: **6**, and the Bard +1 magic. The 3 or 6 goes to the hero the Bard chose: itself as attack (exactly today's Lucky Verse), a friend as healing. Upgrades raise the 3 and 6 the same way as today (scaleNum) | every other hero heals 2 a round, plus today's "monsters hit 2 softer" |
| Solo | unchanged (self) | unchanged (no friends) |
| Expected value a cast | 1 + 2 = 3 health or attack on average to one hero (a third of casts nothing but magic) | 2 x (heroes - 1) health a round: 2 at a pair, 10 at six |
| Two Bards | two separate single targets (may both pick the same hero: 6 to 12) | 4 to everyone a round: grows with table size and with Bards |
| Decision it creates | who needs it, and is it worth giving up my own attack | none in the moment (only whether to equip Discord) |

**Recommendation: (a), "Verse for a friend."** It is the targeted option, it is the same power with the same numbers (no new
system), solo is untouched, and it cannot snowball: one Bard gives one hero 3 or 6 at most a round. Option (b) is simpler to
read but scales with the number of heroes and of Bards, which the handoff warns against, and it asks for no decision.

Built behind `CLASS2.verse` (js/data.js; on in the lab): engine `castPower(b, 'luckyverse', { to })`, the healing lands with
the friend before the monsters strike (`rep.verses`), the magic sheet asks "For me / For <friend> · <health>%", and the team bot
sings for the most hurt friend when that friend is below 60% and worse off than the Bard. Test: test/classid.test.mjs. The
team measurement (friend's lowest health, falls, healing given, with and without, duplicate Bards) is queued after the
teamwork evaluation; results go in docs/ideas/TEAMWORK_IMPLEMENTATION_HANDOFF_2026-10-22.md.