// T10 review: why "Could not save. Is browser storage blocked?" appeared in the battle-report browser runs, and that it is not a save regression.
// saveHero() updates a record that createSave() made when the hero was forged; a hero built in a test (E.newHero) has none, so persist() toasts.
//   node dev/savetoast.mjs [port]      run it against any build: a main-based server (no battle report) and this branch give the same answers
import { chromium } from 'playwright-core';
const port = process.argv[2] || 8135;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const out = {};
for (const mode of ['no save record', 'real save record']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); p.setDefaultTimeout(240000); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} window.__toasts = [];
    addEventListener('DOMContentLoaded', () => new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains('toast')) window.__toasts.push(n.textContent); }).observe(document.querySelector('#toast'), { childList: true })); });
  await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
  const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
  const real = mode === 'real save record';
  await p.evaluate(async (real) => { const { S, E, showBoard } = window.QD; const SV = await import('./js/save.js'); const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.level = 6; h.campaign.act = 2; h.campaign.step = 6;
    if (real) await SV.createSave(h, 'pw12'); S.hero = h; S.company = { members: [h] }; showBoard(); }, real);
  await pump(1);
  const before = await p.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.startsWith('questdice.hero.')); return k ? JSON.parse(localStorage.getItem(k)).saved : null; });
  await p.evaluate(() => { window.QD.startQuest(window.QD.E.questsFor(window.QD.S.hero)[0]); });
  for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!window.QD.world.battle && !!document.querySelector('#b3-roll'))) break; await p.evaluate(() => [...document.querySelectorAll('.env-btns button')].find((x) => /decline/i.test(x.innerText))?.click()); await pump(0.5); }
  await p.evaluate(() => { const { S, E, B3, showVictory } = window.QD; const bt = S.battle; bt.enemies.forEach((e) => { e.hp = 1; e.maxHp = 1; }); E.startRoll(bt); E.resolve(bt, { target: 0 }); B3.stop(); showVictory(); });
  await pump(2);
  const after = await p.evaluate(async () => { const SV = await import('./js/save.js'); const k = Object.keys(localStorage).find((x) => x.startsWith('questdice.hero.')); const rec = k ? JSON.parse(localStorage.getItem(k)) : null;
    return { hasRecord: !!rec, saved: rec?.saved ?? null, battles: rec?.hero?.stats?.battles ?? null, toasts: window.__toasts, sameRecordAsSaveHero: k ? SV.saveHero(rec.hero) : false }; });
  out[mode] = { savedBefore: before, ...after, recordUpdated: before != null && after.saved > before };
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1)); await b.close();
