# T31 measurements: the Director's handoff, answered (6 November 2026)

Answers section 5 of [T31-director-review.md](T31-director-review.md). Measurement only: **no price, rank, monster or template changed.**
Tool: `node tools/t31-rounds2.mjs [solo campaigns a class] [party sizes] [party companies a size]` (new; the full tables it printed are in
[T31-measure-evidence/](T31-measure-evidence/): `solo.md`, `party2.md`, `party4.md`, `party6.md`, with `party*.json` for the raw
numbers). Run on the released engine at build 20261106a14 (the Shield repair included).

## How it was measured

The same paired, same-state, same-seed method as before (`tools/t31-rounds.mjs`): at every round, after the bot has rolled, rerolled and
used its powers, the battle is copied and that one round is played again from the same dice with one change. What is new, point by point:

1. **Every colour records monster progress and every hero's health.** Monster progress is direct damage with regrowth added back;
   summoned health and regrowth are separate columns. Hero health is every hero at the table, summed (it is capped at full health, so a
   heal on a full-health hero counts for nothing, as in play).
2. **Contexts:** class, act, fight kind, monsters alive (1, 2, 3 or more), the target's defence (none, guard, armour, Shield Special),
   Counterstrike rounds, and party sizes 1, 2, 4 and 6. Party tables use `resolveParty` and grow the company the way `tools/party.mjs`
   does; the probe puts the points on one hero, rotating, and reads every hero.
3. **Campaigns are the independent unit.** Every number is a ratio over rounds with a **bootstrap over campaigns** (not rounds) for its
   95% bracket. Solo: **50 bot campaigns** (10 a class), 3,975 rounds. Parties: **3 companies a size**, about 300 rounds each. Party
   brackets are wide; read them as direction, not as measurements to a decimal.
4. **Cards:** each card of every class's library (unlocked for the hero) is used once more in the probed state, at rank I and rank IV,
   the minimum and the full Dice Card cast, and Charge Cards cashed out at 1 to 4 charges. Score = monster health removed + hero
   health gained, **per magic spent** (a cash-out counts the magic paid over the rounds it took to charge). Gold and rerolls are not
   health, so Crowd Pleaser, Hymn of Gold and Quick Draw score 0 here; this score cannot judge them.
5. **Card use** (how often the bot really used each card) and charges still stored when a fight ends are reported beside the outcomes.

## What one point of each colour is worth now (solo, 50 campaigns)

Monster health removed, per point. Brackets are 95% over campaigns.

| Situation | Rounds | Red | Orange | Pink |
|---|---|---|---|---|
| All rounds | 3,975 | 0.65 (0.61–0.70) | 0.66 (0.60–0.70) | **0.51** (0.47–0.54) |
| One monster left | 1,983 | 0.75 | 0.76 | **0.00** |
| Two monsters | 1,289 | 0.62 | 0.61 | 0.70 (0.66–0.74) |
| Three or more | 703 | 0.43 (0.39–0.47) | 0.44 | **1.58** (1.52–1.64) |
| Target has no guard | 2,787 | 0.57 | 0.58 | 0.60 |
| Target guarding | 169 | 0.74 (0.59–0.92) | 0.78 (0.64–0.98) | 0.38 |
| Target armoured | 783 | 0.88 (0.78–1.02) | 0.89 | **0.18** (0.14–0.23) |
| Target has a Shield Special | 236 | 0.83 | 0.73 | 0.57 |
| Act I / II / III | 1,940 / 1,380 / 655 | 0.56 / 0.69 / 0.85 | 0.56 / 0.70 / 0.86 | 0.54 / 0.50 / 0.42 |
| Ordinary battle / elite / boss | 2,876 / 587 / 512 | 0.57 / 0.93 / 0.81 | 0.57 / 0.94 / 0.81 | 0.65 / 0.03 / 0.22 |

Hero health saved or gained, per point: **blue 0.38** (0.37–0.40), **green 0.54** (0.51–0.57). Red, orange and pink add only about 0.03 of
hero health in the same round (killing a monster sooner barely changes what it does to you this round).

Side effects: a pink point **prevents 0.26 summoned health** per round (−0.31 to −0.22): splash reaches the spawner and stops its
summon. Red, orange, blue and green change summons and regrowth by nothing measurable.

**What this says**

1. **Red and orange are the same** (0.65 and 0.66), still. Orange passes block, but armour and guard are rare, so it seldom matters.
   Against an armoured target both are worth more (0.88), because the armour is the thing in the way.
2. **Pink is worth less on average than red now (0.51 against 0.65), not more.** The old table said 0.78. Two things changed since it
   was measured: the Director's repair (solo splash now meets an off-target Shield Special) and the four-move D4 monsters. This run does
   not separate the two. Pink is still the best colour against three or more monsters (1.58, about **3.7 times red**
   there), is worth **nothing against a lone monster**, and is weak against armour (0.18). That is the strength-and-weakness shape
   Dave asked for, but a single pink point is no longer a price-above-red colour on average. **The old pink factor of 1.16 is too
   high for solo play.**
3. **Block 0.38 and heal 0.54** are close to the old 0.37 and 0.59. Block is worth most with three or more monsters (0.57) and least
   against a lone one (0.26); heal is worth most against bosses (0.70) and least in a crowd (0.35).
4. **Classes:** the Dwarf's red point is worth the most (0.74) and its pink the least (0.43); the other four classes are within each
   other's brackets. Nothing here says one class's colours are off.

## Party sizes (3 companies each; brackets wide)

| | Red | Orange | Pink (all) | Pink (3+ monsters) | Blue (hero health) | Green (hero health) |
|---|---|---|---|---|---|---|
| 1 hero (solo) | 0.65 | 0.66 | 0.51 | 1.58 | 0.38 | 0.54 |
| 2 heroes | 0.89 (0.63–1.32) | 0.75 | 0.36 | 1.22 (1.04–1.45) | 0.30 | 0.55 |
| 4 heroes | 0.55 | 0.56 | 0.76 | 1.70 (1.59–1.80) | 0.38 | 0.54 |
| 6 heroes | 0.81 | 0.83 | 1.04 | 1.86 (1.83–1.89) | 0.37 | 0.51 |

There is **no steady trend in red or orange with party size** (the brackets overlap; three companies cannot tell them apart). Pink in
a crowd holds at 1.2 to 1.9 and a lone monster still gives zero. Blue and green hold at about 0.3 to 0.4 and 0.5 to 0.55 a hero-health
point whatever the table. **One point of heal on one hero is not worth more in a party.** (The next section is about heal that reaches
every hero.)

## Cards, one more use on top of the bot's real round (solo; per magic)

Rank I, then rank IV, swing per magic (monster health removed plus hero health gained). Full tables, every cast, every class:
`solo.md`.

**The starting cards, rank I (the ones every new hero holds):**

| Card | Swing per magic | Notes |
|---|---|---|
| Counterstrike (Knight) | **3.74** (3.35–4.03) | the highest start card: block plus the unused block hitting back |
| Charge Cards at four charges: Storm Coil 4.24, Rising Ballad 4.11, Rally Cry 4.07, Volley 3.47, **Stonehide 1.69** | | the four are within their brackets of each other except **Stonehide, well below** |
| Grudge (Dwarf) | 2.64 (2.13–2.97) | |
| Cleave, Aimed Shot, Arc Bolt (minimum cast) | 2.05, 2.06, 1.95 | level with one another |
| Anvil Strike (Dwarf) | 1.63 | block dice beyond the first few are mostly wasted: **full cast 1.01** at rank I and 2.02 at rank IV |
| Mending Song (Bard, solo) | 1.60 (1.29–1.84) | |
| Magic Missile (Wizard) | 1.42 | |
| **Hunter's Mark (Ranger)** | **1.21** (1.05–1.32) | the lowest start card |

**Rank IV against rank I.** The minimum cast of a Dice Card at rank IV is worth **2.5 to 4 times** rank I for the same magic (Arc Bolt
1.95 → 7.66, Aimed Shot 2.06 → 7.88, Cleave 2.05 → 5.02, Anvil Strike 1.63 → 4.99), because ranks add dice and not cost. Charge
Cards at rank IV are worth 1.5 to 4.5 times rank I at one charge (Rally Cry 1.70 → 7.71) and 1.0 to 2.0 times at four (Storm Coil
4.24 → 8.32; Stonehide 1.69 → 1.77). Fixed-bonus cards are worth 1.4 to 2.8 times (Counterstrike 3.74 → 5.32; Magic Missile 1.42 →
3.98). That is a design fact for Dave: a rank is a large step, so its gold price should be a large step.

**The full cast against the minimum.** At rank I, for attack and pierce dice the full cast is about as good per magic as the minimum
(Cleave 2.41 against 2.05; Aimed Shot 1.97 against 2.06; Arc Bolt 1.83 against 1.95), so extra dice are fairly priced. **Block dice
(Anvil Strike) are worth less even at rank I** (1.01 against 1.63): block beyond the monsters' hit is wasted. At rank IV the minimum is
already so strong that the full cast earns 0.4 to 0.8 of it per magic (Aimed Shot 7.88 → 3.11, Arc Bolt 7.66 → 3.66, Cleave 5.02 →
4.07, Whirlwind 6.02 → 2.99, Anvil Strike 4.99 → 2.02): the extra dice at a high rank pay back little.

**Charge cash-outs.** Rank I cards gain from charging longer (Storm Coil 1.95 at one charge to 4.24 at four; Forge Fury 2.74 to
5.03). Rank IV cards peak at one or two charges (Rally Cry 7.71 at one, 6.70 at four; Second Wind 4.94 at one, 2.35 at four) because
the first charge is already large and waiting costs magic. **Unused charges at the end of a fight:** Storm Coil **0.73** (0.64–0.81),
Stonehide 0.32, Rally Cry 0.25, Volley 0.18, Rising Ballad 0.07. The Wizard leaves the most charged power unspent.

**Card use by the bot (share of rounds a card is used):** Arc Bolt 31%, Magic Missile 29%, Storm Coil 20%, Lucky Verse 20%, Aimed Shot
17%, Anvil Strike 17%, Counterstrike 9%, Rally Cry 6%, Cleave 6%, Stonehide 6%, Volley 4%, Mending Song 4%, Grudge 4%, Hunter's Mark
**2%**, Rising Ballad **2%**. The bot hardly uses the Ranger's and Bard's powers, so any whole-campaign result for those classes says
little about the cards; that is why those classes look weak to the bot and why this per-card table is the better evidence.

### Heal that reaches every hero scales with the table (the party-heal context)

Mending Song heals every hero for one roll. Per magic, rank I minimum cast: **1.60 solo, 10.0 with four heroes (8.3–11.1), 14.0 with
six (13.5–15.0)**; rank IV minimum cast **28 with four and 42 with six**. Battle Hymn (green dice and a pink die) is 6.8 with four
heroes and 9.3 with six. No other card moves like this: Cleave goes from 2.0 solo to 2.3, 2.8 and 3.5 with two, four and six
heroes. Only 36 to 43 Bard rounds stand behind each party number, so the size of the gap is rough, but its direction and scale are
not in doubt. It follows from the rule that one heal die heals every hero, while the cost stays one magic.

## Whole-campaign checks on the two weakest cards

Matched campaigns (same seeds, 40 a class, `node tools/t31-campaign.mjs 40` with `T31_PATCH`), baseline against one candidate each:

| Campaigns (40 each) | Act I cleared | Act II cleared | Act III cleared | Defeats a campaign | Card casts (campaign total) |
|---|---|---|---|---|---|
| Ranger, today | 15 | 5 | 0 | 6.3 | Aimed Shot 505, Hunter's Mark 70, Volley 174 |
| Ranger, **Hunter's Mark costs 1** | 12 | **0** | 0 | 5.5 | Aimed Shot 410, Hunter's Mark **139**, Volley **49** |
| Dwarf, today | 33 | 15 | 3 | 6.3 | Anvil Strike 998, Grudge 192, Stonehide 326 |
| Dwarf, **Stonehide 12 a step (56 block at four, was 40)** | 33 | 15 | 3 | 6.3 | identical |

- **Hunter's Mark at 1 magic made the Ranger worse, not better.** The bot casts it twice as often (70 → 139) and so casts Volley a third
  as often (174 → 49) and Aimed Shot less; Act II clears fall from 5 to 0 of 40. The Mark is 1.21 a magic against Aimed Shot's 2.06
  (and Volley's 3.5 at four charges), so at 2 magic the bot is right to leave it mostly alone, and a cheaper one pulls the bot's
  magic onto a weaker use. Forty campaigns is small (5 against 0 is not far outside the noise), but nothing in it supports the cut.
- **Stonehide at 56 block changed nothing at all**: the same clears, the same defeats, the same casts, to the digit, because the Dwarf
  already blocks more than the monsters hit for (the same finding as when the card was last re-priced). Block past the hit is wasted,
  which is why Stonehide's worth is low (0.38 a block point) and why a bigger step does not help.

## Candidates, in order of evidence

1. **Hunter's Mark is the lowest start card (1.21 a magic, next lowest 1.42), and the bot uses it 2% of the time.** The obvious fix,
   cost 1 magic, was tested above and made the bot's Ranger worse (it spends the magic on the Mark instead of Volley and Aimed Shot).
   **Not supported by the evidence.** If the Mark is to change, the lever is what it does (more pierce for the same two magic, or
   the gold part made bigger), and a human tester is the judge, because the bot barely plays it.
2. **Stonehide is the one charge card far below its peers (1.69 against 3.5 to 4.2),** and the bigger step tested above changed no
   outcome at all. The weakness is block itself (worth 0.38 a point, mostly wasted past the monsters' hit). **Leave it**; making it
   count would mean making the monsters hit harder or giving block a second job (the Counterstrike rule is one such job).
3. **Pink's worth on average is 0.51 (not 1.16).** No pink card needs changing on this alone: Storm Coil (4.24) is level with Rally Cry
   (4.07) and Rising Ballad (4.11). Pink dice sizes were priced for the crowd, which still holds (1.58 with three or more). The
   price table's "pink 1.16" should be retired: use **0.5 on average, 1.6 in a crowd, 0 alone**.
4. **Heal that reaches every hero** (Mending Song, Battle Hymn) is worth four to nine times a
   normal card in a party of four to six. **This is Dave's decision, not a bot's:** it makes the Bard a support in a party by
   design, and the answer might be a cost that grows with the party, a smaller die in parties, or nothing at all.
5. **Rank IV is two and a half to four times rank I for the same magic.** If that is not meant, the lever is the camp price of ranks,
   not the card.
6. **Not recommended:** an Anvil Strike buff or a Rising Ballad nerf (the Director's finding stands: this does not support either:
   Rising Ballad 4.11 sits level with Storm Coil and Rally Cry; Anvil Strike's low full-cast number is block wasted, not a weak card),
   an across-the-board pierce surcharge (orange 0.66 against red 0.65).

## Limits

- Party results use three companies a size; brackets are wide and several cells (armour, Shield Special in parties) rest on fewer than
  fifteen rounds. Only the direction of the party-heal finding is firm.
- The score counts health, not gold, rerolls or the information a card gives, so it cannot rate Crowd Pleaser, Hymn of Gold, Quick Draw
  or Hunter's Mark's gold.
- "One more use on top of the bot's round" adds to a hand the bot already played; it does not model a player choosing a different mix.
- D4 and forced Special turns are sampled as they actually fell in the campaigns (the engine plays the released D4 monsters); they are
  not forced separately.
- Chrome and the phone are not involved; this is the engine only.
