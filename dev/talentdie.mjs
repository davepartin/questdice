// The talent die in the dice tray, with numbered faces.  node dev/talentdie.mjs tag
import { chromium } from 'playwright-core';
const [tag = 'talentdie'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const h = E.newHero({ name: 'Dave', cls: 'wizard', seed: 5 }); h.special.SW = 8; h.talent.SW = [['magic'], ['heal'], [], ['block'], ['atk']]; h.dice = ['N','W','C','E','S','NW','SW','NE','SE']; h.loadout.NE ||= { uid: 'f', id: 'fists', rarity: 0 }; S.hero = h; S.company = { members: [h] }; showBoard(); });
await pump(1);
await p.evaluate(() => { const q = { ...window.QD.E.questsFor(window.QD.S.hero)[0], enemies: ['goblin'] }; window.QD.startQuest(q); });
for (let i = 0; i < 200; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(2);
await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(8);
await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/${tag}.png` });
console.log(await p.evaluate(() => JSON.stringify(window.QD.S.battle.board.SW)));
await b.close();
