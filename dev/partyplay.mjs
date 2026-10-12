// A company of heroes' round played from a report (the shared-phone party path is gone; online tables use the same playParty).
//   node dev/partyplay.mjs [tag] [w] [h] [heroes] [enemies]
import { chromium } from 'playwright-core';
const [tag = 'pp', W = 430, H = 932, heroes = 'knight,ranger,wizard', en = 'goblin,wolf'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) console.log('CONSOLE', m.text().slice(0, 300)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${tag}_${n}.png` }); };
await p.evaluate((hs) => { const { S, E, showBoard } = window.QD; const list = hs.split(',').map((c, i) => E.newHero({ name: ['Dave', 'Ann', 'Ben', 'Cy', 'Di', 'Ed'][i], cls: c, seed: 11 + i })); S.hero = list[0]; S.company = { members: list }; showBoard(); }, heroes);
await pump(1);
await p.evaluate((en) => { const E = window.QD.E; const q = { ...E.questsFor(window.QD.S.hero)[0], enemies: en.split(','), kind: 'battle' }; window.QD.startQuest(q); }, en);
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2); await shot('0start');
await p.evaluate(() => { const { S, E, B3 } = window.QD; const b = S.battle; b.fighters.forEach((f, i) => { E.startFighter(b, i); f.target = i % 2; f.locked = true; }); if (window.__KILL) b.enemies[0].hp = 1; const rep = E.resolveParty(b); window.__rep = rep; B3.devParty(rep); });
for (let k = 0; k < Number(process.env.N || 16); k++) { await pump(Number(process.env.STEP || 0.5)); await shot(`1res${String(k).padStart(2, '0')}`); }
for (let i = 0; i < 30 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(1);
await pump(1); await p.waitForTimeout(600); await shot('2after');
await b.close();
