# T09 rev 2: integration of the approved road copy (Claude, 23 October 2026)

**Branch:** `claude/t09-road-copy`. **Status:** implemented, in review. Not merged, not deployed.
**Copy:** [../../T09-road-copy.md](../../T09-road-copy.md) (rev 2, approved by the Director), drafted against `c372e4b`.

## The result card

1. **Roll summary**, its own labelled line: `ROLL  Your roll 7 · Challenge 2` alone; `Ann’s roll 7 · Challenge 2` in a company. A company moment shows `ROLLS` and one chip per hero (`Ann 7`, `Bob 4`), winners lit; five or six heroes wrap onto a second line at full size.
2. **Verdict:** `SUCCESS` (green) or `FAILED` (amber). A company moment always has a winner, so Success.
3. **Outcome:** the approved prose, no totals.
4. **Consequence,** framed, with its recipient in a tag: the hero's name, the winners (`Bob and Cy`), or `Everyone` when the whole company gets it (the hero's name when alone). When the sentence already names the hero (`Next fight, Ann loses 4 health every round.`) the tag is left off rather than repeat the name.

Walk-ons show only their sentence. The dice overlay shows `Success` / `Failed` and the same roll summary. On a phone the sheet now lifts on opening so the whole card, and a rematch button, sit above the sticky Onward button.

## Screenshots

`dev/roadcards.mjs`, headless Chromium (not Safari), at the space Safari leaves on an iPhone: **390×664** (iPhone 13–15, 390×844 screen), **430×746** (Pro Max, 430×932), **375×548** (SE, 375×667). `report.json` has each card's measurements, whether a button overlaps another, whether the consequence is under Onward, and the smallest font on the card.

| # | Example | 390×664 |
|---|---|---|
| 1 | Solo success (test) | `1-solo-success_390x664.png`, overlay `1-solo-success_overlay_390x664.png` |
| 2 | Solo failure (test, rematch offered) | `2-solo-failure_390x664.png`, overlay `2-solo-failure_overlay_390x664.png` |
| 3 | Company winner (six heroes) | `3-company-winner_390x664.png` |
| 4 | Company tie | `4-company-tie_390x664.png` |
| 5 | Walk-on | `5-walk-on_390x664.png` |
| 6 | A cost with a temporary benefit (company) | `6-cost-and-benefit_390x664.png` |

The same six at 430×746 and 375×548 are beside them.

## Checked against current main (the catalogue was drafted against `c372e4b`)

Only one commit touched these files since `c372e4b`: my own T09 v1 (`217a79d`, deployed as `20261023road`). Nothing of anyone else's was overwritten.
- **15 test lines and the rematch line** had already been shortened by v1, so the catalogue's "Current" column is the text before v1. The approved rev 2 text replaces both.
- **`roll2()`** no longer exists (v1 removed it); the roll summary is now `rollLine()` in js/trials.js, shared by the card and the overlay.
- **The v1 kicker** (`Won · 4 to 3`) is gone; the kicker is the event's own again (`A test of speed`, `On the road`), or `Ann chose for the company` at an online table.
- **Pack moments:** all 170 "Current" lines matched the code exactly once; 21 changed, 149 approved as they are. **Default moments:** all 20 changed. **Shared roads and tests:** every proposed line is in the code (checked piece by piece by script).
- **Chronicle** `note()` lines are untouched; the Call for Help card no longer mentions the chronicle.
- **Mechanics** untouched: no number, cost, recipient, tie rule or company-contest rule changed. Tests: 364 pass (two new for T09).

## Behaviour the catalogue does not cover (for review)

1. **`{who}’s roll` on every phone in a company** (Remaining question 1): implemented as "a company always names the champion", on the champion's own phone too and on a shared phone, so every screen matches. Alone it is `Your roll`.
2. **A won rematch** shows the win only. The first loss still stands in the code (`rematchTrial`: "a win pays out as usual; the first loss still stands"), but the card does not say so. Suggest adding `The first loss still stands.` to the won rematch's consequence; not done, as it is new copy.
3. **Consequence tag in solo:** a company-wide blessing shows the hero's name when alone (`Ann · Next fight: +3 pierce every round.`). The opening gate's approved line still says "for every hero", and the cobbler's polish says "8 gold for you" beside the tag `Ann`. Both are correct but read slightly oddly alone.
4. **No tag** on the tug-of-war loss (`One goblin follows and joins the next fight.`, the company's next fight) and on potion gifts (each line names its hero).
5. **"No bonus this time."** after a failed solo moment sits in the consequence frame without a name.
6. **Online bug fixed on the way:** since `20261023road`, a mid-line comment in js/g3/online.js had swallowed the "Waiting for the others" label and the disabled state of Onward at an online table. It is fixed in this branch; the live site still has it until this is merged (or a one-line hotfix goes first, if wanted).

Tell/go rewrites and campaign additions are not in this branch.
