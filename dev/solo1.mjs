// A solo hero is still made and played after the multiplayer rebuild.  node dev/solo1.mjs [outdir]
import { startServer, phones, sleep } from './_rooms.mjs';
const out = process.argv[2] || 'docs/ingame';
const stop = await startServer();
const { browser, phones: [a] } = await phones(['Solo']);
await a.open(); await a.pump(1);
await a.clickText('Forge a new hero'); await a.pump(2);
await a.fill('#hero-name', 'Solo Sam'); await a.fill('#hero-pw', 'abc123'); await a.clickText('Begin the campaign'); await sleep(800); await a.pump(3);
console.log('screen', await a.page.evaluate(() => document.querySelector('#app').className + ' | ' + (document.querySelector('.tl-title, .sx-act')?.textContent || '')));
for (let i = 0; i < 3; i++) { await a.clickText('Continue').catch(() => {}); await a.pump(2); }
await a.clickText('Menu').catch(() => {}); await a.pump(1);
console.log((await a.page.evaluate(() => document.querySelector('.form')?.innerText || '')).replace(/\n+/g, ' | '));
await a.shot(`${out}/solo_menu.png`);
await browser.close(); stop();
