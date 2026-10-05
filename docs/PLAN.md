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
