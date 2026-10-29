// node docs/team/mockups/magiccards/shoot-all.mjs  (dev/serve.mjs on 8190): one 390x844 per card + contact sheets
import { chromium } from '../../../../node_modules/playwright-core/index.mjs'; import fs from 'node:fs'; import * as D from '../../../../js/data.js';
const OUT = new URL('./png/all/', import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true });
const br = await chromium.launch({ executablePath: process.env.CHROME }); const list = [];
const heroes = Object.keys(D.CLASSES).filter((c) => (D.CLASSES[c].cards || []).some((k) => k.start));
for (const h of heroes) { const ids = D.CLASSES[h].cards.filter((k) => k.start).sort((a, b) => a.slot.localeCompare(b.slot)).map((k) => k.id);
  for (const p of [...ids, ...(h === 'ranger' ? ['u:bigheal', 'u:heal', 'u:heart'] : [])]) {
    const pg = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto(`http://localhost:8190/docs/team/mockups/magiccards/magic.html?h=${h}&p=${encodeURIComponent(p)}`); await pg.waitForSelector('body[data-ready]', { timeout: 8000 }).catch(() => errs.push('not ready')); await pg.waitForTimeout(500);
    const f = `${OUT}${h}-${p.replace(':', '_')}_390x844.png`; await pg.screenshot({ path: f });
    const bad = await pg.evaluate(() => { const c = document.querySelector('.card').getBoundingClientRect(); return [...document.querySelectorAll('.lv .sy *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > c.right - c.width * 0.12 || r.left < c.left); }).length + (document.documentElement.scrollHeight > innerHeight + 1 ? 1000 : 0); });
    list.push({ h, p, f }); console.log(f, errs.join('|') || 'ok', bad ? `BAD ${bad}` : ''); await pg.close(); } }
// t409: Aimed Shot at 0, 2 and 4 dice added
for (const d of [0, 3, 6]) { const pg = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await pg.goto(`http://localhost:8190/docs/team/mockups/magiccards/magic.html?h=ranger&p=aimed&d=${d}`); await pg.waitForSelector('body[data-ready]'); await pg.waitForTimeout(400);
  await pg.screenshot({ path: `${OUT}aimed-step${d}_390x844.png` }); console.log('step', d); await pg.close(); }
await br.close(); fs.writeFileSync(`${OUT}list.json`, JSON.stringify(list));
