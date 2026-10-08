// The new weapons (Mace, Tower Shield, War Hammer) as camp cards at each metal.  node dev/newweapons.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) console.log('console', m.text().slice(0, 200)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const kinds = (process.argv[2] || 'mace,tower,warhammer').split(',');
await p.evaluate((kinds) => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.gold = 64; h.level = 3; h.bag = [];
  for (const k of kinds) for (const r of [0, 3]) h.bag.push(E.makeWeapon(k, r, null, 4));
  S.hero = h; S.company = { members: [h] }; S.tab = 'gear'; showCamp({ fromBoard: true }); }, kinds);
await pump(3);
for (let i = 0; i < 40; i++) { const pending = await p.evaluate(() => [...document.querySelectorAll('.sx-wc img')].filter((im) => !im.complete || !im.naturalWidth || !im.getAttribute('src')).length); if (!pending) break; await pump(1); await p.waitForTimeout(500); }
const side = '.sx-side';
for (let k = 0; k < 3; k++) {
  await p.evaluate(([s, k]) => { const el = document.querySelector(s); const cards = el.querySelectorAll('.zn-pack .sx-wc'); const t = cards[k * 2]; if (t) el.scrollTop += t.getBoundingClientRect().top - 110; }, [side, k]); await pump(2);
  await p.screenshot({ path: `docs/ingame/new_weapon_${k}.png` });
}
await b.close();
