// T29 weapon cards at phone size: every weapon (the six) at Bronze, Silver and Gold and every die size, as the camp shows them
// (CB.weaponCard, with the grow strips), one picture each, and a check that nothing spills off the card. Headless Chromium, not Safari.
//   node dev/weapon-cards-t29.mjs [out=shots/weapon-cards] [port=8240]      ONLY=dagger,axe   SIZES=4,8
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.argv[2] || 'shots/weapon-cards'; const port = +(process.argv[3] || 8240); fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'; const errs = []; let bad = 0;
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r));
process.on('exit', () => server.kill());
const br = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => errs.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.E, null, { timeout: 240000 });
const ids = await p.evaluate(async ([only, sizes]) => {
  const CB = await import('./js/g3/cardboard.js'); const E = window.QD.E;
  const wrap = document.createElement('div'); wrap.id = 'cards'; Object.assign(wrap.style, { position: 'fixed', inset: '0', overflow: 'auto', zIndex: 99999, background: '#120c18', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' });
  document.body.append(wrap); const out = []; const hero = E.newHero({ name: 'Cards', cls: 'knight', seed: 3 }); hero.gold = 120;
  for (const id of only) for (const r of [0, 1, 2]) for (const z of sizes) {
    const inst = { ...E.makeWeapon(id, r, () => 0.5, z), ...(id === 'quiver' ? { ammo: 'fire' } : {}) };
    const box = document.createElement('div'); box.dataset.id = `${id}-${['bronze', 'silver', 'gold'][r]}-d${z}`; box.style.width = '360px';
    const c = CB.weaponCard(hero, null, inst); c.style.setProperty('--w', '360px'); box.append(c); wrap.append(box); out.push(box.dataset.id); }
  return out; }, [(process.env.ONLY || 'dagger,sword,axe,staff,shield,bow,quiver').split(','), (process.env.SIZES || '4,6,8,10').split(',').map(Number)]);
await p.waitForTimeout(2500);
for (const id of ids) {
  const el = await p.$(`[data-id="${id}"]`); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(80); await el.screenshot({ path: `${OUT}/${id}.png` });
  const spill = await p.evaluate((id) => { const box = document.querySelector(`[data-id="${id}"]`); const card = box.querySelector('.qc17').getBoundingClientRect(); const out = [];
    for (const e of box.querySelectorAll('.t29-panel *, .t29-name *')) { const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue; if (r.left < card.left - 1 || r.right > card.right + 1 || r.bottom > card.bottom + 1) out.push(e.className?.baseVal ?? e.className); }
    const parts = ['.t29-art', '.t29-name', '.t29-panel'].map((q) => box.querySelector(q)?.getBoundingClientRect()); if (parts.some((r) => !r || r.height < 8)) out.push('a part has no height'); else if (!(parts[0].bottom <= parts[1].top + 1 && parts[1].bottom <= parts[2].top + 1)) out.push('picture, name and panel are not in order');
    const last = [...box.querySelectorAll('.t29-panel > *')].pop()?.getBoundingClientRect(); const panel = box.querySelector('.t29-panel')?.getBoundingClientRect(); if (last && panel && last.bottom > panel.bottom + 1) out.push('panel overflows');
    const name = box.querySelector('.t29-name span'); if (name && name.scrollWidth > name.clientWidth + 1) out.push('name cut off');
    return [...new Set(out)].slice(0, 4); }, id);
  if (spill.length) { bad++; console.log('FAIL', id, spill.join(', ')); }
}
console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors'); console.log(bad ? `${bad} cards spill` : `all ${ids.length} cards fit`);
await br.close(); process.exit(bad || errs.length ? 1 : 0);
