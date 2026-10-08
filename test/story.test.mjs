import test from 'node:test';
import assert from 'node:assert/strict';
import { pending, markSeen, beat, beatId, storySoFar } from '../js/story.js';

const camp = (act, step, seenList = []) => ({ act, step, storySeen: seenList });

test('the prologue shows at the very start, once', () => {
  const c = camp(1, 1);
  assert.deepEqual(pending(c), [{ id: 'open:1', act: 1 }]);
  markSeen(c, 'open:1', 1);
  assert.deepEqual(pending(c), []);
  assert.equal(beat('open:1', 1).title, 'The Night the Light Went Out');
});

test('a beat before the elite (quest 5) and the boss (quest 10); nothing in between', () => {
  assert.deepEqual(pending(camp(1, 5)).map((x) => x.id), ['elite:1']);
  assert.deepEqual(pending(camp(1, 10)).map((x) => x.id), ['boss:1']);
  for (const s of [2, 3, 4, 6, 7, 8, 9]) assert.deepEqual(pending(camp(1, s)), []);
});

test('a new act opens with the last act\'s closing, then its own opening', () => {
  assert.deepEqual(pending(camp(2, 1)).map((x) => x.id), ['close:1', 'open:2']);
  const c = camp(2, 1); markSeen(c, 'close:1', 1);
  assert.deepEqual(pending(c).map((x) => x.id), ['open:2']);
});

test('the Ascents (act 3 on) get their own openings, boss lines and a short closing; no elite beat', () => {
  assert.deepEqual(pending(camp(3, 1)).map((x) => x.id), ['close:2', 'open:ascent:1']);
  assert.deepEqual(pending(camp(4, 1)).map((x) => x.id), ['close:ascent', 'open:ascent:2']);
  assert.equal(beatId('elite', 3), null);
  assert.equal(beat('open:ascent:1', 3).kicker, 'Ascent 2 · Act I');
  assert.equal(beat('open:ascent:2', 6).kicker, 'Ascent 3 · Act II');
  // seen is per act: the same Ascent opening shows again on the next Ascent
  const c = camp(5, 1, ['close:ascent@4', 'open:ascent:1@3']);
  assert.deepEqual(pending(c).map((x) => x.id), ['open:ascent:1']);
});

test('the story so far lists every beat up to here, in order', () => {
  assert.deepEqual(storySoFar(camp(1, 3)).map((b) => b.id), ['open:1']);
  assert.deepEqual(storySoFar(camp(1, 10)).map((b) => b.id), ['open:1', 'elite:1', 'boss:1']);
  assert.deepEqual(storySoFar(camp(2, 6)).map((b) => b.id), ['open:1', 'elite:1', 'boss:1', 'close:1', 'open:2', 'elite:2']);
  for (const b of storySoFar(camp(3, 10))) assert.ok(b.title && b.text.length && b.kicker, b.id);
});
