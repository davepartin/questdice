// The quest board on a phone: does the whole quest card fit without scrolling?  node dev/boardfit.mjs [w=390] [h=660]
import { chromium } from 'playwright-core';
const W = Number(process.argv[2] || 390); const H = Number(process.argv[3] || 660);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
for (const [name, cls, step] of [['Magic Dave', 'wizard', 5], ['Dave', 'knight', 2]]) {
  await p.evaluate(([name, cls, step]) => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name, cls, seed: 5 }); h.level = 3; h.campaign.step = step; S.hero = h; S.company = { members: [h] }; showBoard(); }, [name, cls, step]);
  await pump(2);
  const m = await p.evaluate(() => { const s = document.querySelector('.sx-board-main'); const c = document.querySelector('.sx-qcard'); const r = c?.getBoundingClientRect(); return { scroll: s.scrollHeight, client: s.clientHeight, over: s.scrollHeight - s.clientHeight, cardBottom: Math.round(r?.bottom || 0), vh: innerHeight }; });
  console.log(cls, 'step', step, JSON.stringify(m));
  await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/boardfit-${cls}.png` });
}
await b.close();
