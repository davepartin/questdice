// Camp jump chips: tap "Weapons" on the Forge and "Traveler" on Gear, and check each section lands just under the pinned tabs.  node dev/campjump.mjs [port]
import { chromium } from 'playwright-core';
const port = process.argv[2] || 8135;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message)); await p.emulateMedia({ reducedMotion: 'reduce' }); // instant jumps, so the test reads where they land
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#toast{display:none!important}'; document.head.append(s); }));
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.level = 9; h.gold = 420; h.campaign.act = 2; h.campaign.step = 3;
  h.dice = [...new Set([...(h.dice || []), 'NE', 'SW', 'SE'])]; h.strength = { W: 6, E: 6 }; S.hero = h; S.company = { members: [h] }; S.tab = 'forge'; showCamp({ fromBoard: true }); });
await pump(2);
for (const [tab, chip, sec] of [['forge', 'Weapons', '#fs-weapons'], ['gear', 'Traveler', '#fs-zn-trader']]) {
  await p.evaluate((t) => { window.QD.S.tab = t; window.QD.showCamp({ fromBoard: true }); }, tab); await pump(1);
  await p.evaluate((c) => [...document.querySelectorAll('.fn-chip')].find((x) => x.innerText.includes(c))?.click(), chip); await p.waitForTimeout(1200); await pump(0.3);
  const r = await p.evaluate((sec) => { const t = document.querySelector('.sx-tabs').getBoundingClientRect(); const s = document.querySelector(sec).getBoundingClientRect(); return { tabsBottom: Math.round(t.bottom), sectionTop: Math.round(s.top) }; }, sec);
  console.log(tab, chip, JSON.stringify(r), r.sectionTop >= r.tabsBottom - 2 && r.sectionTop < r.tabsBottom + 40 ? 'lands under the tabs' : 'MISSES');
  await p.screenshot({ path: `docs/ingame/campjump_${tab}.png` });
}
await b.close();
