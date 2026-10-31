// mk1 (Crockpot / Grok Bot, 29 Oct 2026): the Knight's magic cards in a real battle at 390x844.
//   CHROME=... node dev/magic-knight.mjs [out=/workspace/magic-knight] [port=8184]
// Opens the Magic sheet, checks the 2x3 grid, opens Cleave, adds dice (+▲1), Rolls (power reveal), attack rises and splashes, magic drops;
// Riposte (2 magic, +4 block, hit back armed, once a round); Rally Cry store and release. Exit 1 on any failure or page error.
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/magic-knight'; const port = +(process.argv[3] || 8184); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(async (n) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'knight', seed: 5 }); hh.dice = null; hh.level = 9; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblin'], kind: 'boss' }); }, 'Mk1Knight');
for (let i = 0; i < 120; i++) { await pump(0.5); if (await p.evaluate(() => window.QD.B3?.battleState?.bw && !window.QD.B3.battleState.busy)) break; }
const st = () => p.evaluate(() => { const b = window.QD.B3.battleState.b; return { magic: b.magic, atk: b.mods.atk || 0, block: b.mods.block || 0, splash: b.mods.splash || 0, rip: !!b.riposte, charge: b.charge?.rally || 0 }; });
const fresh = () => p.evaluate(() => { const { B3, E, S } = window.QD; const B = B3.battleState; B.b.board = E.rollBoard(S.hero, E.makeRng(5)); B.b.phase = 'shape'; B.b.magic = 10; B.b.usedRound = {}; B.b.mods.atk = 0; B.b.mods.block = 0; B.b.mods.splash = 0; B.busy = false; B3.renderShape(); });
const settle = async () => { for (let i = 0; i < 40; i++) { await pump(0.3); const busy = await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) ok.click(); return window.QD.B3.battleState.busy; }); if (!busy) break; } await pump(0.3); };
const pick = async (id) => { for (let i = 0; i < 10; i++) { await p.waitForTimeout(400); await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) ok.click(); }); await p.locator(`.b3-sheet.open .mc-tile[data-power="${id}"]`).click(); await pump(0.4); if (await p.evaluate((id) => !!document.querySelector(`.mc-card[data-card="${id}"]`), id)) return; } };
const clear = () => p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17, .pw-pop').forEach((t) => t.remove()));
const shot = async (n) => { await clear(); await p.screenshot({ path: `${OUT}/${n}_390x844.png` }); console.log('shot', `${OUT}/${n}_390x844.png`); };
await fresh(); await p.locator('.b3-powers').first().click(); await pump(1.2);
const tiles = await p.evaluate(() => [...document.querySelectorAll('.b3-sheet.open .mc-tile')].map((t) => t.dataset.power));
check('2x3 grid: Cleave, Riposte, Rally Cry; Potion, Heal, Heart change', tiles.join() === 'cleave,riposte,rally,u:bigheal,u:heal,u:heart', tiles.join());
await shot('mk1-panel');
await p.locator('.b3-sheet.open .mc-tile[data-power="cleave"]').click(); await pump(0.4);
const a0 = await p.evaluate(() => ({ spaces: document.querySelectorAll('.mc-card .mc-lv.act .mc-space').length, dice: document.querySelectorAll('.mc-card .mc-lv.act .mc-slots .mc-die').length, tag: document.querySelector('.mc-ptag')?.textContent, btns: [...document.querySelectorAll('.mc-ctl .mc-use')].map((b) => b.textContent) }));
const lbl = await p.evaluate(() => document.querySelector('.mc-card .mc-lv.act .mc-slots')?.getAttribute('aria-label'));
check('Cleave card: shared template, 2 dice + 2 blank spaces, −1 / +1 / Roll3, label says 2 of 4', a0.tag == null && a0.dice === 2 && a0.spaces === 2 && a0.btns.join('|') === '−1|+1|Roll3' && /2 of 4 attack dice/.test(lbl), JSON.stringify({ a0, lbl }));
await p.evaluate(()=>{window.cleaveArt=document.querySelector('.mc-paint img');window.cleaveFrame=document.querySelector('.mc-fr');});
await p.locator('.mc-ctl .mc-use.add').click(); await pump(0.3); await p.locator('.mc-ctl .mc-use.add').click(); await pump(0.3);
const lbl4 = await p.evaluate(() => document.querySelector('.mc-card .mc-lv.act .mc-slots')?.getAttribute('aria-label'));
const a1 = await p.evaluate(() => ({ dice: document.querySelectorAll('.mc-card .mc-lv.act .mc-slots .mc-die').length, roll: document.querySelector('.mc-ctl .mc-use.go')?.textContent }));
check('two taps of +▲1 fill the last two spaces; Roll ▲5; label 4 of 4', a1.dice === 4 && a1.roll === 'Roll5' && /4 of 4 attack dice/.test(lbl4), JSON.stringify({ a1, lbl4 }));
await shot('mk1-cleave-card');
check('Stepper keeps art mounted, previews remaining magic, and puts cost on card',await p.evaluate(()=>document.querySelector('.mc-paint img')===window.cleaveArt && document.querySelector('.mc-fr')===window.cleaveFrame && document.querySelector('.mc-cast-cost').textContent==='5' && document.querySelector('.pw-center b').textContent===String(window.QD.S.battle.magic-5) && !document.querySelector('.mc-lv.act .mc-spent') && getComputedStyle(document.querySelector('.mc-lv.act .mc-die')).animationName==='none'));
const s0 = await st(); await p.locator('.mc-ctl .mc-use.go').click(); await pump(0.5);
await shot('mk1-cleave-rolling');
for (let i = 0; i < 20; i++) { await pump(0.3); if (await p.evaluate(() => document.querySelector('.dr-card.done'))) break; }
await pump(0.6); const s1 = await st(); await shot('mk1-cleave-after-roll');
check('Roll: power-dice reveal plays, magic drops by 5, attack rises and half splashes', s0.magic - s1.magic === 5 && s1.atk > s0.atk && s1.splash === Math.floor((s1.atk - s0.atk) / 2) && !!(await p.evaluate(() => document.querySelector('.dr-die'))), JSON.stringify({ s0, s1 }));
await settle(); await pick('riposte');
const m0 = await st(); await shot('mk1-riposte-card'); await p.locator('.mc-ctl .mc-use.go').click();
for (let i = 0; i < 20; i++) { await pump(0.3); if (await p.evaluate(() => document.querySelector('.dr-card.done'))) break; }
const m1 = await st(); await settle(); await pick('riposte');
const mDis = await p.evaluate(() => document.querySelector('.mc-ctl .mc-use.go')?.disabled);
check('Riposte: 2 magic, +4 block, hit-back armed, then used this round', m0.magic - m1.magic === 2 && m1.block - m0.block === 4 && m1.rip && mDis, JSON.stringify({ m0, m1, mDis }));
await pick('rally');
const v0 = await st(); await p.locator('.mc-ctl .mc-use.add').click(); for (let i = 0; i < 10; i++) { await pump(0.3); if (!(await p.evaluate(() => window.QD.B3.battleState.busy))) break; }
await settle(); await pick('rally');
const v1 = await st(); check('Rally Cry +▲1 stores a charge for 1 magic', v1.charge === v0.charge + 1 && v0.magic - v1.magic === 1, JSON.stringify({ v0, v1 }));
await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.usedRound = {}; B.b.charge.rally = 2; B.b.mods.atk = 0; B.b.mods.block = 0; B.b.mods.splash = 0; window.QD.B3.renderShape(); }); await pump(0.3);
await shot('mk1-rally-card');
const rel = await p.evaluate(() => document.querySelector('.mc-ctl .mc-use.go')?.textContent);
await p.locator('.mc-ctl .mc-use.go').click(); for (let i = 0; i < 20; i++) { await pump(0.3); if (!(await p.evaluate(() => window.QD.B3.battleState.busy))) break; }
const v2 = await st(); check('Rally Cry Use 2 gives +6 attack and +4 block', rel === 'Use 2' && v2.atk === 6 && v2.block === 4 && v2.charge === 0, JSON.stringify({ rel, v2 }));
await settle(); await pick('rally'); await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.usedRound = {}; B.b.charge.rally = 1; window.QD.B3.renderShape(); }); await pump(0.3);
const bg = await p.evaluate(() => { const b = document.querySelector('.mc-ctl .mc-use.go'); const cs = getComputedStyle(b); return cs.backgroundColor + ' / ' + cs.color; });
check('Use button attack red with white text', /255, 59, 59/.test(bg) && /255, 255, 255\)$/.test(bg), bg);
await pick('riposte'); const rb = await p.evaluate(() => { const b = document.querySelector('.mc-ctl .mc-use.go'); const cs = getComputedStyle(b); return cs.backgroundColor + ' / ' + cs.color; }); check('Riposte Cast blue with dark text', /58, 164, 255/.test(rb) && /6, 26, 46/.test(rb), rb);
check('no page errors', !errs.length, errs.join(' | '));
await br.close(); server.kill(); console.log(bad ? `${bad} FAILED` : 'ALL PASS'); process.exit(bad ? 1 : 0);
