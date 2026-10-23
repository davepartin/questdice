import test from 'node:test';
import assert from 'node:assert/strict';
import { newHero } from '../js/engine.js';
import { roadIsOpen, ensureRoad, chooseRoad, roadSlot, ROADS } from '../js/roads.js';

const at = (hero, act, step, wins) => { Object.assign(hero.campaign, { act, step, wins, road: null }); return hero; };

test('something happens on the road before every fight: bigger encounters on fixed steps, road moments between', () => {
  const h = newHero({ name: 'T', cls: 'knight', seed: 2 });
  const open = [];
  for (let step = 2; step <= 10; step++) { at(h, 1, step, step - 1); if (roadIsOpen(h)) open.push(step); }
  assert.deepEqual(open, [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (const step of [2, 4, 6, 7, 9]) { at(h, 1, step, step - 1); assert.equal(ROADS.find((e) => e.id === ensureRoad(h, [h]).id).when, 'moment', `step ${step}`); }
  at(h, 1, 3, 2); assert.equal(ROADS.find((e) => e.id === ensureRoad(h, [h]).id).when, 'road');
  at(h, 1, 5, 4); assert.ok(ensureRoad(h, [h]).stat, 'a dice test before the elite');
  at(h, 1, 10, 9); assert.equal(ROADS.find((e) => e.id === ensureRoad(h, [h]).id).when, 'boss');
  assert.ok(roadSlot({ act: 1, step: 3 }) && roadSlot({ act: 1, step: 4 }) && roadSlot({ act: 1, step: 8 }));
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

test('a road moment in company: everybody rolls, the best wins a small bonus, ties share it, and there is no rematch', () => {
  const a = newHero({ name: 'WizKid', cls: 'wizard', seed: 3 }); const b = newHero({ name: 'Smalls', cls: 'dwarf', seed: 4 }); b.campaign = a.campaign;
  for (let step = 2; step <= 9; step++) {
    if ([3, 5, 8].includes(step)) continue;
    at(a, 1, step, step - 1); a.campaign.blessings = [];
    const gold = a.gold + b.gold; ensureRoad(a, [a, b]);
    const r = chooseRoad(a, [a, b], 'go');
    assert.equal(r.contest.length, 2); assert.equal(r.trial, null);
    const best = Math.max(...r.contest.map((x) => x.total)); const winners = r.contest.filter((x) => x.total === best).map((x) => x.name);
    const got = new Set([...a.campaign.blessings.map((x) => x.who), ...(a.gold + b.gold > gold ? winners : [])]);
    assert.deepEqual([...got].sort(), [...winners].sort(), `step ${step}: the bonus goes to the best roll`);
    assert.doesNotMatch(r.text, /undefined|\{/);
  }
});

test('a three-way tie on the road says all win (both is for two), and moment lines name the hero instead of "their"', async () => {
  const hs = [['WizKid', 'wizard'], ['Smalls', 'dwarf'], ['Ada', 'knight']].map(([name, cls], i) => newHero({ name, cls, seed: 3 + i }));
  for (const h of hs) h.campaign = hs[0].campaign;
  const ev = ROADS.find((e) => e.when === 'moment' && e.id !== 'm-pack');
  const ctx = { campaign: hs[0].campaign, members: hs, act: 1 };
  const rows = hs.map((h) => ({ name: h.name, total: 5 }));
  assert.match(ev.choices[0].contest(ctx, rows, hs.map((h) => h.name)).prose, /so all win/);
  assert.match(ev.choices[0].contest(ctx, rows, ['WizKid', 'Smalls']).prose, /so both win/);
  const { packList } = await import('../js/campaigns.js');
  for (const p of packList()) for (const act of p.acts || []) for (const m of act.moments || []) if (m) {
    for (const t of [m.won, m.lost]) assert.doesNotMatch(t, /\btheir\b/, `${p.id}: ${m.title}`);
  }
});

test('a whole campaign never repeats a road event while another of its kind is still unused', () => {
  const h = newHero({ name: 'Maya', cls: 'wizard', seed: 23 });
  const byKind = {};
  for (let act = 1; act <= 3; act++) for (let step = 1; step <= 10; step++) {
    at(h, act, step, (act - 1) * 10 + step - 1);
    const ev = ensureRoad(h, [h]); const kind = ROADS.find((e) => e.id === ev.id)?.when || 'other';
    (byKind[kind] ||= []).push(ev.id);
    chooseRoad(h, [h], ev.choices.find((c) => c.ok !== false)?.id || ev.choices[0].id);
  }
  for (const [kind, ids] of Object.entries(byKind)) {
    const total = ROADS.filter((e) => e.when === kind).length;
    if (ids.length <= total) assert.equal(new Set(ids).size, ids.length, `${kind}: ${ids.join(', ')}`);
  }
  assert.equal(new Set(byKind.boss).size, 3, 'three different boss nights');
});

test('T09: a road result comes in parts: roll summary, verdict, outcome without totals, and a named consequence', () => {
  // a solo test: "Your roll N · Challenge M", Success / Failed, prose with no numbers from the roll
  const h = newHero({ name: 'Ann', cls: 'knight', seed: 5 });
  let seen = 0;
  for (let act = 1; act <= 3; act++) {
    at(h, act, 5, (act - 1) * 10 + 4); h.campaign.seenRoads = []; const ev = ensureRoad(h, [h]); if (!ev.stat) continue;
    const ch = ev.choices.find((c) => c.test); const r = chooseRoad(h, [h], ch.id); seen++;
    assert.equal(r.roll, `Your roll ${r.trial.heroTotal} · Challenge ${r.trial.oppTotal}`);
    assert.equal(r.verdict, r.trial.win ? 'Success' : 'Failed');
    assert.doesNotMatch(r.prose, /\bagainst\b|\d+ to \d+|roll/);
    assert.ok(r.effect, 'a test always has a consequence');
    assert.doesNotMatch(r.text, /undefined|\{|null/);
  }
  assert.ok(seen > 0);
  // a company moment: names on totals, winners only, the prize named for them
  const a = newHero({ name: 'Ann', cls: 'wizard', seed: 3 }); const b = newHero({ name: 'Bob', cls: 'dwarf', seed: 4 }); b.campaign = a.campaign;
  at(a, 1, 2, 1); ensureRoad(a, [a, b]); const m = chooseRoad(a, [a, b], 'go');
  assert.equal(m.roll, m.contest.map((x) => `${x.name} ${x.total}`).join(' · '));
  assert.equal(m.verdict, 'Success');
  const winners = m.rolls.filter((x) => x.won).map((x) => x.name);
  assert.equal(m.who, winners.join(' and '));
  assert.match(m.effect, /^[A-Z+]/);
  // a walk-on: no roll, no verdict, one sentence, nothing gained
  const w = newHero({ name: 'Cy', cls: 'ranger', seed: 9 }); at(w, 1, 3, 2);
  w.campaign.road = { key: '1.3', id: 'well', done: false };
  const leave = chooseRoad(w, [w], 'leave');
  assert.deepEqual([leave.roll, leave.verdict, leave.effect, leave.prose], [null, null, null, 'You leave the well undisturbed.']);
  // a company-wide blessing names everyone in a company, the hero alone; a hero's own bane is named in its sentence
  const x = newHero({ name: 'Dee', cls: 'bard', seed: 11 }); const y = newHero({ name: 'Eve', cls: 'knight', seed: 12 }); y.campaign = x.campaign;
  at(x, 1, 3, 2); x.campaign.road = { key: '1.3', id: 'stew', done: false };
  const stew = chooseRoad(x, [x, y], 'bowl'); assert.equal(stew.who, 'Everyone'); assert.equal(stew.effect, 'Next fight: +10 health.');
  at(w, 1, 3, 2); w.campaign.road = { key: '1.3', id: 'stew', done: false };
  assert.equal(chooseRoad(w, [w], 'bowl').who, 'Cy');
});

test('T09: the chronicle keeps its own short record, apart from the result card', () => {
  const h = newHero({ name: 'Ann', cls: 'knight', seed: 2 });
  at(h, 1, 8, 7); ensureRoad(h, [h]); const res = chooseRoad(h, [h], 'save-a');
  assert.equal(res.prose, 'You turn toward Cinder Ford. Burnt Orchard will have to stand on its own.');
  assert.doesNotMatch(res.text, /chronicle/i);
  assert.match(h.campaign.chronicle[0].text, /the road wrote it down/);
});
