# Bard magic card template

Build 20261031bd1. All six Bard powers use the approved shared shell. This completes the template rollout to all 34 magic cards across five heroes. Costs, dice, engine effects and saves are unchanged in this build.

| Card | Effect display | Existing art reused |
| --- | --- | --- |
| Mending Song | Large green healing d6s, Heal and Party tags, selected cost | Mending Song |
| Finale | Attack, heal and block, plus separate attack to every enemy; round 3+ and once-per-battle reminder | Rising Ballad |
| Lucky Verse | Three rows: 1–2 returns magic; 3–4 adds attack; 5–6 adds attack and returns one magic | Lucky Verse |
| Discord | Weaken icon and reduced enemy attack | Lucky Verse |
| Rising Ballad | Cumulative red attack / green healing tracks; Charge OR Use | Rising Ballad |
| Hymn of Gold | Cumulative gold track; Charge OR Use | Rising Ballad |

Shared title below painting, artwork icon/traits left and cost right, bottom-left Roman rank, parchment covers with printed right-side prices 50 / 90. Three alternatives share existing Bard paintings until dedicated artwork review. Finale uses a compact two-column trait group and multi-effect covers. Lucky Verse covers list all three upgraded payouts, including the high-roll magic return, using engine LUCK and scaleNum rather than the unused fx placeholder.

Mending steppers preserve mounted artwork/frame and preview remaining magic before Roll pays once. The Party tag preserves its team-healing meaning. Bard cards stay selected after casts; charge/use round locks remain exclusive and use grey disabled buttons without the removed explanation.

## Verification

36 bounded renderer fixtures cover all six cards at ranks I/II/III and 375x667 / 390x844, with loaded art, contained card/cover content, prices, no type tags and Charge OR Use. Real solo battle checks cover full-screen/no page scroll, green dice and Party tag, stable Mending artwork and cost preview/payment/healing, Lucky Verse three displayed ranges and actual payout/round lock, and Rising Ballad cumulative tracks/charge/release. Twenty-two existing five-hero engine tests pass, including Mending healing every party hero. Chromium only; no two-client or Safari verification and no balance simulation claim.

Reproduce: `HERO=bard CARDS=mending,finale,luckyverse,discord,ballad,goldhymn CHROME=/path/to/chrome node dev/knight-templates.mjs /tmp/bard-templates` and `CHROME=/path/to/chrome node dev/magic-bard.mjs /tmp/bard-battle`.

Focused renderer screenshots: [Mending Song](mending.webp), [Finale](finale.webp), [Lucky Verse](luckyverse.webp), [Discord](discord.webp), [Rising Ballad](ballad.webp), [Hymn of Gold](goldhymn.webp).
