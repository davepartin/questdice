// The dice-power window (Arc Bolt with 4 magic = 3d8), the strike-first banner, and the once-a-round heart.  node dev/arcbolt.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${n}.png` }); };
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'wizard', seed: 5 }); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const q = { ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: ['goblin', 'goblin'] }; window.QD.startQuest(q); });
for (let i = 0; i < 200; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2);
// the banner, longest form (held still for the picture)
await p.evaluate(async () => { const HK = await import('./js/g3/hudkit.js'); const host = document.querySelector('.b3'); const el = HK.banner(host, 'YOU STRIKE FIRST  ⚡3', 'gold'); const c = el.cloneNode(true); el.remove(); c.style.animation = 'none'; c.id = 'keep'; host.append(c); });
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/banner_fit.png' });
console.log('banner text spans', await p.evaluate(() => { const r = document.querySelector('#keep .bn-core').getBoundingClientRect(); return `${Math.round(r.left)}..${Math.round(r.right)} of ${innerWidth}`; }));
await p.waitForTimeout(1500);
for (let i = 0; i < 8 && !(await p.evaluate(() => window.QD.S.battle.phase === 'shape')); i++) { await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(6); }
await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.magic = 10; B.powerX = { arcbolt: 4 }; window.QD.B3.renderShape(); });
await p.evaluate(() => document.querySelector('.b3-powers, #b3-powers, [class*="powers"]')?.click()); await pump(0.6);
const opened = await p.evaluate(() => { const c = [...document.querySelectorAll('.b3-cards > *')].find((e) => /Arc Bolt/i.test(e.textContent)); c?.click(); return !!c; });
await pump(0.4);
const used = await p.evaluate(() => { const bt = document.querySelector('.b3-info .pd-btn.go'); const t = bt?.textContent; bt?.click(); return t; });
console.log('opened arc bolt card', opened, 'pressed', used);
await p.waitForTimeout(500); await shot('arcbolt_rolling');
await p.waitForTimeout(1900); await shot('arcbolt_landed');
console.log('window:', await p.evaluate(() => document.querySelector('.dr-card')?.innerText.replace(/\n+/g, ' | ')));
const atkBefore = await p.evaluate(() => document.querySelector('.fc.t-atk .fc-n')?.textContent);
await p.evaluate(() => document.querySelector('.dr-ok')?.click()); await p.waitForTimeout(400); await pump(0.3); await shot('arcbolt_after');
console.log('attack counter before OK', atkBefore, 'after', await p.evaluate(() => document.querySelector('.fc.t-atk .fc-n')?.textContent), 'mods', await p.evaluate(() => JSON.stringify(window.QD.S.battle.mods)));
// heart: once a round
const E = 'window.QD.E';
console.log('heart:', await p.evaluate(() => { const b = window.QD.S.battle; b.magic = 10; const E = window.QD.E; const a = E.nudge(b, b.board.C.v < 6 ? 1 : -1); const c = E.nudge(b, b.board.C.v > 1 ? -1 : 1); return `first ${a}, second ${c}`; }));
void E;
await b.close();
