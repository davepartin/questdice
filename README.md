# QuestDice

*Roll your body. Break the dark.*

A cooperative fantasy dice campaign for one to six friends, built on the same 3×3 board idea as [Fleet Dice](https://davepartin.github.io/fleetdice/). Your nine dice are your body: heart in the middle, head and feet above and below, a strength die in each hand, a weapon and a special gift in each corner. You roll yourself, shape the result with a few rerolls, and fight monsters that tell you what they are about to do.

**Status:** solo play runs from the title screen through Act II. A table seats one to six heroes, each on their own phone. One hero can start alone. Everyone decides at the same time as the monsters, and the fight runs when every choice is in. The party numbers are still the starting table.

## Play it

Solo is a static site with no build step. Because it uses ES modules, open it through a web server rather than double-clicking the file:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

To play together, one person runs the table. It serves the game and gathers each phone's choices. No extra packages.

```bash
node server.mjs
# or: npm start
```

It prints an address. One to six phones on that Wi-Fi open the address and enter the four-letter code. One phone can play the table alone. The host's `localhost` address only works on the host's own machine.

To publish the solo game, enable **GitHub Pages** for this repository (Settings → Pages → deploy from `main`, root folder). Everything is plain files. The shared table needs the server process; Pages cannot host it.

## What is in it

- **Five classes:** Knight, Ranger, Wizard, Dwarf Warden, Bard. Each has its own gear, health, reroll style and cards.
- **Eight weapons** in four rarity tiers, from one-handed daggers to two-handed bows, long swords and staves.
- **Telegraphed monsters** that show their Intention before you roll, with Wind-Ups you can stagger, bosses that rage at half health, and moves that bind your dice, drain your Magic, steal your gold and call for help.
- **Two Acts** (twenty quests, two bosses), then an endless Ascent.
- **Leveling to 20**, a perk every level, bigger dice at Camp, and loot after every fight.
- **One to six heroes, each on their own phone.** Each hero keeps their own gold, dice and level. Feet decide who draws the monsters' heat. Healing and blocking count toward who picks the loot. The fight waits until every hero has locked in.
- **Road events.** Between quests the computer narrates a seeded scene and offers a real choice. The same company meets the same crossroads if you reload before you choose.
- **Saved heroes and saved companies** behind a name and password, plus a **Soul Code** (`QD1` for a hero, `QD2` for a company) to move a save between devices.
- Synthesized sound, haptics on phones, reduced-motion support, and a first-run tutorial.

## The documents

| File | What it covers |
|---|---|
| [`docs/DESIGN.md`](docs/DESIGN.md) | The whole game: the board, the dice, the rules, classes, progression, the campaign, party play, balance, every design decision, and the roadmap. |
| [`docs/PLAN.md`](docs/PLAN.md) | The ongoing plan, status, known bugs and handoff log shared between working sessions. Read this first when picking the project up. |
| [`docs/GFX.md`](docs/GFX.md) | The 3D graphics contract: conventions, actor/dice/arena APIs, and how to take screenshots. |
| [`docs/BESTIARY.md`](docs/BESTIARY.md) | Enemy mechanics, every monster's table, and how to add a new one. |

## For developers

```bash
npm test        # rules tests (Node 20+, no dependencies)
npm run sim     # bot plays whole campaigns to check balance
node tools/bestiary.mjs   # prints the monster tables as markdown
```

```
index.html          the shell
server.mjs          the table: static files plus the room each phone joins
css/style.css       Fleet Dice palette and every component
js/data.js          ALL the numbers: dice, weapons, classes, perks, monsters, acts
js/engine.js        the rules, pure and deterministic, no DOM
js/table.js         company rules for many phones: locks, then one resolve
js/roads.js         the computer's road: seeded scenes and their consequences
js/save.js          heroes, companies, passwords, Soul Codes (localStorage)
js/view.js          draws dice, enemies, weapons, reports
js/ui.js            solo screens and input
js/roomui.js        the phone screens for a shared table
js/net.js           this phone's seat at the table
js/audio.js         synthesized sound
js/fx.js            embers, sparks, screen shake
tools/sim.mjs       the balance bot
test/               rules tests
```

The engine takes its randomness as an argument, so any battle can be replayed exactly. That is what makes the simulator and, later, host-authoritative multiplayer possible. Open the game with `?debug` in the address to expose `window.QD` for poking at it from the console.

## Saving, honestly

Heroes live in the browser's local storage. The password is hashed and checked before a hero opens, but this is a friendly gate, not encryption, and clearing browser data deletes the hero. Use **Soul Code** (in Camp or the hero menu) to make a backup. Cloud saves are on the roadmap.
