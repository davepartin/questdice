import { chromium } from 'playwright-core';
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 462, height: 783 }, hasTouch: true, deviceScaleFactor: 2 });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'ranger', seed: 5 }); h.level = 6; h.full = true; h.dice = null; S.hero = h; S.company = { members: [h] }; h.campaign.step = 4; showBoard(); });
await pump(1);
await p.evaluate((process_place) => { const q = window.QD.E.questsFor(window.QD.S.hero)[0]; q.enemies = ['goblin', 'wolf']; if (process_place) q.place = process_place; window.QD.startQuest(q); }, process.env.PLACE || null);
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
await pump(3); for (let i = 0; i < 6 && !(await p.evaluate(() => !!document.querySelector('#b3-lock'))); i++) { await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(4); }
await p.evaluate(() => { const bs = window.QD.B3.battleState; const t = bs.bw?.tray; for (const s of ['N','W','E','S']) t?.setValue?.(s, 4, { animate: false }); }); await pump(1);
const variants = JSON.parse(process.argv[3]);
for (const [name, look] of Object.entries(variants)) {
  await p.evaluate((look) => { const st = window.QD.world.stage; st.post.look(look); if (look.__js) eval(look.__js); }, look);
  await pump(0.3); await p.evaluate(() => window.QD.world.stage.step(1));
  await p.screenshot({ path: `${out}/${name}.png`, clip: { x: 0, y: 190, width: 462, height: 330 } });
}
console.log(problems.join('|') || 'ok'); await b.close();
