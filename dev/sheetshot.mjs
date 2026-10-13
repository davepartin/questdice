// Just the magic powers sheet, opened (and optionally with one power picked).  node dev/sheetshot.mjs tag w h [cls] [pick A|B|C|heal]
import { chromium } from 'playwright-core';
const [tag = 'sh', W = 393, H = 852, cls = 'wizard', pick = ''] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate((cls) => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls, seed: 5 }); S.hero = h; S.company = { members: [h] }; showBoard(); }, cls);
await pump(1);
await p.evaluate(() => { const q = { ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: ['goblin', 'wolf', 'goblin'] }; window.QD.startQuest(q); });
for (let i = 0; i < 200; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2);
for (let i = 0; i < 8 && !(await p.evaluate(() => window.QD.S.battle.phase === 'shape')); i++) { await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(6); }
await p.evaluate((pick) => { window.QD.S.battle.magic = 12; if (/heal/i.test(pick)) window.QD.S.battle.hp = 6; }, pick);
await p.evaluate(() => document.querySelector('.b3-powers')?.click()); await pump(0.5); await p.waitForTimeout(500);
const rect = () => p.evaluate(() => { const r = document.querySelector('.pw-stage')?.getBoundingClientRect(); return r && [Math.round(r.top), Math.round(r.height)]; });
const r0 = await rect(); console.log('triangle before pick (top,height):', r0);
if (pick) { await p.evaluate((s) => (/^[ABC]$/.test(s) ? document.querySelector(`.pw-medal.at-${s}`) : [...document.querySelectorAll('.pw-utils button')].find((e) => new RegExp(s, 'i').test(e.textContent)))?.click(), pick); await pump(0.3); await p.waitForTimeout(400); }
console.log('triangle after pick:', await rect());
if (/heal/i.test(pick)) { for (let i = 0; i < 2; i++) { await p.evaluate(() => document.querySelector('.pw-detail .pw-btn.go')?.click()); await pump(1); } console.log('after two heals:', await p.evaluate(() => JSON.stringify({ open: !!document.querySelector('.b3-sheet.open'), hp: window.QD.S.battle.hp, magic: window.QD.S.battle.magic, pill: document.querySelector('.pw-life b')?.textContent, mpill: document.querySelector('.pw-center b')?.textContent }))); }
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${tag}.png` });
console.log(await p.evaluate(() => { const s = document.querySelector('.b3-sheet.open'); return JSON.stringify({ scroll: s && s.scrollHeight - s.clientHeight, h: s?.getBoundingClientRect().height, top: s?.getBoundingClientRect().top }); }));
await b.close();
