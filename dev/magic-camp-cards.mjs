// Every class power's camp card (the T28 template), one picture each, at phone size (headless Chromium, not Safari).
//   node dev/magic-camp-cards.mjs [out=shots/magic-camp] [port=8204]      LEVEL=n sets the hero's rank level (default 0)
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/magic-camp'; const port = +(process.argv[3] || 8204); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; const errs = []; let bad = 0;
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
process.on('exit', () => server.kill());
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.E, null, { timeout: 240000 });
const ids = await p.evaluate(async (lvl) => {
  const MC = await import('./js/g3/magiccard.js'); const PW = await import('./js/g3/powers.js'); const { E, D } = { E: window.QD.E, D: await import('./js/data.js') };
  const wrap = document.createElement('div'); wrap.id = 'cards'; Object.assign(wrap.style, { position: 'fixed', inset: '0', overflow: 'auto', zIndex: 99999, background: '#120c18', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' });
  document.body.append(wrap); const out = [];
  for (const cls of ['knight', 'ranger', 'wizard', 'dwarf', 'bard']) { const hero = E.newHero({ name: 'Cards' + cls, cls, seed: 3 }); hero.level = 6; hero.gold = 0;
    for (const k of D.CLASSES[cls].cards) { hero.powerLevel = { ...(hero.powerLevel || {}), [k.id]: lvl }; const c = MC.campCard(hero, k.id, { glyph: PW.glyph }); const box = document.createElement('div'); box.dataset.id = `${cls}-${k.id}`; box.style.width = '340px'; box.append(c); wrap.append(box); out.push(`${cls}-${k.id}`); } }
  return out; }, +(process.env.LEVEL || 0));
await p.waitForTimeout(+(process.env.WAIT || 2500));
for (const id of ids) {
  const el = await p.$(`[data-id="${id}"]`); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(150); await el.screenshot({ path: `${OUT}/${id}.png` });
  const clash = await p.evaluate((id) => { const box = document.querySelector(`[data-id="${id}"]`); const card = box.querySelector('.mc-card').getBoundingClientRect(); const bad = [];
    for (const el of box.querySelectorAll('.t28 *, .mc-cov *')) { const r = el.getBoundingClientRect(); if (!r.width) continue; if (r.left < card.left - 1 || r.right > card.right + 1 || r.bottom > card.bottom + 1) bad.push(el.className?.baseVal ?? el.className); }
    const panel = box.querySelector('.t28'); const cov = box.querySelector('.mc-lv:not(.act)'); if (panel && cov) { const pb = Math.max(...[...panel.children].map((c) => c.getBoundingClientRect().bottom)); if (pb > cov.getBoundingClientRect().top + 1) bad.push('panel runs under the rank covers'); }
    return bad.slice(0, 4); }, id);
  if (clash.length) { bad++; console.log('FAIL', id, 'spills past the card:', clash.join(', ')); }
}
console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors'); console.log(bad ? `${bad} cards spill` : `all ${ids.length} cards fit`);
await br.close(); process.exit(bad || errs.length ? 1 : 0);
