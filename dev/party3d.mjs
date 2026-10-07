// 3D company battle on one phone: three heroes roll and lock in turn, the monsters answer, screenshots along the way.
//   node dev/party3d.mjs [rounds = 2]
import { chromium } from 'playwright-core';
const ROUNDS = Number(process.argv[2] || 2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
await p.goto('http://localhost:8135/?debug&manual&q=low'); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
const idle = async (max = 40) => { for (let i = 0; i < max && !(await p.evaluate(() => window.QD.B3.idle())); i++) await pump(0.5); };
const shot = async (name) => { await p.evaluate(() => window.QD.world.stage.step(1)); await p.screenshot({ path: `docs/ingame/party_${name}.png` }); };
await p.evaluate(() => { const { S, E, showBoard } = window.QD; const c = E.newCompany({ name: 'Lanterns', roster: [{ name: 'Ada', cls: 'knight' }, { name: 'Bea', cls: 'wizard' }, { name: 'Cy', cls: 'ranger' }], seed: 9 }); S.company = c; S.hero = c.members[0]; showBoard(); });
await pump(1);
await p.evaluate(() => { const q = window.QD.E.questsFor(window.QD.S.company.members[0])[0]; window.QD.startQuest(q); });
for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector("#b3-roll") && window.QD.B3.battleState.bw)) break; await pump(0.5); }
await pump(3); await shot('0_reset');
for (let r = 0; r < ROUNDS; r++) {
  for (let k = 0; k < 3; k++) {
    if (!(await p.evaluate(() => !!document.querySelector('#b3-roll')))) break;
    await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(5); await idle();
    if (r === 0 && k === 1) { await p.evaluate(() => [...document.querySelectorAll('button')].find((e) => /magic\s*powers/i.test(e.textContent))?.click()); await pump(1); await p.evaluate(() => document.querySelector('.sh-tabs [data-tab=team]')?.click()); await pump(1); await shot('2_team'); await p.evaluate(() => document.querySelector('.sh-x')?.click()); await pump(1); }
    if (r === 0 && k === 0) await shot('1_shape');
    console.log('lock', await p.evaluate(() => document.querySelector('#b3-lock')?.innerText.replace(/\n/g, ' ')));
    await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(2); await idle(80);
  }
  await pump(2); if (r === 0) await shot('3_after');
  const st = await p.evaluate(() => { const b = window.QD.B3.battleState.b; return { round: b.round, outcome: b.outcome, foes: b.enemies.map((e) => e.hp), heroes: b.fighters.map((f) => `${f.hero.name}:${f.hp}/${f.maxHp}:${Math.round(f.points)}`), rep: b.report && { team: b.report.team, heartbeat: b.report.heartbeat, moral: b.report.moral, order: b.report.order?.map((x) => x.name).join('>') } }; });
  console.log(JSON.stringify(st));
  if (st.outcome) { console.log('foe actors', await p.evaluate(() => [...window.QD.B3.battleState.bw.actors.values()].map((a) => `alive=${a.alive} dead=${a.dead} vis=${a.root.visible}`).join(' ; '))); console.log('strikes', await p.evaluate(() => JSON.stringify(window.QD.B3.battleState.lastRep?.strikes?.map((s) => [s.name, s.dealt, s.killed])))); break; }
}
for (let i = 0; i < 40 && !(await p.evaluate(() => !!document.querySelector('.sx-places'))); i++) await pump(0.5);
await p.waitForTimeout(800); await p.screenshot({ path: 'docs/ingame/party_4_victory.png' });
console.log('victory', await p.evaluate(() => document.querySelector('.sx-places')?.innerText.replace(/\n/g, ' | ')));
console.log('roster', await p.evaluate(() => document.querySelector('.b3-roster')?.innerText.replace(/\n/g, ' ')));
await b.close();
