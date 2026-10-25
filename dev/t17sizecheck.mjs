// T17 weapon size, in the real game: only preview/weapon-size/ has the switch; a size is bought at camp one step at a time; a fight rolls the bought die; the
// preview's saves are its own and the live root's are untouched.
//   node tools/preview.mjs /tmp/t17srv weapon-size && python3 -m http.server 8141 -d /tmp/t17srv   and   node dev/serve.mjs 8135 (the checkout, for the root)
//   node dev/t17sizecheck.mjs [out=docs/team/tasks/T17]
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const OUT = process.argv[2] || 'docs/team/tasks/T17'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const res = {}; const problems = [];
async function open(url, init) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); p.setDefaultTimeout(240000); p.on('pageerror', (e) => problems.push(`${url}: ${e.message}`));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} }); if (init) await p.addInitScript(init);
  await p.goto(url); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 240000 }); return p;
}
const pumpOf = (p) => (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
// ---- the live root: switch off
{ const p = await open('http://localhost:8135/?debug&manual&q=low'); res.root = await p.evaluate(() => ({ weaponSize: window.QD.D.EXPERIMENT.weaponSize, tag: document.querySelector('.lab-tag')?.textContent || null })); await p.context().close(); }
// ---- the preview
const LIVE = '{"live":"untouched"}';
const p = await open('http://localhost:8141/preview/weapon-size/?debug&manual&q=low', () => { try { for (const k of ['questdice.hero.liveknight', 'questdice.battlereports', 'qd.daily']) if (!localStorage.getItem(k)) localStorage.setItem(k, '{"live":"untouched"}'); } catch {} });
const pump = pumpOf(p);
res.preview = await p.evaluate(() => ({ weaponSize: window.QD.D.EXPERIMENT.weaponSize, tag: document.querySelector('.lab-tag')?.textContent || null, keysBefore: Object.keys(localStorage).sort() }));
await p.evaluate(async () => {
  const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Sizer', cls: 'knight', seed: 5 }); h.level = 6; h.gold = 400; h.campaign.act = 1; h.campaign.step = 3; h.strength = { W: 4, E: 4 };
  h.loadout.NW = E.makeWeapon('sword', 1, () => 0.5, 4); S.hero = h; S.company = { members: [h] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice';
  const SV = await import('./js/save.js'); if (!SV.heroExists(h.name)) await SV.createSave(h, 'testpass'); showCamp();
});
await pump(2); await p.locator('.cw-cell.s-NW').click(); await pump(2); await p.waitForTimeout(600);
const scrollTo = (sel, off = 72) => p.evaluate(([sel, off]) => { const s = document.querySelector('.sx-side'); const c = document.querySelector(sel); if (s && c) s.scrollTop += c.getBoundingClientRect().top - off; }, [sel, off]);
const read = () => p.evaluate(() => ({ text: document.querySelector('.ww-workshop')?.innerText.replace(/\s+/g, ' ') || '', gold: window.QD.S.hero.gold, size: window.QD.E.weaponSize(window.QD.S.hero.loadout.NW), found: window.QD.S.hero.loadout.NW.found || null, modes: !!document.querySelector('.ww-modes'), buy: [...document.querySelectorAll('.ww-workshop button')].map((x) => x.innerText.replace(/\s+/g, ' ').trim()) }));
res.steps = [];
for (let step = 0; step < 4; step++) {
  await scrollTo('.ww-workshop', 60); await pump(1); const r = await read(); res.steps.push(r); await p.screenshot({ path: `${OUT}/size-camp-${step}.png` });
  const btn = p.locator('.ww-workshop button', { hasText: /^\s*Buy size/ }); if (!(await btn.count())) break; await btn.first().click(); await pump(1.5); await p.waitForTimeout(500);
}
res.after = await read();
// a fight: the bought d10 against the d4 hand
await p.evaluate(() => window.QD.showBoard()); await pump(1);
await p.evaluate(() => { const { E, S } = window.QD; const q = { ...E.questsFor(S.hero)[0], enemies: ['goblin'], kind: 'battle' }; window.QD.startQuest(q); });
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^(Decline|Continue)$/.test(x.textContent.trim()))?.click()); await pump(0.5); }
await p.evaluate(() => document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click()); await pump(0.5);
await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(5);
for (let k = 0; k < 30 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
res.fight = await p.evaluate(() => { const { S, E } = window.QD; const b = S.battle; const f = E.weaponFaces(S.hero.loadout.NW, E.sidesOf(S.hero, 'NW')); return { sides: E.sidesOf(S.hero, 'NW'), handSides: E.sidesOf(S.hero, 'W'), faces: f.length, die: b.board.NW.v, battleWear: E.wearLabel(S.hero.loadout.NW) }; });
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${OUT}/size-fight.png` });
// win it fast, to camp, and look at the weapon after the victory (no wear)
await p.evaluate(() => { const { S, E, B3, showVictory } = window.QD; const bt = S.battle; bt.enemies.forEach((e) => { e.hp = 1; e.maxHp = 1; }); E.resolve(bt, { target: 0 }); });
await pump(1);
res.afterFight = await p.evaluate(() => { const { S, E } = window.QD; const w = S.hero.loadout.NW; return { id: w.id, size: E.weaponSize(w), left: w.left ?? null, broke: E.takeBroken(S.hero) }; });
res.save = await p.evaluate(async () => { const SV = await import('./js/save.js'); try { await SV.saveHero(window.QD.S.hero); } catch (e) { console.log('save', e.message); } const k = Object.keys(localStorage).filter((x) => /sizer/i.test(x)); return k.map((x) => ({ key: x, found: /"found":4/.test(localStorage.getItem(x) || ''), size: /"size":10/.test(localStorage.getItem(x) || '') })); });
res.keysAfter = await p.evaluate(() => Object.keys(localStorage).sort());
res.liveUntouched = await p.evaluate(() => ({ hero: localStorage.getItem('questdice.hero.liveknight'), reports: localStorage.getItem('questdice.battlereports'), daily: localStorage.getItem('qd.daily') }));
fs.writeFileSync(`${OUT}/size-check.json`, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ root: res.root, preview: res.preview?.tag, steps: res.steps.map((s) => [s.size, s.gold, s.found, s.buy.join('/')]), after: [res.after.size, res.after.gold], fight: res.fight, afterFight: res.afterFight, save: res.save, live: res.liveUntouched, newKeys: res.keysAfter.filter((k) => !res.preview.keysBefore.includes(k)) }, null, 1));
console.log(problems.length ? `PROBLEMS:\n${[...new Set(problems)].join('\n')}` : 'no page errors'); await b.close();
