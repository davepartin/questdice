// Graphics menu, Battery saver, install files and offline start, in a real Chromium on a phone-sized screen.
//   node dev/pwa-check.mjs [shots dir] [port]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const out = process.argv[2] || 'shots/pwa'; const port = +(process.argv[3] || 8161); fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
let browser; let failed = 0; const check = (label, ok, detail) => { console.log(ok ? 'PASS' : 'FAIL', label, detail || ''); if (!ok) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await new Promise((r) => server.stdout.once('data', r));
  browser = await chromium.launch({ executablePath: process.env.CHROME || chromium.executablePath(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch { /* ignore */ } });
  const url = `http://localhost:${port}/?debug`;
  const ready = () => p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
  await p.goto(url); await ready();
  // the service worker installs and takes over
  check('service worker registered and active', await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; }));
  await p.reload(); await ready(); await sleep(500);
  check('page is controlled by the worker after a reload', await p.evaluate(() => !!navigator.serviceWorker.controller));
  // Auto on this phone (Android, the test browser's cores) and the menu
  const stage0 = await p.evaluate(() => ({ q: window.QD.world.stage.quality, saver: window.QD.world.stage.saver }));
  check('default stage is not on High for an Android phone', stage0.q !== 'high', JSON.stringify(stage0));
  const openMenu = async (word = /^Graphics:/) => { await p.evaluate(() => document.querySelector('#gmenu').click()); await sleep(300); await p.evaluate((src) => [...document.querySelectorAll('#modal button')].find((b) => new RegExp(src).test(b.textContent))?.click(), word.source); await sleep(300); };
  await openMenu(); check('Graphics opens from the menu and has no download button', await p.evaluate(() => /Graphics/.test(document.querySelector('#modal').innerText) && !/Download the game/i.test(document.querySelector('#modal').innerText)));
  await p.screenshot({ path: `${out}/menu.png` });
  const press = (re) => p.evaluate((src) => { const r = new RegExp(src, 'i'); const b = [...document.querySelectorAll('#modal button')].find((x) => r.test(x.textContent) && !x.disabled); if (!b) return false; b.click(); return true; }, re.source);
  check('pick Low and turn Battery saver on', (await press(/^Low$/)) && (await press(/^Battery saver: Off/)));
  check('Apply and restart is offered', await p.evaluate(() => /apply and restart/i.test(document.querySelector('#modal').innerText))); await p.screenshot({ path: `${out}/menu-changed.png` });
  await Promise.all([p.waitForNavigation({ waitUntil: 'load' }).catch(() => {}), press(/Apply and restart/)]); await ready(); await sleep(500);
  const s1 = await p.evaluate(() => ({ q: window.QD.world.stage.quality, saver: window.QD.world.stage.saver, dpr: window.QD.world.stage.dpr, shadows: window.QD.world.stage.renderer.shadowMap.enabled, stored: localStorage.getItem('qd.gfx') }));
  check('after restart: Low, Battery saver, 1x pixels, no shadows', s1.q === 'low' && s1.saver === true && s1.dpr === 1 && s1.shadows === false, JSON.stringify(s1));
  // the 30 fps cap: count real frames drawn in two seconds
  const frames = await p.evaluate(() => new Promise((res) => { let n = 0; const off = window.QD.world.stage.onFrame(() => { n++; }); setTimeout(() => { off(); res(n); }, 2000); }));
  check('frame rate is capped near 30 a second', frames <= 70, `${frames} frames in 2 s`);
  // download the game to the phone
  await openMenu(/^Download game/); check('Download game is its own menu word and opens its screen', await p.evaluate(() => /Download game/.test(document.querySelector('#modal').innerText))); await p.screenshot({ path: `${out}/download-menu.png` }); await press(/Download the game to this phone/);
  const done = await p.waitForFunction(() => /Saved on this phone: .* files/.test(document.querySelector('#modal')?.innerText || ''), null, { timeout: 120000 }).then(() => true).catch(() => false);
  const cached = await p.evaluate(async () => (await (await caches.open('qd-static-1')).keys()).length);
  check('Download saves every file', done && cached >= 600, `${cached} files saved; ${await p.evaluate(() => document.querySelector('#modal')?.innerText.split('\n').find((l) => /Saved on this phone/.test(l)))}`);
  await p.screenshot({ path: `${out}/downloaded.png` });
  // no signal: the game still opens from the saved copy
  await ctx.setOffline(true); await p.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  const offlineOk = await ready().then(() => true).catch(() => false);
  check('with no network the game opens from the saved copy', offlineOk);
  await sleep(3000); const titleText = await p.evaluate(() => document.querySelector('#app')?.innerText.replace(/\s+/g, ' ').slice(0, 120)); check('the title screen shows offline', /quest|play|continue|new|hero/i.test(titleText || ''), titleText);
  await p.screenshot({ path: `${out}/offline.png` });
  await ctx.setOffline(false);
  // a newer build on the server: the bar appears, the menu says so, Restart reloads
  await p.route(/version\.json/, (r) => r.fulfill({ json: { build: 'newer9999' } }));
  await p.goto(url); await ready(); await p.waitForSelector('#qd-update', { timeout: 15000 }).catch(() => {});
  check('an update bar appears when the server has a newer build', await p.evaluate(() => /new version/i.test(document.querySelector('#qd-update')?.innerText || '')));
  await p.screenshot({ path: `${out}/update-bar.png` });
  await p.evaluate(() => document.querySelector('#qd-update .later')?.click());
  check('Later dismisses it', await p.evaluate(() => !document.querySelector('#qd-update')));
  await openMenu(/^Download game/); const vtxt = await p.evaluate(() => document.querySelector('#modal').innerText.replace(/\s+/g, ' '));
  check('the menu shows the running version and the newer one', /Version \d+\w+/.test(vtxt) && /newer version is ready \(newer9999\)/i.test(vtxt) && /Newer files are available/.test(vtxt), vtxt.match(/Version.{0,80}/)?.[0]);
  await p.screenshot({ path: `${out}/menu-newer.png` }); await p.unroute(/version\.json/);
  // the way out
  await p.goto(`${url}&nosw`); await sleep(2500);
  check('?nosw removes the worker and the saved files', await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length === 0 && !(await caches.has('qd-static-1'))));
  check('no page errors', !errors.length, errors.slice(0, 3).join('; '));
} finally { await browser?.close(); server.kill(); }
process.exitCode = failed ? 1 : 0;
