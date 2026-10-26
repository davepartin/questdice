// The weapon-roles preview (T17 candidate): a camp weapon sheet with the cumulative faces, buying d6 then d8 and checking the earlier faces stay.
//   node tools/preview.mjs . weapon-roles && node dev/weaponroles.mjs [tag]   (remove the copy again: rm -r preview/weapon-roles)
import { chromium } from 'playwright-core';
const tag = process.argv[2] || 'wr';
const out = '/tmp/claude-0/-home-user-questdice/8c0c8fef-1ceb-56a5-957d-404bdc291d52/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/preview/weapon-roles/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Magic Dave', cls: 'knight', seed: 7 }); h.level = 5; h.gold = 400; h.campaign.act = 2;
  const sp = E.makeWeapon('spear', 1, E.makeRng(2), 4); h.bag = [sp]; E.equip(h, sp.uid, 'NW'); S.hero = h; S.company = { members: [h] }; showCamp(); });
await pump(2);
const faces = () => p.evaluate(() => { const { E, S } = window.QD; const w = S.hero.loadout.NW; return `${w.id} d${E.weaponSize(w)}: ` + E.weaponFaces(w).map((f) => `${f.c}${f.v}${f.fx ? JSON.stringify(f.fx) : ''}`).join(' '); });
console.log(await faces());
await p.getByText('Left weapon', { exact: true }).first().click(); await pump(2); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${tag}_d4.png` });
const before = await p.evaluate(() => window.QD.E.weaponFaces(window.QD.S.hero.loadout.NW).map((f) => JSON.stringify(f)));
for (const n of [1, 2]) { await p.evaluate(() => { const { E, S } = window.QD; E.trainWeapon(S.hero, S.hero.loadout.NW.uid, E.trainInfo(S.hero, S.hero.loadout.NW.uid).next); }); await pump(1); console.log(await faces()); }
const after = await p.evaluate(() => window.QD.E.weaponFaces(window.QD.S.hero.loadout.NW).map((f) => JSON.stringify(f)));
console.log('earlier faces kept:', before.every((f, i) => f === after[i]), 'faces now', after.length);
await p.evaluate(() => window.QD.showCamp?.()); await pump(1); await p.getByText('Left weapon', { exact: true }).first().click(); await pump(2); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${tag}_d8.png` });
await b.close();
