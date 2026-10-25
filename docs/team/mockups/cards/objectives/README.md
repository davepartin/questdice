# Objective and Secret Objective card backs (Grok mockup for Astra's review, 24 Oct)

Two backs only, per Dave: **Objective** (open, heroic: map, compass, banner, warm gold) and **Secret Objective** (mysterious: wax-sealed envelope with an eye-and-keyhole seal, candle, deep purple and crimson). Same family as the T17 weapon cards (ornate gilt frame, painted, physical card). The painted art is text-free (`back-*-art.webp`); the name is live Cinzel text on the nameplate (`backs.html`). 3:4, the same proportion as the live fronts (`css/cards.css .qc`).

Types go on the FRONT, never the back: the live fronts already carry a type chip at top left ("BONUS CHALLENGE", "SECRET OBJECTIVE"); a bribe/wager would show as a front chip such as "WAGER" on a Secret Objective front. The back stays the same for every type in its deck.

PNGs: `../png/objectives/` (`back-objective_375w.png`, `back-secret-objective_375w.png`, `backs-side-by-side.png`, `backs-with-fronts.png`; fronts cropped from T05's hosted screenshots, build 20261024cards2). Re-shoot: `node shoot-backs.mjs`.

The earlier approved backs in `../../backs/` (T12) are kept untouched; this is an alternative for Astra to compare, since the T05 follow-up brief said to reuse them.

**Rejected by Dave Oct 24: too ornate; use the T12 backs in mockups/backs/.** (Files kept for history.)

## Fronts (24 Oct, Grok mockup for review): `fronts.html`
Same family as the T12 backs: black tooled leather, thin engraved border, small filigree corners (painted, text-free `front-*-frame.webp`). Objective = parchment with brass and dark ink, the back's compass as the vignette (`vig-compass.webp`, cropped from the T12 back). Secret Objective = dark leather with a crimson line and silver text, the back's wax seal as the vignette (`vig-seal.webp`). All text is live HTML from the game's data (`objectiveData` / `secretData` in js/g3/cards.js): type chip, title (Cinzel), goal (`rule`), and a terms block (stake / reward / if not; for a wager: done + won, team defeated with the all-bribes clause, decline honour) with the game's gold icon.
Examples: No potions, Hold the line, Heavy hitter (free try) as Objectives; Three Times Lucky (challenge), The Slacker (offered bribe = WAGER), Gold Rush (rival) as Secret Objectives. Chip words for secret kinds (SECRET GOAL, RIVALRY, CHALLENGE, WAGER, BRIBE) are a proposal. PNGs: `../png/objectives/fronts/`; re-shoot `node shoot-fronts.mjs`.

## Fronts rev 2 (24 Oct): whole emblems, wording PROPOSAL (Dave's direction, for Astra/Dave to settle)
- Emblems are whole painted objects with a soft fade, no circle mask: a brass compass (`emb-compass.webp`) and an open black envelope with a broken red seal and the letter showing (`emb-envelope.webp`). The emblem takes the free space, so short goals no longer leave a gap.
- Wording (mockup only, no data change): Objectives are optional. With a stake: chip WAGER, rows "Wager 20 gold" / "Payout 60 gold", and Accept / Pass (Pass = reject this objective). Without a stake: chip CHALLENGE and just "Payout". "Payout" replaces "Reward" everywhere. Secret Objectives keep their chips and also use Payout.
- Challenge examples are today's Bonus Goals shown as the free try (no stake; the game pays bonusG, 60 at Act 2). There is no separate "challenge Objective" in the data yet.
