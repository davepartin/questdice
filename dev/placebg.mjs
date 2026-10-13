// Painted battle backdrops in portrait and landscape.
//   node dev/placebg.mjs [outDir]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || 'shots/placebg';
fs.mkdirSync(out, { recursive: true });
const places = [
  { place: 'Burnt Orchard', slug: 'burnt-orchard', enemies: 'goblin,wolf' },
  { place: 'Gallows Hill', slug: 'gallows-hill', enemies: 'goblinking', kind: 'boss' },
  { place: 'Candle Vault', slug: 'candle-vault', enemies: 'skeleton,wraith' },
  { place: 'The Drowned Crypt', slug: 'the-drowned-crypt', enemies: 'skeleton,spider' },
];
const views = [
  { name: 'portrait', w: 390, h: 844, dpr: 2 },
  { name: 'landscape', w: 1280, h: 720, dpr: 1 },
];

const exe = process.env.CHROME_PATH || '/opt/google/chrome/chrome';
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 280)); });

for (const cfg of places) {
  for (const v of views) {
    await p.setViewportSize({ width: v.w, height: v.h });
    const url = new URL('http://localhost:8135/dev/placebg.html');
    url.searchParams.set('place', cfg.place);
    url.searchParams.set('enemies', cfg.enemies);
    if (cfg.kind) url.searchParams.set('kind', cfg.kind);
    await p.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__placeReady, null, { timeout: 30000 });
    await p.waitForTimeout(120);
    const file = path.join(out, `${cfg.slug}-${v.name}.png`);
    await p.screenshot({ path: file });
    const info = await p.evaluate(() => {
      const el = document.querySelector('.fb');
      const cs = el ? getComputedStyle(el.querySelector('.fb-table')) : null;
      return { ...window.__placeReady, placeAttr: el?.dataset.place, y: el && getComputedStyle(el).getPropertyValue('--place-y').trim(), hasImg: !!cs?.backgroundImage.includes('assets/bg/') };
    });
    console.log('wrote', file, JSON.stringify(info));
  }
}
await b.close();
