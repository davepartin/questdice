// fs1 (Crockpot / Grok Bot, 29 Oct 2026): the Magic screen fills the phone with no page or panel scroll, for every card hero.
//   CHROME=... node dev/magic-fullscreen.mjs [out=/workspace/magic-fullscreen] [port=8185]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/magic-fullscreen'; const port = +(process.argv[3] || 8185); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'; let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const HEROES = (process.env.HEROES || 'knight:rally').split(';').map((x) => x.split(':'));
for (const [w, hgt] of [[390, 844], [375, 667]]) for (const [cls, ids] of HEROES) {
  const p = await br.newPage({ viewport: { width: w, height: hgt }, deviceScaleFactor: 2, hasTouch: true }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = (s) => p.evaluate(async (s) => { for (let i = 0; i < s * 20; i++) { window.QD.world.stage.simulate(0.05, 0.033); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate(async ([n, cls]) => { const { S, E, showBoard } = window.QD; const hh = E.newHero({ name: n, cls, seed: 5 }); hh.dice = null; hh.level = 9; S.hero = hh; S.company = { members: [hh] }; const SV = await import('./js/save.js'); if (!SV.heroExists(n)) await SV.createSave(hh, 'testpass'); showBoard(); window.QD.startQuest({ ...E.questsFor(hh)[0], enemies: ['goblin'], kind: 'boss' }); }, [`Fs${cls}${w}${hgt}`, cls]);
  for (let i = 0; i < 120; i++) { await pump(0.5); if (await p.evaluate(() => window.QD.B3?.battleState?.bw && !window.QD.B3.battleState.busy)) break; }
  await p.evaluate(() => { const { B3, E, S } = window.QD; const B = B3.battleState; B.b.board = E.rollBoard(S.hero, E.makeRng(5)); B.b.phase = 'shape'; B.b.magic = 8; B.b.usedRound = {}; B.b.charge = { rally: 0 }; B.busy = false; B3.renderShape(); });
  await p.locator('.b3-powers').first().click(); await pump(1.2);
  await p.waitForTimeout(900);
  for (const id of ['', ...ids.split(',')]) {
    if (id) { await p.locator(`.b3-sheet.open .mc-tile[data-power="${id}"]`).click(); await pump(0.6); }
    const m = await p.evaluate(() => { const sh = document.querySelector('.b3-sheet.open'); const r = sh.getBoundingClientRect(); const q = (s) => sh.querySelector(s)?.getBoundingClientRect();
      const scrollers = [document.scrollingElement, sh, ...sh.querySelectorAll('*')].filter((e) => e && e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY) || e === document.scrollingElement && e.scrollHeight > innerHeight + 1).map((e) => (e.className || e.tagName) + ':' + e.scrollHeight + '/' + e.clientHeight);
      const card = q('.mc-card'), tally = q('.pw-tally'), ctl = q('.mc-ctl');
      return { vh: innerHeight, vw: innerWidth, docH: document.scrollingElement.scrollHeight, sheet: [Math.round(r.top), Math.round(r.bottom), Math.round(r.width)], scrollers,
        tallyTop: tally ? Math.round(tally.top) : null, card: card ? [Math.round(card.width), Math.round(card.top), Math.round(card.bottom), Math.round(card.left + card.width / 2)] : null, ctlBottom: ctl ? Math.round(ctl.bottom) : null }; });
    const ok = m.docH === m.vh && m.sheet[0] <= 1 && m.sheet[1] >= m.vh - 1 && !m.scrollers.length && m.tallyTop >= 0 && (!m.card || (m.card[2] <= m.vh && m.card[1] >= m.ctlBottom - 1 && Math.abs(m.card[3] - m.vw / 2) <= 3 && m.card[0] >= (m.vh < 700 ? 200 : 260)));
    check(`${cls} ${w}x${hgt} ${id || 'panel'}: full screen, no scroll, bar visible${id ? ', card big + centred under its buttons' : ''}`, ok, JSON.stringify(m));
    await p.evaluate(() => document.querySelectorAll('#toast > *, .toast, .toast17, .pw-pop').forEach((t) => t.remove()));
    await p.screenshot({ path: `${OUT}/fs1-${cls}-${id || 'panel'}_${w}x${hgt}.png` });
    if(id==='rally') {
      await p.locator('.mc-charge').click(); await pump(.6);
      check('Charging keeps Rally Cry visible and spends one magic',await p.evaluate(()=>document.querySelector('.mc-card[data-card="rally"]') && window.QD.S.battle.charge.rally===1 && window.QD.S.battle.magic===7));
      check('Charge OR Use is exclusive this round',await p.evaluate(()=>[...document.querySelectorAll('.mc-ctl button')].every(b=>b.disabled)));
      await p.evaluate(()=>{window.QD.E.beginReset(window.QD.S.battle);window.QD.B3.renderReset();});
      await p.locator('.b3-powers').first().click();await p.locator('[data-power="rally"]').click();
      check('Next round explains why dice must roll first',await p.locator('.mc-guidance').innerText().then(s=>s.includes('Roll your dice first')));
      await p.screenshot({path:`${OUT}/reset-${w}.png`});
      await p.locator('.mc-back').click(); await p.locator('#b3-roll').click();
      for(let i=0;i<160;i++){await pump(.2);if(await p.evaluate(()=>!window.QD.B3.battleState.busy&&window.QD.S.battle.phase==='shape'))break;}
      await p.locator('.b3-powers').first().click(); await p.locator('[data-power="rally"]').click();
      check('Next round Charge is enabled after the roll',await p.locator('.mc-charge').isEnabled());
      await p.locator('.mc-charge').click();await pump(.6);
      check('Second charge is stored and card stays visible',await p.evaluate(()=>window.QD.S.battle.charge.rally===2 && !!document.querySelector('.mc-card[data-card="rally"]')));
      await p.screenshot({path:`${OUT}/second-charge-${w}.png`});
    }

  }
  check(`${cls} ${w}x${hgt}: no page errors`, !errs.length, errs.join(' | ')); await p.close();
}
await br.close(); server.kill(); console.log(bad ? `${bad} FAILED` : 'ALL PASS'); process.exit(bad ? 1 : 0);
