// Charms (Dave, Oct 2026): a boss's spoils offering two, the Charms zone at camp with Drop, and a charm at the traveler.  node dev/charms.mjs [port]
import { chromium } from 'playwright-core';
const port = process.argv[2] || 8135;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message)); await p.emulateMedia({ reducedMotion: 'reduce' });
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#toast{display:none!important}'; document.head.append(s); }));
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
// 1. victory over the Act I boss: two charms to choose from
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 1 }); h.level = 5; h.campaign.step = 10; E.takeCharm(h, 'lantern'); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const q = window.QD.E.questsFor(window.QD.S.hero)[0]; window.QD.startQuest(q); });
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
await p.evaluate(() => { const { S, B3, showVictory } = window.QD; S.battle.enemies.forEach((e) => { e.hp = 0; }); S.battle.outcome = 'victory'; S.battle.phase = 'done'; B3.stop(); showVictory(); });
await pump(2); for (let i = 0; i < 4 && !(await p.evaluate(() => !!document.querySelector('.sx-charms-loot'))); i++) { await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /continue/i.test(x.innerText))?.click()); await pump(2); }
await p.evaluate(() => document.querySelector('.sx-charms-loot')?.scrollIntoView({ block: 'center' })); await pump(0.5);
await p.screenshot({ path: 'docs/ingame/charms_1spoils.png' });
console.log('offered:', await p.evaluate(() => [...document.querySelectorAll('.sx-charms-loot .ch-copy b')].map((x) => x.innerText).join(', ')));
await p.evaluate(() => document.querySelector('.sx-charms-loot .sx-btn')?.click()); await pump(1);
console.log('carrying:', await p.evaluate(() => window.QD.S.hero.charms.join(', ')));
// 2. camp: the Charms zone, and a charm at the traveler
await p.evaluate(() => { const { S, showCamp } = window.QD; const h = S.hero; h.gold = 300; h.campaign.shop = { step: `${h.campaign.act}.${h.campaign.step}`, items: window.QD.E.shopStock(h), charm: { id: 'phoenix', price: 110, sold: false } }; S.tab = 'gear'; showCamp({ fromBoard: true }); });
await pump(2); await p.evaluate(() => { const el = document.querySelector('.sx-side'); const t = document.querySelector('.zn-charms'); if (el && t) el.scrollTop += t.getBoundingClientRect().top - 260; }); await pump(0.5);
await p.screenshot({ path: 'docs/ingame/charms_2camp.png' });
await p.evaluate(() => { const el = document.querySelector('.sx-side'); const t = document.querySelector('.zn-trader'); if (el && t) el.scrollTop += t.getBoundingClientRect().top - 200; }); await pump(0.5);
await p.screenshot({ path: 'docs/ingame/charms_3traveler.png' });
await b.close();
