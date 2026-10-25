// v2: node shoot-tilt.mjs -> /workspace/card-previews-diceboard-v2 (tilted board, plus ?tilt=0 for before/after)
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import { mkdirSync } from 'node:fs';
const root = new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || '/workspace/card-previews-diceboard-v2'; mkdirSync(out, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8781', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h, q] of [[390, 844, ''], [375, 548, ''], ]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto('http://localhost:8781/docs/team/mockups/cards/diceboard/diceboard.html' + q, { waitUntil: 'commit' }); await p.waitForSelector('body[data-ready]', { timeout: 400000 });
  const n = q ? `diceboard-flat-before_${w}x${h}` : `diceboard-tilted_${w}x${h}`;
  await p.screenshot({ path: `${out}/${n}.jpg`, type: 'jpeg', quality: 86 });
  console.log(n, await p.evaluate(() => [...document.querySelectorAll('.die,.nm')].some((e) => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight; }) ? 'CLIPPED' : 'ok'));
  await p.close();
}
await b.close(); srv.kill();
