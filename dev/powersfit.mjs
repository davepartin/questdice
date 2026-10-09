// The powers sheet must fit with no scrolling: open it, pick each medallion and helper, and measure.  node dev/powersfit.mjs [cls] [w] [h]
import { chromium } from 'playwright-core';
const [cls = 'wizard', W = 390, H = 664] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate((cls) => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls, seed: 5 }); S.hero = h; S.company = { members: [h] }; showBoard(); }, cls);
await pump(1);
await p.evaluate(() => { const q = { ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: ['goblin', 'wolf'] }; window.QD.startQuest(q); });
for (let i = 0; i < 200; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2);
for (let i = 0; i < 8 && !(await p.evaluate(() => window.QD.S.battle.phase === 'shape')); i++) { await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(6); }
await p.evaluate(() => { window.QD.S.battle.magic = 6; window.QD.S.battle.hp -= 8; document.querySelector('.b3-powers')?.click(); }); await pump(0.5);
const measure = (tag) => p.evaluate((tag) => { const s = document.querySelector('.b3-sheet'); const r = s.getBoundingClientRect(); const all = [...s.querySelectorAll('button')].map((x) => x.getBoundingClientRect());
  const cut = all.filter((q) => q.bottom > r.bottom + 1 || q.top < r.top - 1).length; const top = document.querySelector('.b3-top')?.getBoundingClientRect().bottom;
  return `${tag}: sheet ${Math.round(r.top)}-${Math.round(r.bottom)} (top bar ends ${Math.round(top)}), overflow ${s.scrollHeight - s.clientHeight}px, content cut ${Math.max(0, Math.round(s.querySelector('.pw-sigil').getBoundingClientRect().bottom - r.bottom))}px, buttons outside ${cut}`; }, tag);
for (const [sel, tag] of [['.pw-medal.at-A', 'A'], ['.pw-medal.at-B', 'B'], ['.pw-medal.at-C', 'C'], ['.pw-util:nth-child(2)', 'heal'], ['.pw-util:nth-child(3)', 'heart']]) {
  await p.evaluate((s) => document.querySelector(s)?.click(), sel); await pump(0.3); await p.waitForTimeout(400);
  console.log(await measure(tag)); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/powersfit_${cls}_${W}x${H}_${tag}.png` });
}
await b.close();
