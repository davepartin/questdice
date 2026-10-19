// A three-hero table on the road (every mini visible) and the Reveal screen after a fight.  node dev/threeroad.mjs
import { chromium } from 'playwright-core';
const out = '/tmp/claude-0/-home-user-questdice/8c0c8fef-1ceb-56a5-957d-404bdc291d52/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E } = window.QD; const hs = [['Maya', 'wizard'], ['Theo', 'bard'], ['Sam', 'knight']].map(([name, cls], i) => E.newHero({ name, cls, seed: 7 + i, pack: 'cloverheist' })); for (const h of hs) h.campaign = hs[0].campaign; Object.assign(hs[0].campaign, { step: 2, wins: 1 }); S.hero = hs[0]; S.company = { kind: 'company', members: hs }; window.QD.showRoad(); });
await pump(2); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/three_road.png` });
console.log('figures on the road:', await p.evaluate(() => document.querySelectorAll('.sc-stage .sc-fig, .sc-stage figure, .sc-stage > div:not(.sc-warm)').length));
// the Reveal screen
await p.evaluate(() => { window.QD.scrui?.reveal ? 0 : 0; });
await p.evaluate(async () => { const SCRUI = await import('./js/g3/scrui.js'); SCRUI.reveal({ voice: 'The Magpie King', lines: [
  { name: 'Theo', gold: 140, line: 'Theo took the bribe from The Magpie King! The Pact: you cannot be knocked out this battle, but you deal half damage. Theo pulled it off. Theo receives 140 gold.' },
  { name: 'Maya', gold: 20, line: 'Maya was offered a bribe by The Magpie King (Glass Shield) and said no. Honor. Maya receives 20 gold.' },
  { name: 'Sam', gold: 70, line: 'Sam was secretly chasing gold (Gold Rush), and so was Theo (31)! Sam scored 38. Sam wins it. Sam receives 70 gold.' } ] }, { hero: window.QD.S.hero, place: 'Cinder Ford', won: true, onDone: () => {} }); });
await pump(2); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/reveal_beat.png` });
const m = await p.evaluate(() => { const s = document.querySelector('.sx-side'); s.scrollTop = s.scrollHeight; const last = [...document.querySelectorAll('.rv-row')].at(-1).getBoundingClientRect(); const cta = document.querySelector('.sx-cta .sx-btn').getBoundingClientRect(); return { lastBottom: Math.round(last.bottom), ctaTop: Math.round(cta.top) }; });
console.log('reveal end clears Continue:', JSON.stringify(m)); await pump(0.5); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/reveal_end.png` });
await b.close();
