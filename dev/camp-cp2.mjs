// Camp cp2 (Crockpot / Grok Bot, 27 Oct 2026; Dave): the bottom Store strip is gone (the Store tab replaces it) and the hero chip (name, level, gold)
// stays above the camp art while the sheet scrolls. 390x844 screens, mid-scroll frames + checks.
//   CHROME=... node dev/camp-cp2.mjs [out=/workspace/camp-cp2] [port=8162]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/camp-cp2'; const port = +(process.argv[3] || 8162); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); p.setDefaultTimeout(120000); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort()); await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(async () => { const { S, E, showCamp } = window.QD; const hh = E.newHero({ name: 'Bartholomew', cls: 'knight', seed: 5 }); hh.gold = 600; hh.campaign.act = 1; hh.campaign.step = 3;
  S.hero = hh; S.company = { members: [hh] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice'; const SV = await import('./js/save.js'); if (!SV.heroExists(hh.name)) await SV.createSave(hh, 'testpass'); showCamp(); });
await pump(2);
const clear = () => p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17').forEach((t) => t.remove()));
const shot = async (n) => { await clear(); await p.evaluate(() => window.QD.world.stage.step?.(1)); await p.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', `${OUT}/${n}.png`); };
// Is the chip really painted on top? (elementFromPoint ignores pointer-events:none layers such as the art, so look at pixels:
// the chip's box is screenshotted with the chip shown and with the chip hidden; if the art painted over the chip the two are identical.)
import { execFileSync } from 'node:child_process';
const diff = (a, b) => +execFileSync('python3', ['-c', 'import sys;from PIL import Image,ImageChops;import numpy as n;a=Image.open(sys.argv[1]).convert("RGB");b=Image.open(sys.argv[2]).convert("RGB");print(n.asarray(ImageChops.difference(a,b)).mean())', a, b]).toString();
let probeN = 0;
const chipProbe = async (sel = '.sx-sidetop .sx-chip') => {
  const meta = await p.evaluate((sel) => { const chip = document.querySelector(sel); if (!chip) return null; const r = chip.getBoundingClientRect(); const nameEl = chip.querySelector('.ch-copy b');
    return { rect: { x: r.left, y: r.top, width: r.width, height: r.height }, name: nameEl?.textContent, gold: chip.textContent.replace(/\s+/g, ' ').trim() }; }, sel);
  if (!meta) return { missing: true };
  const clip = meta.rect; const a = `/tmp/cp2-probe-a${probeN}.png`, c = `/tmp/cp2-probe-b${probeN++}.png`;
  await p.screenshot({ path: a, clip });
  await p.evaluate((sel) => { document.querySelector(sel).style.visibility = 'hidden'; }, sel); await p.screenshot({ path: c, clip });
  await p.evaluate((sel) => { document.querySelector(sel).style.visibility = ''; }, sel);
  const d = diff(a, c); return { visible: d > 12, diff: +d.toFixed(1), rect: clip, name: meta.name, gold: meta.gold };
};

// 1. camp page: no bottom Store strip
await p.evaluate(() => { const s = document.querySelector('.sx-side'); if (s) s.scrollTop = 0; }); await pump(0.4);
check('camp has no bottom Store strip/button', await p.evaluate(() => !document.querySelector('.sx-storebtn') && ![...document.querySelectorAll('.sx-camp-scroll button')].filter((x) => !x.closest('.cw-nav')).some((x) => /^\s*Store\s*$/.test(x.textContent))));
const labels = await p.evaluate(() => [...document.querySelectorAll('.cw-nav button')].map((x) => x.textContent.trim()));
check('camp bar still reads Dice, Powers, Gear, Store, Hero', labels.join() === 'Dice,Powers,Gear,Store,Hero', labels.join());
await shot('1-camp-top');
const top0 = await chipProbe(); check('chip on top at scroll 0', !top0.missing && top0.visible, JSON.stringify(top0));
// scroll to the very bottom: no strip, nothing under the dice but the end of the page
await p.evaluate(() => { const s = document.querySelector('.sx-side'); s.scrollTop = s.scrollHeight; }); await pump(0.4); await shot('2-camp-bottom-no-strip');
const bottom = await p.evaluate(() => { const s = document.querySelector('.sx-side'); return { st: s.scrollTop, h: s.scrollHeight, ch: s.clientHeight, store: !!document.querySelector('.sx-storebtn') }; });
check('bottom of camp: no Store strip', !bottom.store, JSON.stringify(bottom));
// 2. scroll up through the art zone on every tall camp page: mid-scroll frames
let i = 3;
for (const page of ['gear', 'hero', 'dice']) {
  await p.evaluate((page) => { const { S } = window.QD; S.tab = 'forge'; S.campPage = page; window.QD.showCamp(); document.querySelector('.sx-side').scrollTop = 0; }, page); await pump(0.5);
  const dims = await p.evaluate(() => { const s = document.querySelector('.sx-side'); return { h: s.scrollHeight, ch: s.clientHeight }; }); const max = dims.h - dims.ch;
  console.log(page, 'scrollable', max);
  const stops = page === 'dice' ? [max, 0] : [max, Math.round(max * .6), 300, 160, 90, 40, 0];
  for (const y of stops) {
    await p.evaluate((y) => { const s = document.querySelector('.sx-side'); s.scrollTop = y; s.dispatchEvent(new Event('scroll')); }, y); await pump(0.3);
    const pr = await chipProbe(); const tt = await chipProbe('.cw-camp .sx-viewport .sx-top h1');
    check(`${page}: name and coins chip painted on top at scrollTop ${y}`, !pr.missing && pr.visible && /Bartholomew/.test(pr.name || '') && /600/.test(pr.gold), JSON.stringify(pr));
    check(`${page}: Camp title painted on top at scrollTop ${y}`, !tt.missing && tt.visible, JSON.stringify(tt));
    if (page === 'hero' && [300, 160, 90, 40].includes(y)) await shot(`${i++}-camp-hero-scroll-${y}`);
  }
}
// 3. the chip also stays on top over the Store and Hero pages and with wheel-style scroll up from the middle
await p.locator('.cw-nav button[data-camp-page="store"]').click(); await pump(0.6);
for (const y of [200, 60]) { await p.evaluate((y) => { document.querySelector('.sx-side').scrollTop = y; }, y); await pump(0.3); const pr = await chipProbe(); check(`Store tab: chip on top at scrollTop ${y}`, pr.visible, JSON.stringify(pr)); }
await shot('7-store-tab-scrolled-60');
check('no page errors', errs.length === 0, errs.join(' | '));
await b.close(); server.kill(); console.log(bad ? `${bad} FAILED` : 'ALL PASS'); process.exit(bad ? 1 : 0);
