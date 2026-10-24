// Every script the game loads parses (a stray comment once swallowed the rest of a line in js/main.js and the page would not start;
// the rule tests import only engine modules, so they could not see it).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const files = []; const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.m?js$/.test(p)) files.push(p); } };
walk('js'); walk('tools'); walk('dev'); // the measuring tools too: the same stray comment once stopped a night of evaluations
test('every game script and tool parses', () => {
  const bad = [];
  for (const f of files) { try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { bad.push(`${f}: ${String(e.stderr).split('\n').slice(0, 4).join(' ')}`); } }
  assert.deepEqual(bad, []);
});

// A trailing `//` comment that still holds what reads as another entry of the same object ("// a note label: x ? 'a' : 'b', disabled: y,")
// swallowed two options of an online screen's button for a day (T09). Such a comment is a stray: use /* */ or move it to its own line.
test('no trailing comment swallows code on the same line', () => {
  const stray = [];
  for (const f of files) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/\/\//g)) {
        const before = line.slice(0, m.index);
        const open = (q) => before.split(q).length % 2 === 0; // inside a string at that point
        if (open("'") || open('"') || open('`') || /https?:$/.test(before)) continue;
        const c = line.slice(m.index + 2);
        if (!c.includes('{') && /\)\s+[a-zA-Z]+:\s[^/]{0,80}[,;]\s*$/.test(c)) stray.push(`${f}:${i + 1}: ${c.trim().slice(0, 80)}`);
        break;
      }
    });
  }
  assert.deepEqual(stray, []);
});
