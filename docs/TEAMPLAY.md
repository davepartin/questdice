# QuestDice teamwork ideas (party play, 2 to 6 heroes)

The goal: friends in the same room, each on a phone, cheering for each other's dice. The guardrail: nothing should slow a
round down. Every team bonus below is either **automatic** (the game spots it and celebrates it, no extra taps) or a
**single tap** on a friend's portrait. At most one team banner per round, so a big moment stays big.

How often things happen (measured): one hero lands some triple on about 7 to 11% of throws before rerolls, more after
chasing it. So two heroes both landing triples in the same round is a few-times-an-adventure moment, which is the
right rarity for a celebration.

## Decided (from Dave) and built into the rules engine

**Triple names.** Weapons Triple (top row), Strength Triple (middle row), Head to Toe Triple (down the middle).
Weapons and Strength give +10 attack; Head to Toe gives +10 block.

**Team triples** (two or more heroes, same round, same row):
- **Team Weapons Attack +10** each, when they hit the same monster.
- **Team Strength Attack +10** each, when they hit the same monster.
- **Team Head to Toe Block +10** each.

**Heartbeat (automatic).** If every hero's heart die shows the same face, each hero gains magic equal to the number of
heroes (2 in a two-hero game, 6 in a six-hero game).

**Who the monsters go after (Dave, Oct 2026).** The hero with the lowest Feet that round draws the attacks and takes a
double share of every hit; everyone else takes a single share. A tie goes to the hero with more health right now. Feet
still set initiative too: the highest Feet acts first. So a quick roll both strikes early and stays out of the line of fire.

**Moral Boost +3 (automatic).** The hero who lands a killing blow gives the next hero to act +3 attack (if nobody is
left to act that round, it carries to the first hero next round).

**Team actions: one per hero per round**, chosen from a Team Actions list beside Magical Powers:
- **Healing potion to a friend.** It is the same potion as yours: every hero carries 2 a battle (3 with the Potion Belt
  from camp), and one thrown to a friend is gone from your own list.
- **Share magic.** Pay 2 magic; your friend gains 2.
- **Revive.** Once a battle: pay 10 magic, a knocked-out friend stands back up with 10 health (acts next round).

**Battle points** (solo and party; see POINTS in js/data.js): damage dealt 1 a point, damage blocked 0.5, healing
yourself 0.5, healing a friend 2, killing blow 15, each triple 10, each team triple 20, a straight 10, magic given 4 each,
a revive 40, being knocked out -40. A small counter beside the round shows your points. Each battle starts at 0; the
camp Hero tab keeps a Hall of Fame: total points, battles, best battle, 1st places and 2nd places.

**Placing (party only).** 1st place trophy to the top scorer; 2nd place only with 3 or more heroes. The fallen's gold
is shared evenly, then 1st gets half a share more and (3+ heroes) 2nd a quarter share more; everyone else the same.

**Spoils draft (party).** Heroes choose in order of points. On your turn take one weapon or skip; the turn moves on and
comes back around until the spoils are gone or everyone skips in a row. Weapons cannot be traded between heroes; you
can only sell them.

Not doing (Dave): Focus Fire, Side by Side, Team Straight, Cover, Lend a Reroll.

Still to build: the party screens in the 3D game (team actions list, choosing a friend, victory "You took 1st place!",
the draft). The rules engine and the networked table already run all of the above.

## Content rule (Dave)

Fine: skeletons, ghosts, Halloween witches, pumpkin heads, baby dragons, dinosaurs, mad bears, and the like.
Not in the game: Satan, demons, cults, pentagrams or occult ritual imagery.
