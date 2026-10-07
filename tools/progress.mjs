// Progression report: a bot hero plays the solo campaign through N acts and, at every step, we measure how the two roads
// would go for THAT hero (win chance, rounds, hp left), then it takes one road and moves on.
//   node tools/progress.mjs [acts = 2] [campaigns per class = 4] [policy = steady|bold|smart] [class]
import { makeRng, newHero, questsFor, battleRewards, gainXp, advanceCampaign, newBattle, sidesOf, weaponSize, heroPower, questDanger } from '../js/engine.js';
import { botRound, botCamp, botLoot } from './sim.mjs';
import { QUESTS_PER_ACT } from '../js/data.js';

const ACTS = Number(process.argv[2] || 2); const N = Number(process.argv[3] || 4); const POLICY = process.argv[4] || 'smart';
const classes = process.argv[5] ? [process.argv[5]] : ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
const clone = (h) => JSON.parse(JSON.stringify(h));

function trial(hero, quest, seed, n = Number(process.env.TRIALS || 8)) {
  let wins = 0; let rounds = 0; let hp = 0;
  for (let i = 0; i < n; i++) {
    const rng = makeRng(seed * 31 + i); const h = clone(hero); const b = newBattle(h, quest, rng, 1); let g = 0;
    while (!b.outcome && g++ < 60) botRound(b, rng);
    if (b.outcome === 'victory') { wins++; hp += b.hp / b.maxHp; } rounds += b.round;
  }
  return { win: wins / n, rounds: rounds / n, hp: wins ? hp / wins : 0 };
}

const agg = {}; let clears = 0; let total = 0; const pairs = [];
for (const cls of classes) for (let s = 0; s < N; s++) {
  total++; const seed = 7000 + s; const rng = makeRng(seed); const hero = newHero({ name: 'P', cls, seed });
  let alive = true;
  for (let n = 0; n < QUESTS_PER_ACT * ACTS && alive; n++) {
    const opts = questsFor(hero); const key = `${hero.campaign.act}.${String(hero.campaign.step).padStart(2, '0')}`;
    const A = (agg[key] ||= { n: 0, sw: 0, pw: 0, sr: 0, pr: 0, shp: 0, php: 0, lvl: 0, gold: 0, str: 0, wpn: 0, pow: 0, took: 0, kind: opts[0].kind, sd: 0, pd: 0 });
    const tS = trial(hero, opts[0], seed + n); const tP = opts[1] ? trial(hero, opts[1], seed + n + 99) : null;
    A.n++; A.sw += tS.win; A.sr += tS.rounds; A.shp += tS.hp; A.lvl += hero.level; A.gold += hero.gold;
    A.str += (hero.strength.W + hero.strength.E) / 2; A.wpn += sidesOf(hero, 'NW'); A.pow += heroPower(hero).dmg;
    A.sd += questDanger(hero, opts[0]).score; pairs.push([questDanger(hero, opts[0]).score, tS.win]);
    if (tP) { A.pw += tP.win; A.pr += tP.rounds; A.php += tP.hp; A.pd += questDanger(hero, opts[1]).score; pairs.push([questDanger(hero, opts[1]).score, tP.win]); }
    let pick = 0;
    if (opts[1] && (POLICY === 'bold' || (POLICY === 'smart' && tP.win >= 0.8))) pick = 1;
    A.took += pick;
    const quest = opts[pick]; let b; let tries = 0;
    do { b = newBattle(hero, quest, rng, 1); let g = 0; tries++; while (!b.outcome && g++ < 60) botRound(b, rng); } while (b.outcome === 'defeat' && tries < 4);
    if (b.outcome !== 'victory') { alive = false; break; }
    const r = battleRewards(b); hero.gold += r.gold; gainXp(hero, r.xp); botLoot(hero, r.drops); advanceCampaign(hero); botCamp(hero, rng);
  }
  if (alive) clears++;
}
if (process.env.OUT) { (await import('node:fs')).writeFileSync(process.env.OUT, JSON.stringify({ agg, clears, total, pairs })); }
else printReport(agg, clears, total, `policy ${POLICY}, ${ACTS} act(s)`);
export function printReport(agg, clears, total, title) {
  console.log(`${title}: cleared ${clears}/${total}`);
  console.log('step   kind    steady win  rounds  hp | perilous win  rounds  hp | took P | lvl  gold  str  wpn  dmg/rd | danger S/P');
  for (const [k, A] of Object.entries(agg).sort(([a], [b]) => (a < b ? -1 : 1))) {
    const f = (x, d = 0) => (x / A.n).toFixed(d);
    console.log(`${k}  ${A.kind.padEnd(6)}  ${(100 * A.sw / A.n).toFixed(0).padStart(5)}%  ${f(A.sr, 1).padStart(6)} ${(100 * A.shp / A.n).toFixed(0).padStart(3)}% | ${A.pw ? (100 * A.pw / A.n).toFixed(0).padStart(9) + '%' : '        - '}  ${A.pw ? f(A.pr, 1).padStart(6) : '     -'} ${A.pw ? (100 * A.php / A.n).toFixed(0).padStart(3) + '%' : '   -'} | ${(100 * A.took / A.n).toFixed(0).padStart(5)}% | ${f(A.lvl, 1).padStart(4)} ${f(A.gold).padStart(5)} ${f(A.str, 1).padStart(4)} ${f(A.wpn, 1).padStart(4)} ${f(A.pow, 1).padStart(6)} | ${f(A.sd, 2)} / ${A.pd ? f(A.pd, 2) : '-'}`);
  }
}
