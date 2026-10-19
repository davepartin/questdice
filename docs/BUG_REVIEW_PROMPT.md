# A whole-game bug review: the prompt

Paste everything below the line into ChatGPT, with the code attached: either the GitHub repository
(https://github.com/davepartin/questdice, through ChatGPT's GitHub connector), or a zip of it (on GitHub: Code → Download ZIP).

---

You are reviewing a finished hobby game for bugs. **This is a read-only review. Do not change, rewrite or reformat any code, do
not open pull requests, issues or branches, and do not produce patched files.** Your only output is a written bug report. Where a
fix is obvious, describe it in a sentence or two (or a few lines of code inside the report), but do not apply it.

## The game

QuestDice (https://davepartin.github.io/questdice/) is a dice-battle role-playing game played on phones, mostly iPhones in Safari.
A hero (knight, ranger, wizard, dwarf or bard) walks a campaign of 3 acts × 10 steps: camp (upgrades, a store) → a road event (a
choice or a dice test) → a secret objective envelope → a 3D battle against miniature monsters → rewards → camp. It plays solo, or as a
team of 2–6 friends at one "table", each on their own phone. The owner and a friend play team games together on two iPhones.

It is plain JavaScript ES modules, no framework and no build step, served from GitHub Pages. There is no game server: a team game's
whole state lives in one shared Firestore document (or a local `node server.mjs` in development), and every phone runs the same
rules on its own copy.

## Where things are

- `js/engine.js` – the rules: heroes, dice, battles (`newBattle`/`resolve` solo, `newPartyBattle`/`resolveParty` team), rewards,
  campaign progress, quests, wandering monsters, blessings (next-fight boons/banes).
- `js/data.js` – classes, weapons, monsters, acts, tuning numbers.
- `js/table.js` – a team game: phases lobby → road → board → envelope → battle → victory/defeat → camp, and every command a phone
  can send. `js/session.js`, `js/net.js`, `js/cloud.js` (Firestore), `js/pack.js` (serialising shared objects), `server.mjs`
  (local server), `firestore.rules` (who may write what).
- `js/roads.js`, `js/trials.js` – road events, dice tests, encounters. `js/secrets.js` – secret objectives, bribes, the Reveal.
- `js/story.js`, `js/campaigns.js`, `js/packs/*.js` – story pages and the campaign packs (each pack is data: fights per step, names,
  story text, road moments).
- `js/save.js` – saving heroes on the phone and in the cloud, passwords, resuming.
- `js/ui.js` (solo flow and screens), `js/g3/*.js` (the 3D screens: `battle3d.js` battle, `scrui.js` menus/camp/victory,
  `online.js` team routing, `powers.js`, `trial3d.js`, `tutorial.js`), `css/*.css`, `index.html` (import map with `?v=` cache
  busting, rewritten by `tools/stamp.mjs`).
- `test/*.test.mjs` – about 280 Node tests (`npm test`). `tools/` – balance simulators. `docs/` – design notes (`DESIGN.md`,
  `MULTIPLAYER.md`, `TEAMS.md`, `SECRET_OBJECTIVES.md`, `FIREBASE.md`) that say what the code is meant to do.

## What to look for, most important first

1. **A team game that gets stuck or splits.** Two phones that end up showing different screens or different numbers; a phase
   nobody can leave (a button that does nothing, a "waiting for…" that never clears, a phone that sleeps mid-step); a command
   accepted on one phone's copy but refused by the table; two phones writing the table at the same moment and one write lost;
   a stale or out-of-order update winning; rejoining after closing Safari; the host leaving; a hero who joins late.
2. **Lost or damaged progress.** A save that loses gold, gear, level or campaign step; resuming at the wrong step; two copies of
   one hero (phone and cloud, or two tables) overwriting each other; anything `js/pack.js` would serialise wrongly (shared objects,
   functions, undefined); old saves from earlier versions that would now crash (look for migrations).
3. **Rules that do not do what the screen or the docs say.** Wrong damage, block, healing, magic or gold; a power, charm, perk,
   weapon or blessing that never fires, fires twice, or lasts the wrong number of fights; secret objectives judged or paid wrongly;
   rewards granted twice (for example on a page reload or a repeated command); a solo and a team battle that disagree on the same rule.
4. **Crashes and dead ends** in the browser: an exception that leaves a blank or frozen screen, especially on iPhone Safari (audio
   unlocking, WebGL context loss, the page going to the background, `localStorage` being unavailable in private mode, small screens).
5. **Security and cheating in team games**, judged for a game among friends: what `firestore.rules` allows that it should not
   (writing another player's hero, taking a seat, unbounded growth), and whether a player could read others' secret cards.
6. **Smaller things** worth a line each: a misleading text, a number that disagrees with the rules, a cache-busting gap (a file
   loaded without its `?v=` version), dead code that hides a bug.

Already known, so do not report again: there is no game server, so a seated phone can write the whole table document and a
modified client could cheat or take a seat by name (`firestore.rules`, `reclaimSeat`). That is accepted for a game among friends.
Report it only if an ordinary player, with the normal app, could cause it by accident.

Ignore pure style, naming, formatting and "could be refactored" notes unless they hide a real bug. Do not report balance opinions
(too easy, too hard) unless a number is plainly wrong against its own comment or doc.

## How to work

- Read the docs in `docs/` and the tests first, so you know what each part is meant to do; then read the code.
- Trace real paths: a phone's tap → the command it sends → `table.js` → the new state → what every other phone shows. Do the same for
  save → reload → resume.
- Only report what you can point to in the code. For each finding, give the concrete situation that breaks it. If you are not sure,
  say so and say what would confirm it, rather than leaving it out or presenting a guess as fact.
- Check the existing tests: if a test already covers a case, say so before calling it a bug.

## The report

Start with a short summary: how many findings at each severity, and the three you would fix first.

Then one entry per finding, most severe first:

- **Title** – one line.
- **Severity** – Critical (game stuck, progress lost, crash), High (wrong rules or rewards players will hit), Medium, Low.
- **Where** – file and line numbers (and the function name).
- **What happens** – the exact steps or situation (which phone, which phase, which button), and what the player sees.
- **Why** – the code path that causes it, briefly.
- **How sure** – Certain / Likely / Possible, and why.
- **Suggested fix** – in words, or a few lines of code inside the report. Do not edit any file.
- **Test idea** – one sentence on a test that would catch it.

End with a list of areas you did not get to or could not check, so nothing looks reviewed that was not.
