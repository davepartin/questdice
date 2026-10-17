// The painted body watermarks (helmet by class, gauntlets, boots) on the white dice, close up.  node dev/bodywm.mjs [name]
//   (needs node dev/serve.mjs 8135)  ->  docs/ingame/bodywm-<name>.png
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const name = process.argv[2] || 'now';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:8135/dev/trayshot.html'); await p.waitForFunction(() => window.READY, null, { timeout: 60000 });
await p.evaluate(async () => { const m = await import('/js/gfx/dice/bodywm.js'); await m.preloadBodyWatermarks(); });
const board = { NW: 4, N: 3, NE: 2, W: 5, C: 4, E: 7, SW: 5, S: 6, SE: 2 };
const shots = [];
for (const [cls, hero] of [['knight', { strength: { W: 6, E: 8 }, speed: { S: 6 }, mind: { N: 4 } }], ['wizard', { strength: { W: 6, E: 6 }, speed: { S: 6 }, mind: { N: 6 } }]]) {
  shots.push((await p.evaluate((s) => window.shot(s), { cls, full: true, board, hero, size: [1600, 1520] })).url);
}
const out = await p.evaluate(async (shots) => {
  const load = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; }); const im = await Promise.all(shots.map(load));
  const CX = 250, CY = 120, CW = 1100, CH = 1180; const c = document.createElement('canvas'); c.width = CW * 2; c.height = CH; const x = c.getContext('2d');
  x.fillStyle = '#17131d'; x.fillRect(0, 0, c.width, c.height); im.forEach((m, i) => x.drawImage(m, CX, CY, CW, CH, i * CW, 0, CW, CH));
  return c.toDataURL('image/png');
}, shots);
fs.writeFileSync(`docs/ingame/bodywm-${name}.png`, Buffer.from(out.split(',')[1], 'base64'));
await b.close();
