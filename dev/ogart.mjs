// Export big portraits of heroes and monsters (PNG) for the link-preview picture.  node dev/ogart.mjs OUTDIR
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 800, height: 600 } });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=high'); await p.waitForFunction(() => window.QD?.scr?.portraitQ, null, { timeout: 120000 });
const jobs = [
  ...['knight', 'ranger', 'wizard', 'dwarf', 'bard'].map((c) => [`hero_${c}`, `window.QD.scr.portraitQ.hero('${c}', { size: [720, 880] })`]),
  ['king', `window.QD.scr.portraitQ.monster('goblinking', { size: [900, 900], yaw: -0.45 })`],
  ['ogre', `window.QD.scr.portraitQ.monster('ogre', { size: [900, 900], yaw: -0.45 })`],
  ['wolf', `window.QD.scr.portraitQ.monster('wolf', { size: [900, 900], yaw: -0.5 })`],
  ['goblin', `window.QD.scr.portraitQ.monster('goblin', { size: [700, 700], yaw: -0.5 })`],
  ['mage', `window.QD.scr.portraitQ.monster('cultist', { size: [700, 700], yaw: -0.45 })`],
];
for (const [name, expr] of jobs) {
  const url = await p.evaluate(async (expr) => { const u = await eval(expr); if (!u) return null; if (u.startsWith('data:')) return u; const r = await fetch(u); const bl = await r.blob(); return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(bl); }); }, expr);
  if (!url) { console.log('no', name); continue; }
  fs.writeFileSync(`${out}/${name}.png`, Buffer.from(url.split(',')[1], 'base64')); console.log('wrote', name);
}
await b.close();
