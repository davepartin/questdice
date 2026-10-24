// node shoot17.mjs  -> ../png/t17/*_rev10.png (serves the repo; WebGL via SwiftShader). Rev 9: the four dagger metals from one template.
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
const root = process.env.ROOT || new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || new URL('../png/t17/', import.meta.url).pathname;
const srv = spawn('python3', ['-m', 'http.server', '8773', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const open = async (q, dpr = 2) => { const p = await b.newPage({ viewport: { width: 375, height: 600 }, deviceScaleFactor: dpr }); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto(`http://localhost:8773/docs/team/mockups/cards/t17/card17.html?nodemo&${q}`); await p.waitForSelector('body[data-ready]', { timeout: 90000 }); await p.waitForTimeout(600); return p; };
const M = ['bronze', 'silver', 'gold', 'diamond'];
for (let m = 0; m < 4; m++) for (const [s, tag] of [[m === 3 ? 6 : 4, 'fresh'], [10, 'uncovered']]) {
  const p = await open(`metal=${m}&size=${s}&slot=NE`); const f = `${M[m]}-dagger-d${s}-${tag}_375w_rev10`;
  await p.locator('.qc17').screenshot({ path: `${out}/${f}.png` }); console.log(f, await p.evaluate(() => document.querySelector('.qc17').dataset.titleFit)); await p.close(); }
{ const p = await open('metal=1&size=4&slot=NE'); await p.click('.sell'); await p.waitForTimeout(200); await p.locator('.qc17').screenshot({ path: `${out}/silver-dagger-sell-confirm_375w_rev10.png` }); await p.close(); }
{ const p = await b.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto('http://localhost:8773/docs/team/mockups/cards/t17/faces-test.html'); await p.waitForSelector('body[data-ready]', { timeout: 90000 });
  console.log('face test all fit:', await p.evaluate(() => document.body.dataset.ok)); await p.screenshot({ path: `${out}/face-fit-test-sheet_rev10.png`, fullPage: true }); await p.close(); }
// every face of every die on every dagger: fit report
{ const p = await open('metal=3&size=10&slot=NE'); console.log('diamond d10 faces fit:', await p.evaluate(async () => { const { FIT } = await import('./dice3d.js'); return FIT.filter((x) => !x.ok).length + ' failures of ' + FIT.length; })); await p.close(); }
await b.close(); srv.kill();
