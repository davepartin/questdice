// The Legend of… page at the start of Act II (Pip Needs a Lift), from a played-out Act I.  node dev/legend.mjs [outdir]
import { chromium } from 'playwright-core';
const out = process.argv[2] || '/tmp/claude-0/-home-user-questdice/8c0c8fef-1ceb-56a5-957d-404bdc291d52/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => {
  const { S, E } = window.QD; const a = E.newHero({ name: 'WizKid', cls: 'wizard', seed: 7, pack: 'starfall' }); const c = E.newHero({ name: 'Smalls', cls: 'dwarf', seed: 8, pack: 'starfall' });
  Object.assign(a.campaign, { act: 2, step: 1, wins: 10, storySeen: [], legend: { 1: { fights: 11, wins: 10, falls: ['The Toll Bridge'], from: 'Cinder Ford', boss: 'Gorvash', bossPlace: 'Gallows Hill', big: { name: 'WizKid', n: 61, place: 'Smoke Hollow' },
    heroes: { WizKid: { dealt: 640, blocked: 90, kills: 14, triples: 3, gold: 120, magic: 210, close: 0, downs: 2, heal: 0, bribes: 1 }, Smalls: { dealt: 410, blocked: 412, kills: 6, triples: 5, gold: 160, magic: 0, close: 2, downs: 0, heal: 30, bribes: 0 } },
    secrets: { done: 4, offered: 2, taken: 1, worked: 1, forced: 1, rivalries: 2 } } } });
  c.campaign = a.campaign; S.hero = a; S.company = { members: [a, c] };
  window.QD.showRoadOrBoard();
});
await pump(2);
console.log((await p.evaluate(() => document.querySelector('.sx-side')?.innerText || '')).replace(/\n+/g, ' | ').slice(0, 900));
const shot = async (n, sel) => { await p.evaluate((sel) => { const s = document.querySelector('.sx-side'); const e = document.querySelector(sel); if (s && e) s.scrollTop = e.offsetTop - 70; }, sel); await pump(1.5); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/${n}.png` }); };
await shot('legend_top', '.sx-tale'); await shot('legend_end', '.tl-teaser');
await b.close();
