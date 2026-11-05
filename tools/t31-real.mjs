// T31: what one point of each colour is worth, with REAL heroes. The bot campaign plays Acts I to III (levelling, shopping and
// upgrading as a player does); before some of its fights the hero is copied, and that same fight is replayed once plain and once with
// each free bonus a round (on the same dice: common seeds). A fight's score is winning and the health you keep (win × (½ + ½ × health
// left)), so block and heal count as well as attack. The bonus is matched to the extra attack that scores the same.
// Measurement only; nothing in the game changes.
//   node tools/t31-real.mjs [campaigns a class = 4] [every nth fight = 2] [bonus = 3]
import { applyRelease } from '../js/release.js';
import * as E from '../js/engine.js';
import * as D from '../js/data.js';
import { botShape, smartActs, botCamp } from './sim.mjs';
applyRelease();
const C = +(process.argv[2] || 4); const EVERY = +(process.argv[3] || 2); const AMT = +(process.argv[4] || 3);
const CLASSES = (process.env.CLASSES || 'knight,ranger,wizard,dwarf,bard').split(',');
const clone = (x) => JSON.parse(JSON.stringify(x));
function fightOnce(hero, quest, seed, kind, amt) {
  const h = clone(hero); const rng = E.makeRng(seed); const b = E.newBattle(h, quest, rng, 1); let g = 0;
  while (!b.outcome && g++ < 60) { E.startRoll(b); botShape(b, rng); if (amt) { if (kind === 'magic') b.magic += amt; else b.mods[kind] = (b.mods[kind] || 0) + amt; } E.resolve(b, smartActs(b)); }
  return b;
}
// the campaign, copying the hero before every nth fight
const snaps = [];
for (const cls of CLASSES) for (let s = 0; s < C; s++) {
  const rng = E.makeRng(9000 + s); const hero = E.newHero({ name: 'Real', cls, seed: 9000 + s }); let n = 0;
  for (let i = 0; i < D.QUESTS_PER_ACT * 3 + 6 && hero.campaign.act <= 3; i++) {
    const quest = E.questsFor(hero)[0]; if (!quest) break;
    if (n++ % EVERY === 0) snaps.push({ hero: clone(hero), quest: clone(quest), seed: 77 * snaps.length + 5, n: (quest.enemies || []).length, boss: quest.kind === 'boss', act: hero.campaign.act });
    let b = null; for (let t = 0; t < 4 && b?.outcome !== 'victory'; t++) { const h0 = hero; b = E.newBattle(h0, quest, rng, 1); let g = 0; while (!b.outcome && g++ < 60) { E.startRoll(b); botShape(b, rng); E.resolve(b, smartActs(b)); } }
    if (b.outcome !== 'victory') break;
    const r = E.battleRewards(b); hero.gold += r.gold; E.gainXp(hero, r.xp); E.advanceCampaign(hero); botCamp(hero, rng);
  }
}
const score = (b) => (b.outcome === 'victory' ? 0.5 + 0.5 * b.hp / b.maxHp : 0);
const VARIANTS = [['atk', 0], ...[1, 2, 3, 4, 6, 8, 12].map((a) => ['atk', a]), ['pierce', AMT], ['splash', AMT], ['block', AMT], ['heal', AMT], ['magic', 1]];
const res = VARIANTS.map(([k, a]) => snaps.map((f) => { const b = fightOnce(f.hero, f.quest, f.seed, k, a); return { s: score(b), win: b.outcome === 'victory' ? 1 : 0 }; }));
const groups = { all: () => true, 'one monster': (f) => f.n === 1, 'two monsters': (f) => f.n === 2, 'three monsters': (f) => f.n >= 3, bosses: (f) => f.boss, 'Act I': (f) => f.act === 1, 'Act II': (f) => f.act === 2, 'Act III': (f) => f.act === 3 };
const say = (t) => process.stdout.write(t + '\n');
say(`${snaps.length} real fights (${CLASSES.join(', ')}, ${C} bot campaigns each, every ${EVERY === 1 ? '' : EVERY === 2 ? '2nd ' : `${EVERY}th `}fight); free bonus +${AMT} a round (magic +1); score = win × (½ + ½ health left)`);
for (const [gname, sel] of Object.entries(groups)) {
  const idx = snaps.map((f, i) => (sel(f) ? i : -1)).filter((i) => i >= 0); if (!idx.length) continue;
  const avg = (v) => idx.reduce((t, i) => t + res[v][i].s, 0) / idx.length; const win = (v) => idx.reduce((t, i) => t + res[v][i].win, 0) / idx.length;
  const curve = VARIANTS.map(([k, a], v) => [k, a, v]).filter(([k]) => k === 'atk').map(([, a, v]) => [a, avg(v)]);
  const worth = (y) => { for (let i = 1; i < curve.length; i++) { const [a0, s0] = curve[i - 1], [a1, s1] = curve[i]; if (y >= Math.min(s0, s1) && y <= Math.max(s0, s1)) return a0 + (a1 - a0) * (y - s0) / ((s1 - s0) || 1e-9); } return y < curve[0][1] ? 0 : Infinity; };
  const row = VARIANTS.map(([k, a], v) => [k, a, v]).filter(([k]) => k !== 'atk').map(([k, a, v]) => { const w = worth(avg(v)); return `${k} ${w === Infinity ? '>' + (12 / a).toFixed(1) : (w / a).toFixed(2)}`; });
  say(`${gname.padEnd(15)} ${String(idx.length).padStart(4)} fights, plain win ${Math.round(100 * win(0))}% score ${avg(0).toFixed(3)}, +12 attack ${avg(7).toFixed(3)} | a point is worth, in attack: ${row.join(' · ')}`);
}
