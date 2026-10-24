// node shoot17.mjs  -> ../png/t17/*_rev5.png (serves the repo; WebGL via SwiftShader)
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
const root = process.env.ROOT || new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || new URL('../png/t17/', import.meta.url).pathname;
const srv = spawn('python3', ['-m', 'http.server', '8773', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const open = async (q, dpr = 2) => { const p = await b.newPage({ viewport: { width: 375, height: 600 }, deviceScaleFactor: dpr }); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto(`http://localhost:8773/docs/team/mockups/cards/t17/card17.html?nodemo&${q}`); await p.waitForSelector('body[data-ready]', { timeout: 90000 }); await p.waitForTimeout(600); return p; };
for (const [q, f] of [['size=6&slot=NE', 'silver-dagger-d6-equipped'], ['size=10&slot=NE', 'silver-dagger-d10-uncovered']]) {
  const p = await open(q); await p.locator('.qc17').screenshot({ path: `${out}/${f}_375w_rev5.png` }); console.log(f, await p.evaluate(() => document.querySelector('.qc17').dataset.kinds)); await p.close(); }
for (const [q, f] of [['size=6&slot=NE', 'dice-closeup-d6_2x'], ['size=10&slot=NE', 'dice-closeup-d10_2x']]) { const p = await open(q, 4); await p.locator('.dice17').screenshot({ path: `${out}/${f}_rev5.png` }); await p.close(); }
await b.close(); srv.kill();
