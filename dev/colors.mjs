// Hero colours (Oct 2026): the colour picker on the hero choice, and two Bards at one battle wearing different colours.  node dev/colors.mjs [port]
import { chromium } from 'playwright-core';
const port = process.argv[2] || 8135;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message)); await p.emulateMedia({ reducedMotion: 'reduce' });
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#toast{display:none!important}'; document.head.append(s); }));
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => window.QD.showCreate()); await pump(3);
await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /bard/i.test(x.innerText))?.click()); await pump(2);
await p.evaluate(() => document.querySelector('.sx-colors')?.scrollIntoView({ block: 'center' })); await pump(1);
await p.screenshot({ path: 'docs/ingame/colors_create.png' });
console.log('bard colours:', await p.evaluate(() => [...document.querySelectorAll('.sx-colors .color-btn')].map((x) => x.innerText.trim()).join(', ')));
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const a = E.newHero({ name: 'Dave', cls: 'bard', seed: 3 }); const c = E.newHero({ name: 'Sam', cls: 'bard', seed: 4 }); S.hero = a; S.company = { members: [a, c], campaign: a.campaign }; showBoard(); });
await pump(1);
await p.evaluate(() => { const q = window.QD.E.questsFor(window.QD.S.hero)[0]; window.QD.startQuest(q); });
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
await pump(2); await p.waitForTimeout(800);
await p.screenshot({ path: 'docs/ingame/colors_twobards.png', clip: { x: 0, y: 0, width: 390, height: 300 } });
console.log('two bards wear:', await p.evaluate(() => [...document.querySelectorAll('.fb-pc.hero img')].map((i) => i.getAttribute('src').split('/').pop()).join(' + ')));
await b.close();
