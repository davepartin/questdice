// Pull writer copy out of campaign markdown and write js/packs/*.js
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const here = path.resolve(import.meta.dirname, '..');
const UPLOADS = '/home/ubuntu/.cursor/projects/workspace/uploads';

function findMd(...names) {
  for (const n of names) {
    for (const root of [UPLOADS, path.join(here, 'docs')]) {
      const p = path.join(root, n);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

function jsBlocks(md) {
  const out = [];
  const re = /```js\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md))) out.push(m[1].trim().replace(/,?\s*$/, ''));
  return out;
}
function asObject(src) {
  return new Function(`return ({${src}});`)();
}
function asNumbered(src) {
  const obj = asObject(src);
  const max = Math.max(...Object.keys(obj).map(Number));
  return Array.from({ length: max }, (_, i) => obj[i + 1]);
}
function asArray(src) {
  return new Function(`return (${src});`)();
}

function dump(value, indent = 0) {
  const pad = '  '.repeat(indent);
  if (value == null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    const items = value.map((v) => dump(v, indent + 1));
    const one = items.every((s) => !s.includes('\n') && s.length < 80) && items.join(', ').length < 100;
    if (one) return `[${items.join(', ')}]`;
    return `[\n${items.map((s) => `${pad}  ${s}`).join(',\n')},\n${pad}]`;
  }
  const keys = Object.keys(value);
  if (!keys.length) return '{}';
  const lines = keys.map((k) => {
    const key = /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : JSON.stringify(k);
    return `${pad}  ${key}: ${dump(value[k], indent + 1)}`;
  });
  return `{\n${lines.join(',\n')},\n${pad}}`;
}

function ingest(mdPath, { id } = {}) {
  const md = readFileSync(mdPath, 'utf8');
  const blocks = jsBlocks(md);
  if (blocks.length < 7) throw new Error(`${mdPath}: expected 7 js blocks, got ${blocks.length}`);
  const beats = { ...asObject(blocks[0]), ...asObject(blocks[2]), ...asObject(blocks[4]) };
  const steps = [asNumbered(blocks[1]), asNumbered(blocks[3]), asNumbered(blocks[5])];
  const actsSrc = blocks[6].replace(/^acts:\s*/, '');
  const acts = asArray(actsSrc);
  return { id, beats, steps, acts };
}

// Writer md still lists some minis by their Dawn ids; painted sheets have their own ids.
function remapFoe(data, { name, from = 'vharaxis', to }) {
  for (const act of data.steps) {
    for (const row of act) {
      if (row.names?.[0] === name && row.foes?.[0] === from) row.foes = [to];
    }
  }
  for (const act of data.acts) {
    for (let i = 0; i < (act.fights || []).length; i++) {
      if (act.names?.[i]?.[0] === name && act.fights[i]?.[0] === from) act.fights[i] = [to];
    }
    for (const g of Object.values(act.gates || {})) {
      if (g.enemies?.[0] === from && (act.names || []).some((n) => n?.[0] === name)) g.enemies = [to];
    }
  }
}

function applyDuoRemaps(rival, ballad) {
  const mungo = ballad.steps[0][4];
  if (mungo?.names?.[0] === 'Mungo') {
    mungo.foes = ['mungo'];
    ballad.acts[0].fights[4] = ['mungo'];
  }
  remapFoe(rival, { name: 'Duchess Goldbelly', to: 'goldbelly' });
  remapFoe(ballad, { name: 'The Dowager Blazemorrow', to: 'blazemorrow' });
}

// Nice-to-have minis not painted yet: drop Marmalade / Captain Squawk cameos (with fightHp bumps)
// and swap Grumbletusk / Bertha copy to match the ogre / Ashmaw stand-ins.
function applyCloverFallbacks(data) {
  const a2s6 = data.steps[1][5];
  a2s6.foes = ['wraith'];
  a2s6.names = ['Mournful Mabel'];
  a2s6.arrive = a2s6.arrive.slice(0, 1);
  a2s6.win = a2s6.win.slice(0, 1);
  data.acts[1].fights[5] = ['wraith'];
  data.acts[1].names[5] = ['Mournful Mabel'];
  data.acts[1].fightHp = { ...data.acts[1].fightHp, 6: 1.6 };

  const a3s3 = data.steps[2][2];
  a3s3.foes = ['magpies'];
  a3s3.names = ['the Mine Gang'];
  a3s3.arrive = a3s3.arrive.slice(0, 1);
  a3s3.win = a3s3.win.slice(0, 1);
  data.acts[2].fights[2] = ['magpies'];
  data.acts[2].names[2] = ['the Mine Gang'];
  data.acts[2].fightHp = { ...data.acts[2].fightHp, 3: 1.5 };

  const swap = (s) => String(s)
    .replace(/an enormous badger/g, 'an enormous hill ogre')
    .replace(/Big claws/g, 'Big fists')
    .replace(/his claws/g, 'his fists')
    .replace(/in the fur behind his ear/g, 'behind his ear')
    .replace(/backs into his hole/g, 'backs down the bank')
    .replace(/a great eagle/g, 'a great wyrm')
    .replace(/Eagles/g, 'Wyrms');
  const walk = (v) => {
    if (typeof v === 'string') return swap(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) v[k] = walk(v[k]);
    }
    return v;
  };
  walk(data.beats);
  walk(data.steps);
}

mkdirSync(path.join(here, 'js/packs'), { recursive: true });
function writePack(name, data) {
  const body = `// Writer copy for the ${data.id} pack. Generated from the campaign markdown; edit the source file, not this one.\n`
    + `export const beats = ${dump(data.beats)};\n\n`
    + `export const steps = ${dump(data.steps)};\n\n`
    + `export const actSpecs = ${dump(data.acts)};\n`;
  writeFileSync(path.join(here, `js/packs/${name}.js`), body);
  console.log(name, 'beats', Object.keys(data.beats).length, 'steps', data.steps.map((a) => a.length).join(','), 'acts', data.acts.length);
}

const PACKS = [
  {
    name: 'rivalduo',
    id: 'rivalduo',
    md: () => findMd('RIVAL_DUO_5b26.md', 'RIVAL_DUO.md'),
  },
  {
    name: 'ballad',
    id: 'ballad',
    md: () => findMd('THATS_NOT_HOW_IT_WENT_2fb9.md', 'THATS_NOT_HOW_IT_WENT.md'),
  },
  {
    name: 'cloverheist',
    id: 'cloverheist',
    md: () => findMd('CLOVER_HEIST_1e76.md', 'CLOVER_HEIST.md'),
    after: applyCloverFallbacks,
  },
];

const loaded = {};
for (const spec of PACKS) {
  const mdPath = spec.md();
  if (!mdPath) {
    if (existsSync(path.join(here, `js/packs/${spec.name}.js`))) {
      console.log('skip', spec.name, '(no markdown; keeping existing pack)');
      continue;
    }
    throw new Error(`no markdown for ${spec.name}`);
  }
  const data = ingest(mdPath, { id: spec.id });
  loaded[spec.name] = data;
  spec.after?.(data);
}
if (loaded.rivalduo && loaded.ballad) applyDuoRemaps(loaded.rivalduo, loaded.ballad);
for (const spec of PACKS) {
  if (loaded[spec.name]) writePack(spec.name, loaded[spec.name]);
}
