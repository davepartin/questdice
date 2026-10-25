// node shoot-diceboard.mjs -> /workspace/card-previews-diceboard-v1 (JPG to keep files small)
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import { mkdirSync } from 'node:fs';
const root = new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || '/workspace/card-previews-diceboard-v1'; mkdirSync(out, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8779', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const shot = (p, n) => p.screenshot({ path: `${out}/${n}.jpg`, type: 'jpeg', quality: 86 });
for (const [w, h] of [[390, 844], [375, 548]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto('http://localhost:8779/docs/team/mockups/cards/diceboard/diceboard.html', { waitUntil: 'commit' }); await p.waitForSelector('body[data-ready]', { timeout: 400000 });
  await shot(p, `diceboard-board_${w}x${h}`);
  console.log(w, h, 'scroll', await p.evaluate(() => document.documentElement.scrollHeight > innerHeight));
  for (const [i, n] of [[2, 'weapon-bow'], [1, 'head'], [3, 'left-hand'], [7, 'feet'], [4, 'heart']]) {
    if (w === 375 && n !== 'weapon-bow' && n !== 'head') continue;
    await p.evaluate((i) => lift(i), i); await p.waitForTimeout(700); await shot(p, `diceboard-card-${n}_${w}x${h}`);
    console.log(n, await p.evaluate(() => { const c = document.querySelector('#big').getBoundingClientRect(), a = document.querySelector('#acts').getBoundingClientRect(); return [Math.round(c.bottom), Math.round(a.top)]; }));
    await p.evaluate(() => drop()); await p.waitForTimeout(600);
  }
  if (w === 390) { await p.evaluate(() => { lift(2); document.getAnimations().forEach((a) => a.pause()); });
    for (const [i, t] of [0, 80, 160, 240, 320, 400].entries()) { await p.evaluate((t) => document.getAnimations().forEach((a) => { a.currentTime = t; }), t); await p.screenshot({ path: `${out}/_f${i}.png` }); } }
  await p.close();
}
await b.close(); srv.kill();
