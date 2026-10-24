// T10: Menu > Battle reports. A saved hero is resumed from the title screen (password), taken to camp, and its Menu opens the stored report.
//   node dev/menucheck.mjs <port or https://host> <path, e.g. /preview/battle-report/>      OUT=docs/team/tasks/T10/preview
// The browser starts empty, so one short fight is played first to leave a report in this browser's storage; the page is then reloaded, so the report is one stored by an earlier visit.
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const port = process.argv[2] || 8142; const base = process.argv[3] || '/'; const OUT = process.env.OUT || 'docs/ingame/menu'; fs.mkdirSync(OUT, { recursive: true });
const url = (q) => (/^http/.test(port) ? `${port}${base}${q}` : `http://localhost:${port}${base}${q}`);
const launch = { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] };
if (process.env.HTTPS_PROXY && /^http/.test(port)) launch.proxy = { server: process.env.HTTPS_PROXY };
// Hosted runs go through this sandbox's egress proxy, whose CA Chromium does not know: CA_SPKI (base64 SHA-256 of that CA's public key, from /root/.ccr/agent-proxy-ca.crt) trusts that one CA, nothing else; certificate checking is not turned off.
if (process.env.CA_SPKI) launch.args.push(`--ignore-certificate-errors-spki-list=${process.env.CA_SPKI}`);
const b = await chromium.launch(launch);
const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage(); p.setDefaultTimeout(240000); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#toast{display:none!important}'; document.head.append(s); }));
const res = {};
const ready = async () => { await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 }); };
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const click = (re, sel = 'button') => p.evaluate(({ re, sel }) => { const x = [...document.querySelectorAll(sel)].find((e) => new RegExp(re, 'i').test(e.innerText.trim().replace(/\s+/g, ' ')) && e.offsetParent); x?.click(); return !!x; }, { re, sel });
await p.goto(url('?debug&manual&q=low')); await ready();
res.build = await p.evaluate(async () => (await import('./js/battlereport.js')).BUILD); res.tag = await p.evaluate(() => document.querySelector('.lab-tag')?.textContent || null);
// an earlier visit: a saved hero (password pw12) wins one fight, leaving a stored report
await p.evaluate(async () => { const { S, E, showBoard } = window.QD; const SV = await import('./js/save.js'); const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); await SV.createSave(h, 'pw12'); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1); await p.evaluate(() => window.QD.startQuest(window.QD.E.questsFor(window.QD.S.hero)[0]));
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!window.QD.world.battle && !!document.querySelector('#b3-roll'))) break; await click('decline|continue', '.env-btns button, .sx-envelope button'); await pump(0.5); }
await p.evaluate(() => { const { S, E, B3, showVictory } = window.QD; const bt = S.battle; bt.enemies.forEach((e) => { e.hp = 1; e.maxHp = 1; }); E.startRoll(bt); E.resolve(bt, { target: 0 }); B3.stop(); showVictory(); }); await pump(2);
res.storedBefore = await p.evaluate(() => Object.keys(localStorage).filter((k) => /battlereports$/.test(k)).map((k) => [k, JSON.parse(localStorage.getItem(k)).length]));
// a fresh visit: resume the saved hero from the title screen
await p.goto(url('?debug&manual&q=low')); await ready(); await pump(1); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/1_title.png` });
res.continueClicked = await click('^continue|dave', '.sx-menu button, .sx-menu a, .plaque, button'); await p.waitForTimeout(600);
await p.evaluate(() => { const i = document.querySelector('input[type=password]'); if (i) { i.value = 'pw12'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); } });
await pump(2); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/2_after_resume.png` });
res.screen1 = await p.evaluate(() => [...document.querySelectorAll('button')].filter((e) => e.offsetParent).map((e) => e.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 14));
// the hero hub's own menu (the round button, top left)
res.hubMenuOpened = await p.evaluate(() => { const g = document.querySelector('#gmenu'); if (g && !g.hidden) { g.click(); return true; } return false; }); await pump(0.5); await p.waitForTimeout(600);
res.hubMenuItems = await p.evaluate(() => [...document.querySelectorAll('.modal-card button')].map((e) => e.innerText.trim())); await p.screenshot({ path: `${OUT}/3a_hub_menu.png` });
await click('^close$', '.modal-card button'); await pump(0.5);
// camp: the resumed hero (opened with the real password prompt above) is taken to camp with the page's own debug hook, because the road in front of it needs dice rolls
await p.evaluate(() => window.QD.showCamp({ fromBoard: true })); await pump(2); await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/3_camp.png` });
res.campButtons = await p.evaluate(() => [...document.querySelectorAll('button')].filter((e) => e.offsetParent).map((e) => e.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 12));
res.menuOpened = await p.evaluate(() => { const g = document.querySelector('#gmenu'); if (g && !g.hidden) { g.click(); return true; } const m = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /^menu$/i.test(e.innerText.trim())); m?.click(); return !!m; }); // camp: the round menu button, top left
 await pump(0.5); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/4_menu.png` });
res.menuItems = await p.evaluate(() => [...document.querySelectorAll('.modal-card button')].map((e) => e.innerText.trim()));
res.reportsClicked = await click('^battle reports$', '.modal-card button'); await pump(0.5); await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/5_reports.png` });
res.sheet = await p.evaluate(() => { const s = document.querySelector('.br-sheet'); return s ? { title: s.querySelector('h2').innerText, picks: [...s.querySelectorAll('.br-pick b')].map((x) => x.innerText), actions: [...s.querySelectorAll('.br-actions .btn, .row .btn')].map((x) => x.innerText) } : null; });
res.storedAfter = await p.evaluate(() => Object.keys(localStorage).filter((k) => /battlereports$|\.hero\./.test(k)));
console.log(JSON.stringify(res, null, 1)); await b.close();
