import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import * as SV from '../js/save.js';
import * as T from '../js/table.js';
import { slotPrice, slotCanBuy } from '../js/campbuy.js';
import { applyRelease } from '../js/release.js';

applyRelease();
const types = ['dagger', 'sword', 'axe', 'spear', 'shield', 'tower', 'bow', 'quiver'];
const hero = () => { const h = E.newHero({ name: 'Upgrader', cls: 'wizard', seed: 5 }); h.gold = 1000; return h; };
const mk = (id, rarity = 0, size = 4) => E.makeWeapon(id, rarity, E.makeRng(7), size);

test('released purchasing does not enable the wider face/loot experiment or alter existing face tables', () => {
  assert.equal(E.weaponTrainingOn(), true);
  assert.equal(D.EXPERIMENT.weaponSize, false);
  assert.equal(D.WEAPON_SIZE.ladder, null);
  for (const id of types) for (const rarity of [0, 1, 2]) for (const size of [4, 6, 8, 10]) {
    const inst = mk(id, rarity, size); const after = E.weaponFaces(inst);
    D.WEAPON_TRAINING.on = false;
    try { assert.deepEqual(E.weaponFaces(inst), after); } finally { D.WEAPON_TRAINING.on = true; }
  }
});

test('each weapon and metal buys d6/d8/d10 for exactly 50/100/200, with increasing resale', () => {
  for (const id of types) for (const rarity of [0, 1, 2]) {
    const h = hero(), w = mk(id, rarity); h.loadout.NW = w;
    const other = JSON.stringify(h.loadout.NE); const white = JSON.stringify(h.strength);
    for (const [next, cost] of [[6, 50], [8, 100], [10, 200]]) {
      const before = h.gold; const value = E.sellValue(w); const t = E.trainInfo(h, w.uid);
      assert.deepEqual([t.next, t.cost, t.sellBefore, t.sellAfter], [next, cost, value, value + cost / 2]);
      assert.equal(slotPrice(h, 'NW'), cost); assert.equal(slotCanBuy(h, 'NW'), true);
      assert.ok(E.trainWeapon(h, w.uid, next)); assert.equal(h.gold, before - cost);
      assert.equal(E.weaponSize(w), next); assert.equal(E.sidesOf(h, 'NW'), next);
      assert.equal(E.weaponFaces(w, E.sidesOf(h, 'NW')).length, next);
      assert.equal(E.sellValue(w), t.sellAfter); assert.equal(JSON.stringify(h.strength), white);
      assert.equal(JSON.stringify(h.loadout.NE), other);
    }
    assert.equal(h.gold, 650); assert.equal(E.trainWeapon(h, w.uid, 10), false);
    assert.equal(slotPrice(h, 'NW'), null); assert.equal(slotCanBuy(h, 'NW'), false);
    assert.equal(E.downgradeDie(h, 'weapon', w.uid), false);
  }
});

test('insufficient funds, missing/foreign items, skipped sizes and repeated commands do not spend gold', () => {
  const h = hero(), w = h.loadout.NW;
  h.gold = 49; const before = JSON.stringify(h);
  assert.equal(E.trainWeapon(h, w.uid, 6), false); assert.equal(JSON.stringify(h), before);
  h.gold = 1000;
  assert.equal(E.trainWeapon(h, w.uid, 8), false); assert.equal(E.trainWeapon(h, 'foreign', 6), false);
  assert.equal(h.gold, 1000); assert.ok(E.trainWeapon(h, w.uid, 6));
  const bought = JSON.stringify(h); assert.equal(E.trainWeapon(h, w.uid, 6), false);
  assert.equal(JSON.stringify(h), bought);
  h.gold = 100; assert.ok(E.trainWeapon(h, w.uid, 8)); assert.equal(h.gold, 0);
});

test('found gear keeps its original sale value; only actual paid upgrades are recovered; no profitable loops', () => {
  for (const id of types) for (const rarity of [0, 1, 2]) for (const size of [4, 6, 8, 10]) {
    const h = hero(), w = mk(id, rarity, size); h.bag.push(w);
    const price = E.weaponValue(w); const sell0 = E.sellValue(w); let spent = 0;
    while (E.trainInfo(h, w.uid).ok) {
      const t = E.trainInfo(h, w.uid); spent += t.cost; E.trainWeapon(h, w.uid, t.next);
      assert.equal(E.sellValue(w), sell0 + spent / 2);
      assert.equal(w.sizeInvestment.from, size);
    }
    // Even a 50%-off purchase plus any sizes cannot be resold for a profit (rounding allowed at the base).
    assert.ok(E.sellValue(w) <= Math.round(price * .5) + spent);
    const paidOut = E.sellValue(w); const g = h.gold;
    assert.ok(E.sellItem(h, w.uid)); assert.equal(h.gold, g + paidOut);
    assert.equal(h.bag.some((x) => x.uid === w.uid), false);
  }
});

test('same-type weapons stay independent and duplicate references cost only once', () => {
  const h = hero(), a = mk('dagger'), b = mk('dagger'); h.loadout.NW = a; h.bag.push(b, a);
  assert.ok(E.trainWeapon(h, a.uid, 6)); assert.equal(h.gold, 950);
  assert.equal(a.sizeInvestment.gold, 50); assert.equal(E.weaponSize(b), 4);
  const copy = { ...a, sizeInvestment: { ...a.sizeInvestment } }; h.bag.push(copy);
  assert.ok(E.trainWeapon(h, a.uid, 8)); assert.equal(h.gold, 850);
  assert.deepEqual(copy.sizeInvestment, { from: 4, gold: 150 }); assert.equal(copy.size, 8);
});

test('Arrows preserve ammunition; Diamonds/Fists/legendaries cannot buy sizes; Diamond stock remains', () => {
  for (const ammo of Object.keys(D.WEAPONS2.ammo)) {
    const h = hero(), w = { ...mk('quiver'), ammo }; h.loadout.NW = w;
    for (const next of [6, 8, 10]) { assert.ok(E.trainWeapon(h, w.uid, next)); assert.equal(w.ammo, ammo); }
  }
  for (const w of [mk('fists'), { ...mk('dagger'), diamond: true }, mk('starfire')]) {
    const h = hero(); h.loadout.NW = w; const before = JSON.stringify(h);
    assert.equal(E.trainWeapon(h, w.uid, 6), false); assert.equal(JSON.stringify(h), before);
  }
  assert.ok(Array.from({ length: 100 }, (_, seed) => {
    const h = hero(); h.campaign.seed = seed; return E.shopStock(h).some((it) => it.inst.diamond);
  }).some(Boolean));
});

test('real battle rolls and evaluation use the purchased weapon size with a d4 hand', () => {
  const h = hero(), w = h.loadout.NW;
  for (const next of [6, 8, 10]) E.trainWeapon(h, w.uid, next);
  assert.equal(E.sidesOf(h, 'W'), 4); assert.equal(E.wieldInfo(h, w).rollsAs, 10);
  const battle = E.newBattle(h, E.questsFor(h)[0], E.makeRng(2), 1);
  battle.script = { rolls: [{ NW: 10, NE: 1, N: 1, W: 1, E: 1, S: 1, C: 1, SW: 1, SE: 1 }] };
  E.startRoll(battle); assert.equal(battle.board.NW.v, 10);
  const ev = E.evaluate(h, battle.board); assert.ok(Number.isFinite(ev.atk));
  E.resolve(battle, { target: 0 }); assert.ok(battle.report); assert.equal(E.weaponSize(w), 10);
});

test('local save/resume and old-save migration preserve purchases, value, gold and owned gear', async () => {
  const mem = new Map(); globalThis.window = { localStorage: {
    getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k),
    get length() { return mem.size; }, key: (i) => [...mem.keys()][i],
  } };
  const h = hero(), w = h.loadout.NW;
  E.trainWeapon(h, w.uid, 6); E.trainWeapon(h, w.uid, 8);
  await SV.createSave(h, 'testpass'); await SV.saveHero(h);
  const back = await SV.openHero(h.name, 'testpass');
  assert.equal(back.gold, 850); assert.deepEqual(back.loadout.NW, w); assert.equal(E.sellValue(back.loadout.NW), E.sellValue(w));
  const old = hero(); old.bag.push(mk('axe', 2, 8));
  const before = JSON.stringify(old.bag); SV.migrateHero(old); SV.migrateHero(old);
  assert.equal(JSON.stringify(old.bag), before); assert.equal(old.bag[0].sizeInvestment, undefined);
});

test('authoritative co-op enforces ownership, camp phase, target size and duplicate rejection; packed table retains value', () => {
  const table = T.createTable({ code: 'UPGR', seed: 5, name: 'Upgrades' });
  const a = T.joinTable(table, { name: 'Ada', cls: 'wizard', token: 'aaa' }).player;
  const b = T.joinTable(table, { name: 'Bea', cls: 'knight', token: 'bbb' }).player;
  a.hero = hero(); b.hero = hero(); table.phase = 'camp'; a.ready = true;
  const w = a.hero.loadout.NW; const cmd = { type: 'op', op: 'trainWeapon', args: [w.uid, 6] };
  assert.equal(T.command(table, b.id, cmd).ok, false);
  assert.equal(T.command(table, a.id, { ...cmd, args: [w.uid] }).ok, false);
  assert.equal(T.command(table, a.id, cmd).ok, true); assert.equal(a.ready, false);
  assert.equal(a.hero.gold, 950); assert.equal(b.hero.gold, 1000);
  assert.equal(T.command(table, a.id, cmd).ok, false); assert.equal(a.hero.gold, 950);
  table.phase = 'battle'; assert.equal(T.command(table, a.id, { ...cmd, args: [w.uid, 8] }).ok, false);
  table.phase = 'camp';
  const back = T.loadTable(T.saveTable(table)); const saved = back.players[0].hero.loadout.NW;
  assert.equal(saved.size, 6); assert.equal(E.sellValue(saved), E.sellValue(w));
});
