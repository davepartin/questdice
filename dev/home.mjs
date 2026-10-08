// The Home button and its "Are you sure?" pop-up, on the quest board and mid-fight.  node dev/home.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, hasTouch: true, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) errs.push(m.text().slice(0, 200)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const vis = () => p.evaluate(() => { const el = document.querySelector('#home'); return !!el && !el.hidden && getComputedStyle(el).display !== 'none'; });
await pump(1); console.log('home on title:', await vis());
await p.evaluate(async () => { const { S, E, showBoard } = window.QD; const SV = await import('/js/save.js'); const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); await SV.createSave(h, 'pass123'); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1.5); await p.waitForTimeout(500); console.log('home on board:', await vis(), 'keys', await p.evaluate(() => Object.keys(localStorage)));
await p.click('#home'); await pump(0.5); await p.screenshot({ path: 'docs/ingame/home_board.png' });
console.log('board pop-up:', await p.evaluate(() => document.querySelector('.confirm-home')?.innerText.replace(/\n+/g, ' | ')));
await p.evaluate(() => [...document.querySelectorAll('.confirm-home button')].find((x) => /Keep/.test(x.textContent)).click()); await pump(0.3);
console.log('kept playing, pop-up gone:', !(await p.evaluate(() => document.querySelector('.confirm-home'))));
// mid-fight
await p.evaluate(() => { const q = window.QD.E.questsFor(window.QD.S.hero)[0]; window.QD.startQuest(q); });
for (let i = 0; i < 200; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(1); console.log('home in battle:', await vis(), 'keys', await p.evaluate(() => Object.keys(localStorage)));
await p.click('#home'); await pump(0.5); await p.screenshot({ path: 'docs/ingame/home_fight.png' });
console.log('fight pop-up:', await p.evaluate(() => document.querySelector('.confirm-home')?.innerText.replace(/\n+/g, ' | ')));
await p.evaluate(() => [...document.querySelectorAll('.confirm-home button')].find((x) => /Go home/.test(x.textContent)).click()); await pump(2);
console.log('after Go home: in battle?', await p.evaluate(() => document.body.classList.contains('in-battle')), '| home button shown?', await vis(), '| title text:', await p.evaluate(() => document.querySelector('#app')?.innerText.slice(0, 400).replace(/\n+/g, ' | ')));
await p.screenshot({ path: 'docs/ingame/home_title.png' });
console.log('storage keys:', await p.evaluate(() => Object.keys(localStorage)), 'saves:', await p.evaluate(async () => (await import('/js/save.js')).listSaves().map((x) => x.name)));
console.log('errors:', errs.length ? errs : 'none');
await b.close();
