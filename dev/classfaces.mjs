// Every hero class on the battle table, to check they all look toward the monsters.  node dev/classfaces.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1.5, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
const sets = [['knight', ['goblin', 'wolf']], ['ranger', ['skeleton', 'frostwhelp']], ['wizard', ['ogre']], ['dwarf', ['spider', 'wraith']], ['bard', ['cultist', 'ashwyrm']]];
let n = 0;
for (const [cls, en] of sets) {
  await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
  const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate((cls) => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls, seed: 11 }); S.hero = h; S.company = { members: [h] }; showBoard(); }, cls);
  await pump(1);
  await p.evaluate((en) => { const q = { ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: en, kind: 'battle' }; window.QD.startQuest(q); }, en);
  for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
  await pump(2); await p.evaluate(() => window.QD.world.stage.step(1));
  await p.screenshot({ path: `docs/ingame/face_${cls}.png`, clip: { x: 0, y: 0, width: 393, height: 290 } }); n++;
}
await b.close();
