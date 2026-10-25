// node shoot-fronts.mjs -> ../png/objectives/fronts/  (serves the repo root; the cards read live game data)
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
const root = new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || new URL('../png/objectives/fronts/', import.meta.url).pathname;
const srv = spawn('python3', ['-m', 'http.server', '8775', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 }); p.on('console', (m) => console.log(m.text())); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:8775/docs/team/mockups/cards/objectives/fronts.html'); await p.waitForSelector('body[data-ready]');
for (const c of await p.locator('#cards .of').all()) { const k = await c.getAttribute('data-k'); await c.screenshot({ path: `${out}/front-${k}_375w_rev4.png` }); }
await p.locator('#cards').screenshot({ path: `${out}/fronts-all_rev4.png` });
await p.locator('#hand').screenshot({ path: `${out}/fronts-hand-120px_rev4.png` });
await p.locator('#pairO').screenshot({ path: `${out}/pair-objective-front-back_rev4.png` });
await p.locator('#pairS').screenshot({ path: `${out}/pair-secret-objective-front-back_rev4.png` });
await b.close(); srv.kill();
