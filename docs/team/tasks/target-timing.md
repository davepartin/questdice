# Battle target and magic timing (Grok's board task f7ed0b7, Dave approved 31 Oct 2026)

Goal: nobody is punished for doing things in the "wrong" order.

## What the game now does

1. **The target persists.** Your target stays your target from round to round while it stands. When it falls, the next living monster is chosen for you (a short "X is your target now" note) so you can just tap Roll. Only the very first round against several monsters asks you to choose.
2. **Magic any time before the roll.** Heal, potion, charge, release and every cast can be used before or after rolling. The one exception is a free reroll (Quickdraw), which needs dice to act on, so it waits for the roll and says so. The heart change still needs the dice (it turns the heart die). The sheet stays open after a pre-roll heal or cast.
3. **A targeted power locks the target when it is used.** Targeted means the effect belongs to the monster you hit: Polymorph, Hunter's Mark and the three supers (Judgment, Rain of Arrows, Avalanche, Finale). Using one puts a lock on that monster's piece and tapping another monster says why it cannot change. Heal, charge, release and all the other powers never lock. A targeted power asks for a target first if round one has not had one chosen (nothing is spent). The lock lasts the round.
4. **Roll comes last.** The shot goes to the locked (or selected) target and the power's effect is still on it after the roll.

Also fixed on the way: the Roll button said "choose target" after a target had been picked.

## Where

Engine: `castPower` accepts the reset phase (not a free reroll with no dice); `isTargeted` and `needsDice` helpers. Table: `card` no longer needs rolled dice. Battle screen: target persistence, lock, `refreshReset` (a heal or cast before the roll repaints without closing the sheet). Sheets: `powers.js` and `magiccard.js` gating only. Lock icon: `flat.js` `setLock`, `board.css`. Assumption to confirm: which powers count as targeted (above).

## Checks

`test/targettiming.test.mjs` (4) and 527 tests in all pass. `dev/target-timing.mjs` plays a real solo fight against three monsters at 390x844 (headless Chromium, not Safari) and passes every step: round one asks for a target and Hunter's Mark is refused without spending anything; heal and a charge before the roll do not lock and the sheet stays open; the target can still be switched; Hunter's Mark before the roll costs 2 magic, adds +3 pierce and locks (lock icon shown); another monster cannot be chosen; Roll keeps the lock and the pierce; next round the target that fell is replaced by a living one and the lock is gone; rolling again aims at the same target. Screenshots in `target-timing/`.

## Not covered

Online (table.js `card` before the roll is relaxed, but the lock itself is local to each phone and no two-phone online run was done), party hot-seat, other classes' sheets in this flow, real Safari. Monsters' reactions to a pre-roll cast are unchanged.
