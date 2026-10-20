// Every camp die popup on a phone, for a mid-game hero (Dave's Act II wizard).  node dev/popups.mjs [tag]
import { chromium } from 'playwright-core';
const tag = process.argv[2] || 'pp';
const out = '/tmp/claude-0/-home-user-questdice/8c0c8fef-1ceb-56a5-957d-404bdc291d52/scratchpad/pop';
import fs from 'node:fs'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (/STACK/.test(m.text())) console.log(m.text().slice(0, 600)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const settle = async () => { await pump(1.5); await p.waitForTimeout(1200); await pump(0.5); await p.evaluate(() => window.QD.world.stage.step(1)); };
await p.evaluate(() => { try { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Magic Dave', cls: 'wizard', seed: 7 }); h.level = 5; h.gold = 65; h.campaign.act = 2;
  const mk = (id, rarity, size = 4) => E.makeWeapon(id, rarity, E.makeRng(id.length), size);
  h.strength = { W: 6, E: 6 }; const hm = mk('warhammer', 2, 8); h.bag = [hm]; E.equip(h, hm.uid, 'NW');
  h.bag = [mk('longsword', 0), mk('shield', 0)];
  E.takeDiamond(h, E.makeDiamond(E.makeRng(3), 2));
  h.dice = [...(h.dice || ['NW', 'N', 'W', 'C', 'E', 'S']), 'SW'].filter((v, i, a) => a.indexOf(v) === i); h.special = { SW: 6, SE: 4 }; h.talent = { SW: [['magic']] };
  S.hero = h; S.company = { members: [h] }; showCamp(); } catch (e) { console.log('STACK ' + e.stack.split('\n').slice(0, 6).join(' <- ')); } });
await settle();
console.log('grid:', (await p.evaluate(() => [...document.querySelectorAll('.dg-cell')].map((c) => c.innerText.replace(/\n/g, ' ')).join(' | '))));
await p.screenshot({ path: `${out}/${tag}_camp.png` });
for (const slot of ['NE', 'W', 'N', 'S', 'C', 'SW', 'SE']) {
  await p.evaluate((slot) => document.querySelector(`.dg-cell.s-${slot}`)?.click(), slot); await settle();
  await p.screenshot({ path: `${out}/${tag}_${slot}.png` });
  if (slot === 'SW') { await p.evaluate(() => document.querySelector('.sh-face.open')?.click()); await settle(); await p.screenshot({ path: `${out}/${tag}_SWpick.png` }); }
  if (slot === 'NE') { await p.evaluate(() => document.querySelector('.slot-sheet')?.scrollTo(0, 9999)); await settle(); await p.screenshot({ path: `${out}/${tag}_NEend.png` }); }
  await p.evaluate(() => document.querySelector('.sh-x')?.click()); await pump(0.3);
}
await b.close();
