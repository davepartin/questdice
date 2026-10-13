// Three seats at one table: waiting zone, live lock-in pairing, mid-replay.
//   node dev/partyroom.mjs [outdir]
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { startServer, seat, toBoard, sleep, battleReady, PORT } from './_rooms.mjs';

const out = process.argv[2] || '/opt/cursor/artifacts/screenshots';
mkdirSync(out, { recursive: true });
const chrome = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/google/chrome/chrome', '/usr/local/bin/google-chrome'].find((p) => existsSync(p));

const stop = await startServer();
const browser = await chromium.launch({ executablePath: chrome, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const names = ['Ada', 'Bea', 'Cy'];
const ps = [];
for (const name of names) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 780 }, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch { /* */ } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${name}] ERR`, e.message));
  const ph = {
    name, page,
    async open(q = '') { await page.goto(`http://localhost:${PORT}/?debug&manual&q=low${q}`); await page.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 }); },
    pump: (s) => page.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s),
    async shot(path) { await page.evaluate(() => window.QD.world.stage.step(1)); const box = await page.locator('.fb').boundingBox(); if (box) await page.screenshot({ path, clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: box.width, height: box.height } }); else await page.screenshot({ path }); },
    click: (sel) => page.evaluate((s) => { const el = [...document.querySelectorAll(s)].find((e) => e.offsetParent !== null) || document.querySelector(s); if (!el) throw new Error('no ' + s); el.click(); }, sel),
    clickText: (txt) => page.evaluate((t) => { const el = [...document.querySelectorAll('button, .sx-plaque, a')].find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase().includes(t.toLowerCase())); if (!el) throw new Error('no button: ' + t); el.click(); }, txt),
    fill: (sel, v) => page.fill(sel, v),
  };
  ps.push(ph);
}
const [a, b, c] = ps;
const code = await seat(ps);
console.log('table', code);
await toBoard(ps);
await a.click('.sx-qcard').catch(() => a.clickText('Night'));
await sleep(800);
console.log('ready', await battleReady(a), await battleReady(b), await battleReady(c));
for (const p of ps) await p.pump(2);

const stance = (p) => p.page.evaluate(() => {
  const slots = [...document.querySelectorAll('.fb-slot.hero')].map((el) => ({
    name: el.querySelector('.fb-name')?.textContent, wait: el.classList.contains('wait'), locked: el.classList.contains('locked'),
    parent: el.parentElement?.className, scale: getComputedStyle(el.querySelector('.fb-pc')).transform,
  }));
  return { slots, links: document.querySelectorAll('.fb-links line').length, letters: !!document.querySelector('.fb-letter') };
});

await a.shot(`${out}/table_waiting_zone.png`);
console.log('wait A', JSON.stringify(await stance(a)));

await a.click('#b3-roll'); await sleep(900); await a.pump(5);
await a.page.evaluate(() => { window.QD.B3.battleState.target = 0; });
await a.click('#b3-lock'); await sleep(1200);
for (const p of ps) await p.pump(2);
console.log('after Ada lock B', JSON.stringify(await stance(b)));
await b.shot(`${out}/table_locked_pairing.png`);

await b.click('#b3-roll'); await sleep(900); await b.pump(5);
await b.page.evaluate(() => { const B = window.QD.B3.battleState; B.target = Math.min(1, B.b.enemies.length - 1); });
await b.click('#b3-lock'); await sleep(900);
for (const p of ps) await p.pump(2);
console.log('after Bea lock C', JSON.stringify(await stance(c)));

await c.click('#b3-roll'); await sleep(900); await c.pump(5);
await c.click('#b3-lock'); await sleep(800);
let mid = false;
for (let k = 0; k < 36; k++) {
  for (const p of ps) await p.pump(0.5);
  const busy = await a.page.evaluate(() => window.QD.B3.battleState.busy);
  if (!mid && k >= 8) { await a.shot(`${out}/table_mid_replay.png`); mid = true; }
  if (!busy && k > 6) break;
}
if (!mid) await a.shot(`${out}/table_mid_replay.png`);
console.log('replay A', JSON.stringify(await stance(a)));
await browser.close(); stop();
console.log('ok');
