// Pip Needs a Lift on a phone: the story picker, the opening page, a road moment and an envelope with Mother Hob.
//   node dev/serve.mjs 8135 ; node dev/pip.mjs [outdir]
import { chromium } from 'playwright-core';
const out = process.argv[2] || '/tmp/claude-0/-home-user-questdice/8c0c8fef-1ceb-56a5-957d-404bdc291d52/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (name, sel) => { if (sel) await p.evaluate((sel) => { const s = document.querySelector('.sx-side'); const e = document.querySelector(sel); if (s && e) s.scrollTop = e.offsetTop - 90; }, sel); await pump(1); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/${name}.png` }); };
const side = () => p.evaluate(() => (document.querySelector('.sx-side')?.textContent || document.body.innerText).replace(/\s+/g, ' ').slice(0, 220));
await p.evaluate(() => window.QD.showStories?.()); await pump(1.5);
const card = await p.evaluate(() => { const el = [...document.querySelectorAll('button, .sx-plaque, article, .sc-card')].find((e) => /Pip Needs a Lift/.test(e.textContent)); el?.scrollIntoView({ block: 'center' }); return el ? el.textContent.replace(/\s+/g, ' ').slice(0, 200) : 'not found'; });
console.log('PICKER ->', card); await shot('pip_picker');
await p.evaluate(() => { const { S, E } = window.QD; const a = E.newHero({ name: 'WizKid', cls: 'wizard', seed: 7, pack: 'starfall' }); const c = E.newHero({ name: 'Smalls', cls: 'dwarf', seed: 8, pack: 'starfall' }); c.campaign = a.campaign; S.hero = a; S.company = { members: [a, c] }; window.QD.showStory({ id: 'open:1', act: 1 }); });
await pump(2); console.log('OPEN ->', await side()); await shot('pip_open', '.sx-tale');
await p.evaluate(() => { const { S } = window.QD; Object.assign(S.hero.campaign, { act: 2, step: 6, wins: 15, road: null }); window.QD.showRoad(); });
await pump(2); console.log('MOMENT ->', await side()); await shot('pip_moment', '.sx-tale');
await b.close();
