# T09: road result copy (writing handoff)

**Status: READY FOR DIRECTOR REVIEW (rev 2)**
**Owner (writing):** Story and Writing Lead (QuestStoryBot)
**Owner (integration and phone check):** Implementation lead (Claude)
**Drafted against:** `c372e4b` on `main` (23 October 2026). Rev 2 follows Astra’s review of PR #35.
**This document changes no runtime files.** Approved text is for Claude to wire after Astra’s review.

## Revision 2: changes per director review

Astra approved the role and ownership in principle, then sent format and meaning notes. This pass revises the shared format and every affected line. Decisions, applied:

1. **Roll display.** Compact roll summary on the result card, **separate from the prose**. Do not prefix sentences with `Rolled 7 vs 2:`. Solo / champion tests: `Your roll 7 · Challenge 2` (or `{who}’s roll 7 · Challenge 2` at a table). Company contests: names stay on totals (`Ann 7 · Bob 4`).
2. **Verdict.** `Success` and `Failed`, or an event-specific result already in the prose. Do not use `Through` / `Short` as universal words.
3. **Company contests.** Unchanged rule: show the winner or tied winners and their rewards. Do not add pack `lost` for non-winners.
4. **Walk-on lines.** One natural sentence. No repeated `Nothing gained` or `No test`.
5. **Campaign voice.** Keep brief, character-specific humor. Cut repetitive narrator jokes and extra sentences. Concise personality, not uniformly dry.
6. **Meaning.** Narrative consequences match the code as carefully as numbers. `{lost}` must still have to stand on its own (not “wait”). Do not imply gold spent, equipment gained, or a company-wide benefit when the blessing is on one hero (or the reverse).
7. **Chronicle.** Separate concise historical record (`note()`). Result card: immediate outcome and consequence only.
8. **Default moments.** Keep the fallback pool. Deleting unused content needs a separate code usage check.
9. **`tell` / `go`.** This pass does not expand them. Confusing choice text is listed as a follow-up at the end.

### Effect check (who actually gets it)

Read from `js/roads.js` + `js/engine.js` `pullBlessings`: a blessing with no `who` applies to **every hero**; `who: name` applies to **that hero only**. Gold uses `payCompany` / `grantCompany` (company total split, unless the grant list is a single winner).

| Kind | Who | Gold | Gear |
|---|---|---|---|
| Opening, encounters, boss eves, most trial **wins** | Whole company (no `who`) | Pay/grant totals as coded | Loaner / racing boots are a one-fight **feet die**, not a kept item. Cart “shield” is round-1 block, not a shield in the pack. |
| Trial **loses** with `who: r.who` (troll club, wrong mushroom, cart strain, chicken feathers) | Champion only | None | None |
| Tug-of-war **lose** | Company: one goblin joins the next fight | None | None |
| Rockslide **lose** | Whole company starts wounded | None | None |
| Road **moments** (packs and fallbacks) | Winner(s) only (`who: name`; gold granted to that hero) | Winner gold only | No inventory items. Flavor must not claim a shield, spear, boots, or sign taken as loot. |
| Herbalist nettles gold | Company **total** 20 / 40 / 60, split | Not each | Rash is company-wide sick |
| Cobbler polish gold | `gp(8)` **each** (code grants `gp(8) * members`) | Each | None |
| Potion gift | Named hero: one potion, or 10 / 20 / 30 gold if the belt is full | Overflow only | Potion, not a new slot |

Rev 2 also caught pack lines that said “everyone feels…” on a winner-only health prize, “buys” on a **failed** moment (no gold left the purse), and found objects written as if they were equipment.

### Six representative lines (current → rev 1 → rev 2)

| # | Line | Current | Rev 1 (superseded) | Rev 2 |
|---|---|---|---|---|
| 1 | Company contest format | `Ann 7 · Bob 4. {won}. Ann: {prize}.` with `7 against 2` also stuffed into solo prose | Prefix every sentence `Rolled 7 vs 2:` | Separate summary `Ann 7 · Bob 4`, then `Success`, then winner prose and prize. Names stay on totals. No pack `lost` for the rest. |
| 2 | Call for Help (forsaken place) | `${lost} will have to stand on its own. A chronicle line will remember…` | `${lost} waits. The chronicle will remember.` | `${lost} will have to stand on its own.` Chronicle stays in `note()`, not on the card. |
| 3 | Overlay verdict | `You win.` / `Not this time.` plus `7 to 2` | `Through.` / `Short.` plus `7 vs 2` | `Success` / `Failed` plus `Your roll 7 · Challenge 2` |
| 4 | Walk-on (`well` · `leave`) | `You leave. The frog watches you go, still judging.` | `You leave the frogs in peace. Nothing gained.` | `You leave the well undisturbed.` |
| 5 | Baked Apples `won` (hp is winner-only) | `{who} finds the one apple… Everyone feels a little sturdier.` | Same “everyone” clause | `{who} finds the one apple that is still an apple.` |
| 6 | Buttons in the Grass `won` (block omen, not a shield) | `{who} fills a pocket and finds a round shield under the last button.` | Same shield as loot | `{who} fills a pocket from the glittering hill.` Prize line still grants winner block. |

## Writing rules (this draft)

- Short result, then its consequence. One or two sentences.
- Roll numbers live in a **separate summary**, not inside the sentence. No “seven is bigger than two”, no `7 against 2` mid-prose.
- Verdict: `Success` / `Failed`, or the event’s own result word if it is already the outcome (an echo, a dumpling).
- Keep every condition, cost, reward, and choice that matters. Numbers match the code. Who matches `who` / company.
- Clear, natural language. Light fantasy flavour. Brief character humor when it earns its place. No forced narrator jokes, no long narration, no new mechanics.
- Keep template tokens valid: `{place}`, `{who}`, `{company}`, `{names}`, `{someone}`, `{wizard}`, `{knight}`, `{bard}`, `{dwarf}`, and code interpolations such as `${n}`, `${r.who}`.
- Never use he/she for a hero. Use `{who}` or the name.
- `go` / `tell` stay on the choice screen. This pass rewrites **result** copy only.

## Scope covered

Player-facing road **result** strings, read from `c372e4b`:

| Source | What | Count |
|---|---|---|
| `js/roads.js` generated wrappers | roll summary, verdict, moment wrap, company contest, rematch miss, potion gift | 9 builders |
| `js/roads.js` opening, help, encounters, boss eves | `apply` returns, including 50/50 branches | 27 |
| `js/roads.js` default moments | `won` / `lost` for `m-rope` … `m-bell` | 20 |
| `js/roads.js` trials | `win` / `lose` plus walk-on `apply` | 18 |
| `js/g3/trialui.js` and `js/g3/trial3d.js` | roll overlay verdict | 1 shared format (two files) |
| `js/packs/*.js` | every pack moment `won` / `lost` (5 packs × 17 quiet steps) | 170 |
| Pack `go` labels | catalogued, keep; confusing ones listed as follow-up | 85 |

**244 outcome lines** have a current + proposed pair. Search also covered “is bigger than”: that phrase is **not in the runtime**. Live arithmetic is `${heroTotal} against ${oppTotal}` inside result paragraphs, plus `${heroTotal} to ${oppTotal}` on the overlay. Rev 2 puts those numbers in a labelled summary beside the prose, not as a sentence prefix.

**Not in this pass:** story beats, arrive/win fight text, secret-objective envelopes, chronicle `note()` lines, choice hints, `oddsLine`, `tell` / `go` rewrites.

**Act-scaled numbers (do not change):**

| Token | Act I | Act II | Act III | Code |
|---|---|---|---|---|
| `OPEN` | 10 | 15 | 20 | round-1 attack/block |
| `PIERCE` | 3 | 4 | 5 | pierce every round |
| `HP` | 10 | 15 | 20 | starting health |
| `MAGIC` | 3 | 4 | 5 | starting magic |
| `BOOTS` | d8 | d10 | d12 | feet die for one fight |
| `SICK` | 3 | 4 | 5 | health lost every round |
| `WOUND` | 8 | 12 | 16 | start the fight down |
| `gp(act, n)` | `n` | `2n` | `3n` | gold costs and payouts |
| moment `magic` | 2 | 2 | 3 | `SMALL.magic` |
| moment `gold` | 10 | 20 | 30 | `SMALL.gold` |
| moment `hp` / `atk` / `block` | 5 | 8 | 10 | `SMALL` |
| rematch | 5 gold | 10 gold | 15 gold | `rematchCost` |

Ties on tests go to the heroes. Company moments: everyone rolls; best total wins; ties share the prize.

## Generated format templates (Claude must wire)

Layout on the **result card** (and the trial overlay, matching labels):

1. Roll summary (its own line; omit on walk-on choices with no roll).
2. Verdict (`Success` / `Failed`), unless the prose is already a clear event-specific result and the overlay already showed the verdict.
3. Prose: short outcome. No totals inside it.
4. Consequence: numbers, who, costs. `prizeWords` stay as they are.

### `js/roads.js` · `roll2(r)` — do not drop this into prose

- Current: `${r.heroTotal} against ${r.oppTotal}` (example: `7 against 2`), spliced into the sentence.
- Proposed (solo / champion test, **separate line**): `Your roll ${r.heroTotal} · Challenge ${r.oppTotal}`
- At a table, the champion’s phone and the watchers: `${r.who}’s roll ${r.heroTotal} · Challenge ${r.oppTotal}`
- Example: `Your roll 7 · Challenge 2`
- Wire: keep a helper that **returns the summary line only**. Remove `${roll2(r)}` from `win` / `lose` / rematch sentences.

### `js/roads.js` · `moment()` · choice `go` · `win` (solo)

- Current: `${won(ctx, r.who)} (${roll2(r)}) ${r.who}: ${p}.`
- Proposed, as separate lines: summary `Your roll 7 · Challenge 2` · verdict `Success` · prose `${won(ctx, r.who)}` · consequence `${r.who}: ${p}.`
- Example:
  - `Your roll 7 · Challenge 2`
  - `Success`
  - `Ann shows Pip how to grab a collar. Pip grabs it and does not let go.`
  - `Ann: start the next fight with 2 more magic.`

### `js/roads.js` · `moment()` · choice `go` · `lose` (solo)

- Current: `${lost(ctx, r.who)} (${roll2(r)}) No bonus this time, but a good story.`
- Proposed: summary `Your roll 2 · Challenge 7` · `Failed` · `${lost(ctx, r.who)}` · `No bonus this time.`
- Drop “but a good story.” The failed prose is the story.

### `js/roads.js` · `moment()` · `contest` (company, 2–6 heroes)

- Current: `Ann 7 · Bob 4. {won or tie line} Ann: {prize}.`
  - One winner: `line` is pack `won`.
  - Tie: `A tie between Ann and Bob, so both win.` (or `all`)
- Proposed: **preserve that behavior.** Names stay on totals. Then verdict, winner prose or tie line, then winner(s) and prize. Do **not** add pack `lost` for anyone else.
- Example:
  - `Ann 7 · Bob 4`
  - `Success`
  - `Ann shows Pip how to grab a collar. Pip grabs it and does not let go.`
  - `Ann: start the next fight with 2 more magic.`
- Tie example: `Ann 7 · Bob 7` · `Success` · `A tie between Ann and Bob, so both win.` · `Ann and Bob: start the next fight with 2 more magic.`
- Wire: `contest` in `moment()`. Same prize to each listed winner.

### `js/roads.js` · `prizeWords` (appended to moment results)

- Current: `start the next fight with ${n} more magic` / `${n} gold` / `+${n} health next fight` / `+${n} attack in round 1 of the next fight` / `+${n} block in round 1 of the next fight`
- Proposed: keep. Name the winner(s) before the phrase so a company game does not read as a group bonus.

### `js/roads.js` · `rematchTrial` · lost rematch

- Current: `A rematch, ${roll2(r)}. No luck this time either. Some days the dice have other plans.`
- Proposed: summary `{who}’s roll 4 · Challenge 6` · `Failed` · `The rematch fails. The first loss still stands.`
- Cost remains 5 / 10 / 15 gold (already paid). Moments have no rematch.

### `js/roads.js` · `givePotion`

- Current (belt has room): `${m.name} tucks a healing potion into the belt.`
- Proposed: keep. It names who, and it is a potion, not gold.
- Current (belt full): `${m.name}’s belt is already full, so the gift becomes ${g} gold instead.` (`g` is 10 / 20 / 30)
- Proposed: `${m.name}’s belt is full, so the gift becomes ${g} gold instead.`

### `js/g3/trialui.js` and `js/g3/trial3d.js` · overlay verdict

- Current: `You win.` / `Not this time.` plus `${trial.heroTotal} to ${trial.oppTotal}`
- Proposed: `Success` / `Failed` plus `Your roll ${trial.heroTotal} · Challenge ${trial.oppTotal}` (or `{who}’s roll` at a table)
- Match the result card. Do not add “is bigger than”. Do not use Through / Short.

## Shared roads (`js/roads.js`)

Effect: unless a line says otherwise, these blessings have **no `who`**, so they apply to the whole company. Gold is a company total except cobbler polish (each).

### Opening — `gate` · `march` · `apply`

- Current: `The heart stone knocks back. One deep thump, like a fist on a tavern door at dawn. Right then. Off we go. For the first round of the fight ahead, every hero swings at +10 attack.`
- Proposed: `The heart stone knocks back, one deep thump. Round 1 of the next fight: +10 attack for every hero.`
- Effect: `openingAtk: 10`, no `who`, Act I step 1 only. Not act-scaled.

### Call for Help — `help` · `save-a` / `save-b` · `apply` (`pickHelp`)

- Current: `You turn toward ${saved}. ${lost} will have to stand on its own. A chronicle line will remember the choice. Roads always do.`
- Proposed: `You turn toward ${saved}. ${lost} will have to stand on its own.`
- Effect: next fight is at the saved place; the other place is forsaken (`campaign.saved` / `forsaken`). Do not soften “stand on its own” to “waits.” Do not mention the chronicle on the result card; `note()` already records `They ran for ${saved}. ${lost} had to wait, and the road wrote it down.`
- Same text for both buttons. Dawn still uses this. Packs with `help: []` skip it.

### `enchanter` · `pay` · `apply`

- Current: `The enchanter mutters, one weapon hums, then all of them hum, in harmony, which nobody asked for. Next fight: +${n} pierce every round.`
- Proposed: `The enchanter mutters; the weapons hum. Next fight: +${n} pierce every round.`
- Effect: company pays 15 / 30 / 45 gold (`payCompany`). `pierce: n` for everyone. `n` is 3 / 4 / 5. Gold is already paid; do not imply a second cost.

### `enchanter` · `free` · `apply` (success, 50%)

- Current: `It works! The apprentice is more surprised than anyone. Next fight: +${n} pierce every round.`
- Proposed: `It works. The apprentice is more surprised than anyone. Next fight: +${n} pierce every round.`
- Effect: no gold. Same pierce blessing as pay.

### `enchanter` · `free` · `apply` (fail, 50%)

- Current: `There is a flash, a pop, and a smell of lavender. That is the whole effect. The weapons are exactly as sharp as before, but they smell lovely.`
- Proposed: `A flash, a pop, and a smell of lavender. The weapons are unchanged.`
- Effect: nothing. Lavender is flavour, not a bonus.

### `enchanter` · `walk` · `apply`

- Current: `"Your loss!" calls the enchanter, and then, quieter, "Probably."`
- Proposed: `"Your loss," calls the enchanter, and then, quieter, "Probably."`
- Effect: nothing. Keep the NPC line; it is the walk-on.

### `cobbler` · `borrow` · `apply`

- Current: `They fit like a promise. Next fight, your feet roll a d${n}. After it, the cobbler wants them back, and he will know if you ran in a puddle.`
- Proposed: `They fit. Next fight, your feet roll a d${n}. He wants them back after.`
- Effect: `feet: n` for everyone (no `who`), one fight. `n` is 8 / 10 / 12. This **is** a temporary die, not a kept pair of boots. Only used if bigger than the hero’s own (`borrowedFeet`).

### `cobbler` · `polish` · `apply`

- Current: `An hour of polishing. ${gp(ctx.act, 8)} gold ${each(...)} , and the cleanest boots in the land, none of them yours.`
- Proposed: `An hour of polishing. ${gp(ctx.act, 8)} gold ${each(ctx.members, 'for you', 'each')}.`
- Effect: grants `gp(8) * memberCount` split so each hero receives `gp(8)`: 8 / 16 / 24 **each**. No boots.

### `stew` · `bowl` · `apply`

- Current: `It is, against all the evidence, delicious. Next fight: +${n} health.`
- Proposed: `It is, against all the evidence, delicious. Next fight: +${n} health.`
- Effect: `startHp: n` for everyone. `n` is 10 / 15 / 20.

### `stew` · `seconds` · `apply` (lump disagrees, 50%)

- Current: `The lump disagrees. Loudly. Next fight: +${n} health, but you lose ${s} every round to a very unhappy stomach.`
- Proposed: `The lump disagrees. Next fight: +${n} health, and lose ${s} health every round.`
- Effect: `startHp: n` **and** `sick: s` for everyone. `n` is 20 / 30 / 40. `s` is 3 / 4 / 5.

### `stew` · `seconds` · `apply` (dumpling, 50%)

- Current: `The lump was a dumpling. Bliss. Next fight: +${n} health.`
- Proposed: `The lump was a dumpling. Next fight: +${n} health.`
- Effect: `startHp: n` only. No sick.

### `stew` · `pass` · `apply`

- Current: `The cook shrugs and eats it himself. The stew looks relieved.`
- Proposed: `The cook shrugs and eats it himself.`
- Effect: nothing.

### `sergeant` · `shield` · `apply`

- Current: `"SHIELDS UP! NO, UP-ER!" An hour later, nobody can lower their arms. Round 1 of the next fight: +${n} block.`
- Proposed: `"Shields up." An hour later, nobody can lower their arms. Round 1 of the next fight: +${n} block.`
- Effect: `openingBlock: n` for everyone. `n` is 10 / 15 / 20.

### `sergeant` · `charge` · `apply`

- Current: `"CHARGE! AGAIN! WITH FEELING!" The hedge does not survive. Round 1 of the next fight: +${n} attack.`
- Proposed: `"Charge. Again. With feeling." The hedge does not survive. Round 1 of the next fight: +${n} attack.`
- Effect: `openingAtk: n` for everyone. `n` is 10 / 15 / 20.

### `herbalist` · `fix` · `apply`

- Current: `The wheel goes back on with a satisfying clunk. She pays in potions. ${t}`
- Proposed: `The wheel goes back on. She pays in potions. ${t}`
- Effect: each hero gets one potion, or 10 / 20 / 30 gold if that hero’s belt is full (`givePotion` per name).

### `herbalist` · `nettles` · `apply`

- Current: `${gp(ctx.act, 20)} gold and a rash with ambitions. Next fight, it costs ${s} health every round. Try not to scratch. You will scratch.`
- Proposed: `${gp(ctx.act, 20)} gold, and a rash. Next fight: lose ${s} health every round.`
- Effect: company **total** 20 / 40 / 60 gold, split. `sick: s` for everyone. `s` is 3 / 4 / 5. Not gold each.

### `well` · `wish` · `apply`

- Current: `Plink. The water glows purple, briefly. The frog nods. Next fight: start with ${n} more magic.`
- Proposed: `The coin hits the water. The frog nods. Next fight: start with ${n} more magic.`
- Effect: company **pays** 8 / 16 / 24 gold. `startMagic: n` for everyone. `n` is 3 / 4 / 5.

### `well` · `fish` · `apply`

- Current: `${gp(ctx.act, 15)} gold, damp. The frogs bite, and they hold grudges. Next fight starts ${w} health down.`
- Proposed: `${gp(ctx.act, 15)} gold, damp. The frogs bite. Next fight starts ${w} health down.`
- Effect: company **total** 15 / 30 / 45 gold, split. `wound: w` for everyone. `w` is 8 / 12 / 16.

### `well` · `leave` · `apply`

- Current: `You leave. The frog watches you go, still judging.`
- Proposed: `You leave the well undisturbed.`
- Effect: nothing.

### `eve-fire` · `sharpen` · `apply`

- Current: `Scrape, scrape, all night. By dawn the blades could cut a rumour. The boss fight: +${n} pierce every round.`
- Proposed: `You sharpen everything, twice. The boss fight: +${n} pierce every round.`
- Effect: `pierce: n` for everyone. `n` is 4 / 5 / 6 (`PIERCE + 1`). Not a new weapon.

### `eve-fire` · `sleep` · `apply`

- Current: `Nobody snores, for once. You wake up feeling like a person. The boss fight: +${n} health and ${m} more magic.`
- Proposed: `A proper night’s sleep. The boss fight: +${n} health and ${m} more magic at the start.`
- Effect: `startHp: n` and `startMagic: m` for everyone. `n` is 10 / 15 / 20. `m` is 3 / 4 / 5.

### `eve-speech` · `rousing` · `apply`

- Current: `"...AND THAT IS WHY WE FIGHT!" Everyone cheers, including a passing owl. Round 1 of the boss fight: +${n} attack.`
- Proposed: `"And that is why we fight." Round 1 of the boss fight: +${n} attack.`
- Effect: `openingAtk: n` for everyone. `n` is 15 / 20 / 25 (`OPEN + 5`).

### `eve-speech` · `sensible` · `apply`

- Current: `"...and keep your shields UP." It is not stirring, but it is correct. Round 1 of the boss fight: +${n} block.`
- Proposed: `"And keep your shields up." It is not stirring, but it is correct. Round 1 of the boss fight: +${n} block.`
- Effect: `openingBlock: n` for everyone. `n` is 15 / 20 / 25.

### `eve-map` · `flank` · `apply`

- Current: `There is a side door. Of course there is a side door. Round 1 of the boss fight: +${n} attack, and +${p} pierce every round.`
- Proposed: `There is a side door. Round 1 of the boss fight: +${n} attack, and +${p} pierce every round.`
- Effect: `openingAtk: n` and `pierce: p` for everyone. `n` is 10 / 15 / 20. `p` is 3 / 4 / 5.

### `eve-map` · `retreat` · `apply`

- Current: `Knowing where the door is makes everyone braver. Odd, but true. The boss fight: +${n} health and +${b} block in round 1.`
- Proposed: `You mark a way out. The boss fight: +${n} health, and +${b} block in round 1.`
- Effect: `startHp: n` and `openingBlock: b` for everyone. `n` is 10 / 15 / 20. `b` is 10 / 15 / 20. “Braver” here is that blessing, not a separate morale rule.

## Default road moments (`js/roads.js` · `MOMENTS`)

Fallback for a quiet step when the pack has no moment. All five live packs fill every quiet step today; keep these until a usage check says otherwise. Prize goes to the **winner(s) only**. Solo wrap is the `moment()` templates above.

### `m-rope` · The Rope Swing · speed · magic

**won**
- Current: `${who} sails across and lands like a cat, if cats bowed.`
- Proposed: `${who} sails across and lands like a cat.`

**lost**
- Current: `${who} lets go a little early. The stream is cold and very surprised.`
- Proposed: `${who} lets go a little early. The stream is cold.`

### `m-stones` · Skipping Stones · wisdom · gold

**won**
- Current: `${who} reads the water, flicks the wrist: seven skips and a showy eighth.`
- Proposed: `${who} skips seven, then a showy eighth.`
- Effect: winner gold. The sign’s prize is that gold, not a separate jar taken as an item.

**lost**
- Current: `${who}'s stone skips once, then sinks with dignity.`
- Proposed: `${who}’s stone skips once, then sinks with dignity.`

### `m-arm` · Arm-Wrestling at the Inn · strength · hp

**won**
- Current: `${who} slams it down. The stew arrives with a ladle the size of a shovel.`
- Proposed: `${who} slams it down. The stew arrives.`
- Effect: winner health only, not a stew for the table.

**lost**
- Current: `${who} meets the innkeeper's daughter, who has done this before.`
- Proposed: `${who} meets the innkeeper’s daughter, who has done this before.`

### `m-milestone` · Race to the Milestone · speed · atk

**won**
- Current: `${who} touches the stone first and is still bouncing an hour later.`
- Proposed: `${who} touches the stone first.`

**lost**
- Current: `${who} arrives last, claiming to have been admiring the view.`
- Proposed: `${who} arrives last, claiming to have been admiring the view.`

### `m-signpost` · The Riddling Signpost · wisdom · magic

**won**
- Current: `${who} answers. The sign glows warmer and tingles all the way up the arm.`
- Proposed: `${who} answers. The sign glows warmer.`

**lost**
- Current: `${who} guesses "a sandwich". The sign is disappointed in everyone.`
- Proposed: `${who} guesses “a sandwich”. The sign is disappointed.`

### `m-log` · The Log in the Way · strength · gold

**won**
- Current: `${who} rolls the log aside. Treasure! (And a beetle, who leaves.)`
- Proposed: `${who} rolls the log aside. Treasure underneath.`
- Effect: winner gold. Not a kept object beyond that.

**lost**
- Current: `${who} pushes. The log does not care. You climb over it instead.`
- Proposed: `${who} pushes. The log does not care. You climb over it.`

### `m-apples` · The Apple Tree · strength · hp

**won**
- Current: `${who} shakes it. Apples rain down. One lands on a head, which is the price of apples.`
- Proposed: `${who} shakes it. Apples rain down.`
- Effect: winner health. No gold despite “price.”

**lost**
- Current: `${who} shakes it. One apple falls. It is mostly worm.`
- Proposed: `${who} shakes it. One apple falls. It is mostly worm.`

### `m-stars` · Reading the Stars · wisdom · block

**won**
- Current: `${who} finds the Shield constellation and feels very well protected.`
- Proposed: `${who} finds the Shield constellation.`
- Effect: winner block. No shield item.

**lost**
- Current: `${who} confidently identifies a constellation that is actually a moth.`
- Proposed: `${who} names a constellation that is actually a moth.`

### `m-puddle` · The Great Puddle · speed · block

**won**
- Current: `${who} clears it with room to spare, dry as a biscuit.`
- Proposed: `${who} clears it, dry as a biscuit.`

**lost**
- Current: `${who} lands in the exact middle. It was deeper than it looked. It always is.`
- Proposed: `${who} lands in the middle. It was deeper than it looked.`

### `m-bell` · The Old Bell · wisdom · atk

**won**
- Current: `${who} strikes it once, perfectly. The note hums in your bones.`
- Proposed: `${who} strikes it once, perfectly. The note hums in ${who}’s bones.`

**lost**
- Current: `${who} rings it. A dog three villages away starts howling.`
- Proposed: `${who} rings it. A dog howls, far off.`

## Tests on the road (`js/roads.js` · `TRIALS`)

Dice tests before the elite (step 5), and on step 8 when Call for Help is off. **Do not** put `${roll2(r)}` in these sentences. The card and overlay carry `Your roll 7 · Challenge 2` and `Success` / `Failed`. `n` / `w` / `s` follow the act table.

### `t-troll` · `answer` · `win`

- Current: `"An echo!" says ${r.who}, ${roll2(r)}. The troll sulks, then whispers where monsters are soft. Next fight: +${n} pierce every round.`
- Proposed: `“An echo,” says ${r.who}. The troll sulks, then whispers where monsters are soft. Next fight: +${n} pierce every round.`
- Effect: `pierce: n` for **everyone**.

### `t-troll` · `answer` · `lose`

- Current: `Wrong, ${roll2(r)}. The club is gentle-ish. Next fight, ${r.who} starts ${w} health down.`
- Proposed: `Wrong. The club is gentle-ish. Next fight, ${r.who} starts ${w} health down.`
- Effect: `wound: w` on **`${r.who}` only**.

### `t-troll` · `around` · `apply`

- Current: `The river is cold and full of opinions. The troll shouts the answer after you anyway. It was "an echo".`
- Proposed: `You wade the river. The troll shouts the answer after you anyway: an echo.`
- Effect: nothing. Wet feet are flavour.

### `t-mushroom` · `forage` · `win`

- Current: `${r.who} picks well, ${roll2(r)}, and brews them up. ${t}`
- Proposed: `${r.who} picks the good ones and brews them. ${t}`
- Effect: `givePotion` **each** named hero.

### `t-mushroom` · `forage` · `lose`

- Current: `${r.who} eats the wrong one, ${roll2(r)}, and hears purple. Next fight, ${r.who} loses ${s} health every round, and hiccups.`
- Proposed: `${r.who} eats the wrong one and hears purple. Next fight, ${r.who} loses ${s} health every round.`
- Effect: `sick: s` on **`${r.who}` only**.

### `t-mushroom` · `leave` · `apply`

- Current: `Wise. Probably. The mushrooms look disappointed, which is its own warning.`
- Proposed: `You leave the mushrooms alone.`
- Effect: nothing.

### `t-tug` · `pull` · `win`

- Current: `Heave! ${r.who} drags the whole band face-first into the mud, ${roll2(r)}. Your blood is up: round 1 of the next fight, +${n} attack.`
- Proposed: `${r.who} drags the goblins into the mud. Round 1 of the next fight: +${n} attack.`
- Effect: `openingAtk: n` for **everyone**.

### `t-tug` · `pull` · `lose`

- Current: `The rope wins, ${roll2(r)}, and ${r.who} slides into the ditch. A delighted goblin follows you to the next fight and joins in.`
- Proposed: `${r.who} slides into the ditch. One goblin follows and joins the next fight.`
- Effect: `campaign.ambush = [{ id: 'goblin', count: 1 }]`. No wound. The extra foe is real.

### `t-tug` · `leave` · `apply`

- Current: `Snip. Three goblins sit down very suddenly. They do not follow; they are arguing about whose fault it was.`
- Proposed: `You cut the rope. The goblins do not follow.`
- Effect: nothing. No ambush.

### `t-cart` · `push` · `win`

- Current: `Squelch, pop! Out it comes, ${roll2(r)}. The husband waves his pie. Round 1 of the next fight: +${n} block from his shield.`
- Proposed: `The cart comes free. The husband waves his pie. Round 1 of the next fight: +${n} block.`
- Effect: `openingBlock: n` for **everyone**. Blessing name is “A borrowed shield”; it is round-1 block, not a shield in the pack. Do not say you keep it.

### `t-cart` · `push` · `lose`

- Current: `The cart wins, ${roll2(r)}. ${r.who} pulls something important. Next fight, ${r.who} starts ${w} health down.`
- Proposed: `The cart stays put. ${r.who} pulls something. Next fight, ${r.who} starts ${w} health down.`
- Effect: `wound: w` on **`${r.who}` only**.

### `t-cart` · `leave` · `apply`

- Current: `"Lovely," says the husband, through pie. You do not look back. You hear him eat the whole thing.`
- Proposed: `You wish them luck and walk on.`
- Effect: nothing.

### `t-chicken` · `chase` · `win`

- Current: `${r.who} dives, ${roll2(r)}, and comes up holding an outraged chicken. The racing boots are yours for a fight: your feet roll a d${n}.`
- Proposed: `${r.who} comes up holding an outraged chicken. Racing boots for one fight: feet roll a d${n}.`
- Effect: `feet: n` for **everyone**, one fight, then gone. Real temporary die, like the cobbler.

### `t-chicken` · `chase` · `lose`

- Current: `Duchess wins, ${roll2(r)}. ${r.who} gets a nose full of feathers and cannot stop sneezing. Next fight, ${r.who} loses ${s} health every round.`
- Proposed: `Duchess gets away. ${r.who} gets a nose full of feathers. Next fight, ${r.who} loses ${s} health every round.`
- Effect: `sick: s` on **`${r.who}` only**.

### `t-chicken` · `leave` · `apply`

- Current: `Duchess struts off into the sunset. Somewhere, a fox reconsiders its life choices.`
- Proposed: `You let Duchess go.`
- Effect: nothing.

### `t-slide` · `run` · `win` (hard test: opponent die is one size bigger)

- Current: `${r.who} makes it, ${roll2(r)}, into a cave full of glowing moss that tingles. Next fight: start with ${n} more magic.`
- Proposed: `${r.who} makes the cave. The moss tingles. Next fight: start with ${n} more magic.`
- Effect: `startMagic: n` for **everyone**.

### `t-slide` · `run` · `lose`

- Current: `Too slow, ${roll2(r)}. Nobody is squashed, but everybody is bruised. Next fight starts ${w} health down.`
- Proposed: `Too slow. Nobody is squashed, but everybody is bruised. Next fight starts ${w} health down.`
- Effect: `wound: w` for **everyone** (no `who`).

### `t-slide` · `back` · `apply`

- Current: `It takes all afternoon, and the cave was probably lovely. You will never know.`
- Proposed: `You take the long way. The glowing cave stays behind you.`
- Effect: nothing. You do not get the moss magic; saying the cave stays behind preserves that.


## Pack moments: `js/packs/ballad.js`

Quiet-step road moments. The result card is built by `moment()` in `js/roads.js` (`id: m-pack`): it fills `{place}`, `{who}`, `{company}` and class tokens. Roll summary and `Success` / `Failed` come from the wrappers, not these strings. **Prize goes to the winner(s) only.**

### Act I step 2 — Quack, Sir, Quack
`js/packs/ballad.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Count the verses | Keep |
| `won` | {who} counts eleven. The farmer pays a coin. {knight} does not look at {bard}. | {who} counts eleven. The farmer pays a coin. {knight} does not look at {bard}. |
| `lost` | {who} counts twelve. {bard} looks pleased. {knight} looks at the sky. | {who} counts twelve. {bard} looks pleased. {knight} looks at the sky. |

### Act I step 4 — Backing Howls
`js/packs/ballad.js` · `m-pack` via `act.moments[3]` · `stat` speed · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Come in on the chorus | Keep |
| `won` | {who} hits the chorus on the beat. The howls go quiet. A bit of that fire stays in the arms. | {who} hits the chorus on the beat. The howls go quiet. A bit of that fire stays in {who}’s arms. |
| `lost` | {who} comes in early. The howls come in late. It is still quite good. | {who} comes in early. The howls come in late. It is still quite good. |

### Act I step 6 — Mungo’s Favourite
`js/packs/ballad.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Hum it right through | Keep |
| `won` | {who} hums it through without the splash. Mungo sighs. Everyone feels a little braver. | {who} hums it through without the splash. Mungo sighs. |
| `lost` | {who} hums verse two. Mungo weeps. It is a wet sound. | {who} hums verse two. Mungo weeps. It is a wet sound. |

### Act I step 7 — Five Stars
`js/packs/ballad.js` · `m-pack` via `act.moments[6]` · `stat` strength · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Hold still for a review | Keep |
| `won` | {who} hammers it straight. The duck looks like a shield. | {who} hammers it straight. The duck looks like a shield. |
| `lost` | {who} hammers it. The duck now has three extra legs. | {who} hammers it. The duck now has three extra legs. |

### Act I step 9 — Flags on Fire
`js/packs/ballad.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Catch the last flag | Keep |
| `won` | {who} snatches it and smothers it. The spark jumps into the next fight. | {who} snatches it and smothers it. The spark jumps into the next fight. |
| `lost` | {who} snatches it too late. The flag is already gone. | {who} snatches it too late. The flag is already gone. |

### Act II step 1 — The Echo Vote
`js/packs/ballad.js` · `m-pack` via `act.moments[0]` · `stat` wisdom · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Sing one true note | Keep |
| `won` | {who} sings one clean note. It comes back warmer, and stays in the fingers. | {who} sings one clean note. It comes back warmer, and stays in the fingers. |
| `lost` | {who} sings a quack, out of habit. It comes back three times. | {who} sings a quack, out of habit. It comes back three times. |

### Act II step 2 — Silence All Lutes
`js/packs/ballad.js` · `m-pack` via `act.moments[1]` · `stat` speed · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Muffle the string | Keep |
| `won` | {who} muffles it just in time. The sock feels like armour. | {who} muffles it just in time. The sock feels like armour. |
| `lost` | {who} muffles the wrong string. It honks. An usher ahead turns slowly. | {who} muffles the wrong string. It honks. |

### Act II step 4 — The Golden Duck
`js/packs/ballad.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Lift the tapestry edge | Keep |
| `won` | {who} rolls it gently. Under the duck is a spear-head the weavers used as a needle. | {who} rolls it gently. The golden duck is out of sight. |
| `lost` | {who} rolls it. The duck unrolls. {knight} looks at it and does not look away. | {who} rolls it. The duck unrolls. {knight} looks at it and does not look away. |

### Act II step 6 — Over Here, Duck Knight
`js/packs/ballad.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Give them nothing | Keep |
| `won` | {who} takes the unmarked door. Behind it, a dropped purse and a bit of quiet. | {who} takes the unmarked door. Behind it, a dropped purse and a bit of quiet. |
| `lost` | {who} follows the chalk. A ghost with a notebook looks delighted. | {who} follows the chalk. A ghost with a notebook looks delighted. |

### Act II step 7 — Coffin-Lid Run
`js/packs/ballad.js` · `m-pack` via `act.moments[6]` · `stat` speed · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Sledge the tombs | Keep |
| `won` | {who} takes a coffin lid and flies. The landing leaves leftover courage. | {who} takes a coffin lid and flies. The landing leaves leftover courage. |
| `lost` | {who} takes the lid. The lid takes {who}. | {who} takes the lid. The lid takes {who}. |

### Act II step 9 — Chapter One: Born in a Pond
`js/packs/ballad.js` · `m-pack` via `act.moments[8]` · `stat` wisdom · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Tear the page | Keep |
| `won` | {who} fishes it out and tears it. The rip sounds like a shield going up. | {who} fishes it out and tears it. The rip sounds like a shield going up. |
| `lost` | {who} fishes it out. It is already blank. | {who} fishes it out. It is already blank. |

### Act III step 1 — Encore of a Rockfall
`js/packs/ballad.js` · `m-pack` via `act.moments[0]` · `stat` strength · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Bow, then climb | Keep |
| `won` | {who} bows, heaves, and the path opens with a swing still in the arms. | {who} bows, heaves, and the path opens with a swing still in the arms. |
| `lost` | {who} bows. The rocks demand another encore. | {who} bows. The rocks demand another encore. |

### Act III step 2 — The Shield Verse
`js/packs/ballad.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Keep it true | Keep |
| `won` | {who} keeps it true. The verse sits on the shoulders like plate. | {who} keeps it true. The verse sits on the shoulders like plate. |
| `lost` | {who} lets it rhyme. {bard} crosses “glows” out before anyone sees. | {who} lets it rhyme. {bard} crosses “glows” out before anyone sees. |

### Act III step 4 — The Glass Stone
`js/packs/ballad.js` · `m-pack` via `act.moments[3]` · `stat` wisdom · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Do not mention it | Keep |
| `won` | {who} counts nine and says nothing. The coin is there anyway. | {who} counts nine and says nothing. The coin is there anyway. |
| `lost` | {who} says “glass.” {knight} coughs. {bard} writes it down, then rubs it out. | {who} says “glass.” {knight} coughs. {bard} writes it down, then rubs it out. |

### Act III step 6 — Cygnets on the Path
`js/packs/ballad.js` · `m-pack` via `act.moments[5]` · `stat` speed · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Wait for the last one | Keep |
| `won` | {who} waits. The last cygnet nods, and everyone feels a little mended. | {who} waits. The last cygnet nods. |
| `lost` | {who} waits, then fidgets. A swan looks at {who} as if money were owed. | {who} waits, then fidgets. A swan looks at {who} as if money were owed. |

### Act III step 7 — Page Nine
`js/packs/ballad.js` · `m-pack` via `act.moments[6]` · `stat` strength · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Trace the Code | Keep |
| `won` | {who} traces every letter. The stone warms. A little of that law stays in the blood. | {who} traces every letter. The stone warms. A little of that law stays in the blood. |
| `lost` | {who} traces page eight by mistake. It is about hats. | {who} traces page eight by mistake. It is about hats. |

### Act III step 9 — The Bucket Helmet
`js/packs/ballad.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Catch the bucket | Keep |
| `won` | {who} catches it, sets it straight, and the salute is perfect. The next fight starts keen. | {who} catches it, sets it straight, and the salute is perfect. |
| `lost` | {who} catches it. It is still slightly on the wyrm. There is a clang. | {who} catches it. It is still slightly on the wyrm. There is a clang. |


## Pack moments: `js/packs/cloverheist.js`

Quiet-step road moments. The result card is built by `moment()` in `js/roads.js` (`id: m-pack`): it fills `{place}`, `{who}`, `{company}` and class tokens. Roll summary and `Success` / `Failed` come from the wrappers, not these strings. **Prize goes to the winner(s) only.**

### Act I step 2 — A Feather in the Jam
`js/packs/cloverheist.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Fish it out | Keep |
| `won` | {who} extracts the feather, and a lucky penny that was hiding underneath. | {who} extracts the feather, and a lucky penny that was hiding underneath. |
| `lost` | {who} extracts the feather. The jam takes {who}’s sleeve with it. | {who} extracts the feather. The jam takes {who}’s sleeve with it. |

### Act I step 4 — Lucky’s Stick
`js/packs/cloverheist.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Throw a proper stick | Keep |
| `won` | {who} hurls it far. Lucky brings it back, and a fallen raider’s cleaver. | {who} hurls it far. Lucky brings it back, and a fallen raider’s cleaver. |
| `lost` | {who} throws it. It goes four feet. Lucky sits on {who} kindly. | {who} throws it. It goes four feet. Lucky sits on {who} kindly. |

### Act I step 6 — Painted Turnips
`js/packs/cloverheist.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Spot the real clover | Keep |
| `won` | {who} finds it. The paint wipes off. The luck does not, and it tingles all the way up the arm. | {who} finds it. The paint wipes off. The luck does not, and it tingles all the way up the arm. |
| `lost` | {who} bites a turnip. It is a turnip. | {who} bites a turnip. It is a turnip. |

### Act I step 7 — Counting to Four
`js/packs/cloverheist.js` · `m-pack` via `act.moments[6]` · `stat` speed · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Count the clovers first | Keep |
| `won` | {who} counts four leaves, twice, and claims a crust. It is strengthening. | {who} counts four leaves, twice, and claims a crust. It is strengthening. |
| `lost` | {who} gets to three, twice. A magpie takes the fourth leaf. | {who} gets to three, twice. A magpie takes the fourth leaf. |

### Act I step 9 — Buttons in the Grass
`js/packs/cloverheist.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Gather the buttons | Keep |
| `won` | {who} fills a pocket and finds a round shield under the last button. | {who} fills a pocket from the glittering hill. |
| `lost` | {who} picks up three buttons. They are all the same button. | {who} picks up three buttons. They are all the same button. |

### Act II step 1 — Sign Here
`js/packs/cloverheist.js` · `m-pack` via `act.moments[0]` · `stat` wisdom · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Read the ledger | Keep |
| `won` | {who} reads past the stamps and lifts the coin. It is still lucky. | {who} reads past the stamps and lifts the coin. It is still lucky. |
| `lost` | {who} signs for a parcel. The parcel is {who}. | {who} signs for a parcel. The parcel is {who}. |

### Act II step 2 — Hot Beaks
`js/packs/cloverheist.js` · `m-pack` via `act.moments[1]` · `stat` speed · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Catch a dropped flame | Keep |
| `won` | {who} cups it. It sits in the palm like a tame spark, and stays there for the next fight. | {who} cups it. It sits in the palm like a tame spark, and stays there for the next fight. |
| `lost` | {who} catches it. Briefly. | {who} catches it. Briefly. |

### Act II step 4 — A Loose Thread
`js/packs/cloverheist.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Pull, but not too much | Keep |
| `won` | {who} tugs once, neatly. Pennies, a thimble, and a knitting needle that will do for a spear. | {who} tugs once, neatly. Pennies and a thimble fall. |
| `lost` | {who} pulls. {who} is now wearing a very long sleeve. | {who} pulls. {who} is now wearing a very long sleeve. |

### Act II step 6 — Mabel’s Ring
`js/packs/cloverheist.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Look in the crack | Keep |
| `won` | {who} finds a different ring, smaller, still warm from being missed. | {who} finds a different ring, smaller, still warm from being missed. |
| `lost` | {who} finds a crack. In the crack, a beetle. | {who} finds a crack. In the crack, a beetle. |

### Act II step 7 — Coffin-Lid Sledge
`js/packs/cloverheist.js` · `m-pack` via `act.moments[6]` · `stat` speed · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Ride the lid | Keep |
| `won` | {who} rides it straight and steps off with ice in every hair and a door for a shield. | {who} rides it straight and steps off with ice in every hair. |
| `lost` | {who} rides it in a circle, twice. | {who} rides it in a circle, twice. |

### Act II step 9 — Needles in the Dark
`js/packs/cloverheist.js` · `m-pack` via `act.moments[8]` · `stat` wisdom · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Follow the clicking | Keep |
| `won` | {who} steps on the beat. The web parts like a curtain, and a little of the silver stays in the hands. | {who} steps on the beat. The web parts like a curtain, and a little of the silver stays in the hands. |
| `lost` | {who} steps off the beat. A sleeve attaches itself. | {who} steps off the beat. A sleeve attaches itself. |

### Act III step 1 — Warm Rocks
`js/packs/cloverheist.js` · `m-pack` via `act.moments[0]` · `stat` strength · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Claim a step | Keep |
| `won` | {who} shoulders onto a high step. The heat soaks in. | {who} shoulders onto a high step. The heat soaks in. |
| `lost` | {who} sits down. The step is very warm. The step is also slightly on fire. | {who} sits down. The step is very warm. The step is also slightly on fire. |

### Act III step 2 — Chained Sunshine
`js/packs/cloverheist.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Unpick a padlock | Keep |
| `won` | {who} pops the lock. The sun goes home. The padlock stays. | {who} pops the lock. The sun goes home. The padlock stays. |
| `lost` | {who} picks at it. The lock stays shut. | {who} picks at it. The lock stays shut. |

### Act III step 4 — One Coin at a Time
`js/packs/cloverheist.js` · `m-pack` via `act.moments[3]` · `stat` speed · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Beat the Mine Gang | Keep |
| `won` | {who} nips past with a handful and a swing that will do for the next fight. | {who} nips past with a handful and a swing that will do for the next fight. |
| `lost` | {who} nips one coin. A magpie nips it back. | {who} nips one coin. A magpie nips it back. |

### Act III step 6 — A Spoon for Smoulder
`js/packs/cloverheist.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Find his spoon first | Keep |
| `won` | {who} finds it, leaves it on the ledge, and keeps the horseshoe that was under it. | {who} finds it, leaves it on the ledge, and keeps the horseshoe that was under it. |
| `lost` | {who} finds a fork. | {who} finds a fork. |

### Act III step 7 — Wish You Were Here
`js/packs/cloverheist.js` · `m-pack` via `act.moments[6]` · `stat` strength · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Put the hoard back | Keep |
| `won` | {who} heaves a chest onto the throne steps. A little of the Queen’s heat stays in the arms. | {who} heaves a chest onto the throne steps. A little of the Queen’s heat stays in the arms. |
| `lost` | {who} heaves. The chest heaves back. | {who} heaves. The chest heaves back. |

### Act III step 9 — A Shiny Pebble
`js/packs/cloverheist.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Roll it first | Keep |
| `won` | {who} rolls it. Buttons, a thimble, and a coin with four leaves stamped on it bounce after. | {who} rolls it. Buttons, a thimble, and a coin with four leaves stamped on it bounce after. |
| `lost` | {who} rolls it. It is a button. The line does not break. | {who} rolls it. It is a button. The line does not break. |


## Pack moments: `js/packs/dawn.js`

Quiet-step road moments. The result card is built by `moment()` in `js/roads.js` (`id: m-pack`): it fills `{place}`, `{who}`, `{company}` and class tokens. Roll summary and `Success` / `Failed` come from the wrappers, not these strings. **Prize goes to the winner(s) only.**

### Act I step 2 — Baked Apples
`js/packs/dawn.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Pick the right apple | Keep |
| `won` | {who} finds the one apple that is still an apple. Everyone feels a little sturdier. | {who} finds the one apple that is still an apple. |
| `lost` | {who} picks a black one. It tastes of chimney. | {who} picks a black one. It tastes of chimney. |

### Act I step 4 — Yellow Eyes
`js/packs/dawn.js` · `m-pack` via `act.moments[3]` · `stat` speed · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Spot the pair first | Keep |
| `won` | {who} sees them first and pulls everyone into the roots. A fallen shield is waiting there. | {who} sees them first and pulls everyone into the roots. |
| `lost` | {who} stares at the wrong pair. They were fireflies. The wolves are still out there. | {who} stares at the wrong pair. They were fireflies. The wolves are still out there. |

### Act I step 6 — Scorch Marks
`js/packs/dawn.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Read the claw-seal | Keep |
| `won` | {who} traces the seal. The spark brightens, and a little of that light stays. | {who} traces the seal. The spark brightens, and a little of that light stays. |
| `lost` | {who} traces it backwards. The spark dims. | {who} traces it backwards. The spark dims. |

### Act I step 7 — Keep Out (This Means Dragons)
`js/packs/dawn.js` · `m-pack` via `act.moments[6]` · `stat` strength · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Hammer the sign straight | Keep |
| `won` | {who} hammers it in straight, then takes it. The next fight starts with a bit more courage. | {who} hammers the sign in straight. |
| `lost` | {who} hammers it. It falls the other way. | {who} hammers it. It falls the other way. |

### Act I step 9 — Spoons on the Hill
`js/packs/dawn.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Race the rolling spoons | Keep |
| `won` | {who} fills both fists and a pocket. | {who} fills both fists and a pocket. |
| `lost` | {who} catches one spoon. | {who} catches one spoon. |

### Act II step 1 — The Slippery Stair
`js/packs/dawn.js` · `m-pack` via `act.moments[0]` · `stat` speed · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Take the steps carefully | Keep |
| `won` | {who} follows every spark and does not slip once. The cold just bounces off. | {who} follows every spark and does not slip once. The cold just bounces off. |
| `lost` | {who} takes two steps at a time and sits down hard. | {who} takes two steps at a time and sits down hard. |

### Act II step 2 — One Candle
`js/packs/dawn.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Light just one | Keep |
| `won` | {who} chooses well. The flame jumps, and a little of the vault’s gold light stays in {who}’s fingers. | {who} chooses well. The flame jumps, and a little of the vault’s gold light stays in {who}’s fingers. |
| `lost` | {who} lights one. It is a snuffer. | {who} lights one. It is a snuffer. |

### Act II step 4 — The Silk Door
`js/packs/dawn.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Tear the curtain | Keep |
| `won` | {who} rips it down in one pull. Behind it is a broom with a bit of fight left in it. | {who} rips the curtain down in one pull. |
| `lost` | {who} pulls. {who} is now wearing a shawl. | {who} pulls. {who} is now wearing a shawl. |

### Act II step 6 — Cupboard Doors
`js/packs/dawn.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Knock kindly | Keep |
| `won` | {who} knocks. A very small ghost pours tea. It is cold. It is also strangely strengthening. | {who} knocks. A very small ghost pours tea. It is cold. It is also strangely strengthening. |
| `lost` | {who} knocks. The door knocks back. Everyone walks a little faster after that. | {who} knocks. The door knocks back. |

### Act II step 7 — The Frozen Nest
`js/packs/dawn.js` · `m-pack` via `act.moments[6]` · `stat` strength · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Chip the ice | Keep |
| `won` | {who} chips it free without cracking the egg. The coin is warm. | {who} chips it free without cracking the egg. The coin is warm. |
| `lost` | {who} chips. The coin slides under the ice. | {who} chips. The coin slides under the ice. |

### Act II step 9 — Ash Garden
`js/packs/dawn.js` · `m-pack` via `act.moments[8]` · `stat` wisdom · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Walk the stone trees | Keep |
| `won` | {who} finds the old path between the stone roots. The dark steps aside, a little. | {who} finds the old path between the stone roots. The dark steps aside, a little. |
| `lost` | {who} walks into a stone tree. | {who} walks into a stone tree. |

### Act III step 1 — Coins in the Cracks
`js/packs/dawn.js` · `m-pack` via `act.moments[0]` · `stat` speed · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Pinch a coin | Keep |
| `won` | {who} nips one out between paw-steps. | {who} nips one out between paw-steps. |
| `lost` | {who} nips. The coin is stuck. | {who} nips. The coin is stuck. |

### Act III step 2 — Ringing Glass
`js/packs/dawn.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Listen to the valley | Keep |
| `won` | {who} hears it: one note that is yours. The light in the pack hums with it. | {who} hears it: one note that is yours. The light in the pack hums with it. |
| `lost` | {who} follows a reflection. | {who} follows a reflection. |

### Act III step 4 — Unpaid Miners
`js/packs/dawn.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Heave a cart | Keep |
| `won` | {who} heaves it on. The miners slip {who} a crust and a nod. | {who} heaves it on. The miners slip {who} a crust and a nod. |
| `lost` | {who} heaves. The cart sits down again. | {who} heaves. The cart sits down again. |

### Act III step 6 — Boil and Freeze
`js/packs/dawn.js` · `m-pack` via `act.moments[5]` · `stat` speed · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Cross the tarn | Keep |
| `won` | {who} crosses on a long freeze and arrives with a swing in every step. | {who} crosses on a long freeze and arrives with a swing in every step. |
| `lost` | {who} hits a boil. Nobody is cooked. Everybody is very wet. | {who} hits a boil. Nobody is cooked. Everybody is very wet. |

### Act III step 7 — Scorched Banners
`js/packs/dawn.js` · `m-pack` via `act.moments[6]` · `stat` wisdom · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Read the old oath | Keep |
| `won` | {who} rubs the soot away: KEEP THE LIGHT, AND THE LIGHT KEEPS YOU. It sits on the shoulders like a shield. | {who} rubs the soot away: KEEP THE LIGHT, AND THE LIGHT KEEPS YOU. It sits on the shoulders like a shield. |
| `lost` | {who} cannot read it through the soot. | {who} cannot read it through the soot. |

### Act III step 9 — Wading Gold
`js/packs/dawn.js` · `m-pack` via `act.moments[8]` · `stat` strength · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Climb the coin-slope | Keep |
| `won` | {who} forges a path and pulls the rest up. The spark burns brighter for the effort. | {who} forges a path and pulls the rest up. The spark burns brighter for the effort. |
| `lost` | {who} slides back two steps for every one. | {who} slides back two steps for every one. |


## Pack moments: `js/packs/rivalduo.js`

Quiet-step road moments. The result card is built by `moment()` in `js/roads.js` (`id: m-pack`): it fills `{place}`, `{who}`, `{company}` and class tokens. Roll summary and `Success` / `Failed` come from the wrappers, not these strings. **Prize goes to the winner(s) only.**

### Act I step 2 — The Sign Says No
`js/packs/rivalduo.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Read the fine print | Keep |
| `won` | {who} spots it. The sign protects everyone a little. | {who} spots the extra line. It covers {who} a little. |
| `lost` | {who} rubs the smudge. The line is gone. | {who} rubs the smudge. The line is gone. |

### Act I step 4 — Ten Paces Exactly
`js/packs/rivalduo.js` · `m-pack` via `act.moments[3]` · `stat` speed · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Measure the tug | Keep |
| `won` | {who} hits ten exactly. The next swing starts a little keener. | {who} hits ten exactly. The next swing starts a little keener. |
| `lost` | {who} hits eleven. The bangle plays its tune and both heroes meet in the middle. | {who} hits eleven. The bangle plays its tune and both heroes meet in the middle. |

### Act I step 6 — A Rind on the Post
`js/packs/rivalduo.js` · `m-pack` via `act.moments[5]` · `stat` strength · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Lift Big Norman’s leftover | Keep |
| `won` | {who} wrenches it down. It is terrible. It is also strengthening. | {who} wrenches it down. It is terrible. It is also strengthening. |
| `lost` | {who} tugs. The post tugs back. | {who} tugs. The post tugs back. |

### Act I step 7 — Colin Is a Cheese
`js/packs/rivalduo.js` · `m-pack` via `act.moments[6]` · `stat` wisdom · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Settle the argument | Keep |
| `won` | {who} reads it: COLIN, HARD WHITE, WEDDINGS. {dwarf} was right. There is a coin under the rind. | {who} reads it: COLIN, HARD WHITE, WEDDINGS. {dwarf} was right. There is a coin under the rind. |
| `lost` | {who} reads it upside down. Nobody is happy. | {who} reads it upside down. Nobody is happy. |

### Act I step 9 — The Cheese Committee’s Notes
`js/packs/rivalduo.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Grab the minutes | Keep |
| `won` | {who} snatches it: “Agreed: give cheese to King.” The spark jumps. | {who} snatches it: “Agreed: give cheese to King.” The spark jumps. |
| `lost` | {who} snatches a blank page. | {who} snatches a blank page. |

### Act II step 1 — Keep Left
`js/packs/rivalduo.js` · `m-pack` via `act.moments[0]` · `stat` wisdom · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Read the signs | Keep |
| `won` | {who} works it out: both take the wall. | {who} works it out: both take the wall. |
| `lost` | {who} takes the banister. {dwarf} takes the wall. The bangle yanks. | {who} takes the banister. {dwarf} takes the wall. The bangle yanks. |

### Act II step 2 — The Vault Door
`js/packs/rivalduo.js` · `m-pack` via `act.moments[1]` · `stat` speed · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Shut the door | Keep |
| `won` | {who} wedges it. The draught stops. A little warmth stays in the hands. | {who} wedges it. The draught stops. A little warmth stays in the hands. |
| `lost` | {who} wedges it with {wizard}’s hat. | {who} wedges it with {wizard}’s hat. |

### Act II step 4 — Mrs Tuffet’s Flat
`js/packs/rivalduo.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Lift the tea table | Keep |
| `won` | {who} hoists it aside. Underneath, a spoon and a bit of fight. | {who} hoists the tea table aside. |
| `lost` | {who} lifts one end. The other end sits down. | {who} lifts one end. The other end sits down. |

### Act II step 6 — Net Curtains
`js/packs/rivalduo.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Wave politely | Keep |
| `won` | {who} waves. A very small plate of cold soup appears on the step. It is strengthening. | {who} waves. A very small plate of cold soup appears on the step. It is strengthening. |
| `lost` | {who} waves with the wrong hand. The curtains snap shut. A note says “Reported.” | {who} waves with the wrong hand. The curtains snap shut. A note says “Reported.” |

### Act II step 7 — Black Water
`js/packs/rivalduo.js` · `m-pack` via `act.moments[6]` · `stat` strength · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Break a path | Keep |
| `won` | {who} cracks a neat lane and flicks the coin free. | {who} cracks a neat lane and flicks the coin free. |
| `lost` | {who} stamps. The coin slides under. | {who} stamps. The coin slides under. |

### Act II step 9 — The Form for Moving
`js/packs/rivalduo.js` · `m-pack` via `act.moments[8]` · `stat` wisdom · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Fill it in | Keep |
| `won` | {who} fills every blank. The dark steps back a pace. | {who} fills every blank. The dark steps back a pace. |
| `lost` | {who} writes “cheese” in every box. The form accepts it. The Porter will not. | {who} writes “cheese” in every box. The form accepts it. The Porter will not. |

### Act III step 1 — Buttons Are Not Gold
`js/packs/rivalduo.js` · `m-pack` via `act.moments[0]` · `stat` speed · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Save the buttons | Keep |
| `won` | {who} gets there first. Two buttons, one coin. | {who} gets there first. Two buttons, one coin. |
| `lost` | {who} is too slow. Gareth has a button. | {who} is too slow. Gareth has a button. |

### Act III step 2 — Barry’s First Day
`js/packs/rivalduo.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Answer his question | Keep |
| `won` | {who} writes “one.” Barry, later, will lock shields with the right person. | {who} writes “one.” Barry, later, will lock shields with the right person. |
| `lost` | {who} writes “yes.” Barry will be confused. | {who} writes “yes.” Barry will be confused. |

### Act III step 4 — Fair Pay, Round Pay
`js/packs/rivalduo.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Hold the banner | Keep |
| `won` | {who} plants it. A crust is pressed into {who}’s hand. | {who} plants it. A crust is pressed into {who}’s hand. |
| `lost` | {who} plants it upside down. | {who} plants it upside down. |

### Act III step 6 — A Proper Cup of Tea
`js/packs/rivalduo.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Boil it once | Keep |
| `won` | {who} makes it properly. The steam sparkles. Even {dwarf} takes a sip. | {who} makes it properly. The steam sparkles. Even {dwarf} takes a sip. |
| `lost` | {who} lets the rain end in it. | {who} lets the rain end in it. |

### Act III step 7 — Round and Golden
`js/packs/rivalduo.js` · `m-pack` via `act.moments[6]` · `stat` speed · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Rescue a door-knob | Keep |
| `won` | {who} nips it and pockets it as ammunition. | {who} nips the door-knob. |
| `lost` | {who} nips it. It is chained to the next one. | {who} nips it. It is chained to the next one. |

### Act III step 9 — The Last Ten Paces
`js/packs/rivalduo.js` · `m-pack` via `act.moments[8]` · `stat` strength · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Climb together | Keep |
| `won` | {who} matches pace all the way. The bangle is quiet. The slope feels like a shield. | {who} matches pace all the way. The bangle is quiet. The slope feels like a shield. |
| `lost` | {who} pulls ahead. The tune plays. They arrive in a heap. | {who} pulls ahead. The tune plays. They arrive in a heap. |


## Pack moments: `js/packs/starfall.js`

Quiet-step road moments. The result card is built by `moment()` in `js/roads.js` (`id: m-pack`): it fills `{place}`, `{who}`, `{company}` and class tokens. Roll summary and `Success` / `Failed` come from the wrappers, not these strings. **Prize goes to the winner(s) only.**

### Act I step 2 — Pip Learns to Ride
`js/packs/starfall.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Teach Pip to hold on | Keep |
| `won` | {who} shows Pip how to grab a collar. Pip grabs it and does not let go. | {who} shows Pip how to grab a collar. Pip grabs it and does not let go. |
| `lost` | {who} explains it slowly. Pip lets go to clap, and falls off again. | {who} explains it slowly. Pip lets go to clap, and falls off again. |

### Act I step 4 — Smudge’s Wanted Poster
`js/packs/starfall.js` · `m-pack` via `act.moments[3]` · `stat` speed · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Rip the posters down | Keep |
| `won` | {who} tears down twenty posters in a minute flat, and finds a reward purse taped behind the last one. | {who} tears down twenty posters in a minute flat, and finds a reward purse taped behind the last one. |
| `lost` | {who} tears down one poster. Behind it is another poster. | {who} tears down one poster. Behind it is another poster. |

### Act I step 6 — The Bear’s Pebble
`js/packs/starfall.js` · `m-pack` via `act.moments[5]` · `stat` strength · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Carry the big pebble | Keep |
| `won` | {who} hoists the pebble. You all feel warmer for it. | {who} hoists the pebble. |
| `lost` | {who} lifts it as far as the knees and has to sit down. | {who} lifts it as far as the knees and has to sit down. |

### Act I step 7 — Soup at Ashfall
`js/packs/starfall.js` · `m-pack` via `act.moments[6]` · `stat` wisdom · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Fix Ladle’s soup | Keep |
| `won` | {who} fishes a boot out of the bottom of the pot. The soup is strengthening now. | {who} fishes a boot out of the bottom of the pot. The soup is strengthening now. |
| `lost` | {who} adds salt. The soup now tastes of salty boots. | {who} adds salt. The soup now tastes of salty boots. |

### Act I step 9 — Up the Hill
`js/packs/starfall.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Race to the top | Keep |
| `won` | {who} reaches the top first and finds a fallen shield in good shape. | {who} reaches the top first. |
| `lost` | {who} slips on the last bit of slope and slides back to the bottom. | {who} slips on the last bit of slope and slides back to the bottom. |

### Act II step 1 — The Last Candle
`js/packs/starfall.js` · `m-pack` via `act.moments[0]` · `stat` wisdom · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Find a candle | Keep |
| `won` | {who} spots a candle stub in a crack in the wall. Pip eats it and glows, and the light tingles through {who}’s fingers too. | {who} spots a candle stub in a crack in the wall. Pip eats it and glows, and the light tingles through {who}’s fingers too. |
| `lost` | {who} finds a candle. It is a bone. | {who} finds a candle. It is a bone. |

### Act II step 2 — Counting Stairs
`js/packs/starfall.js` · `m-pack` via `act.moments[1]` · `stat` speed · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Run down the stairs | Keep |
| `won` | {who} runs every step without tripping once and arrives with plenty of breath to spare. | {who} runs every step without tripping once and arrives with plenty of breath to spare. |
| `lost` | {who} counts the steps aloud and loses count at four hundred. | {who} counts the steps aloud and loses count at four hundred. |

### Act II step 4 — The Web Door
`js/packs/starfall.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Tear through the web | Keep |
| `won` | {who} rips the web open with one heave, and peels Pip off it. | {who} rips the web open with one heave, and peels Pip off it. |
| `lost` | {who} pulls. {who} is also now stuck to the web. | {who} pulls. {who} is also now stuck to the web. |

### Act II step 6 — Mister Hush’s Candles
`js/packs/starfall.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Light the old candles | Keep |
| `won` | {who} finds the old tinderbox in a niche. One by one the candles take, and the warm light feels like a good meal. | {who} finds the old tinderbox in a niche. One by one the candles take, and the warm light feels like a good meal. |
| `lost` | {who} strikes a spark. It lands on {who}’s sleeve instead. | {who} strikes a spark. It lands on {who}’s sleeve instead. |

### Act II step 7 — Sneeze Practice
`js/packs/starfall.js` · `m-pack` via `act.moments[6]` · `stat` speed · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Catch Pip’s sneeze | Keep |
| `won` | {who} catches the sneeze in a hanky. Something sparkly was in it. | {who} catches the sneeze in a hanky. Something sparkly was in it. |
| `lost` | {who} is too slow. Every torch goes out. | {who} is too slow. Every torch goes out. |

### Act II step 9 — Rowing the Dark
`js/packs/starfall.js` · `m-pack` via `act.moments[8]` · `stat` strength · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Row the boat | Keep |
| `won` | {who} rows across in great strong strokes, and the far bank is closer than you feared. | {who} rows across in great strong strokes, and the far bank is closer than you feared. |
| `lost` | {who} rows hard. In a circle. | {who} rows hard. In a circle. |

### Act III step 1 — First Starlight
`js/packs/starfall.js` · `m-pack` via `act.moments[0]` · `stat` wisdom · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Find Pip’s star | Keep |
| `won` | {who} finds it: a faint green star low in the east. Pip stares at it all night, glowing, and some of that glow rubs off. | {who} finds it: a faint green star low in the east. Pip stares at it all night, glowing, and some of that glow rubs off. |
| `lost` | {who} points at a star. It is a moth. | {who} points at a star. It is a moth. |

### Act III step 2 — Glass Is Slippery
`js/packs/starfall.js` · `m-pack` via `act.moments[1]` · `stat` speed · `prize` atk (winner(s) only: Act I/II/III +5 / +8 / +10 attack in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Skate the glass | Keep |
| `won` | {who} skates across in one long glide and arrives full of fire. | {who} skates across in one long glide and arrives full of fire. |
| `lost` | {who} skates sideways and lands in a heap. | {who} skates sideways and lands in a heap. |

### Act III step 4 — Hob’s Bargain
`js/packs/starfall.js` · `m-pack` via `act.moments[3]` · `stat` wisdom · `prize` gold (winner(s) only: Act I/II/III 10 / 20 / 30 gold)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Haggle with Hob | Keep |
| `won` | {who} haggles so well that Mother Hob ends up paying you to take the jar away. | {who} haggles so well that Mother Hob ends up paying you to take the jar away. |
| `lost` | {who} buys three jars of sugar for the price of a horse. | {who} haggles. The jars stay on the cart. |

### Act III step 6 — Warm Toes
`js/packs/starfall.js` · `m-pack` via `act.moments[5]` · `stat` strength · `prize` hp (winner(s) only: Act I/II/III +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Light a fire for Hrimvald | Keep |
| `won` | {who} chops a mountain of wood and builds a fire. You all feel warm for hours. | {who} chops a mountain of wood and builds a fire. |
| `lost` | {who} chops one log and gets the axe stuck in it. | {who} chops one log and gets the axe stuck in it. |

### Act III step 7 — Talk to the Twins
`js/packs/starfall.js` · `m-pack` via `act.moments[6]` · `stat` wisdom · `prize` block (winner(s) only: Act I/II/III +5 / +8 / +10 block in round 1)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Try the wind-chime language | Keep |
| `won` | {who} manages a whole sentence: “Pip is safe.” Pip glows like a lantern. | {who} manages a whole sentence: “Pip is safe.” Pip glows like a lantern. |
| `lost` | {who} tries. It seems to mean something else. | {who} tries. It seems to mean something else. |

### Act III step 9 — The Last Climb
`js/packs/starfall.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` magic (winner(s) only: Act I/II 2 magic, Act III 3, at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Climb for the summit | Keep |
| `won` | {who} reaches the ledge below the summit first and pulls everyone else up. The stars are close. | {who} reaches the ledge below the summit first and pulls everyone else up. The stars are close. |
| `lost` | {who} gets there last, just in time. Pip says “nearly.” | {who} gets there last, just in time. Pip says “nearly.” |


## Notes for integration

Claude integrates the **approved** text only, after Astra’s review. QuestStoryBot does not edit runtime files.

1. **Result card layout.** Roll summary on its own line. Verdict `Success` / `Failed` on its own line. Prose without totals. Consequence last. Walk-ons have no roll summary.
2. **Remove in-sentence rolls.** Delete `${roll2(r)}` from every `win` / `lose` / rematch string.
3. **Overlay.** `js/g3/trialui.js` and `js/g3/trial3d.js` use the same labels: `Your roll 7 · Challenge 2` or `{who}’s roll`, and `Success` / `Failed`.
4. **Who.** Blessings with no `who` hit everyone. Moment prizes and named trial wounds/sickness hit only that hero. Do not let prose say otherwise.
5. **Gold.** `payCompany` / `grantCompany` totals as coded. Nettles and well-fish gold are company totals, not each. Cobbler polish is each. Moment gold is the winner only. Failed moments must not say anyone bought or paid.
6. **Gear.** Loaner and racing boots are a one-fight feet die. Do not add inventory items. Cart block is not a kept shield.
7. **Chronicle.** Leave `note()` as the short historical record. Do not mention the chronicle on the result card.
8. **Company contests.** Winners and ties only. No pack `lost` for the rest.
9. **Phone check (T09).** After the copy is in: before/after screenshots for a solo moment win, a solo moment loss, a company contest, a trial win, a trial loss with rematch offer, and one paid encounter. Say if the check was desktop Chromium rather than Safari.
10. **Tests and stamp.** String asserts and `node tools/stamp.mjs` belong to the integration PR, not this docs PR.

## Follow-up: confusing `tell` / `go` (not rewritten here)

Choice-screen text only. List for a later writing pass; do not expand T09.

| Pack | Act · step | Title | Issue |
|---|---|---|---|
| `js/packs/ballad.js` | II · 6 | Over Here, Duck Knight | `go`: “Give them nothing.” The tell is chalk arrows; success is taking the unmarked door. The button does not name that action. |
| `js/packs/ballad.js` | III · 4 | The Glass Stone | `go`: “Do not mention it.” The test is counting nine stones without speaking. The button reads as a refusal, not a count. |
| `js/packs/ballad.js` | II · 7 | Coffin-Lid Run | `go`: “Sledge the tombs.” The tell is a coffin-lid sledging run. “Sledge” can read as smash. |
| `js/packs/cloverheist.js` | III · 7 | Wish You Were Here | `go`: “Put the hoard back.” Success is heaving a chest onto the throne steps. The button sounds like reversing a theft the company did not just commit. |
| `js/packs/rivalduo.js` | I · 4 | Ten Paces Exactly | `go`: “Measure the tug.” The tell is walking ten paces so the bangle does not yank. “Tug” sounds like a strength pull. |
| `js/packs/starfall.js` | I · 7 | Soup at Ashfall | `go`: “Fix Ladle’s soup.” Success is fishing a boot out of the pot. The button does not say look inside. |
| `js/packs/dawn.js` | II · 2 | One Candle | `go`: “Light just one.” A failed result is lighting a snuffer. Players who do not know a snuffer puts lights out will misread the loss. |
| `js/packs/ballad.js` | III · 7 | Page Nine | `go`: “Trace the Code.” “Code” can look like a game term. It is a carved Keepers’ law. |

## Remaining questions for Astra

Rev 2 treats the nine review notes as decided. Still open:

1. At an online table, should watchers see `{who}’s roll` even on the champion’s own phone, so every screen matches?
2. Any of the `tell` / `go` follow-ups above worth a tiny wording fix in this PR after all, or hold for a later pass?

Clover Heist moral forks, The Great Clover Race, and Saving for a Rainy Day stay on the campaign backlog until assigned.

---

*QuestStoryBot, 23 October 2026. Documentation only. Rev 2.*
