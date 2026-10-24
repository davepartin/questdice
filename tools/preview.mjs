// A phone preview of this checkout, served by GitHub Pages from a folder of `main` (Pages only serves main) without touching the game at
// the site root. Copies the game's files into <dest>/preview/<name>/ and writes BUILD.txt (the build, the commit, the branch).
// The copy keeps its own saves, battle reports and daily record, and never reaches the cloud (js/lab.js, "PREVIEW": any page under /preview/).
//   node tools/preview.mjs <dest repo root> <name>          remove it again with: git rm -r preview/<name>
import fs from 'node:fs'; import path from 'node:path'; import { execSync } from 'node:child_process';
const here = path.resolve(import.meta.dirname, '..'); const dest = path.resolve(process.argv[2] || ''); const name = process.argv[3];
if (!process.argv[2] || !/^[a-z0-9-]+$/.test(name || '')) { console.error('usage: node tools/preview.mjs <dest repo root> <name>'); process.exit(1); }
const out = path.join(dest, 'preview', name); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'js', 'css', 'assets', 'vendor', 'minis']) if (fs.existsSync(path.join(here, f))) fs.cpSync(path.join(here, f), path.join(out, f), { recursive: true, filter: (s) => !/\.DS_Store$/.test(s) });
const build = (fs.readFileSync(path.join(here, 'index.html'), 'utf8').match(/css\/style\.css\?v=([A-Za-z0-9]+)/) || [])[1] || 'unknown';
const git = (c) => { try { return execSync(c, { cwd: here }).toString().trim(); } catch { return 'unknown'; } };
fs.writeFileSync(path.join(out, 'BUILD.txt'), `Quest Dice preview: ${name}\nbuild ${build}\ncommit ${git('git rev-parse HEAD')}\nbranch ${git('git rev-parse --abbrev-ref HEAD')}\nThis folder is a copy for a phone check. It keeps its own saves and never reaches the cloud. The game at the site root is not changed.\n`);
console.log(`preview/${name}: build ${build}, ${fs.readdirSync(out).length} entries`);
