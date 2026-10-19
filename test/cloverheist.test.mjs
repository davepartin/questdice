import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGNS, actsOf, stepsOf, beatsOf, partySize, voiceOf } from '../js/campaigns.js';
import { ACTS, MONSTERS } from '../js/data.js';
import { beat, pending } from '../js/story.js';
import { ensureRoad, chooseRoad } from '../js/roads.js';
import * as E from '../js/engine.js';
import * as SO from '../js/secrets.js';

const pair = [{ name: 'Ada', cls: 'knight' }, { name: 'Bea', cls: 'ranger' }];
const at = (hero, act, step) => { Object.assign(hero.campaign, { act, step, wins: (act - 1) * 10 + step, road: null }); return hero; };

test('The Clover Heist is a 1–6 any-hero pack with Sir Reginald’s voice', () => {
  const p = CAMPAIGNS.cloverheist;
  assert.equal(p.title, 'The Clover Heist');
  assert.equal(partySize(p), '1–6 heroes');
  assert.equal(p.startMode, 'scaled');
  assert.equal(p.cover.img, MONSTERS.magpieking.img);
  assert.equal(voiceOf({ pack: 'cloverheist' }).name, 'Sir Reginald Brush');
});

test('every Clover Heist fight is cast from real minis, matches the story steps, and walks the painted places', () => {
  const acts = actsOf('cloverheist'); const steps = stepsOf('cloverheist');
  for (let a = 0; a < 3; a++) {
    assert.equal(acts[a].land, a + 1);
    for (const place of acts[a].route) assert.ok(ACTS[a].places.includes(place), `${place} is a painted Act ${a + 1} place`);
    assert.equal(acts[a].places.at(-1), acts[a].route[9], 'the boss fights at the last place');
    for (let s = 0; s < 10; s++) {
      const row = steps[a][s]; const fight = acts[a].fights[s];
      assert.deepEqual(row.foes, fight, `${a + 1}.${s + 1} foes`);
      assert.deepEqual(row.names, acts[a].names[s], `${a + 1}.${s + 1} names`);
      assert.equal(row.place, acts[a].route[s], `${a + 1}.${s + 1} place`);
      for (const id of fight) assert.ok(MONSTERS[id], `${id} is a mini`);
      assert.equal(row.names.length, fight.length, `${a + 1}.${s + 1} one name per foe`);
      assert.ok(row.arrive?.length && row.win?.length, `${a + 1}.${s + 1} has an arrival and a win`);
    }
  }
  assert.deepEqual(acts[0].fights[4], ['ogre']);
  assert.deepEqual(acts[1].fights[9], ['silkwood']);
  assert.deepEqual(acts[2].fights[9], ['magpieking']);
});

test('the quest board names the Heist cast and the story pages fill in hero names', () => {
  const hero = E.newHero({ name: 'Ada', cls: 'knight', seed: 5, pack: 'cloverheist' });
  for (const [act, step, name] of [[1, 4, 'Sir Reginald Brush'], [1, 5, 'Baron Grumbletusk'], [2, 10, 'Madam Silkwood'], [3, 10, 'The Magpie King']]) {
    at(hero, act, step);
    const q = E.questsFor(hero)[0];
    assert.equal(q.foeNames[0], name, `${act}.${step}`);
  }
  const ids = Object.keys(beatsOf('cloverheist'));
  for (const kind of ['open', 'elite', 'boss', 'close']) for (const a of [1, 2, 3]) assert.ok(ids.includes(`${kind}:${a}`), `${kind}:${a}`);
  for (const id of ids) {
    const b = beat(id, Number(id.split(':')[1]), pair, { pack: 'cloverheist', seed: 11 });
    for (const t of [b.title, ...b.text]) assert.doesNotMatch(t, /\{|\}/, id);
  }
  for (let a = 1; a <= 3; a++) for (let s = 1; s <= 10; s++) for (const kind of ['arrive', 'win']) {
    const b = beat(`${kind}:${a}.${s}`, a, pair, { pack: 'cloverheist', seed: 11 });
    assert.ok(b, `${kind}:${a}.${s}`);
    for (const t of b.text) assert.doesNotMatch(t, /\{|\}/, `${kind}:${a}.${s}`);
  }
  assert.deepEqual(pending({ pack: 'cloverheist', act: 1, step: 1, storySeen: [] }), [{ id: 'open:1', act: 1 }]);
});

test('every quiet step on the road has the Heist’s own moment, and it plays', () => {
  const hero = E.newHero({ name: 'Ada', cls: 'knight', seed: 5, pack: 'cloverheist' });
  const friend = E.newHero({ name: 'Bea', cls: 'ranger', seed: 6, pack: 'cloverheist' });
  const acts = actsOf('cloverheist'); let played = 0;
  for (let a = 1; a <= 3; a++) for (let s = 1; s <= 10; s++) {
    const own = acts[a - 1].moments[s - 1];
    const quiet = ![3, 5, 8, 10].includes(s) && !(a === 1 && s === 1);
    assert.equal(!!own, quiet, `${a}.${s} has a moment exactly when the step is quiet`);
    if (!own) continue;
    at(hero, a, s); friend.campaign = hero.campaign;
    const ev = ensureRoad(hero, [hero, friend]);
    assert.equal(ev.title, own.title, `${a}.${s}`);
    assert.equal(ev.stat, own.stat);
    assert.doesNotMatch(ev.tell, /\{|\}/);
    const res = chooseRoad(hero, [hero, friend], ev.choices[0].id);
    assert.ok(res, `${a}.${s} rolls`);
    assert.doesNotMatch(res.text, /\{|\}|undefined/, `${a}.${s}`);
    played++;
  }
  assert.equal(played, 17);
});

test('Sir Reginald Brush hands out the secret objectives in a Heist campaign', () => {
  const heroes = [E.newHero({ name: 'Ada', cls: 'knight', seed: 5, pack: 'cloverheist' }), E.newHero({ name: 'Bea', cls: 'ranger', seed: 6, pack: 'cloverheist' })];
  const env = SO.dealEnvelopes({ c: heroes[0].campaign, heroes, enemies: [] });
  assert.equal(env.voice, 'Sir Reginald Brush');
  assert.ok(CAMPAIGNS.cloverheist.voice.scenes.includes(env.scene));
});
