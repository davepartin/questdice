import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSES, MONSTERS, LOOK, needsFlip } from '../js/data.js';

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

test('every hero and monster records which way it was painted, and the flip faces the opponent', () => {
  // Dave: monsters a slight three-quarter looking left; heroes look/walk right. Every piece.
  for (const [id, c] of Object.entries(CLASSES)) {
    assert.ok(LOOK.has(c.look), `${id} look ${c.look}`);
    assert.ok(c.look === 'left' || c.look === 'right', `${id} hero look is left or right, not ${c.look}`);
    assert.equal(needsFlip(c, 'right'), c.look !== 'right', `${id} hero should look/walk right`);
  }
  for (const [id, m] of Object.entries(MONSTERS)) {
    assert.ok(LOOK.has(m.look), `${id} look ${m.look}`);
    assert.ok(Array.isArray(m.faces), `${id} faces is the attack list, not painted facing`);
    assert.equal(m.look, 'left', `${id} monster is posed looking left`);
    assert.equal(needsFlip(m, 'left'), false, `${id} already looks left — do not flip`);
  }
  assert.equal(needsFlip(CLASSES.knight, 'right'), true);
  assert.equal(needsFlip(CLASSES.ranger, 'right'), true);
  assert.equal(needsFlip(CLASSES.dwarf, 'right'), true);
  assert.equal(needsFlip(CLASSES.wizard, 'right'), false);
  assert.equal(needsFlip(CLASSES.bard, 'right'), false);
  assert.equal(needsFlip(MONSTERS.ogre, 'left'), false);
  assert.equal(needsFlip(MONSTERS.wraith, 'left'), false);
  assert.equal(needsFlip(MONSTERS.spider, 'left'), false);
  assert.equal(needsFlip(MONSTERS.vharaxis, 'left'), false);
});
