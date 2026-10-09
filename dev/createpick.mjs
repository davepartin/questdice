// The hero choice screen on a phone: first look, then tap Ranger and watch it turn toward you.
//   node dev/createpick.mjs [tag] [w] [h]
import { chromium } from 'playwright-core';
const [tag = 'create', W = 430, H = 740] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${tag}_${n}.png` }); };
await p.evaluate(() => window.QD.showCreate()); await pump(1.2); await shot('0start');
await pump(3); await shot('1settled');
await pump(25); await shot('2later');
const tapped = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Ranger/i.test(x.textContent)); b?.click(); return !!b; });
console.log('tapped ranger', tapped);
await pump(0.25); await shot('3ranger_turning'); await pump(2.5); await shot('4ranger_facing');
await b.close();
