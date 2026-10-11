// Win a fight at a table, take the spoils, reach camp.  node dev/room4.mjs [outdir]
import { startServer, phones, seat, toBoard, sleep, cheat, battleReady } from './_rooms.mjs';
const out = process.argv[2] || 'docs/ingame';
const stop = await startServer();
const { browser, phones: ps } = await phones(['Dave', 'Jess']);
const [a, b] = ps;
const code = await seat(ps); await toBoard(ps);
await a.click('.sx-qcard'); await sleep(800);
console.log('ready', await battleReady(a), await battleReady(b));
await cheat(code);
const state = (p) => p.page.evaluate(() => JSON.stringify({ phase: window.QD.S.net && window.QD.session?.current()?.phase, cls: document.querySelector('#app')?.className, h1: document.querySelector('h1')?.textContent }));
for (let r = 0; r < 4; r++) {
  for (const p of ps) { if (await p.page.evaluate(() => !!document.querySelector('#b3-roll'))) { await p.click('#b3-roll'); await sleep(900); await p.pump(5); } }
  for (const p of ps) { if (await p.page.evaluate(() => !!document.querySelector('#b3-lock') && !document.querySelector('#b3-lock').disabled)) { await p.click('#b3-lock'); await sleep(900); await p.pump(2); } }
  await sleep(1200); await a.pump(12); await b.pump(12);
  console.log('round', r + 1, await state(a), await state(b));
  if (await a.page.evaluate(() => document.querySelector('.sx-victory'))) break;
}
await a.pump(6); await b.pump(6);
await a.shot(`${out}/room_victory_a.png`); await b.shot(`${out}/room_victory_b.png`);
console.log((await a.text()).slice(0, 400));
await browser.close(); stop();
