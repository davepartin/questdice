// T24 Monster Specials smoke test in the real battle screen (?lab turns the Specials on): an Act I boss (Regrow + a Spawn minion) and a sleeping
// monster play two rounds with no page errors; the engine's label, plan board and report data are read from the page. Headless Chromium, not Safari.
//   node dev/t24-smoke.mjs [out=docs/team/tasks/T24] [port=8192]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'docs/team/tasks/T24'; const port = +(process.argv[3] || 8192); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low&nominicards${process.env.LAB ? '&lab' : ''}`); // the live root has the Specials on (Dave, 2 Nov); LAB=1 for the lab await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
const ready = async () => { for (let i = 0; i < 160; i++) { await pump(0.3); await p.waitForTimeout(200); if (await p.evaluate(() => { const B = window.QD.B3?.battleState; const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) ok.click(); return B?.bw && !B.busy && B.b?.phase === 'reset'; })) return true; } return false; };
await p.evaluate(async (n) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'knight', seed: 5 }); hh.dice = null; hh.level = 6; hh.campaign.act = 1; hh.campaign.step = 10; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblinking'], kind: 'boss', step: 10 }); }, 'SpecialsSmoke');
check('the boss battle opens', await ready());
const data = () => p.evaluate(async () => { const E = await import('./js/engine.js'); const B = window.QD.B3.battleState; return { on: (await import('./js/data.js')).SPECIALS.on, foes: B.b.enemies.map((e) => ({ name: e.name, hp: e.hp, special: e.special?.id || null, view: E.specialView(B.b, e) })), plan: E.specialPlan(B.b), last: B.b.report?.specials || null, round: B.b.round }; });
let d = await data(); console.log(JSON.stringify(d));
check('Specials are on', d.on === true);
check('the Act I boss carries Regrow', d.foes[0]?.special === 'regrow', JSON.stringify(d.foes.map((f) => f.special)));
check('the plan board has a line for each Special', d.plan.length >= 1 && d.plan.every((r) => r.line && r.top && r.bottom), JSON.stringify(d.plan));
await p.screenshot({ path: `${OUT}/smoke-boss-round1_390x844.png` });
for (let round = 0; round < 2; round++) {
  await p.evaluate(() => { const B = window.QD.B3.battleState; if (B.picked === false) [...B.fb.foes.values()][0]?.el.click(); });
  await p.evaluate(() => document.querySelector('#b3-roll')?.click()); for (let i = 0; i < 40; i++) { await pump(0.3); await p.waitForTimeout(200); if (await p.evaluate(() => !window.QD.B3.battleState.busy)) break; }
  console.log('before lock', JSON.stringify(await p.evaluate(() => { const B = window.QD.B3.battleState; return { phase: B.b.phase, busy: B.busy, picked: B.picked, target: B.target, lock: !!document.querySelector('#b3-lock'), lockDisabled: document.querySelector('#b3-lock')?.disabled }; })));
  await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await ready();
  console.log('after round', JSON.stringify(await p.evaluate(() => { const r = window.QD.B3.battleState.b.report; return { round: window.QD.B3.battleState.b.round, dealt: r?.dealt, target: r?.targetUid, atk: r?.T?.atk, guarded: r?.guarded, early: r?.early, heroDown: r?.heroDown }; })));
}
d = await data(); console.log(JSON.stringify(d));
check('two rounds played and the round report carries a line per Special', d.round >= 3 && Array.isArray(d.last) && d.last.length >= 1 && d.last.every((r) => typeof r.ok === 'boolean' && r.line), JSON.stringify(d.last));
await p.screenshot({ path: `${OUT}/smoke-boss-round3_390x844.png` });
// a sleeping monster in the real screen: its move shows as Asleep, and nothing breaks
await p.evaluate(() => { const B = window.QD.B3.battleState; const e = B.b.enemies.find((x) => x.hp > 0 && x.special?.id !== 'regrow') || B.b.enemies[0]; e.special = { id: 'sleeping' }; e.intent = { n: 'Asleep', v: 'sleep', f: 0, m: 0 }; window.QD.B3.refreshPlates?.(); });
await pump(0.5); await p.screenshot({ path: `${OUT}/smoke-sleeping_390x844.png` });
check('no page errors', errs.length === 0, errs.join(' | '));
await br.close(); server.kill(); process.exit(bad ? 1 : 0);
