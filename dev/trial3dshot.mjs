// The 3D test roll for each stat, straight from a made-up trial.  node dev/trial3dshot.mjs [cls] [act]
import { chromium } from 'playwright-core';
const [cls = 'knight', act = 2] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: process.env.WIDE ? { width: 1280, height: 800 } : { width: 393, height: 852 }, deviceScaleFactor: process.env.WIDE ? 1 : 2, hasTouch: !process.env.WIDE });
p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load/.test(m.text())) console.log('console.error', m.text().slice(0, 200)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const run = async (frames) => { for (let i = 0; i < frames; i++) await p.evaluate(() => window.QD.world.stage.step(1)); };
await p.evaluate(({ cls, act }) => { const { S, E } = window.QD; const h = E.newHero({ name: 'Dave', cls, seed: 3 }); h.campaign.act = +act; h.campaign.step = 4; h.strength = { W: 6, E: 6 }; h.mind = { N: 6 }; S.hero = h; S.company = { kind: 'solo', members: [h], campaign: h.campaign }; window.QD.showRoad(); }, { cls, act });
await p.waitForTimeout(1500);
const cases = [
  
  { stat: 'strength', foe: 'The goblins', title: 'Goblin Tug-of-War', heroSizes: [6, 6], heroDice: [5, 3], oppSizes: [6, 6], oppDice: [2, 4] },
  { stat: 'wisdom', foe: 'The old scholar', title: 'A Game of Chess', heroSizes: [6], heroDice: [6], oppSizes: [6], oppDice: [6] },
];
for (const c of cases.slice(0, +(process.env.N || 9))) {
  await p.evaluate((c) => {
    const t = { ...c, who: 'Dave', cls: window.QD.S.hero.cls, heroTotal: c.heroDice.reduce((a, v) => a + v, 0), oppTotal: c.oppDice.reduce((a, v) => a + v, 0), attempt: 0 };
    t.win = t.heroTotal >= t.oppTotal;
    import('./js/g3/trialui.js').then((T) => T.showTrial(t, { title: c.title, members: [window.QD.S.hero] })).then(() => { window.__trialDone = true; });
  }, c);
  await p.waitForTimeout(1500); await run(2); await p.screenshot({ path: `docs/ingame/trial3d${process.env.WIDE ? 'w' : ''}_${c.stat}_1.png` });
  await p.evaluate(() => document.querySelector('.t3-go')?.click()); await run(24); await p.screenshot({ path: `docs/ingame/trial3d${process.env.WIDE ? 'w' : ''}_${c.stat}_2.png` });
  await run(110); await p.screenshot({ path: `docs/ingame/trial3d${process.env.WIDE ? 'w' : ''}_${c.stat}_3.png` });
  console.log(c.stat, await p.evaluate(() => document.querySelector('.t3-verdict')?.innerText));
  await p.evaluate(() => document.querySelector('.t3-go')?.click()); await p.waitForTimeout(500);
}
await b.close();
