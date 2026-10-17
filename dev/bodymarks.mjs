// Body marks on the white dice (helmet, gloves, boots behind the numbers) at a few strengths, on the whole dice grid.
//   node dev/bodymarks.mjs   (needs node dev/serve.mjs 8135)  ->  docs/ingame/bodymarks-*.png and bodymarks-sheet.png
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:8135/dev/trayshot.html'); await p.waitForFunction(() => window.READY, null, { timeout: 60000 });
const board = { NW: 4, N: 3, NE: 2, W: 5, C: 4, E: 7, SW: 5, S: 6, SE: 2 }; // head 3, hands 5 and 7, feet 6: a spread of numbers and symbols
const hero = { strength: { W: 6, E: 8 }, speed: { S: 6 }, mind: { N: 6 } }; // mid-game dice: d6 head, hands and feet, a d8 right hand
const LEVELS = [['now', 0], ['faint', 0.25], ['subtle', 0.4], ['clear', 0.55]];
const shots = {};
for (const [name, k] of LEVELS) {
  const r = await p.evaluate((s) => window.shot(s), { full: true, board, hero, marks: k });
  shots[name] = r.url; fs.writeFileSync(`docs/ingame/bodymarks-${name}.png`, Buffer.from(r.url.split(',')[1], 'base64'));
}
// close-ups: just the white dice, bigger
const zoom = {};
for (const [name, k] of LEVELS.slice(1)) {
  const r = await p.evaluate((s) => window.shot(s), { full: true, board, hero, marks: k, size: [1600, 1520] });
  zoom[name] = r.url;
}
// one sheet: the four grids, labelled
const sheet = await p.evaluate(async ({ shots, zoom }) => {
  const load = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; });
  const g = await Promise.all(Object.values(shots).map(load)); const z = await Promise.all(Object.values(zoom).map(load));
  const w = 800, h = g[0].height; const c = document.createElement('canvas'); c.width = w * 2; c.height = (h + 60) * 2; const x = c.getContext('2d');
  x.fillStyle = '#17131d'; x.fillRect(0, 0, c.width, c.height);
  Object.keys(shots).forEach((n, i) => { const cx = (i % 2) * w, cy = Math.floor(i / 2) * (h + 60); x.drawImage(g[i], cx, cy + 50); x.fillStyle = '#f1d38a'; x.font = 'bold 34px sans-serif'; x.fillText(['Now (no marks)', 'Faint', 'Subtle', 'Clear'][i], cx + 30, cy + 42); });
  const CX = 250, CY = 120, CW = 1100, CH = 1180; // the white dice, cut from a big render
  const c2 = document.createElement('canvas'); c2.width = CW * 3; c2.height = CH + 60; const y = c2.getContext('2d'); y.fillStyle = '#17131d'; y.fillRect(0, 0, c2.width, c2.height);
  Object.keys(zoom).forEach((n, i) => { y.drawImage(z[i], CX, CY, CW, CH, i * CW, 60, CW, CH); y.fillStyle = '#f1d38a'; y.font = 'bold 44px sans-serif'; y.fillText(['Faint', 'Subtle', 'Clear'][i], i * CW + 30, 48); });
  return [c.toDataURL('image/png'), c2.toDataURL('image/png')];
}, { shots, zoom });
fs.writeFileSync('docs/ingame/bodymarks-sheet.png', Buffer.from(sheet[0].split(',')[1], 'base64'));
fs.writeFileSync('docs/ingame/bodymarks-zoom.png', Buffer.from(sheet[1].split(',')[1], 'base64'));
await b.close();
