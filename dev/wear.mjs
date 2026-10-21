// Weapon wear on screen (Oct 2026): battles left on the pack's weapon cards, and the line after a battle that wore one out.
//   node dev/wear.mjs [out dir]
import { chromium } from 'playwright-core';
const out = process.argv[2] || 'docs/ingame';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
const problems = []; p.on('pageerror', (e) => problems.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const shot = async (n) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `${out}/wear_${n}.png` }); };
// 1. the Gear tab: a Gold sword with one battle left, a Silver bow, a fresh Bronze spear
await p.evaluate(() => { const { S, E, showCamp } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'knight', seed: 7 }); h.level = 4; h.gold = 120;
  const g = E.makeWeapon('sword', 2, E.makeRng(1), 4); g.left = 1; h.bag.push(g, E.makeWeapon('bow', 1, E.makeRng(2), 4), E.makeWeapon('spear', 0, E.makeRng(3), 4));
  h.loadout.NW.left = 2; S.hero = h; S.company = { members: [h] }; S.tab = 'gear'; showCamp({ fromBoard: true }); });
await pump(2);
await p.evaluate(() => { const z = [...document.querySelectorAll('.sh-wear')][0]?.closest('.sh-row'); z?.scrollIntoView({ block: 'center' }); });
await pump(1); await shot('gear');
console.log('labels:', await p.evaluate(() => [...document.querySelectorAll('.sh-wear, .wc-sub')].map((e) => e.textContent.trim()).slice(0, 8).join(' | ')));
// 2. a battle that wears the sword out: win it at once
await p.evaluate(() => { const { S, E } = window.QD; S.hero.loadout.NW.left = 1; window.QD.startQuest({ ...E.questsFor(S.hero)[0], enemies: ['goblin'], kind: 'battle' }); });
for (let i = 0; i < 200; i++) {
  if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break;
  await p.evaluate(() => { const go = [...document.querySelectorAll('button')].find((x) => /^(fight|begin|accept|decline|take it|to battle|onward|continue|let'?s go|start)/i.test(x.textContent.trim()) && !x.disabled); go?.click(); });
  await pump(0.5);
}
console.log('in battle:', await p.evaluate(() => !!document.querySelector('#b3-roll')), await p.evaluate(() => [...document.querySelectorAll('button')].map((x) => x.textContent.trim()).filter(Boolean).slice(0, 12).join(' | ')));
await pump(2);
await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^Decline$/.test(x.textContent.trim()))?.click()); await pump(1);
await p.evaluate(() => { for (const e of window.QD.S.battle.enemies) e.hp = 1; document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click(); document.querySelector('#b3-roll')?.click(); }); await pump(5);
await p.evaluate(() => document.querySelector('#b3-lock')?.click());
for (let i = 0; i < 20 && !(await p.evaluate(() => !!document.querySelector('.dm-line.worn'))); i++) await pump(1);
// (the replay waits on real time here; once the fight is won, open the victory screen as the game would)
for (let i = 0; i < 30 && !(await p.evaluate(() => !!document.querySelector('.dm-line.worn'))); i++) { await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /victory/i.test(x.textContent))?.click()); await pump(1); }
for (let i = 0; i < 12 && !(await p.evaluate(() => !!document.querySelector('.dm-line.worn'))); i++) {
  const bt = await p.evaluate(() => [...document.querySelectorAll('button')].map((x) => x.textContent.trim()).filter(Boolean).slice(0, 8).join(' | ')); console.log('  buttons:', bt);
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /(continue|onward|next|got it|spoils|^close$|✕ close|skip)/i.test(x.textContent.trim()) && !x.disabled)?.click()); await pump(1.5);
}
console.log('outcome:', await p.evaluate(() => window.QD.S.battle?.outcome), 'NW:', await p.evaluate(() => JSON.stringify(window.QD.S.hero.loadout.NW)), 'screen:', await p.evaluate(() => document.querySelector('h1')?.textContent));
console.log('after the battle:', await p.evaluate(() => document.querySelector('.dm-line.worn')?.textContent || 'no worn line'));
await p.evaluate(() => document.querySelector('.dm-line.worn')?.scrollIntoView({ block: 'center' }));
await pump(1); await shot('victory');
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no page errors'); await b.close();
