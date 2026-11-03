// Monster mini card picker with real finger taps (Dave's iPhone, 2 Nov 2026: "I could not select the card that was behind").
// Taps go through the browser's own hit-testing (Playwright touchscreen), not element.click(), so a layer that lets taps fall through shows up here.
//   CHROME=/path/to/chrome node dev/minicard-taps.mjs [out=shots/minicard-taps] [port=8198]      (headless Chromium, not Safari)
// For two, three and four monsters at 390x664: every card can be tapped to the front; Attack on it makes it the target and goes straight
// to the battle (no plan board, no picker left), Roll is ready. One monster: its card shows too, Attack closes it. Round two (a Special is
// live): the cards come back with the current target on top; Attack on another card switches the target.
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/minicard-taps'; const port = +(process.argv[3] || 8198); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; let bad = 0; const errs = [];
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const FIGHTS = { one: ['ogre'], two: ['wraith', 'skeleton'], three: ['goblin', 'wolf', 'cultist'], four: ['goblin', 'skeleton', 'wolf', 'cultist'] };
for (const [tag, foes] of Object.entries(FIGHTS)) {
  if (process.env.PICKER_ONLY && process.env.PICKER_ONLY !== tag) continue;
  const p = await br.newPage({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate(async ([n, foes]) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'wizard', seed: 5 }); hh.dice = null; hh.level = 9; hh.campaign.step = 6; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: foes, kind: 'boss', step: 6 }); }, ['Taps' + tag, foes]);
  let up = false; for (let i = 0; i < 80 && !up; i++) { await pump(0.5); await p.waitForTimeout(150); up = await p.evaluate(() => !!document.querySelector('.mnc-veil')); }
  check(`${tag}: the picker opens`, up); if (!up) { await p.close(); continue; }
  const ready = async () => { for (let i = 0; i < 40; i++) { if (await p.evaluate(() => { const b = document.querySelector('.mnc-pick'); return !b || !b.disabled; })) return; await p.waitForTimeout(150); } }; // the move dice roll for two seconds before Attack wakes
  await ready(); await p.waitForTimeout(400);
  check(`${tag}: picker offers Attack & Roll and hides the old target prompt`, await p.evaluate(() => document.querySelector('.mnc-pick')?.textContent === 'Attack & Roll' && getComputedStyle(document.querySelector('.b3-caption')).visibility === 'hidden'));
  // the visible strip of a card: its right edge past the card in front of it (the last card: its middle right)
  const spot = (i) => p.evaluate((i) => { const cs = [...document.querySelectorAll('.mnc-card')]; const r = cs[i].getBoundingClientRect(); const top = cs.find((c) => c.classList.contains('top')).getBoundingClientRect();
    const left = cs[i].classList.contains('top') ? r.left : Math.max(r.left, i > cs.indexOf(cs.find((c) => c.classList.contains('top'))) ? top.right : r.left); return { x: (left + r.right) / 2, y: r.top + r.height * 0.55 }; }, i);
  const n = foes.length;
  for (let i = n - 1; i >= 0; i--) { const s = await spot(i); await p.touchscreen.tap(s.x, s.y); await p.waitForTimeout(350);
    check(`${tag}: tapping card ${i + 1} of ${n} brings it to the front`, await p.evaluate((i) => document.querySelectorAll('.mnc-card')[i].classList.contains('top'), i), JSON.stringify(s)); }
  const want = n - 1; const s = await spot(want); await p.touchscreen.tap(s.x, s.y); await p.waitForTimeout(350);
  if (tag === 'two') await p.screenshot({ path: `${OUT}/${tag}-back-card-in-front.png` });
  const uid = await p.evaluate((i) => document.querySelectorAll('.mnc-card')[i].dataset.uid, want);
  const b = await p.evaluate(() => { const r = document.querySelector('.mnc-pick').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.touchscreen.tap(b.x, b.y);
  for (let i=0; i<100; i++) { await pump(.3); await p.waitForTimeout(100); if (await p.evaluate(() => { const B=window.QD.B3.battleState; return !B.busy && B.b.phase==='shape' && !!B.b.board; })) break; }
  const after = await p.evaluate(() => { const B = window.QD.B3.battleState; return { veil: !!document.querySelector('.mnc-veil'), plan: !!document.querySelector('.sp-plan'), picked: B.picked, tuid: B.b.enemies[B.target]?.uid, phase:B.b.phase, board:!!B.b.board, busy:B.busy }; });
  check(`${tag}: Attack & Roll targets that monster and rolls the hero dice`, !after.veil && !after.plan && after.picked === true && after.tuid === uid && after.phase==='shape' && after.board && !after.busy, JSON.stringify({ uid, ...after }));
  if (tag === 'two') { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${OUT}/${tag}-battle.png` }); }
  if (tag === 'two') { // round two: roll, lock in, close the recap; the cards come back with the target on top
    for (let i = 0; i < 6; i++) { if (await p.evaluate(() => { const l = document.querySelector('#b3-lock'); if (l && !l.disabled) { l.click(); return true; } return false; })) break; await pump(0.5); await p.waitForTimeout(250); }
    let r2 = false; for (let i = 0; i < 200 && !r2; i++) { await pump(0.3); await p.waitForTimeout(200); r2 = await p.evaluate(() => { document.querySelector('.dr-ok:not([disabled])')?.click(); return !!document.querySelector('.mnc-veil'); }); }
    const top = await p.evaluate(() => { const B = window.QD.B3.battleState; return { round: B.b.round, head: document.querySelector('.mnc-head')?.textContent, top: document.querySelector('.mnc-card.top')?.dataset.uid, tuid: B.b.enemies[B.target]?.uid, live: B.b.enemies.filter((e) => e.hp > 0).length }; });
    check('round two: the cards come back, the current target on top', r2 && top.round === 2 && (top.live < 2 || top.top === top.tuid), JSON.stringify(top));
    await ready(); await p.screenshot({ path: `${OUT}/two-round2-cards.png` });
    if (r2 && top.live > 1) { const other = await p.evaluate(() => [...document.querySelectorAll('.mnc-card')].findIndex((c) => !c.classList.contains('top')));
      const o = await spot(other); await p.touchscreen.tap(o.x, o.y); await p.waitForTimeout(350); const ou = await p.evaluate((i) => document.querySelectorAll('.mnc-card')[i].dataset.uid, other);
      const bb = await p.evaluate(() => { const r = document.querySelector('.mnc-pick').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); await p.touchscreen.tap(bb.x, bb.y);
      for (let i=0; i<100; i++) { await pump(.3); await p.waitForTimeout(100); if (await p.evaluate(() => { const B=window.QD.B3.battleState; return !B.busy && B.b.phase==='shape' && !!B.b.board; })) break; }
      const sw = await p.evaluate(() => { const B = window.QD.B3.battleState; return { veil: !!document.querySelector('.mnc-veil'), sheet: !!document.querySelector('.fi-sheet, .foe-sheet, .b3-foeinfo'), tuid: B.b.enemies[B.target]?.uid, phase:B.b.phase, board:!!B.b.board, busy:B.busy }; });
      check('round two: Attack & Roll switches target and rolls once', !sw.veil && sw.tuid === ou && sw.phase==='shape' && sw.board && !sw.busy, JSON.stringify({ ou, ...sw })); }
    // Dave (3 Nov 2026): no recap pops up after a round; the Recap button at the top has it
    const rc = await p.evaluate(() => ({ shown: !!document.querySelector('.rc:not(.rc-inline)'), btn: !!document.querySelector('.rc-again:not([hidden])'), dice: document.querySelectorAll('.fb-mdie').length }));
    check('after a round no recap pops up, the Recap button is there, and no dice sit by the miniatures', !rc.shown && rc.btn && rc.dice === 0, JSON.stringify(rc));
    if (rc.btn) { const r = await p.evaluate(() => { const b = document.querySelector('.rc-again').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }); await p.touchscreen.tap(r.x, r.y); await p.waitForTimeout(400);
      check('tapping Recap opens the last round', await p.evaluate(() => !!document.querySelector('.rc')), ''); await p.screenshot({ path: `${OUT}/two-recap-button.png` }); }
  }
  await p.close();
}
check('no page errors', errs.length === 0, errs.join(' | '));
await br.close(); server.kill(); process.exit(bad ? 1 : 0);
