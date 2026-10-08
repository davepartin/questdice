// Power slots: camp (learn / swap) and the battle powers sheet (A B C + Healing).  node dev/powers.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) console.log('console', m.text().slice(0, 200)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.gold = 140; h.level = 3; h.learned = ['secondwind'];
  S.hero = h; S.company = { members: [h] }; S.tab = 'forge'; showCamp({ fromBoard: true }); });
await pump(3);
await p.evaluate(() => { const el = document.querySelector('.sx-side'); const t = document.querySelector('.sx-pslot'); el.scrollTop += t.getBoundingClientRect().top - 120; }); await pump(0.5);
await p.screenshot({ path: 'docs/ingame/powers_camp.png' });
// learn Press the Attack (slot B)
await p.evaluate(() => [...document.querySelectorAll('.sx-pslot.s-B .ur-buy')].find((x) => /Learn/.test(x.textContent))?.click()); await pump(0.5);
console.log('after learning:', await p.evaluate(() => window.QD.E.cardsOf(window.QD.S.hero).map((c) => c.slot + ':' + c.name).join(', ')), 'gold', await p.evaluate(() => window.QD.S.hero.gold));
// battle sheet
await p.evaluate(() => { window.QD.showBoard(); }); await pump(1);
await p.evaluate(() => window.QD.startQuest(window.QD.E.questsFor(window.QD.S.hero)[0]));
for (let i = 0; i < 200 && !(await p.evaluate(() => !!document.querySelector('#b3-roll'))); i++) await pump(0.5);
await pump(2); await p.click('#b3-roll'); for (let i = 0; i < 40 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(0.5);
await p.evaluate(() => document.querySelector('.b3-powers')?.click()); await pump(1);
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/powers_battle.png' });
await b.close();
