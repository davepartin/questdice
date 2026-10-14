import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSES, MONSTERS, LOOK, paintedLook, needsFlip } from '../js/data.js';

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
  const toward = (def, want) => {
    const look = paintedLook(def);
    if (look === 'front') return !needsFlip(def, want);
    return needsFlip(def, want) === (look !== want);
  };
  for (const [id, c] of Object.entries(CLASSES)) {
    assert.ok(LOOK.has(c.look), `${id} look ${c.look}`);
    assert.equal(typeof c.look, 'string', `${id} look is not the attack list`);
    assert.ok(toward(c, 'right'), `${id} hero should look right toward the monsters`);
    if (c.look === 'front') assert.equal(needsFlip(c, 'right'), false, `${id} front is not mirrored`);
    else assert.equal(needsFlip(c, 'right'), c.look !== 'right', `${id} flip`);
  }
  for (const [id, m] of Object.entries(MONSTERS)) {
    assert.ok(LOOK.has(m.look), `${id} look ${m.look}`);
    assert.ok(Array.isArray(m.faces), `${id} faces is the attack list, not painted facing`);
    assert.ok(toward(m, 'left'), `${id} monster should look left toward the heroes`);
    if (m.look === 'front') assert.equal(needsFlip(m, 'left'), false, `${id} front is not mirrored`);
    else assert.equal(needsFlip(m, 'left'), m.look !== 'left', `${id} flip`);
  }
  // Dave's Toll Bridge target: ogre already looks left at the archer — do not flip it.
  // Heroes that were painted looking left (knight, ranger, dwarf) flip so they look/walk right.
  assert.equal(MONSTERS.ogre.look, 'left');
  assert.equal(needsFlip(MONSTERS.ogre, 'left'), false);
  assert.equal(needsFlip(CLASSES.knight, 'right'), true);
  assert.equal(needsFlip(CLASSES.ranger, 'right'), true);
  assert.equal(needsFlip(CLASSES.dwarf, 'right'), true);
  assert.equal(needsFlip(CLASSES.wizard, 'right'), false);
  assert.equal(needsFlip(CLASSES.bard, 'right'), false);
  assert.equal(needsFlip(MONSTERS.wolf, 'left'), false);
  assert.equal(needsFlip(MONSTERS.ashwyrm, 'left'), false);
  for (const [id, m] of Object.entries(MONSTERS)) {
    assert.notEqual(m.look, 'right', `${id} is not painted looking right; flipping would turn it away from the heroes`);
  }
});
