// Power words in battle match the engine (Dave, Oct 2026: Storm Coil's text and upgrade did not match). A levelled power's sheet line
// and its cast reveal, for one class.   node dev/powerwords.mjs [class=wizard] [slot=C] [level=1] [out=shots]
import { chromium } from 'playwright-core';
const [cls = 'wizard', slot = 'C', lvl = '1', out = 'shots'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate((o) => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: o.cls, seed: 5 }); h.level = 9; const k = E.cardsOf(h).find((c) => c.slot === o.slot); h.powerLevel = { [k.id]: o.lvl }; S.hero = h; S.company = { members: [h] }; showBoard(); }, { cls, slot, lvl: Number(lvl) });
await pump(1);
await p.evaluate(() => { const E = window.QD.E; window.QD.startQuest({ ...E.questsFor(window.QD.S.hero)[0], enemies: ['ogre'], kind: 'battle' }); });
for (let i = 0; i < 200 && !(await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)); i++) await pump(0.5);
for (let i = 0; i < 10 && await p.evaluate(() => [...document.querySelectorAll('button')].some((x) => /^Decline$/.test(x.textContent.trim()))); i++) { await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^Decline$/.test(x.textContent.trim()))?.click()); await pump(1); }
for (let i = 0; i < 10 && await p.evaluate(() => window.QD.S.battle?.phase === 'reset'); i++) { await p.evaluate(() => { document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click(); document.querySelector('#b3-roll')?.click(); }); await pump(2); }
for (let i = 0; i < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(1);
await p.evaluate(() => { window.QD.S.battle.magic = 12; window.QD.B3.battleState.b.magic = 12; });
await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Magic powers/i.test(x.textContent))?.click()); await pump(1);
await p.evaluate((slot) => document.querySelector(`.pw-medal.at-${slot}`)?.click(), slot); await pump(0.5);
await p.evaluate(() => document.querySelector('.pw-detail')?.scrollIntoView({ block: 'end' })); await p.evaluate(() => window.QD.world.stage.step(1));
console.log('sheet line:', await p.evaluate(() => document.querySelector('.pd-line')?.textContent));
await p.screenshot({ path: `${out}/powerwords-${cls}-${slot}-sheet.png` });
await p.evaluate(() => [...document.querySelectorAll('.pw-btn.go')].find((x) => !x.disabled)?.click());
for (let i = 0; i < 10 && !(await p.evaluate(() => { const ok = document.querySelector('.dr-ok'); return ok && !ok.disabled; })); i++) await pump(0.6);
console.log('reveal:', await p.evaluate(() => document.querySelector('.cr-card')?.innerText.replace(/\s+/g, ' ')));
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/powerwords-${cls}-${slot}-reveal.png` });
await p.evaluate(() => document.querySelector('.dr-ok')?.click()); await p.waitForTimeout(700); await pump(1.5);
console.log('after the cast: sheet scrolled to', await p.evaluate(() => document.querySelector('.b3-cards')?.scrollTop), '· picked:', await p.evaluate(() => document.querySelector('.pw-medal.on')?.dataset.power || 'none'));
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/powerwords-${cls}-${slot}-after.png` });
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
