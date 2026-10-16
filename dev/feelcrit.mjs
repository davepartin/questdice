// The crit moment: a Gold d10 sword rolls its top face (+10 with three pierce) against the Goblin King; shot when the CRIT banner shows.  node dev/feelcrit.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 11 }); h.level = 12; h.strength = { W: 10, E: 10 }; h.loadout.NW = E.makeWeapon('sword', 2, null, 10); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const E = window.QD.E; const q = { ...E.questsFor(window.QD.S.hero)[0], enemies: ['goblinking'], kind: 'boss' }; window.QD.startQuest(q); });
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2);
await p.evaluate(() => { window.QD.S.battle.script = { rolls: [{ NW: 10 }], rerolls: [] }; });
await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(5);
for (let i = 0; i < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(1);
const banners = []; await p.exposeFunction('logB', (t) => banners.push(t));
await p.evaluate(() => { const obs = new MutationObserver(() => { for (const el of document.querySelectorAll('.hk-banner, [class*="banner"]')) { const t = el.innerText?.trim(); if (t) window.logB(t); } }); obs.observe(document.body, { childList: true, subtree: true, characterData: true }); });
console.log('lock disabled?', await p.evaluate(() => document.querySelector('#b3-lock')?.disabled), 'board NW', await p.evaluate(() => window.QD.S.battle.board?.NW));
await p.evaluate(() => document.querySelector('#b3-lock')?.click());
let shot = false; for (let k = 0; k < 60; k++) { await pump(0.1); await p.waitForTimeout(30); if (!shot && banners.some((t) => /CRIT/.test(t))) { shot = true; await p.waitForTimeout(150); await p.screenshot({ path: 'docs/ingame/feel_crit.png' }); } }
console.log('banners:', [...new Set(banners)].slice(0, 12).join(' | '));
console.log('busy', await p.evaluate(() => window.QD.B3.battleState.busy), 'round', await p.evaluate(() => window.QD.S.battle.round), 'kinghp', await p.evaluate(() => window.QD.S.battle.enemies[0].hp));
await b.close();
