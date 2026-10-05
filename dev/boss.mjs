// Plays the Goblin King fight with a strong hero and reports every plate in the DOM each round (hunts duplicate/ghost plates).
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const port = args.port || 8135; const out = args.out || 'shots/boss'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) problems.push(m.text()); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: path.join(out, `${n}.png`) }); };
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 3 }); h.level = 4; h.campaign.step = 10; S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const q = window.QD.E.questsFor(window.QD.S.hero)[0]; window.QD.startQuest(q); });
const plates = () => p.evaluate(() => [...document.querySelectorAll('.b3-plate')].map((e) => `${e.dataset.uid}|${e.querySelector('.pl-name')?.textContent}|${e.style.transform ? 'placed' : 'UNPLACED'}|${getComputedStyle(e).display}`));
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
for (let round = 1; round <= 14; round++) {
  const o = await p.evaluate(() => window.QD.S.battle.outcome); if (o) { console.log('outcome', o); break; }
  if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) { await p.evaluate(() => document.querySelector('#b3-roll').click()); await pump(2.5); }
  console.log(`round ${round}:`, JSON.stringify(await plates()), 'enemies', await p.evaluate(() => window.QD.S.battle.enemies.map((e) => `${e.id}:${e.hp}`).join(',')));
  if (round >= 5) await shot('r'+round);
  await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(5);
  for (let i = 0; i < 30 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(1);
}
// second attempt through the real screens (defeat -> camp -> board -> quest)
await pump(4);
for (const sel of ['.sx-defeat .sx-cta .sx-btn', '.sx-camp .sx-cta .sx-btn']) { await p.evaluate((s) => document.querySelector(s)?.click(), sel); await pump(2); }
for (let k = 0; k < 3; k++) { await p.evaluate(() => { const c = [...document.querySelectorAll('.sx-choice')].find((x) => !x.disabled && !x.classList.contains('off')); if (c) { c.click(); return; } document.querySelector('.sx-road .sx-cta .sx-btn')?.click(); }); await pump(1.5); }
console.log('screen now', await p.evaluate(() => document.querySelector('.sx-screen')?.className));
await p.evaluate(() => document.querySelector('.sx-qcard')?.click()); await pump(3);
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
console.log('second attempt: b3 roots', await p.evaluate(() => document.querySelectorAll('.b3').length), 'plates', JSON.stringify(await plates()), 'titlecards', await p.evaluate(() => document.querySelectorAll('.b3-titlecard').length));
await shot('second');
await shot('end'); console.log(problems.length ? `PROBLEMS: ${[...new Set(problems)].join(' | ')}` : 'no console errors'); await b.close();
