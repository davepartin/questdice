// A company of six with three Knights and two Wizards: each repeat wears another colour set.  node dev/looks.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const c = E.newCompany({ name: 'Lanterns', roster: [{ name: 'Ada', cls: 'knight' }, { name: 'Bea', cls: 'knight' }, { name: 'Cy', cls: 'knight' }, { name: 'Dot', cls: 'wizard' }, { name: 'Eli', cls: 'wizard' }, { name: 'Fen', cls: 'dwarf' }], seed: 9 }); S.company = c; S.hero = c.members[0]; showBoard(); });
await pump(1);
await p.evaluate(() => { const q = window.QD.E.questsFor(window.QD.S.company.members[0])[0]; window.QD.startQuest(q); });
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(3); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/looks_field.png' });
// a close look: line the six heroes up in front of the camera
await p.evaluate(() => { const bw = window.QD.B3.battleState.bw; const hs = bw.heroes; hs.forEach((a, i) => { a.root.visible = i < 3 || i === 4; const k = i === 4 ? 3 : i; a.root.position.set(-2.0 + k * 1.05, 0, 2.4); a.root.scale.setScalar(1); a.root.rotation.y = 0.35; }); });
await pump(1); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/looks_line.png', clip: { x: 0, y: 0, width: 430, height: 320 } });
console.log('roster', await p.evaluate(() => [...document.querySelectorAll('.rs-chip')].map((c) => `${c.querySelector('.rs-name').textContent}:${getComputedStyle(c).borderLeftColor}`).join(' ')));
await b.close();
