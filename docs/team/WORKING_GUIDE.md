# Working in the Quest Dice repository

A short guide for every contributor (Claude, Grokbot, anyone new). Start with [BOARD.md](BOARD.md); this page says how to do the work.

## The shape of the code

- **Plain ES modules, no build step.** `index.html` loads `js/main.js` through an import map; GitHub Pages serves `main` as the live site: https://davepartin.github.io/questdice/
- **The rules** live in `js/engine.js` (pure functions over plain objects) and `js/data.js` (numbers, classes, monsters, powers). Both are tested and run in Node as well as the browser. Keep them free of DOM code.
- **The released rules are switched on at start-up** by `js/release.js` (`applyRelease()`, called from `js/main.js`). `data.js` alone still holds the old defaults. Anything that measures the game must apply the release (see "Tools" below).
- **Screens:**
  - `js/g3/`: battle, `battle3d.js` and `flat.js`; screens and camp, `scrui.js`; Learn to play, `tutorial.js`; online table, `online.js`;
  - `js/gfx/`: the 3D dice and tray;
  - `css/`: `hud.css` (battle), `screens.css` (the other screens), `board.css` (battle board pieces), `tutorial.css`.
- **Saves:** `js/save.js` (local), cloud saves through Firebase project `questdice-eef50` (`docs/FIREBASE.md`). Never deploy rules to the `space-tribes` project. Add migrations in `save.js` (`migrateHero`) rather than breaking old saves.
- **Previews:** `?lab` (separate saves, no cloud, monster fury), `?pace=actions` (quick replay), `?debug` (exposes `window.QD` for scripts).

## Every change

1. **Pull first:** `git fetch origin main && git merge origin/main`. Claim the task on the board before editing; do not edit files another active owner has claimed.
2. **Tests:** `npm test` (`node --test test/*.test.mjs`), all must pass. `test/syntax.test.mjs` checks that every file in `js/`, `tools/` and `dev/` parses. A stray `//` mid-line once broke the whole page and, separately, a night of measurements. Add or extend a test for any rule change.
3. **Look at it** when it changes what a player sees (see "Screenshots").
4. **Cache stamp** after changing anything the browser loads (`js/`, `css/`, `index.html`): `node tools/stamp.mjs <new-version>`, for example `20261024a`. Use a value newer than the one in `index.html`, or phones keep the old files.
5. **Write it down:** append a dated note at the end of `docs/PLAN.md` (what changed, why, how it was checked), and record the result on the board. Put detailed evidence in `docs/team/tasks/<ID>.md`.
6. **Commit messages** say what changed and why, in plain words. No AI model names in commits, code or docs.
7. **Publishing:**
   - Small, tested updates may go to `main`: the live site is the development playtest site.
   - Unresolved mechanics stay behind a switch or a URL preview, off for everyone else.
   - Preserve saves; keep changes reversible.
   - No force pushes. Merge `main` into your branch; never rewrite someone else's history.
   - Say whether work is **implemented**, **deployed** (live, verified with `curl` against the stamp) or **reviewed** (the Director has looked at the evidence). Visual work is not finished until the rendered phone screen has been inspected.

## Screenshots (Playwright, headless Chromium)

- **Start the local server:** `node dev/serve.mjs 8135`. Stop it by its PID; `pkill -f` with a pattern can match and kill your own shell.
- **Run a script in `dev/`** (each one is a worked example). The Chromium path is `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` with SwiftShader flags (copy them from any script). Scripts drive time with `window.QD.world.stage.simulate()` under `?debug&manual&q=low`, so animations are deterministic.
- **Useful scripts:**
  - `dev/uipass.mjs`: objective card and Enemy Details at several phone sizes, with a scroll check;
  - `dev/hearts.mjs`: 3–6 hero party board; `GUARD=1` shows Guard;
  - `dev/envelope.mjs`: online secret objectives;
  - `dev/learn.mjs`: Learn to play;
  - `dev/pace.mjs`: replay seconds;
  - `dev/trayshot.mjs` and `dev/faceshot.mjs`: tutorial pictures from the real tray.
- **Output:** keep screenshots in `shots/` or `docs/ingame/` (both git-ignored). Copy the few worth keeping into `docs/screens/`.
- **Check phone sizes** 390×844, 430×932 and 375×667, and larger text where layout matters. Headless Chromium is not Safari; say so when reporting.

## Tools (measuring the game)

Always run with **`RELEASE=1`** so the tools play today's rules: charms resting, new weapons, class rules. Without it they measure the old game.

| Tool | Command | Use |
|---|---|---|
| Campaign curve | `RELEASE=1 node tools/curve.mjs`; `sh tools/curve-all.sh` | Win rate, rounds, low health, throw by act/class |
| Party sizes | `RELEASE=1 TEAMPLAY=1 PAIRS="knight,bard;..." OUT=f.json node tools/party.mjs 3 2` | Companies grow side by side; team vs solo; teamwork use; support per hero; per-campaign error. `SOFT=hp1.0,adds1` tries gentler six-player battles |
| Matched comparison | `node tools/pairs.mjs base.json arm.json ...` | Differences inside each campaign, ± across campaigns |
| Magic | `RELEASE=1 MODE=magic\|wizard\|ledger CLS=wizard OUT=f.json node tools/magicaudit.mjs` | Casts and magic counted per policy; Wizard variants; the magic ledger |
| Class kits | `RELEASE=1 node tools/classkit.mjs 16 knight` | Which power kit wins which fight |
| Matchups / arrows | `RELEASE=1 ARROWS=1 node tools/matchup.mjs 16 ranger` | Loadouts against four fight types |
| Teamwork policies | `RELEASE=1 PARTY="knight,ranger" node tools/teamwork.mjs 10` | Focus / split / adaptive, Heart to Heart on and off |

Rules for measuring:
- **Fights within one campaign are not independent.** Use several campaigns (separate seeds), report error across campaigns, and compare arms on matched seeds.
- **Long runs:** keep each under about an hour, run them in the background, and save each result into `docs/balance/` as it finishes, so a session limit cannot erase it. Write the reading (what it means, sample sizes) in a dated `.md` beside the tables.
- **Check the existing results** in `docs/balance/` and [tasks/T01.md](tasks/T01.md) before starting a batch. Do not rerun completed work without a reason.
- **Known simulation gaps:** the bots never turn the heart die, throw potions, share magic or revive. Zero in those columns is a gap, not evidence.

## What not to do

- **Do not restore charms** or build on them. They are resting by Dave's decision (`TEAMWORK.noCharms`); ownership is kept only so the decision can be reversed.
- **Do not change rule numbers** (`data.js`, `engine.js`) outside a board task with evidence. Put experiments behind a switch that is off in the game.
- **Do not overwrite another contributor's files** or the history in `docs/PLAN.md`; append.
- **Keep the game free** of anything demonic, satanic, cultic or occult, including pentagrams. Skeletons, ghosts, witches, wolves and dragons are fine.
- **Art:**
  - painted miniatures go in `assets/miniatures/` as transparent `webp`/`png` standing on a base;
  - each monster's `img` and `imgBase` live in `data.js`;
  - check the piece on the battle board and in Enemy Details before calling it done.

## Writing for players

- Short rules: one clear effect sentence, plus cost, duration or target if needed. Details go behind a tap.
- Keep numbers that change a decision (health, damage, stacks). Remove duplicate labels.
- Dave reads on an iPhone: plain words, no arithmetic narration.
