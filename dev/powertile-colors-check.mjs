// ptc1 (Crockpot / Grok Bot, 2 Nov 2026): the magic home-grid tiles carry role colours; two-role tiles split. Screenshots to /workspace/powertile-colors-live.
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = '/workspace/powertile-colors-live'; fs.mkdirSync(OUT, { recursive: true }); const port = 8195;
const exe = '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const RUNS = [
  ['knight', {}, 'knight'], ['ranger', {}, 'ranger'], ['bard', {}, 'bard'], ['bard', { C: 'goldhymn' }, 'bard-goldhymn'], ['dwarf', {}, 'dwarf'],
];
const errsAll = []; let bad = 0; const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const WANT = { knight: 'Cleave=atk/atk,Counterstrike=block/block,Rally Cry=atk/block', ranger: "Aimed Shot=atk/atk,Hunter's Mark=atk/gold,Volley=atk/atk", bard: 'Mending Song=heal/heal,Lucky Verse=atk/atk,Rising Ballad=atk/heal', 'bard-goldhymn': 'Mending Song=heal/heal,Lucky Verse=atk/atk,Hymn of Gold=gold/gold', dwarf: 'Anvil Strike=block/block,Grudge=atk/atk,Stonehide=block/block' };
for (const [vw, vh] of [[390, 664], [375, 548]]) {
for (const [cls, powers, tag] of RUNS) {
  const p = await br.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, hasTouch: true }); p.on('pageerror', (e) => errsAll.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate(async ([cls, powers]) => { const { S, E, showBoard } = window.QD; const n = `Pbc${cls}${Object.values(powers).join('')}`.slice(0, 20); const hh = E.newHero({ name: n, cls, seed: 5 }); hh.dice = null; hh.level = 9;
    hh.learned = Object.values(powers); hh.powers = { ...powers }; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard();
    window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblin'], kind: 'boss' }); }, [cls, powers]);
  for (let i = 0; i < 160; i++) { await pump(0.5); if (await p.evaluate(() => { const B = window.QD.B3?.battleState; return !!B?.bw && !!B.hud?.place && !B.starting && !B.busy; })) break; }
  await p.evaluate(() => { const { B3, E, S } = window.QD; const B = B3.battleState; B.b.board = E.rollBoard(S.hero, E.makeRng(5)); B.b.phase = 'shape'; B.b.magic = 12; B.b.hp = Math.round(B.b.maxHp / 2); B.b.usedRound = {}; B.b.charge = { ...(B.b.charge || {}), rally: 2, ballad: 2, goldhymn: 2, volley: 2, coil: 2 }; B.busy = false; B3.renderShape(); });
  await p.locator('.b3-powers:not(.b3-team)').first().click(); await pump(1.2);
  await p.waitForTimeout(600); const roles = await p.evaluate(() => [...document.querySelectorAll('.b3-sheet.open .mc-tile')].map((t) => `${t.querySelector('.mc-tile-name')?.textContent}=${t.dataset.r1}/${t.dataset.r2}`));
  console.log(tag, JSON.stringify(roles));
  const want = WANT[tag] + ',Potion=heal/heal,Heal=heal/heal,Heart Change=util/util'; check(`${tag} ${vw}x${vh}: tile roles`, roles.join() === want, roles.join());
  const look = await p.evaluate(() => [...document.querySelectorAll('.b3-sheet.open .mc-tile')].map((t) => { const cs = getComputedStyle(t); const bg = cs.backgroundImage; return { split: t.classList.contains('split'), two: t.dataset.r1 !== t.dataset.r2, seam: bg.includes('120deg'), white: (getComputedStyle(t.querySelector('.mc-cost')).color === 'rgb(255, 255, 255)' && getComputedStyle(t.querySelector('.mc-cost .p')).fill === 'rgb(255, 255, 255)') || t.querySelector('.mc-cost.free') }; }));
  check(`${tag} ${vw}x${vh}: two-role tiles split with a seam, single-role solid, white cost`, look.every((l) => l.split === l.two && l.seam === l.two && l.white), JSON.stringify(look));
  const fit = await p.evaluate(() => ({ sh: document.scrollingElement.scrollHeight, vh: innerHeight })); check(`${tag} ${vw}x${vh}: no scroll`, fit.sh === fit.vh, JSON.stringify(fit));
  await p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17, .pw-pop').forEach((t) => t.remove()));
  await p.screenshot({ path: `${OUT}/${tag}_${vw}x${vh}.png` }); await p.locator('.b3-sheet.open .mc-grid').screenshot({ path: `${OUT}/${tag}_${vw}x${vh}_grid.png` });
  await p.close();
}
}
check('no page errors', !errsAll.length, JSON.stringify(errsAll)); await br.close(); server.kill(); process.exit(bad ? 1 : 0);
