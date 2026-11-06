// Using a card on the card (Dave, 6 Nov 2026), real taps in a real battle at phone size: open Magical Powers, tap the card, Use. Every-Round
// Cards stamp their symbol; a Charge Card's Use lights its stored charges one by one; a Finisher stamps and sweeps pink. The answer shows at
// the bottom in colour, the counters wait, Continue floats each number to its counter.
//   node dev/card-cast-check.mjs [out=shots/card-cast]      (headless Chromium, not Safari)
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/card-cast'; const port = 8274; fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; const errs = []; let bad = 0;
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
process.on('exit', () => server.kill());
const check = (name, ok, extra = '') => { if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const RUNS = [['knight', ['riposte']], ['knight', ['shieldwall']], ['ranger', ['mark']], ['ranger', ['quickdraw']], ['ranger', ['snare']], ['wizard', ['bolt']], ['dwarf', ['grudge']], ['knight', ['rally']], ['wizard', ['coil']], ['dwarf', ['stonehide']], ['knight', ['judgment']], ['ranger', ['rain']], ['wizard', ['meteor']]]; // one card a run (one slot-B card a hero)
for (const [cls, ids] of RUNS) {
  const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate(async ([cls, ids]) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: 'Side' + cls, cls, seed: 3 }); hh.dice = null; hh.level = ids.some((x) => ['judgment', 'rain', 'meteor', 'avalanche', 'finale'].includes(x)) ? 6 : 4; /* the finishers come at level 5 */ hh.campaign.step = 6;
    for (const id of ids) { hh.learned = [...(hh.learned || []), id]; E.equipPower(hh, id); }
    S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(hh.name)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblin', 'wolf', 'goblin'], kind: 'boss', step: 6 }); }, [cls, ids]);
  let up = false; for (let i = 0; i < 80 && !up; i++) { await pump(0.5); await p.waitForTimeout(150); up = await p.evaluate(() => !!document.querySelector('.mnc-veil')); }
  const pick = await p.$('.mnc-pick'); if (pick) { await p.waitForTimeout(2500); await pick.click(); }
  for (let i = 0; i < 40; i++) { await pump(0.3); await p.waitForTimeout(100); if (await p.evaluate(() => { const B = window.QD.B3.battleState; return !B.busy && B.b.phase === 'shape' && !!B.b.board; })) break; }
  for (const id of ids) {
    await p.evaluate((id) => { const B = window.QD.B3.battleState; B.b.magic = 12; B.b.usedRound = {}; B.b.round = Math.max(B.b.round, 3); B.b.charge = { ...(B.b.charge || {}), [id]: 3 }; }, id); // three charges stored; round 3 for a finisher
    const name = await p.evaluate((id) => window.QD.E.cardsOf(window.QD.S.hero).find((c) => c.id === id)?.name, id);
    const mb = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /magic/i.test(b.textContent) && b.offsetParent));
    if (!(await p.$('.b3-sheet.open')) && mb.asElement()) { await mb.asElement().click(); await p.waitForTimeout(1000); }
    const t = await p.evaluateHandle((n) => [...document.querySelectorAll('button')].find((b) => b.offsetParent && b.textContent.trim().includes(n)), name);
    check(`${name}: its button is on the Magical Powers sheet`, !!t.asElement()); if (!t.asElement()) continue;
    await t.asElement().click(); await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/${cls}-${id}-card.png` });
    const before = await p.evaluate(() => { const b = window.QD.B3.battleState.b; return { magic: b.magic, gold: b.goldEarned || 0, mods: { ...b.mods } }; });
    const cast = await p.$('.mc-use.go:not([disabled])'); check(`${name}: Cast is ready`, !!cast); if (!cast) continue;
    await p.evaluate(() => { window.__q = []; const t0 = performance.now(); const chips = window.QD.B3.battleState.hud.forecast._chips; for (const [k, c] of Object.entries(chips)) window.__q.push([k, c._n.textContent]); window.__before = Object.fromEntries(window.__q); });
    await cast.click(); await p.waitForTimeout(350);
    const mid = await p.evaluate(() => ({ stamped: document.querySelectorAll('.mc-card .mc-lit').length, ring: document.querySelectorAll('.mc-card .mc-ring').length, reveal: !!document.querySelector('.dr-card') }));
    await p.screenshot({ path: `${OUT}/${cls}-${id}-1-stamp.png` });
    check(`${name}: its symbols light on the card itself (no separate panel)`, mid.stamped > 0 && !mid.reveal, JSON.stringify(mid));
    await p.waitForSelector('.mc-result.in .mc-res-go:not([disabled])', { timeout: 8000 }).catch(() => null); await p.waitForTimeout(200);
    const res = await p.evaluate(() => { const r = document.querySelector('.mc-result'); const chips = window.QD.B3.battleState.hud.forecast._chips;
      return r ? { nums: [...r.querySelectorAll('.mc-res-n')].map((n) => [n.dataset.k, n.textContent, getComputedStyle(n).color]), go: r.querySelector('.mc-res-go')?.textContent, notes: [...r.querySelectorAll('.mc-res-miss')].map((n) => n.textContent), counters: Object.fromEntries(Object.entries(chips).map(([k, c]) => [k, c._n.textContent])) } : null; });
    await p.screenshot({ path: `${OUT}/${cls}-${id}-2-result.png` });
    check(`${name}: the answer shows at the bottom of the card in colour, with Continue`, res && res.go === 'Continue' && (res.nums.length > 0 || res.notes.length > 0), JSON.stringify(res));
    check(`${name}: the counters wait for Continue`, res && JSON.stringify(res.counters) === JSON.stringify(await p.evaluate(() => window.__before)), JSON.stringify(res?.counters));
    await p.click('.mc-res-go'); await p.waitForTimeout(250);
    const drift = await p.evaluate(() => ({ sheet: !!document.querySelector('.b3-sheet.open'), flying: document.querySelectorAll('.mc-res-fly').length, result: !!document.querySelector('.mc-result') }));
    await p.screenshot({ path: `${OUT}/${cls}-${id}-3-drift.png` });
    check(`${name}: Continue closes Magical Powers so the numbers can fly to the counters`, !drift.sheet, JSON.stringify(drift));
    if ((res?.nums || []).length) check(`${name}: the coloured totals are flying toward the battle counters`, drift.flying > 0, JSON.stringify(drift));
    await p.waitForTimeout(1400);
    const after = await p.evaluate(() => ({ result: !!document.querySelector('.mc-result'), flying: document.querySelectorAll('.mc-res-fly').length, counters: Object.fromEntries(Object.entries(window.QD.B3.battleState.hud.forecast._chips).map(([k, c]) => [k, c._n.textContent])), busy: window.QD.B3.battleState.busy, sheet: !!document.querySelector('.b3-sheet.open') }));
    const filled = (res?.nums || []).every(([k]) => !(k in after.counters) || after.counters[k] !== (res.counters[k]));
    check(`${name}: Continue floats the numbers to their counters, which fill`, !after.result && !after.flying && !after.busy && !after.sheet && filled, JSON.stringify(after));
  }
  await p.close();
}
check('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
console.log(bad ? `${bad} failed` : 'all passed'); await br.close(); process.exit(bad ? 1 : 0);
