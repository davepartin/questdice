import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 462, height: 783 }, hasTouch: true, deviceScaleFactor: 2 });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done','1'); localStorage.setItem('qd.hints','off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s*15); i++) { st.simulate(1/15,1/30); await new Promise(r=>setTimeout(r,0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'ranger', seed: 5 }); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const q = window.QD.E.questsFor(window.QD.S.hero)[0]; q.enemies = ['goblin','wolf']; window.QD.startQuest(q); });
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
await pump(3);
for (let i = 0; i < 8 && !(await p.evaluate(() => !!window.QD.B3.battleState?.b?.board)); i++) { await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(6); }
await p.evaluate(() => { const B = window.QD.B3.battleState; const bd = B.b.board; ['N','S','C','W','E'].forEach((k,i) => { bd[k].v = i + 1; }); window.QD.B3.renderShape(); });
await pump(1);
console.log(await p.evaluate(() => !!document.querySelector('.b3-straight')));
await pump(1); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/straight.png' }); await b.close();
