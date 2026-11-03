import test from 'node:test';
import assert from 'node:assert/strict';
import { newHero } from '../js/engine.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';

test('Act I pays a welcome purse on its first two fights and nothing after', () => {
  const h = newHero({ name: 'W', cls: 'bard', seed: 11, full: true });
  const at = (act, step) => { h.campaign.act = act; h.campaign.step = step; return E.welcomeGold(h); };
  assert.equal(at(1, 1), D.WELCOME_GOLD[0]);
  assert.equal(at(1, 2), D.WELCOME_GOLD[1]);
  assert.equal(at(1, 3), 0);
  assert.equal(at(2, 1), 0);
  assert.equal(at(3, 2), 0);
});
