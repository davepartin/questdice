// The Camp Store on a phone: the button by the fire, then the Store tab.   node dev/serve.mjs 8135 ; node dev/campstore.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'WizKid', cls: 'wizard', seed: 7 }); h.gold = 140; h.campaign.act = 2; h.campaign.step = 4; S.hero = h; S.company = { members: [h] }; S.tab = 'forge'; showCamp(); });
await pump(2); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/store_0camp.png' });
await p.evaluate(() => document.querySelector('.sx-storebtn')?.click()); await pump(1.5);
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/store_1tab.png', fullPage: false });
const tall = await p.evaluate(() => { const s = document.querySelector('.sx-side'); return s ? s.scrollHeight : 0; });
await p.setViewportSize({ width: 390, height: Math.min(4000, tall + 200) }); await pump(1);
await p.evaluate(() => { const s = document.querySelector('.sx-side'); const t = s?.querySelector('.sx-tab.store'); if (s && t) s.scrollTop = t.offsetTop - 120; window.QD.world.stage.step(1); });
await p.screenshot({ path: 'docs/ingame/store_2full.png' });
// buy a special and open the bundle
console.log(await p.evaluate(() => { const before = window.QD.S.hero.gold; document.querySelector('.st-tonic .ur-buy')?.click(); return `gold ${before} -> ${window.QD.S.hero.gold}; blessings ${JSON.stringify(window.QD.S.hero.campaign.blessings.map((x) => x.name))}`; }));
await b.close();
