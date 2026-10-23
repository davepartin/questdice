# T09: road result copy (writing handoff)

**Status: READY FOR DIRECTOR REVIEW**
**Owner (writing):** Story and Writing Lead (QuestStoryBot)
**Owner (integration and phone check):** Implementation lead (Claude)
**Drafted against:** `c372e4b` on `main` (23 October 2026)
**This document changes no runtime files.** Approved text is for Claude to wire after Astra’s review.

## Writing rules (this draft)

- Short result, then its consequence. One or two sentences.
- Drop arithmetic narration such as “seven is bigger than two”. Put the roll in a compact prefix, then the outcome.
- Keep every condition, cost, reward, and choice that matters. Numbers match the code.
- Clear, natural language with a light touch of fantasy flavour. No forced jokes, no long narration, no new mechanics.
- Keep template tokens valid: `{place}`, `{who}`, `{company}`, `{names}`, `{someone}`, `{wizard}`, `{knight}`, `{bard}`, `{dwarf}`, and code interpolations such as `${n}`, `${r.who}`.
- Never use he/she for a hero. Use `{who}` or the name.
- `go` / `tell` are the choice screen. They are catalogued so nothing was missed; this pass rewrites **result** copy (`apply` / `win` / `lose` / `won` / `lost` / generated wrappers). `tell` is unchanged unless noted.

## Scope covered

Player-facing road **result** strings, read from `c372e4b`:

| Source | What | Count |
|---|---|---|
| `js/roads.js` generated wrappers | `roll2`, moment win/lose wrap, company contest, rematch miss, potion gift | 9 builders |
| `js/roads.js` opening, help, encounters, boss eves | `apply` returns, including 50/50 branches | 27 |
| `js/roads.js` default moments | `won` / `lost` for `m-rope` … `m-bell` | 20 |
| `js/roads.js` trials | `win` / `lose` plus walk-on `apply` | 18 |
| `js/g3/trialui.js` and `js/g3/trial3d.js` | roll overlay verdict | 1 shared format (two files) |
| `js/packs/*.js` | every pack moment `won` / `lost` (5 packs × 17 quiet steps) | 170 |
| Pack `go` labels | catalogued, keep | 85 |

**244 outcome lines** are given a current + proposed pair below (builders + shared roads + pack won/lost). Search also covered “is bigger than”: that phrase is **not in the runtime**. The live arithmetic is `${heroTotal} against ${oppTotal}` inside result paragraphs, plus `${heroTotal} to ${oppTotal}` on the dice overlay. This draft replaces both with a compact `Rolled 7 vs 2:` prefix.

**Not in this pass (not road-result copy):** story beats, arrive/win fight text, secret-objective envelopes, chronicle lines (except where they duplicate a result), choice hints, `oddsLine`. Chronicle notes stay as they are unless Astra asks for a second pass.

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

These are not pack strings. They are built in `js/roads.js`, `js/trials.js` (roll totals only), and the trial overlay. **Do not leave arithmetic inside the story sentence.**

### `js/roads.js` · `roll2(r)`

- Current: `${r.heroTotal} against ${r.oppTotal}` (example: `7 against 2`)
- Proposed: `Rolled ${r.heroTotal} vs ${r.oppTotal}` (example: `Rolled 7 vs 2`)
- Wire: keep the helper; stop dropping it in the middle of a sentence. Use it as a prefix, then a colon, then the outcome.

### `js/roads.js` · `moment()` · choice `go` · `win` (solo)

- Current: `${won(ctx, r.who)} (${roll2(r)}) ${r.who}: ${p}.`
- Proposed: `${roll2(r)}: ${won(ctx, r.who)} ${r.who}: ${p}.`
- Example: `Rolled 7 vs 2: Ann shows Pip how to grab a collar. Pip holds on. Ann: start the next fight with 2 more magic.`

### `js/roads.js` · `moment()` · choice `go` · `lose` (solo)

- Current: `${lost(ctx, r.who)} (${roll2(r)}) No bonus this time, but a good story.`
- Proposed: `${roll2(r)}: ${lost(ctx, r.who)} No bonus this time.`
- Example: `Rolled 2 vs 7: Ann explains it slowly. Pip lets go to clap, and falls off again. No bonus this time.`

### `js/roads.js` · `moment()` · `contest` (company, 2–6 heroes)

- Current (built as name-and-total list, then a line, then prize): `Ann 7 · Bob 4. {won or tie line} Ann: {prize}.`
  - One winner: `line` is the pack `won` text.
  - Tie: `A tie between Ann and Bob, so both win.` (or `all` if more than two)
- Proposed: keep the name-and-total list, then the short `won` or tie line, then the prize. Example shape: `Ann 7 · Bob 4. {won or tie line} Ann: {prize}.`
  - Keep naming every roll. That is the result, not arithmetic narration.
  - One winner: `line` stays the pack `won` text (no extra joke).
  - Tie: `A tie between Ann and Bob: both win.` / `A tie between Ann, Bob and Cate: all win.`
- Example: `Ann 7 · Bob 4. Ann shows Pip how to grab a collar. Pip holds on. Ann: start the next fight with 2 more magic.`
- Wire: `contest` in `moment()`. Lost heroes in a company contest never see pack `lost` today; leave that rule as-is.

### `js/roads.js` · `prizeWords` (appended to moment results)

- Current: `start the next fight with ${n} more magic` / `${n} gold` / `+${n} health next fight` / `+${n} attack in round 1 of the next fight` / `+${n} block in round 1 of the next fight`
- Proposed: keep these phrases. They are the consequence, and the numbers are correct.

### `js/roads.js` · `rematchTrial` · lost rematch

- Current: `A rematch, ${roll2(r)}. No luck this time either. Some days the dice have other plans.`
- Proposed: `Rematch. ${roll2(r)}: short again. The first loss still stands.`
- Example: `Rematch. Rolled 4 vs 6: short again. The first loss still stands.`
- Cost remains 5 / 10 / 15 gold (already paid before the roll). Moments have no rematch.

### `js/roads.js` · `givePotion`

- Current (belt has room): `${m.name} tucks a healing potion into the belt.`
- Proposed: `${m.name}: one healing potion.`
- Current (belt full): `${m.name}’s belt is already full, so the gift becomes ${g} gold instead.` (`g` is 10 / 20 / 30)
- Proposed: `${m.name}’s belt is full: ${g} gold instead.`

### `js/g3/trialui.js` · overlay verdict  and  `js/g3/trial3d.js` · overlay verdict

- Current: `You win.` / `Not this time.` plus `${trial.heroTotal} to ${trial.oppTotal}`
- Proposed: `Through.` / `Short.` plus `${trial.heroTotal} vs ${trial.oppTotal}`
- Wire in both overlay files so the live dice and the result card use the same words. Do not add “is bigger than”.

## Shared roads (`js/roads.js`)

### Opening — `gate` · `march` · `apply`

- Current: `The heart stone knocks back. One deep thump, like a fist on a tavern door at dawn. Right then. Off we go. For the first round of the fight ahead, every hero swings at +10 attack.`
- Proposed: `The heart stone knocks back. Round 1 of the next fight: +10 attack for every hero.`
- Note: opening is Act I step 1 only; the +10 is fixed (`openingAtk: 10`), not act-scaled.

### Call for Help — `help` · `save-a` / `save-b` · `apply` (`pickHelp`)

- Current: `You turn toward ${saved}. ${lost} will have to stand on its own. A chronicle line will remember the choice. Roads always do.`
- Proposed: `You turn toward ${saved}. ${lost} waits. The chronicle will remember.`
- Same text for both buttons. The fight is at the saved place; the other place is forsaken. (Dawn still uses this. Packs with `help: []` skip it.)

### `enchanter` · `pay` · `apply`

- Current: `The enchanter mutters, one weapon hums, then all of them hum, in harmony, which nobody asked for. Next fight: +${n} pierce every round.`
- Proposed: `The weapons take the spell. Next fight: +${n} pierce every round.`
- Cost: 15 / 30 / 45 gold. `n` is 3 / 4 / 5.

### `enchanter` · `free` · `apply` (success, 50%)

- Current: `It works! The apprentice is more surprised than anyone. Next fight: +${n} pierce every round.`
- Proposed: `The apprentice’s spell holds. Next fight: +${n} pierce every round.`

### `enchanter` · `free` · `apply` (fail, 50%)

- Current: `There is a flash, a pop, and a smell of lavender. That is the whole effect. The weapons are exactly as sharp as before, but they smell lovely.`
- Proposed: `A flash, a pop, and lavender. The weapons are unchanged.`

### `enchanter` · `walk` · `apply`

- Current: `"Your loss!" calls the enchanter, and then, quieter, "Probably."`
- Proposed: `You walk on. Nothing gained.`

### `cobbler` · `borrow` · `apply`

- Current: `They fit like a promise. Next fight, your feet roll a d${n}. After it, the cobbler wants them back, and he will know if you ran in a puddle.`
- Proposed: `Loaner boots for one fight: feet roll a d${n}. He takes them back after.`
- `n` is 8 / 10 / 12. Only if that die is bigger than the hero’s own.

### `cobbler` · `polish` · `apply`

- Current: `An hour of polishing. ${gp(ctx.act, 8)} gold ${each(...)} , and the cleanest boots in the land, none of them yours.`
- Proposed: `You polish boots. ${gp(ctx.act, 8)} gold ${each(ctx.members, 'for you', 'each')}.`
- Gold: 8 / 16 / 24 per hero.

### `stew` · `bowl` · `apply`

- Current: `It is, against all the evidence, delicious. Next fight: +${n} health.`
- Proposed: `A bowl of stew. Next fight: +${n} health.`
- `n` is 10 / 15 / 20.

### `stew` · `seconds` · `apply` (lump disagrees, 50%)

- Current: `The lump disagrees. Loudly. Next fight: +${n} health, but you lose ${s} every round to a very unhappy stomach.`
- Proposed: `Seconds, and the lump disagrees. Next fight: +${n} health, and lose ${s} health every round.`
- `n` is 20 / 30 / 40. `s` is 3 / 4 / 5.

### `stew` · `seconds` · `apply` (dumpling, 50%)

- Current: `The lump was a dumpling. Bliss. Next fight: +${n} health.`
- Proposed: `Seconds. The lump was a dumpling. Next fight: +${n} health.`

### `stew` · `pass` · `apply`

- Current: `The cook shrugs and eats it himself. The stew looks relieved.`
- Proposed: `You decline. Nothing gained, nothing risked.`

### `sergeant` · `shield` · `apply`

- Current: `"SHIELDS UP! NO, UP-ER!" An hour later, nobody can lower their arms. Round 1 of the next fight: +${n} block.`
- Proposed: `Shield drill. Round 1 of the next fight: +${n} block.`
- `n` is 10 / 15 / 20.

### `sergeant` · `charge` · `apply`

- Current: `"CHARGE! AGAIN! WITH FEELING!" The hedge does not survive. Round 1 of the next fight: +${n} attack.`
- Proposed: `Charge drill. Round 1 of the next fight: +${n} attack.`
- `n` is 10 / 15 / 20.

### `herbalist` · `fix` · `apply`

- Current: `The wheel goes back on with a satisfying clunk. She pays in potions. ${t}`
- Proposed: `The wheel goes back on. She pays in potions. ${t}`
- `t` is the `givePotion` line for each hero (potion, or 10 / 20 / 30 gold if the belt is full).

### `herbalist` · `nettles` · `apply`

- Current: `${gp(ctx.act, 20)} gold and a rash with ambitions. Next fight, it costs ${s} health every round. Try not to scratch. You will scratch.`
- Proposed: `${gp(ctx.act, 20)} gold, and a nettle rash. Next fight: lose ${s} health every round.`
- Gold: 20 / 40 / 60. `s` is 3 / 4 / 5.

### `well` · `wish` · `apply`

- Current: `Plink. The water glows purple, briefly. The frog nods. Next fight: start with ${n} more magic.`
- Proposed: `The wish takes. Next fight: start with ${n} more magic.`
- Cost: 8 / 16 / 24 gold. `n` is 3 / 4 / 5.

### `well` · `fish` · `apply`

- Current: `${gp(ctx.act, 15)} gold, damp. The frogs bite, and they hold grudges. Next fight starts ${w} health down.`
- Proposed: `${gp(ctx.act, 15)} gold. The frogs bite. Next fight starts ${w} health down.`
- Gold: 15 / 30 / 45. `w` is 8 / 12 / 16.

### `well` · `leave` · `apply`

- Current: `You leave. The frog watches you go, still judging.`
- Proposed: `You leave the frogs in peace. Nothing gained.`

### `eve-fire` · `sharpen` · `apply`

- Current: `Scrape, scrape, all night. By dawn the blades could cut a rumour. The boss fight: +${n} pierce every round.`
- Proposed: `You sharpen everything twice. Boss fight: +${n} pierce every round.`
- `n` is 4 / 5 / 6 (`PIERCE + 1`).

### `eve-fire` · `sleep` · `apply`

- Current: `Nobody snores, for once. You wake up feeling like a person. The boss fight: +${n} health and ${m} more magic.`
- Proposed: `A proper night’s sleep. Boss fight: +${n} health and ${m} more magic at the start.`
- `n` is 10 / 15 / 20. `m` is 3 / 4 / 5.

### `eve-speech` · `rousing` · `apply`

- Current: `"...AND THAT IS WHY WE FIGHT!" Everyone cheers, including a passing owl. Round 1 of the boss fight: +${n} attack.`
- Proposed: `The rousing bit lands. Round 1 of the boss fight: +${n} attack.`
- `n` is 15 / 20 / 25 (`OPEN + 5`).

### `eve-speech` · `sensible` · `apply`

- Current: `"...and keep your shields UP." It is not stirring, but it is correct. Round 1 of the boss fight: +${n} block.`
- Proposed: `The bit about shields lands. Round 1 of the boss fight: +${n} block.`
- `n` is 15 / 20 / 25.

### `eve-map` · `flank` · `apply`

- Current: `There is a side door. Of course there is a side door. Round 1 of the boss fight: +${n} attack, and +${p} pierce every round.`
- Proposed: `You plan the side door. Round 1 of the boss fight: +${n} attack, and +${p} pierce every round.`
- `n` is 10 / 15 / 20. `p` is 3 / 4 / 5.

### `eve-map` · `retreat` · `apply`

- Current: `Knowing where the door is makes everyone braver. Odd, but true. The boss fight: +${n} health and +${b} block in round 1.`
- Proposed: `You mark a way out. Boss fight: +${n} health, and +${b} block in round 1.`
- `n` is 10 / 15 / 20. `b` is 10 / 15 / 20.

## Default road moments (`js/roads.js` · `MOMENTS`)

Fallback for a quiet step when the pack has no moment. All five live packs fill every quiet step, so players mostly see pack copy. Still rewrite these: a new pack, or a null quiet step, will use them. Solo wrap is the `moment()` templates above. `prize` uses `SMALL`.

### `m-rope` · The Rope Swing · speed · magic

**won**
- Current: `${who} sails across and lands like a cat, if cats bowed.`
- Proposed: `${who} sails across and lands clean.`

**lost**
- Current: `${who} lets go a little early. The stream is cold and very surprised.`
- Proposed: `${who} lets go early. The stream is cold.`

### `m-stones` · Skipping Stones · wisdom · gold

**won**
- Current: `${who} reads the water, flicks the wrist: seven skips and a showy eighth.`
- Proposed: `${who} skips seven, then an eighth.`

**lost**
- Current: `${who}'s stone skips once, then sinks with dignity.`
- Proposed: `${who}’s stone skips once, then sinks.`

### `m-arm` · Arm-Wrestling at the Inn · strength · hp

**won**
- Current: `${who} slams it down. The stew arrives with a ladle the size of a shovel.`
- Proposed: `${who} wins the bout. The stew arrives.`

**lost**
- Current: `${who} meets the innkeeper's daughter, who has done this before.`
- Proposed: `${who} loses the bout.`

### `m-milestone` · Race to the Milestone · speed · atk

**won**
- Current: `${who} touches the stone first and is still bouncing an hour later.`
- Proposed: `${who} touches the stone first.`

**lost**
- Current: `${who} arrives last, claiming to have been admiring the view.`
- Proposed: `${who} arrives last.`

### `m-signpost` · The Riddling Signpost · wisdom · magic

**won**
- Current: `${who} answers. The sign glows warmer and tingles all the way up the arm.`
- Proposed: `${who} answers. The sign glows warmer.`

**lost**
- Current: `${who} guesses "a sandwich". The sign is disappointed in everyone.`
- Proposed: `${who} guesses wrong.`

### `m-log` · The Log in the Way · strength · gold

**won**
- Current: `${who} rolls the log aside. Treasure! (And a beetle, who leaves.)`
- Proposed: `${who} rolls the log aside and finds the glint underneath.`

**lost**
- Current: `${who} pushes. The log does not care. You climb over it instead.`
- Proposed: `${who} cannot move the log. You climb over it.`

### `m-apples` · The Apple Tree · strength · hp

**won**
- Current: `${who} shakes it. Apples rain down. One lands on a head, which is the price of apples.`
- Proposed: `${who} shakes the tree. Apples rain down.`

**lost**
- Current: `${who} shakes it. One apple falls. It is mostly worm.`
- Proposed: `${who} shakes it. One apple falls, mostly worm.`

### `m-stars` · Reading the Stars · wisdom · block

**won**
- Current: `${who} finds the Shield constellation and feels very well protected.`
- Proposed: `${who} finds the Shield constellation.`

**lost**
- Current: `${who} confidently identifies a constellation that is actually a moth.`
- Proposed: `${who} mistakes a moth for a constellation.`

### `m-puddle` · The Great Puddle · speed · block

**won**
- Current: `${who} clears it with room to spare, dry as a biscuit.`
- Proposed: `${who} clears it, dry.`

**lost**
- Current: `${who} lands in the exact middle. It was deeper than it looked. It always is.`
- Proposed: `${who} lands in the middle. It was deeper than it looked.`

### `m-bell` · The Old Bell · wisdom · atk

**won**
- Current: `${who} strikes it once, perfectly. The note hums in your bones.`
- Proposed: `${who} strikes the right note. Courage rings back.`

**lost**
- Current: `${who} rings it. A dog three villages away starts howling.`
- Proposed: `${who} misses the note.`

## Tests on the road (`js/roads.js` · `TRIALS`)

Dice tests before the elite (step 5), and on step 8 when Call for Help is off. Result copy currently bakes `roll2(r)` into the sentence. Proposed: prefix with the roll template, then the short result and consequence. `n` / `w` / `s` follow the act table.

### `t-troll` · `answer` · `win`

- Current: `"An echo!" says ${r.who}, ${roll2(r)}. The troll sulks, then whispers where monsters are soft. Next fight: +${n} pierce every round.`
- Proposed: `${roll2(r)}: ${r.who} answers — an echo. The troll tells where monsters are soft. Next fight: +${n} pierce every round.`

### `t-troll` · `answer` · `lose`

- Current: `Wrong, ${roll2(r)}. The club is gentle-ish. Next fight, ${r.who} starts ${w} health down.`
- Proposed: `${roll2(r)}: wrong. The club lands. Next fight, ${r.who} starts ${w} health down.`

### `t-troll` · `around` · `apply`

- Current: `The river is cold and full of opinions. The troll shouts the answer after you anyway. It was "an echo".`
- Proposed: `You wade the river. No test. Wet socks. The troll shouts “an echo” after you.`

### `t-mushroom` · `forage` · `win`

- Current: `${r.who} picks well, ${roll2(r)}, and brews them up. ${t}`
- Proposed: `${roll2(r)}: ${r.who} picks the good ones and brews them. ${t}`

### `t-mushroom` · `forage` · `lose`

- Current: `${r.who} eats the wrong one, ${roll2(r)}, and hears purple. Next fight, ${r.who} loses ${s} health every round, and hiccups.`
- Proposed: `${roll2(r)}: ${r.who} eats the wrong one. Next fight, ${r.who} loses ${s} health every round.`

### `t-mushroom` · `leave` · `apply`

- Current: `Wise. Probably. The mushrooms look disappointed, which is its own warning.`
- Proposed: `You leave the mushrooms. No test.`

### `t-tug` · `pull` · `win`

- Current: `Heave! ${r.who} drags the whole band face-first into the mud, ${roll2(r)}. Your blood is up: round 1 of the next fight, +${n} attack.`
- Proposed: `${roll2(r)}: ${r.who} pulls the goblins into the ditch. Round 1 of the next fight: +${n} attack.`

### `t-tug` · `pull` · `lose`

- Current: `The rope wins, ${roll2(r)}, and ${r.who} slides into the ditch. A delighted goblin follows you to the next fight and joins in.`
- Proposed: `${roll2(r)}: ${r.who} slides into the ditch. One goblin follows and joins the next fight.`

### `t-tug` · `leave` · `apply`

- Current: `Snip. Three goblins sit down very suddenly. They do not follow; they are arguing about whose fault it was.`
- Proposed: `You cut the rope. No test. The goblins do not follow.`

### `t-cart` · `push` · `win`

- Current: `Squelch, pop! Out it comes, ${roll2(r)}. The husband waves his pie. Round 1 of the next fight: +${n} block from his shield.`
- Proposed: `${roll2(r)}: the cart comes free. Round 1 of the next fight: +${n} block from the borrowed shield.`

### `t-cart` · `push` · `lose`

- Current: `The cart wins, ${roll2(r)}. ${r.who} pulls something important. Next fight, ${r.who} starts ${w} health down.`
- Proposed: `${roll2(r)}: the cart stays put. ${r.who} pulls something. Next fight, ${r.who} starts ${w} health down.`

### `t-cart` · `leave` · `apply`

- Current: `"Lovely," says the husband, through pie. You do not look back. You hear him eat the whole thing.`
- Proposed: `You walk on. No test.`

### `t-chicken` · `chase` · `win`

- Current: `${r.who} dives, ${roll2(r)}, and comes up holding an outraged chicken. The racing boots are yours for a fight: your feet roll a d${n}.`
- Proposed: `${roll2(r)}: ${r.who} catches Duchess. Racing boots for one fight: feet roll a d${n}.`

### `t-chicken` · `chase` · `lose`

- Current: `Duchess wins, ${roll2(r)}. ${r.who} gets a nose full of feathers and cannot stop sneezing. Next fight, ${r.who} loses ${s} health every round.`
- Proposed: `${roll2(r)}: Duchess gets away. Feathers up ${r.who}’s nose. Next fight, ${r.who} loses ${s} health every round.`

### `t-chicken` · `leave` · `apply`

- Current: `Duchess struts off into the sunset. Somewhere, a fox reconsiders its life choices.`
- Proposed: `You let Duchess go. No test.`

### `t-slide` · `run` · `win` (hard test: opponent die is one size bigger)

- Current: `${r.who} makes it, ${roll2(r)}, into a cave full of glowing moss that tingles. Next fight: start with ${n} more magic.`
- Proposed: `${roll2(r)}: ${r.who} makes the cave. The moss tingles. Next fight: start with ${n} more magic.`

### `t-slide` · `run` · `lose`

- Current: `Too slow, ${roll2(r)}. Nobody is squashed, but everybody is bruised. Next fight starts ${w} health down.`
- Proposed: `${roll2(r)}: too slow. Everybody is bruised. Next fight starts ${w} health down.`

### `t-slide` · `back` · `apply`

- Current: `It takes all afternoon, and the cave was probably lovely. You will never know.`
- Proposed: `You take the long way. No test. It takes all afternoon.`


## Pack moments: `js/packs/ballad.js`

Quiet-step road moments. The result card is built by `moment()` in `js/roads.js` (`id: m-pack`): it fills `{place}`, `{who}`, `{company}` and class tokens, then wraps **won** / **lost** in the format templates above. Prize numbers are not in these strings; they come from `SMALL`.

### Act I step 2 — Quack, Sir, Quack
`js/packs/ballad.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Count the verses | Keep |
| `won` | {who} counts eleven. The farmer pays a coin. {knight} does not look at {bard}. | {who} counts eleven. The farmer pays a coin. |
| `lost` | {who} counts twelve. {bard} looks pleased. {knight} looks at the sky. | {who} counts twelve, including Twang’s verse. |

### Act I step 4 — Backing Howls
`js/packs/ballad.js` · `m-pack` via `act.moments[3]` · `stat` speed · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Come in on the chorus | Keep |
| `won` | {who} hits the chorus on the beat. The howls go quiet. A bit of that fire stays in the arms. | {who} comes in on the chorus. The howls fall in behind. |
| `lost` | {who} comes in early. The howls come in late. It is still quite good. | {who} comes in early. The howls miss the beat. |

### Act I step 6 — Mungo’s Favourite
`js/packs/ballad.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Hum it right through | Keep |
| `won` | {who} hums it through without the splash. Mungo sighs. Everyone feels a little braver. | {who} hums it through. Mungo takes heart, and so does everyone else. |
| `lost` | {who} hums verse two. Mungo weeps. It is a wet sound. | {who} hums verse two. Mungo weeps. |

### Act I step 7 — Five Stars
`js/packs/ballad.js` · `m-pack` via `act.moments[6]` · `stat` strength · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Hold still for a review | Keep |
| `won` | {who} hammers it straight. The duck looks like a shield. | {who} hammers the post straight. The duck looks like a shield. |
| `lost` | {who} hammers it. The duck now has three extra legs. | {who} hammers the post. It still leans. |

### Act I step 9 — Flags on Fire
`js/packs/ballad.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Catch the last flag | Keep |
| `won` | {who} snatches it and smothers it. The spark jumps into the next fight. | {who} snatches the last flag and smothers it. The spark stays. |
| `lost` | {who} snatches it too late. The flag is already gone. | {who} is too late. The flag is already gone. |

### Act II step 1 — The Echo Vote
`js/packs/ballad.js` · `m-pack` via `act.moments[0]` · `stat` wisdom · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Sing one true note | Keep |
| `won` | {who} sings one clean note. It comes back warmer, and stays in the fingers. | {who} sings one clean note. The echo comes back warmer. |
| `lost` | {who} sings a quack, out of habit. It comes back three times. | {who} sings a quack. The echo sends it back three times. |

### Act II step 2 — Silence All Lutes
`js/packs/ballad.js` · `m-pack` via `act.moments[1]` · `stat` speed · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Muffle the string | Keep |
| `won` | {who} muffles it just in time. The sock feels like armour. | {who} muffles the lute just in time. The sock feels like armour. |
| `lost` | {who} muffles the wrong string. It honks. An usher ahead turns slowly. | {who} muffles the wrong string. It honks. |

### Act II step 4 — The Golden Duck
`js/packs/ballad.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Lift the tapestry edge | Keep |
| `won` | {who} rolls it gently. Under the duck is a spear-head the weavers used as a needle. | {who} rolls the tapestry up. Under the duck is a spear-head. |
| `lost` | {who} rolls it. The duck unrolls. {knight} looks at it and does not look away. | {who} rolls it. The duck unrolls again. |

### Act II step 6 — Over Here, Duck Knight
`js/packs/ballad.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Give them nothing | Keep |
| `won` | {who} takes the unmarked door. Behind it, a dropped purse and a bit of quiet. | {who} takes the unmarked door and finds a dropped purse. |
| `lost` | {who} follows the chalk. A ghost with a notebook looks delighted. | {who} follows the chalk. The marked door is a dead end. |

### Act II step 7 — Coffin-Lid Run
`js/packs/ballad.js` · `m-pack` via `act.moments[6]` · `stat` speed · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Sledge the tombs | Keep |
| `won` | {who} takes a coffin lid and flies. The landing leaves leftover courage. | {who} takes a coffin lid and rides it clean. The landing leaves leftover courage. |
| `lost` | {who} takes the lid. The lid takes {who}. | {who} takes the lid. The lid takes {who}. |

### Act II step 9 — Chapter One: Born in a Pond
`js/packs/ballad.js` · `m-pack` via `act.moments[8]` · `stat` wisdom · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Tear the page | Keep |
| `won` | {who} fishes it out and tears it. The rip sounds like a shield going up. | {who} fishes out the page and tears it. The rip sounds like a shield going up. |
| `lost` | {who} fishes it out. It is already blank. | {who} fishes it out. The page is already blank. |

### Act III step 1 — Encore of a Rockfall
`js/packs/ballad.js` · `m-pack` via `act.moments[0]` · `stat` strength · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Bow, then climb | Keep |
| `won` | {who} bows, heaves, and the path opens with a swing still in the arms. | {who} bows, then heaves the rocks aside. The path opens with a swing still in the arms. |
| `lost` | {who} bows. The rocks demand another encore. | {who} bows. The rocks stay in a heap. |

### Act III step 2 — The Shield Verse
`js/packs/ballad.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Keep it true | Keep |
| `won` | {who} keeps it true. The verse sits on the shoulders like plate. | {who} keeps the verse true. It sits on the shoulders like plate. |
| `lost` | {who} lets it rhyme. {bard} crosses “glows” out before anyone sees. | {who} lets it rhyme. The truth of the shield is lost. |

### Act III step 4 — The Glass Stone
`js/packs/ballad.js` · `m-pack` via `act.moments[3]` · `stat` wisdom · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Do not mention it | Keep |
| `won` | {who} counts nine and says nothing. The coin is there anyway. | {who} counts nine stones and says nothing. The matching coin is there anyway. |
| `lost` | {who} says “glass.” {knight} coughs. {bard} writes it down, then rubs it out. | {who} mentions the glass. The coin stays in the dust. |

### Act III step 6 — Cygnets on the Path
`js/packs/ballad.js` · `m-pack` via `act.moments[5]` · `stat` speed · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Wait for the last one | Keep |
| `won` | {who} waits. The last cygnet nods, and everyone feels a little mended. | {who} waits for the last cygnet. Everyone feels a little mended. |
| `lost` | {who} waits, then fidgets. A swan looks at {who} as if money were owed. | {who} waits, then fidgets. The swan will not be hurried. |

### Act III step 7 — Page Nine
`js/packs/ballad.js` · `m-pack` via `act.moments[6]` · `stat` strength · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Trace the Code | Keep |
| `won` | {who} traces every letter. The stone warms. A little of that law stays in the blood. | {who} traces every letter of page nine. The stone warms. |
| `lost` | {who} traces page eight by mistake. It is about hats. | {who} traces page eight by mistake. |

### Act III step 9 — The Bucket Helmet
`js/packs/ballad.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Catch the bucket | Keep |
| `won` | {who} catches it, sets it straight, and the salute is perfect. The next fight starts keen. | {who} catches the bucket and sets it straight. The salute is perfect. |
| `lost` | {who} catches it. It is still slightly on the wyrm. There is a clang. | {who} catches the bucket while it is still on the wyrm. |


## Pack moments: `js/packs/cloverheist.js`

Quiet-step road moments. The result card is built by `moment()` in `js/roads.js` (`id: m-pack`): it fills `{place}`, `{who}`, `{company}` and class tokens, then wraps **won** / **lost** in the format templates above. Prize numbers are not in these strings; they come from `SMALL`.

### Act I step 2 — A Feather in the Jam
`js/packs/cloverheist.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Fish it out | Keep |
| `won` | {who} extracts the feather, and a lucky penny that was hiding underneath. | {who} lifts the feather, and a lucky penny from under the jam. |
| `lost` | {who} extracts the feather. The jam takes {who}’s sleeve with it. | {who} lifts the feather. The jam takes {who}’s sleeve with it. |

### Act I step 4 — Lucky’s Stick
`js/packs/cloverheist.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Throw a proper stick | Keep |
| `won` | {who} hurls it far. Lucky brings it back, and a fallen raider’s cleaver. | {who} hurls the stick far. Lucky brings it back, and a fallen raider’s cleaver. |
| `lost` | {who} throws it. It goes four feet. Lucky sits on {who} kindly. | {who} throws it a few feet. Lucky sits on {who}, kindly. |

### Act I step 6 — Painted Turnips
`js/packs/cloverheist.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Spot the real clover | Keep |
| `won` | {who} finds it. The paint wipes off. The luck does not, and it tingles all the way up the arm. | {who} finds the real clover. The paint wipes off; the luck stays. |
| `lost` | {who} bites a turnip. It is a turnip. | {who} bites a painted turnip. It is a turnip. |

### Act I step 7 — Counting to Four
`js/packs/cloverheist.js` · `m-pack` via `act.moments[6]` · `stat` speed · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Count the clovers first | Keep |
| `won` | {who} counts four leaves, twice, and claims a crust. It is strengthening. | {who} counts four leaves, twice, and claims a crust. |
| `lost` | {who} gets to three, twice. A magpie takes the fourth leaf. | {who} gets to three, twice. A magpie takes the fourth leaf. |

### Act I step 9 — Buttons in the Grass
`js/packs/cloverheist.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Gather the buttons | Keep |
| `won` | {who} fills a pocket and finds a round shield under the last button. | {who} fills a pocket and finds a round shield under the last button. |
| `lost` | {who} picks up three buttons. They are all the same button. | {who} picks up three buttons. They are all the same button. |

### Act II step 1 — Sign Here
`js/packs/cloverheist.js` · `m-pack` via `act.moments[0]` · `stat` wisdom · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Read the ledger | Keep |
| `won` | {who} reads past the stamps and lifts the coin. It is still lucky. | {who} reads past the stamps and lifts the coin. |
| `lost` | {who} signs for a parcel. The parcel is {who}. | {who} signs for a parcel. The parcel is {who}. |

### Act II step 2 — Hot Beaks
`js/packs/cloverheist.js` · `m-pack` via `act.moments[1]` · `stat` speed · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Catch a dropped flame | Keep |
| `won` | {who} cups it. It sits in the palm like a tame spark, and stays there for the next fight. | {who} cups the falling flame. It sits in the palm for the next fight. |
| `lost` | {who} catches it. Briefly. | {who} catches the flame. It goes out. |

### Act II step 4 — A Loose Thread
`js/packs/cloverheist.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Pull, but not too much | Keep |
| `won` | {who} tugs once, neatly. Pennies, a thimble, and a knitting needle that will do for a spear. | {who} tugs once. Pennies, a thimble, and a knitting needle that will do for a spear. |
| `lost` | {who} pulls. {who} is now wearing a very long sleeve. | {who} pulls too hard and is left wearing a very long sleeve. |

### Act II step 6 — Mabel’s Ring
`js/packs/cloverheist.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Look in the crack | Keep |
| `won` | {who} finds a different ring, smaller, still warm from being missed. | {who} finds a smaller ring in the humming crack, still warm. |
| `lost` | {who} finds a crack. In the crack, a beetle. | {who} finds a crack. In the crack, a beetle. |

### Act II step 7 — Coffin-Lid Sledge
`js/packs/cloverheist.js` · `m-pack` via `act.moments[6]` · `stat` speed · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Ride the lid | Keep |
| `won` | {who} rides it straight and steps off with ice in every hair and a door for a shield. | {who} rides the lid straight and steps off with a door for a shield. |
| `lost` | {who} rides it in a circle, twice. | {who} rides it in a circle and ends where it began. |

### Act II step 9 — Needles in the Dark
`js/packs/cloverheist.js` · `m-pack` via `act.moments[8]` · `stat` wisdom · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Follow the clicking | Keep |
| `won` | {who} steps on the beat. The web parts like a curtain, and a little of the silver stays in the hands. | {who} steps on the beat. The web parts, and a little silver stays in the hands. |
| `lost` | {who} steps off the beat. A sleeve attaches itself. | {who} steps off the beat. A sleeve attaches itself. |

### Act III step 1 — Warm Rocks
`js/packs/cloverheist.js` · `m-pack` via `act.moments[0]` · `stat` strength · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Claim a step | Keep |
| `won` | {who} shoulders onto a high step. The heat soaks in. | {who} shoulders onto a high step. The heat soaks in. |
| `lost` | {who} sits down. The step is very warm. The step is also slightly on fire. | {who} sits down on a step that is slightly on fire. |

### Act III step 2 — Chained Sunshine
`js/packs/cloverheist.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Unpick a padlock | Keep |
| `won` | {who} pops the lock. The sun goes home. The padlock stays. | {who} pops the lock. The sun goes home. The gold padlock stays. |
| `lost` | {who} picks at it. The lock stays shut. | {who} picks at the lock. It stays shut. |

### Act III step 4 — One Coin at a Time
`js/packs/cloverheist.js` · `m-pack` via `act.moments[3]` · `stat` speed · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Beat the Mine Gang | Keep |
| `won` | {who} nips past with a handful and a swing that will do for the next fight. | {who} nips past the Mine Gang with a handful and a swing for the next fight. |
| `lost` | {who} nips one coin. A magpie nips it back. | {who} nips one coin. A magpie nips it back. |

### Act III step 6 — A Spoon for Smoulder
`js/packs/cloverheist.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Find his spoon first | Keep |
| `won` | {who} finds it, leaves it on the ledge, and keeps the horseshoe that was under it. | {who} finds the spoon, leaves it on the ledge, and keeps the horseshoe under it. |
| `lost` | {who} finds a fork. | {who} finds a fork. |

### Act III step 7 — Wish You Were Here
`js/packs/cloverheist.js` · `m-pack` via `act.moments[6]` · `stat` strength · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Put the hoard back | Keep |
| `won` | {who} heaves a chest onto the throne steps. A little of the Queen’s heat stays in the arms. | {who} heaves a chest onto the throne steps. A little of the Queen’s heat stays in the arms. |
| `lost` | {who} heaves. The chest heaves back. | {who} heaves. The chest does not move. |

### Act III step 9 — A Shiny Pebble
`js/packs/cloverheist.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Roll it first | Keep |
| `won` | {who} rolls it. Buttons, a thimble, and a coin with four leaves stamped on it bounce after. | {who} rolls the pebble. A coin with four leaves stamped on it bounces after. |
| `lost` | {who} rolls it. It is a button. The line does not break. | {who} rolls a button. The line does not break. |


## Pack moments: `js/packs/dawn.js`

Quiet-step road moments. The result card is built by `moment()` in `js/roads.js` (`id: m-pack`): it fills `{place}`, `{who}`, `{company}` and class tokens, then wraps **won** / **lost** in the format templates above. Prize numbers are not in these strings; they come from `SMALL`.

### Act I step 2 — Baked Apples
`js/packs/dawn.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Pick the right apple | Keep |
| `won` | {who} finds the one apple that is still an apple. Everyone feels a little sturdier. | {who} finds the one apple that is still an apple. Everyone feels a little sturdier. |
| `lost` | {who} picks a black one. It tastes of chimney. | {who} picks a black one. It tastes of chimney. |

### Act I step 4 — Yellow Eyes
`js/packs/dawn.js` · `m-pack` via `act.moments[3]` · `stat` speed · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Spot the pair first | Keep |
| `won` | {who} sees them first and pulls everyone into the roots. A fallen shield is waiting there. | {who} sees the eyes first and pulls everyone into the roots. A fallen shield is waiting there. |
| `lost` | {who} stares at the wrong pair. They were fireflies. The wolves are still out there. | {who} stares at the wrong pair. They were fireflies. The wolves are still out there. |

### Act I step 6 — Scorch Marks
`js/packs/dawn.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Read the claw-seal | Keep |
| `won` | {who} traces the seal. The spark brightens, and a little of that light stays. | {who} traces the claw-seal. The spark brightens, and a little of that light stays. |
| `lost` | {who} traces it backwards. The spark dims. | {who} traces it backwards. The spark dims. |

### Act I step 7 — Keep Out (This Means Dragons)
`js/packs/dawn.js` · `m-pack` via `act.moments[6]` · `stat` strength · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Hammer the sign straight | Keep |
| `won` | {who} hammers it in straight, then takes it. The next fight starts with a bit more courage. | {who} hammers the sign straight, then takes it. A bit more courage for the next fight. |
| `lost` | {who} hammers it. It falls the other way. | {who} hammers it. It falls the other way. |

### Act I step 9 — Spoons on the Hill
`js/packs/dawn.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Race the rolling spoons | Keep |
| `won` | {who} fills both fists and a pocket. | {who} fills both fists and a pocket with bouncing spoons. |
| `lost` | {who} catches one spoon. | {who} catches one spoon. |

### Act II step 1 — The Slippery Stair
`js/packs/dawn.js` · `m-pack` via `act.moments[0]` · `stat` speed · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Take the steps carefully | Keep |
| `won` | {who} follows every spark and does not slip once. The cold just bounces off. | {who} follows every spark and does not slip. The cold bounces off. |
| `lost` | {who} takes two steps at a time and sits down hard. | {who} takes two steps at a time and sits down hard. |

### Act II step 2 — One Candle
`js/packs/dawn.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Light just one | Keep |
| `won` | {who} chooses well. The flame jumps, and a little of the vault’s gold light stays in {who}’s fingers. | {who} chooses well. The flame jumps, and a little vault-light stays in {who}’s fingers. |
| `lost` | {who} lights one. It is a snuffer. | {who} lights one. It is a snuffer. |

### Act II step 4 — The Silk Door
`js/packs/dawn.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Tear the curtain | Keep |
| `won` | {who} rips it down in one pull. Behind it is a broom with a bit of fight left in it. | {who} rips the curtain down in one pull. Behind it is a broom with a bit of fight left. |
| `lost` | {who} pulls. {who} is now wearing a shawl. | {who} pulls. {who} is now wearing a shawl. |

### Act II step 6 — Cupboard Doors
`js/packs/dawn.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Knock kindly | Keep |
| `won` | {who} knocks. A very small ghost pours tea. It is cold. It is also strangely strengthening. | {who} knocks. A very small ghost pours tea. It is cold, and strengthening. |
| `lost` | {who} knocks. The door knocks back. Everyone walks a little faster after that. | {who} knocks. The door knocks back. |

### Act II step 7 — The Frozen Nest
`js/packs/dawn.js` · `m-pack` via `act.moments[6]` · `stat` strength · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Chip the ice | Keep |
| `won` | {who} chips it free without cracking the egg. The coin is warm. | {who} chips the coin free without cracking the egg. The coin is warm. |
| `lost` | {who} chips. The coin slides under the ice. | {who} chips. The coin slides under the ice. |

### Act II step 9 — Ash Garden
`js/packs/dawn.js` · `m-pack` via `act.moments[8]` · `stat` wisdom · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Walk the stone trees | Keep |
| `won` | {who} finds the old path between the stone roots. The dark steps aside, a little. | {who} finds the old path between the stone roots. The dark steps aside, a little. |
| `lost` | {who} walks into a stone tree. | {who} walks into a stone tree. |

### Act III step 1 — Coins in the Cracks
`js/packs/dawn.js` · `m-pack` via `act.moments[0]` · `stat` speed · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Pinch a coin | Keep |
| `won` | {who} nips one out between paw-steps. | {who} nips a coin out between the Cinderlings’ counts. |
| `lost` | {who} nips. The coin is stuck. | {who} nips. The coin is stuck. |

### Act III step 2 — Ringing Glass
`js/packs/dawn.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Listen to the valley | Keep |
| `won` | {who} hears it: one note that is yours. The light in the pack hums with it. | {who} hears the one note that is theirs. The light in the pack hums with it. |
| `lost` | {who} follows a reflection. | {who} follows a reflection. |

### Act III step 4 — Unpaid Miners
`js/packs/dawn.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Heave a cart | Keep |
| `won` | {who} heaves it on. The miners slip {who} a crust and a nod. | {who} heaves the cart back on the rails. The miners slip {who} a crust and a nod. |
| `lost` | {who} heaves. The cart sits down again. | {who} heaves. The cart sits down again. |

### Act III step 6 — Boil and Freeze
`js/packs/dawn.js` · `m-pack` via `act.moments[5]` · `stat` speed · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Cross the tarn | Keep |
| `won` | {who} crosses on a long freeze and arrives with a swing in every step. | {who} crosses on a long freeze and arrives with a swing in every step. |
| `lost` | {who} hits a boil. Nobody is cooked. Everybody is very wet. | {who} hits a boil. Nobody is cooked. Everybody is very wet. |

### Act III step 7 — Scorched Banners
`js/packs/dawn.js` · `m-pack` via `act.moments[6]` · `stat` wisdom · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Read the old oath | Keep |
| `won` | {who} rubs the soot away: KEEP THE LIGHT, AND THE LIGHT KEEPS YOU. It sits on the shoulders like a shield. | {who} rubs the soot away: KEEP THE LIGHT, AND THE LIGHT KEEPS YOU. It sits on the shoulders like a shield. |
| `lost` | {who} cannot read it through the soot. | {who} cannot read the oath through the soot. |

### Act III step 9 — Wading Gold
`js/packs/dawn.js` · `m-pack` via `act.moments[8]` · `stat` strength · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Climb the coin-slope | Keep |
| `won` | {who} forges a path and pulls the rest up. The spark burns brighter for the effort. | {who} forges a path up the coin-slope and pulls the rest up. The spark burns brighter. |
| `lost` | {who} slides back two steps for every one. | {who} slides back two steps for every one. |


## Pack moments: `js/packs/rivalduo.js`

Quiet-step road moments. The result card is built by `moment()` in `js/roads.js` (`id: m-pack`): it fills `{place}`, `{who}`, `{company}` and class tokens, then wraps **won** / **lost** in the format templates above. Prize numbers are not in these strings; they come from `SMALL`.

### Act I step 2 — The Sign Says No
`js/packs/rivalduo.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Read the fine print | Keep |
| `won` | {who} spots it. The sign protects everyone a little. | {who} spots the fine print. The sign protects everyone a little. |
| `lost` | {who} rubs the smudge. The line is gone. | {who} rubs the smudge. The extra line is gone. |

### Act I step 4 — Ten Paces Exactly
`js/packs/rivalduo.js` · `m-pack` via `act.moments[3]` · `stat` speed · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Measure the tug | Keep |
| `won` | {who} hits ten exactly. The next swing starts a little keener. | {who} hits ten paces exactly. The next swing starts a little keener. |
| `lost` | {who} hits eleven. The bangle plays its tune and both heroes meet in the middle. | {who} hits eleven. The bangle yanks both heroes into the middle. |

### Act I step 6 — A Rind on the Post
`js/packs/rivalduo.js` · `m-pack` via `act.moments[5]` · `stat` strength · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Lift Big Norman’s leftover | Keep |
| `won` | {who} wrenches it down. It is terrible. It is also strengthening. | {who} wrenches the rind down. It is terrible, and strengthening. |
| `lost` | {who} tugs. The post tugs back. | {who} tugs. The post tugs back. |

### Act I step 7 — Colin Is a Cheese
`js/packs/rivalduo.js` · `m-pack` via `act.moments[6]` · `stat` wisdom · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Settle the argument | Keep |
| `won` | {who} reads it: COLIN, HARD WHITE, WEDDINGS. {dwarf} was right. There is a coin under the rind. | {who} reads the label: COLIN, HARD WHITE, WEDDINGS. There is a coin under the rind. |
| `lost` | {who} reads it upside down. Nobody is happy. | {who} reads the label upside down. The argument is not settled. |

### Act I step 9 — The Cheese Committee’s Notes
`js/packs/rivalduo.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Grab the minutes | Keep |
| `won` | {who} snatches it: “Agreed: give cheese to King.” The spark jumps. | {who} snatches the minutes: “Agreed: give cheese to King.” The spark jumps. |
| `lost` | {who} snatches a blank page. | {who} snatches a blank page. |

### Act II step 1 — Keep Left
`js/packs/rivalduo.js` · `m-pack` via `act.moments[0]` · `stat` wisdom · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Read the signs | Keep |
| `won` | {who} works it out: both take the wall. | {who} works it out: both take the wall. |
| `lost` | {who} takes the banister. {dwarf} takes the wall. The bangle yanks. | {who} takes the banister. {dwarf} takes the wall. The bangle yanks. |

### Act II step 2 — The Vault Door
`js/packs/rivalduo.js` · `m-pack` via `act.moments[1]` · `stat` speed · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Shut the door | Keep |
| `won` | {who} wedges it. The draught stops. A little warmth stays in the hands. | {who} wedges the door. The draught stops. A little warmth stays in the hands. |
| `lost` | {who} wedges it with {wizard}’s hat. | {who} wedges it with {wizard}’s hat. The door does not hold. |

### Act II step 4 — Mrs Tuffet’s Flat
`js/packs/rivalduo.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Lift the tea table | Keep |
| `won` | {who} hoists it aside. Underneath, a spoon and a bit of fight. | {who} hoists the tea table aside. Underneath, a spoon and a bit of fight. |
| `lost` | {who} lifts one end. The other end sits down. | {who} lifts one end. The other end sits down. |

### Act II step 6 — Net Curtains
`js/packs/rivalduo.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Wave politely | Keep |
| `won` | {who} waves. A very small plate of cold soup appears on the step. It is strengthening. | {who} waves. A small plate of cold soup appears on the step. It is strengthening. |
| `lost` | {who} waves with the wrong hand. The curtains snap shut. A note says “Reported.” | {who} waves with the wrong hand. The curtains snap shut. |

### Act II step 7 — Black Water
`js/packs/rivalduo.js` · `m-pack` via `act.moments[6]` · `stat` strength · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Break a path | Keep |
| `won` | {who} cracks a neat lane and flicks the coin free. | {who} cracks a neat lane and flicks the coin free. |
| `lost` | {who} stamps. The coin slides under. | {who} stamps. The coin slides under. |

### Act II step 9 — The Form for Moving
`js/packs/rivalduo.js` · `m-pack` via `act.moments[8]` · `stat` wisdom · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Fill it in | Keep |
| `won` | {who} fills every blank. The dark steps back a pace. | {who} fills every blank. The dark steps back a pace. |
| `lost` | {who} writes “cheese” in every box. The form accepts it. The Porter will not. | {who} writes “cheese” in every box. The form accepts it. The Porter will not. |

### Act III step 1 — Buttons Are Not Gold
`js/packs/rivalduo.js` · `m-pack` via `act.moments[0]` · `stat` speed · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Save the buttons | Keep |
| `won` | {who} gets there first. Two buttons, one coin. | {who} covers the buttons first. Two buttons, one coin. |
| `lost` | {who} is too slow. Gareth has a button. | {who} is too slow. Gareth has a button. |

### Act III step 2 — Barry’s First Day
`js/packs/rivalduo.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Answer his question | Keep |
| `won` | {who} writes “one.” Barry, later, will lock shields with the right person. | {who} writes “one.” Barry will lock shields with the right person. |
| `lost` | {who} writes “yes.” Barry will be confused. | {who} writes “yes.” Barry will be confused. |

### Act III step 4 — Fair Pay, Round Pay
`js/packs/rivalduo.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Hold the banner | Keep |
| `won` | {who} plants it. A crust is pressed into {who}’s hand. | {who} plants the banner. A crust is pressed into {who}’s hand. |
| `lost` | {who} plants it upside down. | {who} plants it upside down. |

### Act III step 6 — A Proper Cup of Tea
`js/packs/rivalduo.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Boil it once | Keep |
| `won` | {who} makes it properly. The steam sparkles. Even {dwarf} takes a sip. | {who} boils it once. The steam sparkles. Even {dwarf} takes a sip. |
| `lost` | {who} lets the rain end in it. | {who} lets the rain end in the kettle. |

### Act III step 7 — Round and Golden
`js/packs/rivalduo.js` · `m-pack` via `act.moments[6]` · `stat` speed · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Rescue a door-knob | Keep |
| `won` | {who} nips it and pockets it as ammunition. | {who} nips the door-knob and pockets it as ammunition. |
| `lost` | {who} nips it. It is chained to the next one. | {who} nips it. It is chained to the next one. |

### Act III step 9 — The Last Ten Paces
`js/packs/rivalduo.js` · `m-pack` via `act.moments[8]` · `stat` strength · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Climb together | Keep |
| `won` | {who} matches pace all the way. The bangle is quiet. The slope feels like a shield. | {who} matches pace all the way. The bangle is quiet. The slope feels like a shield. |
| `lost` | {who} pulls ahead. The tune plays. They arrive in a heap. | {who} pulls ahead. The bangle sings. They arrive in a heap. |


## Pack moments: `js/packs/starfall.js`

Quiet-step road moments. The result card is built by `moment()` in `js/roads.js` (`id: m-pack`): it fills `{place}`, `{who}`, `{company}` and class tokens, then wraps **won** / **lost** in the format templates above. Prize numbers are not in these strings; they come from `SMALL`.

### Act I step 2 — Pip Learns to Ride
`js/packs/starfall.js` · `m-pack` via `act.moments[1]` · `stat` wisdom · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Teach Pip to hold on | Keep |
| `won` | {who} shows Pip how to grab a collar. Pip grabs it and does not let go. | {who} shows Pip how to grab a collar. Pip holds on. |
| `lost` | {who} explains it slowly. Pip lets go to clap, and falls off again. | {who} explains it slowly. Pip lets go to clap, and falls off again. |

### Act I step 4 — Smudge’s Wanted Poster
`js/packs/starfall.js` · `m-pack` via `act.moments[3]` · `stat` speed · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Rip the posters down | Keep |
| `won` | {who} tears down twenty posters in a minute flat, and finds a reward purse taped behind the last one. | {who} tears the posters down and finds a reward purse behind the last one. |
| `lost` | {who} tears down one poster. Behind it is another poster. | {who} tears down one poster. Behind it is another poster. |

### Act I step 6 — The Bear’s Pebble
`js/packs/starfall.js` · `m-pack` via `act.moments[5]` · `stat` strength · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Carry the big pebble | Keep |
| `won` | {who} hoists the pebble. You all feel warmer for it. | {who} hoists the pebble. Everyone feels warmer for it. |
| `lost` | {who} lifts it as far as the knees and has to sit down. | {who} lifts it as far as the knees and has to sit down. |

### Act I step 7 — Soup at Ashfall
`js/packs/starfall.js` · `m-pack` via `act.moments[6]` · `stat` wisdom · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Fix Ladle’s soup | Keep |
| `won` | {who} fishes a boot out of the bottom of the pot. The soup is strengthening now. | {who} fishes a boot out of the pot. The soup is strengthening now. |
| `lost` | {who} adds salt. The soup now tastes of salty boots. | {who} adds salt. The soup still tastes of boots. |

### Act I step 9 — Up the Hill
`js/packs/starfall.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Race to the top | Keep |
| `won` | {who} reaches the top first and finds a fallen shield in good shape. | {who} reaches the top first and finds a fallen shield in good shape. |
| `lost` | {who} slips on the last bit of slope and slides back to the bottom. | {who} slips on the last bit of slope and slides back to the bottom. |

### Act II step 1 — The Last Candle
`js/packs/starfall.js` · `m-pack` via `act.moments[0]` · `stat` wisdom · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Find a candle | Keep |
| `won` | {who} spots a candle stub in a crack in the wall. Pip eats it and glows, and the light tingles through {who}’s fingers too. | {who} spots a candle stub in a crack. Pip eats it and glows; some of the light stays with {who}. |
| `lost` | {who} finds a candle. It is a bone. | {who} finds a candle. It is a bone. |

### Act II step 2 — Counting Stairs
`js/packs/starfall.js` · `m-pack` via `act.moments[1]` · `stat` speed · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Run down the stairs | Keep |
| `won` | {who} runs every step without tripping once and arrives with plenty of breath to spare. | {who} runs every step without tripping and arrives with breath to spare. |
| `lost` | {who} counts the steps aloud and loses count at four hundred. | {who} counts the steps aloud and loses count. |

### Act II step 4 — The Web Door
`js/packs/starfall.js` · `m-pack` via `act.moments[3]` · `stat` strength · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Tear through the web | Keep |
| `won` | {who} rips the web open with one heave, and peels Pip off it. | {who} rips the web open and peels Pip off it. |
| `lost` | {who} pulls. {who} is also now stuck to the web. | {who} pulls. {who} is also now stuck to the web. |

### Act II step 6 — Mister Hush’s Candles
`js/packs/starfall.js` · `m-pack` via `act.moments[5]` · `stat` wisdom · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Light the old candles | Keep |
| `won` | {who} finds the old tinderbox in a niche. One by one the candles take, and the warm light feels like a good meal. | {who} finds the old tinderbox. The candles take, and the warm light feels like a good meal. |
| `lost` | {who} strikes a spark. It lands on {who}’s sleeve instead. | {who} strikes a spark. It lands on {who}’s sleeve. |

### Act II step 7 — Sneeze Practice
`js/packs/starfall.js` · `m-pack` via `act.moments[6]` · `stat` speed · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Catch Pip’s sneeze | Keep |
| `won` | {who} catches the sneeze in a hanky. Something sparkly was in it. | {who} catches the sneeze in a hanky. Something sparkly was in it. |
| `lost` | {who} is too slow. Every torch goes out. | {who} is too slow. Every torch goes out. |

### Act II step 9 — Rowing the Dark
`js/packs/starfall.js` · `m-pack` via `act.moments[8]` · `stat` strength · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Row the boat | Keep |
| `won` | {who} rows across in great strong strokes, and the far bank is closer than you feared. | {who} rows across in strong strokes. The far bank is closer than it looked. |
| `lost` | {who} rows hard. In a circle. | {who} rows hard, in a circle. |

### Act III step 1 — First Starlight
`js/packs/starfall.js` · `m-pack` via `act.moments[0]` · `stat` wisdom · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Find Pip’s star | Keep |
| `won` | {who} finds it: a faint green star low in the east. Pip stares at it all night, glowing, and some of that glow rubs off. | {who} finds Pip’s star: a faint green star low in the east. Some of that glow rubs off. |
| `lost` | {who} points at a star. It is a moth. | {who} points at a star. It is a moth. |

### Act III step 2 — Glass Is Slippery
`js/packs/starfall.js` · `m-pack` via `act.moments[1]` · `stat` speed · `prize` atk (Act I/II/III: +5 / +8 / +10 attack in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Skate the glass | Keep |
| `won` | {who} skates across in one long glide and arrives full of fire. | {who} skates across in one long glide and arrives ready to swing. |
| `lost` | {who} skates sideways and lands in a heap. | {who} skates sideways and lands in a heap. |

### Act III step 4 — Hob’s Bargain
`js/packs/starfall.js` · `m-pack` via `act.moments[3]` · `stat` wisdom · `prize` gold (Act I/II/III: 10 / 20 / 30 gold to the winner(s))

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Haggle with Hob | Keep |
| `won` | {who} haggles so well that Mother Hob ends up paying you to take the jar away. | {who} haggles until Mother Hob pays you to take the jar away. |
| `lost` | {who} buys three jars of sugar for the price of a horse. | {who} buys three jars of sugar for the price of a horse. |

### Act III step 6 — Warm Toes
`js/packs/starfall.js` · `m-pack` via `act.moments[5]` · `stat` strength · `prize` hp (Act I/II/III: +5 / +8 / +10 health next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Light a fire for Hrimvald | Keep |
| `won` | {who} chops a mountain of wood and builds a fire. You all feel warm for hours. | {who} chops a mountain of wood and builds a fire. Everyone feels warm for hours. |
| `lost` | {who} chops one log and gets the axe stuck in it. | {who} chops one log and gets the axe stuck in it. |

### Act III step 7 — Talk to the Twins
`js/packs/starfall.js` · `m-pack` via `act.moments[6]` · `stat` wisdom · `prize` block (Act I/II/III: +5 / +8 / +10 block in round 1 of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Try the wind-chime language | Keep |
| `won` | {who} manages a whole sentence: “Pip is safe.” Pip glows like a lantern. | {who} manages a whole sentence: “Pip is safe.” Pip glows like a lantern. |
| `lost` | {who} tries. It seems to mean something else. | {who} tries the wind-chime words. They seem to mean something else. |

### Act III step 9 — The Last Climb
`js/packs/starfall.js` · `m-pack` via `act.moments[8]` · `stat` speed · `prize` magic (Act I/II: 2 magic; Act III: 3 magic at the start of the next fight)

| Field | Current | Proposed |
|---|---|---|
| `go` (choice label; not result copy) | Climb for the summit | Keep |
| `won` | {who} reaches the ledge below the summit first and pulls everyone else up. The stars are close. | {who} reaches the ledge first and pulls everyone else up. The stars are close. |
| `lost` | {who} gets there last, just in time. Pip says “nearly.” | {who} gets there last, just in time. |



## Notes for integration

Claude integrates the **approved** text only, after Astra’s review. QuestStoryBot does not edit runtime files.

1. **Result card, not the choice screen.** Wire `apply` / `win` / `lose` returns and pack `won` / `lost`. Leave `tell` and hints unless Astra expands the pass.
2. **One roll prefix.** Use `Rolled 7 vs 2:` (or the company name-and-total line) once, then the short outcome, then the consequence. Remove `roll2(r)` from the middle of story sentences.
3. **Overlay and card.** Change `js/g3/trialui.js` and `js/g3/trial3d.js` together so the live dice say `7 vs 2` / Through or Short, matching the card.
4. **Numbers.** Keep `n`, `s`, `w`, `gp(act, …)`, `SMALL`, potion overflow gold, rematch cost, and the goblin ambush on a lost tug-of-war. Do not invent mechanics.
5. **Tokens.** Fill `{place}`, `{who}`, `{company}`, class tokens as now. No he/she for a hero.
6. **Chronicle.** `note()` lines are separate and shorter. Leave them unless Astra asks.
7. **Phone check (T09).** After the copy is in, check the result card on a phone. Return **before/after screenshots** for: a solo moment win, a solo moment loss, a company contest, a trial win, a trial loss (with rematch offer), and one paid encounter. Say if the check was desktop Chromium rather than Safari.
8. **Tests.** Any snapshot or string assert that quotes these lines will need updating when the copy lands. This docs PR does not run that.
9. **Stamp.** Runtime copy changes need `node tools/stamp.mjs` with a newer cache stamp. Not in this PR.

## Open questions for Astra

1. **Roll on the card as well as the overlay?** This draft keeps `Rolled 7 vs 2:` on the result card so a fast tap still shows the numbers. Cut it from the card if the overlay is enough.
2. **Company contest losses.** Today only winners get pack `won`; everyone else just sees the totals. Should second place get pack `lost`, or stay silent?
3. **Walk-on choices.** Skip/leave/walk lines are now “No test” plus one consequence. Too dry, or right for a result card?
4. **Pack voice.** Ballad, Rival Duo, and Clover Heist lost some punchlines. Restore any that are campaign voice rather than narrator gags?
5. **Chronicle / Legend.** Result card and chronicle currently diverge (chronicle is a short log). Align them, or keep two registers?
6. **Default moments.** All live packs replace them on quiet steps. Keep the rewritten fallbacks, or delete the pool later?
7. **`tell` / `go`.** Catalogued, not rewritten. Second pass if the choice screen should match this voice.
8. **Clover Heist moral forks, The Great Clover Race, Saving for a Rainy Day.** On the campaign backlog, owner QuestStoryBot, waiting until assigned separately. Not part of T09.

---

*QuestStoryBot, 23 October 2026. Documentation only.*
