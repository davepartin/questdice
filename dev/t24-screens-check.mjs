// T24 screens check (Crockpot / Grok Bot, 2 Nov 2026): Monster Special label, round-start plan board, after-round lines,
// with ?t24demo placeholders in Claude's contract shape, at 390x664 and 375x548; and that nothing shows with Specials off.
//   node dev/t24-screens-check.mjs [out=/workspace/t24-screens] [port=8198]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/t24-screens'; const port = +(process.argv[3] || 8198); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const FOES = ['goblin', 'wolf', 'goblin'];
async function battle(vw, vh, demo) {
  const p = await br.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low${demo ? '&t24demo' : ''}`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate(async ([n, foes]) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'knight', seed: 5 }); hh.dice = null; hh.level = 9; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: foes, kind: 'boss' }); }, ['T24Knight', FOES]);
  for (let i = 0; i < 180; i++) { await pump(0.5); if (await p.evaluate(() => { const B = window.QD.B3?.battleState; return B?.bw && B.hud?.place && !B.starting && !B.busy; })) break; }
  await p.evaluate(() => { const B = window.QD.B3.battleState; for (const e of B.b.enemies) B.bw?.flat?.paintFoe?.(e); window.QD.B3.renderShape?.(); }); await pump(0.6);
  return { p, errs, pump };
}
const clear = (p) => p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17, .pw-pop').forEach((t) => t.remove()));
const noScroll = (p) => p.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight);
for (const [vw, vh] of [[390, 664], [375, 548]]) {
  const tag = `${vw}x${vh}`; const { p, errs, pump } = await battle(vw, vh, true);
  // 1. labels
  const lab = await p.evaluate(() => [...document.querySelectorAll('.fb-slot.foe .sp-label')].map((l) => { const r = l.getBoundingClientRect(); const card = l.closest('.fb-card').getBoundingClientRect();
    return { id: l.dataset.special, top: l.querySelector('.sp-top b')?.textContent, bot: l.querySelector('.sp-bot span')?.textContent, n: l.querySelector('.sp-n')?.textContent, met: l.classList.contains('met'), broken: !!l.querySelector('.sp-broken'), strike: getComputedStyle(l.querySelector('.sp-bot span')).textDecorationLine, inCard: r.left >= card.left - 1 && r.right <= card.right + 1, clipped: [...l.querySelectorAll('.sp-top, .sp-bot')].some((x) => x.scrollWidth > x.clientWidth + 1), onScreen: r.bottom <= innerHeight && r.top >= 0 }; }));
  check(`${tag}: a two-line label under every monster`, lab.length === 3 && lab.every((l) => l.top && l.bot && l.inCard && l.onScreen && !l.clipped), JSON.stringify(lab));
  check(`${tag}: progress number (e.g. 14/20) on goals in progress`, lab.some((l) => /^14\/20$/.test(l.n) && !l.met), JSON.stringify(lab.map((l) => l.n)));
  check(`${tag}: met goal shows Broken and the "or else" struck through`, lab.some((l) => l.met && l.broken && /line-through/.test(l.strike)));
  check(`${tag}: battle screen does not scroll`, await noScroll(p));
  await clear(p); await p.screenshot({ path: `${OUT}/label_${tag}.png` });
  const foe = await p.locator('.fb-slot.foe').first().boundingBox(); await p.screenshot({ path: `${OUT}/label_${tag}_closeup.png`, clip: { x: Math.max(0, foe.x - 8), y: Math.max(0, foe.y - 8), width: Math.min(vw - Math.max(0, foe.x - 8), 3 * foe.width + 40), height: foe.height + 16 } });
  // 2. plan board (the module's planFor reads E.specialPlan when live, placeholders under ?t24demo)
  await p.evaluate(async () => { const SP = await import('./js/g3/specials.js'); const B = window.QD.B3.battleState; SP.setBattle(B.b);
    const D = await import('./js/data.js'); const imgOf = (uid) => { const e = B.b.enemies.find((x) => x.uid === uid); return D.MONSTERS[e?.id]?.img || ''; };
    window.__fought = false; const el = SP.planFor(B.b, { imgOf, onFight: () => { window.__fought = true; } }); B.root.append(el); });
  await pump(0.3);
  const plan = await p.evaluate(() => { const el = document.querySelector('.sp-plan'); const r = el.getBoundingClientRect(); return { rows: el.querySelectorAll('.sp-row').length, ribbon: el.querySelectorAll('.sp-ribbon').length, plain: el.querySelector('.sp-plain')?.textContent || '', fight: el.querySelectorAll('.sp-fight').length, fits: r.top >= 0 && r.bottom <= innerHeight && el.scrollHeight <= el.clientHeight + 1, goal: el.querySelector('.sp-row-goal')?.textContent }; });
  check(`${tag}: plan board, ≤3 Special rows, New Special ribbon, plain monsters under No Special, one Fight`, plan.rows >= 1 && plan.rows <= 3 && plan.ribbon >= 1 && /No Special/.test(plan.plain) && plan.fight === 1 && /· or /.test(plan.goal), JSON.stringify(plan));
  check(`${tag}: plan board fits without scrolling`, plan.fits && await noScroll(p), JSON.stringify(plan));
  await clear(p); await p.screenshot({ path: `${OUT}/plan_${tag}.png` });
  await p.locator('.sp-fight').click(); check(`${tag}: Fight closes the plan board`, await p.evaluate(() => window.__fought && !document.querySelector('.sp-plan')));
  // 3. after-round lines inside the real round card (rows in b.report.specials shape)
  await p.evaluate(async () => { const RC = await import('./js/g3/roundcard.js'); const SP = await import('./js/g3/specials.js'); const B = window.QD.B3.battleState;
    const rep = { round: 1, acts: [], strikes: [], hits: [], fighters: [], T: { atk: 0, block: 0, pierce: 0, heal: 0, gold: 0 }, absorbed: 0, hpBefore: 66, hpAfter: 66, specials: SP.demoReport(B.b.enemies) };
    let el; try { el = RC.roundCard(rep, B.b, { onClose: () => el.remove() }); } catch (e) { window.__rcErr = String(e); return; } el.classList.add('t24-check'); B.root.append(el); });
  await pump(1.5); await p.waitForTimeout(800);
  const out = await p.evaluate(() => { if (window.__rcErr) return { err: window.__rcErr }; const rows = [...document.querySelectorAll('.rc.t24-check .sp-out-row')]; return { first: rows[0]?.className, chips: rows.map((r) => r.querySelector('.sp-chip').textContent).join(''), text: rows.map((r) => r.textContent) }; });
  check(`${tag}: after-round card has one line per monster with ✓/✗, misses first`, !out.err && out.chips.length === 3 && out.chips.indexOf('✓') > out.chips.lastIndexOf('✗'), JSON.stringify(out));
  check(`${tag}: no scroll with the round card up`, await noScroll(p));
  await clear(p); await p.screenshot({ path: `${OUT}/after_${tag}.png` });
  check(`${tag}: no page errors (demo)`, !errs.length, JSON.stringify(errs)); await p.close();
  // off: the live default shows nothing new
  const off = await battle(vw, vh, false);
  const offv = await off.p.evaluate(async () => { const SP = await import('./js/g3/specials.js'); const B = window.QD.B3.battleState; return { labels: document.querySelectorAll('.sp-label').length, plan: SP.planFor(B.b), report: SP.reportOf({}, B.b).length }; });
  check(`${tag}: Specials off: no label, no plan board, no outcome rows`, offv.labels === 0 && offv.plan === null && offv.report === 0, JSON.stringify(offv));
  check(`${tag}: no page errors (off)`, !off.errs.length, JSON.stringify(off.errs)); await off.p.close();
}
await br.close(); server.kill(); console.log(bad ? `${bad} FAILED` : 'ALL PASS'); process.exit(bad ? 1 : 0);
