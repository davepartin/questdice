// Heart Boost on the dice tray (Oct 2026): the heart and the dice showing its symbol glow in that colour and beat together.
//   node dev/heartboost.mjs [out] [strength]    (two frames: on the beat and between beats)
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'docs/ingame'; const strength = Number(process.argv[3] || 1);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.level = 6; h.dice.push('NE', 'SE'); h.strength = { W: 6, E: 6 }; S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const E = window.QD.E; window.QD.startQuest({ ...E.questsFor(window.QD.S.hero)[0], enemies: ['ogre'], kind: 'battle' }); });
for (let i = 0; i < 200 && !(await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)); i++) await pump(0.5);
for (let i = 0; i < 10 && await p.evaluate(() => [...document.querySelectorAll('button')].some((x) => /^Decline$/.test(x.textContent.trim()))); i++) { await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^Decline$/.test(x.textContent.trim()))?.click()); await pump(1); }
for (let i = 0; i < 10 && await p.evaluate(() => window.QD.S.battle?.phase === 'reset'); i++) { await p.evaluate(() => { document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click(); document.querySelector('#b3-roll')?.click(); }); await pump(2); }
for (let i = 0; i < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(1);
// set a Heart Boost: heart 1 (heal) with heal faces on the head (1), the left hand (5) and the feet (5); the right hand shows a 2
await p.evaluate((k) => { const B = window.QD.B3.battleState; const bd = B.b.board; const set = { C: 1, N: 1, W: 5, S: 5, E: 2 };
  for (const [s, v] of Object.entries(set)) { bd[s].v = v; B.bw.tray.setValue?.(s, v); } B.bw.tray.heartStrength = k; window.QD.B3.renderShape(); }, strength);
await pump(1.5);
console.log('chip:', await p.evaluate(() => [...document.querySelectorAll('.b3-forecast *, [class*="note"]')].map((e) => e.textContent.trim()).filter((t) => /HEART/i.test(t))[0] || 'none'));
// two frames: on the "lub", and resting between beats (the tray clock: beat at phase 0.06 of a 1.05s period)
const shotAt = async (name, phase) => { await p.evaluate(async (ph) => { const st = window.QD.world.stage; for (let i = 0; i < 40; i++) { const t = window.QD.B3.battleState.bw.tray.time ?? 0; if (Math.abs(((t % 1.05) / 1.05) - ph) < 0.03) break; st.simulate(1 / 60, 1 / 60); await new Promise((r) => setTimeout(r, 0)); } }, phase); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/heartboost_${name}.png` }); };
await shotAt('beat', 0.06); await shotAt('rest', 0.6);
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
