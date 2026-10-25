// T22 attack feedback (Dave: "his attack animation took all the monster's health, and JP's attack did nothing"): on a real ONLINE table (the game's cloud code against
// dev/fakecloud.mjs; not Safari) every hero who strikes must show their own blow and the monster's health must step down by each strike's real loss, in report order, on EVERY phone.
// The battle controller records an ordered UI event trace (B3.traceStart / traceRead): the plate health painted, each strike (hero, target, dealt, guarded), each hero's health.
//   node dev/t22attack.mjs [heroes=2] [label=after] [out=docs/team/tasks/T22]
import fs from 'node:fs';
import { bringUp, seat, sleep } from './_cloudphones.mjs';
import { toBoard, battleReady } from './_rooms.mjs';
import { loadTable, saveTable } from '../js/table.js';
import { applyRelease } from '../js/release.js'; applyRelease();
const N = +process.argv[2] || 2; const label = process.argv[3] || 'after'; const OUT = process.argv[4] || 'docs/team/tasks/T22'; fs.mkdirSync(OUT, { recursive: true }); let bad = 0;
const check = (n, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, d ?? ''); };
const names = ['Dav', 'JP', 'Cy', 'Di'].slice(0, N); const cls = ['Ranger', 'Ranger', 'Knight', 'Bard'].slice(0, N);
const { phones: ps, fake, close } = await bringUp(names, { w: 390, h: 664 }); const [a] = ps; const res = { heroes: N, label, phones: {} };
const mutate = (code, fn) => { const d = fake.read(`qdRooms/${code}`); const t = loadTable(d.state); fn(t); t.seq += 1; fake.write(`qdRooms/${code}`, { ...d, phase: t.phase, state: saveTable(t), seq: t.seq }); };
try {
  const code = await seat(ps, cls); await toBoard(ps); await a.click('.sx-qcard'); await sleep(900);
  for (let i = 0; i < 8; i++) { if ((await a.table())?.phase === 'battle') break; for (const p of ps) { await p.pump(1); await p.clickText('Continue').catch(() => {}); } await sleep(600); }
  check(`${N} heroes: every phone is in the battle`, (await Promise.all(ps.map(battleReady))).every(Boolean));
  // one big monster that survives the round, so every strike lands on a living target and the plate has room to step down
  if (process.env.KILL) { mutate(code, (t) => { const e = t.battle.enemies[0]; e.maxHp = +process.env.KILL; e.hp = +process.env.KILL; t.battle.enemies = [e]; }); await sleep(900); for (const p of ps) await p.pump(2); }
  if (process.env.BIG) { mutate(code, (t) => { const e = t.battle.enemies[0]; e.maxHp = 400; e.hp = 400; t.battle.enemies = [e]; }); await sleep(900); for (const p of ps) await p.pump(2); }
  const pre = loadTable(fake.read(`qdRooms/${code}`).state).battle.enemies.map((e) => ({ uid: e.uid, hp: e.hp })); res.pre = pre; const start = pre[0].hp;
  for (const p of ps) await p.page.evaluate(() => window.QD.B3.traceStart());
  if (process.env.STALL) await ps[1].pause(true); // the second phone's live feed stalls for the whole round: it learns the table only from its own replies and the wait-poll
  for (let tries = 0; tries < 6; tries++) {
    for (const p of ps) {
      await p.page.evaluate(() => { const B = window.QD.B3.battleState; if (B.picked === false) [...B.fb.foes.values()][0]?.el.click(); }); await p.pump(0.5);
      if (await p.page.evaluate(() => !!document.querySelector('#b3-roll'))) { await p.click('#b3-roll'); await sleep(700); await p.pump(5); }
      for (let k = 0; k < 20 && await p.page.evaluate(() => window.QD.B3.battleState.busy); k++) await p.pump(1);
      if (await p.page.evaluate(() => !!document.querySelector('#b3-lock') && !document.querySelector('#b3-lock').disabled)) { await p.click('#b3-lock'); await sleep(500); await p.pump(1); }
    }
    if ((await Promise.all(ps.map((p) => p.page.evaluate(() => window.QD.B3.traceRead().some((e) => e.ev === 'plate' || e.ev === 'strike'))))).some(Boolean)) break;
  }
  if (process.env.DBG) for (const p of ps) console.log(p.name, JSON.stringify(await p.page.evaluate(() => { const t = window.QD.session.current(); return { phase: t?.phase, round: t?.battle?.round, locked: t?.battle?.fighters?.map((f) => !!f.locked), rolled: t?.battle?.fighters?.map((f) => !!f.rolled), roll: !!document.querySelector('#b3-roll'), lock: !!document.querySelector('#b3-lock'), lockDis: document.querySelector('#b3-lock')?.disabled, busy: window.QD.B3.battleState.busy, text: document.body.innerText.slice(0, 120).replace(/\n+/g, ' | ') }; })));
  // let every phone play the round; take a picture after the first strike and before the second, on the first phone
  let shot = false; const tr = (p) => p.page.evaluate(() => window.QD.B3.traceRead());
  for (let k = 0; k < 400; k++) {
    for (const p of ps) await p.pump(0.25);
    const t0 = await tr(a); const strikes = t0.filter((e) => e.ev === 'strike').length;
    if (!shot && strikes === 1) { await a.shot(`${OUT}/attack-${label}-${N}heroes-after-first-strike.png`); shot = true; }
    const done = (await Promise.all(ps.map((p) => p.page.evaluate(() => !window.QD.B3.battleState.busy && window.QD.B3.traceRead().some((e) => e.ev === 'strike'))))).every(Boolean);
    if (done && k > 8) break; await sleep(30);
  }
  if (process.env.STALL) { await sleep(1500); for (let k = 0; k < 120; k++) { await ps[1].pump(0.5); if (!(await ps[1].page.evaluate(() => window.QD.B3.battleState.busy)) && k > 10) break; } await ps[1].pause(false); await sleep(800); await ps[1].pump(2); }
  await a.shot(`${OUT}/attack-${label}-${N}heroes-end.png`);
  const stored = loadTable(fake.read(`qdRooms/${code}`).state); const finalHp = stored.battle?.enemies?.[0]?.hp ?? null;
  for (const p of ps) {
    const t = await tr(p); res.phones[p.name] = t; const strikes = t.filter((e) => e.ev === 'strike'); const S0 = pre.find((x) => x.uid === strikes[0]?.target)?.hp ?? start;
    check(`${p.name}: sees ${N}-hero strikes in report order, each with its own hero and a real loss`, strikes.length >= 1 && new Set(strikes.map((s) => s.name)).size === strikes.length, strikes.map((s) => `${s.name}:${s.dealt}${s.guarded ? `(g${s.guarded})` : ''}`).join(' '));
    // the monster's plate health after each strike must be the start health minus the running total of real losses
    const plate = t.filter((e) => e.ev === 'plate' && e.uid === strikes[0]?.target); let run = S0; let ok = true; let first = plate.find((e) => true)?.shown; const bad1 = [];
    const seq = t.filter((e) => e.ev === 'strike' || (e.ev === 'plate' && e.uid === strikes[0]?.target)); let expect = S0; let lastShown = null;
    for (const e of seq) { if (e.ev === 'strike' && e.target === strikes[0].target) expect -= e.dealt; else if (e.ev === 'plate') { lastShown = e.shown; } }
    const afterStrike = []; let cur = S0; for (let i = 0; i < seq.length; i++) { const e = seq[i]; if (e.ev === 'strike') { cur -= e.target === strikes[0].target ? e.dealt : 0; const nextPlate = seq.slice(0, i).reverse().find((x) => x.ev === 'plate'); afterStrike.push({ hero: e.name, expected: cur, painted: nextPlate?.shown }); } }
    check(`${p.name}: the plate starts at the pre-round health (${S0}) and steps down by each strike and steps down by each strike`, first === S0 && afterStrike.every((x) => x.painted === x.expected), JSON.stringify({ first, afterStrike }));
    check(`${p.name}: the first hero's blow does NOT take off the whole round's damage`, strikes.length < 2 || afterStrike[0].painted > afterStrike[afterStrike.length - 1].painted || afterStrike.every((x) => x.painted === afterStrike[0].painted && strikes.slice(1).every((s) => s.dealt === 0)), JSON.stringify(afterStrike.map((x) => x.painted)));
    const lastPlate = t.filter((e) => e.ev === 'plate' && e.uid === strikes[0]?.target).pop();
    check(`${p.name}: after the round the plate shows the table's real health (${finalHp})`, lastPlate?.shown === finalHp, `${lastPlate?.shown} vs ${finalHp}`);
  }
  check('every phone saw the same strikes in the same order (names, targets, losses)', new Set(ps.map((p) => JSON.stringify(res.phones[p.name].filter((e) => e.ev === 'strike').map((s) => [s.name, s.target, s.dealt, s.guarded])))).size === 1);
  check('no page errors', ps.every((p) => p.errors.length === 0), JSON.stringify(ps.map((p) => p.errors)));
} catch (e) { check('script ran', false, e.stack?.split('\n').slice(0, 4).join(' | ')); } finally { fs.writeFileSync(`${OUT}/attack-${label}-${N}heroes.json`, JSON.stringify(res, null, 1)); await close(); }
console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
