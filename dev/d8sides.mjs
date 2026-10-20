// d8 weapon dice at rest on the battle board, to see their side faces.  node dev/d8sides.mjs [tag] [dim]
import { chromium } from 'playwright-core';
const [tag = 'd8', dim] = process.argv.slice(2);
const out = '/tmp/claude-0/-home-user-questdice/8c0c8fef-1ceb-56a5-957d-404bdc291d52/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript((dim) => { if (dim) globalThis.__d8dim = +dim; try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} }, dim);
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Magic Dave', cls: 'wizard', seed: 11 }); h.level = 8; h.strength = { W: 8, E: 8 }; h.loadout.NW = E.makeWeapon('warhammer', 2, null, 8); h.loadout.NE = h.loadout.NW; h.speed = { S: 8 }; S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const E = window.QD.E; const q = { ...E.questsFor(window.QD.S.hero)[0], enemies: ['spider'], kind: 'battle' }; window.QD.startQuest(q); });
for (let i = 0; i < 200; i++) {
  if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break;
  await p.evaluate(() => { const c = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /continue|begin|fight|accept|got it|on to/i.test(e.textContent)); c?.click(); });
  await pump(0.5);
}
await pump(2);
await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(5); for (let k = 0; k < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
await pump(2); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/${tag}.png` });
await b.close();
