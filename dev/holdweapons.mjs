// A hero holding the new weapons in battle.  node dev/holdweapons.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
for (const [tag, cls, nw, ne] of [['hammer', 'knight', 'warhammer', null], ['mace_tower', 'dwarf', 'mace', 'tower']]) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); } catch {} });
  await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
  const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate(([cls, nw, ne]) => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls, seed: 5 }); h.dice = null;
    const w = E.makeWeapon(nw, 2); h.loadout.NW = w; h.loadout.NE = ne ? E.makeWeapon(ne, 2) : E.twinOf(w); S.hero = h; S.company = { members: [h] }; showBoard(); }, [cls, nw, ne]);
  await pump(1); await p.evaluate(() => window.QD.startQuest(window.QD.E.questsFor(window.QD.S.hero)[0]));
  for (let i = 0; i < 200 && !(await p.evaluate(() => !!document.querySelector('#b3-roll'))); i++) await pump(0.5);
  await pump(2); await p.click('#b3-roll'); for (let i = 0; i < 40 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(0.5);
  await pump(1); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/hold_${tag}.png` });
  await p.close();
}
await b.close();
