// The five magic card types (Dave, 6 Nov 2026: "label them with a title for each type so that when the different bots work on this, they
// know they're working on this template"). docs/team/MAGIC_CARD_TYPES.md describes each template.
import test from 'node:test'; import assert from 'node:assert/strict';
import * as D from '../js/data.js';
export const TYPES = { 'Dice Card': ['scale'], 'Charge Card': ['charge'], 'Every-Round Card': ['flat'], 'Side-Game Card': ['mix', 'luck'], 'Finisher Card': ['super', 'round'] };
test('every magic card carries one of the five types, and it matches how the card plays', () => {
  const all = Object.values(D.CLASSES).flatMap((c) => c.cards);
  for (const k of all) { assert.ok(TYPES[k.type], `${k.name} has a type (${k.type})`); assert.ok(TYPES[k.type].includes(k.kind), `${k.name}: a ${k.kind} card is not a ${k.type}`); }
  assert.deepEqual(Object.keys(TYPES).map((t) => all.filter((k) => k.type === t).length), [6, 10, 12, 6, 5]);
});
