// Monsters roll their fight bonus as dice (Oct 2026): the plates say "2+3d8", the info sheet "base 2 + 3d8".   node dev/monsterdice.mjs [out]
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'docs/ingame';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'wizard', seed: 5 }); h.level = 12; h.campaign.act = 3; h.campaign.step = 4; S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const E = window.QD.E; window.QD.startQuest({ ...E.questsFor(window.QD.S.hero)[0], enemies: ['cinderling', 'chainbinder', 'ironwarden'], kind: 'battle' }); });
for (let i = 0; i < 200 && !(await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)); i++) await pump(0.5);
for (let i = 0; i < 10 && await p.evaluate(() => [...document.querySelectorAll('button')].some((x) => /^Decline$/.test(x.textContent.trim()))); i++) { await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^Decline$/.test(x.textContent.trim()))?.click()); await pump(1); }
await pump(3);
console.log('plates:', await p.evaluate(() => [...document.querySelectorAll('.fb-plan, .fb-intent, [class*="plan"]')].map((e) => e.textContent.trim()).filter(Boolean).slice(0, 6).join(' | ')));
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/monsterdice_board.png` });
await p.evaluate(() => document.querySelector('.fb-info, .fb-i, [aria-label*="About"]')?.click()); await pump(1.5);
console.log('info dice:', await p.evaluate(() => [...document.querySelectorAll('.fi-die')].map((e) => e.textContent.trim()).join(' | ')));
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/monsterdice_info.png` });
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
