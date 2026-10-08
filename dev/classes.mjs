// The creation screen for each class (stats, trait, weapons, powers).  node dev/classes.mjs [cls,cls]
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => window.QD.showCreate()); await pump(3);
for (const cls of (process.argv[2] || 'wizard,dwarf').split(',')) {
  await p.evaluate((c) => [...document.querySelectorAll('.rail-btn')].find((x) => x.getAttribute('aria-label')?.toLowerCase().startsWith(c))?.click(), cls); await pump(3);
  await p.evaluate(() => { const el = document.querySelector('.sx-side'); const t = document.querySelector('.ci-head'); if (el && t) el.scrollTop += t.getBoundingClientRect().top - 70; }); await pump(1);
  await p.screenshot({ path: `docs/ingame/class_${cls}.png` });
}
await b.close();
