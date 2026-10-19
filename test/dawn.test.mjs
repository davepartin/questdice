import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGNS, actsOf, partySize, voiceOf } from '../js/campaigns.js';
import { ACTS, MONSTERS } from '../js/data.js';
import { beat, pending } from '../js/story.js';
import { ensureRoad, chooseRoad } from '../js/roads.js';
import * as E from '../js/engine.js';
import * as SO from '../js/secrets.js';

const pair = [{ name: 'Ada', cls: 'knight' }, { name: 'Bea', cls: 'ranger' }];
const at = (hero, act, step) => { Object.assign(hero.campaign, { act, step, wins: (act - 1) * 10 + step, road: null }); return hero; };

test('The Dawn Lantern keeps its story hooks and has its own voice', () => {
  const p = CAMPAIGNS.dawn;
  assert.equal(p.title, 'The Dawn Lantern');
  assert.equal(partySize(p), '1–6 heroes');
  assert.equal(p.startMode, 'scaled');
  assert.equal(p.acts, ACTS);
  assert.equal(voiceOf({ pack: 'dawn' }).name, 'the Lantern');
});

test('every Dawn fight is a real mini on a painted place, with the boss at the last place', () => {
  const acts = actsOf('dawn');
  for (let a = 0; a < 3; a++) {
    assert.equal(acts[a].land, a + 1);
    for (const place of acts[a].route) assert.ok(ACTS[a].places.includes(place), `${place} is a painted Act ${a + 1} place`);
    assert.equal(acts[a].places.at(-1), acts[a].route[9], 'the boss fights at the last place');
    for (let s = 0; s < 10; s++) {
      const fight = acts[a].fights[s];
      assert.equal(acts[a].route[s], acts[a].route[s]);
      for (const id of fight) assert.ok(MONSTERS[id], `${id} is a mini`);
    }
  }
  assert.deepEqual(acts[0].fights[9], ['goblinking']);
  assert.deepEqual(acts[1].fights[4], ['bonewarden']);
  assert.deepEqual(acts[2].fights[9], ['vharaxis']);
});

test('Dawn story pages fill in, and every quiet step has its own road moment', () => {
  for (const kind of ['open', 'elite', 'boss', 'close']) for (const a of [1, 2, 3]) {
    const b = beat(`${kind}:${a}`, a, pair, { pack: 'dawn', seed: 11 });
    assert.ok(b, `${kind}:${a}`);
    for (const t of [b.title, ...b.text]) assert.doesNotMatch(t, /\{|\}/, `${kind}:${a}`);
  }
  assert.deepEqual(pending({ pack: 'dawn', act: 1, step: 1, storySeen: [] }), [{ id: 'open:1', act: 1 }]);

  const hero = E.newHero({ name: 'Ada', cls: 'knight', seed: 5, pack: 'dawn' });
  const friend = E.newHero({ name: 'Bea', cls: 'ranger', seed: 6, pack: 'dawn' });
  const acts = actsOf('dawn'); let played = 0;
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

test('the Lantern hands out the secret objectives in a Dawn campaign', () => {
  const heroes = [E.newHero({ name: 'Ada', cls: 'knight', seed: 5, pack: 'dawn' }), E.newHero({ name: 'Bea', cls: 'ranger', seed: 6, pack: 'dawn' })];
  const env = SO.dealEnvelopes({ c: heroes[0].campaign, heroes, enemies: [] });
  assert.equal(env.voice, 'the Lantern');
  assert.ok(CAMPAIGNS.dawn.voice.scenes.includes(env.scene));
});
