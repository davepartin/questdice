// Film the game's real dice into sprite sheets for the home screen.  node dev/dicefilm.mjs   (server on :8135)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const jobs = [['NW', 'red', '1,0.55,0.25'], ['NE', 'blue', '0.4,1,0.5'], ['W', 'strength', '0.8,0.3,1'], ['SW', 'talent', '1,1,0.2'], ['C', 'heart', '0.3,1,0.8']];
for (const [slot, name, axis] of jobs) {
  const p = await b.newPage({ viewport: { width: 400, height: 300 } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto(`http://localhost:8135/dev/dicefilm.html?slot=${slot}&frames=32&size=144&cols=32&axis=${axis}`);
  await p.waitForFunction(() => window.SHEET, null, { timeout: 180000 });
  const s = await p.evaluate(() => window.SHEET);
  fs.writeFileSync(`assets/brand/die-${name}.webp`, Buffer.from(s.url.split(',')[1], 'base64'));
  console.log(name, `d${s.sides}`, s.theme, `${s.cols}x${s.rows}`, s.frames, 'frames');
  await p.close();
}
await b.close();
