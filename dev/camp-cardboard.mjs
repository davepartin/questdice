// Camp dice grid -> cardboard cards, live (Crockpot / Grok Bot, 25 Oct 2026). Opens every camp die at 375x548 and 390x844, checks the card fits,
// buys Head, Right Hand and Talent One through the card covers (HE.upgradeDie underneath) and checks gold, size and the saved hero after a reload.
//   node dev/camp-cardboard.mjs [out] [port]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/camp-cards-live'; const port = +(process.argv[3] || 8151); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
for (const [w, h] of [[390, 844], [375, 548]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); p.setDefaultTimeout(240000); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort()); await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
  await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
  const tag = `${w}x${h}`; const name = `Board${w}`;
  await p.evaluate(async (name) => { const { S, E, showCamp } = window.QD; const hh = E.newHero({ name, cls: 'knight', seed: 5 }); hh.gold = 400; hh.campaign.act = 1; hh.campaign.step = 3;
    S.hero = hh; S.company = { members: [hh] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice'; const SV = await import('./js/save.js'); if (!SV.heroExists(hh.name)) await SV.createSave(hh, 'testpass'); showCamp(); }, name);
  await pump(2);
  const open = async (slot) => { await p.locator(`.cw-cell.s-${slot}`).click(); await pump(1.5); await p.waitForTimeout(800);
    await p.evaluate(() => { const i = document.querySelector('#camp-inspector'); const c = i?.querySelector('.cb-card, .qc-gear') || i; const side = i?.closest('.sx-side'); if (c && side) side.scrollTop += c.getBoundingClientRect().top - 60; }); await pump(0.5); await p.waitForTimeout(400); };
  const shot = async (n) => { const f = `${OUT}/camp-${n}_${tag}.png`; const c = p.locator('#camp-inspector .cb-card, #camp-inspector .qc-gear').first(); await p.screenshot({ path: f }); return f; };
  for (const [slot, n, want] of [['NW', 'weapon', 'qc-gear'], ['N', 'strength', 'STRENGTH'], ['SW', 'talents', 'TALENT'], ['C', 'heart', 'HEART']]) {
    await open(slot); await shot(n);
    const st = await p.evaluate(() => { const i = document.querySelector('#camp-inspector'); const c = i?.querySelector('.cb-card'); const r = c?.getBoundingClientRect();
      const tiny = c ? [...c.querySelectorAll('*')].filter((e) => e.childNodes[0]?.nodeType === 3 && e.textContent.trim() && e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 10.9).map((e) => e.textContent.trim()).slice(0, 5) : [];
      return { cb: c?.getAttribute('aria-label') || '', gear: !!i?.querySelector('.qc-gear, .ww, .sh-weapon, .gc-face'), x0: r ? Math.round(r.left) : 0, x1: r ? Math.round(r.right) : 0, vw: innerWidth, tiny }; });
    const ok = want === 'qc-gear' ? !st.cb : (st.cb.toUpperCase().includes(want) && st.x0 >= 0 && st.x1 <= st.vw && !st.tiny.length);
    check(`${tag} ${n}: opens the right card, fits, text >= 11 px`, ok, JSON.stringify(st));
  }
  for (const [slot, n] of [['W', 'lefthand'], ['E', 'righthand'], ['S', 'feet'], ['SE', 'talent-two']]) { await open(slot); await shot(n); }
  const buy = async (slot, sel, read, label) => { await open(slot); const a = await p.evaluate(read); await p.locator(sel).first().click(); await pump(1.5); await p.waitForTimeout(500); const z = await p.evaluate(read);
    check(`${tag}: ${label}`, z.size > a.size && z.gold < a.gold, JSON.stringify({ a, z })); return z; };
  await buy('N', '#camp-inspector .cb-cov.ready[data-slot="N"]', () => ({ size: window.QD.E.mindSize(window.QD.S.hero), gold: window.QD.S.hero.gold }), 'Head cover buys through the game (gold down, die up)');
  await shot('strength-bought');
  await buy('E', '#camp-inspector .cb-cov.ready[data-slot="E"]', () => ({ size: window.QD.S.hero.strength.E, w: window.QD.S.hero.strength.W, gold: window.QD.S.hero.gold }), 'Right Hand cover grows E only');
  const sym0 = await p.evaluate(() => JSON.stringify(window.QD.S.hero.talent.SW));
  await buy('SW', '#camp-inspector .cb-cov.ready[data-slot="SW"]', () => ({ size: window.QD.S.hero.special.SW, gold: window.QD.S.hero.gold }), 'Talent One cover grows the talent die');
  check(`${tag}: Talent One keeps its symbols`, sym0 === await p.evaluate(() => JSON.stringify(window.QD.S.hero.talent.SW)));
  await shot('talents-grown');
  const now = await p.evaluate(() => ({ gold: window.QD.S.hero.gold, mind: window.QD.E.mindSize(window.QD.S.hero) }));
  await p.reload(); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const saved = await p.evaluate(async (name) => { const SV = await import('./js/save.js'); const hh = await SV.openHero(name, 'testpass'); return hh ? { gold: hh.gold, mind: hh.mind?.N } : null; }, name);
  check(`${tag}: the save has the new gold and Head size`, saved && saved.gold === now.gold && saved.mind === now.mind, JSON.stringify({ now, saved }));
  check(`${tag}: no page errors`, errs.length === 0, errs.join(' | ')); await ctx.close();
}
console.log(bad ? `${bad} FAILED` : 'all passed'); await b.close(); server.kill(); process.exit(bad ? 1 : 0);
