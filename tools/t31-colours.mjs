// T31 (Dave, 5 Nov 2026: "we need to use different size dice, different numbers of dice, and the cost of the dice based on the outcome"):
// what one point of each colour is worth, in attack points, judged by how often the hero WINS (block and heal keep you alive, they
// do not end a fight sooner, so speed cannot price them). Hard fights, so the win rate can move: each act's story steps, bosses
// included, the hero a few levels under. Every fight is played once plain and once with each free bonus, on the same dice
// (common seeds), and the bonus is matched to the extra attack that wins as often. Measurement only; nothing in the game changes.
//   node tools/t31-colours.mjs [fights = 300] [bonus = 3]      CLASSES=knight,wizard
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import { botShape, smartActs } from './sim.mjs';
applyRelease();
const N = +(process.argv[2] || 300); const AMT = +(process.argv[3] || 3);
const CLASSES = (process.env.CLASSES || 'knight,ranger,wizard,dwarf,bard').split(',');
const STAGES = [{ act: 1, level: 2, steps: [2, 3, 4, 5, 6, 7, 8, 9, 10] }, { act: 2, level: 6, steps: [2, 3, 4, 5, 6, 7, 8, 9, 10] }, { act: 3, level: 10, steps: [2, 3, 4, 5, 6, 7, 8, 9, 10] }];
const fights = [];
for (let i = 0; fights.length < N; i++) {
  const st = STAGES[i % 3]; const step = st.steps[Math.floor(i / 3) % st.steps.length]; const cls = CLASSES[i % CLASSES.length];
  const h = E.newHero({ name: 'C', cls, seed: 100 + i }); h.level = st.level; h.campaign.act = st.act; h.campaign.step = step; h.campaign.wins = step;
  const q = E.roadsFor(h, { random: true })[0]; if (!q?.enemies?.length) continue; fights.push({ st, step, cls, q, seed: 100 + i, n: q.enemies.length, boss: q.kind === 'boss' });
}
function play(f, kind, amt) {
  const h = E.newHero({ name: 'C', cls: f.cls, seed: f.seed }); h.level = f.st.level; h.campaign.act = f.st.act; h.campaign.step = f.step; h.campaign.wins = f.step;
  const rng = E.makeRng(f.seed * 31 + 7); const b = E.newBattle(h, f.q, rng, 1); let g = 0;
  while (!b.outcome && g++ < 60) { E.startRoll(b); botShape(b, rng); if (amt) { if (kind === 'magic') b.magic += amt; else b.mods[kind] = (b.mods[kind] || 0) + amt; } E.resolve(b, smartActs(b)); }
  return { win: b.outcome === 'victory' ? 1 : 0, hp: b.outcome === 'victory' ? b.hp / b.maxHp : 0, rounds: b.round };
}
// a fight's score: winning, and a little for the health you keep (so a bonus that wins no more fights but leaves you healthier still counts)
const score = (r) => r.win + 0.25 * r.hp;
// every fight once per variant, kept, so each group reads the same plays
const VARIANTS = [['atk', 0], ...[1, 2, 3, 4, 6, 8, 12].map((a) => ['atk', a]), ['pierce', AMT], ['splash', AMT], ['block', AMT], ['heal', AMT], ['magic', 1]];
const res = VARIANTS.map(([k, a]) => fights.map((f) => play(f, k, a)));
const groups = { all: () => true, 'one monster': (f) => f.n === 1, 'two monsters': (f) => f.n === 2, 'three monsters': (f) => f.n >= 3, bosses: (f) => f.boss, 'no bosses': (f) => !f.boss };
const say = (t) => process.stdout.write(t + '\n');
say(`${fights.length} fights (${CLASSES.join(', ')}; acts 1-3, steps 2-10, bosses included, hero 2 levels under); free bonus +${AMT} a round (magic +1)`);
for (const [gname, sel] of Object.entries(groups)) {
  const idx = fights.map((f, i) => (sel(f) ? i : -1)).filter((i) => i >= 0); if (!idx.length) continue;
  const avg = (v) => idx.reduce((t, i) => t + score(res[v][i]), 0) / idx.length; const win = (v) => idx.reduce((t, i) => t + res[v][i].win, 0) / idx.length;
  const curve = VARIANTS.map(([k, a], v) => [k, a, v]).filter(([k]) => k === 'atk').map(([, a, v]) => [a, avg(v)]);
  const worth = (y) => { for (let i = 1; i < curve.length; i++) { const [a0, s0] = curve[i - 1], [a1, s1] = curve[i]; if (y >= Math.min(s0, s1) && y <= Math.max(s0, s1)) return a0 + (a1 - a0) * (y - s0) / ((s1 - s0) || 1e-9); } return y < curve[0][1] ? 0 : Infinity; };
  const row = VARIANTS.map(([k, a], v) => [k, a, v]).filter(([k]) => k !== 'atk').map(([k, a, v]) => { const w = worth(avg(v)); return `${k} ${w === Infinity ? '>' + (12 / a).toFixed(1) : (w / a).toFixed(2)}`; });
  say(`${gname.padEnd(15)} ${String(idx.length).padStart(4)} fights, plain win ${Math.round(100 * win(0))}%, +12 attack ${Math.round(100 * win(7))}% | a point is worth, in attack: ${row.join(' · ')}`);
}
