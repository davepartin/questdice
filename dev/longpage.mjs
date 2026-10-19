// The longest story page on a phone (Clover Heist close:3), scrolled to the very end: the last line must clear the Continue button.
//   node dev/longpage.mjs [id] [pack]
import { chromium } from 'playwright-core';
const [id = 'close:3', pack = 'cloverheist'] = process.argv.slice(2);
const out = '/tmp/claude-0/-home-user-questdice/8c0c8fef-1ceb-56a5-957d-404bdc291d52/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(([id, pack]) => { const { S, E } = window.QD; const a = E.newHero({ name: 'Maya', cls: 'wizard', seed: 7, pack }); const c = E.newHero({ name: 'Theo', cls: 'bard', seed: 8, pack }); const d = E.newHero({ name: 'Sam', cls: 'knight', seed: 9, pack }); c.campaign = a.campaign; d.campaign = a.campaign; a.campaign.act = 3; S.hero = a; S.company = { members: [a, c, d] }; window.QD.showStory({ id, act: Number(id.split(':')[1]) || 3 }); }, [id, pack]);
await pump(3);
const m = await p.evaluate(() => { const s = document.querySelector('.sx-side'); s.scrollTop = s.scrollHeight; const last = [...document.querySelectorAll('.sx-tale p, .sx-tale li')].at(-1).getBoundingClientRect(); const cta = document.querySelector('.sx-cta .sx-btn').getBoundingClientRect(); return { lastBottom: Math.round(last.bottom), ctaTop: Math.round(cta.top), clear: last.bottom <= cta.top }; });
console.log(id, JSON.stringify(m));
await pump(1); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/long_${id.replace(':', '')}.png` });
await b.close();
