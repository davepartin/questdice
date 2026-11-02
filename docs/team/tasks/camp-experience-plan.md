# CAMP-01 — Camp experience audit and implementation plan

Status: planning complete; implementation tasks READY and unclaimed. Requested 2 November 2026. No camp UI or rule changes are included in this audit.

## Economy extension

[CAMP-02](camp-economy-training-plan.md) records Dave's subsequent direction: remove new temporary Store buffs, introduce permanent health/starting-magic/capacity training and an all-upgrades overview, and validate prices before changing income. It supersedes this visual plan's Store assortment and no-new-mechanics scope only through the separate economy/rules work packages. Keep the existing integration/component file ownership. Heart 4 stays +2 unless the study demonstrates a need to change it.

## Product direction

Keep the strongest existing interaction: the character dice board opens the card belonging to the selected die. Make camp feel like the same physical game as battle: printed cards and thick cardboard pieces contain permanent information; selection, affordability, gold balance and actions are the clearly changing layer. The next purchase must be understandable before tapping it.

The first delivery is a dependable Hero/tab flow and a compact Talent workbench. Do not begin with a blanket reskin of every camp surface.

## Audit findings

Local browser audit of the current main build, using the released rules through the normal application startup. Synthetic local heroes only; no player saves were opened or changed. Screenshots at 390x844 and a shorter 375x667 view; five-class Hero checks. Chromium, not Safari. Audit fixtures, captured states and limitations are in [evidence](camp-experience-evidence/README.md).

| Finding | Evidence and implication |
| --- | --- |
| Dice-to-card is worth retaining | Main Dice tab presents the familiar nine-position board; inspecting a die opens the matching physical card. Preserve this map and return focus to the originating die. |
| Talent workflow is split and vertically expensive | `talentWorkshop()` renders a large two-die TALENTS card, then another face grid, then preview/palette/purchase controls. At 390px, the duplicate face grid starts around the bottom of the first viewport; symbol choices and purchase controls require more scrolling. |
| Growth exists, but is poorly signposted | The cardboard card already has tappable growth covers. Their visible content emphasizes a price and can obscure the destination size. The explicit d6 → d8 comparison and growth action are also inside closed `details.tw-grow`. This is a discoverability problem, not missing engine functionality. |
| The overview price is ambiguous | `campbuy.slotPrice()` returns the cheapest available face OR size purchase. A d6 talent tile can therefore show a face-setting price, not the die-growth price. Replace unlabeled “+ / price” ambiguity with named actions and destination sizes. |
| Camp powers diverge from battle cards | `campPowers()` renders its own library/detail/compare UI, with player-facing Level 0/1/2, rather than the reviewed card’s I/II/III. Its `magic()` formatter uses `card.cost`; Hero also prints base costs. A legal act-III, rank-III Polymorph shows 3 magic in camp while the engine cost is 2. Use rank-aware authoritative cost/effect presentation. |
| Hero summaries leak stale/internal copy | `heroTab()` prints `k.text`, including PROPOSED notes and old charge descriptions. These summaries should use the reviewed card presentation/data rather than raw development copy. |
| Gear duplicates some card/action information | The pack preview and external action row repeat sale information; “Full card” leads to another representation. Keep one clear card and one explicit action per operation. |
| Materials are inconsistent | Real frame/cover art sits beside dark rounded face buttons, generic preview panels, and flat Store supply art. The talent editor is the clearest place to establish a consistent component system. |
| Hero intermittency remains open | Healthy Knight/Ranger/Wizard/Dwarf/Bard Hero tabs and repeated Knight visits rendered without page errors. A scrolled Powers → Hero check also rendered Hero. This does not reproduce or resolve the reported intermittent failure. Investigate actual entry paths, restored saves, seat changes and Safari before declaring it fixed. |

## Target interaction and screen structure

Retain the five camp destinations: **Dice · Powers · Gear · Store · Hero**. Keep hero identity and gold visible. On selecting a workbench, compact the scenery and secondary quest/status decoration so the work takes priority; restore the normal camp composition when leaving the workbench. Keep navigation reachable without covering the purchase control.

### Talent dice — first visual delivery

On the Dice overview, show a real next-size label for each talent die: **d4 → d6**, **d6 → d8**, or **d8 → d10**, with the growth price or gate. Give face-setting its own label when quoting a face price. Inspecting a tile must not buy anything. Do not nest a growth button inside the existing tile button; use separate sibling controls or move the explicit purchase into the opened workbench.

The opened workbench is one compact card-like surface, not a full reference card followed by a second editor:

```text
HERO / GOLD                         Close
Talent one [selected]   Talent two [chip]

    d6  →  d8       +2 empty faces
    [ Grow to d8                  price ]

Faces: [1 blank] [2 × hand] [3 blank]
       [4 Magic] [5 empty] [6 empty]

Choose symbol: Attack Block Magic Heal Gold
Selected face → result                 cost
[ Set face / Buy symbol                     ]
```

- Growth is always visible and unfolded, including when locked or unaffordable. Show the exact next size, cost and concise gate/shortage. At maximum size show “d10 · largest size”; do not offer an invalid next size.
- Both talent dice remain discoverable with small current-size/status selectors. Show the full working faces for the selected die. Do not force two full-size cards onto a phone.
- Fixed faces 1/2/3 and editable faces have visibly different treatment. Use consistent empty sockets and removable symbol-shaped cardboard chits with a subtle cut edge. Face numbers and chosen symbol stay legible.
- Show all five symbol choices together. When no face is selected they can be visible but inactive, with one short “Choose a face” prompt. Filled-face inspection stays distinct from choosing a new symbol.
- Preview is read-only. Only the explicit Grow / Set face / Clear action mutates state through the existing authoritative handlers. Keep the existing no-refund clearing rule visible at the action, without inventing a new economy or mandatory confirmation flow.
- Growth retains existing symbols and reveals the newly added empty faces. Use a brief restrained highlight; respect reduced motion. Do not auto-buy symbols or lose the hero/die selection after a purchase.
- Use the existing talent limits and engine costs. In the current game, d4/d6/d8/d10 have 1/3/5/7 editable faces, in addition to the three fixed faces. Do not hardcode prices or gates in art.
- At 390x844 and 375x667, aim to show growth, all current faces and the complete symbol palette together at default text size after compacting the workbench chrome. At shorter Safari heights, d10 or larger text, allow one deliberate vertical scroll rather than shrinking controls or adding another disclosure. No nested scrolling or hidden growth accordion.

### Powers

Use a camp adapter for the reviewed power-card presentation: same art, frame, role colors, rank and printed upgrade covers. The camp layer supplies **Learn & equip / Equip / Upgrade**; battle retains **Cast / Roll / Charge / Use**. Do not embed the entire battle sheet or its transient state in camp.

- Current and next rank are immediately visible, I/II/III mapped to existing internal ranks 0/1/2.
- Use `powerCost`, `powerUpgradeInfo`, `powerDice`, `chargeGain`, `roundGain` and related existing helpers. No independent cost formatter or stale effect strings.
- For powers with battle-dependent amounts, show the rule/formula in camp: Grudge depends on last round’s damage; Meteor grows by round; charge tracks show potential payouts without inventing a stored charge or current battle round.
- Show equipped / learned / locked / unaffordable states consistently, the actual replacement slot, and what an upgrade changes. Maintain shared selection/material treatment with talent dice.

### Gear and Store

Use the actual weapon cards/chits and the same inspect → choose → explicit action pattern. Keep wear, hand-size limits, two-handed occupancy and diamond handling correct. Show one sale action and one clear equip destination per choice; remove repeated action labels within the same card/list item. Preserve the existing transaction semantics.

Bring supply cards into the same material family: existing potion bottle art, paper stock and die/chit imagery, with authoritative live healing amounts and capacity. Do not bake “+10” into a camp asset when that hero’s potion heals another amount. Keep shop comparisons (belt capacity, dice per reroll) distinct from prices. Do not restore retired forge/train or Heart-level purchases simply because an old template has covers for them.

### Hero

Hero is the reliable identity/progression page: portrait, class, level/XP, meaningful current stats, perks and record, with links to the same cards. Put difficulty/hints/export beneath the main summary. Avoid another independent power/healing rule catalog; use the shared current values and omit internal notes.

Treat the reported intermittent tab problem as a P0 reliability investigation. Capture the triggering path and console/state evidence before choosing a fix. Ensure every click either renders the selected page or gives a clear recoverable failure state, never a silently selected tab with stale/blank content. Preserve legitimate restored saves; handle absent optional display data without concealing a failed purchase.

## Work packages and ownership

Tasks below are READY, not assignments or permission to overwrite active reservations. Claim the exact package on BOARD before editing. Two contributors can work in parallel after agreeing the component callback contract.

| Package | Owner role / exclusive files | Deliverable and dependency |
| --- | --- | --- |
| C01-A — Reliability and camp integration | Camp integrator: `js/g3/scrui.js`, `js/ui.js` if needed, camp state/navigation sections of `css/camp.css` / `css/screens.css`, `js/campbuy.js` display labeling if needed | First investigate Hero; define tab/inspector state, scroll/focus, hero/seat identity. Own **all** edits to the monolithic scrui file, including talent and power wiring. |
| C01-B — Physical components | Component owner: `js/g3/cardboard.js`, new isolated camp component module/stylesheet and assets; `js/g3/magiccard.js` only for an agreed reusable presentation API | Compact talent card, clear growth rail, sockets/chits, shared camp/battle power-card adapter. No direct purchases or engine mutation in the presentation component. Coordinate exported API with A before coding. |
| C01-C — Talent first delivery | A integrates B; same file ownership above | Wire direct size purchase, face selection/palette/preview and authoritative handlers. Ship the full talent flow as one reviewable slice before broad restyling. |
| C01-D — Power and inventory integration | Same A/B split, after C | Shared power ranks/costs first, then Gear/Store consistency. Do not split each tab among people editing scrui concurrently. |
| C01-E — Hero polish and final audit | A integrates B; independent reviewer owns new `dev/camp-experience-check.mjs` and evidence | Hero summary, player-facing copy and current values; cross-tab keyboard/touch, persistence and online ownership checks. |

Only the integrator edits import wiring and browser stamps during integration. The component owner adds isolated assets/modules without stamping main independently. Keep B’s stylesheet scoped under camp/component classes; do not apply a new global `.mc-*` override to battle. One final merged-source check and atomic publication per completed slice. No model names in commit messages, source comments or task documentation.

## Delivery order and acceptance gates

1. **Baseline + reliability:** reproduction harness and Hero/tab entry matrix, shared callback contract, agreed compact layout. Distinguish reproduced defects from reported issues. Healthy existing navigation must keep working.
2. **Talent workbench:** first-screen growth rail and face/symbol choices, cardboard materials, all buy/preview/clear/gate states. Review on a real phone before widening the visual rollout.
3. **Powers:** reuse the reviewed presentation, fix current costs/ranks and battle-dependent formulas. Verify all five classes and all ranks against the engine; no “Level 0” or internal PROPOSED notes in player views.
4. **Gear/Store/Hero:** one action hierarchy and material system, no repeated rule catalogs. Recheck returning to Dice and the road.
5. **Integrated verification + publish:** claim/result notes on the team board, full `npm test`, focused browser checks, phone screenshots and cache stamp. Record implemented versus live-verified status separately.

Required checks: 390x844, 430x932, 375x667 and a short Safari-like viewport; larger text and reduced motion; keyboard focus/44px targets; all five camp tabs from every other tab and from a die inspector; repeated Hero visits; all five classes; fresh and restored valid saves; act I/II/III talent gates; locked second die; d4/d6/d8/d10; affordable/poor/max/filled/empty/limit-reached states; both talent dice; same-symbol limits; no gold spent by previews; exact single payment; growth retains every existing symbol; save/reload; double-tap protection; local party seat changes and actual two-client camp ownership/phase checks. A previous solo check is not evidence of online correctness.

Visual acceptance: a player can name the selected die/card, current size/rank, next upgrade, exact price and result without opening a second disclosure. A newly revealed face is visibly empty. The same symbol/value means the same thing in camp and battle. Purchases update the piece and gold together without moving the target control unpredictably. Locked states remain visible with a reason. Decorative scenery and frame thickness never crowd the working choices.

## Handoff instruction

Read CAMP-01 and the latest BOARD entries; claim C01-A or C01-B before editing. Agree the compact talent component and callback API first. Start with Hero reliability and the talent workbench. Keep rules/saves/prices intact, route mutations through the existing authoritative wrappers, and attach phone evidence before marking a slice complete. Unclaimed packages are not concurrent file reservations.
