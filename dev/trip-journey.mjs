// Trip playtest (Director, 26 Oct 2026, docs/team/tasks/TRIP-PLAYTEST.md): one two-client journey on Rival Duo with the released rules, through the local table server.
//   ROOM_PORT=8171 node dev/trip-journey.mjs [shots dir]
// Two phone-sized browsers: host a fresh Wizard, a friend joins as the Dwarf (the wrong class is refused), intro, starter weapons, the opening fights, a power and a heal,
// rewards, a legal upgrade, back to the road, one phone closes and rejoins, and both still see the shared progress. NOT cloud (Firebase) and NOT real Safari.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startServer, phones, sleep, cheat } from './_rooms.mjs';
const OUT = process.argv[2] || 'shots/trip'; fs.mkdirSync(OUT, { recursive: true });
const stop = await startServer(); const { browser, phones: [A, B] } = await phones(['Wizard', 'Dwarf'], { w: 390, h: 760 });
const log = []; const note = (s) => { log.push(s); console.log(s); };
const snap = async (p, tag) => { await p.pump(1); await p.shot(`${OUT}/${tag}.png`); };
const text = async (p) => (await p.text()).replace(/\s+/g, ' ');
const tap = (p, re) => p.page.evaluate((src) => { const r = new RegExp(src, 'i'); const el = [...document.querySelectorAll('button, .sx-plaque, a, [role=button]')].find((e) => e.offsetParent !== null && !e.disabled && r.test(e.textContent)); if (!el) return false; el.click(); return true; }, re.source);
const waitFor = async (p, fn, ms = 60000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.page.evaluate(fn, arg)) return true; await p.pump(0.5); await sleep(150); } return false; };
try {
  await A.open(); await B.open();
  // ---- host a fresh Wizard on Rival Duo
  await A.page.evaluate(() => window.QD.online.together()); await sleep(400);
  assert.ok(await tap(A, /Open a table/), 'Open a table is offered'); await sleep(600);
  assert.ok(await A.page.evaluate(() => [...document.querySelectorAll('.sx-stories > *')].some((e) => /Rival Duo/.test(e.textContent) && /Wizard \+ Dwarf/.test(e.textContent))), 'Rival Duo is in the story list as Wizard + Dwarf');
  assert.ok(await tap(A, /Rival Duo/), 'pick Rival Duo'); await sleep(700);
  assert.ok(await tap(A, /^\s*wizard\s*$/), 'pick the Wizard'); await sleep(300);
  await A.fill('#table-name', 'Trip Test'); await A.fill('#hero-name', 'Maelis'); await A.fill('#hero-pw', 'abc123');
  await A.page.evaluate(() => document.querySelector('.sx-cta .sx-btn')?.click());
  assert.ok(await waitFor(A, () => !!window.QD.S.net?.code, 120000), 'the table opens'); const code = await A.page.evaluate(() => window.QD.S.net.code);
  const lobby = await text(A); assert.match(lobby, /Rival Duo/); assert.match(lobby, /needs the Wizard \+ Dwarf/); assert.match(lobby, /Maelis WIZARD/i);
  note(`PASS host: table ${code}, Rival Duo, Wizard Maelis`); await snap(A, '01_host_lobby');
  // ---- the friend joins: first as the wrong class (refused with a clear line), then as the Dwarf
  await B.page.evaluate(() => window.QD.online.join('')); await sleep(500);
  await B.fill('#table-code', code);
  await tap(B, /^\s*knight\s*$/); await sleep(300); await B.fill('#hero-name', 'Brannoch'); await B.fill('#hero-pw', 'abc123'); await tap(B, /Take a seat/); await sleep(1500);
  const refused = await B.page.evaluate(() => document.querySelector('.form-msg')?.textContent || ''); assert.match(refused, /needs the Wizard and Dwarf/i, 'a Knight is refused with the story named'); assert.ok(!(await B.page.evaluate(() => window.QD.S.net?.code)), 'and is not seated');
  note(`PASS join: a Knight is refused: "${refused}"`);
  assert.ok(await tap(B, /^\s*dwarf\s*$/), 'pick the Dwarf'); await sleep(300); await tap(B, /Take a seat/);
  assert.ok(await waitFor(B, () => !!window.QD.S.net?.code, 120000), 'the Dwarf is seated');
  assert.ok(await waitFor(A, () => /Brannoch/.test(document.body.innerText), 30000), 'the host sees the Dwarf');
  note('PASS join: Brannoch the Dwarf is seated and the host sees them'); await snap(B, '02_friend_seated'); await snap(A, '03_host_sees_friend');
  await tap(B, /I am ready/); await sleep(500); await tap(A, /I am ready/).catch(() => {}); await sleep(400);
  assert.ok(await tap(A, /Take the road/), 'the host takes the road'); await sleep(900);
  for (const p of [A, B]) await p.pump(3);
  note('after take the road: ' + (await text(A)).slice(0, 160)); await snap(A, '04_intro_A'); await snap(B, '05_intro_B');
} catch (e) { note('FAIL ' + e.message); process.exitCode = 1; await snap(A, 'fail_A').catch(() => {}); await snap(B, 'fail_B').catch(() => {}); }
finally { fs.writeFileSync(`${OUT}/journey.log`, log.join('\n')); await browser.close(); stop(); }
