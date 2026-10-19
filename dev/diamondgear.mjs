// The Diamond case in the Gear tab: Left / Right to carry it into the next fight (works at a table too).  node dev/diamondgear.mjs
import { chromium } from 'playwright-core';
const out = '/tmp/claude-0/-home-user-questdice/8c0c8fef-1ceb-56a5-957d-404bdc291d52/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Magic Dave', cls: 'wizard', seed: 7 }); h.level = 5; E.takeDiamond(h, E.makeDiamond(E.makeRng(3), 1)); S.hero = h; S.company = { members: [h] }; S.tab = 'gear'; showCamp(); });
await pump(1.5);
const at = () => p.evaluate(() => { const s = document.querySelector('.sx-side'); const z = document.querySelector('.zn-diamonds'); if (s && z) s.scrollTop = z.offsetTop - 60; });
await at(); await pump(1); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/dgear_0.png` });
await p.evaluate(() => [...document.querySelectorAll('.zn-diamonds .db-hand')].find((e) => /Left/.test(e.textContent))?.click()); await pump(1); await at(); await pump(3); await p.waitForTimeout(1500); await at(); await pump(1);
console.log('armed:', await p.evaluate(() => JSON.stringify(window.QD.S.hero.armed)));
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/dgear_1.png` });
await b.close();
