// Cache-bust every JS module on GitHub Pages: rewrite index.html's import map so each module URL carries a version.
//   node tools/stamp.mjs [version]     (default: current time)
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..'); const v = process.argv[2] || Date.now().toString(36);
const files = []; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.js')) files.push(path.relative(root, p).split(path.sep).join('/')); } };
walk(path.join(root, 'js'));
const imports = { three: './vendor/three/build/three.module.js', 'three/addons/': './vendor/three/examples/jsm/' };
for (const f of files.sort()) imports[`./${f}`] = `./${f}?v=${v}`;
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, `<script type="importmap">${JSON.stringify({ imports })}</script>`);
html = html.replace(/\?v=[A-Za-z0-9]+(?=")/g, `?v=${v}`);
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log(`stamped ${files.length} modules with v=${v}`);
