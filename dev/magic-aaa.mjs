// mp3 (Crockpot / Grok Bot, 27 Oct 2026; Dave: magic panel fonts 'thin and too basic', make all six tabs AAA): every tab at 360x740, 390x844, 412x915,
// screenshot + no text overflow/clipping in the sheet.  node dev/magic-aaa.mjs [label=after] [out=/workspace/magic-aaa]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const label = process.argv[2] || 'after'; const OUT = process.argv[3] || '/workspace/magic-rows'; const port = +(process.argv[4] || 8181); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'; let bad = 0; const geo = {};
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
for (const [w, h] of [[360, 740], [390, 844], [412, 915]]) { // 27 Oct (Dave): the tabs layout on every screen height, never the triangle
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 }); await p.emulateMedia({ reducedMotion: 'reduce' });
  const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate(async (n) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'ranger', seed: 5 }); hh.dice = null; hh.level = 9; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblin'], kind: 'boss' }); }, `Aaa${w}${h}`);
  for (let i = 0; i < 120; i++) { await pump(0.5); if (await p.evaluate(() => window.QD.B3?.battleState?.bw && !window.QD.B3.battleState.busy)) break; }
  await p.evaluate(() => { const { B3, E, S } = window.QD; const B = B3.battleState; B.b.board = E.rollBoard(S.hero, E.makeRng(5)); B.b.phase = 'shape'; B.b.magic = 6; B.b.hp = B.b.maxHp; B.busy = false; B3.renderShape(); });
  await p.locator('.b3-powers').first().click(); await pump(0.4);
  const clear = () => p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17, .pw-pop').forEach((t) => t.remove()));
  const ids = await p.evaluate(() => [...document.querySelectorAll('.b3-sheet.open [data-power]')].map((e) => e.dataset.power));
  check(`${w}x${h}: six tabs`, ids.length === 6, ids.join());
  for (const [i, id] of ids.entries()) {
    await p.locator(`.b3-sheet.open [data-power="${id}"]`).click(); await pump(0.3); await clear();
    const f = `${OUT}/${label}-${i + 1}-${id.replace(':', '-')}_${w}x${h}.png`; await p.screenshot({ path: f }); console.log('shot', f);
    const m = await p.evaluate(() => { const sh = document.querySelector('.b3-sheet.open'); const bad = [];
      for (const e of sh.querySelectorAll('b, small, em, span, p, button, h2, h3')) { if (!e.getClientRects().length || !e.textContent.trim()) continue; const cs = getComputedStyle(e); const q = e.getBoundingClientRect();
        if (q.right > innerWidth + 1 || q.left < -1) bad.push('off:' + e.className + ':' + e.textContent.trim().slice(0, 20));
        if (e.scrollWidth > e.clientWidth + 1 && cs.overflow !== 'visible' && e.clientWidth > 0) bad.push('clip:' + e.className + ':' + e.textContent.trim().slice(0, 20)); }
      for (const e of sh.querySelectorAll('.pw-name, .pw-btn, .hc-word')) { const cs = getComputedStyle(e); const m = document.createElement('span'); m.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing};text-transform:${cs.textTransform}`; document.body.append(m);
        for (const wd of (e.firstChild?.nodeType === 3 ? e.firstChild.textContent : e.textContent).split(/\s+/).filter(Boolean)) { m.textContent = wd; if (m.getBoundingClientRect().width > e.clientWidth + 0.5 && e.clientWidth) bad.push('word:' + wd); } m.remove(); }
      { const a = sh.querySelector('.hc-cost'), z = sh.querySelector('.hc-close'), t = sh.querySelector('.hc-top > b'); const ov = (x, y) => { if (!x || !y) return false; const p = x.getBoundingClientRect(), q = y.getBoundingClientRect(); return p.left < q.right - 1 && p.right > q.left + 1 && p.top < q.bottom - 1 && p.bottom > q.top + 1; }; if (ov(a, z) || ov(t, z) || ov(a, t)) bad.push('overlap:heart-top'); }
      const f = (s) => { const e = sh.querySelector(s); return e ? getComputedStyle(e).fontFamily.split(',')[0] + ' ' + getComputedStyle(e).fontWeight : null; };
      return { bad: [...new Set(bad)].slice(0, 6), fonts: { head: f('.sh-head > b'), name: f('.pw-name'), title: f('.pw-detail .pd-id b'), kicker: f('.pw-detail .pd-id small'), line: f('.pw-detail .pd-line'), btn: f('.pw-detail .pw-btn'), lock: (() => { const e = document.querySelector('.b3-powers, .b3-lock'); return e ? getComputedStyle(e).fontFamily.split(',')[0] + ' ' + getComputedStyle(e).fontWeight : null; })(), thin: [...sh.querySelectorAll('b, small, em, span, p, button')].filter((e) => e.childNodes[0]?.nodeType === 3 && e.textContent.trim() && e.getClientRects().length && +getComputedStyle(e).fontWeight < 700).map((e) => e.className + ':' + e.textContent.trim().slice(0, 16)).slice(0, 6), cinzel: document.fonts.check('900 20px Cinzel'), grad: [...sh.querySelectorAll('*')].filter((e) => e.textContent.trim() && /text/.test(getComputedStyle(e).webkitBackgroundClip || getComputedStyle(e).backgroundClip)).map((e) => e.className).slice(0, 4) } }; });
    check(`${w}x${h} ${id}: no text overflow or clipping`, !m.bad.length, JSON.stringify(m));
    if (process.env.MP4) check(`${w}x${h} ${id}: nothing thin (all text >= 700), Cinzel loaded`, !m.fonts.thin.length && m.fonts.cinzel && !m.fonts.grad.length, JSON.stringify(m.fonts));
  }
  await p.locator('.b3-sheet.open [data-power="aimed"]').click(); await pump(0.3);
  const r0 = await p.evaluate(() => { const rows = [...document.querySelectorAll('.b3-sheet.open .pw-rows .pr-row')]; const vb = innerHeight;
    return { n: rows.length, ids: rows.map((r) => r.dataset.row), btns: rows.map((r) => { const g = r.querySelector('.pr-go'); const q = g.getBoundingClientRect(); return { t: g.textContent, dis: g.disabled, vis: q.bottom <= vb && q.right <= innerWidth }; }), arrows: rows[0]?.querySelectorAll('.pr-get .ic').length, overlap: rows.flatMap((r) => { const kids = [r.querySelector('.pr-name'), r.querySelector('.pr-tag'), r.querySelector('.pr-pay'), r.querySelector('.pr-get'), r.querySelector('.pr-acts')].filter(Boolean); const o = []; for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) { const a = kids[i].getBoundingClientRect(), z = kids[j].getBoundingClientRect(); if (a.left < z.right - 1 && a.right > z.left + 1 && a.top < z.bottom - 1 && a.bottom > z.top + 1) o.push(r.dataset.row + ':' + kids[i].className + '/' + kids[j].className); } const rb = r.getBoundingClientRect(); for (const k of r.querySelectorAll('*')) { const q = k.getBoundingClientRect(); if (q.width && (q.right > rb.right + 1 || q.left < rb.left - 1)) o.push(r.dataset.row + ':out:' + k.className); } return o; }), old: !!document.querySelector('.b3-sheet.open .pw-detail .pd-buy, .b3-sheet.open .pw-step') }; });
  await p.locator('.b3-sheet.open .pr-row[data-row="aimed"] .pr-step').last().click(); await pump(0.3);
  const r1 = await p.evaluate(() => { const r = document.querySelector('.b3-sheet.open .pr-row[data-row="aimed"]'); const kids = [...r.children]; const ov = kids.some((a, i) => kids.slice(i + 1).some((z) => { const p = a.getBoundingClientRect(), q = z.getBoundingClientRect(); return p.left < q.right - 1 && p.right > q.left + 1 && p.top < q.bottom - 1 && p.bottom > q.top + 1; })); return { ov, cost: r.querySelector('.pr-cost').textContent, arrows: r.querySelectorAll('.pr-get .ic').length, btn: r.querySelector('.pr-go').textContent }; });
  await p.screenshot({ path: `${OUT}/${label}-rows-aimed-plus_${w}x${h}.png` });
  check(`${w}x${h}: three rows A/B/C at once, each with its own enabled, on-screen Cast button; no old select-then-cast detail`, r0.n === 3 && r0.btns.every((x) => !x.dis && x.vis) && !r0.old && !r0.overlap.length, JSON.stringify(r0));
  check(`${w}x${h}: Aimed Shot + updates live (2 -> 3 magic, 2 -> 3 arrows, Cast · 3)`, r0.arrows === 2 && !r1.ov && r1.cost === '3' && r1.arrows === 3 && r1.btn === 'Cast · 3', JSON.stringify(r1));
  const m0 = await p.evaluate(() => window.QD.B3.battleState.b.magic);
  await p.locator('.b3-sheet.open .pr-row[data-row="quickdraw"] .pr-go').click(); await pump(0.6);
  const m1 = await p.evaluate(() => ({ magic: window.QD.B3.battleState.b.magic, used: !!window.QD.B3.battleState.b.usedRound?.quickdraw || !!document.querySelector('.dr-inline, .pd-result') || document.querySelector('.pr-row[data-row="quickdraw"] .pr-go')?.disabled }));
  check(`${w}x${h}: Quick Draw's own Cast button casts it (magic ${m0} -> less, power marked used)`, m1.magic < m0 && m1.used, JSON.stringify({ m0, m1 }));
  check(`${w}x${h}: no page errors`, !errs.length, errs.join(' | ')); await p.close();
}
console.log(bad ? `${bad} FAILED` : 'all passed'); await b.close(); server.kill(); process.exit(bad ? 1 : 0);
