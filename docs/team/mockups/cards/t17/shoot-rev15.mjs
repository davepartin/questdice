// node shoot-rev15.mjs -> /workspace/card-previews-t17o: Bronze and Gold dagger at d4 and d10, plus the step-up after one unlock
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import { mkdirSync } from 'node:fs';
const root = new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || '/workspace/card-previews-t17o'; mkdirSync(out, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8778', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [m, name] of [[0, 'bronze'], [2, 'gold']]) for (const s of [4, 10]) {
  const p = await b.newPage({ viewport: { width: 400, height: 640 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto(`http://localhost:8778/docs/team/mockups/cards/t17/card17.html?metal=${m}&size=${s}&nodemo`); await p.waitForSelector('body[data-ready]', { timeout: 90000 }); await p.waitForTimeout(300);
  await p.locator('#slot').screenshot({ path: `${out}/t17-rev15-${name}-dagger-d${s}.png` });
  if (s === 4) { await p.evaluate(() => document.querySelector('.qc17').unlock()); await p.waitForTimeout(1300); await p.locator('#slot').screenshot({ path: `${out}/t17-rev15-${name}-dagger-d6-after-unlock.png` }); }
  if (s === 10 && m === 2) { await p.click('.sl17'); await p.waitForTimeout(200); await p.locator('#slot').screenshot({ path: `${out}/t17-rev15-gold-dagger-d10-sell-confirm.png` }); }
  await p.close();
}
await b.close(); srv.kill();
