// Tap the pet die and reroll it.  node dev/petreroll.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 430, height: 740 }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.pet = E.newPet('bunny'); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const q = { ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: ['goblin'] }; window.QD.startQuest(q); });
for (let i = 0; i < 200; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2);
for (let i = 0; i < 8 && !(await p.evaluate(() => window.QD.S.battle.phase === 'shape')); i++) { await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(6); }
await pump(1);
// tap where the pet die is on screen
const at = await p.evaluate(() => window.QD.B3.battleState.bw.tray.projectSlot('P', { dy: 0.2 }));
console.log('pet die on screen at', Math.round(at.x), Math.round(at.y), 'slotAt:', await p.evaluate(([x, y]) => window.QD.B3.battleState.bw.tray.slotAt(x, y), [at.x, at.y]));
await p.touchscreen.tap(at.x, at.y); await pump(0.6);
console.log('selected', await p.evaluate(() => [...window.QD.B3.battleState.sel]), 'caption:', await p.evaluate(() => document.querySelector('.b3-caption')?.textContent));
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/pet_selected.png' });
const before = await p.evaluate(() => window.QD.S.battle.board.P.v);
await p.evaluate(() => document.querySelector('#b3-reroll')?.click()); await pump(5);
console.log('P before', before, 'after', await p.evaluate(() => window.QD.S.battle.board.P.v), 'tray value', await p.evaluate(() => window.QD.B3.battleState.bw.tray._S.P.value), 'busy', await p.evaluate(() => window.QD.B3.battleState.busy));
const pos = await p.evaluate(() => { const s = window.QD.B3.battleState.bw.tray._S.P; return [s.pos.x.toFixed(2), s.pos.z.toFixed(2), s.home.x.toFixed(2), s.home.z.toFixed(2)]; });
console.log('pet die rest pos vs home', pos);
await b.close();
