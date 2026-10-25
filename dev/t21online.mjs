// T21: the real online path, two real browser phones, the game's own cloud code against dev/fakecloud.mjs (a stand-in for Firebase: not Firestore, not Safari).
//   node dev/t21online.mjs [label=run] [out=docs/team/tasks/T21]
// Scenarios: (1) two Rangers open and join a table and start: their starting equipment; (2) win a fight with the second phone's live feed stalled, then the
// spoils: the picker passes while the waiting phone's feed is stalled, and we time how long the waiting phone takes to learn it is its turn.
import fs from 'node:fs';
import { bringUp, sleep } from './_cloudphones.mjs';
import { toBoard, battleReady } from './_rooms.mjs';
import { loadTable, saveTable } from '../js/table.js';
import { applyRelease } from '../js/release.js'; applyRelease();
const label = process.argv[2] || 'run'; const OUT = process.argv[3] || 'docs/team/tasks/T21'; fs.mkdirSync(OUT, { recursive: true });
const res = { label, checks: [], timings: {}, notes: [] }; const check = (name, ok, detail) => { res.checks.push({ name, ok: !!ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, detail ?? ''); };
const [W, H] = (process.env.SIZE || '390x664').split('x').map(Number); const { phones: ps, fake, close } = await bringUp(['Dav', 'JP'], { w: W, h: H }); const [a, b] = ps;
const mutate = (code, fn) => { const d = fake.read(`qdRooms/${code}`); const t = loadTable(d.state); fn(t); t.seq += 1; fake.write(`qdRooms/${code}`, { ...d, phase: t.phase, state: saveTable(t), seq: t.seq }); };
const until = async (fn, ms, step = 150) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return Date.now() - t0; await sleep(step); } return null; };
try {
  // (1) the starting equipment, through the real online table
  const code = await (await import('./_cloudphones.mjs')).seat(ps, ['Ranger', 'Ranger']);
  const me = await Promise.all(ps.map((p) => p.me()));
  for (const [i, m] of me.entries()) { check(`${ps[i].name}: Ranger starts with Bronze Arrows left and Bow right, both dice live`, m.NW.id === 'quiver' && m.NE.id === 'bow' && (m.NW.rarity | 0) === 0 && (m.NE.rarity | 0) === 0 && m.dice.includes('NW') && m.dice.includes('NE'), JSON.stringify({ NW: m.NW.id, NE: m.NE.id, dice: m.dice.join('') })); }
  await toBoard(ps); await a.click('.sx-qcard'); await sleep(900);
  for (let i = 0; i < 6; i++) { const ph = (await a.table())?.phase; if (ph === 'battle') break; for (const p of ps) { await p.pump(1); await p.clickText('Continue').catch(() => {}); } await sleep(600); }
  check('both phones reach the battle', (await battleReady(a)) && (await battleReady(b)));
  const board = await Promise.all(ps.map((p) => p.page.evaluate(() => { const b = window.QD.S.battle; const f = b?.fighters?.[window.QD.session.index()]; return { board: Object.keys(b?.board || {}), hasNE: !!b?.board?.NE }; })));
  await a.shot(`${OUT}/online-${label}-battle-a.png`);
  // make the monsters one hit from falling (a test edit of the stored table, as dev/room tests do with the local server's cheat)
  mutate(code, (t) => { for (const e of t.battle.enemies) e.hp = Math.min(e.hp, 1); });
  await b.pause(true); // the second phone's live feed stalls from here on
  const t0 = Date.now();
  for (let r = 0; r < 5; r++) {
    for (const p of ps) { if (await p.page.evaluate(() => !!document.querySelector('#b3-roll'))) { await p.click('#b3-roll'); await sleep(900); await p.pump(5); } }
    for (const p of ps) { if (await p.page.evaluate(() => !!document.querySelector('#b3-lock') && !document.querySelector('#b3-lock').disabled)) { await p.click('#b3-lock'); await sleep(900); await p.pump(2); } }
    await sleep(1200); await a.pump(10); if ((await a.table())?.phase === 'victory') break;
  }
  const aVic = await until(async () => (await a.table())?.phase === 'victory', 20000);
  check('the phone that locked last sees victory', aVic != null);
  const bVic = await until(async () => { await b.pump(0.3); return (await b.table())?.phase === 'victory'; }, 15000);
  res.timings.victoryOnStalledPhoneMs = bVic; check('the phone whose live feed is stalled still learns of the victory (locked-in fallback)', bVic != null, `${bVic} ms`);
  await b.pause(false); await sleep(1500); await a.pump(3); await b.pump(3);
  // (2) the spoils: who picks, and how long does the other phone take to learn it is its turn when its feed is stalled?
  const vic = async (p) => p.page.evaluate(() => { const v = window.QD.session.view()?.victory; return v ? { waiting: v.waiting, picked: v.picked, drops: v.drops?.length } : null; });
  const va = await vic(a); const vb = await vic(b);
  res.notes.push({ spoils: va });
  const pickerPhone = va?.waiting === (await a.me()).name ? a : b; const waiterPhone = pickerPhone === a ? b : a;
  check('there are spoils to choose and one hero is the picker', !!va?.waiting && va.drops > 0, JSON.stringify(va));
  // skip the brag board so it does not cover anything
  for (const p of ps) { await p.send({ type: 'brag-seen' }); }
  await sleep(500);
  const waiterName = (await waiterPhone.me()).name; const waitingOf = (p) => p.page.evaluate(() => window.QD.session.view()?.victory?.waiting ?? null);
  check('before the pass, the waiter sees someone else choosing', (await waitingOf(waiterPhone)) !== waiterName, `${await waitingOf(waiterPhone)}`);
  // the manual stage only moves when pumped: let the victory replay on this phone finish first, so the measurement is of the fetch and not of the replay
  for (let i = 0; i < 40 && await waiterPhone.page.evaluate(() => window.QD.session.holding()); i++) await waiterPhone.pump(1);
  await waiterPhone.pause(true); const readsBefore = (await waiterPhone.stats()).reads;
  const tPass = Date.now(); const sent = await pickerPhone.send({ type: 'pass-loot' }); check('the picker passes (a real command through the cloud transaction)', sent.ok, JSON.stringify(sent));
  const truth = fake.read(`qdRooms/${code}`); check('the stored table now says it is the waiter\'s turn', loadTable(truth.state).rewards.draft && true);
  const learned = await until(async () => { await waiterPhone.pump(0.2); if (process.env.DBG) console.log(Date.now() - tPass, await waiterPhone.page.evaluate(() => ({ held: window.QD.session.holding(), seq: window.QD.session.current()?.seq, w: window.QD.session.view()?.victory?.waiting })), loadTable(fake.read(`qdRooms/${code}`).state).seq); return (await waitingOf(waiterPhone)) === waiterName; }, 15000, 200);
  res.timings.waiterLearnsItIsItsTurnMs = learned; res.timings.waiterReadsWhileWaiting = (await waiterPhone.stats()).reads - readsBefore;
  check('the waiting phone, feed stalled, learns it is its turn to choose (within 6 s)', learned != null && learned <= 6000, learned == null ? 'never within 15 s' : `${learned} ms`);
  await waiterPhone.shot(`${OUT}/online-${label}-waiter.png`);
  // (3) the spoils picker on that phone: tapping a spoils card opens the full card, and looking changes nothing
  const mine0 = JSON.stringify(await waiterPhone.me()); await waiterPhone.pump(2);
  for (let i = 0; i < 4 && !(await waiterPhone.page.evaluate(() => !!document.querySelector('.loot-row'))); i++) { await waiterPhone.clickText('Continue').catch(() => {}); await sleep(500); await waiterPhone.pump(2); } // the reveal comes first, on this phone's own Continue
  await waiterPhone.shot(`${OUT}/online-${label}-spoils.png`);
  const spoils = await waiterPhone.page.evaluate(() => { const t = [...document.querySelectorAll('.loot-row [role=button]')].filter((e) => e.offsetParent); return { n: t.length, hint: !!document.querySelector('.loot-row .cw-hint') }; });
  check('the online spoils picker lists cards that open large (with a hint saying so)', spoils.n > 0 && spoils.hint, JSON.stringify(spoils));
  await waiterPhone.page.evaluate(() => [...document.querySelectorAll('.loot-row [role=button]')].find((e) => e.offsetParent)?.click()); await sleep(500);
  const big = await waiterPhone.page.evaluate(() => { const m = document.querySelector('.cw-modal .cw-big'); const c = [...document.querySelectorAll('.cw-modal button')].find((x) => /close/i.test(x.textContent)); const q = c?.getBoundingClientRect(); return { open: !!m, faces: document.querySelectorAll('.cw-modal .f13').length, closeBottom: q ? Math.round(q.bottom) : null, vh: innerHeight }; });
  check('tapping a spoils card online opens the full card with its faces, and Close is on screen', big.open && big.faces >= 4 && big.closeBottom != null && big.closeBottom <= big.vh, JSON.stringify(big));
  await waiterPhone.shot(`${OUT}/online-${label}-spoils-card.png`);
  await waiterPhone.page.evaluate(() => [...document.querySelectorAll('.cw-modal button')].find((x) => /close/i.test(x.textContent))?.click()); await sleep(400);
  check('looking at a spoils card changed nothing', JSON.stringify(await waiterPhone.me()) === mine0 && !!(await waitingOf(waiterPhone)));
} catch (e) { check('script ran to the end', false, e.stack?.split('\n').slice(0, 3).join(' | ')); }
finally { res.errors = Object.fromEntries(ps.map((p) => [p.name, p.errors])); fs.writeFileSync(`${OUT}/online-${label}.json`, JSON.stringify(res, null, 1)); await close(); }
console.log(JSON.stringify(res.timings));
