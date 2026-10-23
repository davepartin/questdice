# Implementation handoff: teamwork, simpler progression, arrows and classes
Date: October 22, 2026
Owner: Claude implements; ChatGPT reviews design and evidence; Dave directs and approves release.

## Purpose
Make Quest Dice feel like friends solving a shared battle: quick target calls, small partnerships, a hero choosing to take the heavier hit, and informed preparation at camp. Preserve a fast phone experience and the existing dice art.

This plan records Dave's approved design decisions and separately identifies experimental recommendations. It authorizes implementation work in isolated development checkpoints. It does not authorize switching unfinished experiments on in production. Dave requested a plan and a prompt for Claude, not simultaneous code editing by ChatGPT.

## Read first
Read this handoff and the actual current implementation. Fetch current main and reconcile this documentation with your existing work branch without overwriting work.
Read your saved reports on that work branch:
- docs/balance/PRESSURE_ONE_AT_A_TIME_2026-10-22.md
- docs/balance/ARROWS_2026-10-22.md
- docs/ideas/CLASS_IDENTITY_2026-10-22.md
Also read:
- docs/ideas/WEAPONS_REDESIGN_2026-10-22.md
- docs/ideas/CAMPAIGNS_AND_SECRET_OBJECTIVES_2026-10-22.md
- docs/SECRET_OBJECTIVES.md
- Relevant current rules in docs/DESIGN.md, docs/POWERS.md and multiplayer documentation.

The three work-branch reports above were identified by Claude in Dave's pasted message. ChatGPT has not independently reviewed those report files or the two Bard options. Do not interpret this handoff as verification of their contents. If a report is missing, locate your actual checkpoint and record its branch/commit.

## Approved decisions
### 1. Heart to Heart replaces Heartbeat
Remove the old all-hearts-match bonus magic rule, named Heartbeat. Keep the personal Heart Boost effect.

New rule:
Two or more active heroes showing the same heart number and targeting the same monster each gain +10 normal attack once per round.

- Two matching heroes add 20 total; six add 60.
- Award once per qualifying hero, never once per matching pair.
- Multiple groups can qualify against separate monsters. Distinguish monsters by identity, even if two have the same species.
- Matching hearts against different targets do not qualify.
- Different matching heart groups on the same monster may each qualify.
- Heart Change can intentionally create the match. This is part of the strategy.
- Bonus is a fixed 10 per qualifying hero, not automatically the act-scaled triple amount.
- Solo does not qualify.
- Keep existing personal Heart Boost, including its color effects. Do not change it based on the earlier voice assistant's mistaken weapon-face explanation.
- Use the existing attack/Guard pipeline. Do not introduce Pierce or a new shared damage pool.
- Clarify in code/docs the eligibility of downed heroes and the exact resolution snapshot. Recommended: determine groups once from eligible heroes' final locked boards and targets before resolving attacks. No mid-resolution repeat awards.
- Remove obsolete magic rewards and update explanations, recap, simulations and tests.
- The term Heartbeat here refers to the old team rule, not the visual heartbeat animation for personal Heart Boost. Preserve the slowed personal animation.

### 2. Shared heart face and Ready state
Display the actual heart die face, including its existing color, symbol and number, beside or underneath each teammate's miniature. Dave prefers reusing the real face over inventing another icon.

- During shaping, synchronize the latest settled heart face and chosen target.
- When a player locks in, show the word "Ready". Before lock-in, make clear the heart can still change.
- Target selection already feels responsive across phones. Reuse the existing network approach after inspecting it.
- Share only the intended public preview fields; do not expose the whole private board, secret objective, or unrelated locked-roll details.
- Public previews must not become authoritative combat input. Final locked submissions remain authoritative.
- Clear/reset Ready and stale heart previews at the next round; account for late updates, reconnects and departed/downed players.
- Recommended presentation: retain faces during resolution so the Heart to Heart explanation is visible, then refresh for the next round.
- Ensure six-player layout remains readable on a phone. Reuse small existing assets or drawing code; avoid six new animated 3D scenes.
- Show clear bonus feedback without requiring everyone to open a detailed panel.

### 3. Suspend charms
Dave superseded the proposed Ember Locket adjustment by choosing to remove charms for now.

- No active charm effects, including already-owned charms.
- No charm loot, shop offers, choices, rewards, or acquisition prompts.
- Audit indirect effects: starting resources, caps, combat, rerolls, pricing, drops, simulations and derived values.
- Preserve saved ownership data for possible future restoration. Do not corrupt saves or silently convert old charms into new mechanics.
- Hide inactive charm management from the normal flow; explain inactivity where needed for old saves.
- Remove or replace dangling charm-only choices in encounters and rewards using existing valid alternatives.
- Keep perks and other progression systems.

### 4. Keep eight perks and clarify them
Verify the current active perk pool against the eight discussed in the review. Preserve current mechanics and limits for this pass.

- Show exact effects, including "per red weapon" and "per blue weapon" where applicable.
- Distinguish starting magic from magic capacity.
- Show accurate hero-specific before/after values, such as starting magic 6 to 7 or capacity 15 to 17. These are examples, not values to hard-code.
- For conditional bonuses, explain the condition rather than implying an unconditional total.
- Keep gold-perk numbers and existing pick cap unchanged for now. Measure campaign growth before proposing a numeric change.
- Derive previews from the same rules used by gameplay.

## Experimental recommendations, not settled release rules
### Arrows and Fire
Claude's pasted final table measured health lost per fight under fury starting round 4:
| Ammo | Big monster | Three goblins | Armored monster | Healer |
| --- | ---: | ---: | ---: | ---: |
| Normal | 11.6 | 47.3 | 22.6 | 11.5 |
| Piercing | 9.8 | 47.9 | 20.4 | 11.7 |
| Fire | 9.4 | 48.4 | 21.6 | 11.8 |
| Frost | 7.7 | 47.7 | 17.0 | 9.3 |

These are reported results, not independently reproduced here. Normal's 0.4-health advantage over Frost against goblins does not establish a reliable winner without variation estimates. Frost leads three matchups by this metric; assess wins, rounds and resource spending too.

Recommended next Fire experiment: full printed arrow-hand Strength as splash to other enemies, with Guard still applying, instead of half Strength. Preserve Fire's crowd role and Piercing's armor role.
- Keep the main-hit formula from the documented experimental system consistent while changing one splash variable.
- Explicitly specify whether Heart Boost and talent multipliers affect the Strength used. Our earlier proposal used printed rolled Strength.
- Test three enemies and larger groups, multiple archers, repeated summons and high Guard.
- Do not silently make Fire ignore Guard.

Reconcile rule drift before finalizing:
- Earlier proposal: symbol-only specials replacing the lane's attack; Frost halves the next damaging attack.
- Claude's later report: small arrowhead numbers retained; Piercing converts the whole hit; Frost reduces the next blow by hand Strength.
Document the exact current formulas, timings, nonstacking rules and rationale. These later variants are not automatically settled merely because the experiment implements them. Identify the decision needed for the final phone-play version.

### Classes and Bard
Desired identities:
| Class | Decision emphasis |
| --- | --- |
| Knight | Protection and flexible attack |
| Ranger | Arrow outcomes, precision and target selection |
| Wizard | Magic expenditure, burst and control |
| Dwarf | Endurance and timing a counterattack |
| Bard | Choosing which teammate to help and when |

Claude recommends retaining Knight Guard, Dwarf Dig In and current Wizard rules, with Ranger identity from arrows. Read the actual class report before applying that recommendation.

For Bard, ChatGPT favors a targeted support option that creates a choice of teammate and also works solo through self-targeting. Read Claude's two proposed options, compare their exact effects and numbers, and recommend one before treating it as approved. Do not add an unrelated third system just because this handoff mentions support.
Measure effective healing, prevention and extra damage enabled. A Bard should be useful without being compulsory, and duplicate Bards should not produce uncontrolled scaling.
Continue approved independent work while this choice is pending.

### Monsters
Fury from round 4 is Claude's experimental foundation. Swarm reinforcement belongs in named encounters according to the pasted report; healing and the move bag need play evaluation.
Keep the exact status of each switch explicit. This handoff does not authorize universal new monster behavior or establish a final fury number.
Include summoners in evaluations. Offensive value includes preventing future summons and attacks, not just damage per roll.

## Teamwork and balance evaluation
Use identical starting parties/resources and comparable seeded encounters. Avoid changing loadouts, classes and monster rules simultaneously when attributing a result.

Compare:
1. Coordinated focus on one target.
2. Deliberate split attacks.
3. Adaptive decisions based on the current board and enemy threats.

Include mixed encounters: summoner, heavy windup attacker and injured weaker enemy. Also test solo/boss pacing and several small enemies.
Include Heart to Heart in these comparisons, because it changes the incentive to focus.
Keep existing offense/defense structure: heroes target monsters; monster attacks are distributed across the party under existing rules, with the slowest taking the heavier share. Do not introduce engagement-only retaliation.
Test the defensive choice of keeping/rerolling low feet to take the heavier share with useful block. Verify actual timing and tie rules rather than assuming low speed delays the hero's action.

Report:
- Wins, defeats, unfinished fights and time/round limits.
- Health lost, rounds, effective damage, effective block/healing and resources spent.
- Summons allowed and dangerous attacks prevented.
- Heart to Heart participation and how often coordination improves the outcome.
- Class and party-size breakdowns, including duplicate classes.
- Sample counts and uncertainty or variability, not just one-decimal means.
- Representative rounds showing a decision that helped and a tempting decision that hurt.
Bots must understand the options being tested. Label limits of simulated decision-making. These tests do not establish whether human table talk is fun; phone playtests are also needed.

Magic evaluation after the baseline is consistent:
- Favorite-power-only versus situational power selection.
- Immediate spending versus selective saving.
- Different targets for the same power.
- Use current power costs/upgrades and the same initial resources.
- Avoid attributing arrow damage or reroll-enabled weapon damage to spells without an explicit source rule.

## Later campaign and secret-objective work
Preserve the separate plan in CAMPAIGNS_AND_SECRET_OBJECTIVES_2026-10-22.md:
- Hidden pairs, groups and occasional whole-table contests.
- Gold, magic damage, triples, straights and selected least-stat goals.
- Possession, resisting by rolling badly, rewards and rescue variants.
These are later work. Do not bundle possession or a full secret-objective expansion into this implementation pass.

## Delivery sequence
1. Save current experimental work and report the branch/commit and switch state.
2. Implement Heart to Heart with shared heart/Ready visuals as one coherent checkpoint.
3. Suspend charms and verify old-save behavior.
4. Clarify perk offers and before/after previews.
5. Run the Fire comparison; review the actual Bard alternatives and reconcile arrow formulas.
6. Evaluate mixed encounters, classes, arrows and magic against the resulting consistent baseline.
7. Provide a phone-playable preview using separate saves, with a short list of what is enabled.
8. Present results and remaining decisions to Dave before merging/deploying gameplay changes.

Each checkpoint should be recoverable if the session runs out: update this plan with completed work, tests, branch/commit, outstanding decisions and next step. Keep screenshots for visible changes. Do not claim a feature is live until deployment is verified.

## Essential checks
- Heart groups: two, three and six heroes; multiple groups; mismatched targets; identical monster species; solo; downed hero; no old matching-heart magic.
- Correct Guard application and no pairwise multiplication or duplicate awards.
- Two-phone synchronization, Ready transitions, next-round resets and reconnects; secrets remain private.
- Old saves with charms load and have no active charm effects or dangling acquisition screens.
- Perk descriptions and previews match actual results, including caps.
- Existing required tests plus targeted tests for changed behavior.
- Human phone review for readability, pacing and the intended quick teamwork.

## Progress log (Claude)

### Checkpoint 0: starting state (23 Oct 2026)
- Work branch `claude/wizardly-newton-c0xpcq`, at `1112dfd` after merging main `630bd8c` (this handoff). Reports on the branch:
  docs/balance/PRESSURE_ONE_AT_A_TIME_2026-10-22.md, docs/balance/ARROWS_2026-10-22.md, docs/ideas/CLASS_IDENTITY_2026-10-22.md
  (all present; raw tables beside them in docs/balance/).
- Switch state (all off in the live game): `EXPERIMENT.weapons2` (six weapons, Bow + Arrows), `PRESSURE` (fury, rally, mend, bag),
  `CLASS2` (Bard songs carry, Knight Guard, Dwarf Dig In), arrow test switches in WEAPONS2 (`numbered` faces, `arrowRules`).
  The lab (`?lab`, js/lab.js) turns on weapons2 with its own saves; nothing else is on in the lab yet.

### Checkpoint 1: Heart to Heart and shared heart faces (done)
- Rule: `TEAMWORK.heartToHeart` and `HEART_TO_HEART = 10` in js/data.js; engine `heartToHeart()` in js/engine.js (replaces the
  Heartbeat branch of `teamBonuses` when on). Exact rules in docs/TEAMPLAY.md (resolution snapshot, downed and hushed heroes).
- Display: battle3d `paintHearts()` + flat `setHearts()`: real heart face (the same picture the heart-change buttons use),
  Ready / Not ready, +10 and a glow on matches, aim dots on monsters; kept through the replay from `rep.heartFaces`.
- Online: `aim` command (preview only) and roster `heart` / `aim` in the player view; reset each round (`f.aim` in beginPartyRound).
  Note for review: in the Firestore room the whole table already travels to every phone (that is how rooms work today); the
  screens show only the public fields, and the server view (`playerView`) sends only those.
- Banner "HEART TO HEART +10 EACH", log line, How teams work text.
- Tests: test/teamwork.test.mjs (2, 3, 6 heroes; two groups; same species; mismatched targets; two numbers on one monster;
  downed; lone survivor; guard; no Heartbeat magic; online preview, privacy and reset). 354 pass.
- Screens: `node dev/hearts.mjs shots 3|6` (three and six heroes on one phone).
- Open for Dave's phone review: six heroes on one monster are crowded (a pre-existing layout limit; one hero sits at the edge).

### Checkpoint 2: charms suspended (done)
- `TEAMWORK.noCharms` (js/data.js). Engine gate in one place each: `hasCharm` (every charm effect: dice, triples, heart, Ember,
  Mirror, Twin Coin, Blood Pact health and magic, Lantern reroll, Phoenix), `takeCharm` (nothing can be gained, daily run
  included), `charmChoices` and `charmOffer` (no loot, no boss choice, solo or table), `shopCharm` (no Camp Store charm).
  `charmsOf` still lists what a hero owns; the save is never rewritten.
- Screens: camp Gear shows an old hero's charms faded under "Charms · resting" with one line of explanation and no buttons; a
  new hero sees no charm panel; the victory and table spoils have no charm panel (their offers are empty); the Camp Store has
  no charm; the daily run names no charm. Story flavour that mentions charms (two campaign packs) is unchanged.
- Indirect effects checked: starting magic and health (Blood Pact), rerolls (Lantern), triples (Wolf Fang, Twin Coin), heart
  (Heartstone), knock-outs (Phoenix), pricing (charm price used only by the store), hero strength for party scaling (reads
  evaluate, so no charm counts), the tools (`NOCHARM=1` or `TEAMWORK=1`).
- Test: test/teamwork.test.mjs "charms resting" (old save keeps charms; no effect; no Lantern reroll; no boss, shop, or take;
  switching back on restores them). Screen: `node dev/charmsrest.mjs`.

### Checkpoint 3: perks clarified (done)
- The active pool is the eight from the review: Vitality (+6 most health, max 5), Arcane Reserve (+1 magic at the start of a
  fight, max 3), Deep Well (+2 most magic you can hold, max 3), Keen Edge (+1 attack per weapon die on a red face, max 3),
  Ironward (+1 block per weapon die on a blue face, max 3), Piercing Pips (+1 pierce per white body die that pays pierce, max 3),
  Gold Sense (+25% gold from dice and the fallen, max 3), Line Breaker (+2 to every triple, max 5). Retired: Quick Hands, Stout
  Heart, Frugal Mender (kept by heroes who took them). Numbers and caps unchanged.
- `E.perkPreview(hero, id)` works out the line and the before/after on a copy of the hero with the perk added, using the game's
  own functions (maxHpOf, startMagicOf capped by magicCapOf, magicCapOf, heroMods, tripleBonus). Conditional perks show the
  amount per die and say when it applies. Arcane Reserve on a hero who already starts full says it does nothing yet.
- `TEAMWORK.perkPreview` switches the perk card (victory and camp Hero tab, solo and table) to the new layout.
- Test: test/teamwork.test.mjs "perk previews" (every perk for two classes: the after value equals the hero after taking it;
  Keen Edge adds exactly 1 on a red face; Line Breaker equals the triple paid). Screens: `node dev/perkpreview.mjs`.

### Checkpoint 4: Fire test, Bard recommendation, arrow formulas (done)
- Fire: full printed Strength splash (guard still applies; `arrowRules.fire: 'full'`, `FIRE_FULL=1`) against half, with 3 and 4
  goblins, a summoner (Bone Warden), high guard (armoured warden), the ogre, and teams of 2 and 3 archers. Result: full is never
  worse and makes Fire the best arrow against crowds, but only by 0.2-1.6 health a fight, inside the error; Frost stays clearly
  best against big hitters, armour and the summoner; several archers do not snowball. Recommendation: full, guard applies.
  Details: docs/balance/ARROWS_2026-10-22.md ("Fire: half or full").
- Arrow formulas reconciled (earlier agreed proposal against the later tested variant, exact Strength source, timing, non-stacking,
  four decisions for Dave): docs/balance/ARROWS_2026-10-22.md ("Reconciling the arrow formulas").
- Bard: option (a) "Verse for a friend" recommended over (b) with exact numbers and the comparison: docs/ideas/CLASS_IDENTITY_2026-10-22.md
  section 7. Built behind `CLASS2.verse`: engine (`castPower(..., { to })`, `rep.verses`), table command, magic-sheet choice
  ("For me / For <friend>"), team bot, test. Screen: `node dev/verse.mjs`.
- Tools: `ENCSET=fire|mixed` encounter sets and ± standard errors in tools/matchup.mjs; `PAIRS=` companies in tools/party.mjs;
  new tools/teamwork.mjs (focus / split / adaptive, with and without Heart to Heart).
- Fixed on the way: a stray comment in js/main.js stopped the lab page loading (branch only, never on main); new
  test/syntax.test.mjs parses every game script so that cannot recur. 358 tests pass.

### Checkpoint 6: phone preview (done; deployed and verified)
Open **https://davepartin.github.io/questdice/?lab** on a phone (stamp `20261023lab2`, main `fa040eb`). A yellow "LAB · preview" tag
shows on every screen. Lab heroes are saved apart (`questdice.lab.hero.*`), never reach the cloud or online tables, and the live
game without `?lab` is unchanged (checked: `node dev/livecheck.mjs`).

Enabled in the lab:
| | Status |
|---|---|
| Heart to Heart (replaces Heartbeat), heart faces + Ready + aim dots | approved, preview |
| Charms resting | approved, preview |
| Perk cards with exact effect and before/after | approved, preview |
| Six one-handed weapons, Bow + Arrows with ammunition at camp, Scouts line on quest cards | experiment |
| Arrow rules as last measured: numbered arrowheads, Piercing = whole hit, Frost = Strength softer, Fire = full Strength splash | experiment, needs Dave's decisions |
| Monster fury from round 4 (a notice when it rises); no rallying swarms, no mend, no move bag | experiment |
| Knight Guard, Dwarf Dig In, Bard Verse for a friend | experiment |

Not in the lab: rallying swarms, monster mend, the move bag (no screen yet for "what is left in the bag"), possession and the
secret-objective expansion (later pass).

Note for online play in the lab: the lab refuses cloud and online tables, so the online heart preview can only be tried on the
shared-phone table in the lab. It is covered by test/teamwork.test.mjs; a two-phone check needs the online table, which means
switching it on in the live game (Dave's decision).

**Next step:** Checkpoint 5 (running): the teamwork evaluation, the Bard team measurement, the class kits and magic styles on
the consistent baseline (today's weapons, fury from round 4, charms resting).

### Release 1 (23 Oct 2026): the four approved changes for everyone
Dave approved releasing the four approved changes and also "everything". js/release.js now turns on, for every player:
Heart to Heart, heart faces and Ready, charms resting, perk previews (checked in the live game: `node dev/livecheck.mjs`).
The weapons experiment, arrows, fury and class rules follow in release 2, after two gaps found while preparing it are closed:
(1) stage-1 weapons roll the same at every metal, so Silver and Gold would be worth nothing (the planned metal abilities were
never built); (2) old two-handed Bows must become the new Arrows + Bow pair. Then a full-campaign measurement with everything on.

### Checkpoint 5, part 1: teamwork evaluation (done)
docs/balance/TEAMWORK_EVAL_2026-10-23.md: focus fire is clearly best; splitting loses a quarter of 4-goblin fights; the
threat-first bot is a weak player (a simulation limit); Heart to Heart helps a little (mostly within the error), never hurts
beyond the noise, and pulls 35-43% of heroes into groups when they look for it. Still running: Bard team measurement, class
kits and magic styles on the consistent baseline, and the full campaign with release 2.