import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process';
const OUT = process.argv[2]; const port = +(process.argv[3] || 8214); const errs = [];
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
for (const [tag, foes, vw, vh] of [['two', ['wraith', 'skeleton'], 390, 664], ['four', ['goblin', 'skeleton', 'ogre', 'cultist'], 375, 548]]) {
  const p = await br.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  console.log(tag, 'goto'); await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate(async ([n, foes]) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'wizard', seed: 5 }); hh.dice = null; hh.level = 9; hh.campaign.step = 6; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: foes, kind: 'boss', step: 6 }); }, ['Rv' + tag + Date.now() % 1000, foes]);
  let up = false; for (let i = 0; i < 120 && !up; i++) { await pump(0.25); up = await p.evaluate(() => !!document.querySelector('.mnc-veil')); }
  console.log(tag, 'veil up', up); const t0 = Date.now(); await p.waitForTimeout(700);
  const mid = await p.evaluate(() => ({ revealing: !!document.querySelector('.mnc-revealing'), btn: document.querySelector('.mnc-pick')?.disabled }));
  await p.screenshot({ path: `${OUT}/${tag}-1-rolling.png` });
  await p.waitForTimeout(Math.max(0, 2700 - (Date.now() - t0)));
  const done = await p.evaluate(() => { const c = document.querySelector('.mnc-card.top'); const s = document.querySelector('.mnc-stack').getBoundingClientRect(); const b = document.querySelector('.mnc-pick').getBoundingClientRect();
    return { revealed: !!document.querySelector('.mnc-revealed'), btn: document.querySelector('.mnc-pick')?.disabled, result: c.querySelector('.mnc-roll-result')?.innerText.replace(/\n/g, ' '), pip: c.querySelectorAll('.mnc-picture-die i.pip').length,
      diceShown: [...c.querySelectorAll('.mnc-face')].map((r) => `${r.classList.contains('on') ? '*' : ''}${r.innerText.replace(/\n/g, ' ')}`), fit: s.left >= 0 && s.right <= innerWidth && b.bottom <= innerHeight }; });
  console.log(tag, 'mid', JSON.stringify(mid), 'done', JSON.stringify(done));
  await p.screenshot({ path: `${OUT}/${tag}-2-landed.png` });
  await p.close();
}
console.log('errors', JSON.stringify(errs)); await br.close(); server.kill(); process.exit(0);
