# T19: Jasper's 24-round Wyrmwatch fight

Status: READY for investigation. Owner: Claude. Director review required before balance changes.
Submitted by Dave on 24 October 2026. Dave describes this as a "really long match" near the end of Act III and asks that the team can see the report.

## Evidence and provenance

The complete readable portion of Dave's pasted export is preserved below, including its trimming notice and every supplied round (6 through 24). Dave also supplied the JSON in chat; this note extracts relevant additional fields from that JSON rather than reproducing the entire JSON payload. This is not a full replay fixture or an untrimmed report.

- Report ID: `mvmthplfldn2`.
- Build: `20261024report6`; solo, normal; victory after 24 resolved rounds.
- Saved at: `2026-10-24T19:54:13.588Z` (2:54 PM America/Chicago).
- Confirmed location: **Act III, step 8, Showdown at Wyrmwatch**.
- Jasper: Knight level 13, maximum/start health 98, start magic 6, three starting potions healing 20 each.
- JSON weapon: `warhammer`, rarity 2, left weapon, in play. This is legacy equipment; do not silently replace it with an active-roster weapon in reproduction.
- Boss Vharaxis: 1,002 starting HP, d12 power, fight bonus 16, 2d4 armour, initiative d4.
- Gloom Stalker: 179 starting HP, d8 power and initiative, fight bonus 16.
- Dirge Singer: 165 starting HP, d8 power, d6 initiative, fight bonus 16.
- No charms or road effects recorded.
- JSON says `trimmed: true`, `roundsOmitted: 5`. Missing: first five rounds, hero dice sizes/talents summary, early lane breakdowns, early dice faces. Final two rounds retain dice/lane information.
- Potions remaining is already zero in round 6 and all retained rounds. The omitted rounds prevent checking when/how the three potions were used.
- Boss remaining HP at the start of rounds 6 through 11 is 553. It was already damaged before the retained section, so do not attribute the full 1,002 HP to the final boss-only phase.
- Second Wind JSON release notes: round 6 "released 4" gives 36; rounds 9 and 12 "released 2" give 14; round 24 "released 3" gives 24. The zero-magic entries are recorded releases, not proof of free healing without prior charging.

## Initial observations, derived from this one report

- Total starting enemy HP: 1,346. This is an observed encounter, not a finding that scaling is wrong.
- Dirge Singer dies in round 6; Gloom Stalker in round 10. Rounds 11 through 24 are **14 additional rounds against the boss alone**, dealing the remaining 553 HP.
- There are **35 individual universal Heal actions in retained rounds 6–24**, at two magic each. Rounds 8 and 15 each show eight presses. The pre-resolution health changes in those rounds are +24. This suggests a repeated-input burden worth assessing separately from combat difficulty.
- Jasper ends round 9 at 11 HP and round 10 at 10 HP, then finishes at 74 HP. Ten is the lowest recorded end-of-round value in the retained portion, not a claim about the omitted rounds.
- The boss shows several Inhale / Breath Slam cycles. These can create recovery opportunities but may also extend an already long fight; this is a hypothesis to investigate.
- No elapsed play duration is recorded. Twenty-four rounds is not a measured number of minutes.
- One successful fight cannot establish typical duration, class balance, unavoidable danger, optimal target choice or a systemic bug.

## Claude's next action

Take this as a focused late-game pacing follow-up, separate from T17's experimental economy and T05 presentation. Record the investigation and handoff on the team board, not through Dave.

1. Trace why this solo normal level-13 encounter has 1,002 / 179 / 165 HP and fight bonus 16 in report6. Identify the actual campaign, hero-strength/equipment and boss scaling inputs, including legacy War Hammer behavior. Do not assume a report error or change protected scaling to make the numbers smaller.
2. Reproduce the configuration as far as the retained data allows. Explicitly label missing seed, early choices, gear attributes and state. A similar simulated fight is not an exact replay.
3. Compare round-count distributions and boss-only duration for relevant late-Act-III solo encounters, including this Knight and representative other classes/loadouts. Separate time spent surviving/healing from time spent reducing boss HP; include lows, tails, wins/falls and resource use, not win rate alone.
4. Examine repeated healing input as its own usability issue. A proposed way to buy several legal heals at once must retain the exact per-heal costs, caps and effects. Propose first; do not silently change healing rules.
5. Return a concise diagnosis with evidence: expected exceptional boss fight, excessive HP scaling, weak output for this loadout, repetitive recovery loop, input friction, or a combination. Offer targeted alternatives and their tradeoffs. No live balance change is authorized by this evidence intake.
6. Relate findings to T02 (danger), T03 (progression) and T07 (magic outlets) where useful, without treating their existing results as covering this long-fight case. No new art assignment for Grok is needed.

Verification for this intake: checked report header against supplied JSON act/step/build/id; counted all 19 retained readable rounds and 35 Heal entries. No game reproduction, code audit or balance test performed in this intake.

## Readable export supplied by Dave

```text
QUEST DICE BATTLE REPORT
Victory · Act III step 8 · Showdown at Wyrmwatch
Build 20261024report6 · solo · normal · victory after 24 rounds
(Trimmed to fit. Left out: dice sizes and talents on each hero; weapon-by-weapon breakdowns in the early rounds; dice faces in the early rounds; 5 early rounds.)

HEROES
  Jasper, Knight level 13: health 98/98, magic 6, potions 3 (each heals 20)
    weapons: War Hammer (left weapon)
    powers: Cleave L1, Shield Up, Second Wind L1
    perks: Stout Heart, Gold Sense, Ironward, Keen Edge, Arcane Reserve, Vitality, Piercing Pips, Arcane Reserve, Ironward, Vitality, Piercing Pips

ENEMIES
  1 Vharaxis, the Ember Queen (boss): health 1002, power die d12, fight bonus 16, armour 2d4
  2 Gloom Stalker (minion): health 179, power die d8, fight bonus 16
  3 Dirge Singer (minion): health 165, power die d8, fight bonus 16

ROUND 6
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Talons 11–44; 2 Gloom Stalker Black Arrow 9–37; 3 Dirge Singer Dirge
  You: health at round start 61, before resolution 61, after 55
    reroll (0 magics)
    reroll (0 magics)
    reroll (0 magics)
    reroll (1 magic)
    power Second Wind (36), 0 magics
    totals: attack 64, pierce 9, block 6, heal 47
  Your strike on 3 Dirge Singer: dealt 10, killed 3 Dirge Singer
  2 Gloom Stalker Black Arrow: rolled 27; blocked 0, took 27
  1 Vharaxis, the Ember Queen Talons: rolled 22 (armour 6); blocked 6, took 16
  Order of blows (derived): 1. 2 Gloom Stalker Black Arrow → health 71; 2. your strike on 3 Dirge Singer (dealt 10) → health 71; 3. 1 Vharaxis, the Ember Queen Talons → health 55
  Lethal blow (derived): none

ROUND 7
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Bite 10–43; 2 Gloom Stalker Black Arrow 7–35
  You: health at round start 55, before resolution 55, after 26
    reroll (0 magics)
    power Second Wind, 1 magic
    power Shield Up, 1 magic
    totals: attack 39, pierce 6, block 11, heal 7
  Your strike on 2 Gloom Stalker: dealt 45
  1 Vharaxis, the Ember Queen Bite: rolled 21 (armour 7); blocked 11, took 10
  2 Gloom Stalker Black Arrow: rolled 26; blocked 0, took 26
  Order of blows (derived): 1. your strike on 2 Gloom Stalker (dealt 45) → health 62; 2. 1 Vharaxis, the Ember Queen Bite → health 52; 3. 2 Gloom Stalker Black Arrow → health 26
  Lethal blow (derived): none

ROUND 8
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Inhale; 2 Gloom Stalker Black Arrow 7–35
  You: health at round start 26, before resolution 50, after 33
    reroll (0 magics)
    reroll (0 magics)
    power Shield Up, 1 magic
    power Second Wind, 1 magic
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    totals: attack 51, pierce 5, block 4, heal 2
  Your strike on 2 Gloom Stalker: dealt 56
  1 Vharaxis, the Ember Queen Inhale: rolled 0 (armour 3)
  2 Gloom Stalker Black Arrow: rolled 19; blocked 0, took 19
  Order of blows (derived): 1. your strike on 2 Gloom Stalker (dealt 56) → health 52; 2. 1 Vharaxis, the Ember Queen Inhale → health 52; 3. 2 Gloom Stalker Black Arrow → health 33
  Lethal blow (derived): none

ROUND 9
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Breath Slam 14–58 (slam); 2 Gloom Stalker Knife 8–36
  You: health at round start 33, before resolution 42, after 11
    reroll (0 magics)
    reroll (0 magics)
    power Shield Up, 1 magic
    power Second Wind (14), 0 magics
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    totals: attack 36, pierce 3, block 4, heal 28
  Your strike on 2 Gloom Stalker: dealt 39
  1 Vharaxis, the Ember Queen Breath Slam: rolled 41 (armour 2); blocked 4, took 37
  2 Gloom Stalker Knife: rolled 22; blocked 0, took 22
  Order of blows (derived): 1. your strike on 2 Gloom Stalker (dealt 39) → health 70; 2. 1 Vharaxis, the Ember Queen Breath Slam → health 33; 3. 2 Gloom Stalker Knife → health 11
  Lethal blow (derived): none

ROUND 10
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Talons 9–42; 2 Gloom Stalker Snare
  You: health at round start 11, before resolution 17, after 10
    reroll (0 magics)
    heal (2 magics)
    power Second Wind, 1 magic
    power Shield Up, 1 magic
    heal (2 magics)
    totals: attack 44, pierce 10, block 4, heal 17
  Your strike on 2 Gloom Stalker: dealt 34, killed 2 Gloom Stalker
  1 Vharaxis, the Ember Queen Talons: rolled 28 (armour 6); blocked 4, took 24
  Order of blows (derived): 1. your strike on 2 Gloom Stalker (dealt 34) → health 34; 2. 1 Vharaxis, the Ember Queen Talons → health 10
  Lethal blow (derived): none

ROUND 11
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Talons 9–42
  You: health at round start 10, before resolution 22, after 14
    reroll (0 magics)
    reroll (0 magics)
    reroll (0 magics)
    power Second Wind, 1 magic
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    totals: attack 40, pierce 0, block 0, heal 26
  Your strike on 1 Vharaxis, the Ember Queen: dealt 35 (it blocked 5)
  1 Vharaxis, the Ember Queen Talons: rolled 34 (armour 5); blocked 0, took 34
  Order of blows (derived): 1. your strike on 1 Vharaxis, the Ember Queen (dealt 35) → health 48; 2. 1 Vharaxis, the Ember Queen Talons → health 14
  Lethal blow (derived): none

ROUND 12
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Inferno 10–43
  You: health at round start 14, before resolution 14, after 23
    reroll (0 magics)
    reroll (0 magics)
    reroll (0 magics)
    power Second Wind (14), 0 magics
    totals: attack 23, pierce 8, block 6, heal 24
  Your strike on 1 Vharaxis, the Ember Queen: dealt 27 (it blocked 4)
  1 Vharaxis, the Ember Queen Inferno: rolled 21 (armour 4); blocked 6, took 15
  Order of blows (derived): 1. your strike on 1 Vharaxis, the Ember Queen (dealt 27) → health 38; 2. 1 Vharaxis, the Ember Queen Inferno → health 23
  Lethal blow (derived): none

ROUND 13
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Inhale
  You: health at round start 23, before resolution 23, after 47
    reroll (0 magics)
    reroll (0 magics)
    nudge (3 magics)
    reroll (0 magics)
    reroll (1 magic)
    totals: attack 27, pierce 4, block 0, heal 24
  Your strike on 1 Vharaxis, the Ember Queen: dealt 26 (it blocked 5)
  1 Vharaxis, the Ember Queen Inhale: rolled 0 (armour 5)
  Order of blows (derived): 1. your strike on 1 Vharaxis, the Ember Queen (dealt 26) → health 47; 2. 1 Vharaxis, the Ember Queen Inhale → health 47
  Lethal blow (derived): none

ROUND 14
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Breath Slam 14–58 (slam)
  You: health at round start 47, before resolution 47, after 19
    reroll (0 magics)
    reroll (0 magics)
    totals: attack 55, pierce 5, block 6, heal 3
  Your strike on 1 Vharaxis, the Ember Queen: dealt 57 (it blocked 3)
  1 Vharaxis, the Ember Queen Breath Slam: rolled 37 (armour 3); blocked 6, took 31
  Order of blows (derived): 1. your strike on 1 Vharaxis, the Ember Queen (dealt 57) → health 50; 2. 1 Vharaxis, the Ember Queen Breath Slam → health 19
  Lethal blow (derived): none

ROUND 15
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Inferno 12–45
  You: health at round start 19, before resolution 43, after 28
    reroll (0 magics)
    reroll (0 magics)
    reroll (0 magics)
    power Shield Up, 1 magic
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    totals: attack 32, pierce 14, block 4, heal 14
  Your strike on 1 Vharaxis, the Ember Queen: dealt 42 (it blocked 4)
  1 Vharaxis, the Ember Queen Inferno: rolled 33 (armour 4); blocked 4, took 29
  Order of blows (derived): 1. your strike on 1 Vharaxis, the Ember Queen (dealt 42) → health 57; 2. 1 Vharaxis, the Ember Queen Inferno → health 28
  Lethal blow (derived): none

ROUND 16
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Inhale
  You: health at round start 28, before resolution 37, after 46
    power Second Wind, 1 magic
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    totals: attack 40, pierce 4, block 0, heal 9
  Your strike on 1 Vharaxis, the Ember Queen: dealt 41 (it blocked 3)
  1 Vharaxis, the Ember Queen Inhale: rolled 0 (armour 3)
  Order of blows (derived): 1. your strike on 1 Vharaxis, the Ember Queen (dealt 41) → health 46; 2. 1 Vharaxis, the Ember Queen Inhale → health 46
  Lethal blow (derived): none

ROUND 17
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Breath Slam 14–58 (slam)
  You: health at round start 46, before resolution 49, after 27
    reroll (0 magics)
    heal (2 magics)
    power Second Wind, 1 magic
    power Shield Up, 1 magic
    totals: attack 50, pierce 2, block 4, heal 6
  Your strike on 1 Vharaxis, the Ember Queen: dealt 46 (it blocked 6)
  1 Vharaxis, the Ember Queen Breath Slam: rolled 32 (armour 6); blocked 4, took 28
  Order of blows (derived): 1. your strike on 1 Vharaxis, the Ember Queen (dealt 46) → health 55; 2. 1 Vharaxis, the Ember Queen Breath Slam → health 27
  Lethal blow (derived): none

ROUND 18
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Terrify
  You: health at round start 27, before resolution 45, after 56
    heal (2 magics)
    heal (2 magics)
    power Shield Up, 1 magic
    power Second Wind, 1 magic
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    heal (2 magics)
    reroll (0 magics)
    reroll (0 magics)
    reroll (0 magics)
    totals: attack 52, pierce 8, block 4, heal 11
  Your strike on 1 Vharaxis, the Ember Queen: dealt 53 (it blocked 7)
  1 Vharaxis, the Ember Queen Terrify: rolled 0 (armour 7)
  Order of blows (derived): 1. 1 Vharaxis, the Ember Queen Terrify → health 56; 2. your strike on 1 Vharaxis, the Ember Queen (dealt 53) → health 56
  Lethal blow (derived): none

ROUND 19
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Talons 11–44
  You: health at round start 56, before resolution 56, after 67
    reroll (0 magics)
    reroll (0 magics)
    nudge (3 magics)
    reroll (0 magics)
    reroll (1 magic)
    reroll (1 magic)
    power Shield Up, 1 magic
    totals: attack 27, pierce 3, block 10, heal 21
  Your strike on 1 Vharaxis, the Ember Queen: dealt 24 (it blocked 6)
  1 Vharaxis, the Ember Queen Talons: rolled 20 (armour 6); blocked 10, took 10
  Order of blows (derived): 1. 1 Vharaxis, the Ember Queen Talons → health 67; 2. your strike on 1 Vharaxis, the Ember Queen (dealt 24) → health 67
  Lethal blow (derived): none

ROUND 20
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Inhale
  You: health at round start 67, before resolution 67, after 85
    reroll (0 magics)
    nudge (3 magics)
    reroll (0 magics)
    reroll (0 magics)
    totals: attack 30, pierce 3, block 0, heal 18
  Your strike on 1 Vharaxis, the Ember Queen: dealt 30 (it blocked 3)
  1 Vharaxis, the Ember Queen Inhale: rolled 0 (armour 3)
  Order of blows (derived): 1. your strike on 1 Vharaxis, the Ember Queen (dealt 30) → health 85; 2. 1 Vharaxis, the Ember Queen Inhale → health 85
  Lethal blow (derived): none

ROUND 21
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Breath Slam 14–58 (slam)
  You: health at round start 85, before resolution 85, after 66
    reroll (0 magics)
    reroll (0 magics)
    reroll (0 magics)
    reroll (1 magic)
    totals: attack 70, pierce 12, block 0, heal 7
  Your strike on 1 Vharaxis, the Ember Queen: dealt 74 (it blocked 8)
  1 Vharaxis, the Ember Queen Breath Slam: rolled 26 (armour 8); blocked 0, took 26
  Order of blows (derived): 1. your strike on 1 Vharaxis, the Ember Queen (dealt 74) → health 92; 2. 1 Vharaxis, the Ember Queen Breath Slam → health 66
  Lethal blow (derived): none

ROUND 22
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Inhale
  You: health at round start 66, before resolution 66, after 77
    reroll (0 magics)
    reroll (0 magics)
    reroll (0 magics)
    totals: attack 47, pierce 5, block 0, heal 11
  Your strike on 1 Vharaxis, the Ember Queen: dealt 47 (it blocked 5)
  1 Vharaxis, the Ember Queen Inhale: rolled 0 (armour 5)
  Order of blows (derived): 1. your strike on 1 Vharaxis, the Ember Queen (dealt 47) → health 77; 2. 1 Vharaxis, the Ember Queen Inhale → health 77
  Lethal blow (derived): none

ROUND 23
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Breath Slam 14–58 (slam)
  You: health at round start 77, before resolution 77, after 47
    reroll (0 magics)
    reroll (0 magics)
    reroll (0 magics)
    reroll (2 magics)
    reroll (1 magic)
    reroll (1 magic)
    final dice: left weapon d8=7, right weapon d8=8, head d8=7, feet d6=2, left hand d8=8, right hand d10=8, heart d6=2, left talent d6=5, right talent d8=2, pet d4=4; aimed at 1 Vharaxis, the Ember Queen
    totals: attack 42, pierce 9, block 0, heal 5
  Your strike on 1 Vharaxis, the Ember Queen: dealt 49 (it blocked 2)
  1 Vharaxis, the Ember Queen Breath Slam: rolled 35 (armour 2); blocked 0, took 35
  Order of blows (derived): 1. 1 Vharaxis, the Ember Queen Breath Slam → health 47; 2. your strike on 1 Vharaxis, the Ember Queen (dealt 49) → health 47
  Lethal blow (derived): none

ROUND 24
  Moves shown before you committed: 1 Vharaxis, the Ember Queen Terrify
  You: health at round start 47, before resolution 47, after 74
    reroll (0 magics)
    reroll (0 magics)
    reroll (0 magics)
    reroll (2 magics)
    power Second Wind (24), 0 magics
    power Shield Up, 1 magic
    final dice: left weapon d8=8, right weapon d8=6, head d8=8, feet d6=5, left hand d8=3, right hand d10=4, heart d6=4, left talent d6=5, right talent d8=7, pet d4=2; aimed at 1 Vharaxis, the Ember Queen
    totals: attack 35, pierce 4, block 11, heal 27
  Your strike on 1 Vharaxis, the Ember Queen: dealt 2 (it blocked 7), killed 1 Vharaxis, the Ember Queen
  Order of blows (derived): 1. your strike on 1 Vharaxis, the Ember Queen (dealt 2) → health 74
  Lethal blow (derived): none

OUTCOME: victory, 24 rounds resolved
Captured = written down by the game when it happened. Derived = worked out afterwards from captured numbers.
```
