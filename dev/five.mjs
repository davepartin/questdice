// The first five battles as a brand-new player (hints on): screenshots of every step with the hint visible.
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path';
const out = process.argv[2]; const W = Number(process.argv[3] || 430); const H = Number(process.argv[4] || 932); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) problems.push(m.text()); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.removeItem('qd.hints'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: path.join(out, `${n}.png`) }); };
const hintText = () => p.evaluate(() => document.querySelector('.b3-coachcard .cc-tx b')?.textContent || [...document.querySelectorAll('.sx-screen:not(.hidden) .sx-tip p')].find((e) => e.offsetParent)?.textContent?.slice(0, 70) || null);
const log = [];
const note = async (tag) => { const t = await hintText(); log.push(`${tag}: ${t}`); console.log(tag, '->', t); };
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 11 }); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
for (let f = 1; f <= 5; f++) {
  for (let k = 0; k < 2; k++) { const onRoad = await p.evaluate(() => !!document.querySelector('.sx-road')); if (!onRoad) break; await note(`road before fight ${f}`); await shot(`f${f}-0-road`); await p.evaluate(() => { const c = [...document.querySelectorAll('.sx-choice')].find((x) => !x.disabled); if (c) c.click(); else document.querySelector('.sx-road .sx-cta .sx-btn')?.click(); }); await pump(1.5); }
  await p.evaluate(() => document.querySelector('.sx-qcard')?.click()); await pump(2);
  await note(`fight ${f} start`);
  for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
  await pump(1.2); await p.waitForTimeout(500); await note(`fight ${f} reset`); await shot(`f${f}-1-reset`);
  const monsters = await p.evaluate(() => window.QD.S.battle.enemies.map((e) => e.id).join('+')); console.log(`fight ${f}: ${monsters}`);
  for (let r = 0; r < 14 && !(await p.evaluate(() => window.QD.S.battle.outcome)); r++) {
    await p.evaluate(() => document.querySelector('.cc-ok')?.click());
    if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) { await p.evaluate(() => document.querySelector('#b3-roll').click()); await pump(3); }
    await p.waitForTimeout(400); if (r < 2) { await note(`fight ${f} round ${r + 1} shape`); await shot(`f${f}-r${r + 1}-shape`); }
    for (let k = 0; k < 3; k++) { // three free rerolls of the four weakest dice, like a sensible player
      const did = await p.evaluate(() => { const B = window.QD.B3.battleState; const b = window.QD.S.battle; const E = window.QD.E; if (b.actionsLeft <= 3) return false; B.sel.clear();
        const act = Object.keys(b.board).filter((s) => E.isActive(window.QD.S.hero, s) && !b.board[s].bound).sort((x, y) => b.board[x].v - b.board[y].v).slice(0, 4); act.forEach((s) => B.sel.add(s)); window.QD.B3.renderShape(); const bt = document.querySelector('#b3-reroll'); if (bt && !bt.disabled) { bt.click(); return true; } return false; });
      if (!did) break; await pump(4); for (let q = 0; q < 10 && await p.evaluate(() => window.QD.B3.battleState.busy); q++) await pump(1);
      await p.evaluate(() => document.querySelector('.cc-ok')?.click());
    }
    await p.evaluate(() => { const b = window.QD.S.battle; const E = window.QD.E; const h = window.QD.S.hero; // a sensible player: heal when low, play affordable cards
      if (b.hp < b.maxHp * 0.5 && b.magic >= E.healCostOf(h)) document.querySelector('.k-heal')?.click();
      [...document.querySelectorAll('.bcard:not(:disabled)')].slice(0, 2).forEach((c) => c.click()); });
    await pump(2);
    await p.evaluate(() => document.querySelector('.cc-ok')?.click());
    await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(6);
    console.log('  round', r + 1, JSON.stringify(await p.evaluate(() => { const b = window.QD.S.battle; return { hp: b.hp, en: b.enemies.map((e) => e.hp), mg: b.magic }; })));
    for (let k = 0; k < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
    if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) { await p.waitForTimeout(400); if (r < 1) { await note(`fight ${f} round ${r + 2} reset`); } }
  }
  const o = await p.evaluate(() => window.QD.S.battle.outcome); console.log('outcome', o);
  for (let i = 0; i < 30 && !(await p.evaluate(() => document.querySelector('.sx-victory, .sx-defeat'))); i++) await pump(1);
  await pump(2); await note(`fight ${f} ${o} screen`); await shot(`f${f}-2-end`);
  if (o !== 'victory') { await p.evaluate(() => document.querySelector('.sx-defeat .sx-cta .sx-btn')?.click()); await pump(2); await p.evaluate(() => { const { S, E, showBoard } = window.QD; S.hero.hp; showBoard(); }); await pump(1); f--; continue; }
  if (o === 'victory') {
    await p.evaluate(() => { document.querySelector('.sx-perk')?.click(); }); await pump(0.5);
    await p.evaluate(() => { document.querySelector('.loot-row .sx-btn')?.click(); }); await pump(0.5);
  }
  await p.evaluate(() => { const bt = document.querySelector('.sx-cta .sx-btn'); if (bt && !bt.disabled) bt.click(); }); await pump(2);
  await note(`fight ${f} camp`); await shot(`f${f}-3-camp`);
  // spend gold like a new player: unlock the first die, then place a symbol
  await p.evaluate(() => { document.querySelector('.tal-unlocks .ur-buy:not(:disabled)')?.click(); }); await pump(0.6);
  await p.evaluate(() => { document.querySelector('.tal-die .tal-slot:not(.full):not(:disabled)')?.click(); }); await pump(0.4);
  await p.evaluate(() => { [...document.querySelectorAll('.tal-opt:not(:disabled)')][0]?.click(); }); await pump(0.5);
  await p.evaluate(() => { document.querySelector('.sx-camp .sx-cta .sx-btn')?.click(); }); await pump(2);
  const sc = await p.evaluate(() => document.querySelector('.sx-screen')?.className || '');
  if (/road/.test(sc)) { await note(`after fight ${f} road`); await shot(`f${f}-4-road`); }
}
console.log(problems.length ? `PROBLEMS: ${[...new Set(problems)].join(' | ')}` : 'no console errors'); await b.close();
