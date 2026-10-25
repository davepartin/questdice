# Magic screens as cards — mockup (Crockpot / Grok Bot, 25 Oct 2026)

Mockup only. The live game is unchanged; no gameplay numbers changed (Wizard data copied from js/data.js).

- `shoot-before.mjs` — screenshots of the LIVE screens (battle Magic Powers sheet, Camp > Powers) at 390x844.
- `magic.html?v=battle|card|battle-low|camp|camp-card` + `magic.css` / `magic.js` — the redesign.
- `shoot-after.mjs` — renders the redesign.

## Why the live magic screen is unintuitive
1. **It doesn't look like a choice.** The three powers sit on the corners of a glowing triangle, so it reads like a skill tree
   or a decoration, not "pick one of these three". The A/B/C letters are tiny and their meaning (Big move / Every round / Charge)
   only shows after you tap.
2. **Too many magic numbers at once.** The top says "12 / 19 magic", the dice tray underneath still shows "MAGIC 4", the
   chip on Arc Bolt says 2, the text says "2 magic: 1d8 ... +1 die per 2 more", the rule says "recharge 3 magic", the stepper says 2
   and the button says "Cast · 2 magic". Players can't tell which number is "what I have" and which is "what it costs".
3. **No ready / not-ready state on the choices.** Every node looks the same whether you can afford it or not; the only
   disabled signal is a greyed button inside the detail panel, with no reason given.
4. **What happens on tap isn't clear.** Tapping a node opens a panel lower down; a "Tap a power" placeholder box sits there
   first. A `−  2  +` stepper decides the dice, but it doesn't say "3d8" or what's left after.
5. **Helpers look like powers.** Potion / Heal / Heart change use the same round badges and purple cost chips, so they look like
   a second tier of class powers.
6. **Two action bars.** The battle buttons (Lock in / Magic Powers / Free reroll) stay live under the sheet.
7. **Camp:** A/B/C slot tiles look like tabs; "choose a slot, then inspect a power" is two steps, and gold (learn) and magic
   (cast) costs sit side by side with the detail panel below the fold.

## Redesign (same cardboard / physical-card language as the dice board)
- One **magic pool** at the top: big number + a row of triangle tokens ("Magic to spend").
- Powers are **three small cards in your hand**, labelled A / B / C with their kind, cost shown as **purple triangles** in the
  corner, a one-line effect and a status strip: **Ready · tap**, **Need N more ▲**, **Used this battle**.
- Tap = the card **lifts and enlarges** (like the dice cards). Inside: full text, a **"How much magic?" row** (1d8 ▲2 … 5d8 ▲10;
  steps you can't afford are greyed), a preview line ("Rolls 3d8 attack now · you keep 6 ▲") and one big **Cast Arc Bolt · ▲6** button.
- Disabled = greyed button **plus a reason** ("Needs at least ▲▲ — you have 1. Lock in your roll to add your magic dice").
- Helpers become **round pill tokens** under "Quick help — not class powers".
- Camp becomes a **Spellbook**: "In your hand" (3 cards that go to battle) and "Other cards you can learn" (Learn · 50 gold,
  or Level 5 lock); tapping one enlarges it with "Learn & put in hand · 50 gold" and says what it replaces.
