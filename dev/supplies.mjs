// The camp Supplies page with too little gold for the next reroll die (Dave, Oct 2026: the price button squashed the text).
//   node dev/supplies.mjs [out=shots]
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'shots';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Magic Dave', cls: 'wizard', seed: 5 }); h.level = 7; h.gold = 167; h.campaign.act = 2; S.hero = h; S.company = { members: [h] }; S.seat = 0; showCamp(); });
await p.waitForTimeout(800);
await p.evaluate(() => [...document.querySelectorAll('.cw-nav button')].find((x) => /Supplies/.test(x.textContent))?.click()); await p.waitForTimeout(600);
await p.evaluate(() => document.querySelector('.ur-buy.poor')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
const r = await p.evaluate(() => { const row = document.querySelector('.ur-buy.poor')?.closest('.sx-urow'); const c = row?.querySelector('.ur-copy'); const bt = row?.querySelector('.ur-buy'); return row ? { copy: Math.round(c.getBoundingClientRect().width), button: Math.round(bt.getBoundingClientRect().width), row: Math.round(row.getBoundingClientRect().width) } : null; });
console.log('widths:', JSON.stringify(r));
await p.screenshot({ path: `${out}/supplies-poor.png` });
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
