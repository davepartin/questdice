// An invite link (?join=CODE) opens the join screen with the code filled in.  node dev/invite.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:8135/?debug&manual&q=low&join=k7qp'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
await p.waitForFunction(() => document.querySelector('.room-code-input'), null, { timeout: 30000 });
await p.waitForTimeout(1500);
console.log('code box:', await p.evaluate(() => document.querySelector('.room-code-input').value), '| url:', await p.evaluate(() => location.search));
await p.screenshot({ path: 'docs/ingame/invite_join.png' });
await b.close();
