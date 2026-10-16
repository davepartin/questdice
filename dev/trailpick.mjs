// Tap a step to replay it (Dave, Oct 2026), and Diamonds as a perk: the camp bar's steps after going back to quest 4 of 7 reached,
// the "go back" question, a level-up offering a Diamond, and the Diamond case with its sell buttons.  node dev/trailpick.mjs [port]
import { chromium } from 'playwright-core';
const port = process.argv[2] || 8135;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message)); await p.emulateMedia({ reducedMotion: 'reduce' });
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#toast{display:none!important}'; document.head.append(s); }));
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.level = 4; h.gold = 160; h.campaign.step = 4; h.campaign.reached = { act: 1, step: 7 };
  E.takeDiamond(h, { ...E.makeDiamond(E.makeRng(3), 1), id: 'spear' });
  h.pendingPerks = 1; S.hero = h; S.company = { members: [h] }; S.perkOffer = ['vitality', 'keen', 'diamond']; S.perkFor = h.name; S.tab = 'forge'; showCamp({ fromBoard: true }); });
await pump(2);
await p.evaluate(() => document.querySelector('.cs-steps')?.scrollIntoView({ block: 'center' })); await pump(0.5);
await p.screenshot({ path: 'docs/ingame/trail_1steps.png' });
await p.evaluate(() => [...document.querySelectorAll('.cs-step')][1]?.click()); await pump(0.6);
await p.screenshot({ path: 'docs/ingame/trail_2ask.png' });
console.log('modal:', await p.evaluate(() => document.querySelector('.step-ask')?.innerText.replace(/\s+/g, ' ')));
await p.evaluate(() => [...document.querySelectorAll('.step-ask button')].find((x) => /go to quest/i.test(x.innerText))?.click()); await pump(1);
console.log('now at quest', await p.evaluate(() => window.QD.S.hero.campaign.step), 'reached', await p.evaluate(() => JSON.stringify(window.QD.S.hero.campaign.reached)));
await p.evaluate(() => document.querySelector('.sx-perks')?.scrollIntoView({ block: 'center' })); await pump(0.5);
await p.screenshot({ path: 'docs/ingame/trail_3perk.png' });
await p.evaluate(() => { const { S, showCamp } = window.QD; S.tab = 'gear'; showCamp({ fromBoard: true }); }); await pump(2);
await p.evaluate(() => document.querySelector('.zn-diamonds')?.scrollIntoView({ block: 'center' })); await pump(0.5);
await p.screenshot({ path: 'docs/ingame/trail_4sell.png' });
await b.close();
