// Build 20261026pc1 (Dave, 26 Oct 2026, live): talent face 4 starts empty and costs 10; one shared price chip; the spoils show the real card.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import { migrateHero } from '../js/save.js';
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const CLS = Object.keys(D.CLASS_TALENT);
// a hero as newHero made it before 26 Oct 2026: face 4 of both talent dice pre-filled with the class symbol
const oldHero = (cls) => { const h = E.newHero({ name: `Old${cls}`, cls, seed: 1 }); h.talent = { SW: [[D.CLASS_TALENT[cls].SW]], SE: [[D.CLASS_TALENT[cls].SE]] }; return h; };

test('talent face 4 costs 10; faces 5-10 keep 10 x face', () => {
  assert.equal(D.talentFaceCost(4), 10);
  for (const n of [5, 6, 7, 8, 9, 10]) assert.equal(D.talentFaceCost(n), 10 * n);
  const h = E.newHero({ name: 'F', cls: 'wizard', seed: 2 }); h.gold = 100;
  assert.ok(E.addTalent(h, 'SW', 0, 'magic')); assert.equal(h.gold, 90);
});
test('a new hero of every class starts with face 4 EMPTY on both talent dice', () => {
  for (const cls of CLS) { const h = E.newHero({ name: `N${cls}`, cls, seed: 3 });
    for (const s of ['SW', 'SE']) { assert.equal(E.specialFace(h, s, 4), null, `${cls} ${s}`); assert.equal((h.talent[s] || []).flat().length, 0); } }
});
test('unlocking Talent Two opens with face 4 empty, also on a hero made before the change; the player fills it for 10', () => {
  for (const cls of CLS) { const h = oldHero(cls); h.gold = 100; assert.ok(!E.isActive(h, 'SE'));
    assert.ok(E.unlockDie(h, 'SE')); assert.equal(h.gold, 100 - D.UNLOCK_COST.SE);
    assert.equal(E.specialFace(h, 'SE', 4), null, cls);
    assert.ok(E.addTalent(h, 'SE', 0, 'gold')); assert.equal(h.gold, 100 - D.UNLOCK_COST.SE - 10); assert.deepEqual(h.talent.SE[0], ['gold']); }
});
test('loading an old save: a LOCKED talent die loses the auto face 4; an unlocked die and any player choice are kept', () => {
  const a = migrateHero(oldHero('wizard')); assert.deepEqual(a.talent.SE, [[]]); assert.deepEqual(a.talent.SW, [['magic']], 'Talent One is unlocked: kept');
  const b = oldHero('wizard'); b.dice.push('SE'); migrateHero(b); assert.deepEqual(b.talent.SE, [['heal']], 'already unlocked: the face is the player\'s now');
  const c = oldHero('wizard'); c.talent.SE = [['atk']]; migrateHero(c); assert.deepEqual(c.talent.SE, [['atk']], 'not the class symbol: a choice');
  const d = oldHero('knight'); d.special.SE = 6; d.talent.SE = [['atk'], ['block'], []]; migrateHero(d); assert.deepEqual(d.talent.SE, [['atk'], ['block'], []], 'more faces set: kept');
  const e = migrateHero(migrateHero(oldHero('bard'))); assert.deepEqual(e.talent.SE, [[]], 'loading twice changes nothing more');
  const f = oldHero('dwarf'); f.dice = null; migrateHero(f); assert.deepEqual(f.talent.SE, [['heal']], 'every-die heroes keep theirs');
});
test('one shared price chip: price.js + css/price.css, linked, used for every gold cost on the camp, store, spoils and card', () => {
  assert.match(read('js/g3/price.js'), /export function priceChip/);
  assert.match(read('index.html'), /css\/price\.css\?v=/);
  const css = read('css/price.css'); assert.match(css, /\.qd-price\{/); assert.match(css, /\.qd-price\.poor b\{color:#/);
  const ui = read('js/g3/scrui.js'), cb = read('js/g3/cardboard.js'), cw = read('js/g3/cards.js');
  assert.doesNotMatch(ui, /class: 'cw-price' \}, ico\('coin'\)/, 'grid tile'); assert.doesNotMatch(ui, /sh-buy-p' \}, ico\('coin'\)/, 'Add this die / shBuy');
  assert.doesNotMatch(ui, /btn\(`Sell \$\{/, 'spoils Sell'); assert.doesNotMatch(ui, /icon: 'coin', iconAfter: !!label/, 'Forge priceBtn');
  assert.match(cb, /priceChip\(price, \{ poor \}\)/, 'store tag'); assert.doesNotMatch(cb, /cst-coin/, 'store tag coin');
  assert.doesNotMatch(cw, /<i class="coin"><\/i><b>\$\{d\.money\}/, 'weapon card sell badge');
});
test('the spoils show the real camp weapon card (cardboard weaponCard), tap opens the large card, no size label', () => {
  const ui = read('js/g3/scrui.js'); const fn = ui.slice(ui.indexOf('function spoilsView'), ui.indexOf('// ---- the daily challenge'));
  assert.match(fn, /CB\.weaponCard\(/); assert.ok(fn.includes('showWeaponCard(inst, money, { real: true })')); assert.doesNotMatch(fn, /CW\.weaponCardEl\(d\)/);
});
