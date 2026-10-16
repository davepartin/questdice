// Diamond weapons (Dave, Oct 2026): the bring strip under the boss's quest card, the fight with a Diamond in hand, the victory
// (one shatters, a new one is found) and the Diamond case at camp.  node dev/diamonds.mjs [port]   (shots: docs/ingame/diamond_*.png)
import { chromium } from 'playwright-core';
const port = process.argv[2] || 8135;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.hints', 'off'); localStorage.setItem('qd.tutorial.done', '1'); } catch {} });
await p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#toast{display:none!important}'; document.head.append(s); })); // the test hero has no save
await p.goto(`http://localhost:${port}/?debug&manual&q=low`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 120000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const scrollTo = (sel) => p.evaluate((sel) => { const el = document.querySelector('.sx-side') || document.scrollingElement; const t = document.querySelector(sel); if (t) t.scrollIntoView({ block: 'center' }); }, sel);
// 1. the boss of Act I, with two Diamonds in the case: the spear brought in the left hand
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 1 }); h.level = 5; h.gold = 120; h.campaign.step = 10;
  h.dice = [...new Set([...(h.dice || []), 'NE'])];
  const r = E.makeRng(4); E.takeDiamond(h, { ...E.makeDiamond(r, 1), id: 'spear' }); E.takeDiamond(h, { ...E.makeDiamond(r, 1), id: 'shield' });
  E.armDiamond(h, E.diamondsOf(h)[0].uid, 'NW'); S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(2); await scrollTo('.sx-dbring'); await pump(0.5); await p.screenshot({ path: 'docs/ingame/diamond_1bring.png' });
// 2. the fight, with the Diamond Spear in the left hand
await p.evaluate(() => { const q = window.QD.E.questsFor(window.QD.S.hero)[0]; window.QD.startQuest(q); });
for (let i = 0; i < 120; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll'))) break; await pump(0.5); }
await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(6);
await p.screenshot({ path: 'docs/ingame/diamond_2fight.png' });
console.log('in hand', await p.evaluate(() => { const h = window.QD.S.hero; return `${h.loadout.NW.id}${h.loadout.NW.diamond ? ' (Diamond)' : ''} / ${h.loadout.NE.id}, case ${window.QD.E.diamondsOf(h).length}`; }));
// 3. victory: the spear shatters, the boss leaves a Diamond Sword
await p.evaluate(() => { const { S, B3, showVictory } = window.QD; S.battle.enemies.forEach((e) => { e.hp = 0; }); S.battle.outcome = 'victory'; S.battle.phase = 'done'; B3.stop(); showVictory(); });
await pump(2); for (let i = 0; i < 4 && !(await p.evaluate(() => !!document.querySelector('.sx-diamond'))); i++) { await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /continue/i.test(x.innerText))?.click()); await pump(2); } // past the boss's story page
await scrollTo('.sx-diamond'); await pump(0.5); await p.screenshot({ path: 'docs/ingame/diamond_3victory.png' });
console.log('after', await p.evaluate(() => { const h = window.QD.S.hero; return `${h.loadout.NW.id}${h.loadout.NW.diamond ? ' (Diamond)' : ''}, case ${window.QD.E.diamondsOf(h).map((d) => d.id).join(',')}`; }));
// 4. the Diamond case at camp
await p.evaluate(() => { const { S, showCamp } = window.QD; S.tab = 'gear'; showCamp({ fromBoard: true }); });
await pump(3); for (let i = 0; i < 40 && (await p.evaluate(() => document.querySelectorAll('.zn-diamonds .wc-art.ready').length)) < 2; i++) await pump(1);
await p.evaluate(() => { const el = document.querySelector('.sx-side'); const t = document.querySelector('.zn-diamonds'); if (el && t) el.scrollTop += t.getBoundingClientRect().top - 90; }); await pump(0.5);
await p.screenshot({ path: 'docs/ingame/diamond_4case.png' });
await b.close();
