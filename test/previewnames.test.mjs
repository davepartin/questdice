// T17: every preview folder gets its own saves (separate from the live game, the lab and each other); the two earliest previews keep their shared set.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const load = async (pathname, search = '') => { globalThis.location = { pathname, search }; try { return await import(`../js/lab.js?at=${encodeURIComponent(pathname + search)}`); } finally { delete globalThis.location; } };

test('the names: live and lab as before; battle-report and cards keep "preview"; any other preview folder is its own namespace', async () => {
  const live = await load('/questdice/'); const lab = await load('/questdice/', '?lab');
  const br = await load('/questdice/preview/battle-report/'); const cards = await load('/questdice/preview/cards/'); const ws = await load('/questdice/preview/weapon-size/'); const other = await load('/questdice/preview/Some_Thing/');
  assert.equal(live.SANDBOX_NAME, ''); assert.equal(lab.SANDBOX_NAME, 'lab');
  assert.equal(br.SANDBOX_NAME, 'preview'); assert.equal(cards.SANDBOX_NAME, 'preview', 'the two earliest previews keep sharing their saved heroes and reports');
  assert.equal(ws.SANDBOX_NAME, 'preview-weapon-size'); assert.equal(ws.PREVIEW_NAME, 'weapon-size');
  assert.equal(other.SANDBOX_NAME, 'preview-some-thing', 'a folder name is made safe for a storage key');
  const keys = [live, lab, br, ws].map((m) => m.keyOf('questdice.hero.'));
  assert.equal(new Set(keys).size, 4, `four different hero key prefixes: ${keys.join(' | ')}`);
  assert.equal(ws.keyOf('questdice.hero.'), 'questdice.preview-weapon-size.hero.'); assert.equal(ws.keyOf('qd.daily'), 'qd.preview-weapon-size.daily');
  assert.equal(br.keyOf('questdice.hero.'), 'questdice.preview.hero.', 'unchanged for the existing previews');
});

// A real run of the save module in a child process (the modules read the page's location once at import): seed every namespace, create a hero,
// and check what was written. The seeded values must be byte-identical afterwards and only the right namespace may gain keys.
const run = (pathname, search = '') => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `
  const store = new Map(); const ls = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); }, get length() { return store.size; }, key: (i) => [...store.keys()][i] };
  globalThis.window = { localStorage: ls }; globalThis.localStorage = ls; globalThis.location = { pathname: ${JSON.stringify(pathname)}, search: ${JSON.stringify(search)} };
  const seed = { 'questdice.hero.live': 'LIVE', 'questdice.lab.hero.lab': 'LAB', 'questdice.preview.hero.old': 'OLDPREVIEW', 'questdice.preview-other.hero.x': 'OTHER', 'qd.daily': 'LIVEDAILY', 'questdice.battlereports': 'LIVEREPORTS' };
  for (const [k, v] of Object.entries(seed)) ls.setItem(k, v);
  const E = await import('./js/engine.js'); const SV = await import('./js/save.js');
  const h = E.newHero({ name: 'Iso', cls: 'knight', seed: 1 }); await SV.createSave(h, 'pw12');
  const written = [...store.keys()].filter((k) => !(k in seed)).sort();
  const changed = Object.keys(seed).filter((k) => store.get(k) !== seed[k]);
  console.log(JSON.stringify({ written, changed }));
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' }).trim().split('\n').pop());

test('a hero made in the weapon-size preview is written only under its own namespace; every other namespace is untouched', () => {
  const r = run('/questdice/preview/weapon-size/');
  assert.deepEqual(r.changed, [], 'no seeded value (live, lab, old preview, another preview) changed');
  assert.ok(r.written.length > 0 && r.written.every((k) => k.startsWith('questdice.preview-weapon-size.')), `only the new namespace gained keys: ${r.written.join(', ')}`);
});

test('the same run in the live game, the lab and the existing previews writes where it always did', () => {
  const live = run('/questdice/'); assert.deepEqual(live.changed, []); assert.ok(live.written.every((k) => k.startsWith('questdice.hero.') || k.startsWith('questdice.epoch')), live.written.join(', '));
  const lab = run('/questdice/', '?lab'); assert.deepEqual(lab.changed, []); assert.ok(lab.written.every((k) => k.startsWith('questdice.lab.')), lab.written.join(', '));
  const old = run('/questdice/preview/cards/'); assert.deepEqual(old.changed, []); assert.ok(old.written.every((k) => k.startsWith('questdice.preview.')), old.written.join(', '));
});
