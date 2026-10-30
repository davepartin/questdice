// mr1 (Crockpot / Grok Bot, 29 Oct 2026; Dave t434/t435): the Ranger's magic cards in a real battle at 390x844.
//   CHROME=... node dev/magic-ranger.mjs [out=/workspace/magic-ranger] [port=8183]
// Opens the Magic sheet, checks the 2x3 grid, opens Aimed Shot, adds dice (+▲1), Rolls (power reveal), pierce rises and magic drops;
// Hunter's Mark (2 magic, +2 pierce, once a round); Volley store and release. Exit 1 on any failure or page error.
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/magic-ranger'; const port = +(process.argv[3] || 8183); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(async (n) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'ranger', seed: 5 }); hh.dice = null; hh.level = 9; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblin'], kind: 'boss' }); }, 'Mr1Ranger');
for (let i = 0; i < 120; i++) { await pump(0.5); if (await p.evaluate(() => window.QD.B3?.battleState?.bw && !window.QD.B3.battleState.busy)) break; }
const st = () => p.evaluate(() => { const b = window.QD.B3.battleState.b; return { magic: b.magic, pierce: b.mods.pierce || 0, charge: b.charge?.volley || 0, gold: b.markGold || 0 }; });
const fresh = () => p.evaluate(() => { const { B3, E, S } = window.QD; const B = B3.battleState; B.b.board = E.rollBoard(S.hero, E.makeRng(5)); B.b.phase = 'shape'; B.b.magic = 8; B.b.usedRound = {}; B.b.mods.pierce = 0; B.busy = false; B3.renderShape(); });
const settle = async () => { for (let i = 0; i < 40; i++) { await pump(0.3); const busy = await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) ok.click(); return window.QD.B3.battleState.busy; }); if (!busy) break; } await pump(0.3); };
const pick = async (id) => { for (let i = 0; i < 10; i++) { await p.waitForTimeout(400); await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) ok.click(); }); await p.locator(`.b3-sheet.open .mc-tile[data-power="${id}"]`).click(); await pump(0.4); if (await p.evaluate((id) => !!document.querySelector(`.mc-card[data-card="${id}"]`), id)) return; } };
const clear = () => p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17, .pw-pop').forEach((t) => t.remove()));
const shot = async (n) => { await clear(); await p.screenshot({ path: `${OUT}/${n}_390x844.png` }); console.log('shot', `${OUT}/${n}_390x844.png`); };
await fresh(); await p.locator('.b3-powers').first().click(); await pump(1.2);
const tiles = await p.evaluate(() => [...document.querySelectorAll('.b3-sheet.open .mc-tile')].map((t) => t.dataset.power));
check('2x3 grid: Aimed Shot, Hunter\u2019s Mark, Volley; Potion, Heal, Heart change', tiles.join() === 'aimed,mark,volley,u:bigheal,u:heal,u:heart', tiles.join());
await shot('mr1-panel');
await p.locator('.b3-sheet.open .mc-tile[data-power="aimed"]').click(); await pump(0.4);
const a0 = await p.evaluate(() => ({ spaces: document.querySelectorAll('.mc-card .mc-lv.act .mc-space').length, dice: document.querySelectorAll('.mc-card .mc-lv.act .mc-slots .mc-die').length, tag: document.querySelector('.mc-ptag')?.textContent, btns: [...document.querySelectorAll('.mc-ctl .mc-use')].map((b) => b.textContent) }));
check('Aimed Shot card: DICE tag, 1 die + 3 blank spaces, −1 / +1 / Roll1', a0.tag === 'DICE' && a0.dice === 1 && a0.spaces === 3 && a0.btns.join('|') === '−1|+1|Roll1', JSON.stringify(a0));
await p.locator('.mc-ctl .mc-use.add').click(); await pump(0.3); await p.locator('.mc-ctl .mc-use.add').click(); await pump(0.3);
const a1 = await p.evaluate(() => ({ dice: document.querySelectorAll('.mc-card .mc-lv.act .mc-slots .mc-die').length, roll: document.querySelector('.mc-ctl .mc-use.go')?.textContent }));
check('two taps of +▲1 fill two more spaces; Roll ▲3', a1.dice === 3 && a1.roll === 'Roll3', JSON.stringify(a1));
await shot('mr1-aimed-card');
const s0 = await st(); await p.locator('.mc-ctl .mc-use.go').click(); await pump(0.5);
await shot('mr1-aimed-rolling');
for (let i = 0; i < 20; i++) { await pump(0.3); if (await p.evaluate(() => document.querySelector('.dr-card.done'))) break; }
await pump(0.6); const s1 = await st(); await shot('mr1-aimed-after-roll');
check('Roll: power-dice reveal plays, magic drops by 3, pierce rises by the total', s0.magic - s1.magic === 3 && s1.pierce > s0.pierce && !!(await p.evaluate(() => document.querySelector('.dr-die'))), JSON.stringify({ s0, s1 }));
await settle(); await pick('mark');
const m0 = await st(); await shot('mr1-mark-card'); await p.locator('.mc-ctl .mc-use.go').click();
for (let i = 0; i < 20; i++) { await pump(0.3); if (await p.evaluate(() => document.querySelector('.dr-card.done'))) break; }
const m1 = await st(); await settle(); await pick('mark');
const mDis = await p.evaluate(() => document.querySelector('.mc-ctl .mc-use.go')?.disabled);
check('Hunter\u2019s Mark: 2 magic, +3 pierce, gold armed 6, then used this round', m0.magic - m1.magic === 2 && m1.pierce - m0.pierce === 3 && m1.gold === 6 && mDis, JSON.stringify({ m0, m1, mDis }));
await pick('volley');
const v0 = await st(); await p.locator('.mc-ctl .mc-use.add').click(); for (let i = 0; i < 10; i++) { await pump(0.3); if (!(await p.evaluate(() => window.QD.B3.battleState.busy))) break; }
await settle(); await pick('volley');
const v1 = await st(); check('Volley +▲1 stores a charge for 1 magic', v1.charge === v0.charge + 1 && v0.magic - v1.magic === 1, JSON.stringify({ v0, v1 }));
await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.usedRound = {}; B.b.charge.volley = 2; B.b.mods.pierce = 0; window.QD.B3.renderShape(); }); await pump(0.3);
await shot('mr1-volley-card');
const rel = await p.evaluate(() => document.querySelector('.mc-ctl .mc-use.go')?.textContent);
await p.locator('.mc-ctl .mc-use.go').click(); for (let i = 0; i < 20; i++) { await pump(0.3); if (!(await p.evaluate(() => window.QD.B3.battleState.busy))) break; }
const v2 = await st(); check('Volley Release 2 gives +8 pierce', rel === 'Release 2' && v2.pierce === 8 && v2.charge === 0, JSON.stringify({ rel, v2 }));
await settle(); await pick('volley'); await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.usedRound = {}; B.b.charge.volley = 1; window.QD.B3.renderShape(); }); await pump(0.3);
const bg = await p.evaluate(() => { const b = document.querySelector('.mc-ctl .mc-use.go'); const cs = getComputedStyle(b); return cs.backgroundColor + ' / ' + cs.color; });
check('Release button pierce orange with dark text', /255, 138, 26/.test(bg) && /26, 11, 0/.test(bg), bg);
check('no page errors', !errs.length, errs.join(' | '));
await br.close(); server.kill(); console.log(bad ? `${bad} FAILED` : 'ALL PASS'); process.exit(bad ? 1 : 0);
