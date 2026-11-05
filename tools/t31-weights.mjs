// T31 (Dave, 5 Nov 2026: "splash in many games is overpowered... we need to weight: red attack, orange pierce, pink splash"):
// what one point of each colour is worth in real fights. A Knight plays the story fights with the smart bot, once plain and once
// with a free bonus every round (attack, pierce or splash, added after the roll like a power's). The bonus that wins as fast as
// +X attack is worth X attack. Split by how many monsters the fight starts with. Measurement only; nothing in the game changes.
//   node tools/t31-weights.mjs [fights per road = 40]
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import { botShape, smartActs } from './sim.mjs';
applyRelease();
const N = +(process.argv[2] || 40);
const STAGES = [{ act: 1, level: 4, steps: [2, 3, 4, 6, 7, 8] }, { act: 2, level: 8, steps: [2, 3, 4, 6, 7, 8] }, { act: 3, level: 12, steps: [2, 3, 4, 6, 7, 8] }];
// the fights: every road the game rolls for these steps, kept by how many monsters start
const roads = { 1: [], 2: [], 3: [] };
for (const st of STAGES) for (const step of st.steps) for (let s = 1; s <= 30; s++) {
  const h = E.newHero({ name: 'W', cls: 'knight', seed: s }); h.level = st.level; h.campaign.act = st.act; h.campaign.step = step; h.campaign.wins = step;
  for (const q of E.roadsFor(h, { random: true })) { const n = (q.enemies || []).length; if (roads[n] && q.kind !== 'boss') roads[n].push({ st, step, q, seed: s }); }
}
function play(kind, amt) {
  const out = {};
  for (const n of [1, 2, 3]) { let rounds = 0, won = 0, fights = 0, hurt = 0;
    const list = roads[n].filter((_, i) => i % Math.max(1, Math.floor(roads[n].length / N)) === 0).slice(0, N);
    for (const [i, r] of list.entries()) {
      const h = E.newHero({ name: 'W', cls: 'knight', seed: r.seed }); h.level = r.st.level; h.campaign.act = r.st.act; h.campaign.step = r.step; h.campaign.wins = r.step;
      const rng = E.makeRng(7919 * i + 13 * n); const b = E.newBattle(h, r.q, rng, 1); let g = 0;
      while (!b.outcome && g++ < 60) { E.startRoll(b); botShape(b, rng); if (amt) b.mods[kind] = (b.mods[kind] || 0) + amt; E.resolve(b, smartActs(b)); }
      fights++; rounds += b.round; if (b.outcome === 'victory') won++; hurt += 1 - b.hp / b.maxHp;
    }
    out[n] = { rounds: rounds / fights, win: won / fights, hurt: hurt / fights, fights };
  }
  return out;
}
const base = play('atk', 0);
const atkCurve = [2, 4, 6, 8].map((a) => [a, play('atk', a)]);
// how much attack wins as fast as this bonus (interpolating on rounds to win)
const worth = (res, n) => { const pts = [[0, base[n].rounds], ...atkCurve.map(([a, r]) => [a, r[n].rounds])];
  const y = res[n].rounds; for (let i = 1; i < pts.length; i++) { const [a0, r0] = pts[i - 1], [a1, r1] = pts[i]; if (y <= r0 && y >= r1) return a0 + (a1 - a0) * (r0 - y) / Math.max(1e-9, r0 - r1); }
  return y > pts[0][1] ? 0 : Infinity; };
const AMT = 4; const rows = [];
console.log(`fights a monster count: ${[1, 2, 3].map((n) => `${n}: ${Math.min(N, roads[n].length)}`).join(', ')} (bosses left out)`);
console.log(`plain: ${[1, 2, 3].map((n) => `${n} monster${n > 1 ? 's' : ''} ${base[n].rounds.toFixed(2)} rounds, win ${Math.round(100 * base[n].win)}%`).join(' | ')}`);
for (const kind of ['atk', 'pierce', 'splash']) { const r = kind === 'atk' ? atkCurve[1][1] : play(kind, AMT);
  rows.push(`+${AMT} ${kind.padEnd(6)} ${[1, 2, 3].map((n) => `${n}m: ${r[n].rounds.toFixed(2)} rds, worth ${worth(r, n) === Infinity ? '>8' : worth(r, n).toFixed(1)} attack`).join(' | ')}`); }
console.log(rows.join('\n'));
