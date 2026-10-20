// The camp dice grid (Forge and Gear) and the popup for one die.  node dev/dicegrid.mjs
import { chromium } from 'playwright-core';
const out = '/tmp/claude-0/-home-user-questdice/8c0c8fef-1ceb-56a5-957d-404bdc291d52/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const settle = async () => { await pump(2); await p.waitForTimeout(900); await pump(1); await p.evaluate(() => window.QD.world.stage.step(1)); };
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Magic Dave', cls: 'wizard', seed: 7 }); h.level = 5; h.gold = 90; h.campaign.act = 2;
  const sh = E.shopStock(h); for (const it of sh.slice(0, 2)) if (!it.inst.diamond) h.bag.push(it.inst); E.takeDiamond(h, E.makeDiamond(E.makeRng(3), 1)); S.hero = h; S.company = { members: [h] }; S.tab = 'forge'; showCamp(); });
const toGrid = () => p.evaluate(() => { const s = document.querySelector('.sx-side'); const g = document.querySelector('.sx-dicegrid'); if (s && g) s.scrollTop = g.offsetTop - 120; });
await settle(); await toGrid(); await settle(); await p.screenshot({ path: `${out}/grid_forge.png` });
for (const [slot, name] of [['W', 'hand'], ['NW', 'weapon'], ['SW', 'talent']]) {
  await p.evaluate((slot) => document.querySelector(`.dg-cell.s-${slot}`)?.click(), slot); await settle();
  console.log(slot, (await p.evaluate(() => document.querySelector('.slot-sheet')?.innerText || 'no sheet')).replace(/\n+/g, ' | ').slice(0, 260));
  await p.screenshot({ path: `${out}/grid_pop_${name}.png` });
  await p.evaluate(() => [...document.querySelectorAll('.slot-sheet button')].find((e) => e.textContent.trim() === 'Done')?.click()); await pump(0.5);
}
await p.evaluate(() => { window.QD.S.tab = 'gear'; window.QD.showCamp(); }); await settle(); await toGrid(); await settle(); await p.screenshot({ path: `${out}/grid_gear.png` });
await b.close();
