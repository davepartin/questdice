// Renders the real die faces used by the Learn to play lessons into assets/tutorial/*.png.
//   node dev/serve.mjs 8135 &  then  node dev/tutart.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1200, height: 520 }, deviceScaleFactor: 3 });
p.on('pageerror', (e) => console.log('ERR', e.message));
// [file prefix, query, which faces to keep (1-based) -> names]
const ANGLED = 'cam=0,4.96,6.24&look=0,0.25,0&fov=26';
const TOP = 'cam=0,7.5,0.9&look=0,0,0&fov=30';
const only = process.argv[2] ? process.argv[2].split(',') : null;
const jobs = [
  ['white', 'slot=N&cls=knight', { 1: 'white-1', 2: 'white-2', 3: 'white-3', 4: 'white-4' }],
  ['hand6', 'slot=W&cls=knight', { 5: 'white-5', 6: 'white-6' }],
  ['heart', 'slot=C&cls=knight&cols=6', { 1: 'heart-1', 2: 'heart-2', 3: 'heart-3', 4: 'heart-4', 5: 'heart-5', 6: 'heart-6' }],
  ['sword', 'slot=NW&cls=knight&weapons=sword,shield', { 1: 'weapon-zero', 3: 'weapon-red3', 4: 'weapon-red4' }],
  ['shield', 'slot=NW&cls=knight&weapons=shield,sword', { 3: 'weapon-blue3', 4: 'weapon-blue4' }],
  ['talent', 'slot=SW&cls=knight&spec=4', { 1: 'talent-blank', 3: 'talent-x2', 4: 'talent-heal' }],
];
for (const [tag, q, keep] of jobs) {
  if (only && !only.includes(tag)) continue;
  const camq = ['white', 'sword', 'shield', 'talent'].includes(tag) ? ANGLED : TOP;
  await p.goto(`http://localhost:8135/dev/viewer.html?m=gfx/demo/dicegallery.js&${q}&style=clean&${camq}`);
  await p.waitForFunction(() => window.__qd?.ready, null, { timeout: 60000 }); await p.waitForTimeout(3500);
  const tight = camq === ANGLED;
  const boxes = await p.evaluate((tight) => {
    const { stage, THREE } = window.__qd; const W = innerWidth; const H = innerHeight;
    return window.__qd.dice.map((d) => {
      const box = new THREE.Box3().setFromObject(d.mesh); const xs = []; const ys = [];
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const q = new THREE.Vector3(x, y, z).project(stage.camera); xs.push((q.x * 0.5 + 0.5) * W); ys.push((-q.y * 0.5 + 0.5) * H); }
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2; const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const s = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * (tight ? 0.4 : 0.56);
      const oy = tight ? s * 0.22 : 0;
      return { x: cx - s, y: cy - s + oy, w: 2 * s, h: 2 * s };
    });
  }, tight);
  for (const [face, name] of Object.entries(keep)) {
    const bx = boxes[face - 1]; if (!bx) { console.log('missing', tag, face); continue; }
    await p.screenshot({ path: `assets/tutorial/${name}.png`, clip: { x: Math.max(0, bx.x), y: Math.max(0, bx.y), width: bx.w, height: bx.h }, timeout: 180000 });
  }
  console.log(tag, 'ok', boxes.length, 'dice', Math.round(boxes[0].w) + 'px');
}
await b.close();
