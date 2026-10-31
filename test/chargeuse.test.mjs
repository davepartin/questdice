// mc6 (Dave): BUILD powers say CHARGE and USE everywhere, never Store / Release.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSES } from '../js/data.js';
import { effectLine, castPreview } from '../js/g3/powers.js';
import fs from 'node:fs';
test('every BUILD power reads charge / use, not store / release', () => {
  for (const c of Object.values(CLASSES)) for (const k of c.cards.filter((x) => x.kind === 'charge')) {
    assert.doesNotMatch(k.text, /\b(store|release)/i, k.name); assert.match(k.text, /Charge .*use/, k.name);
    const line = effectLine(k, { stored: 2 }); assert.doesNotMatch(line, /\b(store|release)/i, line); assert.match(line, /charged/);
    assert.doesNotMatch(castPreview(k, { magic: 5 }), /Store/);
  }
  const src = fs.readFileSync(new URL('../js/g3/magiccard.js', import.meta.url), 'utf8');
  assert.match(src, /'Charge', HK\.icon\('magic'\)/); assert.match(src, /`Use \$\{stored \|\| 0\}`/); assert.doesNotMatch(src, /`Release|STORED|store · release/);
});
