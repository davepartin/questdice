// Fights against named monsters, round after round with a simple bot; screenshots each round's result card and logs
// anything that breaks (errors, a stuck round, text that spills).   node dev/bossrun.mjs tag w h cls "ogre,goblin" [rounds]
import { chromium } from 'playwright-core';
const [tag = 'br', W = 393, H = 852, cls = 'knight', en = 'ogre,goblin', rounds = 4] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1.5, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(`pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) problems.push(`console ${m.text().slice(0, 200)}`); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${tag}_${n}.png` }); };
await p.evaluate((cls) => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls, seed: 11 }); h.level = 10; h.strength = { W: 8, E: 8 }; h.special = { SW: 8, SE: 8 }; S.hero = h; S.company = { members: [h] }; showBoard(); }, cls);
await pump(1);
await p.evaluate((en) => { const E = window.QD.E; const q = { ...E.questsFor(window.QD.S.hero)[0], enemies: en.split(','), kind: 'battle' }; window.QD.startQuest(q); }, en);
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(3); await shot('0start');
const overflow = () => p.evaluate(() => { const bad = []; for (const el of document.querySelectorAll('.fb-card, .fb-name, .fb-intent, .rc, .rc-line')) { const r = el.getBoundingClientRect(); if (r.width && (r.right > innerWidth + 1 || r.left < -1)) bad.push(`${el.className} ${Math.round(r.left)}..${Math.round(r.right)}`); } return bad; });
for (let r = 1; r <= +rounds; r++) {
  if (await p.evaluate(() => window.QD.S.battle?.outcome)) break;
  for (let k = 0; k < 40 && !(await p.evaluate(() => !!document.querySelector('#b3-roll') && !window.QD.B3.battleState.busy)); k++) await pump(0.5);
  await p.evaluate(() => document.querySelector('.rc')?.click());
  await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(5);
  for (let k = 0; k < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
  await p.evaluate(() => document.querySelector('#b3-lock')?.click());
  await pump(2); await shot(`r${r}_mid`);
  let n = 0; for (; n < 60 && await p.evaluate(() => window.QD.B3.battleState.busy); n++) await pump(1);
  if (n >= 60) problems.push(`round ${r}: still busy after 60s`);
  await pump(1); await p.waitForTimeout(500); await shot(`r${r}_card`);
  const sc = await p.evaluate(() => { const c = document.querySelector('.rc'); return c ? c.scrollHeight - c.clientHeight : -1; }); if (sc > 2) problems.push(`round ${r}: the recap card scrolls by ${sc}px`);
  const ov = await overflow(); if (ov.length) problems.push(`round ${r} overflow: ${ov.join('; ')}`);
  console.log(`round ${r}:`, await p.evaluate(() => { const b = window.QD.S.battle; return JSON.stringify({ hp: b.hp, foes: b.enemies.filter((e) => e.hp > 0).map((e) => `${e.id}:${e.hp}`), outcome: b.outcome }); }));
}
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no problems');
await b.close();
