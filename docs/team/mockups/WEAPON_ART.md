# Weapon art system and weapon card front (CONCEPT, Art director: Grokbot)

Docs only. Nothing here is wired into the game.

## Inventory (js/data.js `WEAPONS`, faces via js/engine.js `weaponFaces`)
| Type (id) | Hands | Temper | Lean | Symbols (fx) |
|---|---|---|---|---|
| Dagger (dagger) | 1 | steady | attack | heal, pierce |
| Bracer (bracer) | 1 | steady | block | magic, heal |
| Sword (sword) | 1 | balanced | attack | pierce, magic |
| Shield (shield) | 1 | balanced | block | heal, magic, pierce |
| Spear (spear) | 1 | risky | attack | pierce, magic |
| Mace (mace) | 1 | brutal | attack | pierce, heal |
| Tower Shield (tower) | 1 | risky | block | heal, magic |
| Bow (bow) | 2 | steady | attack | pierce, magic |
| Staff (staff) | 2 | balanced | attack | magic, heal |
| Long Sword (longsword) | 2 | risky | attack | pierce, magic |
| War Hammer (warhammer) | 2 | brutal | attack | pierce, heal |
| Fists (fists) | 1 | n/a | n/a | no art needed |

- **Legendaries** borrow a base model: Dawnbreaker (sword), Oakheart (shield), Thunder Spear (spear), Fortune's Dagger (dagger), Starfire Staff (staff), Twinfang Bow (bow).
- **Metals:** Bronze, Silver, Gold (`RARITY`). Wear is 4 / 6 / 8 battles. Diamond is a one-fight rule.
- **Weapons2 experiment (off):** adds Axe, Arrows (quiver) and Round Shield.

**Where weapon pictures appear today:**
- `js/g3/screens.js` `portraitQ.weapon()` renders the 3D model to a 200 px data URL at runtime. It is used by the weapon card stage (`js/g3/scrui.js:296`, `.wc-art`) and the store and pack rows (`scrui.js:1270`, `.sh-rart`).
- Battle uses the 3D weapon models (`createWeapon`).
- The board mat draws flat SVG weapons (`js/mat.js` `weaponArt`).
- Emoji glyphs (`glyph` in data.js) are mostly replaced by hudkit icons.

## Proposed system
1. **One painted master per type:** 11 masters, plus 6 legendary paints later. The same image is used on the card, in lists, in the store and on the battle HUD, so the dagger always looks like the dagger. Every master uses the same angle (45° diagonal, grip lower left), warm key light from the upper left and a cool rim light.
2. **Metal by tint, not separate paints.** A gradient map is applied only to the low-saturation steel pixels, so leather, wood and gems keep their colour. The pilot dagger shows Bronze, Silver and Gold from one master. This keeps one consistent silhouette per type, triples nothing, and new metals cost zero art. The masters are painted in neutral steel, which is the Silver look. The tints can be baked at build time (three files) or applied in CSS/canvas. Baking is safer on Safari and keeps the same KB.
   - Legendaries get their own paint, because they should look unique.
3. **Exports, WebP with alpha:**

   | Size | Use | Per file |
   |---|---|---|
   | 512 | card | 18–21 KB |
   | 128 | list / store | about 3 KB |
   | 64 | small icon | about 1 KB |

   **Estimates:**
   - 11 types, one master each, all sizes: about 11 × 25 = **about 275 KB**.
   - With baked Bronze/Gold/Silver 512s: about **650 KB**.
   - With 6 legendaries: about **800 KB** total.
   - Cards load one image at a time, and icons are only about 4 KB per type, so a list screen costs almost nothing.

   The 3D portrait renderer can then retire for weapons, which saves GPU time at camp.

## Pilot (this PR)
- `weapons/art/dagger|sword|mace-{512,128,64}.webp`: cut out with rembg plus a border-connected white key, a soft alpha and white un-premultiply, so there is no halo.
- `weapons/art/dagger-{bronze,silver,gold}-512.webp`: the tint test.
- `weapons/png/pilot-sheet.webp`: card size, the tints, and a 64 px / 32 px owned-weapons list.

## Weapon card front (`weapons/weapon-front.html`)
- **Look:** follows the No Potions front: black tooled leather, silver/gold filigree corners, a painted scene window (`art/scene-forge.webp`, 26 KB) and a parchment box.
- **Frame:** `art/front-frame.webp`, 720x960, 150 KB, text-free, with the green window keyed out.
- **Live HTML:** name, metal, die size, battles left, the Silver Dagger d6 faces from `weaponFaces()` (R2 · B2 · R3 · R3+heal1 · R4+pierce1 · R5+heal2) and sell value 27.
- **Corner accents** are keyed to the weapon's symbols, using the css/powers.css colours: orange pierce arrows (#ff8a1a) and green heal plus (#38e87a). A magic weapon would show purple triangles (#b46cff).
- **Layout:** Take/Sell sit below the card. Renders: `weapons/png/weapon-front_{390x664,375x548}_{chromium,webkit}.webp`. 375x548 scrolls slightly (`_full`).
