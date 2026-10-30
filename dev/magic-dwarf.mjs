// md1 (Crockpot / Grok Bot, 29 Oct 2026): the Dwarf's magic cards in a real battle at 390x844.
//   CHROME=... node dev/magic-dwarf.mjs [out=/workspace/magic-dwarf] [port=8187]
// Anvil Strike (blue d8 block dice, 1 magic each, 8s give 3 gold), Grudge (2 magic, attack = damage past block last round), Stonehide store/release.
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/magic-dwarf'; const port = +(process.argv[3] || 8187); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(async (n) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'dwarf', seed: 5 }); hh.dice = null; hh.level = 9; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblin'], kind: 'boss' }); }, 'Md1Dwarf');
for (let i = 0; i < 120; i++) { await pump(0.5); if (await p.evaluate(() => window.QD.B3?.battleState?.bw && !window.QD.B3.battleState.busy)) break; }
const st = () => p.evaluate(() => { const b = window.QD.B3.battleState.b; return { magic: b.magic, atk: b.mods.atk || 0, block: b.mods.block || 0, splash: b.mods.splash || 0, gold: b.goldEarned || 0, charge: b.charge?.stonehide || 0 }; });
const fresh = () => p.evaluate(() => { const { B3, E, S } = window.QD; const B = B3.battleState; B.b.board = E.rollBoard(S.hero, E.makeRng(5)); B.b.phase = 'shape'; B.b.magic = 12; B.b.usedRound = {}; B.b.mods.atk = 0; B.b.mods.block = 0; B.b.mods.splash = 0; B.busy = false; B3.renderShape(); });
const settle = async () => { for (let i = 0; i < 40; i++) { await pump(0.3); const busy = await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) ok.click(); return window.QD.B3.battleState.busy; }); if (!busy) break; } await pump(0.3); };
const pick = async (id) => { for (let i = 0; i < 10; i++) { await p.waitForTimeout(400); await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) ok.click(); }); await p.locator(`.b3-sheet.open .mc-tile[data-power="${id}"]`).click(); await pump(0.4); if (await p.evaluate((id) => !!document.querySelector(`.mc-card[data-card="${id}"]`), id)) return; } };
const clear = () => p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17, .pw-pop').forEach((t) => t.remove()));
const shot = async (n) => { await clear(); await p.screenshot({ path: `${OUT}/${n}_390x844.png` }); console.log('shot', `${OUT}/${n}_390x844.png`); };
await fresh(); await p.locator('.b3-powers').first().click(); await pump(1.2);
const tiles = await p.evaluate(() => [...document.querySelectorAll('.b3-sheet.open .mc-tile')].map((t) => t.dataset.power));
check('2x3 grid: Anvil Strike, Grudge, Stonehide; Potion, Heal, Heart change', tiles.join() === 'anvil,grudge,stonehide,u:bigheal,u:heal,u:heart', tiles.join());
await p.waitForTimeout(900); const fs1 = await p.evaluate(() => ({ sh: document.scrollingElement.scrollHeight, vh: innerHeight, sheet: document.querySelector('.b3-sheet.open')?.getBoundingClientRect().height }));
check('Magic sheet is full screen with no scroll', fs1.sh === fs1.vh && Math.abs(fs1.sheet - fs1.vh) < 2, JSON.stringify(fs1));
await shot('md1-panel');
await pick('anvil');
const a0 = await p.evaluate(() => ({ spaces: document.querySelectorAll('.mc-card .mc-lv.act .mc-space').length, dice: document.querySelectorAll('.mc-card .mc-lv.act .mc-slots .mc-die').length, tag: document.querySelector('.mc-ptag')?.textContent, btns: [...document.querySelectorAll('.mc-ctl .mc-use')].map((b) => b.textContent), fill: document.querySelector('.mc-card .mc-lv.act .mc-slots .mc-die path')?.getAttribute('fill'), gold: /EVERY 8 ALSO GIVES/.test(document.querySelector('.mc-card .mc-lv.act')?.textContent || '') }));
const lbl = await p.evaluate(() => document.querySelector('.mc-card .mc-lv.act .mc-spent')?.textContent);
check('Anvil Strike card: DICE tag, 1 blue d8 + 5 diamond spaces, −1 / +1 / Roll1, 1 of 6, gold-on-8 line', a0.tag === 'DICE' && a0.dice === 1 && a0.spaces === 5 && a0.btns.join('|') === '−1|+1|Roll1' && a0.fill === '#3aa4ff' && a0.gold && /1 of 6 dice/.test(lbl), JSON.stringify({ a0, lbl }));
await p.locator('.mc-ctl .mc-use.add').click(); await pump(0.3); await p.locator('.mc-ctl .mc-use.add').click(); await pump(0.3);
const a1 = await p.evaluate(() => ({ dice: document.querySelectorAll('.mc-card .mc-lv.act .mc-slots .mc-die').length, roll: document.querySelector('.mc-ctl .mc-use.go')?.textContent, lbl: document.querySelector('.mc-card .mc-lv.act .mc-spent')?.textContent }));
check('two taps of +▲1 fill two more spaces; Roll ▲3; 3 of 6', a1.dice === 3 && a1.roll === 'Roll3' && /3 of 6 dice/.test(a1.lbl), JSON.stringify(a1));
const rb0 = await p.evaluate(() => { const b = document.querySelector('.mc-ctl .mc-use.go'); const cs = getComputedStyle(b); return cs.backgroundColor + ' / ' + cs.color; });
check('Anvil Roll button blue with dark text', /58, 164, 255/.test(rb0) && /6, 26, 46\)$/.test(rb0), rb0);
await shot('md1-anvil-card');
const s0 = await st(); await p.locator('.mc-ctl .mc-use.go').click(); await pump(0.5); await shot('md1-anvil-rolling');
for (let i = 0; i < 20; i++) { await pump(0.3); if (await p.evaluate(() => document.querySelector('.dr-card.done'))) break; }
await pump(0.6); const s1 = await st(); const rolls = await p.evaluate(() => window.QD.B3.battleState.b.lastCast?.rolls || []); await shot('md1-anvil-after-roll');
check('Roll: power-dice reveal plays, magic drops by 3, block rises by the dice, 3 gold per 8', s0.magic - s1.magic === 3 && s1.block - s0.block === rolls.reduce((a, v) => a + v, 0) && s1.gold - s0.gold === 3 * rolls.filter((v) => v === 8).length && !!(await p.evaluate(() => document.querySelector('.dr-die'))), JSON.stringify({ s0, s1, rolls }));
await settle(); await p.evaluate(() => { window.QD.B3.battleState.b.lastHurt = 7; window.QD.B3.renderShape(); }); await pump(0.3); await pick('grudge');
const g0 = await st(); const gtxt = await p.evaluate(() => document.querySelector('.mc-card .mc-lv.act')?.textContent); await shot('md1-grudge-card');
const gb = await p.evaluate(() => { const b = document.querySelector('.mc-ctl .mc-use.go'); const cs = getComputedStyle(b); return b.textContent + ' ' + cs.backgroundColor + ' / ' + cs.color; });
check('Grudge card: ONE-SHOT, shows 7 got past your block, Cast ▲2 red with white text', /7 GOT PAST YOUR BLOCK/.test(gtxt) && /\+7/.test(gtxt) && /^Cast2 rgb\(255, 59, 59\) \/ rgb\(255, 255, 255\)$/.test(gb), JSON.stringify({ gtxt, gb }));
await p.locator('.mc-ctl .mc-use.go').click(); for (let i = 0; i < 20; i++) { await pump(0.3); if (await p.evaluate(() => document.querySelector('.dr-card.done'))) break; }
await shot('md1-grudge-after'); const g1 = await st(); await settle(); await pick('grudge');
const gDis = await p.evaluate(() => document.querySelector('.mc-ctl .mc-use.go')?.disabled);
check('Grudge: 2 magic, +7 attack on top, then used this round', g0.magic - g1.magic === 2 && g1.atk === g0.atk + 7 && gDis, JSON.stringify({ g0, g1, gDis }));
await pick('stonehide');
const v0 = await st(); await p.locator('.mc-ctl .mc-use.add').click(); for (let i = 0; i < 10; i++) { await pump(0.3); if (!(await p.evaluate(() => window.QD.B3.battleState.busy))) break; }
await settle(); await pick('stonehide');
const v1 = await st(); check('Stonehide +▲1 stores a charge for 1 magic', v1.charge === v0.charge + 1 && v0.magic - v1.magic === 1, JSON.stringify({ v0, v1 }));
await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.usedRound = {}; B.b.charge.stonehide = 2; window.QD.B3.renderShape(); }); await pump(0.3);
await shot('md1-stonehide-card');
const rel = await p.evaluate(() => { const b = document.querySelector('.mc-ctl .mc-use.go'); const cs = getComputedStyle(b); return b.textContent + ' ' + cs.backgroundColor + ' / ' + cs.color; });
const v1b = await st(); await p.locator('.mc-ctl .mc-use.go').click(); for (let i = 0; i < 20; i++) { await pump(0.3); if (!(await p.evaluate(() => window.QD.B3.battleState.busy))) break; }
const v2 = await st(); check('Stonehide Release 2 (blue, dark text) adds +12 block on top', /^Release 2 rgb\(58, 164, 255\) \/ rgb\(6, 26, 46\)$/.test(rel) && v2.block === v1b.block + 12 && v2.charge === 0 && v2.atk === v1b.atk, JSON.stringify({ rel, v1b, v2 }));
check('no page errors', !errs.length, errs.join(' | '));
await br.close(); server.kill(); console.log(bad ? `${bad} FAILED` : 'ALL PASS'); process.exit(bad ? 1 : 0);
