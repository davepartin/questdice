// T20: the ammunition wording (camp card and battle banner) follows the arrow rules actually in play.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyRelease } from '../js/release.js';
import { WEAPONS2 } from '../js/data.js';
import { ammoLine, arrowBannerSub } from '../js/ammotext.js';

test('released rules: Piercing sends the whole arrow hit through, Fire splashes the hand\'s whole Strength, Frost softens the next blow by it', () => {
  applyRelease(); const R = WEAPONS2.arrowRules;
  assert.deepEqual(R, { pierce: 'all', frost: 'strength', fire: 'full' });
  assert.match(ammoLine('pierce', R), /whole arrow hit goes through block/); assert.match(ammoLine('fire', R), /Strength splashes on every other monster/); assert.match(ammoLine('frost', R), /softened by your hand’s Strength/);
  for (const k of ['pierce', 'fire', 'frost']) assert.ok(!/half|halves/i.test(ammoLine(k, R)), `${k} says nothing about halving`);
  assert.equal(arrowBannerSub({ kind: 'frost', n: 4 }, R), '4 softer next blow'); assert.equal(arrowBannerSub({ kind: 'fire', n: 4 }, R), '4 to the others'); assert.equal(arrowBannerSub({ kind: 'fire', n: 0 }, R), 'too weak to spread'); assert.equal(arrowBannerSub({ kind: 'pierce', n: 6 }, R), '6 pierce');
});
test('the older test rules still read as they are (the lab and tools can switch them back)', () => {
  const old = { pierce: 'strength', frost: 'half', fire: 'half' };
  assert.match(ammoLine('fire', old), /half your hand’s Strength/); assert.match(ammoLine('frost', old), /halves its next blow/); assert.equal(arrowBannerSub({ kind: 'frost', n: 4 }, old), 'halves its next blow');
});
test('the screens take their wording from it, not from a copy of the old text', () => {
  const scr = fs.readFileSync(new URL('../js/g3/scrui.js', import.meta.url), 'utf8'); const hud = fs.readFileSync(new URL('../js/g3/hudkit.js', import.meta.url), 'utf8');
  assert.match(scr, /ammoLine\(k, D\.WEAPONS2\.arrowRules\)/); assert.match(hud, /arrowBannerSub\(a, WEAPONS2\.arrowRules\)/);
  for (const t of [scr, hud]) assert.ok(!/half splashes|halves its next blow/.test(t), 'no hard-coded old wording left');
});
