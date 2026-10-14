// Contact sheet of the painted miniatures (light and dark backgrounds, to spot background halos).
//   node dev/minisheet.mjs [out.png]
// Labeled, every hero, monster and pet, each shown on both a dark and a light ground.
import { chromium } from 'playwright-core'; import fs from 'node:fs';
import * as D from '../js/data.js';
const out = process.argv[2] || 'docs/ingame/miniatures_overview.png';
const dir = process.env.DIR || 'assets/miniatures';
const heroes = Object.entries(D.CLASSES).map(([id, c]) => ({ id, name: c.name, file: `${dir}/${id}.webp`, kind: 'hero' }));
const monsters = Object.entries(D.MONSTERS).map(([id, m]) => ({ id, name: m.name, file: m.img, kind: 'monster' }));
const pets = Object.entries(D.PETS).filter(([, p]) => p.img).map(([id, p]) => ({ id, name: p.name, file: `assets/pets/${p.img}.webp`, kind: 'pet' }));
const items = [...heroes, ...monsters, ...pets].filter((it) => fs.existsSync(it.file));
const b64 = (f) => fs.readFileSync(f).toString('base64');
const cell = (it, bg) => `<figure class="cell">
  <div class="frame" style="background:${bg}"><img src="data:image/webp;base64,${b64(it.file)}" alt="${it.name}"></div>
  <figcaption><b>${it.name}</b><span>${it.id}.webp</span></figcaption>
</figure>`;
const section = (title, list) => `<h2>${title}</h2>
  <div class="row">${list.map((it) => cell(it, '#0d0a14')).join('')}</div>
  <div class="row light">${list.map((it) => cell(it, '#f3eee4')).join('')}</div>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; background: #1a1714; color: #ece6d8; font: 13px/1.3 system-ui, sans-serif; padding: 16px 18px 24px; }
  h1 { font: 700 22px/1.2 Georgia, serif; margin: 0 0 4px; color: #ffe9b0; }
  .sub { color: #b8ae9a; margin: 0 0 18px; }
  h2 { font: 700 14px/1 sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #e2b24c; margin: 18px 0 8px; border-top: 1px solid #3a342c; padding-top: 12px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px 10px; margin-bottom: 8px; }
  .cell { margin: 0; width: 132px; text-align: center; }
  .frame { height: 168px; display: flex; align-items: flex-end; justify-content: center; border-radius: 6px; overflow: hidden; }
  .frame img { height: 160px; width: auto; max-width: 124px; object-fit: contain; object-position: 50% 100%; }
  figcaption { margin-top: 4px; }
  figcaption b { display: block; font-size: 11px; color: #fff4d6; }
  figcaption span { display: block; font-size: 10px; color: #9a9080; }
  .light figcaption b { color: #ece6d8; }
  .key { font-size: 12px; color: #c8c0b0; margin-bottom: 8px; }
</style></head><body>
  <h1>QuestDice miniatures</h1>
  <p class="sub">Each piece twice: dark ground, then light ground. Height ~160px (phone battle size). Cutouts in assets/miniatures and assets/pets.</p>
  <p class="key">Dark first (halos / leftover cream show up), then light (clipped edges and dark fringe show up).</p>
  ${section('Heroes', heroes)}
  ${section('Monsters', monsters)}
  ${section('Pets', pets)}
</body></html>`;
fs.mkdirSync('docs/ingame', { recursive: true });
const chrome = process.env.CHROME
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/local/bin/google-chrome', '/opt/google/chrome/chrome']
    .find((p) => fs.existsSync(p));
const b = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1480, height: 900 }, deviceScaleFactor: 1.25 });
await p.setContent(html, { waitUntil: 'load' });
await p.waitForTimeout(400);
await p.screenshot({ path: out, fullPage: true });
await b.close();
console.log('wrote', out, items.length, 'pieces');
