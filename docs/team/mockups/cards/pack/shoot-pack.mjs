// node shoot-pack.mjs -> $OUT (default /workspace/card-previews-pack-v1): grid, lifted card, sell confirm, tap animation frames
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import { mkdirSync } from 'node:fs';
const root = new URL('../../../../../', import.meta.url).pathname, out = process.env.OUT || '/workspace/card-previews-pack-v1'; mkdirSync(out, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8776', '-d', root], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h] of [[375, 548], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto('http://localhost:8776/docs/team/mockups/cards/pack/pack.html'); await p.waitForSelector('body[data-ready]', { timeout: 60000 });
  await p.screenshot({ path: `${out}/pack-grid_${w}x${h}.png` });
  console.log(w, h, 'overflow', await p.evaluate(() => document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth));
  if (w === 390) { // tap animation frames (Web Animations paused and stepped)
    await p.evaluate(() => { lift(document.querySelector('.slot')); document.getAnimations().forEach((a) => a.pause()); });
    for (const [i, t] of [0, 60, 130, 200, 280, 380].entries()) { await p.evaluate((t) => document.getAnimations().forEach((a) => { a.currentTime = t; }), t); await p.screenshot({ path: `${out}/anim-${i}.png` }); }
    await p.evaluate(() => document.getAnimations().forEach((a) => a.finish())); await p.evaluate(() => drop()); await p.waitForTimeout(600);
  }
  await p.evaluate(() => lift(document.querySelectorAll('.slot')[1])); await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/pack-card-lifted_${w}x${h}.png` });
  const r = await p.evaluate(() => { const c = document.querySelector('.big').getBoundingClientRect(), a = document.querySelector('.acts').getBoundingClientRect(); return { cardBottom: c.bottom, actsTop: a.top, actsBottom: a.bottom, vh: innerHeight }; }); console.log(w, h, r);
  await p.click('.acts .sell'); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/pack-sell-confirm_${w}x${h}.png` });
  await p.close();
}
await b.close(); srv.kill();
