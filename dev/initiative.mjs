// Fight one round 2 with a weak feet die and screenshot the initiative announcement and the monster-first order.
import { chromium } from 'playwright-core';
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 462, height: 783 }, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) problems.push(m.text()); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/${n}.png` }); };
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.level = 6; h.full = true; h.dice = null; S.hero = h; S.company = { members: [h] }; h.campaign.step = 4; showBoard(); });
await pump(1);
await p.evaluate(() => { const q = window.QD.E.questsFor(window.QD.S.hero)[0]; q.enemies = ['goblin', 'wolf']; window.QD.startQuest(q); });
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
for (let r = 1; r <= 3; r++) {
  await pump(1); await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(4); for (let k = 0; k < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
  await p.evaluate(() => { const b = window.QD.S.battle; b.board.S.v = 1; window.QD.B3.renderShape(); }); await pump(0.5);
  await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(0.6);
  await shot(`r${r}-a`); await pump(1.0); await shot(`r${r}-b`);
  for (let k = 0; k < 30 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
  const rep = await p.evaluate(() => window.QD.S.battle.report); console.log('round', r, JSON.stringify({ init: rep?.init, early: rep?.early, acts: rep?.acts?.map((a) => [a.name, a.early]) }));
  if (await p.evaluate(() => window.QD.S.battle.outcome)) break;
}
console.log(problems.length ? `PROBLEMS: ${[...new Set(problems)].join(' | ')}` : 'no console errors'); await b.close();
