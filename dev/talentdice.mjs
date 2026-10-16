// A talent die in camp (faces 1 and 3 blank, the 2x on 2, numbers from 4 up) and on the battle tray.   node dev/talentdice.mjs [port]
import { chromium } from 'playwright-core';
const port = process.argv[2] || 8135;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5, full: true }); h.gold = 300; h.level = 8; h.campaign.act = 2;
  h.special = { SW: 8, SE: 6 }; h.talent = { SW: [['atk'], [], ['heal']], SE: [] }; S.hero = h; S.company = { members: [h] }; S.tab = 'forge'; showCamp({ fromBoard: true }); });
await pump(3);
await p.evaluate(() => { const el = document.querySelector('.sx-side'); const t = document.querySelector('.tal-die'); if (el && t) el.scrollTop += t.getBoundingClientRect().top - 90; }); await pump(0.5);
await p.screenshot({ path: 'docs/ingame/talent_die_camp.png' });
console.log(await p.evaluate(() => document.querySelector('.tal-die')?.innerText.replace(/\s+/g, ' ').slice(0, 300)));
await b.close();
