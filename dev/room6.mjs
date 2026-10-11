// Three phones: a team potion for a hurt friend, one phone reloads mid-round and finds its dice, a round is played.
//   node dev/room6.mjs [outdir]
import { startServer, phones, seat, toBoard, sleep, cheat, battleReady } from './_rooms.mjs';
const out = process.argv[2] || 'docs/ingame';
const stop = await startServer();
const { browser, phones: ps } = await phones(['Dave', 'Jess', 'Cal']);
const [a, b, c] = ps;
const code = await seat(ps); await toBoard(ps);
await a.click('.sx-qcard'); await sleep(900);
for (const p of ps) console.log(p.name, 'battle ready', await battleReady(p));
const info = (p) => p.page.evaluate(() => { const B = window.QD.B3.battleState; return JSON.stringify({ round: B.b.round, active: B.active, phase: B.b.phase, board: !!B.b.board, roster: [...document.querySelectorAll('.rs-chip')].map((e) => e.textContent.replace(/\s+/g, ' ').trim() + (e.classList.contains('locked') ? ' [locked]' : '')) }); });
await a.click('#b3-roll'); await sleep(900); await a.pump(5);
await b.click('#b3-roll'); await sleep(900); await b.pump(5);
// Cal reloads the page mid-round (before rolling) and comes back to the battle
await c.page.reload(); await c.page.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 }); console.log('Cal back', await battleReady(c));
console.log('Cal after reload', await info(c));
await c.click('#b3-roll'); await sleep(900); await c.pump(5);
// Dave reloads after rolling: his dice are still his
await a.page.reload(); await a.page.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 }); console.log('Dave back', await battleReady(a));
console.log('Dave after reload', await info(a));
await a.shot(`${out}/room_rejoin_a.png`);
// a team action: Jess hurts, Dave throws her a potion
await cheat(code, 'hpmates'); await sleep(500); for (const p of ps) await p.pump(2);
console.log('roster A', await info(a));
await a.click('.b3-powers'); await a.pump(1); await a.page.evaluate(() => document.querySelector('.sh-tabs [data-tab="team"]').click()); await a.pump(1);
await a.shot(`${out}/room_team_a.png`);
console.log((await a.page.evaluate(() => document.querySelector('.b3-sheet').innerText)).slice(0, 200));
await browser.close(); stop();
