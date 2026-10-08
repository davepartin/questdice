// The home screen at phone and wide sizes.  node dev/titleshot.mjs [prefix]
import { chromium } from 'playwright-core';
const pre = process.argv[2] || 'title';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
for (const [w, hgt, tag] of [[430, 932, 'phone'], [1280, 720, 'wide']]) {
  const p = await b.newPage({ viewport: { width: w, height: hgt }, hasTouch: tag === 'phone', deviceScaleFactor: tag === 'phone' ? 2 : 1 });
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
  await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
  await p.evaluate(async () => { const st = window.QD.world.stage; for (let i = 0; i < 45; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } st.step(1); });
  await p.waitForTimeout(1200); await p.screenshot({ path: `docs/ingame/${pre}_${tag}.png` });
  await p.close();
}
console.log('errors:', errs.length ? errs : 'none');
await b.close();
