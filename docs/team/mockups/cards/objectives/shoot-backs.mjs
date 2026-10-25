// node shoot-backs.mjs -> ../png/objectives/  (375w per back)
import { chromium } from '/workspace/pw/node_modules/playwright/index.mjs';
const out = process.env.OUT || new URL('../png/objectives/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage({ viewport: { width: 375, height: 600 }, deviceScaleFactor: 2 });
await p.goto(new URL('backs.html', import.meta.url).href); await p.waitForSelector('body[data-ready]'); await p.waitForTimeout(300);
for (const k of ['objective', 'secret']) await p.locator(`.ob[data-k=${k}]`).screenshot({ path: `${out}/back-${k === 'secret' ? 'secret-objective' : 'objective'}_375w.png` });
await b.close();
