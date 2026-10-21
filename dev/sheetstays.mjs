// The magic sheet stays open after a power (Dave, Oct 2026: "sometimes you want to do 3 magic actions"); Close shuts it.
//   node dev/sheetstays.mjs [out]
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'docs/ingame';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.level = 4; S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const E = window.QD.E; window.QD.startQuest({ ...E.questsFor(window.QD.S.hero)[0], enemies: ['ogre'], kind: 'battle' }); });
for (let i = 0; i < 200 && !(await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)); i++) await pump(0.5);
for (let i = 0; i < 10 && await p.evaluate(() => [...document.querySelectorAll('button')].some((x) => /^Decline$/.test(x.textContent.trim()))); i++) { await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^Decline$/.test(x.textContent.trim()))?.click()); await pump(1); }
for (let i = 0; i < 10 && await p.evaluate(() => window.QD.S.battle?.phase === 'reset'); i++) { await p.evaluate(() => { document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click(); document.querySelector('#b3-roll')?.click(); }); await pump(2); }
for (let i = 0; i < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(1);
await p.evaluate(() => { window.QD.S.battle.magic = 12; window.QD.B3.battleState.b.magic = 12; });
const open = () => p.evaluate(() => !!document.querySelector('.b3-sheet:not(.b3-info).open'));
await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Magic powers/i.test(x.textContent))?.click()); await pump(1);
console.log('sheet open:', await open());
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/magiccap_sheet.png` });
console.log('sheet magic:', await p.evaluate(() => document.querySelector('.pw-center')?.textContent));
const castB = async (slot) => {
  await p.evaluate((slot) => document.querySelector(`.pw-medal.at-${slot}`)?.click(), slot); await pump(0.5);
  await p.evaluate(() => [...document.querySelectorAll('.pw-btn.go')].find((x) => !x.disabled)?.click()); await pump(1);
  for (let i = 0; i < 12; i++) { const done = await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) { ok.click(); return true; } return false; }); await pump(0.6); if (done) break; }
  await pump(1);
};
await castB('B'); console.log('after one power, still open:', await open(), '· magic', await p.evaluate(() => window.QD.B3.battleState.b.magic));
await castB('C'); console.log('after a second power, still open:', await open(), '· magic', await p.evaluate(() => window.QD.B3.battleState.b.magic));
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/sheetstays.png` });
await p.evaluate(() => document.querySelector('.b3-sheet:not(.b3-info) .sh-x')?.click()); await pump(0.5);
console.log('after Close:', await open(), '· chip:', await p.evaluate(() => document.querySelector('.b3-magchip:not(.b3-goldchip)')?.textContent));
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/magiccap_hud.png` });
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
