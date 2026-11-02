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


## AGREED FIRST SET (Dave: no Director review needed; Claude and Grok take the best ideas). 2 November 2026, Claude

**Status: design agreed, not built.**

### Specials

| When | Special | Top: goal | Bottom: or else | Kind |
|---|---|---|---|---|
| Act I, step 3 on | **Spawn** | Damage 1 | or Spawn 1 | soft |
| Act I, step 3 on | **Bounty** | Kill now | +8 gold | reward, no punishment |
| Act I, step 4 on | **Slam** | Damage 20 | or Slam 2x | punishing |
| Act I elite (step 5) | **Shield** | Attack 25 | or Blocks 12 | punishing |
| Act I boss (step 10) | **Regrow** + a Spawn minion | Damage 8 | or Heals 8 | punishing + soft |
| End of Act I / Act II opener | **Sleeping** | Solo damage 40 | or Wakes: 2x | punishing (Dave's idea) |
| Act II on | **Stun** (Grok's "Brace", renamed: the Dwarf already has a Brace power), **Thief** | Block 12 / Kill in 2 | or Lose 1 die / or Steals 10 gold | |
| Act III, teams | **Split**, **Leader**, **Duel** | as listed above | | |

Set aside: Crush (Stun replaces it early) and Marked (Duel covers it more clearly).

### Rules

- One Special per monster.
- At most one punishing Special per round in Act I; pair it with a soft one (Spawn or Bounty).
- Every monster still has to be defeated.
- Goals are sized from measured rolls: Act I team goals at about 70% of the party's typical round, and solo goals from the single hero.
- Label lines are at most 14 characters; check the longest, "Solo damage 40".
- Every bottom line carries its icon as well as its colour.

### Screens (Grok)

- **Label:** two lines under the miniature. The top line is bold white. The bottom line takes the colour of its cost (red damage, purple summons, amber gold) plus its icon. A dotted ring marks an always-on Special.
- **Progress bar behind the top line**, for example "14/20". It fills live while you reroll for Attack goals. For Damage goals it shows an estimate, because the monster's defence is rolled only after you lock in. At the goal it turns gold, the bottom line is struck through, and a "Broken" stamp appears.
- **Round-start plan board:** at most 3 rows (plain monsters grouped as "No Special"), a "New Special" ribbon with one sentence on first sight, and one Fight button. Fits 375x548 without scrolling.
- **After-round card:** one ✓ or ✗ line per monster, misses first. The long data page goes; Recap keeps the dice detail.
- **"Or else" shown as it happens**, for example "Slam 2x" on the damage float.

### Split of work, once Dave says go

- **Claude:** engine and rules behind a switch (off at the live root): Specials data, goal checks, Spawn, Bounty, Slam, Shield, Regrow and Sleeping on today's monster moves; goal sizes measured with the bots; tests.
- **Grok:** label, progress bar, plan board and after-round card visuals, using the engine's numbers. Reserve shared files on the board before touching them.


## BUILD STARTED (Dave: "Go", 2 November 2026). Data contract for Grok's screens (Claude)

The engine is behind the `SPECIALS.on` switch in js/data.js. It is off at the live root and on in the `?lab` preview once Claude records it here. Grok's screens read only these, so the rules can change without touching the visuals:

- **Label, per monster:** `E.specialView(b, e)` returns `null` (no Special) or:
  - `{ id, name, top, bottom, tone, icon, always, isNew, progress }`
  - `top` and `bottom` are the two label lines, already at most 14 characters ("Damage 20", "or Slam 2x").
  - `tone` is one of `'damage' | 'summon' | 'gold' | 'block' | 'heal'`, for the bottom line's colour; `icon` is an hk icon name.
  - `always` is true for an always-on Special (the dotted ring).
  - `isNew` is true the first time this hero meets it (for the "New Special" ribbon).
  - `progress` is `{ have, need, estimate }` or `null`. `estimate` is true for Damage goals before the round resolves.
  - A label may be quiet on some rounds: Slam shows its goal only on the wind-up round.
- **Plan board, at round start:** `E.specialPlan(b)` returns rows `[{ uid, name, top, bottom, line, isNew, tone }]`. `line` is the plain sentence, e.g. "Damage 20, or it Slams for double." Plain monsters are left out, so the screen can group them as "No Special".
- **After-round card:** `b.report.specials` holds rows `[{ uid, name, id, ok, line, have, need }]`.
  - `ok` true means ✓ (goal met or reward won); false means ✗.
  - `line` is the short outcome, e.g. "Slam broken, 23 of 20", "Spawned a friend", "Still asleep".
  - Sort misses first on screen.
- **The "or else" moment:** a doubled blow carries `act.slam2x = true` in the report's monster acts, for the damage float.

Until the engine lands, build with placeholder data in the same shape. Claude will post on the board when it is in.
