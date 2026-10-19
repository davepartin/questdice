// Screens hand each other their functions through bind(): ui.js gives online.js and scrui.js an X with showTitle, showStories...
// A function a screen calls but ui.js never handed over only fails when tapped ("Open a table" did nothing, Oct 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync(new URL('../js/ui.js', import.meta.url), 'utf8');
const handed = (name) => {
  const start = ui.indexOf(`${name}.bind({`); assert.ok(start >= 0, `ui.js binds ${name}`);
  let depth = 0; let i = ui.indexOf('{', start);
  for (const from = i; i < ui.length; i++) { if (ui[i] === '{') depth++; else if (ui[i] === '}' && --depth === 0) break; void from; }
  const body = ui.slice(ui.indexOf('{', start) + 1, i).replace(/\/\/[^\n]*/g, '');
  const keys = new Set();
  // top-level keys only: shorthand (S,), key: value, get key()
  let d = 0; let tok = '';
  for (const ch of body) {
    if ('({['.includes(ch)) d++; else if (')}]'.includes(ch)) d--;
    if (d === 0 && ch === ',') { const m = tok.trim().match(/^(?:get\s+)?([A-Za-z_$][\w$]*)/); if (m) keys.add(m[1]); tok = ''; } else tok += ch;
  }
  const m = tok.trim().match(/^(?:get\s+)?([A-Za-z_$][\w$]*)/); if (m) keys.add(m[1]);
  return keys;
};
const used = (file) => new Set([...fs.readFileSync(new URL(file, import.meta.url), 'utf8').matchAll(/\bX\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));

for (const [name, file] of [['Online', '../js/g3/online.js'], ['SCRUI', '../js/g3/scrui.js']]) {
  test(`every X.function ${file.split('/').pop()} calls is handed over by ui.js`, () => {
    const have = handed(name);
    const missing = [...used(file)].filter((k) => !have.has(k));
    assert.deepEqual(missing, [], `${name}.bind in ui.js is missing: ${missing.join(', ')}`);
  });
}
