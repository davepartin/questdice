// Learn to play, end to end, as a brand-new player: home -> every lesson -> the guided practice battle -> done.
//   node dev/learn.mjs [w=390] [h=844] [--lessons-only]
import { chromium } from 'playwright-core';
const W = Number(process.argv[2] || 390); const H = Number(process.argv[3] || 844); const onlyLessons = process.argv.includes('--lessons-only');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('console', m.text().slice(0, 200)); });
const tag = `${W}x${H}`;
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/tutorial/${tag}-${n}.png` }); };
await pump(3); await shot('00-home');
console.log('home:', await p.evaluate(() => [...document.querySelectorAll('.sx-plaque b')].map((e) => e.textContent).join(' | ')));
await p.evaluate(() => [...document.querySelectorAll('.sx-plaque')].find((e) => /Learn to play/.test(e.textContent))?.click()); await p.waitForTimeout(500);
for (let i = 1; i <= 13; i++) {
  await p.waitForTimeout(450);
  const info = await p.evaluate(() => { const s = document.querySelector('.tu-scroll'); return { title: document.querySelector('.tu-title')?.textContent, over: s.scrollHeight - s.clientHeight, imgs: [...document.querySelectorAll('.tu-face')].filter((x) => !x.complete || !x.naturalWidth).length }; });
  console.log(`lesson ${i}: ${info.title}${info.over > 4 ? ` (scrolls ${info.over}px)` : ''}${info.imgs ? ` MISSING IMAGES ${info.imgs}` : ''}`);
  await p.screenshot({ path: `docs/tutorial/${tag}-L${String(i).padStart(2, '0')}.png` });
  if (i < 13) await p.click('.tu-nav .tu-go');
}
if (onlyLessons) { await b.close(); process.exit(0); }
await p.click('.tu-final .tu-go');
for (let i = 0; i < 200 && !(await p.evaluate(() => !!document.querySelector('#b3-roll'))); i++) await pump(0.5);
const card = () => p.evaluate(() => document.querySelector('.tg-card b')?.textContent || null);
const waitCard = async (want) => { for (let i = 0; i < 80; i++) { const c = await card(); if (c && (!want || c.includes(want))) return c; await pump(0.3); } return await card(); };
const next = () => p.evaluate(() => document.querySelector('.tg-ok')?.click());
const tapDie = async (slot) => { const pt = await p.evaluate((s) => { const t = window.QD.B3.battleState.bw.tray; const q = t.projectSlot(s, { dy: 0.3 }); const r = window.QD.world.stage.canvas.getBoundingClientRect(); return { x: r.left + q.x, y: r.top + q.y }; }, slot); await p.mouse.click(pt.x, pt.y); await pump(0.4); };
const step = async (n, want) => { const c = await waitCard(want); await pump(0.6); await shot(`G${String(n).padStart(2, '0')}`); console.log(`guide ${n}: ${c}`); return c; };
await step(1, 'goblin'); await next();
await step(2, 'health'); await next();
await step(3, 'Roll');
await p.click('#b3-reroll').catch(() => {}); // not there yet; a stray tap should do nothing
await p.click('#b3-roll'); for (let i = 0; i < 40 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(0.5);
await step(4, 'adds up'); await next();
await step(5, 'left side'); await next();
await step(6, 'Strength Triple');
await tapDie('W'); console.log('  tapped the wrong die; selected:', await p.evaluate(() => [...window.QD.B3.battleState.sel].join(',') || 'none'));
await tapDie('E'); console.log('  tapped the right hand; selected:', await p.evaluate(() => [...window.QD.B3.battleState.sel].join(',')));
await step(7, 'reroll');
await p.click('#b3-reroll'); for (let i = 0; i < 40 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(0.5);
await step(8, 'Triple!');
console.log('  attack now:', await p.evaluate(() => document.querySelector('.fc.t-atk .fc-n')?.dataset.v));
await next();
await step(9, 'Lock');
await p.click('#b3-lock'); for (let i = 0; i < 60 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(0.5);
await pump(2);
console.log('  goblin hp after round 1:', await p.evaluate(() => window.QD.S.battle.enemies.map((e) => `${e.hp}/${e.maxHp}`).join(',')), '| hero hp', await p.evaluate(() => `${window.QD.S.battle.hp}/${window.QD.S.battle.maxHp}`));
await step(10, 'Magic'); await next();
await step(11, 'Finish'); await next();
// free play: roll and lock until it ends
for (let r = 0; r < 8; r++) {
  if (await p.evaluate(() => !!document.querySelector('#tut'))) break;
  if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) { await p.click('#b3-roll'); for (let i = 0; i < 40 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(0.5); }
  if (await p.evaluate(() => !!document.querySelector('#b3-lock'))) { await p.click('#b3-lock'); for (let i = 0; i < 80 && await p.evaluate(() => window.QD.B3.battleState.busy && !document.querySelector('#tut')); i++) await pump(0.5); }
  await pump(1);
}
for (let i = 0; i < 30 && !(await p.evaluate(() => !!document.querySelector('#tut'))); i++) await pump(0.5);
await p.waitForTimeout(600); await p.screenshot({ path: `docs/tutorial/${tag}-Z-done.png` });
console.log('done screen:', await p.evaluate(() => document.querySelector('#tut .tu-title')?.textContent));
console.log('saved heroes after practice:', await p.evaluate(() => Object.keys(localStorage).filter((k) => /hero|company/i.test(k)).length), '| learned flag:', await p.evaluate(() => localStorage.getItem('qd.learned')));
await b.close();
