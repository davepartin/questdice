import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spacePos, roadPath, lastSpace, keepSpace } from '../js/g3/gameboard.js';

test('spaces are unique, inside the board, and the road winds', () => {
  const ps = Array.from({ length: 10 }, (_, i) => spacePos(i + 1, 10));
  const keys = new Set(ps.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`));
  assert.equal(keys.size, 10);
  for (const p of ps) { assert.ok(p.x > 0 && p.x < 100); assert.ok(p.y > 0 && p.y < 50); }
  assert.ok(ps[4].x > ps[0].x, 'first row goes right');
  assert.ok(ps[9].x < ps[5].x, 'second row comes back left');
  assert.ok(ps[5].y > ps[4].y, 'road drops a row');
  assert.match(roadPath(10), /^M/);
});

test('last space is remembered per party and act', () => {
  const m = new Map(); const store = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
  const h = [{ name: 'A' }, { name: 'B' }];
  assert.equal(lastSpace(h, 1, store), 0);
  keepSpace(h, 1, 4, store);
  assert.equal(lastSpace(h, 1, store), 4);
  assert.equal(lastSpace(h, 2, store), 0);
  assert.equal(lastSpace([{ name: 'A' }], 1, store), 0);
});

test('board screen uses the game board with pieces that slide', () => {
  const src = readFileSync(new URL('../js/g3/gameboard.js', import.meta.url), 'utf8');
  assert.match(src, /gb-piece/); assert.match(src, /gb-base/); assert.match(src, /moving/);
  const ui = readFileSync(new URL('../js/g3/scrui.js', import.meta.url), 'utf8');
  assert.match(ui, /class: 'sx-board gb-on'/); assert.match(ui, /gameBoard\(/);
});

test('pb2: hexes form a touching honeycomb snake over painted art', () => {
  const ps = Array.from({ length: 10 }, (_, i) => spacePos(i + 1, 10));
  for (let i = 1; i < 5; i++) assert.equal(+(ps[i].x - ps[i - 1].x).toFixed(2), 15);
  assert.equal(+(ps[4].x - ps[5].x).toFixed(2), -7.5, '5 and 6 touch across the rows');
  assert.ok(readFileSync(new URL('../assets/board/act1.webp', import.meta.url)).length < 250000);
  assert.match(readFileSync(new URL('../offline-files.json', import.meta.url), 'utf8'), /assets\/board\/act1\.webp/);
  const css = readFileSync(new URL('../css/gameboard.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /gb-road|gb-pines|gb-flag/);
});
