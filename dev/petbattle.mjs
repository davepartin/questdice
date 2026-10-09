// The pet die beside the board in battle.  node dev/petbattle.mjs [w] [h] [name] [pet]
import { chromium } from 'playwright-core';
const [w = 430, hh = 932, name = 'pet_battle', pet = 'pup', size = '4'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +w, height: +hh }, hasTouch: +w < 800, deviceScaleFactor: +w < 800 ? 2 : 1 });
p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) console.log('CONSOLE', m.text().slice(0, 300)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(([pet, size]) => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.strength = { W: 6, E: 6 }; if (pet !== 'none') { h.pet = E.newPet(pet); h.pet.faces[2] = ['gold']; h.pet.size = +size; while (h.pet.faces.length < h.pet.size - 1) h.pet.faces.push([]); if (+size > 4) h.pet.faces[3] = [h.pet.faces[0][0], h.pet.faces[0][0]]; } S.hero = h; S.company = { members: [h] }; showBoard(); }, [pet, size]);
await pump(1);
await p.evaluate(() => { const q = { ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: ['goblin', 'goblin'] }; window.QD.startQuest(q); });
for (let i = 0; i < 200; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2);
await p.screenshot({ path: `docs/ingame/${name}_wait.png` });
for (let i = 0; i < 8 && !(await p.evaluate(() => window.QD.S.battle.phase === 'shape')); i++) { await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(6); }
const info = await p.evaluate(() => { const B = window.QD.B3.battleState; return { frac: B.trayFrac, dbg: B.dbg, P: B.b.board.P, fc: window.QD.E.evaluate(B.hero, B.b.board).pet }; });
console.log(JSON.stringify(info));
await pump(1.5); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${name}.png` });
await b.close();
