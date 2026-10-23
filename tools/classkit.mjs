// Class identity (Dave and ChatGPT, 22 Oct 2026: "Ranger precision and arrows, Mage magic, Bard team support, Knight protection, Dwarf
// endurance ... review the existing abilities first"). Does a class's choice of powers change with the fight? Real heroes from the
// campaign (two snapshots in Act II, wise bot) try every kit their class offers (2 big moves x 2 every-round powers x 2 charges = 8),
// with the levels they bought moved onto whichever power sits in that slot, against the four matchup fights:
//   heavy  one big hitter     swarm  three small monsters     guard  one armoured monster     healer  one that mends itself
// It prints, for each class, the health each kit costs a fight, the best kit for each fight, and what sticking with one favourite
// kit costs against choosing per fight (the "situational choice against a favourite power" test). It changes no rule.
//   node tools/classkit.mjs [fights=16] [class]        (OUT=file writes rows; node tools/classkit.mjs merge <dir> prints the table)
import fs from 'node:fs';
import * as E from '../js/engine.js';
import * as DATA from '../js/data.js';
import { botRound, botCamp, botLoot, PLAY, setScore } from './sim.mjs';

const ENC = { heavy: ['ogre'], swarm: ['goblin', 'goblin', 'goblin'], guard: ['ironwarden'], healer: ['treant'] };
if (process.argv[2] === 'merge') { report(fs.readdirSync(process.argv[3]).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(fs.readFileSync(`${process.argv[3]}/${f}`, 'utf8')))); process.exit(0); }
const T = Number(process.argv[2] || 16); const classes = process.argv[3] ? [process.argv[3]] : ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
const clone = (h) => JSON.parse(JSON.stringify(h));
PLAY.style = 'wise'; setScore(null);

function play(hero0, quest, seed) {
  const hero = clone(hero0); const rng = E.makeRng(seed);
  const b = E.newBattle(hero, quest, rng, 1); const hp0 = b.hp; const p0 = E.potionsLeft(b); let rounds = 0; let g = 0;
  while (!b.outcome && g++ < 60) { botRound(b, rng); if (b.report) rounds++; }
  const lost = Math.max(0, hp0 - b.hp) + (p0 - E.potionsLeft(b)) * E.potionHpOf(hero);
  return { win: b.outcome === 'victory' ? 1 : 0, rounds, health: b.outcome === 'victory' ? lost : hp0 + 30 };
}
// every kit a class offers, and the hero set up to carry it (each slot keeps the best level the hero bought in that slot)
function kits(cls) { const by = (s) => DATA.CLASSES[cls].cards.filter((c) => c.slot === s && (!process.env.KIT || c.start)); /* KIT=start: only the kit a new hero carries */ const out = []; for (const a of by('A')) for (const b of by('B')) for (const c of by('C')) out.push([a, b, c]); return out; }
function wear(hero, kit) {
  const h = clone(hero); h.level = Math.max(h.level, 5); h.learned = DATA.CLASSES[h.cls].cards.map((c) => c.id); h.powerLevel = { ...(h.powerLevel || {}) };
  for (const card of kit) { const lv = Math.max(0, ...DATA.CLASSES[h.cls].cards.filter((c) => c.slot === card.slot).map((c) => E.powerLevel(hero, c.id))); h.powerLevel[card.id] = lv; E.equipPower(h, card.id); }
  return h;
}
const rows = [];
for (const cls of classes) {
  const seed = 8800 + cls.length; const rng = E.makeRng(seed);
  const hero = E.newHero({ name: 'K', cls, seed }); hero.difficulty = 'normal';
  for (let n = 0; n < DATA.QUESTS_PER_ACT * 2; n++) {
    const quest = E.questsFor(hero)[0]; const { act, step } = hero.campaign;
    if (act === 2 && [3, 7].includes(step)) {
      for (const kit of kits(cls)) for (const [enc, foes] of Object.entries(ENC)) {
        const h = wear(hero, kit); const q = { ...quest, enemies: foes, kind: 'battle', foeNames: null };
        const res = Array.from({ length: T }, (_, i) => play(h, q, seed * 100 + step * 10 + i * 7919));
        const av = (k) => res.reduce((a, x) => a + x[k], 0) / T;
        rows.push({ cls, step, kit: kit.map((c) => c.name).join(' / '), start: kit.every((c) => c.start), enc, win: av('win'), rounds: av('rounds'), health: av('health') });
      }
      process.stderr.write(`${cls} 2.${step} `);
    }
    let b; let t = 0;
    do { if (t) while (E.buyPotion(hero)) { /* restock */ } b = E.newBattle(hero, quest, rng, 1); t++; let g = 0; while (!b.outcome && g++ < 80) botRound(b, rng); E.shatterDiamonds(hero); } while (b.outcome === 'defeat' && t < 6);
    if (b.outcome !== 'victory') break;
    const rw = E.battleRewards(b); hero.gold += rw.gold; E.gainXp(hero, rw.xp); botLoot(hero, rw.drops); E.advanceCampaign(hero); botCamp(hero, rng);
  }
}
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(rows)); else report(rows);

function report(all) {
  const encs = Object.keys(ENC); const m = (f, k) => { const r = all.filter(f); return r.length ? r.reduce((a, x) => a + x[k], 0) / r.length : NaN; };
  console.log(`QuestDice class kits · Act II heroes · wise bot · today's weapons and powers${['FURY_FROM', 'NOCHARM', 'MAGIC', 'KIT', 'CLASSID'].filter((k) => process.env[k]).map((k) => ` · ${k.toLowerCase()} ${process.env[k]}`).join('')}`);
  console.log('Each cell: health a fight costs (lower is better) · win%. * = the best kit for that fight. (start) = the kit a new hero carries.');
  for (const cls of [...new Set(all.map((x) => x.cls))]) {
    const kitsHere = [...new Set(all.filter((x) => x.cls === cls).map((x) => x.kit))];
    const cell = (k, e) => m((x) => x.cls === cls && x.kit === k && x.enc === e, 'health');
    const best = Object.fromEntries(encs.map((e) => [e, Math.min(...kitsHere.map((k) => cell(k, e)))]));
    console.log(`\n${DATA.CLASSES[cls].name}`); console.log(`${'kit (big move / every round / charge)'.padEnd(46)} ${encs.map((e) => e.padEnd(14)).join('')} all four`);
    const tot = (k) => encs.reduce((a, e) => a + cell(k, e), 0) / encs.length;
    for (const k of kitsHere) {
      const st = all.find((x) => x.cls === cls && x.kit === k)?.start;
      console.log(`${(k + (st ? ' (start)' : '')).padEnd(46)} ${encs.map((e) => `${cell(k, e).toFixed(1)}${cell(k, e) === best[e] ? '*' : ' '} ${(100 * m((x) => x.cls === cls && x.kit === k && x.enc === e, 'win')).toFixed(0)}%`.padEnd(14)).join('')} ${tot(k).toFixed(1)}`);
    }
    const fav = kitsHere.reduce((a, k) => (tot(k) < tot(a) ? k : a)); const choose = encs.reduce((a, e) => a + best[e], 0) / encs.length;
    const winners = new Set(encs.map((e) => kitsHere.find((k) => cell(k, e) === best[e])));
    console.log(`  best single kit: ${fav} (${tot(fav).toFixed(1)} a fight) · choosing per fight: ${choose.toFixed(1)} · choice is worth ${(tot(fav) - choose).toFixed(1)} health a fight · ${winners.size} different kit${winners.size > 1 ? 's' : ''} win the four fights`);
  }
}
