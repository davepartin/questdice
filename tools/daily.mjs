// How hard is the daily challenge? The sensible and wise players run each day of a fortnight (several tries each), fight by fight.
//   node tools/daily.mjs [days=14] [tries=6]
import { makeRng, newBattle } from '../js/engine.js';
import { dailyRun, dailyHero, fightScore, finalScore, FIGHTS } from '../js/daily.js';
import { botRound, PLAY, setScore } from './sim.mjs';
const DAYS = Number(process.argv[2] || 14); const T = Number(process.argv[3] || 6);
const start = new Date('2026-10-16T12:00:00');
for (const style of ['smart', 'wise']) {
  PLAY.style = style; setScore(null); const reach = Array(FIGHTS + 1).fill(0); let scores = 0; let n = 0; const byAct = {};
  for (let d = 0; d < DAYS; d++) {
    const day = new Date(start); day.setDate(day.getDate() + d); const key = day.toISOString().slice(0, 10); const run = dailyRun(key);
    for (let t = 0; t < T; t++) {
      const hero = dailyHero(run); const fights = []; const rng = makeRng(run.seed + 7919 * t);
      for (const q of run.quests) { const b = newBattle(hero, q, rng, 1); let g = 0; while (!b.outcome && g++ < 80) botRound(b, rng); const won = b.outcome === 'victory'; fights.push({ won, score: fightScore(b, won) }); if (!won) break; }
      const w = fights.filter((f) => f.won).length; reach[w]++; scores += finalScore(fights); n++; (byAct[run.act] ||= []).push(w);
    }
  }
  console.log(`${style}: fights won per run ${reach.map((c, i) => `${i}:${Math.round(100 * c / n)}%`).join(' ')} · clears ${Math.round(100 * reach[FIGHTS] / n)}% · average score ${Math.round(scores / n)}`);
  console.log('   by act (average fights won):', Object.entries(byAct).map(([a, v]) => `Act ${a} ${(v.reduce((x, y) => x + y, 0) / v.length).toFixed(1)}`).join(' · '));
}
