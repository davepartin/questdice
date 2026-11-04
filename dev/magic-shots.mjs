// Screenshots of each class's magic cards in a real battle (Dave, 4 Nov 2026: make the 15 starting powers look great).
//   node dev/magic-shots.mjs [out=shots/magic] [port=8202]      (headless Chromium at phone size, not Safari)
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/magic'; const port = +(process.argv[3] || 8202); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; const errs = [];
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
for (const cls of (process.env.CLASSES || 'knight,ranger,wizard,dwarf,bard').split(',')) {
  const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate(async (cls) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: 'Mage' + cls, cls, seed: 3 }); hh.dice = null; hh.level = 4; hh.campaign.step = 6; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(hh.name)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblin', 'wolf'], kind: 'boss', step: 6 }); }, cls);
  let up = false; for (let i = 0; i < 80 && !up; i++) { await pump(0.5); await p.waitForTimeout(150); up = await p.evaluate(() => !!document.querySelector('.mnc-veil')); }
  const pick = await p.$('.mnc-pick'); if (pick) { await p.waitForTimeout(2500); await pick.click(); }
  for (let i = 0; i < 40; i++) { await pump(0.3); await p.waitForTimeout(100); if (await p.evaluate(() => { const B = window.QD.B3.battleState; return !B.busy && B.b.phase === 'shape' && !!B.b.board; })) break; }
  await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.magic = 12; });
  const mb = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /magic/i.test(b.textContent) && b.offsetParent));
  if (mb.asElement()) { await mb.asElement().click(); await p.waitForTimeout(1200); }
  await p.screenshot({ path: `${OUT}/${cls}-magic.png` });
  const names = await p.evaluate(() => window.QD.E.cardsOf(window.QD.B3.battleState.b.hero || window.QD.S.hero).map((c) => c.name));
  for (const [i, n] of names.entries()) {
    const t = await p.evaluateHandle((n) => [...document.querySelectorAll('button')].find((b) => b.offsetParent && b.textContent.trim().includes(n)), n);
    if (!t.asElement()) continue; await t.asElement().click(); await p.waitForTimeout(900);
    for (let c = 0; c < +(process.env.CHARGE || 0); c++) { const ch = await p.$('.mc-use.mc-charge:not([disabled])'); if (!ch) break; await ch.click(); await p.waitForTimeout(700); } // CHARGE=n: charge a charge card n times first
    await p.screenshot({ path: `${OUT}/${cls}-${i + 1}-${n.replace(/[^a-z]+/gi, '-').toLowerCase()}.png` });
  }
  await p.close();
}
console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
await br.close(); server.kill();
