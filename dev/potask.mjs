// The potion reminder (Dave, Oct 2026: "I forgot to charge my potions"): leave camp with an empty belt, see the ask, Refill; then a
// second hero taps Go anyway and is not asked twice.   node dev/potask.mjs [out=shots]
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'shots';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const camp = (name, potions) => p.evaluate(({ name, potions }) => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name, cls: 'wizard', seed: 5 }); h.level = 7; h.gold = 300; h.campaign.act = 2; h.potions = potions; S.hero = h; S.company = { members: [h] }; S.seat = 0; showCamp(); }, { name, potions });
const road = () => p.evaluate(() => [...document.querySelectorAll('.sx-cta button')].find((x) => /To the road/.test(x.textContent))?.click());
const where = () => p.evaluate(() => ({ ask: !!document.querySelector('.sx-potask'), camp: !!document.querySelector('.cw-camp'), potions: window.QD.S.hero.potions, gold: window.QD.S.hero.gold, text: document.querySelector('.sx-potask p')?.textContent }));
await camp('Magic Dave', 0); await p.waitForTimeout(900); await road(); await p.waitForTimeout(300);
console.log('empty belt, To the road:', JSON.stringify(await where()));
await p.evaluate(() => document.querySelector('.sx-potask')?.scrollIntoView({ block: 'end' })); await p.screenshot({ path: `${out}/potask.png` });
await p.evaluate(() => [...document.querySelectorAll('.sx-potask button')].find((x) => /Refill/.test(x.textContent))?.click()); await p.waitForTimeout(600);
console.log('after Refill:', JSON.stringify(await where()));
await camp('Second Hero', 1); await p.waitForTimeout(900); await road(); await p.waitForTimeout(300);
await p.evaluate(() => [...document.querySelectorAll('.sx-potask button')].find((x) => /Go anyway/.test(x.textContent))?.click()); await p.waitForTimeout(600);
console.log('after Go anyway:', JSON.stringify(await where()));
await camp('Full Belt', 3); await p.waitForTimeout(900); await road(); await p.waitForTimeout(300);
console.log('full belt, To the road:', JSON.stringify(await where()));
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
