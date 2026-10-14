# Painted miniatures — audit (14 Oct 2026)

A look at every painted piece Dave can use to decide what to repaint, recut, or keep. Nothing here redesigns the roster. Contact sheet: `docs/ingame/miniatures_overview.png` (dark ground, then light; ~160px tall, phone battle size). `docs/ingame/` is gitignored scratch; a copy also lives in `docs/screens/miniatures_overview.png`. Rebuild with `node dev/minisheet.mjs`.

Heroes stand on the left of the battle table and should look right; monsters on the right looking left. `faces: 'right'` on a class means it was painted looking right (default is left). Pets sit at camp and on the pet chip; they have no `faces` / `imgBase`.

## The five most important fixes

1. **Every monster is mirrored in battle.** `needsFlip` reads `def.faces` and treats anything that is not the string `'left'` as “painted looking right”. On a monster, `faces` is the *attack list* (an array), so the check is always true and every foe is flipped. They look away from the heroes. The Wizard and Bard are fine (their `faces: 'right'` is a real string). Frostwhelp had a `faces: 'right'` in the same object as its attack list; the list wins, so that flag never did anything — and the whelp is painted looking left anyway. **Fix:** make `needsFlip` only trust a string (or a new `looks: 'left'|'right'` field). Do not store painted facing on monsters in `faces`.

2. **Starling (the owl pet) reads occult.** Horns, bat wings, and a glowing triangle on the chest. The rule is no demonic / satanic / cultic / occult marks or pentagrams. Repaint as a small owl in a wizard hat, no horns, no bat wings, no triangle.

3. **Cinderling and Frostwhelp have pixelated breath.** The fire puff and the frost puff are blocky blobs on otherwise painted miniatures. Replace those two puffs so they match the rest of the piece.

4. **The Ranger becomes left-handed when the board mirrors her.** She is painted in profile looking left, bow in the proper hand. Heroes must look right, so she is flipped, and the bow swaps hands. A shield with a lion (the Knight) or a hammer (the Dwarf) has the same swap, but those two face the camera so the “wrong way” is milder. Best fix for the Ranger: a new painting that already looks right. Until then, the flip is the lesser evil.

5. **The Gloom Stalker (and Ember the pet) vanish on a dark table.** The stalker is charcoal on charcoal; Ember is a black dragon. At phone size (~90–120px tall) the silhouette is all you get. A rim light, or slightly lifting the cloth/scales, would be enough. Do not restyle them.

## What was changed in code (this pass)

Only `faces`, `imgBase`, and the `SIZE` table. Everything else is written down, not patched.

- **Frostwhelp:** removed the unused `faces: 'right'` (overwritten by the attack list, and the painting looks left).
- **imgBase:** Bone Warden disc moved right, under the feet instead of the shield (`cx` 174 → 218). Shieldbearer, Dirge Singer and Fallen Champion discs were almost as wide as the picture; tightened to the painted lava base.
- **SIZE** (`js/g3/flat.js`): Ashmaw 1.5 → 1.6 (elite dragon ≈ ogre), Ember Queen 1.65 → 1.7 (tied with the Bone Warden for biggest). Rel scale cap is still 1.7.

Not changed, on purpose: `needsFlip` itself (see fix 1). No recuts, no new paintings.

## How to read the table

- **Painted facing:** left / right / toward the viewer, from the file, not from the heuristic.
- **faces value:** what `needsFlip` would use if `faces` were a string. Monsters cannot use this key; it is their attack list.
- **Cutout:** halos, leftover studio cream, clipped bows/wings/tails, rough edges, checked on dark and light.
- **Verdict:** OK (keep) / small fix (tweak the file or a number) / repaint (new picture).

Act I/II originals are in `assets/miniatures/src/`. Act III pieces (hired blades and dragons) have no `src` file; they arrived as cutouts. Pets were cut from `assets/pets/src/*.jpg` by `dev/petcut.mjs`.

## Heroes

| Name | File | Painted facing | faces value | Cutout | Size | Readability | Theme | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Knight | knight.webp | toward viewer (slight left) | left (default) | Clean. Sword and shield complete. | Hero. | Good. | Lion on shield and surcoat. Fine. | **OK** (mirroring swaps sword/shield hands; front-on so keep) |
| Ranger | ranger.webp | left | left | Clean. Bow and quiver complete, no clip. | Hero. | Good. | Fine. | **small fix** (repaint looking right, or live with a left-handed bow after the flip) |
| Wizard | wizard.webp | right (¾) | right | Clean. Staff and sleeve complete. | Hero. | Good. | Stars on the robe are sparkles, not pentagrams. | **OK** |
| Dwarf Warden | dwarf.webp | toward viewer | left (default) | Clean. Hammer and shield complete. | Hero; stocky, reads well. | Good. | Geometric runes, not occult. | **OK** (same hand-swap as the Knight if flipped) |
| Bard | bard.webp | right | right | Clean. Lute, hat, sword complete. | Hero. | Good. | Fine. | **OK** |

## Monsters — Act I

| Name | File | Painted facing | faces value | Cutout | Size | Readability | Theme | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Goblin Skulker | goblin.webp | left (¾) | n/a (attack list) | Clean. | 0.72; smaller than the ogre. Right. | Good. | One skull pin. Fine. | **OK** |
| Dire Wolf | wolf.webp | left | n/a | Clean. Tail complete. | 0.9. Right. | Good. | Wolf. Fine. | **OK** |
| Ember Mage | cultist.webp | left | n/a | Clean. Flame complete. | 1.0. | Good. | Hooded robe and skulls. File is still `cultist`. Borderline cultic; skulls themselves are allowed. Lava disc in Act I is a little early. | **small fix** (less skull jewelry, or rename the file; not a full restyle) |
| Hill Ogre | ogre.webp | toward viewer | n/a | Clean. Club complete. | 1.6; clearly bigger than a goblin. | Good. | Fine. | **OK** |
| The Goblin King | goblinking.webp | toward viewer | n/a | Clean. Crown, bomb, staff complete. | 1.55; boss, just under the ogre. | Good. | Skulls on the belt and staff. Nasty goblin, not occult. | **OK** |

## Monsters — Act II

| Name | File | Painted facing | faces value | Cutout | Size | Readability | Theme | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bone Soldier | skeleton.webp | toward viewer (slight left) | n/a | Clean. Sword reaches the left edge but is not clipped. | 1.0. | Good. | Skeleton. Fine. | **OK** |
| Wraith | wraith.webp | toward viewer | n/a | Clean. The ragged white edge is the ghost, not leftover cream. Clear flying stem. | 1.15; a little taller, reads as floating. | Good. Pale on dark, still clear on light. | Ghost. Fine. | **OK** |
| Crypt Spider | spider.webp | toward viewer | n/a | Clean. Legs complete; the pale body is paint, not a halo. | 0.75; a bit small for that abdomen, but still bigger than a goblin’s *presence*. | Good (white on dark). | Spider. Fine. | **OK** |
| Bone Warden | bonewarden.webp | left (¾, shield forward) | n/a | Clean. Axe and shield complete. | 1.7; tallest humanoid. | Good. | Horned helm and skulls: undead captain, not a pentagram. | **OK** (disc now under the feet) |
| The Hollow Lich | lich.webp | left | n/a | Clean. Staff complete. | 1.6. | Good. | Lich with a green gem. Fine. | **OK** |

## Monsters — hired blades and dragons (Act III lava bases)

| Name | File | Painted facing | faces value | Cutout | Size | Readability | Theme | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Shieldbearer | shieldbearer.webp | toward viewer | n/a | Clean. Spear complete. | 1.0. | Good. | Claw-mark on the shield. Fine. Lava base matches Act III. | **OK** |
| Gloom Stalker | gloomstalker.webp | left | n/a | Clean. Bow complete. | 1.0. | Weak: charcoal on a dark table. | Hooded archer. Fine. | **small fix** (rim light) |
| Gold-Chain Jailer | chainbinder.webp | toward viewer | n/a | Clean. | 1.0. | Good. | Jailer with chains. Fine. | **OK** |
| Dirge Singer | dirgesinger.webp | toward viewer | n/a | Clean. White cloth is the ghost, not a halo. | 1.0. | Good. | Ghost with a lute. Fine. | **OK** |
| Ironclad Warden | ironwarden.webp | toward viewer | n/a | Clean. | 1.55; elite. | Good. | Slashed cross on the shield: a beaten knight, not occult. | **OK** |
| The Fallen Champion | fallenchampion.webp | toward viewer | n/a | Clean. Sword complete. Coins on the lava. | 1.55; human boss, smaller than the dragon queen. | Good. | Tabard has a gold cross with a slot; fallen paladin. Borderline, keep. | **OK** |
| Cinderling | cinderling.webp | toward viewer (breath to the left) | n/a | Clean except the **pixelated fire puff**. Wings complete. | 0.78; baby dragon, a hair bigger than a goblin. | Good. Cute reads at phone size. | Dragon. Fine. Lava base. | **small fix** (repaint the puff) |
| Frostwhelp | frostwhelp.webp | left (head and snout) | n/a (had a dead `faces: 'right'`) | Clean except the **pixelated frost puff**. Wings complete. Pale body is paint. | 0.82. | Good. | Dragon. Fine. Ice beast on a lava disc is a little odd, but the rest of Act III is lava. | **small fix** (repaint the puff; optional icy ground) |
| Ashmaw the Wyrm | ashwyrm.webp | left | n/a | Clean. Tail and wings complete. | 1.6 (was 1.5). | Good. | Dragon. Fine. Lava + coins. | **OK** |
| Vharaxis, the Ember Queen | vharaxis.webp | toward viewer | n/a | Clean. Wings complete, not clipped. | 1.7 (was 1.65); widest piece. Height-based layout still shrinks her a little next to a tall Bone Warden. | Good at 160px; wings need width. | Dragon. Fine. Lava + hoard. | **OK** |

## Pets

Illustration style (Dave’s pictures), not painted-miniature. That mismatch is expected; do not restyle them to match the heroes. No `faces` / `imgBase`. They are not mirrored.

| Name | File | Painted facing | faces value | Cutout | Size | Readability | Theme | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ember | ember.webp | toward viewer | — | Clean. Tail flame is a bit blocky. | Pet chip / camp feet. | Weak on a dark camp (black dragon). | Dragon with a spark on the chest, not a pentagram. | **small fix** (rim light; optional smoother flame) |
| Bristle | bristle.webp | toward viewer | — | Clean. Spear complete. | Pet. | Good. | Hedgehog. Fine. | **OK** |
| Shellback | turtle.webp | toward viewer | — | Clean. | Pet. | Good. | Fleur-de-lis on the shield. Fine. | **OK** |
| Sprig | bunny.webp | toward viewer | — | Clean. Only pet with a moss disc under the feet. | Pet. | Good. | Green cross pendant. Fine. | **OK** |
| Starling | owl.webp | toward viewer (slight left) | — | Clean. | Pet. | Good. | **Horns, bat wings, glowing triangle.** Occult. | **repaint** |
| Penny | penny.webp | toward viewer | — | Clean. Coin pile complete. | Pet. | Good. | Gold dragon. Chest swirl is a coin-mark, not occult. | **OK** |

## Style notes (keep, don’t chase)

- Lighting is mostly from upper front, a little to the left. Close enough across the set.
- Act I grass/rock, Act II crypt stone, Act III lava: the new roster is consistent. Exceptions worth a shrug, not a repaint: Ember Mage’s lava disc in Act I, Frostwhelp’s lava under ice.
- Relative size after this pass: goblin < whelps < wolf ≈ spider < humanoids < ogre ≈ Ashmaw ≈ lich ≈ Goblin King / Iron Warden / Fallen Champion < Bone Warden = Ember Queen. Dragons now match the top of the scale; the Queen is wide rather than tall, so she still won’t *look* taller than the Warden.

## Left on the desk (do not change in this pass)

- `needsFlip` in `js/data.js` (fix 1).
- Recutting anyone. The Act I/II cutouts are clean on dark and light; Act III has no `src` to recut from.
- Pet style vs painted-mini style.
- Knight / Dwarf default `faces` (front-on; flipping them would swap hands for little gain).
