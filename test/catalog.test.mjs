import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { CLASSES, HERO_LOOKS, MONSTERS } from '../js/data.js';
import { monsterOf } from '../js/campaigns.js';
import { makeRng, newHero, newBattle } from '../js/engine.js';
import { loadCatalog, renderMinisMd } from '../tools/minis-md.mjs';

const NEW_IDS = [
  'treant', 'puffball', 'raincloud', 'bonfire', 'wisp', 'lampsnuffer', 'moonjelly',
  'visitor', 'hedgeboar', 'silkwood', 'gargoyle', 'yeti', 'direbear', 'tuskraider',
  'tuskwarlord', 'barrowrider', 'stormtyrant', 'hivedrone', 'hivequeen', 'nightblade',
  'basilisk', 'slagcolossus', 'frostgiant',
];

const cat = loadCatalog();
const byId = Object.fromEntries((cat.minis || []).map((m) => [m.id, m]));

test('catalog covers every monster and every hero look', () => {
  const monsters = (cat.minis || []).filter((m) => m.kind === 'monster');
  const heroes = (cat.minis || []).filter((m) => m.kind === 'hero');
  assert.equal(Object.keys(MONSTERS).length, 50);
  assert.equal(monsters.length, 50);
  for (const id of Object.keys(MONSTERS)) {
    const entry = byId[id];
    assert.ok(entry, `catalog missing monster ${id}`);
    assert.equal(entry.kind, 'monster');
    assert.equal(entry.image, MONSTERS[id].img);
  }
  let looks = 0;
  for (const [cls, list] of Object.entries(HERO_LOOKS)) {
    for (const look of list) {
      looks += 1;
      const id = `${cls}-${look.id}`;
      const entry = byId[id];
      assert.ok(entry, `catalog missing hero ${id}`);
      assert.equal(entry.kind, 'hero');
      assert.equal(entry.class, cls);
      assert.equal(entry.lookId, look.id);
      assert.equal(entry.image, look.img);
      assert.equal(entry.statsFrom, cls);
    }
  }
  assert.equal(heroes.length, looks);
  assert.equal(looks, 15);
});

test('every catalog image exists on disk', () => {
  for (const m of cat.minis) {
    assert.ok(m.image, `${m.id} image`);
    assert.ok(fs.existsSync(m.image), `${m.id} missing ${m.image}`);
  }
  for (const id of NEW_IDS) {
    assert.ok(fs.existsSync(`assets/miniatures/${id}.webp`), `${id}.webp`);
    assert.ok(fs.existsSync(`assets/miniatures/src/${id}.png`), `${id} src png`);
  }
});

test('docs/MINIS.md stays generated from the catalog', () => {
  const expected = renderMinisMd(cat);
  const onDisk = fs.readFileSync('docs/MINIS.md', 'utf8');
  assert.equal(onDisk, expected);
  const regen = spawnSync(process.execPath, ['tools/minis-md.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(regen.status, 0, regen.stderr);
  assert.equal(regen.stdout, expected);
});

test('every catalog entry has the fields a writer needs', () => {
  const families = new Set(['beast', 'undead', 'folk', 'dragon', 'elemental', 'plant', 'shadow', 'otherworldly', 'giant', 'construct', 'hero']);
  const tones = new Set(['fierce', 'comic']);
  const sizes = new Set(['small', 'medium', 'large', 'huge']);
  const roles = new Set(['minion', 'elite', 'boss', 'hero']);
  for (const m of cat.minis) {
    assert.ok(m.title && !/[{}]/.test(m.title), `${m.id} title`);
    const sentences = m.description.split(/[.!?](?:\s|$)/).filter((s) => s.trim());
    assert.ok(sentences.length >= 3 && sentences.length <= 6, `${m.id} description sentences ${sentences.length}`);
    assert.ok(families.has(m.family), `${m.id} family ${m.family}`);
    assert.ok(tones.has(m.tone), `${m.id} tone`);
    assert.ok(sizes.has(m.size), `${m.id} size`);
    assert.ok(roles.has(m.role), `${m.id} role`);
    assert.ok(m.statsFrom, `${m.id} statsFrom`);
    assert.ok(m.reskinAs?.length >= 3 && m.reskinAs.length <= 5, `${m.id} reskinAs`);
    assert.ok(m.names?.length, `${m.id} names`);
    if (m.kind === 'monster') {
      assert.equal(m.role, MONSTERS[m.id].tier);
      assert.ok(MONSTERS[m.statsFrom] || CLASSES[m.statsFrom], `${m.id} statsFrom ${m.statsFrom}`);
    } else {
      assert.ok(CLASSES[m.statsFrom], `${m.id} class`);
    }
  }
});

test('every new monster loads in a fight, looks left, and is not mirrored', () => {
  const quest = (enemies) => ({ enemies, hpMult: 1, flat: 0, rewardMult: 1, kind: 'battle', perilous: false });
  for (const id of NEW_IDS) {
    const m = MONSTERS[id];
    assert.ok(m, id);
    assert.equal(m.look, 'left');
    assert.equal(m.faces.length, 6);
    const h = newHero({ name: 'K', cls: 'knight', seed: 1, full: true });
    const b = newBattle(h, quest([id]), makeRng(5));
    assert.equal(b.enemies[0].id, id);
    assert.ok(b.enemies[0].hp > 0, `${id} hp`);
    assert.equal(b.enemies[0].name, m.name);
  }
  assert.equal(monsterOf('tuskwarlord').adds, 'tuskraider');
  assert.equal(monsterOf('hivequeen').adds, 'hivedrone');
  assert.equal(monsterOf('lampsnuffer').adds, 'wisp');
  assert.equal(MONSTERS.puffball.wander, false);
  assert.equal(MONSTERS.moonjelly.wander, false);
  assert.equal(MONSTERS.yeti.wander, false);
});
