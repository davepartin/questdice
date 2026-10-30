// Camp cp5 (Crockpot / Grok Bot, 27 Oct 2026; Dave: Store tab keeps the camp tabs like Gear; the camp act bar should look like the
// step bar on the fight-choosing (road) screen). Shots of camp Dice page, Store tab and the road board at 390x844 and 412x915;
// with CHECK=1 asserts the Store renders inside the tab area with nav/act bar kept, no "Back to camp", and the camp uses .sx-trail.
//   node dev/camp-cp5.mjs [out=/workspace/camp-cp5] [tag=after] [port=8165]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/camp-cp5'; const TAG = process.argv[3] || 'after'; const port = +(process.argv[4] || 8165); fs.mkdirSync(OUT, { recursive: true });
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
  await p.evaluate(() => { const { S, E, showCamp } = window.QD; const hh = E.newHero({ name: 'Bartholomew', cls: 'knight', seed: 5 }); hh.gold = 340; hh.campaign.step = 3; S.hero = hh; S.company = { members: [hh] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice'; showCamp(); });
  await pump(2); await shot('camp-dice');
  const dice = await p.evaluate(() => ({ trail: !!document.querySelector('.sx-cstat .sx-trail'), nodes: document.querySelectorAll('.sx-cstat .tr-node').length, pots: !!document.querySelector('.sx-cstat .cs-pots') }));
  await p.evaluate(() => document.querySelector('.cw-nav button[data-camp-page="store"]')?.click()); await pump(1.5); await shot('camp-store');
  const st = await p.evaluate(() => ({ nav: !!document.querySelector('.cw-nav'), on: document.querySelector('.cw-nav button.on')?.dataset.campPage, cstat: !!document.querySelector('.sx-cstat'), store: !!document.querySelector('.sx-tab .cst-store'), back: [...document.querySelectorAll('button')].some((x) => /Back to camp/.test(x.textContent)), zones: [...document.querySelectorAll('.cst-zone')].map((z) => z.className.split(' ')[1]), signText: document.querySelector('.cst-sign')?.textContent, viewport: !!document.querySelector('.cw-camp .sx-viewport') }));
  await p.evaluate(() => document.querySelector('.cw-nav button[data-camp-page="gear"]')?.click()); await pump(0.5);
  const gear = await p.evaluate(() => document.querySelector('.cw-nav button.on')?.dataset.campPage);
  await p.evaluate(() => window.QD.showBoard?.()); await pump(1.5); await shot('road');
  console.log(w, hgt, JSON.stringify({ dice, st, gear }));
  if (process.env.CHECK) {
    check(`${w}: camp act bar is the road .sx-trail (10 nodes) with potions`, dice.trail && dice.nodes === 10 && dice.pots, JSON.stringify(dice));
    check(`${w}: Store keeps tab bar, Store highlighted, act bar, camp art`, st.nav && st.on === 'store' && st.cstat && st.viewport && st.store, JSON.stringify(st));
    check(`${w}: no Back to camp button`, !st.back);
    check(`${w}: store order potions first`, st.zones[0] === 'zn-supplies', st.zones.join());
    check(`${w}: store header has no cost`, !/\d/.test(st.signText || ''), st.signText);
    check(`${w}: Store -> Gear switches tabs`, gear === 'gear', gear);
    check(`${w}: no page errors`, errs.length === 0, errs.join(';'));
  }
  await ctx.close();
}
await b.close(); server.kill(); process.exit(bad ? 1 : 0);
