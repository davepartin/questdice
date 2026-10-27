// Camp copy (Dave, 27 Oct 2026): the camp bar says Store (no Supplies page, no "moved" notice), the Heart card's wording, the talent notes.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
const scr = fs.readFileSync(new URL('../js/g3/scrui.js', import.meta.url), 'utf8'); const cb = fs.readFileSync(new URL('../js/g3/cardboard.js', import.meta.url), 'utf8');
test('camp bar: Store, not Supplies; no migration notice', () => {
  assert.match(scr, /\['store', 'Store'\]/); assert.doesNotMatch(scr, /\['supplies', 'Supplies'\]/);
  assert.doesNotMatch(scr, /are sold in the Camp Store now|Open the Camp Store|moved here from Camp/);
});
test('Heart card wording and talent notes', () => {
  assert.match(cb, /' boost to matching symbols on white strength dice'/); assert.match(cb, /' boost to matching weapon dice'/);
  assert.match(scr, /Max \$\{info\.same\} of the same power symbol per die\. Choose wisely\./); assert.match(scr, /Gives \+\$\{n\}/);
});
test('cp2: no bottom Store strip in camp; the camp picture does not make a layer above the hero chip', () => {
  const css = ['../css/screens.css', '../css/camp.css'].map((f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n');
  assert.doesNotMatch(scr, /sx-storebtn|storeBtn/); assert.doesNotMatch(css, /sx-storebtn/);
  assert.match(scr, /\['store', 'Store'\]/, 'the Store tab in the camp bar stays');
  assert.match(css, /\.cw-camp \.sx-viewport \{ z-index: auto; will-change: auto; \}/);
});
