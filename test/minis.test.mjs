import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CLASSES, MONSTERS, LOOK, needsFlip, HERO_LOOKS } from '../js/data.js';

test('every painted class and monster has a base disc in the image', () => {
  const check = (id, d) => {
    assert.ok(d.img, `${id} img`);
    assert.ok(fs.existsSync(d.img), `${id} file ${d.img}`);
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
  for (const id of ['knight', 'ranger', 'dwarf', 'wizard', 'bard']) assert.equal(needsFlip(CLASSES[id], 'right'), false, `${id} is painted facing right (Oct 2026 paintings): never mirrored`);
  assert.equal(needsFlip(MONSTERS.ogre, 'left'), false);
  assert.equal(needsFlip(MONSTERS.wraith, 'left'), false);
  assert.equal(needsFlip(MONSTERS.spider, 'left'), false);
  assert.equal(needsFlip(MONSTERS.vharaxis, 'left'), false);
  assert.equal(MONSTERS.bigwheel.look, 'left');
  assert.equal(MONSTERS.mungo.look, 'left');
  assert.equal(needsFlip(MONSTERS.bigwheel, 'left'), false, 'bigwheel already looks left — do not flip');
  assert.equal(needsFlip(MONSTERS.mungo, 'left'), false, 'mungo already looks left — do not flip');
  assert.equal(needsFlip(MONSTERS.goldbelly, 'left'), false, 'goldbelly already looks left — do not flip');
  assert.equal(needsFlip(MONSTERS.blazemorrow, 'left'), false, 'blazemorrow already looks left — do not flip');
  assert.equal(needsFlip(MONSTERS.bigwheel, 'right'), true);
  assert.equal(needsFlip(MONSTERS.mungo, 'right'), true);
  assert.equal(needsFlip(MONSTERS.goldbelly, 'right'), true);
  assert.equal(needsFlip(MONSTERS.blazemorrow, 'right'), true);
});

test('each class has three painted coats, all facing right, and the files are there', () => {
  for (const [cls, looks] of Object.entries(HERO_LOOKS)) {
    assert.equal(looks.length, 3, cls);
    assert.equal(looks[0].img, CLASSES[cls].img);
    assert.equal(looks[0].look, CLASSES[cls].look);
    for (const l of looks) {
      assert.ok(fs.existsSync(l.img), l.img);
      assert.ok(LOOK.has(l.look), `${cls} ${l.id} look`);
      const b = l.imgBase;
      assert.ok(b.x > 0.34 && b.x < 0.7, `${cls} ${l.id} base x ${b.x}`);
      assert.ok(b.y > 0.97 && b.y <= 1, `${cls} ${l.id} base y ${b.y}`);
      assert.ok(b.w > 0.55 && b.w < 1, `${cls} ${l.id} base w ${b.w}`);
    }
    for (const l of looks.slice(1)) {
      assert.equal(l.look, 'right', `${cls} ${l.id}`);
      assert.equal(needsFlip(l, 'right'), false, `${cls} ${l.id} needs no battle flip`);
    }
  }
});
