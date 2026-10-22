// Matchups (Dave and ChatGPT, 22 Oct 2026: "Sword + Shield performs better against the heavy attacker, while two offensive weapons clear the
// small enemies faster. Neither loadout wins everywhere"). Real heroes from the campaign (snapshots at two steps of Act II, every class)
// hold each LOADOUT (left + right, the hero's own size, Bronze) and fight each ENCOUNTER many times:
//   heavy  one big hitter          swarm  three small monsters          guard  one armoured monster          healer  one that mends itself
// Two players: wise (thinks about block, targets and rerolls, see tools/sim.mjs) and greedy (always chases the most attack). The gap
// between them is what good decisions are worth there. It changes no rule; run with W2=1 for the weapons experiment.
//   W2=1 node tools/matchup.mjs [fights=24] [class]        (OUT=file writes rows; node tools/matchup.mjs merge <dir> prints the table)
import fs from 'node:fs';
import * as E from '../js/engine.js';
import * as DATA from '../js/data.js';
import { botRound, botCamp, botLoot, PLAY, setScore } from './sim.mjs';

const ENC = { heavy: ['ogre'], swarm: ['goblin', 'goblin', 'goblin'], guard: ['ironwarden'], healer: ['treant'] }; // the Treant regrows its bark (a mend move)
// ARROWS=1: the four ammunitions with the Bow (the weapons experiment's stage 3), beside two ordinary loadouts to compare
const ARROW_LOADOUTS = [['quiver:normal', 'bow'], ['quiver:pierce', 'bow'], ['quiver:fire', 'bow'], ['quiver:frost', 'bow'], ['sword', 'shield'], ['dagger', 'sword']];
const LOADOUTS = process.env.ARROWS ? ARROW_LOADOUTS : [['sword', 'shield'], ['dagger', 'shield'], ['spear', 'shield'], ['axe', 'tower'], ['shield', 'tower'], ['dagger', 'sword'], ['axe', 'spear'], ['dagger', 'dagger']];
const name = (id) => (id.startsWith('quiver:') ? DATA.WEAPONS2.ammo[id.slice(7)] : (DATA.WEAPONS[id]?.name || id).replace('Round ', ''));
const own = (id) => (DATA.EXPERIMENT.weapons2 || id !== 'axe' ? id : 'mace'); // (arrows need W2=1) // today's weapons have no Axe: the Mace stands in

if (process.argv[2] === 'merge') { report(fs.readdirSync(process.argv[3]).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(fs.readFileSync(`${process.argv[3]}/${f}`, 'utf8')))); process.exit(0); }
const T = Number(process.argv[2] || 24); const classes = process.argv[3] ? [process.argv[3]] : ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
const clone = (h) => JSON.parse(JSON.stringify(h));
const greedy = (ev) => ev.atk + ev.pierce; // the player who only looks at the attack total

function play(hero0, quest, seed, style) {
  const hero = clone(hero0); const rng = E.makeRng(seed);
  PLAY.style = style === 'wise' ? 'wise' : 'smart'; setScore(style === 'wise' ? null : greedy);
  const b = E.newBattle(hero, quest, rng, 1); const hp0 = b.hp; const p0 = E.potionsLeft(b); let rounds = 0; let g = 0;
  while (!b.outcome && g++ < 60) { botRound(b, rng); if (b.report) rounds++; }
  const lost = Math.max(0, hp0 - b.hp) + (p0 - E.potionsLeft(b)) * E.potionHpOf(hero);
  const magic = (b.magicSpent || 0); return { win: b.outcome === 'victory' ? 1 : 0, unfinished: b.outcome ? 0 : 1, rounds, health: b.outcome === 'victory' ? lost : hp0 + 30, potions: p0 - E.potionsLeft(b) };
}
const rows = [];
for (const cls of classes) {
  const seed = 8800 + cls.length; const rng = E.makeRng(seed);
  const hero = E.newHero({ name: 'M', cls, seed }); hero.difficulty = 'normal'; PLAY.style = 'wise'; setScore(null);
  for (let n = 0; n < DATA.QUESTS_PER_ACT * 2; n++) {
    const quest = E.questsFor(hero)[0]; const { act, step } = hero.campaign;
    if (act === 2 && [3, 7].includes(step)) {
      for (const [l, r] of LOADOUTS) for (const [enc, foes] of Object.entries(ENC)) for (const style of ['wise', 'greedy']) {
        const h = clone(hero); const size = Math.max(4, Math.min(h.strength.W, h.strength.E));
        const inst = (id, side) => (id.startsWith('quiver:') ? { uid: `${side}${id}`, id: 'quiver', ammo: id.slice(7), rarity: 0, size } : { uid: `${side}${id}`, id: own(id), rarity: 0, size });
        h.loadout.NW = inst(l, 'L'); h.loadout.NE = inst(r, 'R'); h.dice = [...new Set([...(h.dice || []), 'NE'])];
        const q = { ...quest, enemies: foes, kind: 'battle', foeNames: null };
        const res = Array.from({ length: T }, (_, i) => play(h, q, seed * 100 + step * 10 + i * 7919, style));
        const av = (k) => res.reduce((a, x) => a + x[k], 0) / T;
        rows.push({ cls, step, loadout: `${name(l.includes(':') ? l : own(l))} + ${name(own(r))}`, enc, style, win: av('win'), unfinished: av('unfinished'), rounds: av('rounds'), health: av('health'), potions: av('potions') });
      }
      process.stderr.write(`${cls} 2.${step} `);
    }
    PLAY.style = 'wise'; setScore(null);
    let b; let t = 0;
    do { if (t) while (E.buyPotion(hero)) { /* restock */ } b = E.newBattle(hero, quest, rng, 1); t++; let g = 0; while (!b.outcome && g++ < 80) botRound(b, rng); E.shatterDiamonds(hero); } while (b.outcome === 'defeat' && t < 6);
    if (b.outcome !== 'victory') break;
    const rw = E.battleRewards(b); hero.gold += rw.gold; E.gainXp(hero, rw.xp); botLoot(hero, rw.drops); E.advanceCampaign(hero); botCamp(hero, rng);
  }
}
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(rows)); else report(rows);

function report(all) {
  const encs = Object.keys(ENC); const loads = [...new Set(all.map((x) => x.loadout))];
  const m = (f, k) => { const r = all.filter(f); return r.length ? r.reduce((a, x) => a + x[k], 0) / r.length : NaN; };
  console.log(`QuestDice matchups · Act II heroes, every class · Bronze loadouts · ${process.env.W2 ? 'the six new weapons' : "today's weapons"}${['PRESS', 'FURY', 'RALLY', 'MEND', 'BAG'].filter((k) => process.env[k]).map((k) => ` · ${k.toLowerCase()}`).join('')}`);
  console.log('Each cell: health a fight costs (lower is better) · rounds · win%, for the wise player. Best loadout in each column is marked *.');
  for (const style of ['wise', 'greedy']) {
    console.log(`\n${style === 'wise' ? 'Wise player' : 'Greedy player (always chases attack)'}`);
    console.log(`${'loadout'.padEnd(18)} ${encs.map((e) => e.padEnd(22)).join('')}`);
    const best = Object.fromEntries(encs.map((e) => [e, Math.min(...loads.map((l) => m((x) => x.loadout === l && x.enc === e && x.style === style, 'health')))]));
    for (const l of loads) console.log(`${l.padEnd(18)} ${encs.map((e) => { const f = (x) => x.loadout === l && x.enc === e && x.style === style; const h = m(f, 'health'); return `${h.toFixed(1)}${h === best[e] ? '*' : ' '} · ${m(f, 'rounds').toFixed(1)}r · ${(100 * m(f, 'win')).toFixed(0)}%`.padEnd(22); }).join('')}`);
  }
  console.log('\nWhat thinking is worth: health saved by the wise player over the greedy one, same loadout and fight');
  console.log(`${'loadout'.padEnd(18)} ${encs.map((e) => e.padEnd(10)).join('')}`);
  for (const l of loads) console.log(`${l.padEnd(18)} ${encs.map((e) => { const w = m((x) => x.loadout === l && x.enc === e && x.style === 'wise', 'health'); const g = m((x) => x.loadout === l && x.enc === e && x.style === 'greedy', 'health'); return `${(g - w >= 0 ? '+' : '')}${(g - w).toFixed(1)}`.padEnd(10); }).join('')}`);
}
