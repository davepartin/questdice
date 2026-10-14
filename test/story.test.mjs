import test from 'node:test';
import assert from 'node:assert/strict';
import { pending, pendingVictory, markSeen, beat, beatId, storySoFar, placeBeat, applyPlaceVictory, placeOf, HELP_FIGHTS } from '../js/story.js';
import { ACTS, MONSTERS } from '../js/data.js';

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

test('Act III has its own opening, elite, boss and closing; Ascents start at act 4', () => {
  assert.deepEqual(pending(camp(3, 1)).map((x) => x.id), ['close:2', 'open:3']);
  assert.deepEqual(pending(camp(3, 5)).map((x) => x.id), ['elite:3']);
  assert.deepEqual(pending(camp(3, 10)).map((x) => x.id), ['boss:3']);
  assert.equal(beat('open:3', 3).title, 'The Ember Peaks');
  assert.equal(beat('close:3', 3).title, 'A Keeper for the Light');
  assert.deepEqual(pending(camp(4, 1)).map((x) => x.id), ['close:3', 'open:ascent:1']);
  assert.equal(beatId('elite', 4), null);
  assert.equal(beat('open:ascent:1', 4).kicker, 'Ascent 2 · Act I');
  assert.equal(beat('open:ascent:3', 6).kicker, 'Ascent 2 · Act III');
  const c = camp(7, 1, ['close:ascent@6', 'open:ascent:1@4']);
  assert.deepEqual(pending(c).map((x) => x.id), ['open:ascent:1']);
});

test('the story so far lists every beat up to here, in order', () => {
  assert.deepEqual(storySoFar(camp(1, 3)).map((b) => b.id), ['open:1']);
  assert.deepEqual(storySoFar(camp(1, 10)).map((b) => b.id), ['open:1', 'elite:1', 'boss:1']);
  assert.deepEqual(storySoFar(camp(2, 6)).map((b) => b.id), ['open:1', 'elite:1', 'boss:1', 'close:1', 'open:2', 'elite:2']);
  assert.deepEqual(storySoFar(camp(3, 10)).map((b) => b.id), ['open:1', 'elite:1', 'boss:1', 'close:1', 'open:2', 'elite:2', 'boss:2', 'close:2', 'open:3', 'elite:3', 'boss:3']);
  for (const b of storySoFar(camp(3, 10))) assert.ok(b.title && b.text.length && b.kicker, b.id);
});

test('every painted place has an arrival and a victory beat', () => {
  for (const name of ACTS.flatMap((a) => a.places)) {
    const arrive = placeBeat('arrive', name);
    const win = placeBeat('win', name);
    assert.ok(arrive?.text?.length, `${name} arrival`);
    assert.ok(win?.text?.length, `${name} victory`);
  }
  const help = pending({ act: 1, step: 8, nextPlace: 'Cinder Ford', storySeen: [] }, 'Cinder Ford');
  assert.equal(help[0]?.id, 'help-arrive:cinder-ford');
  assert.equal(pendingVictory({ act: 3, step: 7, storySeen: [] }, 'Oathbreak Keep').id, 'win:oathbreak-keep');
  assert.ok(HELP_FIGHTS['Wyrmwatch']?.length);
  const c = { act: 3, step: 7, blessings: [] };
  applyPlaceVictory(c, 'Oathbreak Keep');
  assert.equal(c.blessings[0].id, 'keepers-oath');
  assert.equal(c.blessings[0].breathBlock, 3);
});

// Words the arrive/win copy may use instead of the monster's full sheet name.
const FOE_WORDS = {
  goblin: ['goblin'],
  wolf: ['wolf', 'wolves'],
  cultist: ['ember mage', 'mages'],
  ogre: ['ogre', 'toll-keeper'],
  goblinking: ['goblin king'],
  skeleton: ['bone soldier', 'bones'],
  wraith: ['wraith'],
  spider: ['spider'],
  bonewarden: ['bone warden', 'warden'],
  lich: ['hollow lich', 'lich'],
  shieldbearer: ['shieldbearer'],
  gloomstalker: ['gloom stalker'],
  chainbinder: ['jailer', 'gold-chain'],
  dirgesinger: ['dirge singer', 'dirge'],
  ironwarden: ['ironclad'],
  fallenchampion: ['fallen champion', 'sir aldren'],
  cinderling: ['cinderling', 'little dragon'],
  frostwhelp: ['frostwhelp', 'whelp'],
  ashwyrm: ['ashmaw', 'wyrm'],
  vharaxis: ['vharaxis', 'ember queen'],
};
const sameFoes = (a, b) => {
  const left = [...(a || [])].sort();
  const right = [...(b || [])].sort();
  return left.length === right.length && left.every((id, i) => id === right[i]);
};
const namesFoe = (text, id) => {
  const blob = String(text || '').toLowerCase();
  const m = MONSTERS[id];
  const words = [m?.name?.toLowerCase(), ...(FOE_WORDS[id] || [])].filter(Boolean);
  return words.some((w) => blob.includes(w));
};

test('each place tags the foes the locked fight actually sends, and the copy names them', () => {
  for (const act of ACTS) {
    assert.equal(act.fights?.length, 10, `${act.name} locks ten steps`);
    for (let s = 1; s <= 10; s++) {
      const place = act.route[s - 1];
      const p = placeOf(place);
      const locked = act.fights[s - 1];
      assert.ok(p, `${place} has a place entry`);
      assert.ok(p.foes?.length, `${place} has a foes tag`);
      assert.ok(sameFoes(p.foes, locked), `${act.name} step ${s} ${place}: foes [${p.foes}] != fight [${locked}]`);
      const text = [...(p.arrive || []), ...(p.win || [])].join('\n');
      for (const id of new Set(locked)) {
        assert.ok(MONSTERS[id], `${place}: unknown foe ${id}`);
        assert.ok(namesFoe(text, id), `${place} arrive/win does not name ${id}`);
      }
    }
  }
  for (const [place, foes] of Object.entries(HELP_FIGHTS)) {
    const p = placeOf(place);
    assert.ok(sameFoes(p.helpFoes, foes), `${place} helpFoes [${p.helpFoes}] != HELP_FIGHTS [${foes}]`);
    const text = [...(p.helpArrive || []), ...(p.helpWin || [])].join('\n');
    for (const id of new Set(foes)) {
      assert.ok(namesFoe(text, id), `${place} help copy does not name ${id}`);
    }
  }
});
