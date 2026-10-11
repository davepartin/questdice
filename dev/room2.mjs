// Road, board and the start of a battle with two phones.  node dev/room2.mjs [outdir]
import { startServer, phones, sleep } from './_rooms.mjs';
const out = process.argv[2] || 'docs/ingame';
const stop = await startServer();
const { browser, phones: [a, b] } = await phones(['Dave', 'Jess']);
await a.open(); await b.open(); await a.pump(1);
await a.clickText('Play together'); await a.pump(1); await a.clickText('Open a table'); await a.pump(2);
await a.fill('#hero-name', 'Dave1'); await a.clickText('Open the table'); await a.pump(3);
const code = await a.page.evaluate(() => window.QD.S.net?.code);
await b.pump(1); await b.clickText('Play together'); await b.pump(1); await b.clickText('Join a table'); await b.pump(2);
await b.fill('#table-code', code); await b.fill('#hero-name', 'Jess'); await b.clickText('Take a seat'); await b.pump(3);
await b.clickText('I am ready'); await sleep(400); await a.pump(2); await b.pump(2);
await a.clickText('Take the road'); await sleep(600); await a.pump(4); await b.pump(4);
const step = async (label) => { await a.pump(2); await b.pump(2); const ta = await a.page.evaluate(() => [window.QD.S.net?.code, document.querySelector('.tl-title, .sx-act, .sx-h1')?.textContent].join(' ')); console.log(label, '|', ta); };
await step('story');
await a.clickText('Continue'); await b.clickText('Continue'); await step('after story');
await a.shot(`${out}/room_road_a.png`);
// the road: Dave picks the first choice
await a.click('.sx-choice:not(.off)'); await sleep(500); await step('chosen');
await a.shot(`${out}/room_road_done_a.png`); await b.shot(`${out}/room_road_done_b.png`);
await a.clickText('Onward'); await b.clickText('Onward'); await sleep(500); await step('board');
await a.shot(`${out}/room_board_a.png`);
await a.click('.sx-qcard'); await sleep(800); await step('quest');
console.log('phase', await a.page.evaluate(() => window.QD.S.net && 'net'), (await a.text()).slice(0, 100));
await browser.close(); stop();
