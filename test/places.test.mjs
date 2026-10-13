import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTS, placeSlug, placeLook, PLACE_ALIAS } from '../js/data.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('every campaign place maps to a painted backdrop', () => {
  const names = ACTS.flatMap((a) => a.places);
  assert.equal(names.length, 25);
  const slugs = new Set();
  for (const name of names) {
    const look = placeLook(name);
    assert.ok(look.slug, `${name} has a slug`);
    assert.equal(look.slug, PLACE_ALIAS[placeSlug(name)] || placeSlug(name));
    assert.ok(existsSync(join(root, look.url)), `${name} → ${look.url}`);
    slugs.add(look.slug);
  }
  assert.equal(slugs.size, 25, 'all 25 slugs are distinct and resolve');
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
  assert.equal(placeLook('Kindling Steps').weather, 'ember');
  assert.equal(placeLook('The Ember Throne').weather, 'ember');
  assert.equal(placeLook('Ember Throne slopes').slug, 'ember-throne-slopes');
  assert.equal(placeLook('The Ember Throne slopes').slug, 'ember-throne-slopes');
  assert.equal(placeLook('gallows-hill').slug, 'gallows-hill');
});

test('Act 3 pins Brazen Bridge, Oathbreak Keep and the Ember Throne', () => {
  const a = ACTS[2];
  assert.equal(a.name, 'The Ember Peaks');
  assert.equal(a.places.length, 9);
  assert.equal(a.gates[5].place, 'The Brazen Bridge');
  assert.deepEqual(a.gates[5].enemies, ['vharaxis']);
  assert.equal(a.gates[5].kind, 'elite');
  assert.equal(a.gates[7].place, 'Oathbreak Keep');
  assert.deepEqual(a.gates[7].enemies, ['fallenchampion']);
  assert.equal(a.gates[7].kind, 'boss');
  assert.equal(a.gates[9].place, 'Ember Throne slopes');
  assert.equal(a.gates[10].place, 'The Ember Throne');
  assert.deepEqual(a.boss, ['vharaxis']);
});
