// Render a gallery of in-game battle shots (the real game, real camera) for review.
//   node dev/gallery.mjs --port 8123 --out DIR [--w 1280 --h 720] [--q med] [--cls knight] [--only goblin,wolf]
// One reset frame and one shaped (rolled) frame per scene, for the five Act I monsters and a few places.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const port = args.port || 8123; const out = args.out || 'shots/gallery'; fs.mkdirSync(out, { recursive: true });
const W = Number(args.w || 1280); const H = Number(args.h || 720);
const SCENES = [
  { id: 'goblins', enemies: ['goblin', 'goblin'], place: 'Burnt Orchard', kind: 'battle' },
  { id: 'wolf', enemies: ['wolf'], place: 'Wolfwood Edge', kind: 'battle' },
  { id: 'cultist', enemies: ['cultist', 'goblin'], place: 'Smoke Hollow', kind: 'battle' },
  { id: 'ogre', enemies: ['ogre'], place: 'Ravens’ Rest', kind: 'elite' },
  { id: 'king', enemies: ['goblinking'], place: 'Gallows Hill', kind: 'boss' },
  { id: 'camp', enemies: ['wolf', 'goblin', 'cultist'], place: 'Ashfall Camp', kind: 'battle' },
  { id: 'bridge', enemies: ['goblin', 'wolf'], place: 'The Toll Bridge', kind: 'battle' },
  { id: 'ford', enemies: ['cultist'], place: 'Cinder Ford', kind: 'battle' },
].filter((s) => !args.only || args.only.split(',').some((o) => s.id === o));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const logs = []; p.on('console', (m) => { if (['error'].includes(m.type()) && !/ERR_CERT/.test(m.text())) logs.push(m.text()); }); p.on('pageerror', (e) => logs.push(e.stack));
await p.goto(`http://localhost:${port}/?debug&manual${args.q ? `&q=${args.q}` : ''}`);
await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 60000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; const n = Math.max(1, Math.round(s * 15)); for (let i = 0; i < n; i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const until = async (expr, max = 40) => { for (let i = 0; i < max * 4; i++) { if (await p.evaluate(`!!(${expr})`)) return true; await pump(0.25); await p.waitForTimeout(60); } return false; };
await p.evaluate((cls) => { const { S, E, showBoard } = window.QD; const hero = E.newHero({ name: 'Dave', cls: cls || 'knight', seed: 7 }); S.hero = hero; S.company = { members: [hero] }; showBoard(); }, args.cls);
for (const sc of SCENES) {
  await p.evaluate((sc) => { const { S, startQuest } = window.QD; startQuest({ id: `g.${sc.id}`, act: 1, step: sc.kind === 'boss' ? 10 : 3, kind: sc.kind, enemies: sc.enemies, place: sc.place, name: `${sc.place}`, hpMult: 1, flat: 2, rewardMult: 1, perilous: false }); }, sc);
  await until('QD.B3.battleState.bw && !QD.B3.battleState.busy && document.querySelector("#b3-roll")', 60);
  await pump(3.5);
  await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: path.join(out, `${sc.id}-reset.png`) });
  await p.evaluate(() => document.querySelector('#b3-roll')?.click());
  await until('!QD.B3.battleState.busy && QD.S.battle.phase === "shape"', 20); await pump(1);
  await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: path.join(out, `${sc.id}-shape.png`) });
  console.log('scene', sc.id);
  await p.evaluate(() => window.QD.B3.stop());
}
if (logs.length) console.log([...new Set(logs)].slice(0, 10).join('\n'));
await b.close();
