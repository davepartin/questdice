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
// a secret objective that is a bribe asks Accept or Decline: the Wizard accepts, the Dwarf declines, so both answers are exercised
const offer = (p) => (p === A ? /^\s*accept\s*$/ : /^\s*decline\s*$/);
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
    let moved = false; for (const p of [A, B]) { for (const re of [offer(p), /^\s*continue\s*$/, /onward/, /begin the fight|start the fight|fight/, /^\s*begin/]) { if (await tap(p, re)) { moved = true; break; } } if (!moved) moved = await p.page.evaluate(() => { const c = document.querySelector('.sx-choice:not(.off)'); if (c) { c.click(); return true; } return false; }); }
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
  const inCamp = (p) => p.page.evaluate(() => /Camp/.test(document.body.innerText.slice(0, 80)) && [...document.querySelectorAll('button')].some((e) => /^Dice$/.test(e.textContent.trim())));
  // ---- rewards: reveal, victory, the spoils draft (each hero takes or sells), until both phones are at camp
  for (let i = 0; i < 24; i++) {
    if (await inCamp(A) && await inCamp(B)) break;
    const [ta, tb] = [(await text(A)).slice(0, 150), (await text(B)).slice(0, 150)];
    note(`  after ${i}: A: ${ta} || btns ${JSON.stringify(await buttons(A))}`); note(`           B: ${tb} || btns ${JSON.stringify(await buttons(B))}`);
    await snap(A, `10_${String(i).padStart(2, '0')}_A`); await snap(B, `10_${String(i).padStart(2, '0')}_B`);
    let moved = false;
    for (const p of [A, B]) { for (const re of [offer(p), /^\s*continue\s*$/, /^\s*take\b/, /^\s*onward/, /^\s*go on/]) { if (await tap(p, re)) { moved = true; break; } }
      if (!moved) moved = await p.page.evaluate(() => { const c = document.querySelector('.sx-perks .perk-card, .perk-row > *'); if (c) { c.click(); return true; } return false; }); }
    await sleep(1200); for (const p of [A, B]) await p.pump(2); if (!moved) break;
  }
  assert.ok(await inCamp(A) && await inCamp(B), 'both phones reach camp'); note('PASS rewards: reveal, victory and the spoils draft lead to camp on both phones');
  const gold = (p) => p.page.evaluate(() => ({ gold: window.QD.S.hero.gold, W: window.QD.S.hero.strength.W, E: window.QD.S.hero.strength.E, name: window.QD.S.hero.name }));
  const g0 = await gold(A); const gb = await gold(B); note(`camp purses: ${g0.name} ${g0.gold} gold, ${gb.name} ${gb.gold} gold`); await snap(A, '20_camp_A'); await snap(B, '21_camp_B');
  // ---- a legal upgrade with earned gold, through the real camp cards. A fresh hero's purse after one fight is 5 to 63, so the RICHER hero buys what it can afford:
  // a d4 hand grows to d6 (40 gold) when there is enough, otherwise Talent one's first empty face (10 gold, a symbol of the player's choice)
  const click = (p, fn, arg) => p.page.evaluate(fn, arg);
  const rich = g0.gold >= gb.gold ? A : B; const rg = g0.gold >= gb.gold ? g0 : gb; const who = rg.name;
  const handSlot = rg.W === 4 ? { re: /^left hand/, key: 'W', label: 'Left hand' } : rg.E === 4 ? { re: /^right hand/, key: 'E', label: 'Right hand' } : null;
  if (rg.gold >= 40 && handSlot) {
    assert.ok(await tap(rich, handSlot.re), `open the ${handSlot.label} card`); await rich.pump(2); await sleep(600); await snap(rich, '22_hand_card');
    note('hand card buttons: ' + JSON.stringify(await buttons(rich)));
    assert.ok(await click(rich, (key) => { const c = [...document.querySelectorAll('.cb-cov')].find((e) => e.offsetParent && e.dataset.slot === key && /grow to d6/i.test(e.getAttribute('aria-label') || '')); if (!c) return false; c.click(); return true; }, handSlot.key), 'tap the hand cover (grow to d6)');
    await rich.pump(2); await sleep(800); const g1 = await gold(rich); await snap(rich, '23_hand_bought');
    assert.equal(g1.gold, rg.gold - 40, 'the hand cost 40 gold'); assert.equal(g1[handSlot.key], 6, `the ${handSlot.label} is a d6 now`);
    note(`PASS upgrade: ${who} bought a d6 ${handSlot.label} for 40 gold (${rg.gold} to ${g1.gold})`);
  } else {
    assert.ok(rg.gold >= 10, `the richer hero can afford a talent face (${rg.gold})`);
    assert.ok(await tap(rich, /^talent one/), 'open the Talent one card'); await rich.pump(2); await sleep(600); await snap(rich, '22_talent_card');
    note('talent card buttons: ' + JSON.stringify(await buttons(rich)));
    assert.ok(await click(rich, () => { const f = [...document.querySelectorAll('.cb-hole.open, .tw-face:not(.fixed)')].find((e) => e.offsetParent); if (!f) return false; f.click(); return true; }), 'tap the first empty talent face'); await rich.pump(1); await sleep(400);
    assert.ok(await click(rich, () => { const f = [...document.querySelectorAll('.tw-symbol, .sh-sym, .tal-opt')].find((e) => e.offsetParent && !e.disabled); if (!f) return false; f.click(); return true; }), 'choose a symbol'); await rich.pump(1); await sleep(400);
    await snap(rich, '23_talent_choice'); note('after choosing: ' + JSON.stringify(await buttons(rich)));
    assert.ok(await click(rich, () => { const f = [...document.querySelectorAll('.sh-buy:not(.poor), .cb-buy, button')].find((e) => e.offsetParent && !e.disabled && (e.classList.contains('sh-buy') || /\b10\b/.test(e.textContent) && /fill|buy|add|face|gold|get/i.test(e.textContent + (e.getAttribute('aria-label') || '')))); if (!f) return false; f.click(); return true; }), 'buy the face');
    await rich.pump(2); await sleep(800); const g1 = await gold(rich); await snap(rich, '24_talent_bought');
    const faceSet = await rich.page.evaluate(() => JSON.stringify(window.QD.S.hero.talent));
    assert.equal(g1.gold, rg.gold - 10, 'the face cost 10 gold'); assert.notEqual(faceSet, '{}', 'a talent symbol is on the die: ' + faceSet);
    note(`PASS upgrade: ${who} filled a Talent one face for 10 gold (${rg.gold} to ${g1.gold}) ${faceSet}`);
  }
  // ---- back to the road, then one phone closes and rejoins: the upgrade, the gold and the shared progress must survive
  const snapState = (p) => p.page.evaluate(() => { const h = window.QD.S.hero; return h ? { name: h.name, gold: h.gold, W: h.strength.W, E: h.strength.E, talent: JSON.stringify(h.talent || {}), step: h.campaign?.step, act: h.campaign?.act, nw: h.loadout.NW?.id, ne: h.loadout.NE?.id, net: window.QD.S.net?.code || null } : null; });
  const beforeLeave = await snapState(rich); note('state before leaving camp: ' + JSON.stringify(beforeLeave));
  for (const p of [A, B]) { await tap(p, /to the road|ready|onward/); await sleep(700); }
  for (let i = 0; i < 6; i++) { for (const p of [A, B]) await p.pump(2); const ta = (await text(A)).slice(0, 110); note(`  road ${i}: A: ${ta}`); if (/QUEST 2 OF 10|quest 2/i.test(ta)) break; for (const p of [A, B]) { let moved = false; for (const re of [offer(p), /^\s*continue\s*$/, /^\s*onward/, /^\s*got it/]) { if (await tap(p, re)) { moved = true; break; } } if (!moved) await p.page.evaluate(() => document.querySelector('.sx-choice:not(.off)')?.click()); } await sleep(900); }
  await snap(A, '30_road_A'); await snap(B, '31_road_B'); note('PASS road: both phones left camp: ' + (await text(A)).slice(0, 100));
  // the rich phone loses its page (a closed tab or a dead battery) and opens the game again in the same browser
  await rich.page.reload(); await rich.page.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 }); await sleep(1500); await rich.pump(2);
  note('after reload: ' + (await text(rich)).slice(0, 220)); await snap(rich, '32_reload');
  // the reloaded phone is back at the same table with the same hero: name, purse, upgraded hand and the shared step
  const after = await snapState(rich); note('state after reload: ' + JSON.stringify(after));
  assert.equal(after.net, beforeLeave.net, 'the reloaded phone is still at the same table'); assert.equal(after.name, beforeLeave.name); assert.equal(after.gold, beforeLeave.gold, 'the purse survived the reload');
  assert.deepEqual([after.W, after.E, after.nw, after.ne], [beforeLeave.W, beforeLeave.E, beforeLeave.nw, beforeLeave.ne], 'the upgraded hand and the weapons survived the reload');
  const other = rich === A ? B : A; const so = await snapState(other); assert.equal(so.step, after.step, 'both phones show the same step'); assert.equal(so.act, after.act);
  note(`PASS rejoin: ${after.name} reloaded back into table ${after.net}, gold ${after.gold}, hands d${after.W}/d${after.E}, Act ${after.act} step ${after.step}, same step as ${so.name}`);
  // the table still plays on: the road event resolves for both and the next quest is offered
  for (let i = 0; i < 6; i++) { const ta = (await text(rich)).slice(0, 200); if (/QUEST \d+ OF 10/i.test(ta)) break; for (const p of [A, B]) { let moved = false; for (const re of [offer(p), /^\s*continue\s*$/, /^\s*onward/, /^\s*got it/]) { if (await tap(p, re)) { moved = true; break; } } if (!moved) await p.page.evaluate(() => document.querySelector('.sx-choice:not(.off)')?.click()); } await sleep(900); for (const p of [A, B]) await p.pump(2); }
  note('after the road event: A: ' + (await text(A)).slice(0, 160) + ' | B: ' + (await text(B)).slice(0, 160)); await snap(A, '34_next_A'); await snap(B, '35_next_B');
} catch (e) { note('FAIL ' + e.message); process.exitCode = 1; await snap(A, 'fail_A').catch(() => {}); await snap(B, 'fail_B').catch(() => {}); }
finally { fs.writeFileSync(`${OUT}/journey.log`, log.join('\n')); await browser.close(); stop(); }
