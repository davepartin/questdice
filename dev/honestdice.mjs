// Honest dice (Dave, Oct 2026): the weapon spectrum in the camp pack. Steady, balanced, risky and brutal attackers, and the steady,
// balanced and risky guards, all Silver d8s, plus a Bronze and a Gold sword to show what the metal adds.  node dev/honestdice.mjs [port]
import { chromium } from 'playwright-core';
const port = process.argv[2] || 8135;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.gold = 300; h.level = 8; h.campaign.act = 2;
  h.strength = { W: 10, E: 10 }; h.loadout.NW = E.makeWeapon('sword', 1, null, 8);
  for (const id of ['dagger', 'spear', 'mace', 'bracer', 'shield', 'tower']) h.bag.push(E.makeWeapon(id, 1, null, 8));
  h.bag.push(E.makeWeapon('sword', 0, null, 8), E.makeWeapon('sword', 2, null, 8));
  S.hero = h; S.company = { members: [h] }; S.tab = 'gear'; showCamp({ fromBoard: true }); });
await pump(3);
const cards = await p.$$('.zn-pack .wc, .zn-pack [class*="wcard"], .zn-pack > *');
console.log('pack children', cards.length);
let n = 0;
for (const sel of ['.zn-body', '.zn-pack']) {
  await p.evaluate((sel) => { const el = document.querySelector('.sx-side'); const t = document.querySelector(sel); if (el && t) el.scrollTop += t.getBoundingClientRect().top - 90; }, sel); await pump(0.5);
  await p.screenshot({ path: `docs/ingame/honest_dice_${++n}.png` });
}
for (let k = 0; k < 5; k++) { await p.evaluate(() => { document.querySelector('.sx-side').scrollTop += 640; }); await pump(0.4); await p.screenshot({ path: `docs/ingame/honest_dice_${++n}.png` }); }
await b.close();
