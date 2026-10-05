// First-time player's view: the hint cards in the first battle, first camp, loot and traveller.
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path';
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) problems.push(m.text()); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: path.join(out, `${n}.png`) }); };
const card = () => p.evaluate(() => document.querySelector('.b3-coachcard .cc-tx b')?.textContent || null);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 3 }); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1); await p.evaluate(() => window.QD.startQuest(window.QD.E.questsFor(window.QD.S.hero)[0]));
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
await pump(1); await p.waitForTimeout(600); console.log('1 reset hint:', await card()); await shot('1-reset');
await p.evaluate(() => document.querySelector('.cc-ok')?.click()); await p.evaluate(() => document.querySelector('#b3-roll').click()); await pump(3.5);
console.log('2 shape hint:', await card()); await shot('2-shape');
await p.evaluate(() => document.querySelector('.cc-ok')?.click());
await p.evaluate(() => { const B = window.QD.B3.battleState; B.sel.add('N'); B.sel.add('S'); window.QD.B3.renderShape(); }); await p.evaluate(() => document.querySelector('#b3-reroll')?.click()); await pump(4);
console.log('3 after first reroll hint:', await card()); await p.evaluate(() => document.querySelector('.cc-ok')?.click());
await p.evaluate(() => { window.QD.S.battle.enemies.forEach((e) => { e.hp = 1; }); });
for (let r = 0; r < 8 && !(await p.evaluate(() => window.QD.S.battle.outcome)); r++) {
  if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) { await p.evaluate(() => document.querySelector('#b3-roll').click()); await pump(2.5); }
  await p.evaluate(() => { document.querySelector('.cc-ok')?.click(); window.QD.S.battle.board.NW.v = 4; window.QD.S.battle.board.W.v = 4; });
  await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(6);
}
for (let i = 0; i < 30 && !(await p.evaluate(() => document.querySelector('.sx-victory'))); i++) { await pump(1); }
await pump(2); console.log('hero tips', JSON.stringify(await p.evaluate(() => window.QD.S.hero.tips)), 'hints', await p.evaluate(() => localStorage.getItem('qd.hints')), 'screen', await p.evaluate(() => document.querySelector('.sx-screen')?.className)); console.log('victory screen tip:', await p.evaluate(() => document.querySelector('.sx-victory .sx-tip p')?.textContent)); await shot('4-victory');
await p.evaluate(() => { document.querySelector('.sx-perk')?.click(); document.querySelector('.loot-row .sx-btn')?.click(); }); await pump(0.6);
await p.evaluate(() => document.querySelector('.sx-cta .sx-btn')?.click()); await pump(2);
console.log('camp tip:', await p.evaluate(() => document.querySelector('.sx-camp .sx-tip p')?.textContent)); await shot('5-camp');
// hints off
await p.evaluate(() => document.querySelector('.sx-camp .sx-tip .sx-link:last-child')?.click()); await pump(0.3);
console.log('hints on after off?', await p.evaluate(() => localStorage.getItem('qd.hints')));
console.log(problems.length ? `PROBLEMS: ${[...new Set(problems)].join(' | ')}` : 'no console errors'); await b.close();
