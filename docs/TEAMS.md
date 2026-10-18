# Team difficulty (for campaigns and tables)

How QuestDice makes a fight right for a company of heroes (Oct 2026). Solo play is unchanged: monsters follow the road (act and
step) at the chosen difficulty, so getting stronger always feels like getting stronger.

## A hero's strength
`heroStrength(hero)` (engine.js) is what an average throw of this hero's real dice is worth: damage, magic (it feeds the powers),
half the block and healing, scaled by the health behind it. Level, dice sizes, forged weapons, talents and perks all count, because
they are all in the dice. Classes land within about 15% of each other at the same point of the road.

`levelStrength(level)` is what a typical hero of that level is worth (`LEVEL_STRENGTH` in data.js, measured with
`node tools/levelstrength.mjs`): 19 at level 1, about 5.4 more a level (67 at level 10).

## At a table (the road's own fights)
`teamFactor(heroes)` = the company's total strength divided by its strongest hero's: 2 for an equal pair, ~1.4 for a level-4
hero with a level-1 friend, 3 for three equals. The strongest hero sets the fight as if alone; every extra "strongest hero" adds
`PARTY.hpPer` (1.2) to the monsters' health and `PARTY.flatPer` (10) to every hit. An equal pair: x2.2 health and +10 a hit.
The extra hit power goes on the hit's base number, so the monster's card shows the true numbers (a team splits each hit and each
block soaks its share, so health alone made a pair untouchable). `newPartyBattle` stores `b.team = { m, hp, flat }`.

## Story campaigns written by level (duo campaigns)
Write each fight for **one hero of a level** (its monsters, and the level you expect the heroes to be there). Then call
`storyScale(heroes, level)` and give its result to the monsters: `{ m, hp, flat }` (multiply health by `hp`, add `flat` to
every hit's base). Two typical heroes of that level get m 2, x2.2, +10; heroes who grew stronger than the story expects meet
stronger monsters, weaker ones gentler. Easy / Normal / Hard / Legendary still apply on top (withDifficulty).

## Measuring
`node tools/party.mjs [acts] [runs] [heroes]` plays companies against the same steps alone and together and prints win rates,
rounds and health left. `PLAY=first` is the lazy player (first roll, first monster), `MIX=1` puts a fresh level-1 hero beside a
grown one from Act II, `SKILL=hard|legendary` sets the difficulty, `PARTY_HP=` / `PARTY_FLAT=` try other head-count values.
