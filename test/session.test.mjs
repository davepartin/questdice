import test from 'node:test';
import assert from 'node:assert/strict';
import { createTable, joinTable, savePublic } from '../js/table.js';
import * as Sess from '../js/session.js';

// A view of the same table at a given move number (seq), as the table would send it.
function views() {
  const table = createTable({ code: 'SEQS', seed: 5, name: 'Order' });
  const you = joinTable(table, { name: 'Ada', cls: 'knight', token: 'tokaaaaaa' }).player;
  return (seq) => { table.seq = seq; return { code: 'SEQS', seq, state: savePublic(table), you: { id: you.id } }; };
}

test('while a round plays out, a late command answer never replaces a newer table that is waiting (12, 14, then 13)', () => {
  const at = views();
  Sess.open(at(12));
  Sess.hold();
  Sess.adopt(at(14));               // the live feed brings 14 while the screen holds
  Sess.adoptAnswer(at(13));         // then this phone's own command answer, 13, arrives late
  assert.equal(Sess.current().seq, 12, 'nothing is shown while holding');
  Sess.release();
  assert.equal(Sess.current().seq, 14, 'the newest table wins');
  Sess.adoptAnswer(at(13));
  assert.equal(Sess.current().seq, 14, 'an older answer never steps back');
  Sess.close();
});

test('an older live update never replaces a newer one that is waiting', () => {
  const at = views();
  Sess.open(at(3));
  Sess.hold(); Sess.adopt(at(6)); Sess.adopt(at(5)); Sess.release();
  assert.equal(Sess.current().seq, 6);
  Sess.close();
});
