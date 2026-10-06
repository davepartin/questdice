import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 462, height: 783 } });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
console.log(JSON.stringify(await p.evaluate(async () => {
  const { createActor } = await import('/js/gfx/actors/index.js'); const D = await import('/js/data.js'); const out = {};
  const THREE = await import('three');
  for (const id of ['hero', ...Object.keys(D.MONSTERS)]) { try { const a = await createActor(id, id === 'hero' ? { cls: 'knight', loadout: { NW: { id: 'sword', rarity: 0, uid: 'a' }, NE: { id: 'shield', rarity: 0, uid: 'b' } }, level: 1, seed: 1, quality: 'low' } : { tier: D.MONSTERS[id].tier, seed: 5, quality: 'low' }); const bb = new THREE.Box3().setFromObject(a.root); out[id] = { h: +(a.height || 0).toFixed(2), bboxH: +(bb.max.y - bb.min.y).toFixed(2), w: +(bb.max.x - bb.min.x).toFixed(2) }; } catch (e) { out[id] = String(e).slice(0, 60); } }
  return out; })));
await b.close();
