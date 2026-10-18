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

function ingest(mdPath, { id, fallbackRind = false }) {
  const md = readFileSync(mdPath, 'utf8');
  const blocks = jsBlocks(md);
  if (blocks.length < 7) throw new Error(`${mdPath}: expected 7 js blocks, got ${blocks.length}`);
  const beats = { ...asObject(blocks[0]), ...asObject(blocks[2]), ...asObject(blocks[4]) };
  const steps = [asNumbered(blocks[1]), asNumbered(blocks[3]), asNumbered(blocks[5])];
  const actsSrc = blocks[6].replace(/^acts:\s*/, '');
  const acts = asArray(actsSrc);

  if (fallbackRind) {
    beats['elite:2'] = {
      ...beats['elite:2'],
      title: 'Rind, the Cellar Ogre',
      text: [
        'Somebody has been living in the cellar a very long time. Rind, the Cellar Ogre, came down for a snack a hundred years ago and never left, and now he smells so strongly of old cheese that the cheese has started to complain. He heard Gerald roll past, and has decided Gerald is his. Rind is not wrong about many things, because Rind is not sure about many things.',
        '{wizard} insists this is not magic, it is neglect. {dwarf}, who grew up under a mountain where cheese is taken very seriously indeed, has gone pale and keeps whispering “the waste.” Watch it wind up. It hits like a falling larder.',
      ],
    };
    const s5 = steps[1][4];
    s5.foes = ['ogre'];
    s5.names = ['Rind, the Cellar Ogre'];
    s5.arrive = ['Rind, the Cellar Ogre, blocks the Ossuary Gate. He came down for a snack a hundred years ago and never left, and now he smells so strongly of old cheese that the cheese has started to complain. He heard Gerald roll past and has decided Gerald is his. He winds up his whole body for a blow like a falling larder.'];
    s5.win = ['Rind topples like a felled larder and lies there, blinking. {dwarf} says it is a crime what the cellar has done to him. {wizard} pats his shoulder. It is the first time either has touched the other on purpose. Nobody mentions it.'];
    acts[1].fights[4] = ['ogre'];
    acts[1].names[4] = ['Rind, the Cellar Ogre'];
  }

  return { id, beats, steps, acts };
}

const rival = ingest(RIVAL_MD, { id: 'rivalduo', fallbackRind: true });
const ballad = ingest(BALLAD_MD, { id: 'ballad' });

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
