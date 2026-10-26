// Heart v1 renders -> /workspace/card-previews-heart-v1 (390x844 + 375x548)
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import { mkdirSync } from 'node:fs';
const root = new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || '/workspace/card-previews-heart-v1'; mkdirSync(out, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8821', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const s of ['fresh', 'act2', 'maxed']) for (const [w, h] of [[390, 844], [375, 548]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:8821/docs/team/mockups/cards/bodycard/heart.html?state=${s}`); await p.waitForSelector('body[data-ready]'); await p.waitForTimeout(500);
  const fit = await p.evaluate(() => [...document.querySelectorAll('.bc,.pick')].every((e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }));
  const M = await p.evaluate(() => { const k = document.querySelector('.bc .fr').getBoundingClientRect().width / 720;
    return (globalThis.__emb || []).map((e) => ({ k: e.kind, dx: +(((e.icon.l + e.icon.r) - (e.circle.l + e.circle.r)) / 2 * k).toFixed(2), dy: +(((e.icon.t + e.icon.b) - (e.circle.t + e.circle.b)) / 2 * k).toFixed(2) })); });
  if (s === 'fresh') console.log('  corner offsets (CSS px, icon bbox centre - circle bbox centre):', JSON.stringify(M));
  await p.screenshot({ path: `${out}/heart-${s}_${w}x${h}.jpg`, type: 'jpeg', quality: 85 }); console.log(s, w, h, 'fits', fit, errs.join() || 'ok'); await p.close();
}
await b.close(); srv.kill();
