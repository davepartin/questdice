// rev 2 renders -> /workspace/card-previews-bodycard-v2 (body card 390x844 + 375x548; talent options 390x844)
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import { mkdirSync, statSync, readdirSync } from 'node:fs';
const root = new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || '/workspace/card-previews-bodycard-v2'; mkdirSync(out, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8814', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const U = 'http://localhost:8814/docs/team/mockups/cards/bodycard/';
const shots = [
  ['body-before-rev1', 'bodycard.html?cls=knight&state=4,6,8,6', 1], ['body-after-gear', 'bodycard.html?rev=2&cls=knight&state=4,6,8,6', 1],
  ['body-after-alt-body', 'bodycard.html?rev=2&title=BODY&cls=knight&state=4,6,8,6', 1], ['body-after-notitle', 'bodycard.html?rev=2&title=none&cls=knight&state=4,6,8,6', 1],
  ['body-equal-cost-knight', 'bodycard.html?rev=2&cost=equal&cls=knight', 1], ['body-equal-cost-ranger', 'bodycard.html?rev=2&cost=equal&cls=ranger', 1],
  ['talent-A-both-mixed', 'talent.html?opt=A&state=6,4&demo=1', 0], ['talent-A-new-hero-two-locked', 'talent.html?opt=A&se=locked', 0],
  ['talent-B-one-mixed', 'talent.html?opt=B&slot=SW&state=6&demo=1', 0], ['talent-B-two-d4', 'talent.html?opt=B&slot=SE', 0],
];
for (const [n, q, both] of shots) for (const [w, h] of both ? [[390, 844], [375, 548]] : [[390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(U + q); await p.waitForSelector('body[data-ready]', { timeout: 300000 }); await p.waitForTimeout(500);
  const fit = await p.evaluate(() => { const r = document.querySelector('.bc').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; });
  await p.screenshot({ path: `${out}/${n}_${w}x${h}.jpg`, type: 'jpeg', quality: 85 });
  if (n === 'talent-B-one-mixed') { await p.click('.slot.empty[data-v="6"]'); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/talent-B-choose-symbol_${w}x${h}.jpg`, type: 'jpeg', quality: 85 });
    await p.click('.pick button[data-sym="magic"]'); await p.waitForTimeout(200); await p.click('.cov[data-step="10"]'); await p.waitForTimeout(250); await p.screenshot({ path: `${out}/talent-B-set-and-out-of-order_${w}x${h}.jpg`, type: 'jpeg', quality: 85 }); }
  if (n === 'body-after-gear') { await p.click('.cell[data-k="N"][data-size="8"] .cov'); await p.waitForTimeout(250); console.log('  toast', await p.textContent('.toast')); }
  console.log(n, `${w}x${h}`, 'fits', fit, errs.length ? 'ERR ' + errs : 'ok'); await p.close();
}
await b.close(); srv.kill();
for (const f of readdirSync(out)) console.log(f, (statSync(`${out}/${f}`).size / 1024 | 0) + 'KB');
