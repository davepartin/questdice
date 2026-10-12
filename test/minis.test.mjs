import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSES, MONSTERS } from '../js/data.js';

test('every painted class and monster has a base disc in the image', () => {
  const check = (id, d) => {
    assert.ok(d.img, `${id} img`);
    const b = d.imgBase;
    assert.ok(b, `${id} imgBase`);
    assert.ok(b.x > 0.35 && b.x < 0.7, `${id} base x ${b.x}`);
    assert.ok(b.y > 0.97 && b.y <= 1, `${id} base y ${b.y}`);
    assert.ok(b.w > 0.55 && b.w < 1, `${id} base w ${b.w}`);
  };
  for (const [id, c] of Object.entries(CLASSES)) check(id, c);
  for (const [id, m] of Object.entries(MONSTERS)) check(id, m);
});
