// How long one roll of the dice takes on screen, in game seconds.  node dev/rolltime.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 30); i++) { st.simulate(1 / 30, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1); await p.evaluate(() => window.QD.startQuest(window.QD.E.questsFor(window.QD.S.hero)[0]));
for (let i = 0; i < 200 && !(await p.evaluate(() => !!document.querySelector('#b3-roll'))); i++) await pump(0.5);
await pump(2);
for (const label of ['first roll', 'reroll of 3 dice']) {
  const secs = await p.evaluate(async (label) => {
    const st = window.QD.world.stage; const B = window.QD.B3.battleState; let done = false; let t = 0;
    if (label === 'first roll') document.querySelector('#b3-roll').click();
    else { const tray = B.bw.tray; const pr = tray.roll(B.b.board, { slots: ['N', 'W', 'S'] }); pr.then(() => { done = true; }); }
    const check = () => (label === 'first roll' ? !B.busy : done);
    await new Promise((r) => setTimeout(r, 0));
    while (!check() && t < 10) { st.simulate(1 / 60, 1 / 60); t += 1 / 60; await new Promise((r) => setTimeout(r, 0)); }
    return t.toFixed(2);
  }, label);
  console.log(`${label}: ${secs} s`);
  await pump(1);
}
await b.close();
