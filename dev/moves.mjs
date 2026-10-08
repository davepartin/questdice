// The new monster moves as they look on the field: Fire Ward, Stalk and Phase intent boxes, then a round where the hero
// hits the Fire Ward and burns.  node dev/moves.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) console.log('CONSOLE', m.text().slice(0, 300)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const clip = { x: 0, y: 0, width: 430, height: 330 };
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 11 }); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const E = window.QD.E; const q = { ...E.questsFor(window.QD.S.hero)[0], enemies: ['cultist', 'wolf', 'wraith'], kind: 'battle' }; window.QD.startQuest(q); });
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await p.evaluate(() => { const b = window.QD.S.battle; const set = (i, it) => { b.enemies[i].intent = it; };
  set(0, { n: 'Fire Ward', v: 'ward', f: 0, m: 1, k: 4 }); set(1, { n: 'Stalk', v: 'stalk', f: 0, m: 0 }); set(2, { n: 'Phase', v: 'phase', f: 0, m: 0 }); window.QD.B3.refreshPlates(); });
await pump(2); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/moves_boxes.png', clip });
// tap the mage for its sheet
// a round: aim at the warded mage, roll, lock in, and catch the burn
await p.evaluate(() => { window.QD.B3.battleState.target = 0; document.querySelector('#b3-roll')?.click(); }); await pump(5);
for (let i = 0; i < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(1);
await p.evaluate(() => document.querySelector('#b3-lock')?.click());
for (let k = 0; k < 16; k++) { await pump(0.3); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `/tmp/claude-0/-home-user-questdice/02d09c4d-6938-50b8-8304-9384ffd8dd9c/scratchpad/mv_${k}.png`, clip }); }
console.log('rep', await p.evaluate(() => JSON.stringify({ burned: window.QD.B3.battleState.lastRep?.burned, dealt: window.QD.B3.battleState.lastRep?.dealt, stalks: window.QD.B3.battleState.lastRep?.stalks, phased: window.QD.B3.battleState.lastRep?.phased })));
for (let i = 0; i < 30 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(1);
await pump(1); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/moves_after.png', clip });
console.log('wolf intent now', await p.evaluate(() => window.QD.S.battle.enemies[1].intent?.n));
await b.close();
