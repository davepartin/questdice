// The talent die card at d4 / d8 / d10 in camp.  node dev/talentshot.mjs tag size [w h]
import { chromium } from 'playwright-core';
const [tag = 'tal', size = 10, W = 393, H = 852] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate((size) => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'wizard', seed: 5 }); h.gold = 500; h.special.SW = +size; h.talent.SW = [['magic'], ['heal', 'atk'], [], ['block'], [], [], []].slice(0, window.QD.D.TALENT_FACES[+size]); h.dice = ['N','W','C','E','S','NW','SW','NE','SE']; h.loadout.NE ||= { uid: 'f', id: 'fists', rarity: 0 }; S.hero = h; S.company = { members: [h] }; showCamp(); }, size);
await pump(1);
for (const t of ['Forge', 'Hero']) { await p.evaluate((t) => [...document.querySelectorAll('button')].find((e) => e.offsetParent && e.textContent.trim().startsWith(t))?.click(), t); await pump(0.3); if (await p.evaluate(() => !!document.querySelector('.tal-die'))) break; }
await p.evaluate(() => document.querySelector('.tal-die')?.scrollIntoView({ block: 'center' })); await pump(0.5);
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${tag}.png` });
console.log(await p.evaluate(() => !!document.querySelector('.tal-die')));
await b.close();
