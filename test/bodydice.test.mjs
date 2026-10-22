import test from 'node:test';
import assert from 'node:assert/strict';
import { FACE_PAY } from '../js/data.js';
import { bodyFaceLabels } from '../js/gfx/dice/bodyfaces.js';

test('four shared immutable body dice preserve every face payout and have no identity artwork', () => {
  const sets = new Set();
  for (const size of [4, 6, 8, 10]) {
    const labels = bodyFaceLabels(size); sets.add(labels);
    assert.equal(bodyFaceLabels(size), labels);
    assert.equal(labels.length, size);
    for (let i = 0; i < size; i++) {
      const face = labels[i]; const number = i + 1;
      assert.equal(face.text, String(number));
      assert.deepEqual(Object.keys(face).sort(), ['corners', 'pip', 'text']);
      const payout = {};
      for (const k of face.corners || []) payout[k] = (payout[k] || 0) + 1;
      assert.deepEqual(payout, Object.fromEntries(Object.entries(FACE_PAY[number] || {}).filter(([, n]) => n > 0)));
      assert.throws(() => { face.text = '99'; }, TypeError);
      if (face.corners) assert.throws(() => face.corners.push('gold'), TypeError);
    }
    assert.throws(() => labels.push({ text: '99' }), TypeError);
  }
  assert.equal(sets.size, 4);
});
