// mw1 (Crockpot / Grok Bot, 29 Oct 2026): the Wizard's magic cards in a real battle at 390x844.
//   CHROME=... node dev/magic-wizard.mjs [out=/workspace/magic-wizard] [port=8186]
// Opens the Magic sheet, checks the 2x3 grid, opens Arc Bolt, adds d8s (+▲2), Rolls (power reveal), attack rises and half arcs, magic drops;
// Polymorph (3 magic, frog, once a round); Storm Coil store and release. Exit 1 on any failure or page error.
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/magic-wizard'; const port = +(process.argv[3] || 8186); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(async (n) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'wizard', seed: 5 }); hh.dice = null; hh.level = 9; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblin'], kind: 'boss' }); }, 'Mw1Wizard');
for (let i = 0; i < 120; i++) { await pump(0.5); if (await p.evaluate(() => window.QD.B3?.battleState?.bw && !window.QD.B3.battleState.busy)) break; }
const st = () => p.evaluate(() => { const b = window.QD.B3.battleState.b; return { magic: b.magic, atk: b.mods.atk || 0, block: b.mods.block || 0, splash: b.mods.splash || 0, frog: b.mods.frog || 0, charge: b.charge?.coil || 0 }; });
const fresh = () => p.evaluate(() => { const { B3, E, S } = window.QD; const B = B3.battleState; B.b.board = E.rollBoard(S.hero, E.makeRng(5)); B.b.phase = 'shape'; B.b.magic = 12; B.b.usedRound = {}; B.b.mods.atk = 0; B.b.mods.block = 0; B.b.mods.splash = 0; B.busy = false; B3.renderShape(); });
const settle = async () => { for (let i = 0; i < 40; i++) { await pump(0.3); const busy = await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) ok.click(); return window.QD.B3.battleState.busy; }); if (!busy) break; } await pump(0.3); };
const pick = async (id) => { for (let i = 0; i < 10; i++) { await p.waitForTimeout(400); await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) ok.click(); }); await p.locator(`.b3-sheet.open .mc-tile[data-power="${id}"]`).click(); await pump(0.4); if (await p.evaluate((id) => !!document.querySelector(`.mc-card[data-card="${id}"]`), id)) return; } };
const clear = () => p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17, .pw-pop').forEach((t) => t.remove()));
const shot = async (n) => { await clear(); await p.screenshot({ path: `${OUT}/${n}_390x844.png` }); console.log('shot', `${OUT}/${n}_390x844.png`); };
await fresh(); await p.locator('.b3-powers').first().click(); await pump(1.2);
const tiles = await p.evaluate(() => [...document.querySelectorAll('.b3-sheet.open .mc-tile')].map((t) => t.dataset.power));
check('2x3 grid: Arc Bolt, Polymorph, Storm Coil; Potion, Heal, Heart change', tiles.join() === 'arcbolt,polymorph,coil,u:bigheal,u:heal,u:heart', tiles.join());
await shot('mw1-panel');
await p.locator('.b3-sheet.open .mc-tile[data-power="arcbolt"]').click(); await pump(0.4);
const a0 = await p.evaluate(() => ({ spaces: document.querySelectorAll('.mc-card .mc-lv.act .mc-space').length, dice: document.querySelectorAll('.mc-card .mc-lv.act .mc-slots .mc-die').length, tag: document.querySelector('.mc-ptag')?.textContent, btns: [...document.querySelectorAll('.mc-ctl .mc-use')].map((b) => b.textContent) }));
const lbl = await p.evaluate(() => document.querySelector('.mc-card .mc-lv.act .mc-spent')?.textContent);
check('Arc Bolt card: DICE tag, 1 d8 + 5 blank diamond spaces, −2 / +2 / Roll2, label 1 of 6', a0.tag === 'DICE' && a0.dice === 1 && a0.spaces === 5 && a0.btns.join('|') === '−2|+2|Roll2' && /1 of 6 dice/.test(lbl), JSON.stringify({ a0, lbl }));
await p.locator('.mc-ctl .mc-use.add').click(); await pump(0.3); await p.locator('.mc-ctl .mc-use.add').click(); await pump(0.3);
const lbl4 = await p.evaluate(() => document.querySelector('.mc-card .mc-lv.act .mc-spent')?.textContent);
const a1 = await p.evaluate(() => ({ dice: document.querySelectorAll('.mc-card .mc-lv.act .mc-slots .mc-die').length, roll: document.querySelector('.mc-ctl .mc-use.go')?.textContent }));
check('two taps of +▲2 fill two more spaces; Roll ▲6; label 3 of 6', a1.dice === 3 && a1.roll === 'Roll6' && /3 of 6 dice/.test(lbl4), JSON.stringify({ a1, lbl4 }));
await shot('mw1-arcbolt-card');
const s0 = await st(); await p.locator('.mc-ctl .mc-use.go').click(); await pump(0.5);
await shot('mw1-arcbolt-rolling');
for (let i = 0; i < 20; i++) { await pump(0.3); if (await p.evaluate(() => document.querySelector('.dr-card.done'))) break; }
await pump(0.6); const s1 = await st(); await shot('mw1-arcbolt-after-roll');
check('Roll: power-dice reveal plays, magic drops by 6, attack rises and half arcs', s0.magic - s1.magic === 6 && s1.atk > s0.atk && s1.splash === Math.floor((s1.atk - s0.atk) / 2) && !!(await p.evaluate(() => document.querySelector('.dr-die'))), JSON.stringify({ s0, s1 }));
await settle(); await pick('polymorph');
const m0 = await st(); await shot('mw1-polymorph-card'); await p.locator('.mc-ctl .mc-use.go').click();
for (let i = 0; i < 20; i++) { await pump(0.3); if (await p.evaluate(() => document.querySelector('.dr-card.done'))) break; }
const m1 = await st(); await settle(); await pick('polymorph');
const mDis = await p.evaluate(() => document.querySelector('.mc-ctl .mc-use.go')?.disabled);
check('Polymorph: 3 magic, the frog is set, then used this round', m0.magic - m1.magic === 3 && m1.frog === 1 && mDis, JSON.stringify({ m0, m1, mDis }));
await pick('coil');
const v0 = await st(); await p.locator('.mc-ctl .mc-use.add').click(); for (let i = 0; i < 10; i++) { await pump(0.3); if (!(await p.evaluate(() => window.QD.B3.battleState.busy))) break; }
await settle(); await pick('coil');
const v1 = await st(); check('Storm Coil +▲1 stores a charge for 1 magic', v1.charge === v0.charge + 1 && v0.magic - v1.magic === 1, JSON.stringify({ v0, v1 }));
await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.usedRound = {}; B.b.charge.coil = 2; window.QD.B3.renderShape(); }); await pump(0.3);
await shot('mw1-coil-card');
const rel = await p.evaluate(() => document.querySelector('.mc-ctl .mc-use.go')?.textContent);
await p.locator('.mc-ctl .mc-use.go').click(); for (let i = 0; i < 20; i++) { await pump(0.3); if (!(await p.evaluate(() => window.QD.B3.battleState.busy))) break; }
const v2 = await st(); check('Storm Coil Release 2 adds +8 attack and 4 splash on top of the Arc Bolt attack', rel === 'Release 2' && v2.atk === v1.atk + 8 && v2.splash === v1.splash + 4 && v2.charge === 0, JSON.stringify({ rel, v1, v2 }));
await settle(); await pick('coil'); await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.usedRound = {}; B.b.charge.coil = 1; window.QD.B3.renderShape(); }); await pump(0.3);
const bg = await p.evaluate(() => { const b = document.querySelector('.mc-ctl .mc-use.go'); const cs = getComputedStyle(b); return cs.backgroundColor + ' / ' + cs.color; });
check('Release button attack red with white text', /255, 59, 59/.test(bg) && /255, 255, 255\)$/.test(bg), bg);
await pick('polymorph'); const rb = await p.evaluate(() => { const b = document.querySelector('.mc-ctl .mc-use.go'); const cs = getComputedStyle(b); return cs.backgroundColor + ' / ' + cs.color; }); check('Polymorph Cast purple with white text', /116, 64, 176/.test(rb) && /255, 255, 255\)$/.test(rb), rb);
check('no page errors', !errs.length, errs.join(' | '));
await br.close(); server.kill(); console.log(bad ? `${bad} FAILED` : 'ALL PASS'); process.exit(bad ? 1 : 0);
