# QuestDice — Graphics Contract

How the 3D layer is built, what every module may assume, and how to look at your work. Everything is
procedural (no image or model files) and runs on Three.js r186, vendored in `vendor/three/`.

## 1. Art direction

**Dark-fantasy, ember-lit, hand-built.** Think *Diablo IV / Darksiders / Hades-in-3D / Dark Alliance*, not
cartoon. Strong silhouettes you can read in half a second, chunky heroic proportions, layered plates, cloth
and leather, straps and studs, believable materials, and *light as the main character*.

* **Palette.** A near-black void, warm ember orange against cold moonlit teal-blue. Warm = fire, danger,
  gold, magic fuel. Cold = night, steel, shields, ice. Keep the Fleet Dice game colors as *semantic* colors:
  **red `#ff4d4d` = attack**, **blue `#4db4ff` = block**, **yellow `#ffd23d` = Magic**, **purple `#b07dff` =
  Pierce**, **green `#45e08b` = heal**, **gold `#f0b43c` = coins**. Rarity: bronze `#cd7f32`, silver `#c3cde0`,
  gold `#ffd23d`, diamond `#8fe8ff`.
* **Lighting rules.** Every scene has a *warm key* low and to one side, a *cold rim* behind, a soft
  hemisphere fill, and 1-3 flickering *point lights* from fire/magic. Highlights must bloom. Shadows must be
  soft and pooled under feet. Nothing is lit flat.
* **Surfaces.** Use `mat('stone'|'leather'|...)` from `js/gfx/mats.js` and tint with options. Metals reflect the
  environment (`scene.environment`), so keep `metalness` high and `roughness` varied. Break up large flat
  colors with texture, vertex-color AO (`paint()`), and small details.
* **Detail pass is mandatory.** Sculpt from many small parts: tapered limbs (`tube`), lumpy organic forms
  (`displace`), rounded boxes (`box(w,h,d,r)`), lathe-turned props, rivets, straps, tattered cloth strips,
  teeth, claws, eyes with a glow. A character built from five primitives is *not* finished.
* **Motion is half the look.** Idle must breathe (chest, head lag, secondary motion on cloth/tails/ears).
  Attacks need anticipation, a fast strike, overshoot and recovery.

## 2. Units, orientation, budgets

* 1 unit = 1 metre. +Y up. **Actors face +Z**, feet on y = 0. Hero ≈ 1.8 m.
* Quality tiers: `'low' | 'med' | 'high'` are passed to builders. Use them to scale segment counts, instance
  counts and particle counts (low ≈ 40% of high). **Budget (high):** ≤ 60k triangles per actor, ≤ 40 draw
  calls per actor (merge static geometry that shares a material; `mergeGeometries`). Arena: ≤ 250k triangles
  total, instance anything repeated (`THREE.InstancedMesh`).
* Everything animated uses the **stage clock**, never `performance.now()` / `Date.now()`:
  `stage.onFrame((dt, t) => …)`, `stage.tween`, `stage.wait`. This keeps screenshots deterministic.

## 3. Modules

| File | Purpose | Owner |
|---|---|---|
| `js/gfx/core.js` | `createStage(canvas)`: renderer, camera, post chain, deterministic clock, tweens, shake/flash/hurt | foundation |
| `js/gfx/post.js` | bloom, GTAO, tone map, grade (vignette/grain/CA/tilt-shift), SMAA. `stage.post.look({...})` | foundation |
| `js/gfx/env.js` | procedural IBL environment | foundation |
| `js/gfx/noise.js` | seeded rng, noise, fbm, worley | foundation |
| `js/gfx/tex.js` | `pbr(kind, opts)` tileable PBR sets; `sprite(name)` particle textures | foundation |
| `js/gfx/mats.js` | `mat(name, opts)`, `solid()`, `glow()`, `gem()` | foundation |
| `js/gfx/util.js` | geometry helpers (`lathe`, `tube`, `displace`, `shaped`, `paint`, `box`...), easing | foundation |
| `js/gfx/rig.js` | `Animator` (clips over joints), `Spring`, pulse/ramp helpers | foundation |
| `js/gfx/particles.js` | `Particles` GPU point sprites; `stage.addParticles(ps)` | foundation |
| `js/gfx/actors/base.js` | `Actor` class: joints, clips, hit-flash, ember-dissolve death, anchors | foundation |
| `js/gfx/actors/common.js` | `intentClips(intent)` → which clip telegraphs / performs a monster move | foundation |
| `js/gfx/actors/index.js` | `createActor(id, opts)` registry with placeholder fallback | foundation |
| `js/gfx/actors/{goblin,wolf,cultist}.js` | Act I minions | monsters-A |
| `js/gfx/actors/{ogre,goblinking}.js` | the elite and the boss | monsters-B |
| `js/gfx/actors/hero.js`, `js/gfx/weapons.js` | the five hero classes and all weapon models | heroes |
| `js/gfx/dice/*.js` | 3D dice, the tray (the "character mat"), rolling, picking | dice |
| `js/gfx/arena.js` | Act I battlegrounds | arena |
| `js/gfx/vfx.js` | combat effects | vfx |
| `dev/` | viewer, screenshot tool, static server | foundation |

**Only edit files you own.** If you need a change in a foundation file, make the *smallest possible* fix, and
list it in your final report (bugs in foundation code are expected and welcome to be fixed, quietly widening
it is not). **Never run git.** The lead commits.

## 4. The Actor contract

```js
// js/gfx/actors/goblin.js
import { Actor } from './base.js';
export function create({ seed = 1, quality = 'high', id } = {}) {
  const a = new Actor({ name: 'goblin', height: 1.25, radius: 0.5 });
  const hips = a.joint('hips', a.model, 0, 0.55, 0);        // joints are Groups you pose via clips
  /* … meshes parented under joints … */
  a.anchor('head', headJoint, 0, 0.3, 0);   // overhead UI point (hp bar / intent icon): REQUIRED
  a.anchor('chest', chestJoint, 0, 0, 0.2); // where hits land: REQUIRED
  a.anchor('feet', a.model, 0, 0.02, 0);    // ground contact for rings / dust: REQUIRED
  a.anchor('mouth', …); a.anchor('handR', …); a.anchor('handL', …);  // optional, used by VFX
  a.clips = { idle: { loop: true, dur: 2.4, fn: (t, P, k) => { P.rot('spine', …); } }, … };
  return a.finalize();                       // clones materials, hooks flash + dissolve, starts idle
}
```

* **Required clips:** `idle` (loop), `ready` (loop; the menacing "I'm about to act" stance), `attack` (event `hit`),
  `hurt` (short, *additive*, plays over anything), `die` (the body drops; `Actor.die()` then dissolves it to
  embers), `guard`, `spawn` (arrives on the field, ~1 s).
* **Move clips** each monster should do well, with an event `hit` at the impact frame: whatever matches its
  moves in `js/data.js` (`attack`, `attack2`, `lunge`, `throw`, `cast`, `hex`, `siphon`, `summon`, `howl`, `mend`,
  `charge` (hold the wind-up pose, loop or long), `slam`, `stomp`, `rage`). Telegraph clips (`tele_strike`,
  `tele_cast`, `tele_guard`, `tele_charge`, `tele_howl`, `tele_hex`, `tele_pilfer`, `tele_summon`, `tele_mend`,
  `tele_slam`) are looping poses that *show the player what is coming* before the dice are rolled: a raised club,
  a crouch, crackling hands. Missing clips fall back along a chain (see `FALLBACK` in `base.js`).
* A clip is `{ loop, dur, events?: { hit: seconds }, fn(t, P, k) }`. `P.rot/pos/scl(jointName, …)` are *deltas
  from the rest pose* you built the model in. Rest pose = standing, relaxed. Use `sinT`, `pulse`, `ramp01`.
* The base class gives you `flash()`, `setGlow(color, k)`, `hurt()`, `die()`, `worldAnchor(name)`. Materials
  are cloned per instance, so flashing never leaks. Use `a.userData.rage = fn` style hooks for boss form
  changes: bosses must expose `a.setRage(on)` (bigger glow, flame crown, new eyes).
* Intent mapping lives in `actors/common.js`: `intentClips({ v: 'strike', n: 'Stab' })` → `{ tele, act }`.

### Hero actor (`actors/hero.js`)
`create({ cls: 'knight'|'ranger'|'wizard'|'dwarf'|'bard', loadout: { NW: {id, rarity}, NE: {id, rarity} }, level, seed })`
plus `actor.setLoadout(loadout)` to swap weapons live (the Camp screen does this) and `actor.setLevel(n)`
(armor tiers). Clips: `idle`, `ready`, `attack` (slash/shoot/cast per class + weapon), `attack2`, `block`
(raise shield/guard), `cast`, `hurt`, `die`, `victory`, `lastStand`, `drink`. `weapons.js` exports
`createWeapon(id, rarity, {quality}) -> Group` with the **grip at the origin, blade along +Y, edge facing +Z**,
rarity shown in materials (bronze → silver → gold → glowing diamond).

## 5. Dice contract (`js/gfx/dice/`)

```js
const tray = createTray({ stage, quality });   // tray.object: Group, y=0 is the table top, +Z toward the player
stage.scene.add(tray.object);
tray.setHero(hero);                  // dice sizes, weapon faces, two-handed bracket, class-themed mat art
await tray.roll(board, { slots });   // physical tumble; each die settles showing board[slot].v. slots=null → all nine
tray.show(board);                    // instant, no animation
tray.setSelected(new Set(['NW']));   // glowing ring on dice picked for reroll
tray.setBound('S', true);            // chained / hexed die
tray.highlight(['NW','N','NE'], 'red');   // synergy glow along a line
tray.setValue('C', 4, { animate: true }); // heart nudge
tray.lock(); tray.unlock();          // lock-in flourish
tray.onPick = (slot) => {…};         // pointer/touch on a die (raycast)
tray.size  // { w, d } footprint in metres
tray.update(dt, t); tray.dispose();
```
Slots: `NW N NE / W C E / SW S SE` (see `js/data.js`). Face semantics come from `js/view.js` `dieSpec()` and
`js/engine.js` (`weaponFaces`, `specialFace`, `sidesOf`). Dice are d4 (head, feet, weapons), d6 heart, d4→d10
hands and special corners. They **must read at a glance on a phone**: big, high-contrast numerals/symbols.

## 6. How to look at your work

```bash
node dev/serve.mjs 81NN &        # pick your own port (81NN) so parallel agents don't collide
node dev/shot.mjs --url "http://localhost:81NN/dev/viewer.html?m=gfx/demo/actor.js&actor=goblin&anim=idle" \
     --out shots/area/goblin-idle.png --advance 0.5 --q med
```
* `--q med` is faster than `high` (no AO); do your **final checks on `--q high`**. Add `--w 960 --h 540` for speed.
* `--seq '[{"eval":"__qd.actor.play(\"attack\")","advance":0.3,"shot":"a.png"},{"advance":0.2,"shot":"b.png"}]'`
  takes several frames in one browser launch. `window.__qd.stage / .ctx / .actor` are exposed.
* The viewer runs in **manual time**: nothing moves until you `advance`. **Never `await` an animation
  promise inside a demo's setup**, because time does not pass until the first `step()`.
* Demo modules export `async function demo(ctx)`. See `js/gfx/demo/actor.js` and `materials.js`.
* Put screenshots under `$SCRATCH/shots/<area>/` (the lead tells you the path). **Look at every image** with the
  Read tool and be ruthless: silhouette, proportions, materials, lighting, color, readability at 1/3 size.
