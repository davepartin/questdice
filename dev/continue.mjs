// Saved games on the home screen, then Continue -> password -> the quest board must still take taps.
//   node dev/continue.mjs [w=390] [h=844]
import { chromium } from 'playwright-core';
const W = Number(process.argv[2] || 390); const H = Number(process.argv[3] || 844);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
const open = async () => { await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 }); };
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${n}.png` }); };
const plaques = () => p.evaluate(() => [...document.querySelectorAll('.sx-plaque')].map((e) => { const r = e.getBoundingClientRect(); return `${e.querySelector('b')?.textContent} ${Math.round(r.top)}-${Math.round(r.bottom)}`; }).join(' | '));
await open();
await p.evaluate(async () => {
  const SV = await import('./js/save.js'); const E = await import('./js/engine.js');
  for (const [n, cls, step] of [['Abby', 'bard', 3], ['Ben', 'wizard', 6], ['Dave', 'knight', 2]]) {
    const hero = E.newHero({ name: n, cls }); hero.campaign.step = step; await SV.createSave(hero, 'pw'); await new Promise((r) => setTimeout(r, 5));
  }
});
await open(); await pump(3); await shot(`home_${W}x${H}`);
console.log('home:', await plaques(), '| more hint:', await p.evaluate(() => document.querySelector('.sx-title-menu').classList.contains('more')));
await p.evaluate(() => [...document.querySelectorAll('.sx-plaque')].find((e) => /saved games/i.test(e.textContent))?.click()); await pump(1);
await shot(`saved_${W}x${H}`); console.log('saved list:', await plaques());
await p.evaluate(() => [...document.querySelectorAll('.sx-plaque')].find((e) => /Back/.test(e.textContent))?.click()); await pump(1);
await p.evaluate(() => [...document.querySelectorAll('.sx-plaque')].find((e) => /Continue/i.test(e.textContent))?.click()); await pump(0.5);
await p.fill('#modal input[type=password]', 'pw'); await p.evaluate(() => [...document.querySelectorAll('#modal button')].find((x) => /open/i.test(x.textContent))?.click());
for (let i = 0; i < 40 && !(await p.evaluate(() => /Take this road/i.test(document.body.innerText))); i++) await pump(0.5);
await pump(2);
console.log('modal still open?', await p.evaluate(() => document.querySelector('#modal').className || '(no)'));
const target = await p.evaluate(() => { const el = [...document.querySelectorAll('button, [role=button], .sx-quest, a')].find((e) => /take this road/i.test(e.textContent) && e.getBoundingClientRect().height > 0); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await pump(0.5);
const hit = await p.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName}.${e.className}`.slice(0, 80) : null; }, target);
console.log('what a finger touches on "Take this road":', hit);
await p.mouse.click(target.x, target.y); await pump(3);
console.log('after tap, phase:', await p.evaluate(() => (window.QD.S.battle ? 'battle started' : document.body.innerText.slice(0, 80).replace(/\s+/g, ' '))));
await b.close();
