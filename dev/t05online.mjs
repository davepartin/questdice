// T05: the Objective / Secret Objective fronts on the real two-phone ONLINE path (the game's cloud code against dev/fakecloud.mjs, a stand-in for Firebase;
// not real Firestore, not Safari). At the envelope each phone shows its own card from the table's real deal; then one phone is given an offered bribe (the
// densest card) by editing the stored table. Checks the card is whole on screen, the buttons are reachable without scrolling the card, and an answer goes through.
//   SIZE=390x664 node dev/t05online.mjs [out=docs/team/tasks/T05/online]
import fs from 'node:fs';
import { bringUp, seat, sleep } from './_cloudphones.mjs';
import { toBoard } from './_rooms.mjs';
import { loadTable, saveTable } from '../js/table.js';
import { applyRelease } from '../js/release.js'; applyRelease();
const OUT = process.argv[2] || 'docs/team/tasks/T05/online'; fs.mkdirSync(OUT, { recursive: true });
const [W, H] = (process.env.SIZE || '390x664').split('x').map(Number); let bad = 0; const res = { size: `${W}x${H}`, phones: [] };
const check = (name, ok, d) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', name, d ?? ''); };
const { phones: ps, fake, close } = await bringUp(['Dav', 'JP'], { w: W, h: H }); const [a, b] = ps;
const mutate = (code, fn) => { const d = fake.read(`qdRooms/${code}`); const t = loadTable(d.state); fn(t); t.seq += 1; fake.write(`qdRooms/${code}`, { ...d, phase: t.phase, state: saveTable(t), seq: t.seq }); };
const measure = (p) => p.page.evaluate(() => {
  const c = document.querySelector('.qo'); if (!c) return null; const r = c.getBoundingClientRect(); const inn = c.querySelector('.in').getBoundingClientRect();
  const kids = [...c.querySelectorAll('.in > *')].map((k) => k.getBoundingClientRect()); const spill = Math.round(Math.max(...kids.map((k) => k.bottom)) - inn.bottom);
  const btns = [...document.querySelectorAll('.env-btns button')].filter((x) => x.offsetParent).map((x) => { const q = x.getBoundingClientRect(); return { text: x.textContent.trim(), top: Math.round(q.top), bottom: Math.round(q.bottom) }; });
  const more = document.querySelector('.obj-morebtn')?.getBoundingClientRect();
  return { kind: c.dataset.kind, focus: c.dataset.focus, chip: c.querySelector('.chip').textContent, title: c.querySelector('.ttl').textContent, w: Math.round(r.width), top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, spill, emblem: Math.round(c.querySelector('.emb').getBoundingClientRect().height), btns, moreVisible: !!more && more.bottom <= innerHeight + 1, minFont: Math.min(...[...c.querySelectorAll('.goal,.t,.chip,.ttl')].map((e) => parseFloat(getComputedStyle(e).fontSize))), imgs: [...c.querySelectorAll('img')].every((m) => m.complete && m.naturalWidth > 0) };
});
try {
  const code = await seat(ps, ['Knight', 'Bard']); await toBoard(ps); await a.click('.sx-qcard'); await sleep(900);
  let on = false; for (let i = 0; i < 20 && !on; i++) { for (const p of ps) await p.pump(1); on = (await Promise.all(ps.map((p) => p.page.evaluate(() => !!document.querySelector('.qo'))))).every(Boolean); await sleep(400); }
  check(`${W}x${H}: both phones show the new card at the envelope`, on);
  for (const p of ps) { const m = await measure(p); res.phones.push({ who: p.name, ...m }); await p.shot(`${OUT}/envelope-${W}x${H}-${p.name}.png`);
    check(`${p.name}: ${m?.chip} "${m?.title}" is whole (no text spill, emblem ${m?.emblem}px, images loaded)`, m && m.spill <= 1 && m.emblem >= 25 && m.imgs, JSON.stringify(m));
    check(`${p.name}: the answer button is on screen with the card, no scrolling`, m && m.btns.length >= 1 && m.btns.every((x) => x.bottom <= m.vh + 1 && x.top >= 0), JSON.stringify(m?.btns)); }
  // the densest card: an offered bribe with a long rule, on phone A (a test edit of the stored table, as dev/room tests do)
  mutate(code, (t) => { const env = t.envelope; const names = Object.keys(env.cards || {}); env.cards[names[0]] = { id: 'fall', mode: 'offer' }; if (names[1]) env.cards[names[1]] = { id: 'slacker', mode: 'offer' }; });
  await sleep(800); for (const p of ps) await p.pump(2);
  for (const p of ps) { const m = await measure(p); res.phones.push({ who: `${p.name}-offer`, ...m }); await p.shot(`${OUT}/offer-${W}x${H}-${p.name}.png`);
    check(`${p.name}: offered bribe "${m?.title}" (${m?.kind}) is whole, emblem ${m?.emblem}px, buttons ${JSON.stringify(m?.btns?.map((x) => x.text))}`, m && m.kind === 'wager' && m.spill <= 1 && m.imgs && m.btns.length === 2 && m.btns.every((x) => x.bottom <= m.vh + 1), JSON.stringify(m)); }
  // on a short phone the densest card may sit under the answer bar until the screen is scrolled: it must scroll clear of it
  for (const p of ps) { const clear = await p.page.evaluate(async () => { const q = document.querySelector('.qo'); q.scrollIntoView({ block: 'start' }); const side = q.closest('.sx-side') || document.scrollingElement; side.scrollTop = side.scrollHeight; window.scrollTo(0, document.body.scrollHeight); await new Promise((r) => setTimeout(r, 300)); const c = q.getBoundingClientRect(); const bar = document.querySelector('.env-btns')?.getBoundingClientRect(); return { cardBottom: Math.round(c.bottom), cardTop: Math.round(c.top), barTop: bar ? Math.round(bar.top) : null }; });
    check(`${p.name}: scrolled to the end, the whole card sits clear above the answer bar`, clear.barTop == null || clear.cardBottom <= clear.barTop + 1, JSON.stringify(clear)); await p.page.evaluate(() => { const q = document.querySelector('.qo'); (q.closest('.sx-side') || document.scrollingElement).scrollTop = 0; window.scrollTo(0, 0); }); }
  // answer on both phones through the real command path
  for (const p of ps) { await p.page.evaluate(() => [...document.querySelectorAll('.env-btns button')].find((x) => /decline|continue/i.test(x.textContent))?.click()); await sleep(500); await p.pump(1); }
  for (let i = 0; i < 12 && (await a.table())?.phase === 'envelope'; i++) { for (const p of ps) { await p.pump(1); await p.clickText('Continue').catch(() => {}); } await sleep(500); }
  check(`${W}x${H}: both answered and the table moved on`, (await a.table())?.phase !== 'envelope', (await a.table())?.phase);
  check(`${W}x${H}: no page errors on either phone`, ps.every((p) => p.errors.length === 0), JSON.stringify(ps.map((p) => p.errors)));
} catch (e) { check('script ran', false, e.stack?.split('\n').slice(0, 3).join(' | ')); } finally { fs.writeFileSync(`${OUT}/check-${W}x${H}.json`, JSON.stringify(res, null, 1)); await close(); }
console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
