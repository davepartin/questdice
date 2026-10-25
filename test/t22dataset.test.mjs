// T22: the committed weapon dataset is the engine's own numbers (regenerate with: node tools/t22-dataset.mjs --write).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
const { json, FILE } = await import('../tools/t22-dataset.mjs');
test('the weapon dataset matches what the engine plays, every weapon has a die of exactly its size, and block-leaning shields lead with blue', () => {
  assert.equal(fs.readFileSync(FILE, 'utf8'), json, 'regenerate the dataset after changing a face table');
  const d = JSON.parse(json); assert.equal(Object.keys(d.weapons).length, 8);
  for (const w of Object.values(d.weapons)) for (const [k, faces] of Object.entries(w.faces)) assert.equal(faces.length, +k.split(':').pop(), `${w.name} ${k}`);
  for (const id of ['shield', 'tower']) assert.ok(d.weapons[id].faces['Bronze:10'].filter((f) => f.c === 'b').length > 5, `${id} is mostly blue`);
});
