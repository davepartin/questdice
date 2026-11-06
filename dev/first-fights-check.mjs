// The first two battles in the real game (Dave, 6 Nov 2026: practice fights): start Act I step 1 and 2 as a new Knight and read what the monsters are.
//   node dev/first-fights-check.mjs      (headless Chromium, not Safari)
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process';
const port = 8276; const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; const errs = [];
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r)); process.on('exit', () => server.kill());
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
for (const step of [1, 2]) {
  await p.evaluate(async (step) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: 'First' + step, cls: 'knight', seed: 3 }); hh.dice = null; hh.campaign.step = step; hh.campaign.act = 1; if (step > 1) hh.campaign.wins = 1;
    S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(hh.name)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], kind: 'boss' }); /* (a boss, only to skip the objective offer; the monsters are the road's) */ }, step);
  let up = false; for (let i = 0; i < 80 && !up; i++) { await pump(0.5); await p.waitForTimeout(150); up = await p.evaluate(() => !!document.querySelector('.mnc-veil')); }
  for (let i = 0; i < 20; i++) { await pump(0.3); await p.waitForTimeout(100); const pick = await p.$('.mnc-pick'); if (pick) { await p.waitForTimeout(2500); await pick.click(); break; } }
  for (let i = 0; i < 40; i++) { await pump(0.3); await p.waitForTimeout(100); if (await p.evaluate(() => { const B = window.QD.B3?.battleState; return !!B?.b && !B.busy && B.b.phase === 'shape' && !!B.b.board; })) break; }
  const info = await p.evaluate(() => (window.QD.B3?.battleState?.b?.enemies || []).map((e) => `${e.name} ${e.hp}hp d${e.powerDie} flat ${e.flat}`));
  console.log(`battle ${step}:`, info.join(' | '));
  await p.screenshot({ path: `shots/first-fights-${step}.png` });
}
console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors'); await br.close(); process.exit(errs.length ? 1 : 0);
