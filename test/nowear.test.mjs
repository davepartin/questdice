// No wear (Dave, 25 Oct 2026): the released game never wears a weapon out. Its own file: applyRelease changes global rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';

test('no wear in the released game: fights count nothing against a weapon, nothing breaks, no label; a Diamond still says one fight (Dave, 25 Oct 2026)', async () => {
  const { applyRelease } = await import('../js/release.js'); const D = await import('../js/data.js'); const was = D.WEAR.off; applyRelease();
  try {
    const h = E.newHero({ name: 'Wearless', cls: 'knight', seed: 4 }); const w = E.makeWeapon('sword', 0, E.makeRng(3), 4); h.loadout.NW = w; w.left = 1;
    for (let i = 0; i < 12; i++) assert.deepEqual(E.wearHands(h), [], 'nothing breaks'); assert.equal(h.loadout.NW, w, 'the weapon is still in the hand after twelve fights'); assert.equal(w.left, 1, 'the counter is never touched or turned into Infinity');
    assert.equal(E.wearLabel(w), ''); assert.equal(E.wearLabel({ ...w, diamond: true }), 'one fight'); assert.equal(E.brokenLine(E.takeBroken(h)), '');
    D.WEAR.off = false; E.wearHands(h); assert.equal(h.loadout.NW.id, 'fists', 'the old rule still breaks it when switched back on');
  } finally { D.WEAR.off = was; }
});
