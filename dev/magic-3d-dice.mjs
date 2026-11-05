// Sample 3D dice for the magic cards (Dave, 6 Nov 2026: "a 3-D looking image … use the same image for the D4, the same image for the D6,
// the same image for the D8, and the same image for the D10, but then just color that dice"). Rendered by the game's own 3D dice
// (js/gfx/dice: the same geometry and painter as the battle board), turned three-quarters like the camp's dice, one per size and colour.
// Mockups only. Headless Chromium, not Safari.     node dev/magic-3d-dice.mjs [out=shots/magic-3d-dice]
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/magic-3d-dice'; const port = 8272; fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; const errs = [];
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
process.on('exit', () => server.kill());
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.E, null, { timeout: 240000 });
const out = await p.evaluate(async () => {
  const F = await import('./js/gfx/dice/faces.js'); const S = await import('./js/g3/screens.js');
  // a coloured die for each of the game's colours (the painter's colour themes; pink is splash)
  const COL = { atk: ['#ff3b3b', 'Attack'], pierce: ['#ff8a1a', 'Pierce'], splash: ['#ff4fb8', 'Splash'], block: ['#3aa4ff', 'Block'], heal: ['#38e87a', 'Heal'], gold: ['#ffc21a', 'Gold'], magic: ['#b46cff', 'Magic'] };
  if (!F.THEMES['pet-splash']) { const base = F.THEMES['pet-atk']; const c = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.round(Math.min(255, v * k)).toString(16).padStart(2, '0'); return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`; };
    F.THEMES['pet-splash'] = { ...base, name: 'pet-splash', core: c('#ff4fb8', 0.82), mid: c('#ff4fb8', 0.62), edge: c('#ff4fb8', 0.34), trim: ['#ffd6ee', '#ff86c8', c('#ff4fb8', 0.4)] }; }
  const shots = {};
  for (const [k] of Object.entries(COL)) for (const s of [4, 6, 8, 10]) {
    const labels = Array.from({ length: s }, (_, i) => ({ text: String(i + 1) }));
    const spec = { sides: s, theme: `pet-${k}`, labels, key: `m3d|${k}|${s}` };
    shots[`${k}-${s}`] = await S.portraitQ.die(spec, s);
  }
  // a sheet: one row per colour, d4 d6 d8 d10
  const wrap = document.createElement('div'); Object.assign(wrap.style, { position: 'fixed', inset: 0, zIndex: 99999, background: '#efe2c4', padding: '14px', fontFamily: 'sans-serif' }); wrap.id = 'sheet';
  wrap.innerHTML = `<div style="display:grid;grid-template-columns:70px repeat(4,1fr);gap:6px;align-items:center;font:800 14px/1 sans-serif;color:#3a2614">
    <span></span>${[4, 6, 8, 10].map((s) => `<b style="text-align:center">d${s}</b>`).join('')}
    ${Object.entries(COL).map(([k, [c, n]]) => `<b style="color:${c};-webkit-text-stroke:.3px #0005">${n}</b>${[4, 6, 8, 10].map((s) => shots[`${k}-${s}`] ? `<img src="${shots[`${k}-${s}`]}" style="width:72px;height:72px;object-fit:contain;justify-self:center">` : '<i>×</i>').join('')}`).join('')}</div>`;
  document.body.append(wrap);
  // a card: Cleave I with real red d6s in its sockets, beside today's flat ones
  const MC = await import('./js/g3/magiccard.js'); const PW = await import('./js/g3/powers.js'); const E = window.QD.E;
  const cards = document.createElement('div'); cards.id = 'cards'; Object.assign(cards.style, { position: 'fixed', inset: 0, zIndex: 99998, background: '#120c18', padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', overflow: 'auto' });
  for (const [id, cls, k, s] of [['cleave', 'knight', 'atk', 6], ['arcbolt', 'wizard', 'atk', 8], ['mending', 'bard', 'heal', 6], ['anvil', 'dwarf', 'block', 8]]) {
    const hero = E.newHero({ name: 'D3', cls, seed: 3 }); const c = MC.campCard(hero, id, { glyph: PW.glyph }); const box = document.createElement('div'); box.style.width = '340px'; box.dataset.id = id; box.append(c); cards.append(box);
    for (const d of c.querySelectorAll('.t28-dice .mc-die')) { const img = document.createElement('img'); img.src = shots[`${k}-${s}`]; img.className = 'mc-die'; img.style.cssText = 'object-fit:contain;filter:drop-shadow(0 3px 3px #0006)'; d.replaceWith(img); }
  }
  document.body.append(cards);
  await new Promise((r) => setTimeout(r, 1200));
  return Object.values(shots).filter(Boolean).length;
});
console.log('dice rendered:', out);
const sheet = await p.$('#sheet > div'); await sheet.screenshot({ path: `${OUT}/sheet.png` });
await p.evaluate(() => { document.getElementById('sheet').remove(); });
for (const id of ['cleave', 'arcbolt', 'mending', 'anvil']) { const e = await p.$(`#cards [data-id="${id}"]`); await e.scrollIntoViewIfNeeded(); await p.waitForTimeout(150); await e.screenshot({ path: `${OUT}/card-${id}.png` }); }
console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors'); await br.close(); process.exit(errs.length ? 1 : 0);
