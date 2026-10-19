import test from 'node:test';
import assert from 'node:assert/strict';
import { newHero } from '../js/engine.js';
import { roadIsOpen, ensureRoad, chooseRoad, roadSlot, ROADS } from '../js/roads.js';

const at = (hero, act, step, wins) => { Object.assign(hero.campaign, { act, step, wins, road: null }); return hero; };

test('encounters come every other camp: a choice before fight 3, a test before the elite, the Call for Help, the night before the boss', () => {
  const h = newHero({ name: 'T', cls: 'knight', seed: 2 });
  const open = [];
  for (let step = 2; step <= 10; step++) { at(h, 1, step, step - 1); if (roadIsOpen(h)) open.push(step); }
  assert.deepEqual(open, [3, 5, 8, 10]);
  at(h, 1, 3, 2); assert.equal(ROADS.find((e) => e.id === ensureRoad(h, [h]).id).when, 'road');
  at(h, 1, 5, 4); assert.ok(ensureRoad(h, [h]).stat, 'a dice test before the elite');
  at(h, 1, 10, 9); assert.equal(ROADS.find((e) => e.id === ensureRoad(h, [h]).id).when, 'boss');
  assert.ok(roadSlot({ act: 1, step: 3 }) && !roadSlot({ act: 1, step: 4 }) && roadSlot({ act: 1, step: 8 }));
});

test('step 8 is always the Call for Help, and the choice sets the next fight', () => {
  const h = newHero({ name: 'T', cls: 'knight', seed: 2 });
  at(h, 1, 8, 7);
  const ev = ensureRoad(h, [h]);
  assert.equal(ev.id, 'help');
  const res = chooseRoad(h, [h], 'save-a');
  assert.ok(res.text.includes('Cinder Ford'));
  assert.equal(h.campaign.nextPlace, 'Cinder Ford');
  assert.ok(h.campaign.nextEnemies?.includes('cinderling'));
});

test('duo packs skip Call for Help so the locked step-8 fight stays', () => {
  const h = newHero({ name: 'Ada', cls: 'wizard', seed: 2, pack: 'rivalduo' });
  at(h, 1, 8, 7);
  const ev = ensureRoad(h, [h]);
  assert.notEqual(ev.id, 'help');
});

test('the very first fight still opens with the Nine-Stone Gate', () => {
  const h = newHero({ name: 'T', cls: 'knight', seed: 2 });
  assert.equal(roadIsOpen(h), true); assert.equal(ensureRoad(h, [h]).id, 'gate');
});

test('the traveller is gone from the road: no road event interrupts with a sale', () => {
  assert.equal(ROADS.some((e) => e.id === 'traveller'), false);
  for (let seed = 1; seed <= 30; seed++) {
    const h = newHero({ name: 'T', cls: 'knight', seed });
    for (const step of [3, 5, 8, 10]) { at(h, 1, step, step - 1); assert.notEqual(ensureRoad(h, [h]).id, 'traveller'); }
  }
});

test('every encounter tells a short scene, names a hero or the company, and every choice says what it does', () => {
  const members = [newHero({ name: 'WizKid', cls: 'wizard', seed: 1 }), newHero({ name: 'Smalls', cls: 'dwarf', seed: 2 })];
  const ctx = { campaign: members[0].campaign, members, act: 1 };
  for (const e of ROADS.filter((x) => x.when === 'road' || x.when === 'boss' || x.when === 'trial')) {
    const tell = e.tell(ctx);
    assert.ok(tell.split(/\s+/).length <= 60, `${e.id} is short (${tell.split(/\s+/).length} words)`);
    assert.doesNotMatch(tell, /traveller|traveler|Lantern|ash road/i, `${e.id} fits any story`);
    for (const ch of e.choices) assert.ok(ch.hint(ctx).length > 3, `${e.id}/${ch.id} has a hint`);
  }
});
