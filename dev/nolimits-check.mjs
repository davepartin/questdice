// Dave, 27 Oct 2026: no act limit on die growth, Heart ranks 200 / 300, the feet (initiative) die to d10. Live root, Act I hero with plenty of gold.
//   node dev/nolimits-check.mjs [shots dir] [port]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const out = process.argv[2] || 'shots/nolimits'; const port = +(process.argv[3] || 8159); fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
let browser; let failed = 0; const check = (label, ok, detail) => { console.log(ok ? 'PASS' : 'FAIL', label, detail || ''); if (!ok) failed++; };
try {
  await new Promise((r) => server.stdout.once('data', r));
  browser = await chromium.launch({ executablePath: process.env.CHROME || chromium.executablePath(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
  const pump = () => p.evaluate(async () => { for (let i = 0; i < 30; i++) { window.QD.world.stage.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } });
  await p.evaluate(() => { const { S, E, showCamp } = window.QD; const hero = E.newHero({ name: 'Limitless', cls: 'ranger', seed: 5 }); hero.gold = 2000; hero.campaign.act = 1; S.hero = hero; S.company = { members: [hero] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice'; showCamp(); });
  await pump();
  const st = () => p.evaluate(() => { const h = window.QD.S.hero; return { rank: window.QD.E.heartRankOf(h), gold: h.gold, W: h.strength.W, S: window.QD.E.feetSize(h), N: window.QD.E.mindSize(h) }; });
  const open = async (cell) => { await p.locator(`.cw-cell.s-${cell}`).click(); await pump(); };
  // Heart: rank 2 (200) then rank 3 (300) in Act I
  await open('C'); await p.locator('[data-heart-rank="2"].ready').click(); await pump(); let s = await st(); check('Heart rank 2 in Act I for 200', s.rank === 2 && s.gold === 1800, JSON.stringify(s));
  await p.locator('[data-heart-rank="3"].ready').click(); await pump(); s = await st(); check('Heart rank 3 for 300 more', s.rank === 3 && s.gold === 1500, JSON.stringify(s)); await p.screenshot({ path: `${out}/heart.png` });
  // Feet: d6 -> d8 -> d10 (Ranger starts d6 and used to stop at d8)
  await open('S'); for (const z of [8, 10]) { const before = (await st()).S; await p.locator(`.cb-cov[data-slot="S"]`).filter({ hasText: '' }).first().click(); await pump(); s = await st(); check(`Feet grow to d${z}`, s.S === z, `${before} -> ${s.S}, gold ${s.gold}`); await open('S'); }
  await p.screenshot({ path: `${out}/feet.png` });
  // Left hand d4 -> d10 in Act I
  await open('W'); for (const z of [6, 8, 10]) { await p.locator('.cb-cov[data-slot="W"]').first().click(); await pump(); s = await st(); check(`Left hand grows to d${z} in Act I`, s.W === z, JSON.stringify(s)); await open('W'); }
  await p.screenshot({ path: `${out}/hand.png` });
  check('no seals or "needs Act" text on the cards', !(await p.evaluate(() => /needs Act|Requires Act|Grows again in Act/.test(document.body.innerText + [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join(' ')))));
  check('page errors', !errors.length, errors.join('; '));
} finally { await browser?.close(); server.kill(); }
process.exitCode = failed ? 1 : 0;
