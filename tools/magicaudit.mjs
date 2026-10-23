// Magic and the Wizard, checked properly (ChatGPT's review of Release 2, 23 Oct 2026: "confirm that those strategies actually cast
// different powers at different times and spend different amounts"; "compare Barrier with a small improvement to the offensive kit").
// Independent campaigns: each class grows CAMPS separate heroes (own seeds) to Act II, snapshotted at steps 3 and 7, and each snapshot
// fights the four matchup fights T times. Standard errors are across campaigns (fights inside one campaign are not independent).
//   RELEASE=1 MODE=magic CLS=wizard OUT=f.json node tools/magicaudit.mjs     six ways of handling magic, with every cast counted
//   RELEASE=1 MODE=wizard VAR=barrier OUT=f.json node tools/magicaudit.mjs   one Wizard variant (start, barrier, missile3, missile4, coil6, hp28)
//   node tools/magicaudit.mjs merge <dir>                                    the tables
// It changes no rule in the game: the variants are made here, in this process only.
import fs from 'node:fs';
import * as E from '../js/engine.js';
import * as DATA from '../js/data.js';
import { botRound, botCamp, botLoot, PLAY, setScore } from './sim.mjs';

const ENC = { heavy: ['ogre'], swarm: ['goblin', 'goblin', 'goblin'], guard: ['ironwarden'], healer: ['treant'] };
const CAMPS = Number(process.env.CAMPS || 5); const T = Number(process.env.T || 6);
const POLICIES = {
  'smart, default': { style: 'smart' }, 'smart, spend': { style: 'smart', magic: 'spend' }, 'smart, save': { style: 'smart', magic: 'save' },
  'wise, default (magic worth 2.2)': { style: 'wise' }, 'wise, spend (magic worth 0.8)': { style: 'wise', magicW: 0.8 }, 'wise, save (magic worth 4.5)': { style: 'wise', magicW: 4.5 },
};
const VARIANTS = {
  start: { kit: ['arcbolt', 'bolt', 'coil'] },
  barrier: { kit: ['arcbolt', 'barrier', 'coil'] },
  missile3: { kit: ['arcbolt', 'bolt', 'coil'], tweak: () => { card('bolt').fx.pierce = 3; } },
  missile4: { kit: ['arcbolt', 'bolt', 'coil'], tweak: () => { card('bolt').fx.pierce = 4; } },
  coil6: { kit: ['arcbolt', 'bolt', 'coil'], tweak: () => { card('coil').per.atk = 6; card('coil').fx.atk = 6; } },
  hp28: { kit: ['arcbolt', 'bolt', 'coil'], tweak: () => { DATA.CLASSES.wizard.hp = 28; } },
  // T07, the Wizard's existing outlets (run with NUDGE=1 so the wise player also weighs turning the heart)
  rearm2: { kit: ['arcbolt', 'bolt', 'coil'], tweak: () => { DATA.CLASSES.wizard.rechargeCost = 2; } }, // re-arming Arc Bolt costs 2, not 3
  holdbolt: { kit: ['arcbolt', 'bolt', 'coil'], tweak: () => { PLAY.holdScale = 6; } }, // Arc Bolt only at 6+ magic (3+ dice) or to finish a monster
  rearm2hold: { kit: ['arcbolt', 'bolt', 'coil'], tweak: () => { DATA.CLASSES.wizard.rechargeCost = 2; PLAY.holdScale = 6; } },
};
const card = (id) => DATA.CLASSES.wizard.cards.find((c) => c.id === id);
const clone = (h) => JSON.parse(JSON.stringify(h));

if (process.env.NUDGE) PLAY.nudge = true; // the wise player weighs turning the heart die (Heart Change)
if (process.argv[2] === 'merge') { report(fs.readdirSync(process.argv[3]).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(fs.readFileSync(`${process.argv[3]}/${f}`, 'utf8')))); process.exit(0); }

// every real cast (the wise player also casts in its look-ahead copies; those are not counted)
const real = new WeakSet(); let log = null;
E.CAST_HOOK.on = (b, out) => { if (log && real.has(b)) log.push({ id: out.id, cost: out.cost || 0, released: out.released || 0 }); };
// the magic ledger (MODE=ledger): every other spend, and each round's income (what the dice paid, what the cap threw away, what was stolen)
let led = null;
E.CAST_HOOK.magic = (b, kind, n) => { if (led && real.has(b)) led[kind] = (led[kind] || 0) + n; };
E.CAST_HOOK.income = (b, x) => { if (led && real.has(b)) { led.earned += x.earned; led.over += x.over; led.stolen += x.stolen; } };

function play(hero0, quest, seed) {
  const hero = clone(hero0); const rng = E.makeRng(seed);
  const b = E.newBattle(hero, quest, rng, 1); real.add(b); log = []; led = { start: b.magic, earned: 0, over: 0, stolen: 0 };
  const hp0 = b.hp; const p0 = E.potionsLeft(b); let rounds = 0; let g = 0; const byFoes = {};
  while (!b.outcome && g++ < 60) {
    const foes = b.enemies.filter((e) => e.hp > 0).length; const before = b.hp;
    botRound(b, rng); if (b.report) rounds++;
    const k = Math.min(foes, 3); (byFoes[k] ||= [0, 0]); byFoes[k][0] += Math.max(0, before - b.hp); byFoes[k][1]++;
  }
  const lost = Math.max(0, hp0 - b.hp) + (p0 - E.potionsLeft(b)) * E.potionHpOf(hero);
  const casts = {}; for (const c of log) (casts[c.id] ||= { n: 0, magic: 0, released: 0 }), casts[c.id].n++, casts[c.id].magic += c.cost, casts[c.id].released += c.released;
  const out = { win: b.outcome === 'victory' ? 1 : 0, rounds, health: b.outcome === 'victory' ? lost : hp0 + 30, spent: log.reduce((a, c) => a + c.cost, 0), left: b.magic, casts, byFoes, maxHp: b.maxHp, hpLeft: Math.max(0, b.hp) / b.maxHp, ledger: led };
  log = null; led = null; return out;
}
function wear(hero, ids) {
  const h = clone(hero); h.level = Math.max(h.level, 5); h.learned = DATA.CLASSES[h.cls].cards.map((c) => c.id); h.powerLevel = { ...(h.powerLevel || {}) };
  for (const id of ids) { const c = DATA.CLASSES[h.cls].cards.find((k) => k.id === id); const lv = Math.max(0, ...DATA.CLASSES[h.cls].cards.filter((k) => k.slot === c.slot).map((k) => E.powerLevel(hero, k.id))); h.powerLevel[id] = lv; E.equipPower(h, id); }
  return h;
}
// grow a hero through Act I into Act II with the quick (smart) player; hand back the snapshots
function grow(cls, seed) {
  PLAY.style = 'smart'; PLAY.magic = undefined; PLAY.magicW = undefined; setScore(null);
  const rng = E.makeRng(seed); const hero = E.newHero({ name: 'K', cls, seed }); hero.difficulty = 'normal'; const snaps = [];
  for (let n = 0; n < DATA.QUESTS_PER_ACT * 2; n++) {
    const quest = E.questsFor(hero)[0]; const { act, step } = hero.campaign;
    if (act === 2 && [3, 7].includes(step)) snaps.push({ hero: clone(hero), quest, step });
    let b; let t = 0;
    do { if (t) while (E.buyPotion(hero)) { /* restock */ } b = E.newBattle(hero, quest, rng, 1); t++; let g = 0; while (!b.outcome && g++ < 80) botRound(b, rng); E.shatterDiamonds(hero); } while (b.outcome === 'defeat' && t < 6);
    if (b.outcome !== 'victory') break;
    const rw = E.battleRewards(b); hero.gold += rw.gold; E.gainXp(hero, rw.xp); botLoot(hero, rw.drops); E.advanceCampaign(hero); botCamp(hero, rng);
  }
  return snaps;
}
function arms() {
  if (process.env.MODE === 'ledger') { const cls = process.env.CLS || 'wizard'; const start = DATA.CLASSES[cls].cards.filter((c) => c.start).map((c) => c.id); return [{ cls, arm: 'wise', policy: POLICIES['wise, default (magic worth 2.2)'], kit: start }, { cls, arm: 'smart', policy: POLICIES['smart, default'], kit: start }]; }
  if (process.env.MODE === 'wizard') { const v = process.env.VAR || 'start'; return [{ cls: 'wizard', arm: v, policy: POLICIES['wise, default (magic worth 2.2)'], kit: VARIANTS[v].kit, tweak: VARIANTS[v].tweak }]; }
  const cls = process.env.CLS || 'wizard'; const start = DATA.CLASSES[cls].cards.filter((c) => c.start).map((c) => c.id);
  return Object.entries(POLICIES).map(([arm, policy]) => ({ cls, arm, policy, kit: start }));
}
const rows = [];
const todo = arms(); const cls = todo[0].cls;
const camps = Array.from({ length: CAMPS }, (_, c) => grow(cls, 7100 + 37 * c + cls.length));
for (const a of todo) a.tweak?.(); // a variant's rule, in this process only (after growing, so every arm grows the same heroes)
for (const a of todo) {
  Object.assign(PLAY, { style: a.policy.style, magic: a.policy.magic, magicW: a.policy.magicW }); setScore(null);
  camps.forEach((snaps, c) => { for (const s of snaps) for (const [enc, foes] of Object.entries(ENC)) {
    const h = wear(s.hero, a.kit); const q = { ...s.quest, enemies: foes, kind: 'battle', foeNames: null };
    for (let i = 0; i < T; i++) rows.push({ cls, arm: a.arm, camp: c, step: s.step, enc, ...play(h, q, 9000 + c * 1000 + s.step * 100 + i * 7919) });
  } });
  process.stderr.write(`${a.arm} done\n`);
}
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(rows)); else report(rows);

function ledgerReport(all) {
  console.log('Magic ledger, a fight (Act II heroes, the start kit): where every point comes from and goes. Spent = cast costs (a charge counts the magic stored, once); left = in hand at the end.');
  console.log(`${'class · player'.padEnd(18)}${['start', 'earned', 'lost: cap', 'stolen', 'powers', 'rerolls', 'heals', 're-arm', 'heart turn', 'left', 'rounds', 'win', 'health left'].map((k) => k.padStart(11)).join('')}`);
  for (const cls of [...new Set(all.map((r) => r.cls))]) for (const arm of [...new Set(all.filter((r) => r.cls === cls).map((r) => r.arm))]) {
    const rs = all.filter((r) => r.cls === cls && r.arm === arm && r.ledger); const m = (f) => rs.reduce((a, r) => a + f(r), 0) / rs.length;
    const L = (k) => m((r) => r.ledger[k] || 0);
    console.log(`${`${cls} · ${arm}`.padEnd(18)}${[L('start'), L('earned'), L('over'), L('stolen'), m((r) => r.spent), L('reroll'), L('heal'), L('recharge'), L('nudge'), m((r) => r.left), m((r) => r.rounds)].map((x) => x.toFixed(2).padStart(11)).join('')}${`${(100 * m((r) => r.win)).toFixed(0)}%`.padStart(11)}${`${(100 * m((r) => r.hpLeft)).toFixed(0)}%`.padStart(11)}`);
  }
  const wz = all.filter((r) => r.cls === 'wizard' && r.arm === 'wise');
  if (wz.length) { const byR = {}; for (const r of wz) { const k = Math.min(r.rounds, 7); (byR[k] ||= []).push(r.left); } console.log(`\nWizard (wise): magic left at the end, by fight length: ${Object.entries(byR).map(([k, v]) => `${k}${k === '7' ? '+' : ''} rounds ${(v.reduce((a, x) => a + x, 0) / v.length).toFixed(1)} (n ${v.length})`).join(' · ')}`); }
}
function report(all) {
  if (all[0]?.ledger && all.every((r) => ['wise', 'smart'].includes(r.arm))) return ledgerReport(all);
  const encs = Object.keys(ENC);
  // a value's mean and its standard error across campaigns (each campaign's own mean is one sample)
  const stat = (rs, f) => { const byC = {}; for (const r of rs) (byC[r.camp] ||= []).push(f(r)); const m = Object.values(byC).map((v) => v.reduce((a, x) => a + x, 0) / v.length); const mu = m.reduce((a, x) => a + x, 0) / m.length; const sd = Math.sqrt(m.reduce((a, x) => a + (x - mu) ** 2, 0) / Math.max(1, m.length - 1)); return { mu, se: sd / Math.sqrt(m.length), k: m.length }; };
  const f1 = (s) => `${s.mu.toFixed(1)}±${s.se.toFixed(1)}`;
  for (const cls of [...new Set(all.map((r) => r.cls))]) {
    const mine = all.filter((r) => r.cls === cls); const armsHere = [...new Set(mine.map((r) => r.arm))];
    const k = stat(mine.filter((r) => r.arm === armsHere[0]), (r) => r.health).k; const n = mine.filter((r) => r.arm === armsHere[0]).length;
    console.log(`\n${DATA.CLASSES[cls].name} · ${k} independent campaigns, ${n} fights an arm (${n / encs.length} a fight type) · health a fight ± standard error across campaigns · win%`);
    console.log(`${'arm'.padEnd(34)}${encs.map((e) => e.padEnd(17)).join('')}all four        rounds  magic spent  magic left`);
    for (const arm of armsHere) {
      const rs = mine.filter((r) => r.arm === arm); const cell = (e) => { const x = rs.filter((r) => r.enc === e); return `${f1(stat(x, (r) => r.health))} ${Math.round(100 * x.reduce((a, r) => a + r.win, 0) / x.length)}%`; };
      console.log(`${arm.padEnd(34)}${encs.map((e) => cell(e).padEnd(17)).join('')}${f1(stat(rs, (r) => r.health)).padEnd(16)}${(rs.reduce((a, r) => a + r.rounds, 0) / rs.length).toFixed(1).padStart(6)}  ${(rs.reduce((a, r) => a + r.spent, 0) / rs.length).toFixed(1).padStart(11)}  ${(rs.reduce((a, r) => a + r.left, 0) / rs.length).toFixed(1).padStart(10)}`);
    }
    console.log('  casts a fight (magic a cast; a charge release shows the magic it held):');
    for (const arm of armsHere) {
      const rs = mine.filter((r) => r.arm === arm); const ids = [...new Set(rs.flatMap((r) => Object.keys(r.casts)))];
      console.log(`  ${arm.padEnd(32)}${ids.map((id) => { const n = rs.reduce((a, r) => a + (r.casts[id]?.n || 0), 0); const m = rs.reduce((a, r) => a + (r.casts[id]?.magic || 0) + (r.casts[id]?.released || 0), 0); return `${id} ${(n / rs.length).toFixed(2)} (${n ? (m / n).toFixed(1) : '-'})`; }).join(' · ')}`);
    }
    const sw = mine.filter((r) => r.enc === 'swarm' && r.arm === armsHere[0]); const by = {}; for (const r of sw) for (const [f, [d, c]] of Object.entries(r.byFoes)) { (by[f] ||= [0, 0]); by[f][0] += d; by[f][1] += c; }
    console.log(`  swarm, ${armsHere[0]}: health lost a round with 3 / 2 / 1 goblins standing: ${[3, 2, 1].map((f) => (by[f] ? (by[f][0] / by[f][1]).toFixed(1) : '-')).join(' / ')} (each early kill is worth that difference every round it saves)`);
  }
}
