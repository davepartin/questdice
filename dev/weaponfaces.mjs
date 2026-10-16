// The weapon card's faces as a weapon grows (camp, Gear tab): a Gold d8 sword in hand, a Bronze d4 and a Diamond d10 sword in the pack.  node dev/weaponfaces.mjs [port]
import { chromium } from 'playwright-core';
const port = process.argv[2] || 8135;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.gold = 300; h.level = 8; h.campaign.act = 2; h.strength = { W: 8, E: 8 };
  h.strength = { W: 10, E: 10 }; h.loadout.NW = E.makeWeapon('sword', 2, null, 8); h.bag.push(E.makeWeapon('sword', 0, null, 4), E.makeWeapon('sword', 3, null, 10)); S.hero = h; S.company = { members: [h] }; S.tab = 'gear'; showCamp({ fromBoard: true }); });
await pump(3);
console.log(await p.evaluate(() => [...document.querySelectorAll('.wc-faces')].map((e) => e.innerText.replace(/\s+/g, ' ')).join(' || ')));
await p.evaluate(() => { const el = document.querySelector('.sx-side'); const t = document.querySelector('.zn-body'); if (el && t) el.scrollTop += t.getBoundingClientRect().top - 90; }); await pump(0.5);
await p.screenshot({ path: 'docs/ingame/weapon_faces_body.png' });
await p.evaluate(() => { const el = document.querySelector('.sx-side'); const t = document.querySelector('.zn-pack'); if (el && t) el.scrollTop += t.getBoundingClientRect().top - 90; }); await pump(0.5);
await p.screenshot({ path: 'docs/ingame/weapon_faces_pack.png' });
await b.close();
