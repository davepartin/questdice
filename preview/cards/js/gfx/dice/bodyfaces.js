import { FACE_PAY } from '../../data.js';

// Exactly four immutable face sets, shared by every head, hand and feet die.
const sets = new Map();
export function bodyFaceLabels(sides) {
  if (![4, 6, 8, 10].includes(sides)) throw new Error(`Unsupported body die: d${sides}`);
  if (!sets.has(sides)) {
    const labels = Array.from({ length: sides }, (_, i) => {
      const v = i + 1; const pay = FACE_PAY[v]; const corners = [];
      for (const kind of ['heal', 'pierce', 'magic', 'gold']) for (let n = 0; n < (pay?.[kind] || 0); n++) corners.push(kind);
      return Object.freeze({ text: String(v), pip: corners[0] || null, corners: corners.length ? Object.freeze(corners) : undefined });
    });
    sets.set(sides, Object.freeze(labels));
  }
  return sets.get(sides);
}
