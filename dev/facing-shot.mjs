// Battle-table shots: heroes looking right, monsters looking left.
//   node dev/facing-shot.mjs [port] [tag]
// tag "before" writes before_*.png (old always-flip, served from another tree);
// anything else writes after_* plus the canonical facing_* names.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const port = process.argv[2] || '8135';
const tag = process.argv[3] || 'after';
const chrome = process.env.CHROME
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/local/bin/google-chrome', '/opt/google/chrome/chrome']
    .find((p) => fs.existsSync(p));
const fights = [
  { cls: 'ranger', act: 1, step: 5, en: ['ogre'], name: 'ranger_ogre' },
  { cls: 'wizard', act: 3, step: 9, en: ['ashwyrm'], name: 'wizard_ashwyrm' },
  { cls: 'knight', act: 1, step: 1, en: ['goblin'], name: 'knight_goblin' },
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
  await p.goto(`http://localhost:${port}/?debug&manual&q=low`);
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
  const paths = [`/opt/cursor/artifacts/${tag}_${f.name}.png`];
  if (tag === 'after') paths.push(`/opt/cursor/artifacts/facing_${f.name}.png`);
  for (const out of paths) {
    await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 393, height: 300 } });
    console.log('wrote', out);
  }
}
await b.close();
