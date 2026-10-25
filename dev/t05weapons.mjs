// T05: the weapon card (rev 14, current-rule mode) drawn by the shared renderer from real weapon instances: every metal and size, shields (blue faces), Bow and Arrows
// with each ammunition, a legendary and a two-hander, at the full-card width and as a spoils thumbnail. Reports whether every die photograph arrived and how long it took.
//   node dev/serve.mjs 8140   then   node dev/t05weapons.mjs [port=8140] [out=docs/team/tasks/T05/weapons]
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const port = process.argv[2] || 8140; const OUT = process.argv[3] || 'docs/team/tasks/T05/weapons'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 1, hasTouch: true });
const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('console.error', m.text().slice(0, 160)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch { /* */ } });
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 });
const res = await p.evaluate(async () => {
  const CW = await import('./js/g3/cards.js'); const E = window.QD.E; const D = await import('./js/data.js');
  const mk = (id, r, size = 4, ex = {}) => ({ ...E.makeWeapon(id, r, () => 0.5, size), ...ex });
  const set = [['Bronze Sword d4', mk('sword', 0)], ['Silver Sword d6', mk('sword', 1, 6)], ['Gold Axe d8', mk('axe', 2, 8)], ['Silver Spear d10', mk('spear', 1, 10)], ['Gold Dagger d10', mk('dagger', 2, 10)], ['Bronze Dagger d4', mk('dagger', 0)],
    ['Bronze Round Shield d4', mk('shield', 0)], ['Silver Tower Shield d6', mk('tower', 1, 6)], ['Bronze Bow d4', mk('bow', 0)], ['Bronze Arrows d4', mk('quiver', 0)], ['Silver Fire Arrows d6', mk('quiver', 1, 6, { ammo: 'fire' })], ['Gold Frost Arrows d8', mk('quiver', 2, 8, { ammo: 'frost' })], ['Gold Piercing Arrows d10', mk('quiver', 2, 10, { ammo: 'pierce' })]];
  const leg = Object.keys(D.WEAPONS).find((id) => D.WEAPONS[id].legendary); if (leg) set.push([`Legendary ${leg}`, mk(leg, 3, 6)]);
  const holder = document.createElement('div'); holder.id = 'wtest'; holder.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#15100c;padding:8px;display:flex;flex-wrap:wrap;gap:10px;width:1180px;overflow:auto;max-height:100vh'; document.body.append(holder);
  const out = [];
  for (const [w, mode] of [[300, 'full'], [136, 'thumb']]) {
    holder.innerHTML = ''; const t0 = performance.now();
    for (const [label, inst] of set) { const d = CW.weaponData(inst, { label: 'Sell', value: E.sellValue ? E.sellValue(inst) : 5 }); const el = CW.weaponCardEl(d); el.style.setProperty('--w', `${w}px`); el.dataset.label = label; holder.append(el); }
    const deadline = Date.now() + 90000; let pending = 1;
    while (pending && Date.now() < deadline) { await new Promise((r) => setTimeout(r, 200)); pending = [...holder.querySelectorAll('.d17')].filter((f) => !f.classList.contains('got')).length; }
    const ms = Math.round(performance.now() - t0);
    for (const el of holder.querySelectorAll('.qc17')) { const dz = el.querySelector('.dz'); const tr = el.querySelector('.dice17').getBoundingClientRect(); const dr = dz.getBoundingClientRect(); const ti = el.querySelector('.title17 span'); const tb = el.querySelector('.title17').getBoundingClientRect();
      out.push({ mode, label: el.dataset.label, dice: dz.children.length, got: dz.querySelectorAll('.got').length, imgOk: [...dz.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0), trayFit: dr.bottom <= tr.bottom + 1 && dr.top >= tr.top - 1, titleFit: ti.scrollWidth <= tb.width + 1, badges: el.querySelectorAll('.pb17').length, ms }); }
    window.__done = window.__done || {}; if (mode === 'full') holder.dataset.full = '1';
  }
  return out;
});
fs.writeFileSync(`${OUT}/check.json`, JSON.stringify(res, null, 1)); let bad = 0; const fail = (m) => { bad++; console.log('FAIL', m); };
for (const r of res) { if (r.got !== r.dice || !r.imgOk) fail(`${r.mode} ${r.label}: dice ${r.got}/${r.dice} drawn`); if (!r.trayFit) fail(`${r.mode} ${r.label}: dice spill the tray`); if (!r.titleFit) fail(`${r.mode} ${r.label}: title clipped`); }
console.log('time to draw every card (ms):', [...new Set(res.map((r) => `${r.mode}:${r.ms}`))].join(' '));
// pictures: redraw at full width (cached, instant)
await p.evaluate(async () => { const CW = await import('./js/g3/cards.js'); void CW; });
for (const [name, w] of [['full', 300], ['thumb', 136]]) {
  await p.evaluate(async ([w]) => { const h = document.getElementById('wtest'); h.querySelectorAll('.qc17').forEach((e) => e.style.setProperty('--w', `${w}px`)); await new Promise((r) => setTimeout(r, 300)); }, [w]);
  await p.setViewportSize({ width: 1200, height: 2400 }); await p.locator('#wtest').screenshot({ path: `${OUT}/sheet-${name}.png` });
}
console.log(bad ? `${bad} FAILED` : 'all cards drew'); await b.close(); process.exit(bad ? 1 : 0);
