// The triple notes above the battle buttons: one triple, two side by side, and all three as one banner.  node dev/triples.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 5 }); h.dice = null; S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const q = { ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: ['goblin', 'goblin'] }; window.QD.startQuest(q); });
for (let i = 0; i < 200; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2);
for (let i = 0; i < 8 && !(await p.evaluate(() => window.QD.S.battle.phase === 'shape')); i++) { await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(6); }
const sets = {
  one: { NW: 3, N: 1, NE: 4, W: 2, C: 2, E: 2, SW: 1, S: 4, SE: 1 },
  two: { NW: 2, N: 2, NE: 2, W: 4, C: 4, E: 4, SW: 1, S: 1, SE: 1 },
  three: { NW: 2, N: 2, NE: 2, W: 2, C: 2, E: 2, SW: 1, S: 2, SE: 1 },
};
for (const [name, set] of Object.entries(sets)) {
  const info = await p.evaluate((set) => { const B = window.QD.B3.battleState; const bd = B.b.board;
    for (const [k, v] of Object.entries(set)) { bd[k].v = v; bd[k].bound = false; B.bw.tray.setValue(k, v); }
    window.QD.B3.renderShape(); return window.QD.E.evaluate(B.hero, bd).triples.map((t) => t.name).join(', '); }, set);
  await pump(1.2); await p.evaluate(() => window.QD.world.stage.step(1));
  const geo = await p.evaluate(() => { const n = [...document.querySelectorAll('.fs-notes .fnote')].map((e) => e.getBoundingClientRect()); const bar = document.querySelector('.b3-bar').getBoundingClientRect();
    return `${n.length} note(s), rows ${new Set(n.map((r) => Math.round(r.top))).size}, x ${n.map((r) => `${Math.round(r.left)}-${Math.round(r.right)}`).join(' ')}, bottom ${Math.round(Math.max(...n.map((r) => r.bottom)))} vs buttons top ${Math.round(bar.top)}`; });
  console.log(name, '|', info, '|', geo);
  await p.screenshot({ path: `docs/ingame/triples_${name}.png` });
}
await b.close();
