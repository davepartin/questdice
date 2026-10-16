// Camp review (Dave, Oct 2026: are the camp tabs too spacious, can you see what your gold can buy?). An Act II hero with gold,
// talent dice and a full pack; every tab captured screen by screen on a phone, with its length in screens.  node dev/campreview.mjs [port] [tag]
import { chromium } from 'playwright-core';
const port = process.argv[2] || 8135; const tag = process.argv[3] || 'campreview';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#toast{display:none!important}'; document.head.append(s); }));
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.level = 9; h.gold = 420; h.campaign.act = 2; h.campaign.step = 3;
  h.dice = [...new Set([...(h.dice || []), 'NE', 'SW', 'SE'])]; h.strength = { W: 6, E: 6 };
  h.bag.push(E.makeWeapon('spear', 1, null, 6), E.makeWeapon('mace', 0, null, 6), E.makeWeapon('tower', 2, null, 6));
  S.hero = h; S.company = { members: [h] }; S.tab = 'forge'; showCamp({ fromBoard: true }); });
await pump(3);
for (const tab of ['forge', 'gear', 'hero']) {
  await p.evaluate((t) => { window.QD.S.tab = t; window.QD.showCamp({ fromBoard: true }); }, tab); await pump(1.5);
  const m = await p.evaluate(() => { const el = document.querySelector('.sx-side'); const sc = document.querySelector('.sx-camp-scroll'); const tabs = document.querySelector('.sx-tabs'); return { side: el?.scrollHeight, view: el?.clientHeight, tabsTop: tabs ? Math.round(tabs.getBoundingClientRect().top + el.scrollTop) : null, overflow: getComputedStyle(el).overflowY, scH: sc?.scrollHeight }; });
  console.log(tab, JSON.stringify(m), 'screens', (m.side / 844).toFixed(1));
  let n = 0;
  for (let y = 0; y < m.side && n < 14; y += 760) { await p.evaluate((y) => { document.querySelector('.sx-side').scrollTop = y; }, y); await pump(0.3); await p.screenshot({ path: `docs/ingame/${tag}_${tab}_${String(++n).padStart(2, '0')}.png` }); }
  console.log(' ', n, 'shots');
}
await b.close();
