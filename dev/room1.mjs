// Lobby: two phones sit at one table.  node dev/room1.mjs [outdir]
import { startServer, phones, sleep } from './_rooms.mjs';
const out = process.argv[2] || 'docs/ingame';
const stop = await startServer();
const { browser, phones: [a, b] } = await phones(['Dave', 'Jess']);
await a.open(); await b.open();
await a.pump(1);
await a.clickText('Play together'); await a.pump(1); await a.clickText('Open a table'); await a.pump(2);
await a.fill('#hero-name', 'Dave1'); await a.fill('#table-name', 'The Ember Company'); await a.clickText('Open the table'); await a.pump(3);
const code = await a.page.evaluate(() => window.QD.S.net?.code); console.log('code', code);
await b.pump(1); await b.clickText('Play together'); await b.pump(1); await b.clickText('Join a table'); await b.pump(2);
await b.fill('#table-code', code); await b.fill('#hero-name', 'Jess'); await b.clickText('Take a seat'); await b.pump(3);
await a.pump(2); await b.pump(2);
await a.shot(`${out}/room_lobby_host.png`); await b.shot(`${out}/room_lobby_guest.png`);
await b.clickText('I am ready'); await sleep(500); await a.pump(2); await b.pump(2);
console.log((await a.text()).slice(0, 120));
await a.shot(`${out}/room_lobby_ready.png`);
await browser.close(); stop();
