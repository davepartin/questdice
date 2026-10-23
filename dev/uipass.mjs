// The Bonus Challenge screen and the Enemy Details sheet (ChatGPT's UI review relayed by Dave, 23 Oct 2026: "fit into one well-organized
// phone screen"). A level 8 Wizard with 53 gold meets a Wraith: the offer, then the monster's sheet. For each phone size it prints
// whether the page scrolls (and by how much), and saves both pictures.
//   node dev/uipass.mjs [out=shots/uipass] [sizes=390x844,430x932,375x667] [zoom=1]   (zoom 1.3: bigger text)
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const out = process.argv[2] || 'shots/uipass'; fs.mkdirSync(out, { recursive: true });
const sizes = (process.argv[3] || '390x844,430x932,375x667').split(',').map((s) => s.split('x').map(Number));
const zoom = Number(process.argv[4] || 1);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const problems = [];
for (const [W, H] of sizes) {
  const tag = `${W}x${H}${zoom !== 1 ? `-z${zoom}` : ''}`;
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true });
  p.on('pageerror', (e) => problems.push(`${tag}: ${e.message}`));
  await p.addInitScript((z) => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} if (z !== 1) document.documentElement.style.fontSize = `${16 * z}px`; }, zoom);
  await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
  const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
  const shot = async (name) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/${tag}-${name}.png` }); };
  // how far the content runs past the screen: the tallest scrolling box on the page
  const overflow = (sel) => p.evaluate((sel) => { let worst = 0; for (const el of document.querySelectorAll(sel)) { const d = el.scrollHeight - el.clientHeight; if (d > worst && getComputedStyle(el).overflowY !== 'visible') worst = d; } return worst; }, sel);
  await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Magic Dave', cls: 'wizard', seed: 5 }); h.level = 8; h.gold = 53; S.hero = h; S.company = { members: [h] }; showBoard(); });
  await pump(1);
  await p.evaluate(() => { const E = window.QD.E; window.QD.startQuest({ ...E.questsFor(window.QD.S.hero)[0], enemies: ['wraith'], kind: 'battle' }); });
  for (let i = 0; i < 60 && !(await p.evaluate(() => [...document.querySelectorAll('button')].some((x) => /^Bet /.test(x.textContent.trim())))); i++) await pump(0.5);
  await pump(1); await shot('bonus');
  console.log(tag, 'bonus: scrolls', await overflow('.sx-side, .sx-split, body'), 'px · title:', await p.evaluate(() => document.querySelector('.obj-kind')?.textContent), '· buttons:', await p.evaluate(() => [...document.querySelectorAll('.env-btns button')].map((x) => `${x.textContent.trim()} (${Math.round(x.getBoundingClientRect().bottom)}/${innerHeight})`).join(' | ')));
  await p.evaluate(() => document.querySelector('.obj-morebtn')?.click()); await pump(0.5); await shot('bonus-more'); // what More opens
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^Decline$/.test(x.textContent.trim()))?.click()); await pump(1);
  for (let i = 0; i < 200 && !(await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)); i++) await pump(0.5);
  await pump(2);
  for (let k = 0; k < 2; k++) { await p.evaluate(() => document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click()); await pump(0.6); }
  await pump(1); await shot('enemy');
  console.log(tag, 'enemy: open', await p.evaluate(() => document.querySelector('.b3-info')?.classList.contains('open')), '· scrolls', await overflow('.b3-info'), 'px · panel', await p.evaluate(() => { const r = document.querySelector('.b3-info')?.getBoundingClientRect(); return r ? `${Math.round(r.top)}–${Math.round(r.bottom)} of ${innerHeight}` : '-'; }), '· bottom', await p.evaluate(() => document.querySelector('.b3-info').style.bottom + ' bar ' + JSON.stringify(window.QD.B3.battleState.hud?.bar?.getBoundingClientRect?.())), '· picture', await p.evaluate(() => { const r = document.querySelector('.b3-info img')?.getBoundingClientRect(); return r ? `${Math.round(r.width)}x${Math.round(r.height)}` : '-'; }));
  await p.close();
}
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
