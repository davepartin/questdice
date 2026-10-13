// The order after a round: the monsters' cards (held until closed), then the round recap (closed the same way).
//   node dev/monsterpanel.mjs [tag] [w] [h] [cls] [foes] [rounds]
import { chromium } from 'playwright-core';
const [tag = 'mp', W = 393, H = 852, cls = 'knight', en = 'goblin,wolf,ogre', rounds = 3] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1.5, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(`pageerror ${e.message}`));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${tag}_${n}.png` }); };
await p.evaluate((cls) => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls, seed: 11 }); h.level = 10; S.hero = h; S.company = { members: [h] }; showBoard(); }, cls);
await pump(1);
await p.evaluate((en) => { const E = window.QD.E; window.QD.startQuest({ ...E.questsFor(window.QD.S.hero)[0], enemies: en.split(','), kind: 'battle' }); }, en);
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(3);
const state = () => p.evaluate(() => ({ panel: !!document.querySelector('.fb-pops.ready'), cards: document.querySelectorAll('.fb-pops .fb-pop').length, recap: !!document.querySelector('.b3 .rc'), outcome: window.QD.S.battle?.outcome || null }));
for (let r = 1; r <= +rounds; r++) {
  const s0 = await state(); if (s0.outcome) break;
  for (let k = 0; k < 40 && !(await p.evaluate(() => !!document.querySelector('#b3-roll') && !window.QD.B3.battleState.busy)); k++) await pump(0.5);
  await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(5);
  for (let k = 0; k < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
  await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(2);
  for (let n = 0; n < 60 && await p.evaluate(() => window.QD.B3.battleState.busy); n++) await pump(1);
  await pump(1.5);
  const a = await state(); console.log(`round ${r} after the monsters:`, JSON.stringify(a));
  if (a.outcome) break;
  if (a.cards) { if (!a.panel || a.recap) problems.push(`round ${r}: cards ${a.cards}, panel held ${a.panel}, recap already up ${a.recap} (want panel held, no recap)`); await shot(`r${r}_monsters`); await p.evaluate(() => document.querySelector('.fb-pops .rc-close')?.click()); await pump(0.6); }
  const c = await state(); console.log(`  after closing the monsters:`, JSON.stringify(c));
  if (!c.recap) problems.push(`round ${r}: no recap after closing the monsters`); if (c.panel) problems.push(`round ${r}: the monsters' panel is still up`);
  await shot(`r${r}_recap`); await p.evaluate(() => document.querySelector('.b3 .rc .rc-close')?.click()); await pump(0.6);
  const d = await state(); if (d.recap || d.panel) problems.push(`round ${r}: something is still covering the board after closing the recap`);
}
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no problems'); await b.close();
