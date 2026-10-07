// Title screen on a phone with saved heroes, then the "Play together" choice.  node dev/title.mjs [w=390] [h=844]
import { chromium } from 'playwright-core';
const W = Number(process.argv[2] || 390); const H = Number(process.argv[3] || 844);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => {
  try {
    const hero = { name: 'Dave', cls: 'ranger', level: 3, campaign: { act: 1, step: 4 } };
    localStorage.setItem('questdice.hero.dave', JSON.stringify({ salt: 'x', hash: 'y', hero, saved: Date.now(), v: 1 }));
  } catch {}
});
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await pump(4); await p.waitForTimeout(1500);
await p.screenshot({ path: 'docs/ingame/title_phone.png' });
console.log(await p.evaluate(() => [...document.querySelectorAll('.sx-plaque')].map((e) => { const r = e.getBoundingClientRect(); return `${e.querySelector('b')?.textContent} top=${Math.round(r.top)} bottom=${Math.round(r.bottom)}`; }).join('\n')));
await p.evaluate(() => [...document.querySelectorAll('.sx-plaque')].find((e) => /Play together/.test(e.textContent))?.click()); await p.waitForTimeout(1200);
await p.screenshot({ path: 'docs/ingame/title_together.png' });
await b.close();
