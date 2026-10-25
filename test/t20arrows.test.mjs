// T20: the arrow demonstration's numbers are checked against the real engine under the released rules (tools/t20-arrows.mjs throws on any mismatch).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('the released arrows resolve as the T20 demonstration says (Normal, Piercing, Fire, Frost; numbered faces do nothing special)', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/t20-arrows.mjs', import.meta.url))], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Fire at a lone boss/); assert.match(r.stdout, /Frost, monster first/);
});
