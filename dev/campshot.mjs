// The painted camp / road scenes with miniatures.  node dev/campshot.mjs tag w h [n heroes] [scene camp|board]
import { chromium } from 'playwright-core';
const [tag = 'camp', W = 393, H = 852, N = 1, scene = 'camp'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('console.error', m.text().slice(0, 160)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
await p.evaluate(({ n, scene }) => {
  const { S, E, showCamp, showBoard } = window.QD; const cls = ['knight', 'wizard', 'ranger', 'dwarf', 'bard', 'knight']; const pets = ['ember', 'owl', 'turtle', 'bunny', 'penny', 'bristle'];
  const heroes = Array.from({ length: +n }, (_, i) => { const h = E.newHero({ name: ['Dave', 'Jess', 'Mo', 'Ruth', 'Sam', 'Ana'][i], cls: cls[i], seed: 5 + i }); h.pet = E.newPet(pets[i]); return h; });
  S.hero = heroes[0]; S.company = { kind: 'solo', name: 'x', campaign: heroes[0].campaign, members: heroes }; if (scene === 'board') showBoard(); else showCamp();
}, { n: N, scene });
await p.waitForTimeout(1500);
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${tag}.png` });
console.log(await p.evaluate(() => JSON.stringify({ scene: document.getElementById('scene')?.className, figs: document.querySelectorAll('.sc-fig').length, bg: document.querySelector('.sc-bg')?.style.backgroundImage })));
await b.close();
