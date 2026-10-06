// Audit every face of every die for numerals touching symbols. node dev/audit.mjs outdir
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 900, height: 700 } });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const res = await p.evaluate(async () => {
  const { dieSpecs } = await import('/js/gfx/dice/dice.js');
  const { buildAtlas, setDiceStyle } = await import('/js/gfx/dice/faces.js');
  const { makePoly } = await import('/js/gfx/dice/poly.js');
  const E = window.QD.E; const D = window.QD.D || (await import('/js/data.js'));
  setDiceStyle('clean');
  const results = []; const sheets = [];
  const heroes = [];
  for (const cls of ['knight', 'ranger', 'wizard', 'dwarf', 'bard']) { const h = E.newHero({ name: 'A', cls, seed: 1, full: true }); heroes.push(h); }
  // vary hand/feet sizes so d6/d8/d10 faces are covered
  const sizes = [[4, 4], [6, 6], [8, 8], [10, 10]];
  const seen = new Set();
  for (const h of heroes) for (const [hs, fs] of sizes) {
    h.strength = { W: hs, E: hs }; h.speed = { S: fs }; h.special = { SW: hs <= 4 ? 4 : 6, SE: hs <= 4 ? 4 : 6 };
    const specs = dieSpecs(h);
    for (const slot of Object.keys(specs)) {
      const sp = specs[slot]; if (seen.has(sp.key)) continue; seen.add(sp.key);
      const poly = makePoly(sp.sides); const faces = new Array(poly.faces.length).fill(null);
      sp.labels.forEach((l, i) => { const fi = poly.labelFace[i]; if (fi != null && fi >= 0) faces[fi] = l; });
      const atlas = buildAtlas({ poly, faces, theme: sp.theme, quality: 'high' });
      for (const a of atlas.audit) results.push({ slot, theme: sp.theme, sides: sp.sides, cls: h.cls, ...a });
      sheets.push({ name: `${sp.theme}-d${sp.sides}-${slot}-${h.cls}`, url: atlas.canvases.A.toDataURL('image/png') });
    }
  }
  return { results, sheets };
});
const bad = res.results.filter((r) => r.gap != null && r.gap < 1);
console.log('faces audited with symbols:', res.results.filter((r) => r.gap != null).length, 'tight/overlapping:', bad.length);
for (const r of bad.slice(0, 40)) console.log(JSON.stringify({ t: r.theme, d: r.sides, text: r.text, gap: Math.round(r.gap), slot: r.slot }));
res.sheets.forEach((s, i) => fs.writeFileSync(`${out}/${String(i).padStart(2, '0')}-${s.name}.png`, Buffer.from(s.url.split(',')[1], 'base64')));
console.log('sheets', res.sheets.length); await b.close();
