// Camp cp4 (Crockpot / Grok Bot, 27 Oct 2026; Dave: "why is there a camp store cost on the header", "potions at the top of the store"):
// renders the Camp Store at 390x844, saves a screenshot, and (with CHECK=1) asserts: no price/coin chip in the store header,
// the first card under the header is the Healing potion followed by the Potion belt, the purse is shown only by the name/coins chip.
//   CHROME=... node dev/camp-cp4.mjs [out=/workspace/camp-cp4] [tag=after] [port=8164]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/camp-cp4'; const TAG = process.argv[3] || 'after'; const port = +(process.argv[4] || 8164); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] }); const errs = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); p.setDefaultTimeout(120000); p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort()); await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
await p.evaluate(async () => { const { S, E, showCamp } = window.QD; const hh = E.newHero({ name: 'Bartholomew', cls: 'knight', seed: 5 }); hh.gold = 340; hh.campaign.act = 2; hh.campaign.step = 3; S.hero = hh; S.company = { members: [hh] }; S.seat = 0; S.tab = 'forge'; showCamp(); });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await pump(2); await p.evaluate(() => document.querySelector('.cw-nav button[data-camp-page="store"]')?.click()); await pump(1.5);
await p.evaluate(() => { const s = document.querySelector('.sx-side'); if (s) s.scrollTop = 0; }); await pump(0.3); await p.evaluate(() => window.QD.world.stage.step(1));
const info = await p.evaluate(() => {
  const r = (e) => { const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)]; };
  const sign = document.querySelector('.cst-sign'); const store = document.querySelector('.cst-store');
  const zones = [...document.querySelectorAll('.cst-zone')].map((z) => z.className.split(' ')[1]);
  const first = document.querySelector('.cst-store .cst-zone .cst-card'); const firstZone = document.querySelector('.cst-store .cst-zone');
  const cards = [...firstZone.querySelectorAll('.cst-card')].map((c) => c.querySelector('h3,b,.cst-title')?.textContent || c.textContent.slice(0, 20));
  const inSign = sign ? [...sign.querySelectorAll('.qd-price,.qd-coin,.cst-coin,.cst-purse')].map((e) => e.className) : null;
  const tabBtn = [...document.querySelectorAll('.cw-nav button')].map((x) => x.textContent.trim());
  const topChip = document.querySelector('.sx-sidetop .sx-chip')?.textContent.trim();
  const storeNav = document.querySelector('.cw-nav button[data-camp-page="store"]');
  return { sign: sign && r(sign), signText: sign?.textContent, inSign, zones, firstZone: firstZone.className, firstCards: cards, tabBtn, topChip, storeNavPrice: !!storeNav?.querySelector('.qd-price,.qd-coin'), headerCoins: document.querySelectorAll('.cw-camp .sx-top .qd-coin, .cw-camp .cw-nav .qd-coin').length, hdr: [...document.querySelectorAll('.cw-camp header, .cw-camp .sx-top, .cw-camp .cw-nav')].map((e) => e.className + ':' + e.textContent.trim().slice(0, 40)) };
});
console.log(JSON.stringify(info, null, 1));
await p.screenshot({ path: `${OUT}/390x844-store-${TAG}.png` }); console.log('shot', `${OUT}/390x844-store-${TAG}.png`);
if (process.env.CHECK) {
  check('store header has no price/coin chip or purse', info.inSign && info.inSign.length === 0, JSON.stringify(info.inSign));
  check('Store tab button shows no price', !info.storeNavPrice);
  check('the name/coins chip at the top still shows the purse', /340/.test(info.topChip || ''), info.topChip);
  check('first section under the header is Supplies (potions)', info.zones[0] === 'zn-supplies', info.zones.join());
  check('Healing potion first, Potion belt next', /Healing potion/.test(info.firstCards[0]) && /Potion belt/.test(info.firstCards[1]), info.firstCards.join(' | '));
  check('no page errors', errs.length === 0, errs.join(';'));
}
await b.close(); server.kill(); process.exit(bad ? 1 : 0);
