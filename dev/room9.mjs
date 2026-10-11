// Joining from an invite link, then a real defeat (every hero falls).  node dev/room9.mjs [outdir]
import { startServer, phones, sleep, battleReady, cheat } from './_rooms.mjs';
const out = process.argv[2] || 'docs/ingame';
const stop = await startServer();
const { browser, phones: ps } = await phones(['Dave', 'Jess']);
const [a, b] = ps;
await a.open(); await a.pump(1); await a.clickText('Play together'); await a.pump(1); await a.clickText('Open a table'); await a.pump(2);
await a.fill('#hero-name', 'Dave1'); await a.clickText('Open the table'); await a.pump(3);
const code = await a.page.evaluate(() => window.QD.S.net?.code);
// Jess opens the invite link
await b.open(`&join=${code}`); await b.pump(2);
console.log('code box:', await b.page.evaluate(() => document.querySelector('#table-code')?.value), '| url after:', await b.page.evaluate(() => location.search));
await b.fill('#hero-name', 'Jess'); await b.clickText('Take a seat'); await b.pump(3); await b.clickText('I am ready'); await sleep(400);
await a.pump(2); await a.shot(`${out}/room_invite_a.png`);
console.log('invite link on host:', await a.page.evaluate(() => window.QD.session.view().links?.[0]));
await a.clickText('Take the road'); await sleep(700);
for (const p of ps) { await p.pump(2); await p.clickText('Continue').catch(() => {}); }
for (const p of ps) await p.pump(2);
await a.click('.sx-choice:not(.off)'); await sleep(500); for (const p of ps) await p.pump(2);
for (const p of ps) await p.clickText('Onward').catch(() => {}); await sleep(500); for (const p of ps) await p.pump(2);
await a.click('.sx-qcard'); await sleep(900);
await battleReady(a); await battleReady(b);
await cheat(code, 'hurt'); await sleep(600); for (const p of ps) await p.pump(2);
for (let r = 0; r < 3; r++) {
  for (const p of ps) { if (await p.page.evaluate(() => !!document.querySelector('#b3-roll'))) { await p.click('#b3-roll'); await sleep(900); await p.pump(5); } }
  for (const p of ps) { if (await p.page.evaluate(() => !!document.querySelector('#b3-lock') && !document.querySelector('#b3-lock').disabled)) { await p.click('#b3-lock'); await sleep(900); await p.pump(2); } }
  await sleep(1200); for (const p of ps) await p.pump(14);
  const ph = await a.page.evaluate(() => window.QD.session.current().phase);
  console.log('round', r + 1, ph); if (ph !== 'battle') break;
}
for (const p of ps) await p.pump(6);
console.log((await a.text()).slice(0, 160).replace(/\n+/g, ' | '));
await a.shot(`${out}/room_defeat_real_a.png`);
await browser.close(); stop();
