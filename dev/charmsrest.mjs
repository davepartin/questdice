// Charms resting (the teamwork pass, ?lab): a hero saved before, carrying two charms, at camp. node dev/charmsrest.mjs [out=shots]
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'shots';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?lab&debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Old Friend', cls: 'bard', seed: 5 }); h.level = 6; h.gold = 300; h.campaign.act = 2; h.campaign.step = 4;
  h.charms = ['mirror', 'lantern']; S.hero = h; S.company = { members: [h] }; S.seat = 0; S.tab = 'gear'; showCamp({ fromBoard: true }); });
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => ({ zone: document.querySelector('#zn-charms, .zn-charms, [data-zone="zn-charms"]')?.innerText?.slice(0, 200), shopCharm: !!document.querySelector('.sx-charm:not(.resting)'), hasMirror: window.QD.E.hasCharm(window.QD.S.hero, 'mirror'), owned: window.QD.S.hero.charms })));
await p.evaluate(() => { const el = [...document.querySelectorAll('h2, h3, .zn-head, .zone-title, b')].find((x) => /Charms · resting/.test(x.textContent)); el?.scrollIntoView({ block: 'center' }); });
await p.waitForTimeout(400); await p.screenshot({ path: `${out}/charms-resting.png` });
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
