// CONCEPT (docs only). What the RELEASED game plays, read from the game itself (read-only imports; nothing here changes a game file).
// The live game calls applyRelease() before it boots (js/main.js:11). It switches on the weapons second edition (js/release.js:15,
// useWeapons2 in js/engine.js:78-85), which swaps the loot table, the classes' starting weapons, the Diamond pool and the legendary pool.
// A preview that skips this step shows the OLD faces, so every T13 page imports this file first.
import { applyRelease } from '../../../../js/release.js';
import { WEAPONS, LOOT_WEIGHTS, CLASSES, LEGENDARY, DIAMOND } from '../../../../js/data.js';
applyRelease();
const classIds = [...new Set(Object.values(CLASSES).flatMap((c) => c.weapons || []))];
const active = new Set([...Object.keys(LOOT_WEIGHTS), ...classIds, ...DIAMOND.pool]);
// status of a weapon id in the released game: active (dropped, sold or dealt to a class), legendary (in the live legendary pool),
// legacy (still defined so old saves load, but nothing deals it any more), hidden (Fists)
export function statusOf(id) {
  const w = WEAPONS[id]; if (!w || w.hidden) return 'hidden';
  if (w.legendary) return LEGENDARY.includes(id) ? 'active' : 'legacy';
  return active.has(id) ? 'active' : 'legacy';
}
export const ROSTER = Object.keys(WEAPONS).map((id) => ({ id, name: WEAPONS[id].name, hands: WEAPONS[id].hands, legendary: !!WEAPONS[id].legendary, status: statusOf(id) }));
