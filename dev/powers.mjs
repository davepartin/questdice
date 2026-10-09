// The magic powers sheet (triangle sigil) and each power's reveal.  node dev/powers.mjs [cls] [w] [h]
//   Shoots: powers_<cls>_sheet.png, then for each slot A/B/C a cast (and for C, a release) as powers_<cls>_<slot>.png
import { chromium } from 'playwright-core';
const [cls = 'wizard', W = 390, H = 844] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) console.log('CONSOLE', m.text().slice(0, 300)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/powers_${cls}_${n}.png` }); };
await p.evaluate((cls) => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls, seed: 5 }); S.hero = h; S.company = { members: [h] }; showBoard(); }, cls);
await pump(1);
await p.evaluate(() => { const q = { ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: ['goblin', 'wolf', 'goblin'] }; window.QD.startQuest(q); });
for (let i = 0; i < 200; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2);
for (let i = 0; i < 8 && !(await p.evaluate(() => window.QD.S.battle.phase === 'shape')); i++) { await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(6); }
const open = async () => { await p.evaluate(() => { if (!document.querySelector('.b3-sheet.open')) document.querySelector('.b3-powers')?.click(); }); await pump(0.5); };
await p.evaluate(() => { window.QD.S.battle.magic = 12; });
await open(); await p.waitForTimeout(400); await shot('sheet');
const castWait = async (n) => { await p.waitForTimeout(450); await shot(`${n}_mid`); await p.waitForTimeout(2600); await shot(n);
  console.log(n, '|', await p.evaluate(() => document.querySelector('.dr-card')?.innerText.replace(/\n+/g, ' | ') || 'no window'));
  await p.evaluate(() => document.querySelector('.dr-ok')?.click()); await p.waitForTimeout(400); await pump(0.3); };
for (const slot of ['A', 'B', 'C']) {
  await p.evaluate(() => { window.QD.S.battle.magic = 12; }); await open();
  await p.evaluate((s) => document.querySelector(`.pw-medal.at-${s}`)?.click(), slot); await pump(0.3);
  if (slot === 'A') { await shot('A_selected'); await p.evaluate(() => document.querySelector('.pw-step button:last-of-type')?.click()); await p.evaluate(() => document.querySelector('.pw-step button:last-of-type')?.click()); await pump(0.2); }
  await p.evaluate(() => document.querySelector('.pw-detail .pw-btn.go')?.click());
  await castWait(slot);
}
// charges: store two more over rounds, then release
await p.evaluate(() => { const b = window.QD.S.battle; const k = window.QD.E.cardsOf(b.hero).find((c) => c.slot === 'C'); b.charge = { ...(b.charge || {}), [k.id]: 3 }; b.usedRound = {}; b.magic = 12; });
await open(); await p.evaluate(() => document.querySelector('.pw-medal.at-C')?.click()); await pump(0.3); await shot('C_selected');
await p.evaluate(() => document.querySelector('.pw-detail .pw-btn.alt')?.click());
await castWait('release');
// a super in round 3
await p.evaluate(() => { const b = window.QD.S.battle; b.round = 3; b.magic = 12; b.used = {}; const lib = window.QD.E.powerLibrary ? null : null; void lib; const h = b.hero; const sup = window.QD.D.CLASSES[h.cls].cards.find((c) => c.kind === 'super' || c.kind === 'round' && c.slot === 'A' && !c.start); if (sup) { h.level = Math.max(h.level, 5); h.learned = [...(h.learned || []), sup.id]; h.powers = { ...(h.powers || {}), A: sup.id }; } });
await open(); await p.evaluate(() => document.querySelector('.pw-medal.at-A')?.click()); await pump(0.3); await shot('super_selected');
await p.evaluate(() => document.querySelector('.pw-detail .pw-btn.go')?.click());
await castWait('super');
await b.close();
