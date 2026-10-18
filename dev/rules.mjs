// The Rules sheet (the ? button) on a phone: it reads top to bottom, triples and straights included.  node dev/rules.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
await p.evaluate(() => document.querySelector('#help')?.click()); await p.waitForTimeout(500);
const el = await p.$('.howto'); if (!el) { console.log('no rules sheet'); process.exit(1); }
await p.evaluate(() => { const h3 = [...document.querySelectorAll('.howto h3')].find((x) => /Triples/.test(x.textContent)); h3?.scrollIntoView(); });
await p.screenshot({ path: 'docs/ingame/rules_triples.png' });
console.log(await p.evaluate(() => [...document.querySelectorAll('.howto h3')].map((x) => x.textContent).join(' | ')));
await b.close();
