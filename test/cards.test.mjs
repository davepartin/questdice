// The approved card family (js/g3/cards.js): drawn from live game data, read-only, and the wager wording matches what judge() pays.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import * as S from '../js/secrets.js';
import * as CW from '../js/g3/cards.js';

applyRelease(); // the released game's faces, as main.js does before it boots

const inst = (id, rarity = 0, size, extra = {}) => ({ ...E.makeWeapon(id, rarity, () => 0.5, size), ...extra });
const ACTIVE = ['dagger', 'sword', 'axe', 'spear', 'shield', 'tower', 'bow', 'quiver', 'mace'].filter((id) => D.WEAPONS[id]);

test('a weapon card is the weapon\'s own data: faces, die, metal, wear and the pack\'s sell value', () => {
  for (const id of ACTIVE) for (const r of [0, 1, 2]) for (const size of [4, 6, 8, 10]) {
    const w = inst(id, r, size); const d = CW.weaponData(w);
    assert.deepEqual(d.faces, E.weaponFaces(w), `${id} faces`);
    assert.equal(d.size, E.weaponSize(w)); assert.equal(d.metal, D.tierName(w)); assert.equal(d.wear, E.wearLabel(w));
    assert.equal(d.sell, E.sellValue(w)); assert.equal(d.money, E.sellValue(w)); assert.equal(d.moneyLabel, 'Sell');
    const html = CW.weaponCardHtml(d);
    assert.equal((html.match(/class="f13 /g) || []).length, d.faces.length, 'one tile for every face');
    assert.ok(html.includes(`d${d.size}`) && html.includes(d.metal) && html.includes(`Sell</small>`));
  }
});

test('a d10 card has ten face tiles and a strip of ten; a d4 has four', () => {
  const d10 = CW.weaponData(inst('dagger', 1, 10)); const d4 = CW.weaponData(inst('dagger', 0, 4));
  assert.equal(d10.faces.length, 10); assert.match(CW.weaponCardHtml(d10), /faces13 n10/); assert.equal((CW.strip(d10).match(/<i /g) || []).length, 10);
  assert.equal(d4.faces.length, 4); assert.match(CW.weaponCardHtml(d4), /faces13 n4/);
});

test('the store label shows what the shelf charges, and the price is only ever the number it is given', () => {
  const w = inst('axe', 1, 6); const d = CW.weaponData(w, { label: 'Store', value: 77 });
  assert.equal(d.moneyLabel, 'Store'); assert.equal(d.money, 77); assert.equal(d.sell, E.sellValue(w), 'the sell value is still the game\'s');
  assert.match(CW.weaponCardHtml(d), /Store<\/small>[^]*77/);
  assert.equal(CW.weaponData(w, { label: '', value: 0 }).money, 0, 'no gold figure when none is wanted (the class introduction)');
  const dia = { ...inst('sword', 2, 6), diamond: true }; assert.equal(CW.weaponData(dia).sell, E.diamondSellValue(dia), 'a Diamond sells for its own value');
});

test('Arrows show the selected ammunition and the matching arrowhead faces, with the same default as the engine', () => {
  for (const am of Object.keys(D.WEAPONS2.ammo)) {
    const q = inst('quiver', 1, 6, { ammo: am }); const d = CW.weaponData(q);
    assert.equal(d.ammo, am); assert.equal(d.ammoName, D.WEAPONS2.ammo[am]);
    const html = CW.weaponCardHtml(d); assert.match(html, new RegExp(`class="ammo am-${am}"`)); assert.ok(html.includes(D.WEAPONS2.ammo[am]));
    const heads = d.faces.filter((f) => f.arrow); if (am !== 'normal') assert.ok(heads.length > 0, `${am} arrows have arrowhead faces`); assert.ok(heads.every((f) => f.arrow === am), `every arrowhead face is ${am}`);
    assert.equal((html.match(new RegExp(`class="ah am-${am}"`, 'g')) || []).length, heads.length, 'the arrowhead mark follows the ammunition');
    if (heads.length) assert.match(CW.strip(d), new RegExp(`am-${am}`)); assert.match(CW.chips(d), new RegExp(`am-${am}`));
  }
  const bare = inst('quiver', 0, 6); delete bare.ammo;
  assert.equal(CW.ammoOf(bare), D.WEAPONS2.ammo[D.WEAPONS2.defaultAmmo] ? D.WEAPONS2.defaultAmmo : 'normal');
  assert.deepEqual(CW.weaponData(bare).faces, E.weaponFaces(bare), 'the default ammunition draws the faces the engine rolls');
  assert.equal(CW.ammoOf(inst('bow', 0, 6)), null, 'only Arrows carry an ammunition badge');
});

test('drawing a card never changes a weapon or a hero: no wear, no sale, no purchase', () => {
  const hero = E.newHero({ name: 'Dave', cls: 'ranger', seed: 3 }); hero.bag = [inst('sword', 2, 8), inst('quiver', 1, 6, { ammo: 'fire' })]; hero.gold = 120;
  const dia = { ...inst('spear', 2, 6), diamond: true }; hero.diamonds = [dia];
  const before = JSON.stringify(hero);
  for (const w of [...hero.bag, dia, hero.loadout.NW, hero.loadout.NE].filter(Boolean)) {
    const d = CW.weaponData(w, { label: 'Store', value: 9 }); CW.weaponCardHtml(d); CW.icon(d, 128); CW.icon(d, 64); CW.strip(d); CW.chips(d);
    for (const f of d.faces) CW.face(f);
  }
  assert.equal(JSON.stringify(hero), before, 'the hero, its pack and its weapons are exactly as they were');
  assert.equal(hero.gold, 120);
});

test('art: every active type has a painted master, a legendary uses its model\'s, and a missing one gets a labelled silhouette', () => {
  for (const id of ACTIVE) assert.ok(CW.WEAPON_ART[id], `${id} has art`);
  const legend = Object.keys(D.WEAPONS).filter((id) => D.WEAPONS[id].legendary && CW.WEAPON_ART[D.WEAPONS[id].model]);
  for (const id of legend.slice(0, 5)) assert.match(CW.icon(CW.weaponData(inst(id, 2, 6)), 128), /<img/, `${id} borrows its model's art`);
  assert.match(CW.icon({ id: 'nosuch', name: 'Zed', metal: 'Bronze' }, 128), /ph13/);
});

test('Bonus Challenge cards carry the game\'s stake, reward and net, by act', () => {
  for (const act of [1, 2, 3]) for (const id of Object.keys(S.BONUS_GOALS)) {
    const o = CW.objectiveData(id, act); assert.equal(o.stake, S.bonusStake(act)); assert.equal(o.back, S.bonusG(act)); assert.equal(o.net, S.bonusG(act) - S.bonusStake(act));
    const html = CW.objectiveCardHtml('objective', o);
    assert.ok(html.includes(`<b>${o.stake}</b>`) && html.includes(`<b>${o.back}</b>`) && html.includes(`+${o.net}`) && html.includes(o.rule) && html.includes('Stake') && html.includes('Reward'));
  }
  const view = S.bonusView(S.dealBonusGoal({ c: { seed: 1, act: 2, step: 1 }, hero: { gold: 0 } })); // too poor to stake: a free try
  const free = CW.objectiveCardHtml('objective', CW.objectiveFromView(view)); assert.match(free, /a free try/); assert.match(free, /nothing is lost/);
});

test('an offered bribe is worded by what judge() pays: done and won, won but not done, and team defeat (with the crooks clause)', () => {
  for (const act of [1, 2, 3]) {
    const G = S.gOf(act); const env = { act }; const mine = { id: 'slacker', mode: 'offer' };
    const t = S.rewardTerms(env, mine); const chips = S.rewardChips(env, mine);
    assert.deepEqual(t, { win: 2 * G, fail: Math.round(G / 2), crooks: Math.round(G / 2), honor: [Math.max(5, Math.round(G / 4 / 5) * 5), Math.max(5, Math.round(G / 2 / 5) * 5)] });
    assert.equal(chips.length, 3); assert.match(chips[0], new RegExp(`Done and won: ${2 * G} gold`)); assert.match(chips[1], /Won, not done: nothing/);
    assert.match(chips[2], new RegExp(`Team defeated: pay ${Math.round(G / 2)}, ${Math.round(G / 2)} more if every bribe was taken`));
    assert.ok(!chips.some((c) => /^Fail/.test(c)), 'the old ambiguous "Fail: pay" chip is gone');
    const html = CW.objectiveCardHtml('wager', { id: 'slacker', name: 'x', rule: 'y', terms: t });
    for (const k of ['Reward', 'Won, not done', 'Team defeated', 'Decline']) assert.ok(html.includes(k), k);
  }
  // the sums are the ones judge() pays: accepted, won and done = 2G; won not done = 0; team defeated = G/2 (and G/2 more from everyone when every offer was taken)
  const G = S.gOf(1); const rowOf = (name, dealt) => ({ r: 1, name, dealt, magic: 0, kills: [], blocked: 0, blk: 0, gold: 0, triples: 0, straight: null, N: 1, W: 1, E: 2, S: 1, C: 1, talents: 0, leader: false, target: 'e1', hp: 20, mp: 4, paid: 0 });
  const fighter = (name) => ({ name, magic0: 4, potions0: 2, potions: 2, stats: {}, points: 0, hp: 10, maxHp: 20, magic: 0, hero: { name, mind: {} } });
  const base = (done) => ({ secretLog: [rowOf('WizKid', 30), rowOf('Smalls', done ? 4 : 60)], enemies: [{ uid: 'e1', maxHp: 40 }], fighters: [fighter('WizKid'), fighter('Smalls')], rounds: 1 });
  const env = { act: 1, voice: 'the Lunch King', cards: { WizKid: { id: 'lead' }, Smalls: { id: 'slacker', mode: 'offer', accepted: true } }, answered: {} };
  const t = S.rewardTerms({ act: 1 }, { id: 'slacker', mode: 'offer' });
  const pay = (done, won) => S.judge(env, base(done), { won }).results.find((r) => r.name === 'Smalls').gold;
  assert.equal(pay(true, true), t.win, 'done and won');
  assert.equal(pay(false, true), 0, 'won but not done pays nothing and costs nothing');
  assert.equal(pay(true, false), -t.fail - t.crooks, 'team defeated: G/2, and G/2 more because the only offered bribe was taken');
  assert.equal(pay(false, false), -t.fail - t.crooks, 'team defeated costs the same whether or not it was done');
  assert.equal(t.win, 2 * G);
});

test('rewardChips is exported for the card, and the envelope view carries the structured terms only for an offer', () => {
  assert.equal(typeof S.rewardChips, 'function'); assert.equal(typeof S.rewardTerms, 'function');
  const hs = ['Ada', 'Bea', 'Cy'].map((name, i) => E.newHero({ name, cls: ['knight', 'wizard', 'bard'][i], seed: 7 + i })); for (const h of hs) h.campaign = hs[0].campaign;
  const env = S.dealEnvelopes({ c: hs[0].campaign, heroes: hs }); env.cards.Ada = { id: 'slacker', mode: 'offer' }; env.cards.Bea = { id: 'lead' };
  assert.ok(S.cardView(env, 'Ada').terms.win > 0); assert.equal(S.cardView(env, 'Bea').terms, null);
  assert.deepEqual(CW.envelopeCardParts(S.cardView(env, 'Ada'), false)[0], 'wager'); assert.equal(CW.envelopeCardParts(S.cardView(env, 'Bea'), false)[0], 'secret-objective');
  assert.equal(CW.envelopeCardParts({ id: 'nopotion', name: 'n', rule: 'r', stake: 10, gold: 30 }, true)[0], 'objective');
});

test('index.html links the card stylesheet (without it the cards render at full-screen size)', async () => {
  const { readFileSync } = await import('node:fs'); const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<link rel="stylesheet" href="css\/cards\.css\?v=[A-Za-z0-9]+">/);
});

test('objective fronts: every Objective and Secret Objective has a focus emblem and tint, the files exist, and the chip names the deck', async () => {
  const { existsSync } = await import('node:fs');
  const dir = new URL('../assets/cards/objectives/', import.meta.url);
  for (const id of [...Object.keys(S.BONUS_GOALS), ...Object.keys(S.CARDS)]) {
    assert.ok(CW.OBJ_FOCUS[id], `${id} has a focus`); const f = CW.objectiveFocus(id); assert.ok(CW.OBJ_TINT[f], `${id} tint`); assert.ok(existsSync(new URL(`emb-${f}.svg`, dir)), `emblem for ${f}`);
  }
  for (const f of ['front-objective-frame.webp', 'front-secret-objective-frame.webp']) assert.ok(existsSync(new URL(f, dir)), f);
  const obj = CW.objectiveCardHtml('objective', CW.objectiveData('nopotion', 2)); assert.match(obj, /class="chip">Objective</); assert.match(obj, /front-objective-frame/); assert.match(obj, /emb-heal\.svg/);
  const sec = CW.objectiveCardHtml('secret-objective', CW.secretData('thrice', 2)); assert.match(sec, /class="chip">Secret Objective</); assert.match(sec, /front-secret-objective-frame/);
  const w = CW.objectiveCardHtml('wager', { id: 'slacker', name: 'x', rule: 'y', terms: S.rewardTerms({ act: 2 }, { id: 'slacker', mode: 'offer' }) }); assert.match(w, /front-secret-objective-frame/, 'an offered bribe is a Secret Objective, not a third deck');
  assert.doesNotMatch(obj + sec + w, /WAGER|CHALLENGE|Payout/, 'the unsettled payout wording stays out');
});
