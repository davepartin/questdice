// Close-ups of one weapon face for Learn to play (assets/tutorial/weapon-*.png), from the real tray with the released weapons.
//   node dev/faceshot.mjs   (needs node dev/serve.mjs 8135; flattens onto the lessons' dark square with ImageMagick)
import { chromium } from 'playwright-core'; import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
// the Bronze sword's faces are red 0, blue 1, red 2, red 4; the shield is the same with the colours swapped (red2/blue2 not used by any lesson)
const FACES = { 'weapon-zero': { face: 'NW', v: 1 }, 'weapon-red4': { face: 'NW', v: 4 }, 'weapon-blue4': { face: 'NE', v: 4 },
  'weapon-silver4': { face: 'NW', v: 4, hero: { loadout: { NW: { uid: 'shotS', id: 'sword', rarity: 1 }, NE: { uid: 'shotB', id: 'shield', rarity: 0 } } } } }; // a Silver sword's top face carries a corner icon
const keep = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:8135/dev/trayshot.html'); await p.waitForFunction(() => window.READY, null, { timeout: 60000 });
for (const [name, { face, v, hero }] of Object.entries(FACES)) {
  if (keep && !keep.has(name)) continue;
  const r = await p.evaluate((s) => window.shot(s), { full: true, board: { [face]: v }, face, hero, size: [448, 448], fov: 22 });
  const tmp = `/tmp/faceshot-${name}.png`; fs.writeFileSync(tmp, Buffer.from(r.url.split(',')[1], 'base64'));
  execFileSync('convert', ['-size', '448x448', 'radial-gradient:#201a25-#17121c', tmp, '-composite', `assets/tutorial/${name}.png`]);
  console.log(name, fs.statSync(`assets/tutorial/${name}.png`).size, 'bytes');
}
await b.close();
