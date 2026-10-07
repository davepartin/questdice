// Screens for the weapon economy: the two roads, spoils with a full pack, the gear tab.  node dev/economy.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => {
  const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.level = 3; h.gold = 140; h.campaign.step = 4;
  const rng = E.makeRng(3); h.bag = E.rollDrops(rng, 4, { sizes: [60, 40, 0, 0] }); S.hero = h; S.company = { members: [h] }; showBoard();
});
await pump(6); await p.screenshot({ path: 'docs/ingame/econ_roads.png' });
await p.evaluate(() => [...document.querySelectorAll('.sx-qcard')].map((e) => e.innerText.replace(/\n/g, ' | '))).then((t) => console.log(t.join('\n')));
await p.evaluate(() => {
  const { S, E, D } = window.QD; const h = S.hero; const rng = E.makeRng(9);
  const drops = E.rollDrops(rng, 2, { sizes: [0, 100, 0, 0], minRarity: 1 });
  S.rewards = { xp: 24, gold: 31, drops, picked: null, quest: E.questsFor(h)[0], offer: null, lvBefore: h.level, levels: 0, shown: true };
  return import('/js/g3/scrui.js').then((m) => m.victory(true));
});
await pump(4); await p.waitForTimeout(2500); await p.evaluate(() => document.querySelector('.loot-row')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(800);
console.log(await p.evaluate(() => document.querySelector('.loot-row')?.innerText.replace(/\n/g, ' | ')));
await p.screenshot({ path: 'docs/ingame/econ_spoils.png' });
await b.close();
