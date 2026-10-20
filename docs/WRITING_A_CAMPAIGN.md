# Writing a campaign pack

A pack is data: `js/packs/<id>.js` plus one entry in `js/campaigns.js` (`CAMPAIGNS`). `js/packs/starfall.js` ("Pip Needs a
Lift") is the worked example of everything below; `js/packs/cloverheist.js` is a second 1–6 hero example.

## What a pack holds

- **`actSpecs`** (three acts, one per land: 1 the Ashen Marches, 2 the Hollow Crypt, 3 the Ember Peaks). Each act has:
  - `fights`: ten casts, one per step, by miniature id from `docs/MINIS.md` (step 5 is the elite, step 10 the boss);
  - `names`: the story names beside them, index for index;
  - `route`: the place of each step, chosen from that land's painted places (`ACTS[land - 1].places` in `js/data.js`); the boss
    fights at the last entry of `places`;
  - `fightHp`: per-step health tuning (see Balance);
  - `moments`: an optional road moment for each quiet step (see below);
  - `help: []` (no Call for Help), and optional `gates` (Act III uses them for the elite and the boss).
- **`steps`**: per act, ten rows of `{ place, icon, foes, names, arrive: [...], win: [...] }`; `foes`, `names` and `place` must
  match `actSpecs`.
- **`beats`**: the big story pages, `open:N`, `elite:N`, `boss:N` and `close:N` for each act.
- **`voice`** (optional): who hands out the secret-objective envelopes before each fight, `{ name, scenes: [four short scenes] }`.
  Without one, Old Whisper does it.

Text may use `{names}` (every hero), `{someone}` (one hero, the same one each time that line is shown) and `{wizard}`, `{knight}`
and so on. Never write "he" or "she" for a hero: use the name.

## Road moments

Before every fight the road has something on it: a choice before step 3, a dice test before the elite (step 5) and before step 8,
the night before the boss, and the opening at Act I step 1. Every other step (1, 2, 4, 6, 7, 9) has a **road moment**: one short
scene and one roll, and the best roll wins a small bonus for the next fight. A pack can write its own for any of those steps, so
the road follows the story:

```js
moments: [
  null,                       // step 1 (Act I: the opening plays here)
  { title: 'Pip Learns to Ride', stat: 'wisdom', prize: 'magic', go: 'Teach Pip to hold on',
    tell: 'On the road to {place}, somebody has to teach a three-eyed blob how to hold on.',
    won: '{who} shows Pip how to grab a collar.', lost: '{who} explains it slowly. Pip lets go to clap.' },
  null,                       // step 3 has a bigger encounter
  …
]
```

`stat` is `wisdom` (head die), `strength` (hands) or `speed` (feet); `prize` is `magic`, `gold`, `hp`, `atk` or `block`.
`{place}` is where the road leads (the next fight), `{who}` the hero who rolled best, `{company}` everyone.

## Plain writing

Write in conversational modern English. Not witty. Not old-British. No running jokes, asides, or narrator gags.

Between battles (beats, arrive, win), use at most one or two short paragraphs. Say what is happening and what the danger is.

Secret-objective envelopes are a simple rule plus gold. Four short voice scenes per pack: who hands the envelope, and “Read it. Don’t show the others.”

Solo games (1 hero) get no secret objectives or envelopes. The campaign gold-giver offers one hard Bonus Goal per fight or elite fight, worth about 50–60 gold (win without a potion, block 40 damage, deal 40 magic damage). Tables of 2–6 keep secret objectives.

## Balance

Casts from another land, and fights of three monsters, need `fightHp`. Measure against the Dawn Lantern and tune until each step
wins about as often:

```sh
CMP=wise sh tools/skill-all.sh 3 2                   # the Dawn Lantern
PACK=<id> CMP=wise sh tools/skill-all.sh 3 2         # your pack
PACK=<id> node tools/party.mjs 3 1 2                 # two heroes at a table
```

Three-monster fights usually want 0.45–0.7. A boss that calls adds (the Glass-Hive Queen, the Goblin King) is much harder away
from its own land.

## Checklist

Add a test like `test/starfall.test.mjs` (casts are real minis, steps match the acts, places are painted, every quiet step has its
moment, no `{` left after names are filled), run `npm test`, then `node tools/stamp.mjs <version>`.
