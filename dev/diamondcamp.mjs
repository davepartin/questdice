// Bring a Diamond lives at camp, under the dice (Dave, Oct 2026: "not sure why this weapon is here right before I go to battle; it
// should be very clearly an option at camp"). Two Diamonds in the case: camp shows them with Left / Right; arming one; the road shows none.
//   node dev/diamondcamp.mjs [out=shots]
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'shots';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Magic Dave', cls: 'wizard', seed: 5 }); h.level = 8; h.gold = 62; h.campaign.act = 2; h.potions = 3;
  for (const id of ['dagger', 'tower']) E.takeDiamond(h, E.makeDiamond(E.makeRng(id.length), 2, id)); S.hero = h; S.company = { members: [h] }; S.seat = 0; showCamp(); });
await p.waitForTimeout(1200);
console.log('camp diamonds:', await p.evaluate(() => document.querySelectorAll('.cw-camp .sx-dbring .db-item').length), '· case:', await p.evaluate(() => window.QD.E.diamondsOf(window.QD.S.hero).map((d) => d.id).join(', ')));
await p.evaluate(() => document.querySelector('.sx-dbring button.db-hand')?.click()); await p.waitForTimeout(300);
console.log('after Left:', await p.evaluate(() => document.querySelector('.sx-dbring .db-head b')?.textContent), '· armed:', await p.evaluate(() => JSON.stringify(window.QD.S.hero.armed || window.QD.S.hero.diamondArm || null)));
await p.evaluate(() => document.querySelector('.sx-dbring')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/diamond-camp.png` });
await p.evaluate(() => window.QD.showBoard()); await p.waitForTimeout(1500);
console.log('road diamonds:', await p.evaluate(() => document.querySelectorAll('.sx-dbring').length));
await p.screenshot({ path: `${out}/diamond-road.png` });
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
