// What a camp purchase is worth (Dave, Oct 2026: "put a rough balance on gold as this much attack, magic as this much attack or
// health, and then as we add that to the game, we recognize how it's gonna change the game"). A bot hero plays the campaign; at a few
// steps a snapshot is taken, and the SAME fights are played again with one purchase made (a bigger die, a power level, a better
// weapon) and without it. The difference is what the purchase buys in one fight:
//   throw   attack + pierce a round (what the player sees)
//   rounds  rounds a fight
//   health  health the fight costs: health lost + potions drunk (a lost fight costs all your health and 30 more)
// Health is the common money: a purchase that saves 6 health a fight is worth 6, however it does it (faster kills, more block, heals).
// Dice and power levels are kept for the rest of the campaign; a weapon wears out (4/6/8 battles), so the table also prints what each
// buys over the battles it will be used for. Changes no rule; TUNE='{"CHARGE_LEVEL_ADD":[0,1,2,3]}' tries numbers first.
//   STYLE=wise LOOK=4 SIM_SAMPLES=5 node tools/worth.mjs [fights a snapshot=24] [campaigns a class=1] [class]
//   node tools/worth.mjs merge <dir>
import fs from 'node:fs';
import * as E from '../js/engine.js';
import * as DATA from '../js/data.js';
import { botRound, botCamp, botLoot, PLAY, setScore } from './sim.mjs';

if (process.env.TUNE) for (const [name, v] of Object.entries(JSON.parse(process.env.TUNE))) { if (Array.isArray(v)) v.forEach((x, i) => { DATA[name][i] = x; }); else Object.assign(DATA[name], v); }
PLAY.style = process.env.STYLE || 'wise'; setScore(null);
const { QUESTS_PER_ACT, WEAPONS } = DATA;

if (process.argv[2] === 'merge') { report(fs.readdirSync(process.argv[3]).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(`${process.argv[3]}/${f}`, 'utf8'))).flat()); process.exit(0); }

const T = Number(process.argv[2] || 24); const N = Number(process.argv[3] || 1);
const classes = process.argv[4] ? [process.argv[4]] : ['knight', 'ranger', 'wizard', 'dwarf', 'bard'];
const SNAP_STEPS = [2, 6]; // a snapshot at these steps of every act (ordinary battles)
const clone = (h) => JSON.parse(JSON.stringify(h));

// One fight from a snapshot: what it cost and what it threw.
function play(hero0, quest, seed) {
  const hero = clone(hero0); const rng = E.makeRng(seed);
  const b = E.newBattle(hero, quest, rng, 1); const hp0 = b.hp; const p0 = E.potionsLeft(b);
  let rounds = 0; let thrown = 0; let g = 0;
  while (!b.outcome && g++ < 60) { botRound(b, rng); const rep = b.report; if (!rep) continue; rounds++; thrown += (rep.T?.atk || 0) + (rep.T?.pierce || 0); }
  const potHp = (p0 - E.potionsLeft(b)) * E.potionHpOf(hero);
  const health = b.outcome === 'victory' ? Math.max(0, hp0 - b.hp) + potHp : hp0 + potHp + 30;
  return { win: b.outcome === 'victory' ? 1 : 0, rounds, throw: rounds ? thrown / rounds : 0, health };
}
const avg = (rows, k) => rows.reduce((a, r) => a + r[k], 0) / (rows.length || 1);
function measure(hero, quest, seeds) { const rows = seeds.map((s) => play(hero, quest, s)); return { win: avg(rows, 'win'), rounds: avg(rows, 'rounds'), throw: avg(rows, 'throw'), health: avg(rows, 'health') }; }

// The purchases. Each takes a copy of the hero and makes it (paying with free gold); returns its price, or null when it cannot be had.
// A die that is already as big as the act allows is measured the other way round: the snapshot against the same hero one size down.
const DOWN = { 6: 4, 8: 6, 10: 8 };
const dieBuy = (kind, slot, steps) => (h) => {
  const cur = kind === 'mind' ? h.mind.N : h[kind][slot];
  h.gold = 1e6; const g0 = h.gold;
  if (E.upgradeDie(h, kind, slot)) return { cost: g0 - h.gold };
  const lower = DOWN[cur]; if (!lower || !steps[lower]) return null;
  if (kind === 'mind') h.mind.N = lower; else h[kind][slot] = lower;
  return { cost: steps[lower][0], down: true };
};
const powerBuy = (slot, times = 1) => (h) => {
  const k = E.cardsOf(h).find((c) => c.slot === slot); if (!k) return null;
  h.gold = 1e6; const g0 = h.gold; for (let i = 0; i < times; i++) if (!E.upgradePower(h, k.id)) return null;
  return { cost: g0 - h.gold, what: `${k.name} → level ${E.powerLevel(h, k.id)}` };
};
// the weapon in the main hand one metal better, at the Camp Store's price difference
const metalBuy = (h) => {
  for (const side of ['NE', 'NW']) {
    const w = h.loadout[side]; if (!w || w.id === 'fists' || w.diamond || E.isLegendary?.(w) || (w.rarity | 0) >= 2) continue;
    const before = E.weaponValue(w); for (const x of [h.loadout.NE, h.loadout.NW]) if (x && x.uid === w.uid) x.rarity = (w.rarity | 0) + 1;
    return { cost: E.weaponValue(w) - before, what: `${WEAPONS[w.id].name} ${['Bronze', 'Silver', 'Gold'][w.rarity - 1]} → ${['Bronze', 'Silver', 'Gold'][w.rarity]}`, battles: DATA.WEAR_BATTLES[w.rarity] };
  }
  return null;
};
const BUYS = {
  'hand die': dieBuy('strength', 'E', DATA.STRENGTH_STEPS), 'talent die': dieBuy('special', 'SE', DATA.SPECIAL_STEPS), 'head die': dieBuy('mind', 'N', DATA.MIND_STEPS),
  'power A': powerBuy('A'), 'power B': powerBuy('B'), 'power C': powerBuy('C'), 'power A x3': powerBuy('A', 3), 'power B x3': powerBuy('B', 3), 'power C x3': powerBuy('C', 3), 'weapon metal': metalBuy,
};

const out = [];
for (const cls of classes) for (let s = 0; s < N; s++) {
  const seed = 5100 + s * 31; const rng = E.makeRng(seed);
  const hero = E.newHero({ name: 'W', cls, seed }); hero.difficulty = process.env.SKILL || 'normal';
  for (let n = 0; n < QUESTS_PER_ACT * 3; n++) {
    const quest = E.questsFor(hero)[0]; const { act, step } = hero.campaign;
    if (SNAP_STEPS.includes(step) && quest.kind !== 'boss') {
      const seeds = Array.from({ length: T }, (_, i) => seed * 1000 + act * 100 + step * 10 + i * 7919);
      const left = QUESTS_PER_ACT * 3 - n; // battles still to come in the campaign (what a die or power level is kept for)
      const base = measure(hero, quest, seeds);
      for (const [name, buy] of Object.entries(BUYS)) {
        const h = clone(hero); const r = buy(h); if (!r) continue; h.gold = hero.gold;
        const m = measure(h, quest, seeds); const sign = r.down ? -1 : 1; // a die measured one size down: the snapshot is the "after"
        out.push({ cls, act, step, name, what: r.what || '', cost: r.cost, keep: r.battles || left, d: Object.fromEntries(['win', 'rounds', 'throw', 'health'].map((k) => [k, sign * (m[k] - base[k])])), base });
      }
      process.stderr.write(`${cls} ${act}.${step} `);
    }
    // the campaign goes on as tools/curve.mjs plays it
    let b; let t = 0;
    do { if (t) while (E.buyPotion(hero)) { /* restock */ } b = E.newBattle(hero, quest, rng, 1); t++; let g = 0; while (!b.outcome && g++ < 80) botRound(b, rng); E.shatterDiamonds(hero); } while (b.outcome === 'defeat' && t < 6);
    if (b.outcome !== 'victory') break;
    const r = E.battleRewards(b); hero.gold += r.gold; E.gainXp(hero, r.xp); botLoot(hero, r.drops); E.advanceCampaign(hero); botCamp(hero, rng);
  }
}
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out)); else report(out);

function report(rows) {
  const f1 = (x) => (x >= 0 ? '+' : '') + x.toFixed(1);
  console.log(`QuestDice: what a purchase is worth · ${process.env.SKILL || 'normal'} · ${PLAY.style} bot${process.env.TUNE ? ` · TUNE ${process.env.TUNE}` : ''}`);
  console.log('Per fight, against the same fights without it. Health saved = less health lost (and fewer potions). Per 100 gold = health saved a fight for every 100 gold.');
  console.log('act  purchase        n   price   throw/round  rounds  win%   health saved   per 100 gold   kept for   health over its life, per 100 gold');
  for (const act of [1, 2, 3]) for (const name of [...new Set(rows.map((x) => x.name))]) {
    const r = rows.filter((x) => x.act === act && x.name === name); if (!r.length) continue;
    const m = (k) => r.reduce((a, x) => a + x.d[k], 0) / r.length; const cost = r.reduce((a, x) => a + x.cost, 0) / r.length; const keep = r.reduce((a, x) => a + x.keep, 0) / r.length;
    const per100 = (m('health') / (cost || 1)) * 100;
    console.log(`${act}    ${name.padEnd(14)} ${String(r.length).padStart(2)}   ${String(Math.round(cost)).padStart(5)}   ${f1(m('throw')).padStart(9)}    ${f1(-m('rounds')).padStart(5)}   ${f1(100 * m('win')).padStart(5)}   ${f1(-m('health')).padStart(10)}     ${f1(-per100).padStart(9)}      ${keep.toFixed(0).padStart(5)}      ${f1(-per100 * keep).padStart(8)}`);
  }
  const b = (act) => { const r = rows.filter((x) => x.act === act && x.name === 'power B'); return r.length ? r[0].base : null; };
  for (const act of [1, 2, 3]) { const x = b(act); if (x) console.log(`  act ${act} baseline: throw ${x.throw.toFixed(1)} a round, ${x.rounds.toFixed(1)} rounds, a fight costs ${x.health.toFixed(1)} health, wins ${(100 * x.win).toFixed(0)}%`); }
}
