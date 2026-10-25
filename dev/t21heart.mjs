// T21: the heart change control on a real two-phone ONLINE table (the game's cloud code against dev/fakecloud.mjs; not Safari). For each viewport size: open
// Magic powers, choose Heart change, check that both destination buttons, the current face, the cost/used line and Close are all on screen together with no inner
// scrolling, turn the heart up, and check the face, the magic and the used state update in place and the stored table agrees.
//   node dev/t21heart.mjs [out=docs/team/tasks/T21] [sizes=375x548,390x664]
import fs from 'node:fs';
import { bringUp, seat, sleep } from './_cloudphones.mjs';
import { toBoard, battleReady } from './_rooms.mjs';
import { loadTable } from '../js/table.js';
import { NUDGE_COST } from '../js/data.js';
import { applyRelease } from '../js/release.js'; applyRelease();
const OUT = process.argv[2] || 'docs/team/tasks/T21'; fs.mkdirSync(OUT, { recursive: true });
const sizes = (process.argv[3] || '375x548,390x664').split(',').map((s) => s.split('x').map(Number)); const res = []; let bad = 0;
const check = (name, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', name, d ?? ''); return !!ok; };
for (const [w, h] of sizes) {
  const { phones: ps, fake, close } = await bringUp(['Dav', 'JP'], { w, h }); const [a, b] = ps; const r = { size: `${w}x${h}` };
  try {
    const code = await seat(ps, ['Ranger', 'Ranger']); await toBoard(ps); await a.click('.sx-qcard'); await sleep(900);
    for (let i = 0; i < 6; i++) { if ((await a.table())?.phase === 'battle') break; for (const p of ps) { await p.pump(1); await p.clickText('Continue').catch(() => {}); } await sleep(600); }
    check(`${w}x${h}: both phones in battle`, (await battleReady(a)) && (await battleReady(b)));
    await a.click('#b3-roll'); await sleep(900); await a.pump(5); for (let k = 0; k < 20 && await a.page.evaluate(() => window.QD.B3.battleState.busy); k++) await a.pump(1);
    await a.page.evaluate(() => document.querySelector('.b3-powers:not(.b3-team)')?.click()); await a.pump(1.2);
    await a.page.evaluate(() => document.querySelector('.pw-umedal[data-power="u:heart"]')?.click()); await a.pump(1.2);
    const grab = () => a.page.evaluate(() => { const vh = window.innerHeight, vw = window.innerWidth; const rect = (sel) => { const e = document.querySelector(sel); if (!e) return null; const q = e.getBoundingClientRect(); return { top: Math.round(q.top), bottom: Math.round(q.bottom), left: Math.round(q.left), right: Math.round(q.right), disabled: !!e.disabled, text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 60) }; };
      const sheet = document.querySelector('.b3-sheet.open'); const b0 = window.QD.S.battle; const f = b0?.fighters?.[window.QD.session.index()];
      return { vw, vh, down: rect('.hc-down'), up: rect('.hc-up'), cur: rect('.hc-cur'), close: rect('.hc-close'), state: rect('.hc-state'), rules: rect('.hc-rules summary'), detailOpen: !!document.querySelector('.pw-heart, .pw-custom'),
        sheetScrolls: sheet ? sheet.scrollHeight > sheet.clientHeight + 2 : null, heart: b0?.board?.C?.v ?? null, magic: b0?.magic ?? null, nudged: !!b0?.board?.nudged, stateText: document.querySelector('.hc-state')?.textContent || '' }; });
    const g0 = await grab(); r.before = g0; await a.shot(`${OUT}/heart-${w}x${h}-before.png`);
    const box = await a.page.evaluate(() => { const q = document.querySelector('.pw-custom')?.getBoundingClientRect(); return q ? { top: q.top, bottom: q.bottom, left: q.left, right: q.right } : null; });
    const inView = (q) => q && box && q.top >= box.top - 3 && q.bottom <= box.bottom + 3 && q.left >= box.left - 3 && q.right <= box.right + 3 && q.top >= 0 && q.bottom <= g0.vh && q.left >= 0 && q.right <= g0.vw; // inside the panel and on screen
    check(`${w}x${h}: the heart panel is the compact one`, g0.detailOpen);
    check(`${w}x${h}: Down, Up, the current face, the cost line and Close are all on screen together`, [g0.down, g0.up, g0.cur, g0.state, g0.close, g0.rules].every(inView), JSON.stringify({ box, down: g0.down, up: g0.up, cur: g0.cur, state: g0.state, close: g0.close, rules: g0.rules }));
    check(`${w}x${h}: nothing scrolls inside the sheet`, g0.sheetScrolls === false);
    const goUp = g0.heart < 6 ? 'up' : 'down'; const to = g0.heart + (goUp === 'up' ? 1 : -1);
    check(`${w}x${h}: the button says where it turns the heart (${goUp} to ${to})`, new RegExp(`${goUp === 'up' ? 'Up' : 'Down'} to ${to}`).test(goUp === 'up' ? g0.up.text : g0.down.text), goUp === 'up' ? g0.up.text : g0.down.text);
    await a.page.evaluate((s) => document.querySelector(s)?.click(), `.hc-${goUp}`); await a.pump(1.5); await sleep(900); await a.pump(1);
    const g1 = await grab(); r.after = g1; await a.shot(`${OUT}/heart-${w}x${h}-after.png`);
    check(`${w}x${h}: the heart turned to ${to} and magic fell by the cost, ${NUDGE_COST} (online command, no reopening)`, g1.heart === to && g1.magic === g0.magic - NUDGE_COST, `heart ${g0.heart}->${g1.heart}, magic ${g0.magic}->${g1.magic}`);
    check(`${w}x${h}: the panel now says it is used, and both buttons are resting`, /Used this round/.test(g1.stateText) && g1.down.disabled && g1.up.disabled, g1.stateText.slice(0, 80));
    const myName = (await a.me()).name; const stored = loadTable(fake.read(`qdRooms/${code}`).state); const idx = stored.players.findIndex((p) => p.name === myName);
    check(`${w}x${h}: the stored table agrees (heart ${to}, turned this round)`, stored.battle.fighters[idx].board?.C?.v === to && !!stored.battle.fighters[idx].board?.nudged, `${stored.battle.fighters[idx].board?.C?.v}`);
    const again = await a.page.evaluate(() => window.QD.session.send({ type: 'nudge', dir: 1 }).then(() => 'accepted').catch((e) => e.message)); check(`${w}x${h}: a second turn the same round is refused by the table`, again !== 'accepted', again);
  } catch (e) { check(`${w}x${h}: script ran`, false, e.stack?.split('\n').slice(0, 3).join(' | ')); } finally { r.errors = Object.fromEntries(ps.map((p) => [p.name, p.errors])); res.push(r); await close(); }
}
fs.writeFileSync(`${OUT}/heart-check.json`, JSON.stringify(res, null, 1)); console.log(bad ? `${bad} FAILED` : 'all passed');
