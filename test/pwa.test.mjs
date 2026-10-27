import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { offlineList } from '../tools/offline-list.mjs';
const root = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('manifest is installable: name, standalone, start URL and icons that exist', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.display, 'standalone'); assert.ok(m.name && m.start_url && m.scope);
  const sizes = m.icons.map((i) => i.sizes); assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(root, i.src)), i.src);
  assert.match(read('index.html'), /<link rel="manifest" href="manifest\.webmanifest">/);
});
test('service worker carries the stamped build and never touches other sites, the API, previews or non-GET', () => {
  const html = read('index.html'); const build = html.match(/main\.js\?v=([A-Za-z0-9]+)/)[1];
  const sw = read('sw.js'); assert.equal(sw.match(/const BUILD = '([^']*)'/)[1], build, 'tools/stamp.mjs keeps sw.js in step with the import map');
  for (const needle of ["req.method !== 'GET'", "url.origin !== SCOPE.origin", "rel.startsWith('api/')", "rel.startsWith('preview/')", "headers.has('range')"]) assert.ok(sw.includes(needle), needle);
});
test('the offline list covers every module, stylesheet and icon of this build, and all art', () => {
  const l = offlineList(); const have = new Set(l.files.map((f) => f.u)); const html = read('index.html');
  assert.equal(l.build, html.match(/main\.js\?v=([A-Za-z0-9]+)/)[1]);
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for (const [k, v] of Object.entries(map)) if (k.startsWith('./')) assert.ok(have.has(v.replace(/^\.\//, '')), v);
  for (const m of html.matchAll(/href="(css\/[^"]+\?v=[A-Za-z0-9]+)"/g)) assert.ok(have.has(m[1]), m[1]);
  assert.ok(have.has('vendor/three/build/three.module.js')); assert.ok(have.has('assets/brand/icon-512.png'));
  assert.ok([...have].some((u) => u.startsWith('assets/miniatures/')) && [...have].some((u) => u.startsWith('assets/cards/')));
  for (const f of l.files) assert.ok(fs.existsSync(path.join(root, f.u.split('?')[0])), `${f.u} exists`);
  assert.equal(JSON.parse(read('offline-files.json')).build, l.build, 'offline-files.json is current: run node tools/stamp.mjs');
});
test('version.json names the stamped build and the worker never saves it', () => {
  const build = read('index.html').match(/main\.js\?v=([A-Za-z0-9]+)/)[1];
  assert.equal(JSON.parse(read('version.json')).build, build, 'run node tools/stamp.mjs');
  assert.ok(read('sw.js').includes("rel === 'version.json'"));
  assert.match(read('js/pwa.js'), /fetch\('version\.json', \{ cache: 'no-store' \}\)/);
});
test('graphics settings: saved on the device, the address wins, saver forces Low, Auto avoids High on phones', async () => {
  const mem = new Map(); globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  globalThis.location = { search: '' }; Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A135F) Mobile', hardwareConcurrency: 8, deviceMemory: 4 }, configurable: true });
  const S = await import('../js/gfx/settings.js');
  assert.deepEqual(S.getGfx(), { q: 'auto', saver: false });
  assert.equal(S.chosenQuality(), 'low', 'an 8-core Android with 4 GB starts on Low');
  navigator.hardwareConcurrency = 8; navigator.deviceMemory = 8; assert.equal(S.autoQuality(), 'med');
  S.setGfx({ q: 'high' }); assert.equal(S.chosenQuality(), 'high'); assert.equal(S.getGfx().q, 'high');
  S.setGfx({ saver: true }); assert.equal(S.batterySaver(), true); assert.equal(S.chosenQuality(), 'low', 'Battery saver means Low');
  location.search = '?q=med'; assert.equal(S.chosenQuality(), 'med', 'the address wins'); location.search = '?saver=0'; assert.equal(S.batterySaver(), false);
  mem.set('qd.gfx', '{bad json'); location.search = ''; assert.deepEqual(S.getGfx(), { q: 'auto', saver: false }, 'a damaged setting falls back to Auto');
  navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile'; navigator.hardwareConcurrency = 6; assert.equal(S.autoQuality(), 'med');
  navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0) Chrome'; assert.equal(S.autoQuality(), 'high');
});
