// Battle target and magic timing (Grok board task f7ed0b7, Dave 31 Oct 2026): "players never feel punished for order-of-actions mistakes".
//   node dev/target-timing.mjs [out=docs/team/tasks/target-timing] [port=8186]      (headless Chromium, not Safari)
// A real solo battle against three monsters at 390x844:
//  1 round one asks for a target; a targeted power (Hunter's Mark) is refused until one is chosen, and nothing is spent
//  2 heal and a charge before the roll do not lock the target; the target can still be switched
//  3 a targeted power used before the roll locks the target (lock icon on its piece); tapping another monster is refused
//  4 Roll comes last: the locked target is the one the shot goes to, and the power's effect is still there
//  5 next round the target is still the target (nothing to choose, just Roll); the lock is gone
//  6 when the target falls, the next living monster is selected for you
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'docs/team/tasks/target-timing'; const port = +(process.argv[3] || 8186); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(async (n) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'ranger', seed: 5 }); hh.dice = null; hh.level = 9; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['ogre', 'ogre', 'ogre'], kind: 'boss' }); }, 'TargetTimer');
for (let i = 0; i < 120; i++) { await pump(0.5); if (await p.evaluate(() => window.QD.B3?.battleState?.bw && !window.QD.B3.battleState.busy)) break; }
const st = () => p.evaluate(() => { const B = window.QD.B3.battleState; const b = B.b; return { round: b.round, phase: b.phase, picked: B.picked, target: B.target, tuid: b.enemies[B.target]?.uid, tlock: B.tlock, magic: b.magic, pierce: b.mods.pierce || 0, markGold: b.markGold || 0, charge: b.charge?.volley || 0, hp: b.hp, maxHp: b.maxHp, alive: b.enemies.filter((e) => e.hp > 0).length, lockBadge: [...document.querySelectorAll('.fb-lock')].filter((x) => !x.hidden).length, busy: B.busy }; });
const shot = async (n) => { await p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17, .pw-pop').forEach((t) => t.remove())); await p.screenshot({ path: `${OUT}/${n}_390x844.png` }); };
// (the reveal's OK button wakes on real timers, so the loops wait real time as well as simulated time)
const settle = async () => { for (let i = 0; i < 60; i++) { await pump(0.3); await p.waitForTimeout(300); const busy = await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) ok.click(); return window.QD.B3.battleState.busy; }); if (!busy) break; } await pump(0.4); };
const openSheet = async () => { if (!await p.evaluate(() => !!document.querySelector('.b3-sheet.open'))) { await p.locator('.b3-powers').first().click(); await pump(1); } };
const pick = async (id) => { await openSheet(); await p.locator(`.b3-sheet.open .mc-tile[data-power="${id}"]`).click(); await pump(0.5); };
const useGo = async () => { await p.locator('.mc-ctl .mc-use.go, .mc-ctl .mc-use.add.mc-charge').first().click(); await settle(); };
const clickFoe = (i) => p.evaluate((i) => { const B = window.QD.B3.battleState; [...B.fb.foes.values()][i]?.el.click(); }, i);
const closeSheet = async () => { if (await p.evaluate(() => !!document.querySelector('.b3-sheet.open'))) { await p.evaluate(() => document.querySelector('.b3-powers')?.click()); await pump(0.6); await p.waitForTimeout(400); } };

// 1 round one asks for a target
await p.evaluate(() => { window.QD.B3.battleState.b.magic = 12; });
let s = await st(); check('round one with three monsters asks for a target', s.picked === false && s.alive === 3 && s.phase === 'reset', JSON.stringify(s));
await shot('1-choose-target');
await pick('mark'); const m0 = await st(); await useGo(); const m1 = await st();
check('Hunter’s Mark with no target chosen is refused and costs nothing', m1.magic === m0.magic && !m1.tlock && m1.pierce === 0, JSON.stringify({ m0, m1 }));

// 2 heal and a charge before the roll never lock; the target can still be switched
await clickFoe(1); s = await st(); check('tapping a monster chooses it', s.picked === true && s.target === 1, JSON.stringify(s));
await p.evaluate(() => { const b = window.QD.B3.battleState.b; b.hp = Math.max(1, b.maxHp - 10); });
await openSheet(); await p.locator('.b3-sheet.open .mc-tile[data-power="u:heal"]').click(); await pump(0.4);
const h0 = await st(); await p.locator('.pw-detail .pw-btn.go, .pw-detail .pr-go, .pw-detail button.go').first().click(); await settle(); const h1 = await st();
check('Heal works before the roll, spends magic, and does not lock', h1.hp > h0.hp && h1.magic < h0.magic && !h1.tlock && h1.lockBadge === 0 && h1.phase === 'reset', JSON.stringify({ h0, h1 }));
check('the sheet is still open after a pre-roll heal', await p.evaluate(() => !!document.querySelector('.b3-sheet.open')));
await pick('volley'); const v0 = await st(); await useGo(); const v1 = await st();
check('a charge before the roll stores it and does not lock', v1.charge === v0.charge + 1 && !v1.tlock && v1.lockBadge === 0, JSON.stringify({ v0, v1 }));
await closeSheet(); await clickFoe(2); s = await st(); check('before any targeted power the target can be switched freely', s.target === 2 && !s.tlock, JSON.stringify(s));
await clickFoe(1); s = await st();

// 3 a targeted power locks
await pick('mark'); const t0 = await st(); await shot('3-mark-card-before-roll'); await useGo(); const t1 = await st();
check('Hunter’s Mark before the roll: 2 magic, +3 pierce, locks the target', t1.magic === t0.magic - 2 && t1.pierce === 3 && t1.tlock === t0.tuid && t1.lockBadge === 1 && t1.phase === 'reset', JSON.stringify({ t0, t1 }));
await closeSheet(); await pump(0.4); await shot('3-locked-target');
await clickFoe(0); s = await st(); check('tapping another monster while locked is refused', s.target === 1 && s.tlock === t1.tlock, JSON.stringify(s));

// 4 Roll comes last
for (let i = 0; i < 4; i++) await closeSheet(); await shot('4-before-roll'); console.log('sheet before roll:', await p.evaluate(() => ({ open: window.QD.B3.battleState.sheetOpen, cls: document.querySelector('.b3-sheet')?.className }))); await p.locator('#b3-roll').click(); await pump(0.6); for (let i = 0; i < 60; i++) { await pump(0.3); await p.waitForTimeout(250); if (!(await st()).busy) break; }
s = await st(); check('Roll: the dice are out, the lock and the power’s pierce are still there', s.phase === 'shape' && s.tlock === t1.tlock && s.pierce >= 3 && s.target === 1, JSON.stringify(s));
// give the shot a chance to finish the target next round: leave it nearly dead
await p.evaluate(() => { const b = window.QD.B3.battleState.b; b.enemies[1].hp = 1; });
for (let i = 0; i < 6; i++) { const ok = await p.evaluate(() => { const l = document.querySelector('#b3-lock'); if (l && !l.disabled) { l.click(); return true; } return false; }); if (ok) break; await pump(0.5); await p.waitForTimeout(250); }
for (let i = 0; i < 200; i++) { await pump(0.3); await p.waitForTimeout(250); const x = await st(); if (x.round === 2 && x.phase === 'reset' && !x.busy) break; }
s = await st(); await shot('5-next-round');
// 5 / 6 the target fell: the next living monster is chosen for you, the lock is gone
const fell = await p.evaluate(() => { const B = window.QD.B3.battleState; return { dead: B.b.enemies[1].hp <= 0, target: B.target, tuid: B.b.enemies[B.target]?.uid, aliveIdx: B.b.enemies.map((e, i) => e.hp > 0 ? i : -1).filter((i) => i >= 0) }; });
check('round two: the monster that fell is not the target; a living one is chosen for you (Roll, no choosing)', s.round === 2 && s.picked === true && fell.aliveIdx.includes(fell.target), JSON.stringify({ s, fell }));
check('round two: the lock is gone', !s.tlock && s.lockBadge === 0, JSON.stringify(s));
// the target stays while it lives
const keep = s.target; await closeSheet(); await p.locator('#b3-roll').click(); await pump(0.6); for (let i = 0; i < 60; i++) { await pump(0.3); await p.waitForTimeout(250); if (!(await st()).busy) break; }
s = await st(); check('rolling again aims at the same living target (nothing was reset)', s.target === keep && s.phase === 'shape', JSON.stringify({ keep, s }));
check('no page errors', errs.length === 0, errs.join(' | '));
await br.close(); server.kill(); process.exit(bad ? 1 : 0);
