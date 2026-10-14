// A test on the road at a table of two phones: one chooses, both watch the dice, then the result.  node dev/room11.mjs [outdir]
import { startServer, phones, seat, cheat, sleep } from './_rooms.mjs';
const out = process.argv[2] || 'docs/ingame';
const stop = await startServer();
const { browser, phones: ps } = await phones(['Dave', 'Jess']);
const [a, b] = ps;
const code = await seat(ps);
await cheat(code, 'gold'); await cheat(code, 'trial'); await sleep(800);
for (const p of ps) await p.pump(2);
console.log('road:', await a.page.evaluate(() => document.querySelector('.tl-title')?.textContent), '|', await a.page.evaluate(() => [...document.querySelectorAll('.sx-choice')].map((e) => e.innerText.split('\n').join(' ')).join(' // ')));
await a.click('.sx-choice:not(.off)'); await sleep(1200);
for (const p of ps) await p.pump(1);
console.log('overlay on both:', await a.page.evaluate(() => !!document.querySelector('.tr-card')), await b.page.evaluate(() => !!document.querySelector('.tr-card')));
await b.click('.tr-go'); await sleep(3800); await b.shot(`${out}/room_trial_b.png`);
console.log('b verdict:', await b.page.evaluate(() => document.querySelector('.tr-verdict')?.innerText));
for (const p of ps) { await p.click('.tr-go').catch(() => {}); await sleep(300); await p.click('.tr-go').catch(() => {}); await sleep(4200); await p.click('.tr-go').catch(() => {}); await sleep(800); await p.pump(1); }
await a.shot(`${out}/room_trial_a_result.png`);
console.log('a result:', await a.page.evaluate(() => document.querySelector('.sx-tale')?.innerText.slice(0, 160) + ' || ' + [...document.querySelectorAll('.sx-side button')].map((x) => x.innerText).join(' / ')));
await browser.close(); stop();
