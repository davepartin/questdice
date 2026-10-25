# Objective and Secret Objective card backs (Grok mockup for Astra's review, 24 Oct)

Two backs only, per Dave: **Objective** (open, heroic: map, compass, banner, warm gold) and **Secret Objective** (mysterious: wax-sealed envelope with an eye-and-keyhole seal, candle, deep purple and crimson). Same family as the T17 weapon cards (ornate gilt frame, painted, physical card). The painted art is text-free (`back-*-art.webp`); the name is live Cinzel text on the nameplate (`backs.html`). 3:4, the same proportion as the live fronts (`css/cards.css .qc`).

Types go on the FRONT, never the back: the live fronts already carry a type chip at top left ("BONUS CHALLENGE", "SECRET OBJECTIVE"); a bribe/wager would show as a front chip such as "WAGER" on a Secret Objective front. The back stays the same for every type in its deck.

PNGs: `../png/objectives/` (`back-objective_375w.png`, `back-secret-objective_375w.png`, `backs-side-by-side.png`, `backs-with-fronts.png`; fronts cropped from T05's hosted screenshots, build 20261024cards2). Re-shoot: `node shoot-backs.mjs`.

The earlier approved backs in `../../backs/` (T12) are kept untouched; this is an alternative for Astra to compare, since the T05 follow-up brief said to reuse them.
