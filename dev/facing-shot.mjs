// Battle-table shots to show heroes looking right and monsters looking left.
//   node dev/facing-shot.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const chrome = process.env.CHROME
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/local/bin/google-chrome', '/opt/google/chrome/chrome']
    .find((p) => fs.existsSync(p));
const fights = [
  { cls: 'ranger', act: 1, step: 5, en: ['ogre'], out: '/opt/cursor/artifacts/facing_ranger_ogre.png' },
  { cls: 'wizard', act: 3, step: 9, en: ['ashwyrm'], out: '/opt/cursor/artifacts/facing_wizard_ashwyrm.png' },
];
const b = await chromium.launch({
  executablePath: chrome,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'],
});
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
const pump = (s) => p.evaluate(async (s) => {
  const st = window.QD.world.stage;
  for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); }
}, s);
for (const f of fights) {
  await p.goto('http://localhost:8135/?debug&manual&q=low');
  await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
  await p.evaluate(({ cls, act, step }) => {
    const { S, E, showBoard } = window.QD;
    const h = E.newHero({ name: 'Dave', cls, seed: 11 });
    h.campaign.act = act; h.campaign.step = step; h.campaign.reached = { act, step };
    S.hero = h; S.company = { members: [h] }; showBoard();
  }, f);
  await pump(1);
  await p.evaluate((en) => {
    const q = { ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: en };
    window.QD.startQuest(q);
  }, f.en);
  for (let i = 0; i < 400; i++) {
    if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break;
    await pump(0.5);
  }
  await pump(2);
  await p.evaluate(() => window.QD.world.stage.step(1));
  await p.screenshot({ path: f.out, clip: { x: 0, y: 0, width: 393, height: 300 } });
  console.log('wrote', f.out);
}
await b.close();
