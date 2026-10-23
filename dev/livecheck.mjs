// The live game without ?lab: the released teamwork rules on (js/release.js), the experiments off: no tag, today's weapons and classes, no
// arrows or fury, normal saves; charms resting, heart tags at a table.   node dev/livecheck.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 400000 });
const r = await p.evaluate(async () => { const { S, E, D, showBoard } = window.QD; const ms = [E.newHero({ name: 'Live', cls: 'ranger', seed: 5 }), E.newHero({ name: 'Mate', cls: 'knight', seed: 6 })];
  S.hero = ms[0]; S.company = { members: ms }; showBoard(); await new Promise((res) => setTimeout(res, 800));
  return { tag: !!document.querySelector('.lab-tag'), w2: D.EXPERIMENT.weapons2, ranger: [ms[0].loadout.NW.id, ms[0].loadout.NE?.id], teamwork: { ...D.TEAMWORK }, class2: D.CLASS2.on, pressure: D.PRESSURE.on,
    arrows: { ...D.WEAPONS2.arrowRules }, charmsResting: E.charmsResting(), scouts: document.querySelectorAll('.qc-scout').length, saveKey: (await import('./js/save.js')).key('Live') }; });
console.log(JSON.stringify(r, null, 1));
await p.evaluate(() => { const { E, S } = window.QD; window.QD.startQuest({ ...E.questsFor(S.hero)[0], enemies: ['ogre'], kind: 'battle' }); });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^(Decline|Continue)$/.test(x.textContent.trim()))?.click()); await pump(0.5); }
await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(4);
console.log('heart tags at a live table after a roll:', await p.evaluate(() => [...document.querySelectorAll('.fb-heart')].map((t) => t.querySelector('small').textContent)));
console.log(errs.length ? errs : 'no page errors'); await b.close();
