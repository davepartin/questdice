# T27 Act III road, the game's arc, and the bestiary plan (4 November 2026)

Dave: "I just want you to be creative and bring a nice arc to the game where you feel like you're doing something
throughout the game and when you win is excitement… after we get 60 to 80 miniatures, that's plenty for a board game,
because you can just change the color or statistics or skill sets." Claude owns monster choice and storylines; Dave does
not need to pick monsters one by one.

## The arc we already have (keep it)

The Dawn Lantern kept the Marches safe. Three villains, three kinds of darkness, each a little closer to the truth:

| Act | Land | Villain | What they want | What the heroes learn |
|---|---|---|---|---|
| I | The Ashen Marches | The Goblin King | The flame, out of greed | The light was stolen, and someone paid him for it (the clawed contract) |
| II | The Hollow Crypt | The Hollow Lich | To hide the light, out of fear | "Do you know what is waiting for that light, up in the mountains?" |
| III | The Ember Peaks | Vharaxis, the Ember Queen | Everything, the Lantern first | Her heart is the ember she once gave away; a very small dragon gives the hoard back |

Villains are greedy, cold or afraid; defeated foes fall, crumble, flee or yield. Light against the dark, nothing occult.

## Act III road, first time through (shipped with this task)

| Step | Place | Fight | Change |
|---|---|---|---|
| 1 | Kindling Steps | Two Cinderlings | kept |
| 2 | The Glass Fields | **Glarefang, the Basilisk** and a Shieldbearer | new: Glarefang was painted but never on the road (was a Gloom Stalker, an Act II foe) |
| 3 | Wyrmwatch | Gold-Chain Jailer and a Cinderling | kept |
| 4 | Hoardfall Mine | Ironclad Warden and a Cinderling | kept |
| 5 | The Brazen Bridge | Vharaxis (elite; she flies off to her throne) | kept: the story meets the Queen early on purpose |
| 6 | Kettle Tarn | **Big Muriel** (a yeti in a hot spring) and a Frostwhelp | new: the comic beat before the dark keep |
| 7 | Oathbreak Keep | The Fallen Champion (mid-boss) | kept |
| 8 | Kettle Tarn again (only when no one called for help) | Two Frostwhelps, with **their own lines** | new: before, a second visit was silent and the same fight |
| 9 | Ember Throne slopes | **Vexmor, the Storm-Tyrant** and a Shieldbearer | new: the Queen's last guard, the knight who kept his oath (an echo of Sir Aldren, who broke his). Ashmaw moves to the Ascents' elite pool |
| 10 | The Ember Throne | Vharaxis (boss) | kept |

How a revisit gets its own lines: a place in `PLACES` (js/story.js) may carry `again: { foes, arrive, win }`. When the
act's route comes back to a place it already visited, `revisit()` picks those lines (beat ids `again-arrive:<slug>`,
`again-win:<slug>`). Packs and places without `again` behave as before.

## The bestiary today: 50 painted monsters, but a first playthrough shows about 25

Every monster in `MONSTERS` has a painting. The story road (first time through) uses about 25 of them; the rest appear
only on the Ascents (random), in story packs, or nowhere:

- **Story packs only (never on the main road):** Big Wheel and Duchess Goldbelly (Rival Duo), Mungo and the Dowager
  Blazemorrow (Ballad), the Magpie King, Magpie Gang, Sir Reginald Brush and the Grave-Silk Matriarch (Clover Heist),
  Gorvash of the Ash-Tusks and the Glass-Hive Queen (Starfall).
- **Ascents only:** The Wrath-Oak, Puffball, Squall, Wildfire, Will-o'-the-Wisp, The Lamp-Snuffer, Peepers the
  Moon-Jelly, The Hive Scout, Razorback, Vault Sentinel, Gravelhide the Dire Bear, Ash-Tusk Raider, The Barrow Rider,
  Glass-Hive Stinger, The Nightblade, The Slag Colossus, Hrimvald the Rime-Giant.

So the cheapest variety is already painted. Next steps, in order:

1. **Give Acts I and II the same treatment.** Both acts repeat a place and fight late (Act I: Ashfall Camp's three
   goblins at steps 7 and 9; Act II: Mourner's Row at 6 and 8, the Drowned Crypt's Frostwhelps at 7 and 9). Use the
   `again` lines and the Ascents-only monsters: for example Ash-Tusk Raiders arriving at Ashfall Camp (step 9, a
   foreshadow of Gorvash), and the Lamp-Snuffer or the Barrow Rider in the Drowned Crypt. Needs a balance run per act.
2. **A side road at some steps.** The quest board already offers two roads at the elite step. Offering a second,
   optional fight at one or two ordinary steps per act, drawn from that act's unused monsters, would show most of the
   painted bestiary on a first playthrough without making the story longer.
3. **Recolours with new names and stats** (Dave's idea). A recolour is a new painting made from an old one by the art
   bots (the game has no tint setting today; add `tint` to a monster later if we want it in code). Good candidates:
   - Act III **Gilded Bone Soldier** (a skeleton dipped in the Queen's gold: armour, Pilfer).
   - Act III **Ember Spider** (red Crypt Spider: fire splash instead of web).
   - Act II **Crypt Wolf** (grey Dire Wolf, Phase).
   - Act I **Frost Goblin** (blue, for the Ascents' winter).
   - Act III **Cinder Ogre** (the Hill Ogre with lava cracks).

## Miniature wishlist (for Grok, or Gemini's image tools)

Style rules, same as today: a painted tabletop miniature, three-quarter view **looking left**, on a round black base with
a scenic top (Act I ash and forest, Act II crypt stone, Act III lava rock or ice), transparent background, readable at
phone size (~100 px tall; give dark pieces a rim light). No lucky clover on main-road pieces (the clover marks the Clover
Heist set). No demonic, cultic or occult marks.

| # | Name | Act / tier | One line | Hook for its card |
|---|---|---|---|---|
| 1 | **Kindle, the Little Ember** | III / story piece and pet | The very small red dragon behind the golden goblet who gives the hoard back | Finale and a pet reward for beating the Queen |
| 2 | **The Coinback Crab** | III / minion | A hermit crab living in a golden goblet | Pilfer, hides in its cup (Guard) |
| 3 | **The Gilded Sentinel** | III / elite | A statue of the Queen that walks when gold is taken | Armour, Slam |
| 4 | **Hoard-Counter Kobold** | III / minion | A tiny dragon-servant with an abacus and too many keys | Hush ("Quiet, I'm counting") |
| 5 | **The Candle Moths** | II / minion swarm | Moths that follow the Lantern's light down the stairs | Many small hits, drain magic |
| 6 | **The Bell-Ringer** | II / elite | A tall Bone Soldier with a crypt bell | Hush everyone, Wind-Up |
| 7 | **The Tomb Tortoise** | II / elite | A giant tortoise with a little tomb on its back | Huge armour, slow |
| 8 | **The Weeping Lantern-Maid** | II / minion | A frightened ghost who stole a sliver of light to stay warm; she yields | Flees when you heal |
| 9 | **The Thatch Troll** | I / elite | A troll wearing a burnt barn roof as armour | Armour that burns off |
| 10 | **Smoke Hound** | I / minion | A wolf made of chimney smoke | Phase |
| 11 | **Goblin Lamplighter** | I / minion | A goblin with a stolen lantern shard on a pole | Heals goblins |
| 12 | **The Ember Queen, risen** | III / finale | Vharaxis in her final, burning-brightest pose for the last phase | The boss's rage art |

Twelve new pieces plus five recolours takes the bestiary from 50 to about 67, inside Dave's 60 to 80.

## Balance (bots, smart play, 2 campaigns x 5 classes; Act III win chance per step / rounds)

| Step | Old road | New road, first try (Ashmaw + Vexmor) | Shipped |
|---|---|---|---|
| 2 Glass Fields | 94% / 6.5 | 94% / 6.4 | 94% / 6.4 |
| 4 Hoardfall Mine | 76% / 8.7 | 69% / 8.2 | **83% / 7.9** (fightHp 0.85) |
| 6 Kettle Tarn | 100% / 6.6 | 80% / 7.5 | **91% / 6.5** (fightHp 1.2 -> 1.0) |
| 8 Kettle Tarn again | 89% / 6.6 | 94% / 6.7 | 96% / 6.6 |
| 9 Ember Throne slopes | 67% / 8.9 | **11%** / 7.9 | **74% / 9.4** (Vexmor + a Shieldbearer) |
| Campaigns cleared | 9 of 10 | 2 of 10 | 9 of 10 |

A second try with both elites at fightHp 0.55 still won only 37%, so Ashmaw left the slope. Bots are not people, and
the sample is small; watch the slope and Big Muriel's tarn in play.

## Shipped with this task (build 20261104a3)

- The Act III road above; `again` lines for a place's second visit (js/story.js `revisit`, `placeBeat`, `beat`).
- The last page of the story (`close:3`) now ends with the Marches lighting candles, the story told for a hundred years
  ending with the heroes' names, and "You carried the light home. The story is won."
- Monster cards: a long move name (Vexmor's LIGHTNING, THUNDERCLAP) no longer runs into its dice numbers
  (css/minicard.css). Check: `node dev/act3-road-check.mjs` (headless Chromium, not Safari; it fails without the fix).

## Not done yet

- Acts I and II revisits, the side road, recolours and the wishlist art are proposals for the next tasks.
- A bigger finale moment (a celebration screen when the Ember Queen falls the first time, perhaps Kindle the Little
  Ember as a pet) needs Dave's yes and probably new art.
- Big Muriel's fight rolls a Special like any fight; one test roll gave her "Spawn: summons a Goblin Skulker", which is
  odd on a mountain top. The Specials draw from the whole list; giving each act its own summon is a follow-up.
