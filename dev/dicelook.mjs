// Phone screenshot of a rolled tray: node dev/dicelook.mjs out.png [cls] [style]
import { chromium } from 'playwright-core';
const out = process.argv[2]; const cls = process.argv[3] || 'knight';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +(process.env.VW||430), height: +(process.env.VH||932) }, hasTouch: true, deviceScaleFactor: process.env.DSF ? +process.env.DSF : 1 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript((n) => { window.__NEW = n; try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} }, !!process.env.NEW);
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate((cls) => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls, seed: 5 }); if (!window.__NEW) { h.level = 6; h.full = true; h.dice = null; } S.hero = h; S.company = { members: [h] }; h.campaign.step = 4; showBoard(); }, cls);
await pump(1);
await p.evaluate(() => { const q = window.QD.E.questsFor(window.QD.S.hero)[0]; window.QD.startQuest(q); });
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
await pump(2); await p.evaluate(() => document.querySelector("#b3-roll")?.click()); await pump(4); for (let k = 0; k < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: out, clip: process.env.CLIP ? (([x,y,w,h]) => ({x,y,width:w,height:h}))(process.env.CLIP.split(',').map(Number)) : undefined }); await b.close();
