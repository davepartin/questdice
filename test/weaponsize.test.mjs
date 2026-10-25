// T17 weapon size (EXPERIMENT.weaponSize): off it changes nothing; on it is one step at a time, no wear, no hand ceiling, a sale on the as-found worth,
// no Diamonds. Each test file is its own process, so the switch-off baseline runs first and the switch goes on after it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';

applyRelease(); // the released game's weapons, as main.js does before it boots
const ACTIVE = ['dagger', 'sword', 'axe', 'spear', 'shield', 'tower', 'bow', 'quiver'].filter((id) => D.WEAPONS[id]);
const mk = (id, rarity = 0, size = 4) => E.makeWeapon(id, rarity, E.makeRng(7), size);
const hero = (cls = 'knight', seed = 3) => { const h = E.newHero({ name: 'Sizer', cls, seed }); h.gold = 1000; return h; };
const faceKey = (inst) => E.weaponFaces(inst, E.sidesOf({ ...hero(), loadout: { NW: inst, NE: inst }, strength: { W: 10, E: 10 } }, 'NW')).map((f) => `${f.c}${f.v}${f.plus || ''}${JSON.stringify(f.fx || '')}${f.arrow || ''}`).join(' ');

// ---- switched off: today's game, untouched
const OFF = {};
test('off: no size purchase, the hand still caps the die, weapons wear, a worn weapon sells for less, the old shrink path stays', () => {
  assert.equal(D.EXPERIMENT.weaponSize, false);
  const h = hero(); const w = mk('sword', 1, 8); h.bag.push(w);
  assert.deepEqual(E.trainInfo(h, w.uid), { ok: false, why: 'wear' });
  h.strength = { W: 4, E: 4 }; h.loadout.NW = w; assert.equal(E.sidesOf(h, 'NW'), 4, 'a d8 weapon in a d4 hand rolls a d4');
  assert.ok(Number.isFinite(E.battlesFull(w))); assert.match(E.wearLabel(w), /battles? left/);
  const fresh = E.sellValue(mk('sword', 1, 6)); const worn = { ...mk('sword', 1, 6), left: 1 }; assert.ok(E.sellValue(worn) < fresh, 'wear lowers a sale today');
  assert.equal(E.weaponValue(mk('axe', 0, 8)), E.weaponValue({ ...mk('axe', 0, 8), found: 4 }), 'found is ignored when the switch is off');
  assert.ok(E.downgradeInfo(h, 'weapon', w.uid).ok !== undefined && E.downgradeInfo(h, 'weapon', w.uid).why !== 'none', 'shrinking a weapon still works');
  OFF.shop = 0; for (let s = 0; s < 600; s++) { const g = hero('knight', s); g.campaign.seed = s; g.campaign.act = 2; g.campaign.step = 3; delete g.campaign.shop; if (E.shopStock(g).some((it) => it.inst.diamond)) OFF.shop++; }
  assert.ok(OFF.shop > 0, 'with the switch off the shop sometimes stocks a Diamond (so the on-test below can notice its absence)');
  OFF.faces = Object.fromEntries(ACTIVE.flatMap((id) => [0, 1, 2].flatMap((r) => [4, 6, 8, 10].map((n) => [`${id}${r}:${n}`, faceKey(mk(id, r, n))]))));
});
test('the switch is only turned on in preview/weapon-size/, never at the live root', () => {
  const main = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  assert.match(main, /if \(PREVIEW && PREVIEW_NAME === 'weapon-size'\) \{ useWeaponSize\(\);/);
  assert.equal((main.match(/WEAPON_SIZE\.ladder\s*=/g) || []).length, 1, 'the proposed face table is installed in one place'); assert.match(main, /PREVIEW_NAME === 'weapon-size'\) \{[^\n]*WEAPON_SIZE\.ladder\s*=/, 'and only inside the preview guard');
  assert.equal((main.match(/useWeaponSize\(/g) || []).length, 1, 'one call, and it is the guarded one');
  assert.ok(!/EXPERIMENT\.weaponSize\s*=\s*true/.test(fs.readFileSync(new URL('../js/data.js', import.meta.url), 'utf8')));
  assert.equal(D.WEAPON_SIZE.ladder, null, 'no unreviewed face table is installed');
});

// ---- switched on
test('on: sizes are bought one step at a time at 40, 80 and 140, with no hand check', () => {
  E.useWeaponSize(); assert.equal(D.EXPERIMENT.weaponSize, true);
  for (const id of ACTIVE) for (const r of [0, 1, 2]) {
    const h = hero(); h.strength = { W: 4, E: 4 }; const w = mk(id, r, 4); h.bag.push(w);
    let t = E.trainInfo(h, w.uid); assert.deepEqual([t.ok, t.cost, t.next, t.noRefund], [true, 40, 6, true], `${id} ${r}: d4 to d6`);
    assert.ok(E.trainWeapon(h, w.uid)); assert.equal(E.weaponSize(w), 6); assert.equal(h.gold, 960);
    t = E.trainInfo(h, w.uid); assert.deepEqual([t.cost, t.next], [80, 8]); assert.ok(E.trainWeapon(h, w.uid)); assert.equal(h.gold, 880);
    t = E.trainInfo(h, w.uid); assert.deepEqual([t.cost, t.next], [140, 10]); assert.ok(E.trainWeapon(h, w.uid)); assert.equal(h.gold, 740);
    assert.equal(E.trainInfo(h, w.uid).ok, false); assert.equal(E.trainInfo(h, w.uid).why, 'max'); assert.equal(E.trainWeapon(h, w.uid), false); assert.equal(h.gold, 740);
  }
  const poor = hero(); poor.gold = 39; const w = mk('sword', 0, 4); poor.bag.push(w);
  assert.deepEqual([E.trainInfo(poor, w.uid).ok, E.trainInfo(poor, w.uid).why], [false, 'gold']); assert.equal(E.trainWeapon(poor, w.uid), false); assert.equal(E.weaponSize(w), 4);
  const found = hero(); const d8 = mk('axe', 1, 8); found.bag.push(d8); assert.equal(E.trainInfo(found, d8.uid).cost, 140, 'a found d8 has its smaller sizes uncovered already');
  const none = hero(); assert.equal(E.trainInfo(none, 'nosuch').ok, false);
});
test('on: the weapon die is its size, whatever the hand, and the hand dice and slots are untouched', () => {
  const h = hero(); h.strength = { W: 4, E: 4 }; const w = mk('sword', 1, 8); h.loadout.NW = w;
  assert.equal(E.sidesOf(h, 'NW'), 8); assert.equal(E.sidesOf(h, 'W'), 4, 'the hand die keeps its own size'); assert.equal(E.wieldInfo(h, w).rollsAs, 8);
  const before = JSON.stringify([h.strength, h.dice]); E.trainWeapon(h, w.uid); assert.equal(JSON.stringify([h.strength, h.dice]), before, 'buying size changes no hand die and opens no slot');
  assert.equal(E.isActive(h, 'NE'), E.isActive(hero(), 'NE'), 'an unopened slot stays unopened');
  assert.equal(E.weaponFaces(w, E.sidesOf(h, 'NW')).length, 10);
});
test('on: weapons never wear out and nothing says they do', () => {
  const h = hero('ranger'); const w = h.loadout.NW; for (let i = 0; i < 40; i++) E.wearHands(h);
  assert.equal(h.loadout.NW, w, 'the weapon is still in the hand'); assert.notEqual(h.loadout.NW.id, 'fists'); assert.equal(E.battlesFull(w), Infinity); assert.equal(E.wearLabel(w), ''); assert.deepEqual(E.takeBroken(h), { broke: [], spare: null });
  E.shatterDiamonds(h); assert.equal(h.loadout.NW, w);
});
test('on: a sale pays half the as-found worth, bought size adds nothing, and buy / upgrade / sell / rebuy never profits', () => {
  for (const id of ACTIVE) for (const r of [0, 1, 2]) for (const found of [4, 6, 8, 10]) {
    const price = E.weaponValue(mk(id, r, found)); // what the shop charges for it as found
    const h = hero(); const w = mk(id, r, found); h.bag.push(w);
    const sell0 = E.sellValue(w); assert.equal(sell0, Math.max(1, Math.round(price * D.SELL_SHARE)), `${id} ${r} d${found}`);
    let spent = 0; for (let k = 0; k < 3 && E.trainInfo(h, w.uid).next; k++) { spent += E.trainInfo(h, w.uid).cost; E.trainWeapon(h, w.uid); assert.equal(E.sellValue(w), sell0, 'a bought size does not raise the sale'); assert.equal(E.weaponValue(w), price, 'nor the shop value'); assert.equal(E.foundSize(w), found); }
    assert.ok(sell0 < price, 'selling never repays the price'); assert.ok(sell0 - price - spent < 0, 'buy, upgrade, sell is a loss');
  }
  const h = hero(); const w = mk('spear', 2, 6); h.bag.push(w); E.trainWeapon(h, w.uid);
  const round = JSON.parse(JSON.stringify(h)); const back = round.bag[0]; assert.equal(E.foundSize(back), 6, 'the as-found size survives save and load'); assert.equal(E.weaponSize(back), 8); assert.equal(E.sellValue(back), E.sellValue(w));
  const moved = { ...back, uid: 'other' }; assert.equal(E.sellValue(moved), E.sellValue(w), 'and a transfer (a copy of the weapon)');
  const g = hero(); const gold0 = g.gold; const shop = mk('axe', 1, 6); g.bag.push(shop); E.sellDrop(g, shop); assert.equal(g.gold - gold0, E.sellValue(mk('axe', 1, 6)));
});
test('on: two weapons of one kind keep their own sizes; a twin hand copy follows its weapon', () => {
  const h = hero(); const a = mk('dagger', 1, 4); const b = mk('dagger', 1, 4); h.bag.push(a, b); E.trainWeapon(h, a.uid);
  assert.equal(E.weaponSize(a), 6); assert.equal(E.weaponSize(b), 4, 'another Silver Dagger does not inherit the upgrade');
});
test('on: no Diamonds in the shop, the spoils or the perk offers; shrinking a weapon is off', () => {
  let shops = 0; for (let s = 0; s < 600; s++) { const g = hero('knight', s); g.campaign.seed = s; g.campaign.act = 2; g.campaign.step = 3; delete g.campaign.shop; if (E.shopStock(g).some((it) => it.inst.diamond)) shops++; }
  assert.equal(shops, 0, `the same 600 shops that stocked ${OFF.shop} Diamonds with the switch off`);
  const g = hero(); for (let i = 0; i < 400; i++) assert.ok(!E.offerPerks(g, E.makeRng(i)).includes('diamond'));
  const h = hero(); const w = mk('sword', 0, 8); h.bag.push(w); assert.equal(E.downgradeInfo(h, 'weapon', w.uid).ok, false);
});
test('on: a reviewed face table plugs in by weapon, metal and size; without one the faces are today\'s', () => {
  const sizes = [4, 6, 8, 10];
  for (const id of ACTIVE) for (const r of [0, 1, 2]) for (const n of sizes) assert.equal(faceKey(mk(id, r, n)), OFF.faces[`${id}${r}:${n}`], `${id} ${r} d${n}: no table installed, faces unchanged`);
  const bronze = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((v, i) => ({ v: i + 1, c: i % 3 ? 'r' : 'b' }));
  D.WEAPON_SIZE.ladder = { dagger: { Bronze: Object.fromEntries(sizes.map((n) => [n, bronze.slice(0, n)])) } };
  try {
    for (const n of sizes) assert.deepEqual(E.weaponFaces(mk('dagger', 0, n), n).map((f) => f.v), bronze.slice(0, n).map((f) => f.v));
    assert.equal(faceKey(mk('dagger', 1, 6)), OFF.faces['dagger1:6'], 'a metal or weapon the table lacks keeps today\'s faces');
    const ammo = { ...mk('quiver', 0, 4), ammo: 'fire' }; D.WEAPON_SIZE.ladder['quiver:fire'] = { Bronze: { 4: [{ v: 9, c: 'r' }, { v: 8, c: 'r' }, { v: 7, c: 'r' }, { v: 6, c: 'r', arrow: 'fire' }] } };
    assert.equal(E.weaponFaces(ammo, 4)[3].arrow, 'fire', 'Arrows read the table by ammunition');
  } finally { D.WEAPON_SIZE.ladder = null; }
});
