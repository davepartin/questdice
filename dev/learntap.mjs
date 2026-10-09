// Learn to play on a short phone: the board lesson, tapping the Heart socket.  node dev/learntap.mjs [w] [h]
import { chromium } from 'playwright-core';
const W = Number(process.argv[2] || 390); const H = Number(process.argv[3] || 664);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true }); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
await p.evaluate(() => [...document.querySelectorAll('.sx-plaque')].find((e) => /Learn to play/.test(e.textContent))?.click()); await p.waitForTimeout(800);
await p.click('.tu-nav .tu-go'); await p.waitForTimeout(1200);
await p.tap('.tb-hit[aria-label="Heart"]'); await p.waitForTimeout(600);
console.log('info:', await p.evaluate(() => document.querySelector('.tu-info').textContent));
await p.screenshot({ path: `docs/tutorial/${W}x${H}-L02-tap.png` });
await p.click('.tu-nav .tu-go'); await p.waitForTimeout(2400); await p.screenshot({ path: `docs/tutorial/${W}x${H}-L03.png` });
await b.close();
