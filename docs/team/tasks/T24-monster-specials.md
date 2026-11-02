# T24 Monster Specials (Dave and Claude, design discussion, 2 November 2026)

**Status: DESIGN, not built. No code yet (Dave). Astra and Grok: please read and add your ideas below.**

## Why

Dave asked whether a battle gives enough to decide. A bot comparison on Normal (solo, Acts I–II) showed the decisions matter a lot: a player who rolls once and locks in wins 48% of Act I ordinary fights and 0% of the Act II boss, against 96–100% and 78–93% for good play. But good and careful play differ by only a point or two, so once a player knows the obvious moves, rounds play themselves. Each round needs one clear question. Monster Specials give it.

## The idea in one line

Each monster can have one **Special**: a short goal for the heroes and what happens if they miss it. You learn the word once and then read it on the monster's label, so you never have to tap in.

## Label format (two lines under the miniature)

- **Top line: your goal**, with its number ("Damage 20").
- **Bottom line: or else** ("or Slam 2x").
- An always-on Special gets a small ring mark so players know it will not change next round.

## Vocabulary (always the same words)

- **Attack N**: what the heroes throw at the monster before its defence. A big mega roll counts whatever its defence dice do.
- **Damage N**: what actually lands after its block.
- **Team** (default): everyone's hits add up toward the goal.
- **Solo**: one hero must do it alone in a single strike (solo play simply reads it as "you").

## The first ten Specials

| Special | Top: goal | Bottom: or else | Measure | Best in |
|---|---|---|---|---|
| Slam | Damage 20 | or Slam 2x | team damage | both |
| Crush | Block 15 | or 2x damage | your block | both |
| Shield | Attack 25 | or Shield stops 12 | attack (mega roll) | both |
| Spawn | Damage 1 | or Spawn 1 | any damage | both |
| Sleeping | Solo damage 40 | or Wakes: 2x | one hero, one blow | team |
| Split | Damage 25 | or Splits in 2 | team damage | team |
| Regrow | Damage 8 | or Heals 8 | any damage, every round | solo |
| Thief | Kill in 2 | or Runs with 10 gold | countdown | both |
| Leader | Kill first | Others +3 | always on | both |
| Duel | Solo only | Extra hits wasted | the monster challenges one hero to a duel | team |

Dave approved the word **Special** and the name **Duel**. Numbers above are examples: each goal is sized from what players really roll (Act I averages about 29 a round, so 15–25 is a stretch but reachable).

## Screens

- **Round-start popup = the plan board.** One line per monster: "Ogre: Damage 20, or it Slams for double." A Special appearing for the first time says "New Special" with one sentence.
- **After-round card = the answer**, one line per monster: "Ogre: Slam broken, 23 of 20." "Goblin: spawned a friend." The long data page goes; the Recap button keeps every dice detail.
- Tapping a monster still explains its Special in full.

## Puzzles come from pairings

One Special is simple; two make a puzzle. For example:
- **Sleeping + Thief.** Chase the gold, but splash would wake the troll.
- **Leader + Spawn.** Kill the leader, or stop the spawner?
- **Shield + Slam** on different monsters: one needs a big Attack, the other needs Damage.
- **Split + Regrow**: big rounds against steady rounds.

Splash becomes a real choice.

## Learning curve

- **Act I:** steps 1–2 plain monsters; then a new Special every couple of steps (Spawn, Slam, Shield at the elite); the boss uses two.
- **Act II:** Crush, Sleeping, Thief, Regrow, in pairs.
- **Act III:** Split, Leader, Duel, in trickier team pairings.

## Guardrails (fun and clean first)

- One Special per monster.
- At most two Specials in a fight in Act I.
- Every monster must still be defeated.
- A goal is never out of reach.
- Missing a goal costs something but never ends a run on its own.

## Open questions

1. How a party's goal total shows on the label as it fills up.
2. Which existing monster moves become Specials (Slam = today's charge and slam; Spawn = today's swarm call; Shield = today's guard; Regrow = today's mend; Thief = today's flee with gold).
3. How the round-start popup and the after-round card look (Grok).
4. Goal sizes by act and party size (Director, measured by Claude).

## Ideas from the team

(Astra, Grok: add yours here, signed and dated.)

### Grok (Crockpot (Grok Bot)), 2 November 2026, 9:20 AM CT

From Grok Bot: Dave asked me to check the board (Nov 2, 9:13 AM CT). Ideas only, no code. Numbers are placeholders for Claude's measurements (Q4).

**First-set shortlist (Act I).** I'd ship four and keep the rest for later acts:
1. **Spawn** (Damage 1, or Spawn 1). The gentlest introduction, since any hit answers it. It teaches "read the label" in a fight you can't lose.
2. **Slam** (Damage 20, or Slam 2x). This is today's charge, so it needs no new art. It teaches Damage versus Attack.
3. **Shield** (Attack 25, or Shield stops 12). Used at the elite. It teaches that a mega roll counts before defence, which pairs with Slam to show the difference.
4. **Regrow** (Damage 8, or Heals 8), as the boss's second Special. It's steady and readable, and it pushes solo players to hit every round instead of hoarding.

**Three new ones to consider later.** Each uses one word and fits the two-line label.
- **Brace** (Block 12, or Stunned 1 die). Your next roll loses one die. It's a softer Crush for Act I healers and tanks.
- **Marked** (Solo damage 15 on the marked hero, or Mark spreads). A light Duel for two-hero parties.
- **Bounty** (Kill this round, +8 gold). A reward Special with no punishment, which mirrors Thief. It gives a happy choice rather than another threat.

**How it shows on the monster and board (my Q3).**
- **Label.**
  - Two lines under the mini at the existing name-plate width. Top line in white bold, bottom line smaller.
  - The bottom line takes the colour of the cost: red for damage (Slam, Wakes), purple for summons (Spawn, Split) and amber for gold (Thief).
  - It also uses the same role colours as the new magic tiles (red attack, blue block, green heal, amber gold). One colour language across the game.
- **Progress (Q1).** A thin bar fills behind the top line as the party's total grows, with a number like **14/20**. At the goal the bar turns gold, the bottom line gets struck through, and a short "Broken" stamp replaces it. That gives a clear, instant signal on the phone without opening anything.
- **Always-on ring.** A small dotted ring around the goal icon, so it doesn't change next round.
- **Round-start popup = plan board.**
  - One row per monster: a mini thumbnail, then "Damage 20 · or Slam 2x".
  - A **New Special** ribbon on the first appearance, with one sentence.
  - At most 3 rows. With more monsters, group the plain ones under "No Special".
  - One "Fight" button. Make sure the popup fits 375x548 without scrolling.
- **After-round card = the answer.**
  - One line per monster with a ✓ or ✗ chip: "✓ Ogre: Slam broken, 23/20", "✗ Goblin: spawned a friend".
  - Recap holds the dice detail.
  - Sort misses first, so the consequence is the first thing you see.

**Balance and phone notes.**
- Size goals to the party's round average from Claude's numbers: about 70% of a party's typical round for Act I team goals. A good round should clear it, a careless one shouldn't.
- Solo goals scale with the single hero, not the party.
- No more than one punishing "or" per round in Act I. If two monsters have Specials, make one of them a soft one (Spawn or Bounty).
- Keep all labels to 14 characters or fewer per line, so two lines fit under a mini at 375 width. Test with the longest one, "Solo damage 40".
- Show the "or else" as it happens (Slam 2x on the damage float), so the player links cause and effect.

**Pairing for the Act I boss.** Regrow plus a Spawn minion. Do you kill the adds or keep pressure on the boss? That's a clear question without needing to explain a new rule.

— Crockpot (Grok Bot)
