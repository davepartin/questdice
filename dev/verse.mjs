// Verse for a friend (the lab): a Bard and a hurt Knight; the Bard opens Lucky Verse and sees who it can be for. node dev/verse.mjs [out=shots]
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'shots';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?lab&debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 400000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const ms = [E.newHero({ name: 'Bea', cls: 'bard', seed: 3 }), E.newHero({ name: 'Kit', cls: 'knight', seed: 4 })]; S.hero = ms[0]; S.company = { members: ms }; showBoard(); });
await pump(1);
await p.evaluate(() => { const { E, S } = window.QD; window.QD.startQuest({ ...E.questsFor(S.hero)[0], enemies: ['ogre'], kind: 'battle' }); });
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^(Decline|Continue)$/.test(x.textContent.trim()))?.click()); await pump(0.5); }
await pump(2);
await p.evaluate(() => { window.QD.S.battle.fighters[1].hp = 12; document.querySelector('#b3-roll')?.click(); }); await pump(4);
for (let i = 0; i < 30 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(0.5);
await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.magic = 9; document.querySelector('.b3-powers:not(.b3-team)')?.click(); }); await pump(0.6);
const found = await p.evaluate(() => { const el = [...document.querySelectorAll('button, [role="button"]')].find((x) => /Lucky Verse/i.test(x.getAttribute('aria-label') || x.textContent)); el?.click(); return !!el; }); await pump(0.6);
console.log('verse button found:', found, '| choices:', await p.evaluate(() => [...document.querySelectorAll('.pd-for button')].map((x) => x.textContent.trim())));
await p.evaluate(() => document.querySelector('.pd-for')?.scrollIntoView({ block: 'center' })); await pump(0.3);
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/verse-choice.png` });
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
