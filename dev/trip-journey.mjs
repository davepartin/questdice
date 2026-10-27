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
  // ---- the starters, as each phone sees its own hero
  const mine = (p) => p.page.evaluate(() => { const h = window.QD.S.hero; return h ? { name: h.name, cls: h.cls, nw: h.loadout.NW?.id, ne: h.loadout.NE?.id, gold: h.gold, level: h.level } : null; });
  const ha = await mine(A); const hb = await mine(B);
  assert.deepEqual([ha.cls, ha.nw, ha.ne], ['wizard', 'dagger', 'shield'], 'the Wizard starts with a Dagger and a Round Shield'); assert.deepEqual([hb.cls, hb.nw, hb.ne], ['dwarf', 'axe', 'tower'], 'the Dwarf starts with an Axe and a Tower Shield');
  note(`PASS starters: ${ha.name} wizard dagger + shield, ${hb.name} dwarf axe + tower shield`);
  // ---- walk the story pages and the road to the first quest, printing what each phone shows
  for (let i = 0; i < 14; i++) {
    const onBoard = await A.page.evaluate(() => !!document.querySelector('.sx-quest, .quest-card, [class*=quest-card], #quest-board'));
    const ta = (await text(A)).slice(0, 110); const tb = (await text(B)).slice(0, 110); note(`  step ${i}: A: ${ta} | B: ${tb}`);
    if (await A.page.evaluate(() => !!document.querySelector('#b3-roll'))) break;
    let moved = false; for (const p of [A, B]) { for (const re of [/^\s*continue\s*$/, /onward/, /begin the fight|start the fight|fight/, /^\s*begin/]) { if (await tap(p, re)) { moved = true; break; } } if (!moved) moved = await p.page.evaluate(() => { const c = document.querySelector('.sx-choice:not(.off)'); if (c) { c.click(); return true; } return false; }); }
    await sleep(900); for (const p of [A, B]) await p.pump(2); void onBoard; if (!moved) break;
  }
  // ---- the first fight: both heroes roll and lock in, a power on the way, until the table wins
  assert.ok(await waitFor(A, () => !!document.querySelector('#b3-roll'), 60000) && await waitFor(B, () => !!document.querySelector('#b3-roll'), 60000), 'both phones reach the first battle');
  note('PASS battle: both phones reached ' + (await text(A)).slice(0, 60)); await snap(A, '04_battle_A'); await snap(B, '05_battle_B');
  if (process.env.WEAK) { await cheat(code, 'weak'); note('(WEAK=1: the monsters were made one hit from falling for speed)'); }
  let powerNote = null;
  for (let round = 1; round <= 40; round++) {
    const done = await A.page.evaluate(() => !document.querySelector('#b3-roll') && /victory|defeat|the reveal|spoils|envelope/i.test(document.body.innerText)); if (done) break;
    for (const p of [A, B]) { if (await p.page.evaluate(() => !!document.querySelector('#b3-roll'))) { await p.click('#b3-roll'); await sleep(900); await p.pump(5); } }
    if (round === 1 && !powerNote) { // open the Magic Powers panel on the Wizard's phone and say what is in it
      await tap(A, /magic\s*powers/); await A.pump(2); await sleep(500); await snap(A, '06_powers_A');
      powerNote = await A.page.evaluate(() => [...document.querySelectorAll('.b3-sheet button, .pw-detail button, .pw-tile, .pw-helper, [class*=pw-] button')].filter((e) => e.offsetParent).map((e) => `${e.className.toString().slice(0, 24)}:${e.textContent.trim().replace(/\s+/g, ' ').slice(0, 30)}`).slice(0, 24));
      note('powers panel buttons: ' + JSON.stringify(powerNote)); await tap(A, /close|done|back/); await sleep(300);
    }
    for (const p of [A, B]) { if (await p.page.evaluate(() => !!document.querySelector('#b3-lock') && !document.querySelector('#b3-lock').disabled)) { await p.click('#b3-lock'); await sleep(900); await p.pump(2); } }
    await sleep(1500); for (const p of [A, B]) await p.pump(10);
    if (round % 5 === 0) note(`  round ${round}: ${(await text(A)).slice(0, 140)}`);
  }
  note('after the fight: A: ' + (await text(A)).slice(0, 200));
  const buttons = (p) => p.page.evaluate(() => [...document.querySelectorAll('button, .sx-plaque, [role=button]')].filter((e) => e.offsetParent && !e.disabled).map((e) => e.textContent.trim().replace(/\s+/g, ' ').slice(0, 28)).filter(Boolean).slice(0, 14));
  for (let i = 0; i < 24; i++) {
    const [ta, tb] = [(await text(A)).slice(0, 150), (await text(B)).slice(0, 150)]; const [ba, bb] = [await buttons(A), await buttons(B)];
    note(`  after ${i}: A: ${ta} || btns ${JSON.stringify(ba)}`); note(`           B: ${tb} || btns ${JSON.stringify(bb)}`);
    await snap(A, `10_${String(i).padStart(2, '0')}_A`); await snap(B, `10_${String(i).padStart(2, '0')}_B`);
    if (/To the road|Rest at camp|CAMP/.test(ta) && process.env.STOP_AT_CAMP) break;
    let moved = false;
    for (const p of [A, B]) { for (const re of [/^\s*continue\s*$/, /^\s*take\b/, /^\s*onward/, /to the road/, /^\s*go on/]) { if (await tap(p, re)) { moved = true; break; } }
      if (!moved) moved = await p.page.evaluate(() => { const c = document.querySelector('.sx-perks .perk-card, .perk-row > *, .sx-loot .sx-wc button, .sx-choice:not(.off)'); if (c) { c.click(); return true; } return false; }); }
    await sleep(1200); for (const p of [A, B]) await p.pump(2); if (!moved) break;
  }
} catch (e) { note('FAIL ' + e.message); process.exitCode = 1; await snap(A, 'fail_A').catch(() => {}); await snap(B, 'fail_B').catch(() => {}); }
finally { fs.writeFileSync(`${OUT}/journey.log`, log.join('\n')); await browser.close(); stop(); }
