# QuestDice — Ongoing Plan (shared between two Claude accounts)

**Read this first, update it last.** This file is the single source of truth for what is done, what is next, and
what is broken. Two Claude accounts take turns on this project; neither remembers the other's chat. Everything the
next session needs lives here and in the repo.

## How to hand off (rules for both accounts)

1. `git pull` the branch `claude/wizardly-newton-c0xpcq` before doing anything. Read this file, then `docs/GFX.md`.
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
`js/save.js`) is **done and tested** (`npm test`, 41 passing; `npm run sim` balance bot clears Act I 15/15 for every class).
Milestone the owner asked for: **solo campaign through the first five Act I monsters** looking AAA, then grow it.
The five are: Goblin Skulker, Dire Wolf, Ashen Cultist, Hill Ogre (elite, quest 5), The Goblin King (boss).

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
- Quest 5 (Ogre Wind-Up/Slam) and the boss (rage at half HP, summons) must be read and fought correctly: verify the telegraph UI ("deal N to break") with real play.
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
