// The dice keep their secret until they land (Dave, 22 Oct 2026: "the banners and lines spoil the triples and straights"). Rolls and
// rerolls a few times; while the dice are in the air there must be no totals, banners, triple bars or straight glow.   node dev/rollspoil.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com/, (r) => r.abort());
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 11 }); h.dice = null; S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const { E, S } = window.QD; window.QD.startQuest({ ...E.questsFor(S.hero)[0], enemies: ['ogre'], kind: 'battle' }); });
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^(Decline|Continue)$/.test(x.textContent.trim()))?.click()); await pump(0.5); }
await pump(2);
const state = () => p.evaluate(() => ({ notes: document.querySelectorAll('.fs-notes > *').length, idle: document.querySelector('.b3-fc')?.classList.contains('idle'), straight: !!document.querySelector('.b3-straight'), caption: document.querySelector('.b3-caption, .b3-cap')?.innerText || [...document.querySelectorAll('p')].find((x) => /Rolling|Tap dice/.test(x.innerText))?.innerText }));
let bad = 0; let shown = 0;
for (let r = 0; r < 6; r++) {
  const reroll = r % 2 === 1;
  if (reroll) await p.evaluate(() => { const st = window.QD.B3.battleState; st.sel.add('W'); document.querySelector('#b3-reroll')?.click(); });
  else await p.evaluate(() => document.querySelector('#b3-roll')?.click());
  await pump(0.3); const mid = await state(); if (reroll) console.log('  reroll debug', JSON.stringify(await p.evaluate(() => ({ left: window.QD.S.battle.actionsLeft, busy: window.QD.B3.battleState.busy, toast: document.querySelector('#toast')?.innerText, btn: document.querySelector('#b3-reroll')?.disabled }))));
  if (r === 0) await p.screenshot({ path: 'shots/rollspoil-mid.png' });
  for (let i = 0; i < 30 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(0.5);
  const after = await state(); if (r === 0) await p.screenshot({ path: 'shots/rollspoil-landed.png' });
  if (mid.notes || mid.straight || !mid.idle) bad++; if (after.notes || after.straight) shown++;
  console.log(reroll ? 'reroll' : 'roll  ', 'mid:', JSON.stringify(mid), ' landed:', JSON.stringify(after));
  if (!reroll) { /* next: a reroll of whatever is there (select every die first) */ await p.evaluate(() => { for (const el of document.querySelectorAll('.never')) el; }); }
  if (reroll) { await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(4); for (let i = 0; i < 40 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(0.5); await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^(Continue|OK)$/i.test(x.textContent.trim()))?.click()); await pump(2); }
}
console.log(bad ? `SPOILED ${bad} time(s) mid-roll` : 'nothing shown mid-roll', `· results shown after landing in ${shown} of 6`);
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
