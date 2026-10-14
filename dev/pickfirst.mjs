// The round starts by choosing a target: Roll waits for it (several monsters), the target is fixed once rolled (solo), a lone monster needs none.
//   node dev/pickfirst.mjs [tag] [w] [h]
import { chromium } from 'playwright-core';
const [tag = 'pf', W = 393, H = 852] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1.5, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(`pageerror ${e.message}`));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${tag}_${n}.png` }); };
const start = async (en) => {
  await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 11 }); h.level = 10; S.hero = h; S.company = { members: [h] }; showBoard(); }); await pump(1);
  await p.evaluate((en) => window.QD.startQuest({ ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: en.split(','), kind: 'battle' }), en);
  for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
  await pump(2);
};
const st = () => p.evaluate(() => ({ rollDisabled: !!document.querySelector('#b3-roll')?.disabled, ring: document.querySelectorAll('.fb-slot.foe.targeted').length, phase: window.QD.S.battle.phase, target: window.QD.B3.battleState.target, cap: document.querySelector('.b3-caption')?.innerText.trim() }));
const tapFoe = (i) => p.evaluate((i) => [...document.querySelectorAll('.fb-slot.foe:not(.dead) .fb-pc')][i]?.click(), i);
await start('goblin,wolf,ogre');
let s = await st(); console.log('round start:', JSON.stringify(s)); await shot('0pick');
if (!s.rollDisabled) problems.push('Roll should wait for a target'); if (s.ring) problems.push('no monster should be ringed before the pick');
await p.evaluate(() => document.querySelector('#b3-roll').click()); await pump(0.3); if ((await st()).phase !== 'reset') problems.push('rolled without a target');
await tapFoe(1); await pump(0.3); s = await st(); console.log('after tapping the second monster:', JSON.stringify(s)); await shot('1picked');
if (s.rollDisabled || s.ring !== 1 || s.target !== 1) problems.push('the pick did not take');
await p.evaluate(() => document.querySelector('#b3-roll').click()); await pump(6);
for (let k = 0; k < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
await tapFoe(0); await pump(0.5); s = await st(); console.log('after rolling, tapping another monster:', JSON.stringify(s), '| sheet:', await p.evaluate(() => !!document.querySelector('.b3-info.open, .b3-sheet.open')));
if (s.target !== 1) problems.push('the target moved after the roll');
await shot('2locked');
await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(2);
for (let n = 0; n < 60 && await p.evaluate(() => window.QD.B3.battleState.busy); n++) await pump(1);
await pump(1); await p.evaluate(() => document.querySelector('.b3 .rc .rc-close')?.click()); await pump(0.6);
s = await st(); console.log('next round:', JSON.stringify(s)); if (!s.rollDisabled && !window.QD) problems.push('x');
if (!s.rollDisabled || s.ring) problems.push('round 2 should ask for a target again');
await start('goblin'); s = await st(); console.log('one monster:', JSON.stringify(s)); if (s.rollDisabled) problems.push('a lone monster needs no pick');
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no problems'); await b.close();
