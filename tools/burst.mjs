// Solo burst damage and sudden deaths (T02 on docs/team/BOARD.md, 23 Oct 2026). Dave: "dying from sixty percent health isn't
// automatically unfair; what matters is whether it was readable and preventable." Solo campaigns (released rules, smart player)
// record every round: the damage it took as a share of maximum health, potions, falls. When a hero dies in a round it began at 60%
// health or more, that moment is replayed: from the start of the fatal round, and from the round before (the warning a wind-up
// gives), each way of playing (smart, wise, guard: potions and heals early, rolls shaped for block) plays it out on SEEDS fresh rolls.
//   unlucky     the same play usually survives that round (a bad roll)
//   avoidable   some play survives nearly always, the one used rarely
//   unavoidable no play survives often (the round was lost before the dice)
//   risky       anything in between
//   RELEASE=1 CLS=knight,wizard SKILLS=normal,hard CAMPS=4 SEEDS=16 OUT=f.json node tools/burst.mjs      node tools/burst.mjs merge <dir>
import fs from 'node:fs';
import * as E from '../js/engine.js';
import * as DATA from '../js/data.js';
import { botRound, botShape, smartActs, botCamp, botLoot, PLAY, setScore, threatOf } from './sim.mjs';

if (process.argv[2] === 'merge') { report(fs.readdirSync(process.argv[3]).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(`${process.argv[3]}/${f}`, 'utf8')))); process.exit(0); }
const env = process.env;
const CLS = (env.CLS || 'knight,ranger,wizard,dwarf,bard').split(','); const SKILLS = (env.SKILLS || 'normal,hard').split(',');
const CAMPS = Number(env.CAMPS || 4); const SEEDS = Number(env.SEEDS || 16); const ACTS = Number(env.ACTS || 3);
const copy = (b, seed) => { const r = b.rng; b.rng = null; const c = JSON.parse(JSON.stringify(b)); b.rng = r; c.rng = E.makeRng(seed); return c; };
// guard: what a careful player does when a big hit is coming: drink and heal first, then shape the roll for block
const guardScore = (ev, b) => { const t = threatOf(b); return 1.5 * Math.min(ev.block, t + 4) + 0.6 * (ev.atk + ev.pierce) + 0.8 * Math.min(ev.heal, b.maxHp - b.hp) + 0.3 * ev.magic; };
const POLICY = {
  smart: (b, rng) => { PLAY.style = 'smart'; setScore(null); botRound(b, rng); },
  wise: (b, rng) => { PLAY.style = 'wise'; botRound(b, rng); PLAY.style = 'smart'; setScore(null); },
  guard: (b, rng) => {
    PLAY.style = 'smart'; E.startRoll(b);
    while (b.hp < b.maxHp * 0.85 && b.maxHp - b.hp >= E.potionHpOf(b.hero) && E.drinkPotion(b)) { /* drink */ }
    while (b.hp < b.maxHp * 0.7 && b.magic >= E.healCostOf(b.hero, b) && E.healSpend(b)) { /* heal */ }
    setScore(guardScore); botShape(b, rng); setScore(null); E.resolve(b, smartActs(b));
  },
};
// how often a way of playing comes through `rounds` rounds from this state, on fresh rolls
function survive(state, name, rounds) {
  let ok = 0;
  for (let s = 0; s < SEEDS; s++) { const c = copy(state, 7919 * (s + 1) + 13); for (let r = 0; r < rounds && !c.outcome; r++) POLICY[name](c, c.rng); if (c.outcome !== 'defeat' && c.hp > 0) ok++; }
  return ok / SEEDS;
}
const intents = (b) => b.enemies.filter((e) => e.hp > 0).map((e) => ({ id: e.id, name: e.name, v: e.intent?.v || null, n: e.intent?.n || null, slam: !!e.intent?.slam, range: E.intentRange(e) }));
const BIG = new Set(['charge', 'breath', 'stalk']);

const rows = { fights: [], rounds: [], cases: [] };
for (const cls of CLS) for (const skill of SKILLS) for (let c = 0; c < CAMPS; c++) {
  const seed = 9100 + 53 * c + cls.length * 7 + (skill === 'hard' ? 5000 : 0); const rng = E.makeRng(seed);
  const hero = E.newHero({ name: 'B', cls, seed }); hero.difficulty = skill; PLAY.style = 'smart'; setScore(null);
  for (let n = 0; n < DATA.QUESTS_PER_ACT * ACTS; n++) {
    const quest = E.questsFor(hero)[0]; const { act, step } = hero.campaign; let won = false;
    for (let t = 0; t < 6 && !won; t++) {
      if (t) while (E.buyPotion(hero)) { /* restock */ }
      const b = E.newBattle(hero, quest, rng, 1); const p0 = E.potionsLeft(b); let prev = null; let g = 0;
      while (!b.outcome && g++ < 80) {
        const snap = copy(b, 0); const hp0 = b.hp; const taken0 = b.stats.taken; const seen = intents(b);
        botRound(b, rng);
        const taken = b.stats.taken - taken0; rows.rounds.push({ cls, skill, act, frac: +(taken / b.maxHp).toFixed(3), from: +(hp0 / b.maxHp).toFixed(3) });
        if (b.outcome === 'defeat' && hp0 / b.maxHp >= 0.6) {
          const k = { cls, skill, act, step, kind: quest.kind, round: b.round, try: t + 1, from: +(hp0 / b.maxHp).toFixed(2), took: taken, maxHp: b.maxHp,
            potions: E.potionsLeft(snap), magic: snap.magic, intents: seen, warned: !!prev && prev.seen.some((x) => BIG.has(x.v)) || seen.some((x) => x.slam || x.v === 'breath') };
          k.now = Object.fromEntries(Object.keys(POLICY).map((p) => [p, survive(snap, p, 1)]));
          k.before = prev ? Object.fromEntries(Object.keys(POLICY).map((p) => [p, survive(prev.snap, p, 2)])) : null;
          const best = Math.max(...Object.values(k.now), ...(k.before ? Object.values(k.before) : [0]));
          k.verdict = k.now.smart >= 0.5 ? 'unlucky' : best >= 0.75 ? 'avoidable' : best < 0.25 ? 'unavoidable' : 'risky';
          rows.cases.push(k); process.stderr.write(`${cls} ${skill} ${act}.${step} ${k.verdict}\n`);
        }
        prev = { snap, seen };
      }
      won = b.outcome === 'victory';
      rows.fights.push({ cls, skill, act, kind: quest.kind, try: t + 1, won, rounds: b.round, potions: p0 - E.potionsLeft(b) });
      if (won) { const rw = E.battleRewards(b); hero.gold += rw.gold; E.gainXp(hero, rw.xp); botLoot(hero, rw.drops); E.shatterDiamonds(hero); }
    }
    if (!won) break;
    E.advanceCampaign(hero); botCamp(hero, rng);
  }
}
if (env.OUT) fs.writeFileSync(env.OUT, JSON.stringify(rows)); else report([rows]);

function report(parts) {
  const F = parts.flatMap((p) => p.fights); const R = parts.flatMap((p) => p.rounds); const K = parts.flatMap((p) => p.cases);
  const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
  const pc = (x) => `${(100 * x).toFixed(0)}%`;
  console.log('Solo burst damage and sudden deaths · released rules · smart player · Acts I–III');
  console.log('One-round damage is what the hero lost that round (after block) as a share of maximum health. A sudden death: dying in a round begun at 60% health or more.\n');
  console.log(`${'group'.padEnd(18)} fights  won 1st  falls  rounds potions │ round damage: median  90%   99%   max  ≥30%  ≥50%  ≥60% │ sudden deaths (per 100 fights)  unlucky avoidable risky unavoidable`);
  const groups = [...new Set(F.map((f) => `${f.skill} ${f.cls}`))].sort();
  const line = (label, f, r, k) => {
    if (!f.length) return;
    const first = f.filter((x) => x.try === 1); const fr = r.map((x) => x.frac); const v = (s) => k.filter((x) => x.verdict === s).length;
    console.log(`${label.padEnd(18)} ${String(first.length).padStart(6)}  ${pc(first.filter((x) => x.won).length / first.length).padStart(7)}  ${String(f.filter((x) => !x.won).length).padStart(5)}  ${(f.reduce((a, x) => a + x.rounds, 0) / f.length).toFixed(1).padStart(6)} ${(f.reduce((a, x) => a + x.potions, 0) / f.length).toFixed(2).padStart(7)} │ ${pc(q(fr, 0.5)).padStart(19)} ${pc(q(fr, 0.9)).padStart(5)} ${pc(q(fr, 0.99)).padStart(5)} ${pc(Math.max(...fr)).padStart(5)} ${pc(fr.filter((x) => x >= 0.3).length / fr.length).padStart(5)} ${pc(fr.filter((x) => x >= 0.5).length / fr.length).padStart(5)} ${pc(fr.filter((x) => x >= 0.6).length / fr.length).padStart(5)} │ ${String(k.length).padStart(5)} (${(100 * k.length / Math.max(1, first.length)).toFixed(1)})${String(v('unlucky')).padStart(18)}${String(v('avoidable')).padStart(10)}${String(v('risky')).padStart(6)}${String(v('unavoidable')).padStart(12)}`);
  };
  for (const g of groups) { const [s, c] = g.split(' '); line(g, F.filter((x) => x.skill === s && x.cls === c), R.filter((x) => x.skill === s && x.cls === c), K.filter((x) => x.skill === s && x.cls === c)); }
  console.log('');
  for (const s of [...new Set(F.map((x) => x.skill))]) for (const a of [1, 2, 3]) line(`${s} Act ${a}`, F.filter((x) => x.skill === s && x.act === a), R.filter((x) => x.skill === s && x.act === a), K.filter((x) => x.skill === s && x.act === a));
  console.log(`\nSudden deaths: ${K.length}. Warned (a wind-up, breath, stalk or slam was showing, this round or the one before): ${K.filter((k) => k.warned).length}. Potions still in the belt at the start of the fatal round: ${K.filter((k) => k.potions > 0).length}.`);
  console.log('Survival of the fatal round on fresh rolls, by way of playing (mean over the cases): from its start', Object.keys(POLICY).map((p) => `${p} ${pc(K.reduce((a, k) => a + k.now[p], 0) / Math.max(1, K.length))}`).join(' · '),
    '· from the round before (two rounds)', Object.keys(POLICY).map((p) => `${p} ${pc(K.filter((k) => k.before).reduce((a, k) => a + k.before[p], 0) / Math.max(1, K.filter((k) => k.before).length))}`).join(' · '));
  console.log('\nExamples (up to 12):');
  for (const k of K.slice(0, 12)) console.log(`  ${k.skill} ${k.cls}, Act ${k.act} step ${k.step} (${k.kind}, try ${k.try}), round ${k.round}: from ${pc(k.from)} of ${k.maxHp}, took ${k.took}. Facing ${k.intents.map((x) => `${x.name} ${x.n || x.v}${x.slam ? ' (slam)' : ''}${x.range ? ` ${x.range[0]}–${x.range[1]}` : ''}`).join(', ')}. Potions ${k.potions}, magic ${k.magic}. ${k.verdict.toUpperCase()}: survives from this round smart ${pc(k.now.smart)}, wise ${pc(k.now.wise)}, guard ${pc(k.now.guard)}${k.before ? `; from the round before smart ${pc(k.before.smart)}, wise ${pc(k.before.wise)}, guard ${pc(k.before.guard)}` : ''}.`);
}
