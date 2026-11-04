// Weapon cards at phone size (for comparing with the T28 magic cards). node dev/weapon-shots.mjs <out>  (headless Chromium, not Safari)
import { chromium } from 'playwright-core'; import { spawn } from 'node:child_process';
const OUT = process.argv[2]; const port = 8205;
const server = spawn(process.execPath, ['dev/serve.mjs', String(port)], { cwd: '/home/user/questdice', stdio: ['ignore', 'pipe', 'inherit'] }); await new Promise((r) => server.stdout.once('data', r)); process.on('exit', () => server.kill());
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.goto(`http://127.0.0.1:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.E, null, { timeout: 240000 });
const ids = await p.evaluate(async () => { const CB = await import('./js/g3/cardboard.js'); const E = window.QD.E; const D = await import('./js/data.js');
  const hero = E.newHero({ name: 'Wcards', cls: 'knight', seed: 3 }); hero.level = 6; const wrap = document.createElement('div'); Object.assign(wrap.style, { position: 'fixed', inset: 0, overflow: 'auto', zIndex: 99999, background: '#120c18', padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }); document.body.append(wrap);
  const pick = Object.keys(D.WEAPONS).filter((id) => id !== 'fists').slice(0, 40); const want = [hero.loadout.NW, hero.loadout.NE].filter(Boolean); const out = [];
  for (const inst of want) { const box = document.createElement('div'); box.dataset.id = 'w-' + inst.id; box.style.width = '340px'; box.append(CB.weaponCard(hero, null, inst)); wrap.append(box); out.push('w-' + inst.id); }
  for (const id of ['axe', 'bow', 'staff', 'hammer'].filter((x) => D.WEAPONS[x])) { const inst = E.makeWeapon ? E.makeWeapon(id, 1, E.makeRng(5), 6) : null; if (!inst) continue; const box = document.createElement('div'); box.dataset.id = 'w2-' + id; box.style.width = '340px'; box.append(CB.weaponCard(hero, null, inst)); wrap.append(box); out.push('w2-' + id); }
  return out; });
await p.waitForTimeout(2500);
for (const id of ids) { const el = await p.$(`[data-id="${id}"]`); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `${OUT}/${id}.png` }); }
console.log(ids.join(' ')); await br.close(); process.exit(0);
