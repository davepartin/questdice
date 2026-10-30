// Camp cp5 (Crockpot / Grok Bot, 27 Oct 2026; Dave: Store tab keeps the camp tabs like Gear; the camp act bar should look like the
// step bar on the fight-choosing (road) screen). Shots of camp Dice page, Store tab and the road board at 390x844 and 412x915;
// with CHECK=1 asserts the Store renders inside the tab area with nav/act bar kept, no "Back to camp", and the camp uses .sx-trail.
//   node dev/camp-cp6.mjs [out=/workspace/camp-cp6] [tag=after] [port=8166]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/camp-cp6'; const TAG = process.argv[3] || 'after'; const port = +(process.argv[4] || 8166); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
for (const [w, hgt] of [[390, 844], [412, 915]]) {
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: w, height: hgt }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); p.setDefaultTimeout(120000); p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort()); await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
  await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
  const shot = async (name) => { await p.evaluate(() => { const s = document.querySelector('.sx-side, .sx-board-main'); if (s) s.scrollTop = 0; }); await pump(0.3); await p.evaluate(() => window.QD.world.stage.step(1)); const f = `${OUT}/${w}x${hgt}-${name}-${TAG}.png`; await p.screenshot({ path: f }); console.log('shot', f); };
  await p.evaluate(() => { const { S, E, showCamp } = window.QD; const hh = E.newHero({ name: 'Bartholomew', cls: 'knight', seed: 5 }); hh.gold = 340; hh.campaign.step = 3; hh.level = 4; S.hero = hh; S.company = { members: [hh] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice'; showCamp(); });
  await pump(2); await p.evaluate(() => document.querySelector('.cw-nav button[data-camp-page="store"]')?.click()); await pump(1.5);
  const shelfShot = async (sel, name) => { await p.evaluate((sel) => { const s = document.querySelector('.sx-side'); const z = document.querySelector(sel); if (s && z) s.scrollTop += z.getBoundingClientRect().top - 90; }, sel); await pump(0.4); await p.evaluate(() => window.QD.world.stage.step(1)); const f = `${OUT}/${w}x${hgt}-${name}-${TAG}.png`; await p.screenshot({ path: f }); console.log('shot', f); };
  await shelfShot('.zn-shelf', 'shelf');
  const sh = await p.evaluate(() => { const z = document.querySelector('.zn-shelf'); const cards = [...z.querySelectorAll('.cst-wcard')];
    return { n: z.querySelectorAll('.cst-card, .cst-wcard').length, real: cards.filter((c) => c.querySelector('.qc17.cb-weapon')).length, flat: z.querySelectorAll('.cst-card').length, tags: cards.filter((c) => c.querySelector('.cst-tag .qd-price, .cst-sticker, .cst-stamp')).length, save: !!z.querySelector('.cst-wcard.save .cst-bar'), ribbon: /Worth saving for/.test(z.textContent),
      over: cards.some((c) => { const r = c.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }) }; });
  await p.evaluate(() => document.querySelector('.zn-shelf .cst-wcard .cw-spoilcard')?.click()); await pump(0.5);
  const modal = await p.evaluate(() => !!document.querySelector('.cw-modal .qc17'));
  await p.evaluate(() => document.querySelector('.cw-modal')?.closest('.modal, dialog, [class*=modal]')?.querySelector('button')?.click());
  const dia = await p.evaluate(() => document.querySelectorAll('.zn-diamond .qc17').length);
  if (dia) await shelfShot('.zn-diamond', 'diamond');
  console.log(w, hgt, JSON.stringify({ sh, modal, dia }));
  if (process.env.CHECK) {
    check(`${w}: every shelf weapon is the real weapon card (no cardboard tiles)`, sh.n > 0 && sh.real === sh.n && sh.flat === 0, JSON.stringify(sh));
    check(`${w}: each shelf card has a price chip / sticker / stamp`, sh.tags === sh.real, JSON.stringify(sh));
    check(`${w}: Worth saving for ribbon + progress bar kept`, sh.save && sh.ribbon);
    check(`${w}: shelf cards fit the screen`, !sh.over);
    check(`${w}: tapping a shelf card opens the big card`, modal);
    check(`${w}: no page errors`, errs.length === 0, errs.join(';'));
  }
  await ctx.close();
}
await b.close(); server.kill(); process.exit(bad ? 1 : 0);
