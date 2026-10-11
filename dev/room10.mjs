// Landscape and desktop look of the room screens: lobby, board, battle.  node dev/room10.mjs [outdir]
import { startServer, phones, seat, toBoard, cheat, battleReady, sleep } from './_rooms.mjs';
const out = process.argv[2] || 'docs/ingame';
const stop = await startServer();
for (const [tag, w, h] of [['land', 844, 390], ['desk', 1280, 800]]) {
  const { browser, phones: ps } = await phones(['Dave', 'Jess'], { w, h, dpr: 1 });
  const [a, b] = ps;
  const code = await seat(ps);
  await a.shot(`${out}/room_${tag}_road.png`);
  await toBoard(ps);
  await a.shot(`${out}/room_${tag}_board.png`);
  await a.click('.sx-qcard'); await sleep(800);
  for (const p of ps) await p.pump(3);
  await cheat(code, 'weak');
  console.log(tag, 'battle ready', await battleReady(b));
  await b.pump(2); await b.shot(`${out}/room_${tag}_battle.png`);
  await browser.close();
}
stop();
