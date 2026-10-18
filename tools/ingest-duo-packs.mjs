// One-shot: pull writer copy out of the uploaded markdown and write js/packs/*.js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const RIVAL_MD = '/home/ubuntu/.cursor/projects/workspace/uploads/RIVAL_DUO_5b26.md';
const BALLAD_MD = '/home/ubuntu/.cursor/projects/workspace/uploads/THATS_NOT_HOW_IT_WENT_2fb9.md';

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

const rival = ingest(RIVAL_MD, { id: 'rivalduo' });
const ballad = ingest(BALLAD_MD, { id: 'ballad' });
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
const mungo = ballad.steps[0][4];
if (mungo?.names?.[0] === 'Mungo') {
  mungo.foes = ['mungo'];
  ballad.acts[0].fights[4] = ['mungo'];
}
remapFoe(rival, { name: 'Duchess Goldbelly', to: 'goldbelly' });
remapFoe(ballad, { name: 'The Dowager Blazemorrow', to: 'blazemorrow' });

mkdirSync('/workspace/js/packs', { recursive: true });
function writePack(name, data) {
  const body = `// Writer copy for the ${data.id} pack. Generated from the campaign markdown; edit the source file, not this one.\n`
    + `export const beats = ${dump(data.beats)};\n\n`
    + `export const steps = ${dump(data.steps)};\n\n`
    + `export const actSpecs = ${dump(data.acts)};\n`;
  writeFileSync(`/workspace/js/packs/${name}.js`, body);
  console.log(name, 'beats', Object.keys(data.beats).length, 'steps', data.steps.map((a) => a.length).join(','), 'acts', data.acts.length);
}
writePack('rivalduo', rival);
writePack('ballad', ballad);
