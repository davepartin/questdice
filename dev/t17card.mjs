// T17 weapon card with size rows and dice covers, in the LOCAL preview copy only (node tools/preview.mjs /tmp/t17srv weapon-size && python3 -m http.server 8141 -d /tmp/t17srv).
// Opens a Silver Dagger d4 in the camp sheet, checks the rows and covers, taps the d8 cover first (refused: wiggle and "Upgrade to d6 first"), buys d6 (gold falls by the price,
// the cover slides away, the row's two new dice appear), then buys d8, and checks the stored hero. Pictures at 375x548 and 390x664.
//   node dev/t17card.mjs [out=docs/team/tasks/T17] [port=8141]
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const OUT = process.argv[2] || 'docs/team/tasks/T17'; const port = process.argv[3] || 8141; fs.mkdirSync(OUT, { recursive: true }); let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
for (const [w, h] of [[375, 548], [390, 664]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); p.setDefaultTimeout(240000); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort()); await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
  await p.goto(`http://localhost:${port}/preview/weapon-size/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
  const tag = `${w}x${h}`;
  check(`${tag}: the preview has the switch and the proposed table`, await p.evaluate(() => window.QD.D.EXPERIMENT.weaponSize && !!window.QD.D.WEAPON_SIZE.ladder));
  await p.evaluate(async () => { const { S, E, showCamp } = window.QD; const hh = E.newHero({ name: 'Sizer', cls: 'knight', seed: 5 }); hh.level = 6; hh.gold = 400; hh.campaign.act = 1; hh.campaign.step = 3; hh.strength = { W: 4, E: 4 };
    hh.loadout.NW = E.makeWeapon('dagger', 1, () => 0.5, 4); S.hero = hh; S.company = { members: [hh] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice'; const SV = await import('./js/save.js'); if (!SV.heroExists(hh.name)) await SV.createSave(hh, 'testpass'); showCamp(); });
  await pump(2); await p.locator('.cw-cell.s-NW').click(); await pump(2); await p.waitForTimeout(500);
  const state = () => p.evaluate(() => { const c = document.querySelector('.qc17.sized'); if (!c) return null; const q = c.getBoundingClientRect(); const rows = [...c.querySelectorAll('.row')].map((r) => ({ size: +r.dataset.size, locked: r.classList.contains('locked'), dice: r.querySelectorAll('.d17').length, got: r.querySelectorAll('.d17.got').length, cover: !!r.querySelector('.cov.tok:not(.gone)') }));
    const tr = c.querySelector('.dice17').getBoundingClientRect(); const rowsOk = [...c.querySelectorAll('.row')].every((r) => { const x = r.getBoundingClientRect(); return x.top >= tr.top - 2 && x.bottom <= tr.bottom + 2; }); return { rows, top: Math.round(q.top), bottom: Math.round(q.bottom), vh: innerHeight, rowsOk, gold: document.querySelector('.sh-purse b')?.textContent, toast: document.querySelector('.toast17')?.textContent || null }; });
  let st = await state(); check(`${tag}: the card shows four size rows, covers over d6, d8 and d10 and the d4 dice`, st && st.rows.length === 4 && st.rows.map((r) => r.cover).join() === 'false,true,true,true' && st.rows[0].dice === 4, JSON.stringify(st?.rows));
  await p.waitForFunction(() => [...document.querySelectorAll('.qc17.sized .row:not(.locked) .d17')].every((f) => f.classList.contains('got')), null, { timeout: 60000 }).catch(() => {});
  st = await state(); check(`${tag}: the d4 dice are photographed`, st.rows[0].got === 4, JSON.stringify(st.rows[0]));
  await pump(1); await p.locator('.qc17.sized').screenshot({ path: `${OUT}/card-sizes-${tag}-start.png` });
  await p.evaluate(() => document.querySelector('.qc17.sized .row.s8 .cov.tok')?.click()); await pump(0.5); st = await state();
  check(`${tag}: tapping the d8 cover first buys nothing and says to upgrade to d6 first`, st.toast === 'Upgrade to d6 first' && st.gold === '400', JSON.stringify({ toast: st.toast, gold: st.gold }));
  await p.evaluate(() => document.querySelector('.qc17.sized .row.s6 .cov.tok')?.click()); await pump(2.5); await p.waitForTimeout(800);
  await p.waitForFunction(() => [...document.querySelectorAll('.qc17.sized .row:not(.locked) .d17')].every((f) => f.classList.contains('got')), null, { timeout: 60000 }).catch(() => {});
  st = await state(); const stored = await p.evaluate(() => ({ size: window.QD.S.hero.loadout.NW.size, gold: window.QD.S.hero.gold }));
  check(`${tag}: buying d6 takes 40 gold, uncovers the row's two new dice, and the hero's weapon is d6`, stored.size === 6 && stored.gold === 360 && st.rows[1].locked === false && st.rows[1].dice === 2 && st.rows[1].got === 2 && !st.rows[1].cover, JSON.stringify({ stored, row: st.rows[1] }));
  check(`${tag}: the purse on screen says 360`, st.gold === '360', st.gold);
  await p.locator('.qc17.sized').screenshot({ path: `${OUT}/card-sizes-${tag}-d6.png` });
  await p.evaluate(() => document.querySelector('.qc17.sized .row.s8 .cov.tok')?.click()); await pump(2.5); await p.waitForTimeout(800);
  await p.waitForFunction(() => [...document.querySelectorAll('.qc17.sized .row:not(.locked) .d17')].every((f) => f.classList.contains('got')), null, { timeout: 60000 }).catch(() => {});
  st = await state(); const s2 = await p.evaluate(() => ({ size: window.QD.S.hero.loadout.NW.size, gold: window.QD.S.hero.gold }));
  check(`${tag}: buying d8 takes 80 more gold`, s2.size === 8 && s2.gold === 280 && st.rows[2].got === 2, JSON.stringify({ s2, row: st.rows[2] }));
  check(`${tag}: the card fits its sheet, rows inside the tray`, st.rowsOk, JSON.stringify({ top: st.top, bottom: st.bottom, vh: st.vh }));
  await p.locator('.qc17.sized').screenshot({ path: `${OUT}/card-sizes-${tag}-d8.png` });
  check(`${tag}: no page errors`, errs.length === 0, errs.join(' | ')); await ctx.close();
}
console.log(bad ? `${bad} FAILED` : 'all passed'); await b.close(); process.exit(bad ? 1 : 0);
