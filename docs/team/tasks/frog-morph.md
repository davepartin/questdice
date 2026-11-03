# Frog Morph — implemented 3 November 2026

Dave explicitly replaced Polymorph's previous charge/chance rule with six numbered dice spaces. The stable `polymorph` save ID remains; the player-facing name is **Frog Morph**.

## Rules

| Total magic spent loading | Loaded numbers | Success on one purple d6 |
| --- | --- | --- |
| 3 | 1–2 | 2/6 |
| 6 | 1–4 | 4/6 |
| 9 | 1–6 | 6/6, guaranteed |

Load once each round, two numbers for 3 magic. Use may follow Load in the same round; each action has its own once-per-round flag. Using costs no additional magic and clears every loaded number, on a hit or a miss. Next round loading starts at 1–2 again. Other charge cards retain their store-or-use rule.

A match prevents the selected enemy's attacks for this round. Armor, Guard and Ward still defend. Existing target locking and next-round expiry remain. Solo, party and authoritative table commands use the same engine rule; UI animation never rerolls the result.

## Card and interaction

The reviewed card frame and approved transformation artwork surround a paper-stock tray with six die recesses. Loaded purple die pieces arrive in pairs. Load and Use remain above the card, with an arrow showing that both can happen together. All counts use the same card dimensions.

Use opens a separate purple d6 reveal: a six-face CSS cube spins and lands on the engine's result, with hit/miss text, the rolled number and a Back to battle button. Reduced motion lands immediately. Returning to battle shows a frog piece on the enemy and replaces a damage intent with No attack. The normal enemy miniature and intent return next round.

Camp Powers uses the same tray and rules. The new frog glyph distinguishes this spell in the power selector. Existing monster mini cards, move-die callbacks and the potion tray's reserved result line are retained.

## Existing saves and upgrades

The loading cost and odds are fixed at every rank. The existing first upgrade (+4 pierce on a successful match) stays available, and already-owned ranks/bonuses remain intact while Dave's optional preference about that bonus remains unanswered. No new no-effect chance ranks are sold. Wizards that purchased the retired second/third upgrades receive 90/140 gold back exactly once, without reducing saved ranks or changing equipment/perks. Camp shows a brief refund notice for those heroes. Active table heroes receive the refund at rest, not during a battle. Local save migration, company members and player copies are covered.

## Validation

- `npm test`: **558/558 pass**.
- Exhaustive ranks × loaded pairs × d6 faces: exactly 2, 4 or 6 successful outcomes; exactly one RNG draw; exact payments; duplicate/empty/insufficient/full attempts do not overcharge. Checks also cover solo defense, party state, authoritative ownership/phase/duplicate commands, expiry, other charge cards and idempotent save/table refunds.
- `node dev/frog-morph-check.mjs`: 48 card layouts across 390×844, 430×932, 375×667 and 375×548; larger-text check; hit/miss reveal; normal-motion cube; camp refund; actual Load → Use → battle frog interaction. Headless Chromium, not Safari.
- Rendered phone screenshots inspected. Evidence: [folder](frog-morph-evidence/), including loaded tray, purple roll, camp and actual battle.

Build: `20261103zm1`. This explicit user rule supersedes the earlier T25 Polymorph probability/cost study. No claim that the previous study measures this new rule; future economy/balance studies must apply today's release and loading costs.
