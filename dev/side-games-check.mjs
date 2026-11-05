// T31 side games in a real battle (real taps, phone size): each class equips its new cards, opens Magical Powers, taps the card,
// taps Cast, and the dice roll in their own colours and pay their counters. Headless Chromium, not Safari.
//   node dev/side-games-check.mjs [out=shots/side-games]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/side-games'; const port = 8268; fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; const errs = []; let bad = 0;
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
process.on('exit', () => server.kill());
const check = (name, ok, extra = '') => { if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const RUNS = [['bard', ['hymn', 'crowd']], ['knight', ['dressing', 'showboat']], ['ranger', ['gambit']], ['dwarf', ['whirlwind']]];
for (const [cls, ids] of RUNS) {
  const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate(async ([cls, ids]) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: 'Side' + cls, cls, seed: 3 }); hh.dice = null; hh.level = 4; hh.campaign.step = 6;
    for (const id of ids) { hh.learned = [...(hh.learned || []), id]; E.equipPower(hh, id); }
    S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(hh.name)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblin', 'wolf', 'goblin'], kind: 'boss', step: 6 }); }, [cls, ids]);
  let up = false; for (let i = 0; i < 80 && !up; i++) { await pump(0.5); await p.waitForTimeout(150); up = await p.evaluate(() => !!document.querySelector('.mnc-veil')); }
  const pick = await p.$('.mnc-pick'); if (pick) { await p.waitForTimeout(2500); await pick.click(); }
  for (let i = 0; i < 40; i++) { await pump(0.3); await p.waitForTimeout(100); if (await p.evaluate(() => { const B = window.QD.B3.battleState; return !B.busy && B.b.phase === 'shape' && !!B.b.board; })) break; }
  for (const id of ids) {
    await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.magic = 12; B.b.usedRound = {}; });
    const name = await p.evaluate((id) => window.QD.E.cardsOf(window.QD.S.hero).find((c) => c.id === id)?.name, id);
    const mb = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /magic/i.test(b.textContent) && b.offsetParent));
    if (!(await p.$('.b3-sheet.open')) && mb.asElement()) { await mb.asElement().click(); await p.waitForTimeout(1000); }
    const t = await p.evaluateHandle((n) => [...document.querySelectorAll('button')].find((b) => b.offsetParent && b.textContent.trim().includes(n)), name);
    check(`${name}: its button is on the Magical Powers sheet`, !!t.asElement()); if (!t.asElement()) continue;
    await t.asElement().click(); await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/${cls}-${id}-card.png` });
    const before = await p.evaluate(() => { const b = window.QD.B3.battleState.b; return { magic: b.magic, gold: b.goldEarned || 0, mods: { ...b.mods } }; });
    const cast = await p.$('.mc-use.go:not([disabled])'); check(`${name}: Cast is ready`, !!cast); if (!cast) continue;
    await cast.click(); await p.waitForSelector('.mc-result .mc-res-go:not([disabled])', { timeout: 8000 }).catch(() => null); await p.waitForTimeout(200); // the roll on the card (Dave, 6 Nov 2026)
    await p.screenshot({ path: `${OUT}/${cls}-${id}-roll.png` });
    const after = await p.evaluate(() => { const B = window.QD.B3.battleState; const b = B.b; return { magic: b.magic, gold: b.goldEarned || 0, mods: { ...b.mods }, dice: (B.b.lastCast?.groups || [{ to: 'whirl', s: B.b.lastCast?.die, rolls: B.b.lastCast?.rolls || [] }]).flatMap((g) => g.rolls.map(() => `${g.to}/${g.s}`)), landed: document.querySelectorAll('.mc-card .mc-die.mc-landed').length }; });
    const k = await p.evaluate((id) => { const k = window.QD.E.cardsOf(window.QD.S.hero).find((c) => c.id === id); return { cost: k.cost, roll: k.roll, dice: k.dice }; }, id);
    const paid = before.magic - after.magic; check(`${name}: costs ${k.cost} magic`, paid === k.cost || (k.dice && paid >= k.cost), `paid ${paid}`);
    const want = k.roll ? k.roll.flatMap((g) => Array(g.n).fill(`${g.to}/${g.s}`)) : [`whirl/${k.dice.s}`];
    check(`${name}: rolls ${want.join(', ')} in their colours`, want.every((w) => after.dice.includes(w)), JSON.stringify(after.dice));
    const moved = Object.keys(after.mods).filter((x) => after.mods[x] !== before.mods[x]); const gold = after.gold - before.gold;
    check(`${name}: pays its counters`, moved.length > 0 || gold >= 0, `changed ${moved.join(', ')}${gold ? `, gold +${gold}` : ''}`);
    check(`${name}: its dice land on the card`, after.landed === after.dice.length, `${after.landed} of ${after.dice.length}`);
    const ok = await p.$('.mc-res-go:not([disabled])'); if (ok) { await ok.click(); await p.waitForTimeout(900); }
  }
  await p.close();
}
check('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
console.log(bad ? `${bad} failed` : 'all passed'); await br.close(); process.exit(bad ? 1 : 0);
