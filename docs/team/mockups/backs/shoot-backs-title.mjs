// node shoot-backs-title.mjs -> ../cards/png/backs-title/
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
const out = process.env.OUT || new URL('../cards/png/backs-title/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage({ viewport: { width: 760, height: 700 }, deviceScaleFactor: 2 });
await p.goto(new URL('backs-title.html', import.meta.url).href); await p.waitForSelector('body[data-ready]'); await p.waitForTimeout(300);
for (const k of ['objective', 'secret-objective']) await p.locator(`.bk[data-k=${k}]`).screenshot({ path: `${out}/back-${k}-title_375w.png` });
await p.locator('#big').screenshot({ path: `${out}/backs-title-side-by-side.png` });
await p.locator('#hand').screenshot({ path: `${out}/backs-title-hand-120px.png` });
await b.close();
