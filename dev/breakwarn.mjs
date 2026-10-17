// Tapping a die that holds a straight or a triple together warns what a reroll could break.  node dev/breakwarn.mjs
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
// a 2-3-4-5-6 straight: weapon 2 (the sword's blue 2), head 3, heart 4, left hand 5, right hand 6
await p.evaluate(() => { const B = window.QD.B3.battleState; const bd = B.b.board; const set = { NW: 2, N: 3, C: 4, W: 5, E: 6, S: 1 };
  for (const [k, v] of Object.entries(set)) { bd[k].v = v; B.bw.tray.setValue(k, v); } window.QD.B3.renderShape(); });
await pump(1);
await p.evaluate(() => window.QD.world.stage.step(1)); // draw the board first (slow without a GPU), so the note is still up for the picture
await p.addStyleTag({ content: '.toast { animation: none !important; }' }); // its fade-in needs frames a manual-mode page never draws
await p.evaluate(() => window.QD.B3.battleState.bw.tray.onPick('W')); // the left hand, the 5 in the straight
await p.screenshot({ path: 'docs/ingame/break_warn.png' });
console.log('toast:', await p.evaluate(() => [...document.querySelectorAll('#toast .toast')].map((t) => `[${t.className}] ${t.textContent}`).join(' | ')));
console.log('where:', await p.evaluate(() => { const t = document.querySelector('#toast .toast'); if (!t) return 'none'; const r = t.getBoundingClientRect(); const cs = getComputedStyle(t); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return JSON.stringify({ r: [r.x, r.y, r.width, r.height].map(Math.round), op: cs.opacity, vis: cs.visibility, disp: getComputedStyle(document.getElementById('toast')).display, top: top?.className || top?.tagName }); }));
// tapping a die outside the straight says nothing
await p.waitForTimeout(3000);
await p.evaluate(() => window.QD.B3.battleState.bw.tray.onPick('S')); await pump(0.4);
console.log('toasts after feet:', await p.evaluate(() => [...document.querySelectorAll('#toast .toast')].map((t) => `[${t.className}] ${t.textContent}`).join(' | ') || '(none)'));
await b.close();
