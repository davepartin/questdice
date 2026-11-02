// Monster mini card picker check (Crockpot / Grok Bot, 2 Nov 2026): real game, ?minicarddemo and ?minicards, two phone sizes.
//   node dev/minicard-check.mjs   -> shots in /workspace/minicards-live/
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.env.OUT || '/workspace/minicards-live'; const port = 8197; fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const FIGHTS = { two: ['goblin', 'skeleton'], three: ['goblin', 'wolf', 'cultist'] };
const errs = []; let bad = 0;
for (const flag of ['minicarddemo', 'minicards']) for (const [vw, vh] of [[390, 664], [375, 548]]) for (const [tag, foes] of Object.entries(FIGHTS)) {
  const p = await br.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, hasTouch: true }); p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low&${flag}`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate(async ([n, foes]) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'knight', seed: 5 }); hh.dice = null; hh.level = 9; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: foes, kind: 'boss' }); }, ['McKnight', foes]);
  let up = false; for (let i = 0; i < 240 && !up; i++) { await pump(0.5); up = await p.evaluate(() => !!document.querySelector('.mnc-veil')); }
  await pump(2); await p.waitForTimeout(600);
  const clear = () => p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17, .pw-pop').forEach((t) => t.remove()));
  const shot = async (s) => { await clear(); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${flag}_${tag}_${s}_${vw}x${vh}.png` }); };
  if (!up) { console.log('NO PICKER', flag, tag, vw); bad++; await shot('0-missing'); await p.close(); continue; }
  const fit = await p.evaluate(() => { const r = document.querySelector('.mnc-stack').getBoundingClientRect(); const b = document.querySelector('.mnc-pick').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && b.bottom <= innerHeight; });
  await shot('1-first-on-top');
  const lastUid = await p.evaluate(() => { const c = [...document.querySelectorAll('.mnc-card')].pop(); c.click(); return c.dataset.uid; }); await p.waitForTimeout(350); await shot('2-tapped-other');
  await p.evaluate(() => document.querySelector('.mnc-pick').click()); await pump(1); await shot('3-confirmed');
  const res = await p.evaluate((uid) => ({ gone: !document.querySelector('.mnc-veil'), plan: !!document.querySelector('.sp-plan'), ring: document.querySelector(`.fb-slot.foe[data-uid="${uid}"] .targeted, .fb-slot.foe[data-uid="${uid}"].targeted`) != null, b: window.QD.B3?.battleState?.b?.enemies.findIndex((e) => e.uid === uid) === window.QD.B3?.battleState?.target }), lastUid);
  const ok = fit && res.gone && res.b; if (!ok) bad++;
  console.log(ok ? 'ok' : 'FAIL', flag, tag, vw, vh, JSON.stringify({ fit, ...res }));
  await p.close();
}
console.log('errors', JSON.stringify(errs)); await br.close(); server.kill(); process.exit(bad || errs.length ? 1 : 0);
