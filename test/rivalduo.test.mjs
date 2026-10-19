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

test('Rival Duo is a two-hero pack with Madame Twill’s voice', () => {
  const p = CAMPAIGNS.rivalduo;
  assert.equal(p.title, 'Rival Duo');
  assert.equal(partySize(p), '2 heroes');
  assert.equal(p.startMode, 'fresh');
  assert.deepEqual(p.forcedClasses, ['wizard', 'dwarf']);
  assert.equal(voiceOf({ pack: 'rivalduo' }).name, 'Madame Twill');
});

test('every Rival Duo fight is cast from real minis, matches the story steps, and walks the painted places', () => {
  const acts = actsOf('rivalduo'); const steps = stepsOf('rivalduo');
  const ban = new Set(CAMPAIGNS.rivalduo.ban);
  for (let a = 0; a < 3; a++) {
    assert.equal(acts[a].land, a + 1);
    for (const place of acts[a].route) assert.ok(ACTS[a].places.includes(place), `${place} is a painted Act ${a + 1} place`);
    assert.equal(acts[a].places.at(-1), acts[a].route[9], 'the boss fights at the last place');
    for (let s = 0; s < 10; s++) {
      const row = steps[a][s]; const fight = acts[a].fights[s];
      assert.deepEqual(row.foes, fight, `${a + 1}.${s + 1} foes`);
      assert.deepEqual(row.names, acts[a].names[s], `${a + 1}.${s + 1} names`);
      assert.equal(row.place, acts[a].route[s], `${a + 1}.${s + 1} place`);
      for (const id of fight) {
        assert.ok(MONSTERS[id], `${id} is a mini`);
        assert.ok(!ban.has(id), `${id} is banned`);
      }
      assert.equal(row.names.length, fight.length, `${a + 1}.${s + 1} one name per foe`);
      assert.ok(row.arrive?.length && row.win?.length, `${a + 1}.${s + 1} has an arrival and a win`);
    }
  }
  assert.deepEqual(acts[0].fights[4], ['ogre']);
  assert.deepEqual(acts[1].fights[4], ['bigwheel']);
  assert.deepEqual(acts[2].fights[9], ['goldbelly']);
});

test('the quest board names the Rival Duo cast and the story pages fill in hero names', () => {
  const hero = E.newHero({ name: 'WizKid', cls: 'wizard', seed: 5, pack: 'rivalduo' });
  for (const [act, step, name] of [[1, 1, 'Crumb'], [1, 5, 'Big Norman'], [2, 5, 'Big Wheel'], [3, 10, 'Duchess Goldbelly']]) {
    at(hero, act, step);
    const q = E.questsFor(hero)[0];
    assert.equal(q.foeNames[0], name, `${act}.${step}`);
  }
  const ids = Object.keys(beatsOf('rivalduo'));
  for (const kind of ['open', 'elite', 'boss', 'close']) for (const a of [1, 2, 3]) assert.ok(ids.includes(`${kind}:${a}`), `${kind}:${a}`);
  for (const id of ids) {
    const b = beat(id, Number(id.split(':')[1]), pair, { pack: 'rivalduo', seed: 11 });
    for (const t of [b.title, ...b.text]) assert.doesNotMatch(t, /\{|\}/, id);
  }
  for (let a = 1; a <= 3; a++) for (let s = 1; s <= 10; s++) for (const kind of ['arrive', 'win']) {
    const b = beat(`${kind}:${a}.${s}`, a, pair, { pack: 'rivalduo', seed: 11 });
    assert.ok(b, `${kind}:${a}.${s}`);
    for (const t of b.text) assert.doesNotMatch(t, /\{|\}/, `${kind}:${a}.${s}`);
  }
  assert.deepEqual(pending({ pack: 'rivalduo', act: 1, step: 1, storySeen: [] }), [{ id: 'open:1', act: 1 }]);
});

test('every quiet step on the road has Rival Duo’s own moment, and it plays', () => {
  const hero = E.newHero({ name: 'WizKid', cls: 'wizard', seed: 5, pack: 'rivalduo' });
  const friend = E.newHero({ name: 'Smalls', cls: 'dwarf', seed: 6, pack: 'rivalduo' });
  const acts = actsOf('rivalduo'); let played = 0;
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

test('Madame Twill hands out the secret objectives in a Rival Duo campaign', () => {
  const heroes = [E.newHero({ name: 'WizKid', cls: 'wizard', seed: 5, pack: 'rivalduo' }), E.newHero({ name: 'Smalls', cls: 'dwarf', seed: 6, pack: 'rivalduo' })];
  const env = SO.dealEnvelopes({ c: heroes[0].campaign, heroes, enemies: [] });
  assert.equal(env.voice, 'Madame Twill');
  assert.ok(CAMPAIGNS.rivalduo.voice.scenes.includes(env.scene));
});
