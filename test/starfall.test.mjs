import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGNS, actsOf, stepsOf, beatsOf, partySize, voiceOf } from '../js/campaigns.js';
import { ACTS, MONSTERS } from '../js/data.js';
import { beat, pending } from '../js/story.js';
import { ensureRoad, chooseRoad } from '../js/roads.js';
import * as E from '../js/engine.js';
import * as SO from '../js/secrets.js';

const pair = [{ name: 'WizKid', cls: 'wizard' }, { name: 'Smalls', cls: 'dwarf' }];
const at = (hero, act, step) => { Object.assign(hero.campaign, { act, step, wins: (act - 1) * 10 + step, road: null }); return hero; };

test('Pip Needs a Lift is a 1–6 any-hero pack with its own voice', () => {
  const p = CAMPAIGNS.starfall;
  assert.equal(p.title, 'Pip Needs a Lift');
  assert.equal(partySize(p), '1–6 heroes');
  assert.equal(p.startMode, 'scaled');
  assert.equal(p.cover.img, MONSTERS.visitor.img);
  assert.equal(voiceOf({ pack: 'starfall' }).name, 'Mother Hob');
  assert.equal(voiceOf({ pack: 'dawn' }).name, 'the Lantern');
});

test('every Pip fight is cast from real minis, matches the story steps, and walks the painted places', () => {
  const acts = actsOf('starfall'); const steps = stepsOf('starfall');
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
  assert.deepEqual(acts[0].fights[9], ['tuskwarlord']);
  assert.deepEqual(acts[1].fights[4], ['lampsnuffer']);
  assert.deepEqual(acts[2].fights[9], ['hivequeen']);
});

test('the quest board names the Pip cast and the story pages fill in hero names', () => {
  const hero = E.newHero({ name: 'WizKid', cls: 'wizard', seed: 5, pack: 'starfall' });
  for (const [act, step, name] of [[1, 2, 'Kindle'], [1, 5, 'Old Gravelhide'], [2, 10, 'The Night Courier'], [3, 10, 'The Glass-Hive Queen']]) {
    at(hero, act, step);
    const q = E.questsFor(hero)[0];
    assert.equal(q.foeNames[0], name, `${act}.${step}`);
  }
  const ids = Object.keys(beatsOf('starfall'));
  for (const kind of ['open', 'elite', 'boss', 'close']) for (const a of [1, 2, 3]) assert.ok(ids.includes(`${kind}:${a}`), `${kind}:${a}`);
  for (const id of ids) {
    const b = beat(id, Number(id.split(':')[1]), pair, { pack: 'starfall', seed: 11 });
    for (const t of [b.title, ...b.text]) assert.doesNotMatch(t, /\{|\}/, id);
  }
  for (let a = 1; a <= 3; a++) for (let s = 1; s <= 10; s++) for (const kind of ['arrive', 'win']) {
    const b = beat(`${kind}:${a}.${s}`, a, pair, { pack: 'starfall', seed: 11 });
    assert.ok(b, `${kind}:${a}.${s}`);
    for (const t of b.text) assert.doesNotMatch(t, /\{|\}/, `${kind}:${a}.${s}`);
  }
  assert.deepEqual(pending({ pack: 'starfall', act: 1, step: 1, storySeen: [] }), [{ id: 'open:1', act: 1 }]);
});

test('every quiet step on the road has Pip’s own moment, and it plays', () => {
  const hero = E.newHero({ name: 'WizKid', cls: 'wizard', seed: 5, pack: 'starfall' });
  const friend = E.newHero({ name: 'Smalls', cls: 'dwarf', seed: 6, pack: 'starfall' });
  const acts = actsOf('starfall'); let played = 0;
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

test('Mother Hob hands out the secret objectives in a Pip campaign', () => {
  const heroes = [E.newHero({ name: 'WizKid', cls: 'wizard', seed: 5, pack: 'starfall' }), E.newHero({ name: 'Smalls', cls: 'dwarf', seed: 6, pack: 'starfall' })];
  const env = SO.dealEnvelopes({ c: heroes[0].campaign, heroes, enemies: [] });
  assert.equal(env.voice, 'Mother Hob');
  assert.ok(CAMPAIGNS.starfall.voice.scenes.includes(env.scene));
});
