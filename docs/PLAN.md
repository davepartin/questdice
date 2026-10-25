> **Team coordination update, 23 October 2026:** Read [docs/team/BOARD.md](team/BOARD.md) first for Dave's current roles, priorities, design constraints and handoff protocol. Earlier state summaries below are historical and need reconciliation with current code. Preserve this log; record new task evidence on the board and linked briefs. This documentation-only setup changes no gameplay.

# QuestDice — Ongoing Plan (shared between two Claude accounts)

**Read this first, update it last.** This file is the single source of truth for what is done, what is next, and
what is broken. Two Claude accounts take turns on this project; neither remembers the other's chat. Everything the
next session needs lives here and in the repo.

## START HERE: the state of the game on 10 October 2026

> **23 October 2026:** this summary is now history. The current state (rules switched on by `js/release.js`, charms resting, levels, live build, experiments done) is in [docs/team/tasks/T01.md](team/tasks/T01.md); how to work in the repository is in [docs/team/WORKING_GUIDE.md](team/WORKING_GUIDE.md).

This section was current on 10 October; the older sections below it are history.

**Who and where.** The owner is Dave (davepartin on GitHub), a pastor who plays on an iPhone and tests on the live site,
https://davepartin.github.io/questdice/ (repo `davepartin/questdice`, GitHub Pages from `main`). He likes warm, plain,
paragraph-style explanations, and a screenshot of every visible change. Keep the game free of anything demonic, satanic,
cultic or occult, and no pentagrams (skeletons, ghosts, witches, wolves, dragons and the like are fine).

**How we work.**
- Every change is pushed to **both** `main` (the live site) and the working branch `claude/wizardly-newton-c0xpcq`:
  `git push origin HEAD:main && git push origin HEAD:claude/wizardly-newton-c0xpcq`. Pull before starting.
- After any change to files the browser loads, bump the cache stamp: `node tools/stamp.mjs 20261010m` (use a newer value;
  the last one used is **20261013t**). Phones otherwise keep old files.
- Tests: `npm test` (or `node --test test/*.test.mjs`), **119 passing**. Keep them green.
- Balance: `sh tools/progress-all.sh 3 4 smart` (full 3-act campaigns, all classes, ~40 min; prints clears by class),
  `node tools/tension.mjs 30` (how dangerous ordinary fights feel, ~6 min), `node tools/strategy.mjs` (block vs attack study).
  Write results into `docs/BALANCE.md`.
- Screenshots: start `node dev/serve.mjs 8135`, then run a `dev/*.mjs` Playwright script (each one is a worked example:
  `dev/moves.mjs`, `dev/straightglow.mjs`, `dev/legendary.mjs`, `dev/looks.mjs`, `dev/classes.mjs`). Headless Chromium path:
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` with SwiftShader; drive time with `window.QD.world.stage.simulate`.
  Stop the server with `pkill -f '^node dev/serve'` (a pattern that matches your own shell kills the shell).
- Online rooms use Firebase project **`questdice-eef50`** (see `docs/FIREBASE.md`). Never deploy QuestDice rules into the
  `space-tribes` project: that is Fleet Dice's and would break it. The Firebase config values in the repo are public identifiers.
- Do not put AI model names in commits, code or docs. Append a dated note to this file for every piece of work.

**What the game has now (rules in `js/engine.js` + `js/data.js`, pure and tested).**
- Nine dice per hero (weapons, head, hands, heart, feet, two talent dice); 4-dice rerolls, 3 free + 3 paid; triples, straights.
- 11 weapons in three temperaments (steady / balanced / risky); metals Bronze to Diamond raise the numbers; 6 legendary weapons
  (one in your hands at a time, from elites, bosses and now and then the traveler).
- 5 classes with different starts (Wizard frail with the strongest magic, Ranger fastest, Dwarf the wall, Knight, Bard).
- Magic powers in three slots (A big move, B every round, C charge), learned and swapped at camp; a Healing section
  (potions bought at camp by act, magic to health).
- Campaign: Act I (Ashen Marches) and Act II (Hollow Crypt) monsters; Act III replays Act I's monsters with bigger numbers.
  Two roads each step (standard, perilous); elites at step 5, bosses at 10; road events; camp between fights.
- Company play: 1-6 heroes on one phone (3D, turns) or online rooms (each on their own phone). The slowest feet draw the
  monsters' attacks; the targeted hero scores as the company's shield; team actions; spoils draft by battle points; a second
  or third hero of a class wears another colour set.
- Learn to play: 13 lessons and a guided practice fight. Saved games behind Continue.
- Cloud saves (13 Oct): solo heroes save to Firestore under name + password (salted hash, derived doc id). Load on any
  device from a public name list (name, class, level, act/step only), pick a step already reached (Act I is new-hero-only;
  Acts II/III welcome a built-up hero), open a table with that hero; friends bring their own save. First-clear rewards
  only (repeat clears withhold XP, gold, perks and drops per hero). Rules in `firestore.rules` need publishing before
  writes succeed.
- Pets (11 Oct): the traveler sells one of six pets a camp (90 gold; Dave's pictures). Its die rolls on a small stand left of the board; train it like
  a talent die and grow it d4 → d6 → d8. See "Pets" at the end.

**What we did most recently (7-10 Oct 2026), newest last.** Online rooms; 2x talent face label; saved games list and a
frozen-screen fix; Learn to play; slowest-feet targeting and shield points; dice roll twice as long; symbols one for one;
potions bought at camp; camp gear panels; a strategy study; the weapons/classes/powers review (`docs/REVIEW_GEAR_CLASSES_POWERS.md`)
and all five of its phases (temperaments and metals, three power slots, class starts, legendaries, company looks); then
Dave asked "what is missing to make it fun?" (answer below) and we did the first item: **tension** (the standard road hits
harder; new monster moves Fire Ward, Stalk, Phase); then a **magenta glow under the dice in a straight** and a **short monster
sheet** (tap a monster twice: next move, how to get ready, other moves as chips). Details are in the dated notes at the end.

**To do, in the order Dave and Claude agreed.** From the "what is missing to make it fun" answer (10 Oct):
1. ~~Real danger in ordinary fights, and monster moves that break the "read the box" habit.~~ Done (Tension). Ask Dave how it
   feels on his phone; the numbers come from a bot. One setting tunes it: `ORDINARY` in `js/data.js`.
2. ~~Teach one idea at a time over the first ten fights.~~ **Declined by Dave (10 Oct): do not change how the game
   starts.** The tutorial already walks a new player through it, and he likes that each class starts with its own dice and
   levels. Leave `START_DICE`, class starts and the opening flow as they are.
3. Reasons to play again: a branching road map, shuffled events, small unlocks that carry to the next run (a class, a power, a
   harder mode), and a daily seed everyone plays and compares (good for Dave's church friends).
4. **Next (recommended 10 Oct):** make big moments feel big: Weapons Triple, a legendary drop, a revive, a boss falling (pause, light, sound, the number counting up).
5. More teamwork in company games: moments that need two heroes at once (hold the line so a friend can strike, team combos,
   giving up a potion to save a friend).
6. ~~A story thread through the acts.~~ Done 10 Oct (see "Story thread" below). Ideas for more: a line from the story on
   the boss's quest card, story beats in online rooms, and new chapters if Act III ever gets monsters of its own.
7. Watch three or four real people play their first 20 minutes without helping (Dave's job; ask what he saw).

Other open items:
- The online table's camp has no power learning yet; online heroes use their starting powers.
- Act II monsters (skeleton, wraith, spider, bone warden, lich) still use a placeholder 3D actor; Act III has no monsters of
  its own. Art for them is a big piece of work.
- Audio has never been checked by a human ear.
- The `dom.js` fix (CSS custom properties now apply) brought class-emblem colours and list stagger animations to life;
  worth a look on a real phone.
- Ideas not yet raised with Dave: carry wounds between fights (attrition), armor pieces (the helmet stays a number die for now).

## How to hand off (rules for both accounts)

1. `git pull` (the working branch is `claude/wizardly-newton-c0xpcq`; `main` is the live site and gets every push too). Read this file, then `docs/GFX.md`.
2. Work in **parts** (section 4). One part at a time. Finish it, run `npm test`, commit, push.
3. Before stopping (or when you notice you are near a usage limit) append a dated entry to **Handoff log** (section 7):
   what you finished, what is half-done, what to do next. Commit and push that too. Never leave work uncommitted.
4. Sub-agents are **session-local**: agent IDs from one session do not exist in another. A new session spawns fresh
   agents from the briefs in section 5. Sub-agents hit usage limits and die mid-work: their partial files stay on disk, so
   always `git add -A && git commit` snapshots, and re-brief from the file state, not from memory.
5. Do not run two sessions at the same time on the same files. If both accounts might overlap, split by area:
   Account A = characters/dice/arena art (`js/gfx/**`); Account B = flow/HUD/screens/game feel (`js/g3/**`, `css/**`, `js/ui.js`).
6. Never lower the bar silently: if something is not verified, say so in the log.

## 1. What this game is

QuestDice: cooperative fantasy dice campaign (1-6 players). Your 3x3 board of dice is your body. See `docs/DESIGN.md`
(rules, all decisions) and `docs/BESTIARY.md`. The rules engine (`js/engine.js`, `js/data.js`, `js/table.js`, `js/roads.js`,
`js/save.js`) is **done and tested** (`npm test`; 101 passing as of 10 Oct 2026; see START HERE for the balance tools).
Milestone the owner asked for: **solo campaign through the first five Act I monsters** looking AAA, then grow it.
The five are: Goblin Skulker, Dire Wolf, Ember Mage, Hill Ogre (elite, quest 5), The Goblin King (boss).

## 2. Architecture of the 3D layer (added this project)

- Three.js r186 vendored in `vendor/three/` (no CDN, no build step). Import map in `index.html`. Everything is procedural: no image or model files.
- `js/gfx/` the art: `core.js` stage + deterministic clock, `post.js` bloom/AO/grade, `tex.js` procedural PBR, `mats.js`, `actors/*` (monsters, hero),
  `weapons.js`, `dice/*` (dice + tray), `arena.js` + `arena/*` (8 Act I places), `vfx.js` + `vfx/*`, `particles.js`, `rig.js`.
  Contract and conventions: `docs/GFX.md`.
- `js/g3/` the game on top: `world.js` (scene lifecycle, staging marks), `director.js` (camera shots, portrait/landscape), `battle3d.js`
  (the solo battle controller + HUD logic), `hudkit.js` (HUD components/icons), `screens.js` + `scrui.js` + `icons.js` (title, hero creation,
  quest board, road, victory/defeat, camp), `portrait.js` (3D-to-PNG portraits for DOM cards), `stubs.js` (fallbacks if an asset fails).
- `js/ui.js` still holds the classic DOM flow and **party mode** (1-6 phones, `server.mjs`, `roomui.js`); it delegates to the 3D screens when WebGL is available.
- CSS: `css/style.css` (classic), `css/g3.css`, `css/hud.css` (battle HUD), `css/screens.css` (menus).
- Audio: `js/audio.js` (procedural sfx + generative music). Never listened to by a human yet.

## 3. Tools (use them, do not guess)

```bash
node dev/serve.mjs 8123 &     # static server (use setsid nohup so it survives)
# real game, deterministic time, screenshots (swiftshader is SLOW: use --q low --w 960 --h 540 to iterate)
node dev/play.mjs --port 8123 --out DIR --q med --script steps.json      # steps: eval, click, until, pump, shot, size
node dev/gallery.mjs --port 8123 --out DIR --q med [--w 1280 --h 720] [--cls knight|ranger|wizard|dwarf|bard] [--only goblins,wolf,cultist,ogre,king,camp,bridge,ford]
node dev/shot.mjs --url "http://localhost:8123/dev/viewer.html?m=gfx/demo/actor.js&actor=wolf" --out x.png --advance 0.3   # asset viewer
npm test                      # rules tests (must stay green)
```
Notes: needs `ln -s <dir with playwright-core> node_modules` (Playwright is not a dependency of the repo; install `playwright-core` somewhere and link it).
The harness fast-forwards stage time without rendering (`stage.simulate`). Run at most ONE render job at a time; parallel jobs time out.
To play for real: `node dev/serve.mjs 8000` locally and open http://localhost:8000 (add `?q=low` for slow machines, `?debug` exposes `window.QD`).

## 4. Parts (work in this order; tick when done)

Status legend: [x] done, [~] partly / unverified, [ ] not started.

**Part 0: Foundation** [x] stage, post chain, PBR textures, actor/animator base, particles, viewer/shot tools.

**Part 1: Playable 3D solo battle** [~]
- [x] Reset > Roll > Shape > Lock > Resolve with 3D hero, monsters, dice tray, VFX, HUD. A full fight to victory was run headlessly.
- [x] **FIXED: camera cropped the dice tray.** Verified 2026-10-05 in `dev/gallery.mjs` at 1000x563 and 390x844 (`--q low`): all nine dice fully visible and
  clear of the HUD dock, hero and both monsters in frame. Shot `battle`: land pos [0.5,5.0,11.2] look [0,0.9,1.4] fov 38; port pos [-0.2,6.4,11.8] look [-0.4,0.8,1.6] fov 54;
  `MARKS.tray` z 4.5 scale 0.74. Re-verify after ANY change to director/world marks/tray size, and for the king/ogre scenes (big monsters) too.
- [ ] Play 5 quests in a row through the real flow (create > board > battle > victory > camp > board x5), no console errors.
- [ ] Target ring from `vfx.targetRing` and `vfx.ambientFor(place)` are wired (`battle3d.js`) but never seen in a real frame.

**Part 2: Game feel (needs a human)** [ ]
- Owner plays one real fight on a local server and reports what feels wrong (rerolls, telegraph clarity, pacing, tap targets). Fix those before more art.
- Wire `tray.onSound` to `sfx.dieHit/dieSettle`; listen to audio levels; check music mood changes (title/road/battle/boss/victory/camp).
- Quest 5 (Ogre Wind-Up/Slam) and the boss (rage at half HP, summons) must be read and fought correctly. (Stagger was removed: a wind-up always becomes a Slam; the box says "brace with block".)
- First-run tutorial tips adapted to the 3D HUD (old DOM tips are not shown).

**Part 3: Characters to ship quality** [~] (critic round 2 overall 5.3/10; realistic ceiling for procedural-only ~7-7.5)
- Dire Wolf is the weakest (2.5): being rebuilt from scratch (SDF capsules, wolf anatomy, no speckle fur halo).
- Goblin 4.5 (cloth, weapon, teeth, AO), Cultist 5.5 (staff + light), Ogre 5.5 (lift albedo, scars, club), King 3.5 (face and crown visible, gold not blown out).
- Hero (knight 5.0): blade fuller/crossguard, shield boss/emblem, cape folds; check the other four classes visually (never reviewed in-game).
- Dice 7.0: dice still read copper under arena light; per-die colour identity; numerals in glare; tray size.
- Open budgets: goblin/ogre over 60k tris; ~70 meshes each (merge by material).

**Part 4: Arenas to ship quality** [~] Ford 6.5, Bridge 6, Ravens 5.5, Orchard 5, Camp 5, Hollow 4.5, Gallows(boss) 4.5, Wolfwood 4.
Needs: value range and shadows that read, boss arena with king readable (teal fill, smaller pyre), Wolfwood moonbeams, Hollow depth planes, Orchard ground detail.

**Part 5: HUD and screens polish** [~] HUD 7.5/10. Left: plates must never cover monster heads (in progress), phone dock height, fonts could not load in the sandbox (verify with Oxanium/Archivo Black/Cinzel/Cormorant),
camp sit pose, `med`/`high` look pass of every menu screen, party mode regression check.

**Part 6: Performance and robustness** [ ] real-GPU phone test (first load builds textures for seconds: warm up during title), quality auto-tier, memory/dispose on repeated fights,
WebGL-unavailable fallback to classic UI, `prefers-reduced-motion`, no console errors.

**Part 7: Critic loop** [~] Repeat: render full gallery (landscape+portrait) > spawn a fresh harsh critic (prompt in section 5) > fix top items per owner > re-render. Rounds so far: R1 4.0, R2 5.3. Stop at ~7.0 or diminishing returns.

**Part 8: Beyond the first five monsters** [ ] Act II monsters currently use a placeholder actor (skeleton, wraith, spider, bone warden, lich): build them, then Act II arenas.
Then 2-6 player 3D battle (party mode still uses the classic DOM board).

## 5. Briefs (paste into fresh sub-agents; all own separate files, none run git)

Common preamble: repo `/home/user/questdice`, read `docs/GFX.md`; own files only; never run git; verify through `dev/gallery.mjs` (real game camera) not only the studio viewer;
LOOK at every screenshot and critique harshly; run one render job at a time; report with screenshot paths and honest weaknesses.

| Area | Files owned | Current top asks |
|---|---|---|
| Monsters A | `js/gfx/actors/{goblin,wolf,cultist,parts}.js` | wolf rebuild; goblin cloth/weapon/teeth/AO; cultist staff+light |
| Monsters B | `js/gfx/actors/{ogre,goblinking,parts2}.js` | king face/crown visible, gold PBR, teal rim; ogre skin/scars/club |
| Heroes | `js/gfx/actors/{hero,herokit,herocloth,heroclips}.js`, `js/gfx/weapons.js` | blade/shield/cape; verify 5 classes in-game |
| Dice | `js/gfx/dice/*` | colour identity under orange light, numerals in glare, contact AO |
| Arena | `js/gfx/arena.js`, `js/gfx/arena/*` | per-place value range + readable shadows; boss arena; Wolfwood/Hollow/Orchard |
| VFX/Audio | `js/gfx/vfx.js`, `js/gfx/vfx/*`, `js/audio.js` | wire + verify in game; flame sprites; audio mix |
| HUD | `css/hud.css`, `js/g3/hudkit.js`, HUD parts of `js/g3/battle3d.js` | plates off heads, card column vs hero, grouping, banner placement |
| Screens | `js/g3/screens.js`, `scrui.js`, `icons.js`, `css/screens.css`, screen fns in `js/ui.js` | real fonts pass, med/high look, camp sit pose |

Critic prompt (use a fresh agent each round, it must not have built anything): "You are the harshest art director in AAA games. Read every image in
<gallery dirs>. Do a blind side-by-side thought experiment vs Call of Duty / Diablo IV / God of War / BG3 for 6+ frames. Score 0-10 each: each monster, hero, dice+tray, each arena, lighting/post,
camera/composition (landscape and portrait), HUD, overall, with deltas vs the previous round. Give a prioritised fix list per owner (max 6, each tied to a named image, with a concrete technical remedy for
procedural Three.js), what is good, the realistic ceiling, and a verdict. Write to docs/critic-roundN.md equivalent in the scratchpad."

## 6. Known facts and gotchas

- Screens render slowly under software GL: 1-2 minutes per frame at q high with several jobs. One job at a time. `stage.simulate` ticks without rendering.
- `world.clear()` drops all stage frame hooks; things that must survive re-attach (see `director.attach()`).
- Test harness must yield between ticks, or awaited choreography stalls (promises resolve between ticks in real play).
- The first critic found the camera framing was the biggest lever; do not move the camera without re-checking that the whole tray is visible and not under the HUD dock (portrait dock height is measured by `world.director.setSafe`).
- Playwright is not in the repo; install `playwright-core` locally and symlink `node_modules` (it is gitignored).
- Fonts (Google Fonts) fail in the sandbox, so shots use fallback fonts.

## 7. Handoff log (append newest at the bottom)

- **2026-10-05 (account 1, session 1):** Built the Three.js foundation; six asset builders + HUD + screens agents delivered first versions; two critic rounds (4.0, 5.3).
  Solo 3D battle plays end to end (headless). Menu screens exist over live scenes. **Open P0:** tray cropped by camera, reframe applied but unverified (Part 1). Wolf rebuild, ogre/king,
  hero, arena, HUD round-2 fixes were in flight when this was written and may be only partly committed: check `git log` and `git status`, then re-run the gallery before trusting any score.
  Next: verify the tray framing (Part 1 bug), then play 5 quests, then ask the owner to play a fight (Part 2).

- **2026-10-05 (account 1, session 2, Part 1 checkpoint):** Verified the battle camera in `dev/gallery.mjs` (low quality): landscape 1000x563 and portrait 390x844, goblins, ogre, king all frame correctly
  with the full tray visible. Big-monster mark moved to z -1.9 so the ogre's head is no longer cut off. Monster nameplates still sit on the heads of tall monsters (HUD agent task: anchor above head + gap).
  All sub-agents from session 1 are gone (container restarted); their partial work is committed. **Next:** (1) play five quests in a row through the real flow and fix what breaks;
  (2) re-brief the HUD agent for plates, Monsters A for the wolf, Monsters B for the king face; (3) owner plays a fight (Part 2).

- **2026-10-05 (account 1, session 2):** Pages build failed at 'Upload artifact' because a `node_modules` symlink (local helper link to Playwright) had been committed; fixed by `git rm --cached` and ignoring `node_modules` without the trailing slash.
  NEVER commit symlinks or local tool links (Pages rejects them). PR #1 (3D branch into main) was opened through the browser by the owner's Claude-in-Chrome; merge is the OWNER's decision. After merge: Settings > Pages > source `main`, confirm the build is green and the site shows the 3D title.

- **2026-10-05 (account 1, session 3, DESIGN DECISIONS from the owner; not yet in the rules engine):**
  DICE LANGUAGE: number in the middle of each face (medium size), meaning symbols in the corners. Symbols: attack = red starburst, defense = blue shield, pierce = orange up-arrow,
  magic = purple triangle, gold = yellow circle, heal = green plus. Heart die is the centre die, always a d6. Dice style presets live in `js/gfx/dice/faces.js` (`STYLES`, `setDiceStyle`), lab at `js/gfx/demo/dicelab.js`
  (`?m=gfx/demo/dicelab.js&style=clear|vivid|classic`); comparison shots in `docs/dice-lab/`. Numbers stay the same across tiers.
  TWO UPGRADES: **Tier** (Bronze, Silver, Gold, Diamond) = how many corners carry bonus symbols (d4 has 3 corners, d6 4); gear quality, raised by forging. **Size** (d4, d6, d8, d10) = number range;
  raised by training. A weapon cannot out-size the hand holding it: hands set the ceiling, the weapon climbs to it, and each step costs (hand training and weapon size are paid separately).
  ECONOMY: Magic = fight currency (resets each battle, cap 12): rerolls, cards, heals, charging. Gold = permanent growth: buying, forging Tier, training hand Size and weapon Size (engine already prices hand
  upgrades in gold: STRENGTH_STEPS / SPECIAL_STEPS). ROADSIDE AUCTION (group mode): before a battle a traveller offers a few weapons (normal/good/amazing); each player locks a sealed gold bid; highest bid wins
  and pays; unsold weapons stay with the game. Open questions: tie-break, first-price vs second-price, solo equivalent (fixed price or a secret rival bid).
  ENGINE TODO (needs tests): weapon die size follows min(hand size, weapon size); weapons currently always d4 (`sidesOf`).

- **2026-10-05 (session 3, more owner decisions + art):** AUCTION RULES: sealed simultaneous gold bids; winner pays their own bid; tie = tied players rebid and the new bid must be higher; tie again = the game keeps the weapon
  and the NPC says something funny ("you lot are too hard to work with"). Unbid weapons stay with the game. SOLO: no bidding, just a fixed price the player may accept. TONE: the game should be full of Monty Python-level humour
  (NPC lines, item names, flavour text). Tier rule change wanted: higher Tier adds corner bonus symbols and leaves the NUMBERS unchanged (engine's `weaponFaces` still adds +1 to faces per rarity: change it with tests).
  ART DONE: corner-symbol dice (`ST.corners` in `STYLES.clear`/`vivid`): medium number centred, meaning symbols on corner badges (atk red burst, def blue shield, pierce orange up-arrow, magic purple triangle,
  gold yellow circle, heal green plus, stagger steel fist); `spec.corners` overrides which symbols a face shows; heart die body is rose (was amber). Lab: `?m=gfx/demo/dicelab.js&style=clear&mode=tiers` (tier 0-3 rows) or `&tier=0..3`.
  Lab tier fill uses placeholder bonus symbols; real bonus assignment depends on the rules decision. NOT yet: default style in the real game is still `classic` (call `setDiceStyle('clear')` before building dice),
  camera not raised, d4 reads steeply from above (its number face stands upright; consider a visual lean toward the camera).

- **2026-10-05 (session 3, dice polish):** d4 is now PRESENTED leaned toward the camera (`leanQuat` / `d4Lift` / `setD4Lean` in `js/gfx/dice/poly.js`; applied in `tray.placeAtRest` and in the roll plan's `qFinal`/`pFinal`; physics still matches on the true rest pose, `testRolls(12)` passes).
  Gold symbol is a solid disc; d6 number smaller; triangle faces keep corner symbols nearer the centre; attack/defense symbols on weapon faces get a pale outline so a red burst shows on a red face.
  Style default for the real game is STILL `classic`: next step is `setDiceStyle('clear')` at boot (before `createTray`), raise the battle camera, and re-run `dev/gallery.mjs` (landscape + portrait).

- **2026-10-05 (session 3, dice in the real game):** `world.boot` now calls `setDiceStyle('clear')`. Battle camera raised (landscape pos [0.5,7.2,11.0] look [0,1.5,1.4] fov 41; portrait pos [-0.2,8.6,13.4] look [-0.4,1.3,0.5] fov 60);
  tray scale 0.82 (0.72 on phones) at z 3.9 (+0.4 on phones). Verified with `dev/gallery.mjs` goblins/ogre/king in landscape 960x540 and portrait 390x844. KNOWN: on phones the Goblin King's head is still under the top HUD panel and his nameplate
  (big monsters need the plate anchored lower or a per-monster camera nudge); Act II/camp/other shots not re-verified after the camera change; screenshots in `docs/ingame/`.

- **2026-10-05 (session 3, dice-forward layout):** owner wants the dice to fill much more of the screen. Tray scale now 1.12 (1.06 phones), hero mark [-3.2,0,0.8], landscape camera pos [0.4,8.4,11.8] look [0,0.6,2.6] fov 42, portrait pos [-0.2,9.8,12.8] look [-0.3,1.0,2.2] fov 63.
  TRADE-OFF: on phones the tray is full width but big monsters (ogre, king) sit mostly behind the top hero panel and their own nameplate. Next: collapse/shrink the top HUD panel on phones during battle, anchor monster plates beside not over heads,
  and consider making the dice themselves larger inside their sockets (physical size is `poly.inR` in `js/gfx/dice/poly.js`; sockets `DISH_TOP` 0.54 in `tray.js`).

- **2026-10-05 (session 3, three HUD/dice fixes):** (1) phone hero panel is one slim row (CSS block at the end of `css/hud.css`); (2) elite/boss nameplates stand beside the body (`positionPlates` in `battle3d.js`, `ax` anchor);
  (3) dice are drawn 1.22x larger than their physics body (`DIE_SCALE` in `tray.js`, with a y compensation). Landscape camera now pos [0.4,8.4,11.8] look [0,1.5,2.4] fov 44. Screens in `docs/ingame/v3_*`.
  Still open: boss arena is very red/hazy (king looks washed out), Act II/camp/road shots after the camera change, real-phone check.

- **2026-10-05 (session 3, one symbol language everywhere in the 3D battle):** HUD totals tiles, cards, hero magic, monster intents, floating combat numbers, tray pulses and projectile colours now use the dice language:
  attack red burst, block blue shield, pierce ORANGE up-arrow, magic PURPLE triangle, gold yellow disc, heal green plus (`ICONS` in `js/g3/hudkit.js`, `--h-*` vars in `css/hud.css`, `js/gfx/vfx/text.js`, `js/gfx/dice/fx.js`, colours in `battle3d.js`).
  NOT yet converted: the old flat classic UI (`css/style.css`, `js/mat.js`, `js/die3d.js`, party mode) and the menu screens (`css/screens.css`) still use the old yellow-magic / purple-pierce colours.

- **2026-10-05 (session 3, special dice):** special dice (SW/SE) are now a neutral silver body (no purple; purple means magic). Faces: SW alternates green plus (Mend) and bold "2x" (Surge); SE alternates purple triangle (Spark = magic) and "2x". Blank faces unchanged. Implemented in `faces.js` (`ST.corners` branch for `spec.sym`), tray socket glow for specials is neutral. Lab: `dicelab.js?pick=pip|surge`.

- **2026-10-05 (session 3, menus + main):** pushed everything to `main` with the owner's go-ahead (fast-forward). Menu/camp/create screens now use the symbol language: `js/g3/icons.js` `spark` = filled triangle (magic), `pierce` = up-arrow, `coin` = solid disc, new `burst` for attack;
  colours in `css/screens.css` (`.fx.c-*`, magic meter and card cost badges purple). Still old: classic flat UI + party mode (`css/style.css`, `js/mat.js`, `js/die3d.js`). Next per owner: rules changes (Tier/Size/auction), five-fight playthrough, boss/wolf polish.

- **2026-10-05 (session 3, RULES: Tier / Size / forge / train / auction; owner confirmed nothing is live, anything may change):**
  DONE in engine + tests (54 pass, sim still clears Act I): (1) Tier never changes numbers: `weaponFaces` adds the weapon's next `bonus` fx per tier (`WEAPONS[x].bonus` in data.js, Silver 1, Gold 2, Diamond 3);
  (2) Size: `inst.size` (default 4) = faces; extra faces carry numbers 5.. and alternate colour; `sidesOf` for a weapon = min(weapon size, hand strength) (NW<-W, NE<-E);
  (3) gold sinks: `forgeInfo/forgeWeapon` (FORGE_COST 40/120/300, x1.4 two-handed) and `trainInfo/trainWeapon` (WEAPON_SIZE_STEPS 30/80/180; a weapon can only be trained up to your biggest hand); both act on every copy with the same uid (two-handers);
  (4) `js/auction.js`: sealed bids, winner pays own bid, tie -> rebid higher among tied, tie twice -> weapon taken, no bids -> unsold, `soloOffer` fixed price, `line(kind)` humour banks; tests in `test/auction.test.mjs`;
  (5) Camp > Forge tab has a Weapons section (Forge Silver / Train d6 buttons); dice art shows each face's corner symbols from `weaponFaces` fx.
  TODO: put the traveller into the road events (solo = fixed price from `soloOffer`; group = `auction.js` flow, needs the 3D party/online layer), show tier bonuses on weapon cards, balance pass (d6+ weapons raise attack a lot), rarity drop odds vs forge costs, update the old flat UI (`js/ui.js`) if it must keep working.

- **2026-10-05 (session 3, owner phone feedback round):** owner sent a real iPhone screenshot: dice were pixelated (phone got quality 'low' + dpr 1; fixed: `detectQuality` gives 'med' to phones with >=6 cores, dpr cap 2, dice atlases always 'high'),
  plates covered monsters (phone: plates now sit in their own row under the hero strip, leader lines to the heads), dice too small (phone camera near top-down: pos [-0.2,12.6,9.4] look [-0.3,0.2,1.6] fov 55, tray 0.86 scale, z-0.9).
  DESIGN: road event every 2 fights (before fights 3,5,7,9 and always before the boss: `roadSlot` in roads.js); camp after every fight (already the flow); the TRAVELLER is a road event (`id: 'traveller'`) that replaces the normal pick when 2-3 fights have passed since the last one (solo = fixed price from `soloOffer`; group should use `auction.js`).
  Heart rotate costs 3 magic (`NUDGE_COST`), shown as triangle+number like every other magic cost; magic earned in a round is banked at resolve and spendable from the NEXT round (already how `resolve` works). Triples draw a glowing bar through the three dice (`tray.setLink`).
  Income measured (bot, no spending): ~27 gold per ordinary fight over ~6-7 rounds, elite 57, boss 85; ~350 gold for all of Act I. Price table now: hand dice 40/100/220, special 50/120/250, weapon forge 40/120/300, weapon train 30/80/180, shop weapons 30-75 x tier mult. NEXT: owner to confirm the price principle, then tune (see chat).

- **2026-10-05 (session 3, gamble traveller):** owner approved the price table and wants the solo traveller to be a GAMBLE: he sells a wrapped bundle for a flat price (`gamblePrice`: 70 gold, +25 per act); the weapon inside is hidden until bought (odds `GAMBLE_ODDS` 50% Bronze, 30% Silver, 15% Gold, 5% Diamond; fixed by campaign seed so reloads cannot reroll); a funny reveal line per tier (`revealLine`). Code: `gambleOffer` in `js/auction.js`, road event in `js/roads.js`, tests in `test/auction.test.mjs`. Group play still uses the sealed-bid auction (`auction.js`), not yet wired into a screen.

- **2026-10-05 (session 3, PLAYTHROUGH round 1; Part 1 "play five quests" done headlessly):** drivers in `dev/`: `playthrough.mjs` (bot plays board->fight->victory->camp->road->board on real screens, `--fights N --strong 1 --cls`), `interact.mjs` / `interact-camp.mjs` (pokes reroll, cards, heal, heart rotate, forge, train, equip, sell, traveller), `newgame.mjs` (title->create->save->reload->Continue), `boss.mjs` (Goblin King, plate bookkeeping, retry after defeat), `act2.mjs` (cheat-win the boss, check Act II). Run them with `node dev/serve.mjs 8135` up, one at a time.
  RESULTS: 5-fight run, defeat/retry, boss + summons, Act II hand-off, save/reload all work with no console errors. Fixed: reroll button sub-line wrapped on phones. Known/not bugs: "Could not save" toast appears only when a test hero has no save record. NOT yet covered: Act II fights use placeholder actors; boss fight with 4 plates is crowded on phones (2 rows, names truncated); real audio untested; real iPhone untested.

- **2026-10-05 (session 3, MECHANICS: rerolls + talent dice; owner design chat):** REROLLS: `RULES = { free: 3, paid: 3, diceBonus: 1 }` in data.js (each action rerolls the class's dice + 1, so knight 4, ranger 5; paid actions cost 1 magic per die; magic is the banked total from earlier rounds).
  TALENT DICE (old special dice, bottom corners SW/SE): faces = 2 blanks, a 2x (doubles that hand's strength in its lane), then symbol faces (d4: 1, d6: 3; max size d6, `SPECIAL_STEPS`); each symbol face holds up to 2 symbols (same symbol twice on a face is allowed); at most 2 of any one symbol per die (`TALENT_MAX_SAME`); every slot costs the same (`TALENT_SLOT_COST` 25); you choose placement (`addTalent`, `removeTalent`, `talentInfo` in engine.js; `hero.talent = { SW: [[syms],[syms],[syms]], SE: ... }`).
  Symbol value = the hand strength above the die: atk/block/magic x1, pierce x0.75, heal x2, gold x0.5 (rounded up). Each class starts with one symbol per die (`CLASS_TALENT`). 2x is the old Surge; draws as "2x"; talent faces draw big centred symbols (`sym: 'TALENT'` in faces.js).
  SIM (`tools/sim2.mjs`, Act I, bot): old rerolls clear 98%, 0.5 defeats/run, 5.5 rounds/fight; new rerolls clear 100%, 0.05 defeats, 4.4 rounds/fight (fights ~20% shorter, much safer); no build (all-attack, all-heal, all-gold...) breaks Act I; heal-heavy ends fights with the most HP (94%), gold-heavy is weakest in fights (79%) by design.
  NOT DONE: camp UI to place symbols (`addTalent`) and to buy the die after the first fight; progressive onboarding (start with 6 dice: head, hands, feet, heart, one one-handed weapon; talent dice and the second weapon unlock at camp); in-battle captions for talent faces use `D.talentName`.

- **2026-10-05 (session 3, DICE-FIRST PHONE LAYOUT, owner request):** on phones the monster stat plates are a fixed horizontal strip under the hero panel (`stripPlates` in battle3d.js, `.b3-plates` flex strip in the last block of css/hud.css; scrolls sideways with many foes; tap a plate or a monster to target; no leader lines). The 3D scene is a small miniature battle (phone: monsters x0.62, hero x0.7 at [-1.9,0,1.1], big monsters pushed forward +1.6) and the tray fills the width (portrait battle shot pos [0,9.6,9.4] look [0,0,2.2] fov 50; tray scale 0.92). `director.setSafe` top = bottom of the strip. Landscape unchanged.

- **2026-10-05 (session 3, CAMP: six-dice start, unlocks, talent editor):** a new hero has `dice: [...START_DICE]` (head N, feet S, hands W/E, heart C, weapon NW; two-handers also fill NE); `newHero({ full: true })` gives all nine (tests use it). Camp unlocks SW (20 gold), NE (30), SE (35) one die at a time (`unlockInfo/unlockDie`, `UNLOCK_COST`); inactive dice are dimmed on the tray, cannot be picked or rerolled and add nothing to `evaluate`.
  Camp > Forge now has: New dice, Weapons (forge/train), Talent dice editor (tap a slot, pick a symbol for 25 gold, tap a placed symbol to remove it free, "Grow to d6"), see `talentCard` in scrui.js and `dev/talent.mjs` to drive it. Sim with the six-dice start still clears Act I (`tools/sim2.mjs`). NOT DONE: first-camp tutorial nudge ("buy your first bonus die"), classic flat UI/party mode do not know about unlocks or the talent editor.

- **2026-10-05 (session 3, FIRST-TIME PLAYER + difficulty + balance):** (1) pierce removed from talent dice (class starters now: knight heal/atk, ranger block/atk, wizard magic/heal, dwarf block/heal, bard gold/magic). (2) Beginner hints: `js/coach.js` holds every hint text (`HINTS`) and the on/off switch (localStorage `qd.hints`; each hint shown once per hero in `hero.tips`). Battle hint cards (`hint()` in battle3d.js, `.b3-coach` in hud.css): your body is the board, read the tiles, pick a target, paid rerolls, lock in, triple, magic carries over. Camp/victory/gear/road/traveller use `coachBox` in scrui.js. Hints off: button on each hint, in both menus, on the Hero tab, and a "played before" checkbox on the create screen.
  (3) Difficulty Easy/Normal/Hard (`DIFFICULTY` in data.js, `difficultyOf`/`withDifficulty` in engine.js; chosen at hero creation and changeable on the Hero tab; solo only so far, party battles ignore it). (4) `docs/BALANCE.md` + `tools/balance.mjs` report resources per round and clear rates. (5) Camp Forge order is now: gold, new dice, talent dice, hands, weapons; first die costs 15 so it is affordable after fight one. Drivers: `dev/hints.mjs`, `dev/talent.mjs`.

- **2026-10-05 (session 3, CLEAN DICE, now the game default via `setDiceStyle('clean')` in world.js):** no marbling/speckle (flat colour per face), matte-satin material (low clearcoat so flat faces do not mirror the lights), inner glow off. Palette: head/feet ivory, hands warmer tan (dark numerals, colored corner symbols for numbers 1-4), weapon faces bright red/blue with white numerals and burst/shield corners, HEART faces coloured by what they boost (1 gold, 2 orange, 3 and 4 purple, 5 blue, 6 red; white numeral, symbol + a white "+"), TALENT dice deep teal (a colour used nowhere else; heal green, magic purple, "2x" white; blank = slashed circle). Defined in `STYLES.clean` in `js/gfx/dice/faces.js`; `?style=clean` works in `gfx/demo/tray.js`, `dicegallery.js`, `dicelab.js`. `classic`, `clear`, `vivid` remain for comparison. In the warm arena the ivory dice read slightly peach; lighting tune-up is a candidate.

- **2026-10-05 (session 3, dice lighting):** clean dice are now mostly self-lit (`selfFlat` 0.85, low `bodyK`) so the arena's orange light and the tray's warm/blue lights cannot wash or tint them; tray key/rim lights are neutral white at half strength for this style (`neutralLight`, `light: 0.5`). Heart faces keep their saturated colours; the heal plus on the talent die stays green.
- **2026-10-05:** heart die faces no longer carry a '+' (owner request); each face shows only the colour and the symbol of what it boosts.
- **2026-10-05 (heart die v2):** in the clean style the heart die is a dark neutral cube whose face is mostly the boosted symbol (gold disc, orange arrow, purple triangle x2, blue shield, red burst) filling the face, with the white number on top. See heartBig in faces.js.
- **2026-10-05:** boss arena (Gallows Hill, kind boss) toned down: dimmer ember sky, thinner and less red fog, neutral warm key, softer rim. Still to do: wolf rebuild, Goblin King face/crown, Act II actors.

- **2026-10-05 (session 3, first-five-battles walkthrough):** `dev/five.mjs OUTDIR [w h]` plays the first five fights as a new player with hints on (screenshots + the hint shown at each step). Changes from it: (1) stat plates are a fixed strip at the top on both phone and landscape (`stripPlates`, camera shifted down by the strip height via `director.setSafe`), never over monsters; (2) per-monster hints (`m_goblin`, `m_wolf`, `m_cultist`, `m_ogre`, `m_king`) and `b_intent` (what the box means) in `coach.js`, shown in teaching order; (3) hint card on phones sits over the card row, not over the monsters; (4) the very first fight is ONE goblin (`questsFor`) because two goblins out-damaged a novice (a bot that never blocks or heals lost; with cards/heals it won); (5) monsters x0.85 and hero x0.85 on phones; ribbon hidden on phones. Known: Hill Ogre and Goblin King models still the weakest visually; hint text is long on small phones.
- **2026-10-05:** monster look pass: ogre rim light cut from hot orange to a soft warm edge, Goblin King teal rim replaced by a pale one (he is green again), wolf fur lighter. Models unchanged; the wolf is still the weakest (dark, mouth).
- **2026-10-05 (session 3, MAGICAL POWERS):** the old cards are now powers (docs/POWERS.md): kinds flat/dice/scale/round/luck/super, at-will vs once-per-battle, levels via gold, splash/aoe in solo resolve, camp Forge 'Magical powers' section, tiles show tags/stars/stepper. Tests 65, balance run still clears Act I. Party battles ignore dice/splash (use the flat fx fallback). dev/powers.mjs drives it.
- **2026-10-05:** added charge powers (kind 'charge', Wizard Storm Coil unlock lvl 3: store up to 4, release for 5 per charge), a glowing SUPER-ready tile that scrolls into view with a toast, release button on the tile.
- **2026-10-05 (real-phone feedback round 2):** (1) tray auto-fits between the monster strip and the dock on phones (fitTray in battle3d.js; projects the tray edge and shrinks it); (2) powers moved off the dock: a purple POWERS button in the bottom row opens a sheet (hud.sheet) and closes after a cast; (3) monster plates are compact (name, life bar with fraction, small intent chip); tapping the chosen monster/plate again opens its info sheet with all its moves (hud.info, showFoeInfo).

### Handoff: initiative (feet die)
- The feet die (S) no longer pays gold/pierce/magic; its number is **initiative** (`ev.init`). Head and hands still pay (`PAYERS` in engine.js). Feet still count for triples, straights and heart matches on the face number only.
- Round 1: you always strike first. From round 2 each living monster rolls a d4 at lock-in; a roll **higher** than your feet die means it acts before you (ties and lower go to you). `rep.init`, `rep.early`, `act.early`, `rep.heroDown` carry it to the UI (`battle3d.js` plays early acts, then your strike, then the rest; announces with ⚡ numbers and a banner).
- If an early monster drops you, you never swing (`rep.heroDown`).
- Open: feet die size growth (a bigger die would raise initiative), a way to show monster initiative before lock-in, party mode ignores initiative.
- Speed (initiative size): class feet dice start at `CLASSES[x].feet` (knight/dwarf d4, wizard/bard d6, ranger d8); `E.feetSize(hero)` (stored in `hero.speed.S`, lazy for old saves); camp Forge row "Feet · speed" buys d4→d6→d8→d10 (`SPEED_STEPS`). Each monster has `init` (its d-size: wolf d8, goblin d6, ogre d4 ...). The monster info sheet shows it; ties still go to the hero.
- Party initiative (engine `resolveParty`): every hero acts on their Feet roll (`rankFighters`), every monster on its own `MONSTERS[x].init` die; the round plays high → low, ties to the heroes, round 1 heroes first. The leader (top hero) still takes a double share of every blow. `rep.order`, `rep.init`, `rep.fallen` feed `partyReportLines` (view.js). A hero who is dropped (no Last Stand left) before their turn does not swing. Party UI is still the flat one; no 3D party battle yet.
- Last Stand is removed everywhere (solo and party): 0 HP = you fall. The old perk id `grit` stays for old saves but is now "Stout Heart" (+4 max HP). Balance after removal (bots): Normal 93%, Hard 73% Act I clears.
- Feet pay symbols again (like head and hands, by the feet die's size via RES_BY_SIZE) and the same number is the initiative. No "+N when you lock in" preview beside the magic counter (user: unnecessary).
- Phone battle UI: bottom bar is three equal buttons (Reroll "1 of 3" / "Magic reroll 1 of 3 · 1✦ a die", Powers, Lock in); the pips row and the heart/heal mini buttons are gone. Heart turn, Heal and a new Big heal (6 magic → 10 HP once per battle, `E.healBig`) live in the Powers sheet as "Anytime" powers. Tapping a power opens a detail card (what it does, uses, cost, Use/Cancel) instead of casting. Monster plates are one slim strip. The tray is fit to the screen width (dice bleed edge to edge). `tools/stamp.mjs <version>` rewrites index.html's import map so every module is cache-busted: run it before each push that changes JS/CSS.
- Phone battle layout v3: hero HP is a vertical thermometer on the left edge and magic a chip on the right (top bar removed); camera looks down at ~70 degrees (`fitTray` picks the elevation, only lowering it if the board would shrink); the altar frame may slide under the totals row; bottom bar = [Lock in square, left] [Magic powers] [big blue Roll/Reroll, right]. Powers library has Heart change (red heart) and a single Heal (6 magic, +10 HP, once per battle). Numeral 4 redrawn (open stem) so it no longer reads as an A. Tray decals for helmet/hands/boots redrawn.
- NEW DICE LANGUAGE (user-defined): head, hands and feet are identical white dice. Face 1 = 2 heal, 2 = 2 pierce, 3 = 2 magic, 4 = 2 gold (faces 5+ on bigger dice carry no symbol). Heart 1-4 adds +2 of the same to every matching 1/2/3/4 on head+hands+feet; heart 5 = +4 block on EACH blue weapon lane, heart 6 = +4 attack on EACH red weapon lane. Balance (bots): Normal 97%, Hard 60% Act I clears. (RES_BY_SIZE all [2,2,2,2], HEART_AMP all 2.)
- FACE_PAY (data.js) is the single table for head/hands/feet faces: 1-4 = 2 heal/pierce/magic/gold; 5-8 = 3 heal/pierce/magic/gold; 9 = 2 heal + 2 pierce; 10 = 2 magic + 2 gold. Dice art, totals and info text all read it.
- STAGGER REMOVED everywhere (user: too complicated). No stagger on weapon faces, cards, perks or road blessings (those became +attack / +block). A Wind-Up always becomes a Slam next round unless the monster dies first: answer it with block. docs/BESTIARY.md and DESIGN.md still describe stagger in places (historical).
- Hero start (balance): feet die max d6 (SPEED_STEPS only d4->d6). Fast classes (ranger, wizard, bard) start with d6 feet and d4 hands; slow classes (knight, dwarf) start with d4 feet and ONE d6 hand (left; right stays d4) (CLASSES[x].hands). Every hero starts with one talent die (SW) already on the board (START_DICE has 7). Empty sockets are dull grey, no pulse. Bots: Normal 97%, Hard 87%.
- Phone battle layout v4: monsters are small square tiles stacked down the right edge (4-letter `MONSTERS[x].short`, hp n/n, tiny bar, next move); tap = target, tap again = full info sheet. The top band is now the arena (monsters stand there, lit by a phone-only `foeLight`). The altar is a low slab (`slim` body, no apron/legs/plinth) lying near the ground (MARKS.tray y 0.3). Dice size is capped at the liked size (k 1.34); `fitTray` slides the board back (dz) so the bottom row clears the totals, camera 70 degrees.
- SPLIT SCREEN (phones): the dice table is rendered by its own camera/scene (`stage.trayScene`, `stage.trayCamera`, `post.trayPass`, scissored to a band at the bottom), over a dark leather floor; the battlefield is the main scene above a golden "YOUR DICE" line (`.b3-divider`, `--line-y`). `fitTray()` solves distance/width so the table's front edge sits under the totals and the line stays below the battlefield minimum; pitch 70 degrees (the angle the user liked; a lower camera showed too much of the cube sides). Main battle camera for phones: pos [0.3,4.4,11.2] look [0,1.1,-0.6]. The straight chooser floats above the dock. Landscape unchanged (tray in the main scene).
- Scale language (phones): `SIZE_VS_HERO` in g3/world.js sets each monster's height as a multiple of the hero (goblin .72, wolf .9, cultist 1.0, ogre 1.6, king 1.55, bone warden 1.7 ...), shrunk a little for crowds; the hero stands in the foreground (-1.6,0,2.6); phone battle camera pos [0.2,5.4,14.5]; trees and far mountains give scale. Open: monster formations for 4+ foes still overlap; props are simple cones.
- CONTENT RULE (user): nothing demonic, cultish, satanic or occult, no pentagrams or ritual circles. Ashen Cultist is now the Ember Mage (fire mage, move "Tangle" not "Hex"); the target ring is plain rings and ticks; the bind effect is a blue light, not a ritual glyph. (id `cultist` kept internally.) Act II undead (skeletons, wraith, lich "Raise Dead") are still in: ask the user.

### Dice face pass (weapon +N, dark sides)
- Weapon dice: every face is "+N" over a big symbol on a deep red (attack starburst) or deep blue (block shield) face; +0 shows the symbol faded. The weapon's extra effects (pierce, magic, heal, gold) stay as small symbols. `dieSpecs` sends `text: '+N', wface, zero`; `drawNumeral` draws a '+'.
- At rest only the read face is lit: `setRest` drops the sides to ~6%. Fixed `airK` (the mesh's scale offset made every die look airborne, so the sides never dimmed). d4 focus window widened to 0.55–0.78 so their read face stays bright.
- Heart die: smooth dark stone (no veins). Blank talent faces are plain. White numerals get a 2.5 px dark edge.

### Triples (rule change)
- Across = +10 attack: top row (both weapons' +N equal the head; any weapons, both spots in play, +0 never matches) and middle row (hand, heart, hand). Down the middle (head, heart, feet) = +10 block.
- `evaluate` returns `ev.triples = [{ slots, kind, name }]`; `offense3`/`defense3` remain as "any attack / block triple". UI (3D tray links, banner, notes, flat UI) reads `ev.triples`.
- Balance after this and the slow heroes' single hand: Normal 100%, Hard ~97% (was ~87%). May want toughening.

### Deploy note (Oct 7)
GitHub Pages stopped rebuilding after run 93 (Oct 6, 22:00 UTC; live site stuck at v20261006bz) although main kept getting pushes. If the live site looks stale, check repo Settings → Pages (source = deploy from branch main) and the Actions tab.

### Bow and arrows (two hands, two dice)
- A two-hander's right-hand copy is its own object (`E.twinOf`, uid `<uid>~R`, `twin: true`; `E.ensureTwin` fixes old saves). Forge and Train act on one hand at a time, so the bow and its arrows level separately; both start identical. Putting the weapon away keeps the better hand. The Forge tab lists each hand ("Bow" / "Arrows"; other two-handers say "· left hand / right hand").
- Board: bow icon in the left weapon circle, a bundle of arrows in the right one (`arrows` icon; dice watermark follows).

### Battle framing follows creature height (phones)
- `framePan` (battle3d.js) measures the tallest visible creature each frame and slides the picture (`director.pan`, added to the view offset) so its head sits ~16% down the battlefield; the nearest feet stay above the golden line and a head never goes under the header. Reset per battle.

### Balance pass: weapons, pack, roads, three acts (see docs/BALANCE.md)
- Strength gates weapon size (cards say so); sized drops by act; pack of 4; worth = price x tier x size, sell for half.
- Bigger weapon faces lean to the weapon's colour (r,r,b repeating above 4) so growth adds attack, not just block.
- Roads: perilous x1.3 hp, +3 a hit, x1.75 rewards; act growth ACT_HP [1,1.15,1.35] / ACT_FLAT [0,2,5]; elites/bosses skip act growth when native to the act; Lich 185 hp.
- Road cards show Easy/Fair/Hard/Deadly from `questDanger` (calibrated: ~96/87/72/50% wins) and ~rounds.
- Tools: tools/progress.mjs + progress-all.sh (campaign report by road policy), tools/dicemath.mjs. Runs saved in docs/balance/.
- Open: Act III bestiary + art; Act II theme; party scaling per the table in BALANCE.md (hits x (n+1)/2, health ~0.87n).

### Healing potions (solo now, party-ready)
- `E.POTIONS = 2`, `E.POTION_HP = 10`, `drinkPotion(b, to = b)`, `potionsLeft(b)`; replaces Big Heal (old `healBig`/`BIG_HEAL` kept as aliases). Free; usable on the reset screen or while shaping. Party fighters carry `potions` (mirrored); `to` lets a hero throw one to a friend once party UI exists.
- Compensation: base monster flat 2 -> 3 per hit; Hard flat +3. Danger labels re-banded (Easy <0.35, Fair <0.5, Hard <0.7). Lich stays (Dave likes it).

### Team rules + battle points (engine done; party screens to build)
- Triple names: Weapons / Strength / Head to Toe (`t.row` = weapons|strength|headtoe).
- Party: `teamBonuses` (team triples, same monster for attack rows; Heartbeat = +n magic), Moral Boost +3 (rep.moral, b.moralNext), `teamAction(b, from, kind, to)` potion|magic|revive (one per hero per round; revive once a battle, 10 magic, 10 hp). Table command `{ type: 'team', kind, to }`.
- Points: POINTS in data.js; `award`, `pointsOf`, `roundPoints`; solo b.points, party f.points (=contrib). `recordBattle` -> hero.record (Hall of Fame on Hero tab). HUD counter `.b3-score`.
- Rewards: partyRewards ranks by points, `place`, gold bonus PLACE_GOLD [0.5, 0.25] (2nd only with 3+); `newDraft/draftWho/draftPick/draftSkip` (table loot/pass use it). Party drops now sized like solo.
- Potion belt: `potionUpgrade/upgradePotions` (2 -> 3 for 90 gold at level 4), Forge tab row.

### 3D company battle (one phone, turns) — first cut
- Title: "A company on one phone" -> flat showCreateCompany (works inside the 3D shell). startQuest now opens the 3D battle for companies too (not for S.net).
- world.buildBattle({ heroes }) places every hero (phone marks keep them in the visible left half); `bw.setActiveHero(i, hero)` steps the active one forward and swaps the dice table.
- battle3d: B.party; `setActive/nextToRoll/commit`; roll -> E.startFighter; Lock in says "then Bea" / "monsters answer"; `lockParty` passes the turn; `performParty` plays rep.order (team triples, Heartbeat, initiative, each strike with Moral Boost, each monster act split across heroes, fallen heroes). Roster chips (name, hp, points, turn/locked/down). Powers sheet has a Team actions tab (potion, share magic, revive) with a friend chooser.
- scrui.partyVictory: places (1st; 2nd only with 3+), points, gold, XP, perks, spoils draft (take/skip, comes back around). Flat party victory also uses the draft.
- Online room (each phone its own) still uses the flat roomui and needs `node server.mjs` on a laptop; GitHub Pages alone cannot host it. Next: hosting decision, then drive this same 3D battle from table playerView.
- Tests/screens: dev/party3d.mjs (3 heroes to victory, screenshots docs/ingame/party_*.png).

## Online rooms on Firebase (7 Oct 2026)

- Project `questdice-eef50` (set up by Dave with Claude in Chrome): anonymous sign-in, Firestore (nam5, Spark), rules from `firestore.rules`.
- `js/cloud.js`: a room is `qdRooms/{CODE}`; every move runs `table.js` `command` inside a Firestore transaction on the phone. `js/net.js` uses the laptop server only when `/api/ping` answers (node server.mjs), otherwise the cloud.
- `js/pack.js` saves the table as text while keeping shared objects shared (the hero in the seat, the company and the battle stay one object). The battle's dice roller and the item-id counter are rebuilt each move from the table, so every phone rolls the same.
- Fixed on the way: the spoils draft used live getters that froze when saved.
- Invite links: `?join=CODE` opens Join with the code filled in; the lobby has Share invite.
- Verified live: `dev/cloudlive.mjs` (two phones, simultaneous moves, a full round) and a rules probe (strangers cannot write, join a started table, delete or list rooms). `test/cloud.test.mjs` plays a 3-hero company with save/load after every move.
- Next: the online screens still use the flat style; drive the 3D party battle from each phone's own view.

## Learn to play (9 Oct 2026)

- Home: new players see "Learn to play" as the first, gold button; returning players find it beside How to play under the menu.
- `js/g3/tutorial.js` + `css/tutorial.css`: 13 short lessons (board, white dice symbols, hands as Strength, weapon dice, talent dice, heart, feet/initiative, the six counters, triples and straights, a round, powers/potions/camp, ready). Back/Next, swipe, progress bar, Skip. Pictures are real renders of the game's dice (`assets/tutorial/*.png`, made by `dev/tutart.mjs`).
- Guided practice battle: a Knight ("You") against one goblin, never saved. `b.script` in the engine sets the first roll and first reroll (11 attack, then a Strength Triple for 21; `test/tutorial.test.mjs` keeps those numbers true). A spotlight and a card point at the goblin, health, Roll, the counters, the left lane, the middle row, Reroll, Lock In and Magic powers; while it waits for a tap, other taps get a gentle nudge. Round 2 is free play; winning (or losing) shows "You're ready, hero" with Forge my hero.
- `dev/learn.mjs` walks the whole thing (home -> lessons -> guided battle -> done) and screenshots each step into docs/tutorial/.

## Team play: the slowest hero draws the attacks (Oct 2026)

- Was: highest Feet = the "leader" who took the double share. Now (Dave): lowest Feet draws the attacks; a tie goes to more
  health right now, then a coin. `heatRank` in engine.js; initiative (`rankFighters`, highest Feet first) is unchanged.
- Bind, drain and stolen purses land on the same hero. Battle banner each round: "MONSTERS TARGET <NAME> · SLOWEST FEET"
  (round 1 included). Report line, How to play, the shared-phone tip, TEAMPLAY.md and BALANCE.md updated.
- Tanks score (Dave): a blocked point is worth 1 (was 0.5). In team games the targeted hero is the company's shield: blocks
  count 2 each and "Held the line" +10 if a monster swung at them and they are still standing (banner + report line).
- Dice roll playback at half speed (ROLL_PLAYBACK 0.5 in gfx/dice/roll.js): a roll now takes about 1.3 s instead of 0.67 s (dev/rolltime.mjs).
- Heal symbol on talent dice is 1 for 1 with the hand's number (was 2x; Dave). Sim (3 acts, 15 campaigns, smart): still 14/15
  cleared; boss wins per try Act I 93->98%, Act II 82->76%, Act III 82->72%, ending health a few points lower. Watch Acts II-III.

## Symbols one for one, potions bought at camp, camp gear panels (Oct 2026)

- Every talent symbol pays the hand's number, one for one (gold was half). Clear: one symbol = one per point of Strength.
- Potions: carried from battle to battle (hero.potions), bought at camp in a Supplies panel above the tabs: 10 / 20 / 30 gold
  in Acts I / II / III, healing 10 / 15 / 20; belt holds 2 (3 with the Potion belt). New heroes start with 2; older saves
  arrive full. Company and online table too (`{type:'potion'}`). Sim bot restocks at every camp.
- Sim, 3 acts, 15 campaigns (`docs/balance/run_potions_gold1to1.txt`): cleared 15/15 (was 14/15); boss wins Act II 76->83%,
  Act III 72->77%; gold in hand at the Act III boss 472 -> 306 (potions cost real money, gold symbols pay more).
- Strategy study (`tools/strategy.mjs`, BALANCE.md): reading the box beats all-attack everywhere; a shield in one hand halves
  health lost in ordinary fights; bosses even it out.
- Camp Gear tab: three panels with their own look and a centered heading on the top edge: On your body (gold), Your pack
  (leather), The traveler (teal).

## Phase 1 of the review: metals and temperaments (Oct 2026)

- Weapons in three temperaments, all summing to 8 at d4 Bronze (about +2 a roll): steady 1,2,2,3 (Dagger, Bracer, Bow),
  balanced 0,2,3,3 (Sword, Shield, Staff), risky with two blanks (Spear 0,0,4,4 piercing; Mace 0,0,3,5; Tower Shield
  0,0,4,4 blue; Long Sword 0,0,4,4; War Hammer 0,0,2,6). Eleven weapons; the three new ones have 3D models in gfx/weapons.js.
- Metals raise numbers: Silver +1 on the lowest face, Gold +1 on the second-highest, Diamond +1 on the top (faces chosen
  from the Bronze layout, so three different faces), plus the corner abilities as before. Every weapon: 2.00 -> 2.75.
- dev/newweapons.mjs and dev/holdweapons.mjs screenshot the cards and a hero holding them.

## Phase 2: three power slots (Oct 2026)

- Each class has six powers in its library (data.js CLASSES.cards, `slot` A/B/C, one `start` per slot): A a big move
  (once a battle; the level-5 supers are A choices), B every round, C a charge (1 magic a round stores a charge, up to 4;
  release for `per` each: attack, block, heal, pierce or gold). hero.powers = { A, B, C }; hero.learned.
- Camp Forge tab: a panel per slot with the equipped power (upgrade) and the other power to Learn (50 gold, supers need
  level 5) or Swap in. Battle sheet: A/B/C badges, then Healing (potion, heal with magic), then Heart die.
- Engine: cardsOf = the three slotted powers; powerLibrary, learnInfo, learnPower, equipPower. Sim bot releases charges.
- Not yet on the online table's camp (it never had power upgrades); online heroes use their start powers.

## Phase 3: class identities (Oct 2026)

- Same nine dice for all; classes differ in health, speed (feet), strong hand, weapons and magic (data.js CLASSES):
  Knight 34 / d4 / left d6 / Sword + Shield / 4 magic. Dwarf 40 / d4 / left d6 / Mace + Tower Shield / 3. Ranger 28 / d6
  (the only class that can train feet to d8) / Bow / 4. Bard 30 / d6 / Dagger + Bracer / 5. Wizard 24 / d4 / Staff / 6,
  holds 15 magic, Heal with magic gives 6, powers upgrade to level 3 (POWER_UPGRADE 60 / 140 / 260).
- Engine: startMagicOf, magicCapOf, healAmountOf, powerLevelsOf, maxFeetOf. Creation screen: a trait line and four meters
  (Health, Speed, Strength, Magic). progress-all.sh prints clears by class.
- Balance after Phase 3 (progress-all 3 acts, 4 campaigns a class, smart bot): 19/20 cleared; bard, dwarf, knight and
  wizard 4/4, ranger 3/4.

## Phase 4: legendary weapons (Oct 2026)

- Six named legendaries in WEAPONS (`legendary: true`, `model` = the ordinary weapon whose 3D shape and poses they borrow):
  Dawnbreaker (sword; its 4 hits every other monster for 2), Oakheart (shield; blue 3 and 4 heal 2), Thunder Spear (every
  red face pierces 1), Fortune's Dagger (never blank; a 3 pays 3 gold), Starfire Staff (two-handed; magic on every face),
  Twinfang Bow (two-handed; twin shot +3 attack when bow and arrows match). About +10 at d4, faces fixed.
- Found only in elite (6%) and boss (15%) spoils, +3% on the perilous road, and from Act II the traveler carries one 5% of
  the time; never one somebody in the fight already carries. Rarity 3 on the instance (for visuals), tierName 'Legendary'.
- No forging (forgeInfo why 'legendary'); training a size works. Worth their price (no metal multiplier).
- One legendary in your hands at a time: canEquip / equip refuse a second one-handed legendary in the other hand (a toast
  says why; the online table returns the same reason). A two-handed legendary fills both hands.
- Looks: createWeapon maps a legendary to its model with a warm gold crystal and halo; cards get a gold Legendary banner,
  shine, and always show their rule. Splash shows as a burst corner on the die.

## Phase 5: company looks (Oct 2026)

- data.js HERO_LOOKS: each class has its own colours plus two alternate sets (Knight: Crimson, Steel blue, Black and gold;
  Ranger: Forest, Autumn, Stone grey; Wizard: Sky blue, Violet, White and gold; Dwarf: Ember, Moss, Deep blue; Bard: Teal,
  Plum, Sunflower). lookIndex(heroes, i) = how many heroes of the same class stand before this one (wraps after three).
- hero.js create({ look }) swaps cloth, trim, accent, glow and hair; the Knight's tabard and the shield emblem follow the
  cloth colour. world.buildBattle passes each company hero's look. Battle roster chips carry the look's colour.
- dom.js h(): style keys starting with `--` now use setProperty (custom properties never applied before, so class emblem
  hues, list stagger delays and health bar ticks now show as designed).
- Balance after Phases 4 and 5 (progress-all 3 acts, 4 campaigns a class, smart bot): 19/20 cleared, the same as after
  Phase 3 (ranger 3/4, the rest 4/4). Bosses win 94% / 84% / 79% by act; legendaries did not tip the curve.

## Tension (Oct 2026)

- Standard road hits harder: data.js ORDINARY { flat: [3, 4, 1] by act, lone: +2 }, via engine standardFlat; not the
  perilous road, elites, bosses or the first lesson fight. tools/tension.mjs measures it.
- New monster moves: Fire Ward (cultist, v 'ward', burns the hitter; burnOf), Stalk (wolf, v 'stalk'; unhurt -> Pounce
  next round from MONSTERS.wolf.pounce; settleStalks), Phase (wraith, v 'phase'; only pierce hurts). Solo and company.
  Intent plates: 🔥N, HIT!, ◆ONLY; the monster sheet and the coach hints explain them. Bot targets stalkers, avoids wards.
- Fixed: the wind-up box said "deal undefined to break" (stagger was removed earlier); it now says "brace with block".

## Straight glow and a simpler monster sheet (Oct 2026)

- evaluate returns `straightSlots` (one die per number, low to high). tray.setStraight lights those sockets magenta
  (STRAIGHT_GLOW 0xff3ec8, a colour nothing else on the board uses): the socket band, a wider breathing ring and a halo.
  Set in renderShape, cleared in renderReset.
- Monster sheet (tap a monster twice): name, a stat line (health, speed), a big "Next" card in the move's colour with one
  sentence on how to get ready (readyText), then the other moves as small chips, each listed once.

## Home button with "Are you sure?" (Oct 2026)

- A house button sits in the top corner beside help and sound (`#home` in index.html, icon `home` in js/g3/icons.js),
  shown whenever a game is open (hidden on the title, on creation screens and on online tables, which keep their own
  "Leave this phone"). ui.js askHome() asks first: on the board, camp or road "Go home? Your hero is saved"; mid-fight
  "Leave this fight? ... it starts over from the quest board. Potions you drank stay used"; in practice "Leave practice?".
  Go home = stop the battle if one is running, persist, showTitle. Continue then picks up at the quest board.
- The board Menu's "Save & return to title" and the battle menu (new "Go home" item, and "Leave practice") use the same pop-up.
- battle3d win()/lose() check B.ended, so leaving mid-round never pops a victory or defeat screen over the home screen.
- dev/home.mjs tests it in the browser (create a real save with save.js createSave, or Continue has nothing to show).

## Story thread, story card, monster pictures (Oct 2026)

- `js/story.js` (pure, tested in test/story.test.mjs): the Dawn Lantern kept the Marches safe; the Goblin King stole its
  flame out of greed (Act I), the Hollow Lich drained it from below out of cold emptiness (Act II); the heroes carry the
  light home ("The light shines in the darkness, and the darkness has not overcome it"). Beats: a prologue / act opening at
  quest 1 (after the last act's closing), a beat before the elite (quest 5) and before the boss (quest 10). The Ascents
  (act 3 on) get their own openings, boss lines and a short closing. Seen beats live in campaign.storySeen ("id@act").
  Edit the words in BEATS; keep it free of anything occult.
- ui.js showRoadOrBoard shows a pending beat first (not online, not in practice), then the road event, then the board.
  The board Menu has "The story so far" (every beat up to here). Screen: scrui.story().
- Dave did not love the parchment scroll: road events and story beats now use `storyCard` (scrui.js; CSS .sx-tale): a
  dark page with a double gold frame, a crest icon on the top edge, gold kicker, cream title, gold drop cap.
- Monster sheet (tap a monster twice) shows a picture of the monster: from the front, head and shoulders; the wolf and
  spider at a three-quarter turn so face and body both read (ui.js battleCtx().portrait -> screens portraitQ.monster with
  yaw/fit; drawn in the background at battle start, then cached).
- dev/story.mjs screenshots all of it.

## The Quest Dice knight: home screen and link preview (Oct 2026)

- Dave supplied the brand art: a knight built from dice (red attack, blue shield, green heal, purple magic, gold heart and
  feet ring) above "QUEST DICE" in bronze. dev/brandcut.mjs cuts it from its black background into assets/brand:
  knight.webp, quest.webp and dice.webp (the words alone, for stacking), logo.webp (the one-line logo with flourishes).
- Home screen (scrui.js logo(), CSS .sx-brand / .br-*): the knight with QUEST over DICE beside him and the tagline under
  the words, on phones and wide screens. The title 3D scene no longer adds a 3D hero (the orchard, embers and fog stay).
- Link preview (what Messages shows for a texted link): index.html og:/twitter: tags point at assets/brand/og.jpg
  (1200x630, knight + words + tagline). iPhone home-screen icon: assets/brand/icon-180.png. Messages caches previews,
  so an old text of the link may stay plain. The earlier preview options A-H live in docs/ingame/preview_option_*.png.
- Tagline (Dave, 10 Oct): **"Roll against the dark."** (was "Roll your body. Break the dark."). Home screen, classic title,
  index.html description and og:description, and the link-preview picture assets/brand/og.jpg.
- 10 Oct: Dave's second knight (sword raised, cross shield) replaced the first: assets/brand/knight-sword.webp (renamed so phones never show a cached old knight), cut by
  dev/knightcut.mjs. The home screen brings him to life (scrui.js logo(), CSS .br-*): smaller, he breathes, his heart
  beats, his dice symbols glint one by one (KNIGHT_SPOTS = % positions on the picture), light sweeps his armour, his sword
  tip twinkles, and five of the game's own dice (white, gold heart, red, blue, purple talent) float and spin around him as
  little CSS 3D cubes (Fleet Dice style). Reduced-motion users get a still picture. The link preview og.jpg and the iPhone
  icon use the new knight.

## Rerolls: 3 dice, and a 4th bought at camp (Dave, 10 Oct)

- Each reroll takes up to 3 dice (data.js REROLL_DICE 3); 3 free rerolls a round, then 3 paid at 1 magic a die (unchanged).
- Camp Forge tab, "Reroll hand": buy a 4th reroll die once for 200 gold (REROLL_DIE_COST; engine rerollDieInfo /
  buyRerollDie; hero.rerollDie). Cap 4 (REROLL_DICE_MAX).
- Quick Hands perk retired (no longer offered); heroes who took it keep +1 die, capped at 4. Sim bot buys the die at 230+ gold.
- Balance (progress-all, 3 acts, 4 a class): 20/20 cleared, every class 4/4; bosses 90% / 82% / 88%.
- 10 Oct: the home screen's floating dice are now the game's real dice (Dave): the sword's red d4 and the shield's blue
  d4 weapon dice, a d6 Strength die, a purple d4 talent die and the gold heart die. dev/dicefilm.html + dicefilm.mjs film
  each real 3D die (engine dieSpecs + dice.js createDie) through a full turn into a 32-frame strip
  (assets/brand/die-*.webp, about 80 KB each); scrui.js floatDie plays the strip as a sprite while it bobs and drifts.
  Re-film after a change to the dice look. Sizes scale with the knight (CSS --dk).
- 10 Oct: "How to play" renamed **Rules** everywhere (home screen link with a scroll icon, board/battle/room menus, the ? button, the sheet title), so it is not confused with "Learn to play" (the lessons and practice battle).
- 10 Oct: the floating dice moved behind the knight and made smaller (about 2rem, slightly dimmed), peeking out around his helmet, sword, shield and legs; none float in front of him any more.

## Pets (Dave, 11 Oct)

Dave: "a traveler can have one and you can pay for it... a single die... train it like a talent die... one side is always
blank... cute and coloured by their starting symbol... placed in the black area to the left of the dice board."
- Six pets (data.js PETS), one per symbol and in its colour, from Dave's own pictures (11 Oct): Ember (black dragon, attack,
  red), Bristle (hedgehog with a spear, pierce, orange), Shellback (armoured turtle, block, blue), Sprig (bunny in a leaf
  cloak, heal, green), Starling (owl in a wizard's hat, magic, purple), Penny (gold dragon on coins, gold). Sources in
  assets/pets/src/*.jpg; dev/petcut.mjs cuts them (flood-fills the black from the edges, threshold 6, so the black dragon
  keeps its body) into assets/pets/*.webp (about 30-45 KB); dev/petcutsheet.mjs checks them for halos
  (docs/ingame/pets_cut.png). The first pets' ids 'pup' and 'magpie' are hidden aliases of Ember and Penny for old saves.
  Bristle's pierce is a symbol talents lack: a pet may always train its own symbol (addPetSymbol), and the picker adds it.
  In battle each pet has a soft glow in its colour behind it, so the black dragon still shows on the dark.
- Rules (engine.js, tested in test/pets.test.mjs): hero.pet = { type, size, faces }. The traveler offers one pet a camp,
  picked by the campaign seed (petOffer); PET_PRICE 90. A pet is a d4: face 1 always blank (it shows a paw), faces 2-3
  start with its own symbol, face 4 empty. Train it like a talent die (addPetSymbol, 25 gold a symbol, two a face): its own
  symbol up to one per side of the die (petKindMax: 4/6/8), any other symbol twice. Grow it to d6 (80 gold) and d8 (180).
  Each symbol on the face it rolls pays PET_POWER (2 on a d4, 3 on a d6, 4 on a d8): a fully grown pet averages 4 of its
  kind a roll. Buying another pet trades the old one (after an "are you sure"); training does not carry over.
- The pet die is slot 'P' (ROLE.P = 'pet'), active only with a pet. Without one it is never rolled (rollBoard skips it, so
  everyone else's dice stream is unchanged) and can never be tangled. It rerolls like any die.
- Camp: Gear tab, the traveler's panel ends with the pet offer (Adopt / Trade). Forge tab, "Your pet" after the talent
  dice: face strip (face 1 "blank", then symbol slots), the same picker as talents, and Grow. Without a pet, a hint row
  points to the traveler.
- Battle (tray.js): a small wooden stand with a brass-rimmed dish at PET_HOME (x -3.01, z 0.62), the pet as a camera-
  facing sprite behind it (it bobs, and hops when its die lands), the die drawn a little smaller (PET_SCALE). Dice themes
  'pet-atk' etc. in faces.js (a deep shade of the pet's colour; paw on face 1). roll.js: a die can carry its own walls
  (`box`), so the pet die tumbles inside its stand. battle3d.js fitTray: with a pet, the camera centres the pet and the
  board together and keeps the stand on screen (the board stays nearly full size). The caption explains the pet face.
- Not in online rooms yet (their camp has no pet shop, and their 2D boards show nine dice).
- Screenshots: docs/ingame/pet_offer.png, pet_train.png, pet_battle_740.png (iPhone with Safari bars), pet_battle_tall.png
  (grown d6 turtle), pet_battle_wide.png (d8 owl), pet_selected.png. Scripts: dev/petcamp.mjs, dev/petbattle.mjs,
  dev/petreroll.mjs. The sim bot adopts, trains and grows pets (tools/sim.mjs botPet; QD_PETS=0 turns that off).
- Balance (tools/tension.mjs 30, all classes): without pets the standard road wins 99%, takes 49% of health, 9% close
  calls; the perilous road wins 88%, 42% close calls. With the bot adopting pets: standard 99% / 43% / 6%, perilous 95%
  win / 30% close calls. Pets make ordinary fights noticeably safer. Dearer growth (150/300, try it with
  TUNE_PETGROW=150,300) made no difference: the d4 pet itself does it. Left as Dave asked for it; if fights feel too soft,
  the dials are ORDINARY (data.js) or PET_POWER. Ask Dave.

## Learn to play 2.0 (Dave, 11 Oct)

Dave: "use the empty dice board to show the head feet hand for the tutorial... we have a logo character, pets, a dice board
with icons where the dice go. Consider the visuals and a new player. Make it AAA."
- The lesson pictures are now stills of the game's real dice tray (dev/trayshot.html + dev/trayshot.mjs, needs the dev
  server): board-icons (every socket's medallion: sword, helmet, gauntlets, heart, talent, boots, EMPTY), board-start (a
  new Knight's first roll), board-final (the Strength Triple), board-tripW / tripH (the other triples), board-petIcons /
  petDice (Sprig on her stand), and d-<slot> layers (one die alone, same camera) so dice can drop into their sockets one by
  one. The script trims the empty top, writes assets/tutorial/board-*.webp and js/g3/tutboard.js (each socket's place in
  % of the picture). Re-run it after a change to the tray or dice look.
- tutorial.js boardPic(): base still + dice layers (drop animation) + glowing socket rings (the rest dims) + name tags +
  a triple's line + tappable sockets. Lesson 2 is a board explorer (tap a socket: what goes there).
- The Quest Dice knight is the guide: a portrait and speech bubble on every lesson (L.say), the full knight with the real
  floating dice on Welcome, Ready and the practice-complete screen.
- Lessons: Welcome, Your board (tap a socket), Head hands and feet (white dice drop into the four sockets; what 1-4 pay),
  Hands are your Strength, Weapon dice, Talent dice, The heart, Feet are your speed (feet vs the goblin's die), Six
  counters, Triples and straights (three real boards with glowing lines), How a round goes, Grow at camp (pets, potions,
  powers: Sprig's stand and all six pets), Ready. The practice battle and its guide are unchanged and still pass end to end.
- Screenshots: docs/tutorial/390x844-L01..L13.png, 390x664-L02-tap.png (dev/learn.mjs, dev/learntap.mjs).

## Hero choice screen: brighter, and the hero turns to face you (Dave, 11 Oct)

- Dave: the top of the screen was dark, and the hero slowly spun until you saw his back. screens.js create(): vignette
  0.7 -> 0.28 and exposure 1.14 (on a phone only the top of the picture shows above the panel, where the vignette was
  darkest); a rimKit fill from the camera side lights the hero's front; the camera ('s-create') sits a little higher and
  further back.
- Each hero now arrives turned to the left (yaw -1.3) and turns to face you over about two seconds (FRONT 0.22), then
  sways gently around facing you. The old endless slow spin is gone. Dragging still turns him; let go and he drifts back.
- Screenshots: docs/ingame/after_*.png (dev/createpick.mjs).
- 11 Oct: the big farmhouse blaze behind the hero is gone on the menu screens (Dave: it washed the hero out). buildArena
  takes `quiet: true` (screens.js arenaFor passes it); Burnt Orchard then keeps the burnt farmhouse but skips its five
  tall fires and their big glow. Battles in the Burnt Orchard still burn. (Note: in headless Chromium the home screen's
  3D backdrop often stays black even on older commits; that is the test browser, not the game.) Screenshots:
  docs/ingame/quiet_*.png.
- 11 Oct: heroes' feet were sunk about 12 cm into the ground (most visible on the hero pedestal): the standing poses
  bend the knees and the boot soles sit below the ankle joints. hero.js lifts the figure (a.model.position.y = FOOT_LIFT,
  0.115 m); the shadow blob stays on a.root at ground level. Measured with dev/feetcheck.mjs (every class now within
  about 1 cm of the pedestal top). Screenshots: docs/ingame/feet_closeup.png, feet_battle_hero.png.

## Battle polish: banner fits, heart once a round, dice powers roll in a window (Dave, 11 Oct)

- Banners ("YOU STRIKE FIRST ⚡3", "THE COMPANY STRIKES FIRST") were wider than a phone. hudkit.js banner() sets --n (the
  label's length) and hud.css sizes the text to fit: min(old size, (100vw - 6.5rem) / (n * .7)). Measured 35..355 px on a
  390 px screen, and inside the screen at 375 px too.
- Heart change (turn the heart die up/down) is once a round: engine nudge() marks b.board.nudged (each hero's own board in
  a company game, so each has their own); E.nudgedThisRound(b). The power card says ONCE A ROUND, then USED. Test updated.
- Dice powers (Arc Bolt, the 2d6 powers, Lucky Verse's d6) now open a small window (battle3d.js diceRollPopup): the dice
  (d4 triangle / d6 square / d8 diamond, in the colour of what they add) tumble in with a dice-roll sound, land one by one
  with their numbers, the total counts up, the counters it adds show as chips (+13 Attack), and an "Add 13 to my roll"
  button closes it; the counter it filled pulses. The rules are unchanged (the roll already happened in the engine).
  Non-dice powers still use the banner. Script: dev/arcbolt.mjs (docs/ingame/arcbolt_landed.png, banner_fit.png).
- 11 Oct: the triple notes above the battle buttons always sit in one row now (a second row covered the buttons). Two
  triples sit side by side, half the width each, with short names (WEAPONS! / STRENGTH! and "Triple · +10 attack"
  under them); all three at once become one banner right across: TRIPLE TRIPLE TRIPLE! with the total (+20 attack ·
  +10 block). hudkit.js synergyList / setNotes (--n), hud.css .fs-notes. Script dev/triples.mjs
  (docs/ingame/triples_one/two/three.png).

## Magic powers: the triangle sigil and a reveal for every power (Dave, 11 Oct)

Dave: "the magical powers are half of the enjoyment of playing the game... a purple triangle with a circle at each point;
each one should feel special once you click the button."
- New module js/g3/powers.js. sigil(ctx) builds the powers sheet: a glowing purple triangle (SVG, edges that flow toward
  the chosen point, slow rune circles, rising motes) with the three slots as medallions at its points (A top, B lower
  left, C lower right), the magic you hold in the middle, a detail panel for the chosen power (slot, when it works, what
  it gives as chips, a plain line, the - / + magic stepper for scale powers, Release for charges, Cast / Store / Recharge)
  and an "Always ready" row (Potion, Heal, Heart) that opens in the same panel. Medallion states: ready (pulsing),
  low magic, used, locked (ROUND 3+), recharge; charge powers show their stored pips under the ring.
- Every power has its own picture (glyph(k), POWER_GLYPH: lightning for Arc Bolt, comet for Meteor, crosshair for Aimed
  Shot, mountain for Avalanche/Stonehide, music notes for the Bard...).
- castReveal() runs after every cast (battle3d.js doCard): dice tumble and land (dice powers); Lucky Verse's d6 lights its
  row of the 1-2 / 3-4 / 5-6 table; a flat power stamps its bonus; Grudge/Meteor light one pip per round and count up;
  storing a charge fills a pip ("release now for..."); releasing bursts the pips one by one while the totals count; a super
  flashes, shakes and shows the hit on every monster. Tap the card to hurry it; OK (or the backdrop when done) closes.
  The counters it filled pulse. Rules unchanged.
- battle3d.js: cardTiles() returns the sigil (works in the company sheet's Powers tab); renderSheet(); the old card grid
  and dice popup are gone. hud.css: "MAGIC POWERS: the triangle sigil" and "the reveal" blocks. The sheet stays under the
  top buttons; on short phones the cast button sticks to the bottom of the sheet.
- Scripts: dev/powers.mjs <cls> (sheet + every slot's reveal + release + super), dev/powersreset.mjs (before the roll).
  Screenshots: docs/ingame/powers_<cls>_*.png, powers_reset_*.png, powers_company.png.
- 11 Oct, round 2 (Dave): everything on screen at once, no scrolling. The sheet now runs from the top of the screen to
  the counters (the round title and the home/help/sound buttons hide while it is open, CSS :has), the triangle is 30%
  smaller, the helpers sit in a row right under the triangle as solid coloured buttons when usable (Potion with "2 LEFT",
  Heal and Heart change with the same purple cost badge as the powers), the chosen power's panel shows its cost badge
  by the title, and the top-right button is "✕ Cancel". dev/powersfit.mjs <cls> <w> <h> picks every medallion and helper
  and reports any overflow (0 px at 390x664, 430x739, 390x844 for wizard, knight, bard).


## Powers audit, and a company-game fix (11 Oct)

- Audit: every one of the 30 class powers (5 classes x 6) was equipped, cast at round 3 and resolved against three
  monsters in the engine: each spends the right magic and adds what its card says (dice, scale, round, luck, flat,
  charge store/release, supers' hit on every monster, splash).
- Bug fixed (engine.js): in company games (one phone and online) "every round" powers only worked once a battle and charge
  powers could store only one charge, because `usedRound` and `charge` lived on the shared battle and were never cleared;
  two heroes of the same class also shared them. They are now each fighter's own (MIRROR, newPartyBattle) and
  beginPartyRound clears usedRound. Test: "company: every-round powers come back each round" in test/party.test.mjs.
- Found, not changed (ask Dave): Quick Draw's free 2-dice reroll is used before the normal 3-dice rerolls, so with 3 dice
  already picked the Reroll button refuses with "Not enough Magic"; Potion and Heal grey out at full health without saying
  why until tapped; Meteor (wizard A, level 5) is a 'round' power, so unlike the other level-5 supers it can be recharged
  and does not hit every monster; Lucky Verse's 1-2 (magic only) still says "Add it to my roll"; docs/POWERS.md is out of
  date (it lists the old four-power table and "stagger").

## Magic powers, round 3 (Dave, 11 Oct)

Dave (iPhone screenshot): a power was already open when the sheet opened, so it was not clear you pick one above; the
helpers should look like the triangle's powers; the sheet's purple border cut through the Cast button.
- Opens with nothing chosen (battle3d togglePowers clears B.pwSel). The panel says "Tap a power to choose it" with a
  bobbing arrow (powers.js, .pw-pick).
- Potion, Heal and Heart change are round medallions in a row under the triangle (.pw-umedal: the same ring, core, cost
  badge and name as the powers, a little smaller, no breathing), with their own pictures (flask, heart with a plus,
  heart with up/down arrows) and a tag when they cannot be used: FULL HP, USED, NONE LEFT.
- The cut-off border: iPhone Safari's vh is the screen with its bars hidden, so the triangle (sized in vh) was about 15%
  bigger on the phone than in the test browser. Sizes now use svh (the visible screen), with a floor so the triangle
  stays readable. The sheet scrolls instead of clipping, its title and Cancel stay pinned, and choosing a power scrolls
  its Cast button into view on short screens.
- Test browser now loads the real web fonts through the sandbox proxy (dev/powersfit.mjs passes --proxy-server when
  HTTPS_PROXY is set; Playwright's own proxy option sends localhost through the proxy too, so use the Chromium flags).
  Usage: node dev/powersfit.mjs <cls> <w> <h> [outdir]. At 393x667 (Dave's iPhone with Safari bars) and 430x739 nothing
  scrolls; when a straight chooser or a two-line hint makes the sheet shorter, or on a 375x600 phone, it scrolls 25-70 px
  and stays whole. Shots: docs/ingame/powersfit_wizard_393x667_*.png, powersfit_wizard_375x600_C.png.
- Not checked on a real iPhone yet (Dave).
- 11 Oct, round 4 (Dave): the sheet reaches down to the top of the counter boxes (battle3d sheetToCounters measures the
  first .fc when the sheet opens and sets --counters-top; it used to stop above the whole bottom panel). About 20 px
  more; at 393x667 every power fits with no scrolling.
- A larger triangle behind the three powers (powers.js `aura`, CSS .pw-aura / .pa-*): glowing edges with two sparks of
  light running round them, a breathing glow inside, a soft pulsing light at each point, sparkles drifting up. One
  upright triangle only (two crossed triangles would make a six-pointed star). Background only, no taps; still with
  reduced motion.

## Arc Bolt toned down (Dave, 11 Oct)

Dave: "too strong, it almost killed the dog on the first shot." It was 2 magic for 1d8 and +1 die per extra magic (6 magic
= 5d8 on round 1). Now every die after the first costs 2 magic: 2 = 1d8, 4 = 2d8, 6 = 3d8, 8 = 4d8, 10 = 5d8, never more
than 5 dice. Data: `step: 2, max: 10, maxDice: 5` on the card. Engine: scaleStep / scaleMax / powerCost(card, x, lvl) /
powerDice (shared by the sheet's stepper, its text and the cast); power levels still add a die, but the 5-dice cap holds,
so an upgraded Arc Bolt reaches 5d8 for less magic (level 1: 8 magic). Aimed Shot (ranger) is unchanged (1 magic a die).
Test: "Arc Bolt: 2 magic a die" in test/engine.test.mjs. Balance tools not re-run for this change.
- 11 Oct (Dave): the magic you hold moved out of the triangle's middle into a glowing badge in the open space to its right,
  under Cancel (CSS .pw-center override at the end of hud.css; left 138% / top 18% of the stage).

## Small looks and words (Dave, 11 Oct)

- Piercing Pips now reads "Each white body die that rolls pierce pierces +1 more." (was "Each 2 you roll on a cardinal
  die"; the rule always counted every head/hand/feet face that pays pierce: 2, 6 and 9). Still worth fixing if Dave
  agrees: Frugal Mender says "the Heal card" (it is a button now); Keen Edge / Ironward say "lane".
- Heart die: the green heal cross and the orange pierce arrow are 20% thicker (faces.js mendBold / arrowBold, used only for
  the big symbols via drawSym's `fat`; the small corner symbols on the white dice are unchanged). docs/ingame/heart_bold_compare.png
  (top before, bottom after). The home screen's filmed heart die (assets/brand/die-*.webp) and the tutorial board stills
  were not re-filmed.
- Tangled dice: bright silver chains with a soft self-light (tray.js chainMat; were dark grey with a purple glow and read
  as black), a silver hexagon under the die instead of the dark purple one, and the tangled die is dimmed 25% instead of
  60%. docs/ingame/tangled_silver_compare.png (left before, right after).

## Victory faces the hero; one menu button (Dave, 11 Oct)

- Victory camera: the shot 's-victory' was fixed at the landscape hero mark, so on phones (hero in the foreground at
  -1.6,0,2.6) it looked at the hero's back from far off. screens.js aimAtHero builds the shot from where the hero really
  stands and how tall they are (head anchor + 0.6 m for raised hands and hats), the hero turns round to face the camera
  over about a second while playing 'victory' (arms up), the battle's framing pan is cleared and the empty dice-table pass
  is switched off (it left a dark band under the picture). docs/ingame/victory_face_phone.png (wizard, knight at 393x667),
  victory_face_wide.png.
- One button on screen: the corner Home / Rules / Sound icons are gone (CSS hides them; the elements stay for old code).
  Battle menu and quest-board menu gained "Sound: On/Off" (they already had Rules and Go home). Screens without their own
  Menu (title, hero choice, camp, victory, defeat) show a single menu button top-left (#gmenu, ui.js globalMenu: Rules,
  Hints, Sound, Save & go home). syncHome hides it when the screen has its own Menu (.b3-menu, .sx-menubtn,
  .screen-menu). The top bar no longer reserves the right side for the icons; camp's title and hero choice's Back step
  right when the corner button shows. docs/ingame/one_menu_button.png (title, create, board, camp, battle, victory).
  Not checked: online room screens (flat UI), defeat screen, Learn to play (its layer sits above the corner anyway).
- 11 Oct (Dave): the hero chip (name, level, gold) stays in sight while a phone screen scrolls, since the choices need
  the gold. Road, story and board: screens.js scrolled() still slides the picture's overlay up with the page but leaves
  the top bar that holds the chip where it is. Camp (chip inside the scrolling sheet): .sx-sidetop:has(.sx-chip) is
  sticky at the top with a dark band behind it, and steps right of the corner menu button. docs/ingame/chip_pinned.png.
- 11 Oct (Dave): phones' battle shows your gold in the top-right corner right above the magic badge, the same badge in
  gold (battle3d hud.goldchip, class .b3-magchip.b3-goldchip; hero.gold, or the company's gold in a company game; it is the
  gold you carry, not this fight's takings). The round title stops short of it (.b3-top right 5rem).
  docs/ingame/battle_gold_chip.png.

## The pet leaves the board for a badge (Dave, 11 Oct)

Dave: "I like the dice board in the center... the pet can be small... you can't reroll it, it is just one time luck... a die
that shows up small by the gold and magic." This replaces the pet stand described under "Pets" above.
- Rules (engine.js): the pet die still rolls with the board every round and still pays (petFace x PET_POWER), but canReroll
  refuses 'P' and monsters never tangle it (tangle candidates skip 'P'). Test in test/pets.test.mjs.
- Board: tray.setHero always calls setPet(null), so no stand, sprite or die beside the board; fitTray no longer widens for
  a pet, so the board is centred again. (The stand code in tray.js stays, unused.)
- HUD (battle3d hud.petchip, renderPet, CSS .b3-petchip): phones, left of the magic badge; wide screens, the top-right
  corner. The pet's picture and a small die face in its colour: each symbol it rolled with its value (e.g. a green plus
  and 2), "–" for a blank, "?" before the roll; it pops when it lands. Tap: a toast with what it rolled.
- Learn to play, camp lesson: the board picture with Sprig's stand is gone (the six pets row stays) and the line now says
  the pet rolls a little die of luck every round, up by your gold and magic. The lesson stills (assets/tutorial/board-pet*)
  are unused now.
- Screenshots: docs/ingame/pet_badge_phone.png, pet_badge_wide.png. Online rooms never had pets.

## Playing together, rebuilt (Dave, 11 Oct): each hero on their own phone, in the 3D game

Dave tried the online rooms with a friend and found the old flat screens. Decision: **no one-phone group game any more**;
only rooms where everyone has their own phone. A single hero on one phone is still the solo game. Full design and file map:
**docs/MULTIPLAYER.md**. Summary:
- Removed: "A company on one phone" (title chooser, `showCreateCompany`, saved one-phone companies are hidden from the lists).
  "Play together" goes straight to Open a table / Join a table.
- New: `js/session.js` (this phone's copy of the table), `js/g3/online.js` (the room director). Every view now carries
  `view.state`, the whole table as text without seat tokens (`savePublic`); `server.mjs` and `cloud.js` both send it.
  The 3D screens read the copy like a solo hero (S.hero, S.company, S.battle point into it).
- Lobby in the 3D camp style (code in big letters, Invite, heroes with ticks; the host starting is their own ready); the
  hero choice screen is reused (`create({ table })`). Road, story and board are the solo screens plus a company bar.
- Battle (`battle3d.js`, `B.net`): every action is a command, other heroes' moves arrive as new tables, "Locked in, waiting
  for X" with Unlock, the host can skip a hero; when the last hero locks, every phone plays the same round report
  (`playParty`, split out of `performParty`). New commands in table.js: `drink` (own potion), `card` with `x` and `release`
  (Arc Bolt dice, charges), `op` (camp changes by rule name, whitelisted), `push` (host moves a table on without a hero who
  went quiet). `lastCast` is now mirrored per fighter so power reveals work online.
- Victory: points/places, each hero picks a perk at once, spoils draft; camp: the full solo camp per hero with optimistic
  local changes (`X.netOp`), Ready, the host's "Go on without them".
- The seat is kept in `localStorage` (a closed tab finds its way back); player ids no longer contain part of a token.
- Tests: 119. Multi-phone browser scripts: `dev/room1.mjs` .. `room5.mjs` (two phones against `node server.mjs`, test cheats
  only with `QD_CHEAT=1`). The sandbox cannot reach Firebase, so the live Firestore path is untested here: Dave to try with a friend.
- Cleaned out (same day): `js/roomui.js` (the old flat room), the one-phone turn code in ui.js and battle3d.js
  (`setActive`, `lockParty`, `performParty`, `commit`), company saves in `save.js` (QD2 codes too), `scrui.partyVictory`,
  `dev/party3d.mjs`. The engine's party battle stays: the table uses it.
- Driven by scripts (two or three phones): lobby, story/road/board, a round, victory + spoils, camp purchases + ready, the next
  road (`dev/room1..5`); a reload mid-round returns to the dice (`room7`); a team potion and the host's retreat -> defeat ->
  camp (`room8`); three phones reach the battle (`room6`). `dev/solo1.mjs` checks a solo hero is still made.
- Still to do: landscape layout of the room screens; real death (all heroes down) is not driven by a script; real-phone
  latency (see the Firestore write-rate note in MULTIPLAYER.md); Dave's play test with a friend on the live site.
- Joining from a shared link (`?join=CODE`) fills the code box; the lobby's Invite adds `join=CODE` to a laptop table's address
  (online tables already carry it). `dev/room9.mjs` drives the link join and a real defeat (every hero falls) across two phones.
- Landscape (844x390) and desktop (1280x800) checked for the room's road, board and battle (`dev/room10.mjs`): all fit; the
  quest cards sit below the fold in landscape and scroll, as in solo.

## 2026-10-12 — Miniatures cleaned up (review of the Cursor/Grok PRs #2–#6)
The painted miniatures arrived with their studio backdrop, so on hero select the ranger was a huge cream card spilling over the sheet. Fixed: `dev/minicut.mjs` cuts every miniature out (edge flood of the cream backdrop, then a pass for the gaps between legs/bows, 2px erosion for a clean edge); originals live in `assets/miniatures/src/`, the cutouts replace the files the game loads. `.sx-hero-art` is now a flex box anchored to the bottom of the visible area (no grid-percentage overflow), the piece has a class-coloured pool of light and a drop shadow, and there is no animation beyond a short fade-in. Class chips and the brag board pick up the cutouts automatically. Monster `img` fields are still unused; the battle still shows the 3D actors (open question for Dave: convert them to flat standees?). `dev/minisheet.mjs` makes a contact sheet to check cutouts on a dark background. Shots: `docs/ingame/miniatures_*.png`.

## 2026-10-12 — The battle is a board game now (flat painted pieces, no 3D arena, a round card)
Dave: "No longer using all that 3D animation. Simpler, more like a board game at the top of the screen, and a simple way to see what damage I caused and why, and what was caused to me and why. A shake or slight tilt with a little spark is enough, then a pop-up of the attack, the block and the final damage for both sides."
What changed:
- **The top of the battle is DOM, not WebGL** (`js/g3/flat.js`, `css/board.css`). Heroes and monsters are the painted miniatures (cutouts in `assets/miniatures/`) standing on a calm felt table (warm for Act I, cold slate for Act II, deep red for Act III; a faint red light for bosses). Each monster has a card under its piece: name, health, and what it plans (icon + figure; a red tag over the piece for "SLAM NEXT ROUND" and the like). Tap a piece or its card to aim (a gold ring on the table); tap again for the monster sheet (now showing its miniature instead of a rendered portrait). A company overlaps its heroes on the left, the active one ringed and named in gold.
- **Pieces barely move**: a short lunge when they strike, a shake with a slight tilt and a spark when hit (blue ring when soaked, green for heal), knocked over when they fall, a small hop on victory. All time comes from the stage clock (`stage.tween`), so `?manual` screenshots still step it. The old arena, 3D actors, camera director shots and vfx are no longer used in battle (`world.buildTable` builds only the dice tray; the actor and arena code stays because the title, camp and hero screens still use it).
- **The dice tray is the only 3D left in battle.** Phones: unchanged fit. Wide screens: new `fitTrayWide` puts the table across the top and the dice between the hero panel and the controls.
- **The round card** (`js/g3/roundcard.js`): after every round, a card over the (empty) dice table, with the pieces and their next moves still in view above it. "You strike Goblin: 7 attack + 4 pierce = 11 damage, 30 -> 19", then each monster: "Wolf: 12 attack - 4 block = 8 damage", plus Guard / Passes through / Fire Ward / steals, and your health before and after, block used, healing. A company's card lists every strike in turn order, each monster's hit with each hero's share, and each hero's health. Tap to close; the "Last round" pill beside the round number brings it back. Built only from the engine's round report; no rules changed.
- Removed from battle: the plate strip, leader lines, readout log over the dice (`readout.js` is still used by the 2D fallback), 3D target ring, camera moves, particle vfx, framePan, ~90 lines of plate CSS in hud.css.
- Dev: `dev/battleshot.mjs` (a solo round, env HP1/STEP/N), `dev/partyplay.mjs` (plays a company round from a report via `B3.devParty`), `dev/montage.mjs` (contact sheet), `dev/minicut.mjs` / `dev/minisheet.mjs` (miniature cutouts). Screens in `docs/ingame/board_*.png`.
Open: monsters that were 3D-only (summoned adds look the same as others; fine). Ask Dave how the piece sizes feel on his phone; `SIZE` in flat.js sets how big each monster stands next to a hero. The shared-phone company path does not exist any more; company rounds play through `playParty` from online tables.
- (12 Oct, later) AAA pass on the board: framed felt table with a noise grain, a breathing lamp and a few drifting dust motes; a wooden front rail; a printed base circle and light pool under every piece; token plaques for the monster cards (health bar with ticks and shine, intent chip); a bobbing gold marker over the target; hazard flag on the piece's shoulder; long monster names read as their last word ("Skulker"); damage numbers outlined and bigger for 10+, a shock ring on every hit; the hero's health as an engraved rail; the round card framed in gold with rows that settle in one after another. Victory/defeat share the frame. Reduced-motion turns the ambient motion off.

## 2026-10-12 (late) — Company battles and the magic powers sheet, redone
- **Company battle layout** (Dave: "scale the miniatures for the team; use the far left for the team, the top for all enemies"): in a company the heroes stand small in a two-column block on the far left (names and health under each, the active hero ringed in gold), and the monsters take the rest of the top of the table, bigger. `css/board.css`, shot `docs/ingame/board_team6.png`.
- **Magic powers sheet** (`css/powers.css`, replacing ~160 layered lines in hud.css; markup in `js/g3/powers.js`): sized from the sheet's own height with flex and container-query units, never `vh` (on an iPhone `vh` counts the hidden browser bars, which is why it clipped on Dave's phone), so the triangle is whatever is left after the helpers and the panel. Calmer: no running sparks or drifting motes, one slow glow; the magic you hold is a small pill at the top right; the helpers (potion, heal, heart change) are three solid pills with the cost in the corner and the reason in small print when grey (FULL HP, NONE LEFT); the detail panel is one sentence plus the cast button (the chips that repeated it are gone). Checked at 393x852 and 375x667 with a power picked, a helper picked, and nothing picked: no scrolling, nothing cut off. Dev: `dev/sheetshot.mjs`.

## 2026-10-12 (night) — play-test of the new battle
Bot playthrough (knight, 6 fights at 393x852; wizard at 375x667), boss fights with every class against the Ogre, Goblin King and adds, the crypt trio, Bone Warden, Lich (`dev/bossrun.mjs`, new), the practice battle end to end, an online table round, victory and defeat screens. Found and fixed: (1) **a double tap on the quest card started two battles** and left the table frozen on its loading frame (`B3.start` now ignores a start while one is under way); (2) the **header's round title wrapped to two lines** when the Recap pill showed (pill is "Recap", header no longer wraps); (3) **stray gold frame and diamonds on boss and elite pieces** came from an old plate rule in hud.css (removed; elites and bosses get a warm glow instead). No console errors in any run; 126 tests pass. Still true: the bot is weak at Act I fight 3 (level-1 knight loses several times before it wins), unchanged by this work.
- (12 Oct, night) Dave's notes on the battle: the damage numbers on the pieces now stay up about 3.2 s (they were 1 s) and drift up slowly; the round card has two clearly different halves, a gold "Your strike" panel whose result is a green DEALT token and a red "The monsters strike back" panel whose results are red YOU TAKE tokens (blue BLOCKED when it all got soaked); and a "✕ Close" pill at the top right, the same pill as Cancel on the magic sheet (tapping the card anywhere still closes it).
- (13 Oct) The recap card is taller (it now reaches down over the counters and the hint line, stopping above the buttons), its rows are denser and never wrap, and if a very long fight still does not fit it shrinks a little rather than scrolling. Checked at 393x666 (an iPhone with Safari's bars showing) and 375x667 with up to four monsters. `dev/bossrun.mjs` now reports any recap that scrolls.
- (13 Oct) Monster details are now findable: a small gold "i" badge sits on every monster's plaque (it pulses gently on the one you are aiming at). Tap it to read about that monster without changing your target; tapping the chosen monster a second time still opens the same sheet. The hint under the dice and the beginner hint now say so.

## 2026-10-13 — one fight per step (no road choice)
Dave: "There needs to be only one option to fight, since you can already choose level in the game." `questsFor(hero)` now returns ONE quest: the standard battle, the elite on elite steps (5 and 8 by `ELITE_STEPS`), the boss at step 10. The perilous road is still generated by `roadsFor(hero)` (same seed, same monsters as before; the balance tools `progress.mjs` and `tension.mjs` use it to keep measuring it) but is never offered. The board says "The road ahead", the card "BATTLE" with a "Fight" button; the road-choice tips and the "Perilous" wording are gone. **Note for balance:** nobody earns the perilous road's 1.5x gold and XP and bigger loot any more, so progression is a little slower than the earlier sims; worth a look with `sh tools/progress-all.sh 3 4 smart` and, if it feels thin, a small lift to the standard reward (`rewardMult` in `roadsFor`) rather than bringing the choice back.
- (13 Oct) The quest card on the board shows the painted miniature of each monster (it still showed the old 3D render, drawn in the background). Two-monster fights (elite pairs) share the picture side by side.

## 2026-10-13 — Painted per-location battle backgrounds
Each fight's place (already chosen in `questsFor`) paints the table: `createFlat` sets `data-place` on `.fb` and `--place-img` to `assets/bg/<slug>.webp`. Slug is lowercase, apostrophes stripped, spaces to hyphens; all 16 `ACTS[].places` resolve. The felt stays the fallback. The painting sits under the lamp, `cover` sized, with a darker top/bottom wash so the header and plaques still read. Landscape crops around 58% vertical; portrait around 80%; crypt floors sit lower so those places drop the crop. End-of-battle (`screens.js` endTable) uses the same place. Slow fog + ember specks on Act I outdoor places, dust and a candle flicker on Act II; `prefers-reduced-motion` turns them off. Engine rules unchanged. Dev: `dev/placebg.mjs`.

## 2026-10-13 — Dave's rules pass and the painted scenes (plan and status)
Dave's list, in the order we are doing it. Each item names where it lives.
1. **Rules audit (done; talent dice redone three times, v3 is current).** **Talent dice v3 (Dave, 13 Oct):** faces 1 and 2 are blank, face 3 is 2x, and
   each face from 4 up to the die's size shows its own number and pays that many of the symbol you buy for it (face 6 + magic = 6 magic;
   the hand's strength no longer matters). A face starts empty and does nothing; you pay once per face, more the bigger the number
   (`talentFaceCost(num)` = 10 gold x num). Symbols: attack, block, magic, heal, gold (never pierce), at most two of a symbol per die.
   A bigger die (d4 -> d6 -> d8 -> d10, `SPECIAL_STEPS`) adds new empty faces; the old ones keep their symbols. A class starts with one free symbol on face 4.
   Code: `specialFace`, `talentInfo`, `addTalent`, `removeTalent` in engine.js; the camp card is `talentCard` in scrui.js; the 3D face shows the number plus its
   symbol (`labels` in gfx/dice/dice.js). Old saves that kept several symbols on a face now use only the first. Prices and bot results: docs/BALANCE.md.
   Strength dice and weapon dice are d4/d6/d8/d10 (weapons are capped by the hand that holds them).
2. **Dice grow with the act (done).** `ACT_MAX_DIE` / `dieCapForAct`: Act I d4 -> d6 only, Act II d6 -> d8, Act III d8 -> d10, for strength
   and talent dice (`actGate` in engine.js; the camp row shows "Act II" on the lock). The level and gold gates still apply.
3. **Magic powers sheet (done).** Heal (and Potion) keep the sheet open: every tap pays for another heal, the magic and a new green
   health pill update in place. The detail panel has a fixed minimum height so the triangle never jumps when you pick the first
   power; bigger medallions with a gold rim when ready; the three helpers are small raised pills. `dev/sheetshot.mjs` measures the triangle before/after a pick.
4. **Difficulty (for the computer, not a skill level for the player) and random encounters (done; numbers in docs/BALANCE.md: Noob 15/15 clears, Mid 14/15, Expert 3/15 for the bot).** The game's difficulty (picked with the hero, but it only sets how hard the monsters are) is Noob / Mid / Expert (keys `easy|normal|hard` kept for old saves;
   `DIFFICULTY`, now with a `budget`). `questsFor` returns ONE fight chosen by the game: `encounterFor(hero)` fills a trouble
   budget (`ENCOUNTER` in data.js, each monster has a `threat`; budget grows through the act, times the skill's `budget`, times a seeded
   0.75-1.35 jitter) from the act's own monsters, sometimes one big monster, sometimes a crowd (cap 4). Elite steps give a Noob the elite alone and an Expert the elite with company. The first fight is still the lone goblin.
   `roadsFor(hero)` (no `random`) is the old pair of roads, kept for the balance tools. `SKILL=easy|normal|hard sh tools/progress-all.sh 3 3 smart` measures the new game (one fight per step).
5. **Monster roster (audit notes).** Ten monsters, all on theme (goblins, wolves, an ember mage, an ogre, a goblin king; bone soldiers, wraith,
   spiders, bone warden, lich). Every monster has attacks and most a way to block (Duck, Fire Ward, Roar, Gold Shield, Shield Up, Skitter, Bone
   Wall, Bone Armor); the wolf has none and the wraith slips through (Phase). **Act III has no monsters of its own** (it replays Act I's with
   bigger numbers): the next art request for Grokabot is a third bestiary plus Act III places and miniatures.
6. **Painted camp and road scenes (built).** `js/g3/scenery.js` + `css/scenery.css`: camp, the quest board, the road/story screens and the
   room lobby are now flat painted scenes (no WebGL): a full-screen painting behind the panels and the company's **miniatures standing round
   a campfire, each hero's pet at their feet** (up to six, front and back rows; a camp in a room shows everyone at the table). The road
   and board show the painting of the place where the next fight is. **Handoff for Grokabot:** drop camp art in `assets/bg/` as
   `camp-act1.webp`, `camp-act2.webp`, `camp-act3.webp` (or just `camp.webp`) and road art as `road-act1..3.webp` (1280x720 like the
   others), then add the names to `PAINTED` in `scenery.js` (it does not probe the network). Until then the camp uses a calm place
   painting (Wolfwood Edge / Candle Vault / Smoke Hollow). The title and hero-choice screens still use the old 3D scene. Dev: `dev/campshot.mjs tag w h n [camp|board]`.

- (13 Oct, later) **Talent symbols no longer use the hand's strength** (Dave): each symbol showing on a talent die adds 1 to its counter
  (`SYMBOL_VALUE` in data.js; `evaluate` in engine.js). The 2x face still doubles the hand above it in its weapon lane. Camp text, the
  coach tip and the tutorial lesson were reworded. This makes talent dice weaker than before (a d4 face with one symbol was worth the hand's 2-4);
  the bot numbers in docs/BALANCE.md were measured before this change, so re-run `sh tools/progress-all.sh 3 3 smart` and look at Mid again.

## 2026-10-13 — the old 3D scenery is gone
Dave: "remove all of the old code that was so much animation, to make this game less big". Deleted: every 3D actor (`js/gfx/actors/`, ~400 KB: hero, goblin, wolf, ogre, cultist, goblin king, skinning and clips), every arena (`js/gfx/arena*`), the particle/effects library (`js/gfx/vfx*`), the camera director (`js/g3/director.js`), the gfx demos, the arena/vfx stand-ins in `stubs.js`, `docs/GFX.md`, and a dozen dev scripts that only drove them. The title and hero-choice screens are now painted scenes like camp and road (`screens.js` is 123 lines, was 463); the hero-choice miniature is seated by `pinHeroArt` (DOM/CSS, from each picture's `imgBase`) instead of being projected from a 3D pedestal; the old drag-to-turn code is gone. `js/` went from 2.1 MB to 1.2 MB and the module list from 82 files to 55. **What 3D is left, on purpose:** the dice tray and dice (`gfx/dice/`), the stage and post-processing (`core/post/env/tex/mats/noise/util/particles`), and the weapon pictures on weapon cards (`gfx/weapons.js` + `geo.js`, the helper half of the old hero kit, + `g3/portrait.js`), drawn once to a still image. Replacing those with painted pictures would let the whole Three.js library (`vendor/`, 2.4 MB) go: a bigger job and a design decision. Checked: unit tests (132), a bot playthrough, the Learn to play tutorial end to end, an online table round, title/create/board/camp screenshots; no console errors. **Repo size (not game size):** `docs/` is 478 MB of old screenshots (`docs/ingame` 388 MB, `docs/dice-lab` 35 MB, `docs/tutorial` 38 MB) and `.git` is 727 MB; the game loads none of it, but pruning it is Dave's call.
- (13 Oct, later) The "each symbol adds 1" rule lasted a few hours; it was replaced by talent dice v3 above.
- (13 Oct) Pruned the old screenshots: docs/ingame, dice-lab, tutorial, menus, monsters, powers, walkthrough, camp, hints and shots/ are gone from the repo (about 480 MB; the game never loaded them); a few current ones are in docs/screens, and the dev scripts' scratch folders (docs/ingame, docs/tutorial, shots) are now in .gitignore. The history in .git still holds the old pictures until it is rewritten, which is a separate decision.

### 13 Oct 2026 — plain upgrade words, one "Close", tidier magic sheet
- Camp: every upgrade row now says what you buy ("Reroll up to 4 dice each time in battle, instead of 3", "Carry 3 potions instead of 2", "Grow from d4 to d6: bigger numbers added to your left weapon"…). Reroll hand is now "Dice you can reroll".
- Every sheet/modal dismiss button reads "✕ Close" (top right, same pill); no more "Cancel".
- Magic sheet: big background triangle removed; the small triangle's bottom edge now connects B–C (gradient made userSpaceOnUse so a flat line draws); magic and health pills stacked and aligned top right; Potion / Heal / Heart change are round medallions like the triangle; at full health (or no potions) they stay lit and tapping shows a 2-second fading "You are at full health." pop-up.
- Perks and tutorial no longer say red/blue lane: "+1 attack from every weapon that is attacking (red face)" / "+1 block from every weapon that is blocking (blue face)".

### 13 Oct 2026 — beta review after Act III landed
- Act III was the easiest act in the simulator (100% wins, ~2 rounds a fight, 80% health left). Raised its encounter budget (base 1.5 → 3.0, slope .22 → .30), Act III monster health ~+20%, the Fallen Champion 240 hp, Vharaxis 280 hp with a power-16 Molten Fury. Smart-bot sim (3 acts, all classes): Act III steps 96–100% at 54–74% health, 5–9 rounds; the finale ~93%. The Hollow Lich (≈68%) stays the hardest wall.
- Fights now walk each act in story order (`ACTS[i].route`, one place per step): the arrival and victory beats were written as a sequence, but places were drawn at random, so a new hero's first fight could be at Ashfall Camp reading the claw contract. Act III's gates still pin the set pieces.
- The ten Act III foes that borrow a painted miniature get a `tint` (CSS filter) so a Shieldbearer never looks like your Knight, the Ember Queen isn't a grey Lich, and so on. They still need their own miniatures (art request below).
- Boss button names the boss ("Face the Hollow Lich", "Face the Champion"), not "Face the king" in every act; "The road ends here" only at the act's last step (the Fallen Champion is a mid-act boss).
- Monster call-outs ("FIRE BREATH") sit on the left of the piece so a big boss's call no longer hides under the magic chip; long single-word names (Frostwhelp) shrink to fit beside the i badge.
- Wording: the last "lane" texts (heart 5/6, 2× Strength) now say "blocking (blue) weapon" / "attacking (red) weapon" / "adds to its weapon".
- Story: a pass of dry, clean British humour through the beats and place lines (the John 1:5 lines and the Lich/Queen turns stay sincere). The Gallows Hill, Ash Cloister and Ember Throne victory lines now lead into the act-closing beat instead of retelling it.
- **Art request (for Grokabot):** painted miniatures for cinderling, frostwhelp, ashwyrm (Ashmaw), vharaxis (Ember Queen), fallenchampion (Sir Aldren), ironwarden, shieldbearer, gloomstalker, chainbinder (Gold-Chain Jailer), dirgesinger. Drop them in assets/miniatures/<id>.webp with an imgBase and remove the `tint`.
- dev/newplayer.mjs: title → new hero → prologue → road event → first fight → victory beat → camp, logging errors (clean).
- **Beta save reset** (js/save.js `startBeta`): the first time a device opens the beta, heroes and table seats saved by the test builds are cleared once (epoch `questdice.epoch = beta-1`) and a toast says so; saves are now `v: 2`, and Soul Codes from before the beta are politely refused. Sound, hint and tutorial settings are kept.

### 13 Oct 2026 — the ten Act III miniatures are in
- Grok's transparent 1024² PNGs (branch `act3-miniatures`) were trimmed to their figure and saved as ~50–75 KB webps in assets/miniatures/ (cinderling, frostwhelp, ashwyrm, vharaxis, fallenchampion, ironwarden, shieldbearer, gloomstalker, chainbinder, dirgesinger); each monster points at its own image with an `imgBase`, and the stand-in recolouring (`tint`) is gone. The 1 MB originals stay on the branch only, to keep the repo light.
- Sizes retuned (Ashmaw 1.5); long single-word names (Shieldbearer, Frostwhelp, Cinderling) shrink so the i badge never clips them.
- Checked on the real battle screen at 393×852 and 375×667 with one, two and three foes, and on the quest card. The Hollow Lich is the only boss that still shares art (the Ember Queen is no longer a recoloured Lich).

### 13 Oct 2026 — hotfix: the dice were hidden behind the painted road scene
- Dave's iPhone showed a rolled battle with no dice. Cause: when the old 3D screens were removed (d876776) `screens.release()` stopped hiding the painted road/camp scene, so that full-screen layer stayed on top of the dice-tray canvas during every fight (the canvas drew fine underneath). Fix: `release()` hides the scene again.
- dev/dicecheck.mjs rolls once and fails if the scene layer (`body.has-scene`) is on in battle; dev/newplayer.mjs now checks the layer is off in a fight and back on at camp.
- Lesson: my battle screenshots stopped before the first roll, so this slipped through for a few commits. The test scripts now screenshot after a roll.
### 13 Oct 2026 — cloud saves for solo heroes
- Solo heroes save to Firestore (`qdHeroes` + `qdHeroNames` + `qdHeroPublic`) under name + password. The password is never stored; the doc id is SHA-256(name+password) and the document holds a salted hash. Names are first-come. The public index is listable (name, class, level, act/step) so a player can pick a hero without remembering the spelling; it never holds the hash or the save. New saves need a password of at least 3 characters. Rules are in `firestore.rules` and **must be published** before cloud writes work.
- After opening a hero (local or cloud) a hub offers Continue, Begin at a step (only steps already reached; `campaign.reached` is the high-water mark; **Act I is for a new hero**), and Open a table with this hero. Acts II and III welcome a built-up hero, solo or at a table. Join and start refuse a veteran on an Act I table.
- First-clear only: `hero.cleared` tracks which act/steps this hero has beaten. A repeat clear withholds XP (so no levels/perks), gold, and weapon drops for that hero. Party play applies per hero; first-clear friends still earn and still draft. The victory screen notes when this hero earns nothing.
- Friends join a table with a cloud hero or a new one. The table walks the host's road. Each phone writes its own hero back after victory/camp/leave.
- Tests: `test/save.test.mjs` (Act I new-hero-only, first-clear, public card, password length, hashes, local keep) and brought-hero / Act I join / mixed-party reward cases in `test/table.test.mjs`.

### 13 Oct 2026 — no level gates on die size; the act is the only cap
- Dave: "You can upgrade up to d6 in act 1 but not to d8 until act 2; there is no level 3 limit for a d6, there is just a max per act." Removed the hero-level requirement from strength dice (was level 3 / 7 / 12), talent dice (3 / 7 / 12) and the feet die (2 / 6). A die now grows when you can pay for it and the act allows it (`ACT_MAX_DIE`: Act I d6, Act II d8, Act III d10); the camp row says "Act II" when that is what is in the way. Power learning/upgrades and potion belt keep their own rules.
- Balance: smart-bot sim, 3 acts, all classes: 10/10 cleared; the early fights are a touch easier (Act I elite 88%, boss 93%), the Hollow Lich is still the wall (~60%).
- test/dicecap.test.mjs pins the rule.

### 13 Oct 2026 — camp shows where you are on the road
- Camp now opens with a "where you are" card above the potions: the act and its name (with the Ascent), "You are at quest N of 10", the same step track as the quest board (done ticks, you, Elite and Boss markers; Act III shows both its bosses), and the place of the next fight ("Next fight: Ravens’ Rest", or "The Fallen Champion waits at Oathbreak Keep"). Built from `trail()` + `E.questsFor`, so it can never disagree with the board. dev/campmap.mjs screenshots it.

### 13 Oct 2026 — difficulty shown on the quest board
- The quest board's header carries a small chip with the hero's skill level (Easy green, Normal gold, Hard orange, Legendary red) beside "Act I · Quest 4 of 10". The battle card's own Danger row ("Fair for you · ~5 rounds") already reads that setting. On narrow phones the eyebrow stays on one line and the danger words wrap inside the card instead of running off it.

### 13 Oct 2026 — magic sheet: A, B and C on a true equilateral triangle
- The three power medallions now sit exactly on the corners of one equilateral triangle (side 222 in the 300 × 260 drawing: A (150, 34), B (39, 221), C (261, 221)) and the purple triangle's lines run through their centres. Before, the name under B and C pushed those circles up (the whole button was centred on its corner), and the sides were unequal (233 vs 222). Every name is now absolutely placed the same distance under its circle, so the circles are exactly on the corners and the three names line up; names wrap to two lines instead of colliding on a small phone.
- The faint inner triangle is gone (one dotted ring remains); the stage may grow to 24rem on big phones; short phones (≤720px tall) get smaller helper circles and a shorter panel. Checked at 375×667, 390×740, 393×852 and 430×932.

### 13 Oct 2026 — monster actions told by big cards in the middle of the screen
- The enemy ability pop-ups (abilitypop.js) were small, short (2.5 s) and drawn over the little board at the top, stacking on the miniatures and on each other. They are now big cards (icon, the monster's name, the move's name, one plain line) stacked in a column in the middle of the screen, one under the other, 5 s each (twice as long), under the round recap card.
- Plain monster blows get a card too (`cueFromHit`): "Hit Dave for 5. Block stopped 4." / "Dave blocked all 6." (red when it hurts, blue when fully blocked; one line per hero in a company). The little floating −N / 🛡N / Blocked! / Dice locked / +heal numbers over the heroes' heads for monster turns are gone; the hit animation, red flash and health bar remain.
- Checked at 393×852 with three monsters acting; the cards never touch the miniatures. Test added for cueFromHit.

### 13 Oct 2026 — magic sheet: one pyramid of six
- Dave: the six buttons as a pyramid, 1 on top, 2 in the middle, 3 along the bottom, in the purple triangle theme. Now: A at the top, B and C in the middle row, Potion / Heal / Heart change along the base, all the same size and the same distance from their neighbours (a triangular lattice in a 300 × 290 drawing). The purple triangle runs through A, B and Potion down the left, A, C and Heart change down the right, and along the base; a faint dashed inner triangle joins B, C and Heal.
- Each circle's name is a small pill across the bottom of the circle (so names never collide between rows); the charge-pips of a stored power sit inside its pill; the cost badge moved to the top-right of the circle. The separate helper row is gone; its tap rules (the "full health" pop-up, the selected glow) are unchanged. Checked at 375×667, 393×852 and 430×932 with and without a selection.

### 14 Oct 2026 — monster moves first, then the recap, each closed by the player
- The recap card was covering the monsters' cards the instant the replay ended. Now, after the monsters' turn: (1) their cards stay on the dice board under a "Monster moves" header with a ✕ Close (tap the Close or anywhere on the cards); (2) closing it brings up the round recap; (3) closing that returns the board. A round where no monster did anything goes straight to the recap as before. Rolling again, winning or losing clears whatever is up. Same order in company battles.
- abilitypop.js: cards no longer time out (`show` adds, `finish` holds them behind the Close, `clear` removes). The layer takes the recap's place on the board (under the board line, above the dock) and scrolls if a crowd acts.
- dev/monsterpanel.mjs plays rounds and fails if the recap is up before the monsters' panel is closed, or anything still covers the board after the recap is closed.

### 14 Oct 2026 — no "new hero" / "built-up hero" anywhere; difficulty is the only choice
- Dave: the only thing a player chooses is how hard the game is (Easy / Normal / Hard / Legendary); nothing should label a hero as a beginner or as advanced.
- Removed the "Act I is for a new hero" rule (`isNewHero`, `ACT1_NEW`, `ACT1_TABLE`, `canJoinAct`, `actOneGate`) and every message that came with it: any hero may replay Act I from the step picker (still only as far as they have walked, never past it), host or join an Act I table, and the hero menu, step picker and table screens no longer tell anyone to "forge a fresh character". Tests rewritten to the new rule.
- Wording: "Beginner hints" is now "Hints"; the create screen's "I have played before: skip the beginner hints" is "Turn the hints off"; "New here? Start here" is "Start here"; Easy no longer says "for learning your feet"; the lesson says "Your hero starts with…".
- Kept on purpose: XP levels (Level 2 Ranger) still exist; the lessons ("Learn to play") are about the game, not the hero; silent mapping of old noob/mid/expert saves onto Easy/Normal/Hard.

### 14 Oct 2026 — heroes face the monsters
- Dave: the heroes, always on the left, looked like they were walking away from the fight, while every monster looks left. The hero pictures are now mirrored on the battle table (`flip` on the hero Piece in flat.js: the image's `scaleX(-1)`, with the lunge/lean pivot mirrored to match), so all five classes face right, toward the monsters, in solo and company battles. Only the battle table is mirrored; the camp, road and hero-choice pictures are unchanged.

### 14 Oct 2026 — monster actions: a small box over each monster (replaces the middle-of-screen cards)
- Dave: summarise what each monster did this turn in a little box over that monster's miniature, keep it up while the round recap is open, and clear it when the recap is closed. Replaced the stacked cards and the "Monster moves" step: after the monsters' turn the recap comes straight up and the boxes stay on the board above it.
- One box per monster (`abilitypop.js` `show` / `layout` / `clear`): a monster that did several things gets rows in the one box (a guard when you hit it, then its own blow); the same move told twice (a Pounce, then what it hit for) is one row with both lines. Boxes centre on their miniature a little below its head, are nudged sideways so none sits on another, never cross onto the heroes' side, and shrink to fit a crowd (three monsters drop the little icons for room). Closing the recap, rolling again, winning or losing clears them (`hideCard`).
- dev/monsterpanel.mjs now checks: recap up with a box per acting monster, no box spilling off the board, everything cleared once the recap is closed.

### 14 Oct 2026 — monster actions: a few coloured words across the top, in front of everything
- Dave: the little boxes over the miniatures were still too much. Now each monster that acted gets a tiny label right across the top of the screen, above its miniature and in front of the round heading: the move's name in a colour (red attack, blue defence, purple magic, green healing, gold sneaky) and two or three words under it ("BITE · hits you", "SIPHON · steals magic", "WIND-UP · winding up", "PILFER · steals gold"). No icons, no numbers (the recap has those). Labels sit on a layer over the whole battle (`.b3 > .fb-pops`), spread out so none covers another, and stay on the monsters' side.
- They stay while the round recap is open and disappear when it is closed, so the hits and tumbles on the miniatures play out on a clean board (the layer is cleared by `hideCard`; the recap card comes up straight after the monsters' turn).
- `abilitypop.js`: `TAG` (the few words) and `TONE` (the colour) per move kind; `cueFromHit` gives plain blows "hits you" / "blocked". dev/monsterpanel.mjs checks a label per acting monster, nothing off-screen, all cleared on close.

### 14 Oct 2026 — power upgrades climb in clear steps; pierce under attack; a short hint line
- Dave: each power's upgrades should visibly grow (attack 3, then 4, 5, 6), pierce powers always a little under the attack powers (nothing blocks them), and the little hint text at the bottom is far too wordy.
- `scaleNum(v, lvl) = v + lvl × max(1, ⌊v/4⌋)`: a 3 becomes 4, 5, 6; a 5 becomes 6, 7, 8; a 12 becomes 15, 18, 21 (was a quarter of the *total* rounded, which stalled: 3 → 4 → 5 → 5). A free reroll gains one die a level (Quick Draw 2 → 3 → 4 → 5). Every class now has three upgrade levels (it was two, three for the Wizard), 60 / 140 / 260 gold. 
- Pierce balance: Magic Missile +3 → +2 pierce (a flat attack is +3), Aimed Shot tops out at 4d6 (was 5d6). Volley (4 per charge) and Rain of Arrows (6) already sat under Storm Coil (5) and Judgment (14). Test: every non-dice pierce power is below the best attack power of its kind.
- Camp: each power row says what it gives now and what the next level gives, in the fewest words ("Now: +3 pierce / Level 2: +4 pierce", "+7 attack per charge → +8"). The battle panel's effect line also shows the level's real numbers (it showed the base ones before).
- Bottom hint: "Pick a target, then roll." (one monster: "Roll the dice."), "Tap dice to reroll, then Lock in.", slam warnings cut to "X will SLAM. Brace with block."
- Balance re-run (smart bot, 3 acts, all classes): 10/10 cleared, Act I boss 95%, Hollow Lich ~58%, Act III finale ~98%: unchanged in shape.

### 14 Oct 2026 — difficulty badge in every battle
- The same pill as on the quest board (skull, name; green Easy, gold Normal, orange Hard, red Legendary) now sits at the very top right of the battle screen, above the gold and magic chips; the round title stops short of it. Reads the hero's difficulty (a table's heroes all carry the table's). Hidden while the magic sheet is open, like the other chips. Checked at 360×640, 393×852 and a wide screen.

### 14 Oct 2026 — every round starts by choosing a target
- Dave's round: choose your target, roll, make your decisions, lock in, see the results, repeat. The hint line "Pick a target, then roll." had been promising a rule the game did not enforce; now it does.
- With more than one monster alive, each round opens with no monster ringed, Roll greyed ("pick a target first") and the line "Pick a target. Tap the monster you will hit." The first tap on a monster chooses it, rings it and wakes Roll; before rolling you can still change your mind (tap another; tap the chosen one again for its sheet). Once you have rolled, a solo hero's target is fixed for the round: tapping another monster just opens its sheet with "Your target is fixed once you roll." A single monster is auto-aimed and needs no choosing. The next round resets the choice.
- In company battles the pick is needed before the first roll, but the target is not frozen after rolling (shared-phone fighters take turns and each locks their own).
- dev/pickfirst.mjs plays it through (waits for the pick, take, fixed after the roll, asked again next round, lone monster); the other dev scripts that press Roll now tap a monster first when Roll is waiting.

### 14 Oct 2026 — the monsters' dice are visible
- How monsters roll (engine): one **power die** a round (d6–d12; goblin d8, ogre d10, boss d12…), rolled when you lock in; a blow is `flat + multiplier × die + difficulty bonus`, a guard the same; some Act III monsters add always-on **armour dice** (e.g. 2d4); plus a **speed die** for who strikes first. Players only saw the resulting range ("6–13 DMG").
- Monster info sheet: a new "Its dice" block: a red die chip for what it attacks with ("Attack  1 + 2×d8"), a blue one for a guard or armour ("Armor 2d4 blocked, every round"); speed was already listed.
- Round recap: each monster's roll shows beside its name as a die with the number it landed on (red for a blow, blue for a guard): "4 d8". Token rows in the recap now wrap rather than run off the card.
- Found: the data has non-standard monster dice (d11 Ashmaw, d13 Champion, d14 Queen and the enrage forms, d16 Molten Fury); shown honestly for now, to be snapped to real dice in a balance pass. Armour is still rolled at lock-in (hidden); rolling it at the start of the round is pending Dave's answer (exact number or range).

### 14 Oct 2026 — monsters roll real dice; Act I–II locked fights re-balanced
- Every monster's power die, its enraged form's die and its armour are now d4/d6/d8/d10/d12/d20 (test `every monster rolls a real die`). The odd ones were Ashmaw d11, the Fallen Champion d13, the Ember Queen d14, the enraged Goblin King, Lich and Champion d14, and Molten Fury d16: all are now d12, with each damage face's flat part raised or lowered by ½ × multiplier × the old/new gap so the average blow stays the same (e.g. Molten Fury's Inferno 4 + d16 → 6 + d12; the Queen's slam 5 + 2×d14 → 7 + 2×d12).
- Found while re-running the balance sim: Cursor's locked story fights (PR #16) had dropped the smart-bot clear rate from 10/10 to 4/10 (Act I steps 7 and 9 are three goblins, 43% and 28% wins; Act II step 3 dirge-singer + two skeletons ~48%). The cast stays (the story names these foes); `ACTS[i].fightHp` now scales a locked step's monster health: Act I step 7 ×0.55, step 9 ×0.6, Act II step 3 ×0.6. Sim (smart bot, 3 acts, five classes × 3 campaigns): 15/15 cleared; weakest fights ~79–88%, Hollow Lich ~85%.

## 2026-10-14 — the recap shows how each monster's number was made
Dave: "I want to see the roll that gave the monsters their attack. Is it one die or two? What is the attack, what was the defense?" Each monster rolls ONE die a round (its power die, d6-d20); the move on its plate was picked earlier by a d6 and the power die scales it. The engine now keeps what made each number (`e.calc`, `magnitudeParts`, copied onto every `rep.acts[]` as `calc`: move `f`, multiplier `m`, die `p` and `size`, fight `flat`, howl `buff`, `weaken`). The round card (roundcard.js `calcLine`) shows, under each monster's name, `[die d8 7]  1 move + 7 die + 3 fight bonus`, then the old sum `11 STAB - 0 BLOCK = 11 you take`. A guard shows the same breakdown in blue, and in "Your strike" the guard the blow ran into carries its die. Shot: docs/ingame/dice_3after.png (`N=2 node dev/battleshot.mjs dice 393 852 goblin,wolf`).

## 2026-10-14 (later) — a quieter board: name, health, one plan; numbers last five seconds
Dave: too many things on the board while the minis fight. Removed: the gold/coloured ability boxes across the top (abilitypop.js keeps only its pure cue builders, used by tests), the red "POUNCE NEXT ROUND"-style tag over a piece (`fb-call`), and the extra intent chip content. Now:
- **Each monster's plaque has three things**: name, health, and its plan as ONE word plus the dice it rolls, in red for a hit and blue for a guard, e.g. `[sign] POUNCE 2×d8`, `WARD d8`, `HOWL` (a move with no dice shows only the word; `planOf` in flat.js; a long two-word move reads as its longest word: Raise Dead -> RAISE; `fitPlan` shrinks the word to fit beside its dice; with four monsters the sign is dropped).
- **While the blows land**: damage in red over each side (`−14` on the monster, `−10` on the hero), and when something soaked a blow its own word in blue (`Duck −6`, `Fire Ward −4`, `Armor −3`, `Block −5` on a hero). All numbers now stay on screen **five seconds** (`fb.num`).
- **The recap names the move**: a gold chip with the monster's move name (STAB, BITE, DUCK) beside its name, on top of the die breakdown added earlier.
Shots: docs/ingame/plan_*.png, plan3_*.png, plan4.png (`dev/battleshot.mjs`).

- (14 Oct) Dave: there is no player skill level, only a difficulty for the computer. The game's wording is Difficulty / Easy / Normal / Hard (Legendary); the Noob/Mid/Expert names above are history. The recap's monster breakdown is now `[die] + [bonus]` (bonus = the move's own number + the fight's extra hit), plus a howl or softening when there is one; "move" and "fight bonus" were confusing.

## 2026-10-14 (night) — "base attack + a die": one language for every monster
Dave: say it like a board game. A monster has a BASE attack (the number it always has) plus the die it rolls; no separate "move" and "fight" additions. `E.intentBase(e)` = the move's own number + the fight's extra hit + any howl (a guard's base is just the move's number). Shown everywhere the same way:
- **Plaque**: `REND 5+d8`, `LUNGE 3+2×d8`, `DUCK 2+d8` (no base: just `d8`).
- **Recap**: `BASE 5  +  [d8: 4]  = 9 REND - 0 BLOCK = 9 you take` (a multiplier shows as `×2` after the die, softening from your powers as `− N softened`). In "Your strike", a monster with no guard that round shows a blue shield with a line through it, `NO GUARD`.
- **Info sheet "Its dice"**: `Attack base 3 + 2×d8` in red; `Defence base 2 + d8` in blue, or the crossed-out blue shield `NO DEFENCE - does not roll for defence` for a monster with no guard move (the wolf, the wraith).
No numbers changed; only how they are said. `noDefence()` is exported from roundcard.js. Shots: docs/ingame/base_*.png, info_wolf.png, info_goblin.png.

- (14 Oct, night) A small blue shield with a red line through it sits on the corner of the plaque of every monster that has **no defence at all** (no guard, ward or phase move, and no armour), because it can decide who you hit (`fb-nodef` in flat.js, from the monster's faces). The target reminder over the buttons is now just **CHOOSE TARGET** in big letters, and the Roll button's small line says "choose target" (battle3d.js `e0Warn`, `.captarget` in hud.css).

- (14 Oct, night) The count badge on the Magic Powers button is gone, and the gold "i" on each monster plaque no longer pulses and is a quarter smaller (its tap area is unchanged).
- (14 Oct, night) The no-defence shield is now a small icon at the end of the plaque's bottom (plan) row instead of on its corner.
- (14 Oct, night) The monster's defence now lives at the far right of its health bar (`fb-def` in flat.js): a blue shield with its die (`d8`, or `2d4` for armour, a phase sign for a monster that slips out of reach), or a crossed-out shield when it has nothing to block with. It replaces the icon in the bottom row.

- (14 Oct, night) **A x2 move now rolls two separate dice** (Dave: board-game feel, "5+d8+d8"). `rollPower(e, intent, rng)` rolls the monster's power die once per point of the move's multiplier (a x1 move still rolls one; a x0 move draws one die that does not count, so the random stream matches the old one for those). Average damage is unchanged (two d8 average the same as one d8 doubled), but it is less swingy, so no re-balance was needed. The plate reads `LUNGE 3+d8+d8` in a lighter, tighter face; the recap shows `BASE 3 + [d8: 7] + [d8: 1] = 11`; the info sheet says `base 3 + d8 + d8`. The report carries `calc.dice`. Test: "a x2 move rolls two separate dice".
- (14 Oct, night) The defence on the monster health bar is 50% bigger (the bar is taller on monsters: 1.05rem), and with three or four monsters the health number centres in the space left of it.
- (14 Oct, night) A monster's health number now sits at the far left of its bar (defence at the far right).
- (14 Oct, night) A monster's guard line in the recap now ends with the total, `BASE 2 + [d10: 7] = 9 GUARD` (it showed only the base and the die before).

## 2026-10-14 (night) — every miniature looks toward the fight
Dave: the hero sometimes looked the wrong way. The board mirrored EVERY hero, assuming they were all painted looking left; the wizard and the bard are painted looking right, so mirroring turned their backs on the monsters. Now each miniature records which way it was painted (`faces: 'right'` on the Wizard, the Bard and the Frostwhelp; everything else looks left) and `needsFlip(def, want)` in data.js decides: heroes always look right (mirrored only if painted looking left), monsters always look left (the Frostwhelp is mirrored). The camp and road scenes (scenery.js) use the same rule, so the company looks toward the fire. When new miniatures arrive, add `faces: 'right'` if one looks right. Dev: `node dev/classfaces.mjs` makes docs/ingame/face_<class>.png for all five classes against assorted monsters (contact sheet faces_all.png). The Dwarf, the Knight-front poses and several monsters are painted facing the viewer; those just follow the left/right default.

## 2026-10-14 (night) — bottom buttons clear any open window; shrink a die for gold
- **Bottom buttons close the window** (Dave): tapping Lock in, Roll, Reroll or Magic powers first clears the round recap, a monster's info sheet and the magic powers sheet (a capture-phase click listener on `hud.bar` in battle3d.js; Magic powers still opens its own sheet). Checked by script: recap open -> Magic powers shows only the powers sheet; Roll or Lock in clear everything.
- **Shrink a die** (Dave): `downgradeInfo` / `downgradeDie` in engine.js (`PREV_SIZE`, `DOWNGRADE_COST` = 20 / 30 / 40 gold by the size it leaves, nothing refunded). Works on hands, feet, talent dice, weapons and the pet's die. A talent or pet die loses the symbols on the faces that go away (a d10 -> d8 drops faces 9 and 10); growing back adds empty faces. Camp: a small "Shrink to d6 . 30" ghost button under each die; it asks twice ("Tap again: lose 2 symbols . 40") and re-arms after 4 seconds (`shrinkBtn` in scrui.js; `downgradeDie` is in the online-table op whitelist). Test: "shrinking a die costs gold...". Prices are a first guess.

## 2026-10-14 — miniature audit (keep / small fix / repaint)
Looked at every painted piece (5 heroes, 20 monsters, 6 pets) for facing, cutout, size, style, phone readability and theme. Report: `docs/MINIATURES.md`. Contact sheet (each piece on dark and on light): `docs/ingame/miniatures_overview.png` via `dev/minisheet.mjs` (now all heroes, monsters and pets; `docs/ingame/` is gitignored, a copy is in `docs/screens/miniatures_overview.png`).
The five most important fixes, in order: (1) `needsFlip` treats a monster's attack `faces` array as “not left”, so every monster is mirrored and looks away from the heroes — painted facing cannot live in `faces` on a monster; (2) Starling the owl (horns, bat wings, glowing triangle) — repaint; (3) pixelated breath on the Cinderling and the Frostwhelp; (4) the Ranger is left-handed once mirrored — a painting that already looks right would be kinder; (5) the Gloom Stalker (and Ember) vanish on a dark table. Code this pass, only the knobs we were sure of: dropped the unused `faces: 'right'` on the Frostwhelp (the attack list overwrote it, and the whelp looks left); Bone Warden `imgBase` moved under the feet; Shieldbearer / Dirge Singer / Fallen Champion discs tightened to the painted lava; Ashmaw SIZE 1.5 → 1.6, Ember Queen 1.65 → 1.7. `needsFlip` itself was left for the next pass.
## 2026-10-14 (late) — Tests on the road: wisdom (head), strength (hands), speed (feet)
Dave: like a tabletop ability check. Four times an act, at steps 2, 4, 6 and 9 (`TRIAL_STEPS` in js/trials.js), the road asks for one of the body's dice:
- **Wisdom = the head die**, **Strength = both hands added**, **Speed = the feet die**. You roll against the other side's dice (Act I d4, Act II d6, Act III d8; a "harder test" is one size up, `oppSize`). Highest total wins, **a tie goes to you**. The choice shows your dice, theirs and the exact odds before you pick ("Your d6+d4 against d4+d4 · about 71% to win"). In a company the hero with the best dice for that test steps up (`championFor`). Every roll is seeded (campaign seed, act, step, choice, attempt), so a reload cannot change it.
- **The head grows now**: `hero.mind = { N }`, d4 -> d6 -> d8 -> d10 at camp (`MIND_STEPS` 50 / 110 / 230 gold, act-gated like the hands), "Head die (wisdom)" in the camp's Body dice section; it can also be shrunk. A bigger head also rolls bigger faces in battle.
- **Nine tests** (`TRIALS` in roads.js, `when: 'trial'`): wisdom - the Traveller's chessboard, the Riddle Keeper, the Faded Map (hard); strength - arm-wrestling the traveller, the Tree on the Wagon (hard), the goblins' tug-of-war; speed - race to the old oak, Biscuit the runaway goat, Rockslide! (hard). Each has a free try and/or a wager (win 3x the stake) or a safe way out. Rewards: gold (scales with the act), a potion, XP, a blessing for the next fight (+2 magic, +3 opening attack...). Losses stay light: the stake, a few HP next fight, a goblin ambush, a toll.
- **One rematch** after a loss for 5 gold x act (`rematchTrial`); a win then pays out, the first loss stands.
- **The roll screen** (js/g3/trialui.js, styles at the end of css/hud.css): your 3x3 dice board with every socket dark except the tested dice, the other side's dice across, "Roll your die", the dice tumble and land, "You win! 5 against 3" or "Not this time", then the result card (with the rematch button).
- **Online tables**: the choice is a normal `choose` command; `table.roadResult.trial` carries the roll so every phone plays the dice once (`trialsSeen` in online.js); `rematch` is a new command. Unit test in table.test.mjs. A two-phone browser run (`dev/room11.mjs`, cheat `trial` in server.mjs) could NOT be completed here: opening a table now saves the hero to the cloud first and that call never returns in the sandbox (no internet), so the room harness hangs before the lobby (`dev/_rooms.mjs` now fills the password and blocks the cloud hosts, still hangs). Worth a look: a cloud save that never answers also hangs a real player on a bad connection.
- Road rhythm now: something waits before every fight from the second on (tests 2, 4, 6, 9; road events 3, 5, 7; Call for Help 8; the night before the boss 10). If that feels like too many stops, drop step 9 from `TRIAL_STEPS`.
- Tests: test/trials.test.mjs (head ladder, steps, dice, odds, champion, rematch, content). Dev: `node dev/trialshot.mjs <cls> <act> <step> <seed>` -> docs/ingame/trial_*.png.

## 2026-10-14 (evening) — every miniature faces the fight (`look`, not `faces`)
Dave's Toll Bridge shot is the target: Hill Ogre at a slight three-quarter looking left at the archer, archer looking at the ogre. The ogre was not looking away. Standard, every hero and monster: monsters a slight three-quarter looking left; heroes look/walk right. Cause of the old blanket flip: `needsFlip` read `def.faces`, and on a monster that key is the attack list, so every foe was mirrored and those already looking left would have turned away. Fix: painted facing is `look` on every class and monster (`left` on every current monster; knight/ranger/dwarf `left` so they flip, wizard/bard `right` so they stay). Flip only a piece that would otherwise face away. Camp and the road already used the same helper toward the fire; the quest-board picture, the monster info sheet, and the hero-choice preview now do too. When a new miniature arrives, set `look` — do not put it in `faces`. Test: `every hero and monster records which way it was painted...`. Shots: before/after ranger vs ogre on the Toll Bridge, wizard vs Ashmaw (`dev/facing-shot.mjs`).

## 2026-10-14 (late night) — the test roll on the real dice table
Dave, on the Runaway Goat screenshot: "Use the good graphics and the good dice we already built. Make these little mini games look sharp." The roll for a test on the road is now the battle's own 3D dice board (js/g3/trial3d.js; `showTrial` in trialui.js uses it whenever the 3D world is up and keeps the old flat card as the fallback):
- **Your board** is the real tray with your hero's theme. Only the dice being tested sit on it (head, both hands, or feet); the other sockets show their carved marks (`tray.setWaiting(on, slots)` now takes a list). Tap Roll and they are thrown with the battle's physics and land on the seeded roll.
- **The other side** throws real red dice (the `pet-atk` dice theme) from across the table onto its own little wooden mat with a dark felt top and a brass line, half a second after you. Their name plate sits above it ("THE GOBLINS · d6 + d6").
- **A scoreboard** between the two keeps the totals (them, VS, you), each popping in as the dice land; the winner's number glows. Then "You win! 8 beats 6" (a tie says "6 ties 6, and a tie goes to you") or "Not this time", and Continue.
- While it is open the road screen is hidden and the road's painting fades into the table under the header (`body.t3-on`, `--t3-line`); Continue clears the table and the result card comes back as before. Works on phones and wide screens (the camera fits the board and the mat into the space between the header and the button). Reduced motion: no throw, the dice just show their faces.
- Online tables pass the company to it too (online.js). Timing uses the stage's clock, so screenshots in manual mode work.
- Dev: `node dev/trial3dshot.mjs [cls] [act]` (made-up strength and wisdom tests; `WIDE=1` for 1280x800) -> docs/ingame/trial3d_*.png; `node dev/trialshot.mjs` still walks a real road test (now with a mid-throw shot, trial_2bmid.png).

## 2026-10-15 — a new player's first fifteen minutes
Dave asked for a fresh-eyes pass. Walked it as a brand-new player on a phone (`node dev/firstrun.mjs`, `MORE=1` for the second deck; `node dev/newplayer.mjs` for hero creation to the first camp): title, Learn to play, practice battle, a new Knight, the prologue, the first fight, the first camp, the first road test. What changed:
- **Learn to play is seven pages, not thirteen.** Only what the practice battle needs comes first: welcome, the board, the white dice, hands are your Strength, weapon dice, how a round goes, ready. The rest (talent dice, the heart, speed, the six counters, triples and straights, a new **Tests on the road** page, camp, and a closing page) is **More to learn**, offered on the screen after the practice battle and shown in full from the title link once you have learned (`deckOf('basics' | 'more' | 'all')` in tutorial.js). The title card now says "Two minutes, then a practice battle."
- **Words brought up to date** with the battle screen as it is now: monsters have a plaque, not "a box at the top", and their move reads like `SLASH 2+d8` (hits for 2 plus whatever its d8 rolls), not "a range like 4-11" (lesson, practice guide, hints b_intent, b_target, b_shape, b_init, b_powers, m_ogre, m_king). The head is "a d4 to start" and is your wisdom; the feet also win races.
- **The first road test was a surprise** (it comes at quest 2, before any explanation). New hint `r_trial` on the first test's choice screen: what each stat rolls, highest total wins, a tie goes to you, the odds are on the choice.
- Legendary's description no longer says "Still being sharpened" on the hero-creation screen.
- Not changed, noted: the creation screen is long (class, weapons, powers, difficulty, hints, name); the battle's first hint covers the middle of the board until tapped; both read fine.

## 2026-10-15 — Normal is tense now
The bot used to win almost everything on Normal (bosses 97% / 87% / 100%, Act III 100% throughout, even on Hard). Now the bosses land about 76–83%, ordinary fights dip to about 80% near the end of each act, and every campaign still gets cleared. Hard bites in all three acts instead of only Act I. Numbers and the knobs in docs/BALANCE.md (15 Oct). Open: the lone elites (ogre, Vharaxis) are still about 99%.

## 2026-10-15 — good play matters; Legendary beatable with it
Dave: the first roll should not win every fight; on Legendary you must read the monsters and spend magic just right, and it must still be beatable. Built three computer players (first roll, sensible, wise; the wise one thinks a round ahead about powers, charges, heals and targets) and a tool that fights every step's battle with each (`SKILL=legendary sh tools/skill-all.sh 3 2`). Legendary now leans on reading the monsters instead of raw health: announced moves hit harder (Slam and Pounce +6, Fire Ward's burn +4) with health x1.35 and +2 a hit; Hard gets half of that. Results (docs/BALANCE.md, 15 Oct): on Legendary the first roll wins 2–10% of boss fights, sensible play about half, wise play 56–83% and clears every campaign with about three retreats. The difficulty cards say what changed.

## 2026-10-16 — weapons that grow: size is the range, metal is the quality
Dave asked why dice need more sides if we print our own numbers, and set the rules: every weapon always has a 0 (Diamond too); a cheap Bronze weapon has blank faces; each metal fills blanks and adds icons; Diamond is all filled with icons; shields match their weapon type in blue. Built in engine `weaponFaces` (see docs/BALANCE.md, 16 Oct): bigger dice carry a run of higher numbers (more numbers for straights, a higher top, and the 0 comes up less often); metal fills the gaps and adds icons. Also: power levels +50% a level, more gold from later monsters, replays pay half the gold each time (Dave's farming idea), and bigger Act II/III monsters to match. The hero now deals about +10 a round more each act. Weapon descriptions and the camp's train/forge notes describe the new dice; the practice battle's scripted roll uses the sword's new red 3. Shots: docs/ingame/weapon_faces_*.png (`node dev/weaponfaces.mjs`), docs/ingame/bigdice_*.png (`node dev/bigdice.mjs`).

## 2026-10-16 — talent dice count in straights
Dave's idea: talent dice carry numbers too. Faces 1 and 3 are blank, the 2x moved to face 2 (and counts as a 2), and the 4-and-up faces always show their number (with or without a symbol) and count toward straights. Late-game straights went from about 1 roll in 30 to about 1 in 8. Camp, the 3D dice, the lessons and hints say so; the practice battle's scripted 2x is now face 2. Act II/III monsters a little sturdier to match; Legendary health eased to x1.15. Shot: docs/ingame/talent_die_camp.png (`node dev/talentdice.mjs`). Numbers in docs/BALANCE.md (16 Oct).

## 2026-10-16 — Talent Triple across the bottom row
Dave: a fourth triple. Talent, feet and talent on the same number = +10 attack (a talent blank, faces 1 and 3, never matches; the 2x counts as a 2). Lands on about 3% of rolls at the start and about 1% late, like the other triples, so no re-tuning. It glows across the bottom row with a "Talent! Triple +10 attack" banner, joins the team triples at a table ("Team Talent Attack"), and the Triples lesson and gear note list it. Shot: docs/ingame/talent3_1rolled.png (`FULL=1 SCRIPT='{"SW":4,"S":4,"SE":4}' node dev/bigdice.mjs talent3`).

## 2026-10-16 — honest dice and three metals (branch `honest-dice`)
Dave: honest dice (a d8 shows 0–8; the crit's icons make a 10 hit like a 13), a spectrum of weapons from steady to big-swing, for attack and for block, and only three metals. Each weapon has a temperament with its own custom faces per size: steady (dagger, bow, bracer) hardly ever blank, small sure numbers; balanced (sword, staff, shield) one blank and a parry face or two; risky (spear, longsword, tower shield) two or three blanks and its top number twice; brutal (mace, warhammer) half blank, the top number three or four times. Bronze is a little dull, Silver adds icons to half the numbers and 2 on the crit, Gold an icon on every number and 3 on the crit. Diamond is gone (old ones load as Gold). Weapon descriptions rewritten. Monster balance comes next. Shots: docs/ingame/honest_dice_*.png (`node dev/honestdice.mjs`). Numbers in docs/BALANCE.md (16 Oct, honest dice).
## 2026-10-16 — smaller weapon cards, monsters that march down the quest card
Dave: the weapon pictures were far too big; make the cards much smaller so more fit at once, and say Sell on the sell button. Every weapon card (camp, spoils, traveller, hero choice) now has a small thumbnail beside the name with the metal and hand on thin strips, the face chips full width below, and tighter buttons: Left · Right, then "Sell 40" on its own row. A full pack of four now fits on one phone screen (it was two cards). Weapon portraits render at 200px (was 380), so the camp fills in faster.
Dave: on a phone the quest card's monsters looked crammed at the bottom. They now march down the picture column: one stands big in the middle; two or three stack top to bottom in a zig-zag, the nearest in front. Shots: docs/ingame/small_cards_*.png (`node dev/smallcards.mjs`), docs/ingame/quest_stack_n1..3.png (`node dev/queststack.mjs`).

## 2026-10-16 — Diamond weapons, and the monster pass for honest dice
Dave: three metals, and rare super Diamond weapons good for one battle, then destroyed, win or lose; about 1.5 an act; at most two; one in each hand. Found in spoils (it goes into the Diamond case, which holds two and never takes pack room; a full case leaves the new one behind) and now and then from the traveller. A strip under the quest card lists your Diamonds with Left and Right buttons and says what each hand sets aside; tap to bring one into the next fight. With a two-handed weapon one Diamond fills both hands. When the fight ends (won, lost, withdrawn, or the game closed mid-fight) it shatters and your own weapon comes back; the victory or defeat screen says so. Diamonds roll honest dice with no blanks, an icon on every face and a crit of three on the top number, a size above the act. The monsters were tuned for honest dice without Diamonds: Act I a little lighter, the first two bosses lighter; Legendary's wise bot clears 10/10 again. Numbers in docs/BALANCE.md (16 Oct). Shots: docs/ingame/diamond_*.png (`node dev/diamonds.mjs`).

## 2026-10-16 — Legendary is a pro's road
Dave: make Legendary clearly harder than Hard, simply, so that finishing a campaign on it makes you a pro. Legendary monsters now have 35% more health than Normal (it was 15%, the same as Hard), on top of its harder announced moves. The wise computer player still finishes 9 campaigns in 10, with about seven retreats each; steady play that wins most boss fights on Hard loses about half of them here. The difficulty card says so. Numbers in docs/BALANCE.md (16 Oct).

## 2026-10-16 — camp, clear and compact
Dave: camp felt spacious and clunky; as you scroll you don't realize how many things you can upgrade, and upgrading is a fun part of the game. Reviewed every tab on a phone (a typical Act II hero: the Forge was six screens long, the tabs started a full screen down, every buy button looked the same whatever you could afford) and rebuilt it after the habits of good upgrade screens (Hades' mirror, Clash Royale, the Slay the Spire shop):
- The Forge / Gear / Hero tabs sit right under the hero chip and stay pinned while you scroll, with badges: Forge counts what your gold can buy, Gear what the traveler has that you can afford, Hero a perk still owed. Tapping the open tab again goes back to its top.
- One slim status bar replaces the big act-trail and potion panels: act, quest, the next fight, a progress strip, your potions and a buy button.
- Every tab opens with jump chips. The Forge's strip says "420 · 19 things you can buy now" and each chip (Body dice, Weapons, Powers, Talent dice, Pet) shows how many you can buy there; Gear's (On your body, Pack, Diamonds, Traveler) and Hero's (Stats, Difficulty, Perks, Powers) jump the same way.
- The Forge is one compact row per upgrade: an icon or die, the name with what it becomes ("Right hand d6 → d8"), one short line, and the price. A price you can afford is bright gold; one you can't is dim with "need 40"; a maxed one shows a check; a locked one shows what unlocks it ("d6 hand first", "Act II", "Level 4"). Sections run body dice, weapons, powers, talent dice, pet, and each one's longer explanation sits behind a "?". Talent dice show their faces as a row of small chips.
- The Hero tab shows your real Strength and Magic (it showed the class's starting dice), and difficulty is one row of four with the chosen one explained underneath.
Forge 6.0 → 3.3 phone screens, Gear 3.1 → 2.9, Hero 2.7 → 2.4 (each includes the campfire picture at the top). Shots: docs/ingame/campreview_*.png (before) and campnew_*.png, campearly_*.png (after; `node dev/campreview.mjs [port] [tag]`, `EARLY=1 GOLD=45` for a new hero with a thin purse), docs/ingame/campjump_*.png (`node dev/campjump.mjs`).

## 2026-10-16 — tap the trail to replay a quest; Diamonds grow by act, come as a perk, sell for a plain price
- Dave: at camp, tap a step on the act's trail to go back and play it again, or to return to the furthest one reached; never past where you have been. The camp bar's steps and the quest board's trail both take a tap: won quests are gold, the one you are on is bright, ones you can return to are dashed, and the rest are still ahead ("Quest 8 is still ahead. Win quest 7 first."). A question asks first ("Go back to quest 2? … A repeat win pays half the gold … Quest 7 stays open: tap it on the trail to come back"). Uses the old "Begin at a step" rules (save.js beginAt), which also stays in the hero menu for earlier acts. Not at a table (the table chooses the road together).
- Diamonds get better each act: d6 in Act I, d8 in Act II, d10 in Act III (no blanks and crits of three keep even a d6 a treasure).
- A level-up now and then (one in four, when the case has room) offers "A Diamond weapon" as one of its three choices; it goes into the case and is not a perk you keep.
- Diamonds can be sold, in the Diamond case at camp or straight from the spoils when the case is full, for what the plain weapon of its kind and size sells for, nothing more (Dave: it is made to be used). Fight drop chances eased (an ordinary fight 4%, an elite 35%, a boss 30%) so the perk keeps the total near one and a half an act.
Shots: docs/ingame/trail_*.png (`node dev/trailpick.mjs`).

## 2026-10-16 — the feel pass: crits, big hits, kills and a boss's fall
Dave picked three things to make QuestDice feel finished: the moment of impact, rule-bending charms, and a daily challenge. First, the feel:
- A crit (a weapon face with two or three icons: Silver and Gold top faces, every Diamond's top) now has its own moment: a bright metallic ring, "CRIT! +3 PIERCE" (or "DOUBLE CRIT!"), the die glows, the table jolts, a light flash, a buzz. The dice show every crit icon (a Gold top face shows three arrows; it showed one).
- Your swing makes a sound before it lands; pierce has its own; a hit of 15 or more jolts the table with a beat of hit-stop, and 25 or more shows a huge number.
- A monster that falls lands with a thump, a buzz and a jolt. A boss falls slowly to a boom, a roar and a brass swell, with "THE GOBLIN KING FALLS!", a gold flash and a big shake.
- Triples and straights jolt the table too; a win buzzes a little fanfare; the music's drums lean in when you are low or a boss is nearly down.
- All of it respects the reduced-motion setting (no shaking) and phones that cannot buzz. Check: `node dev/feelcrit.mjs` (logs the banners in order: "CRIT! +3 PIERCE | YOU STRIKE FIRST"), `SCRIPT='{"NW":10}' HP1=1 node dev/bigdice.mjs feel 390 844 goblinking` (the King falls).

## 2026-10-16 — charms: small trinkets that bend the rules
The second of Dave's three: items that change a rule rather than add a number (like relics in other roguelikes). You carry up to three, for good; each works in every fight, solo or at a table.
- Ember Locket: a blank weapon face burns anyway, 6 attack and 2 magic. Mirror Shard: every straight heals 12. Twin Coin: both weapon dice on the same number, +10 like a triple. Thorn Crown: every icon on your weapon dice counts double. Gambler's Bone: a 1 on head, hands or feet counts as a 6, for everything (triples and straights too). Wolf Fang: triples pay +20. Wanderer's Lantern: one more free reroll every round. Phoenix Feather: once a battle, a blow that would fell you leaves you at 10 ("PHOENIX FEATHER! BACK TO 10"). Blood Pact: start every fight with full magic but 8 less health. Heartstone: the heart die rolls twice and keeps the higher.
- Found: every boss offers a choice of two, an elite half the time one, now and then an ordinary fight; the traveler sells one about one camp in five (110 / 150 / 200 gold by act). With three already, the spoils offer a swap. At camp, Gear has a Charms zone (with a Drop that asks twice). Repeat wins give none.
- Worth (an Act II hero's average throw, about 28-31): the dice charms add 1.5 to 3 (5-10%); class matters (the Ember Locket does nothing for a ranger, whose bow is hardly ever blank); the Lantern, Phoenix and Pact change how a fight goes rather than a throw. The monsters were tuned without charms, so they are a bonus.
- Not yet: charms in the spoils of a table game (heroes bring theirs, and they work, but table victories do not offer new ones yet).
Shots: docs/ingame/charms_*.png (`node dev/charms.mjs`).

## 2026-10-16 — the daily challenge
The third of Dave's three: a reason to come back each day. A "Daily challenge" plaque on the title screen (with this phone's best today and a streak of days played).
- The same day for everyone: the hero of the day (a class, built for the day's act, carrying one charm of the day), five fights (the act turns with the days, I, II, III; three of its fights drawn by the day, then its elite and its boss) and the same dice seed. 28 of 31 days in a month have different fights, and every day a different class and charm.
- Score: battle points, +100 for every fight won, +250 for clearing all five. Play as often as you like; your best counts. Between fights you catch your breath (full health; drunk potions stay drunk). The page shows each fight's points, your best today, and the day's top ten.
- Share: a line to send a friend (the day, the class and charm, a row of ⚔️ 💀 👑, the score).
- Never touches a saved hero (the daily hero is never saved); the record of days lives on the phone.
- How hard: over two weeks of days the sensible computer player clears 42% of runs, the wise one 72% (`node tools/daily.mjs`).
- The leaderboard needs the new `qdDaily` block in `firestore.rules` published (docs/FIREBASE.md). Until then the page says it is not open yet.
Shots: docs/ingame/daily_*.png (`node dev/daily.mjs`).
- (later, 16 Oct) Dave: gold was not collected in the daily. It has no camp to spend at, so gold now counts as points: every coin your dice roll and every fallen monster's gold adds 1 to the fight's score.

## 2026-10-16 — hero colour variants
Dave painted 15 colour variants (three per class, all facing right) on a painted gray/white checkerboard, not real alpha. `dev/minicut.mjs` now spots that checker and cuts it away without eating wizard lightning, white robes, bows, swords or plumes; the 15 live in `assets/miniatures/<name>.webp`, trimmed and transparent. Each class keeps its original painting as the default; on create you pick a colour (Classic / Blue / Crimson / Green, and so on). The choice is saved with the hero, locally and in the cloud blob. At a party table two of the same class never share a colour: if that coat is taken, another free one is picked. The new paintings already look right, so they are not flipped in battle. Stamp `20261016w`. Shots: colour picker and a labeled contact sheet of the 15 on dark and light (`node dev/colorpick.mjs`, `node dev/variant-sheet.mjs`).

## 2026-10-16 — hero colours: three clear coats per class
After pull request 18 (15 new right-facing paintings and a colour picker) each class offered four coats, but its "Classic" (the old painting) wore the same colours as one of the new ones (the classic Bard and the Teal Bard are both teal and yellow), so two Bards at a table could look alike. Each class's own look now uses its new painting in its own colours, and the twin is gone: Knight blue / crimson / green, Ranger green / rust / grey, Wizard blue / crimson / white, Dwarf blue / crimson / moss, Bard teal / crimson / blue. Every hero is painted facing right, so none is mirrored any more; old saves keep their colour (an old "blue" Knight is the blue painting). Check: `node dev/colors.mjs` (the picker, and two Bards at one battle: teal and crimson).

## 2026-10-17 — knight dice watermarks
The knight's head, left hand, right hand and feet dice now carry Dave's brown line-art as a faint watermark behind the number and symbols (~42% paint opacity so it reads as about 30% on a 3D die, centred, ~88% of the face). The grid reads like a person. Other classes and the weapon / heart / talent dice are unchanged; `CLASS_BODY_WATERMARKS` in `js/gfx/dice/bodywm.js` is a class → {head, leftHand, rightHand, feet} map so the others can get a set later. Stamp `20261017c`. Shot: docs/screens/knight_dice_watermarks.png.

## 2026-10-17 — body watermarks for every class; wizard hat on Choose your hero
Dave: all five classes get body-die watermarks. Hands and feet share the knight's gauntlets and boots; only the HEAD changes (`assets/dice/heads/<class>.png`). Pointed dice (d4 / d8 / d10) paint the mark a little larger and stronger so the helmet and gloves read on a phone; the d6 boots stay as they were. Choose your hero was clipping the blue wizard's hat: the showcase now scales each miniature so the whole figure (hat, staff and all) stays inside the picture, without shrinking the ones that already fitted. Stamp `20261017d`.

## 2026-10-17 — merge main into the body-watermark branch
Main had moved (SVG body-marks mockup off in the game, +1 weapon faces, a reroll-break warning). Kept both: the live PNG watermarks stay on the white dice; `setBodyMarks` still turns on the SVG try-out and then skips the PNG so they do not stack. Stamp `20261017e`.

## 2026-10-17 — Choose your hero: the whole miniature stays in the picture
Dave's iPhone still cut the blue wizard's hair at the top of Choose your hero (Safari chrome, a short visual viewport, 100dvh vs svh). The showcase now sizes against `100svh` and sits the picture with `object-fit: contain` in a box that already has top padding for the Back button, so the whole image is always on screen — no JS measuring, and it still works if the PNG loads late. `wizard-blue.webp` itself has no headroom (the hair touches y=3); a later pass will recut all 15 hero paintings. Stamp `20261017f`.

## 2026-10-17 — repainted hero miniatures, clean cutouts
Dave repainted all 15 hero coats (knight, ranger, wizard, dwarf, bard × 3). New cutouts from the studio photos: BiRefNet mask + a colour-distance mask against the fitted backdrop, interior holes filled unless they are real background gaps, edges decontaminated and trimmed 1px, floor shadow cut, base fitted as a cylinder so it stays solid. Same files and format as before (trimmed transparent WebP, long side 512); `imgBase` re-measured for every look. The plain class files (`knight.webp`, `ranger.webp`, …) are now copies of each class's default coat. Stamp `20261017g`.


## 2026-10-20: camp artwork and contextual upgrades, review branch

Dave asked for a stronger visual pass after reviewing the first camp redesign screenshots. Work is on ui/camp-art-pass for review, with no live main deployment. The nine-slot board now has large shaded vector dice, existing body markings and weapon portraits, dark textured tile surfaces, clearer selection, and an inline inspector with a large current/next comparison. Camp services are organized as Dice, Powers, Gear, Supplies and Hero; Store remains a separate entry and shrinking is under Supplies. Existing rules, purchase commands, online mutation adapter, and save formats are unchanged. Removed obsolete grid styling; camp-specific visuals live in css/camp.css and js/g3/campart.js. No new runtime dependencies or image assets, and no additional 3D scene.

Verification: baseline and post-change npm test both report 318 passing / 2 failing out of 320, with the same pre-existing local server tests failing in test/server.test.mjs. The browser harness dev/camp-art-review.mjs exercises an actual d6-to-d8 purchase, exact gold, board refresh, local save/open round trip, closing/focus, five categories, Store, unaffordable and maximum states, a locked slot, weapon controls, talent access, reduced motion, and repeated open/close. It captures phone/short/tall/landscape/desktop layouts. See docs/ui-handoff/04-CAMP-ART-REVIEW.md for results and screenshots.

Limits: physical iPhone Safari performance, live cloud saves, remote online rooms, complete party play, and a full campaign were not verified. Screenshots are test fixtures. Battle magic-powers layout has not been redesigned in this pass.


## 20 October 2026: weapon workshop review checkpoint

Draft PR #30, branch `ui/camp-art-pass`: equipped weapon inspection now has an existing-art portrait, Forge/Train choices, authoritative current/target face previews, hand-cap explanations, exact prices and remaining gold. Pack and Diamond actions remain accessible. Right-hand two-handed inspection targets its own UID, matching existing independent die upgrades; no engine or save changes. Cache stamp: `20261020weapons1`. See `docs/ui-handoff/05-WEAPON-WORKSHOP-REVIEW.md` for screenshots, checks and limits. This checkpoint is for review, not live publication. Next bounded section is the talent editor.

## 20 October 2026: talent workbench review checkpoint

Draft PR #30, branch `ui/camp-art-pass`: talent dice now show a complete face grid, preview-first symbol selection, exact existing costs and remaining gold, usage limits, explicit no-refund clearing and separate die growth. Uses existing talent engine commands and online mutation adapter; no engine or save changes. Cache stamp `20261020talents1`. See `docs/ui-handoff/06-TALENT-WORKSHOP-REVIEW.md` for screenshots, validation and limits. Keep on the review branch until Dave approves publishing. Next bounded section: camp Powers organization/inspection, with the battle triangle reserved for a later section.

## 20 October 2026: camp power library review checkpoint

Draft PR #30, branch `ui/camp-art-pass`: camp Powers now has A/B/C slot browsing, equipped/learned/locked states, reusable battle glyphs and effect descriptions, current/next upgrade comparison, exact prices, remaining gold and explicit learn-and-equip/free-swap behavior. All-level previews use each class's cap. Unused power-row builders removed. No engine, class data or save changes. Cache stamp `20261020powers1`. See `docs/ui-handoff/07-CAMP-POWERS-REVIEW.md` for screenshots and verification. Not merged or deployed live. Next bounded section: battle magic-powers triangle and casting details.


## Camp framing checkpoint, October 21, 2026

User returned to the original illustrated concept and prioritized camp visual finish before battle magic powers. Applied wood framing, recessed slots, existing body artwork, selection corners and blue cloth inspector/road surfaces. No rule or save changes. Existing camp browser review passed; see docs/ui-handoff/08-CAMP-VISUAL-FINISH-REVIEW.md for scope, screenshots and remaining art gap. Continue on ui/camp-art-pass / draft PR #30, not live main.


## Painted campsite checkpoint, October 20, 2026

Added a single 155 KiB shipped campsite painting with tents, lanterns and mountains. Existing hero/pet miniatures and fire remain separate. Camp background drift is disabled. Phone banner and desktop stage have bounded dimensions. No mechanics, save or multiplayer changes. Review and resume details: docs/ui-handoff/09-CAMPSITE-ART-REVIEW.md. Keep changes on ui/camp-art-pass / draft PR #30. Next: review camp dice against existing battle dice artwork.


## Camp dice checkpoint, October 21, 2026

Camp now reuses battle face definitions, numeral paths and symbol paths for still previews, with separate size labels and an All faces current/upgrade comparison. Heart shows all six boosts. No rule changes or new downloaded artwork. Existing camp browser review and 125 preview cases passed. See docs/ui-handoff/10-CAMP-DICE-REVIEW.md. Next bounded section: battle magic-powers triangle. Work remains in ui/camp-art-pass / draft PR #30.


## Actual dice correction, October 21, 2026

Dave explicitly requested actual battle dice in every camp slot, including weapons and talents, highest numeric face displayed with lighter camp-only side shading. Removed approximated SVG silhouettes and now render the existing meshes/materials to cached portraits through the existing shared renderer/idle queue. Weapon workshop main image also uses its actual die. See docs/ui-handoff/11-ACTUAL-DICE-REVIEW.md. Do not substitute redraws again. No mechanics/save/multiplayer changes; work stays in ui/camp-art-pass / draft PR #30.


## Battle powers layout, October 21, 2026

Separated class powers A/B/C in the triangle from Potion/Heal/Heart Change helper row. Added persistent resource totals, calmer materials and scrollable detail/cast access for short phones. No spell handler or engine changes. Browser review covers selection immutability, scaled preview, actual cast cost, charge detail and heart actions across phone/landscape/desktop. See docs/ui-handoff/12-BATTLE-POWERS-REVIEW.md. Continue review on ui/camp-art-pass / draft PR #30; not live main.


## Magic visual finish, October 21, 2026

Dave requested a stronger art pass after finding the previous powers layout too basic and its triangle unbalanced. Added a single 28,512-byte violet material/haze asset, equilateral triangle with shared medallion coordinates, glass/metal lighting, quieter helpers and a textured selected spell card. Inspection scales the triangle proportionally. No mechanical changes. See docs/ui-handoff/13-MAGIC-VISUAL-REVIEW.md for geometry checks, actual screenshots, asset prompt and resume notes. Remains on ui/camp-art-pass / draft PR #30.


## Phone flow checkpoint, October 21, 2026

Reviewed connected camp -> upgrade -> Store return -> road -> real quest/roll -> spell cast -> save/open. Added explicit static portrait loading/failure feedback. The actual medium-detail battle dice remain; a softer lower-detail trial was reverted after only a small software-browser timing difference. No mechanics changes. See docs/ui-handoff/14-PHONE-FLOW-REVIEW.md for fixture scope, cold-loading observation and resume instructions. Still draft PR #30, ui/camp-art-pass. Physical iPhone checks and approval precede live publishing.

## 2026-10-21 — economy pass: rarer straights, weapons that wear out, gold as a currency (stamp 20261021a)
Dave's three, from the balance plan (docs/ideas/BALANCE_AND_IDEAS_2026-10-20.md), measured with the new tools/curve.mjs and tools/gold.mjs:
- **Straights grow with your biggest body die** (`STRAIGHT_MIN`, engine `straightMin`): d4 five in a row, d6 six, d8 and d10 seven. A straight now lands in about one round in three in every act (was about six in ten). The straight hint says so.
- **Weapons wear out** (`WEAR_BATTLES`): Bronze 4 battles, Silver 6, Gold 8 (a legendary as Gold; a Diamond is still one fight). Every battle a weapon is in your hands counts, won, lost or left; a weapon in the pack rests; a two-hander counts once. It never breaks mid-fight: after its last battle the hand is empty ("Your Bronze Sword is worn out after this battle. Equip a spare from your pack at camp."). With empty hands and an empty pack, a plain Bronze weapon of the class waits. No repair (Dave: losing a weapon you were saving is part of the fun). Weapon cards say "N battles left"; a worn weapon sells for less.
- **Weapons are found or bought, not forged or trained.** Spoils are mostly Bronze (`SPOILS_RARITY` 85 / 13 / 2; a boss or a nemesis leaves at least Silver); the Camp Store sells one Bronze, two Silver and one Gold (`STORE_RARITY`) at the usual worth (Gold is 4x Bronze). The Forge's weapon rows now say how long a weapon has left.
- **Monster gold grows slowly** (`ACT_GOLD` 1 / 1.1 / 1.2, was 1 / 1.3 / 1.8), so the dice stay about 60% of what a fight pays: about 67 / 112 / 224 gold a won fight in Acts I / II / III (was 74 / 202 / 341). The dearest thing in the game is a Gold d10 weapon at about 550.
- Results (Normal, wise bot, 15 campaigns): all cleared; fights won 98 / 98 / 95%, bosses 95 / 90 / 88%; heroes end each act holding a mix of hammers, bows, staves, swords, spears and maces, mostly Bronze and Silver (before: everyone carried a two-handed bow). The bot now keeps spares and fills an empty hand from its pack (tools/sim.mjs `botReady`).
- For the UI builder: a "battles left" mark is on every weapon card (small text); the Forge's weapon rows and the hand sheet's Forge / Train tiles are gone or say how long the weapon lasts. Shot: `node dev/wear.mjs` (Gear tab and the victory line).
- **Hard and Legendary after the pass** (wise bot, 15 campaigns each): Hard got harder, as Dave asked (Normal felt easy, Hard felt normal): 11 / 15 campaigns cleared, bosses 70 / 64 / 69% (was 15 / 15 and 83 / 77 / 88%). Legendary went too far (4 / 15 cleared), so its monster health is x1.4 (was x1.6): 15 / 15 cleared, bosses 65 / 53 / 63%, a pro's road again. Normal: 15 / 15, bosses 95 / 90 / 88%. Tables: `SKILL=<difficulty> STYLE=wise sh tools/curve-all.sh 3 3`.

## 2026-10-22 — the second pass: heart by symbol, a recap that waits, Bonus Goal wagers, magic priced by gold, monsters that roll dice (stamp 20261022a)
Dave's go on the rest of the balance plan (docs/ideas/BALANCE_AND_IDEAS_2026-10-20.md). Triples stay as they are; the team ideas wait.
- **The heart backs its symbol on any face**: a heart 1 (heal) adds +2 to every head, hand and feet die showing a heal face (1, 5, 9); 2 pierce (2, 6, 9); 3 magic (3, 7, 10); 4 gold (4, 8, 10). It still matters with d10 dice. (`out.heartSlots` names the dice for a future glow.)
- **The recap no longer hides the next round**: the board gets a beat after the replay (the last hits, falls and numbers finish), and the ROUND banner waits until you close the recap. Check: `node dev/recapbeat.mjs`.
- **Bonus Goals are a wager**: "Bet 10 gold" (20 in Act II, 30 in Act III) to try; pull it off and win for three times the stake; miss it or lose the fight and it is gone; Decline costs nothing (no more Honor gold). Short of gold, a small free one for the stake's worth. Shot: `node dev/wager.mjs`.
- **Magic, priced by gold** (Dave: "go up in relation to how much magic is worth in attack compared to the gold it costs to upgrade"): at camp about 105-175 gold buys +1 to an average round, so the 60 / 140 / 260 gold power levels add a quarter, a quarter more, then half more of the power's number (at least 1, 2, 4; level 3 doubles; was +50% a level). Charges start one lower and climb by 2 (Storm Coil 4, 6, 8, 10), and a release grows an eighth, a quarter, a half by level (Storm Coil level 3: 42 and 21 splash, was 65 and 32). Healing with magic costs 1 more each time in a round (2, 3, 4...). Lucky Verse in line with the other every-round powers (3 or 6 attack).
- **Monsters roll dice, not big fixed numbers**: a blow's fight bonus (act, step, difficulty, the kind of fight) is rolled as extra dice of the monster's own size (up to 3 more), the rest stays a small number: "3+4d8", "6+3d12". Same average blow, real swings. Plates, the info sheet ("base 3 + 4d8") and the recap's dice say so. Shot: `node dev/monsterdice.mjs`.
- **Act III fights end sooner**: ordinary monster health x2.1 (was 2.35), Act III bosses x1.6 (was 2.2): about 7 and 13 rounds (were about 7.5 and 18).
- Results (wise bot, 15 campaigns each): Normal 15 / 15, bosses 92 / 92 / 93%, below half health in a third to two fifths of fights (tenser than before); Hard 14 / 15, bosses 71 / 80 / 79%; Legendary 10 / 15, bosses 55 / 60 / 76% (kept at x1.4: at x1.3 it played like Hard). Tables: `SKILL=<difficulty> STYLE=wise sh tools/curve-all.sh 3 3`.
- Found on the way: the bot looped forever when a heal cost more than 2 (fixed in tools/sim.mjs); each party hero's heal count resets every round.
- (22 Oct, later) Dave: **2 magic heals 3, the same price every time** (`HEAL_AMOUNT` 3, was 4; the rising price from the second pass is gone: magic is your health). Normal, wise bot: 15 / 15, bosses 97 / 83 / 98%. Stamp 20261022b.
- (22 Oct, later) Dave: **the magic sheet stays open** after a power, a heal or a heart turn (you may want two or three); Close shuts it (`node dev/sheetstays.mjs`). **A charge power stores or releases in a round, not both** (engine `castPower` / `powerState`; the sheet says so). The charge line on the sheet now shows the real steps (Rally Cry: +2 / +2 for the first, then 4, 6, 8). Stamp 20261022c.
- (22 Oct, later) Dave: **the magic cap grows like health**: +1 every two levels (12 at level 1, 13 at 3, 17 at 11; the Wizard 3 more), and a new perk, **Deep Well** (+2 max magic, up to three times). Magic shows its cap, "11/13", on the battle chip and the magic sheet. Stamp 20261022d.
- (22 Oct, later) Dave: **a straight needs all your dice but two** (`STRAIGHT_RULE`, engine `diceInPlay` / `straightMin`): 7 dice five in a row, 8 dice six, 9 dice seven; adding the 8th die retires the 5-straight. Banners stay "6-STRAIGHT". Normal, wise bot: 15 / 15; straights in 4% / 11% / 25% of rounds by act (were 34 / 30 / 30% under the die-size rule), since heroes reach 8 dice early in Act I. Stamp 20261022e.
- (22 Oct, later) Dave: **only the five-straight goes**: 7 dice need 5 in a row, 8 or 9 dice need 6 for the rest of the game (`STRAIGHT_RULE.max` 6). Normal, wise bot: 15 / 15; straights in 32% / 45% / 44% of rounds by act (with big dice and three rerolls a 6-run is easy to chase). Stamp 20261022f.
- (22 Oct, later) Dave, after the chase numbers (a player chasing with three rerolls lands 6 in a row about nine rounds in ten with nine dice, 7 in a row about seven in ten; first-roll-only rules were not wanted): **with all nine dice, seven in a row is the minimum straight**. 7 dice: 5, 8 dice: 6, 9 dice: 7 (`STRAIGHT_RULE.max` 7). Bots: straights in about 4% / 11% / 25% of rounds by act. Stamp 20261022g.
- (22 Oct, later) Dave: **five in a row is gone; six in a row is the shortest straight for the whole game, and the prize climbs 10 / 20 / 30 / 50** for 6 / 7 / 8 / 9 in a row (`STRAIGHT`, `STRAIGHT_RULE` min 6), attack or gold as before (a softened top: 10/20/40/80 let a chaser in Act III land 40 four rounds in ten and 80 one in ten). Hint, lessons and the help page say so. Normal, wise bot: 14 / 15 cleared, bosses 88 / 77 / 88%, straights in 20 / 30 / 29% of rounds. Stamp 20261022h.
- (22 Oct, later) Dave changed his mind: **straights double, 10 / 20 / 40 / 80** for 6 / 7 / 8 / 9 in a row (knowing a full chase in Act III can land 40 about four rounds in ten and 80 about one in ten). Stamp 20261022i.
- (22 Oct, later) **Heart Boost** (Dave picked the name): when the heart (1 heal, 2 pierce, 3 magic, 4 gold) backs dice showing its symbol, the heart's socket and those dice glow in the symbol's colour (green, orange, purple, gold) and beat together, lub-dub about once a second, with a flare and a little hop when a die joins; a "HEART BOOST +4 heal" chip shows under the counters. Unlike a straight's steady cyan or a triple's line. Brightness is one knob (`tray.heartStrength`, 1 for now) for Dave to tune by eye. Shot: `node dev/heartboost.mjs [out] [strength]`. Stamp 20261022j.


## Merge approval and integration, October 21, 2026

Dave authorized merging PR #30. Integrated main through 9056a4cd18531be160f64e7b61d2eab5c14a44b2, preserving its newer balance, weapon wear, heart-boost, magic-cap and sheet-stays-open changes. Resolved the plan/cache-version conflicts and adapted the inline weapon inspector to display wear/current faces instead of retired Forge/Train controls. Combined suite: 325 pass, same two known server-test failures; connected phone journey passes with no page errors.

## Power words match the rules, October 21, 2026

Dave on Storm Coil in camp: the text said the charges paid 4, 6, 8, 10, while the compare box said "+5 attack per charge → +6 per charge". Neither number was real. Every power's words now come from the same engine helpers the battle uses, at every level:
- Charges: a new `chargeValues(card, n, lvl)` lists what each stored charge is worth, and `chargeGain` adds them up. A level now lifts each charge by CHARGE_LEVEL_FRAC and rounds each one, instead of rounding the total, so the list can be read out exactly: Storm Coil 4, 6, 8, 10 (28) → 5, 7, 9, 11 (32) → 5, 8, 10, 13 (36) → 6, 9, 12, 15 (42). Only level 2 moves, by about 1 (35 → 36). The camp compare box reads "+4, 6, 8, 10 attack (all 4: +28)". The release reveal counts up the levelled charges.
- Round powers (Meteor, Grudge): a new `roundGain` is what the engine casts. The text used to multiply the levelled per-round number, which overstated Grudge. The words now give the real numbers for sample rounds: "Round 2: +5, 3: +8, 4: +10 attack".
- Scale powers (Aimed Shot, Arc Bolt): "up to" now counts the level's extra dice and the lower magic top ("up to 5d6 for 4 magic"), and the camp magic range uses `scaleMax` at your level.
- Lucky Verse: the cast reveal's table said +5 / +9 attack and +2 magic. It now shows the real +3 / +6 and +1 magic, and their levelled values.
- The old battle detail panel (showPowerDetail) uses the same effect line. "Base description" is labelled "level 0".
- test/powertext.test.mjs casts every power of every class at levels 0 to 3 and checks that the camp line and the effect line show exactly what the engine adds. dev/powerwords.mjs screenshots a levelled power's sheet line and cast reveal.


## 21 October 2026: battle dice satin review, separate from live main

Dave approved a modest satin-material exploration, with smoothness and clear dice as priorities. Branch `ui/dice-satin` starts at main f5c2c70. Existing clean dice keep lighter resting sides and restrained surface highlights; no new assets, geometry, lights, passes or animation loops. See `docs/ui-handoff/15-BATTLE-DICE-SATIN-REVIEW.md` and `docs/screens/dice-satin/`. Actual battle review covers d4/d6/d8/d10 screenshots and physical throws, unchanged seeded boards/geometry, no page errors. npm test: 330 pass, same 2 known server failures. Do not claim physical iPhone FPS verification. This new checkpoint needs visual review before merging, unlike camp/magic work already merged in PR #30.

## Font review, October 21, 2026

Dave: "the camp fonts are getting kind of too many... stick with just a few". dev/fonts.mjs counted what every screen asks for. There were six families: Oxanium, Inter, Cormorant Garamond, Cinzel (loaded separately by the battle HUD), Georgia (two badges) and Archivo Black (the logo, plus banners and titles). One camp grid mixed three of them. Now there are three, each with one job (css/fonts.css, loaded last):
- **Oxanium**: the game's voice. Buttons, tabs, labels, numbers, prices, badges, and the "To the road" button.
- **Inter**: reading. Descriptions, hints, small print.
- **Cormorant Garamond**: names and titles. The screen title, hero, power and monster names, story text, and the battle's round and quest titles (this replaces Cinzel; --serif points to it, and hudkit no longer loads Cinzel).
- Archivo Black is used for the QuestDice logo only. Victory and defeat titles, banners, room codes and the round number flourish use Oxanium 800.

## Magic value pass, October 22, 2026

Dave: test cheaper upgrades and stronger charges side by side, put a rough exchange rate on gold, magic, attack and health, and make the upgrade words clear and short. The new tool is tools/worth.mjs (+ worth-all.sh). It replays the same fights with and without one purchase. docs/balance/MAGIC_VALUE_2026-10-22.md has the exchange rate and the results.
- Power levels cost 50/90/140 gold (was 60/140/260). Every charge gets +2 a level (CHARGE_LEVEL_ADD [0,2,4,6]; CHARGE_LEVEL_FRAC is now zeros). Every-round powers still get about +1.
- Camp power page: "Total 28 attack", the compare box shows Total → Total, "Upgrade adds: +2 attack each charge (+8 total)", and the level list shows totals. The base description and the charge "when" line are gone. Shorter charge texts in data.js.
- Sim bot: it recharges big moves (3 magic) and buys power levels after its dice, keeping 30 gold back.
- Campaigns (20 each, same bot): 17 → 20 of 20 cleared, power share 5–7% → 6–9%, Act II boss wins 89% → 78% (watch this).

## Potion reminder, October 22, 2026

Dave won on Hard with the wizard, then died at the very end: "I forgot to charge my potions." When you tap "To the road" with room on the potion belt and gold for at least one potion, the button is replaced for a moment by "Potion belt: 0 of 2. Refill for 40 gold?" with **Refill 40** (it buys what your gold allows) and **Go anyway**. The reminder appears once per camp visit and never blocks you. dev/potask.mjs checks Refill, Go anyway and a full belt.
- (22 Oct) The camp status row now says **Potions** above the green crosses, matching "Act II" beside it (Dave: "needs to say potion somewhere"). Checked by dev/potlabel.mjs.
- (22 Oct) **Ember Locket** cut down (Dave: "op for me, my gold weapon has 4 zeros"). It paid 6 attack and 2 magic on *every* blank weapon die. On a brutal weapon (4 blanks of 8) that added about 3 attack and 1 magic a roll, more than the weapon's own 3.9. It now pays **3 attack and 1 magic, once a round**, which is about a third more on a mostly-blank weapon: a consolation, not a reason to miss.
- (22 Oct) **No pinch-zoom** (Dave: "I can pinch to zoom on all these screens; that is wrong"). The viewport is maximum-scale=1 / user-scalable=no (which also stops iPhone zooming into a text box). The page is touch-action pan-x pan-y, and buttons are manipulation, so a quick second tap is not a double-tap zoom. js/main.js stops Safari's own gesture events and two-finger touch moves, because iPhone Safari ignores user-scalable=no. One-finger scrolling is unchanged, and no part of the game uses two fingers.
- (22 Oct) **Bring a Diamond moved to camp** (Dave: "not sure why this weapon is here right before I go to battle; it should be very clearly an option at camp"). The Left / Right picker now sits on the camp's Dice page under your dice, titled "Bring a Diamond next fight?", and turns into "Bringing a Diamond next fight" once one is chosen. The road screen no longer shows it, and the Gear tab's Diamond Case still works too. Checked by dev/diamondcamp.mjs.

## Charm audit, October 22, 2026

Dave: "check the other charms for anything else that's overpowered". `WHAT=charms sh tools/worth-all.sh 80` replays the same fights with and without each charm, for 5 classes and 3 acts. The tables are docs/balance/charms_2026-10-22_before.txt and _after.txt. Before the change, five charms stood well above the rest:
- **Twin Coin**: a full triple whenever both weapon dice matched. Weapon numbers cluster, so a two-handed bow matched 4 rolls in 10 (+6 to +9 attack a round). Now **half a triple** (5 / 8 / 10).
- **Gambler's Bone**: every 1 on head, hands or feet was a 6 (+7 a round). Now **one 1 a round** (+4 to +5).
- **Wolf Fang**: triples paid double, and the bot chased them (+5 to +10 a round). Now **half again** (15 instead of 10).
- **Mirror Shard**: 12 health on every straight (10 to 14 health back a fight in Acts II and III). Now **6**.
- **Blood Pact**: full magic, which grows with level. Now **+6 magic for 8 health** (+8 still measured top).
- **Heartstone** did almost nothing (rolling the heart twice rarely helps; higher isn't always better). It now **doubles your heart die's boost** (+3.5 to +4.3 a round).
- Lantern, Phoenix (pure safety), Thorn Crown and the fixed Ember Locket were already in range and are unchanged.
After the change, every charm lands between about +1 and +5 attack a round, or 1 to 7 health a fight. Lantern and Blood Pact sit at the top, and Thorn Crown and Ember Locket at the bottom.
- (22 Oct) **Weapons rethought: proposal only**, in docs/ideas/WEAPONS_REDESIGN_2026-10-22.md. It covers honest dice whose blank patterns give each weapon its character, one-handed weapons only, a bow with arrow kinds (fire splash, frost freeze, broadhead pierce), symbols that pay your hand's number, and metals that add symbols and battles but never numbers. Measured with the new tools/weaponlab.mjs. Five questions are waiting on Dave before any code changes.
- (22 Oct) **The lab: a playable Bronze archer, behind ?lab** (ChatGPT via Dave: "the first milestone should be a playable Bronze archer with four understandable ammunition choices"; "keep experimental saves separate and do not enable the system in the live game without my approval"). Open the game with `?lab` (https://davepartin.github.io/questdice/?lab) and it plays the weapons experiment: the six one-handed weapons, and the Ranger with Arrows (left) and a Bow (right). js/lab.js holds the switch. Lab heroes save under `questdice.lab.hero.*`, never touch the cloud or online tables (cloud.js refuses with a plain message), never retire anything (startBeta), and a small yellow "LAB · new weapons" tag sits at the top of every screen. At camp the Arrows' weapon page has an **Ammunition** picker (Normal / Piercing / Fire / Frost, free to change, one line each); the face chips and the 3D die show each arrowhead as its mark (purple arrow, orange flame, blue snowflake) with no number. In a fight an arrowhead raises a banner like the Heart Boost one ("FIRE ARROW · 2 to the others"; with a Strength of 1 the splash is 0, and it says "too weak to spread"). Quest cards in the lab add a **Scouts say** line from the monsters' own moves (armoured, a pack, heals, hits hard, cuts through block; at most three). The Axe draws as the Mace and the Arrows as a Spear until they have models. Without `?lab` nothing changes (checked: no tag, today's two-handed bow, no scouts line, `questdice.hero.*`). Screens: `node dev/lab.mjs`.
- (22 Oct) **No spoilers while the dice roll** (Dave: "the banners and lines spoil the triples and straights; it is fun for a human to wait and see what happens"). doRoll and doReroll drew the results (totals, Heart Boost and triple banners, triple bars, straight glow and chooser) before the dice animation started. Now `B.rolling` holds renderShape to an empty, idle readout and a "Rolling…" caption until the last die lands, then everything arrives at once. Same path for solo, shared-phone and online games. Check: `node dev/rollspoil.mjs` (rolls and one-die rerolls; nothing shown mid-roll).
- (23 Oct) **Teamwork pass, in the lab** (docs/ideas/TEAMWORK_IMPLEMENTATION_HANDOFF_2026-10-22.md, Dave's approved decisions; ChatGPT reviews, Claude edits). `TEAMWORK` in js/data.js: Heart to Heart replaces Heartbeat (+10 attack for each hero whose heart matches a friend's on the same monster), every hero's heart face and Ready under its miniature, charms resting (owned charms kept), perk cards with exact effects and before/after. All off in the live game; `?lab` turns them on together with the weapons experiment, the measured arrow rules, fury from round 4 and the class rules (Guard, Dig In, Verse for a friend). Progress log, test list and the open decisions are at the bottom of the handoff file.
- (23 Oct) **Released to everyone (js/release.js)**: release 1, the teamwork pass (Heart to Heart, heart faces and Ready, charms resting, perk previews); release 2, the six one-handed weapons with Bow and Arrows, the measured arrow rules, metal icons on the new weapons, the class rules (Guard, Dig In, Verse for a friend), old two-handed Bows converted on load. Monster fury stays in `?lab` (it halved campaign clears on Normal). Numbers and open questions at the bottom of docs/ideas/TEAMWORK_IMPLEMENTATION_HANDOFF_2026-10-22.md.



## 22 October 2026: ivory d6 inset identity and material pilot

Dave authorized implementing and deploying the d6 material prototype directly for live development review. Six-sided ivory head/hands/feet now use compact black inset corner icons instead of background watermarks, with mirrored gloves and five class head silhouettes. Recessed numerals, subtle plastic grain, warm brass edges and balanced satin highlights use the existing atlas and geometry. Other die shapes and weapon/heart/talent materials are unchanged. See docs/ui-handoff/16-IVORY-D6-INLAY.md and docs/screens/ivory-inlay/. Browser checks: 240 face layouts at low/med across all classes, no corner/result overlaps, actual throws, selected/bound states, short phone and camp portraits, unchanged mesh/geometry counts and atlas sizes, zero page errors. npm test: 331 pass, the same two known server failures. Physical iPhone FPS remains unmeasured. Cache stamp 20261022ivory1. Next: Dave reviews the live ivory d6 at phone size before extending the treatment to other shapes.


## 22 October 2026: four clean body dice replace identity artwork

Dave removed corner icons and all background watermarks. Head, both hands and feet share four canonical white dice: d4/d6/d8/d10, number plus effect symbols only. bodyfaces.js holds immutable face sets with unchanged FACE_PAY, and render caches share atlas/geometry by size/quality across slots/classes. Removed runtime watermark imports, preloads/rebuild hooks, face painting and camp-cell body art; no old watermark image requests. Retained the existing clean materials and side lighting. See docs/ui-handoff/17-CLEAN-BODY-DICE.md; it supersedes the corner-icon experiment. Checks: 80 class/size/slot combinations share four low-quality atlases/geometries, real physical throws/screenshots for all sizes, camp portraits, no page errors. Unit checks exact payouts and shared-set immutability. Full suite: 332 pass, same two known server failures. Cache stamp 20261022cleanbody1. Deploy within the existing development-game authorization.


## 22 October 2026: slower Heart Boost pulse

Dave found Heart Boost too fast and blinky and requested about 75% slower. HEART_PERIOD in js/gfx/dice/tray.js is now 4.2 seconds, up from 1.05: one-quarter frequency, with the same waveform stretched over four times the duration. Both socket rings and floor glows still sample the same beat(time), keeping the heart and boosted dice synchronized. No brightness, selection, mechanics or roll changes. Syntax check and 500 waveform samples confirm exact time stretching. Cache stamp 20261022slowheart1.


## 23 October 2026: tutorial pictures and six-hero crowding

ChatGPT's review of Release 2 asked for the tutorial pictures and the six-player crowding to be fixed first, because both affect understanding. The Learn to play boards (assets/tutorial/board-*.webp) are re-rendered from the real tray with the released rules (dev/trayshot.html now calls applyRelease): the knight's sword shows +4, the hand 4 and talent 2x make 12, and the Weapons Triple picture uses sword +4, head 4, shield +4. The weapon face close-ups come from a new dev/faceshot.mjs, which aims a camera straight down the numbered face on the same tray. That replaces the dice gallery tutart.mjs relied on, removed back in d876776. The lessons now show red +4, blue +4, +0 and a Silver +4 with its pierce arrows; the old +3 pictures are gone. The text no longer says Silver and Gold fill blank faces (metal adds symbols, never numbers). The unused pet board picture was dropped, since the pet left the tray for the battle HUD.

When three or more heroes lock onto one monster, they now stand three abreast, and the fourth to sixth stand a step behind and between the heads in front. In a crowd the names step aside and only the heart faces show, with a green ring for Ready and a pink glow for Heart to Heart; the round's banner still names the +10. Before, four heroes on one monster ran off the left edge, and names and +10 labels overlapped. From four heroes (was five) the waiting cards also use just the face and ring, because "Not ready" spilled off the edge. Checked with node dev/hearts.mjs shots 6 0,0,0,0,0,0 (all six on the ogre), a 4/2 split, and four heroes.

Knight's Guard was live in Release 2 but invisible. Shield Up at a table makes the Knight take the monsters' double share, yet the card said only "+4 block", the rules said the slowest hero is always the target, and the banner said SLOWEST FEET. That is the first of ChatGPT's three playtest moments ("someone deliberately takes the heavier hit"), so it now shows wherever players read. The Shield Up card adds "With friends: you step in front and take the monsters' double share, not the slowest hero." The round report carries leaderWhy ('guard' or 'feet'), the banner reads MONSTERS TARGET ANN · SHIELD UP in green, the round card says "Ann stepped in front (Shield Up)", and the rules sheet names it. The Dwarf's trait now mentions Dig In (heals 2 a round from round 5). Both lines are added in applyRelease, so they follow the same switches as the rules. Checked with GUARD=1 node dev/hearts.mjs shots/guard 3, and test/classid.test.mjs checks the report.

## 23 October 2026: Release 2 evaluation, measured properly

ChatGPT's review asked for evidence before any further balance change, so none were made. docs/balance/RELEASE2_EVAL_2026-10-23.md has the full report; every table sits beside it as release2_*.txt, saved batch by batch.
- **Magic style.** The old spend-versus-save test never compared the decision: the look-ahead player ignored the switch. A new tool, tools/magicaudit.mjs, counts every cast. The styles now spend 5 to 8 magic a fight for the Wizard; spending is never worse, and hoarding costs the Bard, Knight and Dwarf 1–4 health.
- **Wizard.** Measured on 5 independent campaigns, paired, the Wizard is mid-pack (13.2 health a fight). A Barrier start helps by 1.6 ± 0.4; stronger Missile or Coil, or 4 more health, do nothing. Its real oddity is 8–11 unspent magic at the end of every fight.
- **Six heroes.** Party sizes 2/4/6 with equal progression, 10 campaigns each, with and without bots that use Heart to Heart and Guard on purpose. Six heroes win 87–88% of battles against 96–98%, and teamwork does not close it: the six-hero scaling is the suspect.
- **Replay.** The round replay is fitted to 15–19 seconds however few strikes it shows.
- **Waiting for Dave:** softer six-hero scaling, the Wizard start or a magic outlet, and a replay that scales with the strikes.

## 23 October 2026: Enemy Details, Bonus Challenge, and a quick-replay preview

ChatGPT's UI review: the art was strong, but framing crowded out the miniature and the decision, and the offer did not fit one phone screen.
- **Enemy Details** (tap a monster twice): "Enemy Details" title with the monster's name large; a tall panel down to the action buttons; the miniature about twice the size, unboxed; health, speed, attack and defence beside it; one strong Next Move card ("Chill · 4–13 pierce", or "Phase · only pierce hurts"); Other Abilities with their plain words. No scrolling on 390×844, 430×932 or 375×667.
- **Bonus Challenge** (solo) and **Secret Objective** (multiplayer): one parchment page. The hero's miniature stands beside the title with "Offered by the Lantern"; then the objective and rule; then wager, return if successful and net gain ("Net gain: 20 gold if you pull it off and win. Lose the wager if you fail."). Bet / Decline sit at the bottom. The scenery is a strip and the separate story box is gone. It fits 390×844 and 430×932; on 375×667 it scrolls with the buttons kept in view. dev/uipass.mjs checks both screens.
- **The table's "Saved" line** no longer runs off the right edge.
- **Quick-replay preview:** `?pace=actions` gives every strike the same short beat (about 1.45 s) instead of fitting each round into 15–19 seconds. It is opt-in and marked "PREVIEW · quick replay"; the live default is unchanged until Dave has tried it. dev/pace.mjs measures it.

Dave on the objective screen: "less text, very clear, almost like a little card you would draw in a board game". It is now a single parchment card in the middle of the screen, with no hero picture and no story box:
- the kind (Bonus Challenge or Secret Objective);
- the objective's name, large;
- its one rule;
- the stakes as one or two coin chips ("Bet 10 gold" / "Win 30 gold", "Win 80 gold" / "Fail: pay 20", "Win 20 gold").

A small "More" opens the story, the full terms and the cover line. Below the card: Bet / Accept and Decline, or Continue when the objective is assigned. js/secrets.js gives each secret card its short chips (rewardChips) beside the full sentence. The double-size miniature stays on Enemy Details, where it was meant.

## 23 October 2026: road test results, compact (T09)

A test on the road (Wisdom, Strength, Speed) now shows its roll once, as the result card's top line ("Won · 4 to 3"; at a table: "Ann won · 4 to 3"). The story underneath is a short outcome and its consequence ("Next fight: +2 attack in round 1"), without reciting the roll mid-sentence ("…, 7 against 2, …") or extra narration. 15 result lines in js/roads.js were rewritten; js/g3/scrui.js roadResult and js/g3/online.js roadDone put the roll in the kicker. Before/after screenshots: docs/team/tasks/T09/. dev/trialshot.mjs takes PORT= and OUT= for before/after pairs.

Cards preview, 24 October (T05, branch claude/cards-preview): Grok's approved card family drawn from live game data on the weapon spoils, the pack and Gear rows, the store shelf, the Bonus Challenge, the wager and the secret-objective envelopes (js/g3/cards.js, css/cards.css, assets/cards/). The #42 chain was merged once (it contains #36, #39 and #41). Prices, wear and inventory behaviour are unchanged and drawing a card never wears a weapon (tested). The offered-bribe wording now separates done-and-won (2G), won-not-done (nothing) and team defeat (G/2, and G/2 more when every offered bribe was taken); rewardChips is exported. 371 tests pass. Layouts checked at 375 and 390 px in headless Chromium; not Safari. Notes: docs/team/tasks/T05.md.
## 24 October 2026: Share battle report (T10, branch claude/battle-report, not deployed)

Dave's playtest death (Act II, level 6, three monsters, a potion, then dead in the attacks) could not be explained because nothing recorded the fight. After any fight, the victory and defeat screens now offer a small **Share battle report**: the last three fights are kept on the device only, and shared (the phone's share sheet, or Copy, or Download) only when the player chooses. A report holds the build, mode, difficulty, act, step, class and level, equipment, powers, perks and road effects, the enemies, and for every round: the moves shown before the player committed, health at the start, just before resolution and after, potions, powers, final dice, the attack, block and pierce totals, each monster's rolled damage and what block took off it, and the blows in the order they landed with the lethal one named. Captured facts and derived values are kept apart, and what a path cannot supply is marked unavailable.

It reuses the engine's own round report. The engine gained one optional observer (`CAST_HOOK.trace`, five call sites) that only copies; a test proves the same dice, round reports, final state and next random number with and without it. No Firebase write, no cloud-save change, no combat, balance, RNG or replay-timing change. Solo and shared phone are recorded in full; an online table is recorded from the view this phone receives (the table view now also carries the last round report on the victory and defeat screens), without other heroes' powers, potions and dice. Practice and the daily challenge are not recorded. Each report is bounded (40,000 characters; the earliest rounds go first); storage trouble never interrupts the game. 373 tests pass (11 new). Checked in headless Chromium at 390×664 and 375×548, not on a real iPhone; native sharing only through a stub. Details, measurements and limitations: docs/team/tasks/T10.md.

Review fixes, same day (Director's review of the report branch): memory and storage are one list merged by report id and recency, so a failed write never hides the newest fight; a report is never longer than its bound (the size is measured with its own notes, rounds can go down to one, and the last resort is a short record of how the fight ended); online reports record only what the view shows (a potion is an inferred event with recipient and healing unavailable; health before resolution is `exact` or `last observed` by the table's command counter, and no lethal blow is derived from uncertain health). Also: a potion thrown to a friend on a shared phone is now recorded; the sheet keeps its buttons in view with three reports; the "Could not save" toast in the browser runs was the test hero having no save record (same on a main build; `dev/savetoast.mjs`). 380 tests pass (19 for reports). Details: docs/team/tasks/T10.md.

Phone preview, same week (the Director's request): PR #40 stays unmerged and the game at the root is untouched. Pages serves only `main`, so a copy of this branch lives in `preview/battle-report/` on main (`node tools/preview.mjs <repo> battle-report`; removed again with `git rm -r preview/battle-report`). Any page under `/preview/` keeps its own heroes, battle reports and daily record (`questdice.preview.*`, `qd.preview.*`) and cannot reach the cloud; a small tag shows the build (`20261024report3`). Only sound, hints and "tutorial seen" are shared with the live game on the same phone. 381 tests pass. Not yet tried on a real iPhone: that is Dave's check.

Real-iPhone report, 24 October: Dave's preview report (build 20261024report3) transferred complete and matched his screenshots (route, Share or Copy, not confirmed). Two refinements on the branch, stamp 20261024report4: a weapon in a slot whose die is not unlocked is labelled "equipped but NOT IN PLAY"; a file share no longer sends the first three lines as text beside the file, which apps like Notes inserted as well as the file's contents (the doubled heading). The preview folder on main is not refreshed. 382 tests pass.

Dave confirmed the route: Share, then Copy inside the iPhone's native share menu (passed on a real iPhone, report complete with JSON). That copy took the text and the file's contents together, which is why the three-line heading doubled; fixed in 20261024report4 (untested on a phone). Still untested on a real iPhone: the sheet's own Copy button, file attachment sharing, Download. Table in docs/team/tasks/T10.md.

Preview refreshed to build 20261024report4 through PR #43 (preview folder only; live game still 20261023road). The stored preview reports are kept, but nothing opens the report sheet except the victory and defeat screens, so Dave needs one more finished battle to test. Still untested on a real iPhone: heading once after Share then Copy, the sheet's own Copy, Share then Save to Files, Download, online, shared phone.

Menu → Battle reports, 24 October (build 20261024report5): Dave could open the report sheet only from a victory or defeat screen. "Battle reports" is now an item in the title, hub and camp menu (the round button, top left) and in the hero menu on the board and road. It opens the same sheet over the stored reports. Not in the in-battle or online table menus. Checked in headless Chromium after resuming a saved hero at camp; not yet on a real iPhone. 382 tests pass.

Real-iPhone check of report5, 24 October: Dave reopened a stored report from Menu → Battle reports and used the sheet's own Copy button; the paste held both rounds and complete JSON, one heading, no extra prefix, and kept its original report3 build label (passed). Not verified: native Share after the report4 change, file attachment sharing (Save to Files, Messages, mail), Download, online, shared phone. No further phone testing requested for now; PR #40 stays unmerged and the live game unchanged. Table in docs/team/tasks/T10.md.

Director review of PR #40 at fefb856, 24 October: no new blocking finding; recommended for merge approval. Merging puts the change on the live game, and no deployment is authorized yet, so the PR stays open. The native Share title-prefix fix (report4) and file attachment sharing, Download, online and shared phone stay documented as unverified on a real iPhone; direct Copy passing does not resolve them.
## 24 October 2026: online "waiting" state restored (hotfix, separate change)

Since `20261023road`, the online road-result screen lost two button options: a mid-line comment in js/g3/online.js swallowed `label` and `disabled`, so a hero who had pressed Onward still saw an active "Onward" instead of a disabled "Waiting for the others". The comment is now `/* */` and the options sit on their own line. A new test (test/syntax.test.mjs) fails on any trailing `//` comment that still holds what reads as another entry of the same object; it fails on the old line and passes on the fix. 363 tests pass. Stamp 20261024wait. Checked by tests and reading only: no online table was driven in a browser. The T09 rev 2 branch (PR 37) carries the same fix; merging either first is fine.
Board reconciliation, 24 October (docs only, branch claude/board-reconcile): docs/team/BOARD.md now combines the Claude, Grok and writing entries from every open branch and pull request, so the board on main is the shared source for task IDs, owners, status and next actions. The duplicate T10 is resolved without renaming any branch, PR or commit: the battle report stays T10 and Grok's road and Bonus Challenge concepts are T10-ART. PR #38 (online waiting fix) has the new ID T18. T05 (presentation-only cards, preview/cards) and T17 (weapon size and no wear, a preview-only gameplay experiment) are separate rows. Added a Next action column, a previews table (battle-report report5, cards cards2) and an open-PR table saying what merging each would do. Stale preview and phone-test statements were replaced with the confirmed real-iPhone results. No gameplay branch was merged.


## 24 October 2026: board-based handoffs and next actions

Director coordination check: Dave asks each contributor to check the team board instead of relaying messages. BOARD.md now records that workflow, aligns T05/T10/T18 with his standing authorization for checked updates, and allows T17 docs/preview publication while keeping its rules off the live root. T17 must have a separate storage namespace before publication, with existing live/lab/preview data preserved. IDs T10-ART and T18 accepted; T04/T08 remain in review. Verification: read current BOARD, PLAN and WORKING_GUIDE and checked the targeted text replacements; documentation only, no runtime tests or game files changed. Outstanding balance and visual reviews are not claimed complete.


24 October 2026, Director board check: T10/T18 marked DONE after confirming merged PRs, reviewing the changed-file comparison and fetching the live root stamp 20261024report6, alongside prior review and phone evidence. Existing platform limitations remain; no fresh full suite or multiplayer phone test claimed. T17 static d6 mockup reviewed: keep the size ladder, restore the approved ornate frame and explicit face symbols, improve the three-face die angle, use player-facing slot labels and omit empty bonus badges. Full feedback in tasks/T17.md. Separate T17 save namespace required before gameplay preview publication. Approved art/docs may be published under standing authorization; no new Dave homework. Documentation-only update.


24 October 2026, Director: T17 plan and rev 2 review recorded directly on main in tasks/T17.md and BOARD.md. Standard-color d6 screenshot accepted as visual direction. Blocking proposal finding: tools/t17-faces.mjs retains d4 only and recomputes all added faces per size; Claude must preserve every cumulative prefix, assert exact equality/counts, cover all active types/ammunition and regenerate measurements. Hand prices unchanged for the first experiment; half as-found sale approved provisionally; exact late-boss Diamond acquisition and correct face package still require review. Isolation/purchase infrastructure can proceed separately; no live activation or migration approval. Grok awaits corrected data, no new redesign. Evidence was source/table reading and a static screenshot, not a runtime test. T05 #49 and T09 #37 remain separate pending reviews. Documentation only; no game files changed.


24 October 2026, Director: Added T19 to BOARD.md and saved Dave's full readable 24-round Jasper/Wyrmwatch export with selected supplied-JSON metadata in docs/team/tasks/T19-jasper-wyrmwatch.md. Act III step 8, report6, solo normal, level-13 Knight with legacy War Hammer. Export omitted rounds 1–5; no exact replay or elapsed-time claim. Counted 19 retained rounds and 35 universal Heal entries; boss remains alone for rounds 11–24. Claude has a focused scaling, output, pacing and healing-input investigation; findings/proposals return to board before any live balance change. Documentation only, no tests or game changes.


24 October 2026, Director: Dave clarified T17 priorities: broader normal die-number coverage for straights, and distinct useful offensive weapon play styles. Recorded full brief in tasks/T17.md and next actions on BOARD. Current engine uses weapon base face value, not raw index, for combinations. Corrected cumulative tables delivered but not balance-approved. Claude to compare sequential-base candidate and weapon roles after active T19 work; Grok keeps art and labels numbers provisional. Read-only engine check plus docs changes; no gameplay implementation or probability tests performed.

T17 isolation step 1, 24 October (build 20261024ns1, no gameplay change): every preview folder under /preview/ now gets its own saves. `js/lab.js` derives `PREVIEW_NAME` from the folder; `battle-report` and `cards` keep sharing the `preview` namespace exactly as before (their saved heroes and reports are untouched); any other folder, such as the coming `weapon-size`, uses `questdice.preview-<folder>.*` and `qd.preview-<folder>.daily`, separate from the live game, the lab and every other preview. The on-screen tag now names the preview. Tests (`test/previewnames.test.mjs`): the names, and a real run of the save module in a child process that seeds the live, lab, old-preview and another-preview namespaces, makes a hero, and checks that every seeded value is unchanged and only the right namespace gained keys. 392 pass; the game boots with no page errors.


24 October 2026, Director: Extended T19 with Dave's first-hand learning and safe dragon-only-phase observations. Preserve magic/Heart mastery while investigating boss pacing, late-loss cost and equal/mixed party scaling. Added T20 released-arrow demonstration request with source-checked camp selection, arrowhead triggers, Pierce/Fire/Frost behavior and isolated arithmetic examples. Release overrides take precedence over stale half-effect comments. Documentation only; no live balance change or browser demonstration performed in this intake. Claude posts results directly to board.


24 October 2026, Director: Dave requested professional objective cards alongside the weapon template. Added T05-objective-art-followup.md and updated the existing T05 board next action. Grok refines three existing card types after his current weapon pass; Claude retains PR #49 and integrates reviewed visual changes. Reuse published templates/backs and current rules, preserve secret privacy, live text and reachable actions. Source docs reviewed; no new visual/browser verification or gameplay change in this coordination update.


24 October 2026, Director: Recorded Dave's objective naming decision in T05 brief and BOARD: two objective decks, Objectives (public/discussable) and Secret Objectives (private). Reuse approved Quest Dice backs with distinct emblem and words; no separate Wager deck. Existing rule categories may remain internal, with front-of-card stakes/rewards explicit. Preserve visibility, reveal timing, saved IDs and dealing/payout rules. Documentation only, no game changes or new verification claimed.


24 October 2026, Director: Recorded Dave/Grok four-metal Dagger exploration in T17 and BOARD. More Bronze blanks, graduated special icons and exceptional Diamond power remain proposals. Same-size comparison requested; absent bonus icons versus blank combination numbers distinguished. Decoupling numbered faces from weapon damage would require explicit rules work. Permanent Diamond needs bounded sustained power, not rarity alone. Docs only; no new balance approval or runtime verification.

## 24 Oct 2026 (Claude): T20 arrow demonstration
`tools/t20-arrows.mjs` resolves each released ammunition through the real engine with set dice (`b.script.rolls`) and asserts the board brief's numbers; `dev/t20arrows.mjs` and `dev/t20sheet.mjs` drive the real game and make captioned picture sheets (docs/team/tasks/T20-results.md). Finding: the camp ammunition card and the Frost banner still describe the old half-splash and halved-blow rules. No game change.

## 24 Oct 2026 (Claude): T19 part 2
`tools/t19-phase.mjs` (risky opening against boss-only phase) and `tools/t19-party.mjs` (tables of 2/4/6, equal and mixed, plus per-blow damage) with sections 8 to 10 of docs/team/tasks/T19-diagnosis.md and raw tables in T19-party-tables.md. Finding from `resolveParty`: an ordinary blow is split between heroes but breath is not (every living hero takes `ceil(0.6 x blow)`), so per-hero breath cost rises with the table. Proposals only; no game change.


## 24 October 2026, Director: T19 seven rulings
Reviewed diagnosis parts 1/2, phase/party/trace tools and engine source. Full rulings: [T19-director-review.md](team/tasks/T19-director-review.md). Correct the one-fighter-party 'Solo' baseline, net-health-loss damage metric, secure-outcome claims, strength labels and sample uncertainty before balance conclusions. Authorize a boss-tier-only isolated health/composition comparison (unchanged, A, B, C), preferring B as a candidate, with all party additions counted in the finite companion cap. Other fleeing bosses and pending old-save nemeses need audit before release. Multi-heal input convenience and local elapsed-time reporting are separately approved with existing mechanics, authoritative commands and report size bounds preserved. No live balance change, global party scaling, healing/Heart nerf or exposed-round bonus authorized. No human win-rate target inferred from this bot. BOARD gives Claude the next action; Dave need only ask Claude to check it. Validation was source/evidence review, not an independent simulation or phone run.

## 25 Oct 2026 (Claude): T17 weapon-size infrastructure
`EXPERIMENT.weaponSize` (data.js, off) with size bought at camp (40/80/140, one step, no hand check) through the existing `trainInfo`/`trainWeapon`, no wear, sale on half the as-found worth (`foundSize`), no Diamonds, weapon shrink off, `WEAPON_SIZE.ladder` hook for a reviewed face table; on only for preview/weapon-size/ (main.js). Tests: test/weaponsize.test.mjs; real-game check dev/t17sizecheck.mjs. No preview published; live rules unchanged.

## 25 Oct 2026 (Claude): arrow wording
`js/ammotext.js` words the camp ammunition card and the Frost banner from `WEAPONS2.arrowRules` (they still described the older half-splash and halved-blow tests); `test/ammotext.test.mjs`. Words only.

## 25 Oct 2026 (Claude): T19 corrections
Per the Director's review: `tools/t19-lib.mjs` (shared fights: genuine solo and party, the nemesis arms A/B/C, Wilson intervals), `t19-run.mjs` (one cell per process), `t19-phase.mjs` and `t19-party.mjs` (reports), committed fixtures in `docs/team/tasks/T19/fixtures/`, v1 tools and tables moved to `T19/superseded/`. Outputs: T19-v2-solo.md, T19-v2-party.md, revised part 2 in T19-diagnosis.md. No game change.


## 25 October 2026, Director: T19 v2 follow-up unblocked
Reviewed revised diagnosis, solo/party tables and source tools. Three answers posted in team/tasks/T19-director-review.md: land observation-only timing first; build and publish B/C selectable before a fight in its isolated preview, recording the arm; keep the explicit boss-tier breath candidate harness-only pending results (4/5/6 starting heroes: 0.50/0.44/0.38 share). Multi-heal still independently authorized. No live balance release. Paired uncertainty and boss-HP phase labeling remain measurement polish, not a preview block. BOARD marks READY and gives Claude the next sequence. Review was source/table inspection, no independent rerun or phone test.


## 25 October 2026, Director: urgent two-player playtest T21
Dave reports slow reward-turn handoff, no Bow visible for two archers, and older cards. Details and assigned scope: team/tasks/T21-two-player-playtest.md. Hosted root fetched as 20261025cards4 with cards stylesheet; device versions unknown. Source leads: online waitPoll only covers battle, not victory drafting; Ranger starts with quiver NW/Bow NE while START_DICE omits NE. Claude prioritizes reproduction and checked fixes over experimental balance work, preserving saves and authoritative reward selection. T17/current objective mockups remain undeployed. No runtime change or two-phone reproduction in this intake.


## 25 October 2026, Director: T21 defeat evidence and starter decision
Saved a labelled diagnostic extract of Dave's online cards4 two-Ranger defeat (Act I step 2, report mvo829c812sx) in team/tasks/T21-two-player-playtest.md: Bow NE inactive, three enemy attacks before both heroes, 43/22 damage; report-export anomalies identified. Dave explicitly authorized all classes starting with both top weapon dice active at d4, Bronze left class weapon and right shield, Ranger exception Arrows/Bow. Existing class shields retained; new Bard right Round Shield. Preserve existing earned gear and purchases, activate missing NE without charge using safe authoritative migration, no in-progress-round mutation or reset. Claude owns checked implementation and deployment before experimental balance work. Compare early Normal results after this correction; no blanket monster nerf or T17 release authorized. Intake only, no fix or reproduction claimed.


## 25 October 2026, Director: co-op visual delivery and Heart usability
Dave's real-iPhone screenshots show the earlier ornate Gold Rush objective, online victory ranks, compact Gear pack rows and a Heart selector with clipped/scrolled destination controls. T21 now specifies a compact current-face plus two labelled destination controls with cost/used state and Close visible together, long rules behind disclosure, unchanged mechanics. T05 next action now includes full current-rule weapon inspection from online pack/equipment/store and latest objective-focus presentation with original T12 backs. Visual-only integration may ship independently of unresolved T17 balance after phone render/online-route checks; no new generic approval needed. Prioritize starter/reward/Heart fixes. Screenshot review and docs only, no runtime changes or independent Safari reproduction.


25 October 2026, Director: Reviewed card handoff; retained original singular painted back titles and allowed existing Mace art as a nonblocking fallback without roster changes. Claude may integrate approved visuals with current rules under T05/T21. Proposed mechanics remain separate; no rendered integration verification claimed. Decisions on BOARD and appended to mockups/cards/HANDOFF-cards-for-Claude.md.


25 October 2026, Director: Dave's upgrade-value decision supersedes T17 fixed as-found/no-refund direction; old clauses marked historical, monotonic resale formula to be measured. T21 Magic usability follow-up recorded, beyond compact Heart. Naming standardized to Objective/Secret Objective for cards, plurals for decks, no rule/ID changes. Claude's delivery limitations retained; no independent runtime review claimed. Documentation only.


25 October 2026, Director: Created T22 coordination/static screenshot review and per-hero attack-feedback task. Reviewed Magic after, size-card d6, pack grid and dense online objective screenshots; noted clipped consequence, potentially stale upgrade toast and tiny thumbnail text. Pack grid accepted as direction with current rules. Dave reports Grok actively doing tilted board, helmet options and new Magic visuals; reserve touched files and coordinate handoff with Claude, who owns replay/engine/integration. Source confirms individual strikes sharing spent guard/armor pool; diagnose aggregate HP jump without changing balance. Existing Magic evidence referenced, no new Dave upload needed. No runtime/Safari test performed.


25 October 2026, Director checkpoint: reviewed latest main, current task handoffs and actual short-phone Aimed Shot, Team and offered-objective screenshots. Recorded current owners, T22-first order, accepted compact Ranger layout baseline and retained T05 consequence-visibility follow-up directly on BOARD. Corrected stale rev14/pack-approval guidance in the checkpoint. Source-reviewed objective audit against secrets.js; requested focused Lone Wolf/Glass Shield eligibility fixtures, separating structural impossibility from difficulty, with no blanket removals or threshold changes approved. T17 numeric/economy decisions remain open and isolated; upgrade resale must increase. Documentation only, no game/save edits, independent test run, hosted-stamp check or real Safari/Firestore verification.


25 October 2026, Director recording Dave's equipment-first direction: BOARD and T17 now assign Claude the eight-type roster/role comparison, cumulative face data and resale economy before final numerical cards; Grok continues reusable visuals and camp grid-to-card upgrade flow. White-dice cards use existing rules, feet limits and class-dependent talents; split left/right Hands card remains a visual candidate with independent purchases. Bard two daggers and 50% resale are candidates, not settled live rules. Require card/engine data identity and distinguish simulations from human playtests. Finish active co-op correctness work safely, then prioritize equipment before broader monster/magic retuning. Documentation only; no new balance, runtime, save or deployment changes.
