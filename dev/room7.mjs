// Reload a phone after it has rolled: it comes back to its dice.  node dev/room7.mjs [outdir]
import { startServer, phones, seat, toBoard, sleep, battleReady } from './_rooms.mjs';
const out = process.argv[2] || 'docs/ingame';
const stop = await startServer();
const { browser, phones: ps } = await phones(['Dave', 'Jess']);
const [a, b] = ps;
a.page.on('console', (m) => console.log('[A console]', m.type(), m.text().slice(0, 200)));
await seat(ps); await toBoard(ps);
await a.click('.sx-qcard'); await sleep(900);
await battleReady(a); await battleReady(b);
await a.click('#b3-roll'); await sleep(900); await a.pump(5);
console.log('A rolled; reloading');
await a.page.reload(); await a.page.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
for (let i = 0; i < 20; i++) {
  await a.pump(1);
  const st = await a.page.evaluate(() => { const B = window.QD.B3.battleState; return JSON.stringify({ starting: B.starting, ended: B.ended, bw: !!B.bw, layer: document.querySelector('#b3')?.className, phase: B.b?.phase, board: !!B.b?.board, round: B.b?.round, sess: window.QD.session.current()?.phase, busy: B.busy }); });
  console.log(i, st);
}
await a.shot(`${out}/room_rejoin_a.png`);
await browser.close(); stop();
