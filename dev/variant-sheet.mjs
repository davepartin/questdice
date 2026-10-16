// Labeled contact sheet of hero colour variants on dark and light grounds.
//   node dev/variant-sheet.mjs [dir] [out.png]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2] || 'assets/miniatures';
const out = process.argv[3] || '/opt/cursor/artifacts/hero-color-cutouts.png';
const names = [
  'knight-blue', 'knight-crimson', 'knight-green',
  'ranger-green', 'ranger-rust', 'ranger-grey',
  'wizard-blue', 'wizard-crimson', 'wizard-white',
  'dwarf-blue', 'dwarf-crimson', 'dwarf-green',
  'bard-teal', 'bard-crimson', 'bard-blue',
].filter((id) => fs.existsSync(`${dir}/${id}.webp`));
const b64 = (id) => fs.readFileSync(`${dir}/${id}.webp`).toString('base64');
const cell = (id, bg) => `<figure class="cell">
  <div class="frame" style="background:${bg}"><img src="data:image/webp;base64,${b64(id)}" alt="${id}"></div>
  <figcaption><b>${id.replace('-', ' ')}</b><span>${id}.webp</span></figcaption>
</figure>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; background: #1a1714; color: #ece6d8; font: 13px/1.3 system-ui, sans-serif; padding: 16px 18px 24px; }
  h1 { font: 700 22px/1.2 Georgia, serif; margin: 0 0 4px; color: #ffe9b0; }
  .sub, .key { color: #b8ae9a; margin: 0 0 12px; }
  h2 { font: 700 14px/1 sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #e2b24c; margin: 16px 0 8px; border-top: 1px solid #3a342c; padding-top: 12px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px 10px; margin-bottom: 8px; }
  .cell { margin: 0; width: 148px; text-align: center; }
  .frame { height: 188px; display: flex; align-items: flex-end; justify-content: center; border-radius: 6px; overflow: hidden; }
  .frame img { height: 180px; width: auto; max-width: 140px; object-fit: contain; object-position: 50% 100%; }
  figcaption b { display: block; font-size: 11px; color: #fff4d6; }
  figcaption span { display: block; font-size: 10px; color: #9a9080; }
</style></head><body>
  <h1>Hero colour variants</h1>
  <p class="sub">Fifteen cutouts. Each twice: dark ground, then light ground. Height ~180px.</p>
  <p class="key">Dark first (halos / leftover checker show up), then light (clipped edges and dark fringe show up).</p>
  <h2>Dark</h2>
  <div class="row">${names.map((id) => cell(id, '#0d0a14')).join('')}</div>
  <h2>Light</h2>
  <div class="row">${names.map((id) => cell(id, '#f3eee4')).join('')}</div>
</body></html>`;
const chrome = process.env.CHROME
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/local/bin/google-chrome', '/opt/google/chrome/chrome']
    .find((p) => fs.existsSync(p));
const b = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
const page = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2 });
await page.setContent(html, { waitUntil: 'load' });
await page.waitForTimeout(300);
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.screenshot({ path: out, fullPage: true });
await b.close();
console.log('wrote', out, names.length);
