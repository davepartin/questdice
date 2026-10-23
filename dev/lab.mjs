// The lab archer (?lab, js/lab.js): the Arrows' weapon page with its ammunition, the camp dice with arrowheads, the scouts line on the
// quest card, and a fight.   node dev/lab.mjs [out=shots]   (needs node dev/serve.mjs 8135)
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'shots';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?lab&debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 400000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
console.log('lab:', await p.evaluate(() => ({ tag: document.querySelector('.lab-tag')?.textContent, w2: window.QD.D.EXPERIMENT.weapons2 })));
await p.evaluate(async () => {
  const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Lab Archer', cls: 'ranger', seed: 5 }); h.level = 4; h.gold = 120; h.campaign.act = 1; h.campaign.step = 3;
  h.strength = { W: 6, E: 4 }; h.loadout.NW.size = 6; h.dice = [...h.dice, 'NE']; S.hero = h; S.company = { members: [h] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice';
  const SV = await import('./js/save.js'); if (!SV.heroExists(h.name)) await SV.createSave(h, 'testpass'); showCamp();
});
await pump(2);
console.log('saved as:', await p.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('hero'))));
await p.locator('.cw-cell.s-NW').click(); await pump(2); await p.waitForTimeout(600);
const scrollTo = (sel) => p.evaluate((sel) => { const s = document.querySelector('.sx-side'); const c = document.querySelector(sel); if (s && c) s.scrollTop += c.getBoundingClientRect().top - 72; }, sel);
await scrollTo('.cw-inspector'); await pump(1); await p.screenshot({ path: `${out}/lab-ammo-normal.png` });
await p.locator('.ww-ammo [data-ammo="fire"]').click(); await pump(2); await p.waitForTimeout(600); await scrollTo('.cw-inspector'); await pump(1);
console.log('after Fire:', await p.evaluate(() => ({ ammo: window.QD.S.hero.loadout.NW.ammo, chips: document.querySelector('.ww-preview .wc-faces')?.innerText.replace(/\s+/g, ' ') })));
await p.screenshot({ path: `${out}/lab-ammo-fire.png` });
await p.locator('.ww-ammo [data-ammo="frost"]').click(); await pump(2); await p.waitForTimeout(600); await scrollTo('.cw-inspector'); await pump(1);
await p.screenshot({ path: `${out}/lab-ammo-frost.png` });
await p.locator(`.ww-ammo [data-ammo="${process.env.AMMO || 'fire'}"]`).click(); await pump(1);
await p.evaluate(() => window.QD.showBoard()); await pump(2); await p.waitForTimeout(800);
console.log('scouts:', await p.evaluate(() => [...document.querySelectorAll('.qc-scout')].map((e) => e.innerText)));
await p.screenshot({ path: `${out}/lab-board.png` });
await p.evaluate(() => { const { E, S } = window.QD; const q = { ...E.questsFor(S.hero)[0], enemies: ['goblin', 'goblin', 'wolf'], kind: 'battle' }; window.QD.startQuest(q); });
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^(Decline|Continue)$/.test(x.textContent.trim()))?.click()); await pump(0.5); }
await pump(2); await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/lab-fight-start.png` });
// play rounds until the left die lands on an arrowhead, then look at the board and the round's result
const busy = async () => { for (let i = 0; i < 30 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(1); };
for (let r = 0; r < 8; r++) {
  await p.evaluate(() => document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click()); await pump(0.5);
  await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(5); await busy();
  const face = await p.evaluate(() => { const { S, E } = window.QD; const b = S.battle; const v = b?.board?.NW?.v; return v ? E.weaponFaces(S.hero.loadout.NW, E.sidesOf(S.hero, 'NW'))[v - 1] : null; });
  console.log('round', r + 1, 'left die', JSON.stringify(face));
  if (face?.arrow) { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/lab-fight-arrowhead.png` });
    await p.evaluate(() => document.querySelector('#b3-lock')?.click()); for (let k = 0; k < 8; k++) await pump(0.5); await p.screenshot({ path: `${out}/lab-fight-arrowhead-hit.png` }); await busy(); break; }
  await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(4); await busy();
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^(Continue|Next round|OK)$/i.test(x.textContent.trim()))?.click()); await pump(2); await busy();
}
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/lab-fight-after.png` });
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
