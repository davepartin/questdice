// The damage curve as the game really plays (Dave, Oct 2026: "it's not just I'm doing 80 attack on my turn... when I roll my strength
// from a one to a five, I want those four points to matter"; "Normal is easy and Hard is normal"). A bot hero plays the campaign; at
// every step the SAME hero fights that step's battle TRIALS times and every round is measured: the round's throw (attack + pierce +
// splash, what the player sees) split into dice, triples, straights and powers; what really landed; what the hero took; how many
// rounds a fight lasts; how low the hero's health got. Changes no rule. docs/ideas/BALANCE_AND_IDEAS_2026-10-20.md has the targets.
//   SKILL=normal STYLE=wise node tools/curve.mjs [acts=3] [campaigns per class=2] [class]     (sh tools/curve-all.sh runs every class)
//   node tools/curve.mjs merge <dir>                                                          (print the table from per-class OUT files)
import fs from 'node:fs';
import { makeRng, newHero, questsFor, battleRewards, gainXp, advanceCampaign, newBattle, buyPotion, takeDiamond, shatterDiamonds, evaluate, maxHpOf, weaponSize, tripleBonus } from '../js/engine.js';
import { botRound, botCamp, botLoot, botArm, PLAY, setScore } from './sim.mjs';
import { QUESTS_PER_ACT, RARITY, WEAPONS } from '../js/data.js';
import * as DATA from '../js/data.js';
if (process.env.TUNE) { // same as tools/progress.mjs: try numbers without editing data.js
  const put = (dst, src) => { for (const [k, v] of Object.entries(src)) { if (v && typeof v === 'object' && !Array.isArray(v)) put(dst[k], v); else if (Array.isArray(v)) v.forEach((x, i) => { dst[k][i] = x; }); else dst[k] = v; } };
  for (const [name, v] of Object.entries(JSON.parse(process.env.TUNE))) { if (Array.isArray(v)) v.forEach((x, i) => { DATA[name][i] = x; }); else put(DATA[name], v); }
}

// ---- what one round was made of (from the round's report, b.report)
export function roundParts(b, rep) {
  const ev = rep.ev; const T = rep.T;
  const board = Object.fromEntries(Object.entries(b.lastBoard || {}).map(([k, v]) => [k, { v }])); // b.board is cleared for the next round
  const atkStraight = ev.straight && evaluate(b.hero, board, { straight: 'gold' }).atk < ev.atk ? ev.straightBonus : 0;
  const tri = (ev.triples || []).filter((t) => t.kind === 'atk').length;
  const triAtk = tri * tripleBonus(b.hero); // (a perk or Wolf Fang can add to it; the bot rarely has them)
  const splash = (rep.splashed || []).filter((s) => s.uid !== rep.targetUid).reduce((a, s) => a + s.dealt, 0);
  const powers = Math.max(0, T.atk - ev.atk) + Math.max(0, T.pierce - ev.pierce) + splash;
  const throwN = T.atk + T.pierce + splash;
  return { throw: throwN, dice: Math.max(0, throwN - powers - atkStraight - triAtk), triple: triAtk, straight: atkStraight, powers,
    tri: tri > 0, str: !!ev.straight, taken: rep.taken || 0, landed: (rep.dealt || 0) + splash };
}

const clone = (h) => JSON.parse(JSON.stringify(h));
const gearOf = (h) => ['NW', 'NE'].map((k) => h.loadout[k]).filter((w) => w && w.id !== 'fists' && !w.twin)
  .map((w) => `${RARITY[w.rarity] || ''} ${WEAPONS[w.id]?.name || w.id} d${weaponSize(w)}${WEAPONS[w.id]?.hands === 2 ? ' (2h)' : ''}`.trim()).join(' + ') || 'fists';

function measureFight(hero, quest, seed, A) {
  const rng = makeRng(seed); const b = newBattle(clone(hero), quest, rng, 1); let g = 0; let low = 1; const throws = [];
  while (!b.outcome && g++ < 80) {
    botRound(b, rng); const rep = b.report; if (!rep) break;
    const p = roundParts(b, rep); throws.push(p.throw);
    for (const k of ['throw', 'dice', 'triple', 'straight', 'powers', 'taken', 'landed']) A[k] += p[k];
    A.rounds++; A.tri += p.tri ? 1 : 0; A.str += p.str ? 1 : 0; A.all.push(p.throw);
    low = Math.min(low, Math.max(0, b.hp) / b.maxHp);
  }
  A.fights++; A.fightRounds += b.round; A.low += low; A.half += low < 0.5 ? 1 : 0; A.quarter += low < 0.25 ? 1 : 0;
  if (b.outcome === 'victory') A.wins++;
  A.potions += (b.potions0 || 0) - (b.potions || 0);
  A.foeHp += b.enemies.reduce((a, e) => a + (e.maxHp || 0), 0);
}

const blank = () => ({ fights: 0, wins: 0, rounds: 0, fightRounds: 0, throw: 0, dice: 0, triple: 0, straight: 0, powers: 0, taken: 0, landed: 0, tri: 0, str: 0, low: 0, half: 0, quarter: 0, potions: 0, foeHp: 0, hp: 0, hpN: 0, all: [] });

if (process.argv[2] === 'merge') { printMerged(process.argv[3]); process.exit(0); }

const ACTS = Number(process.argv[2] || 3); const N = Number(process.argv[3] || 2); const TR = Number(process.env.TRIALS || 4);
const classes = process.argv[4] ? [process.argv[4]] : ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
const STYLE = process.env.STYLE || 'wise'; const SKILL = process.env.SKILL || 'normal';
const cells = {}; const gear = {}; let clears = 0; let total = 0;
for (const cls of classes) for (let s = 0; s < N; s++) {
  total++; const seed = 9300 + s; const rng = makeRng(seed); const hero = newHero({ name: 'C', cls, seed }); hero.difficulty = SKILL; let alive = true;
  PLAY.style = STYLE; setScore(null);
  for (let n = 0; n < QUESTS_PER_ACT * ACTS && alive; n++) {
    const quest = questsFor(hero)[0]; const act = hero.campaign.act;
    botArm(hero, quest);
    const key = `${act}|${quest.kind}|${cls}`; const A = (cells[key] ||= blank()); A.hp += maxHpOf(hero);
    for (let t = 0; t < TR; t++) measureFight(hero, quest, (seed + n) * 97 + t, A);
    A.hpN = (A.hpN || 0) + 1;
    let b; let tries = 0; // the campaign's own fight moves the hero on (retreat and retry, as a player would)
    do { if (tries) while (buyPotion(hero)) { /* restock */ } b = newBattle(hero, quest, rng, 1); let g = 0; tries++; while (!b.outcome && g++ < 80) botRound(b, rng); shatterDiamonds(hero); } while (b.outcome === 'defeat' && tries < 6);
    if (b.outcome !== 'victory') { alive = false; break; }
    const r = battleRewards(b); hero.gold += r.gold; gainXp(hero, r.xp); botLoot(hero, r.drops); if (r.diamond) takeDiamond(hero, r.diamond); advanceCampaign(hero); botCamp(hero, rng);
    if (hero.campaign.act !== act || n === QUESTS_PER_ACT * ACTS - 1) (gear[`${act}|${cls}`] ||= []).push(gearOf(hero));
  }
  if (alive) clears++;
}
const out = { cells, gear, clears, total, style: STYLE, skill: SKILL, trials: TR };
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out));
else { const d = fs.mkdtempSync('/tmp/curve-'); fs.writeFileSync(`${d}/one.json`, JSON.stringify(out)); printMerged(d); }

// ---- the report
function printMerged(dir) {
  const R = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`)));
  const cells = {}; const gear = {}; let clears = 0; let total = 0;
  for (const r of R) {
    clears += r.clears; total += r.total;
    for (const [k, A] of Object.entries(r.cells)) { const T = (cells[k] ||= blank()); for (const [f, v] of Object.entries(A)) { if (Array.isArray(v)) T[f].push(...v); else T[f] = (T[f] || 0) + v; } }
    for (const [k, v] of Object.entries(r.gear)) (gear[k] ||= []).push(...v);
  }
  const sum = (pred) => { const T = blank(); for (const [k, A] of Object.entries(cells)) if (pred(...k.split('|'))) for (const [f, v] of Object.entries(A)) { if (Array.isArray(v)) T[f].push(...v); else T[f] = (T[f] || 0) + v; } return T; };
  const pct = (x) => `${Math.round(100 * x)}%`; const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '-');
  const q = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, c) => a - c); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const r0 = R[0] || {};
  console.log(`QuestDice damage curve · ${r0.skill} · ${r0.style} bot · ${r0.trials} trials a step · campaigns cleared ${clears}/${total}`);
  console.log('A round\'s THROW is attack + pierce + splash (the number the player sees). Health % is the lowest point of each fight.\n');
  const row = (label, A) => {
    const r = A.rounds || 1; const fights = A.fights || 1;
    return `${label.padEnd(16)} ${String(A.fights).padStart(5)} ${pct(A.wins / fights).padStart(5)} ${f1(A.fightRounds / fights).padStart(6)}`
      + ` ${f1(A.throw / r).padStart(6)} ${String(q(A.all, 0.5)).padStart(5)} ${String(q(A.all, 0.9)).padStart(5)} ${String(q(A.all, 1)).padStart(5)}`
      + `   ${pct(A.dice / (A.throw || 1)).padStart(4)} ${pct(A.triple / (A.throw || 1)).padStart(4)} ${pct(A.straight / (A.throw || 1)).padStart(4)} ${pct(A.powers / (A.throw || 1)).padStart(4)}`
      + `   ${f1(A.landed / r).padStart(6)} ${f1(A.taken / r).padStart(6)} ${pct(A.low / fights).padStart(5)} ${pct(A.half / fights).padStart(5)} ${pct(A.quarter / fights).padStart(5)}`
      + `   ${pct(A.str / r).padStart(4)} ${pct(A.tri / r).padStart(4)}`;
  };
  const head = `${''.padEnd(16)} fights  win rounds  throw   mid   90%   max   dice trip strt powr   landed  taken  low  <half <qtr   strt trip`;
  console.log('1. By act and kind of fight (all classes)'); console.log(head);
  for (const act of ['1', '2', '3']) for (const kind of ['battle', 'elite', 'boss']) { const A = sum((a, k) => a === act && k === kind); if (A.fights) console.log(row(`Act ${act} ${kind}`, A)); }
  for (const act of ['1', '2', '3']) { const A = sum((a) => a === act); if (A.fights) console.log(row(`Act ${act} all`, A)); }
  console.log('\n2. By act and class (every kind of fight)'); console.log(head);
  for (const act of ['1', '2', '3']) for (const cls of ['knight', 'ranger', 'wizard', 'dwarf', 'bard']) { const A = sum((a, k, c) => a === act && c === cls); if (A.fights) console.log(row(`Act ${act} ${cls}`, A)); }
  console.log('\n3. Big moments: rounds whose throw is at least twice the act\'s average round');
  const target = { 1: '10 to 15', 2: '15 to 25', 3: '25 to 40' };
  for (const act of ['1', '2', '3']) {
    const A = sum((a) => a === act); if (!A.rounds) continue; const avg = A.throw / A.rounds;
    const big = A.all.filter((x) => x >= 2 * avg).length; const five = A.all.filter((x) => x >= 5 * avg).length;
    const hp = sum((a) => a === act); const heroHp = hp.hp / (hp.hpN || 1);
    console.log(`  Act ${act}: average round ${f1(avg)} (plan's target ${target[act]}); ${pct(big / A.rounds)} of rounds are 2x or more, ${pct(five / A.rounds)} are 5x or more; hero health about ${Math.round(heroHp)}; monsters' health a fight ${Math.round(A.foeHp / A.fights)}`);
  }
  console.log('\n4. What the hero holds at the end of each act (bot\'s choice by average throw)');
  for (const act of ['1', '2', '3']) for (const cls of ['knight', 'ranger', 'wizard', 'dwarf', 'bard']) {
    const g = gear[`${act}|${cls}`]; if (!g?.length) continue; const c = {}; for (const x of g) c[x] = (c[x] || 0) + 1;
    console.log(`  Act ${act} ${cls.padEnd(7)} ${Object.entries(c).sort((a, z) => z[1] - a[1]).map(([x, n]) => `${x}${n > 1 ? ` ×${n}` : ''}`).join(' | ')}`);
  }
}
