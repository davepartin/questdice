// Camp dice-grid prices: what the next buy on a slot costs, and whether gold can pay it now.
import * as E from './engine.js';

export const GRID = [
  ['NW', 'Left weapon'], ['N', 'Head'], ['NE', 'Right weapon'],
  ['W', 'Left hand'], ['C', 'Heart'], ['E', 'Right hand'],
  ['SW', 'Talent one'], ['S', 'Feet'], ['SE', 'Talent two'],
];

function cheapest(costs) {
  const n = costs.filter((c) => Number.isFinite(c) && c > 0);
  return n.length ? Math.min(...n) : null;
}

function emptyFace(faces, f) {
  const e = faces[f];
  return !(e && (Array.isArray(e) ? e.length : true));
}

export function slotPrice(hero, slot) {
  if (slot === 'C') return null;
  if (!E.isActive(hero, slot)) return E.unlockInfo(hero, slot).cost ?? null;
  if (slot === 'NW' || slot === 'NE') {
    const inst = hero.loadout[slot];
    if (!inst || inst.twin || inst.id === 'fists') return null;
    const f = E.forgeInfo(hero, inst.uid);
    const t = E.trainInfo(hero, inst.uid);
    return cheapest([f.cost, t.cost]);
  }
  if (slot === 'W' || slot === 'E') return E.strengthUpgrade(hero, slot).cost ?? null;
  if (slot === 'N') return E.mindUpgrade(hero).cost ?? null;
  if (slot === 'S') return E.speedUpgrade(hero).cost ?? null;
  if (slot === 'SW' || slot === 'SE') {
    const up = E.specialUpgrade(hero, slot);
    const info = E.talentInfo(hero, slot);
    const faces = hero.talent?.[slot] || [];
    return cheapest([up.cost, ...info.costs.filter((_, f) => emptyFace(faces, f))]);
  }
  return null;
}

export function slotCanBuy(hero, slot) {
  if (!E.isActive(hero, slot)) return E.unlockInfo(hero, slot).ok;
  if (slot === 'NW' || slot === 'NE') {
    const inst = hero.loadout[slot];
    if (!inst || inst.twin || inst.id === 'fists') return false;
    return E.forgeInfo(hero, inst.uid).ok || !!(E.trainInfo(hero, inst.uid).cost && E.trainInfo(hero, inst.uid).ok);
  }
  if (slot === 'W' || slot === 'E') return E.strengthUpgrade(hero, slot).ok;
  if (slot === 'N') return E.mindUpgrade(hero).ok;
  if (slot === 'S') return E.speedUpgrade(hero).ok;
  if (slot === 'SW' || slot === 'SE') {
    if (E.specialUpgrade(hero, slot).ok) return true;
    const info = E.talentInfo(hero, slot);
    const faces = hero.talent?.[slot] || [];
    return info.costs.some((c, f) => emptyFace(faces, f) && hero.gold >= c);
  }
  return false;
}
