// Heart change on a phone: the face you are on, and the face each button turns it to.   node dev/serve.mjs 8135 ; node dev/heartchange.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'WizKid', cls: 'wizard', seed: 11 }); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const E = window.QD.E; const q = { ...E.questsFor(window.QD.S.hero)[0], enemies: ['goblin'], kind: 'battle' }; window.QD.startQuest(q); });
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2);
await p.evaluate(() => { document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click(); document.querySelector('#b3-roll')?.click(); }); await pump(5);
for (let i = 0; i < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(1);
await p.evaluate(() => { const b = window.QD.S.battle; b.board.C.v = 3; b.magic = 6; });
await p.evaluate(() => [...document.querySelectorAll('button')].find((e) => /Magic\s*powers/i.test(e.textContent))?.click()); await pump(1);
await p.evaluate(() => [...document.querySelectorAll('.b3-sheet button, .pw-sheet button, button')].find((e) => /Heart change/i.test(e.textContent) && !/Turn/.test(e.textContent))?.click()); await pump(1);
console.log('buttons:', await p.evaluate(() => [...document.querySelectorAll('.hc-btn')].map((e) => e.getAttribute('aria-label')).join(' | ')));
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/heartchange.png' });
await b.close();
