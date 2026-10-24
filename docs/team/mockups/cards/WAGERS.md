# Wager audit (T13, CONCEPT docs only)

All numbers come from `js/secrets.js` (and `js/roads.js` / `js/trials.js` for road tests), read 23 Oct 2026. Gold scales by act:
`G_BY_ACT = [40, 70, 100]` (secrets.js:9). Rounding: `r5` = round to the nearest 5, minimum 5 (secrets.js:11).

There is no single formula. There are three kinds of offer, and only some of them are real wagers.

## 1. Solo Bonus Goal: a true wager (the "Objective" card)
Rule: secrets.js:239-248, 259-321. It is dealt on a solo fight or elite (`wantsBonus`, secrets.js:249). The goals are No potions, Hold the line, Spark storm, First rolls and Heavy hitter (secrets.js:250-256).

| | Act I | Act II | Act III | Source |
|---|---|---|---|---|
| Stake (paid on Accept) | 10 | 20 | 30 | `BONUS_STAKE` secrets.js:243; taken in `answerBonus` secrets.js:288-292 |
| Done **and** fight won | get back 30 (net +20) | 60 (net +40) | 90 (net +60) | `BONUS_RETURN = 3`, secrets.js:244; `judgeBonus` secrets.js:307-309 |
| Not done, fight won | stake lost (−10) | −20 | −30 | secrets.js:310-311 |
| Fight lost | stake lost | stake lost | stake lost | secrets.js:312-313 |
| Decline | 0 | 0 | 0 | `BONUS_HONOR = 0`, secrets.js:248, 304-306 |
| Can't afford the stake | free attempt, prize = the stake (10 / 20 / 30); losing costs nothing | | | secrets.js:263, 267, 290 |

## 2. Offered bribes (party envelopes): a wager with a team condition
These are the cards with `kind: 'bribe', mode: 'offer'`: The Slacker, Glass Shield, Cold Shoulder, The Long Fight, The Pact, Someone Has to Fall and Last One Standing (secrets.js:67-73). They are only dealt at a table of 2 or more. The chance is `BRIBE_CHANCE` (secrets.js:86), times 2 on big fights or 0.3 on ordinary ones (secrets.js:105). An offered bribe comes 60% of the time and a forced one 40% (secrets.js:110).

**There is no stake up front.** The payout is settled after the battle (secrets.js:199-202):

| Outcome (accepted) | Act I | Act II | Act III | Source |
|---|---|---|---|---|
| Done **and** team wins | +80 | +140 | +200 (2G) | secrets.js:201 |
| Not done, team wins | 0 | 0 | 0 | secrets.js:201 |
| Team loses (done or not) | −20 | −35 | −50 (G/2) | secrets.js:201 |
| …and **every** offered bribe at the table was accepted and the team lost ("crooks") | a further −20 | −35 | −50 for **every** hero, bribed or not | secrets.js:210-211 |

| Outcome (declined, "Honor") | Act I | Act II | Act III | Source |
|---|---|---|---|---|
| Team wins | +10 | +20 | +25 (r5(G/4)) | secrets.js:202 |
| Team loses | +20 | +35 | +50 (r5(G/2)) | secrets.js:202 |

The Pact also changes the fight: you deal half damage and cannot be knocked out (engine.js:2102, 2127, 2236). Its condition is always met (secrets.js:71).

**Correction to PR #39.** The wager card showed "Fail −G/2". That penalty only applies when the team **loses**. Failing the deed in a won fight pays 0. The in-game chip `Fail: pay G/2` (secrets.js:146) and the "More" line (secrets.js:154) say the same thing, so they are also imprecise. This is flagged for Claude; no game file is changed here. The T13 template now shows three cells: Done and the team wins +2G / Not done, team wins 0 / Team loses −G/2.

## 3. Not wagers
- **Forced bribes** (Golden Fumble, Spare That One, The Hoarder, Lone Wolf; secrets.js:75-81) cannot be refused and risk nothing. They pay G (40 / 70 / 100) if done and the team wins, otherwise 0 (secrets.js:203). Card: Secret Objective, not Wager.
- **Cover cards, challenges and rivalries** pay `r5(pay × G)` or a rival's share, and only when the team wins (secrets.js:194-207). Nothing is staked.
- **Road tests** (js/roads.js:368-377) support a `stake`, but no event sets one today. `choice.stake` is never defined, so every road test risks a bane or no bonus, not gold. A rematch costs 5 / 10 / 15 gold (trials.js:21). That is a paid retry, not a wager.
- **The Camp Store mystery bundle** (data.js:164-166; auction.js:57-66) is a purchase with unknown contents: 70 / 95 / 120 gold, Bronze 50%, Silver 32%, Gold 18%. It is not a wager card.
