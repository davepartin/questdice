// Heart to Heart in the lab (?lab): three heroes on one phone. Each picks a monster and rolls; two of them show the same heart on the
// same monster. Shows the heart faces, Ready, the aim dots and the round's banner.   node dev/hearts.mjs [out=shots] [heroes=3] [aims=0,0,1,0,1,0]
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'shots'; const N = Number(process.argv[3] || 3);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?lab&debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const busy = async () => { for (let i = 0; i < 40 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(0.5); };
await p.evaluate((N) => { const { S, E, showBoard } = window.QD; const cls = ['knight', 'ranger', 'wizard', 'dwarf', 'bard', 'knight'];
  const ms = Array.from({ length: N }, (_, i) => { const h = E.newHero({ name: ['Ann', 'Ben', 'Cal', 'Dee', 'Eve', 'Fay'][i], cls: cls[i], seed: 20 + i }); h.campaign.act = 1; return h; });
  S.hero = ms[0]; S.company = { members: ms }; showBoard(); }, N);
await pump(1);
await p.evaluate(() => { const { E, S } = window.QD; window.QD.startQuest({ ...E.questsFor(S.hero)[0], enemies: ['ogre', 'goblin'], kind: 'battle' }); });
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^(Decline|Continue|Start|Fight)$/.test(x.textContent.trim()))?.click()); await pump(0.5); }
await pump(2);
console.log('party:', await p.evaluate(() => ({ party: window.QD.B3.battleState.party, fighters: window.QD.S.battle.fighters?.length, h2h: window.QD.D.TEAMWORK.heartToHeart })));
// each hero: aim (heroes 0 and 1 at the ogre, hero 2 at the goblin), roll, set the heart (3, 3, 3), lock in
const aims = process.argv[4] ? process.argv[4].split(',').map(Number) : [0, 0, 1, 0, 1, 0]; // node dev/hearts.mjs shots 6 0,0,0,0,0,0: all six at the ogre
for (let k = 0; k < N; k++) {
  await p.evaluate((t) => { const uid = window.QD.S.battle.enemies[t].uid; document.querySelector(`.fb-slot.foe[data-uid="${uid}"] .fb-pc, .fb-slot.foe[data-uid="${uid}"] img`)?.click(); }, aims[k]); await pump(0.5);
  await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(4); await busy();
  await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.board.C.v = 3; window.QD.B3.renderShape?.(); }); await pump(0.5);
  if (k === N - 1) { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/hearts-${N}-shaping.png` }); }
  console.log('hero', k, await p.evaluate(() => [...document.querySelectorAll('.fb-heart')].map((t) => `${t.querySelector('img')?.alt}:${t.querySelector('small').textContent}${t.classList.contains('match') ? ':match' : ''}`).join(' | ')));
  if (k === 0 && process.env.GUARD) console.log('Shield Up:', await p.evaluate(() => { const B = window.QD.B3.battleState; B.b.magic = 9; return !!window.QD.E.castPower(B.b, 'shieldwall'); })); // GUARD=1: the Knight steps in front
  await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(1.5); if (k < N - 1) await busy();
}
for (let i = 0; i < (process.env.GUARD ? 40 : 12); i++) { await pump(0.4); const t = await p.evaluate(() => [...document.querySelectorAll('.b3-banner, .hk-banner, [class*="banner"]')].map((e) => e.innerText).join(' | ')); if (process.env.GUARD && /DOUBLE SHARE TO/.test(t)) { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/guard-banner.png` }); console.log('banner:', t.replace(/\s+/g, ' ')); break; } if (!process.env.GUARD && /HEART TO HEART/.test(t)) { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/hearts-${N}-banner.png` }); console.log('banner:', t.replace(/\s+/g, ' ')); break; } }
await busy();
console.log('leader:', await p.evaluate(() => { const r = window.QD.S.battle.report || window.QD.B3.battleState.lastRep; return `${r?.leader} (${r?.leaderWhy})`; }));
console.log('report hearts:', await p.evaluate(() => JSON.stringify(window.QD.S.battle.report?.hearts || window.QD.B3.battleState.lastRep?.hearts)));
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/hearts-${N}-after.png` });
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
