// Heart Change: safe preview, confirmation and the real visible 3D turn.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const OUT = process.argv[2] || '/workspace/heart-preview';
const port = +(process.argv[3] || 8202);
fs.mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, detail = '') => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', name, detail); };
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise(resolve => server.stdout.once('data', resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
try {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); });
  await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`);
  await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
  const pump = s => p.evaluate(async s => { for (let i = 0; i < Math.ceil(s * 30); i++) { window.QD.world.stage.simulate(1 / 30, 1 / 30); await new Promise(r => setTimeout(r, 0)); } }, s);
  await p.evaluate(async () => {
    const { S, E, showBoard } = window.QD;
    const hero = E.newHero({ name: 'HeartPreview', cls: 'knight', seed: 5 }); hero.level = 9;
    S.hero = hero; S.company = { members: [hero] };
    const SV = await import('./js/save.js'); if (!SV.heroExists(hero.name)) await SV.createSave(hero, 'testpass');
    showBoard(); window.QD.startQuest({ ...E.questsFor(hero)[0], enemies: ['goblin'], kind: 'boss' });
  });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) { await pump(.5); if (await p.evaluate(() => { const B = window.QD.B3?.battleState; return !!B?.hud?.place && !B.starting && !B.busy; })) break; await p.waitForTimeout(50); }
  await p.waitForFunction(() => !!window.QD.B3?.battleState?.hud?.place && !window.QD.B3.battleState.starting, null, { timeout: 1000 });
  await p.evaluate(() => {
    window.heartTurnCalls = [];
    const tray = window.QD.B3.battleState.bw.tray, setValue = tray.setValue.bind(tray);
    tray.setValue = (slot, value, options) => { window.heartTurnCalls.push({ slot, value, animate: options?.animate }); return setValue(slot, value, options); };
  });
  const fixture = async (face = 3, magic = 12) => {
    await p.evaluate(({ face, magic }) => {
      const { B3, E } = window.QD, B = B3.battleState, b = B.b;
      B.busy = false; B.sheetOpen = false; B.hud.sheet.classList.remove('open');
      b.board = E.rollBoard(B.hero, E.makeRng(5)); b.board.C.v = face; b.board.nudged = false; b.phase = 'shape'; b.magic = magic;
      B.bw.tray.show(b.board); B.bw.tray.setWaiting(false);
      for (const slot of ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE']) B.bw.tray.setDimmed(slot, !E.isActive(B.hero, slot));
      window.heartTurnCalls = []; B3.renderShape();
    }, { face, magic });
    await pump(.1);
    await p.locator('.b3-powers:not(.b3-team)').first().click();
    await p.locator('.mc-tile[data-power="u:heart"]').click();
    await p.waitForTimeout(300);
  };
  const state = () => p.evaluate(() => { const B = window.QD.B3.battleState, mesh = B.bw.tray.diceMeshes.C; return { face: B.b.board.C.v, magic: B.b.magic, nudged: !!B.b.board.nudged, busy: B.busy, open: B.sheetOpen, turning: B.root.dataset.heartTurning || '', q: mesh.quaternion.toArray(), visible: mesh.visible, calls: window.heartTurnCalls.length }; });
  const qDifferent = (a, b) => 1 - Math.abs(a.reduce((n, v, i) => n + v * b[i], 0)) > .0001;
  const selectedRing = dir => p.evaluate(dir => { const ring = document.querySelector('.mc-heart-rings').getBoundingClientRect(); const face = document.querySelector(dir ? `.mc-heart-outcome[data-direction="${dir}"] .hc-face` : '.mc-heart-current .hc-face').getBoundingClientRect(); return Math.abs((ring.top + ring.bottom - face.top - face.bottom) / 2) < 1; }, dir);
  const settleRing = dir => p.waitForFunction(dir => { const ring = document.querySelector('.mc-heart-rings')?.getBoundingClientRect(); const face = document.querySelector(dir ? `.mc-heart-outcome[data-direction="${dir}"] .hc-face` : '.mc-heart-current .hc-face')?.getBoundingClientRect(); return ring && face && Math.abs((ring.top + ring.bottom - face.top - face.bottom) / 2) < 1; }, dir, { timeout: 5000 });
  const draw = () => p.evaluate(() => window.QD.world.stage.renderNow());
  for (const [width, height] of [[390, 844], [375, 667]]) {
    await p.setViewportSize({ width, height }); await fixture();
    check(`Vertical higher/current/lower faces and rings at current ${width}`, await p.evaluate(() => { const up = document.querySelector('.mc-heart-outcome[data-direction="1"]').getBoundingClientRect(), cur = document.querySelector('.mc-heart-current').getBoundingClientRect(), down = document.querySelector('.mc-heart-outcome[data-direction="-1"]').getBoundingClientRect(); return up.bottom < cur.top && cur.bottom < down.top && document.querySelector('.mc-heart-use').disabled; }) && await selectedRing(0));
    await p.screenshot({ path: `${OUT}/current-${width}.png` });
    await p.locator('.hc-up').click(); await p.waitForTimeout(150);
    check(`Rings animate toward preview without paying ${width}`, await p.evaluate(() => document.querySelector('.mc-heart-rings').getAnimations().some(a => a.transitionProperty === 'top')) && (await state()).magic === 12 && (await state()).face === 3);
    await settleRing(1);
    check(`Up preview selects higher face and leaves die unchanged ${width}`, await selectedRing(1) && (await state()).face === 3 && !(await state()).nudged && !(await p.locator('.mc-heart-use').isDisabled()));
    await p.locator('.hc-down').click(); await settleRing(-1);
    check(`Down preview can replace Up without paying ${width}`, await selectedRing(-1) && (await state()).magic === 12 && (await state()).face === 3);
    await p.locator('.hc-up').click(); await settleRing(1);
    await p.screenshot({ path: `${OUT}/selected-${width}.png` });
    const before = await state();
    await p.evaluate(() => { const button = document.querySelector('.mc-heart-use'); button.click(); button.click(); });
    const start = await state();
    check(`Use pays exactly once, closes card and begins visible turn ${width}`, start.face === 4 && start.magic === 9 && start.nudged && !start.open && start.busy && start.turning === '3:4' && start.calls === 1 && start.visible);
    await pump(.16); const mid = await state();
    check(`Physical heart die rotates in battle ${width}`, mid.busy && qDifferent(before.q, mid.q));
    await draw(); await p.screenshot({ path: `${OUT}/turning-${width}.png` });
    await pump(.65); const done = await state();
    check(`Turn settles on desired face and unlocks battle controls ${width}`, done.face === 4 && done.magic === 9 && !done.busy && !done.turning && qDifferent(before.q, done.q));
    await draw(); await p.screenshot({ path: `${OUT}/turned-${width}.png` });
    await p.locator('.b3-powers:not(.b3-team)').first().click();
    check(`Used Heart tile shows its stamp and explains its duration ${width}`,await p.evaluate(()=>{const t=document.querySelector('.mc-tile[data-power="u:heart"]');return t.classList.contains('spent')&&t.querySelector('.mc-spent-tag')?.textContent==='USED'&&t.getAttribute('aria-label').includes('used this round')&&!t.disabled;}));
    await p.locator('.mc-tile[data-power="u:heart"]').click(); await p.locator('.hc-down').click();
    check(`Once-per-round Use stays disabled after a turn ${width}`, await p.locator('.mc-heart-use').isDisabled() && (await state()).magic === 9);
    check(`Card still fits without scrolling ${width}`, await p.evaluate(() => { const r = document.querySelector('.mc-card').getBoundingClientRect(); return r.bottom <= innerHeight + 1 && document.scrollingElement.scrollHeight === innerHeight; }));
  }
  await fixture(); await p.locator('.hc-up').click(); await p.locator('.b3-sheet.open .sh-x').click();
  check('Close cancels preview without spending or turning', (await state()).face === 3 && (await state()).magic === 12 && (await state()).calls === 0);
  await fixture(); await p.locator('.hc-up').click(); await p.locator('.mc-tile[data-power="u:heal"]').click(); await p.locator('.mc-tile[data-power="u:heart"]').click();
  check('Switching cards discards the unconfirmed choice', await p.locator('.mc-heart-use').isDisabled() && (await state()).face === 3 && (await state()).magic === 12);
  await fixture(4); await p.locator('.hc-down').click(); await p.locator('.mc-heart-use').click(); await pump(.85);
  check('Use also confirms a lower face', (await state()).face === 3 && (await state()).magic === 9);
  for (const face of [1, 6]) { await fixture(face); check(`Boundary ${face} blocks only impossible preview`, await p.locator('.hc-down').isDisabled() === (face === 1) && await p.locator('.hc-up').isDisabled() === (face === 6)); }
  await fixture(3, 1); await p.locator('.hc-up').click();
  check('Unaffordable previews are safe; Use is disabled', await p.locator('.mc-heart-use').isDisabled() && (await state()).magic === 1 && (await state()).face === 3);
  await fixture(); await p.locator('.hc-up').click(); await p.evaluate(() => { window.QD.B3.battleState.b.magic = 1; }); await p.locator('.mc-heart-use').click(); await pump(.1);
  check('Use rechecks affordability before committing', (await state()).open && (await state()).face === 3 && (await state()).magic === 1 && (await state()).calls === 0);
  await fixture(); await p.locator('.hc-up').click(); await p.evaluate(() => { window.QD.B3.battleState.b.board.C.v = 4; }); await p.locator('.mc-heart-use').click(); await pump(.1);
  check('A stale preview cannot change a different face', (await state()).open && (await state()).face === 4 && (await state()).magic === 12 && (await state()).calls === 0);
  await fixture(); await p.locator('.hc-up').click(); await p.evaluate(() => { window.QD.B3.battleState.b.round++; }); await p.locator('.mc-heart-use').click(); await pump(.1);
  check('A stale preview cannot turn a die in another round', (await state()).face === 3 && (await state()).magic === 12 && (await state()).calls === 0);
  await fixture(); await p.locator('.hc-up').click(); await p.evaluate(() => { const B=window.QD.B3.battleState; window.originalHeartHero=B.hero; B.hero={...B.hero,name:'DifferentPreviewHero'}; }); await p.locator('.mc-heart-use').click(); await pump(.1);
  check('A stale preview cannot act for another hero', (await state()).face === 3 && (await state()).magic === 12 && (await state()).calls === 0);
  await p.evaluate(() => { window.QD.B3.battleState.hero=window.originalHeartHero; });
  await p.emulateMedia({ reducedMotion: 'reduce' }); await fixture(); await p.locator('.hc-up').click();
  check('Reduced-motion ring selection is immediate', await selectedRing(1));
  await p.locator('.mc-heart-use').click(); await pump(.05);
  check('Reduced motion confirms without animated rotation', (await state()).face === 4 && (await state()).magic === 9 && !(await state()).busy && await p.evaluate(() => window.heartTurnCalls[0]?.animate === false));
  await p.emulateMedia({reducedMotion:'no-preference'}); await fixture(3,10);
  await p.evaluate(()=>{const {E,B3}=window.QD;const b=B3.battleState.b;E.castPower(b,'cleave',{x:3});E.castPower(b,'riposte');E.castPower(b,'rally');E.nudge(b,1);B3.renderShape();});
  check('Actual casts mark round powers, Charge and Heart as spent',await p.evaluate(()=>['cleave','riposte','rally','u:heart'].every(id=>document.querySelector(`.mc-tile[data-power="${id}"]`).classList.contains('spent'))));
  check('Heal and Potion are not marked used merely because unavailable',await p.evaluate(()=>['u:heal','u:bigheal'].every(id=>!document.querySelector(`.mc-tile[data-power="${id}"]`).classList.contains('spent'))));
  for(const [width,height] of [[390,844],[375,667]]){await p.setViewportSize({width,height});await p.screenshot({path:`${OUT}/spent-${width}.png`});}
  const castMagic=(await state()).magic;await p.locator('.mc-tile[data-power="cleave"]').click();
  check('Spent card remains inspectable without another cast',await p.locator('.mc-card[data-card="cleave"]').count()===1&&(await state()).magic===castMagic&&await p.locator('.mc-ctl .mc-use.go').isDisabled());
  await p.evaluate(()=>{const {E,B3}=window.QD;E.beginReset(B3.battleState.b);B3.renderShape();});
  check('Next round clears every-round and Heart spent marks',await p.evaluate(()=>['cleave','riposte','rally','u:heart'].every(id=>!document.querySelector(`.mc-tile[data-power="${id}"]`).classList.contains('spent'))));
  await p.evaluate(()=>{const {E,B3}=window.QD;const B=B3.battleState;B.hero.gold=999;E.learnPower(B.hero,'judgment');E.equipPower(B.hero,'judgment');B.b.round=3;B.b.magic=20;E.castPower(B.b,'judgment');B3.renderShape();});
  check('One-battle power gets a battle-length spent mark',await p.evaluate(()=>{const t=document.querySelector('.mc-tile[data-power="judgment"]');return t.classList.contains('spent')&&t.getAttribute('aria-label').includes('used this battle');}));
  await p.evaluate(()=>{const {E,B3}=window.QD;E.beginReset(B3.battleState.b);B3.renderShape();});
  check('A new round does not restore a one-battle power',await p.evaluate(()=>document.querySelector('.mc-tile[data-power="judgment"]').classList.contains('spent')));
  await p.evaluate(()=>{const {E,B3}=window.QD;const B=B3.battleState;B.b=E.newBattle(B.hero,B.quest,E.makeRng(7));B.b.magic=0;B3.renderShape();});
  check('A fresh battle restores one-battle powers even with no magic',await p.evaluate(()=>!document.querySelector('.mc-tile[data-power="judgment"]').classList.contains('spent')));
  check('No page errors', !errors.length, errors.join(' | '));
} finally { await browser.close(); server.kill(); }
process.exitCode = bad ? 1 : 0;
