import { chromium } from 'playwright-core';
const out = process.argv[2]; const enemies = (process.argv[3] || 'goblin').split(','); const W = +(process.argv[4] || 462), H = +(process.argv[5] || 783);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: true, deviceScaleFactor: +(process.env.DSF || 1) });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'ranger', seed: 5 }); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate((en) => { const q = window.QD.E.questsFor(window.QD.S.hero)[0]; q.enemies = en; window.QD.startQuest(q); }, enemies);
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
await pump(3); for (let i = 0; i < 6 && !(await p.evaluate(() => !!document.querySelector('#b3-lock'))); i++) { await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(4); }
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}.png` });
console.log(JSON.stringify(await p.evaluate(() => ({ plates: document.querySelector('.b3-plates')?.getBoundingClientRect().bottom, dock: document.querySelector('.b3-dock')?.getBoundingClientRect().top, tiles: document.querySelector('.b3-dock .fs')?.getBoundingClientRect().height, deg: window.QD.B3.battleState?.trayDeg, dz: window.QD.B3.battleState?.trayDz, z: window.QD.B3.battleState?.bw?.tray.object.position.z, y: window.QD.B3.battleState?.bw?.tray.object.position.y, k: window.QD.B3.battleState?.trayK, dbg: window.QD.B3.battleState?.dbg }))));
console.log(problems.join('|') || 'ok'); await b.close();
