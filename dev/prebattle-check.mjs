// pb1 (Crockpot / Grok Bot, 31 Oct 2026): the pre-battle game board fits one phone screen with no scrolling, solo and with a party of 2-4,
// at 390x844 and 375x667; the pieces stand on the current space and slide there from the last one.
//   CHROME=... node dev/prebattle-check.mjs [out=/workspace/prebattle] [port=8189]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/prebattle'; const port = +(process.argv[3] || 8189); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const CLS = ['knight', 'wizard', 'ranger', 'bard'];
const measure = (p) => p.evaluate(() => {
  const main = document.querySelector('.sx-board-main'); const q = (s) => document.querySelector(s)?.getBoundingClientRect();
  const scrollers = [document.scrollingElement, ...document.querySelectorAll('.sx-board *, .sx-board-main')].filter((e) => e && (e === document.scrollingElement ? e.scrollHeight > innerHeight + 1 : e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY))).map((e) => e.className || e.tagName);
  const go = q('.sx-qcard .qc-go'); const board = q('.gb-board'); const title = q('.sx-act'); const pcs = [...document.querySelectorAll('.gb-piece')].map((e) => e.getBoundingClientRect()); const now = q('.gb-space.now');
  return { vh: innerHeight, docH: document.scrollingElement.scrollHeight, over: main ? main.scrollHeight - main.clientHeight : null, scrollers, goBottom: go ? Math.round(go.bottom) : null, board: board ? [Math.round(board.top), Math.round(board.bottom)] : null,
    titleTop: title ? Math.round(title.top) : null, pieces: pcs.length, onNow: now && pcs.length ? pcs.every((r) => Math.abs(r.bottom - (now.top + now.height / 2)) < 30 && Math.abs((r.left + r.right) / 2 - (now.left + now.width / 2)) < 40) : false,
    scene: getComputedStyle(document.querySelector('.sx-screen.board') || document.body).getPropertyValue('--sheet').trim() };
});
async function open(w, hgt, n, step, from) {
  const p = await br.newPage({ viewport: { width: w, height: hgt }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  await p.evaluate(async ([n, step, from, CLS]) => { const { S, E, showBoard } = window.QD; const SV = await import('./js/save.js');
    const hs = CLS.slice(0, n).map((cls, i) => { const x = E.newHero({ name: `Pb${cls}${i}`, cls, seed: 5 + i }); x.level = 3; x.campaign.step = step; return x; });
    for (const x of hs) if (!SV.heroExists(x.name)) await SV.createSave(x, 'testpass');
    S.hero = hs[0]; S.company = n > 1 ? { kind: 'company', name: 'The Fellowship', members: hs } : { members: hs };
    localStorage.setItem(`qd.gb.${hs.map((x) => x.name).join('+')}.${hs[0].campaign.act}`, String(from)); showBoard(); }, [n, step, from, CLS]);
  await p.waitForSelector('.gb-board'); return { p, errs };
}
for (const [w, hgt] of [[390, 844], [375, 667]]) for (const n of [1, 2, 3, 4]) {
  const { p, errs } = await open(w, hgt, n, 2, 2); await p.waitForTimeout(1500); const m = await measure(p);
  const ok = m.docH === m.vh && m.over <= 0 && !m.scrollers.length && m.goBottom && m.goBottom <= m.vh && m.board && m.titleTop < m.board[0] && m.pieces === n && m.onNow && !errs.length;
  check(`${w}x${hgt} party of ${n}: one screen, no scroll, Fight visible, ${n} piece(s) on the current space`, ok, JSON.stringify({ ...m, errs }));
  const name = n === 1 ? `solo_${w}x${hgt}` : n === 3 && w === 390 ? 'party_390x844' : null;
  if (name) await p.screenshot({ path: `${OUT}/${name}.png` });
  await p.close();
}
{ // the slide: a win at quest 2 sends the piece(s) from space 2 to space 3
  const { p, errs } = await open(390, 844, 2, 3, 2); await p.waitForTimeout(120);
  const before = await measure(p); await p.screenshot({ path: `${OUT}/slide_1_before_390x844.png` });
  await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/slide_2_moving_390x844.png` });
  await p.waitForTimeout(1600); const after = await measure(p); await p.screenshot({ path: `${OUT}/slide_3_after_390x844.png` });
  check('slide: pieces start on the last space, then stand on the new one', !before.onNow && after.onNow && !errs.length, JSON.stringify({ before: before.onNow, after: after.onNow, errs }));
  await p.close();
}
await br.close(); server.kill(); console.log(bad ? `${bad} FAILED` : 'ALL PASS'); process.exit(bad ? 1 : 0);
