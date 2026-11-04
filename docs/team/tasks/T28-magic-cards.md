# T28 The 15 starting magic cards, made great (4 November 2026)

Dave: "The magic cards got worse. Gemini tried to clean them up but made the cards worse, so it reverted back (builds
20261103g10 -> g11). I think we should just have the 3 starting hero magic powers and not add more options. We can store
all the other magic powers we made and put them at camp as a magic power a person can buy to learn, the same way we do
weapons. Let's make these 15 great: the coloured dice you roll, the charge-up powers, the other category, and the
defence powers. I want the dice spaces to look good."

Owners: **Grok** (Crockpot) owns the card design and its code (T28-ART). **Claude** owns the camp side: the three
starting powers stay equipped, and every other power moves to a "Learn magic" shelf in the Camp Store (T28-CAMP).

## The engine already works this way

Every hero has three magic slots and starts with one power in each (`start: true` in `CLASSES[cls].cards`; `cardsOf`,
`learnPower`, `equipPower` in js/engine.js; learning costs `POWER_LEARN` = 50 gold). No rule changes are needed for the 15
cards. Card numbers must come from the engine (`powerDice`, `powerCost`, `powerState`, `E.scaleNum`, the charge tables);
never type a number into the card.

## The 15 cards, in four families

| Class | Dice (slot A: roll coloured dice) | Every round or trick (slot B) | Charge-up (slot C) |
|---|---|---|---|
| Knight | **Cleave**: 3 magic rolls 2 red d6 attack, +1 d6 per extra magic (up to 4); half splashes | **Counterstrike** (defence): 2 magic, +4 block; unused block hits back | **Rally Cry**: charge 1 a round (4 max), release attack + block |
| Ranger | **Aimed Shot**: 1 magic per d6 of pierce, up to 4 | **Hunter's Mark**: 2 magic, +3 pierce; +6 gold if the target falls | **Volley**: charge, release pierce |
| Wizard | **Arc Bolt**: 2 magic per d8 attack, up to 6; half arcs to the others | **Frog Morph** (trick): load two numbers, roll a purple d6, the monster may turn into a frog | **Storm Coil**: charge, release attack, half splashes |
| Dwarf | **Anvil Strike** (defence): 1 magic per blue d8 of block, up to 6; every 8 also gives 3 gold | **Grudge**: 2 magic, attack equal to the damage that got past your block last round | **Stonehide** (defence): charge, release block |
| Bard | **Mending Song**: 1 magic per green d6 of healing, up to 6; heals the whole party | **Lucky Verse** (trick): 2 magic, roll a d6: 1-2 magic, 3-4 attack, 5-6 big attack and magic | **Rising Ballad**: charge, release attack + healing |

Every card already has painted art in `assets/cards/magic/<class>-<id>.webp`.

## What is wrong today (current main, screenshots from `node dev/magic-shots.mjs`)

- **Dice cards:** the dice row floats in a large empty cream box; empty spaces are dashed outlines that read like a form,
  not a place a die will land; the rank numeral "I" sits loose in the corner and overlaps content (Lucky Verse).
- **Charge cards:** four tan coins (2, 6, 12, 20) do not say which step you are on, what one more charge adds, or what
  releasing now gives you.
- **Frog Morph:** six empty squares in two columns with a small "Load a pair" line; it does not look like dice.
- **Rank rows II and III** use a different visual language on every card (formulas like "3=3×die", lists, plain numbers).
- Too many fonts and sizes; the cream panel is a different shape on every family.

## Card art direction for Grok

See the prompt Dave pastes to Grok (below). Done means: all 15 cards at 390 x 844 in battle and at camp, the four
families clearly different but one system, no overlapping text (the `no move name runs into its dice` style check in
dev/road-check.mjs is a model), `npm test` passing, screenshots from `dev/magic-shots.mjs` before and after on this
task page, and Dave's yes on the Knight's three before the other twelve.

## The prompt for Grok

> You are the art and front-end lead for QuestDice, a phone board game (davepartin/questdice, plain ES modules, no build
> step). Make the 15 starting magic cards beautiful and clear. Read docs/team/BOARD.md (Session protocol),
> docs/team/WORKING_GUIDE.md and docs/team/tasks/T28-magic-cards.md first. A previous overhaul was reverted
> (builds 20261103g10 -> g11), so start from the latest main and change only what this brief asks.
>
> **Files you own for this task:** js/g3/magiccard.js and css/magiccard.css. Do not change js/engine.js or js/data.js;
> every number on a card comes from the engine (`powerDice`, `powerCost`, `powerState`, `E.scaleNum`, the charge tables).
> The same card is used in battle (the Magical Powers sheet) and at camp (Magic slots), so check both.
>
> **One card system, four families.** Keep the painted frame, the art window, the name banner and the magic-cost gem
> (they are good). Redesign the panel under the name so each family has one clear layout:
>
> 1. **Dice cards** (Cleave, Aimed Shot, Arc Bolt, Anvil Strike, Mending Song): a row of real dice in the game's own die
>    style (the same rounded dice and pips as the hero's board; red attack, blue block, green heal, purple-orange pierce
>    as the game already colours them; d8s look like d8s). Each die the hero can still afford sits in an **engraved
>    socket**, a carved, slightly sunken die-shaped hollow in the card, not a dashed box. Adding magic drops a die into
>    the next socket. Show the cap (for example 2 of 4) and what the roll goes to (attack, block, heal, pierce) with one
>    icon. Splash, "every hero" (Mending Song) and the gold-on-8 (Anvil Strike) are small ribbons, not sentences.
> 2. **Charge-up cards** (Rally Cry, Volley, Storm Coil, Stonehide, Rising Ballad): a **charge track of four gems or
>    notches** that light up one per charge. Show big and clear: what releasing *now* gives, and in small type what one
>    more charge would give. The track must make the current step obvious at a glance.
> 3. **Every-round cards** (Counterstrike, Hunter's Mark, Grudge): one big effect (icon + number) and one short rule line
>    ("Unused block hits back", "+6 gold if it falls", "Equal to the damage you took last round").
> 4. **Tricks** (Lucky Verse, Frog Morph): Lucky Verse is a **d6 table**: three rows, each with real die faces (1-2,
>    3-4, 5-6) and its reward. Frog Morph shows **six die-face sockets (1 to 6)**; the two loaded numbers glow purple, the
>    rest are empty sockets, with "Roll a loaded number: frog" in one line.
>
> **Defence** cards (Counterstrike, Anvil Strike, Stonehide) share a cool steel-blue accent so a player learns "blue =
> protect" across families.
>
> **Ranks I, II, III:** one consistent strip for every card. The current rank is the big panel; ranks you can buy are
> covers showing the price (gold coin) and, in the same icons as the panel, what changes. The rank numeral sits in its own
> badge and never overlaps content.
>
> **Polish rules:** at most two type families (the game's heading font for names, its UI font for numbers); big numbers,
> few words; every tap target at least 44 px; no text overlapping anything at 390 x 844 or 375 x 667; colours from the
> existing tokens (--h-atk, --h-block, --h-heal, --h-pierce, --h-magic, --h-gold); respect prefers-reduced-motion; no
> occult symbols. A dice drop or a gem lighting may animate briefly.
>
> **How to check:** `npm test` must pass (571 tests today). Run `node dev/magic-shots.mjs shots/magic` before and after
> (it opens each class's three cards in a real battle at phone size; headless Chromium, not Safari) and put the before and
> after pictures on docs/team/tasks/T28-magic-cards.md. Do the **Knight's three cards first** and post them on the board
> for Dave's yes, then the other twelve. Stamp a new build with `node tools/stamp.mjs <build>` when browser files change.
> Never force-push; pull and merge main before every push. No AI model names in commits, code or docs.
