// Camp: the Upgrades button, the powers list, and a power's popup.  node dev/powerpop.mjs
import { chromium } from 'playwright-core';
const out = '/tmp/claude-0/-home-user-questdice/8c0c8fef-1ceb-56a5-957d-404bdc291d52/scratchpad/pop';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const settle = async () => { await pump(1.5); await p.waitForTimeout(1000); await pump(0.5); await p.evaluate(() => window.QD.world.stage.step(1)); };
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Magic Dave', cls: 'wizard', seed: 7 }); h.level = 7; h.gold = 65; h.campaign.act = 2; S.hero = h; S.company = { members: [h] }; S.advanced = false; showCamp(); });
await settle();
await p.evaluate(() => { const s = document.querySelector('.sx-side'); if (s) s.scrollTop = s.scrollHeight; }); await settle();
await p.screenshot({ path: `${out}/up_btn.png` });
await p.evaluate(() => document.querySelector('.sx-upgrades')?.click()); await settle();
await p.evaluate(() => { const s = document.querySelector('.sx-side'); const t = document.querySelector('.sx-pslot'); if (s && t) s.scrollTop = t.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop - 110; }); await settle();
await p.screenshot({ path: `${out}/up_powers.png` });
for (const [name, file] of [['Meteor', 'up_meteor'], ['Magic Missile', 'up_missile']]) {
  await p.evaluate((name) => [...document.querySelectorAll('.ps-open')].find((e) => e.textContent.includes(name))?.click(), name); await settle();
  console.log(name, (await p.evaluate(() => document.querySelector('.slot-sheet')?.innerText || 'none')).replace(/\n+/g, ' | ').slice(0, 300));
  await p.screenshot({ path: `${out}/${file}.png` });
  await p.evaluate(() => document.querySelector('.sh-x')?.click()); await pump(0.3);
}
await b.close();
