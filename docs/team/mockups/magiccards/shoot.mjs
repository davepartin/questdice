// node docs/team/mockups/magiccards/shoot.mjs  (needs dev/serve.mjs on 8190)
import { chromium } from '../../../../node_modules/playwright-core/index.mjs';
const OUT = new URL('./png/', import.meta.url).pathname; import fs from 'node:fs'; fs.mkdirSync(OUT, { recursive: true });
const br = await chromium.launch({ executablePath: process.env.CHROME });
for (const [w, h] of [[390, 844], [360, 740]]) for (const v of ['float', 'margin']) for (const p of ['aimed', 'quickdraw', 'volley']) {
  const pg = await br.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(`http://localhost:8190/docs/team/mockups/magiccards/magic.html?p=${p}&v=${v}`); await pg.waitForTimeout(900);
  const f = `${OUT}${v}-${p}_${w}x${h}.png`; await pg.screenshot({ path: f }); const sc = await pg.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1);
  console.log(f, errs.length ? 'ERR ' + errs.join(' | ') : 'ok', sc ? 'SCROLLS' : 'fits'); await pg.close();
}
await br.close();
