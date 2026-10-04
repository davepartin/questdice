// Drive the real game headlessly in manual time and take screenshots.
//   node dev/play.mjs --port 8123 --out shots/play [--w 1280 --h 720] [--q med] [--cls knight] [--step 1] [--script file.json]
// Script steps: {"pump":1.5}, {"eval":"js"}, {"click":"#b3-roll"}, {"until":"js expr truthy","max":20}, {"shot":"name"}, {"size":[w,h]}
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const port = args.port || 8123; const out = args.out || 'shots/play';
const W = Number(args.w || 1280); const H = Number(args.h || 720);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: !!args.touch });
const logs = []; p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); }); p.on('pageerror', (e) => logs.push(`[pageerror] ${e.stack}`));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto(`http://localhost:${port}/?debug&manual${args.q ? `&q=${args.q}` : ''}${args.dpr ? `&dpr=${args.dpr}` : ''}`);
await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 60000 });
const pump = (s) => p.evaluate((s) => window.QD.world.stage.simulate(s), s);
const render = () => p.evaluate(() => window.QD.world.stage.step(1));
const shot = async (n) => { await render(); await p.screenshot({ path: path.join(out, `${n}.png`) }); console.log('wrote', path.join(out, `${n}.png`)); };
const until = async (expr, max = 30) => { for (let i = 0; i < max * 4; i++) { if (await p.evaluate(`!!(${expr})`)) return true; await pump(0.25); } console.log('until timeout:', expr); return false; };
const setup = async () => {
  await p.evaluate((cls) => { const { S, E, showBoard } = window.QD; const hero = E.newHero({ name: 'Dave', cls: cls || 'knight', seed: 7 }); S.hero = hero; S.company = { members: [hero] }; showBoard(); }, args.cls);
  await pump(0.3);
};
await setup();
const steps = args.script ? JSON.parse(fs.readFileSync(args.script, 'utf8')) : [
  { eval: "const q = QD.E.questsFor(QD.S.hero)[0]; QD.startQuest(q);" }, { until: "QD.B3.battleState.bw && !QD.B3.battleState.busy", max: 40 }, { pump: 1 }, { shot: 'reset' },
  { click: '#b3-roll' }, { until: "!QD.B3.battleState.busy && QD.S.battle.phase === 'shape'", max: 10 }, { pump: 1.2 }, { shot: 'shape' },
];
for (const s of steps) {
  if (s.size) { await p.setViewportSize({ width: s.size[0], height: s.size[1] }); await pump(0.3); }
  if (s.eval) { const r = await p.evaluate(`(async()=>{ ${s.eval} })()`); if (r !== undefined) console.log('eval ->', JSON.stringify(r)); }
  if (s.click) await p.click(s.click);
  if (s.until) await until(s.until, s.max);
  if (s.pump) await pump(s.pump);
  if (s.shot) await shot(s.shot);
}
if (logs.length) console.log([...new Set(logs)].slice(0, 15).join('\n'));
await b.close();
