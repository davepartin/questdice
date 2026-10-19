import test from 'node:test';
import assert from 'node:assert/strict';
import { newHero, questsFor, WANDER, wanderRoster, mayWander } from '../js/engine.js';
import { MONSTERS, ACTS, landsOf, LANDS } from '../js/data.js';
import { CAMPAIGNS, actsOf, bansOf } from '../js/campaigns.js';

function heroAt({ pack = 'dawn', act = 1, step = 2, seed = 11, wins = 1 } = {}) {
  const h = newHero({ name: 'Ada', cls: 'knight', seed, pack });
  h.campaign.act = act;
  h.campaign.step = step;
  h.campaign.wins = wins;
  h.campaign.seed = seed;
  return h;
}

function wanderersAcross({ pack, act, steps, seeds }) {
  const seen = [];
  for (const seed of seeds) {
    for (const step of steps) {
      const h = heroAt({ pack, act, step, seed });
      const q = questsFor(h)[0];
      if (q.wanderer) seen.push({ seed, step, id: q.wanderer, enemies: q.enemies });
    }
  }
  return seen;
}

test('every monster names a land the packs use', () => {
  const known = new Set(Object.keys(LANDS).map(Number));
  const ids = Object.keys(MONSTERS);
  assert.equal(ids.length, 50);
  for (const id of ids) {
    const lands = landsOf(MONSTERS[id]);
    assert.ok(lands.length, `${id} needs a land tag`);
    for (const land of lands) assert.ok(known.has(land), `${id} land ${land}`);
  }
  assert.deepEqual(ACTS.map((a) => a.land), [1, 2, 3]);
  assert.equal(actsOf('rivalduo')[0].land, 1);
  assert.equal(actsOf('ballad')[1].land, 2);
  assert.equal(actsOf('cloverheist')[2].land, 3);
});

test('wanderers respect each pack’s ban list', () => {
  assert.ok(WANDER.chance > 0);
  for (const pack of ['rivalduo', 'ballad']) {
    const ban = bansOf(pack);
    assert.ok(ban.length, pack);
    const seen = wanderersAcross({
      pack, act: 1, steps: [2, 3, 4, 6, 8, 9],
      seeds: Array.from({ length: 40 }, (_, i) => (i + 1) * 17),
    });
    const ids = new Set(seen.map((x) => x.id));
    assert.ok(ids.size, `${pack} still gets wanderers`);
    for (const id of ban) {
      assert.ok(!ids.has(id), `${pack} wanderer ${id} is banned`);
      const h = heroAt({ pack, act: 2, step: 2, seed: 3 });
      assert.ok(!wanderRoster(h.campaign, actsOf(pack)[1]).includes(id), `${pack} act 2 roster ${id}`);
    }
  }
  const rival = new Set(wanderersAcross({
    pack: 'rivalduo', act: 2, steps: [2, 3, 4, 6, 8, 9],
    seeds: Array.from({ length: 30 }, (_, i) => (i + 1) * 23),
  }).map((x) => x.id));
  const ballad = new Set(wanderersAcross({
    pack: 'ballad', act: 1, steps: [2, 3, 4, 6, 8, 9],
    seeds: Array.from({ length: 30 }, (_, i) => (i + 1) * 29),
  }).map((x) => x.id));
  assert.ok(!rival.has('cultist'), 'Ember Mage stays out of Rival Duo');
  assert.ok(!ballad.has('dirgesinger'), 'Dirge Singer stays out of the Ballad');
  assert.ok(!ballad.has('shieldbearer'), 'Shieldbearer stays out of the Ballad');
});

test('wanderers prefer the current story land, and fall back when none match', () => {
  const marches = actsOf('dawn')[0];
  const crypt = actsOf('dawn')[1];
  const h1 = heroAt({ act: 1, step: 2, seed: 4 });
  const preferred = wanderRoster(h1.campaign, marches).filter((id) => landsOf(MONSTERS[id]).includes(1));
  assert.ok(preferred.length, 'Marches has a non-home wanderer');
  assert.deepEqual(preferred, ['magpies']);
  const marchesHits = wanderersAcross({
    pack: 'dawn', act: 1, steps: [2, 3, 4, 6],
    seeds: Array.from({ length: 40 }, (_, i) => (i + 1) * 7),
  });
  assert.ok(marchesHits.length, 'Act I still rolls wanderers');
  for (const hit of marchesHits) assert.equal(hit.id, 'magpies', `act I seed ${hit.seed} step ${hit.step}`);
  const h2 = heroAt({ act: 2, step: 2, seed: 4 });
  const cryptHome = wanderRoster(h2.campaign, crypt).filter((id) => landsOf(MONSTERS[id]).includes(2));
  assert.equal(cryptHome.length, 0, 'Crypt minions are already home, so the land filter is empty');
  const fallback = new Set(wanderersAcross({
    pack: 'dawn', act: 2, steps: [2, 3, 4, 6, 8, 9],
    seeds: Array.from({ length: 25 }, (_, i) => (i + 1) * 13),
  }).map((x) => x.id));
  assert.ok(fallback.has('goblin') || fallback.has('magpies') || fallback.has('wolf'), `fallback still uses the wider roster: ${[...fallback]}`);
  assert.ok([...fallback].some((id) => !landsOf(MONSTERS[id]).includes(2)), 'fallback is not stuck on Crypt tags');
});

test('a wanderer is not reused on the next fight when another choice exists', () => {
  const steps = [6, 7, 8, 9]; // Crypt fights of two in a row; Crypt minions are already home, so the land filter falls back
  let repeats = 0;
  let compared = 0;
  const distinct = new Set();
  for (let seed = 1; seed <= 50; seed++) {
    const ids = steps.map((step) => questsFor(heroAt({ act: 2, step, seed }))[0].wanderer);
    for (const id of ids) if (id) distinct.add(id);
    for (let i = 1; i < ids.length; i++) {
      if (!ids[i] || !ids[i - 1]) continue;
      compared++;
      if (ids[i] === ids[i - 1]) repeats++;
    }
  }
  assert.ok(distinct.size >= 3, `wide Crypt fallback: ${[...distinct]}`);
  assert.ok(compared >= 5, `enough consecutive wanderer pairs to check (${compared})`);
  assert.equal(repeats, 0, `no back-to-back wanderer when another choice exists (${compared} pairs)`);
});

test('story-only minions set wander: false and never join as wanderers', () => {
  assert.equal(MONSTERS.foxrogue.wander, false);
  assert.equal(MONSTERS.puffball.wander, false);
  assert.equal(MONSTERS.moonjelly.wander, false);
  assert.equal(mayWander('foxrogue'), false);
  assert.equal(mayWander('puffball'), false);
  assert.equal(mayWander('moonjelly'), false);
  assert.equal(mayWander('goblin'), true);
  const seen = wanderersAcross({
    pack: 'dawn', act: 1, steps: [2, 3, 4, 6, 8, 9],
    seeds: Array.from({ length: 40 }, (_, i) => i + 1),
  });
  assert.ok(seen.length);
  assert.ok(!seen.some((x) => x.id === 'foxrogue'));
  const h = heroAt({ pack: 'cloverheist', act: 1, step: 2, seed: 8 });
  assert.ok(!wanderRoster(h.campaign, actsOf('cloverheist')[0]).includes('foxrogue'));
  assert.ok(!Object.values(CAMPAIGNS).some((p) => (p.ban || []).includes('foxrogue')), 'the flag lives on the sheet, not a pack ban');
});
