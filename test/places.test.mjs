import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTS, placeSlug, placeLook } from '../js/data.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('every campaign place maps to a painted backdrop', () => {
  const names = ACTS.flatMap((a) => a.places);
  assert.equal(names.length, 16);
  const slugs = new Set();
  for (const name of names) {
    const look = placeLook(name);
    assert.ok(look.slug, `${name} has a slug`);
    assert.equal(look.slug, placeSlug(name));
    assert.ok(existsSync(join(root, look.url)), `${name} → ${look.url}`);
    slugs.add(look.slug);
  }
  assert.equal(slugs.size, 16, 'all 16 slugs are distinct and resolve');
});

test('place slugs drop apostrophes and turn spaces into hyphens', () => {
  assert.equal(placeSlug("Ravens’ Rest"), 'ravens-rest');
  assert.equal(placeSlug("Mourner’s Row"), 'mourners-row');
  assert.equal(placeSlug('Grave-Silk Hall'), 'grave-silk-hall');
  assert.equal(placeSlug('The Drowned Crypt'), 'the-drowned-crypt');
  assert.equal(placeSlug('Burnt Orchard'), 'burnt-orchard');
  assert.equal(placeLook('').slug, '');
  assert.equal(placeLook('Nowhere-in-Particular').url, '');
  assert.equal(placeLook('Burnt Orchard').weather, 'ash');
  assert.equal(placeLook('Candle Vault').weather, 'crypt');
  assert.equal(placeLook('gallows-hill').slug, 'gallows-hill');
});
