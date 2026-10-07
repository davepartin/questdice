// Battle points: counter in battle, victory stat, hall of fame and potion belt at camp.  node dev/points.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.level = 4; h.gold = 160; h.record = { battles: 11, points: 1342, best: 188, firsts: 3, seconds: 1, wins: 10 }; S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const q = window.QD.E.questsFor(window.QD.S.hero)[0]; window.QD.startQuest(q); });
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
await pump(2);
for (let r = 0; r < 2; r++) { await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(6); await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(10); }
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/points_battle.png', clip: { x: 0, y: 0, width: 430, height: 220 } });
console.log('battle points', await p.evaluate(() => window.QD.E.pointsOf(window.QD.B3.battleState.b)), await p.evaluate(() => document.querySelector('.b3-score')?.innerText));
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.level = 4; h.gold = 160; h.record = { battles: 11, points: 1342, best: 188, firsts: 3, seconds: 1, wins: 10 }; S.hero = h; S.company = { members: [h] }; showCamp({ fromBoard: false }); }); await pump(6);
await p.evaluate(() => [...document.querySelectorAll('button,[role=tab]')].find((e) => /^\s*hero\s*$/i.test(e.textContent))?.click()); await pump(3);
await p.evaluate(() => document.querySelector('.sx-hof')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(600);
await p.screenshot({ path: 'docs/ingame/points_hof.png' });
await p.evaluate(() => [...document.querySelectorAll('button,[role=tab]')].find((e) => /^\s*forge\s*$/i.test(e.textContent))?.click()); await pump(3);
console.log(await p.evaluate(() => [...document.querySelectorAll('.sx-urow')].map((e) => e.innerText.replace(/\n/g, ' | ')).find((t) => /Potion/.test(t))));
await b.close();
