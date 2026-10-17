// The +1 faces on the all-or-nothing weapons (a Long Sword's 3 with a burst; a Mace's 4 with two, a Tower's 5 with a shield).
//   node dev/plusfaces.mjs   (needs node dev/serve.mjs 8135)  ->  docs/ingame/plusfaces.png
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:8135/dev/trayshot.html'); await p.waitForFunction(() => window.READY, null, { timeout: 60000 });
const ls = { uid: 'ls', id: 'longsword', rarity: 0 };
const A = await p.evaluate((s) => window.shot(s), { full: true, hero: { loadout: { NW: ls, NE: ls } }, board: { NW: 3, NE: 4, N: 3, W: 2, C: 4, E: 4, SW: 2, S: 1, SE: 5 } });
const B = await p.evaluate((s) => window.shot(s), { full: true, hero: { strength: { W: 6, E: 6 }, loadout: { NW: { uid: 'm', id: 'mace', rarity: 1, size: 6 }, NE: { uid: 't', id: 'tower', rarity: 1, size: 6 } } }, board: { NW: 4, NE: 5, N: 2, W: 5, C: 1, E: 3, SW: 4, S: 6, SE: 2 } });
const out = await p.evaluate(async ([a, bb]) => {
  const load = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; }); const [ia, ib] = await Promise.all([load(a), load(bb)]);
  const c = document.createElement('canvas'); c.width = 1600; c.height = ia.height + 60; const x = c.getContext('2d'); x.fillStyle = '#17131d'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(ia, 0, 60); x.drawImage(ib, 800, 60); x.fillStyle = '#f1d38a'; x.font = 'bold 30px sans-serif';
  x.fillText('Long Sword d4: 3 with a burst, and 4', 30, 42); x.fillText('Mace d6: 4 with two bursts · Tower d6: 5 with a shield', 820, 42);
  return c.toDataURL('image/png');
}, [A.url, B.url]);
fs.writeFileSync('docs/ingame/plusfaces.png', Buffer.from(out.split(',')[1], 'base64'));
await b.close();
