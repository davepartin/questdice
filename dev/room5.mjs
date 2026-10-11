// The whole loop at a table: fight, spoils, camp (buy things), ready, the next road.  node dev/room5.mjs [outdir]
import { startServer, phones, seat, toBoard, sleep, cheat, battleReady, playRound } from './_rooms.mjs';
const out = process.argv[2] || 'docs/ingame';
const stop = await startServer();
const { browser, phones: ps } = await phones(['Dave', 'Jess']);
const [a, b] = ps;
const code = await seat(ps); await toBoard(ps);
await a.click('.sx-qcard'); await sleep(800);
await battleReady(a); await battleReady(b); await cheat(code);
for (let r = 0; r < 4; r++) { await playRound(ps); if (await a.page.evaluate(() => document.querySelector('.sx-victory'))) break; }
const phase = (p) => p.page.evaluate(() => window.QD.session.current()?.phase);
console.log('after fight', await phase(a), await phase(b));
// the spoils and perks: keep pressing the first Take / Skip / perk until camp
for (let i = 0; i < 14 && (await phase(a)) === 'victory'; i++) {
  for (const p of ps) {
    const did = await p.page.evaluate(() => { const q = (s) => [...document.querySelectorAll(s)].find((e) => e.offsetParent && !e.disabled); const el = q('.sx-perk') || q('.sx-loot .sx-primary') || q('.sx-loot .sx-ghost'); if (el) { el.click(); return el.textContent.trim().slice(0, 20); } return ''; });
    if (did) console.log(p.name, 'pressed', did);
    await sleep(500); await p.pump(2);
  }
}
for (const p of ps) await p.pump(3);
console.log('camp?', await phase(a), await phase(b));
await cheat(code, 'gold'); await sleep(500); for (const p of ps) await p.pump(2);
await a.shot(`${out}/room_camp_a.png`);
const gold = (p) => p.page.evaluate(() => window.QD.S.hero.gold);
console.log('gold', await gold(a), await gold(b));
// Dave buys a potion belt upgrade or a die; Jess just readies
const bought = await a.page.evaluate(() => { const el = [...document.querySelectorAll('.ur-buy')].find((e) => e.offsetParent && !e.disabled); if (el) { el.click(); return el.getAttribute('aria-label'); } return ''; });
console.log('Dave bought:', bought); await sleep(900); await a.pump(2);
console.log('gold after', await gold(a), 'server hero gold', await a.page.evaluate(() => window.QD.session.hero().gold));
await a.clickText('Ready for the road'); await sleep(500); await a.pump(2); await b.pump(2);
console.log((await a.text()).includes('Waiting for') ? 'A waits' : 'A no wait text');
await b.clickText('Ready for the road'); await sleep(900); for (const p of ps) await p.pump(3);
console.log('next', await phase(a), await phase(b));
await a.shot(`${out}/room_after_camp_a.png`);
await browser.close(); stop();
