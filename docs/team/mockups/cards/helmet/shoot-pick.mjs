// node shoot-pick.mjs -> /workspace/card-previews-helmet-pick (Dave's head icon on the tilted board, Head card, comparison)
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import { mkdirSync } from 'node:fs';
const root = new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || '/workspace/card-previews-helmet-pick-v2'; mkdirSync(out, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8787', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:8787/docs/team/mockups/cards/diceboard/diceboard.html', { waitUntil: 'commit' }); await p.waitForSelector('body[data-ready]', { timeout: 600000 });
await p.screenshot({ path: `${out}/board-tilted-headpick_390x844.jpg`, type: 'jpeg', quality: 86 });
const r = await p.evaluate(() => { const e = document.querySelector('.slotfix').getBoundingClientRect(); return { x: e.x - 50, y: e.y - 40, width: e.width + 100, height: e.height + 110 }; });
await p.screenshot({ path: `${out}/head-slot-zoom.jpg`, type: 'jpeg', quality: 88, clip: r });
await p.evaluate(() => lift(1)); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/head-card_390x844.jpg`, type: 'jpeg', quality: 86 });
await p.close(); p = await b.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1.5 });
await p.goto('http://localhost:8787/docs/team/mockups/cards/helmet/helmets.html', { waitUntil: 'commit' }); await p.waitForSelector('body[data-sheet]', { timeout: 600000 });
await p.waitForTimeout(500); await p.screenshot({ path: `${out}/helmet-comparison-all.jpg`, type: 'jpeg', quality: 84, fullPage: true });
await p.goto('http://localhost:8787/docs/team/mockups/cards/helmet/helmets.html?only=pickv1,pick', { waitUntil: 'commit' }); await p.waitForSelector('body[data-sheet]', { timeout: 600000 });
await p.waitForTimeout(500); await p.screenshot({ path: `${out}/helmet-old-vs-thinner.jpg`, type: 'jpeg', quality: 86, fullPage: true });
await b.close(); srv.kill();
