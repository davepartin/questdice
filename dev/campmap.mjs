// Camp with the "where you are" step map.  node dev/campmap.mjs [tag] [w] [h] [act] [step]
import { chromium } from 'playwright-core';
const [tag = 'cm', W = 393, H = 852, act = 1, step = 3] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
await p.evaluate(({ act, step }) => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'ranger', seed: 5 }); h.level = 2; h.gold = 35; h.campaign.act = +act; h.campaign.step = +step; S.hero = h; S.company = { members: [h] }; showCamp({ fromBoard: false }); }, { act, step });
await p.waitForTimeout(1500);
await p.evaluate(() => { const e = document.querySelector('.sx-where'); const s = document.querySelector('.sx-side, .sx-camp-scroll'); e?.scrollIntoView({ block: 'center' }); });
await p.waitForTimeout(400); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${tag}.png` });
console.log(await p.evaluate(() => document.querySelector('.sx-where')?.innerText.replace(/\n/g, ' | ')), errs.join('|') || 'no errors'); await b.close();
