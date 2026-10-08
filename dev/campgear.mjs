// Camp: the potion supplies panel and the Gear tab's three places (body, pack, traveler).  node dev/campgear.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.gold = 64; h.level = 3; h.potions = 1;
  h.bag.push(E.makeWeapon('spear', 1, null, 4), E.makeWeapon('bracer', 0, null, 4)); S.hero = h; S.company = { members: [h] }; S.tab = 'gear'; showCamp({ fromBoard: true }); });
await pump(3);
const side = '.sx-side';
await p.evaluate((s) => { const el = document.querySelector(s); el.scrollTop = el.querySelector('.sx-supplies').offsetTop - 120; }, side); await pump(0.5);
await p.screenshot({ path: 'docs/ingame/camp_supplies.png' });
for (const [n, sel] of [['body', '.zn-body'], ['pack', '.zn-pack'], ['trader', '.zn-trader']]) {
  await p.evaluate(([s, z]) => { const el = document.querySelector(s); const t = el.querySelector(z); el.scrollTop += t.getBoundingClientRect().top - 90; }, [side, sel]); await pump(0.4);
  await p.screenshot({ path: `docs/ingame/camp_gear_${n}.png` });
}
// buy a potion
await p.evaluate(() => document.querySelector('.sp-buy')?.click()); await pump(0.5);
console.log('after buying: potions', await p.evaluate(() => window.QD.S.hero.potions), 'gold', await p.evaluate(() => window.QD.S.hero.gold));
await b.close();
