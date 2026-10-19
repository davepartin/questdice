// An encounter on a phone: the scene, a choice, the result, then the quest board's "Next fight" notes.
//   node dev/serve.mjs 8135 ; node dev/encounter.mjs [step=3] [choice index=1]
import { chromium } from 'playwright-core';
const [step = 3, pick = 1] = process.argv.slice(2).map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await pump(1); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/enc_${n}.png` }); };
const text = () => p.evaluate(() => (document.querySelector('.sx-side, .sx-board-main')?.textContent || '').replace(/\s+/g, ' ').slice(0, 400));
await p.evaluate((step) => { const { S, E, showRoadOrBoard } = window.QD; const h = E.newHero({ name: 'WizKid', cls: 'wizard', seed: 5 }); h.gold = 100; h.campaign.step = step; h.campaign.wins = step - 1; S.hero = h; S.company = { members: [h] }; showRoadOrBoard(); }, step);
for (let i = 0; i < 3; i++) { const c = await p.evaluate(() => { const x = [...document.querySelectorAll('.sx-storybeat .sx-cta button')].find((e) => /Continue/.test(e.textContent)); x?.click(); return !!x; }); if (!c) break; await pump(1.5); } // a story page first (the elite's)
await shot('0scene'); console.log('SCENE:', await text());
await p.evaluate((i) => document.querySelectorAll('.sx-choice')[i]?.click(), pick); await pump(3);
for (let i = 0; i < 12; i++) { const go = await p.evaluate(() => { const t = document.querySelector('.t3-go, .tr-go'); if (t && !t.disabled) { t.click(); return true; } return false; }); if (!go) { if (!(await p.evaluate(() => !!document.querySelector('.t3, .tr-layer')))) break; } await pump(2); }
await shot('1result'); console.log('RESULT:', await text());
await p.evaluate(() => [...document.querySelectorAll('.sx-cta button')].find((e) => /Onward|Continue/i.test(e.textContent))?.click()); await pump(2);
for (let i = 0; i < 3; i++) { const c = await p.evaluate(() => { const x = [...document.querySelectorAll('.sx-storybeat .sx-cta button')].find((e) => /Continue/.test(e.textContent)); x?.click(); return !!x; }); if (!c) break; await pump(1.5); }
await shot('2board'); console.log('BOARD NOTES:', await p.evaluate(() => [...document.querySelectorAll('.sx-notes .note')].map((n) => n.textContent).join(' | ')));
await b.close();
