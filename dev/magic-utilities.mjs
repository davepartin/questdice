// mb1 (Crockpot / Grok Bot, 29 Oct 2026): the Bard's magic cards in a real battle at 390x844.
//   CHROME=... node dev/magic-bard.mjs [out=/workspace/magic-bard] [port=8188]
// Mending Song (green d6 heal, 1 magic each, party), Lucky Verse (2 magic d6), Rising Ballad charge/use.
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/magic-bard'; const port = +(process.argv[3] || 8190); fs.mkdirSync(OUT, { recursive: true });
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

await p.evaluate(()=>{const B=window.QD.B3.battleState;B.b.hp=B.b.maxHp-20;B.b.board.C.v=3;window.QD.B3.renderShape();});
for(const [width,height] of [[390,844],[375,667]]){
await p.setViewportSize({width,height});
for(const id of ['u:bigheal','u:heal','u:heart']){
await p.locator(`.mc-tile[data-power="${id}"]`).click();await pump(.3);
const result=await p.evaluate(()=>{const c=document.querySelector('.mc-utility');const r=c.getBoundingClientRect();return{card:!!c,bottom:r.bottom,scroll:document.scrollingElement.scrollHeight,buttons:[...c.querySelectorAll('button')].length};});
check(`${id} framed card fits ${width}`,result.card&&result.bottom<=height+1&&result.scroll===height,JSON.stringify(result));
await p.screenshot({path:`${OUT}/${id.slice(2)}-${width}.png`});
}
}
await p.locator('.mc-tile[data-power="u:heal"]').click();const before=await p.evaluate(()=>{const b=window.QD.B3.battleState.b;return{hp:b.hp,magic:b.magic};});await p.locator('.mc-ctl .mc-use').click();await pump(.3);
check('Heal still spends magic, restores health and retains card/result',await p.evaluate(before=>{const b=window.QD.B3.battleState.b;return b.hp>before.hp&&b.magic<before.magic&&!!document.querySelector('.mc-utility.healing .mc-util-result');},before));
await p.locator('.mc-tile[data-power="u:bigheal"]').click();const pot=await p.evaluate(()=>window.QD.E.potionsLeft(window.QD.B3.battleState.b));await p.locator('.mc-ctl .mc-use').click();await pump(.3);check('Potion inventory consumed and card retained',await p.evaluate(pot=>window.QD.E.potionsLeft(window.QD.B3.battleState.b)===pot-1&&!!document.querySelector('.mc-utility.potion'),pot));
await p.locator('.mc-tile[data-power="u:heart"]').click();await p.locator('.mc-utility .hc-up').click();await pump(.3);check('Original Heart Up action works and disables both choices',await p.evaluate(()=>window.QD.B3.battleState.b.board.C.v===4&&[...document.querySelectorAll('.mc-utility .hc-btn')].every(b=>b.disabled)));
check('no page errors',!errs.length,errs.join(' | '));await br.close();server.kill();process.exit(bad?1:0);
