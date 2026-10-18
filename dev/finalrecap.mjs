// The round that ends a fight shows its recap, with Victory › to move on.  node dev/finalrecap.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) console.log('CONSOLE', m.text().slice(0, 300)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.strength = { W: 6, E: 6 }; S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const q = { ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: ['cultist', 'goblin'] }; window.QD.startQuest(q); });
for (let i = 0; i < 200; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2);
for (let i = 0; i < 8 && !(await p.evaluate(() => window.QD.S.battle.phase === 'shape')); i++) { await p.evaluate(() => (document.querySelector('#b3-roll')?.disabled && document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click(), document.querySelector('#b3-roll')?.click())); await pump(6); }
// weaken the monsters so this lock-in wins the fight
await p.evaluate(() => { const B = window.QD.B3.battleState; const b = B.b; b.enemies[0].hp = 1; b.enemies.slice(1).forEach((e) => { e.hp = 0; });
  const bd = b.board; for (const [k, v] of Object.entries({ NW: 4, N: 3, C: 6, W: 4, E: 4, S: 2 })) { bd[k].v = v; B.bw.tray.setValue(k, v); } window.QD.B3.renderShape(); });
await p.evaluate(() => document.querySelector('#b3-lock')?.click());
for (let i = 0; i < 60 && !(await p.evaluate(() => !!document.querySelector('.rc-go'))); i++) await pump(0.5);
console.log('final recap up:', await p.evaluate(() => document.querySelector('.rc-go')?.textContent), '| head:', await p.evaluate(() => document.querySelector('.rc-head span')?.textContent));
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/final_recap.png' });
await p.evaluate(() => document.querySelector('.rc-go')?.click());
for (let i = 0; i < 40 && !(await p.evaluate(() => !!document.querySelector('.sx-victory'))); i++) await pump(0.5);
console.log('after tap:', await p.evaluate(() => JSON.stringify({ victory: !!document.querySelector('.sx-victory'), screen: document.querySelector('#app > *')?.className?.slice(0, 80), card: !!document.querySelector('.b3 .rc'), busy: window.QD.B3.battleState.busy, ended: window.QD.B3.battleState.ended, layer: document.querySelector('#b3')?.className })));
await b.close();
