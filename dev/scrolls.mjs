// Portrait phone: create, camp, road screens at the top and scrolled.  node dev/scrolls.mjs outdir
import { chromium } from 'playwright-core';
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 462, height: 783 }, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await pump(0.5); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/${n}.png` }); };
const scroll = async (y) => { await p.evaluate((y) => { const s = document.querySelector('.sx-side'); s.scrollTop = y; s.dispatchEvent(new Event('scroll')); }, y); };
const info = () => p.evaluate(() => { const s = document.querySelector('.sx-side'); return { st: s.scrollTop, sh: s.scrollHeight, ch: s.clientHeight }; });
await p.evaluate(() => window.QD.showCreate()); await pump(8); await shot('create-0'); await scroll(330); await shot('create-1'); console.log('create', JSON.stringify(await info()));
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.level = 4; h.gold = 120; S.hero = h; S.company = { members: [h] }; h.campaign.step = 3; showCamp({ fromBoard: false }); }); await pump(8); await shot('camp-0'); await scroll(420); await shot('camp-1'); console.log('camp', JSON.stringify(await info()));
console.log(problems.length ? `PROBLEMS: ${problems.join(' | ')}` : 'no errors'); await b.close();
