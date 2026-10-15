// A brand-new player's first minutes, fresh device: title -> Learn to play (every lesson page) -> practice battle.
// Screens to docs/ingame/fr_*.png, text of each page to stdout.   node dev/firstrun.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1.5, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(`pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) problems.push(`console ${m.text().slice(0, 200)}`); });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.max(1, Math.round(s * 15)); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/fr_${n}.png` }); };
const text = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 900));
await pump(2); await shot('00title'); console.log('TITLE:', await text());
await p.evaluate(() => [...document.querySelectorAll('button')].find((e) => /Learn to play/.test(e.textContent))?.click()); await p.waitForTimeout(600);
for (let i = 0; i < 16; i++) {
  await p.waitForTimeout(1100); await shot(`l${String(i).padStart(2, '0')}`);
  console.log(`\nLESSON ${i}:`, await p.evaluate(() => document.querySelector('#tut')?.innerText.replace(/\s+/g, ' ')));
  const more = await p.evaluate(() => { const b = document.querySelector('#tut .tu-nav .tu-go'); if (b) { b.click(); return true; } return false; });
  if (!more) break;
}
if (process.env.MORE) { // the 'More to learn' deck too
  await p.evaluate(() => window.QD.TUT.showLessons({ deck: 'more' }));
  for (let i = 0; i < 12; i++) {
    await p.waitForTimeout(900); await shot(`m${String(i).padStart(2, '0')}`);
    console.log(`\nMORE ${i}:`, await p.evaluate(() => document.querySelector('#tut')?.innerText.replace(/\s+/g, ' ')));
    if (!(await p.evaluate(() => { const b = document.querySelector('#tut .tu-nav .tu-go'); if (b) { b.click(); return true; } return false; }))) break;
  }
  await b.close(); process.exit(0);
}
await p.evaluate(() => document.querySelector('#tut .tu-final .tu-go')?.click()); await pump(3);
for (let k = 0; k < 60 && !(await p.evaluate(() => !!document.querySelector('#b3-roll'))); k++) await pump(0.5);
await pump(2); await shot('p0');
console.log('\nPRACTICE:', await text());
for (let s = 1; s <= 24; s++) {
  // follow the guide: Next on its card, the die it asks for, else the button it is waiting on
  const did = await p.evaluate(() => {
    const card = document.querySelector('.tg-card'); const t = card?.innerText.replace(/\s+/g, ' ').slice(0, 220) || '';
    const ok = card?.querySelector('.tg-ok'); if (ok) { ok.click(); return `Next | ${t}`; }
    if (/right hand die/.test(t)) { window.QD.world.battle.tray.onPick('E'); return `pick E | ${t}`; }
    for (const id of ['#b3-reroll', '#b3-lock', '#b3-roll']) { const e = document.querySelector(id); if (e && !e.disabled && (!card || new RegExp(id.slice(4), 'i').test(t))) { e.click(); return `${id} | ${t}`; } }
    const r = document.querySelector('#b3-roll'); if (r && !r.disabled) { r.click(); return `roll | ${t}`; }
    const l = document.querySelector('#b3-lock'); if (l && !l.disabled) { l.click(); return `lock | ${t}`; }
    const f = document.querySelector('.fb-slot.foe:not(.dead) .fb-pc'); if (f) { f.click(); return `foe | ${t}`; }
    return `none | ${t}`;
  });
  console.log(`step ${s}:`, did); await pump(4); await shot(`p${String(s).padStart(2, '0')}`);
  if (await p.evaluate(() => window.QD.S.battle?.outcome)) { console.log('outcome', await p.evaluate(() => window.QD.S.battle.outcome)); break; }
}
await pump(3); await shot('p99'); console.log('\nAFTER:', await text());
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no problems');
await b.close();
