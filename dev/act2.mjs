// Beat the boss instantly (cheat) and check the victory -> camp -> Act II flow.
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path';
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) problems.push(m.text()); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: path.join(out, `${n}.png`) }); };
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 3 }); h.level = 6; h.campaign.step = 10; S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1); await p.evaluate(() => window.QD.startQuest(window.QD.E.questsFor(window.QD.S.hero)[0]));
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
await p.evaluate(() => { window.QD.S.battle.enemies.forEach((e) => { e.hp = 1; }); });
for (let r = 0; r < 6 && !(await p.evaluate(() => window.QD.S.battle.outcome)); r++) {
  if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) { await p.evaluate(() => document.querySelector('#b3-roll').click()); await pump(2.5); }
  await p.evaluate(() => { window.QD.S.battle.board.NW.v = 4; window.QD.S.battle.board.W.v = 4; }); 
  await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(6);
}
console.log('outcome', await p.evaluate(() => window.QD.S.battle.outcome));
for (let i = 0; i < 20 && !(await p.evaluate(() => document.querySelector('.sx-victory'))); i++) await pump(1);
await pump(3); await shot('victory');
const flow = [];
for (let k = 0; k < 8; k++) {
  await p.evaluate(() => { document.querySelector('.sx-perk')?.click(); }); await pump(0.5);
  await p.evaluate(() => { document.querySelector('.loot-row .sx-btn')?.click(); }); await pump(0.5);
  await p.evaluate(() => { const b = document.querySelector('.sx-cta .sx-btn'); if (b && !b.disabled) b.click(); }); await pump(1.5);
  const c = await p.evaluate(() => document.querySelector('.sx-screen')?.className.replace('hud scr sx-screen', '').trim() + ' | ' + (document.querySelector('.sx-eye')?.textContent || '') + ' | ' + (document.querySelector('h1,h2')?.textContent || ''));
  flow.push(c);
  if (/board/.test(c)) break;
}
console.log(flow.join('\n')); await shot('after');
console.log('campaign', JSON.stringify(await p.evaluate(() => { const c = window.QD.S.hero.campaign; return { act: c.act, step: c.step, wins: c.wins }; })));
console.log('quests', JSON.stringify(await p.evaluate(() => window.QD.E.questsFor(window.QD.S.hero).map((q) => `${q.name} [${q.enemies.join('+')}]`))));
console.log(problems.length ? `PROBLEMS: ${[...new Set(problems)].join(' | ')}` : 'no console errors'); await b.close();
