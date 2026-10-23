// Replay pacing, measured in the game (the replay-pace experiment, Oct 2026): a company of N heroes on one phone plays three rounds;
// for each round, the seconds from the last lock-in to the next round being ready, and how many strikes the replay showed.
// Both the live pacing and the preview (?pace=actions).   node dev/pace.mjs [sizes=2,4,6] [rounds=3]
import { chromium } from 'playwright-core';
const sizes = (process.argv[2] || '2,4,6').split(',').map(Number); const ROUNDS = Number(process.argv[3] || 3);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const problems = [];
for (const mode of ['', 'pace=actions']) for (const N of sizes) {
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true });
  p.on('pageerror', (e) => problems.push(e.message));
  await p.route(/firestore.googleapis.com|identitytoolkit.googleapis.com|gstatic.com\/firebasejs/, (r) => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem('qd.tutorial.done', '1'); localStorage.setItem('qd.hints', 'off'); } catch {} });
  await p.goto(`http://localhost:8135/?debug&manual&q=low${mode ? `&${mode}` : ''}`); await p.waitForFunction(() => window.QD?.world?.stage, null, { timeout: 90000 });
  const pump = (s) => p.evaluate(async (s) => { const st = window.QD.world.stage; for (let i = 0; i < Math.round(s * 15); i++) { st.simulate(1 / 15, 1 / 30); await new Promise((r) => setTimeout(r, 0)); } }, s);
  await p.evaluate((N) => { const { S, E, showBoard } = window.QD; const cls = ['knight', 'ranger', 'wizard', 'dwarf', 'bard', 'knight'];
    const ms = Array.from({ length: N }, (_, i) => { const h = E.newHero({ name: ['Ann', 'Ben', 'Cal', 'Dee', 'Eve', 'Fay'][i], cls: cls[i], seed: 30 + i }); h.campaign.act = 2; h.level = 6; return h; });
    S.hero = ms[0]; S.company = { members: ms }; showBoard(); }, N);
  await pump(1);
  await p.evaluate(() => { const { E, S } = window.QD; window.QD.startQuest({ ...E.questsFor(S.hero)[0], enemies: ['ogre', 'goblin', 'goblin'], kind: 'battle' }); });
  for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !!document.querySelector('#b3-roll') && window.QD.B3.battleState.bw)) break; await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^(Decline|Continue|Start|Fight)$/.test(x.textContent.trim()))?.click()); await pump(0.5); }
  await pump(2); const rows = [];
  for (let r = 0; r < ROUNDS; r++) {
    if (await p.evaluate(() => !!window.QD.B3.battleState.b?.outcome)) break;
    for (let k = 0; k < N; k++) {
      if (await p.evaluate(() => window.QD.B3.battleState.b?.outcome)) break;
      await p.evaluate(() => document.querySelector('.fb-slot.foe:not(.dead) .fb-pc')?.click()); await pump(0.3);
      await p.evaluate(() => document.querySelector('#b3-roll')?.click()); await pump(3);
      for (let i = 0; i < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(0.5);
      const t0 = await p.evaluate(() => window.QD.world.stage.time);
      await p.evaluate(() => document.querySelector('#b3-lock')?.click()); await pump(0.2);
      if (k === N - 1 || await p.evaluate(() => window.QD.B3.battleState.replaying)) {
        for (let i = 0; i < 400 && await p.evaluate(() => window.QD.B3.battleState.busy || window.QD.B3.battleState.replaying); i++) await pump(0.25);
        const t1 = await p.evaluate(() => window.QD.world.stage.time); const rep = await p.evaluate(() => window.QD.B3.battleState.lastRep);
        rows.push({ round: rep?.round, strikes: rep?.order?.length || 0, seconds: +(t1 - t0).toFixed(1) }); break;
      }
      for (let i = 0; i < 20 && await p.evaluate(() => window.QD.B3.battleState.busy); i++) await pump(0.5);
    }
    await pump(1);
  }
  console.log(`${mode || 'live pacing'} · ${N} heroes: ${rows.map((x) => `round ${x.round}: ${x.strikes} strikes, ${x.seconds} s`).join(' · ')}`);
  await p.close();
}
console.log(problems.length ? `PROBLEMS:\n${problems.slice(0, 5).join('\n')}` : 'no page errors'); await b.close();
