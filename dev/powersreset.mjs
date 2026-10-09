// The powers sheet before the roll (recharge a spent big move) on a short phone.  node dev/powersreset.mjs [w] [h]
import { chromium } from 'playwright-core';
const [W = 390, H = 664] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const q = { ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: ['goblin'] }; window.QD.startQuest(q); });
for (let i = 0; i < 200; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2);
await p.evaluate(() => { const b = window.QD.S.battle; b.used = { cleave: true }; b.magic = 5; window.QD.B3.renderReset(); });
await p.evaluate(() => document.querySelector('.b3-powers')?.click()); await pump(0.5);
await p.evaluate(() => document.querySelector('.pw-medal.at-A')?.click()); await pump(0.4); await p.waitForTimeout(500);
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/powers_reset_${W}x${H}.png` });
console.log(await p.evaluate(() => { const s = document.querySelector('.b3-sheet'); return `sheet scroll ${s.scrollHeight - s.clientHeight}px; main button: ${document.querySelector('.pw-detail .pw-btn')?.textContent}`; }));
await b.close();
