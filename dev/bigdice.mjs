// The battle dice of a late-game hero: a Diamond d10 sword and a Gold d8 shield in d10 hands.   node dev/bigdice.mjs [tag]
import { chromium } from 'playwright-core';
const [tag = 'bt', W = 430, H = 932, en = 'goblin,wolf'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) console.log('CONSOLE', m.text().slice(0, 300)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${tag}_${n}.png` }); };
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 11 }); h.level = 12; h.strength = { W: 10, E: 10 }; h.loadout.NW = E.makeWeapon('sword', 3, null, 10); h.loadout.NE = E.makeWeapon('shield', 2, null, 8); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate((en) => { const E = window.QD.E; const q = { ...E.questsFor(window.QD.S.hero)[0], enemies: en.split(','), kind: 'battle' }; window.QD.startQuest(q); }, en);
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2); await shot('0start');
if (process.env.HP1) await p.evaluate((n) => { for (const e of window.QD.S.battle.enemies.slice(0, +n)) e.hp = 1; window.QD.B3.refreshPlates(); }, process.env.HP1);
if (process.env.CLS) {}
await p.evaluate(() => { (document.querySelector('#b3-roll')?.disabled && document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click(), document.querySelector('#b3-roll')?.click()); }); await pump(5);
for (let i = 0; i < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(1);
await shot('1rolled');
if (process.env.WIN) await p.evaluate(() => { const b = window.QD.S.battle; b.mods.atk = 99; b.mods.aoe = 99; });
if (process.env.LOSE) await p.evaluate(() => { const b = window.QD.S.battle; b.hp = 1; b.mods.block = 0; });
await p.evaluate(() => document.querySelector('#b3-lock')?.click());
const STEP = Number(process.env.STEP || 0.4); const N = Number(process.env.N || 14);
for (let k = 0; k < N; k++) { await pump(STEP); await shot(`2res${String(k).padStart(2, '0')}`); }
for (let i = 0; i < 30 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(1);
await pump(1); if (process.env.WIN || process.env.LOSE) { await pump(4); await p.waitForTimeout(800); }
await shot('3after');
await b.close();
