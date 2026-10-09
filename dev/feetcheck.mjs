// Where each hero's lowest point sits against the hero-choice pedestal top (0.34): soles should rest on it.  node dev/feetcheck.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 430, height: 740 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => window.QD.showCreate()); await pump(16);
for (const cls of ['Knight', 'Ranger', 'Wizard', 'Dwarf', 'Bard']) {
  await p.evaluate((c) => [...document.querySelectorAll('button')].find((x) => x.textContent.trim().toUpperCase() === c.toUpperCase())?.click(), cls); await pump(8);
  console.log(cls, await p.evaluate(() => {
    const hero = window.QD.scr.current()?.hero; const pivot = hero?.root;
    if (!pivot) return 'no hero'; const THREE = Object.getPrototypeOf(pivot.position).constructor;
    let minY = 1e9; const feet = []; const v = new THREE(); pivot.updateMatrixWorld(true);
    pivot.traverse((o) => { if (o.isSkinnedMesh || o.isMesh) { const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i += 3) { v.fromBufferAttribute(pos, i); if (o.isSkinnedMesh) o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); if (v.y < minY) minY = v.y; } } if (o.isBone && /foot/.test(o.name)) { const w = new THREE(); o.getWorldPosition(w); feet.push(`${o.name}:${w.y.toFixed(3)}`); } });
    return `lowest point y=${minY.toFixed(3)} (pedestal top 0.34) ${feet.join(' ')}`;
  }));
}
for (const anim of ['idle', 'ready']) { await p.evaluate((a) => window.QD.scr.current().hero.play(a, { restart: true }), anim); await pump(3);
  console.log(anim, await p.evaluate(() => { const r = window.QD.scr.current().hero.root; let minY = 1e9; const V = Object.getPrototypeOf(r.position).constructor; const v = new V(); r.updateMatrixWorld(true);
    r.traverse((o) => { if (o.isSkinnedMesh || o.isMesh) { const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i += 3) { v.fromBufferAttribute(pos, i); if (o.isSkinnedMesh) o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); minY = Math.min(minY, v.y); } } }); return minY.toFixed(3); })); }
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: 'docs/ingame/feet_check.png' });
await b.close();
