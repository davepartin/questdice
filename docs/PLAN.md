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
