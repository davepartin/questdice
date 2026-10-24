// T20: the released arrows in the real game: camp ammunition picker, then a fight for each case with the dice SET by the practice battle's own script
// (b.script.rolls: DEMONSTRATION ONLY). Fresh browser profile, so no live save is touched.   node dev/t20arrows.mjs [out=docs/team/tasks/T20]  (needs node dev/serve.mjs 8135)
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'docs/team/tasks/T20';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|Failed to load|net::/.test(m.text())) problems.push(m.text()); });
await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 400000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/${n}.png` }); };
const info = await p.evaluate(() => ({ build: document.querySelector('script[type=importmap]')?.textContent.match(/\?v=([^"]+)/)?.[1], rules: window.QD.D.WEAPONS2.arrowRules, ua: navigator.userAgent })); console.log(JSON.stringify(info));
const mkHero = (ammo) => p.evaluate(async (ammo) => {
  const { S, E } = window.QD; const h = E.newHero({ name: 'Archer', cls: 'ranger', seed: 5 }); h.level = 4; h.gold = 120; h.campaign.act = 1; h.campaign.step = 3;
  h.strength = { W: 4, E: 4 }; h.dice = [...h.dice, 'NE']; h.loadout.NW = { uid: 'qdemo', id: 'quiver', ammo, rarity: 0, size: 4 }; S.hero = h; S.company = { members: [h] }; S.seat = 0; S.tab = 'forge'; S.campPage = 'dice';
  const SV = await import('./js/save.js'); if (!SV.heroExists(h.name)) await SV.createSave(h, 'testpass'); return true;
}, ammo);
if (!process.env.ONLY) {
// ---- camp: the ammunition choice
await mkHero('normal'); await p.evaluate(() => window.QD.showCamp()); await pump(2);
await p.locator('.cw-cell.s-NW').click(); await pump(2); await p.waitForTimeout(600);
const scrollTo = (sel, off = 72) => p.evaluate(([sel, off]) => { const s = document.querySelector('.sx-side'); const c = document.querySelector(sel); if (s && c) s.scrollTop += c.getBoundingClientRect().top - off; }, [sel, off]);
for (const ammo of ['normal', 'pierce', 'fire', 'frost']) {
  await p.locator(`.ww-ammo [data-ammo="${ammo}"]`).click(); await pump(1.5); await p.waitForTimeout(400); await scrollTo('.ww-ammo', 60); await pump(1);
  console.log('camp', ammo, JSON.stringify(await p.evaluate(() => ({ ammo: window.QD.S.hero.loadout.NW.ammo, faces: document.querySelector('.ww-preview .wc-faces')?.innerText.replace(/\s+/g, ' ') }))));
  await shot(`camp-${ammo}`);
}
}
// ---- fights
const enemyKit = { goblin: { hp: 60 }, ogre: { hp: 200 } };
async function fight(tag, ammo, foes, rolls) {
  for (let attempt = 0; attempt < 3; attempt++) { try { return await fight1(tag, ammo, foes, rolls); } catch (e) { console.log('retry', tag, String(e.message).slice(0, 80)); } }
  throw new Error(`${tag} failed`);
}
async function fight1(tag, ammo, foes, rolls) {
  await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 400000 });
  await mkHero(ammo);
  await p.evaluate(({ foes }) => { const { S, E } = window.QD; const q = { ...E.questsFor(S.hero)[0], enemies: foes.map((f) => f.id), kind: 'battle', hpMult: 3, flat: 0 }; window.QD.startQuest(q); }, { foes });
  for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^(Decline|Continue)$/.test(x.textContent.trim()))?.click()); await pump(0.5); }
  await p.evaluate(({ foes, rolls }) => { const b = window.QD.S.battle; b.script = { rolls: rolls.map((r) => ({ NE: 1, N: 1, W: 4, C: 1, E: 1, S: 4, SW: 1, SE: 1, P: 1, ...r })) };
    foes.forEach((f, i) => { const e = b.enemies[i]; e.hp = e.maxHp = f.hp; if (f.name) e.name = f.name; e.intent = f.move; e.windup = false; if (f.initDie) e.initDie = f.initDie; });
    window.QD.B3.renderReset(); }, { foes, rolls });
  await pump(1.5);
  const log = [];
  for (let r = 0; r < rolls.length; r++) {
    await p.evaluate((foes) => { const b = window.QD.S.battle; foes.forEach((f, i) => { const e = b.enemies[i]; if (e && e.hp > 0) { e.intent = f.move; e.windup = false; } }); window.QD.B3.renderReset(); }, foes); await pump(1); // the game rolls a fresh intent each round; keep the demonstration's move
    await p.evaluate(() => document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click()); await pump(0.5);
    await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(5);
    for (let k = 0; k < 30 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
    const hp0 = await p.evaluate(() => window.QD.S.battle.enemies.map((e) => e.hp)); const st0 = await p.evaluate(() => { const b = window.QD.S.battle; return { board: Object.fromEntries(Object.entries(b.board).map(([k, v]) => [k, v.v])), round: b.round }; });
    await shot(`${tag}-r${r + 1}-dice`);
    await p.evaluate(() => document.querySelector('#b3-lock')?.click()); for (let k = 0; k < 6; k++) await pump(0.5); await shot(`${tag}-r${r + 1}-result-a`);
    for (let k = 0; k < 40 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
    const rep = await p.evaluate(() => { const b = window.QD.S.battle; const R = b.report; return { hp: b.enemies.map((e) => [e.name, e.hp, !!e.frost]), name: b.enemies.map((e) => e.name), T: R?.T && { atk: R.T.atk, pierce: R.T.pierce }, fire: R?.ev?.fire || 0, frost: R?.ev?.frost || 0, splashed: (R?.splashed || []).map((s) => s.dealt), acts: (R?.acts || []).map((a) => [a.name, a.mag, !!a.frosted, !!a.early]), notes: R?.ev?.notes }; });
    await shot(`${tag}-r${r + 1}-result-b`);
    log.push({ round: r + 1, dice: st0.board.NW, hand: st0.board.W, hpBefore: hp0, ...rep });
    await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^(Continue|Next round|OK|Close)$/i.test(x.textContent.trim()))?.click()); await pump(2);
    for (let k = 0; k < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); k++) await pump(1);
  }
  console.log(tag, JSON.stringify(log));
  return log;
}
const guard = (n = 3) => ({ n: 'Wing Wall', v: 'guard', f: n, m: 0 }); const idle = { n: 'Wait', v: 'charge', f: 0, m: 0 }; const club = (n) => ({ n: 'Club', v: 'strike', f: n, m: 0 });
const results = {}; const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null; const fightIf = (key, ...a) => (!ONLY || ONLY.includes(key) ? fight(...a) : null);
results.normal = await fightIf('normal', 'normal', 'normal', [{ id: 'goblin', hp: 60, name: 'Guard Goblin', move: guard() }], [{ NW: 4 }]);
results.pierce = await fightIf('pierce', 'pierce', 'pierce', [{ id: 'goblin', hp: 60, name: 'Guard Goblin', move: guard() }], [{ NW: 4 }]);
results.fireGroup = await fightIf('fireGroup', 'fire-group', 'fire', [{ id: 'goblin', hp: 60, name: 'Chosen Goblin', move: guard() }, { id: 'goblin', hp: 60, name: 'Open Goblin', move: idle }, { id: 'goblin', hp: 60, name: 'Guarding Goblin', move: guard() }], [{ NW: 4 }]);
results.fireLone = await fightIf('fireLone', 'fire-lone', 'fire', [{ id: 'ogre', hp: 200, name: 'Lone Boss', move: guard() }], [{ NW: 4 }]);
results.fireNumbered = await fightIf('fireNumbered', 'fire-numbered', 'fire', [{ id: 'goblin', hp: 60, name: 'Chosen Goblin', move: guard() }, { id: 'goblin', hp: 60, name: 'Open Goblin', move: idle }, { id: 'goblin', hp: 60, name: 'Open Goblin Two', move: idle }], [{ NW: 3 }]);
results.frostFirst = await fightIf('frostFirst', 'frost-first', 'frost', [{ id: 'ogre', hp: 200, name: 'Ogre', move: club(12) }], [{ NW: 4 }]);
results.frostNumbered = await fightIf('frostNumbered', 'frost-numbered', 'frost', [{ id: 'ogre', hp: 200, name: 'Ogre', move: club(12) }], [{ NW: 3 }]);
results.frostLate = await fightIf('frostLate', 'frost-late', 'frost', [{ id: 'ogre', hp: 400, name: 'Ogre', move: club(12), initDie: 1000 }], [{ NW: 1, S: 1 }, { NW: 4, S: 1 }, { NW: 1, S: 1 }]);
import('node:fs').then((fs) => { const f = `${out}/ui-results.json`; const old = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { results: {} }; const keep = Object.fromEntries(Object.entries(results).filter(([, v]) => v)); fs.writeFileSync(f, JSON.stringify({ info, results: { ...old.results, ...keep } }, null, 1)); });
console.log(problems.length ? `PROBLEMS:\n${[...new Set(problems)].join('\n')}` : 'no page errors'); await b.close();
