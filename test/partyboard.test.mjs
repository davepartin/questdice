import test from 'node:test';
import assert from 'node:assert/strict';
import { replayPace, stanceOf, WAIT_SCALE } from '../js/g3/flat.js';

test('waiting minis are half size', () => {
  assert.equal(WAIT_SCALE, 0.5);
});

test('replayPace: a typical party round lands in 15–19 seconds', () => {
  for (const n of [2, 3, 5, 7, 10]) {
    const p = replayPace(n);
    const total = p.intro + p.close + n * p.beat;
    assert.ok(total >= 15 && total <= 20, `n=${n} total=${total}`);
  }
});

test('replayPace: reduced motion is short and still ordered', () => {
  const p = replayPace(6, { reduced: true });
  assert.ok(p.intro + p.close + 6 * (0.85 + p.gap) < 8);
  assert.ok(p.gap > 0);
});

test('stanceOf: unlocked heroes wait; locked heroes pair to their target', () => {
  const enemies = [{ uid: 'g1', hp: 8 }, { uid: 'w1', hp: 10 }];
  const fighters = [
    { hero: { name: 'Ada' }, locked: false, target: 0, hp: 20, skipped: false },
    { hero: { name: 'Bea' }, locked: true, target: 1, hp: 18, skipped: false },
    { hero: { name: 'Cy' }, locked: true, target: 0, hp: 0, skipped: true },
  ];
  const rows = stanceOf(fighters, enemies);
  assert.equal(rows[0].locked, false);
  assert.equal(rows[0].uid, null);
  assert.equal(rows[1].locked, true);
  assert.equal(rows[1].uid, 'w1');
  assert.equal(rows[2].locked, false, 'skipped heroes stay in the wait zone');
});

test('stanceOf: a round report pairs every striker, even after locked is cleared', () => {
  const enemies = [{ uid: 'og', hp: 4 }];
  const fighters = [
    { hero: { name: 'Ada' }, locked: false, target: 0, hp: 12, skipped: false },
    { hero: { name: 'Bea' }, locked: false, target: 0, hp: 12, skipped: false },
  ];
  const rows = stanceOf(fighters, enemies, { strikes: [{ name: 'Bea', targetUid: 'og' }, { name: 'Ada', targetUid: 'og' }] });
  assert.deepEqual(rows.map((r) => [r.name, r.locked, r.uid]), [['Ada', true, 'og'], ['Bea', true, 'og']]);
});

test('stanceOf does not invent letter labels', () => {
  const rows = stanceOf(
    [{ hero: { name: 'Ada' }, locked: true, target: 0, hp: 10, skipped: false }],
    [{ uid: 'g1', hp: 5 }],
  );
  assert.equal(rows[0].letter, undefined);
  assert.equal(JSON.stringify(rows).includes('"A"'), false);
});
