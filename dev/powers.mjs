// Cast powers in a real battle: dice power, scale power with the stepper, at-will, super (round 3), splash on three monsters.
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path';
const out = process.argv[2]; const cls = process.argv[3] || 'knight'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) problems.push(m.text()); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: path.join(out, `${n}.png`) }); };
await p.evaluate((cls) => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls, seed: 5 }); h.level = 6; h.full = true; h.dice = null; S.hero = h; S.company = { members: [h] }; h.campaign.step = 4; showBoard(); }, cls);
await pump(1);
await p.evaluate(() => { const q = window.QD.E.questsFor(window.QD.S.hero)[0]; q.enemies = ['goblin', 'goblin', 'wolf']; window.QD.startQuest(q); });
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
const tiles = () => p.evaluate(() => [...document.querySelectorAll('.bcard')].map((c) => c.querySelector('.bc-name')?.textContent + ' | ' + (c.querySelector('.bc-flag')?.textContent || '-') + ' | cost ' + c.querySelector('.bc-cost b')?.textContent + (c.disabled ? ' (off)' : '')));
for (let r = 1; r <= 4; r++) {
  await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(3); for (let k = 0; k < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
  await p.evaluate(() => { window.QD.S.battle.magic = 12; window.QD.B3.renderShape(); }); await pump(0.5);
  console.log(`round ${r} tiles:`, JSON.stringify(await tiles()));
  if (r === 1) await shot('r1-tiles');
  // cast every available power
  for (let k = 0; k < 6; k++) { await p.evaluate(() => { const c = [...document.querySelectorAll('.bcard:not(:disabled)')][0]; c?.click(); }); await pump(0.8); }
  console.log(`  after casts mods`, JSON.stringify(await p.evaluate(() => window.QD.S.battle.mods)), 'last', JSON.stringify(await p.evaluate(() => window.QD.S.battle.lastCast)));
  if (r === 3) await shot('r3-after-casts');
  await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(7);
  for (let k = 0; k < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
  console.log('  enemies', await p.evaluate(() => window.QD.S.battle.enemies.map((e) => e.hp).join(',')), 'outcome', await p.evaluate(() => window.QD.S.battle.outcome));
  if (r === 3) await shot('r3-resolved');
  if (await p.evaluate(() => window.QD.S.battle.outcome)) break;
}
console.log(problems.length ? `PROBLEMS: ${[...new Set(problems)].join(' | ')}` : 'no console errors'); await b.close();
