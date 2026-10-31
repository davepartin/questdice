// mb1 (Crockpot / Grok Bot, 29 Oct 2026): the Bard's magic cards in a real battle at 390x844.
//   CHROME=... node dev/magic-bard.mjs [out=/workspace/magic-bard] [port=8188]
// Mending Song (green d6 heal, 1 magic each, party), Lucky Verse (2 magic d6), Rising Ballad charge/use.
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/magic-bard'; const port = +(process.argv[3] || 8188); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(async (n) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls: 'bard', seed: 5 }); hh.dice = null; hh.level = 9; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblin'], kind: 'boss' }); }, 'Mb1Bard');
for (let i = 0; i < 120; i++) { await pump(0.5); if (await p.evaluate(() => window.QD.B3?.battleState?.bw && !window.QD.B3.battleState.busy)) break; }
const st = () => p.evaluate(() => { const b = window.QD.B3.battleState.b; return { magic: b.magic, atk: b.mods.atk || 0, block: b.mods.block || 0, splash: b.mods.splash || 0, gold: b.goldEarned || 0, heal: b.mods.heal || 0, charge: b.charge?.ballad || 0 }; });
const fresh = () => p.evaluate(() => { const { B3, E, S } = window.QD; const B = B3.battleState; B.b.board = E.rollBoard(S.hero, E.makeRng(5)); B.b.phase = 'shape'; B.b.magic = 12; B.b.usedRound = {}; B.b.mods.atk = 0; B.b.mods.block = 0; B.b.mods.splash = 0; B.busy = false; B3.renderShape(); });
const settle = async () => { for (let i = 0; i < 40; i++) { await pump(0.3); const busy = await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) ok.click(); return window.QD.B3.battleState.busy; }); if (!busy) break; } await pump(0.3); };
const pick = async (id) => { for (let i = 0; i < 10; i++) { await p.waitForTimeout(400); await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); if (ok && !ok.disabled) ok.click(); }); await p.locator(`.b3-sheet.open .mc-tile[data-power="${id}"]`).click(); await pump(0.4); if (await p.evaluate((id) => !!document.querySelector(`.mc-card[data-card="${id}"]`), id)) return; } };
const clear = () => p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17, .pw-pop').forEach((t) => t.remove()));
const shot = async (n) => { await clear(); await p.screenshot({ path: `${OUT}/${n}_390x844.png` }); console.log('shot', `${OUT}/${n}_390x844.png`); };
await fresh(); await p.locator('.b3-powers').first().click(); await pump(1.2);
const tiles = await p.evaluate(() => [...document.querySelectorAll('.b3-sheet.open .mc-tile')].map((t) => t.dataset.power));
check('2x3 grid: Mending Song, Lucky Verse, Rising Ballad; Potion, Heal, Heart change', tiles.join() === 'mending,luckyverse,ballad,u:bigheal,u:heal,u:heart', tiles.join());
await p.waitForTimeout(900); const fs1 = await p.evaluate(() => ({ sh: document.scrollingElement.scrollHeight, vh: innerHeight, sheet: document.querySelector('.b3-sheet.open')?.getBoundingClientRect().height }));
check('Magic sheet is full screen with no scroll', fs1.sh === fs1.vh && Math.abs(fs1.sheet - fs1.vh) < 2, JSON.stringify(fs1));
await shot('mb1-panel');
const css = (sel) => p.evaluate((sel) => { const b = document.querySelector(sel); const cs = getComputedStyle(b); return b.textContent + ' ' + cs.backgroundColor + ' / ' + cs.color; }, sel);
await pick('mending');
const a0 = await p.evaluate(() => ({ spaces: document.querySelectorAll('.mc-card .mc-lv.act .mc-space').length, dice: document.querySelectorAll('.mc-card .mc-lv.act .mc-slots .mc-die').length, tag: document.querySelector('.mc-ptag')?.textContent, btns: [...document.querySelectorAll('.mc-ctl .mc-use')].map((b) => b.textContent), fill: document.querySelector('.mc-card .mc-lv.act .mc-slots .mc-die path')?.getAttribute('fill'), pip: document.querySelector('.mc-card .mc-lv.act .mc-slots .mc-die g')?.getAttribute('fill'), party: [...document.querySelectorAll('.mc-trait')].some(e=>e.textContent==='Party'), lbl: document.querySelector('.mc-card .mc-lv.act .mc-slots')?.getAttribute('aria-label') }));
check('Mending Song card: shared template, 1 green d6 (#38e87a, dark pips) + 5 square spaces, −1 / +1 / Roll1, 1 of 6, party line', a0.tag == null && a0.dice === 1 && a0.spaces === 5 && a0.btns.join('|') === '−1|+1|Roll1' && a0.fill === '#38e87a' && a0.pip === '#06240f' && a0.party && /1 of 6 heal dice/.test(a0.lbl), JSON.stringify(a0));
await p.evaluate(()=>{window.mendingArt=document.querySelector('.mc-paint img');window.mendingFrame=document.querySelector('.mc-fr');});
await p.locator('.mc-ctl .mc-use.add').click(); await pump(0.3); await p.locator('.mc-ctl .mc-use.add').click(); await pump(0.3);
const a1 = await p.evaluate(() => ({ dice: document.querySelectorAll('.mc-card .mc-lv.act .mc-slots .mc-die').length, lbl: document.querySelector('.mc-card .mc-lv.act .mc-slots')?.getAttribute('aria-label') }));
const rb0 = await css('.mc-ctl .mc-use.go');
check('two taps of +▲1: 3 of 6; Roll ▲3 green with dark text', a1.dice === 3 && /3 of 6 heal dice/.test(a1.lbl) && /^Roll3 rgb\(56, 232, 122\)/.test(rb0) && !/255, 255, 255\)$/.test(rb0), JSON.stringify({ a1, rb0 }));
check('Stable artwork, corner cost and remaining-magic preview', await p.evaluate(()=>document.querySelector('.mc-paint img')===window.mendingArt && document.querySelector('.mc-fr')===window.mendingFrame && document.querySelector('.mc-cast-cost').textContent==='3' && document.querySelector('.pw-center b').textContent===String(window.QD.B3.battleState.b.magic-3) && !document.querySelector('.mc-lv.act .mc-spent')));
await shot('mb1-mending-card');
const s0 = await st(); await p.locator('.mc-ctl .mc-use.go').click(); await pump(0.5); await shot('mb1-mending-rolling');
for (let i = 0; i < 20; i++) { await pump(0.3); if (await p.evaluate(() => document.querySelector('.dr-card.done'))) break; }
await pump(0.6); const s1 = await st(); const rolls = await p.evaluate(() => window.QD.B3.battleState.b.lastCast?.rolls || []); await shot('mb1-mending-after-roll');
check('Roll: power-dice reveal plays, magic drops by 3, heal rises by the dice', s0.magic - s1.magic === 3 && rolls.length === 3 && s1.heal - s0.heal === rolls.reduce((a, v) => a + v, 0) && !!(await p.evaluate(() => document.querySelector('.dr-die'))), JSON.stringify({ s0, s1, rolls }));
await settle(); await pick('luckyverse');
const g0 = await st(); const gtag = await p.evaluate(() => document.querySelector('.mc-ptag')?.textContent); const gb = await css('.mc-ctl .mc-use.go'); await shot('mb1-luckyverse-card');
check('Lucky Verse card: shared template, Cast ▲2 red with white text', gtag == null && /^Cast2 rgb\(255, 59, 59\) \/ rgb\(255, 255, 255\)$/.test(gb), JSON.stringify({ gtag, gb }));
check('Lucky Verse maps all three ranges including top-roll magic', await p.evaluate(()=>{const rows=[...document.querySelectorAll('.mc-luck-table .mc-luck-row')];return rows.map(e=>e.dataset.range).join()==='1–2,3–4,5–6' && rows[0].querySelector('.fx-magic b').textContent==='+1' && rows[1].querySelector('.fx-atk b').textContent==='+5' && rows[2].querySelector('.fx-atk b').textContent==='+10' && rows[2].querySelector('.fx-magic b').textContent==='+1';}));
await p.locator('.mc-ctl .mc-use.go').click(); for (let i = 0; i < 20; i++) { await pump(0.3); if (await p.evaluate(() => document.querySelector('.dr-card.done'))) break; }
await shot('mb1-luckyverse-after'); const g1 = await st(); const lr = await p.evaluate(() => window.QD.B3.battleState.b.lastCast?.rolls?.[0]); await settle(); await pick('luckyverse');
const gDis = await p.evaluate(() => document.querySelector('.mc-ctl .mc-use.go')?.disabled);
const want = lr <= 2 ? { m: -2 + 1, a: 0 } : lr <= 4 ? { m: -2, a: 5 } : { m: -1, a: 10 };
check('Lucky Verse: 2 magic, the d6 pays out on top, then used this round', g1.magic - g0.magic === want.m && g1.atk - g0.atk === want.a && gDis, JSON.stringify({ g0, g1, lr, gDis }));
await pick('ballad');
const v0 = await st(); await p.locator('.mc-ctl .mc-use.add').click(); for (let i = 0; i < 10; i++) { await pump(0.3); if (!(await p.evaluate(() => window.QD.B3.battleState.busy))) break; }
await settle(); await pick('ballad');
const v1 = await st(); check('Rising Ballad +▲1 stores a charge for 1 magic', v1.charge === v0.charge + 1 && v0.magic - v1.magic === 1, JSON.stringify({ v0, v1 }));
await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.usedRound = {}; B.b.charge.ballad = 2; window.QD.B3.renderShape(); }); await pump(0.3);
await shot('mb1-ballad-card');
const dots = await p.evaluate(() => [...document.querySelectorAll('.mc-card .mc-lv.act .mc-dots')].map((d) => d.className + ':' + [...d.querySelectorAll('.mc-dot')].map((x) => x.textContent).join(',')));
const rel = await css('.mc-ctl .mc-use.go');
const v1b = await st(); await p.locator('.mc-ctl .mc-use.go').click(); for (let i = 0; i < 20; i++) { await pump(0.3); if (!(await p.evaluate(() => window.QD.B3.battleState.busy))) break; }
const v2 = await st(); check('Rising Ballad: dots total 2,6,12,20 attack and 1,4,9,16 heal; Use 2 (red, white) adds +6 attack and +4 heal on top', dots.join('|').includes('fx-atk:2,6,12,20') && dots.join('|').includes('fx-heal:1,4,9,16') && /^Use 2 rgb\(255, 59, 59\) \/ rgb\(255, 255, 255\)$/.test(rel) && v2.atk === v1b.atk + 6 && v2.heal === v1b.heal + 4 && v2.charge === 0, JSON.stringify({ dots, rel, v1b, v2 }));
check('no page errors', !errs.length, errs.join(' | '));
await br.close(); server.kill(); console.log(bad ? `${bad} FAILED` : 'ALL PASS'); process.exit(bad ? 1 : 0);
