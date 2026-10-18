// A stalled live feed at a table (Dave's first team game: one phone played the round, the other waited a long time).
// Jess's phone loses its live feed mid-fight; both lock in; her phone must still get the round from the table within seconds.
//   node dev/stallfeed.mjs
import { startServer, phones, seat, toBoard, sleep, cheat, battleReady } from './_rooms.mjs';
const stop = await startServer();
const { browser, phones: ps } = await phones(['Dave', 'Jess']);
const [a, b] = ps;
// remember Jess's EventSources so the test can cut her feed later
await b.page.context().addInitScript(() => { const ES = window.EventSource; window.__es = []; window.EventSource = function (...x) { const e = new ES(...x); window.__es.push(e); return e; }; window.EventSource.prototype = ES.prototype; });
const code = await seat(ps); await toBoard(ps);
await a.click('.sx-qcard'); await sleep(800);
await battleReady(a); await battleReady(b); void cheat; void code; // a real fight: it goes on past round 1
const round = (p) => p.page.evaluate(() => { const t = window.QD.session.current(); return t?.phase === 'battle' ? t.battle.round : 99; }); // past the fight counts too
console.log('round before', await round(a), await round(b));
// cut Jess's feed and keep it cut (no reconnect)
await b.page.context().route('**/events*', (r) => r.abort());
await b.page.evaluate(() => (window.__es || []).forEach((e) => e.close()));
console.log('Jess feed states (2 = closed):', await b.page.evaluate(() => (window.__es || []).map((e) => e.readyState).join(',')));
const state = (p) => p.page.evaluate(() => JSON.stringify({ phase: window.QD.session.current()?.phase, fighters: window.QD.session.current()?.battle?.fighters?.map((f) => ({ n: f.hero.name, board: !!f.board, locked: !!f.locked })), roll: !!document.querySelector('#b3-roll'), rollOff: document.querySelector('#b3-roll')?.disabled, lock: !!document.querySelector('#b3-lock') }));
for (const p of ps) {
  if (await p.page.evaluate(() => document.querySelector('#b3-roll')?.disabled)) { await p.page.evaluate(() => document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click()); await sleep(300); await p.pump(1); }
  if (await p.page.evaluate(() => !!document.querySelector('#b3-roll'))) { await p.click('#b3-roll'); await sleep(900); await p.pump(5); }
}
console.log('A', await state(a)); console.log('B', await state(b));
await b.click('#b3-lock'); await sleep(600); await b.pump(1);
const t0 = Date.now(); await a.click('#b3-lock'); // Dave locks last: his phone resolves the round at once

let got = null;
for (let i = 0; i < 40; i++) { await sleep(500); if ((await round(b)) > 1) { got = (Date.now() - t0) / 1000; break; } }
console.log('Dave sees round', await round(a), '| Jess got the round after', got == null ? 'NEVER (20 s)' : `${got.toFixed(1)} s`, 'without her live feed');
await browser.close(); stop();
