// The camp status row names the potions (Dave, Oct 2026: "needs to say potion somewhere").   node dev/potlabel.mjs [out=shots]
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'shots';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
for (const [potions, name] of [[3, 'full'], [1, 'one']]) {
  await p.evaluate((potions) => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Magic Dave', cls: 'wizard', seed: 5 }); h.level = 8; h.gold = 62; h.campaign.act = 2; h.campaign.step = 6; h.potionMax = 3; h.potions = potions; S.hero = h; S.company = { members: [h] }; S.seat = 0; showCamp(); }, potions);
  await p.waitForTimeout(900); await p.evaluate(() => document.querySelector('.sx-cstat')?.scrollIntoView({ block: 'center' }));
  console.log(name, await p.evaluate(() => document.querySelector('.cs-pots')?.innerText.replace(/\s+/g, ' ')));
  await p.locator('.sx-cstat').screenshot({ path: `${out}/potlabel-${name}.png` });
}
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
