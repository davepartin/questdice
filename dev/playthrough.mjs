// Plays the real game through the real screens with a bot: board -> fight -> victory -> camp -> road -> board ... and reports what breaks.
//   node dev/playthrough.mjs --port 8135 --fights 6 --out DIR [--w 390 --h 844] [--q low] [--cls knight]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const port = args.port || 8135; const out = args.out || 'shots/playthrough'; fs.mkdirSync(out, { recursive: true });
const W = Number(args.w || 390); const H = Number(args.h || 844); const FIGHTS = Number(args.fights || 6);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
const problems = [];
p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load resource/.test(m.text())) problems.push(`[console] ${m.text()}`); });
p.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto(`http://localhost:${port}/?debug&manual&q=${args.q || 'low'}`);
await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: path.join(out, `${n}.png`) }); };
const log = (...a) => console.log(...a);
await p.evaluate(([cls, strong]) => { const { S, E, showBoard } = window.QD; const hero = E.newHero({ name: 'Dave', cls: cls || 'knight', seed: 11 }); if (strong) { hero.level = 10; hero.strength = { W: 8, E: 8 }; hero.special = { SW: 8, SE: 8 }; hero.gold = 400; } S.hero = hero; S.company = { members: [hero] }; showBoard(); }, [args.cls, !!args.strong]);
await pump(1);
const seenShots = new Set();
const screenOf = () => p.evaluate(() => {
  if (document.querySelector('#b3-roll, #b3-lock') || window.QD.S.battle && !window.QD.S.battle.outcome && document.querySelector('.b3')?.offsetParent) return 'battle';
  const s = document.querySelector('.sx-screen'); if (!s) return 'none';
  return ['victory', 'defeat', 'camp', 'road', 'board', 'title', 'create'].find((c) => s.classList.contains(c)) || s.className;
});
const click = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (e && !e.disabled) { e.click(); return true; } return false; }, sel);
let fights = 0; let victoryCounted = false; let stuck = 0; let lastScreen = ''; const t0 = Date.now();
for (let guard = 0; guard < 400 && fights < FIGHTS; guard++) {
  const sc = await screenOf();
  if (sc !== lastScreen) { log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] screen: ${sc}${sc === 'battle' ? ` (fight ${fights + 1})` : ''}`); lastScreen = sc; stuck = 0; } else stuck++;
  if (stuck > 25) { problems.push(`stuck on ${sc}`); await shot(`stuck-${sc}`); break; }
  if (!seenShots.has(sc)) { seenShots.add(sc); await pump(1.5); await shot(sc); }
  if (sc === 'board') { await p.evaluate(() => document.querySelector('.sx-qcard')?.click()); await pump(2); }
  else if (sc === 'battle') {
    victoryCounted = false;
    const r = await p.evaluate(() => { const B = window.QD.S.battle; return { outcome: B?.outcome, phase: B?.phase, busy: window.QD.B3.battleState.busy, roll: !!document.querySelector('#b3-roll'), lock: !!document.querySelector('#b3-lock') }; });
    if (r.outcome) { await pump(3); continue; }
    if (r.busy) { await pump(1); continue; }
    if (r.roll) { await click('#b3-roll'); await pump(2.5); continue; }
    if (r.lock) {
      // exercise the magic buttons once in a while: heal when hurt, then lock in
      if (Math.random() < 0.3) await p.evaluate(() => document.querySelector('.k-heal')?.click());
      await click('#b3-lock'); await pump(5); continue;
    }
    await pump(1);
  } else if (sc === 'victory') {
    if (!victoryCounted) { fights++; victoryCounted = true; }
    await p.evaluate(() => { document.querySelector('.sx-perk')?.click(); });
    await pump(0.5);
    await p.evaluate(() => { document.querySelector('.loot-row .sx-btn')?.click(); });
    await pump(0.5);
    await p.evaluate(() => { const bt = document.querySelector('.sx-victory .sx-cta .sx-btn'); if (bt && !bt.disabled) bt.click(); });
    await pump(1.5);
  } else if (sc === 'camp') {
    if (!seenShots.has('camp-forge')) { seenShots.add('camp-forge'); }
    // spend gold the way a player would: any affordable upgrade, then go on
    for (let i = 0; i < 6; i++) { const ok = await p.evaluate(() => { const bt = [...document.querySelectorAll('.ur-buy')].find((x) => !x.disabled); if (bt) { bt.click(); return true; } return false; }); if (!ok) break; await pump(0.6); }
    const gold = await p.evaluate(() => window.QD.S.hero.gold); log(`   camp: gold left ${gold}, strength ${JSON.stringify(await p.evaluate(() => window.QD.S.hero.strength))}`);
    await p.evaluate(() => { const bt = document.querySelector('.sx-camp .sx-cta .sx-btn'); bt?.click(); });
    await pump(1.5);
  } else if (sc === 'road') {
    const did = await p.evaluate(() => { const c = [...document.querySelectorAll('.sx-choice')].find((x) => !x.disabled && !x.classList.contains('off')); if (c) { c.click(); return 'choice'; } const o = document.querySelector('.sx-road .sx-cta .sx-btn'); if (o) { o.click(); return 'onward'; } return null; });
    log(`   road: ${did}`); await pump(1.5);
  } else if (sc === 'defeat') {
    log('   DEFEAT'); await p.evaluate(() => document.querySelector('.sx-defeat .sx-cta .sx-btn')?.click()); await pump(1.5);
  } else await pump(1);
}
const h = await p.evaluate(() => { const x = window.QD.S.hero; return { level: x.level, gold: x.gold, strength: x.strength, special: x.special, bag: x.bag.length, step: x.campaign.step, wins: x.campaign.wins, perks: x.perks }; });
log('hero after:', JSON.stringify(h));
log(problems.length ? `PROBLEMS:\n${[...new Set(problems)].join('\n')}` : 'no console errors');
await b.close();
