// The daily challenge's potion shop between fights, in a real Chromium: points buy potions, the belt limits, the score drops.
//   node dev/dailyshop-check.mjs [shots dir] [port]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const out = process.argv[2] || 'shots/dailyshop'; const port = +(process.argv[3] || 8164); fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
let browser; let failed = 0; const check = (label, ok, detail) => { console.log(ok ? 'PASS' : 'FAIL', label, detail || ''); if (!ok) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await new Promise((r) => server.stdout.once('data', r));
  browser = await chromium.launch({ executablePath: process.env.CHROME || chromium.executablePath(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch { /* ignore */ } });
  await p.goto(`http://localhost:${port}/?debug`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 }); await sleep(1500);
  const click = (re) => p.evaluate((src) => { const r = new RegExp(src, 'i'); const b = [...document.querySelectorAll('button, [role=button]')].find((x) => x.offsetParent && !x.disabled && r.test(x.textContent)); if (!b) return false; b.click(); return true; }, re.source);
  const text = () => p.evaluate(() => document.querySelector('#app')?.innerText.replace(/\s+/g, ' ') || '');
  await p.evaluate(() => window.QD.showTitle()); await sleep(500); await click(/daily challenge|^\s*daily/); await sleep(900); await click(/^\s*begin/);
  await p.waitForFunction(() => document.querySelector('#b3-roll'), null, { timeout: 60000 }); await sleep(1000);
  // pretend fight 1 was won for 500 points and the belt is empty, then finish it
  await p.evaluate(() => { const D = window.QD.S.daily; D.fights.push({ won: true, score: 500, name: 'x' }); D.idx++; window.QD.S.hero.potions = 0; window.QD.dailyAfter(true); }); await sleep(900);
  let t = await text(); check('the rest screen shows the potion shop', /Potions/.test(t) && /0 of 2 on your belt/.test(t) && /buy a potion · \d+ pts/i.test(t), t.match(/Potions.{0,80}/)?.[0]);
  await p.screenshot({ path: `${out}/shop.png` });
  const before = await p.evaluate(() => window.QD.S.hero.potions); const pts0 = +((t.match(/([\d,]+) points/) || [])[1] || '0').replace(/,/g, '');
  check('buy one', await click(/buy a potion/)); await sleep(500); t = await text();
  const after = await p.evaluate(() => window.QD.S.hero.potions); const pts1 = +((t.match(/([\d,]+) points/) || [])[1] || '0').replace(/,/g, '');
  check('the belt went up and the score went down', after === before + 1 && pts1 < pts0, `potions ${before} -> ${after}, points ${pts0} -> ${pts1}`);
  check('buy a second', await click(/buy a potion/)); await sleep(500); t = await text();
  check('the belt is full and the button says so', /2 of 2 on your belt/.test(t) && /belt full/i.test(t) && !(await click(/buy a potion/)), t.match(/Potions.{0,90}/)?.[0]); await p.screenshot({ path: `${out}/shop-full.png` });
  check('no page errors', !errors.length, errors.slice(0, 3).join('; '));
} finally { await browser?.close(); server.kill(); }
process.exitCode = failed ? 1 : 0;
