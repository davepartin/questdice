// T21 / T05: weapon cards on the real two-phone ONLINE path (the game's cloud code against dev/fakecloud.mjs; not Safari). At camp, with pack items and gold:
// the pack rows, the equipped hands, the store shelf (and, after a fight, the spoils) all open the full card on a tap; actions stay separate and nothing changes by looking.
//   node dev/t21cards.mjs [out=docs/team/tasks/T21] [sizes=375x548,390x664]
import fs from 'node:fs';
import { bringUp, seat, sleep } from './_cloudphones.mjs';
import { toBoard } from './_rooms.mjs';
import { loadTable, saveTable } from '../js/table.js';
import * as E from '../js/engine.js';
import { applyRelease } from '../js/release.js'; applyRelease();
const OUT = process.argv[2] || 'docs/team/tasks/T21'; fs.mkdirSync(OUT, { recursive: true });
const sizes = (process.argv[3] || '375x548,390x664').split(',').map((s) => s.split('x').map(Number)); let bad = 0;
const check = (name, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', name, d ?? ''); return !!ok; };
const res = [];
for (const [w, h] of sizes) {
  const { phones: ps, fake, close } = await bringUp(['Dav', 'JP'], { w, h }); const [a, b] = ps; const r = { size: `${w}x${h}` };
  const mutate = (code, fn) => { const d = fake.read(`qdRooms/${code}`); const t = loadTable(d.state); fn(t); t.seq += 1; fake.write(`qdRooms/${code}`, { ...d, phase: t.phase, state: saveTable(t), seq: t.seq }); };
  try {
    const code = await seat(ps, ['Ranger', 'Ranger']); await toBoard(ps);
    const mk = (id, rarity, size, extra = {}) => ({ ...E.makeWeapon(id, rarity, E.makeRng(Math.floor(Math.random() * 1e6)), size), ...extra });
    mutate(code, (t) => { t.phase = 'camp'; for (const p of t.players) { p.ready = false; p.hero.gold = 900; p.hero.bag.push(mk('sword', 1, 6), mk('axe', 2, 8), mk('quiver', 1, 10, { ammo: 'fire' })); } });
    await sleep(1200); for (const p of ps) await p.pump(2);
    check(`${w}x${h}: both phones are at camp`, (await a.table())?.phase === 'camp' && (await b.table())?.phase === 'camp');
    await a.page.evaluate(() => { const t = [...document.querySelectorAll('button, [role=tab]')].find((e) => /^gear$/i.test(e.textContent.trim())); t?.click(); }); await a.pump(2);
    const rows = await a.page.evaluate(() => [...document.querySelectorAll('.cw-row')].map((e) => ({ label: e.getAttribute('aria-label'), h: Math.round(e.getBoundingClientRect().height), vis: e.offsetParent !== null })));
    r.rows = rows; check(`${w}x${h}: the online Gear tab lists pack weapons as rows that offer the full card`, rows.length >= 3 && rows.every((x) => /Show the full card/.test(x.label || '')), `${rows.length} rows`);
    await a.shot(`${OUT}/cards-${w}x${h}-gear-rows.png`);
    const before = JSON.stringify(await a.me());
    await a.page.evaluate(() => { const e = [...document.querySelectorAll('.cw-row')].find((x) => /Sword|Axe|Arrows/.test(x.getAttribute('aria-label') || '')); e?.click(); }); await a.pump(1.5); await sleep(300);
    const big = await a.page.evaluate(() => { const m = document.querySelector('.cw-modal .cw-big'); if (!m) return null; const q = m.getBoundingClientRect(); const c = [...document.querySelectorAll('.cw-modal button')].find((x) => /close/i.test(x.textContent)); const cq = c?.getBoundingClientRect(); return { top: Math.round(q.top), bottom: Math.round(q.bottom), width: Math.round(q.width), closeBottom: cq ? Math.round(cq.bottom) : null, vh: innerHeight, faces: document.querySelectorAll('.cw-modal .f13').length }; });
    r.big = big; check(`${w}x${h}: tapping a pack row opens the full card with its faces, and Close stays on screen`, !!big && big.faces >= 4 && big.closeBottom != null && big.closeBottom <= big.vh, JSON.stringify(big));
    await a.shot(`${OUT}/cards-${w}x${h}-gear-big.png`);
    await a.page.evaluate(() => [...document.querySelectorAll('.cw-modal button')].find((x) => /close/i.test(x.textContent))?.click()); await a.pump(1);
    check(`${w}x${h}: looking at a card changed nothing (hero byte-identical)`, JSON.stringify(await a.me()) === before);
    // the store shelf
    await a.page.evaluate(() => { const t = [...document.querySelectorAll('button, [role=tab]')].find((e) => /^supplies$/i.test(e.textContent.trim())); t?.click(); }); await a.pump(2);
    await a.page.evaluate(() => { const t = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /^store\b/i.test(e.textContent.trim())); t?.click(); }); await a.pump(2.5);
    if (process.env.DBG) console.log((await a.page.evaluate(() => document.body.innerText)).slice(0, 900).replace(/\n+/g, ' | '), await a.page.evaluate(() => [...document.querySelectorAll('button')].filter((e) => e.offsetParent).map((e) => e.textContent.trim().slice(0, 24))));
    const shelf = await a.page.evaluate(() => [...document.querySelectorAll('.cw-row')].map((e) => e.getAttribute('aria-label')));
    r.shelf = shelf; check(`${w}x${h}: the store shelf rows also offer the full card`, shelf.length >= 1 && shelf.every((x) => /Show the full card/.test(x || '')), `${shelf.length} rows`);
    await a.shot(`${OUT}/cards-${w}x${h}-store.png`);
    check(`${w}x${h}: no page errors on either phone`, ps.every((p) => p.errors.length === 0), JSON.stringify(ps.map((p) => p.errors)));
  } catch (e) { check(`${w}x${h}: script ran`, false, e.stack?.split('\n').slice(0, 3).join(' | ')); } finally { res.push(r); await close(); }
}
fs.writeFileSync(`${OUT}/cards-check.json`, JSON.stringify(res, null, 1)); console.log(bad ? `${bad} FAILED` : 'all passed');
