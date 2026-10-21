// The recap no longer hides the next round starting (Dave, Oct 2026): while the round recap is up, the "ROUND n" banner waits;
// closing the recap plays it.   node dev/recapbeat.mjs [out dir]
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'docs/ingame';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.level = 6; S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const E = window.QD.E; window.QD.startQuest({ ...E.questsFor(window.QD.S.hero)[0], enemies: ['ogre'], kind: 'battle' }); });
for (let i = 0; i < 200 && !(await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)); i++) await pump(0.5);
for (let i = 0; i < 10 && await p.evaluate(() => [...document.querySelectorAll('button')].some((x) => /^Decline$/.test(x.textContent.trim()))); i++) { await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^Decline$/.test(x.textContent.trim()))?.click()); await pump(1); await p.waitForTimeout(200); }
for (let i = 0; i < 10 && await p.evaluate(() => window.QD.S.battle?.phase === 'reset'); i++) { await p.evaluate(() => { document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click(); document.querySelector('#b3-roll')?.click(); }); await pump(2); await p.waitForTimeout(200); }
for (let i = 0; i < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(1);
await p.evaluate(() => document.querySelector('#b3-lock')?.click());
await pump(1); console.log('state:', await p.evaluate(() => JSON.stringify({ busy: window.QD.B3.battleState.busy, round: window.QD.S.battle?.round, phase: window.QD.S.battle?.phase, btns: [...document.querySelectorAll('button')].map((x) => x.textContent.trim()).filter(Boolean).slice(0, 9) })));
let sawBannerBehind = false;
for (let i = 0; i < 80 && !(await p.evaluate(() => !!document.querySelector('.b3 .rc'))); i++) { await p.waitForTimeout(150); await pump(0.3); }
for (let i = 0; i < 10; i++) { if (await p.evaluate(() => !!document.querySelector('.b3-round-fl'))) sawBannerBehind = true; await p.waitForTimeout(150); }
console.log('recap up:', await p.evaluate(() => !!document.querySelector('.b3 .rc')), '· round banner behind it:', sawBannerBehind);
await p.evaluate(() => document.querySelector('.b3 .rc')?.click()); await p.waitForTimeout(100);
const after = await p.evaluate(() => !!document.querySelector('.b3-round-fl'));
console.log('banner after closing the recap:', after);
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/recapbeat.png` });
if (sawBannerBehind || !after) problems.push('the round banner should wait for the recap to close');
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no problems'); await b.close();
