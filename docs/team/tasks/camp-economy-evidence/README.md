# CAMP-02 preliminary economy evidence

Planning study, 2 November 2026, main baseline fdbdcb8 / released game build 20261102df2. No runtime/rule files changed. The normal application release is applied explicitly to exact-math.mjs and with RELEASE=1 for the bot tool.

## Bounded pilot

Command per class: RELEASE=1 STYLE=smart SIM_SAMPLES=2 node tools/gold.mjs 1 CLASS. Classes: knight, ranger, wizard, dwarf, bard. One seed (7700) per class, one three-act campaign each; 10 won fights recorded per act/class, 150 recorded wins in total. Output is per won fight, except explicitly named totals. These fights are not independent statistical trials, and completion after retries is not a win-rate estimate.

The tool uses the existing botCamp spending priorities and two sampled futures per reroll candidate, reduced from the default 14 for this bounded diagnostic. It neither buys the proposed training nor normally buys tonics, so it cannot price the new options or measure a benefit from removing tonics. Defeat/retry costs are incompletely represented. No human, Hard-mode, multiplayer, focused-gold-policy or full-budget sufficiency claim is made. The same seed across classes also gives matching loot draws, not independent loot samples.

| Act | Battle gold/fight across classes | Selling spoils/fight | Approx. combined income/fight | Bot purse after camp |
| --- | --- | --- | --- | --- |
| I | 39–51 | 21–22 | 60–72 | 15–23 |
| II | 93–121 | 39–47 | 132–162 | 43–55 |
| III | 175–286 | 57–65 | 239–343 | 53–76 |

Combined ranges are calculated by adding each class's rounded battle and sale figures before finding minima/maxima; do not add unrelated range endpoints. These are preliminary class ranges from a single seed, not uncertainty intervals. All existing spending remains in place; new training must compete with it. This does not establish that gold is plentiful, but it supplies no reason to increase heart income immediately.

Raw outputs: [Knight](knight-pilot.txt), [Ranger](ranger-pilot.txt), [Wizard](wizard-pilot.txt), [Dwarf](dwarf-pilot.txt), [Bard](bard-pilot.txt).

An initial five-class run at three campaigns/class with default 14-sample reroll lookahead was stopped after about eight minutes without completed summary output; it supplies no numeric evidence. The smaller completed pilot above is the reported study. Larger studies should persist per-campaign results incrementally and include retry losses, as required by CAMP-02.

## Exact arithmetic

[exact-math.mjs](exact-math.mjs) reads current released FACE_PAY/heart constants and prints [exact-math.json](exact-math.json). Reproduce from repository root: node docs/team/tasks/camp-economy-evidence/exact-math.mjs. Its output was regenerated and compared byte-for-byte. It computes the neutral-roll extra gold from heart 4 changing from +2 to +4, assuming four equal-size body dice, a fair d6 heart, independent rolls and no rerolls/charms. It also records current benchmark prices and the clearly labeled candidate training table. This arithmetic is not a simulation of targeted gold play or proof of final prices.

Recommendation: keep heart 4 at +2 for the first training candidate. Validate spending policies, overflow, turn-one benefit, survival and remaining campaign length before finalizing prices. No game test run is claimed for this docs/analysis-only change; the arithmetic script parses and its generated output matches the stored artifact.
