// A solo hero's secret challenge: the Envelope before the fight, the Reveal on the victory screen.  node dev/envsolo.mjs [outdir]
import { startServer, phones, sleep } from './_rooms.mjs';
const out = process.argv[2] || '/tmp/claude-0/-home-user-questdice/8c0c8fef-1ceb-56a5-957d-404bdc291d52/scratchpad';
const stop = process.env.ROOM_PORT ? () => {} : await startServer();
const { browser, phones: [a] } = await phones(['Solo']);
a.page.on('pageerror', (e) => console.log('ERR', e.message));
await a.open(); await a.pump(1);
await a.page.evaluate(() => { const { S, E } = window.QD; const h = E.newHero({ name: 'Solo Sam', cls: 'ranger', seed: 9 }); S.hero = h; S.company = { members: [h] }; });
await a.page.evaluate(() => { const Q = window.QD; Q.startQuest(Q.E.questsFor(Q.S.hero)[0]); }); await a.pump(2);
const side = () => a.page.evaluate(() => (document.querySelector('.sx-side')?.textContent || '').replace(/\s+/g, ' ').slice(0, 300));
console.log('ENVELOPE ->', await side());
await a.page.evaluate(() => { const s = document.querySelector('.sx-side'); const e = document.querySelector('.env-card'); if (s && e) s.scrollTop = e.offsetTop - 90; });
await a.pump(1); await a.shot(`${out}/solo_env.png`);
await a.clickText('Got it'); await sleep(1500); await a.pump(2);
console.log('battle running', await a.page.evaluate(() => window.QD.B3.running?.()), 'envelope', await a.page.evaluate(() => window.QD.S.envelope?.cards && Object.values(window.QD.S.envelope.cards)[0].id));
// win at once and look at the Reveal
await a.page.evaluate(() => { const Q = window.QD; for (const e of Q.S.battle.enemies) e.hp = 0; Q.B3.stop(); Q.showVictory(); }); await sleep(800); await a.pump(2); await a.clickText('Continue').catch(() => {}); await sleep(600); await a.pump(2);
console.log('rewards.reveal', await a.page.evaluate(() => JSON.stringify(window.QD.S.rewards?.reveal)), 'app', await a.page.evaluate(() => document.querySelector('#app')?.className + ' ' + (document.querySelector('.tl-title, h1')?.textContent || ''))); console.log('VICTORY ->', await a.page.evaluate(() => document.querySelector('.sx-reveal')?.textContent || 'no reveal'));
await a.page.evaluate(() => { const s = document.querySelector('.sx-side'); const e = document.querySelector('.sx-reveal'); if (s && e) s.scrollTop = e.offsetTop - 90; });
await a.pump(1); await a.shot(`${out}/solo_reveal.png`);
await browser.close(); stop();
