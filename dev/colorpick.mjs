// Colour picker on the hero-create screen.
//   node dev/colorpick.mjs [out.png]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const out = process.argv[2] || '/opt/cursor/artifacts/hero-color-picker.png';
const port = process.env.PORT || '8135';
const chrome = process.env.CHROME
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/local/bin/google-chrome', '/opt/google/chrome/chrome']
    .find((p) => fs.existsSync(p));
const b = await chromium.launch({ executablePath: chrome, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 430, height: 860 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto(`http://localhost:${port}/?debug&manual&q=low`);
await p.waitForFunction(() => window.QD?.showCreate, null, { timeout: 90000 });
await p.evaluate(() => window.QD.showCreate());
await p.waitForSelector('.color-btn', { timeout: 20000 });
await p.evaluate(() => [...document.querySelectorAll('.rail-btn')].find((x) => /Knight/i.test(x.textContent))?.click());
await p.waitForTimeout(500);
await p.evaluate(() => [...document.querySelectorAll('.color-btn')].find((x) => /Blue/i.test(x.getAttribute('aria-label') || x.textContent))?.click());
await p.waitForTimeout(600);
fs.mkdirSync(path.dirname(out), { recursive: true });
await p.screenshot({ path: out, fullPage: false });
await b.close();
console.log('wrote', out);
