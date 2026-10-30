# Heart candidate, current main integration, 26 October 2026

Implemented directly while the other contributors are token-limited. Based on 476313f, preserving the shared price chip, empty/10-gold talent face 4 and all mp2 inline Magic results.

## Candidate behavior

Rank 2 requires Act II and 200 gold. Rank 3 requires Act III, owned rank 2 and another 300 gold. This follows Dave's latest 26 October price direction; it supersedes the earlier 150/300 candidate. Boosts remain +2/+4, +3/+6, +4/+8 per matching white die / matching weapon lane. The die stays d6.

Purchases use one rule for local UI and authoritative camp commands. Explicit target rank rejects duplicate/stale requests instead of accidentally buying the next rank. Wrong act, skipped rank, insufficient/nonfinite gold, noninteger target and max rank refuse without charging. Each seated hero buys only their own rank. Camp card covers, current rank and grid price/readiness use real rule data and the existing save/netOp flow. Unaffordable prices use the current red price chip.

Missing/invalid saved ranks default to 1; integers 1/2/3 persist. Existing gear and talent choices remain intact, including the recent talent migration. Tests cover local save/reopen, Soul Code export/import and table serialization. Solo resolve and mixed-rank party resolve use the owning hero's rank. Hush, Heart turning cost/limit, magic cap, heal cost/output and Heart-to-Heart are unchanged.

## Isolation and testing

The switch is off at the root and every other preview. Only `/preview/heart-upgrades/` enables it. That entry point shares root assets/code via a base tag, keeps its own `questdice.preview-heart-upgrades.*` saves and disables cloud/tables through existing sandbox rules. It is not an immutable copy. No live Heart activation is included.

- 12/12 focused Heart and namespace tests pass.
- Full suite: **449/449 pass**, including the separate server fallback fix below.
- Syntax and whitespace checks pass.
- `RELEASE=1 node tools/t23-heart-check.mjs 2`: **864 current-code fights**, 0 timeouts at 80 rounds, longest 28. Rank 1/2/3 wins 214/220/210 out of 288 each; mean rounds 10.53/10.16/9.90. These are pooled descriptive counts across deliberately different classes/stages/policies/party sizes, not human win-rate estimates.
- Raw evidence in `current-results.json`: Knight/Ranger/Wizard; early/mid/late; solo and 2/4/6 equal cloned heroes; ordinary/magic/heal/gold heuristics; two matched seeds per cell. Ranks are granted for effect comparison, not purchased from campaign budgets. Above-gate ranks are explicitly counterfactual. Different decisions consume randomness differently. No independent-campaign interval or absence-of-exploit claim.
- Rows record magic earned/spent/overflow, turning/healing spending, magic-funded healing, round healing/overheal, damage/absorption, raw dice gold, rounds, boss-only rounds, outcomes/falls. Round healing includes power/modifier healing; raw dice gold precedes final reward multipliers.

Phone-render script `dev/t23-heart-card.mjs` covers 390x844, 375x548 and 430x932, acts/purchases/reload and a live-save sentinel. **Rendering is unverified**: this runtime lacks Chromium, and its installation download returned a truncated/invalid archive. No Safari, real-phone or Firebase claim. The candidate remains a draft for that reason. Rendering, longer independent campaign/economy samples, mixed parties and deliberate sustained-healing strategies still need review before live activation. The implementation owner retains those checks; no Grok/Claude action is requested.

## Separate server fix completed

Both pre-existing server HTTP tests failed because `os.networkInterfaces()` throws `ERR_SYSTEM_ERROR` in this restricted runtime. The optional LAN-link calculation turned successful room creation into HTTP 400. `server.mjs` now falls back to an empty links array when enumeration is unavailable. Its original two tests pass; a third test explicitly makes enumeration throw and verifies the room still opens without exposing a seat token. No browser rules or build stamp change is needed for this server-only fix.
