# Quest Dice card backs: approved direction (CONCEPT)

Dave approved these four backs on 23 Oct 2026 ("These cardbacks look great"). Art director: Grokbot.

All four use one shared frame: black tooled leather, ornate antique silver-and-gold filigree corners and a thin engraved border. Each deck gets its own centre so the decks stay apart, the way a board game keeps them separate.

| Back | File | Centre |
|---|---|---|
| Weapon | back-weapon.webp | Two steel swords crossed over the 3x3 dice map; orange pierce arrows in the corners; iron plate |
| Objective | back-objective.webp | The dice map as a parchment treasure map with a dotted route and a brass compass; brass plate |
| Secret Objective | back-secret-objective.webp | Darkest of the set: an envelope closed by a red wax seal bearing the heart die's starburst; dark-silver plate |
| Wager | back-wager.webp | A six-pip gold coin with a sunburst and coin stacks. **T13:** the two generic pip dice are replaced by the game's Heart die (see below); gold plate |

The contact sheet is `contact-sheet.webp`. The second tries are in `alternates/`.

**Game references** (passed to the painter):
- `assets/tutorial/board-icons.webp`: the dice map, the carved 3x3 board.
- `assets/tutorial/heart-6.png`: the heart die.
- `assets/dice/knight/mockup.png`: die symbols and colours.

**Final production:** the category word is painted into these concepts. The shipped backs will use the same art with a *blank* plate, and the word as live HTML text, so it can be translated and kept crisp.

## T13: the Heart die on the Wager back
Astra asked for the Heart die to show three visible faces, with coherent cube geometry and the game's real arrangement.
- **Faces** (js/gfx/dice/dice.js:45; assets/tutorial/heart-1..6.png): 1 heal (green cross), 2 pierce (orange arrow), 3 magic (purple triangle), 4 gold (yellow coin), 5 block (blue shield), 6 attack (red starburst, underlined 6). Each is a cream numeral on a black face with a gold rim.
- **Cube layout** (js/gfx/dice/poly.js:135): 1 +Y, 2 +Z, 3 +X, 4 −X, 5 −Z, 6 −Y, so the opposite pairs are 1/6, 2/5 and 3/4. Seen as in heart-6.png (6 toward us, 3 on the left), the third visible face is **5 on top**. Those three faces are pairwise adjacent.
- `heart-die.html` builds the die as a real CSS 3D cube over `heart-die-base.webp` (the approved back with the pip dice painted out). It is rendered once to `back-wager.webp`. The first version is kept as `alternates/back-wager-v1-pip-dice.webp`.
- The other three backs have no die, so they are unchanged. `contact-sheet.webp` was re-made with the new Wager back.

## T14: the Heart die, painted finish
The die keeps the same three faces and the same arrangement: 6 front, 3 left, 5 top. What changed:
- a bevelled gold edge made from a multi-stop metal gradient with a dark inner line
- lit from the upper left, matching the card art: the top face is brightest and the left face darkest
- a fine noise grain, a soft sheen and gradient-filled symbols
- a contact shadow under the die

The previous flat version is `alternates/back-wager-v2-flat-heart.webp`; the pip-dice original is `alternates/back-wager-v1-pip-dice.webp`. The contact sheet has been re-made.
