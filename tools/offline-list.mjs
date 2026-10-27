// Writes offline-files.json: every file the game needs, so "Download the game to this phone" (js/pwa.js) can save them all.
//   node tools/offline-list.mjs        (tools/stamp.mjs runs it after each stamp)
// The versioned scripts and stylesheets come from index.html (the import map and the ?v= links), so the list always matches the build that is stamped.
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
export function offlineList() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'); const out = new Set();
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for (const [k, v] of Object.entries(map)) if (k.startsWith('./') || k === 'three') out.add(v.replace(/^\.\//, ''));
  for (const m of html.matchAll(/(?:href|src)="([^"#]+\?v=[A-Za-z0-9]+)"/g)) out.add(m[1]);
  for (const m of html.matchAll(/<link rel="(?:apple-touch-icon|manifest)" href="([^"]+)"/g)) out.add(m[1]);
  const walk = (d) => { for (const f of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const rel = `${d}/${f.name}`; if (f.isDirectory()) walk(rel); else if (!/\.(md|txt)$/i.test(f.name) && !f.name.startsWith('.')) out.add(rel); } };
  for (const d of ['assets', 'minis', 'vendor/three/build', 'vendor/three/examples/jsm']) if (fs.existsSync(path.join(root, d))) walk(d);
  const files = [...out].sort().map((u) => ({ u, s: fs.existsSync(path.join(root, u.split('?')[0])) ? fs.statSync(path.join(root, u.split('?')[0])).size : 0 }));
  return { build: (html.match(/main\.js\?v=([A-Za-z0-9]+)/) || [])[1] || 'dev', bytes: files.reduce((a, f) => a + f.s, 0), files };
}
export function writeOfflineList() { const l = offlineList(); fs.writeFileSync(path.join(root, 'offline-files.json'), JSON.stringify(l)); return l; }
if (import.meta.url === `file://${process.argv[1]}`) { const l = writeOfflineList(); console.log(`offline-files.json: ${l.files.length} files, ${(l.bytes / 1048576).toFixed(1)} MB, build ${l.build}`); }
