// Tension study: how dangerous do ordinary fights feel? A bot hero of each class plays the campaign to a few checkpoints;
// at each, it fights the standard and the perilous quest many times. Prints win%, rounds, damage taken (as a share of
// max health, before potions and heals), potions drunk, and "close calls": fights won after dropping to 30% health or less
// at some point (the ones a player remembers).
//   node tools/tension.mjs [fights per cell = 60] [classes = all]
import { makeRng, newHero, questsFor, battleRewards, gainXp, advanceCampaign, newBattle } from '../js/engine.js';
import { botRound, botCamp, botLoot } from './sim.mjs';
import { CLASSES, ORDINARY, PET_GROW } from '../js/data.js';
if (process.env.TUNE_PETGROW) { const [a, b] = process.env.TUNE_PETGROW.split(',').map(Number); PET_GROW[4] = a; PET_GROW[6] = b; } // try pet growth prices
if (process.env.TUNE_FLAT) ORDINARY.flat = process.env.TUNE_FLAT.split(',').map(Number); // try other settings without editing data.js
if (process.env.TUNE_LONE) ORDINARY.lone = Number(process.env.TUNE_LONE);

const N = Number(process.argv[2] || 60);
const CLS = (process.argv[3] || Object.keys(CLASSES).join(',')).split(',');
const CHECKS = ['1.02', '1.04', '1.07', '1.09', '2.03', '2.07', '3.03', '3.07'];
const clone = (h) => JSON.parse(JSON.stringify(h));
const cells = {}; // key -> road -> totals

for (const cls of CLS) {
  const rng = makeRng(9000 + cls.length * 31);
  let hero = newHero({ name: 'T', cls, seed: 4242 + cls.length });
  for (let n = 0; n < 40; n++) {
    const key = `${hero.campaign.act}.${String(hero.campaign.step).padStart(2, '0')}`;
    if (key > CHECKS[CHECKS.length - 1]) break;
    const qs = questsFor(hero);
    if (CHECKS.includes(key)) {
      for (const [road, q] of [['steady', qs[0]], ['perilous', qs[1]]]) {
        if (!q || q.kind !== 'battle') continue;
        const r2 = makeRng(777 + n); const c = ((cells[key] ||= {})[road] ||= { n: 0, win: 0, rounds: 0, lost: 0, close: 0, pots: 0, foes: new Set() });
        q.enemies.forEach((id) => c.foes.add(id));
        for (let i = 0; i < N; i++) {
          const h = clone(hero); const b = newBattle(h, q, r2, 1); let g = 0; let low = b.hp; const pot0 = b.potions;
          while (!b.outcome && g++ < 60) { botRound(b, r2); low = Math.min(low, b.hp); }
          c.n++; c.rounds += b.round;
          if (b.outcome === 'victory') { c.win++; c.lost += b.stats.taken / b.maxHp; c.pots += pot0 - b.potions; if (low <= b.maxHp * 0.3) c.close++; }
        }
      }
    }
    const q = qs[0]; let b; let tries = 0;
    do { b = newBattle(hero, q, rng, 1); let g = 0; tries++; while (!b.outcome && g++ < 60) botRound(b, rng); } while (b.outcome === 'defeat' && tries < 5);
    if (b.outcome !== 'victory') { console.log(`${cls} fell at ${key}`); break; }
    const r = battleRewards(b); hero.gold += r.gold; gainXp(hero, r.xp); botLoot(hero, r.drops); advanceCampaign(hero); botCamp(hero, rng);
  }
}
console.log(`ordinary fights, ${N} per class per cell, classes ${CLS.join(' ')}, standard road flat ${ORDINARY.flat.join('/')} lone +${ORDINARY.lone}`);
console.log('step  road      win   rounds   taken  potions  close calls  foes');
const all = { steady: { n: 0, win: 0, rounds: 0, lost: 0, close: 0, pots: 0 }, perilous: { n: 0, win: 0, rounds: 0, lost: 0, close: 0, pots: 0 } };
for (const key of Object.keys(cells).sort()) for (const road of ['steady', 'perilous']) {
  const c = cells[key][road]; if (!c) continue;
  for (const f of ['n', 'win', 'rounds', 'lost', 'close', 'pots']) all[road][f] += c[f];
  console.log(`${line(key, road, c)}   ${[...c.foes].join(', ')}`);
}
function line(key, road, c) { const w = Math.max(1, c.win); return `${key.padEnd(4)}  ${road.padEnd(8)} ${(100 * c.win / c.n).toFixed(0).padStart(4)}%  ${(c.rounds / c.n).toFixed(1).padStart(6)}  ${(100 * c.lost / w).toFixed(0).padStart(5)}%  ${(c.pots / w).toFixed(2).padStart(7)}  ${(100 * c.close / w).toFixed(0).padStart(10)}%`; }
for (const road of ['steady', 'perilous']) { const c = all[road]; if (c.n) console.log(line('ALL', road, c)); }
