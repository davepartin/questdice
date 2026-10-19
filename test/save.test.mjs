import test from 'node:test';
import assert from 'node:assert/strict';
import * as SV from '../js/save.js';
import * as E from '../js/engine.js';

const mem = {};
globalThis.window = {
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
    get length() { return Object.keys(mem).length; },
    key: (i) => Object.keys(mem)[i] ?? null,
  },
};

function heroAt(act, step) {
  const h = E.newHero({ name: 'Ada', cls: 'knight', seed: 7 });
  h.campaign.act = act;
  h.campaign.step = step;
  h.gold = 40;
  h.level = 4;
  return h;
}

test('a hero may start at Act I step 1 and only as far as they have walked', () => {
  const h = E.newHero({ name: 'Ada', cls: 'knight', seed: 1 });
  SV.markReached(h);
  assert.equal(SV.canStartAt(h, 1, 1), true);
  assert.equal(SV.canStartAt(h, 1, 2), false);
  assert.deepEqual(SV.startChoices(h), [{ act: 1, step: 1 }]);
});

test('a loaded hero may replay any reached step, Act I included', () => {
  const h = heroAt(2, 3);
  h.campaign.reached = { act: 2, step: 3 };
  h.campaign.wins = 12;
  const choices = SV.startChoices(h);
  assert.equal(choices[0].act, 1);
  assert.equal(choices[0].step, 1);
  assert.equal(choices.at(-1).act, 2);
  assert.equal(choices.at(-1).step, 3);
  assert.equal(choices.length, 13);
  assert.equal(SV.canStartAt(h, 1, 10), true);
  assert.equal(SV.canStartAt(h, 1, 1), true);
  assert.equal(SV.canStartAt(h, 2, 3), true);
  assert.equal(SV.canStartAt(h, 2, 4), false);
  assert.equal(SV.canStartAt(h, 3, 1), false);
});

test('beginAt rewinds the road and keeps gear, gold and the high-water mark', () => {
  const h = heroAt(2, 3);
  h.campaign.blessings = [{ id: 'gate', fights: 1 }];
  h.campaign.road = { key: '2.3', done: true };
  h.campaign.shop = { stock: [] };
  assert.equal(SV.beginAt(h, 1, 5), true, 'Act I may be replayed by any hero');
  assert.equal(h.campaign.act, 1);
  assert.equal(SV.beginAt(h, 2, 1), true);
  assert.equal(h.campaign.act, 2);
  assert.equal(h.campaign.step, 1);
  assert.deepEqual(h.campaign.reached, { act: 2, step: 3 });
  assert.equal(h.gold, 40);
  assert.equal(h.level, 4);
  assert.equal(h.campaign.road, null);
  assert.equal(h.campaign.shop, null);
  assert.deepEqual(h.campaign.blessings, []);
  assert.equal(SV.beginAt(h, 2, 4), false);
  assert.equal(h.campaign.step, 1);
});

test('older saves without reached use where they stand', () => {
  const h = heroAt(1, 8);
  assert.deepEqual(SV.reachedOf(h), { act: 1, step: 8 });
  assert.equal(SV.canStartAt(h, 1, 8), true);
  assert.equal(SV.canStartAt(h, 1, 9), false);
});

test('advanceCampaign raises the high-water mark', () => {
  const h = heroAt(1, 10);
  E.advanceCampaign(h);
  assert.equal(h.campaign.act, 2);
  assert.equal(h.campaign.step, 1);
  assert.deepEqual(h.campaign.reached, { act: 2, step: 1 });
});

test('name + password hashes to a stable cloud id, and a different password is a different doc', async () => {
  const a = await SV.cloudHeroId('Ada', 'secret');
  const b = await SV.cloudHeroId('ada', 'secret');
  const c = await SV.cloudHeroId('Ada', 'other');
  const n = await SV.cloudNameId('Ada');
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.notEqual(a, n);
  assert.equal(a.length, 64);
  assert.match(a, /^[0-9a-f]+$/);
});

test('cloudRecord stores the hero as JSON with a salt and hash, never the password', async () => {
  const h = heroAt(1, 2);
  const rec = await SV.cloudRecord(h, 'hunter2');
  assert.equal(rec.hero.includes('hunter2'), false);
  assert.equal(JSON.stringify(rec).includes('hunter2'), false);
  assert.equal(JSON.parse(rec.hero).gold, 40);
  assert.equal(rec.v, SV.SAVE_V);
  assert.equal(rec.nameKey, 'ada');
  const again = await SV.cloudRecord(h, 'wrong', rec);
  assert.equal(again.salt, rec.salt);
  assert.equal(again.hash, rec.hash);
});

test('the public cloud card is name, class, level and act/step, never the hash or hero blob', () => {
  const h = heroAt(2, 4);
  h.cls = 'bard';
  const card = SV.cloudPublic(h);
  assert.equal(card.name, 'Ada');
  assert.equal(card.cls, 'bard');
  assert.equal(card.level, 4);
  assert.equal(card.act, 2);
  assert.equal(card.step, 4);
  assert.equal('hash' in card, false);
  assert.equal('salt' in card, false);
  assert.equal('hero' in card, false);
  assert.equal('password' in card, false);
  const cleaned = SV.readPublicHero({ ...card, hash: 'abc', salt: 'nope', hero: '{"gold":999}', password: 'hunter2' });
  assert.equal(cleaned.name, 'Ada');
  assert.equal(cleaned.level, 4);
  assert.equal('hash' in cleaned, false);
  assert.equal('hero' in cleaned, false);
  assert.equal(SV.readPublicHero({ cls: 'knight' }), null);
});

test('opening a save remaps old noob/mid/expert skill names to easy/normal/hard', async () => {
  const h = E.newHero({ name: 'Nia', cls: 'wizard', seed: 9 });
  h.difficulty = 'noob';
  await SV.createSave(h, 'nia');
  assert.equal(h.difficulty, 'easy', 'createSave remaps before writing');
  const store = globalThis.window.localStorage;
  const planted = JSON.parse(store.getItem('questdice.hero.nia'));
  planted.hero.difficulty = 'expert';
  store.setItem('questdice.hero.nia', JSON.stringify(planted));
  const opened = await SV.openHero('Nia', 'nia');
  assert.equal(opened.difficulty, 'hard');
  assert.equal(JSON.parse(store.getItem('questdice.hero.nia')).hero.difficulty, 'hard');
  const rec = await SV.cloudRecord({ ...E.newHero({ name: 'Pia', cls: 'bard', seed: 2 }), difficulty: 'mid' }, 'pw0');
  assert.equal(JSON.parse(rec.hero).difficulty, 'normal');
  assert.equal(SV.migrateHero({ name: 'Zed', difficulty: 'noob' }).difficulty, 'easy');
});

test('a new save needs a password of at least 3 characters', async () => {
  const h = E.newHero({ name: 'Cy', cls: 'ranger', seed: 3 });
  await assert.rejects(() => SV.createSave(h, 'ab'), /at least 3/);
  await assert.rejects(() => SV.createSave(h, ''), /at least 3/);
  await SV.createSave(h, 'abc');
  const opened = await SV.openHero('Cy', 'abc');
  assert.equal(opened.name, 'Cy');
});

test('local keepHero overwrites the same name only when the password matches', async () => {
  const h = heroAt(1, 1);
  h.name = 'Bea';
  await SV.createSave(h, 'pw1');
  h.gold = 99;
  await SV.keepHero(h, 'pw1');
  const opened = await SV.openHero('Bea', 'pw1');
  assert.equal(opened.gold, 99);
  await assert.rejects(() => SV.keepHero(h, 'nope'), /Wrong password/);
});

test('first clear is tracked per hero, and a later step implies earlier ones were beaten', () => {
  const h = heroAt(2, 3);
  h.campaign.reached = { act: 2, step: 3 };
  assert.equal(SV.hasCleared(h, 2, 1), true);
  assert.equal(SV.hasCleared(h, 2, 3), false, 'still standing on the frontier');
  assert.equal(SV.hasCleared(h, 1, 10), true);
  SV.markCleared(h, 2, 3);
  assert.equal(SV.hasCleared(h, 2, 3), true);
  assert.ok(h.cleared.includes('2.3'));
});

test('a repeat win pays half the gold, then a quarter, then an eighth; a thief\'s loss is not shrunk', () => {
  const h = E.newHero({ name: 'Cy', cls: 'ranger', seed: 3 });
  assert.equal(SV.repeatShare(h, 1, 4), 0.5);
  SV.markRepeat(h, 1, 4); assert.equal(SV.repeatShare(h, 1, 4), 0.25);
  SV.markRepeat(h, 1, 4); assert.equal(SV.repeatShare(h, 1, 4), 0.125);
  assert.equal(SV.repeatShare(h, 1, 5), 0.5, 'each step counts its own repeats');
  assert.equal(SV.repeatGold(40, 0.25), 10);
  assert.equal(SV.repeatGold(-6, 0.25), -6);
  assert.match(SV.repeatNote(0.25), /quarter/);
});

test('a repeat clear withholds XP, gold and perks; a first clear still pays', () => {
  const first = E.newHero({ name: 'Ada', cls: 'knight', seed: 1 });
  first.gold = 10;
  const act = first.campaign.act; const step = first.campaign.step;
  assert.equal(SV.hasCleared(first, act, step), false);
  SV.markCleared(first, act, step);
  const gold = 25; const xp = 40;
  first.gold += SV.hasCleared(first, act, step) ? 0 : gold;
  const gained = E.gainXp(first, SV.hasCleared(first, act, step) ? 0 : xp);
  assert.equal(first.gold, 10);
  assert.equal(gained, 0);
  assert.equal(first.pendingPerks, 0);

  const fresh = E.newHero({ name: 'Bea', cls: 'bard', seed: 2 });
  fresh.gold = 10;
  const a = fresh.campaign.act; const s = fresh.campaign.step;
  assert.equal(SV.hasCleared(fresh, a, s), false);
  const payGold = SV.hasCleared(fresh, a, s) ? 0 : gold;
  const payXp = SV.hasCleared(fresh, a, s) ? 0 : xp;
  SV.markCleared(fresh, a, s);
  fresh.gold += payGold;
  const levels = E.gainXp(fresh, payXp);
  assert.equal(fresh.gold, 35);
  assert.ok(levels >= 1 || fresh.xp === xp);
});

test('hero colour is kept on the local save and in the cloud blob', async () => {
  const h = E.newHero({ name: 'Cora', cls: 'ranger', seed: 3, color: 'rust' });
  assert.equal(h.color, 'rust');
  await SV.createSave(h, 'secret');
  const loaded = await SV.openHero('Cora', 'secret');
  assert.equal(loaded.color, 'rust');
  const rec = await SV.cloudRecord(loaded, 'secret');
  assert.equal(JSON.parse(rec.hero).color, 'rust');
  const old = E.newHero({ name: 'Ned', cls: 'dwarf', seed: 4 });
  delete old.color;
  SV.migrateHero(old);
  assert.equal(old.color, 'default');
});


test('creating a hero where the browser will not store it gives a clear error, not a crash', async () => {
  const real = globalThis.window.localStorage;
  globalThis.window.localStorage = { ...real, getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  try {
    await assert.rejects(SV.createSave(E.newHero({ name: 'Full', cls: 'bard', seed: 3 }), 'abc123'), /would not save the hero/);
  } finally { globalThis.window.localStorage = real; }
});
