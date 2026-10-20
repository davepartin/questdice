# Quest Dice: Design and Build Plan

## 1. Design intent

Camp is the place where the hero gets ready for another adventure. It should feel like handling your character's equipment on a tabletop. Players should recognize the board, pick a die, understand their options, and return to play without searching through a long menu.

Premium quality here means consistency, legibility, thoughtful spacing, clear state changes, and satisfying response. It does not require cinematic rendering, large downloads, or elaborate motion.

Use existing miniature art, warm brass trim, dark leather or walnut surfaces, ivory body dice, familiar outcome colors, and controlled highlights. Let one selected object and one primary action attract attention. Keep quieter surfaces behind them.

Avoid unrelated decorative symbols, busy borders inside borders, excessive glow, permanently moving effects, tiny uppercase paragraphs, and textures behind important text. Follow Dave's existing content constraints in project notes.

## 2. Preserve the identity that already works

Keep:
- Miniatures standing in painted environments.
- The recognizable battle dice and their position on the character board.
- The six colored outcome counters: attack, pierce, block, magic, heal, gold.
- The existing numeric/icon language.
- Familiar main battle actions and functioning dice interaction.
- Every gameplay rule and available camp service.

Do not redesign the battlefield in the first camp milestone. Enemy label clipping and rewards comparison are later UI tasks.

## 3. Camp architecture

### Header and atmosphere

Keep hero identity and current gold readily visible. Accommodate long names and company mode. A small camp scene provides atmosphere but must not consume most of a phone's usable height.

Account for Safari address/tool bars and safe-area insets. Browser chrome reduces available space substantially. A tall desktop screenshot is not evidence that the layout fits a phone.

### Navigation proposal

Use clear, consistently placed categories rather than a single long Upgrades drawer.

| Category | Contents |
| --- | --- |
| Dice | Nine-slot board, unlocks, body growth, weapon-slot access, talent access, existing shrink service |
| Powers | Existing learning, equipping, power details, and power upgrades |
| Gear | Pack, equipment swaps, charms, Diamond case |
| Supplies | Existing potion and reroll services, pet access where appropriate, recovery/backup tools if still needed |
| Hero | Stats, perks, record/history, difficulty, hints, other existing character information |

Store remains a distinct, obvious entry. Do not accidentally hide pets, charms, pending perks, Diamonds, save recovery, difficulty, or replay navigation. A clear existing location is preferable to an arbitrary new category.

Before replacing navigation, inventory all current controls and map each to its new location. Preserve legacy links that open a particular category, such as a My hero action.

The category bar must not scroll behind a fixed header. Use one deliberate sticky layout or keep it in normal flow. Avoid overlapping sticky systems.

### Default board

The nine slots remain in this exact arrangement:

| Left | Center | Right |
| --- | --- | --- |
| NW: Left weapon | N: Head | NE: Right weapon |
| W: Left hand | C: Heart | E: Right hand |
| SW: Talent one | S: Feet | SE: Talent two |

Use actual E.isActive, E.sidesOf, equipment data, and the current slot helpers. A two-handed weapon is one linked equipment instance. Its second slot must not suggest an independent weapon or independent upgrade.

Display actual die sizes clearly. In camp a die-size token may say d6, but it must not look like a live result of six that has already been rolled. Do not show fictional faces or projected combat values.

Small plus badges can indicate that at least one action at that slot is affordable. Use a legend or supporting copy. A badge is not an automatic purchase. Any displayed starting price must identify itself as “from” when several actions differ in cost.

Locked slots remain inspectable. Distinguish locked, unaffordable, and maximum size. Do not gray an active die so heavily that it looks disabled.

Use faint class-specific head and shared hand/feet markings where useful. Preserve familiar color meanings rather than inventing new ones based on the mockup.

### Selected die

A tap should:
1. Clearly select the socket.
2. Open a detail panel associated with that slot.
3. Keep a recognizable board context visible.
4. Put the important information and action in a predictable order.
5. Allow another slot to be selected without repeated modal dismissal.

Preferred phone treatment: a compact board above an inline inspection panel. A bottom sheet can work if it demonstrably preserves context and does not create nested scrolling. Desktop can place the inspector next to the board.

Choose the layout based on actual viewport checks. Do not shrink labels or targets until they are hard to use simply to claim that everything fits.

The inspector has one frame, one content scroll owner, a clear title, and a Done/Back control. Avoid a scrolling card inside a scrolling card.

### Body-die upgrade

Information order:
- Slot name and role, for example Left hand / Strength.
- One short explanation from existing rules.
- Current die size beside the actual next available size.
- Requirements or limits when relevant.
- Primary purchase action with actual cost.
- Gold after purchase when purchase is eligible.

The next size and requirement come from the existing upgrade helper. Do not hardcode d4 to d6 or an act gate. For maximum size, do not invent a next die.

Use the existing action handler and persistence route. After success, refresh the selected slot, balance, and available actions. A brief highlight or small status message confirms the purchase. Do not repeat success feedback when a request fails or is still awaiting authority.

For online camp, preserve optimistic/rejected/pending behavior already implemented. A visual update must follow the current authoritative flow, not bypass it.

### Interaction and accessibility

Use real buttons, readable labels, visible keyboard focus, and sufficiently large tap areas. Aim for at least 44 by 44 CSS pixels for primary touch controls, including small badge hit areas when separate.

Close returns focus to the selected slot. Re-rendering must not lose useful keyboard focus or throw the scroll position unexpectedly. Inline panels are regions, not fake modal dialogs. Actual modals need their existing dismissal and focus behavior preserved.

Opening camp, switching company heroes, opening Store, returning to battle, loading another hero, and receiving an online update must clear or reconcile stale selection state.

Gold must always refer to the correct hero or existing company accounting. Do not invent pooled gold behavior.

## 4. Weapons workshop, Phase 2

Use the actual equipped weapon image and current face chips. Preserve the distinction between:
- Forge: improve metal.
- Train: change die size.
- Equip: swap an item from the pack.
- Diamond: existing special one-fight handling.

Show the actual consequences and requirements for the selected action. Read those from current code. Keep both Forge and Train discoverable; a tab or two distinct action cards can work.

A weapon can be limited by the hand die. Clearly explain that existing requirement. Do not silently present a trained weapon as rolling its full size if the game currently caps it.

Show names and metal in predictable positions. Keep Equip actions separate from purchases. Collapse pack swaps if needed, but never hide that they exist. Preserve Legendary, twin/two-handed, empty-hand, and Diamond behavior.

A convincing large weapon portrait can reuse an existing cached still. It does not require a new rotating 3D object.

## 5. Talents, Phase 2

Keep the current face rules intact, including fixed/blank/double faces and which number faces allow customization. Inspect current engine and design notes because these have changed during development.

Show a readable row or grid of faces. Selecting an editable face reveals only legal symbols, the actual cost, and clear affordability. Preserve both growing a talent die and editing its permitted faces.

Do not let a reduced or freshly grown die keep stale face indices selected. Recheck eligibility before every purchase. Ensure the player knows whether an action edits one face or grows the whole die.

## 6. Magic powers, Phase 3

The purple identity is useful. The current triangle's main issue is visual organization.

Proposed hierarchy:
1. A compact resource strip for current magic and health.
2. Class powers A, B, and C, with full readable names, costs, availability, and existing charges/cooldowns.
3. Utility actions grouped together: Potion, Heal, Heart Change.
4. A single selected-action panel with description, any legal spending adjustment, and Cast/Use.

The triangle can remain as a faint background motif. Connecting lines should not imply a prerequisite tree unless one actually exists.

Preserve the six battle counters and the battle action dock. Prevent taps on obscured battle controls through the open powers panel.

Keep all current power rules: scaling costs, minimum and maximum spend, once-per-battle effects, recharge, charges, per-round restrictions, heal caps, target selection, potion stock, and heart-change behavior. Read the actual handlers; this is a presentation change.

Changing a cost selector should show the real effect preview if the current code provides it. Do not fabricate expected damage or new probability calculations.

## 7. Technical map from the inspected repository

Verify paths and function names at current HEAD.

| Area | Starting points |
| --- | --- |
| Camp layout, categories, slot panels | js/g3/scrui.js: camp, diceGrid, slotSheet, openSlot, refreshSheet, gearTab, heroTab, powersSection |
| Slot affordance helpers | js/campbuy.js: GRID, slotPrice, slotCanBuy |
| Screen/scenery lifecycle | js/g3/screens.js, js/g3/scenery.js |
| Battle board markings | js/gfx/dice/art.js: paintDecals, CLASS_THEME |
| Body illustrations | js/gfx/dice/bodywm.js and existing assets/dice files |
| Real dice appearance | js/gfx/dice/dice.js, faces.js, tray.js |
| Existing weapon stills | js/g3/screens.js portraitQ and js/g3/portrait.js |
| Magic-powers layout | js/g3/powers.js, css/powers.css |
| Camp/menu styles | css/screens.css |
| Solo versus online flow | js/ui.js, js/g3/online.js and bound camp context |
| Authoritative rules | js/engine.js, js/table.js, js/data.js |
| Save compatibility | js/save.js |
| Cache versioning | tools/stamp.mjs and index.html import map |
| Browser examples | dev/campreview.mjs, dev/dicegrid.mjs, dev/interact-camp.mjs, dev/sheetshot.mjs |
| Regression tests | test/campbuy.test.mjs and existing engine/save/party/table tests |

Reuse authoritative rules read-only. UI code may call existing commands, but must not reproduce their logic or alter their results. Some dev scripts have machine-specific browser paths and output locations; adapt those deliberately.

## 8. Performance budget

The following are proposed guardrails for the redesign, not measured properties of the game or universal web standards.

| Item | Phase 1 target |
| --- | --- |
| New runtime packages | Zero |
| Additional live 3D scenes or render loops | Zero |
| New animation loops for camp | Zero |
| New image downloads | Prefer zero; reuse assets |
| Added compressed JS/CSS | Aim at no more than 30 KB total over baseline |
| New optional camp artwork, if genuinely needed later | Aim at no more than 150 KB total compressed; load on demand |
| Initial game transfer | No unexplained growth; report controlled before/after measurements |
| Touch response | No new noticeable delay on Dave's phone; measure handler/render cost separately from network |
| Dice smoothness | No degradation caused by a hidden camp or powers animation |
| Memory | Bounded caches; no accumulating canvases, portraits, or listeners after repeated visits |

A static texture may download once and cost little per frame. Small-looking animated effects can cost rendering time every frame. Control both.

If using canvas-generated board art, paint on meaningful changes only and reuse a bounded cached result. Do not repaint every animation frame or generate a unique unbounded data URL for every render. Inspect imports: pulling an art helper must not accidentally initialize another renderer or load an unnecessary asset family.

Keep generated textures at a useful, bounded resolution. Do not generate a 4K texture for a board shown around 300 CSS pixels wide without evidence it is needed.

Use short opacity/transform transitions where helpful. Avoid large animated blur, new real-time shadows, particles, and perpetual glow. Respect reduced motion.

Measure local content transfer, external resources, decoded image dimensions, and interactions separately. A software-rendered headless browser cannot establish iPhone frame rate or battery use.

## 9. Build phases and stop points

### Phase 0: inventory and baseline

Record current HEAD, feature inventory, relevant instructions, screenshots, existing test results, and performance observations. Identify where camp mutation handlers live. Propose a small file list.

Exit: the builder understands the surface being changed and has a repeatable baseline.

### Phase 1: board and one body-die inspector

Build a still familiar board, selected-slot state, and one complete body upgrade. Preserve access to everything else. Correct mobile fit, sticky overlap, focus, and scrolling before polishing extra decoration.

Exit: Dave can inspect, purchase, see the change, close, and continue on his iPhone. Screenshots and tests are ready for director review.

### Phase 2: complete camp upgrades and organization

Apply the interaction to all body dice, unlocks, Heart inspection, weapons, and talents. Complete camp categories and the feature inventory. Check pets, charms, Diamonds, supplies, powers, perks, Store, and hero controls.

Exit: every pre-existing camp service has a tested home; no rule changes.

### Phase 3: battle magic powers

Reorganize the purple screen using the hierarchy above. Verify all costs, availability, utility actions, targets, and online behavior. Preserve battle counters and working dice.

Exit: powers are readable and operable in short Safari viewports.

### Phase 4: consistency pass

Only after camp and powers are accepted: tidy rewards comparisons, action alignment, and enemy-label clipping. Reuse the established component styles rather than introducing another visual theme.

Exit: consistent game identity and targeted fixes, not a global rewrite.

Do not add new gameplay, redesign the campaign, alter prices, or rebuild all screens during these phases.
