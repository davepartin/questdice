# Playing together (each hero on their own phone)

Dave's decision (11 Oct 2026): there is **no one-phone group game**. Up to six friends each play on their own phone,
in the same 3D screens as a solo game. A single hero on one phone is still the solo game. This file says how it is built.

## The idea in one paragraph

A table is one document (Firestore, `qdRooms/{CODE}`; or `node server.mjs` on a laptop for tests). It holds the whole game:
the company of heroes, the campaign, the battle. **Every phone keeps its own copy of the table** and the 3D screens read
that copy exactly as they read a solo hero. What a phone *does* is a **command** (`roll`, `reroll`, `card`, `lock`,
`op` ...). The command runs the game's own rules (`js/table.js` + `js/engine.js`) inside a transaction, the new table is
saved, and every phone hears it. When everyone has locked in, the table plays the round **once**, stores the report, and
every phone plays that same report on screen.

## Files

| File | What it does |
|---|---|
| `js/table.js` | The rules of a table: commands, phases (lobby, road, board, battle, victory, defeat, camp), `playerView`, `savePublic`. Pure, tested. |
| `js/session.js` | This phone's copy of the table. `adopt` (newer tables only), `send` (one command at a time), `hold/release` (while a round plays, newer tables wait), `index()` (my fighter), `resync`. |
| `js/net.js`, `js/cloud.js`, `server.mjs` | Transport. Every view carries `view.state`: the whole table as text, **without seat tokens** (`savePublic`). The seat (code + token) is kept in `localStorage`. |
| `js/g3/online.js` | The room director: open / join / lobby, then puts up the screen for each phase. Menu, step away, leave. |
| `js/g3/battle3d.js` | The 3D battle. `B.net` mode: every action is a command; `netChanged` (a mate moved), `netResolve` (the round was played), `renderLocked` (waiting for the others). |
| `js/g3/scrui.js` | The solo screens, reused: board, road, story, camp. Hooks: `X.partyBar`, `X.chooseRoad`, `X.netOp`, `X.campCta`. `create({ table })` is the hero choice for sitting down. |

## What each phase looks like

- **Lobby**: the hero choice screen (name + class, no password), then a camp-fire lobby: the four-letter code, an Invite
  button (share sheet or copy), the heroes with a tick when ready. Friends are ready; **the host starting is their own ready**.
- **Road / story / board**: the same cards as solo, with a bar of who is at the table. Anyone may choose the road or the
  quest; everyone sees the answer and presses Onward (ticks show who has). Story beats show on every phone (remembered per phone).
- **Battle**: every hero stands on the field; this phone's hero is in front and the dice table is theirs. Monsters' intents
  are public; your dice are yours. Lock in, then "Locked in, waiting for Jess" (Unlock takes it back). When the last hero locks,
  every phone plays the same round (initiative order, strikes, monster acts, the shield hero), then the next round or the end.
  Team actions (potion, share magic, revive) work on a friend. The host can skip a hero who left, and retreat.
- **Victory / defeat**: points and places, each hero chooses their own perk at once, spoils are drafted in order of points
  (the table moves to camp by itself when perks and draft are done). Defeat: return to camp.
- **Camp**: each hero's own camp (the same full screens as solo: forge, talent dice, pets, powers, potions, gear). Changes
  are applied on the phone's copy first (so it answers at once) and sent as `{ type: 'op', op, args }` (a whitelist of rule
  names in `table.js`). The road goes on when everyone presses Ready. The host can **Go on without them** (`push`).

## Rules that hold

- Dice are deterministic: a hero's roll comes from (table seed, hero, round, draw number), so a retry gives the same dice.
- A newer table never gets replaced by an older one (`seq`). While a round plays out on a phone, newer tables wait (`hold`).
- Coming back (closing the tab, a sleeping phone, a new page load) finds the same seat (`localStorage`) and puts the
  right screen up; a hero who is mid-round comes back to their dice.
- Tokens never travel to other phones. Player ids are hashes (`p1abcd`), not pieces of a token.

## Testing

`node dev/room1.mjs` .. `room9.mjs` (room9: join by link, real defeat) drive two phones (separate browser contexts) against `node server.mjs` (test cheats are
switched on only by `QD_CHEAT=1`): lobby, story/road/board, a battle round, victory and spoils, camp and back to the road.
The sandbox cannot reach Firebase, so the cloud transport is tested with a fake SDK (`test/cloud.test.mjs`) and by Dave on
the live site. Known risk to watch: Firestore documents take about one write per second sustainably; six heroes tapping
rerolls quickly is a burst. If it feels slow, make private shaping (roll, reroll, powers) local and send only the lock.
