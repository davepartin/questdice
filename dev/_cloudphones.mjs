// Several real browser phones at one ONLINE table, with the game's own cloud code running against dev/fakecloud.mjs (a stand-in for Firebase:
// no Google, no security rules, not Safari). Each phone is its own browser context, so its own seat and uid. Used by dev/t21online.mjs.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
import { startFake, installFake } from './fakecloud.mjs';
const ROOT = path.resolve(import.meta.dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon' };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function bringUp(names, { w = 390, h = 664, dpr = 2, root = ROOT } = {}) {
  const fake = await startFake();
  const web = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(res); });
  await new Promise((r) => web.listen(0, '127.0.0.1', r)); const base = `http://localhost:${web.address().port}`;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
  const phones = [];
  for (const name of names) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, deviceScaleFactor: dpr });
    await ctx.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch { /* */ } });
    await installFake(ctx, fake.port);
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => { errors.push(e.message); console.log(`[${name}] ERR`, e.message); });
    const ph = { name, page, ctx, errors,
      async open(q = '') { await page.goto(`${base}/?debug&manual&q=low${q}`); await page.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 }); },
      pump: (s) => page.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s),
      async shot(file) { await page.evaluate(() => window.QD.world.stage.step(1)); await page.screenshot({ path: file }); },
      click: (sel) => page.evaluate((s) => { const el = [...document.querySelectorAll(s)].find((e) => e.offsetParent !== null) || document.querySelector(s); if (!el) throw new Error('no ' + s); el.click(); }, sel),
      clickText: (txt) => page.evaluate((t) => { const el = [...document.querySelectorAll('button, .sx-plaque, a')].find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase().includes(t.toLowerCase())); if (!el) throw new Error('no button: ' + t); el.click(); }, txt),
      fill: (sel, v) => page.fill(sel, v),
      table: () => page.evaluate(() => { const t = window.QD.session.current(); return t ? { phase: t.phase, seq: t.seq } : null; }),
      me: () => page.evaluate(() => { const h = window.QD.session.hero(); return h ? { name: h.name, cls: h.cls, dice: h.dice, NW: h.loadout.NW, NE: h.loadout.NE, level: h.level, gold: h.gold } : null; }),
      send: (cmd) => page.evaluate((c) => window.QD.session.send(c).then((d) => ({ ok: true })).catch((e) => ({ ok: false, error: e.message })), cmd),
      pause: (on = true) => page.evaluate((o) => { window.__fake.paused = o; }, on),
      stats: () => page.evaluate(() => ({ reads: window.__fake.reads, feed: window.__fake.feed })),
    };
    phones.push(ph);
  }
  return { fake, base, browser, phones, close: async () => { await browser.close(); web.close(); fake.close(); } };
}
const pw = (p) => p.page.evaluate(() => { const el = document.querySelector('#hero-pw, input[type=password]'); if (el) { el.value = 'abc123'; el.dispatchEvent(new Event('input', { bubbles: true })); } });
// First phone opens a table as `cls[0]`, the others join as `cls[i]`; everyone is ready; the host takes the road.
export async function seat(ps, cls = []) {
  const [a, ...rest] = ps; for (const p of ps) await p.open();
  const pick = async (p, c) => { if (c) await p.page.evaluate((x) => { const b = [...document.querySelectorAll('button')].find((e) => new RegExp(x, 'i').test(e.textContent)); b?.click(); }, c); };
  await a.pump(1); await a.clickText('Play together'); await a.pump(1); await a.clickText('Open a table'); await a.pump(2); await a.clickText('Dawn Lantern'); await a.pump(2);
  await a.fill('#hero-name', 'Dave1'); await pw(a); await pick(a, cls[0]); await a.clickText('Open the table'); await a.pump(3);
  await a.page.waitForFunction(() => window.QD.S.net?.code, null, { timeout: 60000 }); const code = await a.page.evaluate(() => window.QD.S.net.code);
  for (const [i, p] of rest.entries()) {
    await p.pump(1); await p.clickText('Play together'); await p.pump(1); await p.clickText('Join a table'); await p.pump(2);
    await p.fill('#table-code', code); await p.fill('#hero-name', `Pal${i + 2}`); await pw(p); await pick(p, cls[i + 1]); await p.clickText('Take a seat');
    await p.page.waitForFunction(() => window.QD.S.net?.code, null, { timeout: 60000 }); await p.pump(2); await p.clickText('I am ready'); await sleep(300);
  }
  for (const p of ps) await p.pump(1);
  await a.clickText('Take the road'); await sleep(700); for (const p of ps) await p.pump(3);
  return code;
}
