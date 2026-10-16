// The quest card's monsters on a phone: one in the middle, two or three stacked top to bottom in a zig-zag.  node dev/queststack.mjs [port]
import { chromium } from 'playwright-core';
const port = process.argv[2] || 8135;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#toast{display:none!important}'; document.head.append(s); })); // the test hero has no save, so hide its "could not save" notes
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const seen = new Set();
for (const act of [1, 2, 3]) for (let step = 1; step <= 10 && seen.size < 3; step++) {
  const n = await p.evaluate(({ act, step }) => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'bard', seed: 5 }); h.level = 2; h.campaign.act = act; h.campaign.step = step; S.hero = h; S.company = { members: [h] }; showBoard(); return document.querySelector('.qa')?.className; }, { act, step });
  const k = (n || '').match(/n(\d)/)?.[1]; if (!k || seen.has(k)) continue; seen.add(k);
  await pump(2); await p.evaluate(() => Promise.all([...document.querySelectorAll('.qa-pc')].map((i) => i.decode().catch(() => {}))));
  await p.evaluate(() => document.querySelector('.sx-qcard')?.scrollIntoView({ block: 'end' })); await pump(0.5);
  await p.screenshot({ path: `docs/ingame/quest_stack_n${k}.png` }); console.log('shot', act, step, n);
}
await b.close();
