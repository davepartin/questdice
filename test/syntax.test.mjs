// Every script the game loads parses (a stray comment once swallowed the rest of a line in js/main.js and the page would not start;
// the rule tests import only engine modules, so they could not see it).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const files = []; const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } };
walk('js');
test('every game script parses', () => {
  const bad = [];
  for (const f of files) { try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { bad.push(`${f}: ${String(e.stderr).split('\n').slice(0, 4).join(' ')}`); } }
  assert.deepEqual(bad, []);
});
