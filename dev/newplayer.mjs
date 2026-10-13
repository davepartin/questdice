// A brand-new player, start to finish of the first fight: title -> new hero -> prologue -> board -> fight -> victory -> camp.
// Logs every page error and the screen at each stop.   node dev/newplayer.mjs [tag] [w] [h] [cls]
import { chromium } from 'playwright-core';
const [tag = 'np', W = 393, H = 852, cls = 'Knight'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1.5, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(`pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) problems.push(`console ${m.text().slice(0, 200)}`); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.max(1, Math.round(s * 15)); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${tag}_${n}.png` }); };
const tapText = (re) => p.evaluate((src) => { const r = new RegExp(src, 'i'); const el = [...document.querySelectorAll('button, [role=button], .sx-plaque, a')].find((e) => r.test(e.textContent) && e.getBoundingClientRect().height > 0); el?.click(); return el ? el.textContent.trim().slice(0, 40) : null; }, re.source);
const screen = () => p.evaluate(() => document.querySelector('#scene')?.className + ' | ' + (document.querySelector('.story, .st-card, [class*=story]')?.innerText.slice(0, 60) || '') );
await pump(2); await shot('0title');
console.log('new hero:', await tapText(/new hero|forge a new/)); await pump(2);
console.log('class:', await tapText(new RegExp(cls))); await pump(1);
await p.fill('#hero-name', 'Tester'); await p.fill('#hero-pw', 'pw1');
await shot('1create');
console.log('begin:', await tapText(/Begin the campaign/)); await pump(2);
for (let i = 0; i < 8; i++) {
  const st = await p.evaluate(() => document.querySelector('.sx-qcard') ? null : { text: document.body.innerText.replace(/\s+/g, ' ').slice(40, 140), buttons: [...document.querySelectorAll('button')].filter((e) => e.getBoundingClientRect().height).map((e) => e.textContent.trim().slice(0, 30)).join(' / ') });
  if (!st) break; console.log('story card:', JSON.stringify(st)); await shot(`2story${i}`);
  const t = await tapText(/continue|onward|on we go|begin|next|go on|^\s*Set the|march/); if (!t) break; console.log('  tapped', t); await pump(1.5);
}
await shot('3board');
console.log('board cards:', await p.evaluate(() => [...document.querySelectorAll('.sx-qcard')].map((e) => e.getAttribute('aria-label')).join(' || ')));
console.log('fight:', await tapText(/^\s*(Battle|Elite|Boss)/)); 
await p.evaluate(() => document.querySelector('.sx-qcard')?.click());
for (let i = 0; i < 200; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2); await shot('4battle');
console.log('scene layer over the battle?', await p.evaluate(() => document.body.classList.contains('has-scene')), '(want false)');
for (let r = 1; r <= 14; r++) {
  if (await p.evaluate(() => window.QD.S.battle?.outcome || !document.querySelector('#b3-roll'))) break;
  for (let k = 0; k < 40 && !(await p.evaluate(() => !!document.querySelector('#b3-roll') && !window.QD.B3.battleState.busy)); k++) await pump(0.5);
  await p.evaluate(() => document.querySelector('.rc')?.click());
  await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(5);
  for (let k = 0; k < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
  await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(2);
  for (let n = 0; n < 60 && await p.evaluate(() => window.QD.B3.battleState.busy); n++) await pump(1);
  await pump(1);
  console.log(`round ${r}:`, await p.evaluate(() => { const b = window.QD.S.battle; return b ? JSON.stringify({ hp: b.hp, foes: b.enemies.filter((e) => e.hp > 0).map((e) => `${e.id}:${e.hp}`), outcome: b.outcome }) : 'no battle'; }));
}
await p.evaluate(() => document.querySelector('.rc')?.click()); await pump(4); await shot('5after');
console.log('after fight screen text:', await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300)));
for (let i = 0; i < 6; i++) { const t = await tapText(/continue|claim|collect|to camp|onward|go on|next|done|take/); console.log('tap', t); if (!t) break; await pump(2); }
await shot('6next'); console.log('scene back on camp/board?', await p.evaluate(() => document.body.classList.contains('has-scene')), '(want true)'); console.log('now:', await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 200)));
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no problems');
await b.close();
