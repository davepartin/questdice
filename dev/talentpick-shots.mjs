// tz1 (Crockpot / Grok Bot, 31 Oct 2026): tapping a face on the TALENTS card glides down to "Choose a face", and the area fits.
//   node dev/talentpick-shots.mjs <tag>   -> /workspace/talentpick/<tag>_<w>x<h>.png
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const tag = process.argv[2] || 'after'; const OUT = '/workspace/talentpick'; fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const server = spawn(process.execPath, ['dev/serve.mjs', '8193'], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] }); let bad = 0;
for (const [w, hgt] of [[390, 664], [375, 548]]) {
  const p = await br.newPage({ viewport: { width: w, height: hgt }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto('http://127.0.0.1:8193/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  await p.evaluate(async () => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Tz talent', cls: 'knight', seed: 7 }); h.level = 5; h.gold = 300; h.special.SW = 4; h.special.SE = 4; h.talent = { SW: [], SE: [] };
    S.hero = h; S.company = { members: [h] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice'; const SV = await import('./js/save.js'); if (!SV.heroExists(h.name)) await SV.createSave(h, 'testpass'); showCamp(); });
  await p.locator('.cw-cell.s-SW').click(); await p.waitForTimeout(700);
  await p.locator('.cb-hole.open').first().click(); await p.waitForTimeout(1200);
  if (await p.locator('.tw-symbol').count()) { await p.locator('.tw-symbol').first().click(); await p.waitForTimeout(400); }
  const m = await p.evaluate(() => { const r = (s) => document.querySelector(s)?.getBoundingClientRect(); const hd = r('.tw-face-heading'), buy = r('.tw-purchase .sh-buy');
    return { vh: innerHeight, heading: hd ? Math.round(hd.top) : null, buyBottom: buy ? Math.round(buy.bottom) : null, scrolled: document.querySelector('.sx-camp .sx-side')?.scrollTop | 0 }; });
  const ok = m.heading != null && m.heading >= 0 && m.heading < m.vh * 0.4 && m.buyBottom != null && m.buyBottom <= m.vh && !errs.length;
  if (tag === 'after' && !ok) bad++; console.log(ok ? 'PASS' : 'FAIL', `${w}x${hgt}`, JSON.stringify({ ...m, errs }));
  await p.screenshot({ path: `${OUT}/${tag}_${w}x${hgt}.png` }); await p.close();
}
await br.close(); server.kill(); console.log(bad ? 'SOME FAIL' : 'DONE'); process.exit(bad ? 1 : 0);
