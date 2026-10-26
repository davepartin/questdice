// Magic panel (Crockpot / Grok Bot, 26 Oct 2026; Dave approved): folder-tab selection joined to the detail panel, a divider between the A/B/C
// powers and the helpers, cost badges off the icons. Screens at Dave's Safari viewport (390x664, the one-row layout) and 390x844 (the triangle),
// with toasts cleared: nothing selected, A, C, and a helper. Writes geometry JSON for the pixel check (dev/magicpanel-pixels.py).
//   CHROME=... node dev/magicpanel.mjs [label=after] [out=/workspace/magic-panel-live] [port=8172]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const label = process.argv[2] || 'after'; const OUT = process.argv[3] || '/workspace/magic-panel-live'; const port = +(process.argv[4] || 8172); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'; let bad = 0; const geo = {};
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
for (const [w, h] of [[390, 664], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 }); await p.emulateMedia({ reducedMotion: 'reduce' });
  const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate(async (n) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'wizard', seed: 5 }); hh.dice = null; hh.level = 9; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblin'], kind: 'boss' }); }, `Magic${w}${h}`);
  for (let i = 0; i < 120; i++) { await pump(0.5); if (await p.evaluate(() => window.QD.B3?.battleState?.bw && !window.QD.B3.battleState.busy)) break; }
  await p.evaluate(() => { const { B3, E, S } = window.QD; const B = B3.battleState; B.b.board = E.rollBoard(S.hero, E.makeRng(5)); B.b.phase = 'shape'; B.b.magic = 6; B.b.hp = B.b.maxHp; B.busy = false; B3.renderShape(); });
  await p.locator('.b3-powers').first().click(); await pump(0.4);
  const clear = () => p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17, .pw-pop').forEach((t) => t.remove()));
  const measure = (id) => p.evaluate((id) => { const r = (e) => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; };
    const tiles = [...document.querySelectorAll('.b3-sheet.open [data-power]')]; const det = document.querySelector('.b3-sheet.open .pw-detail'); const on = id ? document.querySelector(`.b3-sheet.open [data-power="${id}"]`) : null;
    const over = tiles.map((t) => { const c = t.querySelector('.pw-cost'); const i = t.querySelector('.pw-core'); if (!c || !i) return 0; const a = r(c), z = r(i); return Math.max(0, Math.min(a.r, z.r) - Math.max(a.l, z.l)) * Math.max(0, Math.min(a.b, z.b) - Math.max(a.t, z.t)); });
    const helper0 = document.querySelector('.b3-sheet.open .pw-helpers .pw-medal'); const cs = tiles[2] ? r(tiles[2]) : null; const hs = helper0 ? r(helper0) : null;
    return { row: getComputedStyle(document.querySelector('.b3-sheet.open .pw-sigil')).display === 'grid', on: on ? r(on) : null, det: det ? r(det) : null, overlap: Math.round(Math.max(...over)), gap: cs && hs ? Math.round(hs.l - cs.r) : 0,
      divider: helper0 ? getComputedStyle(helper0, '::before').content !== 'none' : false, onBg: on ? getComputedStyle(on).backgroundColor : '', detBorder: det ? getComputedStyle(det).borderTopColor : '', onBorder: on ? getComputedStyle(on).borderLeftColor : '' }; }, id);
  for (const [name, id] of [['none', null], ['A-arcbolt', 'arcbolt'], ['C-coil', 'coil'], ['helper-heal', 'u:heal']]) {
    if (id) { await p.locator(`.b3-sheet.open [data-power="${id}"]`).click(); await pump(0.3); }
    await clear(); const f = `${OUT}/${label}-${name}_${w}x${h}.png`; await p.screenshot({ path: f }); const m = await measure(id); geo[f] = m;
    check(`${w}x${h} ${name}: cost badges clear of every icon`, m.overlap === 0, `overlap ${m.overlap}px²`);
    if (name === 'none') check(`${w}x${h}: a clear gap or divider between A/B/C and the helpers`, m.row ? m.gap >= 12 && m.divider : true, `gap ${m.gap}px`);
    if (id && m.row) check(`${w}x${h} ${name}: the selected tab reaches into the panel (no gap) and shares its highlight`, m.on.b >= m.det.t + 0.5 && m.onBorder === m.detBorder, JSON.stringify(m));
  }
  // mp2: Cast/Use results play inside the selected tab's panel, no second window (inline=/workspace/magic-inline-live)
  const IN = process.env.INLINE_OUT || '/workspace/magic-inline-live'; fs.mkdirSync(IN, { recursive: true });
  const fresh = () => p.evaluate(() => { const { B3 } = window.QD; const B = B3.battleState; B.b.magic = 9; B.b.hp = B.b.maxHp - 12; B.b.potions = 2; B.pwSel = null; B.pwNote = null; B.busy = false; B3.renderShape(); });
  for (const [name, id, btn] of [['arcbolt', 'arcbolt', '.pw-detail .pw-btn.go'], ['magicmissile', 'bolt', '.pw-detail .pw-btn.go'], ['potion', 'u:bigheal', '.pw-detail .pw-btn.go']]) {
    await fresh(); await pump(0.2);
    if (name === 'arcbolt') { await clear(); await p.screenshot({ path: `${IN}/0-panel-before_${w}x${h}.png` }); }
    await p.locator(`.b3-sheet.open [data-power="${id}"]`).click(); await pump(0.3);
    await p.locator(`.b3-sheet.open ${btn}`).first().click(); await pump(0.3);
    if (id.startsWith('u:')) { await p.waitForSelector('.b3-sheet.open .pw-detail .pd-result', { timeout: 5000 }).catch(() => {}); }
    else await p.waitForSelector('.b3-sheet.open .pw-detail .dr-inline.done', { timeout: 8000 }).catch(() => {});
    await pump(0.3); await clear();
    const st = await p.evaluate(() => ({ layer: !!document.querySelector('.dr-layer'), inPanel: !!document.querySelector('.b3-sheet.open .pw-detail .dr-inline, .b3-sheet.open .pw-detail .pd-result'),
      ok: document.querySelector('.pw-detail .dr-ok')?.textContent || '', note: document.querySelector('.pw-detail .pd-result')?.textContent || '',
      fits: (() => { const d = document.querySelector('.b3-sheet.open .pw-detail'); if (!d) return false; const q = d.getBoundingClientRect(); return q.bottom <= innerHeight + 1 || d.closest('.b3-sheet').scrollHeight > 0; })() }));
    const f = `${IN}/${name === 'arcbolt' ? 1 : name === 'magicmissile' ? 2 : 3}-${name}-inline_${w}x${h}.png`;
    await p.evaluate(() => document.querySelector('.b3-sheet.open .pw-detail')?.scrollIntoView({ block: 'nearest' })); await p.screenshot({ path: f });
    check(`${w}x${h} ${name}: result inside the selected tab, no second window`, !st.layer && st.inPanel, JSON.stringify(st));
    if (!id.startsWith('u:')) {
      check(`${w}x${h} ${name}: confirm button reads as before`, /to my roll/i.test(st.ok), st.ok);
      if (await p.locator('.b3-sheet.open .pw-detail .dr-ok').count()) await p.locator('.b3-sheet.open .pw-detail .dr-ok').click(); await pump(0.6); await p.waitForTimeout(400); await pump(0.3);
      const back = await p.evaluate(() => ({ card: !!document.querySelector('.dr-inline'), pick: !!document.querySelector('.b3-sheet.open .pw-pick'), busy: window.QD.B3.battleState.busy }));
      check(`${w}x${h} ${name}: confirm returns to the normal panel`, !back.card && back.pick && !back.busy, JSON.stringify(back));
    }
  }
  check(`${w}x${h}: no page errors`, !errs.length, errs.join(' | ')); await p.close();
}
fs.writeFileSync(`${OUT}/${label}-geometry.json`, JSON.stringify(geo, null, 1));
console.log(bad ? `${bad} FAILED` : 'all passed'); await b.close(); server.kill(); process.exit(bad ? 1 : 0);
